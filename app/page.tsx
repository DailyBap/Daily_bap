import HomePageClient from "@/components/HomePageClient";
import { getClosureInfo, ClosureInfo } from "@/lib/storeStatus";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let closureInfo: ClosureInfo | null = null;
  try {
    closureInfo = await getClosureInfo();
  } catch (error) {
    console.error("[HomePage] Failed to fetch closure info:", error);
  }

  return (
    <main>
      <HomePageClient closureInfo={closureInfo} />
    </main>
  );
}
