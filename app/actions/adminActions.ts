// app/actions/adminActions.ts — Server Actions for Kitchen Admin Dashboard

"use server";

import { db } from "@/lib/db";
import { orders } from "@/lib/schema";
import { ADMIN_PIN } from "@/config/brand";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function verifyAdminPin(pin: string): Promise<boolean> {
  return pin === ADMIN_PIN;
}

export async function updateOrderStatus(
  orderId: string,
  newStatus: "pending" | "confirmed" | "preparing" | "out_for_delivery" | "delivered" | "cancelled"
): Promise<{ success: boolean; message?: string }> {
  try {
    await db
      .update(orders)
      .set({ status: newStatus })
      .where(eq(orders.id, orderId));

    revalidatePath("/admin/orders");
    revalidatePath(`/orders/${orderId}`);

    return { success: true, message: `Status updated to ${newStatus}` };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to update status";
    return { success: false, message: msg };
  }
}
