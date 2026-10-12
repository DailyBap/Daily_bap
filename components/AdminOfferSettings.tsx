"use client";

import { useState, useEffect } from "react";
import {
  Tag,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Copy,
  ArrowRight,
  X,
  Eye,
  Save,
  Power,
  RefreshCw,
} from "lucide-react";

export interface OfferFormState {
  title: string;
  code: string;
  badge: string;
  discountPercent: number;
  isActive: boolean;
}

export default function AdminOfferSettings() {
  const [form, setForm] = useState<OfferFormState>({
    title: "Get 10% OFF on all authentic Korean pre-orders!",
    code: "DAILY10",
    badge: "LIMITED TIME",
    discountPercent: 10,
    isActive: true,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Fetch current live offer on mount
  const fetchLiveOffer = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/offer", { cache: "no-store" });
      const data = await res.json();
      if (data.success && data.offer) {
        setForm({
          title: data.offer.title || "Get 10% OFF on all authentic Korean pre-orders!",
          code: data.offer.code || "DAILY10",
          badge: data.offer.badge || "LIMITED TIME",
          discountPercent:
            data.offer.discountPercent !== undefined
              ? Number(data.offer.discountPercent)
              : 10,
          isActive: Boolean(data.offer.isActive),
        });
      }
    } catch (err) {
      console.error("[AdminOfferSettings] Error fetching offer:", err);
      setToast({
        type: "error",
        message: "Failed to load active banner settings from server.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveOffer();
  }, []);

  // Save all form changes
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!form.title.trim()) {
      setToast({ type: "error", message: "Offer title cannot be empty." });
      return;
    }
    if (!form.code.trim()) {
      setToast({ type: "error", message: "Promo code cannot be empty." });
      return;
    }

    setIsSaving(true);
    setToast(null);

    try {
      const res = await fetch("/api/offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          code: form.code.trim().toUpperCase(),
          badge: form.badge.trim().toUpperCase() || "LIMITED TIME",
          discountPercent: Number(form.discountPercent) || 0,
          isActive: form.isActive,
        }),
      });

      const data = await res.json();

      if (data.success && data.offer) {
        setForm((prev) => ({
          ...prev,
          title: data.offer.title,
          code: data.offer.code,
          badge: data.offer.badge || "LIMITED TIME",
          discountPercent: data.offer.discountPercent,
          isActive: data.offer.isActive,
        }));
        setToast({
          type: "success",
          message: "Top promotional banner successfully updated and published!",
        });
      } else {
        setToast({
          type: "error",
          message: data.error || "Failed to update banner settings.",
        });
      }
    } catch (err) {
      console.error("[AdminOfferSettings] Save error:", err);
      setToast({
        type: "error",
        message: "Network error occurred while saving banner settings.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Instant toggle switch
  const handleToggleActive = async () => {
    const nextStatus = !form.isActive;
    setIsToggling(true);
    setToast(null);

    try {
      const res = await fetch("/api/offer", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextStatus }),
      });

      const data = await res.json();

      if (data.success && data.offer) {
        setForm((prev) => ({ ...prev, isActive: data.offer.isActive }));
        setToast({
          type: "success",
          message: data.offer.isActive
            ? "Banner is now LIVE on the website!"
            : "Banner has been HIDDEN from the website.",
        });
      } else {
        setToast({
          type: "error",
          message: data.error || "Failed to toggle banner status.",
        });
      }
    } catch (err) {
      console.error("[AdminOfferSettings] Toggle error:", err);
      setToast({
        type: "error",
        message: "Network error while toggling banner status.",
      });
    } finally {
      setIsToggling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xs p-10 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Loading Offer Banner Settings…
        </p>
      </div>
    );
  }

  return (
    <section className="bg-white rounded-3xl border border-gray-200/80 shadow-xs p-6 sm:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-brand-primary/10 text-brand-primary">
              <Tag className="w-5 h-5" />
            </span>
            <h2 className="font-display font-bold text-2xl text-brand-primary">
              Top Offer Banner Control
            </h2>
          </div>
          <p className="text-xs text-gray-500">
            Configure the sticky promotional announcement bar displayed at the top of Daily Bap.
          </p>
        </div>

        <button
          onClick={fetchLiveOffer}
          type="button"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-xs font-medium text-gray-600 transition"
          title="Reload latest state"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Toast Alert Notification */}
      {toast && (
        <div
          role="alert"
          className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-xs font-semibold transition-all animate-in fade-in slide-in-from-top-2 ${
            toast.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-rose-50 border border-rose-200 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {toast.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
          <button
            onClick={() => setToast(null)}
            type="button"
            className="text-gray-400 hover:text-gray-600 p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Live Visual Preview Section */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
            <Eye className="w-4 h-4 text-brand-accent" />
            <span>Live Visual Preview</span>
          </label>
          <span className="text-[11px] text-gray-400 font-medium">
            (Exact representation of website top bar)
          </span>
        </div>

        {/* Preview Frame matching user's screenshot */}
        <div className="relative rounded-2xl overflow-hidden border border-brand-accent/40 shadow-lg">
          <div className="bg-gradient-to-r from-[#202c0b] via-brand-primary to-[#202c0b] text-white px-4 sm:px-6 py-3.5">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs sm:text-sm">
              
              {/* Left announcement text */}
              <div className="flex items-center gap-2.5 flex-1 min-w-[240px]">
                {/* Badge */}
                <span className="inline-flex items-center gap-1 bg-brand-accent/25 border border-brand-accent/40 text-[#d4e031] text-[10px] sm:text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0">
                  <Sparkles size={12} className="text-brand-accent" />
                  {form.badge || "LIMITED TIME"}
                </span>

                {/* Title */}
                <p className="font-medium text-white/95 truncate">
                  {form.title || "Your promo announcement title here"}
                </p>

                <span className="hidden md:inline text-white/40">|</span>

                {/* Promo Code Pill */}
                <div className="inline-flex items-center gap-1.5 bg-black/30 border border-white/20 rounded-lg px-2 py-0.5 shrink-0">
                  <Tag size={12} className="text-brand-accent" />
                  <span className="font-mono font-bold tracking-wider text-[#d4e031] text-xs">
                    {form.code || "PROMOCODE"}
                  </span>
                </div>
              </div>

              {/* Right action controls mockup */}
              <div className="flex items-center gap-2 shrink-0 opacity-90">
                <span className="inline-flex items-center gap-1 bg-white/10 text-white text-xs font-semibold px-2.5 py-1 rounded-md">
                  <Copy size={12} />
                  <span>Copy</span>
                </span>

                <span className="inline-flex items-center gap-1 bg-brand-accent text-white font-bold text-xs px-2.5 py-1 rounded-md shadow-xs">
                  <span>Apply to Cart</span>
                  <ArrowRight size={12} />
                </span>

                <span className="text-white/60 p-1">
                  <X size={16} />
                </span>
              </div>
            </div>
          </div>

          {/* Inactive overlay indicator if turned off */}
          {!form.isActive && (
            <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px] flex items-center justify-center text-white gap-2 text-xs font-bold uppercase tracking-wider">
              <Power className="w-4 h-4 text-rose-400" />
              <span>Banner Is Currently Disabled &amp; Hidden from Live Site</span>
            </div>
          )}
        </div>
      </div>

      {/* Prominent Active Toggle Switch Card */}
      <div className="p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-stone-50/80 border-stone-200">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full ${
                form.isActive ? "bg-emerald-500 animate-pulse" : "bg-gray-300"
              }`}
            />
            <h3 className="font-bold text-sm text-gray-800">
              {form.isActive ? "Banner is LIVE on Website" : "Banner is OFF (Hidden)"}
            </h3>
          </div>
          <p className="text-xs text-gray-500">
            {form.isActive
              ? "The promotional bar is rendered at the top of every page for all visitors."
              : "The bar is completely removed from customer view. No layout shift occurs."}
          </p>
        </div>

        {/* Toggle Switch */}
        <button
          type="button"
          role="switch"
          aria-checked={form.isActive}
          disabled={isToggling}
          onClick={handleToggleActive}
          className={`relative inline-flex h-8 w-16 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 ${
            form.isActive ? "bg-brand-primary" : "bg-gray-300"
          }`}
        >
          <span className="sr-only">Toggle banner visibility</span>
          <span
            className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
              form.isActive ? "translate-x-8" : "translate-x-0"
            }`}
          >
            {isToggling ? (
              <Loader2 className="w-3.5 h-3.5 text-brand-primary animate-spin" />
            ) : (
              <Power
                className={`w-3.5 h-3.5 ${
                  form.isActive ? "text-brand-primary" : "text-gray-400"
                }`}
              />
            )}
          </span>
        </button>
      </div>

      {/* Form Fields */}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Badge Input */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Badge Label
            </label>
            <input
              type="text"
              placeholder="e.g. LIMITED TIME"
              value={form.badge}
              onChange={(e) => setForm({ ...form, badge: e.target.value })}
              className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider text-brand-primary outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10 transition"
            />
            <p className="text-[11px] text-gray-400 mt-1">Highlighted tag inside the banner</p>
          </div>

          {/* Promo Code Input */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Promo Code
            </label>
            <input
              type="text"
              placeholder="e.g. DAILY10"
              value={form.code}
              onChange={(e) =>
                setForm({ ...form, code: e.target.value.toUpperCase() })
              }
              className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold uppercase text-brand-primary outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10 transition"
            />
            <p className="text-[11px] text-gray-400 mt-1">Applied during customer checkout</p>
          </div>

          {/* Discount Percentage Input */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Discount (%)
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                max="100"
                placeholder="10"
                value={form.discountPercent}
                onChange={(e) =>
                  setForm({
                    ...form,
                    discountPercent: Math.max(0, Number(e.target.value)),
                  })
                }
                className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs font-bold text-gray-800 outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10 transition pr-8"
              />
              <span className="absolute right-3 top-2.5 text-xs font-bold text-gray-400 pointer-events-none">
                %
              </span>
            </div>
            <p className="text-[11px] text-gray-400 mt-1">Subtracted when user clicks Apply</p>
          </div>

          {/* Offer Title Input (spans across) */}
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Promotional Title
            </label>
            <input
              type="text"
              placeholder="e.g. Get 10% OFF on all authentic Korean pre-orders!"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs font-medium text-gray-800 outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10 transition"
            />
            <p className="text-[11px] text-gray-400 mt-1">Main announcement message</p>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center justify-center gap-2 bg-brand-primary hover:bg-brand-accent disabled:opacity-50 text-white font-bold text-xs py-3 px-6 rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Publishing Changes…</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save &amp; Publish Changes</span>
              </>
            )}
          </button>
        </div>
      </form>
    </section>
  );
}
