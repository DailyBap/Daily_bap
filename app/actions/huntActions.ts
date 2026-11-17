// app/actions/huntActions.ts — Server actions for QR Treasure Hunt scanning & rewards

"use server";

import { z } from "zod";
import { getClientIp } from "@/lib/adminAuth";
import { isHuntEnabled } from "@/lib/pricing";
import { holdCode } from "@/lib/hunt/claims";
import { qrCodeSchema } from "@/lib/hunt/codes";

// In-memory rate limiting map for scan/claim attempts (max 10 attempts per minute per IP)
const scanAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_SCAN_ATTEMPTS = 10;
const SCAN_WINDOW_MS = 60 * 1000;

function checkScanRateLimit(identifier: string): boolean {
  const now = Date.now();
  const record = scanAttempts.get(identifier);

  if (!record || now > record.resetAt) {
    scanAttempts.set(identifier, {
      count: 1,
      resetAt: now + SCAN_WINDOW_MS,
    });
    return true;
  }

  if (record.count >= MAX_SCAN_ATTEMPTS) {
    return false;
  }

  record.count += 1;
  return true;
}

const claimInputSchema = z.object({
  code: qrCodeSchema,
  deviceId: z
    .string()
    .trim()
    .min(8, "Invalid device identifier")
    .max(128, "Invalid device identifier"),
});

export interface ClaimHuntCodeResult {
  success: boolean;
  error?: string;
  reason?: "ok" | "invalid" | "depleted" | "already_redeemed";
  couponCode?: string;
  voucherCode?: string;
  expiresAt?: string;
  label?: string;
  message?: string;
}

/**
 * Server Action: Validates and reserves a scanned QR treasure hunt code.
 * Rate-limited per client IP and protected by the global hunt_enabled feature flag.
 */
export async function claimHuntCodeAction(
  rawInput: { code: string; deviceId: string }
): Promise<ClaimHuntCodeResult> {
  const ip = await getClientIp();

  // 1. Rate limit check
  if (!checkScanRateLimit(ip)) {
    return {
      success: false,
      reason: "invalid",
      error: "Too many scan attempts. Please wait a minute before scanning again.",
    };
  }

  // 2. Feature flag check
  const enabled = await isHuntEnabled();
  if (!enabled) {
    return {
      success: false,
      reason: "invalid",
      error: "The Daily Bap Treasure Hunt is not currently active.",
    };
  }

  // 3. Input validation
  const validation = claimInputSchema.safeParse(rawInput);
  if (!validation.success) {
    return {
      success: false,
      reason: "invalid",
      error: validation.error.issues[0]?.message || "Invalid code format.",
    };
  }

  const { code, deviceId } = validation.data;

  // 4. Atomic hold execution
  try {
    const result = await holdCode(code, deviceId);
    if (!result.success) {
      return {
        success: false,
        reason: result.reason,
        error: result.message,
      };
    }

    return {
      success: true,
      reason: "ok",
      couponCode: result.couponCode,
      voucherCode: result.voucherCode,
      expiresAt: result.expiresAt ? result.expiresAt.toISOString() : undefined,
      label: result.humanLabel,
      message: result.message,
    };
  } catch (error) {
    console.error("[claimHuntCodeAction] Error executing hold:", error);
    return {
      success: false,
      reason: "invalid",
      error: "An unexpected error occurred while claiming your treasure. Please try again.",
    };
  }
}

/**
 * Public action: Check if hunt is enabled (for conditional UI rendering in Navbar / Floating button)
 */
export async function checkHuntEnabledAction(): Promise<boolean> {
  return await isHuntEnabled();
}
