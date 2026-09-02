"use client";

import { useState, useEffect } from "react";
import { verifyAdminPin, updateOrderStatus } from "@/app/actions/adminActions";
import { Clock, Phone, MapPin, CheckCircle, Lock, RefreshCw } from "lucide-react";
import { siteConfig } from "@/config/brand";

interface OrderItem {
  name?: string;
  quantity?: number;
  price?: number;
  summary?: string;
}

interface AdminOrder {
  id: string;
  userName: string;
  userPhone: string;
  deliveryAddress: string;
  requestedDeliveryTime: string | null;
  deliverySlotLabel: string | null;
  status: "pending" | "confirmed" | "preparing" | "out_for_delivery" | "delivered" | "cancelled";
  totalAmount: number;
  deliveryFee: number;
  items: OrderItem[];
  createdAt: string;
}

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending / Received" },
  { value: "confirmed", label: "Confirmed" },
  { value: "preparing", label: "Preparing" },
  { value: "out_for_delivery", label: "Out for Delivery" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export default function AdminOrdersPage() {
  const [pinInput, setPinInput] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinError, setPinError] = useState("");
  const [ordersList, setOrdersList] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const isValid = await verifyAdminPin(pinInput);
    if (isValid) {
      setIsAuthenticated(true);
      setPinError("");
      fetchOrders();
    } else {
      setPinError("Invalid Admin PIN. Try default (1234)");
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/orders");
      if (res.ok) {
        const data = await res.json();
        setOrdersList(data.orders || []);
      }
    } catch (err) {
      console.error("Error loading admin orders:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (
    orderId: string,
    newStatus: AdminOrder["status"]
  ) => {
    const res = await updateOrderStatus(orderId, newStatus);
    if (res.success) {
      setOrdersList((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 font-sans">
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-200 w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-[#445916]/10 text-[#445916] flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6" />
            </div>
            <h1 className="font-display text-2xl font-bold text-gray-900">
              Kitchen Staff Admin
            </h1>
            <p className="text-xs text-gray-500">
              Enter Admin PIN to access Daily Bap kitchen order management.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              placeholder="Enter PIN (e.g. 1234)"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              className="w-full text-center tracking-widest text-lg font-mono px-4 py-3 rounded-xl border border-gray-300 focus:border-[#445916] focus:outline-none"
            />
            {pinError && (
              <p className="text-xs text-rose-600 font-medium text-center">
                {pinError}
              </p>
            )}
            <button
              type="submit"
              className="w-full bg-[#445916] hover:bg-[#354611] text-white font-bold py-3 rounded-xl transition"
            >
              Access Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-200 shadow-xs">
          <div>
            <h1 className="font-display text-2xl font-bold text-[#445916]">
              Kitchen Admin — Order Queue
            </h1>
            <p className="text-xs text-gray-500">
              {siteConfig.name} • Live pre-orders sorted by requested delivery slot
            </p>
          </div>
          <button
            onClick={fetchOrders}
            disabled={loading}
            className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl text-xs font-semibold transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh Orders
          </button>
        </div>

        {/* Orders Queue */}
        {ordersList.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-gray-200 text-center space-y-3">
            <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />
            <h3 className="text-lg font-bold text-gray-700">No Orders Yet</h3>
            <p className="text-xs text-gray-400">
              New customer orders will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {ordersList.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                {/* Delivery Slot Badge & Order Info */}
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="bg-[#445916] text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#9da613]" />
                      {order.deliverySlotLabel || "ASAP"}
                    </span>
                    <span className="text-xs font-mono text-gray-400">
                      ID: {order.id.slice(0, 8)}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-bold text-gray-900 text-base">
                      {order.userName}
                    </h3>
                    <p className="text-xs text-gray-600 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-[#445916]" /> +91 {order.userPhone}
                    </p>
                    <p className="text-xs text-gray-600 flex items-start gap-1">
                      <MapPin className="w-3.5 h-3.5 text-[#445916] shrink-0 mt-0.5" />
                      <span>{order.deliveryAddress}</span>
                    </p>
                  </div>
                </div>

                {/* Items & Total */}
                <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100 min-w-[240px] space-y-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    Order Summary
                  </span>
                  <div className="text-xs text-gray-800 space-y-1">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between font-medium">
                        <span>{item.name || item.summary}</span>
                        {item.quantity && (
                          <span className="text-gray-500">×{item.quantity}</span>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="pt-2 border-t border-gray-200 flex justify-between font-bold text-xs text-gray-900">
                    <span>Total (Inc. delivery):</span>
                    <span className="text-[#445916]">₹{order.totalAmount}</span>
                  </div>
                </div>

                {/* Status Selector */}
                <div className="shrink-0 space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    Update Status
                  </label>
                  <select
                    value={order.status}
                    onChange={(e) =>
                      handleStatusChange(
                        order.id,
                        e.target.value as AdminOrder["status"]
                      )
                    }
                    className="bg-gray-50 text-gray-800 font-bold text-xs px-3 py-2 rounded-xl border border-gray-300 focus:border-[#445916] focus:outline-none"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
