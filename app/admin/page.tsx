// app/admin/page.tsx — Secure Admin Dashboard (Orders & Offers)

import { getAllOrders } from "@/app/actions/adminActions";
import { getOffers, createOffer, toggleOffer } from "@/app/actions/offerActions";
import AdminDashboardClient from "./AdminDashboardClient";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const initialOrders = await getAllOrders();
  const initialOffers = await getOffers();

  return (
    <AdminDashboardClient
      initialOrders={initialOrders}
      initialOffers={initialOffers}
    />
  );
}
