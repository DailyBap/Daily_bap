const { neon } = require("@neondatabase/serverless");
require("dotenv").config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);

async function run() {
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS requested_delivery_time TIMESTAMP;`;
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_slot_label TEXT;`;
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number TEXT;`;
  await sql`
    CREATE TABLE IF NOT EXISTS offers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT NOT NULL,
      code TEXT NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `;
  console.log("✅ DB migration successful: added order_number and offers table.");
}

run().catch((err) => {
  console.error("❌ Migration error:", err);
  process.exit(1);
});
