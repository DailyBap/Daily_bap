// app/actions/orderActions.ts — Next.js Server Actions for Daily Bap

"use server";

import { db } from "@/lib/db";
import { users, orders } from "@/lib/schema";
import { generateWhatsAppLink } from "@/lib/whatsapp";
import { validateDeliveryTimeSlot } from "@/lib/deliverySlots";
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
 * 3. Check slot capacity
 * 4. Upsert user by phone number
 * 5. Insert order record (status: pending)
 * 6. Generate WhatsApp deep-link with order tracking link & slot label
 */
export async function placeOrder(
  payload: PlaceOrderPayload
): Promise<{ success: boolean; whatsappUrl: string; orderId: string }> {
  const {
    items,
    customer,
    subtotal,
    requestedDeliveryTime,
    deliverySlotLabel,
  } = payload;

  // 1. Server-side validation of requested delivery time slot
  if (!requestedDeliveryTime || !deliverySlotLabel) {
    throw new Error("Please select a delivery time slot before placing your order.");
  }

  const timeDate = new Date(requestedDeliveryTime);
  const valResult = validateDeliveryTimeSlot(timeDate);
  if (!valResult.valid) {
    throw new Error(valResult.reason || "Invalid delivery time slot.");
  }

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
      throw new Error(
        `Your location is ${Math.round(distanceKm * 10) / 10}km away, which exceeds our maximum ${MAX_DELIVERY_RADIUS_KM}km delivery radius.`
      );
    }
  }

  const feeResult = calculateDeliveryFee(distanceKm, subtotal);
  const validatedDeliveryFee = feeResult.fee;
  const total = subtotal + validatedDeliveryFee;

  // 3. Capacity Guard Check
  const existingSlotOrders = await db
    .select({ count: count(orders.id) })
    .from(orders)
    .where(eq(orders.deliverySlotLabel, deliverySlotLabel));

  const slotOrderCount = Number(existingSlotOrders[0]?.count || 0);
  if (slotOrderCount >= MAX_ORDERS_PER_SLOT) {
    throw new Error(
      `Selected time slot (${deliverySlotLabel}) has reached maximum order capacity. Please pick another slot.`
    );
  }

  try {
    // 4. Find or create user
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

    // 5. Insert order record
    const [newOrder] = await db
      .insert(orders)
      .values({
        userId,
        items: items as unknown as Record<string, unknown>[],
        totalAmount: total,
        deliveryFee: validatedDeliveryFee,
        deliveryAddress: customer.address,
        requestedDeliveryTime: timeDate,
        deliverySlotLabel,
        status: "pending",
        whatsappSent: "yes",
      })
      .returning({ id: orders.id });

    // 6. Generate WhatsApp deep-link
    const whatsappUrl = generateWhatsAppLink(
      items,
      customer,
      subtotal,
      validatedDeliveryFee,
      deliverySlotLabel,
      newOrder.id
    );

    return { success: true, whatsappUrl, orderId: newOrder.id };
  } catch (error: unknown) {
    console.error("[placeOrder] Error saving order:", error);
    const msg = error instanceof Error ? error.message : "Failed to place order.";
    throw new Error(msg);
  }
}
