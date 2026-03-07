import type { NextAuthOptions } from "next-auth";
import Apple from "next-auth/providers/apple";
import Google from "next-auth/providers/google";

const AUTH_VERBOSE =
  process.env.AUTH_VERBOSE === "true" || process.env.NODE_ENV !== "production";

const providers: NextAuthOptions["providers"] = [];

if (
  process.env.AUTH_GOOGLE_CLIENT_ID &&
  process.env.AUTH_GOOGLE_CLIENT_SECRET
) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_CLIENT_ID,
      clientSecret: process.env.AUTH_GOOGLE_CLIENT_SECRET,
    }),
  );
}

if (process.env.AUTH_APPLE_ID && process.env.AUTH_APPLE_SECRET) {
  providers.push(
    Apple({
      clientId: process.env.AUTH_APPLE_ID,
      clientSecret: process.env.AUTH_APPLE_SECRET,
    }),
  );
}

export const authOptions: NextAuthOptions = {
  debug: AUTH_VERBOSE,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/",
    error: "/auth/error",
  },
  providers,
  logger: {
    error(code, metadata) {
      console.error("[next-auth][error]", code, metadata);
    },
    warn(code) {
      console.warn("[next-auth][warn]", code);
    },
    debug(code, metadata) {
      if (AUTH_VERBOSE) {
        console.log("[next-auth][debug]", code, metadata);
      }
    },
  },
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.provider = account.provider?.toUpperCase();
        token.providerAccountId = account.providerAccountId;
      }
      return token;
    },
    async session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          provider: typeof token.provider === "string" ? token.provider : null,
          providerAccountId:
            typeof token.providerAccountId === "string"
              ? token.providerAccountId
              : null,
        },
      };
    },
  },
};
