"use client";

import { useState, useEffect } from "react";
import { Copy, Check, X, Tag } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";

interface OfferBannerClientProps {
  title: string;
  code: string;
  discountPercent?: number;
}

export default function OfferBannerClient({
  title,
  code,
  discountPercent = 10,
}: OfferBannerClientProps) {
  const [isDismissed, setIsDismissed] = useState(true);
  const [copied, setCopied] = useState(false);

  const setCoupon = useCartStore((s) => s.setCoupon);
  const cartCouponCode = useCartStore((s) => s.couponCode);

  useEffect(() => {
    try {
      const dismissed = sessionStorage.getItem("daily_bap_pill_dismissed");
      if (dismissed !== "true") {
        setIsDismissed(false);
      }
    } catch {
      setIsDismissed(false);
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem("daily_bap_pill_dismissed", "true");
    } catch {
      // ignore
    }
  };

  const handleCopyAndApply = async () => {
    setCoupon(code, discountPercent);
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isDismissed) {
    return null;
  }

  const isApplied = cartCouponCode === code.toUpperCase();

  return (
    <aside
      aria-label="Active discount offer"
      className="fixed bottom-5 left-4 sm:left-6 z-40 max-w-[calc(100vw-2rem)] sm:max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500"
    >
      <div className="bg-gradient-to-r from-brand-primary to-[#2a380e] text-white border border-brand-accent/40 shadow-2xl rounded-2xl sm:rounded-full px-4 py-2.5 flex items-center justify-between gap-3 text-xs sm:text-sm">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="text-base shrink-0 select-none">🎉</span>
          <div className="truncate">
            <span className="font-semibold text-white/95">{title}</span>
            <span className="text-white/60 text-xs hidden sm:inline ml-1.5">
              Code:
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Code button */}
          <button
            onClick={handleCopyAndApply}
            type="button"
            className="flex items-center gap-1 bg-brand-accent hover:bg-brand-accent/90 text-white font-mono font-bold text-xs px-2.5 py-1 rounded-full transition-all active:scale-95 shadow-xs"
            title="Click to copy and apply discount"
          >
            <Tag size={11} />
            <span>{code}</span>
            {copied || isApplied ? (
              <Check size={12} className="text-emerald-200 ml-0.5" />
            ) : (
              <Copy size={11} className="text-white/70 ml-0.5" />
            )}
          </button>

          {/* Dismiss button */}
          <button
            onClick={handleDismiss}
            type="button"
            className="text-white/60 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
            aria-label="Dismiss offer banner"
          >
            <X size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
