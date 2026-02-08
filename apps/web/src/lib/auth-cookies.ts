const ACCESS_COOKIE = 'school_live_access_token';

export function setAccessCookie(accessToken: string, maxAge: number) {
  document.cookie = `${ACCESS_COOKIE}=${encodeURIComponent(accessToken)}; Max-Age=${maxAge}; Path=/; SameSite=Lax`;
}

export function clearAccessCookie() {
  document.cookie = `${ACCESS_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;
}

export function getAccessTokenCookie(): string | null {
  const target = `${ACCESS_COOKIE}=`;
  const parts = document.cookie.split(';').map((item) => item.trim());
  const found = parts.find((item) => item.startsWith(target));

  if (!found) {
    return null;
  }

  return decodeURIComponent(found.slice(target.length));
}

export const AUTH_COOKIE_NAMES = {
  access: ACCESS_COOKIE
};
