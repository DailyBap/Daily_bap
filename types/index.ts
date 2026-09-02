// types/index.ts — Shared TypeScript interfaces for Daily Bap

export interface MenuItem {
  id: string;
  name: string;
  category: "bento" | "bibimbap" | "sides" | "addons";
  price: number;
  description: string;
  tags: string[];
  modelRef: string | null;
  isVegetarian?: boolean;
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  modelRef: string | null;
  isVegetarian?: boolean;
}

export interface CustomerInfo {
  name: string;
  phone: string;
  address: string;
  lat?: number;
  lng?: number;
}

export interface Order {
  id: string;
  userId: string;
  items: CartItem[];
  totalAmount: number;
  deliveryFee: number;
  deliveryAddress: string;
  requestedDeliveryTime?: string | Date | null;
  deliverySlotLabel?: string | null;
  status: OrderStatus;
  createdAt: Date;
}

export type OrderStatus = "pending" | "confirmed" | "preparing" | "out_for_delivery" | "delivered" | "cancelled";

export interface FoodPrinciple {
  id: number;
  label: string;
  description: string;
}

export interface HowToEatStep {
  step: string;
  heading: string;
  body: string;
}

export interface ProcessStep {
  step: number;
  label: string;
  description: string;
}

export interface DeliveryZoneResult {
  isDeliverable: boolean;
  distanceKm: number;
}
