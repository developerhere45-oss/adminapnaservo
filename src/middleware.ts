import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const publicPaths = [
  "/admin/login",
  "/employee/login",
  "/login",
  "/api/admin/login",
  "/api/employee/login",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/admin/backend-health",
];

const adminLegacyRoots = [
  "/dashboard",
  "/users",
  "/bookings",
  "/partners",
  "/partner-approvals",
  "/payments",
  "/discounts",
  "/reports",
  "/settings",
  "/logout",
  "/notifications",
  "/devices",
  "/smart-assignment",
  "/chats",
  "/employees",
];

const cookieName = "apnaservo_panel_session";
const legacyCookieName = "apnaservo_admin_session";
const encoder = new TextEncoder();

function jwtSecret() {
  return encoder.encode(
    process.env.JWT_SECRET ||
    process.env.ADMIN_BACKEND_SECRET ||
    process.env.ADMIN_API_SECRET ||
    "dev-only-apnaservo-admin-secret-change-me"
  );
}

async function readSession(request: NextRequest) {
  const token = request.cookies.get(cookieName)?.value || request.cookies.get(legacyCookieName)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, jwtSecret());
    return payload as { type?: string; role?: string };
  } catch {
    return null;
  }
}

function isStatic(pathname: string) {
  return pathname.startsWith("/_next") || pathname === "/favicon.ico" || pathname.includes(".");
}

function isAdminLegacy(pathname: string) {
  return adminLegacyRoots.some((root) => pathname === root || pathname.startsWith(`${root}/`));
}

function isAdminAuthDisabled() {
  return process.env.ADMIN_AUTH_DISABLED !== "false";
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isStatic(pathname) || publicPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return NextResponse.next();
  }

  if (isAdminAuthDisabled() && (pathname.startsWith("/admin") || isAdminLegacy(pathname))) {
    return NextResponse.next();
  }

  const session = await readSession(request);

  if (pathname.startsWith("/admin")) {
    if (!session) return NextResponse.redirect(new URL("/admin/login", request.url));
    if (session.type === "employee") return NextResponse.redirect(new URL("/employee/dashboard", request.url));
    return NextResponse.next();
  }

  if (pathname.startsWith("/employee")) {
    if (!session) return NextResponse.redirect(new URL("/employee/login", request.url));
    if (session.type !== "employee") return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    return NextResponse.next();
  }

  if (isAdminLegacy(pathname)) {
    if (!session) return NextResponse.redirect(new URL("/admin/login", request.url));
    if (session.type === "employee") return NextResponse.redirect(new URL("/employee/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
