// app/actions/orderActions.ts — Next.js Server Actions for Daily Bap

"use server";

import { db } from "@/lib/db";
import { users, orders } from "@/lib/schema";
import { generateWhatsAppLink } from "@/lib/whatsapp";
import { validateDeliveryTimeSlot } from "@/lib/deliverySlots";
import { getKitchenStatus } from "@/app/actions/adminActions";
import {
  calculateDeliveryFee,
  haversineDistance,
  KITCHEN_COORDS,
  MAX_DELIVERY_RADIUS_KM,
} from "@/lib/geo";
import { MAX_ORDERS_PER_SLOT } from "@/config/brand";
import { eq, count } from "drizzle-orm";
import type { CartItem, CustomerInfo } from "@/types";

interface PlaceOrderPayload {
  items: CartItem[];
  customer: CustomerInfo;
  subtotal: number;
  deliveryFee: number;
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
 * Server Action: Save the order to Neon DB and return WhatsApp deep link.
 * 1. Validate requested delivery slot server-side
 * 2. Recalculate distance and delivery fee server-side (never trust client fee)
 * 3. Upsert user by phone number
 * 4. Insert order record (status: pending, with orderNumber)
 * 5. Generate WhatsApp deep-link with order tracking link & slot label
 */
export async function placeOrder(
  payload: PlaceOrderPayload
): Promise<{ success: boolean; whatsappUrl?: string; orderId?: string; error?: string }> {
  try {
    const {
      items,
      customer,
      subtotal,
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

    // 2. Server-side distance & delivery fee calculation
    let distanceKm: number | null = null;
    if (customer.lat != null && customer.lng != null) {
      distanceKm = haversineDistance(
        KITCHEN_COORDS.lat,
        KITCHEN_COORDS.lng,
        customer.lat,
        customer.lng
      );

      if (distanceKm > MAX_DELIVERY_RADIUS_KM) {
        return {
          success: false,
          error: `Your location is ${Math.round(distanceKm * 10) / 10}km away, which exceeds our maximum ${MAX_DELIVERY_RADIUS_KM}km delivery radius.`,
        };
      }
    }

    const feeResult = calculateDeliveryFee(distanceKm, subtotal);
    const validatedDeliveryFee = feeResult.fee;
    const total = subtotal + validatedDeliveryFee;

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

    // 4. Insert order record
    const [newOrder] = await db
      .insert(orders)
      .values({
        userId,
        orderNumber,
        items: items as unknown as Record<string, unknown>[],
        totalAmount: total,
        deliveryFee: validatedDeliveryFee,
        deliveryAddress: customer.address,
        requestedDeliveryTime: timeDate,
        deliverySlotLabel,
        status: "draft",
        whatsappSent: "yes",
      })
      .returning({ id: orders.id });

    // 5. Generate WhatsApp deep-link
    const whatsappUrl = generateWhatsAppLink(
      items,
      customer,
      subtotal,
      validatedDeliveryFee,
      deliverySlotLabel,
      newOrder.id,
      orderNumber
    );

    return { success: true, whatsappUrl, orderId: newOrder.id };
  } catch (error: unknown) {
    console.error("[placeOrder] Error saving order:", error);
    const msg =
      error instanceof Error ? error.message : "Failed to place order. Please try again.";
    return { success: false, error: msg };
  }
}
