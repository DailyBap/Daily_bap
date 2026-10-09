"use client";

import { useCartStore } from "@/store/useCartStore";
import type { MenuItem } from "@/types";
import DietBadge from "@/components/DietBadge";
import { Plus } from "lucide-react";

interface MenuCardProps {
  item: MenuItem;
}

export default function MenuCard({ item }: MenuCardProps) {
  const addItem = useCartStore((s) => s.addItem);
  const cartItems = useCartStore((s) => s.items);

  const inCartCount = cartItems.find((c) => c.id === item.id)?.quantity ?? 0;

  const handleAdd = () => {
    addItem({
      id: item.id,
      name: item.name,
      price: item.price,
      modelRef: item.modelRef,
      isVegetarian: item.isVegetarian,
    });
  };

  const displayName = item.name.replace(/\s*\(V\)$/i, "");

  return (
    <div className="group bg-white rounded-3xl border border-gray-100 hover:border-brand-accent/40 hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col">
      {/* Color band */}
      <div className="h-2 bg-gradient-to-r from-brand-primary to-brand-accent" />

      <div className="p-6 flex flex-col flex-1">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1">
            <div className="flex items-start gap-2 mb-1">
              <div className="mt-1 flex-shrink-0">
                <DietBadge diet={item.diet} size={18} />
              </div>
              <h3 className="font-body font-bold text-brand-primary text-lg leading-snug">
                {displayName}
              </h3>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {item.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] font-semibold tracking-widest uppercase px-2 py-0.5 rounded-full bg-brand-accent/10 text-brand-accent"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Price */}
          <div className="text-right flex-shrink-0">
            <span className="price">
              ₹{item.price}
            </span>
          </div>
        </div>

        {/* Description */}
        <p className="text-[#444] text-sm leading-relaxed flex-1 mb-5">
          {item.description}
        </p>

        {/* Add to Cart */}
        <button
          onClick={handleAdd}
          className="relative w-full flex items-center justify-center gap-2 bg-brand-primary hover:bg-brand-accent text-white font-semibold py-3 rounded-2xl text-sm transition-all hover:scale-[1.02] active:scale-[0.98] group/btn"
        >
          <Plus size={16} className="group-hover/btn:rotate-90 transition-transform duration-200" />
          {inCartCount > 0 ? (
            <span>Add Another · {inCartCount} in cart</span>
          ) : (
            <span>Add to Cart</span>
          )}
        </button>
      </div>
    </div>
  );
}
