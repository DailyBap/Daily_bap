"use client";

import { ourStory, processSteps, whyPreOrder, foodPrinciples } from "@/config/brand";
import { CheckCircle2 } from "lucide-react";

export default function AboutSection() {
  return (
    <>
      {/* OUR STORY */}
      <section id="story" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* Left — Story text */}
            <div className="space-y-8">
              <div className="space-y-2">
                <p className="text-brand-accent text-sm font-semibold tracking-widest uppercase">
                  {ourStory.heading}
                </p>
                <h2 className="font-display text-4xl sm:text-5xl font-bold text-brand-primary leading-tight">
                  {ourStory.subheading}
                </h2>
              </div>

              <div className="space-y-5">
                {ourStory.body.map((para, i) => (
                  <p key={i} className="text-gray-600 text-lg leading-relaxed">
                    {para}
                  </p>
                ))}
              </div>
            </div>

            {/* Right — 4-Step process */}
            <div className="space-y-4">
              {processSteps.map((step, i) => (
                <div
                  key={step.step}
                  className="flex items-start gap-5 p-5 rounded-2xl border border-gray-100 hover:border-brand-accent/30 hover:bg-brand-accent/5 transition-all group"
                >
                  {/* Step number */}
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-brand-primary flex items-center justify-center">
                    <span className="text-white font-display font-bold text-lg">{step.step}</span>
                  </div>

                  <div>
                    <h3 className="font-semibold text-brand-primary tracking-wide text-sm uppercase mb-1">
                      {step.label}
                    </h3>
                    <p className="text-gray-500 text-sm leading-relaxed">{step.description}</p>
                  </div>

                  <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                    <CheckCircle2 size={20} className="text-brand-accent" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* WHY PRE-ORDER */}
      <section
        id="how-it-works"
        className="py-20 bg-brand-primary text-white"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <p className="text-brand-accent text-sm font-semibold tracking-widest uppercase">
            {whyPreOrder.heading}
          </p>
          <h2 className="font-display text-4xl sm:text-5xl font-bold">
            {whyPreOrder.subheading}
          </h2>
          <p className="text-white/70 text-lg max-w-2xl mx-auto leading-relaxed">
            {whyPreOrder.body}
          </p>
        </div>
      </section>

      {/* FOOD PRINCIPLES */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14 space-y-3">
            <p className="text-brand-accent text-sm font-semibold tracking-widest uppercase">
              Our Food Principles
            </p>
            <h2 className="font-display text-4xl sm:text-5xl font-bold text-brand-primary">
              What Goes Into Every Bap
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {foodPrinciples.map((principle) => (
              <div
                key={principle.id}
                className="bg-white rounded-3xl p-7 border border-gray-100 hover:border-brand-accent/40 hover:shadow-lg transition-all group"
              >
                <div className="w-10 h-10 bg-brand-accent/10 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-brand-accent group-hover:scale-110 transition-all">
                  <span className="text-brand-accent group-hover:text-white font-display font-bold text-lg transition-colors">
                    {principle.id}
                  </span>
                </div>
                <h3 className="font-semibold text-brand-primary text-base mb-2 leading-snug">
                  {principle.label}
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  {principle.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
