import type { Request, Response, NextFunction } from "express";
import { CSRF_COOKIE_NAME } from "../auth/auth-cookies.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function isPublicPath(path: string) {
  return (
    path === "/api/auth/login" ||
    path === "/api/auth/first-password-change" ||
    path === "/api/auth/profile-setup" ||
    /^\/api\/schools\/[^/]+\/auth\/login$/.test(path)
  );
}

export function csrfMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  if (isPublicPath(req.path)) {
    return next();
  }

  const authHeader = req.header("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return next();
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.header("x-csrf-token");

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ message: "Invalid CSRF token" });
  }

  return next();
}
