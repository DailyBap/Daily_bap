"use client";

// components/HolidayBanner.tsx — Announcement banner shown when kitchen has an active or scheduled closure
import { usePathname } from "next/navigation";
import {
  todayIST,
  formatDisplayDateIST,
  diffDaysIST,
  type ClosureInfo,
} from "@/lib/dateUtils";

interface HolidayBannerProps {
  closureInfo: ClosureInfo | null;
}

export default function HolidayBanner({ closureInfo }: HolidayBannerProps) {
  const pathname = usePathname();

  // Hide on admin routes
  if (pathname?.startsWith("/admin")) {
    return null;
  }

  // Hide if no active closure
  if (!closureInfo || !closureInfo.active) {
    return null;
  }

  const today = todayIST();
  const { start, end, reopenDate, message } = closureInfo;

  // Hide if closure has already expired
  if (diffDaysIST(today, end) < 0) {
    return null;
  }

  const isCurrentlyClosed = diffDaysIST(start, today) >= 0 && diffDaysIST(today, end) >= 0;
  const isFutureClosure = diffDaysIST(today, start) > 0;

  let bannerText = "";

  if (isCurrentlyClosed) {
    if (start === end) {
      bannerText = `Our kitchen is closed today (${formatDisplayDateIST(start)}). Pre-orders for ${formatDisplayDateIST(reopenDate)} onward are open.`;
    } else {
      bannerText = `Our kitchen is closed from ${formatDisplayDateIST(start)} to ${formatDisplayDateIST(end)}. Pre-orders for ${formatDisplayDateIST(reopenDate)} onward are open.`;
    }
  } else if (isFutureClosure) {
    if (start === end) {
      bannerText = `Kitchen will be closed on ${formatDisplayDateIST(start)}. Orders for that date are unavailable.`;
    } else {
      bannerText = `Kitchen will be closed from ${formatDisplayDateIST(start)} to ${formatDisplayDateIST(end)}. Orders for those dates are unavailable.`;
    }
  } else {
    return null;
  }

  if (message) {
    bannerText += ` (${message})`;
  }

  return (
    <aside
      aria-label="Holiday notice"
      className="bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 text-white text-xs sm:text-sm font-semibold py-2.5 px-4 text-center shadow-md flex items-center justify-center gap-2"
    >
      <span className="shrink-0 text-base" aria-hidden="true">
        🏖️
      </span>
      <span>
        <strong>Kitchen Notice:</strong> {bannerText} 🍱
      </span>
    </aside>
  );
}
