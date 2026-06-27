import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession, requirePermission } from "@/lib/auth";
import { fetchBackendJson } from "@/lib/backend";

const schema = z.object({
  service: z.string().optional(),
  area: z.string().optional(),
  limit: z.number().min(1).max(50).optional(),
});

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!requirePermission(session, "bookings:manage")) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const body = schema.safeParse(await request.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ message: "Invalid bulk assignment payload" }, { status: 400 });

  try {
    const data = await fetchBackendJson("/api/admin/smart-assignment/bulk-assign", {
      method: "POST",
      body: JSON.stringify(body.data),
    });
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Live backend unavailable";
    return NextResponse.json({ message }, { status: 502 });
  }
}
