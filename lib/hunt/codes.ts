// lib/hunt/codes.ts — Code validation and voucher generation

import { z } from "zod";
import crypto from "crypto";
import { HUNT_CONFIG } from "./config";

/**
 * Base 32 alphabet excluding easily confused characters: 0, O, 1, I
 */
const VOUCHER_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

/**
 * Strict regex for scanned QR payload (e.g. BAP-MEAL-004-X9F2)
 */
export const QR_CODE_REGEX = /^BAP-[A-Z0-9]+(-[A-Z0-9]+)+$/i;

export const qrCodeSchema = z
  .string()
  .trim()
  .min(6, "Code is too short")
  .max(64, "Code is too long")
  .regex(QR_CODE_REGEX, "Invalid QR code format. Must start with BAP- (e.g. BAP-MEAL-004-X9F2)");

/**
 * Normalizes scanned code to trimmed uppercase
 */
export function normalizeQrCode(rawCode: string): string {
  return rawCode.trim().toUpperCase();
}

/**
 * Checks if a coupon code string is formatted as a hunt voucher (e.g. HUNT-9X7K2M)
 */
export function isHuntVoucherCode(code: string | null | undefined): boolean {
  if (!code) return false;
  return code.trim().toUpperCase().startsWith(HUNT_CONFIG.VOUCHER_PREFIX);
}

/**
 * Strips prefix to extract raw 6-character voucher code
 */
export function extractVoucherCode(code: string): string {
  const normalized = code.trim().toUpperCase();
  if (normalized.startsWith(HUNT_CONFIG.VOUCHER_PREFIX)) {
    return normalized.slice(HUNT_CONFIG.VOUCHER_PREFIX.length);
  }
  return normalized;
}

/**
 * Generates a collision-resistant 6-character alphanumeric voucher code using crypto.randomInt
 */
export function generateVoucherCode(length = 6): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    const idx = crypto.randomInt(0, VOUCHER_ALPHABET.length);
    result += VOUCHER_ALPHABET[idx];
  }
  return result;
}
