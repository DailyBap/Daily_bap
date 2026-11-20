// lib/hunt/claims.ts — Atomic Hold, Redemption, and Expiry Operations

import { db } from "@/lib/db";
import { campaignCodes, codeClaims, orders } from "@/lib/schema";
import { eq, and, sql, desc, inArray } from "drizzle-orm";
import { HUNT_CONFIG } from "./config";
import {
  generateVoucherCode,
  normalizeQrCode,
  extractVoucherCode,
  qrCodeSchema,
} from "./codes";

/**
 * Safely extracts rows array from Drizzle execute result,
 * handling both neon-http object shape ({ rows: [...] }) and raw array returns.
 */
function getRows<T = any>(res: any): T[] {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.rows)) return res.rows;
  return [];
}

export type HoldResultReason = "ok" | "invalid" | "depleted" | "already_redeemed";

export interface HoldResult {
  success: boolean;
  reason: HoldResultReason;
  message: string;
  claimId?: number;
  voucherCode?: string;
  couponCode?: string;
  expiresAt?: Date;
  offerType?: "PERCENT_OFF" | "BOGO" | "FREE_MEAL" | "FREE_SIDE";
  discountValue?: number | null;
  humanLabel?: string;
}

export function formatOfferLabel(
  offerType: "PERCENT_OFF" | "BOGO" | "FREE_MEAL" | "FREE_SIDE",
  discountValue?: number | null
): string {
  switch (offerType) {
    case "PERCENT_OFF":
      return `Treasure Hunt: ${discountValue || 10}% OFF`;
    case "BOGO":
      return "Treasure Hunt: Buy 1 Get 1 Free";
    case "FREE_MEAL":
      return "Treasure Hunt: Free Meal";
    case "FREE_SIDE":
      return "Treasure Hunt: Free Side";
    default:
      return "Treasure Hunt Reward";
  }
}

/**
 * Opportunistically sweeps expired HELD claims and decrements campaign reserved_count.
 * Executes as a single atomic CTE statement compatible with neon-http.
 */
export async function sweepExpiredClaims(): Promise<number> {
  try {
    const res = await db.execute(sql`
      WITH expired_rows AS (
        UPDATE code_claims
        SET status = 'EXPIRED'
        WHERE status = 'HELD'
          AND expires_at < NOW()
        RETURNING code_id
      ),
      counts AS (
        SELECT code_id, count(*)::int as cnt FROM expired_rows GROUP BY code_id
      )
      UPDATE campaign_codes
      SET reserved_count = GREATEST(0, campaign_codes.reserved_count - counts.cnt)
      FROM counts
      WHERE campaign_codes.id = counts.code_id
      RETURNING counts.cnt;
    `);

    return getRows<{ cnt: number }>(res).reduce((sum, r) => sum + (r.cnt || 0), 0);
  } catch (error) {
    console.error("[sweepExpiredClaims] Error sweeping expired claims:", error);
    return 0;
  }
}

/**
 * Attempts to reserve a QR code for a given device.
 * Guarded against concurrency races using atomic SQL counter updates.
 */
export async function holdCode(rawCode: string, deviceId: string): Promise<HoldResult> {
  const normalized = normalizeQrCode(rawCode);
  const parsed = qrCodeSchema.safeParse(normalized);
  if (!parsed.success) {
    return {
      success: false,
      reason: "invalid",
      message: parsed.error.issues[0]?.message || "Invalid QR code format.",
    };
  }

  const cleanDeviceId = deviceId?.trim();
  if (!cleanDeviceId) {
    return {
      success: false,
      reason: "invalid",
      message: "Device identifier is required to claim a reward.",
    };
  }

  // 1. Opportunistic sweep of any stale holds
  await sweepExpiredClaims();

  // 2. Fetch campaign record
  const campaigns = await db
    .select()
    .from(campaignCodes)
    .where(eq(campaignCodes.code, normalized))
    .limit(1);

  if (campaigns.length === 0) {
    return {
      success: false,
      reason: "invalid",
      message: "Treasure code does not exist. Check that you scanned a valid Daily Bap QR code.",
    };
  }

  const campaign = campaigns[0];

  if (campaign.status === "DEPLETED" || campaign.currentClaims >= campaign.maxClaims) {
    return {
      success: false,
      reason: "depleted",
      message: "This treasure has already been fully claimed by other hunters!",
    };
  }

  // 3. Check for existing claim for this (codeId, deviceId)
  const existingClaims = await db
    .select()
    .from(codeClaims)
    .where(
      and(
        eq(codeClaims.codeId, campaign.id),
        eq(codeClaims.deviceId, cleanDeviceId)
      )
    )
    .limit(1);

  const now = new Date();
  const holdExpiry = new Date(Date.now() + HUNT_CONFIG.HUNT_HOLD_MINUTES * 60 * 1000);
  const label = formatOfferLabel(campaign.offerType, campaign.discountValue);

  if (existingClaims.length > 0) {
    const existing = existingClaims[0];

    // Case A: Already redeemed by this device
    if (existing.status === "REDEEMED") {
      return {
        success: false,
        reason: "already_redeemed",
        message: "You have already redeemed this reward on an order!",
      };
    }

    // Case B: Currently held and unexpired -> refresh expiration with no counter change
    if (existing.status === "HELD" && new Date(existing.expiresAt) > now) {
      await db
        .update(codeClaims)
        .set({ expiresAt: holdExpiry })
        .where(eq(codeClaims.id, existing.id));

      return {
        success: true,
        reason: "ok",
        message: "Your reward hold has been refreshed!",
        claimId: existing.id,
        voucherCode: existing.voucherCode,
        couponCode: `${HUNT_CONFIG.VOUCHER_PREFIX}${existing.voucherCode}`,
        expiresAt: holdExpiry,
        offerType: campaign.offerType,
        discountValue: campaign.discountValue,
        humanLabel: label,
      };
    }

    // Case C: Existing row is EXPIRED or RELEASED -> re-reserve with guarded counter increment
    const incRes = await db.execute(sql`
      UPDATE campaign_codes
      SET reserved_count = reserved_count + 1
      WHERE id = ${campaign.id}
        AND current_claims + reserved_count < max_claims
      RETURNING id;
    `);

    const incRows = getRows<{ id: number }>(incRes);
    if (incRows.length === 0) {
      return {
        success: false,
        reason: "depleted",
        message: "All rewards for this code are currently reserved or claimed.",
      };
    }

    // Re-activate existing claim row
    const updateRes = await db.execute(sql`
      UPDATE code_claims
      SET status = 'HELD',
          held_at = NOW(),
          expires_at = ${holdExpiry}
      WHERE id = ${existing.id}
        AND status IN ('EXPIRED', 'RELEASED', 'HELD')
      RETURNING id, voucher_code;
    `);

    const updateRows = getRows<{ id: number; voucher_code: string }>(updateRes);
    if (updateRows.length === 0) {
      // Concurrency race: revert reserved_count
      await db.execute(sql`
        UPDATE campaign_codes
        SET reserved_count = GREATEST(0, reserved_count - 1)
        WHERE id = ${campaign.id};
      `);

      return {
        success: false,
        reason: "invalid",
        message: "Unable to reserve voucher. Please try scanning again.",
      };
    }

    return {
      success: true,
      reason: "ok",
      message: "Treasure found! Reward added to your cart.",
      claimId: existing.id,
      voucherCode: existing.voucherCode,
      couponCode: `${HUNT_CONFIG.VOUCHER_PREFIX}${existing.voucherCode}`,
      expiresAt: holdExpiry,
      offerType: campaign.offerType,
      discountValue: campaign.discountValue,
      humanLabel: label,
    };
  }

  // 4. Brand new hold: first do guarded increment on campaign_codes
  const incRes = await db.execute(sql`
    UPDATE campaign_codes
    SET reserved_count = reserved_count + 1
    WHERE id = ${campaign.id}
      AND current_claims + reserved_count < max_claims
    RETURNING id;
  `);

  const incRows = getRows<{ id: number }>(incRes);
  if (incRows.length === 0) {
    return {
      success: false,
      reason: "depleted",
      message: "All rewards for this treasure have been claimed or are currently held in someone's cart.",
    };
  }

  // Generate unique voucher code
  let newVoucher = generateVoucherCode();
  let insertedClaim: { id: number; voucherCode: string } | null = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const [claim] = await db
        .insert(codeClaims)
        .values({
          codeId: campaign.id,
          deviceId: cleanDeviceId,
          voucherCode: newVoucher,
          status: "HELD",
          heldAt: now,
          expiresAt: holdExpiry,
        })
        .returning({ id: codeClaims.id, voucherCode: codeClaims.voucherCode });

      insertedClaim = claim;
      break;
    } catch (insertErr) {
      newVoucher = generateVoucherCode();
    }
  }

  if (!insertedClaim) {
    // Revert reserved_count if insert completely failed
    await db.execute(sql`
      UPDATE campaign_codes
      SET reserved_count = GREATEST(0, reserved_count - 1)
      WHERE id = ${campaign.id};
    `);

    return {
      success: false,
      reason: "invalid",
      message: "Could not generate a unique voucher. Please try scanning again.",
    };
  }

  return {
    success: true,
    reason: "ok",
    message: "Treasure found! Reward added to your cart.",
    claimId: insertedClaim.id,
    voucherCode: insertedClaim.voucherCode,
    couponCode: `${HUNT_CONFIG.VOUCHER_PREFIX}${insertedClaim.voucherCode}`,
    expiresAt: holdExpiry,
    offerType: campaign.offerType,
    discountValue: campaign.discountValue,
    humanLabel: label,
  };
}

/**
 * Validates and retrieves an active HELD claim by its voucher code (e.g. HUNT-9X7K2M or 9X7K2M)
 */
export async function getActiveHold(rawVoucher: string) {
  const cleanVoucher = extractVoucherCode(rawVoucher);
  if (!cleanVoucher) return null;

  await sweepExpiredClaims();

  const results = await db
    .select({
      claim: codeClaims,
      campaign: campaignCodes,
    })
    .from(codeClaims)
    .innerJoin(campaignCodes, eq(codeClaims.codeId, campaignCodes.id))
    .where(
      and(
        eq(codeClaims.voucherCode, cleanVoucher),
        eq(codeClaims.status, "HELD"),
        sql`${codeClaims.expiresAt} > NOW()`
      )
    )
    .limit(1);

  if (results.length === 0) return null;
  return results[0];
}

/**
 * Atomically marks a HELD claim as REDEEMED for an order.
 * Followed by decrementing campaign reserved_count and incrementing current_claims.
 */
export async function redeemHold(
  claimId: number,
  orderId: string,
  customerPhone?: string | null
): Promise<{ success: boolean; error?: string; voucherCode?: string }> {
  const cleanPhone = customerPhone?.replace(/\D/g, "") || null;

  // 1. Guarded atomic update on code_claims
  const redeemRes = await db.execute(sql`
    UPDATE code_claims
    SET status = 'REDEEMED',
        order_id = ${orderId}::uuid,
        customer_phone = ${cleanPhone},
        redeemed_at = NOW()
    WHERE id = ${claimId}
      AND status = 'HELD'
      AND expires_at > NOW()
    RETURNING id, code_id, voucher_code;
  `);

  const redeemedRows = getRows<{
    id: number;
    code_id: number;
    voucher_code: string;
  }>(redeemRes);

  if (redeemedRows.length === 0) {
    return {
      success: false,
      error: "HUNT_VOUCHER_EXPIRED",
    };
  }

  const redeemed = redeemedRows[0];

  // 2. Guarded update on campaign_codes (decrement reserved, increment claims, deplete if max reached)
  await db.execute(sql`
    UPDATE campaign_codes
    SET reserved_count = GREATEST(0, reserved_count - 1),
        current_claims = current_claims + 1,
        status = CASE
          WHEN current_claims + 1 >= max_claims THEN 'DEPLETED'::campaign_status
          ELSE status
        END
    WHERE id = ${redeemed.code_id};
  `);

  return {
    success: true,
    voucherCode: redeemed.voucher_code,
  };
}

/**
 * Releases a claim if the associated order is cancelled.
 */
export async function releaseClaim(claimId: number): Promise<boolean> {
  try {
    const releaseRes = await db.execute(sql`
      UPDATE code_claims
      SET status = 'RELEASED'
      WHERE id = ${claimId}
        AND status = 'REDEEMED'
      RETURNING id, code_id;
    `);

    const releasedRows = getRows<{ id: number; code_id: number }>(releaseRes);
    if (releasedRows.length === 0) return false;

    if (HUNT_CONFIG.HUNT_RESTORE_ON_CANCEL) {
      const codeId = releasedRows[0].code_id;
      await db.execute(sql`
        UPDATE campaign_codes
        SET current_claims = GREATEST(0, current_claims - 1),
            status = CASE
              WHEN current_claims - 1 < max_claims THEN 'ACTIVE'::campaign_status
              ELSE status
            END
        WHERE id = ${codeId};
      `);
    }

    return true;
  } catch (error) {
    console.error("[releaseClaim] Error releasing claim:", error);
    return false;
  }
}
