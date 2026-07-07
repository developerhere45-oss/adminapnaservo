import { NextResponse } from "next/server";
import { z } from "zod";
import { backendUrl } from "@/lib/backend";
import { adminEmail, adminPasswordSecret, isAdminAuthDisabled, setAdminSession, verifyPassword } from "@/lib/auth";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

function mapAdminRole(role: string) {
  return role === "super_admin" ? "SUPER_ADMIN" : "OPERATIONS_MANAGER";
}

export async function POST(request: Request) {
  if (isAdminAuthDisabled()) {
    return NextResponse.json({ ok: true, authDisabled: true, admin: { email: process.env.ADMIN_EMAIL || "admin@apnaservo.com", role: "super_admin" } });
  }

  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ message: "Invalid login details" }, { status: 400 });

  try {
    const response = await fetch(`${backendUrl.replace(/\/$/, "")}/api/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body.data),
      cache: "no-store",
    });
    const payload = await response.json().catch(() => ({}));
    if (response.ok) {
      await setAdminSession({
        id: payload.admin.id,
        name: payload.admin.name,
        email: payload.admin.email,
        role: mapAdminRole(payload.admin.role),
        type: "admin",
        backendToken: payload.token,
      });
      return NextResponse.json({ ok: true, admin: payload.admin });
    }
  } catch {
    // Fall through to legacy server-side admin password validation.
  }

  const configuredEmail = adminEmail();
  const legacyAllowed = body.data.email.toLowerCase() === configuredEmail && (await verifyPassword(body.data.password, adminPasswordSecret()));
  if (!legacyAllowed) {
    return NextResponse.json({ message: "Email or password is wrong" }, { status: 401 });
  }
  await setAdminSession({
    id: "legacy-super-admin",
    name: "Admin",
    email: configuredEmail,
    role: "SUPER_ADMIN",
    type: "admin",
  });
  return NextResponse.json({ ok: true, admin: { email: configuredEmail, role: "super_admin" }, legacy: true });
}
