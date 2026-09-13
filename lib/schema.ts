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
} from "drizzle-orm/pg-core";

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
// Orders Table
// ----------------------------------------------------------
export const orders = pgTable("orders", {
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

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
// Inferred Types
// ----------------------------------------------------------
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type Offer = typeof offers.$inferSelect;
export type NewOffer = typeof offers.$inferInsert;
export type ChatSession = typeof chatSessions.$inferSelect;
export type NewChatSession = typeof chatSessions.$inferInsert;
export type Setting = typeof settings.$inferSelect;
export type NewSetting = typeof settings.$inferInsert;

