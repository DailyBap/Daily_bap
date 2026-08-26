"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, Circle } from "react-leaflet";
import { useCartStore } from "@/store/useCartStore";
import { checkDeliveryZone, KITCHEN_COORDS, DELIVERY_RADIUS_KM } from "@/lib/geo";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default icon path issues in Next.js
delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Custom pin icon for user location
const userIcon = new L.Icon({
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Kitchen marker icon (red)
const kitchenIcon = new L.DivIcon({
  html: `<div style="background:#445916;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>`,
  className: "",
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

// ----------------------------------------------------------
// Inner component that handles map click/drag for pin drop
// ----------------------------------------------------------
function PinDropper() {
  const { customerInfo, setCustomerInfo, setDeliverable } = useCartStore();

  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      const { isDeliverable, distanceKm } = checkDeliveryZone(lat, lng);
      setCustomerInfo({ lat, lng });
      setDeliverable(isDeliverable);
    },
  });

  if (!customerInfo.lat || !customerInfo.lng) return null;

  return (
    <Marker
      position={[customerInfo.lat, customerInfo.lng]}
      icon={userIcon}
      draggable
      eventHandlers={{
        dragend(e) {
          const { lat, lng } = e.target.getLatLng();
          const { isDeliverable } = checkDeliveryZone(lat, lng);
          setCustomerInfo({ lat, lng });
          setDeliverable(isDeliverable);
        },
      }}
    />
  );
}

// ----------------------------------------------------------
// Main DeliveryMap export
// ----------------------------------------------------------
export default function DeliveryMapClient() {
  const { customerInfo, isDeliverable, setDeliverable } = useCartStore();

  return (
    <div className="relative w-full">
      {/* Status bar */}
      <div
        className={`text-xs font-medium px-3 py-1.5 rounded-t-xl flex items-center gap-2 ${
          isDeliverable
            ? "bg-green-600 text-white"
            : customerInfo.lat
            ? "bg-red-500 text-white"
            : "bg-brand-primary text-white"
        }`}
      >
        <span
          className={`w-2 h-2 rounded-full ${
            isDeliverable ? "bg-green-200" : "bg-white/50"
          } animate-pulse`}
        />
        {isDeliverable
          ? `✓ Within delivery zone — ${DELIVERY_RADIUS_KM}km radius`
          : customerInfo.lat
          ? `✗ Outside delivery zone — too far from our kitchen`
          : `📍 Tap the map to drop your delivery pin`}
      </div>

      <MapContainer
        center={[KITCHEN_COORDS.lat, KITCHEN_COORDS.lng]}
        zoom={13}
        style={{ height: "280px", width: "100%", borderRadius: "0 0 16px 16px" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Delivery zone circle */}
        <Circle
          center={[KITCHEN_COORDS.lat, KITCHEN_COORDS.lng]}
          radius={DELIVERY_RADIUS_KM * 1000}
          pathOptions={{
            color: "#445916",
            fillColor: "#9da613",
            fillOpacity: 0.08,
            weight: 2,
            dashArray: "8 4",
          }}
        />

        {/* Kitchen marker */}
        <Marker
          position={[KITCHEN_COORDS.lat, KITCHEN_COORDS.lng]}
          icon={kitchenIcon}
        />

        {/* User pin dropper */}
        <PinDropper />
      </MapContainer>
    </div>
  );
}
