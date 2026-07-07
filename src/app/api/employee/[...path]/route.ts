import { NextResponse } from "next/server";
import { backendUrl } from "@/lib/backend";
import { getEmployeeSession } from "@/lib/auth";

async function proxy(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const session = await getEmployeeSession();
  if (!session?.backendToken) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const { path } = await context.params;
  const url = new URL(request.url);
  const target = `${backendUrl.replace(/\/$/, "")}/api/employee/${path.map(encodeURIComponent).join("/")}${url.search}`;
  const method = request.method.toUpperCase();
  const hasBody = !["GET", "HEAD"].includes(method);
  const response = await fetch(target, {
    method,
    headers: {
      "Content-Type": request.headers.get("Content-Type") || "application/json",
      Authorization: `Bearer ${session.backendToken}`,
    },
    body: hasBody ? await request.text() : undefined,
    cache: "no-store",
  });
  const text = await response.text();
  return new NextResponse(text, {
    status: response.status,
    headers: { "Content-Type": response.headers.get("Content-Type") || "application/json" },
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
