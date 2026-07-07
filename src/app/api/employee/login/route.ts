import { NextResponse } from "next/server";
import { z } from "zod";
import { backendUrl } from "@/lib/backend";
import { setEmployeeSession } from "@/lib/auth";

const schema = z.object({
  identifier: z.string().min(3).optional(),
  email: z.string().min(3).optional(),
  password: z.string().min(6),
});

export async function POST(request: Request) {
  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ message: "Invalid employee login details" }, { status: 400 });

  try {
    const response = await fetch(`${backendUrl.replace(/\/$/, "")}/api/employee/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body.data),
      cache: "no-store",
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json({ message: payload.message || "Employee login failed" }, { status: response.status });
    }

    if (!payload.employee?.id || !payload.token) {
      return NextResponse.json({ message: "Employee session could not be created" }, { status: 502 });
    }

    await setEmployeeSession({
      id: payload.employee.id,
      employeeId: payload.employee.employeeId,
      name: payload.employee.name,
      email: payload.employee.email,
      department: payload.employee.department,
      role: "employee",
      type: "employee",
      permissions: payload.employee.permissions || {},
      backendToken: payload.token,
    });

    return NextResponse.json({ ok: true, employee: payload.employee });
  } catch (error) {
    console.error("Employee login proxy failed", error);
    return NextResponse.json({ message: "Employee login service is temporarily unavailable" }, { status: 503 });
  }
}
