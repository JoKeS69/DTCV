import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;

  const isProtectedDesk =
    pathname === "/profile" ||
    pathname.startsWith("/profile/") ||
    pathname.startsWith("/admin") ||
    pathname === "/billing" ||
    pathname.startsWith("/billing/") ||
    pathname.startsWith("/checkout/");

  if (isProtectedDesk && !req.auth) {
    const url = new URL("/login", req.nextUrl.origin);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  if (req.auth && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/profile", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/profile",
    "/profile/:path*",
    "/admin/:path*",
    "/billing",
    "/billing/:path*",
    "/checkout/:path*",
    "/login",
    "/register",
  ],
};
