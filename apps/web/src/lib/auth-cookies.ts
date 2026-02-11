const CSRF_COOKIE = "school_live_csrf_token";

function getCookieValue(name: string): string | null {
  const target = `${name}=`;
  const parts = document.cookie.split(";").map((item) => item.trim());
  const found = parts.find((item) => item.startsWith(target));

  if (!found) {
    return null;
  }

  return decodeURIComponent(found.slice(target.length));
}

export function getCsrfTokenCookie(): string | null {
  return getCookieValue(CSRF_COOKIE);
}
