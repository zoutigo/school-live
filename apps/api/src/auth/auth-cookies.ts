import { randomBytes } from "crypto";
import type { Response } from "express";

export const ACCESS_COOKIE_NAME = "school_live_access_token";
export const REFRESH_COOKIE_NAME = "school_live_refresh_token";
export const CSRF_COOKIE_NAME = "school_live_csrf_token";

export function setAuthCookies(
  response: Response,
  payload: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    refreshExpiresIn: number;
  },
  isProduction: boolean,
) {
  const csrfToken = randomBytes(24).toString("hex");
  const accessMaxAge = payload.expiresIn * 1000;
  const refreshMaxAge = payload.refreshExpiresIn * 1000;

  response.cookie(ACCESS_COOKIE_NAME, payload.accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: accessMaxAge,
  });

  response.cookie(REFRESH_COOKIE_NAME, payload.refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: refreshMaxAge,
  });

  response.cookie(CSRF_COOKIE_NAME, csrfToken, {
    httpOnly: false,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: refreshMaxAge,
  });

  return csrfToken;
}

export function clearAuthCookies(response: Response, isProduction: boolean) {
  response.cookie(ACCESS_COOKIE_NAME, "", {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  response.cookie(REFRESH_COOKIE_NAME, "", {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  response.cookie(CSRF_COOKIE_NAME, "", {
    httpOnly: false,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
