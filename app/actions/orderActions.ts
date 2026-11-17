// app/actions/orderActions.ts — Next.js Server Actions for Daily Bap

"use server";

import { db } from "@/lib/db";
import { users, orders, influencers } from "@/lib/schema";
import { generateWhatsAppLink } from "@/lib/whatsapp";
import { validateDeliveryTimeSlot, parseSlotLabelToUTC } from "@/lib/deliverySlots";
import { assertOrderAllowed } from "@/lib/storeStatus";
import { calculateOrderTotals, validateCouponCode } from "@/lib/pricing";
import { redeemHold } from "@/lib/hunt/claims";
import { getClientIp } from "@/lib/adminAuth";
import { MAX_ORDERS_PER_SLOT } from "@/config/brand";
import { eq, count } from "drizzle-orm";
import { sendTelegramOrderNotification } from "@/lib/telegram";
import type { CartItem, CustomerInfo } from "@/types";

/**
 * Server Action: Validate coupon code for frontend preview (rate limited per IP)
 */
export async function validateCouponAction(code: string) {
  try {
    const ip = await getClientIp();
    const res = await validateCouponCode(code, null, ip);
    if (res.isValid && res.influencer) {
      return {
        success: true,
        code: res.influencer.code,
        discountPercent: res.influencer.discountPercent,
        isHunt: false,
      };
    }
    if (res.isValid && res.huntClaim) {
      return {
        success: true,
        code: res.huntClaim.code,
        discountPercent: res.huntClaim.discountValue || 0,
        isHunt: true,
        huntLabel: res.huntClaim.label,
        offerType: res.huntClaim.offerType,
        expiresAt: res.huntClaim.expiresAt.toISOString(),
      };
    }
    return {
      success: false,
      error: res.error || "Invalid or expired coupon code.",
    };
  } catch (error) {
    return {
      success: false,
      error: "Invalid or expired coupon code.",
    };
  }
}

interface PlaceOrderPayload {
  items: CartItem[];
  customer: CustomerInfo;
  subtotal: number;
  deliveryFee: number;
  couponCode?: string | null;
  requestedDeliveryTime?: string | Date | null;
  deliverySlotLabel?: string | null;
  orderNumber?: string | null;
}

/**
 * Server Action: Query order counts grouped by deliverySlotLabel for capacity guarding.
 */
export async function getSlotCapacities(): Promise<Record<string, number>> {
  try {
    const counts = await db
      .select({
        slotLabel: orders.deliverySlotLabel,
        orderCount: count(orders.id),
      })
      .from(orders)
      .where(eq(orders.status, "pending"))
      .groupBy(orders.deliverySlotLabel);

    const capacityMap: Record<string, number> = {};
    for (const c of counts) {
      if (c.slotLabel) {
        capacityMap[c.slotLabel] = Number(c.orderCount);
      }
    }
    return capacityMap;
  } catch (error) {
    console.error("[getSlotCapacities] Error fetching capacities:", error);
    return {};
  }
}

export interface PlaceOrderResult {
  success: boolean;
  whatsappUrl?: string;
  orderId?: string;
  orderNumber?: string;
  error?: string;
  fallback?: boolean;
}

/**
 * Server Action: Save the order to Neon DB, trigger Telegram bot alert, and return order details.
 * 1. Validate requested delivery slot server-side
 * 2. Calculate authoritative order totals, distance, discounts, and fees using lib/pricing.ts
 * 3. Upsert user by phone number
 * 4. Insert order record directly with status: "pending"
 * 5. Send real-time Telegram notification to admin (non-blocking)
 * 6. Return orderId and optional WhatsApp link for tracking/support
 */
export async function placeOrder(
  payload: PlaceOrderPayload
): Promise<PlaceOrderResult> {
  const startTime = Date.now();
  let currentStage: "slot" | "pricing" | "db:user" | "db:influencer" | "db:order_insert" | "post:notify" = "slot";
  let stageStartTime = startTime;
  const stageElapsed: Record<string, number> = {
    slot: 0,
    pricing: 0,
    "db:user": 0,
    "db:influencer": 0,
    "db:order_insert": 0,
    "post:notify": 0,
  };

  const advanceStage = (nextStage: "pricing" | "db:user" | "db:influencer" | "db:order_insert" | "post:notify") => {
    const now = Date.now();
    stageElapsed[currentStage] = now - stageStartTime;
    currentStage = nextStage;
    stageStartTime = now;
  };

  try {
    const {
      items,
      customer,
      couponCode,
      requestedDeliveryTime,
      deliverySlotLabel,
    } = payload;

    // 1. [stage:slot] Server-side validation and parsing of requested delivery time slot
    if (!deliverySlotLabel && !requestedDeliveryTime) {
      return {
        success: false,
        error: "Please select a delivery time slot before placing your order.",
      };
    }

    const effectiveSlotLabel = deliverySlotLabel || (typeof requestedDeliveryTime === "string" ? requestedDeliveryTime : "");
    const valResult = validateDeliveryTimeSlot(effectiveSlotLabel);
    if (!valResult.valid) {
      return {
        success: false,
        error: valResult.reason || "Invalid delivery time slot.",
      };
    }

    // Convert slot to authoritative UTC Date (IST interpretation)
    const slotParse = parseSlotLabelToUTC(effectiveSlotLabel);
    if (!slotParse.valid || !slotParse.date) {
      return {
        success: false,
        error: slotParse.reason || "Invalid delivery time slot. Please select a valid slot.",
      };
    }
    const requestedDeliveryTimeUTC = slotParse.date;
    const cleanPhone = customer.phone.replace(/\D/g, "");

    // 2. [stage:pricing] Run independent initial queries in parallel via Promise.all
    // - Store closure settings check
    // - Authoritative pricing, distance, coupon discount, and fee calculation
    // - User lookup by phone number
    advanceStage("pricing");
    const [closureError, pricingRes, existingUsers] = await Promise.all([
      assertOrderAllowed(effectiveSlotLabel),
      calculateOrderTotals({
        items,
        lat: customer.lat,
        lng: customer.lng,
        couponCode,
        customerPhone: customer.phone,
      }),
      db
        .select()
        .from(users)
        .where(eq(users.phone, cleanPhone))
        .limit(1),
    ]);

    if (closureError) {
      return {
        success: false,
        error: closureError,
      };
    }

    if (!pricingRes.valid) {
      return {
        success: false,
        error: pricingRes.error || "Failed to calculate order totals.",
      };
    }

    // 3. [stage:db:user] Find or create user
    advanceStage("db:user");
    let userId: string;

    if (existingUsers.length > 0) {
      userId = existingUsers[0].id;
      await db
        .update(users)
        .set({ name: customer.name })
        .where(eq(users.id, userId));
    } else {
      const [newUser] = await db
        .insert(users)
        .values({ name: customer.name, phone: cleanPhone })
        .returning({ id: users.id });
      userId = newUser.id;
    }

    // 4. [stage:db:influencer] Influencer FK resilience
    // pricingRes was already verified against influencers table in calculateOrderTotals
    advanceStage("db:influencer");
    const finalInfluencerId: string | null = pricingRes.influencerId || null;
    const finalCommissionAmount: number = pricingRes.influencerId ? pricingRes.commissionAmount : 0;

    // 5. [stage:db:order_insert] Order Insertion with collision retry on order_number
    advanceStage("db:order_insert");
    const generateOrderNumber = () =>
      "BAP-" + Math.random().toString(36).substring(2, 6).toUpperCase();

    let orderNumber = payload.orderNumber || generateOrderNumber();
    let newOrder: { id: string } | null = null;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        const [inserted] = await db
          .insert(orders)
          .values({
            userId,
            orderNumber,
            items: Array.isArray(pricingRes.items) ? pricingRes.items : [],
            totalAmount: pricingRes.total,
            deliveryFee: pricingRes.deliveryFee,
            deliveryAddress: customer.address,
            requestedDeliveryTime: requestedDeliveryTimeUTC,
            deliverySlotLabel: effectiveSlotLabel,
            couponCode: pricingRes.couponCode?.trim() || null,
            influencerId: finalInfluencerId,
            discountAmount: pricingRes.discountAmount,
            commissionAmount: finalCommissionAmount,
            huntClaimId: pricingRes.huntClaimId ? Number(pricingRes.huntClaimId) : null,
            status: "pending",
            whatsappSent: "no",
          })
          .returning({ id: orders.id });

        newOrder = inserted;
        break; // Successfully inserted
      } catch (insertErr: any) {
        // Retry on unique constraint collision on order_number (PG error 23505)
        const isUniqueViolation =
          insertErr?.code === "23505" ||
          insertErr?.cause?.code === "23505" ||
          String(insertErr?.message).includes("idx_orders_order_number_unique");

        if (isUniqueViolation && attempts < maxAttempts) {
          console.warn(`[placeOrder][stage:db:order_insert] order_number "${orderNumber}" collided, retrying (${attempts}/${maxAttempts})...`);
          orderNumber = generateOrderNumber();
          continue;
        }

        // Re-throw if non-retryable or max attempts exhausted
        throw insertErr;
      }
    }

    if (!newOrder) {
      throw new Error("Failed to insert order after maximum attempts.");
    }

    // Secondary step: Treasure Hunt voucher claim update (wrapped in try/catch so its failure never fails the order)
    if (pricingRes.huntClaimId) {
      try {
        await redeemHold(pricingRes.huntClaimId, newOrder.id, cleanPhone);
      } catch (huntErr) {
        console.warn("[placeOrder] Warning: secondary hunt voucher hold redemption failed:", huntErr);
      }
    }

    // 6. [stage:post:notify] Secondary notification steps (Telegram & WhatsApp link)
    advanceStage("post:notify");
    try {
      void sendTelegramOrderNotification({
        orderId: newOrder.id,
        orderNumber,
        customerName: customer.name,
        customerPhone: cleanPhone,
        deliveryAddress: customer.address,
        deliverySlotLabel: effectiveSlotLabel,
        items: pricingRes.items as Array<{ name?: string; summary?: string; quantity?: number; price?: number }>,
        totalAmount: pricingRes.total,
        deliveryFee: pricingRes.deliveryFee,
        discountAmount: pricingRes.discountAmount,
        couponCode: pricingRes.couponCode,
        huntRewardLabel: pricingRes.huntRewardLabel || null,
      }).catch((err) => {
        console.error("[placeOrder][stage:post:notify] Secondary step failed (Telegram notification):", err);
      });
    } catch (tgErr) {
      console.error("[placeOrder][stage:post:notify] Secondary step error (Telegram dispatch):", tgErr);
    }

    let whatsappUrl: string | undefined;
    try {
      whatsappUrl = generateWhatsAppLink(
        pricingRes.items as CartItem[],
        customer,
        pricingRes.discountedSubtotal,
        pricingRes.deliveryFee,
        effectiveSlotLabel,
        newOrder.id,
        orderNumber,
        pricingRes.couponCode,
        pricingRes.discountAmount
      );
    } catch (waErr) {
      console.error("[placeOrder][stage:post:notify] Secondary step failed (WhatsApp link generation):", waErr);
    }

    return { success: true, whatsappUrl, orderId: newOrder.id, orderNumber };
  } catch (error: any) {
    const now = Date.now();
    stageElapsed[currentStage] = now - stageStartTime;
    const totalElapsed = now - startTime;

    // SECURITY: Log complete raw PostgreSQL / Drizzle error & stage breakdown server-side only
    console.error(`[placeOrder][stage:${currentStage}] Critical failure:`, {
      stage: `[stage:${currentStage}]`,
      elapsedMsTotal: totalElapsed,
      elapsedMsPerStage: stageElapsed,
      message: error?.message,
      causeCode: error?.cause?.code || error?.code,
      causeMessage: error?.cause?.message,
      detail: error?.cause?.detail || error?.detail,
      constraint: error?.cause?.constraint || error?.constraint,
    });

    // Failsafe: Generate fallback WhatsApp URL pre-filled with customer's complete cart details
    let fallbackWaUrl: string | undefined;
    try {
      fallbackWaUrl = generateWhatsAppLink(
        payload.items,
        payload.customer,
        payload.subtotal,
        payload.deliveryFee,
        payload.deliverySlotLabel,
        null,
        payload.orderNumber || "PRE-ORDER",
        payload.couponCode,
        0
      );
    } catch {
      // Non-fatal
    }

    // Return safe, user-friendly error to browser with fallback flag (never expose SQL, IDs, or params)
    return {
      success: false,
      error: "We couldn't place your order. Please try again or contact us on WhatsApp.",
      fallback: true,
      whatsappUrl: fallbackWaUrl,
    };
  }
}

