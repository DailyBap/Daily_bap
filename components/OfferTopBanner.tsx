"use client";

import { useState, useEffect } from "react";
import { Sparkles, Copy, Check, X, ArrowRight, Tag } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";

interface OfferTopBannerProps {
  title?: string;
  code?: string;
  discountPercent?: number;
  badge?: string;
  storageKey?: string;
}

export default function OfferTopBanner({
  title = "Get 10% OFF on all authentic Korean pre-orders!",
  code = "DAILY10",
  discountPercent = 10,
  badge = "Limited Time",
  storageKey = "daily_bap_offer_banner_dismissed",
}: OfferTopBannerProps) {
  const [isDismissed, setIsDismissed] = useState(true); // default true for SSR hydration match
  const [copied, setCopied] = useState(false);
  const [applied, setApplied] = useState(false);

  const [offer, setOffer] = useState({
    title,
    code,
    badge,
    discountPercent,
    isActive: true,
  });

  const cartCouponCode = useCartStore((s) => s.couponCode);
  const setCoupon = useCartStore((s) => s.setCoupon);

  useEffect(() => {
    // 1. Check session storage for user dismiss
    try {
      const dismissed = sessionStorage.getItem(storageKey);
      if (dismissed === "true") {
        setIsDismissed(true);
        return;
      }
    } catch {
      // Ignore
    }

    // 2. Fetch live offer state from /api/offer
    fetch("/api/offer")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.offer) {
          if (!data.offer.isActive) {
            setIsDismissed(true);
          } else {
            setOffer(data.offer);
            setIsDismissed(false);
          }
        } else {
          setIsDismissed(false);
        }
      })
      .catch(() => {
        setIsDismissed(false);
      });
  }, [storageKey]);

  useEffect(() => {
    if (cartCouponCode === offer.code.toUpperCase()) {
      setApplied(true);
    } else {
      setApplied(false);
    }
  }, [cartCouponCode, offer.code]);

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem(storageKey, "true");
    } catch {
      // Ignore sessionStorage errors
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(offer.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleApply = () => {
    setCoupon(offer.code, offer.discountPercent);
    setApplied(true);
  };

  if (isDismissed) {
    return null;
  }

  return (
    <div
      role="banner"
      aria-label="Promotional announcement"
      className="relative z-40 bg-gradient-to-r from-[#202c0b] via-brand-primary to-[#202c0b] text-white border-b border-brand-accent/30 shadow-md transition-all duration-300"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 sm:py-2">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs sm:text-sm">
          {/* Left / Center announcement content */}
          <div className="flex items-center gap-2.5 flex-1 min-w-[240px]">
            <span className="inline-flex items-center gap-1 bg-brand-accent/25 border border-brand-accent/40 text-[#d4e031] text-[10px] sm:text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0">
              <Sparkles size={12} className="text-brand-accent animate-spin-slow" />
              {offer.badge || badge}
            </span>

            <p className="font-medium text-white/95 truncate">
              {offer.title}
            </p>

            <span className="hidden md:inline text-white/40">|</span>

            {/* Promo Code Pill */}
            <div className="inline-flex items-center gap-1.5 bg-black/30 border border-white/20 rounded-lg px-2 py-0.5 shrink-0">
              <Tag size={12} className="text-brand-accent" />
              <span className="font-mono font-bold tracking-wider text-[#d4e031] text-xs">
                {offer.code}
              </span>
            </div>
          </div>

          {/* Right action controls */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Copy button */}
            <button
              onClick={handleCopy}
              type="button"
              className="inline-flex items-center gap-1 bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs font-semibold px-2.5 py-1 rounded-md transition-all"
              title="Copy promo code"
            >
              {copied ? (
                <>
                  <Check size={12} className="text-emerald-400" />
                  <span className="text-emerald-300">Copied</span>
                </>
              ) : (
                <>
                  <Copy size={12} className="text-white/80" />
                  <span>Copy</span>
                </>
              )}
            </button>

            {/* Quick Apply button */}
            {!applied ? (
              <button
                onClick={handleApply}
                type="button"
                className="inline-flex items-center gap-1 bg-brand-accent hover:bg-brand-accent/90 active:scale-95 text-white font-bold text-xs px-2.5 py-1 rounded-md transition-all shadow-xs"
              >
                <span>Apply to Cart</span>
                <ArrowRight size={12} />
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 font-semibold text-xs px-2 py-0.5 rounded-md border border-emerald-500/30">
                <Check size={12} /> Applied ({offer.discountPercent}%)
              </span>
            )}

            {/* Dismiss X button */}
            <button
              onClick={handleDismiss}
              type="button"
              className="text-white/60 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors ml-1"
              aria-label="Dismiss offer banner"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
