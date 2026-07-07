"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, MessageSquare, RefreshCw, Search, UserPlus, XCircle } from "lucide-react";
import { liveQueryDefaults, visibleRefetchInterval } from "@/lib/live-query";
import { cn } from "@/lib/utils";

type Row = Record<string, any>;

async function secureApi<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/admin/secure/${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || "Admin request failed");
  return payload;
}

async function adminApi<T>(path: string): Promise<T> {
  const response = await fetch(`/api/admin/${path}`, { cache: "no-store" });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || "Admin data unavailable");
  return payload;
}

function text(value: unknown, fallback = "-") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function statusStyle(value: unknown) {
  const clean = text(value).toLowerCase();
  if (clean.includes("resolved") || clean.includes("closed")) return "bg-[#e8f8ef] text-[#079455]";
  if (clean.includes("progress")) return "bg-[#f3eaff] text-[#7c3aed]";
  if (clean.includes("urgent") || clean.includes("high")) return "bg-[#ffebef] text-[#d92d4b]";
  return "bg-[#fff4df] text-[#c26a00]";
}

export function AdminChatsPage() {
  const queryClient = useQueryClient();
  const [bookingId, setBookingId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [priority, setPriority] = useState("normal");
  const [note, setNote] = useState("");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const chatsQuery = useQuery({
    ...liveQueryDefaults,
    queryKey: ["admin-chats"],
    queryFn: () => secureApi<{ rows: Row[]; metrics: Record<string, number> }>("chats"),
    refetchInterval: visibleRefetchInterval(20_000),
  });
  const employeesQuery = useQuery({
    ...liveQueryDefaults,
    queryKey: ["admin-employees-select"],
    queryFn: () => secureApi<{ employees: Row[] }>("employees"),
    refetchInterval: visibleRefetchInterval(60_000),
  });
  const bookingsQuery = useQuery({
    ...liveQueryDefaults,
    queryKey: ["admin-bookings-select"],
    queryFn: () => adminApi<{ rows: Row[] }>("bookings"),
    refetchInterval: visibleRefetchInterval(60_000),
  });
  const employees = employeesQuery.data?.employees || [];
  const bookings = bookingsQuery.data?.rows || [];
  const chats = chatsQuery.data?.rows || [];
  const filteredChats = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return chats;
    return chats.filter((chat) => [chat.bookingCode, chat.customerName, chat.service, chat.assignedTo?.name].some((value) => text(value).toLowerCase().includes(needle)));
  }, [chats, search]);

  const assignMutation = useMutation({
    mutationFn: () => secureApi(`chats/${encodeURIComponent(bookingId)}/assign`, { method: "POST", body: JSON.stringify({ employeeId, priority, internalNote: note }) }),
    onSuccess: () => {
      setMessage("Chat assigned to employee successfully.");
      setBookingId("");
      setNote("");
      queryClient.invalidateQueries({ queryKey: ["admin-chats"] });
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : "Assignment failed"),
  });
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => secureApi(`chats/${encodeURIComponent(id)}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-chats"] }),
  });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-[30px] font-black tracking-[-0.03em]"><MessageSquare className="text-[#0b6df6]" />Chats</h1>
          <p className="mt-1 text-sm font-semibold text-[#667085]">Assign customer and partner booking chats to employee operators.</p>
        </div>
        <button onClick={() => chatsQuery.refetch()} className="inline-flex h-11 items-center gap-2 rounded-lg border border-[#dfe6f2] bg-white px-4 text-sm font-black"><RefreshCw size={16} className={cn(chatsQuery.isFetching && "animate-spin")} />Refresh</button>
      </div>
      {message && <div className="mb-5 rounded-xl border border-[#dfe6f2] bg-white p-4 text-sm font-bold text-[#0b6df6]">{message}</div>}

      <section className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            assignMutation.mutate();
          }}
          className="rounded-2xl border border-[#e3e9f5] bg-white p-5 shadow-sm"
        >
          <h2 className="mb-4 flex items-center gap-2 text-lg font-black"><UserPlus className="text-[#0b6df6]" size={20} />Assign Chat</h2>
          <label className="mb-3 block">
            <span className="mb-1 block text-xs font-black uppercase text-[#667085]">Booking / Chat</span>
            <select value={bookingId} onChange={(event) => setBookingId(event.target.value)} required className="h-11 w-full rounded-xl border border-[#dfe6f2] px-3 text-sm font-semibold">
              <option value="">Select booking</option>
              {bookings.slice(0, 200).map((booking) => <option key={text(booking.id || booking.bookingCode)} value={text(booking.id || booking.bookingCode)}>{text(booking.bookingCode)} · {text(booking.userName || booking.customerName)} · {text(booking.serviceName)}</option>)}
            </select>
          </label>
          <label className="mb-3 block">
            <span className="mb-1 block text-xs font-black uppercase text-[#667085]">Assign To</span>
            <select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} required className="h-11 w-full rounded-xl border border-[#dfe6f2] px-3 text-sm font-semibold">
              <option value="">Select employee</option>
              {employees.filter((employee) => employee.status === "active").map((employee) => <option key={employee.id} value={employee.id}>{employee.name} · {employee.department}</option>)}
            </select>
          </label>
          <label className="mb-3 block">
            <span className="mb-1 block text-xs font-black uppercase text-[#667085]">Priority</span>
            <select value={priority} onChange={(event) => setPriority(event.target.value)} className="h-11 w-full rounded-xl border border-[#dfe6f2] px-3 text-sm font-semibold">
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </label>
          <label className="mb-4 block">
            <span className="mb-1 block text-xs font-black uppercase text-[#667085]">Internal Note</span>
            <textarea value={note} onChange={(event) => setNote(event.target.value)} className="h-24 w-full rounded-xl border border-[#dfe6f2] p-3 text-sm font-semibold outline-none focus:border-[#0b6df6]" />
          </label>
          <button disabled={!bookingId || !employeeId || assignMutation.isPending} className="h-11 w-full rounded-xl bg-[#0b6df6] text-sm font-black text-white disabled:opacity-50">Assign Chat</button>
        </form>

        <div className="overflow-hidden rounded-2xl border border-[#e3e9f5] bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eef2f7] px-5 py-4">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#667085]" size={17} />
              <input value={search} onChange={(event) => setSearch(event.target.value)} className="h-11 w-full rounded-xl border border-[#dfe6f2] px-11 text-sm font-semibold outline-none" placeholder="Search assigned chats..." />
            </div>
            <div className="flex gap-2 text-xs font-black text-[#667085]">
              <span>{chatsQuery.data?.metrics?.openChats || 0} open</span>
              <span>·</span>
              <span>{chatsQuery.data?.metrics?.highPriority || 0} high priority</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead className="bg-[#fbfcff] text-xs text-[#667085]">
                <tr>{["Chat", "Customer", "Service", "Assigned Employee", "Priority", "Status", "Last Message", "Action"].map((head) => <th key={head} className="px-5 py-4 font-black">{head}</th>)}</tr>
              </thead>
              <tbody>
                {filteredChats.map((chat) => (
                  <tr key={chat.id} className="border-t border-[#eef2f7]">
                    <td className="px-5 py-4 font-black text-[#0b6df6]">{text(chat.bookingCode || chat.id)}</td>
                    <td className="px-5 py-4 font-black">{text(chat.customerName)}</td>
                    <td className="px-5 py-4 font-semibold">{text(chat.service)}</td>
                    <td className="px-5 py-4 font-semibold">{text(chat.assignedTo?.name, "Unassigned")}</td>
                    <td className="px-5 py-4"><span className={cn("rounded-full px-3 py-1 text-xs font-black capitalize", statusStyle(chat.priority))}>{text(chat.priority)}</span></td>
                    <td className="px-5 py-4"><span className={cn("rounded-full px-3 py-1 text-xs font-black capitalize", statusStyle(chat.status))}>{text(chat.status)}</span></td>
                    <td className="max-w-[240px] truncate px-5 py-4 font-semibold text-[#667085]">{text(chat.lastMessage, "No message")}</td>
                    <td className="px-5 py-4">
                      <div className="flex gap-2">
                        <button onClick={() => statusMutation.mutate({ id: chat.id, status: "resolved" })} className="grid h-9 w-9 place-items-center rounded-lg border border-[#c7f0d8] text-[#079455]" title="Resolve"><CheckCircle2 size={16} /></button>
                        <button onClick={() => statusMutation.mutate({ id: chat.id, status: "closed" })} className="grid h-9 w-9 place-items-center rounded-lg border border-[#ffc4d0] text-[#d92d4b]" title="Close"><XCircle size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredChats.length === 0 && <tr><td colSpan={8} className="px-5 py-12 text-center font-semibold text-[#667085]">No assigned chats found.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
