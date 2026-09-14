// app/admin/page.tsx — Secure Admin Dashboard (Orders & Offers)

import { getAllOrders, getKitchenStatus, getAutoReviewRequestStatus } from "@/app/actions/adminActions";
import { getOffers } from "@/app/actions/offerActions";
import AdminDashboardClient from "./AdminDashboardClient";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const initialOrders = await getAllOrders();
  const initialOffers = await getOffers();
  const initialKitchenClosed = await getKitchenStatus();
  const initialAutoReviewRequest = await getAutoReviewRequestStatus();

  return (
    <AdminDashboardClient
      initialOrders={initialOrders}
      initialOffers={initialOffers}
      initialKitchenClosed={initialKitchenClosed}
      initialAutoReviewRequest={initialAutoReviewRequest}
    />
  );
}

