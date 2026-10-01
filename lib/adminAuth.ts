// lib/adminAuth.ts — Secure Server-Side Admin Session Management & Rate Limiting

import { cookies } from "next/headers";
import crypto from "crypto";

const COOKIE_NAME = "admin_session";
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

// Brute-force protection: in-memory attempt tracking
interface AttemptRecord {
  count: number;
  resetAt: number;
}
const failedAttempts = new Map<string, AttemptRecord>();
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function getSecret(): string {
  return (
    process.env.ADMIN_SESSION_SECRET ||
    "daily-bap-admin-session-secret-default-key-change-in-env"
  );
}

function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD || process.env.ADMIN_PIN || "1234";
}

/**
 * Sign a timestamp payload with HMAC-SHA256
 */
function generateSignature(expiresAt: number): string {
  const secret = getSecret();
  return crypto
    .createHmac("sha256", secret)
    .update(`admin:${expiresAt}`)
    .digest("hex");
}

/**
 * Rate-limiting check for admin login attempts
 */
export function isRateLimited(identifier: string = "global_admin"): {
  limited: boolean;
  retryAfterSeconds?: number;
} {
  const now = Date.now();
  const record = failedAttempts.get(identifier);

  if (!record) {
    return { limited: false };
  }

  if (now > record.resetAt) {
    failedAttempts.delete(identifier);
    return { limited: false };
  }

  if (record.count >= MAX_FAILED_ATTEMPTS) {
    const retryAfterSeconds = Math.ceil((record.resetAt - now) / 1000);
    return { limited: true, retryAfterSeconds };
  }

  return { limited: false };
}

/**
 * Record a failed login attempt
 */
export function recordFailedAttempt(identifier: string = "global_admin"): void {
  const now = Date.now();
  const record = failedAttempts.get(identifier);

  if (!record || now > record.resetAt) {
    failedAttempts.set(identifier, {
      count: 1,
      resetAt: now + LOCKOUT_WINDOW_MS,
    });
  } else {
    record.count += 1;
  }
}

/**
 * Reset failed attempt counter on successful login
 */
export function clearFailedAttempts(identifier: string = "global_admin"): void {
  failedAttempts.delete(identifier);
}

/**
 * Verify password & create httpOnly signed session cookie
 */
export async function loginAdmin(
  password: string,
  identifier: string = "global_admin"
): Promise<{ success: boolean; error?: string }> {
  // 1. Check rate limiting
  const rateLimit = isRateLimited(identifier);
  if (rateLimit.limited) {
    return {
      success: false,
      error: `Too many failed login attempts. Please try again in ${rateLimit.retryAfterSeconds} seconds.`,
    };
  }

  // 2. Validate password
  const expectedPassword = getAdminPassword();
  const isMatch =
    password.length === expectedPassword.length &&
    crypto.timingSafeEqual(
      Buffer.from(password),
      Buffer.from(expectedPassword)
    );

  if (!isMatch) {
    recordFailedAttempt(identifier);
    return {
      success: false,
      error: "Invalid admin password. Please try again.",
    };
  }

  // 3. Clear failed attempts & issue session cookie
  clearFailedAttempts(identifier);
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  const signature = generateSignature(expiresAt);
  const token = `${expiresAt}.${signature}`;

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(SESSION_DURATION_MS / 1000),
  });

  return { success: true };
}

/**
 * Server-side verification of admin session
 */
export async function verifyAdminSession(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) return false;

    const [expiresAtStr, signature] = token.split(".");
    if (!expiresAtStr || !signature) return false;

    const expiresAt = parseInt(expiresAtStr, 10);
    if (isNaN(expiresAt) || Date.now() > expiresAt) return false;

    const expectedSignature = generateSignature(expiresAt);

    // Constant-time signature comparison
    if (
      signature.length !== expectedSignature.length ||
      !crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      )
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Logout admin & destroy session cookie
 */
export async function logoutAdmin(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
