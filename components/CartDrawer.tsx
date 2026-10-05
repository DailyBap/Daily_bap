"use client";

import { useEffect, useRef, useState } from "react";
import { X, Trash2, Plus, Minus, ShoppingBag, MessageCircle, Tag, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { siteConfig } from "@/config/brand";
import { validateCouponAction } from "@/app/actions/orderActions";
import CheckoutForm from "./CheckoutForm";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const {
    items,
    updateQuantity,
    removeItem,
    clearCart,
    getSubtotal,
    getDiscountAmount,
    getDiscountedSubtotal,
    getDeliveryFee,
    getTotal,
    couponCode,
    discountPercent,
    setCoupon,
    clearCoupon,
  } = useCartStore();

  const [showCheckout, setShowCheckout] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [couponError, setCouponError] = useState("");
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  const subtotal = getSubtotal();
  const discountAmount = getDiscountAmount();
  const deliveryFee = getDeliveryFee();
  const total = getTotal();

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;

    setIsValidatingCoupon(true);
    setCouponError("");

    try {
      const res = await validateCouponAction(couponInput.trim());
      if (res.success && res.code) {
        setCoupon(res.code, res.discountPercent);
        setCouponInput("");
        setCouponError("");
      } else {
        setCouponError(res.error || "Invalid or expired coupon code.");
      }
    } catch {
      setCouponError("Invalid or expired coupon code.");
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-50 transition-opacity duration-300 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        className={`fixed top-0 right-0 h-full w-full sm:w-[420px] bg-white z-50 shadow-2xl transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-label="Shopping cart"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-brand-primary">
          <div className="flex items-center gap-3">
            <ShoppingBag size={20} className="text-white" />
            <h2 className="font-display font-bold text-white text-xl">Your Order</h2>
            {items.length > 0 && (
              <span className="bg-brand-accent text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {items.reduce((s, i) => s + i.quantity, 0)} items
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors"
            aria-label="Close cart"
          >
            <X size={22} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center space-y-4">
              <ShoppingBag size={48} className="text-gray-200" />
              <p className="text-gray-400 font-medium">Your cart is empty</p>
              <p className="text-gray-300 text-sm">
                Add some delicious Korean food from the menu!
              </p>
              <button
                onClick={() => {
                  onClose();
                  document.getElementById("menu")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="text-brand-accent text-sm font-semibold hover:underline"
              >
                Browse Menu →
              </button>
            </div>
          ) : (
            <>
              {/* Cart items */}
              <div className="space-y-3">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100"
                  >
                    {/* Item info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-brand-primary text-sm truncate">
                        {item.name}
                      </p>
                      <p className="text-brand-accent text-xs font-medium mt-0.5">
                        ₹{item.price} each
                      </p>
                    </div>

                    {/* Qty controls */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-7 h-7 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:border-brand-primary transition-colors"
                        aria-label="Decrease"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="w-6 text-center text-sm font-bold text-brand-primary">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-7 h-7 rounded-full bg-brand-primary text-white flex items-center justify-center hover:bg-brand-accent transition-colors"
                        aria-label="Increase"
                      >
                        <Plus size={12} />
                      </button>
                    </div>

                    {/* Item total */}
                    <div className="text-right min-w-[52px]">
                      <p className="font-bold text-brand-primary text-sm">
                        ₹{item.price * item.quantity}
                      </p>
                    </div>

                    {/* Remove */}
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-gray-300 hover:text-red-400 transition-colors ml-1"
                      aria-label="Remove item"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Clear cart */}
              <button
                onClick={clearCart}
                className="text-gray-400 hover:text-red-400 text-xs flex items-center gap-1 transition-colors"
              >
                <Trash2 size={12} /> Clear cart
              </button>

              {/* Creator Code Input Section */}
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-3">
                <p className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <Tag size={14} className="text-brand-accent" /> Have a creator code?
                </p>

                {couponCode ? (
                  <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
                    <div className="flex items-center gap-2">
                      <CheckCircle size={16} className="text-emerald-600" />
                      <div>
                        <span className="font-bold text-xs text-emerald-900 font-mono">
                          {couponCode}
                        </span>
                        <span className="text-[11px] text-emerald-700 ml-1.5 font-medium">
                          ({discountPercent}% OFF applied)
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={clearCoupon}
                      className="text-xs font-semibold text-rose-600 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleApplyCoupon} className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="ENTER CODE"
                        value={couponInput}
                        onChange={(e) => {
                          setCouponInput(e.target.value.toUpperCase());
                          if (couponError) setCouponError("");
                        }}
                        className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono uppercase tracking-wider outline-none focus:border-brand-accent"
                      />
                      <button
                        type="submit"
                        disabled={isValidatingCoupon || !couponInput.trim()}
                        className="bg-brand-primary hover:bg-brand-accent disabled:opacity-50 text-white font-bold text-xs px-4 py-2 rounded-xl transition flex items-center gap-1"
                      >
                        {isValidatingCoupon ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          "Apply"
                        )}
                      </button>
                    </div>
                    {couponError && (
                      <p className="text-xs text-rose-600 flex items-center gap-1 font-medium">
                        <AlertCircle size={12} /> {couponError}
                      </p>
                    )}
                  </form>
                )}
              </div>

              {/* Totals */}
              <div className="bg-gray-50 rounded-2xl p-5 space-y-2.5 border border-gray-100">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Food Subtotal</span>
                  <span className="font-medium">₹{subtotal}</span>
                </div>

                {couponCode && discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-emerald-600 font-medium">
                    <span>Discount ({couponCode})</span>
                    <span>−₹{discountAmount}</span>
                  </div>
                )}

                <div className="flex justify-between text-sm text-gray-600">
                  <span>Delivery</span>
                  <span className={`font-medium ${deliveryFee === 0 ? "text-green-600" : ""}`}>
                    {deliveryFee === 0 ? "FREE 🎉" : `₹${deliveryFee}`}
                  </span>
                </div>

                {deliveryFee > 0 && (
                  <p className="text-[11px] text-gray-400">
                    Add ₹{1000 - subtotal} more for free delivery
                  </p>
                )}

                <div className="border-t border-gray-200 pt-2.5 flex justify-between font-bold text-brand-primary">
                  <span>Total</span>
                  <span className="text-lg font-display">₹{total}</span>
                </div>
              </div>

              {/* Checkout toggle */}
              {!showCheckout ? (
                <button
                  onClick={() => setShowCheckout(true)}
                  className="w-full flex items-center justify-center gap-2 bg-brand-primary hover:bg-brand-accent text-white font-bold py-4 rounded-2xl text-base transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-brand-primary/20"
                >
                  <ShoppingBag size={18} />
                  <span>Proceed to Checkout (₹{total})</span>
                </button>
              ) : (
                <CheckoutForm />
              )}
            </>
          )}
        </div>

        {/* Footer note */}
        <div className="px-6 pb-6 pt-2 border-t border-gray-100">
          <p className="text-center text-[10px] text-gray-300 tracking-wide">
            {siteConfig.name} · PRE-ORDER REQUIRED · GUWAHATI
          </p>
        </div>
      </div>
    </>
  );
}
