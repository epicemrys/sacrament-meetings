import type { NextAuthConfig } from "next-auth";

// Leader-only pages: creating a meeting and editing one.
// The path is decoded first, so /meetings/%6Eew is treated like /meetings/new.
export function isLeaderPath(pathname: string): boolean {
  let path = pathname;
  try {
    path = decodeURIComponent(pathname);
  } catch {
    // A malformed escape can't name a real route; test the raw path.
  }
  return /^\/meetings\/(new|[^/]+\/edit)\/?$/.test(path);
}

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  // Vercel and `next start` sit behind a known host; Auth.js otherwise rejects production requests.
  trustHost: true,
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      if (isLeaderPath(nextUrl.pathname)) return isLoggedIn;
      if (isLoggedIn && nextUrl.pathname === "/login") {
        return Response.redirect(new URL("/meetings", nextUrl));
      }
      return true;
    },
  },
  providers: [],
} satisfies NextAuthConfig;