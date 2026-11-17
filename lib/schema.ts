// lib/schema.ts — Drizzle ORM Database Schema for Daily Bap (Neon Postgres)

import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  pgEnum,
  index,
  unique,
  serial,
  doublePrecision,
  check,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ----------------------------------------------------------
// Enums
// ----------------------------------------------------------
export const orderStatusEnum = pgEnum("order_status", [
  "draft",
  "pending",
  "confirmed",
  "preparing",
  "out_for_delivery",
  "delivered",
  "cancelled",
]);

export const offerTypeEnum = pgEnum("offer_type", [
  "PERCENT_OFF",
  "BOGO",
  "FREE_MEAL",
  "FREE_SIDE",
]);

export const campaignStatusEnum = pgEnum("campaign_status", [
  "ACTIVE",
  "DEPLETED",
]);

export const claimStatusEnum = pgEnum("claim_status", [
  "HELD",
  "REDEEMED",
  "RELEASED",
  "EXPIRED",
]);

// ----------------------------------------------------------
// Users Table
// ----------------------------------------------------------
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ----------------------------------------------------------
// Influencers Table
// ----------------------------------------------------------
export const influencers = pgTable("influencers", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  instagramHandle: text("instagram_handle"),
  phoneOrUpi: text("phone_or_upi"),
  code: text("code").notNull().unique(),
  discountPercent: integer("discount_percent").default(10).notNull(),
  commissionPercent: integer("commission_percent").default(10).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ----------------------------------------------------------
// Orders Table
// ----------------------------------------------------------
export const orders = pgTable(
  "orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderNumber: text("order_number"),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    // JSONB column stores the full cart item array
    items: jsonb("items").notNull(),
    // Stored in paise (₹299 = 29900) for precision, or just rupees as integer
    totalAmount: integer("total_amount").notNull(), // in ₹
    deliveryFee: integer("delivery_fee").notNull().default(50), // in ₹
    deliveryAddress: text("delivery_address").notNull(),
    requestedDeliveryTime: timestamp("requested_delivery_time"),
    deliverySlotLabel: text("delivery_slot_label"),
    status: orderStatusEnum("status").notNull().default("draft"),
    whatsappSent: text("whatsapp_sent").default("no"),
    // Coupon & Influencer fields (additive)
    couponCode: text("coupon_code"),
    influencerId: uuid("influencer_id").references(() => influencers.id),
    discountAmount: integer("discount_amount").default(0).notNull(),
    commissionAmount: integer("commission_amount").default(0).notNull(),
    commissionPaid: boolean("commission_paid").default(false).notNull(),
    commissionPaidAt: timestamp("commission_paid_at"),
    // Additive QR Treasure Hunt claim reference (lazy resolved to avoid circular dependency)
    huntClaimId: integer("hunt_claim_id").references((): AnyPgColumn => codeClaims.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_orders_created_at").on(table.createdAt),
    index("idx_orders_influencer_id").on(table.influencerId),
    index("idx_orders_hunt_claim_id").on(table.huntClaimId),
  ]
);

// ----------------------------------------------------------
// Offers Table
// ----------------------------------------------------------
export const offers = pgTable("offers", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  code: text("code").notNull(),
  isActive: boolean("is_active").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ----------------------------------------------------------
// Chat Sessions Table
// ----------------------------------------------------------
export const chatSessions = pgTable("chat_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userPhone: text("user_phone"),
  messages: jsonb("messages").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ----------------------------------------------------------
// Settings Table
// ----------------------------------------------------------
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ----------------------------------------------------------
// Campaign Codes Table (Treasure Hunt QR codes)
// ----------------------------------------------------------
export const campaignCodes = pgTable(
  "campaign_codes",
  {
    id: serial("id").primaryKey(),
    code: text("code").notNull().unique(),
    offerType: offerTypeEnum("offer_type").notNull(),
    discountValue: integer("discount_value"),
    maxClaims: integer("max_claims").default(1).notNull(),
    currentClaims: integer("current_claims").default(0).notNull(),
    reservedCount: integer("reserved_count").default(0).notNull(),
    status: campaignStatusEnum("status").default("ACTIVE").notNull(),
    locationHint: text("location_hint"),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_campaign_codes_code").on(table.code),
    index("idx_campaign_codes_status").on(table.status),
    check("chk_campaign_codes_max_claims", sql`${table.maxClaims} >= 1`),
    check("chk_campaign_codes_current_claims", sql`${table.currentClaims} >= 0`),
    check("chk_campaign_codes_reserved_count", sql`${table.reservedCount} >= 0`),
    check(
      "chk_campaign_codes_claims_limit",
      sql`${table.currentClaims} + ${table.reservedCount} <= ${table.maxClaims}`
    ),
    check(
      "chk_campaign_codes_percent_discount",
      sql`(${table.offerType} = 'PERCENT_OFF' AND ${table.discountValue} IS NOT NULL AND ${table.discountValue} BETWEEN 1 AND 100) OR (${table.offerType} != 'PERCENT_OFF' AND ${table.discountValue} IS NULL)`
    ),
  ]
);

// ----------------------------------------------------------
// Code Claims Table (Vouchers reserved / redeemed by devices)
// ----------------------------------------------------------
export const codeClaims = pgTable(
  "code_claims",
  {
    id: serial("id").primaryKey(),
    codeId: integer("code_id")
      .notNull()
      .references(() => campaignCodes.id, { onDelete: "cascade" }),
    deviceId: text("device_id").notNull(),
    voucherCode: text("voucher_code").notNull().unique(),
    status: claimStatusEnum("status").default("HELD").notNull(),
    heldAt: timestamp("held_at", { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    redeemedAt: timestamp("redeemed_at", { withTimezone: true }),
    orderId: uuid("order_id").references((): AnyPgColumn => orders.id, {
      onDelete: "set null",
    }),
    customerPhone: text("customer_phone"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("uq_code_claims_code_device").on(table.codeId, table.deviceId),
    index("idx_code_claims_voucher_code").on(table.voucherCode),
    index("idx_code_claims_status_expires").on(table.status, table.expiresAt),
    index("idx_code_claims_order_id").on(table.orderId),
  ]
);

// ----------------------------------------------------------
// Inferred Types
// ----------------------------------------------------------
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Influencer = typeof influencers.$inferSelect;
export type NewInfluencer = typeof influencers.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type Offer = typeof offers.$inferSelect;
export type NewOffer = typeof offers.$inferInsert;
export type ChatSession = typeof chatSessions.$inferSelect;
export type NewChatSession = typeof chatSessions.$inferInsert;
export type Setting = typeof settings.$inferSelect;
export type NewSetting = typeof settings.$inferInsert;
export type CampaignCode = typeof campaignCodes.$inferSelect;
export type NewCampaignCode = typeof campaignCodes.$inferInsert;
export type CodeClaim = typeof codeClaims.$inferSelect;
export type NewCodeClaim = typeof codeClaims.$inferInsert;


