"use client";

import { useEffect, useRef } from "react";
import { X, Trash2, Plus, Minus, ShoppingBag, MessageCircle } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { siteConfig } from "@/config/brand";
import CheckoutForm from "./CheckoutForm";
import { useState } from "react";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { items, updateQuantity, removeItem, clearCart, getSubtotal, getDeliveryFee, getTotal } =
    useCartStore();

  const [showCheckout, setShowCheckout] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  const subtotal = getSubtotal();
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
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

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

              {/* Totals */}
              <div className="bg-gray-50 rounded-2xl p-5 space-y-2.5 border border-gray-100">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span className="font-medium">₹{subtotal}</span>
                </div>
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
                  <MessageCircle size={18} />
                  Checkout via WhatsApp
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
