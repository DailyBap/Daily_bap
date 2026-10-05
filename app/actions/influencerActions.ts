// app/actions/influencerActions.ts — Next.js Server Actions for Influencer Management (Phase 5)

"use server";

import { db } from "@/lib/db";
import { influencers, orders } from "@/lib/schema";
import { eq, sql, desc, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { verifyAdminSession } from "@/lib/adminAuth";

export interface InfluencerWithStats {
  id: string;
  name: string;
  instagramHandle: string | null;
  phoneOrUpi: string | null;
  code: string;
  discountPercent: number;
  commissionPercent: number;
  isActive: boolean;
  notes: string | null;
  createdAt: Date;
  totalOrders: number;
  totalSales: number;
  totalCommission: number;
  unpaidCommission: number;
  paidCommission: number;
}

/**
 * Server Action: Fetch all influencers with aggregated order stats (Delivered orders only)
 */
export async function getInfluencersAction(): Promise<InfluencerWithStats[]> {
  if (!(await verifyAdminSession())) {
    return [];
  }

  try {
    const list = await db
      .select({
        id: influencers.id,
        name: influencers.name,
        instagramHandle: influencers.instagramHandle,
        phoneOrUpi: influencers.phoneOrUpi,
        code: influencers.code,
        discountPercent: influencers.discountPercent,
        commissionPercent: influencers.commissionPercent,
        isActive: influencers.isActive,
        notes: influencers.notes,
        createdAt: influencers.createdAt,
        totalOrders: sql<number>`COALESCE(COUNT(CASE WHEN ${orders.status} = 'delivered' THEN ${orders.id} END), 0)::int`,
        totalSales: sql<number>`COALESCE(SUM(CASE WHEN ${orders.status} = 'delivered' THEN ${orders.totalAmount} ELSE 0 END), 0)::int`,
        totalCommission: sql<number>`COALESCE(SUM(CASE WHEN ${orders.status} = 'delivered' THEN ${orders.commissionAmount} ELSE 0 END), 0)::int`,
        unpaidCommission: sql<number>`COALESCE(SUM(CASE WHEN ${orders.status} = 'delivered' AND ${orders.commissionPaid} = false THEN ${orders.commissionAmount} ELSE 0 END), 0)::int`,
        paidCommission: sql<number>`COALESCE(SUM(CASE WHEN ${orders.status} = 'delivered' AND ${orders.commissionPaid} = true THEN ${orders.commissionAmount} ELSE 0 END), 0)::int`,
      })
      .from(influencers)
      .leftJoin(orders, eq(orders.influencerId, influencers.id))
      .groupBy(influencers.id)
      .orderBy(desc(influencers.createdAt));

    return list;
  } catch (error) {
    console.error("[getInfluencersAction] Error fetching influencers:", error);
    return [];
  }
}

/**
 * Server Action: Create new creator (Uppercase code, 0..100 percentages)
 */
export async function createInfluencerAction(data: {
  name: string;
  code: string;
  instagramHandle?: string;
  phoneOrUpi?: string;
  discountPercent?: number;
  commissionPercent?: number;
  notes?: string;
}) {
  if (!(await verifyAdminSession())) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const name = data.name?.trim();
    const code = data.code?.trim().toUpperCase();
    const discountPercent = Number(data.discountPercent ?? 10);
    const commissionPercent = Number(data.commissionPercent ?? 10);

    if (!name || !code) {
      return { success: false, error: "Name and coupon code are required." };
    }

    if (discountPercent < 0 || discountPercent > 100) {
      return { success: false, error: "Discount percentage must be between 0 and 100." };
    }

    if (commissionPercent < 0 || commissionPercent > 100) {
      return { success: false, error: "Commission percentage must be between 0 and 100." };
    }

    // Check duplicate code
    const existing = await db
      .select()
      .from(influencers)
      .where(eq(influencers.code, code))
      .limit(1);

    if (existing.length > 0) {
      return { success: false, error: `Creator code "${code}" already exists.` };
    }

    const [newCreator] = await db
      .insert(influencers)
      .values({
        name,
        code,
        instagramHandle: data.instagramHandle?.trim() || null,
        phoneOrUpi: data.phoneOrUpi?.trim() || null,
        discountPercent,
        commissionPercent,
        notes: data.notes?.trim() || null,
        isActive: true,
      })
      .returning();

    revalidatePath("/admin");
    return { success: true, influencer: newCreator };
  } catch (error) {
    console.error("[createInfluencerAction] Error creating creator:", error);
    return { success: false, error: "Failed to create creator." };
  }
}

/**
 * Server Action: Update creator details
 */
export async function updateInfluencerAction(
  id: string,
  data: {
    name?: string;
    instagramHandle?: string;
    phoneOrUpi?: string;
    discountPercent?: number;
    commissionPercent?: number;
    isActive?: boolean;
    notes?: string;
  }
) {
  if (!(await verifyAdminSession())) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const updateValues: Record<string, unknown> = {};

    if (data.name !== undefined) updateValues.name = data.name.trim();
    if (data.instagramHandle !== undefined) updateValues.instagramHandle = data.instagramHandle.trim() || null;
    if (data.phoneOrUpi !== undefined) updateValues.phoneOrUpi = data.phoneOrUpi.trim() || null;
    if (data.notes !== undefined) updateValues.notes = data.notes.trim() || null;
    if (data.isActive !== undefined) updateValues.isActive = data.isActive;

    if (data.discountPercent !== undefined) {
      const disc = Number(data.discountPercent);
      if (disc < 0 || disc > 100) {
        return { success: false, error: "Discount percentage must be between 0 and 100." };
      }
      updateValues.discountPercent = disc;
    }

    if (data.commissionPercent !== undefined) {
      const comm = Number(data.commissionPercent);
      if (comm < 0 || comm > 100) {
        return { success: false, error: "Commission percentage must be between 0 and 100." };
      }
      updateValues.commissionPercent = comm;
    }

    await db.update(influencers).set(updateValues).where(eq(influencers.id, id));

    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error("[updateInfluencerAction] Error updating creator:", error);
    return { success: false, error: "Failed to update creator." };
  }
}

/**
 * Server Action: Toggle creator active/paused status (Creators are paused, never deleted)
 */
export async function toggleInfluencerStatusAction(id: string, isActive: boolean) {
  if (!(await verifyAdminSession())) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await db.update(influencers).set({ isActive }).where(eq(influencers.id, id));
    revalidatePath("/admin");
    return { success: true, isActive };
  } catch (error) {
    console.error("[toggleInfluencerStatusAction] Error toggling status:", error);
    return { success: false, error: "Failed to update creator status." };
  }
}

/**
 * Server Action: Mark an individual order's commission as paid / unpaid
 */
export async function markOrderCommissionPaidAction(orderId: string, paid: boolean) {
  if (!(await verifyAdminSession())) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await db
      .update(orders)
      .set({
        commissionPaid: paid,
        commissionPaidAt: paid ? new Date() : null,
      })
      .where(eq(orders.id, orderId));

    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error("[markOrderCommissionPaidAction] Error updating commission status:", error);
    return { success: false, error: "Failed to update commission payment status." };
  }
}

/**
 * Server Action: Mark all delivered orders for a creator in a given IST month (YYYY-MM) as paid / unpaid
 */
export async function markMonthlyCommissionPaidAction(
  influencerId: string,
  yearMonthIST: string, // "2026-10"
  paid: boolean
) {
  if (!(await verifyAdminSession())) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const [year, month] = yearMonthIST.split("-").map(Number);
    if (!year || !month) {
      return { success: false, error: "Invalid month format. Expected YYYY-MM." };
    }

    const startIST = `${yearMonthIST}-01 00:00:00`;
    const nextMonthYear = month === 12 ? year + 1 : year;
    const nextMonthVal = month === 12 ? 1 : month + 1;
    const nextMonthStr = String(nextMonthVal).padStart(2, "0");
    const endIST = `${nextMonthYear}-${nextMonthStr}-01 00:00:00`;

    // SQL condition filtering IST month boundaries
    const istCondition = sql`
      ${orders.influencerId} = ${influencerId}
      AND ${orders.status} = 'delivered'
      AND (${orders.createdAt} AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata' >= ${startIST}::timestamp
      AND (${orders.createdAt} AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata' < ${endIST}::timestamp
    `;

    await db
      .update(orders)
      .set({
        commissionPaid: paid,
        commissionPaidAt: paid ? new Date() : null,
      })
      .where(istCondition);

    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error("[markMonthlyCommissionPaidAction] Error updating monthly payout:", error);
    return { success: false, error: "Failed to update monthly payout status." };
  }
}

/**
 * Server Action: Permanently delete a creator coupon (Task 2)
 * Disconnects any referencing order records by setting influencerId to NULL
 * while preserving the historical order, coupon_code string, and discount amounts.
 */
export async function deleteInfluencerAction(id: string) {
  if (!(await verifyAdminSession())) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // 1. Detach from orders so foreign key constraint does not block deletion
    await db
      .update(orders)
      .set({ influencerId: null })
      .where(eq(orders.influencerId, id));

    // 2. Delete creator row from influencers table
    await db.delete(influencers).where(eq(influencers.id, id));

    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error("[deleteInfluencerAction] Error deleting creator:", error);
    return { success: false, error: "Failed to delete creator coupon." };
  }
}

