import OfferBanner from "@/components/OfferBanner";
import HomePageClient from "@/components/HomePageClient";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <main>
      <OfferBanner />
      <HomePageClient />
    </main>
  );
}
