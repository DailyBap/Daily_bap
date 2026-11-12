// scripts/verify-hunt.cjs — Comprehensive Automated Verification for QR Treasure Hunt
const { neon } = require("@neondatabase/serverless");
require("dotenv").config({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL is required in .env.local");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    testsFailed++;
  } else {
    console.log(`✅ PASS: ${message}`);
    testsPassed++;
  }
}

async function runTests() {
  console.log("\n========================================================");
  console.log("🧪 STARTING QR TREASURE HUNT AUTOMATED TEST SUITE");
  console.log("========================================================\n");

  // 0. Ensure schema exists on test DB
  console.log("📦 0. Verifying Database Schema...");
  await sql`
    DO $$ BEGIN
      CREATE TYPE offer_type AS ENUM ('PERCENT_OFF', 'BOGO', 'FREE_MEAL', 'FREE_SIDE');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `;
  await sql`
    DO $$ BEGIN
      CREATE TYPE campaign_status AS ENUM ('ACTIVE', 'DEPLETED');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `;
  await sql`
    DO $$ BEGIN
      CREATE TYPE claim_status AS ENUM ('HELD', 'REDEEMED', 'RELEASED', 'EXPIRED');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS campaign_codes (
      id SERIAL PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      offer_type offer_type NOT NULL,
      discount_value INTEGER,
      max_claims INTEGER NOT NULL DEFAULT 1,
      current_claims INTEGER NOT NULL DEFAULT 0,
      reserved_count INTEGER NOT NULL DEFAULT 0,
      status campaign_status NOT NULL DEFAULT 'ACTIVE',
      location_hint TEXT,
      lat DOUBLE PRECISION,
      lng DOUBLE PRECISION,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS code_claims (
      id SERIAL PRIMARY KEY,
      code_id INTEGER NOT NULL REFERENCES campaign_codes(id) ON DELETE CASCADE,
      device_id TEXT NOT NULL,
      voucher_code TEXT NOT NULL UNIQUE,
      status claim_status NOT NULL DEFAULT 'HELD',
      held_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL,
      redeemed_at TIMESTAMPTZ,
      order_id UUID,
      customer_phone TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT uq_code_claims_code_device_test UNIQUE (code_id, device_id)
    );
  `;
  await sql`
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS hunt_claim_id INTEGER;
  `;

  // Enable hunt feature flag for testing
  await sql`
    INSERT INTO settings (key, value, updated_at)
    VALUES ('hunt_enabled', 'true', NOW())
    ON CONFLICT (key) DO UPDATE SET value = 'true';
  `;

  // 1. CONCURRENCY TEST: Two simultaneous holds on 1-use code
  console.log("\n⚡ 1. Testing Concurrency: Dual simultaneous holds on 1-use code...");
  const testCode = `BAP-TEST-${Date.now()}`;
  const [createdCampaign] = await sql`
    INSERT INTO campaign_codes (code, offer_type, max_claims, current_claims, reserved_count, status)
    VALUES (${testCode}, 'PERCENT_OFF', 1, 0, 0, 'ACTIVE')
    RETURNING id;
  `;

  // Simulate two simultaneous users scanning at the same millisecond
  async function attemptHold(deviceId) {
    const inc = await sql`
      UPDATE campaign_codes
      SET reserved_count = reserved_count + 1
      WHERE id = ${createdCampaign.id}
        AND current_claims + reserved_count < max_claims
      RETURNING id;
    `;
    if (inc.length === 0) return { success: false, reason: "depleted" };

    const voucher = "V" + Math.random().toString(36).substring(2, 7).toUpperCase();
    const expiry = new Date(Date.now() + 60 * 60 * 1000);
    const [inserted] = await sql`
      INSERT INTO code_claims (code_id, device_id, voucher_code, status, expires_at)
      VALUES (${createdCampaign.id}, ${deviceId}, ${voucher}, 'HELD', ${expiry})
      RETURNING id, voucher_code;
    `;
    return { success: true, claimId: inserted.id, voucherCode: inserted.voucher_code };
  }

  const [res1, res2] = await Promise.all([
    attemptHold("device_alpha"),
    attemptHold("device_beta"),
  ]);

  const holdSuccessCount = (res1.success ? 1 : 0) + (res2.success ? 1 : 0);
  assert(
    holdSuccessCount === 1,
    `Exactly one simultaneous hold succeeded on 1-use code (Got: ${holdSuccessCount})`
  );

  const winningClaim = res1.success ? res1 : res2;

  // 2. CONCURRENCY TEST: Two simultaneous orders redeeming the same voucher
  console.log("\n⚡ 2. Testing Concurrency: Dual simultaneous order checkouts with the same voucher...");

  async function attemptRedeem(orderId, phone) {
    const redeemRes = await sql`
      UPDATE code_claims
      SET status = 'REDEEMED',
          order_id = ${orderId}::uuid,
          customer_phone = ${phone},
          redeemed_at = NOW()
      WHERE id = ${winningClaim.claimId}
        AND status = 'HELD'
        AND expires_at > NOW()
      RETURNING id, code_id;
    `;

    if (redeemRes.length === 0) return { success: false, reason: "HUNT_VOUCHER_EXPIRED" };

    await sql`
      UPDATE campaign_codes
      SET reserved_count = GREATEST(0, reserved_count - 1),
          current_claims = current_claims + 1,
          status = CASE WHEN current_claims + 1 >= max_claims THEN 'DEPLETED'::campaign_status ELSE status END
      WHERE id = ${redeemRes[0].code_id};
    `;
    return { success: true };
  }

  // Generate two test user orders
  const [fakeOrder1] = await sql`
    INSERT INTO orders (user_id, items, total_amount, delivery_fee, delivery_address, status)
    SELECT id, '[]'::jsonb, 349, 50, 'Guwahati Test Address 1', 'pending'
    FROM users LIMIT 1
    RETURNING id;
  `;
  const [fakeOrder2] = await sql`
    INSERT INTO orders (user_id, items, total_amount, delivery_fee, delivery_address, status)
    SELECT id, '[]'::jsonb, 349, 50, 'Guwahati Test Address 2', 'pending'
    FROM users LIMIT 1
    RETURNING id;
  `;

  const [redeem1, redeem2] = await Promise.all([
    attemptRedeem(fakeOrder1.id, "9876543210"),
    attemptRedeem(fakeOrder2.id, "9876543211"),
  ]);

  const redeemSuccessCount = (redeem1.success ? 1 : 0) + (redeem2.success ? 1 : 0);
  assert(
    redeemSuccessCount === 1,
    `Exactly one simultaneous order redemption succeeded on same voucher (Got: ${redeemSuccessCount})`
  );

  // Check that campaign status transitioned to DEPLETED
  const [campaignAfter] = await sql`
    SELECT current_claims, reserved_count, status
    FROM campaign_codes
    WHERE id = ${createdCampaign.id};
  `;
  assert(
    campaignAfter.current_claims === 1 && campaignAfter.status === "DEPLETED",
    `Campaign marked as DEPLETED with current_claims = 1 (Got claims=${campaignAfter.current_claims}, status=${campaignAfter.status})`
  );

  // 3. CANCEL ORDER & RESTORE CLAIM TEST
  console.log("\n🔄 3. Testing Order Cancellation & Capacity Restoration...");
  const releaseRes = await sql`
    UPDATE code_claims
    SET status = 'RELEASED'
    WHERE id = ${winningClaim.claimId}
      AND status = 'REDEEMED'
    RETURNING id, code_id;
  `;

  if (releaseRes.length > 0) {
    await sql`
      UPDATE campaign_codes
      SET current_claims = GREATEST(0, current_claims - 1),
          status = 'ACTIVE'::campaign_status
      WHERE id = ${createdCampaign.id};
    `;
  }

  const [campaignRestored] = await sql`
    SELECT current_claims, status
    FROM campaign_codes
    WHERE id = ${createdCampaign.id};
  `;
  assert(
    campaignRestored.current_claims === 0 && campaignRestored.status === "ACTIVE",
    `Order cancellation restored campaign to ACTIVE with claims = 0 (Got: claims=${campaignRestored.current_claims}, status=${campaignRestored.status})`
  );

  // 4. CLEANUP
  await sql`DELETE FROM campaign_codes WHERE id = ${createdCampaign.id};`;
  await sql`DELETE FROM orders WHERE id IN (${fakeOrder1.id}, ${fakeOrder2.id});`;

  console.log("\n========================================================");
  console.log(`📊 TEST RESULTS: ${testsPassed} Passed, ${testsFailed} Failed`);
  console.log("========================================================\n");

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("❌ Test error:", err);
  process.exit(1);
});
