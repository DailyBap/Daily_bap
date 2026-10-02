// app/actions/salesActions.ts — Next.js Server Actions for Sales & Analytics (Phase 5)

"use server";

import { db } from "@/lib/db";
import { orders, influencers } from "@/lib/schema";
import { sql, eq, and, desc } from "drizzle-orm";
import { verifyAdminSession } from "@/lib/adminAuth";

export interface SalesBreakdownPerCreator {
  influencerId: string;
  creatorName: string;
  creatorCode: string;
  deliveredOrders: number;
  grossSales: number;
  totalDiscount: number;
  totalCommission: number;
  unpaidCommission: number;
}

export interface DayByDaySales {
  dateStr: string; // YYYY-MM-DD
  deliveredOrders: number;
  revenue: number;
}

export interface SalesReportStats {
  yearMonthIST: string;
  grossRevenue: number; // sum totalAmount for delivered orders
  totalOrdersCount: number; // delivered count
  averageOrderValue: number; // grossRevenue / totalOrdersCount
  totalDiscounts: number; // sum discountAmount for delivered orders
  totalCommission: number; // sum commissionAmount for delivered orders
  netRevenue: number; // grossRevenue - totalCommission (stated in UI formula)
  statusBreakdown: {
    pending: number;
    confirmed: number;
    preparing: number;
    out_for_delivery: number;
    delivered: number;
    cancelled: number;
  };
  creatorBreakdown: SalesBreakdownPerCreator[];
  dailyChartData: DayByDaySales[];
}

/**
 * Server Action: Query SQL-aggregated sales metrics for a specified IST month (YYYY-MM)
 */
export async function getSalesStatsAction(yearMonthIST?: string): Promise<SalesReportStats | null> {
  if (!(await verifyAdminSession())) {
    return null;
  }

  try {
    // Default to current month in Asia/Kolkata (IST) if not specified
    let targetMonth = yearMonthIST;
    if (!targetMonth) {
      const nowIST = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
      const y = nowIST.getFullYear();
      const m = String(nowIST.getMonth() + 1).padStart(2, "0");
      targetMonth = `${y}-${m}`;
    }

    const [yearStr, monthStr] = targetMonth.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr);

    const startIST = `${targetMonth}-01 00:00:00`;
    const nextMonthYear = month === 12 ? year + 1 : year;
    const nextMonthVal = month === 12 ? 1 : month + 1;
    const endIST = `${nextMonthYear}-${String(nextMonthVal).padStart(2, "0")}-01 00:00:00`;

    // SQL condition filtering by IST month range
    const istRangeCondition = sql`
      (${orders.createdAt} AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata' >= ${startIST}::timestamp
      AND (${orders.createdAt} AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata' < ${endIST}::timestamp
    `;

    // 1. Aggregated Summary Metrics (Delivered orders only)
    const [summary] = await db
      .select({
        grossRevenue: sql<number>`COALESCE(SUM(CASE WHEN ${orders.status} = 'delivered' THEN ${orders.totalAmount} ELSE 0 END), 0)::int`,
        deliveredCount: sql<number>`COALESCE(COUNT(CASE WHEN ${orders.status} = 'delivered' THEN 1 END), 0)::int`,
        totalDiscounts: sql<number>`COALESCE(SUM(CASE WHEN ${orders.status} = 'delivered' THEN ${orders.discountAmount} ELSE 0 END), 0)::int`,
        totalCommission: sql<number>`COALESCE(SUM(CASE WHEN ${orders.status} = 'delivered' THEN ${orders.commissionAmount} ELSE 0 END), 0)::int`,
        pendingCount: sql<number>`COALESCE(COUNT(CASE WHEN ${orders.status} = 'pending' THEN 1 END), 0)::int`,
        confirmedCount: sql<number>`COALESCE(COUNT(CASE WHEN ${orders.status} = 'confirmed' THEN 1 END), 0)::int`,
        preparingCount: sql<number>`COALESCE(COUNT(CASE WHEN ${orders.status} = 'preparing' THEN 1 END), 0)::int`,
        outForDeliveryCount: sql<number>`COALESCE(COUNT(CASE WHEN ${orders.status} = 'out_for_delivery' THEN 1 END), 0)::int`,
        cancelledCount: sql<number>`COALESCE(COUNT(CASE WHEN ${orders.status} = 'cancelled' THEN 1 END), 0)::int`,
      })
      .from(orders)
      .where(istRangeCondition);

    const grossRevenue = summary?.grossRevenue || 0;
    const totalOrdersCount = summary?.deliveredCount || 0;
    const averageOrderValue = totalOrdersCount > 0 ? Math.round(grossRevenue / totalOrdersCount) : 0;
    const totalDiscounts = summary?.totalDiscounts || 0;
    const totalCommission = summary?.totalCommission || 0;
    const netRevenue = grossRevenue - totalCommission;

    // 2. Per-Creator Sales Breakdown (SQL Aggregation)
    const creatorBreakdownRaw = await db
      .select({
        influencerId: influencers.id,
        creatorName: influencers.name,
        creatorCode: influencers.code,
        deliveredOrders: sql<number>`COALESCE(COUNT(CASE WHEN ${orders.status} = 'delivered' THEN ${orders.id} END), 0)::int`,
        grossSales: sql<number>`COALESCE(SUM(CASE WHEN ${orders.status} = 'delivered' THEN ${orders.totalAmount} ELSE 0 END), 0)::int`,
        totalDiscount: sql<number>`COALESCE(SUM(CASE WHEN ${orders.status} = 'delivered' THEN ${orders.discountAmount} ELSE 0 END), 0)::int`,
        totalCommission: sql<number>`COALESCE(SUM(CASE WHEN ${orders.status} = 'delivered' THEN ${orders.commissionAmount} ELSE 0 END), 0)::int`,
        unpaidCommission: sql<number>`COALESCE(SUM(CASE WHEN ${orders.status} = 'delivered' AND ${orders.commissionPaid} = false THEN ${orders.commissionAmount} ELSE 0 END), 0)::int`,
      })
      .from(influencers)
      .leftJoin(
        orders,
        and(eq(orders.influencerId, influencers.id), istRangeCondition)
      )
      .groupBy(influencers.id)
      .orderBy(desc(sql`grossSales`));

    // 3. Day-by-Day Revenue Chart Data (SQL Aggregation in IST)
    const dailyRaw = await db
      .select({
        dateStr: sql<string>`TO_CHAR((${orders.createdAt} AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD')`,
        deliveredOrders: sql<number>`COALESCE(COUNT(CASE WHEN ${orders.status} = 'delivered' THEN 1 END), 0)::int`,
        revenue: sql<number>`COALESCE(SUM(CASE WHEN ${orders.status} = 'delivered' THEN ${orders.totalAmount} ELSE 0 END), 0)::int`,
      })
      .from(orders)
      .where(istRangeCondition)
      .groupBy(sql`TO_CHAR((${orders.createdAt} AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD')`)
      .orderBy(sql`dateStr`);

    return {
      yearMonthIST: targetMonth,
      grossRevenue,
      totalOrdersCount,
      averageOrderValue,
      totalDiscounts,
      totalCommission,
      netRevenue,
      statusBreakdown: {
        pending: summary?.pendingCount || 0,
        confirmed: summary?.confirmedCount || 0,
        preparing: summary?.preparingCount || 0,
        out_for_delivery: summary?.outForDeliveryCount || 0,
        delivered: totalOrdersCount,
        cancelled: summary?.cancelledCount || 0,
      },
      creatorBreakdown: creatorBreakdownRaw,
      dailyChartData: dailyRaw,
    };
  } catch (error) {
    console.error("[getSalesStatsAction] Error calculating sales stats:", error);
    return null;
  }
}
