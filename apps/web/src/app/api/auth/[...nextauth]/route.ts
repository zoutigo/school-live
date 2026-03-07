import NextAuth from "next-auth";
import type { NextRequest } from "next/server";
import { authOptions } from "../../../../auth";

const handler = NextAuth(authOptions);

type RouteContext = {
  params: Promise<{ nextauth?: string[] }>;
};

async function resolveNextAuthParams(
  request: NextRequest,
  context: RouteContext,
): Promise<{ nextauth: string[] }> {
  const rawParams = await context.params;
  const fromContext = rawParams?.nextauth;

  if (Array.isArray(fromContext) && fromContext.length > 0) {
    return { nextauth: fromContext };
  }

  // Fallback for runtime variants where dynamic params are not propagated.
  const segments = request.nextUrl.pathname.split("/").filter(Boolean);
  const authIndex = segments.findIndex(
    (segment, index) => segment === "auth" && segments[index - 1] === "api",
  );
  const nextauth = authIndex >= 0 ? segments.slice(authIndex + 1) : [];

  return { nextauth };
}

async function run(request: NextRequest, context: RouteContext) {
  const nextauthParams = await resolveNextAuthParams(request, context);
  return handler(request, {
    params: Promise.resolve(nextauthParams),
  });
}

export async function GET(request: NextRequest, context: RouteContext) {
  return run(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return run(request, context);
}
