// app/actions/offerActions.ts — Next.js Server Actions for Offers Management

"use server";

import { db } from "@/lib/db";
import { offers } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

/**
 * Fetch all offers, ordered by newest first.
 */
export async function getOffers() {
  try {
    const result = await db
      .select()
      .from(offers)
      .orderBy(desc(offers.createdAt));
    return result;
  } catch (error) {
    console.error("[getOffers] Error fetching offers:", error);
    return [];
  }
}

/**
 * Create a new offer using FormData or explicit title/code arguments.
 */
export async function createOffer(data: FormData | { title: string; code: string }) {
  try {
    let title = "";
    let code = "";

    if (data instanceof FormData) {
      title = (data.get("title") as string) || "";
      code = (data.get("code") as string) || "";
    } else {
      title = data.title;
      code = data.code;
    }

    if (!title.trim() || !code.trim()) {
      return { success: false, error: "Title and promo code are required." };
    }

    await db.insert(offers).values({
      title: title.trim(),
      code: code.trim().toUpperCase(),
      isActive: false,
    });

    revalidatePath("/admin");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("[createOffer] Error creating offer:", error);
    return { success: false, error: "Failed to create offer" };
  }
}

/**
 * Toggle an offer's active status.
 */
export async function toggleOffer(id: string, isActive: boolean) {
  try {
    if (isActive) {
      // Deactivate all existing active offers to enforce single active banner rule
      await db.update(offers).set({ isActive: false });
    }

    await db
      .update(offers)
      .set({ isActive })
      .where(eq(offers.id, id));

    revalidatePath("/admin");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("[toggleOffer] Error toggling offer:", error);
    return { success: false, error: "Failed to toggle offer" };
  }
}
