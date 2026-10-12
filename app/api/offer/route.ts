// app/api/offer/route.ts — REST API for Offer Panel State Management
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  getActiveOfferData,
  saveOfferData,
  toggleOfferActive,
} from "@/lib/offerStorage";

export const dynamic = "force-dynamic";

/**
 * GET /api/offer
 * Fetch the current promotional offer state.
 */
export async function GET() {
  try {
    const offer = await getActiveOfferData();
    return NextResponse.json(
      {
        success: true,
        offer,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[GET /api/offer] Error fetching offer:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch offer data.",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/offer
 * Create or save new promotional offer content.
 * Body: { title: string, code: string, discountPercent?: number, isActive?: boolean }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { title, code, discountPercent, isActive } = body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json(
        { success: false, error: "Offer title is required." },
        { status: 400 }
      );
    }

    if (!code || typeof code !== "string" || !code.trim()) {
      return NextResponse.json(
        { success: false, error: "Offer promo code is required." },
        { status: 400 }
      );
    }

    const updated = await saveOfferData({
      title: title.trim(),
      code: code.trim().toUpperCase(),
      discountPercent:
        discountPercent !== undefined ? Number(discountPercent) : 10,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    });

    revalidatePath("/");
    revalidatePath("/admin");

    return NextResponse.json(
      {
        success: true,
        message: "Offer saved successfully.",
        offer: updated,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[POST /api/offer] Error saving offer:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to save offer. Please check request body.",
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/offer
 * Update or toggle existing offer properties (e.g. toggling active status).
 * Body: { isActive?: boolean, title?: string, code?: string, discountPercent?: number }
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.isActive !== undefined && Object.keys(body).length === 1) {
      // Direct toggle
      const updated = await toggleOfferActive(Boolean(body.isActive));
      revalidatePath("/");
      revalidatePath("/admin");
      return NextResponse.json(
        {
          success: true,
          message: `Offer ${updated.isActive ? "activated" : "deactivated"} successfully.`,
          offer: updated,
        },
        { status: 200 }
      );
    }

    // Partial field update
    const updated = await saveOfferData(body);
    revalidatePath("/");
    revalidatePath("/admin");

    return NextResponse.json(
      {
        success: true,
        message: "Offer updated successfully.",
        offer: updated,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[PUT /api/offer] Error updating offer:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update offer.",
      },
      { status: 500 }
    );
  }
}
