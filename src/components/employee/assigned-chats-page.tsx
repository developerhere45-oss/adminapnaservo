"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, CheckCircle2, CircleHelp, Filter, MessageSquare, Paperclip, Play, RotateCcw, Search, Send, Smile, UserRound, Users, XCircle } from "lucide-react";
import { liveQueryDefaults, visibleRefetchInterval } from "@/lib/live-query";
import { cn } from "@/lib/utils";

type ChatRow = Record<string, any>;
type Message = { id: string; senderType: string; senderName: string; message: string; createdAt: string };

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/employee/${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    cache: "no-store",
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || "Request failed");
  }
  return response.json();
}

function text(value: unknown, fallback = "-") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function initials(name: unknown) {
  return text(name, "AS").split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function time(value: unknown) {
  if (!value) return "";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit" }).format(date);
}

function priorityStyle(value: unknown) {
  const clean = text(value).toLowerCase();
  if (clean === "urgent" || clean === "high") return "bg-[#ffebef] text-[#e31b54]";
  if (clean === "low") return "bg-[#e8f8ef] text-[#079455]";
  return "bg-[#fff4df] text-[#c26a00]";
}

function StatCard({ icon: Icon, label, value, hint, tone }: { icon: React.ElementType; label: string; value: unknown; hint: string; tone: string }) {
  return (
    <div className="rounded-2xl border border-[#e3e9f5] bg-white p-6 shadow-sm">
      <div className="flex items-center gap-5">
        <span className={cn("grid h-16 w-16 place-items-center rounded-full", tone)}><Icon size={27} /></span>
        <div>
          <p className="text-sm font-bold text-[#475467]">{label}</p>
          <p className="mt-1 text-3xl font-black">{text(value, "0")}</p>
          <p className="mt-1 text-xs font-semibold text-[#667085]">{hint}</p>
        </div>
      </div>
    </div>
  );
}

export function AssignedChatsPage() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [message, setMessage] = useState("");
  const [note, setNote] = useState("");
  const chatsQuery = useQuery({
    ...liveQueryDefaults,
    queryKey: ["employee-chats"],
    queryFn: () => api<{ rows: ChatRow[]; metrics: Record<string, number> }>("chats"),
    refetchInterval: visibleRefetchInterval(20_000),
  });
  const chats = chatsQuery.data?.rows || [];
  const selected = chats.find((chat) => chat.id === selectedId) || chats[0];
  const detailQuery = useQuery({
    ...liveQueryDefaults,
    queryKey: ["employee-chat", selected?.id],
    queryFn: () => api<{ chat: ChatRow; messages: Message[] }>(`chats/${encodeURIComponent(selected.id)}`),
    enabled: Boolean(selected?.id),
    refetchInterval: visibleRefetchInterval(10_000),
  });
  const activeChat = detailQuery.data?.chat || selected;
  const messages = detailQuery.data?.messages || [];
  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return chats.filter((chat) => {
      const matchesText = !needle || [chat.customerName, chat.bookingCode, chat.service, chat.lastMessage].some((value) => text(value).toLowerCase().includes(needle));
      const matchesFilter = filter === "all" || (filter === "high" ? ["high", "urgent"].includes(text(chat.priority).toLowerCase()) : text(chat.status).toLowerCase() === filter);
      return matchesText && matchesFilter;
    });
  }, [chats, filter, search]);

  const sendMutation = useMutation({
    mutationFn: () => api(`chats/${encodeURIComponent(activeChat.id)}/messages`, { method: "POST", body: JSON.stringify({ message }) }),
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["employee-chat", activeChat.id] });
      queryClient.invalidateQueries({ queryKey: ["employee-chats"] });
    },
  });
  const statusMutation = useMutation({
    mutationFn: (status: string) => api(`chats/${encodeURIComponent(activeChat.id)}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["employee-chats"] }),
  });
  const noteMutation = useMutation({
    mutationFn: () => api(`chats/${encodeURIComponent(activeChat.id)}/note`, { method: "POST", body: JSON.stringify({ note }) }),
    onSuccess: () => {
      setNote("");
      queryClient.invalidateQueries({ queryKey: ["employee-chat", activeChat.id] });
    },
  });

  const metrics = chatsQuery.data?.metrics || {};

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 2xl:flex-row 2xl:items-start">
        <div>
          <div className="flex items-center gap-3">
            <MessageSquare className="text-[#0b6df6]" size={30} />
            <h1 className="text-[32px] font-black tracking-[-0.035em]">Assigned Chats</h1>
          </div>
          <p className="mt-2 text-base font-semibold text-[#667085]">Only chats assigned by admin are visible here.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#667085]" size={20} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} className="h-12 w-[430px] max-w-full rounded-xl border border-[#dfe6f2] bg-white px-12 text-sm font-semibold outline-none focus:border-[#0b6df6]" placeholder="Search by name, booking ID or service..." />
          </div>
          {[
            ["all", "All"],
            ["open", "Open"],
            ["in_progress", "In Progress"],
            ["high", "High Priority"],
          ].map(([value, label]) => (
            <button key={value} onClick={() => setFilter(value)} className={cn("h-12 rounded-xl border px-5 text-sm font-black", filter === value ? "border-[#0b6df6] bg-[#eef5ff] text-[#0b6df6]" : "border-[#e3e9f5] bg-white text-[#344054]")}>{label}</button>
          ))}
          <button className="grid h-12 w-12 place-items-center rounded-xl border border-[#e3e9f5] bg-white"><Filter size={19} /></button>
        </div>
      </div>

      <section className="mt-6 grid gap-5 md:grid-cols-2 2xl:grid-cols-4">
        <StatCard icon={Users} label="Assigned Today" value={metrics.assignedToday} hint="Chats assigned today" tone="bg-[#eef5ff] text-[#0b6df6]" />
        <StatCard icon={MessageSquare} label="Open Chats" value={metrics.openChats} hint="Require your response" tone="bg-[#e8f8ef] text-[#079455]" />
        <StatCard icon={RotateCcw} label="In Progress" value={metrics.inProgress} hint="Currently in progress" tone="bg-[#fff4df] text-[#f59e0b]" />
        <StatCard icon={CheckCircle2} label="Resolved Today" value={metrics.resolvedToday} hint="Successfully resolved" tone="bg-[#f3eaff] text-[#7c3aed]" />
      </section>

      <section className="mt-6 grid gap-5 2xl:grid-cols-[420px_minmax(520px,1fr)_430px]">
        <div className="rounded-2xl border border-[#e3e9f5] bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-[#eef2f7] px-5 py-4">
            <div>
              <h2 className="text-lg font-black">Assigned Chats</h2>
              <p className="text-xs font-semibold text-[#667085]">Only chats assigned by admin</p>
            </div>
            <span className="text-[#667085]">⇅</span>
          </div>
          <div className="max-h-[680px] overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="p-6 text-sm font-semibold text-[#667085]">No assigned chats found.</p>
            ) : filtered.map((chat) => (
              <button
                key={chat.id}
                onClick={() => setSelectedId(chat.id)}
                className={cn("flex w-full gap-4 border-b border-[#eef2f7] px-4 py-4 text-left transition hover:bg-[#f8fbff]", activeChat?.id === chat.id && "bg-[#eef5ff] ring-1 ring-inset ring-[#b9d4ff]")}
              >
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#eaf2ff] text-sm font-black text-[#0b6df6]">{initials(chat.customerName)}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-3">
                    <span className="truncate text-sm font-black">{text(chat.customerName)}</span>
                    <span className="text-xs font-semibold text-[#667085]">{time(chat.lastMessageAt)}</span>
                  </span>
                  <span className="mt-1 block truncate text-xs font-black text-[#0b6df6]">{text(chat.bookingCode)} · {text(chat.service)}</span>
                  <span className="mt-1 block truncate text-xs font-semibold text-[#667085]">{text(chat.lastMessage, "No messages yet")}</span>
                </span>
                <span className={cn("self-end rounded-full px-2 py-1 text-[11px] font-black capitalize", priorityStyle(chat.priority))}>{text(chat.priority)}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex min-h-[760px] flex-col overflow-hidden rounded-2xl border border-[#e3e9f5] bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eef2f7] px-6 py-5">
            <div className="flex items-center gap-4">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-[#eaf2ff] text-sm font-black text-[#0b6df6]">{initials(activeChat?.customerName)}</span>
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-xl font-black">{text(activeChat?.customerName, "Select a chat")}</h2>
                  {activeChat?.bookingCode && <span className="rounded-lg bg-[#eaf2ff] px-3 py-1 text-xs font-black text-[#0b6df6]">{activeChat.bookingCode}</span>}
                  <span className="text-sm font-bold text-[#475467]">{text(activeChat?.service)}</span>
                </div>
                <p className="mt-1 text-xs font-semibold text-[#667085]">Assigned by Admin · {time(activeChat?.assignedAt)}</p>
              </div>
            </div>
            <span className={cn("rounded-full px-4 py-2 text-xs font-black capitalize", priorityStyle(activeChat?.priority))}>{text(activeChat?.priority, "Normal")} Priority</span>
          </div>
          <div className="flex-1 space-y-5 overflow-y-auto bg-[#fbfcff] p-6">
            <div className="mx-auto w-fit rounded-full bg-white px-4 py-2 text-xs font-bold text-[#667085] shadow-sm">Today</div>
            {messages.length === 0 ? (
              <div className="grid h-full min-h-[360px] place-items-center text-center">
                <div><MessageSquare className="mx-auto text-[#98a2b3]" size={44} /><p className="mt-3 text-sm font-bold text-[#667085]">No messages in this assigned chat yet.</p></div>
              </div>
            ) : messages.map((item) => {
              const mine = ["employee", "admin", "support"].includes(item.senderType);
              return (
                <div key={item.id} className={cn("flex gap-3", mine ? "justify-end" : "justify-start")}>
                  {!mine && <span className="grid h-9 w-9 place-items-center rounded-full bg-[#eaf2ff] text-xs font-black text-[#0b6df6]">{initials(item.senderName)}</span>}
                  <div className={cn("max-w-[70%] rounded-2xl px-4 py-3 text-sm font-semibold shadow-sm", mine ? "rounded-br-md border border-[#b9d4ff] bg-[#eef5ff] text-[#0b2559]" : "rounded-bl-md border border-[#e6eaf2] bg-white text-[#263149]")}>
                    <p className="leading-6">{item.message}</p>
                    <p className="mt-2 text-right text-[11px] font-bold text-[#667085]">{time(item.createdAt)}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (message.trim() && activeChat?.id) sendMutation.mutate();
            }}
            className="flex items-center gap-3 border-t border-[#eef2f7] p-5"
          >
            <button type="button" className="grid h-11 w-11 place-items-center rounded-xl border border-[#dfe6f2] text-[#667085]"><Paperclip size={19} /></button>
            <input value={message} onChange={(event) => setMessage(event.target.value)} className="h-12 flex-1 rounded-xl border border-[#dfe6f2] px-4 text-sm font-semibold outline-none focus:border-[#0b6df6]" placeholder="Type your message..." />
            <button type="button" className="grid h-11 w-11 place-items-center rounded-xl text-[#667085]"><Smile size={20} /></button>
            <button disabled={!message.trim() || sendMutation.isPending} className="inline-flex h-12 items-center gap-2 rounded-xl bg-[#0b6df6] px-7 text-sm font-black text-white disabled:opacity-50"><Send size={17} />Send</button>
          </form>
        </div>

        <div className="rounded-2xl border border-[#e3e9f5] bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-black"><CalendarDays className="text-[#0b6df6]" size={20} />Booking Details</h2>
          <Info label="Booking ID" value={activeChat?.bookingCode} accent />
          <Info label="Service" value={activeChat?.service} />
          <Info label="Booking Date" value={activeChat?.bookingDate ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(activeChat.bookingDate)) : "-"} />
          <Info label="Preferred Time" value={activeChat?.preferredTime} />
          <Info label="Status" value={activeChat?.bookingStatus} badge />
          <div className="my-5 h-px bg-[#eef2f7]" />
          <h3 className="mb-4 flex items-center gap-2 text-base font-black"><UserRound className="text-[#0b6df6]" size={19} />Customer / Partner Info</h3>
          <Info label="Name" value={activeChat?.customerName} />
          <Info label="Phone" value={activeChat?.customerPhone} accent />
          <Info label="Email" value={activeChat?.customerEmail || "Optional"} />
          <Info label="Address" value={activeChat?.customerAddress} />
          <div className="my-5 h-px bg-[#eef2f7]" />
          <Info label="Priority" value={activeChat?.priority} badge />
          <Info label="Assigned Time" value={activeChat?.assignedAt ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(activeChat.assignedAt)) : "-"} />
          <div className="mt-5 rounded-xl bg-[#fff7e8] p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-black">Internal Notes</p>
              <button className="text-xs font-black text-[#0b6df6]">Edit</button>
            </div>
            <p className="text-sm font-semibold leading-6 text-[#475467]">{text(activeChat?.internalNote, "No internal note added.")}</p>
          </div>
          <textarea value={note} onChange={(event) => setNote(event.target.value)} className="mt-4 h-20 w-full rounded-xl border border-[#dfe6f2] p-3 text-sm font-semibold outline-none focus:border-[#0b6df6]" placeholder="Add internal note..." />
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button onClick={() => statusMutation.mutate("in_progress")} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#0b6df6] text-sm font-black text-white"><Play size={16} />Mark In Progress</button>
            <button onClick={() => note.trim() && noteMutation.mutate()} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[#80dfb4] text-sm font-black text-[#079455]"><CircleHelp size={16} />Add Note</button>
            <button onClick={() => activeChat?.id && api(`chats/${encodeURIComponent(activeChat.id)}/request-transfer`, { method: "POST", body: JSON.stringify({ note: "Transfer requested from employee panel" }) })} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[#cab9ff] text-sm font-black text-[#7c3aed]"><RotateCcw size={16} />Request Transfer</button>
            <button onClick={() => statusMutation.mutate("closed")} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[#ffc4d0] text-sm font-black text-[#e31b54]"><XCircle size={16} />Close Chat</button>
          </div>
        </div>
      </section>
    </div>
  );
}

function Info({ label, value, accent, badge }: { label: string; value: unknown; accent?: boolean; badge?: boolean }) {
  return (
    <div className="grid grid-cols-[130px_1fr] gap-3 border-b border-[#eef2f7] py-3 last:border-0">
      <span className="text-sm font-bold text-[#475467]">{label}</span>
      {badge ? <span className="w-fit rounded-full bg-[#fff4df] px-3 py-1 text-xs font-black capitalize text-[#c26a00]">{text(value)}</span> : <span className={cn("break-words text-sm font-bold", accent ? "text-[#0b6df6]" : "text-[#111827]")}>{text(value)}</span>}
    </div>
  );
}
