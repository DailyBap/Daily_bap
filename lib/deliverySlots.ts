// lib/deliverySlots.ts — Delivery Slot Generation & Validation Logic

import {
  MIN_PREP_LEAD_MINUTES,
  KITCHEN_OPEN_HOUR,
  KITCHEN_CLOSE_HOUR,
  SLOT_INTERVAL_MINUTES,
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
 * Generates available 30-minute delivery time slots for today or tomorrow.
 */
export function generateAvailableSlots(referenceDate: Date = new Date()): {
  slots: DeliverySlot[];
  isTomorrow: boolean;
} {
  const now = new Date(referenceDate);
  const minPrepTime = new Date(now.getTime() + MIN_PREP_LEAD_MINUTES * 60 * 1000);

  // Check today's kitchen open and close times
  const todayOpen = new Date(now);
  todayOpen.setHours(KITCHEN_OPEN_HOUR, 0, 0, 0);

  const todayClose = new Date(now);
  todayClose.setHours(KITCHEN_CLOSE_HOUR, 0, 0, 0);

  // Start candidate time is max(minPrepTime, todayOpen) rounded up to 30 mins
  let startTime = minPrepTime > todayOpen ? minPrepTime : todayOpen;
  startTime = roundUpToInterval(startTime, SLOT_INTERVAL_MINUTES);

  let targetDate = new Date(now);
  let isTomorrow = false;

  // If earliest start time is past or equal to closing time, switch to tomorrow
  if (startTime >= todayClose || now >= todayClose) {
    isTomorrow = true;
    targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + 1);
    startTime = new Date(targetDate);
    startTime.setHours(KITCHEN_OPEN_HOUR, 0, 0, 0);
  }

  const datePrefix = isTomorrow ? "Tomorrow" : "Today";
  const closeTime = new Date(targetDate);
  closeTime.setHours(KITCHEN_CLOSE_HOUR, 0, 0, 0);

  const slots: DeliverySlot[] = [];

  // Add ASAP option as first slot
  const asapTimestamp = new Date(now.getTime() + MIN_PREP_LEAD_MINUTES * 60 * 1000);
  const asapEnd = new Date(asapTimestamp.getTime() + 30 * 60 * 1000);
  
  // Only offer ASAP if asapTimestamp is before closing time
  if (asapTimestamp < closeTime) {
    slots.push({
      id: "asap",
      label: `ASAP (${datePrefix}, ~${formatTime12h(asapTimestamp)} - ${formatTime12h(asapEnd)})`,
      timestamp: asapTimestamp,
      isAsap: true,
      isTomorrow,
    });
  }

  // Generate 30-minute interval slots
  let currentSlotStart = new Date(startTime);

  while (currentSlotStart < closeTime) {
    const currentSlotEnd = new Date(
      currentSlotStart.getTime() + SLOT_INTERVAL_MINUTES * 60 * 1000
    );

    if (currentSlotEnd > closeTime) break;

    const label = `${datePrefix}, ${formatTime12h(currentSlotStart)} – ${formatTime12h(currentSlotEnd)}`;

    slots.push({
      id: currentSlotStart.toISOString(),
      label,
      timestamp: new Date(currentSlotStart),
      isTomorrow,
    });

    currentSlotStart = currentSlotEnd;
  }

  return { slots, isTomorrow };
}

/**
 * Server-side validation of requested delivery time against operating hours and lead time
 */
export function validateDeliveryTimeSlot(
  requestedTime: Date | string,
  now: Date = new Date()
): { valid: boolean; reason?: string } {
  const reqDate = new Date(requestedTime);
  if (isNaN(reqDate.getTime())) {
    return { valid: false, reason: "Invalid delivery time format." };
  }

  const minAllowedTime = new Date(
    now.getTime() + (MIN_PREP_LEAD_MINUTES - 5) * 60 * 1000 // 5-min grace period for network latency
  );

  if (reqDate < minAllowedTime) {
    return {
      valid: false,
      reason: `Requested delivery time is earlier than the required ${MIN_PREP_LEAD_MINUTES}-minute preparation lead time.`,
    };
  }

  const hour = reqDate.getHours();
  if (hour < KITCHEN_OPEN_HOUR || hour >= KITCHEN_CLOSE_HOUR) {
    return {
      valid: false,
      reason: `Kitchen operating hours are ${KITCHEN_OPEN_HOUR}:00 AM to ${KITCHEN_CLOSE_HOUR}:00 PM. Requested slot is closed.`,
    };
  }

  return { valid: true };
}
