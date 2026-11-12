// lib/hunt/config.ts — Configuration constants for Daily Bap QR Treasure Hunt

export const HUNT_CONFIG = {
  /** Hold duration in minutes before an unredeemed voucher expires */
  HUNT_HOLD_MINUTES: 60,
  /** Whether to restore voucher claims and campaign capacity when an order is cancelled */
  HUNT_RESTORE_ON_CANCEL: true,
  /** Radius in meters of the hint circle displayed on the map */
  HINT_RADIUS_M: 80,
  /** If true, shows exact pin on map; if false, fuzzed circle */
  EXACT_PINS: false,
  /** QR payload code prefix */
  CODE_PREFIX: "BAP-",
  /** Client-facing voucher coupon prefix */
  VOUCHER_PREFIX: "HUNT-",
} as const;
