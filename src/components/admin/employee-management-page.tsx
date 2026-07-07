"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, KeyRound, Pencil, Plus, RefreshCw, ShieldCheck, UserCog, XCircle } from "lucide-react";
import { liveQueryDefaults, visibleRefetchInterval } from "@/lib/live-query";
import { cn } from "@/lib/utils";

type Employee = {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  status: string;
  permissions: Record<string, boolean>;
  lastLoginAt?: string;
};

const permissionLabels: Record<string, string> = {
  viewDashboard: "View Dashboard",
  viewBookings: "View Bookings",
  updateBookingStatus: "Update Booking Status",
  viewPartners: "View Partners",
  approvePartners: "Approve Partners",
  viewUsers: "View Users",
  handleChats: "Handle Chats",
  sendNotifications: "Send Notifications",
};

const defaultForm = {
  name: "",
  email: "",
  phone: "",
  password: "",
  department: "support",
  status: "active",
  permissions: {
    viewDashboard: true,
    viewBookings: true,
    updateBookingStatus: false,
    viewPartners: true,
    approvePartners: false,
    viewUsers: true,
    handleChats: true,
    sendNotifications: false,
  } as Record<string, boolean>,
};

async function adminApi<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/admin/secure/${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || "Admin request failed");
  return payload;
}

function formatDate(value?: string) {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Never";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function EmployeeManagementPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(defaultForm);
  const [selected, setSelected] = useState<Employee | null>(null);
  const [message, setMessage] = useState("");
  const [createdCredentials, setCreatedCredentials] = useState<{ employeeId: string; email: string; password: string } | null>(null);
  const { data, isFetching, isError, refetch } = useQuery({
    ...liveQueryDefaults,
    queryKey: ["admin-employees"],
    queryFn: () => adminApi<{ employees: Employee[]; metrics: Record<string, number> }>("employees"),
    refetchInterval: visibleRefetchInterval(30_000),
  });
  const employees = data?.employees || [];

  const createMutation = useMutation({
    mutationFn: () => adminApi<{ employee: Employee }>("employees", { method: "POST", body: JSON.stringify(form) }),
    onSuccess: (payload) => {
      setMessage("Employee created successfully. Share these login credentials with the employee.");
      setCreatedCredentials({ employeeId: payload.employee.employeeId, email: payload.employee.email, password: form.password });
      setForm(defaultForm);
      queryClient.invalidateQueries({ queryKey: ["admin-employees"] });
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : "Employee create failed"),
  });
  const updateMutation = useMutation({
    mutationFn: () => adminApi(`employees/${selected?.id}`, { method: "PUT", body: JSON.stringify({ ...form, password: undefined }) }),
    onSuccess: () => {
      setMessage("Employee updated successfully.");
      setSelected(null);
      setForm(defaultForm);
      queryClient.invalidateQueries({ queryKey: ["admin-employees"] });
    },
  });
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => adminApi(`employees/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-employees"] }),
  });
  const resetMutation = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) => adminApi(`employees/${id}/reset-password`, { method: "PATCH", body: JSON.stringify({ password }) }),
    onSuccess: () => setMessage("Employee password reset successfully."),
  });

  function generatePassword() {
    const bytes = new Uint32Array(2);
    window.crypto.getRandomValues(bytes);
    const password = `AS-${bytes[0].toString(36).slice(0, 5).toUpperCase()}-${bytes[1].toString(36).slice(0, 5).toUpperCase()}!`;
    setForm((current) => ({ ...current, password }));
    setMessage("Temporary password generated. Save it before creating the employee.");
  }

  function validateForm() {
    if (form.name.trim().length < 2) return "Enter the employee full name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return "Enter a valid employee email address.";
    if (!selected && form.password.length < 8) return "Employee password must be at least 8 characters.";
    if (selected && form.password && form.password.length < 8) return "New password must be at least 8 characters.";
    return "";
  }

  function edit(employee: Employee) {
    setSelected(employee);
    setCreatedCredentials(null);
    setForm({
      name: employee.name,
      email: employee.email,
      phone: employee.phone || "",
      password: "",
      department: employee.department,
      status: employee.status,
      permissions: { ...defaultForm.permissions, ...(employee.permissions || {}) },
    });
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[30px] font-black tracking-[-0.03em]">Employees</h1>
          <p className="mt-1 text-sm font-semibold text-[#667085]">Create team members, assign permissions, and manage employee access.</p>
        </div>
        <button onClick={() => refetch()} className="inline-flex h-11 items-center gap-2 rounded-lg border border-[#dfe6f2] bg-white px-4 text-sm font-black">
          <RefreshCw size={16} className={cn(isFetching && "animate-spin")} />Refresh
        </button>
      </div>
      {message && <div className="mb-5 rounded-xl border border-[#dfe6f2] bg-white p-4 text-sm font-bold text-[#0b6df6]">{message}</div>}
      {createdCredentials && (
        <div className="mb-5 rounded-2xl border border-[#c7e6d4] bg-[#f0fff6] p-4 text-sm font-semibold text-[#075e33]">
          <div className="font-black">Employee Login Details</div>
          <div className="mt-2 grid gap-1 sm:grid-cols-3">
            <span>ID: <b>{createdCredentials.employeeId}</b></span>
            <span>Email: <b>{createdCredentials.email}</b></span>
            <span>Password: <b>{createdCredentials.password}</b></span>
          </div>
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(`Employee ID: ${createdCredentials.employeeId}\nEmail: ${createdCredentials.email}\nPassword: ${createdCredentials.password}`)}
            className="mt-3 rounded-lg border border-[#9bd8b4] bg-white px-3 py-2 text-xs font-black text-[#079455]"
          >
            Copy Login Details
          </button>
        </div>
      )}
      {isError && <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">Employee backend unavailable.</div>}
      <section className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setCreatedCredentials(null);
            const validationError = validateForm();
            if (validationError) {
              setMessage(validationError);
              return;
            }
            selected ? updateMutation.mutate() : createMutation.mutate();
          }}
          className="rounded-2xl border border-[#e3e9f5] bg-white p-5 shadow-sm"
        >
          <h2 className="mb-4 flex items-center gap-2 text-lg font-black"><UserCog className="text-[#0b6df6]" size={20} />{selected ? "Edit Employee" : "Create Employee"}</h2>
          {["name", "email", "phone", "password"].map((field) => (
            <label key={field} className="mb-3 block">
              <span className="mb-1 block text-xs font-black uppercase text-[#667085]">{field === "password" && selected ? "New password (optional)" : field}</span>
              <input
                value={(form as any)[field]}
                onChange={(event) => setForm((current) => ({ ...current, [field]: event.target.value }))}
                type={field === "password" ? "password" : "text"}
                required={field !== "phone" && !(field === "password" && selected)}
                className="h-11 w-full rounded-xl border border-[#dfe6f2] px-3 text-sm font-semibold outline-none focus:border-[#0b6df6]"
              />
              {field === "password" && !selected && (
                <span className="mt-2 flex items-center justify-between gap-2 text-xs font-semibold text-[#667085]">
                  Minimum 8 characters required.
                  <button type="button" onClick={generatePassword} className="font-black text-[#0b6df6]">Generate</button>
                </span>
              )}
            </label>
          ))}
          <div className="mb-4 grid grid-cols-2 gap-3">
            <label><span className="mb-1 block text-xs font-black uppercase text-[#667085]">Department</span><select value={form.department} onChange={(event) => setForm((current) => ({ ...current, department: event.target.value }))} className="h-11 w-full rounded-xl border border-[#dfe6f2] px-3 text-sm font-semibold"><option value="support">Support</option><option value="operations">Operations</option><option value="verification">Verification</option><option value="general">General</option></select></label>
            <label><span className="mb-1 block text-xs font-black uppercase text-[#667085]">Status</span><select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))} className="h-11 w-full rounded-xl border border-[#dfe6f2] px-3 text-sm font-semibold"><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
          </div>
          <div className="space-y-2 rounded-xl bg-[#f8fbff] p-3">
            {Object.entries(permissionLabels).map(([key, label]) => (
              <label key={key} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-sm font-bold">
                {label}
                <input type="checkbox" checked={Boolean(form.permissions[key])} onChange={(event) => setForm((current) => ({ ...current, permissions: { ...current.permissions, [key]: event.target.checked } }))} />
              </label>
            ))}
          </div>
          <div className="mt-4 flex gap-3">
            <button className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#0b6df6] text-sm font-black text-white"><Plus size={16} />{selected ? "Save Employee" : "Create Employee"}</button>
            {selected && <button type="button" onClick={() => { setSelected(null); setForm(defaultForm); }} className="h-11 rounded-xl border border-[#dfe6f2] px-4 text-sm font-black">Cancel</button>}
          </div>
        </form>

        <div className="overflow-hidden rounded-2xl border border-[#e3e9f5] bg-white shadow-sm">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-[#fbfcff] text-xs text-[#667085]">
              <tr>{["Employee ID", "Name", "Email", "Department", "Status", "Permissions", "Last Login", "Action"].map((head) => <th key={head} className="px-5 py-4 font-black">{head}</th>)}</tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee.id} className="border-t border-[#eef2f7]">
                  <td className="px-5 py-4 font-black text-[#0b6df6]">{employee.employeeId}</td>
                  <td className="px-5 py-4 font-black">{employee.name}</td>
                  <td className="px-5 py-4 font-semibold">{employee.email}</td>
                  <td className="px-5 py-4 font-semibold capitalize">{employee.department}</td>
                  <td className="px-5 py-4"><span className={cn("inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black", employee.status === "active" ? "bg-[#e8f8ef] text-[#079455]" : "bg-[#ffebef] text-[#d92d4b]")}>{employee.status === "active" ? <CheckCircle2 size={13} /> : <XCircle size={13} />}{employee.status}</span></td>
                  <td className="px-5 py-4 text-xs font-semibold text-[#667085]">{Object.entries(employee.permissions || {}).filter(([, enabled]) => enabled).map(([key]) => permissionLabels[key] || key).slice(0, 3).join(", ") || "No permissions"}</td>
                  <td className="px-5 py-4 font-semibold">{formatDate(employee.lastLoginAt)}</td>
                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      <button onClick={() => edit(employee)} className="grid h-9 w-9 place-items-center rounded-lg border border-[#dfe6f2] text-[#0b6df6]" title="Edit"><Pencil size={16} /></button>
                      <button onClick={() => statusMutation.mutate({ id: employee.id, status: employee.status === "active" ? "inactive" : "active" })} className="grid h-9 w-9 place-items-center rounded-lg border border-[#dfe6f2] text-[#d92d4b]" title="Activate or deactivate"><ShieldCheck size={16} /></button>
                      <button onClick={() => { const password = window.prompt("Enter new password for employee"); if (password) resetMutation.mutate({ id: employee.id, password }); }} className="grid h-9 w-9 place-items-center rounded-lg border border-[#dfe6f2] text-[#475467]" title="Reset password"><KeyRound size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {employees.length === 0 && <tr><td colSpan={8} className="px-5 py-12 text-center font-semibold text-[#667085]">No employees created yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
