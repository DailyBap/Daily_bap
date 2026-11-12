// app/api/hunt/pins/route.ts — Public API returning fuzzed treasure location circles

import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { campaignCodes } from "@/lib/schema";
import { isHuntEnabled } from "@/lib/pricing";
import { HUNT_CONFIG } from "@/lib/hunt/config";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * Generates a stable deterministic pseudo-random offset within [minMeters, maxMeters]
 * based on the code id and secret PIN_SALT.
 */
function getDeterministicFuzzedCoordinates(
  id: number,
  exactLat: number,
  exactLng: number,
  salt: string
) {
  const hash = crypto
    .createHmac("sha256", salt)
    .update(`pin_${id}`)
    .digest();

  // Deterministic angle [0, 2*PI]
  const angle = (hash.readUInt16BE(0) / 65535) * 2 * Math.PI;

  // Deterministic distance between 20m and 55m (so exact pin is always well inside the 80m circle)
  const distanceMeters = 20 + (hash.readUInt16BE(2) / 65535) * 35;

  // Approx conversions for Guwahati (~26° N)
  const metersPerDegreeLat = 111320;
  const metersPerDegreeLng = 111320 * Math.cos((exactLat * Math.PI) / 180);

  const deltaLat = (distanceMeters * Math.sin(angle)) / metersPerDegreeLat;
  const deltaLng = (distanceMeters * Math.cos(angle)) / metersPerDegreeLng;

  return {
    lat: Number((exactLat + deltaLat).toFixed(6)),
    lng: Number((exactLng + deltaLng).toFixed(6)),
  };
}

export async function GET() {
  const enabled = await isHuntEnabled();
  if (!enabled) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const salt = process.env.PIN_SALT || "daily_bap_hunt_default_secret_salt_2026";

    const rows = await db
      .select({
        id: campaignCodes.id,
        lat: campaignCodes.lat,
        lng: campaignCodes.lng,
        locationHint: campaignCodes.locationHint,
        status: campaignCodes.status,
        currentClaims: campaignCodes.currentClaims,
        maxClaims: campaignCodes.maxClaims,
      })
      .from(campaignCodes)
      .where(
        sql`${campaignCodes.lat} IS NOT NULL AND ${campaignCodes.lng} IS NOT NULL`
      );

    const publicPins = rows.map((row) => {
      const isDepleted =
        row.status === "DEPLETED" || row.currentClaims >= row.maxClaims;

      // In EXACT_PINS mode, show exact; otherwise apply deterministic fuzz
      const coords = HUNT_CONFIG.EXACT_PINS
        ? { lat: row.lat!, lng: row.lng! }
        : getDeterministicFuzzedCoordinates(row.id, row.lat!, row.lng!, salt);

      return {
        id: row.id,
        lat: coords.lat,
        lng: coords.lng,
        radius: HUNT_CONFIG.HINT_RADIUS_M,
        hint: row.locationHint || "A secret treasure hidden in Guwahati!",
        status: isDepleted ? "DEPLETED" : "ACTIVE",
      };
    });

    return NextResponse.json(
      {
        success: true,
        pins: publicPins,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        },
      }
    );
  } catch (error) {
    console.error("[GET /api/hunt/pins] Error fetching pins:", error);
    return NextResponse.json(
      { error: "Failed to load treasure pins" },
      { status: 500 }
    );
  }
}
