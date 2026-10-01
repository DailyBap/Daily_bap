// app/admin/page.tsx — Secure Admin Dashboard (Orders, Offers & Influencers)

import {
  getAllOrders,
  getKitchenStatus,
  getAutoReviewRequestStatus,
  checkAdminSessionAction,
} from "@/app/actions/adminActions";
import { getOffers } from "@/app/actions/offerActions";
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
        initialKitchenClosed={false}
        initialAutoReviewRequest={true}
      />
    );
  }

  const [initialOrders, initialOffers, initialKitchenClosed, initialAutoReviewRequest] =
    await Promise.all([
      getAllOrders(),
      getOffers(),
      getKitchenStatus(),
      getAutoReviewRequestStatus(),
    ]);

  return (
    <AdminDashboardClient
      isAuthenticated={true}
      initialOrders={initialOrders}
      initialOffers={initialOffers}
      initialKitchenClosed={initialKitchenClosed}
      initialAutoReviewRequest={initialAutoReviewRequest}
    />
  );
}



