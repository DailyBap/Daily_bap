// app/api/admin/settings/auto-review/route.ts — API Endpoint for Post-Delivery Auto Review Request setting

import { getAutoReviewRequestStatus, toggleAutoReviewRequest } from "@/app/actions/adminActions";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const isEnabled = await getAutoReviewRequestStatus();
    return NextResponse.json({ auto_review_request: isEnabled });
  } catch (error) {
    console.error("[Auto-Review Setting API Error]:", error);
    return NextResponse.json(
      { error: "Failed to fetch setting", auto_review_request: true },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const enabled = Boolean(body.enabled);
    const result = await toggleAutoReviewRequest(enabled);

    if (result.success) {
      return NextResponse.json({ success: true, auto_review_request: enabled });
    }
    return NextResponse.json({ error: result.error || "Failed to update setting" }, { status: 400 });
  } catch (error) {
    console.error("[Auto-Review Setting API Error]:", error);
    return NextResponse.json(
      { error: "Failed to update setting" },
      { status: 500 }
    );
  }
}
