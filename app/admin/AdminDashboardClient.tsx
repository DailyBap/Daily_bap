"use client";

import { useState, useTransition } from "react";
import {
  updateOrderStatus,
  toggleKitchenStatus,
  toggleAutoReviewRequest,
  OrderStatus,
} from "@/app/actions/adminActions";
import { createOffer, toggleOffer, updateOffer } from "@/app/actions/offerActions";
import {
  ShoppingBag,
  Tag,
  Clock,
  Phone,
  MapPin,
  MessageCircle,
  Plus,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Edit,
  Check,
  X,
  Star,
} from "lucide-react";

interface OrderItem {
  name?: string;
  quantity?: number;
  price?: number;
  summary?: string;
}

interface OrderRecord {
  id: string;
  orderNumber?: string | null;
  status: OrderStatus;
  totalAmount: number;
  deliveryFee: number;
  deliveryAddress: string;
  requestedDeliveryTime: Date | string | null;
  deliverySlotLabel: string | null;
  items: unknown;
  createdAt: Date | string;
  userName?: string | null;
  userPhone?: string | null;
}

interface OfferRecord {
  id: string;
  title: string;
  code: string;
  isActive: boolean;
  createdAt: Date | string;
}

interface AdminDashboardClientProps {
  initialOrders: OrderRecord[];
  initialOffers: OfferRecord[];
  initialKitchenClosed?: boolean;
  initialAutoReviewRequest?: boolean;
}

const STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: "draft", label: "Draft (Awaiting WhatsApp)" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "preparing", label: "Preparing" },
  { value: "out_for_delivery", label: "Out for Delivery" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

export default function AdminDashboardClient({
  initialOrders,
  initialOffers,
  initialKitchenClosed = false,
  initialAutoReviewRequest = true,
}: AdminDashboardClientProps) {
  const [ordersList, setOrdersList] = useState<OrderRecord[]>(initialOrders);
  const [offersList, setOffersList] = useState<OfferRecord[]>(initialOffers);
  const [isKitchenClosed, setIsKitchenClosed] = useState<boolean>(initialKitchenClosed);
  const [isAutoReviewActive, setIsAutoReviewActive] = useState<boolean>(initialAutoReviewRequest);

  // New offer form state
  const [newTitle, setNewTitle] = useState("");
  const [newCode, setNewCode] = useState("");
  const [offerError, setOfferError] = useState("");
  const [offerSuccess, setOfferSuccess] = useState("");

  const [isPending, startTransition] = useTransition();

  // Handle status update
  const handleStatusChange = (orderId: string, newStatus: OrderStatus) => {
    setOrdersList((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );

    startTransition(async () => {
      await updateOrderStatus(orderId, newStatus);
    });
  };

  // Handle creating offer
  const handleCreateOffer = (e: React.FormEvent) => {
    e.preventDefault();
    setOfferError("");
    setOfferSuccess("");

    if (!newTitle.trim() || !newCode.trim()) {
      setOfferError("Title and promo code are required.");
      return;
    }

    startTransition(async () => {
      const res = await createOffer({ title: newTitle, code: newCode });
      if (res.success) {
        setOfferSuccess("Offer created successfully!");
        setOffersList((prev) => [
          {
            id: Math.random().toString(),
            title: newTitle.trim(),
            code: newCode.trim().toUpperCase(),
            isActive: false,
            createdAt: new Date(),
          },
          ...prev,
        ]);
        setNewTitle("");
        setNewCode("");
      } else {
        setOfferError(res.error || "Failed to create offer.");
      }
    });
  };

  // Edit offer state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCode, setEditCode] = useState("");

  const startEditing = (offer: OfferRecord) => {
    setEditingId(offer.id);
    setEditTitle(offer.title);
    setEditCode(offer.code);
  };

  const handleSaveEdit = (offerId: string) => {
    if (!editTitle.trim() || !editCode.trim()) return;

    const trimmedTitle = editTitle.trim();
    const trimmedCode = editCode.trim().toUpperCase();

    setOffersList((prev) =>
      prev.map((off) =>
        off.id === offerId
          ? { ...off, title: trimmedTitle, code: trimmedCode }
          : off
      )
    );
    setEditingId(null);

    startTransition(async () => {
      await updateOffer(offerId, trimmedTitle, trimmedCode);
    });
  };

  // Handle offer toggle
  const handleToggleOffer = (offerId: string, currentActive: boolean) => {
    const nextActive = !currentActive;

    // Single active offer rule: deactivate others if activating
    setOffersList((prev) =>
      prev.map((off) => {
        if (off.id === offerId) return { ...off, isActive: nextActive };
        return nextActive ? { ...off, isActive: false } : off;
      })
    );

    startTransition(async () => {
      await toggleOffer(offerId, nextActive);
    });
  };

  // Handle kitchen closed status toggle
  const handleToggleKitchenStatus = () => {
    const nextState = !isKitchenClosed;
    setIsKitchenClosed(nextState);
    startTransition(async () => {
      await toggleKitchenStatus(nextState);
    });
  };

  // Handle auto review request toggle
  const handleToggleAutoReview = () => {
    const nextState = !isAutoReviewActive;
    setIsAutoReviewActive(nextState);
    startTransition(async () => {
      await toggleAutoReviewRequest(nextState);
    });
  };

  return (
    <div className="min-h-screen bg-gray-50/50 font-sans p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Top Header */}
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-brand-primary text-white p-6 rounded-3xl shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-brand-accent" />
            <h1 className="font-display font-bold text-2xl">Daily Bap Admin</h1>
          </div>
          <p className="text-xs text-white/70">
            Kitchen Management Dashboard • Orders Queue & Daily Offers
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-8">
        {/* ======================================================== */}
        {/* KITCHEN OPERATIONAL STATUS & AUTO REVIEW TOGGLES */}
        {/* ======================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Kitchen Status Card */}
          <section className="bg-white rounded-3xl border border-gray-200/80 shadow-xs p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-4">
              <div
                className={`p-3.5 rounded-2xl shrink-0 transition-colors ${
                  isKitchenClosed
                    ? "bg-rose-100 text-rose-700"
                    : "bg-emerald-100 text-emerald-700"
                }`}
              >
                {isKitchenClosed ? (
                  <AlertCircle className="w-6 h-6" />
                ) : (
                  <CheckCircle2 className="w-6 h-6" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-display font-bold text-base text-gray-900">
                    Kitchen Status:{" "}
                    <span
                      className={
                        isKitchenClosed ? "text-rose-600" : "text-emerald-700"
                      }
                    >
                      {isKitchenClosed ? "CLOSED" : "OPEN"}
                    </span>
                  </h2>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                      isKitchenClosed
                        ? "bg-rose-100 text-rose-800 border border-rose-200"
                        : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                    }`}
                  >
                    {isKitchenClosed ? "Holiday Mode" : "Normal Hours"}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {isKitchenClosed
                    ? "Same-day ordering is disabled on the website."
                    : "Kitchen accepting orders for Today & Tomorrow."}
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={isPending}
              onClick={handleToggleKitchenStatus}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs transition shadow-xs flex items-center justify-center gap-2 shrink-0 ${
                isKitchenClosed
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-rose-600 hover:bg-rose-700 text-white"
              } ${isPending ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              {isKitchenClosed ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Turn OPEN
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4" />
                  Holiday Mode
                </>
              )}
            </button>
          </section>

          {/* Post-Delivery Review Ping Card */}
          <section className="bg-white rounded-3xl border border-gray-200/80 shadow-xs p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-4">
              <div
                className={`p-3.5 rounded-2xl shrink-0 transition-colors ${
                  isAutoReviewActive
                    ? "bg-amber-100 text-amber-700"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                <Star className="w-6 h-6 fill-current text-amber-500" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-display font-bold text-base text-gray-900">
                    Post-Delivery Review Ping:{" "}
                    <span
                      className={
                        isAutoReviewActive ? "text-amber-600" : "text-gray-500"
                      }
                    >
                      {isAutoReviewActive ? "ACTIVE" : "DISABLED"}
                    </span>
                  </h2>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                      isAutoReviewActive
                        ? "bg-amber-100 text-amber-800 border border-amber-200"
                        : "bg-gray-100 text-gray-600 border border-gray-200"
                    }`}
                  >
                    {isAutoReviewActive ? "Auto Trigger On" : "Manual Only"}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Sends Google Review link upon order completion (`delivered`).
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={isPending}
              onClick={handleToggleAutoReview}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs transition shadow-xs flex items-center justify-center gap-2 shrink-0 ${
                isAutoReviewActive
                  ? "bg-amber-500 hover:bg-amber-600 text-white"
                  : "bg-gray-700 hover:bg-gray-800 text-white"
              } ${isPending ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              <Star className="w-4 h-4" />
              {isAutoReviewActive ? "Disable Ping" : "Enable Ping"}
            </button>
          </section>
        </div>
        {/* ======================================================== */}
        {/* ORDERS SECTION */}
        {/* ======================================================== */}
        <section className="bg-white rounded-3xl border border-gray-200/80 shadow-xs overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-brand-primary" />
              <h2 className="font-display font-bold text-xl text-brand-primary">
                Customer Orders ({ordersList.length})
              </h2>
            </div>
          </div>

          {ordersList.length === 0 ? (
            <div className="p-12 text-center text-gray-400 space-y-2">
              <ShoppingBag className="w-10 h-10 mx-auto text-gray-300" />
              <p className="font-medium text-sm">No orders recorded yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-700">
                <thead className="bg-gray-50 border-b border-gray-100 uppercase text-[10px] font-bold text-gray-500 tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Order No</th>
                    <th className="px-6 py-4">Customer Details</th>
                    <th className="px-6 py-4">Delivery Slot</th>
                    <th className="px-6 py-4">Order Items</th>
                    <th className="px-6 py-4">Total</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">WhatsApp Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {ordersList.map((order) => {
                    const isDraft = order.status === "draft";
                    const displayOrderNo =
                      order.orderNumber || `BAP-${order.id.slice(0, 5).toUpperCase()}`;
                    const rawPhone = order.userPhone?.replace(/\D/g, "") || "";
                    const cleanPhone = rawPhone.length === 10 ? rawPhone : rawPhone.slice(-10);
                    const name = order.userName || "Customer";
                    const itemsArray = (Array.isArray(order.items) ? order.items : []) as OrderItem[];

                    const prepMsg = encodeURIComponent(
                      `Hey ${name}! We've started preparing your order (${displayOrderNo}). 🍳`
                    );
                    const deliveryMsg = encodeURIComponent(
                      `Great news! Your order (${displayOrderNo}) is out for delivery! 🛵`
                    );
                    const reviewMsg = encodeURIComponent(
                      `Hey ${name}! Thank you for ordering from Daily Bap 🍱 We hope you enjoyed your meal! Could you take a moment to leave us a Google review? It helps us immensely: https://g.page/r/CeKt9rDETbXDEBM/review`
                    );

                    const prepLink = `https://wa.me/91${cleanPhone}?text=${prepMsg}`;
                    const deliveryLink = `https://wa.me/91${cleanPhone}?text=${deliveryMsg}`;
                    const reviewLink = `https://wa.me/91${cleanPhone}?text=${reviewMsg}`;

                    return (
                      <tr
                        key={order.id}
                        className={`transition ${
                          isDraft
                            ? "bg-amber-50/70 border-l-4 border-l-amber-500 hover:bg-amber-100/60"
                            : "hover:bg-gray-50/50"
                        }`}
                      >
                        {/* Order Number */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            <span className="font-mono font-bold text-sm text-brand-primary bg-brand-primary/10 px-2.5 py-1 rounded-lg w-fit">
                              {displayOrderNo}
                            </span>
                            {isDraft && (
                              <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-md w-fit">
                                Draft (Awaiting WhatsApp)
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Customer */}
                        <td className="px-6 py-4">
                          <div className="space-y-0.5">
                            <p className="font-bold text-gray-900 text-sm">{name}</p>
                            <p className="text-gray-500 flex items-center gap-1 font-mono">
                              <Phone className="w-3 h-3 text-gray-400" /> +91 {cleanPhone}
                            </p>
                            <p className="text-gray-400 text-[11px] line-clamp-1 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                              <span>{order.deliveryAddress}</span>
                            </p>
                          </div>
                        </td>

                        {/* Delivery Slot */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 font-medium bg-amber-50 text-amber-900 border border-amber-200 px-2.5 py-1 rounded-full text-[11px]">
                            <Clock className="w-3 h-3 text-amber-600" />
                            {order.deliverySlotLabel || "ASAP"}
                          </span>
                        </td>

                        {/* Items */}
                        <td className="px-6 py-4 max-w-xs">
                          <div className="space-y-0.5">
                            {itemsArray.map((item, idx) => (
                              <p key={idx} className="text-gray-800 text-xs">
                                • {item.name || item.summary}{" "}
                                {item.quantity ? `× ${item.quantity}` : ""}
                              </p>
                            ))}
                          </div>
                        </td>

                        {/* Total */}
                        <td className="px-6 py-4 whitespace-nowrap font-bold text-brand-primary text-sm">
                          ₹{order.totalAmount}
                        </td>

                        {/* Status Select */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={order.status}
                            onChange={(e) =>
                              handleStatusChange(
                                order.id,
                                e.target.value as OrderStatus
                              )
                            }
                            className="bg-white border border-gray-300 font-bold text-xs px-3 py-1.5 rounded-xl shadow-xs focus:outline-none focus:border-brand-primary transition"
                          >
                            {STATUS_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* WhatsApp Actions */}
                        <td className="px-6 py-4 whitespace-nowrap space-x-2">
                          <a
                            href={prepLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2.5 py-1.5 rounded-xl border border-emerald-200 transition"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            Notify Prep 🍳
                          </a>

                          <a
                            href={deliveryLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 px-2.5 py-1.5 rounded-xl border border-blue-200 transition"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            Out for Delivery 🛵
                          </a>

                          <a
                            href={reviewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 px-2.5 py-1.5 rounded-xl border border-amber-200 transition"
                          >
                            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                            Review Ping ⭐️
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ======================================================== */}
        {/* OFFERS SECTION */}
        {/* ======================================================== */}
        <section className="bg-white rounded-3xl border border-gray-200/80 shadow-xs p-6 space-y-6">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-4">
            <Tag className="w-5 h-5 text-brand-primary" />
            <h2 className="font-display font-bold text-xl text-brand-primary">
              Daily Offers Management
            </h2>
          </div>

          {/* Create Offer Form */}
          <form onSubmit={handleCreateOffer} className="space-y-4 max-w-xl">
            <h3 className="font-bold text-sm text-gray-800">Create New Offer</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Offer Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Free Kimchi Friday!"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-xs outline-none focus:border-brand-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Promo Code
                </label>
                <input
                  type="text"
                  placeholder="e.g. KIMCHI100"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-xs outline-none focus:border-brand-primary font-mono uppercase"
                />
              </div>
            </div>

            {offerError && (
              <p className="text-xs text-red-600 flex items-center gap-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{offerError}</span>
              </p>
            )}

            {offerSuccess && (
              <p className="text-xs text-green-600 flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>{offerSuccess}</span>
              </p>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-1.5 bg-brand-primary hover:bg-brand-accent text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Create Offer
            </button>
          </form>

          {/* Offers List */}
          <div className="pt-4 border-t border-gray-100 space-y-3">
            <h3 className="font-bold text-sm text-gray-800">Existing Offers</h3>

            {offersList.length === 0 ? (
              <p className="text-xs text-gray-400">No offers created yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {offersList.map((offer) => (
                  <div
                    key={offer.id}
                    className={`p-4 rounded-2xl border flex flex-col justify-between gap-3 transition ${
                      offer.isActive
                        ? "bg-amber-50/60 border-amber-300"
                        : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    {editingId === offer.id ? (
                      <div className="space-y-2">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase">Title</label>
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-brand-primary font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase">Promo Code</label>
                          <input
                            type="text"
                            value={editCode}
                            onChange={(e) => setEditCode(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-brand-primary font-mono font-bold uppercase"
                          />
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(offer.id)}
                            disabled={isPending}
                            className="flex-1 inline-flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-3 rounded-lg text-xs transition"
                          >
                            <Check className="w-3.5 h-3.5" /> Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="inline-flex items-center justify-center gap-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-1.5 px-3 rounded-lg text-xs transition"
                          >
                            <X className="w-3.5 h-3.5" /> Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-sm text-gray-900">
                              {offer.title}
                            </span>
                            {offer.isActive ? (
                              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0">
                                Active Banner
                              </span>
                            ) : (
                              <span className="bg-gray-200 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0">
                                Inactive
                              </span>
                            )}
                          </div>
                          <p className="font-mono text-xs text-brand-primary font-bold">
                            Code: {offer.code}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleOffer(offer.id, offer.isActive)}
                            className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
                              offer.isActive
                                ? "bg-amber-600 hover:bg-amber-700 text-white"
                                : "bg-gray-200 hover:bg-gray-300 text-gray-800"
                            }`}
                          >
                            {offer.isActive ? "Deactivate Offer" : "Set as Active Banner"}
                          </button>
                          <button
                            type="button"
                            onClick={() => startEditing(offer)}
                            className="inline-flex items-center justify-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2 px-3 rounded-xl text-xs transition border border-gray-300"
                          >
                            <Edit className="w-3.5 h-3.5 text-gray-600" /> Edit
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
