"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import {
  updateOrderStatus,
  toggleKitchenStatus,
  toggleAutoReviewRequest,
  loginAdminAction,
  logoutAdminAction,
  OrderStatus,
} from "@/app/actions/adminActions";
import { createOffer, toggleOffer, updateOffer } from "@/app/actions/offerActions";
import {
  getInfluencersAction,
  createInfluencerAction,
  updateInfluencerAction,
  toggleInfluencerStatusAction,
  deleteInfluencerAction,
  markOrderCommissionPaidAction,
  markMonthlyCommissionPaidAction,
  InfluencerWithStats,
} from "@/app/actions/influencerActions";
import {
  getSalesStatsAction,
  SalesReportStats,
} from "@/app/actions/salesActions";
import {
  importInfluencersAction,
  ImportResult,
} from "@/app/actions/influencerImportActions";
import {
  ShoppingBag,
  Tag,
  Clock,
  Phone,
  MapPin,
  MessageCircle,
  Plus,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Edit,
  Check,
  X,
  Star,
  Lock,
  LogOut,
  KeyRound,
  Loader2,
  Users,
  BarChart3,
  TrendingUp,
  DollarSign,
  Calendar,
  Sparkles,
  ChevronRight,
  UserCheck,
  UserX,
  CreditCard,
  Percent,
  Download,
  Upload,
  FileSpreadsheet,
  FileWarning,
  Trash2,
} from "lucide-react";

interface OrderItem {
  name?: string;
  quantity?: number;
  price?: number;
  summary?: string;
}

interface OrderRecord {
  id: string;
  orderNumber?: string | null;
  status: OrderStatus;
  totalAmount: number;
  deliveryFee: number;
  deliveryAddress: string;
  requestedDeliveryTime: Date | string | null;
  deliverySlotLabel: string | null;
  items: unknown;
  couponCode?: string | null;
  discountAmount?: number | null;
  commissionAmount?: number | null;
  commissionPaid?: boolean | null;
  commissionPaidAt?: Date | string | null;
  createdAt: Date | string;
  userName?: string | null;
  userPhone?: string | null;
}

interface OfferRecord {
  id: string;
  title: string;
  code: string;
  isActive: boolean;
  createdAt: Date | string;
}

interface AdminDashboardClientProps {
  isAuthenticated: boolean;
  initialOrders: OrderRecord[];
  initialOffers: OfferRecord[];
  initialInfluencers?: InfluencerWithStats[];
  initialSalesStats?: SalesReportStats | null;
  initialKitchenClosed?: boolean;
  initialAutoReviewRequest?: boolean;
}

const STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: "draft", label: "Draft (Awaiting WhatsApp)" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "preparing", label: "Preparing" },
  { value: "out_for_delivery", label: "Out for Delivery" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

export default function AdminDashboardClient({
  isAuthenticated: initialAuthStatus,
  initialOrders,
  initialOffers,
  initialInfluencers = [],
  initialSalesStats = null,
  initialKitchenClosed = false,
  initialAutoReviewRequest = true,
}: AdminDashboardClientProps) {
  const [authed, setAuthed] = useState<boolean>(initialAuthStatus);
  const [passwordInput, setPasswordInput] = useState("");
  const [loginError, setLoginError] = useState("");

  const [activeTab, setActiveTab] = useState<"orders" | "creators" | "analytics" | "offers">("orders");

  // Orders State
  const [ordersList, setOrdersList] = useState<OrderRecord[]>(initialOrders);
  const [offersList, setOffersList] = useState<OfferRecord[]>(initialOffers);
  const [influencersList, setInfluencersList] = useState<InfluencerWithStats[]>(initialInfluencers);
  const [salesStats, setSalesStats] = useState<SalesReportStats | null>(initialSalesStats);

  const [isKitchenClosed, setIsKitchenClosed] = useState<boolean>(initialKitchenClosed);
  const [isAutoReviewActive, setIsAutoReviewActive] = useState<boolean>(initialAutoReviewRequest);

  // Month selector for analytics (YYYY-MM)
  const nowIST = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const currentMonthStr = `${nowIST.getFullYear()}-${String(nowIST.getMonth() + 1).padStart(2, "0")}`;
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);

  // New Creator Form State
  const [isAddCreatorOpen, setIsAddCreatorOpen] = useState(false);
  const [creatorName, setCreatorName] = useState("");
  const [creatorCode, setCreatorCode] = useState("");
  const [creatorHandle, setCreatorHandle] = useState("");
  const [creatorUpi, setCreatorUpi] = useState("");
  const [creatorDiscount, setCreatorDiscount] = useState<number>(10);
  const [creatorCommission, setCreatorCommission] = useState<number>(10);
  const [creatorNotes, setCreatorNotes] = useState("");
  const [creatorFormError, setCreatorFormError] = useState("");
  const [creatorFormSuccess, setCreatorFormSuccess] = useState("");

  // Edit Creator Modal State
  const [editingCreator, setEditingCreator] = useState<InfluencerWithStats | null>(null);
  const [editName, setEditName] = useState("");
  const [editHandle, setEditHandle] = useState("");
  const [editUpi, setEditUpi] = useState("");
  const [editDiscount, setEditDiscount] = useState<number>(10);
  const [editCommission, setEditCommission] = useState<number>(10);
  const [editNotes, setEditNotes] = useState("");
  const [editError, setEditError] = useState("");

  // Monthly Payout Modal State
  const [payoutModalCreator, setPayoutModalCreator] = useState<InfluencerWithStats | null>(null);
  const [payoutMonth, setPayoutMonth] = useState<string>(currentMonthStr);
  const [payoutError, setPayoutError] = useState("");

  // Delete Creator Modal State (Task 2)
  const [deletingCreator, setDeletingCreator] = useState<InfluencerWithStats | null>(null);
  const [deleteError, setDeleteError] = useState("");

  // Import Modal State
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);

  // New offer form state
  const [newTitle, setNewTitle] = useState("");
  const [newCode, setNewCode] = useState("");
  const [offerError, setOfferError] = useState("");
  const [offerSuccess, setOfferSuccess] = useState("");

  const [isPending, startTransition] = useTransition();

  // Bulletproof currency formatter preventing any NaN display (Task 4)
  const formatINR = (val: number | null | undefined): string => {
    const num = Number(val);
    if (isNaN(num) || num === null || num === undefined) return "₹0";
    return `₹${num.toLocaleString("en-IN")}`;
  };

  // Login Handler
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    startTransition(async () => {
      const res = await loginAdminAction(passwordInput);
      if (res.success) {
        setAuthed(true);
        window.location.reload();
      } else {
        setLoginError(res.error || "Invalid password");
      }
    });
  };

  const handleLogout = () => {
    startTransition(async () => {
      await logoutAdminAction();
      setAuthed(false);
      window.location.reload();
    });
  };

  // Fetch updated influencers list
  const refreshInfluencers = () => {
    startTransition(async () => {
      const updated = await getInfluencersAction();
      setInfluencersList(updated);
    });
  };

  // Fetch updated sales stats
  const refreshSalesStats = (month: string) => {
    startTransition(async () => {
      const updated = await getSalesStatsAction(month);
      setSalesStats(updated);
    });
  };

  useEffect(() => {
    if (authed && activeTab === "analytics") {
      refreshSalesStats(selectedMonth);
    }
  }, [selectedMonth, activeTab, authed]);

  if (!authed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-gray-200 p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-brand-primary/10 text-brand-primary rounded-2xl flex items-center justify-center mx-auto">
              <Lock size={28} />
            </div>
            <h1 className="font-display font-bold text-2xl text-brand-primary">
              Daily Bap Admin Access
            </h1>
            <p className="text-xs text-gray-500">
              Enter admin password to access kitchen management, orders & creator analytics.
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-700">
                Admin Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  placeholder="Enter password..."
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-primary font-mono pr-10"
                  autoFocus
                />
                <KeyRound className="w-4 h-4 text-gray-400 absolute right-3 top-3.5" />
              </div>
            </div>

            {loginError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-1.5 font-medium">
                <AlertCircle size={14} className="shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isPending || !passwordInput}
              className="w-full flex items-center justify-center gap-2 bg-brand-primary hover:bg-brand-accent disabled:bg-gray-200 text-white font-bold py-3.5 rounded-xl text-sm transition shadow-md"
            >
              {isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Authenticating…
                </>
              ) : (
                "Unlock Dashboard"
              )}
            </button>
          </form>

          <p className="text-center text-[10px] text-gray-400">
            Protected by server-side httpOnly session cookie & rate limiting.
          </p>
        </div>
      </div>
    );
  }

  // Handle status update for orders
  const handleStatusChange = (orderId: string, newStatus: OrderStatus) => {
    setOrdersList((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );

    startTransition(async () => {
      await updateOrderStatus(orderId, newStatus);
    });
  };

  // Toggle order commission paid status
  const handleToggleOrderCommissionPaid = (orderId: string, currentPaid: boolean) => {
    const nextPaid = !currentPaid;
    setOrdersList((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              commissionPaid: nextPaid,
              commissionPaidAt: nextPaid ? new Date() : null,
            }
          : o
      )
    );

    startTransition(async () => {
      await markOrderCommissionPaidAction(orderId, nextPaid);
      refreshInfluencers();
    });
  };

  // Handle create creator
  const handleCreateCreatorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCreatorFormError("");
    setCreatorFormSuccess("");

    if (!creatorName.trim() || !creatorCode.trim()) {
      setCreatorFormError("Creator Name and Coupon Code are required.");
      return;
    }

    startTransition(async () => {
      const res = await createInfluencerAction({
        name: creatorName,
        code: creatorCode,
        instagramHandle: creatorHandle,
        phoneOrUpi: creatorUpi,
        discountPercent: Number(creatorDiscount),
        commissionPercent: Number(creatorCommission),
        notes: creatorNotes,
      });

      if (res.success) {
        setCreatorFormSuccess(`Creator ${creatorCode.toUpperCase()} created successfully!`);
        setCreatorName("");
        setCreatorCode("");
        setCreatorHandle("");
        setCreatorUpi("");
        setCreatorDiscount(10);
        setCreatorCommission(10);
        setCreatorNotes("");
        setIsAddCreatorOpen(false);
        refreshInfluencers();
      } else {
        setCreatorFormError(res.error || "Failed to create creator.");
      }
    });
  };

  // Start editing creator
  const handleOpenEditCreator = (inf: InfluencerWithStats) => {
    setEditingCreator(inf);
    setEditName(inf.name);
    setEditHandle(inf.instagramHandle || "");
    setEditUpi(inf.phoneOrUpi || "");
    setEditDiscount(inf.discountPercent);
    setEditCommission(inf.commissionPercent);
    setEditNotes(inf.notes || "");
    setEditError("");
  };

  // Save creator edit
  const handleSaveEditCreator = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCreator) return;
    setEditError("");

    startTransition(async () => {
      const res = await updateInfluencerAction(editingCreator.id, {
        name: editName,
        instagramHandle: editHandle,
        phoneOrUpi: editUpi,
        discountPercent: Number(editDiscount),
        commissionPercent: Number(editCommission),
        notes: editNotes,
      });

      if (res.success) {
        setEditingCreator(null);
        refreshInfluencers();
      } else {
        setEditError(res.error || "Failed to update creator.");
      }
    });
  };

  // Toggle creator status (active/paused)
  const handleToggleCreatorStatus = (inf: InfluencerWithStats) => {
    const nextStatus = !inf.isActive;
    setInfluencersList((prev) =>
      prev.map((item) => (item.id === inf.id ? { ...item, isActive: nextStatus } : item))
    );

    startTransition(async () => {
      await toggleInfluencerStatusAction(inf.id, nextStatus);
    });
  };

  // Submit monthly payout mark
  const handleMonthlyPayoutSubmit = (paidStatus: boolean) => {
    if (!payoutModalCreator) return;
    setPayoutError("");

    startTransition(async () => {
      const res = await markMonthlyCommissionPaidAction(
        payoutModalCreator.id,
        payoutMonth,
        paidStatus
      );

      if (res.success) {
        setPayoutModalCreator(null);
        refreshInfluencers();
        if (activeTab === "analytics") {
          refreshSalesStats(selectedMonth);
        }
      } else {
        setPayoutError(res.error || "Failed to update monthly payout.");
      }
    });
  };

  // Permanently Delete Creator Handler (Task 2)
  const handleDeleteCreatorSubmit = () => {
    if (!deletingCreator) return;
    const targetId = deletingCreator.id;
    setDeleteError("");

    // Optimistically remove from state so the UI updates instantly
    setInfluencersList((prev) => prev.filter((item) => item.id !== targetId));
    setDeletingCreator(null);

    startTransition(async () => {
      const res = await deleteInfluencerAction(targetId);
      if (!res.success) {
        setDeleteError(res.error || "Failed to delete creator.");
        refreshInfluencers();
      } else {
        refreshInfluencers();
        if (activeTab === "analytics") {
          refreshSalesStats(selectedMonth);
        }
      }
    });
  };

  // Create Offer Handler
  const handleCreateOffer = (e: React.FormEvent) => {
    e.preventDefault();
    setOfferError("");
    setOfferSuccess("");

    if (!newTitle.trim() || !newCode.trim()) {
      setOfferError("Title and promo code are required.");
      return;
    }

    startTransition(async () => {
      const res = await createOffer({ title: newTitle, code: newCode });
      if (res.success) {
        setOfferSuccess("Offer created successfully!");
        setOffersList((prev) => [
          {
            id: Math.random().toString(),
            title: newTitle.trim(),
            code: newCode.trim().toUpperCase(),
            isActive: false,
            createdAt: new Date(),
          },
          ...prev,
        ]);
        setNewTitle("");
        setNewCode("");
      } else {
        setOfferError(res.error || "Failed to create offer.");
      }
    });
  };

  // Offer Edit & Toggle handlers
  const [editingOfferId, setEditingOfferId] = useState<string | null>(null);
  const [editOfferTitle, setEditOfferTitle] = useState("");
  const [editOfferCode, setEditOfferCode] = useState("");

  const startEditingOffer = (offer: OfferRecord) => {
    setEditingOfferId(offer.id);
    setEditOfferTitle(offer.title);
    setEditOfferCode(offer.code);
  };

  const handleSaveOfferEdit = (offerId: string) => {
    if (!editOfferTitle.trim() || !editOfferCode.trim()) return;

    const trimmedTitle = editOfferTitle.trim();
    const trimmedCode = editOfferCode.trim().toUpperCase();

    setOffersList((prev) =>
      prev.map((off) =>
        off.id === offerId
          ? { ...off, title: trimmedTitle, code: trimmedCode }
          : off
      )
    );
    setEditingOfferId(null);

    startTransition(async () => {
      await updateOffer(offerId, trimmedTitle, trimmedCode);
    });
  };

  const handleToggleOffer = (offerId: string, currentActive: boolean) => {
    const nextActive = !currentActive;
    setOffersList((prev) =>
      prev.map((off) => {
        if (off.id === offerId) return { ...off, isActive: nextActive };
        return nextActive ? { ...off, isActive: false } : off;
      })
    );

    startTransition(async () => {
      await toggleOffer(offerId, nextActive);
    });
  };

  const handleToggleKitchenStatus = () => {
    const nextState = !isKitchenClosed;
    setIsKitchenClosed(nextState);
    startTransition(async () => {
      await toggleKitchenStatus(nextState);
    });
  };

  const handleToggleAutoReview = () => {
    const nextState = !isAutoReviewActive;
    setIsAutoReviewActive(nextState);
    startTransition(async () => {
      await toggleAutoReviewRequest(nextState);
    });
  };

  return (
    <div className="min-h-screen bg-gray-50/50 font-sans p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Top Main Header */}
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-brand-primary text-white p-6 rounded-3xl shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-brand-accent" />
            <h1 className="font-display font-bold text-2xl">Daily Bap Admin</h1>
          </div>
          <p className="text-xs text-white/70">
            Kitchen Management, Creator Coupons & IST Sales Analytics
          </p>
        </div>

        <button
          onClick={handleLogout}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-4 py-2 rounded-xl transition border border-white/20 shrink-0 self-start sm:self-auto"
        >
          <LogOut size={14} />
          <span>Logout</span>
        </button>
      </div>

      <div className="max-w-7xl mx-auto space-y-8">
        {/* OPERATIONAL STATUS & AUTO REVIEW TOGGLES */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Kitchen Status */}
          <section className="bg-white rounded-3xl border border-gray-200/80 shadow-xs p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-4 min-w-0 flex-1">
              <div
                className={`p-3.5 rounded-2xl shrink-0 transition-colors ${
                  isKitchenClosed
                    ? "bg-rose-100 text-rose-700"
                    : "bg-emerald-100 text-emerald-700"
                }`}
              >
                {isKitchenClosed ? (
                  <AlertCircle className="w-6 h-6" />
                ) : (
                  <CheckCircle2 className="w-6 h-6" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-display font-bold text-base text-gray-900 whitespace-normal break-words">
                    Kitchen Status:{" "}
                    <span
                      className={
                        isKitchenClosed ? "text-rose-600" : "text-emerald-700"
                      }
                    >
                      {isKitchenClosed ? "CLOSED" : "OPEN"}
                    </span>
                  </h2>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                      isKitchenClosed
                        ? "bg-rose-100 text-rose-800 border border-rose-200"
                        : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                    }`}
                  >
                    {isKitchenClosed ? "Holiday Mode" : "Normal Hours"}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1 whitespace-normal break-words">
                  {isKitchenClosed
                    ? "Same-day ordering is disabled on the website."
                    : "Kitchen accepting orders for Today & Tomorrow."}
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={isPending}
              onClick={handleToggleKitchenStatus}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs transition shadow-xs flex items-center justify-center gap-2 shrink-0 self-start sm:self-auto ${
                isKitchenClosed
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-rose-600 hover:bg-rose-700 text-white"
              } ${isPending ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              {isKitchenClosed ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Turn OPEN
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4" />
                  Holiday Mode
                </>
              )}
            </button>
          </section>

          {/* Review Ping (Task 3: Fixed Overflow & Wrapping) */}
          <section className="bg-white rounded-3xl border border-gray-200/80 shadow-xs p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-4 min-w-0 flex-1">
              <div
                className={`p-3.5 rounded-2xl shrink-0 transition-colors ${
                  isAutoReviewActive
                    ? "bg-amber-100 text-amber-700"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                <Star className="w-6 h-6 fill-current text-amber-500" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-display font-bold text-base text-gray-900 whitespace-normal break-words">
                    Post-Delivery Review Ping:{" "}
                    <span
                      className={
                        isAutoReviewActive ? "text-amber-600" : "text-gray-500"
                      }
                    >
                      {isAutoReviewActive ? "ACTIVE" : "DISABLED"}
                    </span>
                  </h2>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                      isAutoReviewActive
                        ? "bg-amber-100 text-amber-800 border border-amber-200"
                        : "bg-gray-100 text-gray-600 border border-gray-200"
                    }`}
                  >
                    {isAutoReviewActive ? "Auto Trigger On" : "Manual Only"}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1 whitespace-normal break-words">
                  Sends Google Review link upon order completion (`delivered`).
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={isPending}
              onClick={handleToggleAutoReview}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs transition shadow-xs flex items-center justify-center gap-2 shrink-0 self-start sm:self-auto ${
                isAutoReviewActive
                  ? "bg-amber-500 hover:bg-amber-600 text-white"
                  : "bg-gray-700 hover:bg-gray-800 text-white"
              } ${isPending ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              <Star className="w-4 h-4" />
              {isAutoReviewActive ? "Disable Ping" : "Enable Ping"}
            </button>
          </section>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex items-center gap-2 border-b border-gray-200 pb-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab("orders")}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm transition whitespace-nowrap ${
              activeTab === "orders"
                ? "bg-brand-primary text-white shadow-sm"
                : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Orders Queue</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              activeTab === "orders" ? "bg-white/20 text-white" : "bg-gray-100 text-gray-700"
            }`}>
              {ordersList.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab("creators");
              refreshInfluencers();
            }}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm transition whitespace-nowrap ${
              activeTab === "creators"
                ? "bg-brand-primary text-white shadow-sm"
                : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Creator Coupons</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              activeTab === "creators" ? "bg-white/20 text-white" : "bg-gray-100 text-gray-700"
            }`}>
              {influencersList.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab("analytics");
              refreshSalesStats(selectedMonth);
            }}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm transition whitespace-nowrap ${
              activeTab === "analytics"
                ? "bg-brand-primary text-white shadow-sm"
                : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Sales Analytics</span>
          </button>

          <button
            onClick={() => setActiveTab("offers")}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm transition whitespace-nowrap ${
              activeTab === "offers"
                ? "bg-brand-primary text-white shadow-sm"
                : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>Offers Banner</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              activeTab === "offers" ? "bg-white/20 text-white" : "bg-gray-100 text-gray-700"
            }`}>
              {offersList.length}
            </span>
          </button>
        </div>

        {/* TAB 1: ORDERS QUEUE */}
        {activeTab === "orders" && (
          <section className="bg-white rounded-3xl border border-gray-200/80 shadow-xs overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-brand-primary" />
                <h2 className="font-display font-bold text-xl text-brand-primary">
                  Customer Orders ({ordersList.length})
                </h2>
              </div>
            </div>

            {ordersList.length === 0 ? (
              <div className="p-12 text-center text-gray-400 space-y-2">
                <ShoppingBag className="w-10 h-10 mx-auto text-gray-300" />
                <p className="font-medium text-sm">No orders recorded yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-700">
                  <thead className="bg-gray-50 border-b border-gray-100 uppercase text-[10px] font-bold text-gray-500 tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Order No</th>
                      <th className="px-6 py-4">Customer Details</th>
                      <th className="px-6 py-4">Delivery Slot</th>
                      <th className="px-6 py-4">Order Items</th>
                      <th className="px-6 py-4">Coupon & Discount</th>
                      <th className="px-6 py-4">Total</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">WhatsApp Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {ordersList.map((order) => {
                      const isDraft = order.status === "draft";
                      const displayOrderNo =
                        order.orderNumber || `BAP-${order.id.slice(0, 5).toUpperCase()}`;
                      const rawPhone = order.userPhone?.replace(/\D/g, "") || "";
                      const cleanPhone = rawPhone.length === 10 ? rawPhone : rawPhone.slice(-10);
                      const name = order.userName || "Customer";
                      const itemsArray = (Array.isArray(order.items) ? order.items : []) as OrderItem[];

                      const prepMsg = encodeURIComponent(
                        `Hey ${name}! We've started preparing your order (${displayOrderNo}). 🍳`
                      );
                      const deliveryMsg = encodeURIComponent(
                        `Great news! Your order (${displayOrderNo}) is out for delivery! 🛵`
                      );
                      const reviewMsg = encodeURIComponent(
                        `Hey ${name}! Thank you for ordering from Daily Bap 🍱 We hope you enjoyed your meal! Could you take a moment to leave us a Google review? It helps us immensely: https://g.page/r/CeKt9rDETbXDEBM/review`
                      );

                      const prepLink = `https://wa.me/91${cleanPhone}?text=${prepMsg}`;
                      const deliveryLink = `https://wa.me/91${cleanPhone}?text=${deliveryMsg}`;
                      const reviewLink = `https://wa.me/91${cleanPhone}?text=${reviewMsg}`;

                      return (
                        <tr
                          key={order.id}
                          className={`transition ${
                            isDraft
                              ? "bg-amber-50/70 border-l-4 border-l-amber-500 hover:bg-amber-100/60"
                              : "hover:bg-gray-50/50"
                          }`}
                        >
                          {/* Order Number */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col gap-1">
                              <span className="font-mono font-bold text-sm text-brand-primary bg-brand-primary/10 px-2.5 py-1 rounded-lg w-fit">
                                {displayOrderNo}
                              </span>
                              {isDraft && (
                                <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-md w-fit">
                                  Draft (Awaiting WhatsApp)
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Customer */}
                          <td className="px-6 py-4">
                            <div className="space-y-0.5">
                              <p className="font-bold text-gray-900 text-sm">{name}</p>
                              <p className="text-gray-500 flex items-center gap-1 font-mono">
                                <Phone className="w-3 h-3 text-gray-400" /> +91 {cleanPhone}
                              </p>
                              <p className="text-gray-400 text-[11px] line-clamp-1 flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                                <span>{order.deliveryAddress}</span>
                              </p>
                            </div>
                          </td>

                          {/* Delivery Slot */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 font-medium bg-amber-50 text-amber-900 border border-amber-200 px-2.5 py-1 rounded-full text-[11px]">
                              <Clock className="w-3 h-3 text-amber-600" />
                              {order.deliverySlotLabel || "ASAP"}
                            </span>
                          </td>

                          {/* Items */}
                          <td className="px-6 py-4 max-w-xs">
                            <div className="space-y-0.5">
                              {itemsArray.map((item, idx) => (
                                <p key={idx} className="text-gray-800 text-xs">
                                  • {item.name || item.summary}{" "}
                                  {item.quantity ? `× ${item.quantity}` : ""}
                                </p>
                              ))}
                            </div>
                          </td>

                          {/* Coupon & Discount */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            {order.couponCode ? (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono font-bold text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-md border border-purple-200">
                                    {order.couponCode}
                                  </span>
                                  <span className="text-xs font-bold text-emerald-600">
                                    −₹{order.discountAmount || 0}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-gray-500">
                                    Comm: ₹{order.commissionAmount || 0}
                                  </span>
                                  <button
                                    onClick={() => handleToggleOrderCommissionPaid(order.id, !!order.commissionPaid)}
                                    disabled={isPending}
                                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase transition ${
                                      order.commissionPaid
                                        ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                                        : "bg-amber-100 text-amber-800 hover:bg-amber-200"
                                    }`}
                                  >
                                    {order.commissionPaid ? "Paid" : "Mark Paid"}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs">—</span>
                            )}
                          </td>

                          {/* Total */}
                          <td className="px-6 py-4 whitespace-nowrap font-bold text-brand-primary text-sm">
                            ₹{order.totalAmount}
                          </td>

                          {/* Status Select */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <select
                              value={order.status}
                              onChange={(e) =>
                                handleStatusChange(
                                  order.id,
                                  e.target.value as OrderStatus
                                )
                              }
                              className="bg-white border border-gray-300 font-bold text-xs px-3 py-1.5 rounded-xl shadow-xs focus:outline-none focus:border-brand-primary transition"
                            >
                              {STATUS_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* WhatsApp Actions */}
                          <td className="px-6 py-4 whitespace-nowrap space-x-2">
                            <a
                              href={prepLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2.5 py-1.5 rounded-xl border border-emerald-200 transition"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              Notify Prep 🍳
                            </a>

                            <a
                              href={deliveryLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 px-2.5 py-1.5 rounded-xl border border-blue-200 transition"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              Out for Delivery 🛵
                            </a>

                            <a
                              href={reviewLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 px-2.5 py-1.5 rounded-xl border border-amber-200 transition"
                            >
                              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                              Review Ping ⭐️
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* TAB 2: CREATOR COUPONS */}
        {activeTab === "creators" && (
          <div className="space-y-6">
            {/* Header, Export & Import buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs">
              <div>
                <h2 className="font-display font-bold text-xl text-gray-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  Creator Partners ({influencersList.length})
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Manage influencer promo codes, custom commission rates & monthly payout status.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                {/* Export to Excel */}
                <a
                  href="/api/admin/export/creators"
                  download
                  className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-3 rounded-2xl transition shadow-md"
                >
                  <Download className="w-4 h-4" />
                  Export .xlsx
                </a>

                {/* Import from Excel/CSV */}
                <button
                  onClick={() => { setImportResult(null); setImportFile(null); setIsImportOpen(true); }}
                  className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-3 rounded-2xl transition shadow-md"
                >
                  <Upload className="w-4 h-4" />
                  Import .xlsx / .csv
                </button>

                {/* Add New Creator */}
                <button
                  onClick={() => setIsAddCreatorOpen(true)}
                  className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-4 py-3 rounded-2xl transition shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  Add New Creator
                </button>
              </div>
            </div>

            {/* Creators Grid / List */}
            {influencersList.length === 0 ? (
              <div className="bg-white p-12 text-center text-gray-400 rounded-3xl border border-gray-200/80 space-y-3">
                <Users className="w-12 h-12 mx-auto text-gray-300" />
                <h3 className="font-bold text-base text-gray-700">No Creator Partners Yet</h3>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  Click "Add New Creator" above to set up custom coupon codes with discount and commission percentages.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {influencersList.map((inf) => (
                  <div
                    key={inf.id}
                    className={`bg-white rounded-3xl border p-6 flex flex-col justify-between gap-5 transition shadow-xs ${
                      inf.isActive ? "border-gray-200/90 hover:border-purple-200" : "border-gray-200 bg-gray-50/70"
                    }`}
                  >
                    <div className="space-y-4">
                      {/* Title & Status */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-base text-gray-900">{inf.name}</h3>
                            <button
                              onClick={() => handleToggleCreatorStatus(inf)}
                              disabled={isPending}
                              className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase transition ${
                                inf.isActive
                                  ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                                  : "bg-rose-100 text-rose-800 hover:bg-rose-200"
                              }`}
                            >
                              {inf.isActive ? "Active" : "Paused"}
                            </button>
                          </div>
                          {inf.instagramHandle && (
                            <p className="text-xs text-purple-600 font-medium">{inf.instagramHandle}</p>
                          )}
                        </div>

                        <span className="font-mono font-bold text-sm bg-purple-50 text-purple-700 px-3 py-1.5 rounded-xl border border-purple-200">
                          {inf.code}
                        </span>
                      </div>

                      {/* Details & Rates */}
                      <div className="grid grid-cols-2 gap-2 text-xs bg-gray-50 p-3 rounded-2xl border border-gray-100">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-gray-400 block">Customer Discount</span>
                          <span className="font-bold text-emerald-700">{inf.discountPercent}% OFF</span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-gray-400 block">Creator Commission</span>
                          <span className="font-bold text-purple-700">{inf.commissionPercent}% EARN</span>
                        </div>
                      </div>

                      {inf.phoneOrUpi && (
                        <p className="text-xs text-gray-600 flex items-center gap-1 font-mono">
                          <CreditCard className="w-3.5 h-3.5 text-gray-400" />
                          <span>{inf.phoneOrUpi}</span>
                        </p>
                      )}

                      {/* Stat Metrics Box */}
                      <div className="space-y-1.5 pt-2 border-t border-gray-100 text-xs">
                        <div className="flex items-center justify-between text-gray-600">
                          <span>Delivered Orders:</span>
                          <span className="font-bold text-gray-900">{inf.totalOrders}</span>
                        </div>
                        <div className="flex items-center justify-between text-gray-600">
                          <span>Sales via Code:</span>
                          <span className="font-bold text-gray-900">₹{inf.totalSales}</span>
                        </div>
                        <div className="flex items-center justify-between text-gray-600">
                          <span>Total Earned Comm:</span>
                          <span className="font-bold text-purple-700">₹{inf.totalCommission}</span>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-gray-100 font-bold">
                          <span className="text-amber-700">Unpaid Payout:</span>
                          <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                            ₹{inf.unpaidCommission}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                      <button
                        onClick={() => handleOpenEditCreator(inf)}
                        className="flex-1 inline-flex items-center justify-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs py-2 px-3 rounded-xl transition"
                      >
                        <Edit className="w-3.5 h-3.5" /> Edit
                      </button>

                      <button
                        onClick={() => {
                          setPayoutModalCreator(inf);
                          setPayoutMonth(currentMonthStr);
                        }}
                        className="flex-1 inline-flex items-center justify-center gap-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-bold text-xs py-2 px-3 rounded-xl transition"
                      >
                        <DollarSign className="w-3.5 h-3.5" /> Payout
                      </button>

                      <button
                        onClick={() => {
                          setDeleteError("");
                          setDeletingCreator(inf);
                        }}
                        className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl transition"
                        title="Delete Creator Coupon"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SALES ANALYTICS */}
        {activeTab === "analytics" && (
          <div className="space-y-6">
            {/* Header & Month Picker */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs">
              <div>
                <h2 className="font-display font-bold text-xl text-gray-900 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-brand-primary" />
                  Sales Performance & Revenue Analytics
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Aggregated in Asia/Kolkata (IST) timezone. Delivered orders only count towards net sales.
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <label className="text-xs font-bold text-gray-500">Month (IST):</label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-gray-50 border border-gray-300 font-mono font-bold text-xs px-3 py-2 rounded-xl outline-none focus:border-brand-primary"
                />
                <button
                  onClick={() => refreshSalesStats(selectedMonth)}
                  disabled={isPending}
                  className="p-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-700 transition"
                  title="Refresh stats"
                >
                  <RefreshCw className={`w-4 h-4 ${isPending ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>

            {salesStats ? (
              <>
                {/* 6 Key Performance Indicator Cards (Task 4: Guaranteed NaN-free formatINR) */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {/* Gross Revenue */}
                  <div className="bg-white p-5 rounded-3xl border border-gray-200/80 shadow-xs space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      Gross Revenue
                    </span>
                    <p className="text-xl font-display font-extrabold text-emerald-700">
                      {formatINR(salesStats.grossRevenue)}
                    </p>
                    <span className="text-[10px] text-gray-400 block">Delivered total</span>
                  </div>

                  {/* Total Orders */}
                  <div className="bg-white p-5 rounded-3xl border border-gray-200/80 shadow-xs space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      Delivered Orders
                    </span>
                    <p className="text-xl font-display font-extrabold text-brand-primary">
                      {salesStats.totalOrdersCount || 0}
                    </p>
                    <span className="text-[10px] text-gray-400 block">Completed count</span>
                  </div>

                  {/* AOV */}
                  <div className="bg-white p-5 rounded-3xl border border-gray-200/80 shadow-xs space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      Avg Order Value
                    </span>
                    <p className="text-xl font-display font-extrabold text-indigo-700">
                      {formatINR(salesStats.averageOrderValue)}
                    </p>
                    <span className="text-[10px] text-gray-400 block">Gross / Delivered</span>
                  </div>

                  {/* Discounts */}
                  <div className="bg-white p-5 rounded-3xl border border-gray-200/80 shadow-xs space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      Total Discounts
                    </span>
                    <p className="text-xl font-display font-extrabold text-amber-700">
                      −{formatINR(salesStats.totalDiscounts)}
                    </p>
                    <span className="text-[10px] text-gray-400 block">Given to buyers</span>
                  </div>

                  {/* Creator Commission */}
                  <div className="bg-white p-5 rounded-3xl border border-gray-200/80 shadow-xs space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      Creator Comm.
                    </span>
                    <p className="text-xl font-display font-extrabold text-purple-700">
                      {formatINR(salesStats.totalCommission)}
                    </p>
                    <span className="text-[10px] text-gray-400 block">Payable to creators</span>
                  </div>

                  {/* Net Revenue */}
                  <div className="bg-white p-5 rounded-3xl border border-emerald-200 bg-emerald-50/30 shadow-xs space-y-1">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                      Net Revenue
                    </span>
                    <p className="text-xl font-display font-extrabold text-emerald-900">
                      {formatINR(salesStats.netRevenue)}
                    </p>
                    <span className="text-[10px] text-emerald-700 block">Gross − Comm</span>
                  </div>
                </div>

                {/* Status Breakdown Bar */}
                <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs space-y-3">
                  <h3 className="font-bold text-sm text-gray-800">Order Status Breakdown ({selectedMonth})</h3>
                  <div className="flex items-center gap-3 flex-wrap text-xs">
                    <span className="bg-emerald-100 text-emerald-800 px-3 py-1.5 rounded-xl font-bold">
                      Delivered: {salesStats.statusBreakdown.delivered}
                    </span>
                    <span className="bg-blue-100 text-blue-800 px-3 py-1.5 rounded-xl font-bold">
                      Out for Delivery: {salesStats.statusBreakdown.out_for_delivery}
                    </span>
                    <span className="bg-amber-100 text-amber-800 px-3 py-1.5 rounded-xl font-bold">
                      Preparing: {salesStats.statusBreakdown.preparing}
                    </span>
                    <span className="bg-purple-100 text-purple-800 px-3 py-1.5 rounded-xl font-bold">
                      Confirmed: {salesStats.statusBreakdown.confirmed}
                    </span>
                    <span className="bg-gray-100 text-gray-800 px-3 py-1.5 rounded-xl font-bold">
                      Pending: {salesStats.statusBreakdown.pending}
                    </span>
                    <span className="bg-rose-100 text-rose-800 px-3 py-1.5 rounded-xl font-bold">
                      Cancelled: {salesStats.statusBreakdown.cancelled}
                    </span>
                  </div>
                </div>

                {/* Lightweight SVG Daily Sales Bar Chart */}
                <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-gray-800">Daily Delivered Revenue (IST)</h3>
                    <span className="text-xs text-gray-400 font-mono">{selectedMonth}</span>
                  </div>

                  {salesStats.dailyChartData.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 text-xs font-medium">
                      No delivered orders recorded in {selectedMonth}.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="h-44 w-full flex items-end justify-between gap-1 pt-6 px-2 border-b border-gray-200">
                        {(() => {
                          const maxRev = Math.max(...salesStats.dailyChartData.map((d) => d.revenue), 1);
                          return salesStats.dailyChartData.map((d, i) => {
                            const heightPct = Math.max(Math.round((d.revenue / maxRev) * 100), d.revenue > 0 ? 8 : 2);
                            const dayNum = d.dateStr.split("-")[2];
                            return (
                              <div
                                key={i}
                                className="flex-1 flex flex-col items-center gap-1 group relative"
                              >
                                {/* Tooltip */}
                                <div className="absolute -top-10 hidden group-hover:flex flex-col items-center bg-gray-900 text-white text-[10px] py-1 px-2 rounded-md shadow-lg whitespace-nowrap z-10">
                                  <span>{d.dateStr}</span>
                                  <span className="font-bold text-emerald-400">{formatINR(d.revenue)} ({d.deliveredOrders} orders)</span>
                                </div>
                                <div
                                  style={{ height: `${heightPct}%` }}
                                  className={`w-full rounded-t-md transition-all ${
                                    d.revenue > 0 ? "bg-emerald-500 hover:bg-emerald-600" : "bg-gray-100"
                                  }`}
                                />
                                <span className="text-[9px] text-gray-400 font-mono mt-1">{dayNum}</span>
                              </div>
                            );
                          });
                        })()}
                      </div>
                      <div className="flex justify-between text-[10px] text-gray-400 px-2 font-mono">
                        <span>Day 01</span>
                        <span>Daily Sales Bar Chart (Hover for details)</span>
                        <span>End of Month</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Per-Creator Sales Breakdown Table */}
                <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xs overflow-hidden">
                  <div className="px-6 py-5 border-b border-gray-100">
                    <h3 className="font-bold text-base text-gray-900">
                      Creator Coupon Performance ({selectedMonth})
                    </h3>
                  </div>

                  {salesStats.creatorBreakdown.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 text-xs">
                      No creator orders recorded in {selectedMonth}.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-gray-700">
                        <thead className="bg-gray-50 uppercase text-[10px] font-bold text-gray-500 border-b border-gray-100">
                          <tr>
                            <th className="px-6 py-3.5">Creator</th>
                            <th className="px-6 py-3.5">Coupon Code</th>
                            <th className="px-6 py-3.5">Delivered Orders</th>
                            <th className="px-6 py-3.5">Gross Sales</th>
                            <th className="px-6 py-3.5">Customer Discount</th>
                            <th className="px-6 py-3.5">Commission Earned</th>
                            <th className="px-6 py-3.5">Unpaid Payout</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {salesStats.creatorBreakdown.map((row) => (
                            <tr key={row.influencerId} className="hover:bg-gray-50/50">
                              <td className="px-6 py-4 font-bold text-gray-900">{row.creatorName}</td>
                              <td className="px-6 py-4">
                                <span className="font-mono font-bold bg-purple-50 text-purple-700 px-2.5 py-1 rounded-lg border border-purple-200">
                                  {row.creatorCode}
                                </span>
                              </td>
                              <td className="px-6 py-4 font-bold">{row.deliveredOrders}</td>
                              <td className="px-6 py-4 font-bold text-gray-900">{formatINR(row.grossSales)}</td>
                              <td className="px-6 py-4 text-emerald-600 font-bold">−{formatINR(row.totalDiscount)}</td>
                              <td className="px-6 py-4 text-purple-700 font-bold">{formatINR(row.totalCommission)}</td>
                              <td className="px-6 py-4 font-bold text-amber-700">
                                {row.unpaidCommission > 0 ? (
                                  <span className="bg-amber-50 text-amber-800 px-2 py-0.5 rounded-md border border-amber-200">
                                    {formatINR(row.unpaidCommission)}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">₹0</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="bg-white p-12 text-center text-gray-400 rounded-3xl border border-gray-200/80">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-brand-primary" />
                <p className="mt-2 text-xs font-medium">Loading sales analytics...</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: OFFERS BANNER */}
        {activeTab === "offers" && (
          <section className="bg-white rounded-3xl border border-gray-200/80 shadow-xs p-6 space-y-6">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-4">
              <Tag className="w-5 h-5 text-brand-primary" />
              <h2 className="font-display font-bold text-xl text-brand-primary">
                Daily Offers Management
              </h2>
            </div>

            {/* Create Offer Form */}
            <form onSubmit={handleCreateOffer} className="space-y-4 max-w-xl">
              <h3 className="font-bold text-sm text-gray-800">Create New Offer</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Offer Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Free Kimchi Friday!"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-xs outline-none focus:border-brand-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Promo Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. KIMCHI100"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-xs outline-none focus:border-brand-primary font-mono uppercase"
                  />
                </div>
              </div>

              {offerError && (
                <p className="text-xs text-red-600 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{offerError}</span>
                </p>
              )}

              {offerSuccess && (
                <p className="text-xs text-green-600 flex items-center gap-1 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{offerSuccess}</span>
                </p>
              )}

              <button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center gap-1.5 bg-brand-primary hover:bg-brand-accent text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-xs"
              >
                <Plus className="w-4 h-4" />
                Create Offer
              </button>
            </form>

            {/* Offers List */}
            <div className="pt-4 border-t border-gray-100 space-y-3">
              <h3 className="font-bold text-sm text-gray-800">Existing Offers</h3>

              {offersList.length === 0 ? (
                <p className="text-xs text-gray-400">No offers created yet.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {offersList.map((offer) => (
                    <div
                      key={offer.id}
                      className={`p-4 rounded-2xl border flex flex-col justify-between gap-3 transition ${
                        offer.isActive
                          ? "bg-amber-50/60 border-amber-300"
                          : "bg-gray-50 border-gray-200"
                      }`}
                    >
                      {editingOfferId === offer.id ? (
                        <div className="space-y-2">
                          <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase">Title</label>
                            <input
                              type="text"
                              value={editOfferTitle}
                              onChange={(e) => setEditOfferTitle(e.target.value)}
                              className="w-full border border-gray-300 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-brand-primary font-bold"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase">Promo Code</label>
                            <input
                              type="text"
                              value={editOfferCode}
                              onChange={(e) => setEditOfferCode(e.target.value)}
                              className="w-full border border-gray-300 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-brand-primary font-mono font-bold uppercase"
                            />
                          </div>
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => handleSaveOfferEdit(offer.id)}
                              disabled={isPending}
                              className="flex-1 inline-flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-3 rounded-lg text-xs transition"
                            >
                              <Check className="w-3.5 h-3.5" /> Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingOfferId(null)}
                              className="inline-flex items-center justify-center gap-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-1.5 px-3 rounded-lg text-xs transition"
                            >
                              <X className="w-3.5 h-3.5" /> Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-sm text-gray-900">
                                {offer.title}
                              </span>
                              {offer.isActive ? (
                                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0">
                                  Active Banner
                                </span>
                              ) : (
                                <span className="bg-gray-200 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0">
                                  Inactive
                                </span>
                              )}
                            </div>
                            <p className="font-mono text-xs text-brand-primary font-bold">
                              Code: {offer.code}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleToggleOffer(offer.id, offer.isActive)}
                              className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
                                offer.isActive
                                  ? "bg-amber-600 hover:bg-amber-700 text-white"
                                  : "bg-gray-200 hover:bg-gray-300 text-gray-800"
                              }`}
                            >
                              {offer.isActive ? "Deactivate Offer" : "Set as Active Banner"}
                            </button>
                            <button
                              type="button"
                              onClick={() => startEditingOffer(offer)}
                              className="inline-flex items-center justify-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2 px-3 rounded-xl text-xs transition border border-gray-300"
                            >
                              <Edit className="w-3.5 h-3.5 text-gray-600" /> Edit
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}
      </div>

      {/* MODAL 1: ADD NEW CREATOR */}
      {isAddCreatorOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full rounded-3xl p-6 space-y-5 border border-gray-200 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <h3 className="font-display font-bold text-lg text-gray-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                Add New Creator Partner
              </h3>
              <button
                onClick={() => setIsAddCreatorOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCreatorSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Creator Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={creatorName}
                    onChange={(e) => setCreatorName(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-purple-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Promo Coupon Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. RAHUL10"
                    value={creatorCode}
                    onChange={(e) => setCreatorCode(e.target.value.toUpperCase())}
                    className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold uppercase outline-none focus:border-purple-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Instagram Handle
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. @foodie_rahul"
                    value={creatorHandle}
                    onChange={(e) => setCreatorHandle(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-purple-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    UPI ID or Phone
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 9876543210@paytm"
                    value={creatorUpi}
                    onChange={(e) => setCreatorUpi(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs font-mono outline-none focus:border-purple-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-purple-50/50 p-3 rounded-2xl border border-purple-100">
                <div>
                  <label className="block text-[11px] font-bold text-purple-900 mb-1">
                    Customer Discount %
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={creatorDiscount}
                    onChange={(e) => setCreatorDiscount(Number(e.target.value))}
                    className="w-full border border-purple-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-purple-600 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-purple-900 mb-1">
                    Creator Commission %
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={creatorCommission}
                    onChange={(e) => setCreatorCommission(Number(e.target.value))}
                    className="w-full border border-purple-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-purple-600 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Notes & Internal Details
                </label>
                <textarea
                  rows={2}
                  placeholder="Optional internal note..."
                  value={creatorNotes}
                  onChange={(e) => setCreatorNotes(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-xs outline-none focus:border-purple-600"
                />
              </div>

              {creatorFormError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-1.5 font-medium">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{creatorFormError}</span>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddCreatorOpen(false)}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition shadow-md flex items-center justify-center gap-1.5"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                    </>
                  ) : (
                    "Create Partner"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT CREATOR */}
      {editingCreator && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full rounded-3xl p-6 space-y-5 border border-gray-200 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <h3 className="font-display font-bold text-lg text-gray-900 flex items-center gap-2">
                <Edit className="w-5 h-5 text-purple-600" />
                Edit Creator: {editingCreator.code}
              </h3>
              <button
                onClick={() => setEditingCreator(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditCreator} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Creator Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-purple-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Instagram Handle
                  </label>
                  <input
                    type="text"
                    value={editHandle}
                    onChange={(e) => setEditHandle(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-purple-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    UPI ID or Phone
                  </label>
                  <input
                    type="text"
                    value={editUpi}
                    onChange={(e) => setEditUpi(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs font-mono outline-none focus:border-purple-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-purple-50/50 p-3 rounded-2xl border border-purple-100">
                <div>
                  <label className="block text-[11px] font-bold text-purple-900 mb-1">
                    Discount %
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editDiscount}
                    onChange={(e) => setEditDiscount(Number(e.target.value))}
                    className="w-full border border-purple-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-purple-600 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-purple-900 mb-1">
                    Commission %
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editCommission}
                    onChange={(e) => setEditCommission(Number(e.target.value))}
                    className="w-full border border-purple-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-purple-600 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-xs outline-none focus:border-purple-600"
                />
              </div>

              {editError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-1.5 font-medium">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCreator(null)}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition shadow-md flex items-center justify-center gap-1.5"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: MONTHLY PAYOUT MARK */}
      {payoutModalCreator && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-3xl p-6 space-y-5 border border-gray-200 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <h3 className="font-display font-bold text-lg text-gray-900 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-purple-600" />
                Monthly Commission Payout
              </h3>
              <button
                onClick={() => setPayoutModalCreator(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100 space-y-1">
                <p className="font-bold text-sm text-purple-900">{payoutModalCreator.name}</p>
                <p className="text-xs text-purple-700 font-mono">Code: {payoutModalCreator.code}</p>
                {payoutModalCreator.phoneOrUpi && (
                  <p className="text-xs text-purple-600 font-mono">UPI: {payoutModalCreator.phoneOrUpi}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Select IST Month (YYYY-MM)
                </label>
                <input
                  type="month"
                  value={payoutMonth}
                  onChange={(e) => setPayoutMonth(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold outline-none focus:border-purple-600"
                />
              </div>

              {payoutError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-1.5 font-medium">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{payoutError}</span>
                </div>
              )}

              <p className="text-xs text-gray-500">
                Mark all delivered orders for <strong>{payoutModalCreator.name}</strong> in <strong>{payoutMonth}</strong> as paid or unpaid.
              </p>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleMonthlyPayoutSubmit(false)}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs rounded-xl transition"
                >
                  Mark Unpaid
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleMonthlyPayoutSubmit(true)}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition shadow-md flex items-center justify-center gap-1.5"
                >
                  {isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4" /> Mark Month Paid
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: IMPORT CREATORS (.xlsx / .csv) */}
      {isImportOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-xl w-full rounded-3xl p-6 space-y-5 border border-gray-200 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <h3 className="font-display font-bold text-lg text-gray-900 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                Import Creators (.xlsx / .csv)
              </h3>
              <button
                onClick={() => setIsImportOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* File format guide */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 text-xs text-indigo-900 space-y-1">
              <p className="font-bold text-sm flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4" />
                Expected Column Headers (Row 1)
              </p>
              <p className="font-mono text-[11px] bg-white border border-indigo-200 px-2 py-1.5 rounded-lg">
                name | code | instagramHandle | phoneOrUpi | discountPercent | commissionPercent | notes
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-indigo-700 pt-1">
                <li><strong>name</strong> and <strong>code</strong> are required.</li>
                <li>Existing codes are skipped — creators are <strong>never deleted</strong>.</li>
                <li>Duplicate codes within the file are rejected with per-row errors.</li>
                <li>Formula injection (=, +, -, @) is automatically neutralized.</li>
              </ul>
            </div>

            {/* File picker */}
            {!importResult ? (
              <div className="space-y-4">
                <div
                  onClick={() => importFileRef.current?.click()}
                  className="border-2 border-dashed border-indigo-300 rounded-2xl p-8 text-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-50/50 transition space-y-2"
                >
                  <Upload className="w-8 h-8 mx-auto text-indigo-400" />
                  <p className="font-bold text-sm text-indigo-700">
                    {importFile ? importFile.name : "Click to choose a file"}
                  </p>
                  <p className="text-xs text-gray-400">Supports .xlsx and .csv files</p>
                  <input
                    ref={importFileRef}
                    type="file"
                    accept=".xlsx,.csv"
                    className="hidden"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  />
                </div>

                {importFile && (
                  <div className="flex items-center gap-2 text-xs bg-indigo-50 border border-indigo-200 rounded-xl p-3">
                    <FileSpreadsheet className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span className="font-bold text-indigo-800 truncate">{importFile.name}</span>
                    <span className="text-gray-500 ml-auto shrink-0">
                      {(importFile.size / 1024).toFixed(1)} KB
                    </span>
                    <button
                      onClick={() => { setImportFile(null); if (importFileRef.current) importFileRef.current.value = ""; }}
                      className="text-gray-400 hover:text-red-500 transition shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsImportOpen(false)}
                    className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!importFile || isImporting}
                    onClick={async () => {
                      if (!importFile) return;
                      setIsImporting(true);
                      const fd = new FormData();
                      fd.append("file", importFile);
                      const result = await importInfluencersAction(fd);
                      setImportResult(result);
                      setIsImporting(false);
                      if (result.importedCount > 0) {
                        refreshInfluencers();
                      }
                    }}
                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 text-white font-bold text-xs rounded-xl transition shadow-md flex items-center justify-center gap-1.5"
                  >
                    {isImporting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Importing…
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" /> Import Creators
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* Import Results */
              <div className="space-y-4">
                {importResult.error ? (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <span className="font-medium">{importResult.error}</span>
                  </div>
                ) : (
                  <>
                    {/* Summary KPIs */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-gray-50 rounded-2xl p-3 text-center border border-gray-200">
                        <p className="text-xl font-bold text-gray-900">{importResult.totalRows}</p>
                        <p className="text-[10px] font-bold text-gray-500 uppercase">Total Rows</p>
                      </div>
                      <div className="bg-emerald-50 rounded-2xl p-3 text-center border border-emerald-200">
                        <p className="text-xl font-bold text-emerald-700">{importResult.importedCount}</p>
                        <p className="text-[10px] font-bold text-emerald-600 uppercase">Imported</p>
                      </div>
                      <div className={`rounded-2xl p-3 text-center border ${importResult.errorCount > 0 ? "bg-amber-50 border-amber-200" : "bg-gray-50 border-gray-200"}`}>
                        <p className={`text-xl font-bold ${importResult.errorCount > 0 ? "text-amber-700" : "text-gray-400"}`}>{importResult.errorCount}</p>
                        <p className={`text-[10px] font-bold uppercase ${importResult.errorCount > 0 ? "text-amber-600" : "text-gray-400"}`}>Skipped / Errors</p>
                      </div>
                    </div>

                    {/* Success banner */}
                    {importResult.importedCount > 0 && (
                      <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-medium">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>
                          Successfully imported {importResult.importedCount} creator{importResult.importedCount !== 1 ? "s" : ""}.
                          The Creators tab has been refreshed.
                        </span>
                      </div>
                    )}

                    {/* Per-row errors */}
                    {importResult.errors.length > 0 && (
                      <div className="space-y-2">
                        <p className="font-bold text-xs text-gray-700 flex items-center gap-1.5">
                          <FileWarning className="w-4 h-4 text-amber-600" />
                          Skipped Rows ({importResult.errors.length})
                        </p>
                        <div className="max-h-48 overflow-y-auto space-y-1.5 border border-amber-200 rounded-2xl p-3 bg-amber-50/50">
                          {importResult.errors.map((err, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs">
                              <span className="font-mono font-bold text-gray-500 shrink-0">Row {err.rowNumber}</span>
                              <span className="font-bold text-amber-800 shrink-0">[{err.code}]</span>
                              <span className="text-amber-700">{err.error}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Done / Import another */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsImportOpen(false)}
                    className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => { setImportResult(null); setImportFile(null); if (importFileRef.current) importFileRef.current.value = ""; }}
                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition shadow-md flex items-center justify-center gap-1.5"
                  >
                    <Upload className="w-4 h-4" /> Import Another File
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 5: DELETE CREATOR CONFIRMATION (Task 2) */}
      {deletingCreator && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-3xl p-6 space-y-5 border border-gray-200 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <h3 className="font-display font-bold text-lg text-rose-700 flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-600" />
                Delete Creator Partner
              </h3>
              <button
                onClick={() => setDeletingCreator(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-gray-600">
              <p>
                Are you sure you want to permanently delete creator{" "}
                <strong className="text-gray-900">{deletingCreator.name}</strong> (Coupon:{" "}
                <span className="font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                  {deletingCreator.code}
                </span>
                )?
              </p>

              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  Important Note:
                </p>
                <p className="text-[11px] leading-relaxed text-rose-700">
                  This action removes the coupon code from the system. Historical orders will preserve their stored snapshot details and discounts.
                </p>
              </div>

              {deleteError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-1.5 font-medium">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{deleteError}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingCreator(null)}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleDeleteCreatorSubmit}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 text-white font-bold text-xs rounded-xl transition shadow-md flex items-center justify-center gap-1.5"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Deleting…</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Creator</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


