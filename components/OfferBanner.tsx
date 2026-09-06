// components/OfferBanner.tsx — Floating Pill Announcement Banner for Daily Bap

import { getActiveOffer } from "@/app/actions/offerActions";

export const revalidate = 0; // Dynamic server component: checks DB live on every request

export default async function OfferBanner() {
  const activeOffer = await getActiveOffer();

  if (!activeOffer || !activeOffer.isActive) {
    return null;
  }

  return (
    <aside className="fixed bottom-6 left-6 z-[9999] max-w-sm sm:max-w-md animate-in fade-in slide-in-from-bottom-5 duration-700 hover:scale-105 transition-transform">
      <div className="bg-amber-400/95 backdrop-blur-sm border-2 border-amber-300 shadow-2xl rounded-full px-4 py-2.5 flex items-center gap-2.5 text-green-950">
        <span className="text-base shrink-0 select-none">🎉</span>
        <div className="flex items-center gap-1.5 flex-wrap text-xs sm:text-sm font-semibold leading-tight">
          <span>{activeOffer.title}</span>
          <span className="text-[11px] font-normal text-green-900/80 hidden sm:inline">
            — Use code:
          </span>
          <span className="bg-green-900 text-amber-400 px-2.5 py-1 rounded-md font-mono font-bold tracking-wide text-xs shadow-xs ml-1">
            {activeOffer.code}
          </span>
        </div>
      </div>
    </aside>
  );
}
