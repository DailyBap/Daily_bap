// app/hunt/page.tsx — Customer-facing Treasure Hunt Map

import { notFound } from "next/navigation";
import { isHuntEnabled } from "@/lib/pricing";
import HuntPageClient from "@/components/hunt/HuntPageClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Treasure Hunt — Daily Bap Guwahati",
  description: "Find secret QR codes across Guwahati to unlock free meals and exclusive discounts from Daily Bap!",
};

export default async function HuntPage() {
  const enabled = await isHuntEnabled();
  if (!enabled) {
    notFound();
  }

  return <HuntPageClient />;
}
