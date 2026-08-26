// ============================================================
// config/brand.ts — Daily Bap Central Brand Configuration
// All copy extracted from the Daily Bap PDF brochure.
// ALL UI components must import from this file.
// ============================================================

import type { MenuItem, FoodPrinciple, HowToEatStep, ProcessStep } from "@/types";

// ----------------------------------------------------------
// Site Configuration
// ----------------------------------------------------------
export const siteConfig = {
  name: "Daily Bap",
  tagline: "Authentic Korean comfort food, freshly prepared and delivered across Guwahati.",
  shortTagline: "Korean Comfort Food. Made Fresh. Just For You.",
  description:
    "100% pre-order Korean cloud kitchen based in Guwahati, Assam. Every meal cooked specifically for your order — zero waste, maximum freshness.",
  contact: {
    whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "919999999999",
    instagram: "@daily.bap.guwahati",
    instagramUrl: "https://www.instagram.com/daily.bap.guwahati/",
    city: "Guwahati, Assam",
  },
  model: "100% Pre-Order",
  cta: "Pre-Order Now",
  notice:
    "PRE-ORDER REQUIRED • DELIVERY CHARGES EXTRA • (V) VEGETARIAN • ALLERGIES? PLEASE INFORM US WHEN ORDERING",
} as const;

// ----------------------------------------------------------
// Our Story
// ----------------------------------------------------------
export const ourStory = {
  heading: "Our Story",
  subheading: "Trading late corporate nights for my true passion.",
  body: [
    "After many long night shifts analyzing data and mapping out solutions in the corporate world, I decided to follow my heart into the kitchen.",
    "Daily Bap was born from a deep love for cooking and a simple mission: to share authentic, vibrant comfort food with Guwahati.",
    "For me, the ultimate reward isn't found in a complex Excel Sheet, but in the genuine smile on your face when you enjoy our food.",
  ],
} as const;

// ----------------------------------------------------------
// Pre-Order Process Steps (4 steps)
// ----------------------------------------------------------
export const processSteps: ProcessStep[] = [
  {
    step: 1,
    label: "PRE-ORDER",
    description: "You place your order in advance.",
  },
  {
    step: 2,
    label: "FRESH INGREDIENTS",
    description: "We prepare your ingredients for the day's orders.",
  },
  {
    step: 3,
    label: "COOK TO ORDER",
    description: "Your meal is cooked specifically for your order.",
  },
  {
    step: 4,
    label: "DELIVER FRESH",
    description: "Fresh Korean comfort food arrives at your doorstep.",
  },
];

// ----------------------------------------------------------
// Why Pre-Order?
// ----------------------------------------------------------
export const whyPreOrder = {
  heading: "WHY PRE-ORDER?",
  subheading: "Less Waste. More Freshness.",
  body: "We don't cook large batches and wait for them to sell. Every Bap is made specifically for an order helping us reduce waste while giving you a fresher meal.",
} as const;

// ----------------------------------------------------------
// Food Principles (Our Food Principles)
// ----------------------------------------------------------
export const foodPrinciples: FoodPrinciple[] = [
  {
    id: 1,
    label: "Real Gochujang & Toasted Sesame Oil",
    description:
      "We never compromise on authentic Korean condiments — real gochujang and freshly toasted sesame oil in every dish.",
  },
  {
    id: 2,
    label: "6+ Seasonal Vegetables Daily",
    description:
      "Six or more seasonal vegetables prepared fresh every single day — no frozen shortcuts.",
  },
  {
    id: 3,
    label: "Authentic Sticky Short-Grain Rice",
    description:
      "We use authentic sticky, short-grain rice that's the true foundation of every Korean meal.",
  },
  {
    id: 4,
    label: "Perfect Balance in Every Bowl",
    description:
      "The perfect mix of protein, carbs, and veggies — crafted so every bite is complete.",
  },
];

// ----------------------------------------------------------
// Menu Data
// ----------------------------------------------------------

export const bentoBoxes: MenuItem[] = [
  {
    id: "kfc-bento",
    name: "Korean Fried Chicken Bento",
    category: "bento",
    price: 299,
    description:
      "Crispy double-fried chicken coated in our sweet & spicy glaze, served with fresh house-made kimchi.",
    tags: ["bestseller"],
    modelRef: "bowl-chicken",
  },
  {
    id: "tofu-paneer-bento",
    name: "Golden Tofu / Paneer Bento",
    category: "bento",
    price: 299,
    description:
      "Crisp tofu or soft paneer glazed in our signature sweet-soy sauce, served with wok-tossed seasonal greens.",
    tags: ["vegetarian"],
    modelRef: "bowl-tofu",
    isVegetarian: true,
  },
];

export const bibimbapBowls: MenuItem[] = [
  {
    id: "chicken-bulgogi-bowl",
    name: "Chicken Bulgogi Bowl",
    category: "bibimbap",
    price: 299,
    description:
      "Tender chicken marinated in a savoury-sweet soy & garlic blend, served with Korean-style rice, vegetables and our signature gochujang.",
    tags: ["popular"],
    modelRef: "bowl-bulgogi",
  },
  {
    id: "golden-tofu-bowl",
    name: "Golden Tofu Bowl",
    category: "bibimbap",
    price: 299,
    description:
      "Crispy golden pan-fried tofu paired with Korean-style rice, seasonal vegetables and our signature gochujang.",
    tags: ["vegetarian"],
    modelRef: "bowl-golden-tofu",
    isVegetarian: true,
  },
];

export const authenticSides: MenuItem[] = [
  {
    id: "kimchi",
    name: "House-Made Kimchi (100g)",
    category: "sides",
    price: 100,
    description: "Fresh, spicy, and fermented to perfection.",
    tags: ["vegan"],
    modelRef: null,
    isVegetarian: true,
  },
  {
    id: "cucumber-salad",
    name: "Spicy Cucumber Salad",
    category: "sides",
    price: 80,
    description: "Crunchy cucumbers tossed in chili and sesame oil.",
    tags: ["vegan"],
    modelRef: null,
    isVegetarian: true,
  },
  {
    id: "pickled-radish",
    name: "Sweet & Sour Pickled Radish",
    category: "sides",
    price: 60,
    description: "The perfect crunch to cut through rich flavors.",
    tags: ["vegan"],
    modelRef: null,
    isVegetarian: true,
  },
];

export const addOns: MenuItem[] = [
  {
    id: "extra-egg",
    name: "Extra Fried Egg",
    category: "addons",
    price: 30,
    description: "A perfectly fried egg on top — because more is more.",
    tags: ["vegetarian"],
    modelRef: null,
    isVegetarian: true,
  },
  {
    id: "extra-rice",
    name: "Extra Premium Sticky Rice",
    category: "addons",
    price: 60,
    description: "Authentic short-grain sticky rice — the real deal.",
    tags: ["vegan"],
    modelRef: null,
    isVegetarian: true,
  },
  {
    id: "double-protein",
    name: "Double Protein (Chicken or Tofu)",
    category: "addons",
    price: 100,
    description: "Double the protein, double the satisfaction.",
    tags: [],
    modelRef: null,
  },
  {
    id: "gochujang-sauce",
    name: "Signature Gochujang Sauce (50ml)",
    category: "addons",
    price: 40,
    description: "Our house-made signature gochujang — bold, spicy, smoky.",
    tags: ["vegan"],
    modelRef: null,
    isVegetarian: true,
  },
  {
    id: "gochujang-mayo",
    name: "Spicy Gochujang Mayo (50ml)",
    category: "addons",
    price: 40,
    description: "Gochujang meets creamy mayo — the sauce you'll put on everything.",
    tags: ["vegetarian"],
    modelRef: null,
    isVegetarian: true,
  },
];

// Unified menu export for easy iteration
export const menuData = {
  bentoBoxes,
  bibimbapBowls,
  authenticSides,
  addOns,
};

// Menu category labels for tabs
export const menuCategories = [
  { key: "bentoBoxes", label: "Bento Boxes", emoji: "🍱" },
  { key: "bibimbapBowls", label: "Bibimbap Bowls", emoji: "🥣" },
  { key: "authenticSides", label: "Authentic Sides", emoji: "🥒" },
  { key: "addOns", label: "Add-Ons", emoji: "✨" },
] as const;

export type MenuCategoryKey = (typeof menuCategories)[number]["key"];

// ----------------------------------------------------------
// How To Eat A Bap (5-Step Ritual)
// ----------------------------------------------------------
export const howToEat: HowToEatStep[] = [
  {
    step: "01",
    heading: "OPEN THE BOX",
    body: "Take a moment. Admire the colours. You're about to make a mess.",
  },
  {
    step: "02",
    heading: "GET A LITTLE OF EVERYTHING",
    body: "Rice. Vegetables. Protein. Egg. Sauce. Don't be shy.",
  },
  {
    step: "03",
    heading: "MIX IT UP",
    body: "For Bibimbap, give everything a good mix and let the gochujang find its way through the bowl.",
  },
  {
    step: "04",
    heading: "TAKE THE FIRST BITE",
    body: "That's when it all comes together.",
  },
  {
    step: "05",
    heading: "ENJOY YOUR BAP",
    body: "No rules. No fancy techniques. JUST GOOD FOOD, ONE BITE AT A TIME.",
  },
];

// ----------------------------------------------------------
// Ready For Your Bap CTA Section
// ----------------------------------------------------------
export const readySection = {
  heading: "READY FOR YOUR BAP?",
  subheading: "Fresh Korean comfort food, prepared to order and delivered fresh in Guwahati.",
  tagline: "PRE-ORDER • COOK FRESH • ENJOY",
} as const;
