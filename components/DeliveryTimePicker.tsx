"use client";

import { useEffect, useState, useMemo } from "react";
import { Clock, AlertCircle, Calendar } from "lucide-react";
import {
  getAvailableSlots,
  isTodayOrderingClosed,
  DeliverySlotOption,
} from "@/lib/deliverySlots";
import { useCartStore } from "@/store/useCartStore";
import { deliveryTimeConfig } from "@/config/brand";
import type { ClosureInfo } from "@/lib/storeStatus";
import { isDateClosed } from "@/lib/storeStatus";
import {
  todayIST,
  tomorrowIST,
  addDaysIST,
  diffDaysIST,
  weekdayAbbrevIST,
  formatShortDateIST,
  formatDisplayDateIST,
} from "@/lib/dateUtils";

interface DeliveryTimePickerProps {
  error?: string | null;
  closureInfo: ClosureInfo | null;
}

interface DayOption {
  dateStr: string;
  dayLabel: string;
  isToday: boolean;
  isTomorrow: boolean;
  isClosed: boolean;
  closedReason?: string;
}

export default function DeliveryTimePicker({
  error,
  closureInfo,
}: DeliveryTimePickerProps) {
  const { requestedDeliveryTime, deliverySlotLabel, setDeliverySlot } =
    useCartStore();

  const today = todayIST();
  const tomorrow = tomorrowIST();

  // Compute all days in scheduling window
  // Rule: At least 10 days, or max(10, reopening day + 2 days) when closure is active
  const dayOptions: DayOption[] = useMemo(() => {
    let windowDays = 10;
    if (closureInfo && closureInfo.active) {
      const daysUntilReopen = diffDaysIST(today, closureInfo.reopenDate);
      windowDays = Math.max(10, daysUntilReopen + 2);
    } else {
      // Normal operating mode: 2 days (Today & Tomorrow)
      windowDays = 2;
    }

    const options: DayOption[] = [];
    const isTodayCutoffClosed = isTodayOrderingClosed();

    for (let offset = 0; offset < windowDays; offset++) {
      const dateStr = addDaysIST(today, offset);
      const isToday = dateStr === today;
      const isTomorrow = dateStr === tomorrow;

      const holidayClosed = isDateClosed(dateStr, closureInfo);
      const isClosed = holidayClosed || (isToday && isTodayCutoffClosed);

      let closedReason: string | undefined;
      if (holidayClosed) {
        closedReason = "Closed";
      } else if (isToday && isTodayCutoffClosed) {
        closedReason = "Closed";
      }

      let dayLabel: string;
      if (isToday) {
        dayLabel = deliveryTimeConfig.todayLabel;
      } else if (isTomorrow) {
        dayLabel = deliveryTimeConfig.tomorrowLabel;
      } else {
        dayLabel = `${weekdayAbbrevIST(dateStr)}, ${formatShortDateIST(dateStr)}`;
      }

      options.push({
        dateStr,
        dayLabel,
        isToday,
        isTomorrow,
        isClosed,
        closedReason,
      });
    }

    return options;
  }, [closureInfo, today, tomorrow]);

  // Find the first open day
  const firstOpenDay = useMemo(() => {
    return dayOptions.find((d) => !d.isClosed) || null;
  }, [dayOptions]);

  // Selected date state
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
    return firstOpenDay?.dateStr ?? today;
  });

  // Keep selectedDateStr valid if closure status changes
  useEffect(() => {
    const currentSelected = dayOptions.find((d) => d.dateStr === selectedDateStr);
    if (!currentSelected || currentSelected.isClosed) {
      if (firstOpenDay) {
        setSelectedDateStr(firstOpenDay.dateStr);
      }
    }
  }, [dayOptions, firstOpenDay, selectedDateStr]);

  // Generate slots for the selected day
  const availableSlots: DeliverySlotOption[] = useMemo(() => {
    const dayOpt = dayOptions.find((d) => d.dateStr === selectedDateStr);
    if (!dayOpt || dayOpt.isClosed) {
      return [];
    }

    const param = dayOpt.isToday
      ? "today"
      : dayOpt.isTomorrow
      ? "tomorrow"
      : dayOpt.dateStr;

    const { slots } = getAvailableSlots(param);
    return slots;
  }, [dayOptions, selectedDateStr]);

  // Persisted cart validation & initial slot synchronization
  useEffect(() => {
    if (availableSlots.length === 0) return;

    // Check if the current deliverySlotLabel in the cart is valid
    const currentLabel = deliverySlotLabel || requestedDeliveryTime;
    let needsReset = false;

    if (!currentLabel) {
      needsReset = true;
    } else if (typeof currentLabel === "string") {
      // If selected slot is for Today but Today is closed
      const isTodayClosed = dayOptions.find((d) => d.isToday)?.isClosed;
      if (isTodayClosed && (currentLabel.startsWith("Today") || currentLabel.startsWith("ASAP"))) {
        needsReset = true;
      }

      // Check if slot falls in holiday closure range
      if (closureInfo && closureInfo.active) {
        // If label is Today/Tomorrow/Dated, check if that date is closed
        if (currentLabel.startsWith("Today") && isDateClosed(today, closureInfo)) {
          needsReset = true;
        } else if (currentLabel.startsWith("Tomorrow") && isDateClosed(tomorrow, closureInfo)) {
          needsReset = true;
        }
      }
    }

    // Auto-select first slot of first open day if slot was empty or closed
    if (needsReset) {
      setDeliverySlot(availableSlots[0].label, availableSlots[0].label);
    }
  }, [availableSlots, deliverySlotLabel, requestedDeliveryTime, dayOptions, closureInfo, today, tomorrow, setDeliverySlot]);

  const handleDaySelect = (dateStr: string) => {
    const dayOpt = dayOptions.find((d) => d.dateStr === dateStr);
    if (!dayOpt || dayOpt.isClosed) return;

    setSelectedDateStr(dateStr);

    const param = dayOpt.isToday
      ? "today"
      : dayOpt.isTomorrow
      ? "tomorrow"
      : dayOpt.dateStr;

    const { slots } = getAvailableSlots(param);
    if (slots.length > 0) {
      setDeliverySlot(slots[0].label, slots[0].label);
    } else {
      setDeliverySlot(null, null);
    }
  };

  const handleSlotChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedVal = e.target.value;
    const found = availableSlots.find((s) => s.label === selectedVal);
    if (found) {
      setDeliverySlot(found.label, found.label);
    } else {
      setDeliverySlot(null, null);
    }
  };

  const selectedSlotValue =
    availableSlots.find(
      (s) => s.label === requestedDeliveryTime || s.label === deliverySlotLabel
    )?.label || (availableSlots.length > 0 ? availableSlots[0].label : "");

  // Note under picker if closure active
  const closureNote = useMemo(() => {
    if (!closureInfo || !closureInfo.active) return null;
    const nextOpenStr = firstOpenDay
      ? formatDisplayDateIST(firstOpenDay.dateStr)
      : formatDisplayDateIST(closureInfo.reopenDate);

    const startStr = formatDisplayDateIST(closureInfo.start);
    const endStr = formatDisplayDateIST(closureInfo.end);

    let text = "";
    if (closureInfo.start === closureInfo.end) {
      text = `Kitchen closed on ${startStr}. Next available delivery: ${nextOpenStr}.`;
    } else {
      text = `Kitchen closed ${startStr} to ${endStr}. Next available delivery: ${nextOpenStr}.`;
    }

    if (closureInfo.message) {
      text += ` (${closureInfo.message})`;
    }

    return text;
  }, [closureInfo, firstOpenDay]);

  const todayIsClosed = dayOptions.find((d) => d.isToday)?.isClosed ?? false;
  const isMultiDayView = dayOptions.length > 2;

  return (
    <div className="space-y-3 bg-gray-50/80 p-4 rounded-2xl border border-gray-200/80">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-1.5 text-xs font-bold text-gray-800 uppercase tracking-wider">
          <Clock className="w-4 h-4 text-[#445916]" />
          <span>{deliveryTimeConfig.label}</span>
        </label>
        <span className="text-[10px] text-gray-500 font-medium">
          {deliveryTimeConfig.leadTimeShort}
        </span>
      </div>

      {/* Day Selector */}
      {isMultiDayView ? (
        <div className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin text-xs font-bold">
          {dayOptions.map((day) => {
            const isSelected = selectedDateStr === day.dateStr;
            return (
              <button
                key={day.dateStr}
                type="button"
                disabled={day.isClosed}
                onClick={() => handleDaySelect(day.dateStr)}
                className={`py-2 px-3 rounded-xl transition-all shrink-0 flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-[#445916] text-white shadow-xs"
                    : day.isClosed
                    ? "bg-gray-100 text-gray-400 border border-gray-200/60 opacity-60 cursor-not-allowed"
                    : "bg-white text-gray-700 hover:text-gray-900 border border-gray-200 shadow-xs"
                }`}
              >
                <span>{day.dayLabel}</span>
                {day.isClosed && (
                  <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-semibold uppercase">
                    {day.closedReason}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-1.5 bg-gray-200/80 p-1 rounded-xl text-xs font-bold">
          {dayOptions.map((day) => {
            const isSelected = selectedDateStr === day.dateStr;
            return (
              <button
                key={day.dateStr}
                type="button"
                disabled={day.isClosed}
                onClick={() => handleDaySelect(day.dateStr)}
                className={`py-2 px-3 rounded-lg transition-all text-center flex items-center justify-center gap-1.5 ${
                  isSelected
                    ? "bg-white text-[#445916] shadow-xs"
                    : "text-gray-600 hover:text-gray-900"
                } ${day.isClosed ? "opacity-50 cursor-not-allowed text-gray-400" : ""}`}
              >
                <span>{day.dayLabel}</span>
                {day.isClosed && (
                  <span className="text-[9px] bg-red-200 text-red-700 px-1.5 py-0.5 rounded uppercase font-semibold">
                    {day.closedReason}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Notice if Today is closed */}
      {todayIsClosed && (
        <div className="flex items-center gap-1.5 text-xs bg-amber-50 text-amber-900 p-3 rounded-xl border border-amber-300 font-medium">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            {closureInfo?.active
              ? `🏖️ Kitchen is closed today for holidays. Pre-order now for ${
                  firstOpenDay?.dayLabel ?? "our next open date"
                }!`
              : "Kitchen is closed for today! Pre-order now for tomorrow's first delivery."}
          </span>
        </div>
      )}

      {/* Time Slot Dropdown */}
      <div className="relative">
        <select
          value={selectedSlotValue}
          onChange={handleSlotChange}
          disabled={availableSlots.length === 0}
          className={`w-full bg-white text-gray-800 text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border ${
            error
              ? "border-rose-500 focus:ring-rose-500"
              : "border-gray-300 focus:border-[#445916] focus:ring-[#445916]"
          } shadow-xs focus:outline-none transition-all`}
        >
          <option value="" disabled>
            {availableSlots.length === 0
              ? "No available delivery slots for this date"
              : deliveryTimeConfig.selectPrompt}
          </option>
          {availableSlots.map((slot) => (
            <option key={slot.id} value={slot.label}>
              {slot.label}
            </option>
          ))}
        </select>
      </div>

      {/* Short Note Under Picker */}
      {closureNote && (
        <div className="flex items-start gap-1.5 text-[11px] text-amber-800 bg-amber-50/70 p-2.5 rounded-xl border border-amber-200/80">
          <Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
          <span>{closureNote}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-1 text-xs text-rose-600 font-medium">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
