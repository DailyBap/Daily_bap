// app/api/admin/influencers/[id]/route.ts — DELETE API Route for Creator Coupons

import { NextRequest, NextResponse } from "next/server";
import { deleteInfluencerAction } from "@/app/actions/influencerActions";
import { verifyAdminSession } from "@/lib/adminAuth";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await verifyAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing creator ID" }, { status: 400 });
  }

  const result = await deleteInfluencerAction(id);
  if (result.success) {
    return NextResponse.json({ success: true, message: "Creator deleted" });
  }

  return NextResponse.json(
    { error: result.error || "Failed to delete creator" },
    { status: 500 }
  );
}
