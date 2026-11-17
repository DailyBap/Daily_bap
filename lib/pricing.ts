// lib/pricing.ts — Single Source of Truth for Daily Bap Order Pricing & Coupon Calculations

import {
  bentoBoxes,
  bibimbapBowls,
  koreanSkewers,
  kpopChicken,
  kimbapRolls,
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
import { influencers, settings } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { isHuntVoucherCode, extractVoucherCode } from "@/lib/hunt/codes";
import { getActiveHold, formatOfferLabel } from "@/lib/hunt/claims";
import { HUNT_CONFIG } from "@/lib/hunt/config";

// Construct server-side authoritative price catalog map
const BRAND_MENU_MAP = new Map<string, MenuItem>();

[...bentoBoxes, ...bibimbapBowls, ...koreanSkewers, ...kpopChicken, ...kimbapRolls, ...authenticSides, ...addOns].forEach((item) => {
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
  // Additive QR Treasure Hunt fields
  huntClaimId?: number | null;
  huntOfferType?: "PERCENT_OFF" | "BOGO" | "FREE_MEAL" | "FREE_SIDE" | null;
  huntRewardLabel?: string | null;
  needsMoreItems?: boolean;
  unlockHint?: string;
}

/**
 * Checks whether QR Treasure Hunt feature is globally enabled via settings
 */
export async function isHuntEnabled(): Promise<boolean> {
  try {
    const res = await db
      .select()
      .from(settings)
      .where(eq(settings.key, "hunt_enabled"))
      .limit(1);
    if (res.length === 0) return false;
    return res[0].value === "true";
  } catch (error) {
    console.error("[isHuntEnabled] Error reading hunt_enabled setting:", error);
    return false;
  }
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

export interface ValidatedCouponResult {
  isValid: boolean;
  error?: string;
  influencer?: typeof influencers.$inferSelect | null;
  huntClaim?: {
    id: number;
    code: string;
    voucherCode: string;
    offerType: "PERCENT_OFF" | "BOGO" | "FREE_MEAL" | "FREE_SIDE";
    discountValue: number | null;
    expiresAt: Date;
    label: string;
  } | null;
}

/**
 * Validates a coupon code server-side against database.
 * Supports both creator partner codes and QR treasure hunt vouchers (HUNT-*).
 * Returns normalized uppercase code and influencer record if valid.
 * Returns one generic error message for invalid/inactive/paused codes.
 */
export async function validateCouponCode(
  rawCode: string | null | undefined,
  customerPhone?: string | null,
  rateLimitIdentifier?: string
): Promise<ValidatedCouponResult> {
  if (!rawCode || !rawCode.trim()) {
    return { isValid: false, influencer: null, huntClaim: null };
  }

  if (rateLimitIdentifier && !checkCouponRateLimit(rateLimitIdentifier)) {
    return {
      isValid: false,
      error: "Too many coupon validation attempts. Please try again in a minute.",
      influencer: null,
      huntClaim: null,
    };
  }

  const normalizedCode = rawCode.trim().toUpperCase();

  // Branch A: QR Treasure Hunt Voucher (HUNT-*)
  if (isHuntVoucherCode(normalizedCode)) {
    const huntActive = await isHuntEnabled();
    if (!huntActive) {
      return {
        isValid: false,
        error: "Invalid or expired coupon code.",
        influencer: null,
        huntClaim: null,
      };
    }

    try {
      const hold = await getActiveHold(normalizedCode);
      if (!hold) {
        return {
          isValid: false,
          error: "Invalid or expired treasure hunt voucher.",
          influencer: null,
          huntClaim: null,
        };
      }

      return {
        isValid: true,
        influencer: null,
        huntClaim: {
          id: hold.claim.id,
          code: `${HUNT_CONFIG.VOUCHER_PREFIX}${hold.claim.voucherCode}`,
          voucherCode: hold.claim.voucherCode,
          offerType: hold.campaign.offerType,
          discountValue: hold.campaign.discountValue,
          expiresAt: hold.claim.expiresAt,
          label: formatOfferLabel(hold.campaign.offerType, hold.campaign.discountValue),
        },
      };
    } catch (huntErr) {
      console.error("[validateCouponCode] Hunt lookup error:", huntErr);
      return {
        isValid: false,
        error: "Invalid or expired coupon code.",
        influencer: null,
        huntClaim: null,
      };
    }
  }

  // Branch B: Standard Creator / Influencer Partner Code
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
        huntClaim: null,
      };
    }

    const influencer = records[0];
    return { isValid: true, influencer, huntClaim: null };
  } catch (error) {
    console.error("[validateCouponCode] Database lookup error:", error);
    return {
      isValid: false,
      error: "Invalid or expired coupon code.",
      influencer: null,
      huntClaim: null,
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
  let appliedHuntClaimId: number | null = null;
  let appliedHuntOfferType: "PERCENT_OFF" | "BOGO" | "FREE_MEAL" | "FREE_SIDE" | null = null;
  let appliedHuntRewardLabel: string | null = null;
  let needsMoreItems = false;
  let unlockHint: string | undefined = undefined;

  if (couponCode && couponCode.trim()) {
    const couponRes = await validateCouponCode(
      couponCode,
      customerPhone,
      customerPhone || "anonymous_ip"
    );

    if (!couponRes.isValid || (!couponRes.influencer && !couponRes.huntClaim)) {
      return {
        valid: false,
        error: couponRes.error || "Invalid or expired coupon code.",
        items: validatedItems,
        subtotal: rawFoodSubtotal,
        discountAmount: 0,
        discountedSubtotal: rawFoodSubtotal,
        deliveryFee: 0,
        total: rawFoodSubtotal,
        couponCode: null,
        influencerId: null,
        commissionAmount: 0,
        distanceKm,
        isDeliverable: true,
        deliveryReason: "Invalid coupon code.",
      };
    }

    if (couponRes.huntClaim) {
      const claim = couponRes.huntClaim;
      appliedCouponCode = claim.code;
      appliedHuntClaimId = claim.id;
      appliedHuntOfferType = claim.offerType;
      appliedHuntRewardLabel = claim.label;
      appliedInfluencerId = null;
      commissionAmount = 0;

      switch (claim.offerType) {
        case "PERCENT_OFF": {
          const pct = claim.discountValue || 10;
          discountAmount = Math.round((rawFoodSubtotal * pct) / 100);
          break;
        }
        case "BOGO": {
          const totalUnits = validatedItems.reduce((sum, item) => sum + item.quantity, 0);
          if (totalUnits < 2) {
            discountAmount = 0;
            needsMoreItems = true;
            unlockHint = "Add one more item to your cart to unlock your Buy 1 Get 1 Free reward!";
          } else {
            const cheapestUnitPrice = Math.min(...validatedItems.map((item) => item.price));
            discountAmount = cheapestUnitPrice;
          }
          break;
        }
        case "FREE_MEAL": {
          const mealItems = validatedItems.filter((item) => {
            const cat = BRAND_MENU_MAP.get(item.id)?.category;
            return cat === "bento" || cat === "bibimbap";
          });
          if (mealItems.length === 0) {
            discountAmount = 0;
            needsMoreItems = true;
            unlockHint = "Add a Bento Box or Bibimbap Bowl to unlock your Free Meal reward!";
          } else {
            const cheapestMealPrice = Math.min(...mealItems.map((item) => item.price));
            discountAmount = cheapestMealPrice;
          }
          break;
        }
        case "FREE_SIDE": {
          const sideItems = validatedItems.filter((item) => {
            const cat = BRAND_MENU_MAP.get(item.id)?.category;
            return cat === "sides";
          });
          if (sideItems.length === 0) {
            discountAmount = 0;
            needsMoreItems = true;
            unlockHint = "Add a side (Kimchi, Cucumber Salad, or Pickled Radish) to unlock your Free Side reward!";
          } else {
            const cheapestSidePrice = Math.min(...sideItems.map((item) => item.price));
            discountAmount = cheapestSidePrice;
          }
          break;
        }
      }

      // Clamp discount
      discountAmount = Math.min(rawFoodSubtotal, Math.max(0, discountAmount));
    } else if (couponRes.influencer) {
      const inf = couponRes.influencer;
      appliedCouponCode = inf.code;
      appliedInfluencerId = inf.id;

      // Discount applies to FOOD SUBTOTAL ONLY (Math.round applied in ONE place)
      discountAmount = Math.round((rawFoodSubtotal * inf.discountPercent) / 100);

      // Commission = commission_percent of discounted food subtotal
      const discountedSubtotalTemp = Math.max(0, rawFoodSubtotal - discountAmount);
      commissionAmount = Math.round((discountedSubtotalTemp * inf.commissionPercent) / 100);
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
      huntClaimId: appliedHuntClaimId,
      huntOfferType: appliedHuntOfferType,
      huntRewardLabel: appliedHuntRewardLabel,
      needsMoreItems,
      unlockHint,
    };
  }

  const deliveryFee = feeResult.fee;
  const finalTotal = discountedSubtotal + deliveryFee;

  return {
    valid: true,
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
    huntClaimId: appliedHuntClaimId,
    huntOfferType: appliedHuntOfferType,
    huntRewardLabel: appliedHuntRewardLabel,
    needsMoreItems,
    unlockHint,
  };
}
