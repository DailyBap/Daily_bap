// lib/deliverySlots.ts — Static 15-Minute Slot Generation & Multi-Day Validation Logic
// Fully aligned with Asia/Kolkata (IST) timezone and date range holiday closures.

import {
  todayIST,
  tomorrowIST,
  addDaysIST,
  diffDaysIST,
  weekdayAbbrevIST,
  formatShortDateIST,
  getISTTimeParts,
} from "./dateUtils";

export interface StaticSlot {
  timeString: string; // e.g. "12:00 PM"
  hour: number; // 24h format (12)
  minute: number; // (0)
}

export interface DeliverySlotOption {
  id: string; // e.g. "Today, 12:00 PM" or "Sat, 09 Nov, 12:00 PM"
  label: string; // e.g. "Today, 12:00 PM" or "Sat, 09 Nov, 12:00 PM"
  day: "today" | "tomorrow" | string;
  timeString: string;
}

/**
 * Generates a fixed array of possible delivery times in 15-minute increments
 * starting from 12:00 PM (12:00) up to 11:15 PM (23:15).
 */
export function generateStatic15MinSlots(): StaticSlot[] {
  const slots: StaticSlot[] = [];
  for (let h = 12; h <= 23; h++) {
    const startM = 0;
    const endM = h === 23 ? 15 : 45;
    for (let m = startM; m <= endM; m += 15) {
      const displayHour = h > 12 ? h - 12 : h;
      const ampm = h >= 12 ? "PM" : "AM";
      const minuteStr = m === 0 ? "00" : m.toString();
      const timeString = `${displayHour}:${minuteStr} ${ampm}`;
      slots.push({
        timeString,
        hour: h,
        minute: m,
      });
    }
  }
  return slots;
}

/**
 * Checks if ordering for "Today" is closed (past 10:00 PM / 22:00 IST).
 */
export function isTodayOrderingClosed(referenceDate: Date = new Date()): boolean {
  const { hour } = getISTTimeParts(referenceDate);
  return hour >= 22;
}

/**
 * Calculates the available open days (as YYYY-MM-DD strings in IST) within the scheduling window.
 *
 * Window rule:
 * - Default window: at least 10 days from today.
 * - If a closure is active: max(10 days, reopening day + 2 days) from today.
 * - This guarantees that the customer always sees at least 2 open days after reopening.
 */
export function getAvailableDays(
  closureStart: string | null = null,
  closureEnd: string | null = null,
  referenceDate: Date | string = new Date()
): string[] {
  const today = typeof referenceDate === "string" ? referenceDate : todayIST(referenceDate);

  let windowDays = 10;
  if (closureStart && closureEnd && diffDaysIST(closureStart, closureEnd) >= 0) {
    const reopenDate = addDaysIST(closureEnd, 1);
    const daysUntilReopen = diffDaysIST(today, reopenDate);
    // At least 2 open days on/after reopening day (reopening day + 2 days)
    windowDays = Math.max(10, daysUntilReopen + 2);
  }

  const openDays: string[] = [];
  for (let offset = 0; offset < windowDays; offset++) {
    const candidate = addDaysIST(today, offset);
    if (closureStart && closureEnd) {
      const fromStart = diffDaysIST(closureStart, candidate);
      const toEnd = diffDaysIST(candidate, closureEnd);
      if (fromStart >= 0 && toEnd >= 0) {
        // Closed day: skip
        continue;
      }
    }
    openDays.push(candidate);
  }

  return openDays;
}

/**
 * Self-test assertion: verifies that a scheduling window of max(10, reopening+2)
 * always exposes at least 2 open days on or after reopening day.
 */
export function assertPickerHasOpenDays(
  todayStr: string,
  closureStart: string | null,
  closureEnd: string | null
): void {
  if (!closureStart || !closureEnd) return;
  const reopenDate = addDaysIST(closureEnd, 1);
  const openDays = getAvailableDays(closureStart, closureEnd, todayStr);
  const postReopeningOpenDays = openDays.filter(
    (d) => diffDaysIST(reopenDate, d) >= 0
  );
  if (postReopeningOpenDays.length < 2) {
    throw new Error(
      `Picker assertion failed: Expected at least 2 open days after reopening (${reopenDate}), but found ${postReopeningOpenDays.length}`
    );
  }
}

/**
 * Generates available delivery slot options for a given day:
 * - "today" or today's YYYY-MM-DD: filters static slots by earliest delivery (IST now + 75 mins)
 * - "tomorrow" or tomorrow's YYYY-MM-DD: full array, labeled "Tomorrow, HH:MM AM/PM"
 * - any future YYYY-MM-DD: full array, labeled "Sat, 09 Nov, HH:MM AM/PM"
 */
export function getAvailableSlots(
  day: "today" | "tomorrow" | string,
  now: Date = new Date()
): { slots: DeliverySlotOption[]; isTodayClosed: boolean } {
  const isTodayClosed = isTodayOrderingClosed(now);
  const staticSlots = generateStatic15MinSlots();
  const todayStr = todayIST(now);
  const tomorrowStr = tomorrowIST(now);

  const isToday = day === "today" || day === todayStr;
  const isTomorrow = day === "tomorrow" || day === tomorrowStr;

  if (isToday) {
    if (isTodayClosed) {
      return { slots: [], isTodayClosed: true };
    }

    // Earliest Delivery = Current IST Time + 75 mins, rounded up to 15-min boundary
    const istParts = getISTTimeParts(now);
    const currentMinutes = istParts.hour * 60 + istParts.minute;
    const earliestMinutesRaw = currentMinutes + 75;
    const rem = earliestMinutesRaw % 15;
    const earliestMinutes = rem === 0 ? earliestMinutesRaw : earliestMinutesRaw + (15 - rem);

    const eHour = Math.floor(earliestMinutes / 60);
    const eMin = earliestMinutes % 60;

    const filteredStatic = staticSlots.filter((slot) => {
      if (slot.hour > eHour) return true;
      if (slot.hour === eHour && slot.minute >= eMin) return true;
      return false;
    });

    const options: DeliverySlotOption[] = filteredStatic.map((s) => ({
      id: `Today, ${s.timeString}`,
      label: `Today, ${s.timeString}`,
      day: "today",
      timeString: s.timeString,
    }));

    return { slots: options, isTodayClosed: false };
  } else if (isTomorrow) {
    const options: DeliverySlotOption[] = staticSlots.map((s) => ({
      id: `Tomorrow, ${s.timeString}`,
      label: `Tomorrow, ${s.timeString}`,
      day: "tomorrow",
      timeString: s.timeString,
    }));

    return { slots: options, isTodayClosed };
  } else {
    // Day 2+ date string (YYYY-MM-DD)
    const weekday = weekdayAbbrevIST(day);
    const shortDate = formatShortDateIST(day);

    const options: DeliverySlotOption[] = staticSlots.map((s) => ({
      id: `${weekday}, ${shortDate}, ${s.timeString}`,
      label: `${weekday}, ${shortDate}, ${s.timeString}`,
      day,
      timeString: s.timeString,
    }));

    return { slots: options, isTodayClosed };
  }
}

const MONTH_MAP_SHORT: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

/**
 * Validates requested delivery time slot string.
 *
 * Rules:
 * - Empty/null -> reject
 * - "Today, ...": re-validates against current IST time (lead time + 75 min and 22:00 cutoff).
 *   If stale across midnight, rejects with: "Your time slot has changed, please reselect."
 * - "Tomorrow, ...": valid.
 * - "ASAP...": valid if today not closed past 22:00 IST.
 * - "Sat, 09 Nov, 12:00 PM": resolves to IST date, ensures weekday matches and date is in upcoming window.
 *   If date has passed into history, rejects with: "Your time slot has changed, please reselect."
 * - Valid Date object / ISO string -> valid.
 */
export function validateDeliveryTimeSlot(
  requestedTime: string | Date | null | undefined,
  referenceDate: Date | string = new Date()
): { valid: boolean; reason?: string } {
  if (!requestedTime) {
    return { valid: false, reason: "Please select a delivery time slot." };
  }

  const str = typeof requestedTime === "string" ? requestedTime.trim() : requestedTime.toString().trim();
  const refDateObj = typeof referenceDate === "string" ? new Date(`${referenceDate}T12:00:00Z`) : referenceDate;

  // 1. ASAP slots
  if (str.startsWith("ASAP")) {
    if (isTodayOrderingClosed(refDateObj)) {
      return {
        valid: false,
        reason: "Kitchen is closed for today. Please select a tomorrow or future slot.",
      };
    }
    return { valid: true };
  }

  // 2. Today slots
  if (str.startsWith("Today,")) {
    if (isTodayOrderingClosed(refDateObj)) {
      return {
        valid: false,
        reason: "Your time slot has changed, please reselect.",
      };
    }

    // Extract time: "Today, 12:00 PM"
    const timeMatch = str.match(/Today,\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (timeMatch) {
      let slotHour = parseInt(timeMatch[1], 10);
      const slotMin = parseInt(timeMatch[2], 10);
      const ampm = timeMatch[3].toUpperCase();
      if (ampm === "PM" && slotHour < 12) slotHour += 12;
      if (ampm === "AM" && slotHour === 12) slotHour = 0;

      const slotMinutesTotal = slotHour * 60 + slotMin;

      const istParts = getISTTimeParts(refDateObj);
      const nowMinutesTotal = istParts.hour * 60 + istParts.minute;

      // Current time + 75 min (allow 5-minute grace tolerance for network transit)
      const earliestAllowedMinutes = nowMinutesTotal + 70;

      if (slotMinutesTotal < earliestAllowedMinutes) {
        return {
          valid: false,
          reason: "Your time slot has changed, please reselect.",
        };
      }
    }
    return { valid: true };
  }

  // 3. Tomorrow slots
  if (str.startsWith("Tomorrow,")) {
    return { valid: true };
  }

  // 4. Dated slots ("Sat, 09 Nov, 12:00 PM")
  const datedMatch = str.match(/^([A-Za-z]{3}),\s*(\d{1,2})\s+([A-Za-z]{3})/i);
  if (datedMatch) {
    const expectedWeekday = datedMatch[1];
    const dayNum = parseInt(datedMatch[2], 10);
    const monthName = datedMatch[3].toLowerCase();
    const expectedMonth = MONTH_MAP_SHORT[monthName];

    if (!expectedMonth) {
      return { valid: false, reason: "Please select a valid delivery time slot." };
    }

    const today = typeof referenceDate === "string" ? referenceDate : todayIST(refDateObj);

    // Resolve date in upcoming window
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
      return { valid: false, reason: "Your time slot has changed, please reselect." };
    }

    const actualWeekday = weekdayAbbrevIST(resolvedDate);
    if (actualWeekday.toLowerCase() !== expectedWeekday.toLowerCase()) {
      return { valid: false, reason: "Please select a valid delivery time slot." };
    }

    // Check if slot has become "today" due to crossing midnight
    const dayDiff = diffDaysIST(today, resolvedDate);
    if (dayDiff < 0) {
      return { valid: false, reason: "Your time slot has changed, please reselect." };
    }

    if (dayDiff === 0) {
      // Re-validate against today's lead time
      const timeMatch = str.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (timeMatch) {
        let slotHour = parseInt(timeMatch[1], 10);
        const slotMin = parseInt(timeMatch[2], 10);
        const ampm = timeMatch[3].toUpperCase();
        if (ampm === "PM" && slotHour < 12) slotHour += 12;
        if (ampm === "AM" && slotHour === 12) slotHour = 0;

        const slotMinutesTotal = slotHour * 60 + slotMin;
        const istParts = getISTTimeParts(refDateObj);
        const nowMinutesTotal = istParts.hour * 60 + istParts.minute;
        const earliestAllowedMinutes = nowMinutesTotal + 70;

        if (slotMinutesTotal < earliestAllowedMinutes || isTodayOrderingClosed(refDateObj)) {
          return { valid: false, reason: "Your time slot has changed, please reselect." };
        }
      }
    }

    return { valid: true };
  }

  // 5. Date object / ISO string
  const d = new Date(requestedTime);
  if (!isNaN(d.getTime())) {
    return { valid: true };
  }

  return { valid: false, reason: "Please select a valid delivery time slot." };
}

// Retain legacy exports for backwards compatibility
export type DeliverySlot = DeliverySlotOption;

export function generateAvailableSlotsForDay(
  day: "today" | "tomorrow",
  referenceDate: Date = new Date()
) {
  return getAvailableSlots(day, referenceDate);
}
