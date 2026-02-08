import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const ACCESS_COOKIE = 'school_live_access_token';

export function middleware(request: NextRequest) {
  const token = request.cookies.get(ACCESS_COOKIE)?.value;

  if (!token) {
    const path = request.nextUrl.pathname;
    const schoolSlug = path.split('/')[2];
    const loginUrl = new URL(`/schools/${schoolSlug}/login`, request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/schools/:schoolSlug/dashboard/:path*', '/schools/:schoolSlug/grades/:path*']
};
