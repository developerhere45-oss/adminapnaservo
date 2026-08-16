import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { fetchBackendJson } from "@/lib/backend";

async function proxy(request: Request, context: { params: Promise<{ path?: string[] }> }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { path = [] } = await context.params;
  const suffix = path.map(encodeURIComponent).join("/");
  const url = new URL(request.url);
  try {
    const data = await fetchBackendJson(`/api/admin/control-center${suffix ? `/${suffix}` : ""}${url.search}`, {
      method: request.method,
      body: ["GET", "HEAD"].includes(request.method) ? undefined : await request.text(),
      headers: { "X-Admin-Actor": session.email || "admin" },
      bearerToken: session.backendToken,
    });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Control center unavailable" }, { status: 502 });
  }
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
