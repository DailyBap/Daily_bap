// config/comboDeals.ts — Bundled Combo Deals Configuration for Daily Bap
import type { Diet } from "@/types";

export interface ComboDealItem {
  id: string;
  name: string;
  tagline: string;
  description: string;
  originalPrice: number;
  discountedPrice: number;
  serves: number | string;
  diet: Diet;
  badge?: string;
  includes: string[];
  isPopular: boolean;
}

export const comboDealsData: ComboDealItem[] = [
  {
    id: "combo-seoul-solo-feast",
    name: "The Seoul Solo Feast",
    badge: "Bestseller",
    tagline: "The ultimate authentic Korean comfort bundle",
    description:
      "Crispy Korean Fried Chicken Bento paired with freshly rolled Bulgogi Chicken Kimbap and signature spicy gochujang mayo dipping sauce.",
    originalPrice: 508,
    discountedPrice: 419,
    diet: "nonveg",
    serves: 1,
    includes: [
      "Korean Fried Chicken Bento (₹299)",
      "Non-Veg Bulgogi Chicken Kimbap (5 Pieces / Half Roll) (₹169)",
      "Spicy Gochujang Mayo 50ml (₹40)",
    ],
    isPopular: true,
  },
  {
    id: "combo-k-street-duo-veg",
    name: "K-Street Veggie Duo",
    badge: "Vegetarian Pick",
    tagline: "Golden glazed proteins & street food crunch",
    description:
      "Savory sweet-soy glazed Tofu/Paneer Bento with fresh grilled vegetable skewers and crunchy sweet & sour pickled radish.",
    originalPrice: 488,
    discountedPrice: 399,
    diet: "veg",
    serves: 2,
    includes: [
      "Golden Tofu / Paneer Bento (₹299)",
      "Veg Skewers 3 Sticks (₹129)",
      "Sweet & Sour Pickled Radish (₹60)",
    ],
    isPopular: false,
  },
  {
    id: "combo-office-power-lunch",
    name: "Office Power Lunch Bundle",
    badge: "Office Favorite",
    tagline: "High-protein bowl + kimbap rolls for peak focus",
    description:
      "Tender Chicken Bulgogi Bowl served with savory bulgogi chicken kimbap rolls and crisp chili-sesame cucumber salad.",
    originalPrice: 548,
    discountedPrice: 449,
    diet: "nonveg",
    serves: 2,
    includes: [
      "Chicken Bulgogi Bibimbap Bowl (₹299)",
      "Bulgogi Chicken Kimbap Half Roll (₹169)",
      "Spicy Cucumber Salad (₹80)",
    ],
    isPopular: true,
  },
  {
    id: "combo-snack-and-roll-egg",
    name: "Kimbap & Skewer Box",
    badge: "Great for Sharing",
    tagline: "Rolled fresh seaweed kimbap with grilled skewers",
    description:
      "A full 10-piece Egg Kimbap roll served with grilled skewers and smoky house-made signature gochujang dip.",
    originalPrice: 448,
    discountedPrice: 379,
    diet: "egg",
    serves: 2,
    includes: [
      "Egg Kimbap Full Roll 10 Pcs (₹279)",
      "Veg Skewers 3 Sticks (₹129)",
      "Signature Gochujang Sauce 50ml (₹40)",
    ],
    isPopular: false,
  },
  // -------------------------------------------------------------
  // Substantive Main Menu Category Pairings (Bentos, Bowls, Kimbaps, Skewers)
  // -------------------------------------------------------------
  {
    id: "combo-street-food-classic",
    name: "The Street Food Classic",
    tagline: "Seoul street favorite: rolled kimbap & grilled skewers",
    description:
      "A hearty street food pairing of freshly rolled Paneer Kimbap with a 6-stick grilled vegetable skewer platter and crunchy spicy cucumber salad.",
    originalPrice: 608,
    discountedPrice: 499,
    serves: 2,
    diet: "veg",
    badge: "Street Classic",
    includes: [
      "Paneer Kimbap (10 Pieces / Full Roll)",
      "Veg Skewers (6 Sticks)",
      "Spicy Cucumber Salad",
    ],
    isPopular: true,
  },
  {
    id: "combo-executive-bento",
    name: "The Executive Bento",
    tagline: "Crispy fried chicken bento with flame-grilled skewers",
    description:
      "Our bestselling Korean Fried Chicken Bento served alongside flame-grilled chicken skewers and sweet & sour pickled radish.",
    originalPrice: 508,
    discountedPrice: 419,
    serves: 1,
    diet: "nonveg",
    badge: "Executive Pick",
    includes: [
      "Korean Fried Chicken Bento",
      "Non-Veg Chicken Skewers (3 Sticks)",
      "Sweet & Sour Pickled Radish",
    ],
    isPopular: false,
  },
  {
    id: "combo-seoul-bowl-duo",
    name: "The Seoul Bowl Duo",
    tagline: "Classic chicken bulgogi bibimbap bowl & kimbap pairing",
    description:
      "Savoury-sweet Chicken Bulgogi Bowl paired with freshly rolled Bulgogi Chicken Kimbap and chili-sesame spicy cucumber salad.",
    originalPrice: 548,
    discountedPrice: 449,
    serves: 2,
    diet: "nonveg",
    badge: "Popular Duo",
    includes: [
      "Chicken Bulgogi Bowl",
      "Non-Veg Bulgogi Chicken Kimbap (5 Pieces / Half Roll)",
      "Spicy Cucumber Salad",
    ],
    isPopular: true,
  },
  {
    id: "combo-ultimate-share-box",
    name: "The Ultimate Share Box",
    tagline: "The grand Korean feast: bento, full kimbap roll & skewers",
    description:
      "A massive celebration feast combining crispy Korean Fried Chicken Bento, a full 10-piece Bulgogi Chicken Kimbap roll, and 6 grilled chicken skewers.",
    originalPrice: 847,
    discountedPrice: 699,
    serves: 3,
    diet: "nonveg",
    badge: "Share Box",
    includes: [
      "Korean Fried Chicken Bento",
      "Non-Veg Bulgogi Chicken Kimbap (10 Pieces / Full Roll)",
      "Non-Veg Chicken Skewers (6 Sticks)",
    ],
    isPopular: true,
  },
];
