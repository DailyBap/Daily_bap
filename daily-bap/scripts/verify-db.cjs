const { neon } = require("@neondatabase/serverless");
require("dotenv").config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);

async function check() {
  const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`;
  console.log("✅ Tables in Neon DB:");
  tables.forEach((t) => console.log("  ✓", t.table_name));

  const enums = await sql`SELECT typname FROM pg_type WHERE typtype = 'e'`;
  console.log("✅ Enums:");
  enums.forEach((e) => console.log("  ✓", e.typname));

  console.log("\n🎉 Database is live and ready!");
}

check().catch((err) => {
  console.error("❌ DB error:", err.message);
  process.exit(1);
});
