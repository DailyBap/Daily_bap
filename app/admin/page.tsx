// app/admin/page.tsx — Secure Admin Dashboard (Orders, Offers & Influencers)

import {
  getAllOrders,
  getAutoReviewRequestStatus,
  checkAdminSessionAction,
} from "@/app/actions/adminActions";
import { getOffers } from "@/app/actions/offerActions";
import { getInfluencersAction } from "@/app/actions/influencerActions";
import { getSalesStatsAction } from "@/app/actions/salesActions";
import { getClosureInfo } from "@/lib/storeStatus";
import AdminDashboardClient from "./AdminDashboardClient";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const isAuthenticated = await checkAdminSessionAction();

  // If not authenticated, return immediately WITHOUT querying orders, offers, or settings
  if (!isAuthenticated) {
    return (
      <AdminDashboardClient
        isAuthenticated={false}
        initialOrders={[]}
        initialOffers={[]}
        initialInfluencers={[]}
        initialSalesStats={null}
        initialClosureInfo={null}
        initialKitchenClosed={false}
        initialAutoReviewRequest={true}
      />
    );
  }

  const [
    initialOrders,
    initialOffers,
    initialClosureInfo,
    initialAutoReviewRequest,
    initialInfluencers,
    initialSalesStats,
  ] = await Promise.all([
    getAllOrders(),
    getOffers(),
    getClosureInfo().catch(() => null),
    getAutoReviewRequestStatus(),
    getInfluencersAction(),
    getSalesStatsAction(),
  ]);

  return (
    <AdminDashboardClient
      isAuthenticated={true}
      initialOrders={initialOrders}
      initialOffers={initialOffers}
      initialInfluencers={initialInfluencers}
      initialSalesStats={initialSalesStats}
      initialClosureInfo={initialClosureInfo}
      initialKitchenClosed={initialClosureInfo !== null}
      initialAutoReviewRequest={initialAutoReviewRequest}
    />
  );
}
