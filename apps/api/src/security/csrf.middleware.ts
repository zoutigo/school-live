import type { Request, Response, NextFunction } from "express";
import { CSRF_COOKIE_NAME } from "../auth/auth-cookies.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function isPublicPath(path: string) {
  const normalizedPath = path.startsWith("/api/") ? path.slice(4) : path;

  return (
    normalizedPath === "/auth/login" ||
    normalizedPath === "/auth/first-password-change" ||
    normalizedPath === "/auth/profile-setup" ||
    /^\/schools\/[^/]+\/auth\/login$/.test(normalizedPath)
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
