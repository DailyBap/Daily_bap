"use client";

import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Circle,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import {
  Camera,
  Navigation,
  Loader2,
  Sparkles,
  MapPin,
  HelpCircle,
  RefreshCw,
  Gift,
} from "lucide-react";
import { KITCHEN_COORDS } from "@/lib/geo";
import QrScannerModal from "./QrScannerModal";
import CartDrawer from "@/components/CartDrawer";

interface PublicPin {
  id: number;
  lat: number;
  lng: number;
  radius: number;
  hint: string;
  status: "ACTIVE" | "DEPLETED";
}

function MapRecenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

export default function HuntMapClient() {
  const [pins, setPins] = useState<PublicPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [icons, setIcons] = useState<{
    userIcon: L.DivIcon;
    treasureActiveIcon: L.DivIcon;
    treasureDepletedIcon: L.DivIcon;
  } | null>(null);

  useEffect(() => {
    delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
      iconUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
      shadowUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    });

    const userIcon = new L.DivIcon({
      html: `<div style="background:#2563eb;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 0 10px rgba(37,99,235,0.8);animation:pulse 2s infinite"></div>`,
      className: "",
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });

    const treasureActiveIcon = new L.DivIcon({
      html: `<div style="background:#445916;color:white;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 3px 10px rgba(0,0,0,0.3);font-size:16px">🎁</div>`,
      className: "",
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    const treasureDepletedIcon = new L.DivIcon({
      html: `<div style="background:#9ca3af;color:white;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.2);font-size:14px;opacity:0.85">🔒</div>`,
      className: "",
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });

    setIcons({ userIcon, treasureActiveIcon, treasureDepletedIcon });
  }, []);

  const fetchPins = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hunt/pins", { cache: "no-store" });
      const data = await res.json();
      if (data.success && Array.isArray(data.pins)) {
        setPins(data.pins);
      }
    } catch (err) {
      console.error("[HuntMap] Failed to load pins:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPins();
  }, []);

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPos([pos.coords.latitude, pos.coords.longitude]);
        setLocating(false);
      },
      (err) => {
        console.warn("[HuntMap] Geolocation denied or unavailable:", err);
        setLocating(false);
        alert("Please enable location permissions in your browser to see your live position.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const defaultCenter: [number, number] = userPos || [
    KITCHEN_COORDS.lat,
    KITCHEN_COORDS.lng,
  ];

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] overflow-hidden">
      {/* Top Banner Control Panel */}
      <div className="absolute top-4 left-4 right-4 z-20 max-w-lg mx-auto bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-lg border border-gray-200/80 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#445916] text-white flex items-center justify-center font-bold">
              <Gift size={16} />
            </div>
            <div>
              <h1 className="font-display font-bold text-sm sm:text-base text-gray-900 leading-tight">
                Daily Bap Treasure Map
              </h1>
              <p className="text-[11px] text-gray-500">
                Guwahati QR Quest • Find & Scan to Unlock
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchPins}
              disabled={loading}
              className="p-2 rounded-xl border border-gray-200 hover:bg-gray-100 text-gray-600 transition"
              title="Refresh Pins"
              aria-label="Refresh Pins"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
            <button
              onClick={() => setCartOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-bold text-gray-800 transition"
            >
              Cart
            </button>
          </div>
        </div>

        <p className="text-xs text-gray-600 leading-relaxed bg-[#445916]/5 p-2.5 rounded-xl border border-[#445916]/10 flex items-start gap-2">
          <Sparkles size={14} className="text-[#445916] shrink-0 mt-0.5" />
          <span>
            QR codes are hidden inside the highlighted circles! Walk to a zone, look for the Daily Bap sticker, and scan it with the in-app camera.
          </span>
        </p>
      </div>

      {/* Map View */}
      <MapContainer
        center={defaultCenter}
        zoom={14}
        scrollWheelZoom={true}
        className="w-full h-full z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {userPos && <MapRecenter center={userPos} />}

        {/* User live position marker */}
        {userPos && icons && (
          <Marker position={userPos} icon={icons.userIcon}>
            <Popup>
              <div className="text-xs font-bold text-blue-600">You are here!</div>
            </Popup>
          </Marker>
        )}

        {/* Treasure Hunt circles & pins */}
        {pins.map((pin) => {
          const isActive = pin.status === "ACTIVE";
          const strokeColor = isActive ? "#445916" : "#9ca3af";
          const fillColor = isActive ? "#445916" : "#9ca3af";

          return (
            <div key={pin.id}>
              {/* Radius Hint Circle (80m) */}
              <Circle
                center={[pin.lat, pin.lng]}
                radius={pin.radius}
                pathOptions={{
                  color: strokeColor,
                  fillColor,
                  fillOpacity: isActive ? 0.22 : 0.1,
                  weight: 2,
                  dashArray: isActive ? undefined : "4, 6",
                }}
              />

              {/* Center icon */}
              {icons && (
                <Marker
                  position={[pin.lat, pin.lng]}
                  icon={
                    isActive
                      ? icons.treasureActiveIcon
                      : icons.treasureDepletedIcon
                  }
                >
                  <Popup>
                    <div className="space-y-1 text-xs p-1 max-w-[200px]">
                      <div className="flex items-center gap-1 font-bold">
                        <MapPin size={12} className={isActive ? "text-[#445916]" : "text-gray-400"} />
                        <span className={isActive ? "text-gray-900" : "text-gray-500"}>
                          {isActive ? "Active Treasure Zone" : "Depleted Treasure"}
                        </span>
                      </div>
                      <p className="text-gray-700 font-medium leading-snug">
                        {pin.hint}
                      </p>
                      {isActive ? (
                        <p className="text-[10px] text-[#445916] font-bold pt-1">
                          Scan the sticker to unlock 🎁
                        </p>
                      ) : (
                        <p className="text-[10px] text-gray-400 font-semibold pt-1">
                          All rewards claimed for this zone
                        </p>
                      )}
                    </div>
                  </Popup>
                </Marker>
              )}
            </div>
          );
        })}
      </MapContainer>

      {/* Floating Action Controls */}
      <div className="absolute bottom-8 right-6 z-20 flex flex-col items-end gap-3">
        {/* Locate Me Button */}
        <button
          onClick={handleLocateMe}
          disabled={locating}
          className="w-12 h-12 bg-white text-gray-800 rounded-full shadow-xl flex items-center justify-center hover:bg-gray-50 border border-gray-200 transition hover:scale-105 active:scale-95"
          title="Locate my position"
          aria-label="Locate my position"
        >
          {locating ? (
            <Loader2 size={20} className="animate-spin text-[#445916]" />
          ) : (
            <Navigation size={20} className={userPos ? "text-blue-600" : "text-gray-700"} />
          )}
        </button>

        {/* Primary Camera Scan Button */}
        <button
          onClick={() => setScannerOpen(true)}
          className="flex items-center gap-2 bg-[#445916] hover:bg-[#354611] text-white px-5 py-3.5 rounded-full shadow-2xl font-display font-bold text-sm transition-all hover:scale-105 active:scale-95 border-2 border-white"
        >
          <Camera size={20} className="text-amber-300" />
          <span>Scan QR Code</span>
        </button>
      </div>

      {/* Camera Scanner Modal */}
      <QrScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onOpenCart={() => setCartOpen(true)}
      />

      {/* Cart Drawer */}
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}
