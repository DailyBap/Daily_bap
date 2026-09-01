"use client";

import Image from "next/image";
import { siteConfig } from "@/config/brand";
import { ChevronDown } from "lucide-react";

interface HeroSectionProps {
  onOrderClick: () => void;
}

export default function HeroSection({ onOrderClick }: HeroSectionProps) {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-brand-primary">
      {/* Background texture pattern */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
        <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[calc(100vh-4rem)]">

          {/* Left — Text Content */}
          <div className="flex flex-col justify-center space-y-8">
            {/* Badge */}
            <div className="inline-flex w-fit items-center gap-2 bg-brand-accent/20 border border-brand-accent/30 rounded-full px-4 py-1.5">
              <span className="w-2 h-2 rounded-full bg-brand-accent animate-pulse" />
              <span className="text-brand-accent text-xs font-semibold tracking-widest uppercase">
                {siteConfig.model} · Guwahati
              </span>
            </div>

            {/* Headline */}
            <div className="space-y-2">
              <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-[1.05]">
                <span className="block">Authentic</span>
                <span className="block text-brand-accent">Korean</span>
                <span className="block">Comfort</span>
                <span className="block">Food.</span>
              </h1>
            </div>

            {/* Tagline */}
            <p className="text-white/70 text-lg sm:text-xl leading-relaxed max-w-md">
              {siteConfig.tagline}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4">
              <a
                href="#menu"
                className="inline-flex items-center gap-2 bg-brand-accent hover:bg-brand-accent/90 text-white font-semibold px-8 py-4 rounded-full text-base transition-all hover:scale-105 active:scale-95 shadow-lg shadow-brand-accent/30"
              >
                {siteConfig.cta}
              </a>
              <a
                href="#story"
                className="inline-flex items-center gap-2 border-2 border-white/30 hover:border-white/60 text-white font-semibold px-8 py-4 rounded-full text-base transition-all hover:bg-white/5"
              >
                Our Story
              </a>
            </div>

            {/* Stats Row */}
            <div className="flex gap-8 pt-4 border-t border-white/10">
              {[
                { label: "Pre-Order", value: "100%" },
                { label: "Avg. Delivery", value: "5km" },
                { label: "Menu Items", value: "9+" },
              ].map((stat) => (
                <div key={stat.label} className="flex flex-col">
                  <span className="text-2xl font-bold text-brand-accent font-display">
                    {stat.value}
                  </span>
                  <span className="text-white/50 text-xs tracking-wide">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — Static Food Image Presentation */}
          <div className="relative flex items-center justify-center lg:justify-end">
            <div className="h-[400px] md:h-[500px] w-full relative">
              <Image
                alt="Daily Bap Premium Bowl"
                className="object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-500"
                fill
                src="/hero-food.png"
                priority
              />
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-white/30 animate-bounce">
        <span className="text-[10px] tracking-widest uppercase">Scroll</span>
        <ChevronDown size={16} />
      </div>
    </section>
  );
}
