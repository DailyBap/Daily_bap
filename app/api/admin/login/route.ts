import { NextResponse } from "next/server";
import { loginAdmin } from "@/lib/adminAuth";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({})) as { password?: string };
    const result = await loginAdmin(body.password ?? "");
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Login failed" },
      { status: 500 }
    );
  }
}
