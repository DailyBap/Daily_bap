// components/OfferBanner.tsx — Daily Offers Top Announcement Banner

import { getActiveOffer } from "@/app/actions/adminActions";
import { Tag } from "lucide-react";

export default async function OfferBanner() {
  const activeOffer = await getActiveOffer();

  if (!activeOffer || !activeOffer.isActive) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-[#445916] to-[#5a761e] text-white text-xs sm:text-sm font-medium py-2.5 px-4 text-center shadow-xs flex items-center justify-center gap-2 relative z-40">
      <Tag className="w-4 h-4 text-brand-accent animate-pulse shrink-0" />
      <span>
        🎉 <strong className="font-bold">{activeOffer.title}</strong> — Use code:{" "}
        <span className="font-mono font-bold bg-white/20 px-2 py-0.5 rounded text-white tracking-wider">
          {activeOffer.code}
        </span>{" "}
        on WhatsApp!
      </span>
    </div>
  );
}
