"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";

const HuntMapClient = dynamic(() => import("@/components/hunt/HuntMapClient"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[calc(100vh-4rem)] bg-gray-100 flex flex-col items-center justify-center space-y-3">
      <Loader2 className="animate-spin text-[#445916]" size={36} />
      <p className="text-xs font-bold text-gray-500">Loading Guwahati Treasure Map...</p>
    </div>
  ),
});

export default function HuntPageClient() {
  return (
    <main className="min-h-screen bg-white">
      <Navbar onCartOpen={() => {}} />
      <div className="pt-16">
        <HuntMapClient />
      </div>
    </main>
  );
}
