// app/api/admin/orders/route.ts — API endpoint for Admin Orders Queue

import { db } from "@/lib/db";
import { orders, users } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const rawOrders = await db
      .select({
        order: orders,
        user: users,
      })
      .from(orders)
      .innerJoin(users, eq(orders.userId, users.id))
      .orderBy(desc(orders.requestedDeliveryTime), desc(orders.createdAt))
      .limit(100);

    const formattedOrders = rawOrders.map(({ order, user }) => ({
      id: order.id,
      userName: user.name,
      userPhone: user.phone,
      deliveryAddress: order.deliveryAddress,
      requestedDeliveryTime: order.requestedDeliveryTime
        ? order.requestedDeliveryTime.toISOString()
        : null,
      deliverySlotLabel: order.deliverySlotLabel,
      status: order.status,
      totalAmount: order.totalAmount,
      deliveryFee: order.deliveryFee,
      items: order.items,
      createdAt: order.createdAt.toISOString(),
    }));

    return NextResponse.json({ orders: formattedOrders });
  } catch (error: unknown) {
    console.error("[Admin API Error]:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
