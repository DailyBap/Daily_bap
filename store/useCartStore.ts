// store/useCartStore.ts — Zustand Global Cart Store with Backward-Compatible Persistence
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, CustomerInfo } from "@/types";
import { calculateDeliveryFee } from "@/lib/geo";

export interface HuntVoucherState {
  code: string;
  expiresAt: string;
  label: string;
  offerType?: string;
  discountPercent?: number;
}

interface CartState {
  // Cart items
  items: CartItem[];

  // Customer info
  customerInfo: CustomerInfo;

  // Delivery zone state
  isDeliverable: boolean;
  distanceKm: number | null;

  // Requested delivery time slot
  requestedDeliveryTime: string | null;
  deliverySlotLabel: string | null;

  // Coupon state (Phase 3)
  couponCode: string | null;
  discountPercent: number;

  // Additive QR Treasure Hunt voucher state
  huntVoucher?: HuntVoucherState | null;

  // Actions
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  setCustomerInfo: (info: Partial<CustomerInfo>) => void;
  setDeliverable: (value: boolean, distanceKm?: number | null) => void;
  setDeliverySlot: (time: Date | string | null, label: string | null) => void;
  setCoupon: (code: string | null, discountPercent?: number) => void;
  setHuntVoucher: (voucher: HuntVoucherState | null) => void;
  clearCoupon: () => void;

  // Computed (as functions to avoid stale state)
  getSubtotal: () => number;
  getDiscountAmount: () => number;
  getDiscountedSubtotal: () => number;
  getDeliveryFee: () => number;
  getTotal: () => number;
  getTotalItems: () => number;
}

export interface PersistedCartState {
  items: CartItem[];
  customerInfo: CustomerInfo;
  distanceKm: number | null;
  requestedDeliveryTime: string | null;
  deliverySlotLabel: string | null;
  couponCode: string | null;
  discountPercent: number;
  huntVoucher?: HuntVoucherState | null;
}

export const useCartStore = create<CartState>()(
  persist<CartState, [], [], PersistedCartState>(
    (set, get) => ({
      items: [],
      customerInfo: { name: "", phone: "", address: "" },
      isDeliverable: false,
      distanceKm: null,
      requestedDeliveryTime: null,
      deliverySlotLabel: null,

      // Default coupon state
      couponCode: null,
      discountPercent: 0,
      huntVoucher: null,

      addItem: (newItem) =>
        set((state) => {
          const existing = state.items.find((i) => i.id === newItem.id);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.id === newItem.id ? { ...i, quantity: i.quantity + 1 } : i
              ),
            };
          }
          return { items: [...state.items, { ...newItem, quantity: 1 }] };
        }),

      removeItem: (id) =>
        set((state) => ({
          items: state.items.filter((i) => i.id !== id),
        })),

      updateQuantity: (id, quantity) =>
        set((state) => {
          if (quantity <= 0) {
            return { items: state.items.filter((i) => i.id !== id) };
          }
          return {
            items: state.items.map((i) =>
              i.id === id ? { ...i, quantity } : i
            ),
          };
        }),

      clearCart: () =>
        set({
          items: [],
          distanceKm: null,
          requestedDeliveryTime: null,
          deliverySlotLabel: null,
          couponCode: null,
          discountPercent: 0,
          huntVoucher: null,
        }),

      setCustomerInfo: (info) =>
        set((state) => ({
          customerInfo: { ...state.customerInfo, ...info },
        })),

      setDeliverable: (value, distanceKm = null) =>
        set({ isDeliverable: value, distanceKm: distanceKm ?? null }),

      setDeliverySlot: (time, label) =>
        set({
          requestedDeliveryTime:
            time instanceof Date ? time.toISOString() : time,
          deliverySlotLabel: label,
        }),

      setCoupon: (code, discountPercent = 10) =>
        set((state) => ({
          couponCode: code ? code.toUpperCase() : null,
          discountPercent: code ? discountPercent : 0,
          huntVoucher: code ? state.huntVoucher : null,
        })),

      setHuntVoucher: (voucher) =>
        set({
          huntVoucher: voucher,
          couponCode: voucher ? voucher.code : null,
          discountPercent: voucher ? (voucher.discountPercent || 0) : 0,
        }),

      clearCoupon: () =>
        set({
          couponCode: null,
          discountPercent: 0,
          huntVoucher: null,
        }),

      getSubtotal: () => {
        const { items } = get();
        return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      },

      getDiscountAmount: () => {
        const { couponCode, discountPercent, huntVoucher, items } = get();
        if (!couponCode) return 0;

        const subtotal = get().getSubtotal();

        // Calculate preview discount for hunt vouchers
        if (huntVoucher) {
          if (huntVoucher.offerType === "PERCENT_OFF" || discountPercent > 0) {
            return Math.round((subtotal * (discountPercent || 10)) / 100);
          }
          if (huntVoucher.offerType === "BOGO") {
            const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0);
            if (totalUnits < 2) return 0;
            return Math.min(...items.map((i) => i.price));
          }
          if (huntVoucher.offerType === "FREE_MEAL") {
            const meals = items.filter(
              (i) => i.id?.includes("bento") || i.id?.includes("bowl")
            );
            if (meals.length === 0) return 0;
            return Math.min(...meals.map((i) => i.price));
          }
          if (huntVoucher.offerType === "FREE_SIDE") {
            const sides = items.filter(
              (i) =>
                i.id === "kimchi" ||
                i.id === "cucumber-salad" ||
                i.id === "pickled-radish"
            );
            if (sides.length === 0) return 0;
            return Math.min(...sides.map((i) => i.price));
          }
        }

        if (discountPercent <= 0) return 0;
        return Math.round((subtotal * discountPercent) / 100);
      },

      getDiscountedSubtotal: () => {
        const subtotal = get().getSubtotal();
        const discount = get().getDiscountAmount();
        return Math.max(0, subtotal - discount);
      },

      getDeliveryFee: () => {
        // Free delivery threshold (₹1,000) uses PRE-DISCOUNT food subtotal per spec
        const subtotal = get().getSubtotal();
        const { distanceKm } = get();
        return calculateDeliveryFee(distanceKm, subtotal).fee;
      },

      getTotal: () => {
        return get().getDiscountedSubtotal() + get().getDeliveryFee();
      },

      getTotalItems: () => {
        const { items } = get();
        return items.reduce((sum, item) => sum + item.quantity, 0);
      },
    }),
    {
      name: "daily-bap-cart",
      version: 3,
      migrate: (persistedState: any, version: number) => {
        let state = persistedState;
        if (version < 2) {
          state = {
            ...state,
            couponCode: null,
            discountPercent: 0,
          };
        }
        if (version < 3) {
          state = {
            ...state,
            huntVoucher: null,
          };
        }
        return state as CartState;
      },
      partialize: (state) => ({
        items: state.items,
        customerInfo: state.customerInfo,
        distanceKm: state.distanceKm,
        requestedDeliveryTime: state.requestedDeliveryTime,
        deliverySlotLabel: state.deliverySlotLabel,
        couponCode: state.couponCode,
        discountPercent: state.discountPercent,
        huntVoucher: state.huntVoucher,
      }),
    }
  )
);
