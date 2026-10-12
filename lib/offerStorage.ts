// lib/offerStorage.ts — Hybrid Data Layer for Promotional Offers (Neon DB + JSON Fallback)
import fs from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { settings, offers } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";

export interface OfferData {
  id?: string;
  title: string;
  code: string;
  discountPercent: number;
  isActive: boolean;
  updatedAt?: string;
}

const DEFAULT_OFFER: OfferData = {
  title: "Get 10% OFF on all authentic Korean pre-orders!",
  code: "DAILY10",
  discountPercent: 10,
  isActive: true,
  updatedAt: new Date().toISOString(),
};

const DATA_DIR = path.join(process.cwd(), "data");
const OFFER_FILE = path.join(DATA_DIR, "offer.json");

/**
 * Fallback: Read offer data from local JSON file
 */
async function readOfferFromFile(): Promise<OfferData> {
  try {
    const raw = await fs.readFile(OFFER_FILE, "utf-8");
    return JSON.parse(raw) as OfferData;
  } catch {
    return DEFAULT_OFFER;
  }
}

/**
 * Fallback: Write offer data to local JSON file
 */
async function writeOfferToFile(data: OfferData): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(OFFER_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("[offerStorage] Failed to write fallback JSON:", err);
  }
}

/**
 * Get current active offer data.
 * Checks Neon database settings/offers first, falling back to local JSON file.
 */
export async function getActiveOfferData(): Promise<OfferData> {
  try {
    // 1. Try fetching from settings table key 'active_offer'
    const settingRow = await db
      .select()
      .from(settings)
      .where(eq(settings.key, "active_offer"))
      .limit(1);

    if (settingRow.length > 0 && settingRow[0].value) {
      try {
        const parsed = JSON.parse(settingRow[0].value);
        return {
          ...DEFAULT_OFFER,
          ...parsed,
        };
      } catch {
        // Continue to fallback
      }
    }

    // 2. Try fetching from existing offers table
    const activeDbOffer = await db
      .select()
      .from(offers)
      .where(eq(offers.isActive, true))
      .limit(1);

    if (activeDbOffer.length > 0) {
      const o = activeDbOffer[0];
      return {
        id: o.id,
        title: o.title,
        code: o.code,
        discountPercent: 10,
        isActive: o.isActive,
        updatedAt: o.createdAt.toISOString(),
      };
    }
  } catch (dbError) {
    console.warn("[offerStorage] DB query failed, using JSON fallback:", dbError);
  }

  // 3. Fallback to local JSON file
  return await readOfferFromFile();
}

/**
 * Save or update promotional offer data.
 * Updates both Neon database (settings + offers) and the JSON fallback file.
 */
export async function saveOfferData(
  payload: Partial<OfferData>
): Promise<OfferData> {
  const current = await getActiveOfferData();

  const updated: OfferData = {
    id: payload.id || current.id,
    title: payload.title !== undefined ? payload.title.trim() : current.title,
    code: payload.code !== undefined ? payload.code.trim().toUpperCase() : current.code,
    discountPercent:
      payload.discountPercent !== undefined
        ? Number(payload.discountPercent)
        : current.discountPercent,
    isActive: payload.isActive !== undefined ? Boolean(payload.isActive) : current.isActive,
    updatedAt: new Date().toISOString(),
  };

  // Persist to JSON fallback
  await writeOfferToFile(updated);

  // Persist to Neon DB
  try {
    // Upsert into settings table
    const existingSetting = await db
      .select()
      .from(settings)
      .where(eq(settings.key, "active_offer"))
      .limit(1);

    if (existingSetting.length > 0) {
      await db
        .update(settings)
        .set({
          value: JSON.stringify(updated),
          updatedAt: new Date(),
        })
        .where(eq(settings.key, "active_offer"));
    } else {
      await db.insert(settings).values({
        key: "active_offer",
        value: JSON.stringify(updated),
        updatedAt: new Date(),
      });
    }

    // Keep existing offers table in sync if applicable
    if (updated.id) {
      await db
        .update(offers)
        .set({
          title: updated.title,
          code: updated.code,
          isActive: updated.isActive,
        })
        .where(eq(offers.id, updated.id));
    }
  } catch (dbError) {
    console.warn("[offerStorage] DB update failed, changes saved to JSON fallback:", dbError);
  }

  return updated;
}

/**
 * Toggle the active status of the promotional offer.
 */
export async function toggleOfferActive(isActive: boolean): Promise<OfferData> {
  return await saveOfferData({ isActive });
}
