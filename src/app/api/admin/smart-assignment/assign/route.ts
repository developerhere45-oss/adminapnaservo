import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession, requirePermission } from "@/lib/auth";
import { fetchBackendJson } from "@/lib/backend";

const schema = z.object({
  bookingId: z.string().min(1),
  partnerIds: z.array(z.string().min(1)).optional(),
  mode: z.enum(["area", "individual"]).default("area"),
  reason: z.string().optional(),
});

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!requirePermission(session, "bookings:manage")) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ message: "Invalid assignment payload" }, { status: 400 });

  try {
    const data = await fetchBackendJson("/api/admin/smart-assignment/assign", {
      method: "POST",
      body: JSON.stringify(body.data),
    });
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Live backend unavailable";
    return NextResponse.json({ message }, { status: 502 });
  }
}
