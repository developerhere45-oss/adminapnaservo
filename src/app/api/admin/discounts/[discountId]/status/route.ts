import { NextResponse } from "next/server";
import { getAdminSession, requirePermission } from "@/lib/auth";
import { fetchBackendJson } from "@/lib/backend";

export async function PATCH(request: Request, context: { params: Promise<{ discountId: string }> }) {
  const session = await getAdminSession();
  if (!session || !requirePermission(session, "bookings:manage")) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  const { discountId } = await context.params;
  try {
    return NextResponse.json(await fetchBackendJson(`/api/admin/discounts/${encodeURIComponent(discountId)}/status`, { method: "PATCH", body: JSON.stringify(await request.json()) }));
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Unable to update discount status" }, { status: 400 });
  }
}
