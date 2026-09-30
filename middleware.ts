import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";
import { buildContentSecurityPolicy } from "@/lib/security/headers";

const { auth } = NextAuth(authConfig);

function createNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const nonce = createNonce();
  const csp = buildContentSecurityPolicy(nonce);

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  // Next.js reads CSP from the *request* to attach nonces to scripts.
  requestHeaders.set("Content-Security-Policy", csp);

  const isProtectedDesk =
    pathname === "/profile" ||
    pathname.startsWith("/profile/") ||
    pathname.startsWith("/admin") ||
    pathname === "/billing" ||
    pathname.startsWith("/billing/") ||
    pathname.startsWith("/checkout/");

  let response: NextResponse;

  if (isProtectedDesk && !req.auth) {
    const url = new URL("/login", req.nextUrl.origin);
    url.searchParams.set("callbackUrl", pathname);
    response = NextResponse.redirect(url);
  } else if (req.auth && (pathname === "/login" || pathname === "/register")) {
    response = NextResponse.redirect(new URL("/cases", req.nextUrl.origin));
  } else if (req.auth && pathname === "/") {
    response = NextResponse.redirect(new URL("/cases", req.nextUrl.origin));
  } else {
    response = NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("x-nonce", nonce);

  return response;
});

export const config = {
  matcher: [
    /*
     * Apply auth redirects + CSP nonce to app routes.
     * Skip static assets and Next internals.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
