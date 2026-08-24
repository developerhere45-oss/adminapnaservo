import { NextResponse } from "next/server";
import { getAdminSession, requirePermission } from "@/lib/auth";
import { getResourceRows, resourceConfig } from "@/lib/data";
import { fetchBackendJson } from "@/lib/backend";

export async function GET(_request: Request, context: { params: Promise<{ resource: string }> }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { resource } = await context.params;
  const config = resourceConfig[resource];
  if (!config) return NextResponse.json({ message: "Resource not found" }, { status: 404 });
  if (!requirePermission(session, config.permission)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const data = await getResourceRows(resource, session.backendToken);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ message: "Live backend unavailable" }, { status: 502 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ resource: string }> }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { resource } = await context.params;
  if (resource !== "partners" || !requirePermission(session, "technicians:manage")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  try {
    const body = await request.json();
    const data = await fetchBackendJson<Record<string, unknown>>("/api/admin/partners", { method: "POST", body: JSON.stringify(body), bearerToken: session.backendToken });
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    const raw = error instanceof Error ? error.message : "Partner creation failed";
    const match = raw.match(/^Backend\s+(\d+)\s*:\s*([\s\S]*)$/);
    let message = match?.[2] || raw;
    try { message = JSON.parse(message).message || message; } catch {}
    return NextResponse.json({ message }, { status: Number(match?.[1] || 502) });
  }
}
