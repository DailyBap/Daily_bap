// app/actions/orderActions.ts — Next.js Server Actions for Daily Bap

"use server";

import { db } from "@/lib/db";
import { users, orders } from "@/lib/schema";
import { generateWhatsAppLink } from "@/lib/whatsapp";
import { validateDeliveryTimeSlot } from "@/lib/deliverySlots";
import { getKitchenStatus } from "@/app/actions/adminActions";
import { calculateOrderTotals, validateCouponCode } from "@/lib/pricing";
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
): Promise<{ success: boolean; whatsappUrl?: string; orderId?: string; orderNumber?: string; error?: string }> {
  try {
    const {
      items,
      customer,
      couponCode,
      requestedDeliveryTime,
      deliverySlotLabel,
    } = payload;

    const orderNumber =
      payload.orderNumber ||
      "BAP-" + Math.random().toString(36).substring(2, 6).toUpperCase();

    // 1. Server-side validation of requested delivery time slot
    if (!requestedDeliveryTime || !deliverySlotLabel) {
      return {
        success: false,
        error: "Please select a delivery time slot before placing your order.",
      };
    }

    if (deliverySlotLabel.startsWith("Today")) {
      const isKitchenClosed = await getKitchenStatus();
      if (isKitchenClosed) {
        return {
          success: false,
          error: "Kitchen is currently closed for holidays. Please select a delivery slot for tomorrow.",
        };
      }
    }

    const valResult = validateDeliveryTimeSlot(
      requestedDeliveryTime || deliverySlotLabel
    );
    if (!valResult.valid) {
      return {
        success: false,
        error: valResult.reason || "Invalid delivery time slot.",
      };
    }

    const parsedDate = new Date(requestedDeliveryTime);
    const timeDate = !isNaN(parsedDate.getTime()) ? parsedDate : new Date();

    // 2. Authoritative server-side pricing, distance, coupon discount, and fee calculation
    const pricingRes = await calculateOrderTotals({
      items,
      lat: customer.lat,
      lng: customer.lng,
      couponCode,
      customerPhone: customer.phone,
    });

    if (!pricingRes.valid) {
      return {
        success: false,
        error: pricingRes.error || "Failed to calculate order totals.",
      };
    }

    // 3. Find or create user
    let userId: string;
    const cleanPhone = customer.phone.replace(/\D/g, "");

    const existingUsers = await db
      .select()
      .from(users)
      .where(eq(users.phone, cleanPhone))
      .limit(1);

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

    // 4. Insert order record with status "pending" directly
    const [newOrder] = await db
      .insert(orders)
      .values({
        userId,
        orderNumber,
        items: pricingRes.items as unknown as Record<string, unknown>[],
        totalAmount: pricingRes.total,
        deliveryFee: pricingRes.deliveryFee,
        deliveryAddress: customer.address,
        requestedDeliveryTime: timeDate,
        deliverySlotLabel,
        couponCode: pricingRes.couponCode,
        influencerId: pricingRes.influencerId,
        discountAmount: pricingRes.discountAmount,
        commissionAmount: pricingRes.commissionAmount,
        status: "pending",
        whatsappSent: "no",
      })
      .returning({ id: orders.id });

    // 5. Trigger Non-blocking Telegram Notification (Task 6)
    void sendTelegramOrderNotification({
      orderId: newOrder.id,
      orderNumber,
      customerName: customer.name,
      customerPhone: cleanPhone,
      deliveryAddress: customer.address,
      deliverySlotLabel,
      items: pricingRes.items as Array<{ name?: string; summary?: string; quantity?: number; price?: number }>,
      totalAmount: pricingRes.total,
      deliveryFee: pricingRes.deliveryFee,
      discountAmount: pricingRes.discountAmount,
      couponCode: pricingRes.couponCode,
    }).catch((err) => {
      console.error("[placeOrder] Telegram notification error:", err);
    });

    // 6. Generate optional WhatsApp link for customer's reference
    const whatsappUrl = generateWhatsAppLink(
      pricingRes.items as CartItem[],
      customer,
      pricingRes.discountedSubtotal,
      pricingRes.deliveryFee,
      deliverySlotLabel,
      newOrder.id,
      orderNumber
    );

    return { success: true, whatsappUrl, orderId: newOrder.id, orderNumber };
  } catch (error: unknown) {
    console.error("[placeOrder] Error saving order:", error);
    const msg =
      error instanceof Error ? error.message : "Failed to place order. Please try again.";
    return { success: false, error: msg };
  }
}

