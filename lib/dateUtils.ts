// lib/dateUtils.ts — Pure IST Date and Time Utilities for Daily Bap
// All date arithmetic is performed on "YYYY-MM-DD" strings in Asia/Kolkata timezone.

export const IST_TIMEZONE = "Asia/Kolkata";

/**
 * Returns today's date in IST as "YYYY-MM-DD".
 */
export function todayIST(referenceDate: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: IST_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(referenceDate);
}

/**
 * Returns tomorrow's date in IST as "YYYY-MM-DD".
 */
export function tomorrowIST(referenceDate: Date = new Date()): string {
  return addDaysIST(todayIST(referenceDate), 1);
}

/**
 * Get current hour and minute in IST (0-23 and 0-59).
 */
export function getISTTimeParts(referenceDate: Date = new Date()): {
  hour: number;
  minute: number;
  second: number;
} {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: IST_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(referenceDate);
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
  const minute = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);
  const second = parseInt(parts.find((p) => p.type === "second")?.value ?? "0", 10);
  return { hour, minute, second };
}

/**
 * Adds `days` to a "YYYY-MM-DD" date string.
 * Returns new "YYYY-MM-DD" string.
 */
export function addDaysIST(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days, 12, 0, 0));
  const year = dt.getUTCFullYear();
  const month = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const day = String(dt.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Returns the signed difference in days between two "YYYY-MM-DD" strings: (dateStr2 - dateStr1).
 * Positive if dateStr2 > dateStr1.
 */
export function diffDaysIST(dateStr1: string, dateStr2: string): number {
  const [y1, m1, d1] = dateStr1.split("-").map(Number);
  const [y2, m2, d2] = dateStr2.split("-").map(Number);
  const utc1 = Date.UTC(y1, m1 - 1, d1, 12, 0, 0);
  const utc2 = Date.UTC(y2, m2 - 1, d2, 12, 0, 0);
  return Math.round((utc2 - utc1) / (1000 * 60 * 60 * 24));
}

/**
 * Returns 3-letter weekday abbreviation in IST (e.g. "Mon", "Tue", "Wed").
 */
export function weekdayAbbrevIST(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: "UTC",
  }).format(dt);
}

/**
 * Formats date as "09 Nov" (padded day + short month).
 */
export function formatShortDateIST(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const dayStr = String(d).padStart(2, "0");
  const monthStr = new Intl.DateTimeFormat("en-US", {
    month: "short",
    timeZone: "UTC",
  }).format(dt);
  return `${dayStr} ${monthStr}`;
}

/**
 * Formats date for human display as "9 Nov" (unpadded day + short month).
 */
export function formatDisplayDateIST(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const monthStr = new Intl.DateTimeFormat("en-US", {
    month: "short",
    timeZone: "UTC",
  }).format(dt);
  return `${d} ${monthStr}`;
}
