"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Bell,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Copy,
  Download,
  Filter,
  MapPin,
  RefreshCw,
  Route,
  Search,
  Send,
  Star,
  UserCheck,
  Users,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Metrics = {
  pendingBookings: number;
  rebookingRequests: number;
  openComplaints: number;
  partnersIdle: number;
  partnersAvailable: number;
};

type SmartBooking = {
  id: string;
  bookingCode: string;
  customerName: string;
  customerMobile: string;
  serviceCategory: string;
  serviceName: string;
  area: string;
  address: string;
  bookingDateTime: string;
  scheduledDateTime: string;
  timeAgo: string;
  priority: string;
  status: string;
  rawStatus: string;
  partnerName: string;
  requestedPartnersCount: number;
  finalServiceCost: number;
  paymentStatus: string;
};

type SmartPartner = {
  id: string;
  partnerCode: string;
  name: string;
  phone: string;
  serviceCategory: string;
  serviceLabel: string;
  area: string;
  city: string;
  rating: number;
  totalJobs: number;
  activeJobs: number;
  isOnline: boolean;
  status: string;
  verificationStatus: string;
  photoUrl: string;
};

type SmartComplaint = {
  id: string;
  ticketId: string;
  bookingId: string;
  bookingCode: string;
  customerName: string;
  mobileNumber: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
  lastUpdated: string;
  complaint: string;
};

type RebookingRequest = {
  id: string;
  bookingId: string;
  bookingCode: string;
  partnerId: string;
  status: string;
  reason: string;
  message: string;
  requestedAt: string;
};

type SmartAssignmentPayload = {
  generatedAt: string;
  metrics: Metrics;
  pendingBookings: SmartBooking[];
  partners: SmartPartner[];
  complaints: SmartComplaint[];
  rebookingRequests: RebookingRequest[];
  escalationRules: { priority: string; minutes: number }[];
};

type TabKey = "pending" | "rebooking" | "complaints" | "availability" | "manual";

const defaultPayload: SmartAssignmentPayload = {
  generatedAt: "",
  metrics: {
    pendingBookings: 0,
    rebookingRequests: 0,
    openComplaints: 0,
    partnersIdle: 0,
    partnersAvailable: 0,
  },
  pendingBookings: [],
  partners: [],
  complaints: [],
  rebookingRequests: [],
  escalationRules: [],
};

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `Request failed with ${response.status}`);
  }
  return (await response.json()) as T;
}

function shortDate(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function shortTime(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit" }).format(date);
}

function money(value: number) {
  return `Rs ${Math.round(Number(value || 0)).toLocaleString("en-IN")}`;
}

function pillTone(value: string) {
  const normalized = value.toLowerCase();
  if (normalized.includes("high") || normalized.includes("no partner") || normalized.includes("open")) return "bg-[#ffebef] text-[#d92d4b]";
  if (normalized.includes("medium") || normalized.includes("sent") || normalized.includes("progress")) return "bg-[#fff4df] text-[#b54708]";
  if (normalized.includes("low") || normalized.includes("available") || normalized.includes("verified")) return "bg-[#e8f8ef] text-[#079455]";
  return "bg-[#eef5ff] text-[#0b6df6]";
}

function serviceTone(value: string) {
  const normalized = value.toLowerCase();
  if (normalized.includes("ac")) return "bg-[#eaf2ff] text-[#0b6df6]";
  if (normalized.includes("plumb")) return "bg-[#ffebef] text-[#d92d4b]";
  if (normalized.includes("electric")) return "bg-[#fff4df] text-[#d97904]";
  if (normalized.includes("clean")) return "bg-[#e8f8ef] text-[#079455]";
  return "bg-[#f4f3ff] text-[#7a5af8]";
}

function copyText(value: string) {
  navigator.clipboard?.writeText(value).catch(() => undefined);
}

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function StatusPill({ value }: { value: string }) {
  return <span className={cn("status-pill whitespace-nowrap", pillTone(value))}>{value || "-"}</span>;
}

function MetricCard({ label, value, note, icon: Icon, tone }: { label: string; value: number; note: string; icon: typeof Users; tone: string }) {
  return (
    <div className="admin-card p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-black text-[#475467]">{label}</p>
          <p className="mt-2 text-3xl font-black text-[#111827]">{value.toLocaleString("en-IN")}</p>
          <p className="mt-1 text-xs font-semibold text-[#667085]">{note}</p>
        </div>
        <div className={cn("metric-icon", tone)}>
          <Icon size={24} />
        </div>
      </div>
    </div>
  );
}

export function SmartAssignmentPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabKey>("pending");
  const [search, setSearch] = useState("");
  const [service, setService] = useState("");
  const [area, setArea] = useState("");
  const [priority, setPriority] = useState("");
  const [selectedBookingId, setSelectedBookingId] = useState("");
  const [manualBooking, setManualBooking] = useState("");
  const [message, setMessage] = useState("");

  const query = useQuery({
    queryKey: ["smart-assignment", search, service, area],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (service.trim()) params.set("service", service.trim());
      if (area.trim()) params.set("area", area.trim());
      return jsonFetch<SmartAssignmentPayload>(`/api/admin/smart-assignment?${params.toString()}`);
    },
    refetchInterval: 12000,
  });

  const data = query.data || defaultPayload;
  const selectedBooking = data.pendingBookings.find((booking) => booking.id === selectedBookingId || booking.bookingCode === selectedBookingId);
  const visibleBookings = useMemo(() => {
    return data.pendingBookings.filter((booking) => {
      if (priority && booking.priority !== priority) return false;
      return true;
    });
  }, [data.pendingBookings, priority]);

  const assignMutation = useMutation({
    mutationFn: (body: { bookingId: string; partnerIds?: string[]; mode: "area" | "individual"; reason: string }) =>
      jsonFetch<{ ok: boolean; booking: SmartBooking; assignedPartnerIds: string[] }>("/api/admin/smart-assignment/assign", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: (result) => {
      setMessage(`Booking ${result.booking.bookingCode} forwarded to ${result.assignedPartnerIds.length} partner(s).`);
      setSelectedBookingId(result.booking.id);
      queryClient.invalidateQueries({ queryKey: ["smart-assignment"] });
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : "Assignment failed"),
  });

  const bulkMutation = useMutation({
    mutationFn: () =>
      jsonFetch<{ processed: number; forwarded: number }>("/api/admin/smart-assignment/bulk-assign", {
        method: "POST",
        body: JSON.stringify({ service, area }),
      }),
    onSuccess: (result) => {
      setMessage(`Bulk assignment done. ${result.forwarded} of ${result.processed} pending booking(s) forwarded.`);
      queryClient.invalidateQueries({ queryKey: ["smart-assignment"] });
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : "Bulk assignment failed"),
  });

  const activeBookingId = manualBooking.trim() || selectedBooking?.id || visibleBookings[0]?.id || "";

  function assignArea(bookingId: string) {
    setSelectedBookingId(bookingId);
    assignMutation.mutate({
      bookingId,
      mode: "area",
      reason: "Admin forwarded booking to available area partners",
    });
  }

  function assignPartner(partnerId: string) {
    if (!activeBookingId) {
      setMessage("Select or enter a booking before assigning partner.");
      return;
    }
    assignMutation.mutate({
      bookingId: activeBookingId,
      partnerIds: [partnerId],
      mode: "individual",
      reason: "Admin forwarded booking to selected partner",
    });
  }

  function exportReport() {
    const headers = ["Booking Code", "Customer", "Mobile", "Service", "Area", "Status", "Priority", "Requested Partners", "Cost"];
    const rows = visibleBookings.map((booking) => [
      booking.bookingCode,
      booking.customerName,
      booking.customerMobile,
      booking.serviceName,
      booking.area,
      booking.status,
      booking.priority,
      booking.requestedPartnersCount,
      booking.finalServiceCost,
    ]);
    const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "smart-assignment-report.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  const tabs = [
    { key: "pending" as const, label: "Pending Bookings", count: data.metrics.pendingBookings, icon: CalendarClock },
    { key: "rebooking" as const, label: "Rebooking Requests", count: data.metrics.rebookingRequests, icon: RefreshCw },
    { key: "complaints" as const, label: "Complaints", count: data.metrics.openComplaints, icon: AlertTriangle },
    { key: "availability" as const, label: "Partner Availability", count: data.metrics.partnersAvailable, icon: Users },
    { key: "manual" as const, label: "Manual Assignment", count: selectedBookingId ? 1 : 0, icon: UserCheck },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
        <div>
          <h1 className="text-[28px] font-black text-[#111827]">Smart Assignment & Escalation</h1>
          <p className="mt-1 text-sm font-semibold text-[#667085]">Auto-assign, reassign bookings, handle rebooking and complaints</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <span className="inline-flex h-11 items-center gap-2 rounded-lg border border-[#b7ebcd] bg-white px-4 text-sm font-black text-[#079455]">
            <span className="h-2.5 w-2.5 rounded-full bg-[#12b76a]" />
            Live backend
          </span>
          <button onClick={() => query.refetch()} className="flex h-11 items-center gap-2 rounded-lg border border-[#e6eaf2] bg-white px-4 text-sm font-black">
            <RefreshCw size={17} className={cn(query.isFetching && "animate-spin")} />
            Refresh
          </button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto border-b border-[#e6eaf2]">
        {tabs.map((item) => {
          const Icon = item.icon;
          const active = tab === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={cn(
                "inline-flex h-12 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-black",
                active ? "border-[#0b6df6] text-[#0b6df6]" : "border-transparent text-[#667085]",
              )}
            >
              <Icon size={16} />
              {item.label}
              <span className={cn("rounded-full px-2 py-0.5 text-[11px]", active ? "bg-[#eaf2ff]" : "bg-[#f2f4f7]")}>{item.count}</span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Pending Bookings" value={data.metrics.pendingBookings} note="Need attention" icon={Clock3} tone="bg-[#eef5ff] text-[#0b6df6]" />
        <MetricCard label="Rebooking Requests" value={data.metrics.rebookingRequests} note="Awaiting admin action" icon={RefreshCw} tone="bg-[#f4f3ff] text-[#7a5af8]" />
        <MetricCard label="Open Complaints" value={data.metrics.openComplaints} note="Require resolution" icon={AlertTriangle} tone="bg-[#ffebef] text-[#d92d4b]" />
        <MetricCard label="Partners Idle" value={data.metrics.partnersIdle} note="Available for assignment" icon={Users} tone="bg-[#e8f8ef] text-[#079455]" />
      </div>

      <div className="admin-card p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_160px_160px_160px_auto_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#667085]" size={17} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} className="h-11 w-full rounded-lg border border-[#e6eaf2] bg-white px-10 text-sm font-bold outline-none" placeholder="Search by booking ID, customer, service..." />
          </div>
          <select value={service} onChange={(event) => setService(event.target.value)} className="h-11 rounded-lg border border-[#e6eaf2] bg-white px-3 text-sm font-bold outline-none">
            <option value="">All Services</option>
            <option value="ac">AC Repair</option>
            <option value="plumbing">Plumbing</option>
            <option value="electrician">Electrician</option>
            <option value="cleaning">Cleaning</option>
            <option value="painting">Painting</option>
          </select>
          <input value={area} onChange={(event) => setArea(event.target.value)} className="h-11 rounded-lg border border-[#e6eaf2] bg-white px-3 text-sm font-bold outline-none" placeholder="All Areas" />
          <select value={priority} onChange={(event) => setPriority(event.target.value)} className="h-11 rounded-lg border border-[#e6eaf2] bg-white px-3 text-sm font-bold outline-none">
            <option value="">Priority: All</option>
            <option value="High Priority">High Priority</option>
            <option value="Medium Priority">Medium Priority</option>
            <option value="Low Priority">Low Priority</option>
          </select>
          <button onClick={() => query.refetch()} className="flex h-11 items-center justify-center gap-2 rounded-lg border border-[#e6eaf2] bg-white px-4 text-sm font-black">
            <Filter size={16} />
            Filters
          </button>
          <button onClick={() => bulkMutation.mutate()} disabled={bulkMutation.isPending} className="flex h-11 items-center justify-center gap-2 rounded-lg bg-[#0b6df6] px-5 text-sm font-black text-white disabled:opacity-60">
            <Zap size={16} />
            Auto Assign
          </button>
        </div>
        {message ? <p className="mt-3 rounded-lg bg-[#eef5ff] px-3 py-2 text-sm font-bold text-[#0b6df6]">{message}</p> : null}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          {tab === "complaints" ? (
            <ComplaintsTable complaints={data.complaints} onAssignBooking={(bookingId) => bookingId && assignArea(bookingId)} />
          ) : tab === "rebooking" ? (
            <RebookingTable requests={data.rebookingRequests} onAssignBooking={(bookingId) => bookingId && assignArea(bookingId)} />
          ) : (
            <PendingBookingsTable
              bookings={visibleBookings}
              selectedBookingId={selectedBookingId}
              onSelect={setSelectedBookingId}
              onAssign={assignArea}
              isAssigning={assignMutation.isPending}
            />
          )}

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="admin-card p-5">
              <h2 className="text-lg font-black">Escalation Rules</h2>
              <p className="mt-1 text-xs font-semibold text-[#667085]">Auto-escalate if no partner accepts booking in given time</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {(data.escalationRules.length ? data.escalationRules : [
                  { priority: "High Priority", minutes: 15 },
                  { priority: "Medium Priority", minutes: 30 },
                  { priority: "Low Priority", minutes: 60 },
                ]).map((rule) => (
                  <div key={rule.priority} className={cn("rounded-lg border border-[#edf0f6] p-4", rule.priority.startsWith("High") ? "bg-[#fff7f7]" : rule.priority.startsWith("Medium") ? "bg-[#fffaf2]" : "bg-[#f7fff9]")}>
                    <p className={cn("text-xs font-black", pillTone(rule.priority))}>{rule.priority}</p>
                    <p className="mt-2 text-2xl font-black">{rule.minutes} <span className="text-sm text-[#667085]">min</span></p>
                  </div>
                ))}
              </div>
            </div>

            <div className="admin-card p-5">
              <h2 className="text-lg font-black">Quick Actions</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button onClick={() => bulkMutation.mutate()} className="flex h-14 items-center gap-3 rounded-lg border border-[#e6eaf2] bg-white px-4 text-left text-sm font-black text-[#263149]">
                  <Zap size={18} className="text-[#0b6df6]" />
                  Bulk Assign
                </button>
                <button onClick={() => bulkMutation.mutate()} className="flex h-14 items-center gap-3 rounded-lg border border-[#e6eaf2] bg-white px-4 text-left text-sm font-black text-[#263149]">
                  <Bell size={18} className="text-[#7a5af8]" />
                  Notify Partners
                </button>
                <button onClick={() => bulkMutation.mutate()} className="flex h-14 items-center gap-3 rounded-lg border border-[#e6eaf2] bg-white px-4 text-left text-sm font-black text-[#263149]">
                  <RefreshCw size={18} className="text-[#0b6df6]" />
                  Reassign All
                </button>
                <button onClick={exportReport} className="flex h-14 items-center gap-3 rounded-lg border border-[#e6eaf2] bg-white px-4 text-left text-sm font-black text-[#263149]">
                  <Download size={18} className="text-[#d97904]" />
                  Export Report
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="admin-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black">Partners Available</h2>
                <p className="mt-1 text-xs font-semibold text-[#667085]">
                  {selectedBooking ? `Selected: ${selectedBooking.bookingCode}` : "Select a booking or enter one manually"}
                </p>
              </div>
              <span className="text-xs font-black text-[#0b6df6]">{data.partners.length} live</span>
            </div>

            <div className="mt-4 space-y-3">
              {data.partners.length === 0 ? (
                <p className="rounded-lg bg-[#f8fafc] p-5 text-center text-sm font-semibold text-[#667085]">No approved partners found.</p>
              ) : data.partners.slice(0, 8).map((partner) => (
                <div key={partner.id} className="rounded-xl border border-[#edf0f6] bg-white p-3">
                  <div className="flex gap-3">
                    <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-[#eef5ff] text-sm font-black text-[#0b6df6]">
                      {partner.photoUrl ? <img src={partner.photoUrl} alt={partner.name} className="h-full w-full object-cover" /> : partner.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-black text-[#111827]">{partner.name}</p>
                        <StatusPill value={partner.verificationStatus} />
                      </div>
                      <p className="mt-1 truncate text-xs font-bold text-[#475467]">{partner.serviceLabel || partner.serviceCategory || "Service partner"}</p>
                      <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-[#667085]"><MapPin size={13} />{partner.area}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-xs font-black text-[#d97904]"><Star size={13} fill="currentColor" />{partner.rating.toFixed(1)}</span>
                        <StatusPill value={partner.status} />
                        <span className="text-xs font-semibold text-[#667085]">{partner.activeJobs} active</span>
                      </div>
                    </div>
                    <button onClick={() => assignPartner(partner.id)} disabled={assignMutation.isPending} className="h-9 rounded-lg border border-[#bfd5ff] bg-white px-3 text-xs font-black text-[#0b6df6] disabled:opacity-60">
                      Assign
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="admin-card p-5">
            <h2 className="text-lg font-black">Manual Assignment</h2>
            <p className="mt-1 text-xs font-semibold text-[#667085]">Use booking code when a complaint or partner request needs manual forwarding.</p>
            <input value={manualBooking} onChange={(event) => setManualBooking(event.target.value)} className="mt-4 h-11 w-full rounded-lg border border-[#e6eaf2] bg-white px-3 text-sm font-bold outline-none" placeholder="Booking ID or code" />
            <button onClick={() => activeBookingId && assignArea(activeBookingId)} disabled={!activeBookingId || assignMutation.isPending} className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#0b6df6] text-sm font-black text-white disabled:opacity-60">
              <Send size={16} />
              Forward To Area Partners
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PendingBookingsTable({
  bookings,
  selectedBookingId,
  onSelect,
  onAssign,
  isAssigning,
}: {
  bookings: SmartBooking[];
  selectedBookingId: string;
  onSelect: (bookingId: string) => void;
  onAssign: (bookingId: string) => void;
  isAssigning: boolean;
}) {
  return (
    <div className="admin-card overflow-hidden">
      <div className="border-b border-[#edf0f6] px-5 py-5">
        <h2 className="text-xl font-black">Pending Bookings ({bookings.length})</h2>
        <p className="mt-1 text-sm font-semibold text-[#667085]">Forward pending jobs to multiple nearby partners or a selected partner</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-[#fbfcff] text-xs text-[#667085]">
            <tr>
              {["Booking ID", "Customer", "Service", "Area", "Time", "Status", "Action"].map((head) => <th key={head} className="px-5 py-4 font-black">{head}</th>)}
            </tr>
          </thead>
          <tbody>
            {bookings.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-14 text-center text-sm font-semibold text-[#667085]">No pending bookings need assignment.</td></tr>
            ) : bookings.map((booking) => (
              <tr
                key={booking.id}
                onClick={() => onSelect(booking.id)}
                className={cn(
                  "cursor-pointer border-t border-[#edf0f6] hover:bg-[#f4f8ff]",
                  selectedBookingId === booking.id ? "bg-[#eaf2ff]" : "odd:bg-[#f8fbff]",
                )}
              >
                <td className="px-5 py-4 align-top">
                  <p className="font-black text-[#0b6df6]">{booking.bookingCode}</p>
                  <button onClick={(event) => { event.stopPropagation(); copyText(booking.bookingCode); }} className="mt-2 inline-flex items-center gap-1 text-xs font-black text-[#0b6df6]"><Copy size={13} />Copy</button>
                </td>
                <td className="px-5 py-4 align-top">
                  <p className="font-black text-[#111827]">{booking.customerName}</p>
                  <p className="mt-1 text-xs font-semibold text-[#667085]">{booking.customerMobile || "-"}</p>
                </td>
                <td className="px-5 py-4 align-top">
                  <div className="flex items-center gap-3">
                    <span className={cn("grid h-9 w-9 place-items-center rounded-lg", serviceTone(booking.serviceName))}><Route size={17} /></span>
                    <div>
                      <p className="font-black text-[#263149]">{booking.serviceName}</p>
                      <p className="text-xs font-semibold text-[#667085]">{booking.serviceCategory || "Service"}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 align-top">
                  <p className="font-black text-[#263149]">{booking.area}</p>
                  <p className="mt-1 max-w-[220px] truncate text-xs font-semibold text-[#667085]">{booking.address}</p>
                </td>
                <td className="px-5 py-4 align-top">
                  <p className="font-black text-[#d92d4b]">{booking.timeAgo}</p>
                  <p className="mt-1 text-xs font-semibold text-[#667085]">{shortDate(booking.bookingDateTime)} {shortTime(booking.bookingDateTime)}</p>
                </td>
                <td className="px-5 py-4 align-top">
                  <div className="space-y-2">
                    <StatusPill value={booking.status} />
                    <StatusPill value={booking.priority} />
                    {booking.requestedPartnersCount ? <p className="text-xs font-bold text-[#667085]">{booking.requestedPartnersCount} partner(s) already notified</p> : null}
                  </div>
                </td>
                <td className="px-5 py-4 align-top">
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      onAssign(booking.id);
                    }}
                    disabled={isAssigning}
                    className="h-9 rounded-lg border border-[#bfd5ff] bg-white px-4 text-xs font-black text-[#0b6df6] disabled:opacity-60"
                  >
                    Assign
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ComplaintsTable({ complaints, onAssignBooking }: { complaints: SmartComplaint[]; onAssignBooking: (bookingId: string) => void }) {
  return (
    <div className="admin-card overflow-hidden">
      <div className="border-b border-[#edf0f6] px-5 py-5">
        <h2 className="text-xl font-black">Open Complaints ({complaints.length})</h2>
        <p className="mt-1 text-sm font-semibold text-[#667085]">Use booking-linked complaints to forward service again</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="bg-[#fbfcff] text-xs text-[#667085]">
            <tr>{["Ticket", "Customer", "Category", "Priority", "Status", "Last Updated", "Action"].map((head) => <th key={head} className="px-5 py-4 font-black">{head}</th>)}</tr>
          </thead>
          <tbody>
            {complaints.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-14 text-center text-sm font-semibold text-[#667085]">No open complaints.</td></tr>
            ) : complaints.map((ticket) => (
              <tr key={ticket.id} className="border-t border-[#edf0f6] odd:bg-[#f8fbff]">
                <td className="px-5 py-4 font-black text-[#0b6df6]">{ticket.ticketId}</td>
                <td className="px-5 py-4"><p className="font-black">{ticket.customerName}</p><p className="text-xs font-semibold text-[#667085]">{ticket.mobileNumber}</p></td>
                <td className="px-5 py-4 font-bold">{ticket.category}</td>
                <td className="px-5 py-4"><StatusPill value={ticket.priority} /></td>
                <td className="px-5 py-4"><StatusPill value={ticket.status} /></td>
                <td className="px-5 py-4 font-semibold text-[#667085]">{shortDate(ticket.lastUpdated)} {shortTime(ticket.lastUpdated)}</td>
                <td className="px-5 py-4"><button onClick={() => onAssignBooking(ticket.bookingId || ticket.bookingCode)} disabled={!ticket.bookingId && !ticket.bookingCode} className="h-9 rounded-lg border border-[#bfd5ff] bg-white px-4 text-xs font-black text-[#0b6df6] disabled:opacity-50">Forward Booking</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RebookingTable({ requests, onAssignBooking }: { requests: RebookingRequest[]; onAssignBooking: (bookingId: string) => void }) {
  return (
    <div className="admin-card overflow-hidden">
      <div className="border-b border-[#edf0f6] px-5 py-5">
        <h2 className="text-xl font-black">Rebooking Requests ({requests.length})</h2>
        <p className="mt-1 text-sm font-semibold text-[#667085]">Forward warranty or revisit requests to available partners</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-[#fbfcff] text-xs text-[#667085]">
            <tr>{["Booking", "Reason", "Message", "Status", "Requested", "Action"].map((head) => <th key={head} className="px-5 py-4 font-black">{head}</th>)}</tr>
          </thead>
          <tbody>
            {requests.length === 0 ? (
              <tr><td colSpan={6} className="px-5 py-14 text-center text-sm font-semibold text-[#667085]">No rebooking requests.</td></tr>
            ) : requests.map((request) => (
              <tr key={request.id} className="border-t border-[#edf0f6] odd:bg-[#f8fbff]">
                <td className="px-5 py-4 font-black text-[#0b6df6]">{request.bookingCode || request.bookingId}</td>
                <td className="px-5 py-4 font-bold">{request.reason}</td>
                <td className="px-5 py-4 max-w-[320px] truncate font-semibold text-[#667085]">{request.message || "-"}</td>
                <td className="px-5 py-4"><StatusPill value={request.status} /></td>
                <td className="px-5 py-4 font-semibold text-[#667085]">{shortDate(request.requestedAt)} {shortTime(request.requestedAt)}</td>
                <td className="px-5 py-4"><button onClick={() => onAssignBooking(request.bookingId || request.bookingCode)} className="h-9 rounded-lg border border-[#bfd5ff] bg-white px-4 text-xs font-black text-[#0b6df6]">Forward Booking</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
