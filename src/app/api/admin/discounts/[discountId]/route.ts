import { NextResponse } from "next/server";
import { getAdminSession, requirePermission } from "@/lib/auth";
import { fetchBackendJson } from "@/lib/backend";

async function allowed() {
  const session = await getAdminSession();
  return Boolean(session && requirePermission(session, "bookings:manage"));
}

export async function PATCH(request: Request, context: { params: Promise<{ discountId: string }> }) {
  if (!await allowed()) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  const { discountId } = await context.params;
  try { return NextResponse.json(await fetchBackendJson(`/api/admin/discounts/${encodeURIComponent(discountId)}`, { method: "PATCH", body: JSON.stringify(await request.json()) })); }
  catch (error) { return NextResponse.json({ message: error instanceof Error ? error.message : "Unable to update discount" }, { status: 400 }); }
}

export async function DELETE(_request: Request, context: { params: Promise<{ discountId: string }> }) {
  if (!await allowed()) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  const { discountId } = await context.params;
  try { return NextResponse.json(await fetchBackendJson(`/api/admin/discounts/${encodeURIComponent(discountId)}`, { method: "DELETE" })); }
  catch (error) { return NextResponse.json({ message: error instanceof Error ? error.message : "Unable to delete discount" }, { status: 400 }); }
}
