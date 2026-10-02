const { neon } = require("@neondatabase/serverless");
require("dotenv").config({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL is not defined in .env.local");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

async function run() {
  console.log("🚀 Running additive database migration on configured DATABASE_URL...");

  await sql.transaction([
    sql`ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'draft'`,
    sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS requested_delivery_time TIMESTAMP`,
    sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_slot_label TEXT`,
    sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number TEXT`,
    sql`
      CREATE TABLE IF NOT EXISTS offers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        code TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `,
    sql`
      CREATE TABLE IF NOT EXISTS influencers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        instagram_handle TEXT,
        phone_or_upi TEXT,
        code TEXT NOT NULL UNIQUE CHECK (code = upper(code)),
        discount_percent INTEGER NOT NULL DEFAULT 10 CHECK (discount_percent >= 0 AND discount_percent <= 100),
        commission_percent INTEGER NOT NULL DEFAULT 10 CHECK (commission_percent >= 0 AND commission_percent <= 100),
        is_active BOOLEAN NOT NULL DEFAULT true,
        notes TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `,
    sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code TEXT`,
    sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS influencer_id UUID REFERENCES influencers(id)`,
    sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount INTEGER NOT NULL DEFAULT 0`,
    sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS commission_amount INTEGER NOT NULL DEFAULT 0`,
    sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS commission_paid BOOLEAN NOT NULL DEFAULT false`,
    sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS commission_paid_at TIMESTAMP`,
    sql`CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at)`,
    sql`CREATE INDEX IF NOT EXISTS idx_orders_influencer_id ON orders(influencer_id)`
  ]);

  console.log("✅ Single-transaction DB migration successful: added influencers table, CHECK constraints, coupon columns, and indexes.");
}

run().catch((err) => {
  console.error("❌ Migration error:", err);
  process.exit(1);
});


