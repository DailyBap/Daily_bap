// app/actions/orderActions.ts — Next.js Server Actions for Daily Bap

"use server";

import { db } from "@/lib/db";
import { users, orders } from "@/lib/schema";
import { generateWhatsAppLink } from "@/lib/whatsapp";
import { eq } from "drizzle-orm";
import type { CartItem, CustomerInfo } from "@/types";

interface PlaceOrderPayload {
  items: CartItem[];
  customer: CustomerInfo;
  subtotal: number;
  deliveryFee: number;
}

/**
 * Server Action: Save the order to Neon DB and return WhatsApp deep link.
 * 1. Upsert user by phone number
 * 2. Insert order record (status: pending)
 * 3. Generate WhatsApp deep-link
 * 4. Return { success: true, whatsappUrl }
 */
export async function placeOrder(
  payload: PlaceOrderPayload
): Promise<{ success: boolean; whatsappUrl: string }> {
  const { items, customer, subtotal, deliveryFee } = payload;
  const total = subtotal + deliveryFee;

  try {
    // 1. Find or create user
    let userId: string;
    const existingUsers = await db
      .select()
      .from(users)
      .where(eq(users.phone, customer.phone))
      .limit(1);

    if (existingUsers.length > 0) {
      userId = existingUsers[0].id;
      // Update name in case it changed
      await db
        .update(users)
        .set({ name: customer.name })
        .where(eq(users.id, userId));
    } else {
      const [newUser] = await db
        .insert(users)
        .values({ name: customer.name, phone: customer.phone })
        .returning({ id: users.id });
      userId = newUser.id;
    }

    // 2. Insert order record
    await db.insert(orders).values({
      userId,
      items: items as unknown as Record<string, unknown>[],
      totalAmount: total,
      deliveryFee,
      deliveryAddress: customer.address,
      status: "pending",
      whatsappSent: "yes",
    });

    // 3. Generate WhatsApp deep-link
    const whatsappUrl = generateWhatsAppLink(
      items,
      customer,
      subtotal,
      deliveryFee
    );

    // 4. Return result to client
    return { success: true, whatsappUrl };
  } catch (error) {
    console.error("[placeOrder] Error saving order:", error);
    throw new Error(
      "Failed to place order. Please try again or contact us on WhatsApp."
    );
  }
}
