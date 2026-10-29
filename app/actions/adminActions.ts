// app/actions/adminActions.ts — Next.js Server Actions for Admin Dashboard & Offers

"use server";

import { db } from "@/lib/db";
import { orders, offers, users, settings } from "@/lib/schema";
import { eq, desc, sql } from "drizzle-orm";
import { getClosureInfo } from "@/lib/storeStatus";
import {
  todayIST,
  addDaysIST,
  diffDaysIST,
  isDateClosed,
  type ClosureInfo,
} from "@/lib/dateUtils";

import { revalidatePath } from "next/cache";
import { siteConfig } from "@/config/brand";
import {
  loginAdmin,
  verifyAdminSession,
  logoutAdmin,
} from "@/lib/adminAuth";

export type OrderStatus =
  | "draft"
  | "pending"
  | "confirmed"
  | "preparing"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

/**
 * Server Action: Login admin with password & rate limiting check
 */
export async function loginAdminAction(password: string) {
  return await loginAdmin(password);
}

/**
 * Server Action: Logout admin & clear session cookie
 */
export async function logoutAdminAction() {
  await logoutAdmin();
  revalidatePath("/admin");
  return { success: true };
}

/**
 * Server Action: Verify current admin session
 */
export async function checkAdminSessionAction(): Promise<boolean> {
  return await verifyAdminSession();
}

/**
 * Fetch whether the kitchen is currently closed (e.g. during holidays).
 * Public read-only for checkout scheduling logic.
 */
export async function getKitchenStatus(): Promise<boolean> {
  try {
    const info = await getClosureInfo();
    return info !== null && isDateClosed(todayIST(), info);
  } catch (error) {
    console.error("[getKitchenStatus] Error fetching kitchen status:", error);
    return false;
  }
}

/**
 * Toggle kitchen closed status with date range support (Holiday Mode). Requires Admin Auth.
 * Storage write: single multi-row upsert statement (neon-http compatible).
 */
export async function toggleKitchenStatus(
  isClosed: boolean,
  closureStart?: string,
  closureEnd?: string,
  closureMessage?: string
): Promise<{
  success: boolean;
  isClosed?: boolean;
  closureInfo?: ClosureInfo | null;
  error?: string;
}> {
  if (!(await verifyAdminSession())) {
    return { success: false, error: "Unauthorized" };
  }

  if (isClosed) {
    if (!closureStart || !closureEnd) {
      return {
        success: false,
        error: "Start and end dates are required for closure.",
      };
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(closureStart) || !dateRegex.test(closureEnd)) {
      return {
        success: false,
        error: "Dates must be in valid YYYY-MM-DD format.",
      };
    }

    const today = todayIST();
    const lengthDays = diffDaysIST(closureStart, closureEnd) + 1;

    if (lengthDays < 1) {
      return {
        success: false,
        error: "End date must be on or after start date.",
      };
    }

    if (lengthDays > 14) {
      return {
        success: false,
        error: "Closure period cannot exceed 14 days.",
      };
    }

    const daysUntilStart = diffDaysIST(today, closureStart);
    if (daysUntilStart > 60) {
      return {
        success: false,
        error: "Start date cannot be more than 60 days in the future.",
      };
    }

    // If start is in the past, allow ONLY if it matches currently stored start date
    if (daysUntilStart < 0) {
      try {
        const currentStartRow = await db
          .select()
          .from(settings)
          .where(eq(settings.key, "kitchen_closed_start"))
          .limit(1);
        const storedStart = currentStartRow[0]?.value?.trim();
        if (storedStart !== closureStart) {
          return {
            success: false,
            error: "Start date cannot be in the past for a new closure.",
          };
        }
      } catch (dbReadErr) {
        console.error("[toggleKitchenStatus] Failed to check existing closure start date:", dbReadErr);
        return {
          success: false,
          error: "Start date cannot be in the past for a new closure.",
        };
      }
    }

    const daysUntilEnd = diffDaysIST(today, closureEnd);
    if (daysUntilEnd < 0) {
      return {
        success: false,
        error: "End date cannot be in the past.",
      };
    }
  }

  // Storage write: single multi-row upsert statement (neon-http compatible)
  const rows = isClosed
    ? [
        { key: "kitchen_closed", value: "true" },
        { key: "kitchen_closed_start", value: closureStart! },
        { key: "kitchen_closed_end", value: closureEnd! },
        { key: "kitchen_closed_message", value: closureMessage?.trim() || "" },
      ]
    : [
        { key: "kitchen_closed", value: "false" },
        { key: "kitchen_closed_start", value: "" },
        { key: "kitchen_closed_end", value: "" },
        { key: "kitchen_closed_message", value: "" },
      ];

  // Isolated DB write
  try {
    await db
      .insert(settings)
      .values(rows)
      .onConflictDoUpdate({
        target: settings.key,
        set: {
          value: sql`excluded.value`,
          updatedAt: new Date(),
        },
      });
  } catch (dbError) {
    console.error("[toggleKitchenStatus] Database write failed:", dbError);
    return {
      success: false,
      error: "Failed to update kitchen status in database. Please try again.",
    };
  }

  // Isolated path revalidation: cache errors must never turn a successful DB write into an error
  try {
    revalidatePath("/admin");
    revalidatePath("/");
  } catch (revalError) {
    console.warn("[toggleKitchenStatus] revalidatePath warning (non-fatal):", revalError);
  }

  const closureInfo: ClosureInfo | null = isClosed
    ? {
        active: true,
        start: closureStart!,
        end: closureEnd!,
        message: closureMessage?.trim() || undefined,
        reopenDate: addDaysIST(closureEnd!, 1),
      }
    : null;

  return { success: true, isClosed, closureInfo };
}

/**
 * Fetch whether auto post-delivery review request is active (defaults to true).
 * Public read-only helper.
 */
export async function getAutoReviewRequestStatus(): Promise<boolean> {
  try {
    const result = await db
      .select()
      .from(settings)
      .where(eq(settings.key, "auto_review_request"))
      .limit(1);

    if (result.length === 0) return true; // Default: active
    return result[0].value === "true";
  } catch (error) {
    console.error("[getAutoReviewRequestStatus] Error fetching setting:", error);
    return true;
  }
}

/**
 * Toggle auto review request setting. Requires Admin Auth.
 */
export async function toggleAutoReviewRequest(enabled: boolean) {
  if (!(await verifyAdminSession())) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const value = enabled ? "true" : "false";

    const existing = await db
      .select()
      .from(settings)
      .where(eq(settings.key, "auto_review_request"))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(settings)
        .set({ value, updatedAt: new Date() })
        .where(eq(settings.key, "auto_review_request"));
    } else {
      await db.insert(settings).values({
        key: "auto_review_request",
        value,
      });
    }

    revalidatePath("/admin");
    return { success: true, enabled };
  } catch (error) {
    console.error("[toggleAutoReviewRequest] Error updating review setting:", error);
    return { success: false, error: "Failed to update review setting" };
  }
}

/**
 * Fetch all orders ordered by newest first, joining customer info. Requires Admin Auth.
 */
export async function getAllOrders() {
  if (!(await verifyAdminSession())) {
    return [];
  }

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
        couponCode: orders.couponCode,
        discountAmount: orders.discountAmount,
        commissionAmount: orders.commissionAmount,
        commissionPaid: orders.commissionPaid,
        commissionPaidAt: orders.commissionPaidAt,
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
 * Update status of an order (e.g. 'pending', 'preparing', 'out_for_delivery', 'delivered'). Requires Admin Auth.
 * Triggers post-delivery Google Review request if auto_review_request setting is active.
 */
export async function updateOrderStatus(orderId: string, newStatus: OrderStatus) {
  if (!(await verifyAdminSession())) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await db
      .update(orders)
      .set({ status: newStatus })
      .where(eq(orders.id, orderId));

    // Non-blocking trigger for post-delivery Google Review request
    if (newStatus === "delivered") {
      try {
        const isAutoReviewActive = await getAutoReviewRequestStatus();
        if (isAutoReviewActive) {
          const orderRes = await db
            .select({
              order: orders,
              user: users,
            })
            .from(orders)
            .leftJoin(users, eq(orders.userId, users.id))
            .where(eq(orders.id, orderId))
            .limit(1);

          if (orderRes.length > 0 && orderRes[0].user?.phone) {
            const customerName = orderRes[0].user.name || "Customer";
            const orderNo =
              orderRes[0].order.orderNumber ||
              `BAP-${orderId.slice(0, 5).toUpperCase()}`;
            const reviewUrl = siteConfig.contact.googleReviewUrl;
            const messageText = `Hey ${customerName}! Thank you for ordering from Daily Bap 🍱 We hope you enjoyed your meal! Could you take a moment to leave us a Google review? It helps us immensely: ${reviewUrl}`;

            const pageAccessToken = process.env.META_PAGE_ACCESS_TOKEN;
            if (pageAccessToken) {
              await fetch(
                `https://graph.facebook.com/v21.0/me/messages?access_token=${pageAccessToken}`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    recipient: { phone_number: orderRes[0].user.phone },
                    message: { text: messageText },
                  }),
                }
              ).catch((err) =>
                console.error(
                  "[Post-Delivery Review Ping]: Meta API call error:",
                  err
                )
              );
            }

            console.log(
              `[Post-Delivery Review Ping]: Automated trigger sent for Order ${orderNo} (${orderRes[0].user.phone}): ${messageText}`
            );
          }
        }
      } catch (reviewErr) {
        console.error(
          "[updateOrderStatus] Non-blocking error triggering review request:",
          reviewErr
        );
      }
    }

    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error("[updateOrderStatus] Error updating order status:", error);
    return { success: false, error: "Failed to update status" };
  }
}

/**
 * Fetch all offers ordered by newest first. Requires Admin Auth.
 */
export async function getAllOffers() {
  if (!(await verifyAdminSession())) {
    return [];
  }

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
 * Get the single active offer for the frontend banner. Public read-only.
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
 * Create a new offer record. Requires Admin Auth.
 */
export async function createNewOffer(title: string, code: string) {
  if (!(await verifyAdminSession())) {
    return { success: false, error: "Unauthorized" };
  }

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
 * Toggle an offer's isActive state. Requires Admin Auth.
 */
export async function toggleOffer(offerId: string, isActive: boolean) {
  if (!(await verifyAdminSession())) {
    return { success: false, error: "Unauthorized" };
  }

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

