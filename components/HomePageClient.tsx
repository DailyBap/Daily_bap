"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import AboutSection from "@/components/AboutSection";
import MenuGrid from "@/components/MenuGrid";
import ComboDealsSection from "@/components/ComboDealsSection";
import SubscriptionWaitlist from "@/components/SubscriptionWaitlist";
import CartDrawer from "@/components/CartDrawer";
import Footer from "@/components/Footer";

export default function HomePageClient() {
  const [cartOpen, setCartOpen] = useState(false);

  return (
    <>
      <Navbar onCartOpen={() => setCartOpen(true)} />
      <HeroSection onOrderClick={() => setCartOpen(true)} />
      <AboutSection />
      <ComboDealsSection onOpenCart={() => setCartOpen(true)} />
      <MenuGrid />
      <SubscriptionWaitlist />
      <Footer />

      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}
