"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, CalendarCheck, CheckCircle2, Clock3, MessageSquare, Search, ShieldCheck, UserCheck, Users } from "lucide-react";
import { liveQueryDefaults, visibleRefetchInterval } from "@/lib/live-query";
import { cn } from "@/lib/utils";

type Row = Record<string, unknown> & { id?: string };

async function employeeFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/employee/${path.replace(/^\//, "")}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    cache: "no-store",
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || "Employee data unavailable");
  }
  return response.json();
}

function text(value: unknown, fallback = "-") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function formatDate(value: unknown) {
  if (!value) return "-";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return text(value);
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function badgeStyle(value: unknown) {
  const clean = text(value).toLowerCase();
  if (clean.includes("complete") || clean.includes("verified") || clean.includes("active") || clean.includes("resolved")) return "bg-[#e8f8ef] text-[#079455]";
  if (clean.includes("progress") || clean.includes("assigned")) return "bg-[#f0eaff] text-[#7c3aed]";
  if (clean.includes("cancel") || clean.includes("blocked") || clean.includes("urgent") || clean.includes("high")) return "bg-[#ffebef] text-[#d92d4b]";
  return "bg-[#fff4df] text-[#c26a00]";
}

function StatusBadge({ value }: { value: unknown }) {
  return <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-black", badgeStyle(value))}>{text(value)}</span>;
}

function Metric({ icon: Icon, label, value, hint }: { icon: React.ElementType; label: string; value: unknown; hint: string }) {
  return (
    <div className="rounded-2xl border border-[#e3e9f5] bg-white p-6 shadow-sm">
      <div className="flex items-center gap-4">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-[#eef5ff] text-[#0b6df6]"><Icon size={24} /></span>
        <div>
          <p className="text-sm font-bold text-[#475467]">{label}</p>
          <p className="mt-1 text-3xl font-black">{text(value, "0")}</p>
          <p className="mt-1 text-xs font-semibold text-[#667085]">{hint}</p>
        </div>
      </div>
    </div>
  );
}

export function EmployeeDashboardPage() {
  const { data, isLoading, isError } = useQuery({
    ...liveQueryDefaults,
    queryKey: ["employee-dashboard"],
    queryFn: () => employeeFetch<Record<string, any>>("dashboard"),
    refetchInterval: visibleRefetchInterval(30_000),
  });
  const metrics = data?.metrics || {};
  const recentBookings = data?.recentBookings || [];
  const recentChats = data?.recentAssignedChats || [];
  const pendingPartners = data?.pendingPartnerChecks || [];

  return (
    <div>
      <h1 className="text-[30px] font-black tracking-[-0.03em]">Employee Dashboard</h1>
      <p className="mt-1 text-sm font-semibold text-[#667085]">Limited operations workspace with secure backend permissions.</p>
      {isError && <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">Employee backend data unavailable.</div>}
      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Metric icon={CalendarCheck} label="Today Bookings" value={metrics.todayBookings} hint="Created today" />
        <Metric icon={Clock3} label="Pending Bookings" value={metrics.pendingBookings} hint="Need attention" />
        <Metric icon={UserCheck} label="Active Partners" value={metrics.activePartners} hint="Verified professionals" />
        <Metric icon={Users} label="Open User Issues" value={metrics.openUserIssues} hint="Needs support" />
        <Metric icon={MessageSquare} label="Assigned Chats" value={metrics.assignedChats} hint="Assigned to you" />
        <Metric icon={CheckCircle2} label="Chats Resolved Today" value={metrics.chatsResolvedToday} hint="Resolved by team" />
      </section>
      <section className="mt-6 grid gap-5 xl:grid-cols-3">
        <MiniList title="Recent Bookings" link="/employee/bookings" rows={recentBookings} columns={["bookingCode", "customer", "service", "status"]} loading={isLoading} />
        <MiniList title="Recent Assigned Chats" link="/employee/chats" rows={recentChats} columns={["customerName", "bookingCode", "service", "priority"]} loading={isLoading} />
        <MiniList title="Pending Partner Checks" link="/employee/partners" rows={pendingPartners} columns={["name", "serviceCategory", "city", "verificationStatus"]} loading={isLoading} />
      </section>
    </div>
  );
}

function MiniList({ title, link, rows, columns, loading }: { title: string; link: string; rows: Row[]; columns: string[]; loading: boolean }) {
  return (
    <div className="rounded-2xl border border-[#e3e9f5] bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-[#eef2f7] px-5 py-4">
        <h2 className="text-lg font-black">{title}</h2>
        <Link href={link} className="text-sm font-black text-[#0b6df6]">View All</Link>
      </div>
      <div className="divide-y divide-[#eef2f7]">
        {loading ? <p className="p-5 text-sm font-semibold text-[#667085]">Loading...</p> : rows.length === 0 ? <p className="p-5 text-sm font-semibold text-[#667085]">No records found.</p> : rows.slice(0, 5).map((row, index) => (
          <Link key={text(row.id || index)} href={link} className="grid grid-cols-[1fr_auto] gap-3 px-5 py-4 text-sm hover:bg-[#f8fbff]">
            <div className="min-w-0">
              <p className="truncate font-black">{text(row[columns[0]])}</p>
              <p className="mt-1 truncate text-xs font-semibold text-[#667085]">{columns.slice(1, -1).map((column) => text(row[column])).join(" · ")}</p>
            </div>
            <StatusBadge value={row[columns[columns.length - 1]]} />
          </Link>
        ))}
      </div>
    </div>
  );
}

export function EmployeeTablePage({ resource, title, subtitle, columns }: { resource: "bookings" | "partners" | "users"; title: string; subtitle: string; columns: string[] }) {
  const [search, setSearch] = useState("");
  const { data, isLoading, isError } = useQuery({
    ...liveQueryDefaults,
    queryKey: ["employee-resource", resource],
    queryFn: () => employeeFetch<{ rows: Row[] }>(resource),
    refetchInterval: visibleRefetchInterval(30_000),
  });
  const rows = data?.rows || [];
  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) => Object.values(row).some((value) => text(value).toLowerCase().includes(needle)));
  }, [rows, search]);

  return (
    <div>
      <h1 className="text-[30px] font-black tracking-[-0.03em]">{title}</h1>
      <p className="mt-1 text-sm font-semibold text-[#667085]">{subtitle}</p>
      <div className="mt-6 rounded-2xl border border-[#e3e9f5] bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#eef2f7] px-5 py-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#667085]" size={17} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} className="h-11 w-full rounded-xl border border-[#dfe6f2] px-11 text-sm font-semibold outline-none focus:border-[#0b6df6]" placeholder={`Search ${title.toLowerCase()}...`} />
          </div>
          <p className="text-sm font-bold text-[#667085]">{filtered.length} live records</p>
        </div>
        {isError && <div className="m-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">Live backend unavailable.</div>}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-[#fbfcff] text-xs text-[#667085]">
              <tr>{columns.map((column) => <th key={column} className="px-5 py-4 font-black">{column.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase())}</th>)}<th className="px-5 py-4 font-black">Action</th></tr>
            </thead>
            <tbody>
              {isLoading ? <tr><td colSpan={columns.length + 1} className="px-5 py-12 text-center font-semibold text-[#667085]">Loading live data...</td></tr> : filtered.map((row) => (
                <tr key={text(row.id)} className="border-t border-[#eef2f7] hover:bg-[#f8fbff]">
                  {columns.map((column) => (
                    <td key={column} className="px-5 py-4 font-semibold text-[#263149]">
                      {column.toLowerCase().includes("status") ? <StatusBadge value={row[column]} /> : column.toLowerCase().includes("date") ? formatDate(row[column]) : text(row[column])}
                    </td>
                  ))}
                  <td className="px-5 py-4"><button className="inline-flex items-center gap-2 text-sm font-black text-[#0b6df6]">View <ArrowRight size={14} /></button></td>
                </tr>
              ))}
              {!isLoading && filtered.length === 0 && <tr><td colSpan={columns.length + 1} className="px-5 py-12 text-center font-semibold text-[#667085]">No records found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function EmployeeLogoutPage() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async () => fetch("/api/auth/logout", { method: "POST" }),
    onSuccess: () => {
      queryClient.clear();
      window.location.href = "/employee/login";
    },
  });
  return (
    <div className="grid min-h-[70dvh] place-items-center">
      <div className="w-full max-w-md rounded-3xl border border-[#e3e9f5] bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-black">Ready to logout?</h1>
        <p className="mt-2 text-sm font-semibold text-[#667085]">Your employee session will be cleared from this browser.</p>
        <button onClick={() => mutation.mutate()} className="mt-6 h-12 w-full rounded-xl bg-[#0b6df6] text-sm font-black text-white">Logout</button>
      </div>
    </div>
  );
}
