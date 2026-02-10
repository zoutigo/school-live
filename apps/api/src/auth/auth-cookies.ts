import { randomBytes } from 'crypto';
import type { Response } from 'express';

export const ACCESS_COOKIE_NAME = 'school_live_access_token';
export const CSRF_COOKIE_NAME = 'school_live_csrf_token';

export function setAuthCookies(
  response: Response,
  payload: { accessToken: string; expiresIn: number },
  isProduction: boolean
) {
  const csrfToken = randomBytes(24).toString('hex');
  const maxAge = payload.expiresIn * 1000;

  response.cookie(ACCESS_COOKIE_NAME, payload.accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge
  });

  response.cookie(CSRF_COOKIE_NAME, csrfToken, {
    httpOnly: false,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge
  });

  return csrfToken;
}

export function clearAuthCookies(response: Response, isProduction: boolean) {
  response.cookie(ACCESS_COOKIE_NAME, '', {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 0
  });

  response.cookie(CSRF_COOKIE_NAME, '', {
    httpOnly: false,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 0
  });
}
