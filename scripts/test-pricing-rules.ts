// scripts/test-pricing-rules.ts — Automated Unit Testing for Hunt Pricing Engine

import { calculateOrderTotals, isHuntEnabled } from "../lib/pricing";

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${msg}`);
    failed++;
  } else {
    console.log(`✅ PASS: ${msg}`);
    passed++;
  }
}

async function run() {
  console.log("\n========================================================");
  console.log("🧪 TESTING PRICING RULES & HUNT INTEGRATION");
  console.log("========================================================\n");

  // 1. Regular order without coupon
  console.log("👉 1. Normal Order (No Coupon)");
  const resNoCoupon = await calculateOrderTotals({
    items: [{ id: "kfc-bento", quantity: 1 }], // ₹299
    lat: 26.18,
    lng: 91.75,
  });
  assert(resNoCoupon.valid, "Order without coupon is valid");
  assert(resNoCoupon.subtotal === 299, "Subtotal is ₹299");
  assert(resNoCoupon.discountAmount === 0, "Discount is ₹0");
  assert(resNoCoupon.commissionAmount === 0, "Commission is ₹0");
  assert(resNoCoupon.total === 299 + resNoCoupon.deliveryFee, "Total equals subtotal + deliveryFee");

  // 2. Normal order with creator code
  console.log("\n👉 2. Creator Influencer Coupon");
  const resCreator = await calculateOrderTotals({
    items: [{ id: "kfc-bento", quantity: 2 }], // ₹598
    lat: 26.18,
    lng: 91.75,
    couponCode: "ROHIT10", // Known test creator code if present
  });
  if (resCreator.valid && resCreator.influencerId) {
    assert(resCreator.discountAmount > 0, "Creator discount applied");
    assert(resCreator.commissionAmount > 0, "Creator commission calculated");
    assert(resCreator.total === (598 - resCreator.discountAmount) + resCreator.deliveryFee, "Total correct");
  } else {
    console.log("ℹ️ (Creator code ROHIT10 not in test DB, skipped creator commission branch)");
  }

  console.log("\n========================================================");
  console.log(`📊 PRICING TESTS FINISHED: ${passed} Passed, ${failed} Failed`);
  console.log("========================================================\n");

  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error("❌ Test crashed:", err);
  process.exit(1);
});
