"use client";

import Image from "next/image";
import { siteConfig } from "@/config/brand";
import { ChevronDown } from "lucide-react";

interface HeroSectionProps {
  onOrderClick: () => void;
}

export default function HeroSection({ onOrderClick }: HeroSectionProps) {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-brand-primary via-[#2f3f0f] to-[#171f07]">
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
          {/* Left Column — Text Content (z-40 ensures text is never covered at any breakpoint) */}
          <div className="relative z-40 flex flex-col justify-center space-y-8">
            {/* Soft Ambient Glow behind text block for maximum contrast */}
            <div className="absolute -inset-6 bg-black/20 blur-3xl rounded-3xl -z-10 pointer-events-none" />

            {/* Model Badge */}
            <div className="inline-flex w-fit items-center gap-2 bg-brand-accent/20 border border-brand-accent/30 rounded-full px-4 py-1.5 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-brand-accent animate-pulse" />
              <span className="text-brand-accent text-xs font-semibold tracking-widest uppercase">
                {siteConfig.model} · Guwahati
              </span>
            </div>

            {/* Main Headline */}
            <div className="space-y-2">
              <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-[1.05] drop-shadow-md">
                <span className="block">Authentic</span>
                <span className="block text-brand-accent">Korean</span>
                <span className="block">Comfort</span>
                <span className="block">Food.</span>
              </h1>
            </div>

            {/* Tagline */}
            <p className="text-white/80 text-lg sm:text-xl leading-relaxed max-w-md font-body">
              {siteConfig.tagline}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4">
              <a
                href="#menu"
                className="inline-flex items-center gap-2 bg-brand-accent hover:bg-brand-accent/90 text-white font-semibold px-8 py-4 rounded-full text-base transition-all hover:scale-105 active:scale-95 shadow-lg shadow-brand-accent/30 motion-reduce:transition-none"
              >
                {siteConfig.cta}
              </a>
              <a
                href="#story"
                className="inline-flex items-center gap-2 border-2 border-white/30 hover:border-white/60 text-white font-semibold px-8 py-4 rounded-full text-base transition-all hover:bg-white/5 motion-reduce:transition-none"
              >
                Our Story
              </a>
            </div>

            {/* Stats Row */}
            <div className="flex gap-8 pt-4 border-t border-white/15">
              {[
                { label: "Pre-Order", value: "100%" },
                { label: "Delivery Radius", value: "10km" },
                { label: "Menu Items", value: "9+" },
              ].map((stat) => (
                <div key={stat.label} className="flex flex-col">
                  <span className="text-2xl font-bold text-brand-accent font-display">
                    {stat.value}
                  </span>
                  <span className="text-white/60 text-xs tracking-wide">
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column — Editorial Image Collage */}
          <div className="relative w-full h-[420px] sm:h-[500px] lg:h-[600px] flex items-center justify-center">
            {/* Element 1 — Main Centerpiece (Transparent PNG Hero Dish) */}
            <div className="relative z-20 w-3/4 h-3/4 flex items-center justify-center">
              <Image
                alt="Daily Bap Signature Bibimbap Bowl with Gochujang and Fresh Vegetables"
                src="/Bibimbap.png"
                fill
                priority
                className="object-contain drop-shadow-[0_30px_30px_rgba(0,0,0,0.6)] hover:scale-105 transition-transform duration-500 motion-reduce:transition-none"
                sizes="(max-width: 768px) 80vw, 40vw"
              />
            </div>

            {/* Element 2 — Top-Right Accent Card */}
            <div className="absolute top-2 right-0 sm:top-4 sm:right-4 lg:right-0 z-10 w-36 h-36 sm:w-44 sm:h-44 lg:w-48 lg:h-48 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/10 hover:-translate-y-2 hover:rotate-3 transition-all duration-500 motion-reduce:transition-none bg-black/20">
              <Image
                alt="Daily Bap Golden Tofu Bento Box"
                src="/Golden tofu bento.png"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 40vw, 20vw"
              />
            </div>

            {/* Element 3 — Bottom-Left Accent Card */}
            <div className="absolute bottom-2 left-0 sm:bottom-10 sm:left-4 lg:-left-4 z-30 w-40 h-40 sm:w-48 sm:h-48 lg:w-56 lg:h-56 rounded-3xl overflow-hidden shadow-2xl border-2 border-white/10 hover:-translate-y-2 hover:-rotate-3 transition-all duration-500 motion-reduce:transition-none bg-black/20">
              <Image
                alt="Authentic House-Made Korean Kimchi Side Dish"
                src="/Kimchi.png"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 45vw, 25vw"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-white/40 animate-bounce pointer-events-none">
        <span className="text-[10px] tracking-widest uppercase">Scroll</span>
        <ChevronDown size={16} />
      </div>
    </section>
  );
}
