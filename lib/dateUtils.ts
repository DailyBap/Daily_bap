// lib/dateUtils.ts — Pure IST Date and Time Utilities for Daily Bap
// All date arithmetic is performed on "YYYY-MM-DD" strings in Asia/Kolkata timezone.
// This file is strictly pure and safe for both client and server bundles (no DB or server-only imports).

export const IST_TIMEZONE = "Asia/Kolkata";

export interface ClosureInfo {
  active: boolean; // true if closure setting is currently in effect or scheduled
  start: string; // YYYY-MM-DD (IST)
  end: string; // YYYY-MM-DD (IST)
  message?: string; // Optional custom message
  reopenDate: string; // YYYY-MM-DD (IST, end + 1 day)
}

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

/**
 * Pure evaluator for settings key-value map.
 * Allows deterministic unit testing and guarantees:
 * - Backward compatibility: if kitchen_closed = "true" with no dates, treats as closed TODAY only (IST).
 * - An expired closure (end date before today IST) behaves as open, even if kitchen_closed is still "true".
 * - Invalid date ranges (end < start) behave as open.
 */
export function evaluateClosureSettings(
  map: Map<string, string>,
  today: string = todayIST()
): ClosureInfo | null {
  const isClosed = map.get("kitchen_closed") === "true";
  if (!isClosed) {
    return null;
  }

  let start = map.get("kitchen_closed_start")?.trim();
  let end = map.get("kitchen_closed_end")?.trim();
  const message = map.get("kitchen_closed_message")?.trim() || undefined;

  // Backward compatibility: if kitchen_closed = "true" and no dates are set,
  // treat it as closed for TODAY only (IST).
  if (!start || !end) {
    start = today;
    end = today;
  }

  // Date format validation: must be YYYY-MM-DD
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(start) || !dateRegex.test(end)) {
    start = today;
    end = today;
  }

  // If end < start: invalid, treat as open
  if (diffDaysIST(start, end) < 0) {
    return null;
  }

  // If closure is expired (end date before today IST), behave as open
  if (diffDaysIST(today, end) < 0) {
    return null;
  }

  const reopenDate = addDaysIST(end, 1);

  return {
    active: true,
    start,
    end,
    message,
    reopenDate,
  };
}

/**
 * Returns true if a given YYYY-MM-DD date falls within the closure period [start, end] inclusive.
 */
export function isDateClosed(dateIST: string, info: ClosureInfo | null): boolean {
  if (!info || !info.active) return false;
  const diffStart = diffDaysIST(info.start, dateIST);
  const diffEnd = diffDaysIST(dateIST, info.end);
  return diffStart >= 0 && diffEnd >= 0;
}

const MONTH_MAP: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

/**
 * Derives the IST delivery DATE (YYYY-MM-DD) from a slot label string.
 *
 * Safeguards:
 * - "ASAP (Today, ~75 mins)" and "ASAP (Meta DM Order)" -> today's IST date
 * - "Today, 12:00 PM" -> today's IST date
 * - "Tomorrow, 12:00 PM" -> tomorrow's IST date
 * - "Sat, 09 Nov, 12:00 PM" -> resolves to nearest upcoming date in IST scheduling window
 *   (handles Dec to Jan rollover) and rejects labels whose weekday does not match the date.
 * - Standard YYYY-MM-DD or ISO string -> parsed into IST date.
 * - Unparseable slots throw an Error.
 */
export function getSlotDateIST(
  slot: string,
  referenceDate: Date | string = new Date()
): string {
  if (!slot || typeof slot !== "string") {
    throw new Error("Missing or empty delivery slot");
  }

  const trimmed = slot.trim();
  const today = typeof referenceDate === "string" ? referenceDate : todayIST(referenceDate);
  const tomorrow = addDaysIST(today, 1);

  // Treat both ASAP slot variants as today's IST date
  if (trimmed.startsWith("ASAP")) {
    return today;
  }

  // Today
  if (trimmed.startsWith("Today")) {
    return today;
  }

  // Tomorrow
  if (trimmed.startsWith("Tomorrow")) {
    return tomorrow;
  }

  // Dated label: e.g. "Sat, 09 Nov, 12:00 PM" or "Sat, 9 Nov 12:00 PM"
  const datedMatch = trimmed.match(/^([A-Za-z]{3}),\s*(\d{1,2})\s+([A-Za-z]{3})/i);
  if (datedMatch) {
    const expectedWeekday = datedMatch[1];
    const dayNum = parseInt(datedMatch[2], 10);
    const monthName = datedMatch[3].toLowerCase();

    const expectedMonth = MONTH_MAP[monthName];
    if (!expectedMonth) {
      throw new Error(`Invalid month in slot label: ${datedMatch[3]}`);
    }

    // Search upcoming window (up to 75 days ahead to accommodate max 60 day future + 14 day closure)
    let resolvedDate: string | null = null;
    for (let offset = 0; offset <= 75; offset++) {
      const candidate = addDaysIST(today, offset);
      const [, mStr, dStr] = candidate.split("-");
      if (parseInt(mStr, 10) === expectedMonth && parseInt(dStr, 10) === dayNum) {
        resolvedDate = candidate;
        break;
      }
    }

    if (!resolvedDate) {
      throw new Error(`Date ${dayNum} ${datedMatch[3]} not found in upcoming delivery window`);
    }

    // Verify weekday
    const actualWeekday = weekdayAbbrevIST(resolvedDate);
    if (actualWeekday.toLowerCase() !== expectedWeekday.toLowerCase()) {
      throw new Error(
        `Slot weekday mismatch: label says "${expectedWeekday}", but ${resolvedDate} is a "${actualWeekday}"`
      );
    }

    return resolvedDate;
  }

  // YYYY-MM-DD prefix or ISO timestamp (e.g. 2026-10-29 or 2026-10-29T12:00:00Z)
  const ymdMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/);
  if (ymdMatch) {
    const y = parseInt(ymdMatch[1], 10);
    const m = parseInt(ymdMatch[2], 10);
    const d = parseInt(ymdMatch[3], 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${ymdMatch[1]}-${ymdMatch[2]}-${ymdMatch[3]}`;
    }
  }

  throw new Error(`Unrecognized delivery slot format: "${slot}"`);
}

/**
 * Pure checker for whether an order with the given delivery slot is allowed.
 * Returns null if allowed, or an error string if blocked.
 */
export function checkOrderAllowed(
  slot: string,
  closureInfo: ClosureInfo | null,
  referenceDate: Date | string = new Date()
): string | null {
  if (!closureInfo || !closureInfo.active) {
    return null; // Kitchen is open
  }

  let slotDateIST: string;
  try {
    slotDateIST = getSlotDateIST(slot, referenceDate);
  } catch (error) {
    console.error("[checkOrderAllowed] Unparseable slot while closure active:", slot, error);
    return "Invalid delivery slot selected. Please select a valid open delivery slot."; // Fail closed
  }

  if (isDateClosed(slotDateIST, closureInfo)) {
    const { start, end, reopenDate, message } = closureInfo;
    const reopenDisplay = formatDisplayDateIST(reopenDate);
    const startDisplay = formatDisplayDateIST(start);
    const endDisplay = formatDisplayDateIST(end);

    let reason: string;
    if (start === end) {
      reason = `Sorry, our kitchen is closed on ${startDisplay}. We reopen on ${reopenDisplay}. Please choose a delivery slot on or after that date.`;
    } else {
      reason = `Sorry, our kitchen is closed from ${startDisplay} to ${endDisplay}. We reopen on ${reopenDisplay}. Please choose a delivery slot on or after that date.`;
    }

    if (message) {
      reason += ` (${message})`;
    }

    return reason;
  }

  return null;
}
