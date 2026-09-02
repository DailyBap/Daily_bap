"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { ShoppingCart, Menu, X } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { siteConfig } from "@/config/brand";

// Inline Instagram SVG (not in this lucide-react version)
function InstagramIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

interface NavbarProps {
  onCartOpen: () => void;
}

export default function Navbar({ onCartOpen }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isAssamese, setIsAssamese] = useState(false);
  const totalItems = useCartStore((s) => s.getTotalItems());

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAssamese((prev) => !prev);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const navLinks = [
    { label: "Menu", href: "#menu" },
    { label: "Our Story", href: "#story" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Order", href: "#order" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-brand-primary/95 backdrop-blur-sm shadow-lg">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="relative w-10 h-10 rounded-full overflow-hidden border border-white/20 shadow-xs shrink-0 bg-white/10">
              <Image
                src="/English_logo.jpg"
                alt="Daily Bap English Logo"
                fill
                className={`transition-opacity duration-700 absolute inset-0 object-cover ${
                  isAssamese ? "opacity-0" : "opacity-100"
                }`}
              />
              <Image
                src="/Axomia_logo.png"
                alt="Daily Bap Assamese Logo"
                fill
                className={`transition-opacity duration-700 absolute inset-0 object-cover ${
                  isAssamese ? "opacity-100" : "opacity-0"
                }`}
              />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-white font-display text-2xl font-bold tracking-tight group-hover:text-brand-accent transition-colors">
                {siteConfig.name}
              </span>
              <span className="text-brand-accent text-[10px] font-medium tracking-[0.2em] uppercase">
                Korean Kitchen
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-white/80 hover:text-white text-sm font-medium tracking-wide transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-4">
            <a
              href={siteConfig.contact.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:flex text-white/70 hover:text-brand-accent transition-colors"
              aria-label="Instagram"
            >
              <InstagramIcon size={18} />
            </a>

            {/* Cart Button */}
            <button
              onClick={onCartOpen}
              className="relative flex items-center gap-2 bg-brand-accent hover:bg-brand-accent/90 text-white px-4 py-2 rounded-full text-sm font-semibold transition-all hover:scale-105 active:scale-95"
              aria-label="Open cart"
            >
              <ShoppingCart size={16} />
              <span className="hidden sm:inline">Cart</span>
              {totalItems > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-white text-brand-primary text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {totalItems > 9 ? "9+" : totalItems}
                </span>
              )}
            </button>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden text-white"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="md:hidden pb-4 border-t border-white/10 pt-3 space-y-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block px-2 py-2.5 text-white/80 hover:text-white text-sm font-medium"
              >
                {link.label}
              </a>
            ))}
            <a
              href={siteConfig.contact.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-2 py-2.5 text-brand-accent text-sm font-medium"
            >
              <InstagramIcon size={16} /> {siteConfig.contact.instagram}
            </a>
          </div>
        )}
      </nav>
    </header>
  );
}
