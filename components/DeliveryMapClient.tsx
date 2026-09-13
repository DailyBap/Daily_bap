"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, Circle } from "react-leaflet";
import { useCartStore } from "@/store/useCartStore";
import {
  checkDeliveryZone,
  KITCHEN_COORDS,
  FREE_DELIVERY_RADIUS_KM,
  MAX_DELIVERY_RADIUS_KM,
} from "@/lib/geo";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ----------------------------------------------------------
// Inner component that handles map click/drag for pin drop
// ----------------------------------------------------------
function PinDropper({ userIcon }: { userIcon: L.Icon | null }) {
  const customerInfo = useCartStore((s) => s.customerInfo);
  const setCustomerInfo = useCartStore((s) => s.setCustomerInfo);
  const setDeliverable = useCartStore((s) => s.setDeliverable);

  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      const { isDeliverable, distanceKm } = checkDeliveryZone(lat, lng);
      setCustomerInfo({ lat, lng });
      setDeliverable(isDeliverable, distanceKm);
    },
  });

  if (!customerInfo.lat || !customerInfo.lng || !userIcon) return null;

  return (
    <Marker
      position={[customerInfo.lat, customerInfo.lng]}
      icon={userIcon}
      draggable
      eventHandlers={{
        dragend(e) {
          const { lat, lng } = e.target.getLatLng();
          const { isDeliverable, distanceKm } = checkDeliveryZone(lat, lng);
          setCustomerInfo({ lat, lng });
          setDeliverable(isDeliverable, distanceKm);
        },
      }}
    />
  );
}

// ----------------------------------------------------------
// Main DeliveryMap export
// ----------------------------------------------------------
export default function DeliveryMapClient() {
  const customerInfo = useCartStore((s) => s.customerInfo);
  const isDeliverable = useCartStore((s) => s.isDeliverable);
  const distanceKm = useCartStore((s) => s.distanceKm);
  const getSubtotal = useCartStore((s) => s.getSubtotal);
  const subtotal = getSubtotal();

  const [icons, setIcons] = useState<{ userIcon: L.Icon; kitchenIcon: L.DivIcon } | null>(null);

  useEffect(() => {
    delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
      iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
      shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    });

    const userIcon = new L.Icon({
      iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
      iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
      shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });

    const kitchenIcon = new L.DivIcon({
      html: `<div style="background:#445916;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>`,
      className: "",
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });

    setIcons({ userIcon, kitchenIcon });
  }, []);

  return (
    <div className="relative w-full">
      {/* Status bar */}
      <div
        className={`text-xs font-medium px-3.5 py-2 rounded-t-xl flex items-center justify-between ${
          isDeliverable
            ? "bg-[#445916] text-white"
            : customerInfo.lat
            ? "bg-red-500 text-white"
            : "bg-[#445916] text-white"
        }`}
      >
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              isDeliverable ? "bg-emerald-300" : "bg-white/50"
            } animate-pulse`}
          />
          <span>
            {isDeliverable
              ? distanceKm != null && distanceKm <= FREE_DELIVERY_RADIUS_KM
                ? `✓ Within FREE delivery zone (${distanceKm}km)`
                : `✓ Serviceable zone (${distanceKm ?? "0"}km)`
              : customerInfo.lat
              ? `✗ Outside delivery zone (${distanceKm ?? "0"}km > ${MAX_DELIVERY_RADIUS_KM}km max)`
              : `📍 Tap the map to drop your delivery pin`}
          </span>
        </div>

        {isDeliverable && distanceKm != null && distanceKm > FREE_DELIVERY_RADIUS_KM && (
          <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">
            {subtotal >= 1000 ? "FREE (₹1000+)" : "₹50 fee"}
          </span>
        )}
      </div>

      <MapContainer
        center={[KITCHEN_COORDS.lat, KITCHEN_COORDS.lng]}
        zoom={12}
        style={{ height: "280px", width: "100%", borderRadius: "0 0 16px 16px" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* 1. Inner Circle — 3km Free Delivery Boundary */}
        <Circle
          center={[KITCHEN_COORDS.lat, KITCHEN_COORDS.lng]}
          radius={FREE_DELIVERY_RADIUS_KM * 1000}
          pathOptions={{
            color: "#10B981",
            fillColor: "#10B981",
            fillOpacity: 0.1,
            weight: 2,
            dashArray: "4 4",
          }}
        />

        {/* 2. Outer Circle — 10km Maximum Delivery Boundary */}
        <Circle
          center={[KITCHEN_COORDS.lat, KITCHEN_COORDS.lng]}
          radius={MAX_DELIVERY_RADIUS_KM * 1000}
          pathOptions={{
            color: "#445916",
            fillColor: "#9da613",
            fillOpacity: 0.05,
            weight: 2,
            dashArray: "8 4",
          }}
        />

        {icons && (
          <>
            {/* Kitchen marker */}
            <Marker
              position={[KITCHEN_COORDS.lat, KITCHEN_COORDS.lng]}
              icon={icons.kitchenIcon}
            />

            {/* User pin dropper */}
            <PinDropper userIcon={icons.userIcon} />
          </>
        )}
      </MapContainer>
    </div>
  );
}

