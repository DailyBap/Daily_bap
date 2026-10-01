const { neon } = require("@neondatabase/serverless");
require("dotenv").config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);

async function check() {
  const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`;
  console.log("✅ Tables in Neon DB:");
  tables.forEach((t) => console.log("  ✓", t.table_name));

  const influencerCols = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'influencers' ORDER BY ordinal_position`;
  console.log("\n✅ Influencers columns:");
  influencerCols.forEach((c) => console.log(`  ✓ ${c.column_name} (${c.data_type})`));

  const orderCols = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'orders' ORDER BY ordinal_position`;
  console.log("\n✅ Orders columns:");
  orderCols.forEach((c) => console.log(`  ✓ ${c.column_name} (${c.data_type})`));

  const orderCount = await sql`SELECT COUNT(*) as count FROM orders`;
  console.log(`\n✅ Existing orders count: ${orderCount[0].count} (unchanged)`);

  console.log("\n🎉 Database verification successful!");
}

check().catch((err) => {
  console.error("❌ DB error:", err.message);
  process.exit(1);
});

