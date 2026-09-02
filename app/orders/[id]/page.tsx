import { db } from "@/lib/db";
import { orders, users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  MapPin,
  ShoppingBag,
  ChefHat,
  Truck,
  PackageCheck,
  XCircle,
  ArrowLeft,
  Phone,
} from "lucide-react";
import { siteConfig } from "@/config/brand";

export const revalidate = 0; // Dynamic server page

interface OrderPageProps {
  params: Promise<{ id: string }>;
}

const STATUS_STEPS = [
  { key: "pending", label: "Received", icon: Clock },
  { key: "confirmed", label: "Confirmed", icon: CheckCircle2 },
  { key: "preparing", label: "Preparing", icon: ChefHat },
  { key: "out_for_delivery", label: "Out for Delivery", icon: Truck },
  { key: "delivered", label: "Delivered", icon: PackageCheck },
];

export default async function OrderStatusPage({ params }: OrderPageProps) {
  const { id } = await params;

  // Query order by UUID
  const result = await db
    .select({
      order: orders,
      user: users,
    })
    .from(orders)
    .innerJoin(users, eq(orders.userId, users.id))
    .where(eq(orders.id, id))
    .limit(1);

  if (!result || result.length === 0) {
    notFound();
  }

  const { order, user } = result[0];
  const items = (order.items as Array<{
    id?: string;
    name?: string;
    price?: number;
    quantity?: number;
    summary?: string;
  }>) || [];

  const currentStatusIndex =
    order.status === "cancelled"
      ? -1
      : STATUS_STEPS.findIndex((s) => s.key === order.status);

  return (
    <div className="min-h-screen bg-gray-50 font-sans py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#445916] hover:text-[#354611] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Daily Bap
          </Link>
          <span className="text-xs text-gray-500 font-mono">
            ID: {order.id.slice(0, 8)}...
          </span>
        </div>

        {/* Card Container */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-200/80 overflow-hidden">
          {/* Header Banner */}
          <div className="bg-[#445916] text-white p-6 text-center space-y-2">
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
              Order Status Tracking
            </h1>
            <p className="text-xs sm:text-sm text-gray-200">
              {siteConfig.name} — 100% Pre-Order Korean Kitchen
            </p>
          </div>

          {/* Cancelled Banner */}
          {order.status === "cancelled" ? (
            <div className="p-6 bg-rose-50 border-b border-rose-200 text-center space-y-2">
              <XCircle className="w-10 h-10 text-rose-600 mx-auto animate-bounce" />
              <h2 className="text-lg font-bold text-rose-900">
                Order Cancelled
              </h2>
              <p className="text-xs text-rose-700">
                This order has been cancelled. Please contact us on WhatsApp if
                you have questions.
              </p>
            </div>
          ) : (
            /* Progress Tracker Stepper */
            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider text-center mb-6">
                Live Status
              </h2>

              <div className="relative flex items-center justify-between">
                {/* Connecting Line */}
                <div className="absolute top-1/2 left-4 right-4 -translate-y-1/2 h-1 bg-gray-200 -z-0">
                  <div
                    className="h-full bg-[#445916] transition-all duration-500"
                    style={{
                      width: `${
                        currentStatusIndex < 0
                          ? 0
                          : (currentStatusIndex / (STATUS_STEPS.length - 1)) *
                            100
                      }%`,
                    }}
                  />
                </div>

                {/* Steps */}
                {STATUS_STEPS.map((step, idx) => {
                  const Icon = step.icon;
                  const isCompleted = idx <= currentStatusIndex;
                  const isCurrent = idx === currentStatusIndex;

                  return (
                    <div
                      key={step.key}
                      className="relative z-10 flex flex-col items-center gap-1.5"
                    >
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${
                          isCompleted
                            ? "bg-[#445916] text-white shadow-md scale-105"
                            : "bg-white text-gray-400 border-2 border-gray-200"
                        } ${isCurrent ? "ring-4 ring-[#9da613]/30" : ""}`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <span
                        className={`text-[10px] sm:text-xs font-semibold text-center leading-tight ${
                          isCompleted ? "text-[#445916]" : "text-gray-400"
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Delivery Time & Info */}
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-emerald-50/60 border border-emerald-200/80 p-4 rounded-2xl space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 uppercase tracking-wider">
                  <Clock className="w-4 h-4 text-emerald-700" />
                  <span>Requested Delivery Slot</span>
                </div>
                <p className="text-sm font-bold text-emerald-950">
                  {order.deliverySlotLabel || "ASAP"}
                </p>
              </div>

              <div className="bg-gray-50 border border-gray-200/80 p-4 rounded-2xl space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-600 uppercase tracking-wider">
                  <MapPin className="w-4 h-4 text-[#445916]" />
                  <span>Delivery Address</span>
                </div>
                <p className="text-xs text-gray-700 leading-relaxed font-medium">
                  {order.deliveryAddress}
                </p>
              </div>
            </div>

            {/* Customer Details */}
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200/80 flex items-center justify-between text-xs sm:text-sm">
              <div>
                <span className="text-gray-400 font-semibold uppercase text-[10px] block">
                  Customer
                </span>
                <span className="font-bold text-gray-800">{user.name}</span>
              </div>
              <div className="text-right">
                <span className="text-gray-400 font-semibold uppercase text-[10px] block">
                  Phone
                </span>
                <span className="font-medium text-gray-700 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-[#445916]" /> +91 {user.phone}
                </span>
              </div>
            </div>

            {/* Items Summary */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-[#445916]" /> Order Items
              </h3>
              <div className="divide-y divide-gray-100 bg-gray-50/50 rounded-2xl border border-gray-200/80 overflow-hidden">
                {items.map((item, index) => (
                  <div
                    key={index}
                    className="p-3.5 flex items-center justify-between text-xs sm:text-sm"
                  >
                    {item.summary ? (
                      <span className="font-medium text-gray-800">
                        {item.summary}
                      </span>
                    ) : (
                      <>
                        <div className="space-y-0.5">
                          <span className="font-semibold text-gray-800">
                            {item.name}
                          </span>
                          <span className="text-gray-400 text-xs block">
                            Qty: {item.quantity}
                          </span>
                        </div>
                        <span className="font-bold text-gray-900">
                          ₹{(item.price || 0) * (item.quantity || 1)}
                        </span>
                      </>
                    )}
                  </div>
                ))}
                <div className="p-3.5 bg-gray-100/70 flex items-center justify-between text-xs font-semibold text-gray-600">
                  <span>Delivery Fee</span>
                  <span>
                    {order.deliveryFee === 0 ? "FREE" : `₹${order.deliveryFee}`}
                  </span>
                </div>
                <div className="p-4 bg-[#445916]/5 flex items-center justify-between text-sm sm:text-base font-bold text-gray-900">
                  <span>Total Amount Paid / Due</span>
                  <span className="text-[#445916] text-lg font-display">
                    ₹{order.totalAmount}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
