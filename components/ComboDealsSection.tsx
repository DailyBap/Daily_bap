"use client";

import { useState } from "react";
import { Plus, Check, Users, Sparkles, PackageCheck } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import DietBadge from "@/components/DietBadge";
import { comboDealsData, type ComboDealItem } from "@/config/comboDeals";

interface ComboDealsSectionProps {
  combos?: ComboDealItem[];
  title?: string;
  subtitle?: string;
  onOpenCart?: () => void;
}

export default function ComboDealsSection({
  combos = comboDealsData,
  title = "Curated Combo Deals",
  subtitle = "Complete Korean meals paired with authentic sides and dips at special bundled prices.",
  onOpenCart,
}: ComboDealsSectionProps) {
  const addItem = useCartStore((s) => s.addItem);
  const cartItems = useCartStore((s) => s.items);

  const [recentlyAddedId, setRecentlyAddedId] = useState<string | null>(null);

  const handleAddToCart = (combo: ComboDealItem) => {
    addItem({
      id: combo.id,
      name: combo.name,
      price: combo.discountedPrice,
      modelRef: null,
      isVegetarian: combo.diet === "veg",
    });

    setRecentlyAddedId(combo.id);
    setTimeout(() => {
      setRecentlyAddedId((curr) => (curr === combo.id ? null : curr));
    }, 1500);
  };

  return (
    <section id="combos" className="py-20 bg-gradient-to-b from-white via-stone-50/50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-accent/15 border border-brand-accent/30 text-brand-primary text-xs font-bold tracking-widest uppercase mb-1">
            <Sparkles size={13} className="text-brand-accent" />
            <span>Value Bundles</span>
          </div>
          <h2 className="font-display text-4xl sm:text-5xl font-bold text-brand-primary">
            {title}
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
            {subtitle}
          </p>
        </div>

        {/* Combos Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-8">
          {combos.map((combo) => {
            const inCartCount =
              cartItems.find((c) => c.id === combo.id)?.quantity ?? 0;
            const savings = combo.originalPrice - combo.discountedPrice;
            const savingsPercent = Math.round(
              (savings / combo.originalPrice) * 100
            );
            const isJustAdded = recentlyAddedId === combo.id;

            return (
              <div
                key={combo.id}
                className={`relative group bg-white rounded-3xl border transition-all duration-300 overflow-hidden flex flex-col ${
                  combo.isPopular
                    ? "border-brand-accent/50 shadow-xl ring-1 ring-brand-accent/30"
                    : "border-gray-200/80 hover:border-brand-accent/40 shadow-md hover:shadow-xl"
                }`}
              >
                {/* Top Accent Gradient Bar */}
                <div className="h-2.5 bg-gradient-to-r from-brand-primary via-brand-accent to-brand-primary" />

                <div className="p-6 sm:p-7 flex flex-col flex-1">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      {/* Badges row */}
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <DietBadge diet={combo.diet} size={18} />

                        {combo.badge && (
                          <span className="text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-brand-primary text-white">
                            {combo.badge}
                          </span>
                        )}

                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                          <Users size={12} />
                          {typeof combo.serves === "number" ? `Serves ${combo.serves}` : combo.serves}
                        </span>
                      </div>

                      {/* Combo Title */}
                      <h3 className="font-display font-bold text-xl sm:text-2xl text-brand-primary leading-tight group-hover:text-brand-accent transition-colors">
                        {combo.name}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1 font-medium">
                        {combo.tagline}
                      </p>
                    </div>

                    {/* Price Block */}
                    <div className="text-right shrink-0 bg-gray-50 px-3 py-2 rounded-2xl border border-gray-100">
                      <div className="text-xs text-gray-400 line-through">
                        ₹{combo.originalPrice}
                      </div>
                      <div className="price text-2xl font-bold text-brand-primary">
                        ₹{combo.discountedPrice}
                      </div>
                      <div className="inline-block mt-0.5">
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          Save ₹{savings} ({savingsPercent}% OFF)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-gray-600 text-xs sm:text-sm leading-relaxed mb-5">
                    {combo.description}
                  </p>

                  {/* What's Included Box */}
                  <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200/60 mb-6 space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-brand-primary flex items-center gap-1.5">
                      <PackageCheck size={14} className="text-brand-accent" />
                      What&apos;s Included:
                    </p>
                    <ul className="space-y-1.5 text-xs text-gray-700">
                      {combo.includes.map((item, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-accent shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Add to Cart CTA */}
                  <div className="mt-auto pt-2">
                    <button
                      onClick={() => handleAddToCart(combo)}
                      type="button"
                      className={`relative w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl font-semibold text-sm transition-all duration-200 active:scale-[0.98] ${
                        isJustAdded
                          ? "bg-emerald-600 text-white"
                          : "bg-brand-primary hover:bg-brand-accent text-white shadow-md hover:shadow-lg hover:shadow-brand-accent/20"
                      }`}
                    >
                      {isJustAdded ? (
                        <>
                          <Check size={16} />
                          <span>Added to Cart!</span>
                        </>
                      ) : (
                        <>
                          <Plus size={16} className="group-hover:rotate-90 transition-transform duration-200" />
                          {inCartCount > 0 ? (
                            <span>Add Another · {inCartCount} in cart</span>
                          ) : (
                            <span>Add Combo to Cart (₹{combo.discountedPrice})</span>
                          )}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Free Delivery Callout Banner */}
        <div className="mt-12 bg-white rounded-2xl p-4 sm:p-5 border border-dashed border-brand-accent/50 text-center flex flex-col sm:flex-row items-center justify-center gap-3 text-xs sm:text-sm text-gray-600">
          <span className="text-xl">🛵</span>
          <span>
            <strong>Pro-tip:</strong> Combine any 2 or 3 combos to cross <strong>₹1,000</strong> for <strong>100% FREE DELIVERY</strong> across Guwahati!
          </span>
        </div>
      </div>
    </section>
  );
}
