import type { Request, Response, NextFunction } from "express";
import { CSRF_COOKIE_NAME } from "../auth/auth-cookies.js";
import { csrfMiddleware } from "./csrf.middleware.js";

function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    method: "POST",
    path: "/api/auth/login",
    cookies: {},
    header: jest.fn().mockReturnValue(undefined),
    ...overrides,
  } as unknown as Request;
}

function makeRes() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res as unknown as Response;
}

describe("csrfMiddleware — endpoints publics d'authentification anonyme", () => {
  const publicPaths = [
    "/api/auth/login",
    "/api/auth/login-phone",
    "/api/auth/login/username",
    "/api/auth/sso/login",
    "/api/auth/first-password-change",
    "/api/auth/first-password-change/username",
    "/api/auth/forgot-password/request",
    "/api/auth/recover/username/start",
    "/api/auth/recover/username/verify",
    "/api/auth/recover/username/reset",
  ];

  it.each(publicPaths)(
    "laisse passer %s sans cookie ni header CSRF",
    (path) => {
      const req = makeReq({ path });
      const res = makeRes();
      const next = jest.fn() as NextFunction;

      csrfMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    },
  );

  it("laisse aussi passer la variante /auth/login/username sans préfixe /api", () => {
    const req = makeReq({ path: "/auth/login/username" });
    const res = makeRes();
    const next = jest.fn() as NextFunction;

    csrfMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe("csrfMiddleware — endpoints protégés", () => {
  it("rejette avec 403 une requête POST sans cookie ni header CSRF sur un endpoint non public", () => {
    const req = makeReq({ path: "/api/me/profile" });
    const res = makeRes();
    const next = jest.fn() as NextFunction;

    csrfMiddleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid CSRF token" });
  });

  it("laisse passer une requête portant un Bearer token", () => {
    const req = makeReq({
      path: "/api/me/profile",
      header: jest.fn((name: string) =>
        name === "authorization" ? "Bearer sometoken" : undefined,
      ) as unknown as Request["header"],
    });
    const res = makeRes();
    const next = jest.fn() as NextFunction;

    csrfMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("laisse passer quand cookie et header CSRF correspondent", () => {
    const req = makeReq({
      path: "/api/me/profile",
      cookies: { [CSRF_COOKIE_NAME]: "match-token" },
      header: jest.fn((name: string) =>
        name === "x-csrf-token" ? "match-token" : undefined,
      ) as unknown as Request["header"],
    });
    const res = makeRes();
    const next = jest.fn() as NextFunction;

    csrfMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("rejette quand cookie et header CSRF ne correspondent pas", () => {
    const req = makeReq({
      path: "/api/me/profile",
      cookies: { [CSRF_COOKIE_NAME]: "token-a" },
      header: jest.fn((name: string) =>
        name === "x-csrf-token" ? "token-b" : undefined,
      ) as unknown as Request["header"],
    });
    const res = makeRes();
    const next = jest.fn() as NextFunction;

    csrfMiddleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("laisse passer les méthodes sûres (GET) sans vérification CSRF", () => {
    const req = makeReq({ method: "GET", path: "/api/me/profile" });
    const res = makeRes();
    const next = jest.fn() as NextFunction;

    csrfMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
