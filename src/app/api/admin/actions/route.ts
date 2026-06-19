import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession, requirePermission } from "@/lib/auth";
import { fetchBackendJson } from "@/lib/backend";

const schema = z.object({
  action: z.enum(["approve-technician", "reject-technician", "suspend-technician", "assign-booking", "send-notification", "resolve-complaint"]),
  targetId: z.string().min(1),
  payload: z.record(z.string(), z.unknown()).optional(),
});

const permissionsByAction: Record<z.infer<typeof schema>["action"], string> = {
  "approve-technician": "technicians:manage",
  "reject-technician": "technicians:manage",
  "suspend-technician": "technicians:manage",
  "assign-booking": "bookings:manage",
  "send-notification": "bookings:manage",
  "resolve-complaint": "complaints:manage",
};

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ message: "Invalid action payload" }, { status: 400 });

  const permission = permissionsByAction[body.data.action];
  if (!requirePermission(session, permission)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  let result;
  try {
    result = await fetchBackendJson(
      "/api/admin/actions",
      {
        ok: true,
        action: body.data.action,
        targetId: body.data.targetId,
        auditedBy: session.email,
        backend: "fallback",
      },
      {
        method: "POST",
        body: JSON.stringify(body.data),
      },
    );
  } catch {
    return NextResponse.json({ message: "Live backend unavailable" }, { status: 502 });
  }

  return NextResponse.json(result);
}
