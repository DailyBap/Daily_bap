// app/admin/page.tsx — Secure Admin Dashboard (Orders, Offers & Influencers)

import {
  getAllOrders,
  getAutoReviewRequestStatus,
  getAdminSessionStateAction,
} from "@/app/actions/adminActions";
import { getOffers } from "@/app/actions/offerActions";
import { getInfluencersAction } from "@/app/actions/influencerActions";
import { getSalesStatsAction } from "@/app/actions/salesActions";
import { getClosureInfo } from "@/lib/storeStatus";
import type { ClosureInfo } from "@/lib/dateUtils";
import AdminDashboardClient from "./AdminDashboardClient";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const sessionState = await getAdminSessionStateAction();

  // If not authenticated, return immediately WITHOUT querying orders, offers, or settings
  if (!sessionState.authenticated) {
    return (
      <AdminDashboardClient
        isAuthenticated={false}
        isSessionExpired={sessionState.expired}
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

  let initialClosureInfo: ClosureInfo | null = null;
  try {
    initialClosureInfo = await getClosureInfo();
  } catch (error) {
    console.error("[AdminPage] Error reading closure info:", error);
    initialClosureInfo = null;
  }

  const [
    ordersResult,
    initialOffers,
    initialAutoReviewRequest,
    initialInfluencers,
    initialSalesStats,
  ] = await Promise.all([
    getAllOrders(),
    getOffers(),
    getAutoReviewRequestStatus(),
    getInfluencersAction(),
    getSalesStatsAction(),
  ]);

  if (!ordersResult.authenticated) {
    return (
      <AdminDashboardClient
        isAuthenticated={false}
        isSessionExpired={true}
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

  return (
    <AdminDashboardClient
      isAuthenticated={true}
      isSessionExpired={false}
      initialOrders={ordersResult.orders}
      initialOffers={initialOffers}
      initialInfluencers={initialInfluencers}
      initialSalesStats={initialSalesStats}
      initialClosureInfo={initialClosureInfo}
      initialKitchenClosed={initialClosureInfo !== null}
      initialAutoReviewRequest={initialAutoReviewRequest}
    />
  );
}
