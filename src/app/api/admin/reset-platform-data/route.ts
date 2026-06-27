import { NextResponse } from "next/server";
import { getAdminSession, requirePermission } from "@/lib/auth";
import { fetchBackendJson } from "@/lib/backend";

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!requirePermission(session, "platform:reset")) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  if (body?.confirm !== "DELETE_APNASERVO_DATA") {
    return NextResponse.json({ message: "Reset confirmation is required" }, { status: 400 });
  }

  try {
    const result = await fetchBackendJson("/api/admin/reset-platform-data", {
      method: "DELETE",
      headers: { "X-Admin-Reset-Confirm": "DELETE_APNASERVO_DATA" },
      body: JSON.stringify({ confirm: "DELETE_APNASERVO_DATA" }),
    });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ message: "Live backend unavailable" }, { status: 502 });
  }
}
