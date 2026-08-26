"use client";

import { useCartStore } from "@/store/useCartStore";
import { placeOrder } from "@/app/actions/orderActions";
import { validatePhone } from "@/lib/whatsapp";
import { useState, useTransition } from "react";
import { User, Phone, MapPin, AlertCircle, Loader2 } from "lucide-react";
import dynamic from "next/dynamic";

const DeliveryMap = dynamic(() => import("./DeliveryMapClient"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 bg-gray-100 rounded-2xl flex items-center justify-center">
      <Loader2 className="animate-spin text-brand-primary" size={28} />
    </div>
  ),
});

export default function CheckoutForm() {
  const { customerInfo, setCustomerInfo, items, getSubtotal, getDeliveryFee, isDeliverable } =
    useCartStore();

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!customerInfo.name.trim()) newErrors.name = "Name is required";
    if (!validatePhone(customerInfo.phone))
      newErrors.phone = "Enter a valid 10-digit Indian mobile number";
    if (!customerInfo.address.trim() || customerInfo.address.length < 10)
      newErrors.address = "Please enter a full delivery address";
    if (!isDeliverable) newErrors.zone = "Your location is outside our delivery zone (5km radius)";
    return newErrors;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});

    startTransition(async () => {
      await placeOrder({
        items,
        customer: customerInfo,
        subtotal: getSubtotal(),
        deliveryFee: getDeliveryFee(),
      });
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 mt-6">
      <h3 className="font-display font-bold text-brand-primary text-xl">
        Delivery Details
      </h3>

      {/* Name */}
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
          <User size={14} /> Your Name
        </label>
        <input
          type="text"
          placeholder="Full name"
          value={customerInfo.name}
          onChange={(e) => setCustomerInfo({ name: e.target.value })}
          className={`w-full border rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-accent transition ${
            errors.name ? "border-red-400" : "border-gray-200"
          }`}
        />
        {errors.name && (
          <p className="text-red-500 text-xs flex items-center gap-1">
            <AlertCircle size={12} /> {errors.name}
          </p>
        )}
      </div>

      {/* Phone */}
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
          <Phone size={14} /> WhatsApp Number
        </label>
        <div className="flex">
          <span className="inline-flex items-center px-3 border border-r-0 border-gray-200 rounded-l-xl bg-gray-50 text-sm text-gray-500">
            +91
          </span>
          <input
            type="tel"
            placeholder="10-digit mobile"
            value={customerInfo.phone}
            onChange={(e) => setCustomerInfo({ phone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
            className={`flex-1 border rounded-r-xl px-4 py-3 text-sm outline-none focus:border-brand-accent transition ${
              errors.phone ? "border-red-400" : "border-gray-200"
            }`}
          />
        </div>
        {errors.phone && (
          <p className="text-red-500 text-xs flex items-center gap-1">
            <AlertCircle size={12} /> {errors.phone}
          </p>
        )}
      </div>

      {/* Address */}
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
          <MapPin size={14} /> Delivery Address
        </label>
        <textarea
          placeholder="Flat/House no., Street, Landmark, Area"
          rows={3}
          value={customerInfo.address}
          onChange={(e) => setCustomerInfo({ address: e.target.value })}
          className={`w-full border rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-accent transition resize-none ${
            errors.address ? "border-red-400" : "border-gray-200"
          }`}
        />
        {errors.address && (
          <p className="text-red-500 text-xs flex items-center gap-1">
            <AlertCircle size={12} /> {errors.address}
          </p>
        )}
      </div>

      {/* Map */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
          <MapPin size={14} /> Pin your location
        </p>
        <DeliveryMap />
        {isDeliverable ? (
          <p className="text-green-600 text-xs font-medium flex items-center gap-1">
            ✓ Great! Your location is within our delivery zone.
          </p>
        ) : (
          <p className="text-amber-600 text-xs flex items-center gap-1">
            <AlertCircle size={12} /> Drop a pin on the map to verify your delivery zone.
          </p>
        )}
        {errors.zone && (
          <p className="text-red-500 text-xs flex items-center gap-1">
            <AlertCircle size={12} /> {errors.zone}
          </p>
        )}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isPending || !isDeliverable}
        className="w-full flex items-center justify-center gap-2 bg-brand-primary hover:bg-brand-accent disabled:bg-gray-200 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl text-base transition-all hover:scale-[1.02] active:scale-[0.98]"
      >
        {isPending ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Placing Order…
          </>
        ) : (
          <>
            🛒 Place Pre-Order via WhatsApp
          </>
        )}
      </button>

      <p className="text-center text-xs text-gray-400">
        You'll be redirected to WhatsApp to confirm your order.
      </p>
    </form>
  );
}
