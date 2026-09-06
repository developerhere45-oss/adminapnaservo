import { NextResponse } from "next/server";
import { getAdminSession, requirePermission } from "@/lib/auth";
import { fetchBackendJson } from "@/lib/backend";

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session || !requirePermission(session, "bookings:manage")) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  try {
    return NextResponse.json(await fetchBackendJson("/api/admin/discounts/booking", { method: "POST", body: JSON.stringify(await request.json()) }));
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Unable to apply booking discount" }, { status: 400 });
  }
}
