const { neon } = require("@neondatabase/serverless");
require("dotenv").config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);

async function run() {
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS requested_delivery_time TIMESTAMP;`;
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_slot_label TEXT;`;
  console.log("✅ DB migration successful: added requested_delivery_time and delivery_slot_label.");
}

run().catch((err) => {
  console.error("❌ Migration error:", err);
  process.exit(1);
});
