// proxy.ts — Next.js middleware (named "proxy" per Next.js 16 convention)
// Admin security is enforced at the route/server-action level via adminAuth.ts (signed httpOnly cookie).
// This proxy layer does no auth itself to avoid conflicts with the cookie-based session.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
