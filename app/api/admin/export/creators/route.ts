// app/api/admin/export/creators/route.ts — Excel (.xlsx) Export Endpoint for Daily Bap Admin

import { NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/adminAuth";
import { db } from "@/lib/db";
import { influencers, orders, users } from "@/lib/schema";
import { eq, desc, sql } from "drizzle-orm";
import ExcelJS from "exceljs";

export const dynamic = "force-dynamic";

/**
 * Neutralize potential CSV/Excel formula injection attacks.
 * If a cell string begins with '=', '+', '-', or '@', prefix it with a single quote.
 */
function sanitizeExcelValue(val: unknown): unknown {
  if (typeof val !== "string") return val;
  const str = val.trim();
  if (/^[=+\-@]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

export async function GET() {
  if (!(await verifyAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Daily Bap Admin";
    workbook.lastModifiedBy = "Daily Bap System";
    workbook.created = new Date();

    // ========================================================
    // WORKSHEET 1: CREATORS SUMMARY & STATS
    // ========================================================
    const creatorsSheet = workbook.addWorksheet("Creator Partners");
    creatorsSheet.columns = [
      { header: "Creator Name", key: "name", width: 24 },
      { header: "Coupon Code", key: "code", width: 16 },
      { header: "Instagram Handle", key: "instagramHandle", width: 22 },
      { header: "Phone / UPI ID", key: "phoneOrUpi", width: 22 },
      { header: "Discount %", key: "discountPercent", width: 14 },
      { header: "Commission %", key: "commissionPercent", width: 15 },
      { header: "Status", key: "status", width: 12 },
      { header: "Delivered Orders", key: "totalOrders", width: 16 },
      { header: "Gross Sales (₹)", key: "totalSales", width: 16 },
      { header: "Total Comm. (₹)", key: "totalCommission", width: 16 },
      { header: "Unpaid Comm. (₹)", key: "unpaidCommission", width: 18 },
      { header: "Paid Comm. (₹)", key: "paidCommission", width: 16 },
      { header: "Notes", key: "notes", width: 30 },
    ];

    // Format header row
    creatorsSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    creatorsSheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF6B21A8" }, // Purple theme
    };

    const creatorList = await db
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

    for (const c of creatorList) {
      creatorsSheet.addRow({
        name: sanitizeExcelValue(c.name),
        code: sanitizeExcelValue(c.code),
        instagramHandle: sanitizeExcelValue(c.instagramHandle || "—"),
        phoneOrUpi: sanitizeExcelValue(c.phoneOrUpi || "—"),
        discountPercent: c.discountPercent,
        commissionPercent: c.commissionPercent,
        status: c.isActive ? "Active" : "Paused",
        totalOrders: c.totalOrders,
        totalSales: c.totalSales,
        totalCommission: c.totalCommission,
        unpaidCommission: c.unpaidCommission,
        paidCommission: c.paidCommission,
        notes: sanitizeExcelValue(c.notes || ""),
      });
    }

    // ========================================================
    // WORKSHEET 2: DELIVERED ORDERS
    // ========================================================
    const ordersSheet = workbook.addWorksheet("Delivered Orders");
    ordersSheet.columns = [
      { header: "Order No", key: "orderNumber", width: 18 },
      { header: "Date (IST)", key: "dateIST", width: 20 },
      { header: "Customer Name", key: "customerName", width: 22 },
      { header: "Customer Phone", key: "customerPhone", width: 16 },
      { header: "Coupon Code", key: "couponCode", width: 16 },
      { header: "Total Amount (₹)", key: "totalAmount", width: 16 },
      { header: "Discount (₹)", key: "discountAmount", width: 14 },
      { header: "Commission (₹)", key: "commissionAmount", width: 16 },
      { header: "Payout Status", key: "payoutStatus", width: 14 },
      { header: "Delivery Address", key: "deliveryAddress", width: 35 },
    ];

    ordersSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    ordersSheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF047857" }, // Emerald theme
    };

    const deliveredOrders = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        createdAt: orders.createdAt,
        totalAmount: orders.totalAmount,
        discountAmount: orders.discountAmount,
        couponCode: orders.couponCode,
        commissionAmount: orders.commissionAmount,
        commissionPaid: orders.commissionPaid,
        deliveryAddress: orders.deliveryAddress,
        userName: users.name,
        userPhone: users.phone,
      })
      .from(orders)
      .leftJoin(users, eq(orders.userId, users.id))
      .where(eq(orders.status, "delivered"))
      .orderBy(desc(orders.createdAt));

    for (const o of deliveredOrders) {
      const displayNo = o.orderNumber || `BAP-${o.id.slice(0, 5).toUpperCase()}`;
      const dateIST = new Date(o.createdAt).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        dateStyle: "medium",
        timeStyle: "short",
      });

      ordersSheet.addRow({
        orderNumber: sanitizeExcelValue(displayNo),
        dateIST: sanitizeExcelValue(dateIST),
        customerName: sanitizeExcelValue(o.userName || "Customer"),
        customerPhone: sanitizeExcelValue(o.userPhone || "—"),
        couponCode: sanitizeExcelValue(o.couponCode || "—"),
        totalAmount: o.totalAmount,
        discountAmount: o.discountAmount || 0,
        commissionAmount: o.commissionAmount || 0,
        payoutStatus: o.commissionPaid ? "Paid" : "Unpaid",
        deliveryAddress: sanitizeExcelValue(o.deliveryAddress || "—"),
      });
    }

    // Generate binary buffer
    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="Daily_Bap_Creator_Coupons_and_Sales_${new Date().toISOString().slice(0, 10)}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("[Excel Export API] Error building spreadsheet:", error);
    return NextResponse.json(
      { error: "Failed to generate Excel export file" },
      { status: 500 }
    );
  }
}
