"use client";

import { useState } from "react";
import { menuData, menuCategories, howToEat, siteConfig, readySection } from "@/config/brand";
import type { MenuCategoryKey } from "@/config/brand";
import MenuCard from "./MenuCard";

export default function MenuGrid() {
  const [activeTab, setActiveTab] = useState<MenuCategoryKey>("bentoBoxes");

  const activeItems = menuData[activeTab];

  return (
    <>
      {/* MENU SECTION */}
      <section id="menu" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Section header */}
          <div className="text-center mb-14 space-y-3">
            <p className="text-brand-accent text-sm font-semibold tracking-widest uppercase">
              What We Cook
            </p>
            <h2 className="font-display text-4xl sm:text-5xl font-bold text-brand-primary">
              The Daily Bap Menu
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Every item cooked specifically for your order. No frozen shortcuts.
            </p>
          </div>

          {/* Category tabs */}
          <div className="flex flex-wrap gap-3 justify-center mb-12">
            {menuCategories.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setActiveTab(cat.key)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
                  activeTab === cat.key
                    ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/20 scale-105"
                    : "bg-gray-100 text-gray-600 hover:bg-brand-accent/10 hover:text-brand-accent"
                }`}
              >
                <span>{cat.emoji}</span>
                {cat.label}
              </button>
            ))}
          </div>

          {/* Menu grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeItems.map((item) => (
              <MenuCard key={item.id} item={item} />
            ))}
          </div>

          {/* Notice */}
          <p className="text-center text-xs text-gray-400 mt-10 max-w-2xl mx-auto">
            {siteConfig.notice}
          </p>
        </div>
      </section>

      {/* HOW TO EAT A BAP */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14 space-y-3">
            <p className="text-brand-accent text-sm font-semibold tracking-widest uppercase">
              How To Eat A Bap
            </p>
            <h2 className="font-display text-4xl sm:text-5xl font-bold text-brand-primary">
              The 5-Step Ritual
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-5">
            {howToEat.map((step, i) => (
              <div
                key={step.step}
                className="relative bg-white rounded-3xl p-6 border border-gray-100 hover:border-brand-accent/30 hover:shadow-md transition-all text-center group"
              >
                {/* Step connector line (not last) */}
                {i < howToEat.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-2.5 w-5 h-px bg-brand-accent/30 z-10" />
                )}

                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-brand-primary group-hover:bg-brand-accent transition-colors flex items-center justify-center">
                  <span className="font-display font-bold text-white text-sm">{step.step}</span>
                </div>
                <h3 className="font-semibold text-brand-primary text-xs tracking-widest uppercase mb-2">
                  {step.heading}
                </h3>
                <p className="text-gray-500 text-xs leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* READY FOR YOUR BAP — CTA BANNER */}
      <section id="order" className="py-20 bg-brand-accent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <h2 className="font-display text-4xl sm:text-5xl font-bold text-white">
            {readySection.heading}
          </h2>
          <p className="text-white/80 text-lg max-w-xl mx-auto">
            {readySection.subheading}
          </p>
          <p className="text-white/60 text-xs tracking-widest font-medium">
            {readySection.tagline}
          </p>
          <a
            href="#menu"
            className="inline-flex items-center gap-2 bg-brand-primary hover:bg-brand-primary/90 text-white font-bold px-10 py-4 rounded-full text-base transition-all hover:scale-105 active:scale-95 shadow-xl"
          >
            {siteConfig.cta}
          </a>
        </div>
      </section>
    </>
  );
}
