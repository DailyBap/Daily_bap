"use client";

import { useEffect, useState } from "react";
import { Clock, AlertCircle } from "lucide-react";
import {
  getAvailableSlots,
  isTodayOrderingClosed,
  DeliverySlotOption,
} from "@/lib/deliverySlots";
import { getKitchenStatus } from "@/app/actions/adminActions";
import { useCartStore } from "@/store/useCartStore";
import { deliveryTimeConfig } from "@/config/brand";

interface DeliveryTimePickerProps {
  error?: string | null;
}

export default function DeliveryTimePicker({ error }: DeliveryTimePickerProps) {
  const { requestedDeliveryTime, deliverySlotLabel, setDeliverySlot } =
    useCartStore();

  const [selectedDay, setSelectedDay] = useState<"today" | "tomorrow">("today");
  const [availableSlots, setAvailableSlots] = useState<DeliverySlotOption[]>([]);
  const [isTodayClosed, setIsTodayClosed] = useState(false);
  const [isHolidayMode, setIsHolidayMode] = useState(false);

  // Initialize day selection and slot generation
  useEffect(() => {
    let isMounted = true;
    async function checkStatus() {
      const holidayClosed = await getKitchenStatus();
      const cutoffClosed = isTodayOrderingClosed();
      const todayClosed = holidayClosed || cutoffClosed;

      if (!isMounted) return;
      setIsHolidayMode(holidayClosed);
      setIsTodayClosed(todayClosed);

      const activeDay = todayClosed ? "tomorrow" : "today";
      setSelectedDay(activeDay);

      const { slots } = getAvailableSlots(activeDay);
      setAvailableSlots(slots);

      // Auto-select first slot if nothing selected or if previously selected slot is for Today when Today is closed
      if (
        (!requestedDeliveryTime || !deliverySlotLabel || (todayClosed && deliverySlotLabel.startsWith("Today"))) &&
        slots.length > 0
      ) {
        setDeliverySlot(slots[0].label, slots[0].label);
      }
    }

    checkStatus();
    return () => {
      isMounted = false;
    };
  }, []);

  // Re-generate slots when selectedDay changes
  const handleDayToggle = (day: "today" | "tomorrow") => {
    if (day === "today" && isTodayClosed) return;
    setSelectedDay(day);

    const { slots } = getAvailableSlots(day);
    setAvailableSlots(slots);

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

  const selectedValue =
    availableSlots.find(
      (s) => s.label === requestedDeliveryTime || s.label === deliverySlotLabel
    )?.label || (availableSlots.length > 0 ? availableSlots[0].label : "");

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

      {/* Day Selector Segmented Tabs */}
      <div className="grid grid-cols-2 gap-1.5 bg-gray-200/80 p-1 rounded-xl text-xs font-bold">
        <button
          type="button"
          disabled={isTodayClosed}
          onClick={() => handleDayToggle("today")}
          className={`py-2 px-3 rounded-lg transition-all text-center flex items-center justify-center gap-1.5 ${
            selectedDay === "today"
              ? "bg-white text-[#445916] shadow-xs"
              : "text-gray-600 hover:text-gray-900"
          } ${isTodayClosed ? "opacity-50 cursor-not-allowed text-gray-400" : ""}`}
        >
          <span>{deliveryTimeConfig.todayLabel}</span>
          {isTodayClosed && (
            <span className="text-[9px] bg-red-200 text-red-700 px-1.5 py-0.5 rounded uppercase font-semibold">
              {isHolidayMode ? "Holiday" : "Closed"}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => handleDayToggle("tomorrow")}
          className={`py-2 px-3 rounded-lg transition-all text-center flex items-center justify-center gap-1.5 ${
            selectedDay === "tomorrow"
              ? "bg-[#445916] text-white shadow-xs"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <span>{deliveryTimeConfig.tomorrowLabel}</span>
        </button>
      </div>

      {/* Kitchen Closed / Holiday Alert */}
      {isTodayClosed && (
        <div className="flex items-center gap-1.5 text-xs bg-amber-50 text-amber-900 p-3 rounded-xl border border-amber-300 font-medium">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            {isHolidayMode
              ? "🏖️ Kitchen is closed today for holidays! Pre-order now for tomorrow's first delivery."
              : "Kitchen is closed for today! Pre-order now for tomorrow's first delivery."}
          </span>
        </div>
      )}

      {/* Time Slot Dropdown */}
      <div className="relative">
        <select
          value={selectedValue}
          onChange={handleSlotChange}
          disabled={availableSlots.length === 0}
          className={`w-full bg-white text-gray-800 text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border ${
            error
              ? "border-rose-500 focus:ring-rose-500"
              : "border-gray-300 focus:border-[#445916] focus:ring-[#445916]"
          } shadow-xs focus:outline-none transition-all`}
        >
          <option value="" disabled>
            {deliveryTimeConfig.selectPrompt}
          </option>
          {availableSlots.map((slot) => (
            <option key={slot.id} value={slot.label}>
              {slot.label}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="flex items-center gap-1 text-xs text-rose-600 font-medium">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

