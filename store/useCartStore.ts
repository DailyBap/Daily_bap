// store/useCartStore.ts — Zustand Global Cart Store

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, CustomerInfo } from "@/types";
import { calculateDeliveryFee } from "@/lib/geo";

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

  // Actions
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  setCustomerInfo: (info: Partial<CustomerInfo>) => void;
  setDeliverable: (value: boolean, distanceKm?: number | null) => void;
  setDeliverySlot: (time: Date | string | null, label: string | null) => void;

  // Computed (as functions to avoid stale state)
  getSubtotal: () => number;
  getDeliveryFee: () => number;
  getTotal: () => number;
  getTotalItems: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      customerInfo: { name: "", phone: "", address: "" },
      isDeliverable: false,
      distanceKm: null,
      requestedDeliveryTime: null,
      deliverySlotLabel: null,

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

      getSubtotal: () => {
        const { items } = get();
        return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      },

      getDeliveryFee: () => {
        const subtotal = get().getSubtotal();
        const { distanceKm } = get();
        return calculateDeliveryFee(distanceKm, subtotal).fee;
      },

      getTotal: () => {
        return get().getSubtotal() + get().getDeliveryFee();
      },

      getTotalItems: () => {
        const { items } = get();
        return items.reduce((sum, item) => sum + item.quantity, 0);
      },
    }),
    {
      name: "daily-bap-cart",
      partialize: (state) => ({
        items: state.items,
        customerInfo: state.customerInfo,
        distanceKm: state.distanceKm,
        requestedDeliveryTime: state.requestedDeliveryTime,
        deliverySlotLabel: state.deliverySlotLabel,
      }),
    }
  )
);
