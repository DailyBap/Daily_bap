// components/HolidayBanner.tsx — Announcement banner shown when kitchen is closed for holidays

import { getKitchenStatus } from "@/app/actions/adminActions";

export const revalidate = 0;

export default async function HolidayBanner() {
  const isClosed = await getKitchenStatus();

  if (!isClosed) return null;

  return (
    <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 text-white text-xs sm:text-sm font-semibold py-2.5 px-4 text-center shadow-md flex items-center justify-center gap-2">
      <span className="shrink-0 text-base">🏖️</span>
      <span>
        <strong>Kitchen Closed Notice:</strong> We are currently closed today for holidays! Pre-orders are open for tomorrow&apos;s fresh deliveries. 🍱
      </span>
    </div>
  );
}
