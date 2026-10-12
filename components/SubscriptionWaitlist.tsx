"use client";

import {
  CalendarDays,
  Sparkles,
  Clock,
  Wallet,
  ShieldCheck,
} from "lucide-react";

export default function SubscriptionWaitlist() {
  const googleFormUrl =
    "https://docs.google.com/forms/d/e/1FAIpQLSeSAmXGCHbWvWJWTaj1C9GCXTwCGYxyoCNQKioolY0wmP8mLA/viewform?embedded=true";

  return (
    <section
      id="subscription"
      className="py-24 bg-gradient-to-b from-stone-50 via-white to-stone-50 relative overflow-hidden"
    >
      {/* Decorative Brand Circles in Background */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-brand-accent/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-brand-primary/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="bg-gradient-to-br from-[#1a2307] via-brand-primary to-[#2a380e] rounded-3xl sm:rounded-[2.5rem] shadow-2xl border border-brand-accent/20 text-white overflow-hidden">
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 p-8 sm:p-12 lg:p-16 items-center">
            
            {/* Left Column — Marketing Copy (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 bg-brand-accent/20 border border-brand-accent/40 rounded-full px-4 py-1.5 shadow-xs">
                <Sparkles size={14} className="text-[#d4e031]" />
                <span className="text-[#e2ee42] text-xs font-bold tracking-widest uppercase">
                  Coming Soon · Daily Meal Passes
                </span>
              </div>

              {/* Title & Tagline */}
              <div className="space-y-3">
                <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight">
                  Solve Daily Lunch Forever. <br />
                  <span className="text-[#d4e031]">Korean Comfort on Subscription.</span>
                </h2>
                <p className="text-white/85 text-base sm:text-lg leading-relaxed max-w-xl font-normal">
                  Specially crafted for office-goers and students across Guwahati. No daily ordering hassle, no surge fees — just chef-cooked Korean bentos &amp; warm bibimbap bowls delivered reliably to your desk.
                </p>
              </div>

              {/* Key Highlights Grid */}
              <div className="grid sm:grid-cols-2 gap-4 pt-2">
                <div className="flex items-start gap-3 bg-black/25 p-3.5 rounded-2xl border border-white/10">
                  <div className="w-8 h-8 rounded-xl bg-brand-accent/20 flex items-center justify-center shrink-0 text-brand-accent">
                    <Wallet size={18} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-white">Budget-Friendly Pricing</h3>
                    <p className="text-xs text-white/70 mt-0.5">
                      Save up to 25% vs daily ordering with student &amp; corporate meal passes.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-black/25 p-3.5 rounded-2xl border border-white/10">
                  <div className="w-8 h-8 rounded-xl bg-brand-accent/20 flex items-center justify-center shrink-0 text-brand-accent">
                    <Clock size={18} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-white">Guaranteed Lunch Slot</h3>
                    <p className="text-xs text-white/70 mt-0.5">
                      Scheduled warm arrival between 12:45 PM – 1:30 PM sharp.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-black/25 p-3.5 rounded-2xl border border-white/10">
                  <div className="w-8 h-8 rounded-xl bg-brand-accent/20 flex items-center justify-center shrink-0 text-brand-accent">
                    <CalendarDays size={18} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-white">Rotating Daily Menu</h3>
                    <p className="text-xs text-white/70 mt-0.5">
                      Fried chicken bentos, bulgogi, kimbap, and fresh sides rotating daily.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-black/25 p-3.5 rounded-2xl border border-white/10">
                  <div className="w-8 h-8 rounded-xl bg-brand-accent/20 flex items-center justify-center shrink-0 text-brand-accent">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-white">1-Tap Pause &amp; Skip</h3>
                    <p className="text-xs text-white/70 mt-0.5">
                      Going on leave or have exams? Pause anytime on WhatsApp with zero penalty.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column — Embedded Google Form Iframe (5 cols) */}
            <div className="lg:col-span-5 w-full">
              <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-white/30 overflow-hidden flex flex-col w-full min-h-[600px]">
                {/* Form header pill */}
                <div className="bg-stone-50 border-b border-stone-200/60 px-5 py-3 flex items-center justify-between shrink-0">
                  <span className="text-xs font-bold text-brand-primary uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Priority Waitlist
                  </span>
                  <span className="text-[10px] font-bold text-brand-accent bg-brand-accent/15 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    Official Form
                  </span>
                </div>

                {/* Google Form iframe container */}
                <div className="relative flex-1 w-full bg-white">
                  <iframe
                    src={googleFormUrl}
                    title="Daily Bap Subscription Waitlist Google Form"
                    className="w-full h-full min-h-[600px] border-0 block"
                    loading="lazy"
                  >
                    Loading form…
                  </iframe>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
