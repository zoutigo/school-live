import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const ACCESS_COOKIE = "school_live_access_token";

export function middleware(request: NextRequest) {
  const token = request.cookies.get(ACCESS_COOKIE)?.value;

  if (!token) {
    const path = request.nextUrl.pathname;
    if (path.startsWith("/schools/")) {
      const schoolSlug = path.split("/")[2];
      const loginUrl = new URL(`/schools/${schoolSlug}/login`, request.url);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/acceuil/:path*",
    "/account",
    "/account/:path*",
    "/schools",
    "/classes",
    "/classes/:path*",
    "/enrollments",
    "/enrollments/:path*",
    "/users",
    "/users/:path*",
    "/indicators",
    "/indicators/:path*",
    "/schools/:schoolSlug/dashboard/:path*",
    "/schools/:schoolSlug/grades/:path*",
  ],
};
