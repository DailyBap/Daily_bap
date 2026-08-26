"use client";

import { siteConfig } from "@/config/brand";
import { MessageCircle, MapPin, Clock } from "lucide-react";

// Inline Instagram SVG (not in this lucide-react version)
function InstagramIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

export default function Footer() {
  return (
    <footer className="bg-brand-primary text-white py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-12 mb-12">

          {/* Brand */}
          <div className="space-y-4">
            <div>
              <h3 className="font-display text-3xl font-bold">{siteConfig.name}</h3>
              <p className="text-brand-accent text-xs tracking-widest uppercase mt-0.5">
                Korean Cloud Kitchen
              </p>
            </div>
            <p className="text-white/60 text-sm leading-relaxed max-w-xs">
              {siteConfig.tagline}
            </p>
            <div className="flex gap-3">
              <a
                href={siteConfig.contact.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-white/10 hover:bg-brand-accent transition-colors px-4 py-2 rounded-full text-sm font-medium"
              >
                <InstagramIcon size={14} />
                {siteConfig.contact.instagram}
              </a>
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h4 className="font-semibold text-white/80 text-sm tracking-widest uppercase">
              Contact Us
            </h4>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3 text-white/60">
                <MapPin size={14} className="text-brand-accent flex-shrink-0" />
                {siteConfig.contact.city}
              </div>
              <div className="flex items-center gap-3 text-white/60">
                <Clock size={14} className="text-brand-accent flex-shrink-0" />
                Pre-Order Model — Order in Advance
              </div>
              <a
                href={`https://wa.me/${siteConfig.contact.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-white/70 hover:text-white transition-colors"
              >
                <MessageCircle size={14} className="text-brand-accent flex-shrink-0" />
                WhatsApp Us
              </a>
            </div>
          </div>

          {/* Principles */}
          <div className="space-y-4">
            <h4 className="font-semibold text-white/80 text-sm tracking-widest uppercase">
              Our Promise
            </h4>
            <ul className="space-y-2 text-sm text-white/60">
              {["100% Cook-to-Order", "Zero Waste Policy", "Authentic Korean Recipes", "Fresh Seasonal Ingredients", "Delivered Across Guwahati"].map(
                (item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-brand-accent rounded-full" />
                    {item}
                  </li>
                )
              )}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-white/30">
          <p>© {new Date().getFullYear()} {siteConfig.name}. All rights reserved.</p>
          <p>{siteConfig.notice}</p>
        </div>
      </div>
    </footer>
  );
}
