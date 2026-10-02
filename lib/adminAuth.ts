// lib/adminAuth.ts — Strict Server-Side Admin Session Management & Security

import { cookies, headers } from "next/headers";
import crypto from "crypto";

const COOKIE_NAME = "admin_session";
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours

/**
 * Serverless In-Memory Rate Limiting:
 * Note on Serverless Architecture: In-memory maps persist within a single Lambda/Edge container instance
 * but may reset on cold starts or not be shared across multi-region instances.
 * Production recommendation for multi-region scaling: backed by Neon DB (e.g. settings/rate_limits table) or Upstash Redis.
 */
interface AttemptRecord {
  count: number;
  resetAt: number;
}
const failedAttempts = new Map<string, AttemptRecord>();
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Extract client IP strictly from platform-trusted proxy headers (x-forwarded-for / x-real-ip)
 */
export async function getClientIp(): Promise<string> {
  try {
    const headerStore = await headers();
    const forwardedFor = headerStore.get("x-forwarded-for");
    if (forwardedFor) {
      return forwardedFor.split(",")[0].trim();
    }
    const realIp = headerStore.get("x-real-ip");
    if (realIp) {
      return realIp.trim();
    }
  } catch {
    // Non-fatal header access fallback
  }
  return "ip_unknown";
}

/**
 * Strict env configuration check — NO DEFAULT FALLBACKS ALLOWED.
 * Enforces ADMIN_PASSWORD presence and ADMIN_SESSION_SECRET minimum 32 characters length.
 */
function getAuthConfig(): {
  valid: boolean;
  password?: string;
  secret?: string;
  error?: string;
} {
  const password = process.env.ADMIN_PASSWORD;
  const secret = process.env.ADMIN_SESSION_SECRET;

  if (!password || !secret) {
    return {
      valid: false,
      error: "Server configuration error: ADMIN_PASSWORD or ADMIN_SESSION_SECRET is missing from server env.",
    };
  }

  if (secret.length < 32) {
    return {
      valid: false,
      error: "Server configuration error: ADMIN_SESSION_SECRET must be at least 32 characters long.",
    };
  }

  return { valid: true, password, secret };
}

/**
 * Hash a string using SHA-256 to produce a fixed 32-byte Buffer
 */
function sha256Buffer(input: string): Buffer {
  return crypto.createHash("sha256").update(input).digest();
}

/**
 * Generate HMAC-SHA256 signature for a session payload
 */
function generateSignature(payload: string, secret: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
}

/**
 * Rate-limiting check keyed by Client IP
 */
export function isRateLimited(clientIp: string): {
  limited: boolean;
  retryAfterSeconds?: number;
} {
  const now = Date.now();
  const record = failedAttempts.get(clientIp);

  if (!record) {
    return { limited: false };
  }

  if (now > record.resetAt) {
    failedAttempts.delete(clientIp);
    return { limited: false };
  }

  if (record.count >= MAX_FAILED_ATTEMPTS) {
    const retryAfterSeconds = Math.ceil((record.resetAt - now) / 1000);
    return { limited: true, retryAfterSeconds };
  }

  return { limited: false };
}

/**
 * Record a failed login attempt keyed by Client IP
 */
export function recordFailedAttempt(clientIp: string): void {
  const now = Date.now();
  const record = failedAttempts.get(clientIp);

  if (!record || now > record.resetAt) {
    failedAttempts.set(clientIp, {
      count: 1,
      resetAt: now + LOCKOUT_WINDOW_MS,
    });
  } else {
    record.count += 1;
  }
}

/**
 * Clear failed attempts for Client IP on successful login
 */
export function clearFailedAttempts(clientIp: string): void {
  failedAttempts.delete(clientIp);
}

/**
 * Server Action: Authenticate admin password and issue signed 8-hour httpOnly session cookie
 */
export async function loginAdmin(
  providedPassword: string
): Promise<{ success: boolean; error?: string }> {
  const clientIp = await getClientIp();

  // 1. Check rate limiting first
  const rateLimit = isRateLimited(clientIp);
  if (rateLimit.limited) {
    return {
      success: false,
      error: `Too many failed login attempts. Please try again in ${rateLimit.retryAfterSeconds} seconds.`,
    };
  }

  // 2. Strict env check (No fallbacks; secret length >= 32 required)
  const config = getAuthConfig();
  if (!config.valid || !config.password || !config.secret) {
    console.error("🚨 AUTH FATAL ERROR 🚨:", config.error);
    return {
      success: false,
      error: config.error || "Server authentication error.",
    };
  }

  // 3. Constant-time password validation using sha256Buffer + crypto.timingSafeEqual
  const providedBuffer = sha256Buffer(providedPassword || "");
  const expectedBuffer = sha256Buffer(config.password);

  const isMatch = crypto.timingSafeEqual(providedBuffer, expectedBuffer);

  if (!isMatch) {
    recordFailedAttempt(clientIp);
    return {
      success: false,
      error: "Invalid admin password. Please try again.",
    };
  }

  // 4. Clear failed attempts & construct signed payload (8-hour expiry)
  clearFailedAttempts(clientIp);

  const now = Date.now();
  const expiresAt = now + SESSION_DURATION_MS;
  const nonce = crypto.randomBytes(16).toString("hex");

  const payload = `${expiresAt}.${now}.${nonce}`;
  const signature = generateSignature(payload, config.secret);
  const token = `${payload}.${signature}`;

  // 5. Issue httpOnly secure session cookie
  try {
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: Math.floor(SESSION_DURATION_MS / 1000),
    });
  } catch (cookieErr) {
    // If running outside Next.js server context (e.g. standalone CLI runtime test)
    console.log("[loginAdmin]: Cookie set skipped (outside Next.js request context)");
  }

  return { success: true };
}

/**
 * Server-side verification of signed admin session cookie & payload expiration
 */
export async function verifyAdminSession(): Promise<boolean> {
  try {
    const config = getAuthConfig();
    if (!config.valid || !config.secret) return false;

    let cookieStore;
    try {
      cookieStore = await cookies();
    } catch {
      return false;
    }

    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return false;

    const parts = token.split(".");
    if (parts.length !== 4) return false;

    const [expiresAtStr, iatStr, nonce, signature] = parts;
    const expiresAt = parseInt(expiresAtStr, 10);

    // Verify expiration inside payload (8 hours)
    if (isNaN(expiresAt) || Date.now() > expiresAt) {
      return false;
    }

    const payload = `${expiresAtStr}.${iatStr}.${nonce}`;
    const expectedSignature = generateSignature(payload, config.secret);

    // Constant-time HMAC signature verification using sha256Buffer + crypto.timingSafeEqual
    const signatureBuffer = sha256Buffer(signature);
    const expectedBuffer = sha256Buffer(expectedSignature);

    if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
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
