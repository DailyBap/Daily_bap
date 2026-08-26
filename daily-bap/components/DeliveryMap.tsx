/**
 * components/DeliveryMap.tsx
 *
 * SSR-safe wrapper around DeliveryMapClient.
 * Leaflet requires the browser DOM, so we use dynamic import
 * with ssr: false to prevent server-side rendering errors.
 *
 * Usage: import DeliveryMap from "@/components/DeliveryMap"
 * (already used this way inside CheckoutForm.tsx)
 */

"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const DeliveryMap = dynamic(() => import("./DeliveryMapClient"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-72 bg-gray-100 rounded-2xl flex flex-col items-center justify-center gap-3">
      <Loader2 className="animate-spin text-brand-primary" size={28} />
      <p className="text-gray-400 text-sm">Loading delivery map…</p>
    </div>
  ),
});

export default DeliveryMap;
