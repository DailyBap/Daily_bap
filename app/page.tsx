import OfferBanner from "@/components/OfferBanner";
import HolidayBanner from "@/components/HolidayBanner";
import HomePageClient from "@/components/HomePageClient";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <main>
      <HolidayBanner />
      <OfferBanner />
      <HomePageClient />
    </main>
  );
}
