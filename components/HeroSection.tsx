"use client";

import Image from "next/image";
import { siteConfig, HERO_IMAGES } from "@/config/brand";
import { ChevronDown } from "lucide-react";

interface HeroSectionProps {
  onOrderClick: () => void;
}

export default function HeroSection({ onOrderClick }: HeroSectionProps) {
  // Pre-defined scattered rotation angles for photo collage effect
  const rotations = ["rotate-[-3deg]", "rotate-[3deg]", "rotate-[-1deg]", "rotate-[2deg]"];

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-brand-primary">
      {/* Background texture pattern */}
      <div
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 w-full">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center min-h-[calc(100vh-5rem)]">
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
                { label: "Delivery Radius", value: "10km" },
                { label: "Menu Items", value: "9+" },
              ].map((stat) => (
                <div key={stat.label} className="flex flex-col">
                  <span className="text-2xl font-bold text-brand-accent font-display">
                    {stat.value}
                  </span>
                  <span className="text-white/50 text-xs tracking-wide">
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — Static Scattered Dish Photo Collage */}
          <div className="relative flex items-center justify-center">
            <div className="w-full grid grid-cols-2 gap-4 sm:gap-6 max-w-md lg:max-w-none">
              {HERO_IMAGES.map((imgSrc, idx) => {
                const rotationClass = rotations[idx % rotations.length];

                return (
                  <div
                    key={imgSrc}
                    className={`relative aspect-square sm:aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl border-4 border-white/20 bg-black/20 transform ${rotationClass} hover:rotate-0 hover:scale-105 hover:z-20 transition-all duration-500`}
                  >
                    <Image
                      alt={`Daily Bap Dish ${idx + 1}`}
                      src={imgSrc}
                      fill
                      priority={idx === 0}
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, 25vw"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-white/30 animate-bounce">
        <span className="text-[10px] tracking-widest uppercase">Scroll</span>
        <ChevronDown size={16} />
      </div>
    </section>
  );
}
