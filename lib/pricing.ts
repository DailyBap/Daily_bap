// lib/pricing.ts — Single Source of Truth for Daily Bap Order Pricing & Coupon Calculations

import {
  bentoBoxes,
  bibimbapBowls,
  authenticSides,
  addOns,
} from "@/config/brand";
import type { MenuItem } from "@/types";
import {
  calculateDeliveryFee,
  haversineDistance,
  KITCHEN_COORDS,
  MAX_DELIVERY_RADIUS_KM,
} from "@/lib/geo";
import { db } from "@/lib/db";
import { influencers } from "@/lib/schema";
import { eq } from "drizzle-orm";

// Construct server-side authoritative price catalog map
const BRAND_MENU_MAP = new Map<string, MenuItem>();

[...bentoBoxes, ...bibimbapBowls, ...authenticSides, ...addOns].forEach((item) => {
  BRAND_MENU_MAP.set(item.id, item);
});

export interface PricingItemInput {
  id: string;
  quantity: number;
}

export interface CalculateTotalsInput {
  items: PricingItemInput[];
  lat?: number | null;
  lng?: number | null;
  couponCode?: string | null;
  customerPhone?: string | null;
}

export interface ValidatedItem {
  id: string;
  name: string;
  price: number; // Server-authoritative unit price in ₹
  quantity: number;
}

export interface OrderTotalsResult {
  valid: boolean;
  error?: string;
  items: ValidatedItem[];
  subtotal: number; // Raw food subtotal in ₹
  discountAmount: number; // Food discount in ₹
  discountedSubtotal: number; // Food subtotal after discount
  deliveryFee: number; // Delivery fee in ₹
  total: number; // Final payable total (discountedSubtotal + deliveryFee)
  couponCode: string | null;
  influencerId: string | null;
  commissionAmount: number; // Creator commission in ₹
  distanceKm: number | null;
  isDeliverable: boolean;
  deliveryReason: string;
}

// In-memory rate limiting for coupon validation checks (max 10 attempts per minute per IP/session)
const couponValidationAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_COUPON_CHECKS = 10;
const COUPON_RATE_WINDOW_MS = 60 * 1000;

export function checkCouponRateLimit(identifier: string): boolean {
  const now = Date.now();
  const record = couponValidationAttempts.get(identifier);

  if (!record || now > record.resetAt) {
    couponValidationAttempts.set(identifier, {
      count: 1,
      resetAt: now + COUPON_RATE_WINDOW_MS,
    });
    return true; // Not limited
  }

  if (record.count >= MAX_COUPON_CHECKS) {
    return false; // Limited
  }

  record.count += 1;
  return true;
}

/**
 * Validates a coupon code server-side against database.
 * Returns normalized uppercase code and influencer record if valid.
 * Returns one generic error message for invalid/inactive/paused codes.
 */
export async function validateCouponCode(
  rawCode: string | null | undefined,
  customerPhone?: string | null,
  rateLimitIdentifier?: string
): Promise<{
  isValid: boolean;
  error?: string;
  influencer?: typeof influencers.$inferSelect | null;
}> {
  if (!rawCode || !rawCode.trim()) {
    return { isValid: false, influencer: null };
  }

  if (rateLimitIdentifier && !checkCouponRateLimit(rateLimitIdentifier)) {
    return {
      isValid: false,
      error: "Too many coupon validation attempts. Please try again in a minute.",
      influencer: null,
    };
  }

  const normalizedCode = rawCode.trim().toUpperCase();

  try {
    const records = await db
      .select()
      .from(influencers)
      .where(eq(influencers.code, normalizedCode))
      .limit(1);

    if (records.length === 0 || !records[0].isActive) {
      // Return ONE generic error for unknown, paused, or inactive codes
      return {
        isValid: false,
        error: "Invalid or expired coupon code.",
        influencer: null,
      };
    }

    const influencer = records[0];

    // Anti-abuse check: Creator cannot use their own code
    if (customerPhone && influencer.phoneOrUpi) {
      const cleanCustomerPhone = customerPhone.replace(/\D/g, "").slice(-10);
      const cleanInfluencerPhone = influencer.phoneOrUpi.replace(/\D/g, "").slice(-10);

      if (cleanCustomerPhone && cleanCustomerPhone === cleanInfluencerPhone) {
        return {
          isValid: false,
          error: "Creators cannot apply their own coupon code.",
          influencer: null,
        };
      }
    }

    return { isValid: true, influencer };
  } catch (error) {
    console.error("[validateCouponCode] Database lookup error:", error);
    return {
      isValid: false,
      error: "Invalid or expired coupon code.",
      influencer: null,
    };
  }
}

/**
 * SINGLE PRICING FUNCTION FOR EVERYTHING.
 * Used by orderActions.ts (placeOrder), validateCouponCode action, and Gemini AI chat route.
 */
export async function calculateOrderTotals(
  input: CalculateTotalsInput
): Promise<OrderTotalsResult> {
  const { items: rawItems, lat, lng, couponCode, customerPhone } = input;

  // 1. Validate & sanitize items list
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return {
      valid: false,
      error: "Your cart is empty. Please add items to place an order.",
      items: [],
      subtotal: 0,
      discountAmount: 0,
      discountedSubtotal: 0,
      deliveryFee: 0,
      total: 0,
      couponCode: null,
      influencerId: null,
      commissionAmount: 0,
      distanceKm: null,
      isDeliverable: false,
      deliveryReason: "No items selected.",
    };
  }

  const validatedItems: ValidatedItem[] = [];
  let rawFoodSubtotal = 0;

  for (const rawItem of rawItems) {
    if (!rawItem.id || typeof rawItem.id !== "string") continue;

    const brandItem = BRAND_MENU_MAP.get(rawItem.id);
    if (!brandItem) {
      return {
        valid: false,
        error: `Item "${rawItem.id}" is no longer available on our menu. Please refresh your cart to view current items.`,
        items: [],
        subtotal: 0,
        discountAmount: 0,
        discountedSubtotal: 0,
        deliveryFee: 0,
        total: 0,
        couponCode: null,
        influencerId: null,
        commissionAmount: 0,
        distanceKm: null,
        isDeliverable: false,
        deliveryReason: "Discontinued item in cart.",
      };
    }

    // Validate quantity (integer, 1..50)
    const qty = Math.floor(Number(rawItem.quantity));
    if (isNaN(qty) || qty < 1 || qty > 50) {
      return {
        valid: false,
        error: `Invalid quantity for item "${brandItem.name}". Must be between 1 and 50.`,
        items: [],
        subtotal: 0,
        discountAmount: 0,
        discountedSubtotal: 0,
        deliveryFee: 0,
        total: 0,
        couponCode: null,
        influencerId: null,
        commissionAmount: 0,
        distanceKm: null,
        isDeliverable: false,
        deliveryReason: "Invalid item quantity.",
      };
    }

    const itemTotal = brandItem.price * qty;
    rawFoodSubtotal += itemTotal;

    validatedItems.push({
      id: brandItem.id,
      name: brandItem.name,
      price: brandItem.price,
      quantity: qty,
    });
  }

  // 2. Server-side distance calculation from coordinates
  let distanceKm: number | null = null;
  if (lat != null && lng != null && !isNaN(Number(lat)) && !isNaN(Number(lng))) {
    distanceKm = haversineDistance(
      KITCHEN_COORDS.lat,
      KITCHEN_COORDS.lng,
      Number(lat),
      Number(lng)
    );
  }

  // 3. Process Coupon Code if provided
  let discountAmount = 0;
  let commissionAmount = 0;
  let appliedCouponCode: string | null = null;
  let appliedInfluencerId: string | null = null;
  let couponError: string | undefined = undefined;

  if (couponCode && couponCode.trim()) {
    const couponRes = await validateCouponCode(
      couponCode,
      customerPhone,
      customerPhone || "anonymous_ip"
    );

    if (couponRes.isValid && couponRes.influencer) {
      const inf = couponRes.influencer;
      appliedCouponCode = inf.code;
      appliedInfluencerId = inf.id;

      // Discount applies to FOOD SUBTOTAL ONLY (Math.round applied in ONE place)
      discountAmount = Math.round((rawFoodSubtotal * inf.discountPercent) / 100);

      // Commission = commission_percent of discounted food subtotal
      const discountedSubtotalTemp = Math.max(0, rawFoodSubtotal - discountAmount);
      commissionAmount = Math.round((discountedSubtotalTemp * inf.commissionPercent) / 100);
    } else {
      couponError = couponRes.error || "Invalid or expired coupon code.";
    }
  }

  const discountedSubtotal = Math.max(0, rawFoodSubtotal - discountAmount);

  // 4. Server-side delivery fee calculation (Distance & threshold based on PRE-DISCOUNT food subtotal)
  const feeResult = calculateDeliveryFee(distanceKm, rawFoodSubtotal);

  if (distanceKm != null && distanceKm > MAX_DELIVERY_RADIUS_KM) {
    return {
      valid: false,
      error: feeResult.reason,
      items: validatedItems,
      subtotal: rawFoodSubtotal,
      discountAmount,
      discountedSubtotal,
      deliveryFee: 0,
      total: discountedSubtotal,
      couponCode: appliedCouponCode,
      influencerId: appliedInfluencerId,
      commissionAmount,
      distanceKm,
      isDeliverable: false,
      deliveryReason: feeResult.reason,
    };
  }

  const deliveryFee = feeResult.fee;
  const finalTotal = discountedSubtotal + deliveryFee;

  return {
    valid: true,
    error: couponError,
    items: validatedItems,
    subtotal: rawFoodSubtotal,
    discountAmount,
    discountedSubtotal,
    deliveryFee,
    total: finalTotal,
    couponCode: appliedCouponCode,
    influencerId: appliedInfluencerId,
    commissionAmount,
    distanceKm,
    isDeliverable: feeResult.isDeliverable,
    deliveryReason: feeResult.reason,
  };
}
