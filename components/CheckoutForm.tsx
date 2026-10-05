"use client";

import { useCartStore } from "@/store/useCartStore";
import { placeOrder } from "@/app/actions/orderActions";
import { validatePhone } from "@/lib/whatsapp";
import { validateDeliveryTimeSlot } from "@/lib/deliverySlots";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { User, Phone, MapPin, AlertCircle, Loader2, ShoppingBag, ShieldCheck } from "lucide-react";
import dynamic from "next/dynamic";
import DeliveryTimePicker from "./DeliveryTimePicker";

const DeliveryMap = dynamic(() => import("./DeliveryMapClient"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 bg-gray-100 rounded-2xl flex items-center justify-center">
      <Loader2 className="animate-spin text-brand-primary" size={28} />
    </div>
  ),
});

export default function CheckoutForm() {
  const router = useRouter();
  const customerInfo = useCartStore((s) => s.customerInfo);
  const setCustomerInfo = useCartStore((s) => s.setCustomerInfo);
  const items = useCartStore((s) => s.items);
  const getSubtotal = useCartStore((s) => s.getSubtotal);
  const getDeliveryFee = useCartStore((s) => s.getDeliveryFee);
  const getTotal = useCartStore((s) => s.getTotal);
  const clearCart = useCartStore((s) => s.clearCart);
  const isDeliverable = useCartStore((s) => s.isDeliverable);
  const requestedDeliveryTime = useCartStore((s) => s.requestedDeliveryTime);
  const deliverySlotLabel = useCartStore((s) => s.deliverySlotLabel);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  const total = getTotal();

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!customerInfo.name.trim()) newErrors.name = "Full name is required";
    if (!validatePhone(customerInfo.phone))
      newErrors.phone = "Enter a valid 10-digit Indian mobile number";
    if (!customerInfo.address.trim() || customerInfo.address.trim().length < 10)
      newErrors.address = "Please enter a full delivery address (minimum 10 characters)";
    if (!isDeliverable)
      newErrors.zone = "Your location is outside our delivery zone (10km radius)";
    if (!requestedDeliveryTime || !deliverySlotLabel) {
      newErrors.slot = "Please select a delivery time slot";
    } else {
      const valResult = validateDeliveryTimeSlot(
        requestedDeliveryTime || deliverySlotLabel
      );
      if (!valResult.valid) {
        newErrors.slot = valResult.reason || "Invalid delivery time slot";
      }
    }

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

    const orderNumber =
      "BAP-" + Math.random().toString(36).substring(2, 6).toUpperCase();

    startTransition(async () => {
      try {
        const res = await placeOrder({
          items,
          customer: customerInfo,
          subtotal: getSubtotal(),
          deliveryFee: getDeliveryFee(),
          couponCode: useCartStore.getState().couponCode,
          requestedDeliveryTime,
          deliverySlotLabel,
          orderNumber,
        });

        if (res?.success && res?.orderId) {
          // Clear cart on successful order placement
          clearCart();
          // Redirect directly to the order confirmation page
          router.push(`/orders/${res.orderId}`);
        } else if (res?.error) {
          setErrors({ submit: res.error });
        } else {
          setErrors({ submit: "Failed to place order. Please try again." });
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to place order. Please try again.";
        setErrors({ submit: message });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 mt-6">
      <div className="border-b border-gray-100 pb-3">
        <h3 className="font-display font-bold text-brand-primary text-xl flex items-center gap-2">
          <ShoppingBag size={20} className="text-brand-accent" />
          Delivery Details
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Enter your delivery details to confirm your fresh pre-order.
        </p>
      </div>

      {/* Name */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
          <User size={13} className="text-brand-primary" /> Your Name *
        </label>
        <input
          type="text"
          placeholder="e.g. Priyanshu Das"
          value={customerInfo.name}
          onChange={(e) => {
            setCustomerInfo({ name: e.target.value });
            if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
          }}
          className={`w-full border rounded-2xl px-4 py-3 text-sm outline-none focus:border-brand-primary transition bg-white ${
            errors.name ? "border-rose-400 bg-rose-50/20" : "border-gray-200"
          }`}
        />
        {errors.name && (
          <p className="text-rose-600 text-xs flex items-center gap-1 font-medium">
            <AlertCircle size={12} /> {errors.name}
          </p>
        )}
      </div>

      {/* Phone */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
          <Phone size={13} className="text-brand-primary" /> Mobile / WhatsApp Number *
        </label>
        <div className="flex">
          <span className="inline-flex items-center px-3.5 border border-r-0 border-gray-200 rounded-l-2xl bg-gray-50 text-sm font-semibold text-gray-600">
            +91
          </span>
          <input
            type="tel"
            placeholder="10-digit mobile"
            value={customerInfo.phone}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, "").slice(0, 10);
              setCustomerInfo({ phone: val });
              if (errors.phone) setErrors((prev) => ({ ...prev, phone: "" }));
            }}
            className={`flex-1 border rounded-r-2xl px-4 py-3 text-sm font-mono outline-none focus:border-brand-primary transition bg-white ${
              errors.phone ? "border-rose-400 bg-rose-50/20" : "border-gray-200"
            }`}
          />
        </div>
        {errors.phone && (
          <p className="text-rose-600 text-xs flex items-center gap-1 font-medium">
            <AlertCircle size={12} /> {errors.phone}
          </p>
        )}
      </div>

      {/* Address */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
          <MapPin size={13} className="text-brand-primary" /> Full Delivery Address *
        </label>
        <textarea
          placeholder="Flat / House no., Building, Street, Landmark, Area (Guwahati)"
          rows={3}
          value={customerInfo.address}
          onChange={(e) => {
            setCustomerInfo({ address: e.target.value });
            if (errors.address) setErrors((prev) => ({ ...prev, address: "" }));
          }}
          className={`w-full border rounded-2xl px-4 py-3 text-sm outline-none focus:border-brand-primary transition resize-none bg-white ${
            errors.address ? "border-rose-400 bg-rose-50/20" : "border-gray-200"
          }`}
        />
        {errors.address && (
          <p className="text-rose-600 text-xs flex items-center gap-1 font-medium">
            <AlertCircle size={12} /> {errors.address}
          </p>
        )}
      </div>

      {/* Map Pin Location */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
            <MapPin size={13} className="text-brand-primary" /> Pin Exact Location on Map
          </label>
          <span className="text-[11px] text-gray-400 font-medium">10km Delivery Radius</span>
        </div>
        <DeliveryMap />
        {isDeliverable ? (
          <p className="text-emerald-700 text-xs font-semibold flex items-center gap-1">
            ✓ Your pinned location is within our Guwahati delivery radius.
          </p>
        ) : (
          <p className="text-amber-700 text-xs font-medium flex items-center gap-1">
            <AlertCircle size={12} /> Pinned location is outside our 10km radius.
          </p>
        )}
        {errors.zone && (
          <p className="text-rose-600 text-xs flex items-center gap-1 font-medium">
            <AlertCircle size={12} /> {errors.zone}
          </p>
        )}
      </div>

      {/* Delivery Time Slot Scheduling */}
      <DeliveryTimePicker error={errors.slot} />

      {errors.submit && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-center gap-2 font-medium">
          <AlertCircle size={16} className="shrink-0" />
          <span>{errors.submit}</span>
        </div>
      )}

      {/* Submit Button */}
      <div className="space-y-2 pt-2">
        <button
          type="submit"
          disabled={isPending || !isDeliverable}
          className="w-full flex items-center justify-center gap-2 bg-brand-primary hover:bg-brand-accent disabled:bg-gray-200 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl text-base transition-all hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-brand-primary/20"
        >
          {isPending ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Confirming Order…</span>
            </>
          ) : (
            <>
              <ShieldCheck size={18} />
              <span>Confirm Pre-Order (₹{total})</span>
            </>
          )}
        </button>

        <p className="text-center text-[11px] text-gray-400">
          🔒 Secure in-app checkout · 100% fresh pre-order kitchen
        </p>
      </div>
    </form>
  );
}

