import { NextResponse } from "next/server";
import { getAdminSession, requirePermission } from "@/lib/auth";
import { adminBackendSecret, backendUrl } from "@/lib/backend";

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!requirePermission(session, "bookings:manage")) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  try {
    const form = await request.formData();
    const response = await fetch(`${backendUrl.replace(/\/$/, "")}/api/admin/control-center/media/upload?app=customer`, {
      method: "POST",
      headers: { "X-Admin-Secret": adminBackendSecret, "X-Admin-Actor": session.email || "admin" },
      body: form,
      cache: "no-store",
    });
    return new NextResponse(await response.text(), {
      status: response.status,
      headers: { "content-type": response.headers.get("content-type") || "application/json" },
    });
  } catch {
    return NextResponse.json({ message: "Image upload failed" }, { status: 502 });
  }
}
