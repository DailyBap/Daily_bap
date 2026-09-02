// lib/geo.ts — Geospatial utilities for Daily Bap delivery zone validation

export const KITCHEN_COORDS = {
  lat: 26.17162297327645,
  lng: 91.73686964365169,
} as const;

export const FREE_DELIVERY_RADIUS_KM = 3; // 0-3km = FREE delivery
export const MAX_DELIVERY_RADIUS_KM = 10; // 10km max serviceable radius
export const FREE_DELIVERY_THRESHOLD = 1000; // Free delivery for 3-10km if subtotal >= ₹1000
export const FLAT_DELIVERY_FEE = 50; // ₹50 delivery fee for 3-10km

/**
 * Haversine formula — calculates the great-circle distance
 * between two lat/lng coordinates in kilometres.
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculates distance-based delivery fee and deliverability:
 * - 0–3km: FREE delivery (₹0)
 * - 3–10km: ₹50 fee (FREE if subtotal >= ₹1000)
 * - >10km: Not deliverable
 */
export function calculateDeliveryFee(
  distanceKm: number | null | undefined,
  subtotal: number
): {
  fee: number;
  isDeliverable: boolean;
  isFreeTier: boolean;
  reason: string;
} {
  if (distanceKm == null) {
    // Default fallback when location is not yet pinned on map
    const defaultFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : FLAT_DELIVERY_FEE;
    return {
      fee: defaultFee,
      isDeliverable: true,
      isFreeTier: defaultFee === 0,
      reason: "Pin location on map to calculate exact delivery fee.",
    };
  }

  const roundedDistance = Math.round(distanceKm * 10) / 10;

  if (distanceKm > MAX_DELIVERY_RADIUS_KM) {
    return {
      fee: 0,
      isDeliverable: false,
      isFreeTier: false,
      reason: `Location is ${roundedDistance}km away, which exceeds our ${MAX_DELIVERY_RADIUS_KM}km delivery radius.`,
    };
  }

  if (distanceKm <= FREE_DELIVERY_RADIUS_KM) {
    return {
      fee: 0,
      isDeliverable: true,
      isFreeTier: true,
      reason: `🎉 Free Delivery (${roundedDistance}km — within 3km zone)!`,
    };
  }

  // 3km to 10km zone
  if (subtotal >= FREE_DELIVERY_THRESHOLD) {
    return {
      fee: 0,
      isDeliverable: true,
      isFreeTier: true,
      reason: `🎉 Free Delivery (${roundedDistance}km — order above ₹1000)!`,
    };
  }

  return {
    fee: FLAT_DELIVERY_FEE,
    isDeliverable: true,
    isFreeTier: false,
    reason: `🛵 Delivery Fee: ₹${FLAT_DELIVERY_FEE} (${roundedDistance}km away)`,
  };
}

/**
 * Checks whether the given coordinates fall within the
 * serviceable delivery radius (10km) from the Daily Bap kitchen.
 */
export function checkDeliveryZone(
  lat: number,
  lng: number
): { isDeliverable: boolean; distanceKm: number } {
  const distanceKm = haversineDistance(
    KITCHEN_COORDS.lat,
    KITCHEN_COORDS.lng,
    lat,
    lng
  );

  return {
    isDeliverable: distanceKm <= MAX_DELIVERY_RADIUS_KM,
    distanceKm: Math.round(distanceKm * 10) / 10,
  };
}
