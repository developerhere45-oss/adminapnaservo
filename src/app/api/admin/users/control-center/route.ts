import { NextResponse } from "next/server";
import { getAdminSession, requirePermission } from "@/lib/auth";
import { fetchBackendJson } from "@/lib/backend";
import { normalizeAdminRow, sanitizeAdminData } from "@/lib/data";

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!requirePermission(session, "users:read")) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const url = new URL(request.url);
  try {
    const data = await fetchBackendJson<{ users?: Record<string, unknown>[]; supportTickets?: Record<string, unknown>[] } & Record<string, unknown>>(`/api/admin/users/control-center${url.search}`);
    return NextResponse.json(sanitizeAdminData({
      ...data,
      users: (data.users || []).map(normalizeAdminRow),
      supportTickets: (data.supportTickets || []).map(normalizeAdminRow),
    }));
  } catch {
    return NextResponse.json({ message: "Live backend unavailable" }, { status: 502 });
  }
}
