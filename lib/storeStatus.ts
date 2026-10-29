// lib/storeStatus.ts — Shared Server-Side Store Status & Holiday Closure Engine
// Pure server module (DB backed). Enforces server-only execution.

import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import { settings } from "@/lib/schema";
import { inArray } from "drizzle-orm";
import {
  todayIST,
  evaluateClosureSettings,
  checkOrderAllowed,
  type ClosureInfo,
} from "./dateUtils";

export type { ClosureInfo };

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
