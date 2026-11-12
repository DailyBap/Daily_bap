// app/actions/huntAdminActions.ts — Server actions for Admin Hunt Management (Cookie Session Protected)

"use server";

import { db } from "@/lib/db";
import { campaignCodes, codeClaims, orders, settings } from "@/lib/schema";
import { eq, desc, sql, and, isNotNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { verifyAdminSession } from "@/lib/adminAuth";
import { releaseClaim } from "@/lib/hunt/claims";
import { isHuntEnabled } from "@/lib/pricing";

/**
 * Server Action: Fetches all hunt campaigns, claims, and warning list for the admin dashboard.
 */
export async function getHuntDashboardDataAction() {
  if (!(await verifyAdminSession())) {
    return {
      success: false,
      error: "Unauthorized",
      huntEnabled: false,
      campaigns: [],
      claims: [],
      unredeemedWarnings: [],
    };
  }

  try {
    const enabled = await isHuntEnabled();

    // 1. Fetch campaigns
    const campaignsList = await db
      .select()
      .from(campaignCodes)
      .orderBy(desc(campaignCodes.createdAt));

    // 2. Fetch claims joined with campaign code and order number
    const claimsList = await db
      .select({
        id: codeClaims.id,
        codeId: codeClaims.codeId,
        campaignCode: campaignCodes.code,
        offerType: campaignCodes.offerType,
        discountValue: campaignCodes.discountValue,
        deviceId: codeClaims.deviceId,
        voucherCode: codeClaims.voucherCode,
        status: codeClaims.status,
        heldAt: codeClaims.heldAt,
        expiresAt: codeClaims.expiresAt,
        redeemedAt: codeClaims.redeemedAt,
        orderId: codeClaims.orderId,
        orderNumber: orders.orderNumber,
        customerPhone: codeClaims.customerPhone,
      })
      .from(codeClaims)
      .innerJoin(campaignCodes, eq(codeClaims.codeId, campaignCodes.id))
      .leftJoin(orders, eq(codeClaims.orderId, orders.id))
      .orderBy(desc(codeClaims.heldAt));

    // 3. Admin Warning List: Orders that have hunt_claim_id but claim status is not REDEEMED
    const warnings = await db
      .select({
        orderId: orders.id,
        orderNumber: orders.orderNumber,
        huntClaimId: orders.huntClaimId,
        claimStatus: codeClaims.status,
        voucherCode: codeClaims.voucherCode,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .innerJoin(codeClaims, eq(orders.huntClaimId, codeClaims.id))
      .where(
        and(
          isNotNull(orders.huntClaimId),
          sql`${codeClaims.status} != 'REDEEMED'`
        )
      )
      .orderBy(desc(orders.createdAt));

    return {
      success: true,
      huntEnabled: enabled,
      campaigns: campaignsList,
      claims: claimsList,
      unredeemedWarnings: warnings,
    };
  } catch (error) {
    console.error("[getHuntDashboardDataAction] Error fetching hunt data:", error);
    return {
      success: false,
      error: "Failed to load hunt dashboard data.",
      huntEnabled: false,
      campaigns: [],
      claims: [],
      unredeemedWarnings: [],
    };
  }
}

/**
 * Server Action: Toggle global hunt_enabled feature flag. Requires Admin Auth.
 */
export async function toggleHuntEnabledAction(enabled: boolean) {
  if (!(await verifyAdminSession())) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const value = enabled ? "true" : "false";

    await db
      .insert(settings)
      .values({ key: "hunt_enabled", value })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value, updatedAt: new Date() },
      });

    revalidatePath("/admin");
    revalidatePath("/hunt");
    revalidatePath("/");

    return { success: true, huntEnabled: enabled };
  } catch (error) {
    console.error("[toggleHuntEnabledAction] Error updating setting:", error);
    return { success: false, error: "Failed to update hunt status." };
  }
}

/**
 * Server Action: Mobile Drop Tool — Place pin coordinates and location hint on a campaign code.
 */
export async function dropHuntPinAction(
  codeId: number,
  lat: number,
  lng: number,
  locationHint: string
) {
  if (!(await verifyAdminSession())) {
    return { success: false, error: "Unauthorized" };
  }

  if (isNaN(lat) || isNaN(lng) || !locationHint.trim()) {
    return { success: false, error: "Valid latitude, longitude, and location hint are required." };
  }

  try {
    await db
      .update(campaignCodes)
      .set({
        lat,
        lng,
        locationHint: locationHint.trim(),
      })
      .where(eq(campaignCodes.id, codeId));

    revalidatePath("/admin");
    revalidatePath("/api/hunt/pins");
    return { success: true };
  } catch (error) {
    console.error("[dropHuntPinAction] Error placing pin:", error);
    return { success: false, error: "Failed to save pin coordinates." };
  }
}

/**
 * Server Action: Toggle or deactivate a campaign code.
 */
export async function setCampaignStatusAction(
  codeId: number,
  status: "ACTIVE" | "DEPLETED"
) {
  if (!(await verifyAdminSession())) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await db
      .update(campaignCodes)
      .set({ status })
      .where(eq(campaignCodes.id, codeId));

    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error("[setCampaignStatusAction] Error:", error);
    return { success: false, error: "Failed to update campaign code status." };
  }
}

/**
 * Server Action: Void / Release a claim manually from admin.
 */
export async function adminReleaseClaimAction(claimId: number) {
  if (!(await verifyAdminSession())) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const released = await releaseClaim(claimId);
    if (!released) {
      return { success: false, error: "Claim could not be released or was already released." };
    }

    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error("[adminReleaseClaimAction] Error:", error);
    return { success: false, error: "Failed to release claim." };
  }
}

/**
 * Server Action: Idempotent bulk import of campaign codes (seed data).
 */
export async function importCampaignSeedsAction(
  seeds: Array<{
    code: string;
    offerType: "PERCENT_OFF" | "BOGO" | "FREE_MEAL" | "FREE_SIDE";
    discountValue?: number | null;
    maxClaims?: number;
    locationHint?: string | null;
    lat?: number | null;
    lng?: number | null;
  }>
) {
  if (!(await verifyAdminSession())) {
    return { success: false, error: "Unauthorized" };
  }

  if (!Array.isArray(seeds) || seeds.length === 0) {
    return { success: false, error: "No seed items provided." };
  }

  try {
    let imported = 0;
    for (const s of seeds) {
      if (!s.code?.trim() || !s.offerType) continue;

      const normCode = s.code.trim().toUpperCase();
      const val = s.offerType === "PERCENT_OFF" ? (s.discountValue ? Number(s.discountValue) : 10) : null;

      await db
        .insert(campaignCodes)
        .values({
          code: normCode,
          offerType: s.offerType,
          discountValue: val,
          maxClaims: s.maxClaims ? Math.max(1, Number(s.maxClaims)) : 1,
          locationHint: s.locationHint || null,
          lat: s.lat ? Number(s.lat) : null,
          lng: s.lng ? Number(s.lng) : null,
          status: "ACTIVE",
        })
        .onConflictDoUpdate({
          target: campaignCodes.code,
          set: {
            offerType: sql`excluded.offer_type`,
            discountValue: sql`excluded.discount_value`,
            maxClaims: sql`excluded.max_claims`,
            locationHint: sql`COALESCE(campaign_codes.location_hint, excluded.location_hint)`,
            lat: sql`COALESCE(campaign_codes.lat, excluded.lat)`,
            lng: sql`COALESCE(campaign_codes.lng, excluded.lng)`,
          },
        });

      imported += 1;
    }

    revalidatePath("/admin");
    return { success: true, count: imported };
  } catch (error) {
    console.error("[importCampaignSeedsAction] Error importing seeds:", error);
    return { success: false, error: "Failed to import campaign seeds." };
  }
}
