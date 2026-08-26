"use client";

import { useCartStore } from "@/store/useCartStore";
import type { MenuItem } from "@/types";
import { Plus, Leaf } from "lucide-react";

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

  return (
    <div className="group bg-white rounded-3xl border border-gray-100 hover:border-brand-accent/40 hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col">
      {/* Color band */}
      <div className="h-2 bg-gradient-to-r from-brand-primary to-brand-accent" />

      <div className="p-6 flex flex-col flex-1">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-display font-bold text-brand-primary text-lg leading-snug">
                {item.name}
              </h3>
              {item.isVegetarian && (
                <span
                  title="Vegetarian"
                  className="flex-shrink-0 w-5 h-5 rounded border-2 border-green-600 flex items-center justify-center"
                >
                  <Leaf size={10} className="text-green-600" />
                </span>
              )}
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
            <span className="font-display font-bold text-xl text-brand-primary">
              ₹{item.price}
            </span>
          </div>
        </div>

        {/* Description */}
        <p className="text-gray-500 text-sm leading-relaxed flex-1 mb-5">
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
