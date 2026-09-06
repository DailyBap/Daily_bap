// app/admin/page.tsx — Secure Admin Dashboard (Orders & Offers)

import { getAllOrders, getAllOffers } from "@/app/actions/adminActions";
import AdminDashboardClient from "./AdminDashboardClient";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const initialOrders = await getAllOrders();
  const initialOffers = await getAllOffers();

  return (
    <AdminDashboardClient
      initialOrders={initialOrders}
      initialOffers={initialOffers}
    />
  );
}
