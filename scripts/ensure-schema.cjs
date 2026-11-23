// scripts/ensure-schema.cjs
// Idempotent, additive-only schema migration.
// Runs at build time (before `next build`) using whatever DATABASE_URL is set.
// Every statement uses IF NOT EXISTS / ON CONFLICT DO NOTHING — safe to re-run.

const { neon } = require("@neondatabase/serverless");

// In local/CI: load .env.local if DATABASE_URL isn't already set (Vercel injects it at build time)
if (!process.env.DATABASE_URL) {
  try { require("dotenv").config({ path: ".env.local" }); } catch { /* dotenv is devDep */ }
}

if (!process.env.DATABASE_URL) {
  console.warn("[ensure-schema] DATABASE_URL not set, skipping schema check.");
  process.exit(0);
}

const sql = neon(process.env.DATABASE_URL);

async function run() {
  const t0 = Date.now();
  console.log("[ensure-schema] Verifying production schema matches lib/schema.ts ...");

  // ── 1. Enums ──────────────────────────────────────────────
  await sql`DO $$ BEGIN
    CREATE TYPE "public"."order_status" AS ENUM(
      'draft','pending','confirmed','preparing',
      'out_for_delivery','delivered','cancelled'
    );
  EXCEPTION WHEN duplicate_object THEN null;
  END $$`;

  await sql`DO $$ BEGIN
    ALTER TYPE "public"."order_status" ADD VALUE IF NOT EXISTS 'draft' BEFORE 'pending';
  EXCEPTION WHEN duplicate_object THEN null;
  END $$`;

  await sql`DO $$ BEGIN
    CREATE TYPE "public"."offer_type" AS ENUM('PERCENT_OFF','BOGO','FREE_MEAL','FREE_SIDE');
  EXCEPTION WHEN duplicate_object THEN null;
  END $$`;

  await sql`DO $$ BEGIN
    CREATE TYPE "public"."campaign_status" AS ENUM('ACTIVE','DEPLETED');
  EXCEPTION WHEN duplicate_object THEN null;
  END $$`;

  await sql`DO $$ BEGIN
    CREATE TYPE "public"."claim_status" AS ENUM('HELD','REDEEMED','RELEASED','EXPIRED');
  EXCEPTION WHEN duplicate_object THEN null;
  END $$`;

  // ── 2. Tables ─────────────────────────────────────────────
  await sql`CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "name" text NOT NULL,
    "phone" text NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "users_phone_unique" UNIQUE("phone")
  )`;

  await sql`CREATE TABLE IF NOT EXISTS "public"."influencers" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "name" text NOT NULL,
    "instagram_handle" text,
    "phone_or_upi" text,
    "code" text NOT NULL,
    "discount_percent" integer DEFAULT 10 NOT NULL,
    "commission_percent" integer DEFAULT 10 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "notes" text,
    "created_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "influencers_code_unique" UNIQUE("code")
  )`;

  await sql`CREATE TABLE IF NOT EXISTS "public"."offers" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "title" text NOT NULL,
    "code" text NOT NULL,
    "is_active" boolean DEFAULT false NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL
  )`;

  await sql`CREATE TABLE IF NOT EXISTS "public"."settings" (
    "key" text PRIMARY KEY NOT NULL,
    "value" text NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
  )`;

  await sql`CREATE TABLE IF NOT EXISTS "public"."campaign_codes" (
    "id" serial PRIMARY KEY NOT NULL,
    "code" text NOT NULL,
    "offer_type" "public"."offer_type" NOT NULL,
    "discount_value" integer,
    "max_claims" integer DEFAULT 1 NOT NULL,
    "current_claims" integer DEFAULT 0 NOT NULL,
    "reserved_count" integer DEFAULT 0 NOT NULL,
    "status" "public"."campaign_status" DEFAULT 'ACTIVE' NOT NULL,
    "location_hint" text,
    "lat" double precision,
    "lng" double precision,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "campaign_codes_code_unique" UNIQUE("code"),
    CONSTRAINT "chk_campaign_codes_max_claims" CHECK ("max_claims" >= 1),
    CONSTRAINT "chk_campaign_codes_current_claims" CHECK ("current_claims" >= 0),
    CONSTRAINT "chk_campaign_codes_reserved_count" CHECK ("reserved_count" >= 0),
    CONSTRAINT "chk_campaign_codes_claims_limit"
      CHECK ("current_claims" + "reserved_count" <= "max_claims"),
    CONSTRAINT "chk_campaign_codes_percent_discount" CHECK (
      ("offer_type" = 'PERCENT_OFF'
        AND "discount_value" IS NOT NULL
        AND "discount_value" BETWEEN 1 AND 100)
      OR ("offer_type" != 'PERCENT_OFF' AND "discount_value" IS NULL)
    )
  )`;

  await sql`CREATE TABLE IF NOT EXISTS "public"."code_claims" (
    "id" serial PRIMARY KEY NOT NULL,
    "code_id" integer NOT NULL,
    "device_id" text NOT NULL,
    "voucher_code" text NOT NULL,
    "status" "public"."claim_status" DEFAULT 'HELD' NOT NULL,
    "held_at" timestamp with time zone DEFAULT now() NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "redeemed_at" timestamp with time zone,
    "order_id" uuid,
    "customer_phone" text,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "code_claims_voucher_code_unique" UNIQUE("voucher_code"),
    CONSTRAINT "uq_code_claims_code_device" UNIQUE("code_id","device_id")
  )`;

  // ── 3. Additive columns on orders ─────────────────────────
  const addCols = [
    `ADD COLUMN IF NOT EXISTS "requested_delivery_time" timestamp`,
    `ADD COLUMN IF NOT EXISTS "delivery_slot_label" text`,
    `ADD COLUMN IF NOT EXISTS "order_number" text`,
    `ADD COLUMN IF NOT EXISTS "coupon_code" text`,
    `ADD COLUMN IF NOT EXISTS "influencer_id" uuid`,
    `ADD COLUMN IF NOT EXISTS "discount_amount" integer NOT NULL DEFAULT 0`,
    `ADD COLUMN IF NOT EXISTS "commission_amount" integer NOT NULL DEFAULT 0`,
    `ADD COLUMN IF NOT EXISTS "commission_paid" boolean NOT NULL DEFAULT false`,
    `ADD COLUMN IF NOT EXISTS "commission_paid_at" timestamp`,
    `ADD COLUMN IF NOT EXISTS "hunt_claim_id" integer`,
  ];
  for (const col of addCols) {
    await sql.query(`ALTER TABLE "public"."orders" ${col}`);
  }

  // ── 4. Foreign keys ───────────────────────────────────────
  const fks = [
    {
      name: "orders_user_id_users_id_fk",
      table: "orders",
      sql: `FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action`,
    },
    {
      name: "orders_influencer_id_influencers_id_fk",
      table: "orders",
      sql: `FOREIGN KEY ("influencer_id") REFERENCES "public"."influencers"("id") ON DELETE no action ON UPDATE no action`,
    },
    {
      name: "orders_hunt_claim_id_code_claims_id_fk",
      table: "orders",
      sql: `FOREIGN KEY ("hunt_claim_id") REFERENCES "public"."code_claims"("id") ON DELETE set null ON UPDATE no action`,
    },
    {
      name: "code_claims_code_id_campaign_codes_id_fk",
      table: "code_claims",
      sql: `FOREIGN KEY ("code_id") REFERENCES "public"."campaign_codes"("id") ON DELETE cascade ON UPDATE no action`,
    },
    {
      name: "code_claims_order_id_orders_id_fk",
      table: "code_claims",
      sql: `FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action`,
    },
  ];
  for (const fk of fks) {
    await sql.query(`
      DO $$ BEGIN
        ALTER TABLE "public"."${fk.table}" ADD CONSTRAINT "${fk.name}" ${fk.sql};
      EXCEPTION WHEN duplicate_object THEN null;
      END $$
    `);
  }

  // ── 5. Indexes ────────────────────────────────────────────
  await sql`CREATE INDEX IF NOT EXISTS "idx_orders_created_at" ON "public"."orders" USING btree ("created_at")`;
  await sql`CREATE INDEX IF NOT EXISTS "idx_orders_influencer_id" ON "public"."orders" USING btree ("influencer_id")`;
  await sql`CREATE INDEX IF NOT EXISTS "idx_orders_hunt_claim_id" ON "public"."orders" USING btree ("hunt_claim_id")`;
  await sql`CREATE INDEX IF NOT EXISTS "idx_campaign_codes_code" ON "public"."campaign_codes" USING btree ("code")`;
  await sql`CREATE INDEX IF NOT EXISTS "idx_campaign_codes_status" ON "public"."campaign_codes" USING btree ("status")`;
  await sql`CREATE INDEX IF NOT EXISTS "idx_code_claims_voucher_code" ON "public"."code_claims" USING btree ("voucher_code")`;
  await sql`CREATE INDEX IF NOT EXISTS "idx_code_claims_status_expires" ON "public"."code_claims" USING btree ("status", "expires_at")`;
  await sql`CREATE INDEX IF NOT EXISTS "idx_code_claims_order_id" ON "public"."code_claims" USING btree ("order_id")`;

  // ── 6. Unique constraints ─────────────────────────────────
  await sql`DO $$ BEGIN
    ALTER TABLE "public"."orders" ADD CONSTRAINT "idx_orders_order_number_unique" UNIQUE ("order_number");
  EXCEPTION WHEN duplicate_object THEN null;
            WHEN duplicate_table THEN null;
  END $$`;

  await sql`CREATE UNIQUE INDEX IF NOT EXISTS "uq_code_claims_redeemed_phone"
    ON "public"."code_claims" ("code_id", "customer_phone")
    WHERE "status" = 'REDEEMED'`;

  // ── 7. Seed MOSHPIT10 influencer ──────────────────────────
  await sql`INSERT INTO "public"."influencers" ("id", "name", "code", "discount_percent", "commission_percent", "is_active")
    VALUES ('926a2564-b6fb-4b59-9185-e012dc494a5d', 'Moshpit Influencer', 'MOSHPIT10', 10, 10, true)
    ON CONFLICT ("code") DO NOTHING`;

  // ── 8. Seed default settings ──────────────────────────────
  await sql`INSERT INTO "public"."settings" ("key", "value", "updated_at")
    VALUES ('hunt_enabled', 'false', NOW())
    ON CONFLICT ("key") DO NOTHING`;

  // ── 9. Verify ─────────────────────────────────────────────
  const cols = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders'
    ORDER BY ordinal_position
  `;
  const colNames = cols.map((c) => c.column_name);
  const expected = [
    "id", "user_id", "items", "total_amount", "delivery_fee",
    "delivery_address", "status", "whatsapp_sent", "created_at",
    "requested_delivery_time", "delivery_slot_label", "order_number",
    "coupon_code", "influencer_id", "discount_amount", "commission_amount",
    "commission_paid", "commission_paid_at", "hunt_claim_id",
  ];
  const missing = expected.filter((e) => !colNames.includes(e));
  if (missing.length > 0) {
    console.error(`[ensure-schema] FATAL: columns still missing after migration: ${missing.join(", ")}`);
    process.exit(1);
  }

  console.log(`[ensure-schema] ✅ Schema verified (${cols.length} columns on orders, all expected present) in ${Date.now() - t0}ms`);
}

run().catch((err) => {
  console.error("[ensure-schema] Migration failed:", err);
  process.exit(1);
});
