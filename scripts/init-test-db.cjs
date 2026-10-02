// scripts/init-test-db.cjs — Ensure all required DB tables exist on test database
const { neon } = require("@neondatabase/serverless");
require("dotenv").config({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL is not defined in .env.local");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

async function init() {
  console.log("🚀 Initializing test database tables on configured DATABASE_URL...");

  await sql`
    DO $$ BEGIN
      CREATE TYPE order_status AS ENUM ('draft', 'pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      phone TEXT NOT NULL UNIQUE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS chat_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_phone TEXT,
      messages JSONB NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS offers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT NOT NULL,
      code TEXT NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `;

  await sql`
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
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_number TEXT,
      user_id UUID NOT NULL REFERENCES users(id),
      items JSONB NOT NULL,
      total_amount INTEGER NOT NULL,
      delivery_fee INTEGER NOT NULL DEFAULT 50,
      delivery_address TEXT NOT NULL,
      requested_delivery_time TIMESTAMP,
      delivery_slot_label TEXT,
      status order_status NOT NULL DEFAULT 'draft',
      whatsapp_sent TEXT DEFAULT 'no',
      coupon_code TEXT,
      influencer_id UUID REFERENCES influencers(id),
      discount_amount INTEGER NOT NULL DEFAULT 0,
      commission_amount INTEGER NOT NULL DEFAULT 0,
      commission_paid BOOLEAN NOT NULL DEFAULT false,
      commission_paid_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_orders_influencer_id ON orders(influencer_id);`;

  console.log("✅ All test database tables and indexes initialized successfully.");
}

init().catch((err) => {
  console.error("❌ DB setup error:", err);
  process.exit(1);
});
