// lib/geo.ts — Geospatial utilities for Daily Bap delivery zone validation

export const KITCHEN_COORDS = {
  lat: 26.1445,
  lng: 91.7362,
} as const;

export const DELIVERY_RADIUS_KM = 5; // 5km radius from kitchen

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
 * Checks whether the given coordinates fall within the
 * serviceable delivery radius from the Daily Bap kitchen.
 *
 * @returns { isDeliverable, distanceKm }
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
    isDeliverable: distanceKm <= DELIVERY_RADIUS_KM,
    distanceKm: Math.round(distanceKm * 10) / 10, // 1 decimal place
  };
}
