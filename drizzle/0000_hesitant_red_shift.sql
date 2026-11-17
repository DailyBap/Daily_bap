CREATE TYPE "public"."campaign_status" AS ENUM('ACTIVE', 'DEPLETED');--> statement-breakpoint
CREATE TYPE "public"."claim_status" AS ENUM('HELD', 'REDEEMED', 'RELEASED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."offer_type" AS ENUM('PERCENT_OFF', 'BOGO', 'FREE_MEAL', 'FREE_SIDE');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('draft', 'pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled');--> statement-breakpoint
CREATE TABLE "campaign_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"offer_type" "offer_type" NOT NULL,
	"discount_value" integer,
	"max_claims" integer DEFAULT 1 NOT NULL,
	"current_claims" integer DEFAULT 0 NOT NULL,
	"reserved_count" integer DEFAULT 0 NOT NULL,
	"status" "campaign_status" DEFAULT 'ACTIVE' NOT NULL,
	"location_hint" text,
	"lat" double precision,
	"lng" double precision,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campaign_codes_code_unique" UNIQUE("code"),
	CONSTRAINT "chk_campaign_codes_max_claims" CHECK ("campaign_codes"."max_claims" >= 1),
	CONSTRAINT "chk_campaign_codes_current_claims" CHECK ("campaign_codes"."current_claims" >= 0),
	CONSTRAINT "chk_campaign_codes_reserved_count" CHECK ("campaign_codes"."reserved_count" >= 0),
	CONSTRAINT "chk_campaign_codes_claims_limit" CHECK ("campaign_codes"."current_claims" + "campaign_codes"."reserved_count" <= "campaign_codes"."max_claims"),
	CONSTRAINT "chk_campaign_codes_percent_discount" CHECK (("campaign_codes"."offer_type" = 'PERCENT_OFF' AND "campaign_codes"."discount_value" IS NOT NULL AND "campaign_codes"."discount_value" BETWEEN 1 AND 100) OR ("campaign_codes"."offer_type" != 'PERCENT_OFF' AND "campaign_codes"."discount_value" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "chat_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_phone" text,
	"messages" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "code_claims" (
	"id" serial PRIMARY KEY NOT NULL,
	"code_id" integer NOT NULL,
	"device_id" text NOT NULL,
	"voucher_code" text NOT NULL,
	"status" "claim_status" DEFAULT 'HELD' NOT NULL,
	"held_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"redeemed_at" timestamp with time zone,
	"order_id" uuid,
	"customer_phone" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "code_claims_voucher_code_unique" UNIQUE("voucher_code"),
	CONSTRAINT "uq_code_claims_code_device" UNIQUE("code_id","device_id")
);
--> statement-breakpoint
CREATE TABLE "influencers" (
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
);
--> statement-breakpoint
CREATE TABLE "offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"code" text NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_number" text,
	"user_id" uuid NOT NULL,
	"items" jsonb NOT NULL,
	"total_amount" integer NOT NULL,
	"delivery_fee" integer DEFAULT 50 NOT NULL,
	"delivery_address" text NOT NULL,
	"requested_delivery_time" timestamp,
	"delivery_slot_label" text,
	"status" "order_status" DEFAULT 'draft' NOT NULL,
	"whatsapp_sent" text DEFAULT 'no',
	"coupon_code" text,
	"influencer_id" uuid,
	"discount_amount" integer DEFAULT 0 NOT NULL,
	"commission_amount" integer DEFAULT 0 NOT NULL,
	"commission_paid" boolean DEFAULT false NOT NULL,
	"commission_paid_at" timestamp,
	"hunt_claim_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
ALTER TABLE "code_claims" ADD CONSTRAINT "code_claims_code_id_campaign_codes_id_fk" FOREIGN KEY ("code_id") REFERENCES "public"."campaign_codes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "code_claims" ADD CONSTRAINT "code_claims_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_influencer_id_influencers_id_fk" FOREIGN KEY ("influencer_id") REFERENCES "public"."influencers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_hunt_claim_id_code_claims_id_fk" FOREIGN KEY ("hunt_claim_id") REFERENCES "public"."code_claims"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_campaign_codes_code" ON "campaign_codes" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_campaign_codes_status" ON "campaign_codes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_code_claims_voucher_code" ON "code_claims" USING btree ("voucher_code");--> statement-breakpoint
CREATE INDEX "idx_code_claims_status_expires" ON "code_claims" USING btree ("status","expires_at");--> statement-breakpoint
CREATE INDEX "idx_code_claims_order_id" ON "code_claims" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_orders_created_at" ON "orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_orders_influencer_id" ON "orders" USING btree ("influencer_id");--> statement-breakpoint
CREATE INDEX "idx_orders_hunt_claim_id" ON "orders" USING btree ("hunt_claim_id");