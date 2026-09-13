// app/actions/adminActions.ts — Next.js Server Actions for Admin Dashboard & Offers

"use server";

import { db } from "@/lib/db";
import { orders, offers, users, settings } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export type OrderStatus =
  | "draft"
  | "pending"
  | "confirmed"
  | "preparing"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export async function verifyAdminPin(pin: string): Promise<boolean> {
  const adminPin = process.env.ADMIN_PIN || "1234";
  return pin === adminPin;
}

/**
 * Fetch whether the kitchen is currently closed (e.g. during holidays).
 */
export async function getKitchenStatus(): Promise<boolean> {
  try {
    const result = await db
      .select()
      .from(settings)
      .where(eq(settings.key, "kitchen_closed"))
      .limit(1);

    return result[0]?.value === "true";
  } catch (error) {
    console.error("[getKitchenStatus] Error fetching kitchen status:", error);
    return false;
  }
}

/**
 * Toggle kitchen closed status (Holiday Mode).
 */
export async function toggleKitchenStatus(isClosed: boolean) {
  try {
    const value = isClosed ? "true" : "false";

    const existing = await db
      .select()
      .from(settings)
      .where(eq(settings.key, "kitchen_closed"))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(settings)
        .set({ value, updatedAt: new Date() })
        .where(eq(settings.key, "kitchen_closed"));
    } else {
      await db.insert(settings).values({
        key: "kitchen_closed",
        value,
      });
    }

    revalidatePath("/admin");
    revalidatePath("/");
    return { success: true, isClosed };
  } catch (error) {
    console.error("[toggleKitchenStatus] Error updating kitchen status:", error);
    return { success: false, error: "Failed to update kitchen status" };
  }
}


/**
 * Fetch all orders ordered by newest first, joining customer info.
 */
export async function getAllOrders() {
  try {
    const result = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        status: orders.status,
        totalAmount: orders.totalAmount,
        deliveryFee: orders.deliveryFee,
        deliveryAddress: orders.deliveryAddress,
        requestedDeliveryTime: orders.requestedDeliveryTime,
        deliverySlotLabel: orders.deliverySlotLabel,
        items: orders.items,
        createdAt: orders.createdAt,
        userName: users.name,
        userPhone: users.phone,
      })
      .from(orders)
      .leftJoin(users, eq(orders.userId, users.id))
      .orderBy(desc(orders.createdAt));

    return result;
  } catch (error) {
    console.error("[getAllOrders] Error fetching orders:", error);
    return [];
  }
}

/**
 * Update status of an order (e.g. 'pending', 'preparing', 'out_for_delivery', 'delivered').
 */
export async function updateOrderStatus(orderId: string, newStatus: OrderStatus) {
  try {
    await db
      .update(orders)
      .set({ status: newStatus })
      .where(eq(orders.id, orderId));

    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error("[updateOrderStatus] Error updating order status:", error);
    return { success: false, error: "Failed to update status" };
  }
}

/**
 * Fetch all offers ordered by newest first.
 */
export async function getAllOffers() {
  try {
    const result = await db
      .select()
      .from(offers)
      .orderBy(desc(offers.createdAt));
    return result;
  } catch (error) {
    console.error("[getAllOffers] Error fetching offers:", error);
    return [];
  }
}

/**
 * Get the single active offer for the frontend banner.
 */
export async function getActiveOffer() {
  try {
    const result = await db
      .select()
      .from(offers)
      .where(eq(offers.isActive, true))
      .limit(1);

    return result[0] || null;
  } catch (error) {
    console.error("[getActiveOffer] Error fetching active offer:", error);
    return null;
  }
}

/**
 * Create a new offer record.
 */
export async function createNewOffer(title: string, code: string) {
  try {
    if (!title.trim() || !code.trim()) {
      return { success: false, error: "Title and code are required." };
    }

    await db.insert(offers).values({
      title: title.trim(),
      code: code.trim().toUpperCase(),
      isActive: false,
    });

    revalidatePath("/admin");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("[createNewOffer] Error creating offer:", error);
    return { success: false, error: "Failed to create offer" };
  }
}

/**
 * Toggle an offer's isActive state. If turning active, deactivates all other offers first.
 */
export async function toggleOffer(offerId: string, isActive: boolean) {
  try {
    if (isActive) {
      // Deactivate all offers first so only 1 single active offer exists
      await db.update(offers).set({ isActive: false });
    }

    await db
      .update(offers)
      .set({ isActive })
      .where(eq(offers.id, offerId));

    revalidatePath("/admin");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("[toggleOffer] Error toggling offer:", error);
    return { success: false, error: "Failed to toggle offer" };
  }
}
