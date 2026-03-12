import { NextResponse, type NextRequest } from "next/server";

const AUTH_COOKIE = "weekly_auth";

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow Next internals / static files
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/assets")
  ) {
    return NextResponse.next();
  }

  const authed = Boolean(req.cookies.get(AUTH_COOKIE)?.value);

  // If already authed, keep / as a landing redirect to /app
  if (authed && pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = "/app";
    return NextResponse.redirect(url);
  }

  // If not authed, everything except / should redirect to /
  if (!authed && pathname !== "/") {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"],
};
