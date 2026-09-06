import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect /admin routes using Basic HTTP Authentication
  if (pathname.startsWith("/admin")) {
    const authHeader = request.headers.get("authorization");
    const expectedPassword = process.env.ADMIN_PASSWORD || "dailybap_admin";

    if (authHeader) {
      const authValue = authHeader.split(" ")[1];
      if (authValue) {
        try {
          const [user, pwd] = atob(authValue).split(":");
          if (pwd === expectedPassword || user === expectedPassword) {
            return NextResponse.next();
          }
        } catch {
          // Invalid base64
        }
      }
    }

    return new NextResponse("Auth Required", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Daily Bap Admin"',
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
