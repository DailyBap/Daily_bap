// components/OfferBanner.tsx — Dismissible Server/Client Announcement Banner for Daily Bap

import { getActiveOffer } from "@/app/actions/offerActions";
import OfferBannerClient from "@/components/OfferBannerClient";

export const revalidate = 0; // Dynamic server component: checks DB live on every request

export default async function OfferBanner() {
  const activeOffer = await getActiveOffer();

  if (!activeOffer || !activeOffer.isActive) {
    return null;
  }

  return (
    <OfferBannerClient
      title={activeOffer.title}
      code={activeOffer.code}
    />
  );
}
