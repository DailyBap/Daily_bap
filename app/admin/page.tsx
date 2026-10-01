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
  const initialOrders = isAuthenticated ? await getAllOrders() : [];
  const initialOffers = isAuthenticated ? await getOffers() : [];
  const initialKitchenClosed = await getKitchenStatus();
  const initialAutoReviewRequest = await getAutoReviewRequestStatus();

  return (
    <AdminDashboardClient
      isAuthenticated={isAuthenticated}
      initialOrders={initialOrders}
      initialOffers={initialOffers}
      initialKitchenClosed={initialKitchenClosed}
      initialAutoReviewRequest={initialAutoReviewRequest}
    />
  );
}


