// lib/deliverySlots.ts — Delivery Slot Generation & Validation Logic

import {
  MIN_PREP_LEAD_MINUTES,
  KITCHEN_OPEN_HOUR,
  KITCHEN_CLOSE_HOUR,
  SLOT_INTERVAL_MINUTES,
  MAX_PREORDER_DAYS,
} from "@/config/brand";

export interface DeliverySlot {
  id: string; // ISO timestamp string or "asap"
  label: string; // Human-readable e.g. "Today, 7:30–8:00 PM"
  timestamp: Date;
  isAsap?: boolean;
  isTomorrow?: boolean;
}

/**
 * Formats a Date object into a 12-hour time string (e.g. "7:30 PM")
 */
function formatTime12h(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Rounds a date up to the next interval boundary (e.g., 30 minutes)
 */
function roundUpToInterval(date: Date, intervalMinutes: number): Date {
  const ms = 1000 * 60 * intervalMinutes;
  return new Date(Math.ceil(date.getTime() / ms) * ms);
}

/**
 * Checks if ordering for "Today" is closed (past closing time or past last prep slot).
 */
export function isTodayOrderingClosed(referenceDate: Date = new Date()): boolean {
  const now = new Date(referenceDate);
  const todayClose = new Date(now);
  todayClose.setHours(KITCHEN_CLOSE_HOUR, 0, 0, 0);

  const minPrepTime = new Date(
    now.getTime() + MIN_PREP_LEAD_MINUTES * 60 * 1000
  );
  const roundedStart = roundUpToInterval(minPrepTime, SLOT_INTERVAL_MINUTES);

  return roundedStart >= todayClose || now >= todayClose;
}

/**
 * Generates available 30-minute delivery time slots for an explicit day ("today" or "tomorrow").
 */
export function generateAvailableSlotsForDay(
  day: "today" | "tomorrow",
  referenceDate: Date = new Date()
): { slots: DeliverySlot[]; isTodayClosed: boolean } {
  const now = new Date(referenceDate);
  const todayClosed = isTodayOrderingClosed(now);

  if (day === "today") {
    if (todayClosed) {
      return { slots: [], isTodayClosed: true };
    }

    const minPrepTime = new Date(
      now.getTime() + MIN_PREP_LEAD_MINUTES * 60 * 1000
    );
    const todayOpen = new Date(now);
    todayOpen.setHours(KITCHEN_OPEN_HOUR, 0, 0, 0);

    const todayClose = new Date(now);
    todayClose.setHours(KITCHEN_CLOSE_HOUR, 0, 0, 0);

    let startTime = minPrepTime > todayOpen ? minPrepTime : todayOpen;
    startTime = roundUpToInterval(startTime, SLOT_INTERVAL_MINUTES);

    const slots: DeliverySlot[] = [];

    // Add ASAP option
    const asapTimestamp = new Date(
      now.getTime() + MIN_PREP_LEAD_MINUTES * 60 * 1000
    );
    const asapEnd = new Date(asapTimestamp.getTime() + 30 * 60 * 1000);

    if (asapTimestamp < todayClose) {
      slots.push({
        id: "asap",
        label: `ASAP (Today, ~${formatTime12h(asapTimestamp)} - ${formatTime12h(asapEnd)})`,
        timestamp: asapTimestamp,
        isAsap: true,
        isTomorrow: false,
      });
    }

    let currentSlotStart = new Date(startTime);
    while (currentSlotStart < todayClose) {
      const currentSlotEnd = new Date(
        currentSlotStart.getTime() + SLOT_INTERVAL_MINUTES * 60 * 1000
      );
      if (currentSlotEnd > todayClose) break;

      const label = `Today, ${formatTime12h(currentSlotStart)} – ${formatTime12h(currentSlotEnd)}`;

      slots.push({
        id: currentSlotStart.toISOString(),
        label,
        timestamp: new Date(currentSlotStart),
        isTomorrow: false,
      });

      currentSlotStart = currentSlotEnd;
    }

    return { slots, isTodayClosed: false };
  } else {
    // Tomorrow slots (spans full operating hours 11:00 AM - 10:00 PM)
    const tomorrowDate = new Date(now);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);

    const tomorrowOpen = new Date(tomorrowDate);
    tomorrowOpen.setHours(KITCHEN_OPEN_HOUR, 0, 0, 0);

    const tomorrowClose = new Date(tomorrowDate);
    tomorrowClose.setHours(KITCHEN_CLOSE_HOUR, 0, 0, 0);

    const slots: DeliverySlot[] = [];
    let currentSlotStart = new Date(tomorrowOpen);

    while (currentSlotStart < tomorrowClose) {
      const currentSlotEnd = new Date(
        currentSlotStart.getTime() + SLOT_INTERVAL_MINUTES * 60 * 1000
      );
      if (currentSlotEnd > tomorrowClose) break;

      const label = `Tomorrow, ${formatTime12h(currentSlotStart)} – ${formatTime12h(currentSlotEnd)}`;

      slots.push({
        id: currentSlotStart.toISOString(),
        label,
        timestamp: new Date(currentSlotStart),
        isTomorrow: true,
      });

      currentSlotStart = currentSlotEnd;
    }

    return { slots, isTodayClosed: todayClosed };
  }
}

/**
 * Server-side validation of requested delivery time against date range, operating hours, and lead time
 */
export function validateDeliveryTimeSlot(
  requestedTime: Date | string,
  now: Date = new Date()
): { valid: boolean; reason?: string } {
  const reqDate = new Date(requestedTime);
  if (isNaN(reqDate.getTime())) {
    return { valid: false, reason: "Invalid delivery time format." };
  }

  // 1. Verify date is within MAX_PREORDER_DAYS (Today or Tomorrow)
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const maxAllowedDate = new Date(startOfToday);
  maxAllowedDate.setDate(maxAllowedDate.getDate() + MAX_PREORDER_DAYS);

  if (reqDate < startOfToday || reqDate >= maxAllowedDate) {
    return {
      valid: false,
      reason: `Orders can only be scheduled within ${MAX_PREORDER_DAYS} days (Today or Tomorrow).`,
    };
  }

  const isToday = reqDate.toDateString() === now.toDateString();

  // 2. If ordering for Today, verify lead time buffer
  if (isToday) {
    const minAllowedTime = new Date(
      now.getTime() + (MIN_PREP_LEAD_MINUTES - 5) * 60 * 1000 // 5-min grace period for server latency
    );

    if (reqDate < minAllowedTime) {
      return {
        valid: false,
        reason: `Requested delivery time is earlier than the required ${MIN_PREP_LEAD_MINUTES}-minute preparation lead time.`,
      };
    }
  }

  // 3. Verify operating hours (11:00 AM to 10:00 PM)
  const hour = reqDate.getHours();
  if (hour < KITCHEN_OPEN_HOUR || hour >= KITCHEN_CLOSE_HOUR) {
    return {
      valid: false,
      reason: `Kitchen operating hours are ${KITCHEN_OPEN_HOUR}:00 AM to ${KITCHEN_CLOSE_HOUR}:00 PM. Requested slot is closed.`,
    };
  }

  return { valid: true };
}
