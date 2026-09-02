"use client";

import { useEffect, useState } from "react";
import { Clock, Calendar, AlertCircle } from "lucide-react";
import {
  generateAvailableSlotsForDay,
  isTodayOrderingClosed,
  DeliverySlot,
} from "@/lib/deliverySlots";
import { useCartStore } from "@/store/useCartStore";
import { deliveryTimeConfig, MAX_ORDERS_PER_SLOT } from "@/config/brand";
import { getSlotCapacities } from "@/app/actions/orderActions";

interface DeliveryTimePickerProps {
  error?: string | null;
}

export default function DeliveryTimePicker({ error }: DeliveryTimePickerProps) {
  const { requestedDeliveryTime, deliverySlotLabel, setDeliverySlot } =
    useCartStore();

  const [selectedDay, setSelectedDay] = useState<"today" | "tomorrow">("today");
  const [availableSlots, setAvailableSlots] = useState<DeliverySlot[]>([]);
  const [isTodayClosed, setIsTodayClosed] = useState(false);
  const [slotCapacities, setSlotCapacities] = useState<Record<string, number>>(
    {}
  );
  const [isLoading, setIsLoading] = useState(true);

  // Initialize day selection and slot generation
  useEffect(() => {
    const todayClosed = isTodayOrderingClosed();
    setIsTodayClosed(todayClosed);

    const initialDay = todayClosed ? "tomorrow" : "today";
    setSelectedDay(initialDay);

    const { slots } = generateAvailableSlotsForDay(initialDay);
    setAvailableSlots(slots);

    // Auto select first slot if nothing selected
    if (!requestedDeliveryTime && slots.length > 0) {
      setDeliverySlot(slots[0].timestamp, slots[0].label);
    }

    // Fetch capacity counts
    getSlotCapacities()
      .then((capacities) => setSlotCapacities(capacities))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  // Re-generate slots when selectedDay changes
  const handleDayToggle = (day: "today" | "tomorrow") => {
    if (day === "today" && isTodayClosed) return;
    setSelectedDay(day);

    const { slots } = generateAvailableSlotsForDay(day);
    setAvailableSlots(slots);

    if (slots.length > 0) {
      setDeliverySlot(slots[0].timestamp, slots[0].label);
    } else {
      setDeliverySlot(null, null);
    }
  };

  const handleSlotChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const found = availableSlots.find((s) => s.id === selectedId);
    if (found) {
      setDeliverySlot(found.timestamp, found.label);
    } else {
      setDeliverySlot(null, null);
    }
  };

  return (
    <div className="space-y-3 bg-gray-50/80 p-4 rounded-2xl border border-gray-200/80">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-1.5 text-xs font-bold text-gray-800 uppercase tracking-wider">
          <Clock className="w-4 h-4 text-[#445916]" />
          <span>{deliveryTimeConfig.label}</span>
        </label>
        <span className="text-[10px] text-gray-500 font-medium">
          45-min prep lead time
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
            <span className="text-[9px] bg-gray-300 text-gray-600 px-1.5 py-0.5 rounded uppercase">
              Closed
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

      {/* Notice if Today is closed */}
      {isTodayClosed && selectedDay === "tomorrow" && (
        <div className="flex items-center gap-1.5 text-xs bg-amber-50 text-amber-800 p-2.5 rounded-xl border border-amber-200">
          <Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>{deliveryTimeConfig.todayClosedNotice}</span>
        </div>
      )}

      {/* Time Slot Dropdown */}
      <div className="relative">
        <select
          value={
            availableSlots.find(
              (s) =>
                s.timestamp.toISOString() === requestedDeliveryTime ||
                (s.id === "asap" &&
                  requestedDeliveryTime &&
                  deliverySlotLabel?.startsWith("ASAP"))
            )?.id || ""
          }
          onChange={handleSlotChange}
          disabled={isLoading || availableSlots.length === 0}
          className={`w-full bg-white text-gray-800 text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border ${
            error
              ? "border-rose-500 focus:ring-rose-500"
              : "border-gray-300 focus:border-[#445916] focus:ring-[#445916]"
          } shadow-xs focus:outline-none transition-all`}
        >
          <option value="" disabled>
            {deliveryTimeConfig.selectPrompt}
          </option>
          {availableSlots.map((slot) => {
            const count = slotCapacities[slot.label] || 0;
            const isFull = count >= MAX_ORDERS_PER_SLOT;

            return (
              <option key={slot.id} value={slot.id} disabled={isFull}>
                {slot.label} {isFull ? "(FULL - Max Capacity)" : ""}
              </option>
            );
          })}
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
