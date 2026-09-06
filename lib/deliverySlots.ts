// lib/deliverySlots.ts — Static 15-Minute Slot Generation & Validation Logic

export interface StaticSlot {
  timeString: string; // e.g. "12:00 PM"
  hour: number;       // 24h format (12)
  minute: number;     // (0)
}

export interface DeliverySlotOption {
  id: string;         // e.g. "Today, 12:00 PM"
  label: string;      // e.g. "Today, 12:00 PM"
  day: "today" | "tomorrow";
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
 * Checks if ordering for "Today" is closed (past 10:00 PM / 22:00 local time).
 */
export function isTodayOrderingClosed(referenceDate: Date = new Date()): boolean {
  return referenceDate.getHours() >= 22;
}

/**
 * Generates available delivery slot options for an explicit day ("today" or "tomorrow").
 * 
 * Today:
 * - If past 10:00 PM, Today is closed.
 * - Calculate Earliest Delivery = Current Time + 75 minutes, rounded up to nearest 15-minute interval.
 * - If Earliest Delivery is before 12:00 PM (e.g. 9:00 AM), default available slots to start at 12:00 PM.
 * - Filter fixed array to only show slots >= Earliest Delivery.
 * 
 * Tomorrow:
 * - Display entire fixed array from 12:00 PM to 11:15 PM.
 */
export function getAvailableSlots(
  day: "today" | "tomorrow",
  now: Date = new Date()
): { slots: DeliverySlotOption[]; isTodayClosed: boolean } {
  const isTodayClosed = isTodayOrderingClosed(now);
  const staticSlots = generateStatic15MinSlots();

  if (day === "today") {
    if (isTodayClosed) {
      return { slots: [], isTodayClosed: true };
    }

    // Earliest Delivery = Current Time + 75 mins, rounded up to 15-min boundary
    const earliest = new Date(now.getTime() + 75 * 60 * 1000);
    const mins = earliest.getMinutes();
    const rem = mins % 15;
    if (rem > 0) {
      earliest.setMinutes(mins + (15 - rem), 0, 0);
    } else {
      earliest.setSeconds(0, 0);
    }

    const eHour = earliest.getHours();
    const eMin = earliest.getMinutes();

    // Filter static slots >= earliest delivery time (default to start at 12:00 PM if earliest is before 12:00 PM)
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
  } else {
    // Tomorrow: entire fixed array from 12:00 PM to 11:15 PM
    const options: DeliverySlotOption[] = staticSlots.map((s) => ({
      id: `Tomorrow, ${s.timeString}`,
      label: `Tomorrow, ${s.timeString}`,
      day: "tomorrow",
      timeString: s.timeString,
    }));

    return { slots: options, isTodayClosed };
  }
}

/**
 * Validation logic strictly checking clean string formats ("Today, 12:00 PM" or "Tomorrow, 1:15 PM").
 */
export function validateDeliveryTimeSlot(
  requestedTime: string | Date | null | undefined
): { valid: boolean; reason?: string } {
  if (!requestedTime) {
    return { valid: false, reason: "Please select a delivery time slot." };
  }

  const str = typeof requestedTime === "string" ? requestedTime : requestedTime.toString();

  if (
    str.startsWith("Today,") ||
    str.startsWith("Tomorrow,") ||
    str.startsWith("ASAP")
  ) {
    return { valid: true };
  }

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
