// components/OfferBanner.tsx — Global Active Offer Announcement Banner

import { getActiveOffer } from "@/app/actions/offerActions";
import { Tag } from "lucide-react";

export default async function OfferBanner() {
  const activeOffer = await getActiveOffer();

  if (!activeOffer || !activeOffer.isActive) {
    return null;
  }

  return (
    <div className="w-full bg-[#445916] text-white py-2.5 px-4 text-center shadow-md flex items-center justify-center gap-2 relative z-50">
      <Tag className="w-4 h-4 text-amber-300 animate-pulse shrink-0" />
      <p className="text-xs sm:text-sm font-semibold tracking-wide">
        🎉 {activeOffer.title} - Use code:{" "}
        <span className="font-mono font-bold bg-white/20 px-2 py-0.5 rounded tracking-wider">
          {activeOffer.code}
        </span>{" "}
        on WhatsApp!
      </p>
    </div>
  );
}
