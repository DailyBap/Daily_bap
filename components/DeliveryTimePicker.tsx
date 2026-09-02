"use client";

import { useEffect, useState } from "react";
import { Clock, Calendar, AlertCircle } from "lucide-react";
import { generateAvailableSlots, DeliverySlot } from "@/lib/deliverySlots";
import { useCartStore } from "@/store/useCartStore";
import { deliveryTimeConfig, MAX_ORDERS_PER_SLOT } from "@/config/brand";
import { getSlotCapacities } from "@/app/actions/orderActions";

interface DeliveryTimePickerProps {
  error?: string | null;
}

export default function DeliveryTimePicker({ error }: DeliveryTimePickerProps) {
  const { requestedDeliveryTime, deliverySlotLabel, setDeliverySlot } =
    useCartStore();

  const [availableSlots, setAvailableSlots] = useState<DeliverySlot[]>([]);
  const [isTomorrow, setIsTomorrow] = useState(false);
  const [slotCapacities, setSlotCapacities] = useState<Record<string, number>>(
    {}
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const { slots, isTomorrow: tomorrowFlag } = generateAvailableSlots();
    setAvailableSlots(slots);
    setIsTomorrow(tomorrowFlag);

    // Auto select ASAP if no slot selected yet
    if (!requestedDeliveryTime && slots.length > 0) {
      const firstSlot = slots[0];
      setDeliverySlot(firstSlot.timestamp, firstSlot.label);
    }

    // Fetch slot capacities from server action
    getSlotCapacities()
      .then((capacities) => setSlotCapacities(capacities))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

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
    <div className="space-y-2">
      <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 uppercase tracking-wider">
        <Clock className="w-4 h-4 text-[#445916]" />
        <span>{deliveryTimeConfig.label}</span>
      </label>

      {isTomorrow && (
        <div className="flex items-center gap-1.5 text-xs bg-amber-50 text-amber-800 p-2 rounded-lg border border-amber-200">
          <Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>{deliveryTimeConfig.kitchenClosedNotice}</span>
        </div>
      )}

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
          className={`w-full bg-white text-gray-800 text-xs sm:text-sm px-3 py-2.5 rounded-xl border ${
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

      <p className="text-[11px] text-gray-500 italic">
        {deliveryTimeConfig.leadTimeNotice}
      </p>

      {error && (
        <div className="flex items-center gap-1 text-xs text-rose-600 font-medium">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
