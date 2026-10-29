// lib/storeStatus.ts — Shared Server-Side Store Status & Holiday Closure Engine
// Pure server module (no "use server" directive).

import { cache } from "react";
import { db } from "@/lib/db";
import { settings } from "@/lib/schema";
import { inArray } from "drizzle-orm";
import {
  todayIST,
  tomorrowIST,
  addDaysIST,
  diffDaysIST,
  weekdayAbbrevIST,
  formatDisplayDateIST,
} from "./dateUtils";

export interface ClosureInfo {
  active: boolean; // true if closure setting is currently in effect or scheduled
  start: string; // YYYY-MM-DD (IST)
  end: string; // YYYY-MM-DD (IST)
  message?: string; // Optional custom message
  reopenDate: string; // YYYY-MM-DD (IST, end + 1 day)
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
 * Reads kitchen closure keys in ONE single query from the settings table.
 * Wrapped with React cache() so layout.tsx, page.tsx, and components within
 * the same request lifecycle share a single DB read.
 */
export const getClosureInfo = cache(async (): Promise<ClosureInfo | null> => {
  try {
    const rows = await db
      .select()
      .from(settings)
      .where(
        inArray(settings.key, [
          "kitchen_closed",
          "kitchen_closed_start",
          "kitchen_closed_end",
          "kitchen_closed_message",
        ])
      );

    const map = new Map<string, string>();
    for (const row of rows) {
      map.set(row.key, row.value);
    }

    return evaluateClosureSettings(map, todayIST());
  } catch (error) {
    console.error("[getClosureInfo] Error fetching store closure status:", error);
    throw error;
  }
});

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
  const ymdMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  if (ymdMatch) {
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      return todayIST(parsed);
    }
    return ymdMatch[1];
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

/**
 * Asserts whether an order with the given delivery slot is allowed to be placed.
 * Fails closed with a user-friendly message if:
 * 1. The database read fails ("Please try again in a moment.")
 * 2. An unparseable slot is supplied while a closure is active
 * 3. The slot's delivery date falls within the active closure period
 *
 * Returns null if the order is allowed.
 */
export async function assertOrderAllowed(
  slot: string,
  referenceDate: Date | string = new Date()
): Promise<string | null> {
  let closureInfo: ClosureInfo | null;
  try {
    closureInfo = await getClosureInfo();
  } catch (error) {
    console.error("[assertOrderAllowed] Failed to read store status from DB:", error);
    return "Please try again in a moment."; // Fail closed on DB error
  }

  return checkOrderAllowed(slot, closureInfo, referenceDate);
}

// Re-export date helpers for convenience
export {
  todayIST,
  tomorrowIST,
  addDaysIST,
  diffDaysIST,
  weekdayAbbrevIST,
  formatDisplayDateIST,
};
