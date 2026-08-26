"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import AboutSection from "@/components/AboutSection";
import MenuGrid from "@/components/MenuGrid";
import CartDrawer from "@/components/CartDrawer";
import Footer from "@/components/Footer";

export default function HomePage() {
  const [cartOpen, setCartOpen] = useState(false);

  return (
    <main>
      <Navbar onCartOpen={() => setCartOpen(true)} />
      <HeroSection onOrderClick={() => setCartOpen(true)} />
      <AboutSection />
      <MenuGrid />
      <Footer />

      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
    </main>
  );
}
