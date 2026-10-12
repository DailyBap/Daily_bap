"use client";

import { useState } from "react";
import { Sparkles, Copy, Check, X, Tag, ArrowRight } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";

interface HeroOfferCardProps {
  title?: string;
  subtitle?: string;
  code?: string;
  discountPercent?: number;
  onExploreMenu?: () => void;
}

export default function HeroOfferCard({
  title = "First Pre-Order Discount",
  subtitle = "Save 10% on today's authentic homestyle Korean meal",
  code = "DAILY10",
  discountPercent = 10,
  onExploreMenu,
}: HeroOfferCardProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [applied, setApplied] = useState(false);

  const cartCouponCode = useCartStore((s) => s.couponCode);
  const setCoupon = useCartStore((s) => s.setCoupon);

  const isAlreadyApplied = cartCouponCode === code.toUpperCase();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleApply = () => {
    setCoupon(code, discountPercent);
    setApplied(true);
  };

  if (isDismissed) {
    return null;
  }

  return (
    <aside
      aria-label="Promotional offer card"
      className="relative overflow-hidden bg-gradient-to-br from-black/40 via-brand-primary/40 to-black/50 backdrop-blur-md rounded-2xl border border-brand-accent/30 p-4 sm:p-5 shadow-2xl text-white transition-all duration-300 hover:border-brand-accent/50"
    >
      {/* Decorative accent glow */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-brand-accent/20 rounded-full blur-2xl pointer-events-none" />

      {/* Dismiss button */}
      <button
        onClick={() => setIsDismissed(true)}
        type="button"
        className="absolute top-3 right-3 text-white/50 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors"
        aria-label="Dismiss offer card"
      >
        <X size={16} />
      </button>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Left copy */}
        <div className="space-y-1 pr-6">
          <div className="inline-flex items-center gap-1.5 bg-brand-accent/20 border border-brand-accent/30 text-[#d4e031] text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
            <Sparkles size={11} className="text-brand-accent" />
            <span>Best Active Deal</span>
          </div>
          <h3 className="font-display font-bold text-lg text-white">
            {title}
          </h3>
          <p className="text-white/80 text-xs sm:text-sm">
            {subtitle}
          </p>
        </div>

        {/* Right actions */}
        <div className="flex flex-wrap sm:flex-col items-center sm:items-end gap-2 w-full sm:w-auto">
          {/* Code pill */}
          <div className="flex items-center gap-2 bg-black/40 border border-white/20 rounded-xl px-3 py-1.5">
            <Tag size={13} className="text-brand-accent" />
            <span className="font-mono font-bold tracking-wider text-[#d4e031] text-sm">
              {code}
            </span>
            <button
              onClick={handleCopy}
              type="button"
              className="text-white/70 hover:text-white transition-colors ml-1 p-0.5"
              title="Copy code"
            >
              {copied ? (
                <Check size={14} className="text-emerald-400" />
              ) : (
                <Copy size={14} />
              )}
            </button>
          </div>

          {/* Action button */}
          {!isAlreadyApplied && !applied ? (
            <button
              onClick={handleApply}
              type="button"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 bg-brand-accent hover:bg-brand-accent/90 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-md active:scale-95"
            >
              <span>Apply Code</span>
              <ArrowRight size={13} />
            </button>
          ) : (
            <div className="inline-flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-semibold text-xs px-3 py-1.5 rounded-xl">
              <Check size={14} />
              <span>Applied to Cart ({discountPercent}% OFF)</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
