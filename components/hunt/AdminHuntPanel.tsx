"use client";

import { useEffect, useState } from "react";
import {
  MapPin,
  Gift,
  Power,
  Navigation,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Plus,
  Upload,
  ExternalLink,
  Clock,
  Sparkles,
} from "lucide-react";
import {
  getHuntDashboardDataAction,
  toggleHuntEnabledAction,
  dropHuntPinAction,
  setCampaignStatusAction,
  adminReleaseClaimAction,
  importCampaignSeedsAction,
} from "@/app/actions/huntAdminActions";
import Link from "next/link";

export default function AdminHuntPanel() {
  const [loading, setLoading] = useState(true);
  const [huntEnabled, setHuntEnabled] = useState(false);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [claims, setClaims] = useState<any[]>([]);
  const [warnings, setWarnings] = useState<any[]>([]);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Mobile Drop Tool State
  const [selectedCodeId, setSelectedCodeId] = useState<string>("");
  const [dropLat, setDropLat] = useState("");
  const [dropLng, setDropLng] = useState("");
  const [dropHint, setDropHint] = useState("");
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isDropping, setIsDropping] = useState(false);

  // Seed Import State
  const [isImporting, setIsImporting] = useState(false);

  const refreshData = async () => {
    setLoading(true);
    const data = await getHuntDashboardDataAction();
    if (data.success) {
      setHuntEnabled(data.huntEnabled);
      setCampaigns(data.campaigns);
      setClaims(data.claims);
      setWarnings(data.unredeemedWarnings);
    }
    setLoading(false);
  };

  useEffect(() => {
    refreshData();
  }, []);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleToggleGlobal = async () => {
    const nextState = !huntEnabled;
    const res = await toggleHuntEnabledAction(nextState);
    if (res.success) {
      setHuntEnabled(nextState);
      showToast(
        "success",
        `Treasure Hunt ${nextState ? "ACTIVATED" : "PAUSED"} globally.`
      );
    } else {
      showToast("error", res.error || "Failed to update status.");
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by this browser.");
      return;
    }
    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDropLat(pos.coords.latitude.toFixed(6));
        setDropLng(pos.coords.longitude.toFixed(6));
        setIsGettingLocation(false);
        showToast("success", "GPS coordinates acquired!");
      },
      (err) => {
        setIsGettingLocation(false);
        alert(`Location error: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSaveDrop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCodeId || !dropLat || !dropLng || !dropHint.trim()) {
      alert("Please fill in all drop fields.");
      return;
    }

    setIsDropping(true);
    const res = await dropHuntPinAction(
      Number(selectedCodeId),
      parseFloat(dropLat),
      parseFloat(dropLng),
      dropHint.trim()
    );

    if (res.success) {
      showToast("success", "Treasure pin successfully dropped on map!");
      setDropHint("");
      setDropLat("");
      setDropLng("");
      setSelectedCodeId("");
      refreshData();
    } else {
      showToast("error", res.error || "Failed to save pin.");
    }
    setIsDropping(false);
  };

  const handleToggleCampaignStatus = async (
    id: number,
    currentStatus: string
  ) => {
    const nextStatus = currentStatus === "ACTIVE" ? "DEPLETED" : "ACTIVE";
    const res = await setCampaignStatusAction(id, nextStatus as any);
    if (res.success) {
      showToast("success", `Campaign code status updated to ${nextStatus}.`);
      refreshData();
    }
  };

  const handleReleaseClaim = async (claimId: number) => {
    if (!confirm("Are you sure you want to release/void this voucher claim?")) return;
    const res = await adminReleaseClaimAction(claimId);
    if (res.success) {
      showToast("success", "Claim released successfully.");
      refreshData();
    } else {
      showToast("error", res.error || "Could not release claim.");
    }
  };

  const handleSeedDefaults = async () => {
    if (!confirm("Import standard sample QR Treasure Hunt campaigns into database?")) return;
    setIsImporting(true);

    const defaultSeeds = [
      {
        code: "BAP-MEAL-001-K9F2",
        offerType: "FREE_MEAL" as const,
        maxClaims: 1,
        locationHint: "Near Dighalipukhuri Lake entrance bench",
        lat: 26.1856,
        lng: 91.7512,
      },
      {
        code: "BAP-BOGO-002-X4M1",
        offerType: "BOGO" as const,
        maxClaims: 2,
        locationHint: "Near Guwahati Commerce College food lane",
        lat: 26.1772,
        lng: 91.7788,
      },
      {
        code: "BAP-SIDE-003-V8T7",
        offerType: "FREE_SIDE" as const,
        maxClaims: 3,
        locationHint: "Near Nehru Park main gate walkway",
        lat: 26.1869,
        lng: 91.7482,
      },
      {
        code: "BAP-DISC-004-P2Q9",
        offerType: "PERCENT_OFF" as const,
        discountValue: 30,
        maxClaims: 5,
        locationHint: "Near GS Road City Centre transit shelter",
        lat: 26.1528,
        lng: 91.7765,
      },
    ];

    const res = await importCampaignSeedsAction(defaultSeeds);
    if (res.success) {
      showToast("success", `Successfully imported ${res.count} campaign codes!`);
      refreshData();
    } else {
      showToast("error", res.error || "Import failed.");
    }
    setIsImporting(false);
  };

  if (loading) {
    return (
      <div className="py-16 text-center">
        <Loader2 size={32} className="animate-spin mx-auto text-[#445916]" />
        <p className="text-xs font-bold text-gray-500 mt-2">Loading Treasure Hunt admin...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold ${
            toast.type === "success"
              ? "bg-emerald-900 text-emerald-100"
              : "bg-rose-900 text-rose-100"
          }`}
        >
          {toast.type === "success" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Warning Box for Orphaned / Unredeemed Claims on Orders */}
      {warnings.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl space-y-2">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
            <AlertTriangle size={18} className="text-amber-600" />
            <span>Attention: Unreconciled Hunt Claims ({warnings.length})</span>
          </div>
          <p className="text-xs text-amber-800">
            The following orders were placed with a hunt voucher, but the claim record is not in REDEEMED state.
          </p>
          <div className="divide-y divide-amber-200">
            {warnings.map((w) => (
              <div key={w.orderId} className="py-2 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-amber-950">{w.orderNumber || w.orderId}</span>
                  <span className="text-amber-700 ml-2 font-mono">Voucher: {w.voucherCode}</span>
                </div>
                <span className="font-bold px-2 py-0.5 rounded bg-amber-200 text-amber-900">
                  Claim Status: {w.claimStatus}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Header and Global Toggle */}
      <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Gift className="text-[#445916]" size={24} />
            <h2 className="font-display font-bold text-xl text-gray-900">
              QR Treasure Hunt Control
            </h2>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Feature-flagged gamified marketing campaign. Manage physical QR codes, drop locations, and vouchers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSeedDefaults}
            disabled={isImporting}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-100 transition"
          >
            {isImporting ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            <span>Import Starter Codes</span>
          </button>

          <button
            onClick={handleToggleGlobal}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition shadow-xs ${
              huntEnabled
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "bg-gray-200 hover:bg-gray-300 text-gray-700"
            }`}
          >
            <Power size={16} />
            <span>{huntEnabled ? "HUNT ACTIVE" : "HUNT PAUSED"}</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-gray-200/80 shadow-xs">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            Total Codes
          </p>
          <p className="font-display font-bold text-2xl text-gray-900 mt-1">
            {campaigns.length}
          </p>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-gray-200/80 shadow-xs">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            Placed Pins
          </p>
          <p className="font-display font-bold text-2xl text-[#445916] mt-1">
            {campaigns.filter((c) => c.lat && c.lng).length}
          </p>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-gray-200/80 shadow-xs">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            Active Holds
          </p>
          <p className="font-display font-bold text-2xl text-amber-600 mt-1">
            {claims.filter((c) => c.status === "HELD").length}
          </p>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-gray-200/80 shadow-xs">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            Redeemed
          </p>
          <p className="font-display font-bold text-2xl text-emerald-600 mt-1">
            {claims.filter((c) => c.status === "REDEEMED").length}
          </p>
        </div>
      </div>

      {/* Mobile Pin Drop Tool Card */}
      <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <MapPin size={20} className="text-[#445916]" />
          <h3 className="font-display font-bold text-base text-gray-900">
            Mobile Drop Tool
          </h3>
          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
            Admin Auth Verified
          </span>
        </div>
        <p className="text-xs text-gray-500">
          When placing a physical QR sticker in Guwahati, open this tool on your phone, choose the unplaced code, click &quot;Acquire Current GPS&quot;, and save.
        </p>

        <form onSubmit={handleSaveDrop} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="text-[11px] font-bold text-gray-600 block mb-1">
              Select Campaign Code:
            </label>
            <select
              value={selectedCodeId}
              onChange={(e) => setSelectedCodeId(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono outline-none focus:border-[#445916]"
            >
              <option value="">-- Choose Code --</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} ({c.offerType}{c.lat ? " • Placed" : " • Unplaced"})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-gray-600 block mb-1">
              GPS Coordinates:
            </label>
            <div className="flex gap-1.5">
              <input
                type="text"
                placeholder="Lat, Lng"
                value={dropLat ? `${dropLat}, ${dropLng}` : ""}
                readOnly
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono outline-none"
              />
              <button
                type="button"
                onClick={handleGetLocation}
                disabled={isGettingLocation}
                className="px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold flex items-center gap-1 shrink-0"
              >
                {isGettingLocation ? <Loader2 size={14} className="animate-spin" /> : <Navigation size={14} />}
                <span>GPS</span>
              </button>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-gray-600 block mb-1">
              Location Hint:
            </label>
            <input
              type="text"
              placeholder="e.g. Under the blue staircase"
              value={dropHint}
              onChange={(e) => setDropHint(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-[#445916]"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={isDropping || !selectedCodeId || !dropLat}
              className="w-full py-2.5 rounded-xl bg-[#445916] hover:bg-[#354611] disabled:opacity-50 text-white font-bold text-xs transition flex items-center justify-center gap-1.5"
            >
              {isDropping ? <Loader2 size={14} className="animate-spin" /> : <MapPin size={14} />}
              <span>Save &amp; Drop Pin</span>
            </button>
          </div>
        </form>
      </div>

      {/* Campaign Codes Table */}
      <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-display font-bold text-base text-gray-900">
            QR Campaign Codes
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/80 text-gray-600 font-bold border-b border-gray-100">
              <tr>
                <th className="px-6 py-3">QR Payload Code</th>
                <th className="px-6 py-3">Offer Type</th>
                <th className="px-6 py-3">Claims (Used / Max)</th>
                <th className="px-6 py-3">Reserved Holds</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Location Hint</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {campaigns.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-3.5 font-mono font-bold text-brand-primary">
                    {c.code}
                  </td>
                  <td className="px-6 py-3.5 font-semibold text-gray-800">
                    {c.offerType} {c.discountValue ? `(${c.discountValue}%)` : ""}
                  </td>
                  <td className="px-6 py-3.5">
                    <span className="font-bold text-gray-900">{c.currentClaims}</span>
                    <span className="text-gray-400"> / {c.maxClaims}</span>
                  </td>
                  <td className="px-6 py-3.5 font-mono text-amber-600 font-bold">
                    {c.reservedCount || 0}
                  </td>
                  <td className="px-6 py-3.5">
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        c.status === "ACTIVE"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-gray-600 max-w-xs truncate">
                    {c.locationHint || <span className="text-gray-400 italic">Unplaced</span>}
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <button
                      onClick={() => handleToggleCampaignStatus(c.id, c.status)}
                      className="text-xs font-semibold text-[#445916] hover:underline"
                    >
                      {c.status === "ACTIVE" ? "Deplete" : "Re-activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Claims List */}
      <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-display font-bold text-base text-gray-900">
            Treasure Hunt Claims &amp; Vouchers (Read-Only)
          </h3>
          <span className="text-xs text-gray-400">{claims.length} total claims</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/80 text-gray-600 font-bold border-b border-gray-100">
              <tr>
                <th className="px-6 py-3">Voucher Code</th>
                <th className="px-6 py-3">QR Source</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Held / Redeemed At</th>
                <th className="px-6 py-3">Customer Phone</th>
                <th className="px-6 py-3">Linked Order</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {claims.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                    No voucher claims recorded yet.
                  </td>
                </tr>
              ) : (
                claims.map((claim) => (
                  <tr key={claim.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-3.5 font-mono font-bold text-brand-accent">
                      HUNT-{claim.voucherCode}
                    </td>
                    <td className="px-6 py-3.5 font-mono text-gray-600">
                      {claim.campaignCode}
                    </td>
                    <td className="px-6 py-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          claim.status === "REDEEMED"
                            ? "bg-emerald-100 text-emerald-800"
                            : claim.status === "HELD"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-gray-200 text-gray-700"
                        }`}
                      >
                        {claim.status}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-gray-600">
                      {claim.redeemedAt
                        ? `Redeemed ${new Date(claim.redeemedAt).toLocaleDateString()}`
                        : `Expires ${new Date(claim.expiresAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}`}
                    </td>
                    <td className="px-6 py-3.5 font-mono text-gray-700">
                      {claim.customerPhone || "—"}
                    </td>
                    <td className="px-6 py-3.5">
                      {claim.orderId ? (
                        <Link
                          href={`/orders/${claim.orderId}`}
                          target="_blank"
                          className="font-bold text-[#445916] hover:underline inline-flex items-center gap-1 font-mono"
                        >
                          <span>{claim.orderNumber || "Order"}</span>
                          <ExternalLink size={10} />
                        </Link>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      {claim.status !== "RELEASED" && (
                        <button
                          onClick={() => handleReleaseClaim(claim.id)}
                          className="text-xs font-semibold text-rose-600 hover:underline"
                        >
                          Void / Release
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
