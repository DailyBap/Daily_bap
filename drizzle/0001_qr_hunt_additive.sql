-- ============================================================
-- Daily Bap — QR Treasure Hunt (Additive Migration for Neon)
-- Target: Neon Postgres (development branch / production)
-- ============================================================

-- 1. Create Enums if they do not exist
DO $$ BEGIN
  CREATE TYPE "public"."offer_type" AS ENUM('PERCENT_OFF', 'BOGO', 'FREE_MEAL', 'FREE_SIDE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."campaign_status" AS ENUM('ACTIVE', 'DEPLETED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."claim_status" AS ENUM('HELD', 'REDEEMED', 'RELEASED', 'EXPIRED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Create campaign_codes table
CREATE TABLE IF NOT EXISTS "public"."campaign_codes" (
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
  CONSTRAINT "chk_campaign_codes_claims_limit" CHECK ("current_claims" + "reserved_count" <= "max_claims"),
  CONSTRAINT "chk_campaign_codes_percent_discount" CHECK (
    ("offer_type" = 'PERCENT_OFF' AND "discount_value" IS NOT NULL AND "discount_value" BETWEEN 1 AND 100)
    OR ("offer_type" != 'PERCENT_OFF' AND "discount_value" IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS "idx_campaign_codes_code" ON "public"."campaign_codes" USING btree ("code");
CREATE INDEX IF NOT EXISTS "idx_campaign_codes_status" ON "public"."campaign_codes" USING btree ("status");

-- 3. Create code_claims table
CREATE TABLE IF NOT EXISTS "public"."code_claims" (
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
  CONSTRAINT "uq_code_claims_code_device" UNIQUE("code_id", "device_id"),
  CONSTRAINT "code_claims_code_id_campaign_codes_id_fk" FOREIGN KEY ("code_id") REFERENCES "public"."campaign_codes"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "code_claims_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action
);

CREATE INDEX IF NOT EXISTS "idx_code_claims_voucher_code" ON "public"."code_claims" USING btree ("voucher_code");
CREATE INDEX IF NOT EXISTS "idx_code_claims_status_expires" ON "public"."code_claims" USING btree ("status", "expires_at");
CREATE INDEX IF NOT EXISTS "idx_code_claims_order_id" ON "public"."code_claims" USING btree ("order_id");

-- Partial unique index: one redeemed voucher per code per customer phone
CREATE UNIQUE INDEX IF NOT EXISTS "uq_code_claims_redeemed_phone"
  ON "public"."code_claims" ("code_id", "customer_phone")
  WHERE "status" = 'REDEEMED';

-- 4. Add hunt_claim_id to orders table
ALTER TABLE "public"."orders"
  ADD COLUMN IF NOT EXISTS "hunt_claim_id" integer;

DO $$ BEGIN
  ALTER TABLE "public"."orders"
    ADD CONSTRAINT "orders_hunt_claim_id_code_claims_id_fk"
    FOREIGN KEY ("hunt_claim_id") REFERENCES "public"."code_claims"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "idx_orders_hunt_claim_id" ON "public"."orders" USING btree ("hunt_claim_id");

-- 5. Seed default feature flag in settings table
INSERT INTO "public"."settings" ("key", "value", "updated_at")
VALUES ('hunt_enabled', 'false', NOW())
ON CONFLICT ("key") DO NOTHING;
