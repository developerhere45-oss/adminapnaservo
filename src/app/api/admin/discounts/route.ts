import { NextResponse } from "next/server";
import { getAdminSession, requirePermission } from "@/lib/auth";
import { fetchBackendJson } from "@/lib/backend";

async function authorize() {
  const session = await getAdminSession();
  return session && requirePermission(session, "bookings:manage") ? session : null;
}

export async function GET() {
  if (!await authorize()) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  try { return NextResponse.json(await fetchBackendJson("/api/admin/discounts")); }
  catch (error) { return NextResponse.json({ message: error instanceof Error ? error.message : "Backend unavailable" }, { status: 502 }); }
}

export async function POST(request: Request) {
  if (!await authorize()) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  try {
    const body = await request.json();
    return NextResponse.json(await fetchBackendJson("/api/admin/discounts", { method: "POST", body: JSON.stringify(body) }), { status: 201 });
  } catch (error) { return NextResponse.json({ message: error instanceof Error ? error.message : "Unable to create discount" }, { status: 400 }); }
}
