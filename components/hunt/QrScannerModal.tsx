"use client";

import { useEffect, useRef, useState } from "react";
import QrScanner from "qr-scanner";
import {
  Camera,
  X,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Sparkles,
  Keyboard,
  Clock,
  Gift,
  ArrowRight,
} from "lucide-react";
import { claimHuntCodeAction, ClaimHuntCodeResult } from "@/app/actions/huntActions";
import {
  getOrCreateDeviceId,
  saveLocalReward,
  getLocalRewards,
  LocalReward,
} from "@/lib/hunt/clientRewards";
import { useCartStore } from "@/store/useCartStore";

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCart?: () => void;
}

export default function QrScannerModal({
  isOpen,
  onClose,
  onOpenCart,
}: QrScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);

  const [activeTab, setActiveTab] = useState<"scan" | "rewards">("scan");
  const [manualCode, setManualCode] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [permissionError, setPermissionError] = useState(false);
  const [successReward, setSuccessReward] = useState<{
    couponCode: string;
    label: string;
    message: string;
  } | null>(null);

  const [conflictPrompt, setConflictPrompt] = useState<{
    pendingResult: ClaimHuntCodeResult;
    currentCoupon: string;
  } | null>(null);

  const [myRewards, setMyRewards] = useState<LocalReward[]>([]);

  const couponCode = useCartStore((s) => s.couponCode);
  const setHuntVoucher = useCartStore((s) => s.setHuntVoucher);

  // Load rewards list on open
  useEffect(() => {
    if (isOpen) {
      setMyRewards(getLocalRewards());
      setSuccessReward(null);
      setErrorMessage("");
      setPermissionError(false);
      setConflictPrompt(null);
    }
  }, [isOpen]);

  // Initialize camera scanner when on "scan" tab
  useEffect(() => {
    if (!isOpen || activeTab !== "scan") {
      if (scannerRef.current) {
        scannerRef.current.stop();
        scannerRef.current.destroy();
        scannerRef.current = null;
      }
      return;
    }

    let isMounted = true;

    const startScanner = async () => {
      if (!videoRef.current) return;

      try {
        const qrScanner = new QrScanner(
          videoRef.current,
          (result) => {
            const raw = typeof result === "string" ? result : result.data;
            if (raw && !isProcessing) {
              handleCodeScanned(raw);
            }
          },
          {
            preferredCamera: "environment",
            highlightScanRegion: true,
            highlightCodeOutline: true,
            maxScansPerSecond: 4,
          }
        );

        scannerRef.current = qrScanner;
        await qrScanner.start();
        if (isMounted) setPermissionError(false);
      } catch (err) {
        console.warn("[QrScanner] Camera startup failed:", err);
        if (isMounted) setPermissionError(true);
      }
    };

    const timer = setTimeout(startScanner, 150);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (scannerRef.current) {
        scannerRef.current.stop();
        scannerRef.current.destroy();
        scannerRef.current = null;
      }
    };
  }, [isOpen, activeTab]);

  const applyRewardToCart = (res: ClaimHuntCodeResult) => {
    if (!res.couponCode) return;

    setHuntVoucher({
      code: res.couponCode,
      expiresAt: res.expiresAt || new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      label: res.label || "Treasure Hunt Reward",
    });

    saveLocalReward({
      voucherCode: res.voucherCode || res.couponCode.replace("HUNT-", ""),
      couponCode: res.couponCode,
      label: res.label || "Treasure Hunt Reward",
      expiresAt: res.expiresAt || new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      status: "HELD",
    });

    setMyRewards(getLocalRewards());
    setSuccessReward({
      couponCode: res.couponCode,
      label: res.label || "Treasure Hunt Reward",
      message: res.message || "Reward added to your cart!",
    });
  };

  const handleCodeScanned = async (rawCode: string) => {
    if (isProcessing) return;
    setIsProcessing(true);
    setErrorMessage("");

    try {
      const deviceId = getOrCreateDeviceId();
      const res = await claimHuntCodeAction({
        code: rawCode.trim(),
        deviceId,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Could not claim treasure code.");
        setIsProcessing(false);
        return;
      }

      // Check for conflict with existing cart coupon
      if (couponCode && couponCode !== res.couponCode) {
        setConflictPrompt({
          pendingResult: res,
          currentCoupon: couponCode,
        });
        setIsProcessing(false);
        return;
      }

      applyRewardToCart(res);
    } catch {
      setErrorMessage("Network error occurred while verifying code. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleCodeScanned(manualCode.trim());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#445916] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white">
              <Camera size={18} />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg leading-tight">
                Treasure Hunt Scanner
              </h3>
              <p className="text-[11px] text-white/80">Scan QR code at secret locations</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-gray-100 bg-gray-50/80 px-4 pt-2">
          <button
            onClick={() => {
              setActiveTab("scan");
              setErrorMessage("");
            }}
            className={`flex-1 py-2.5 text-xs font-bold border-b-2 transition flex items-center justify-center gap-1.5 ${
              activeTab === "scan"
                ? "border-[#445916] text-[#445916]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Camera size={14} /> Scan Camera
          </button>
          <button
            onClick={() => {
              setActiveTab("rewards");
              setMyRewards(getLocalRewards());
            }}
            className={`flex-1 py-2.5 text-xs font-bold border-b-2 transition flex items-center justify-center gap-1.5 ${
              activeTab === "rewards"
                ? "border-[#445916] text-[#445916]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Gift size={14} /> My Rewards ({myRewards.length})
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {/* Conflict Dialog */}
          {conflictPrompt && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-3 animate-fade-in">
              <div className="flex items-start gap-2.5">
                <AlertCircle size={18} className="text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-xs text-amber-900">
                    Replace existing promo code?
                  </h4>
                  <p className="text-xs text-amber-800 mt-1">
                    You currently have{" "}
                    <span className="font-mono font-bold">{conflictPrompt.currentCoupon}</span>{" "}
                    applied in your cart. Only one discount can be applied per order.
                  </p>
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-1">
                <button
                  onClick={() => setConflictPrompt(null)}
                  className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-600 hover:bg-white transition"
                >
                  Keep Current Code
                </button>
                <button
                  onClick={() => {
                    const pending = conflictPrompt.pendingResult;
                    setConflictPrompt(null);
                    applyRewardToCart(pending);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-[#445916] text-white text-xs font-bold hover:bg-[#354611] transition"
                >
                  Apply Treasure Reward
                </button>
              </div>
            </div>
          )}

          {/* Success Notification */}
          {successReward && !conflictPrompt && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3 animate-fade-in text-center">
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                <Sparkles size={24} />
              </div>
              <div>
                <h4 className="font-bold text-emerald-950 text-sm">
                  {successReward.label}
                </h4>
                <p className="text-xs text-emerald-800 mt-1 font-mono font-bold">
                  Code: {successReward.couponCode}
                </p>
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  {successReward.message}
                </p>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onOpenCart?.();
                }}
                className="w-full py-2.5 rounded-xl bg-[#445916] text-white text-xs font-bold hover:bg-[#354611] transition flex items-center justify-center gap-1.5"
              >
                View in Cart <ArrowRight size={14} />
              </button>
            </div>
          )}

          {/* Tab 1: Scanner */}
          {activeTab === "scan" && !successReward && !conflictPrompt && (
            <div className="space-y-4">
              {/* Camera Preview Frame */}
              <div className="relative aspect-square w-full max-w-[280px] mx-auto bg-black rounded-2xl overflow-hidden shadow-inner flex items-center justify-center border-2 border-gray-200">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                />
                {/* Viewfinder overlay */}
                <div className="absolute inset-8 border-2 border-dashed border-white/70 rounded-xl pointer-events-none" />

                {isProcessing && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-white space-y-2">
                    <Loader2 size={32} className="animate-spin text-white" />
                    <span className="text-xs font-bold">Claiming treasure...</span>
                  </div>
                )}
              </div>

              {permissionError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Camera access blocked</p>
                    <p className="text-[11px] text-rose-700 mt-0.5">
                      Please allow camera permission in your browser or enter the code manually below.
                    </p>
                  </div>
                </div>
              )}

              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Manual code fallback */}
              <div className="pt-2 border-t border-gray-100">
                <form onSubmit={handleManualSubmit} className="space-y-2">
                  <label className="text-[11px] font-bold text-gray-600 flex items-center gap-1">
                    <Keyboard size={12} /> Enter code manually:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. BAP-MEAL-004-X9F2"
                      value={manualCode}
                      onChange={(e) => {
                        setManualCode(e.target.value.toUpperCase());
                        if (errorMessage) setErrorMessage("");
                      }}
                      className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono uppercase tracking-wider outline-none focus:border-[#445916]"
                    />
                    <button
                      type="submit"
                      disabled={isProcessing || !manualCode.trim()}
                      className="bg-[#445916] hover:bg-[#354611] disabled:opacity-50 text-white font-bold text-xs px-4 py-2 rounded-xl transition flex items-center gap-1"
                    >
                      {isProcessing ? <Loader2 size={12} className="animate-spin" /> : "Claim"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Tab 2: My Rewards */}
          {activeTab === "rewards" && (
            <div className="space-y-3">
              {myRewards.length === 0 ? (
                <div className="text-center py-8 space-y-2 text-gray-400">
                  <Gift size={36} className="mx-auto text-gray-300" />
                  <p className="text-xs font-medium">No treasure rewards claimed yet</p>
                  <p className="text-[11px] text-gray-400">
                    Find Daily Bap QR codes in Guwahati and scan them to earn discounts!
                  </p>
                </div>
              ) : (
                myRewards.map((reward) => {
                  const isExpired = new Date(reward.expiresAt) < new Date();
                  const isRedeemed = reward.status === "REDEEMED";

                  return (
                    <div
                      key={reward.couponCode}
                      className="p-3.5 bg-gray-50 border border-gray-200/80 rounded-2xl flex items-center justify-between"
                    >
                      <div>
                        <p className="text-xs font-bold text-gray-900">{reward.label}</p>
                        <p className="text-[11px] font-mono text-[#445916] font-bold mt-0.5">
                          {reward.couponCode}
                        </p>
                        <p className="text-[10px] text-gray-500 flex items-center gap-1 mt-1">
                          <Clock size={10} />
                          {isRedeemed
                            ? "Redeemed"
                            : isExpired
                            ? "Expired"
                            : `Expires ${new Date(reward.expiresAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}`}
                        </p>
                      </div>

                      <div>
                        {!isRedeemed && !isExpired ? (
                          <button
                            onClick={() => {
                              setHuntVoucher({
                                code: reward.couponCode,
                                expiresAt: reward.expiresAt,
                                label: reward.label,
                              });
                              onClose();
                              onOpenCart?.();
                            }}
                            className="px-3 py-1.5 bg-[#445916] text-white text-[11px] font-bold rounded-xl hover:bg-[#354611] transition"
                          >
                            Use in Cart
                          </button>
                        ) : (
                          <span className="text-[10px] font-bold px-2.5 py-1 bg-gray-200 text-gray-600 rounded-lg">
                            {isRedeemed ? "Claimed" : "Expired"}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
