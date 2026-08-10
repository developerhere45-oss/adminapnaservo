"use client";

import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ClipboardList,
  CreditCard,
  IndianRupee,
  MessageSquareText,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
  WalletCards,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { liveQueryDefaults, visibleRefetchInterval } from "@/lib/live-query";
import { cn } from "@/lib/utils";

type Analytics = {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  totalPartners: number;
  activePartners: number;
  pendingPartnerApprovals: number;
  blockedPartners: number;
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  pendingBookings: number;
  processingBookings: number;
  openComplaints: number;
  resolvedComplaints: number;
  totalRevenue: number;
  totalCollection: number;
  partnerEarnings: number;
  platformCommission: number;
  pendingPaymentAmount: number;
  totalTransactions: number;
};

type Overview = {
  generatedAt: string;
  analytics: Analytics;
  bookingStatusBreakdown: { status: string; value: number }[];
  recentBookings: Record<string, unknown>[];
  recentComplaints: Record<string, unknown>[];
  recentPayments: Record<string, unknown>[];
  recentActivity?: ActivityItem[];
  paymentsSummary: Record<string, number>;
  operationalBreakdown: {
    iosDevices: number;
    iosCustomerDevices: number;
    iosPartnerDevices: number;
    cleaningBookings: number;
    cleaningCompleted: number;
    cleaningPending: number;
    cleaningRevenue: number;
  };
};

type ActivityItem = {
  id: string;
  eventName: string;
  category: string;
  title: string;
  detail: string;
  bookingCode: string;
  ticketId: string;
  complaintId: string;
  status: string;
  amount: number;
  actorRole: string;
  actorName: string;
  createdAt: string;
};

const emptyOverview: Overview = {
  generatedAt: "",
  analytics: {
    totalUsers: 0,
    activeUsers: 0,
    newUsersToday: 0,
    totalPartners: 0,
    activePartners: 0,
    pendingPartnerApprovals: 0,
    blockedPartners: 0,
    totalBookings: 0,
    completedBookings: 0,
    cancelledBookings: 0,
    pendingBookings: 0,
    processingBookings: 0,
    openComplaints: 0,
    resolvedComplaints: 0,
    totalRevenue: 0,
    totalCollection: 0,
    partnerEarnings: 0,
    platformCommission: 0,
    pendingPaymentAmount: 0,
    totalTransactions: 0,
  },
  bookingStatusBreakdown: [],
  recentBookings: [],
  recentComplaints: [],
  recentPayments: [],
  recentActivity: [],
  paymentsSummary: {},
  operationalBreakdown: {
    iosDevices: 0,
    iosCustomerDevices: 0,
    iosPartnerDevices: 0,
    cleaningBookings: 0,
    cleaningCompleted: 0,
    cleaningPending: 0,
    cleaningRevenue: 0,
  },
};

async function fetchOverview(): Promise<Overview> {
  const response = await fetch("/api/admin/overview", { cache: "no-store" });
  if (!response.ok) throw new Error("Live backend unavailable");
  return response.json();
}

async function fetchActivity(): Promise<{ activity: ActivityItem[] }> {
  const response = await fetch("/api/admin/activity?limit=30", { cache: "no-store" });
  if (!response.ok) throw new Error("Live activity unavailable");
  return response.json();
}

function asText(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "number") return String(value);
  return String(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN").format(Number(value || 0));
}

function formatMoney(value: number) {
  return `Rs ${new Intl.NumberFormat("en-IN").format(Math.round(Number(value || 0)))}`;
}

function formatDate(value: unknown) {
  if (!value) return "-";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function formatRecentDate(value: unknown) {
  if (!value) return { date: "Not recorded", time: "" };
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return { date: String(value), time: "" };
  return {
    date: new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(parsed),
    time: new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit" }).format(parsed),
  };
}

function Status({ value }: { value: string }) {
  const clean = value.toLowerCase().replace(/_/g, " ");
  const tone = clean.includes("complete") || clean.includes("paid") || clean.includes("resolved")
    ? "bg-[#e8f8ef] text-[#079455]"
    : clean.includes("confirm") || clean.includes("accepted") || clean.includes("review") || clean.includes("progress") || clean.includes("processing") || clean.includes("on the way")
      ? "bg-[#e9f2ff] text-[#0b6df6]"
      : clean.includes("pending") || clean.includes("created") || clean.includes("open") || clean.includes("assigned")
        ? "bg-[#fff4df] text-[#c26a00]"
        : clean.includes("cancel") || clean.includes("failed") || clean.includes("reject") || clean.includes("blocked")
          ? "bg-[#ffebef] text-[#d92d4b]"
          : "bg-[#f2f4f7] text-[#475467]";
  return (
    <span className={cn("status-pill whitespace-nowrap capitalize", tone)}>
      {(value || "-").replace(/_/g, " ")}
    </span>
  );
}

function PageTitle({ isFetching, onRefresh }: { isFetching: boolean; onRefresh: () => void }) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
      <div>
        <h1 className="text-[28px] font-black text-[#111827]">Dashboard</h1>
        <p className="mt-1 text-sm font-medium text-[#667085]">Live control center connected to ApnaServo backend</p>
      </div>
      <button onClick={onRefresh} className="flex h-10 items-center gap-2 rounded-lg border border-[#e6eaf2] bg-white px-4 text-sm font-bold text-[#344054]">
        <RefreshCw size={16} className={cn(isFetching && "animate-spin")} />
        Refresh
      </button>
    </div>
  );
}

function MetricCard({ label, value, note, icon: Icon, tone, href }: { label: string; value: string; note: string; icon: typeof Users; tone: string; href: string }) {
  return (
    <Link href={href} className="admin-card block p-5 transition hover:-translate-y-0.5 hover:border-[#bfd5ff] hover:shadow-md">
      <div className="flex items-center gap-4">
        <div className={cn("metric-icon", tone)}>
          <Icon size={28} />
        </div>
        <div>
          <p className="text-sm font-semibold text-[#475467]">{label}</p>
          <p className="mt-1 text-2xl font-black">{value}</p>
          <p className="mt-2 text-xs font-bold text-[#079455]">{note}</p>
        </div>
      </div>
    </Link>
  );
}

type RecentRow = {
  id: string;
  code: string;
  values: string[];
  date: unknown;
  status: string;
  href: string;
};

function RecentTable({
  title,
  href,
  headers,
  rows,
  icon: Icon,
  iconTone,
  codeTone,
  emptyTitle,
  emptyText,
}: {
  title: string;
  href: string;
  headers: string[];
  rows: RecentRow[];
  icon: typeof CalendarDays;
  iconTone: string;
  codeTone: string;
  emptyTitle: string;
  emptyText: string;
}) {
  return (
    <div className="admin-card flex min-h-[430px] min-w-0 flex-col overflow-hidden">
      <div className="flex min-h-16 items-center justify-between gap-4 border-b border-[#edf0f6] px-5 py-4">
        <h2 className="flex min-w-0 items-center gap-2.5 text-[17px] font-black text-[#172033]">
          <Icon size={21} className={iconTone} strokeWidth={2.2} />
          <span className="truncate">{title}</span>
        </h2>
        <Link href={href} className="shrink-0 text-sm font-bold text-[#0b6df6] transition hover:text-[#0754bd]">View All</Link>
      </div>
      {rows.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-8 py-12 text-center">
          <div className={cn("grid h-24 w-24 place-items-center rounded-full", iconTone === "text-[#12b76a]" ? "bg-[#ecfbf5]" : "bg-[#f4f7fb]")}>
            <Icon size={42} className={iconTone} strokeWidth={1.6} />
          </div>
          <p className="mt-5 text-base font-black text-[#172033]">{emptyTitle}</p>
          <p className="mt-2 max-w-[260px] text-sm font-medium leading-6 text-[#7b8497]">{emptyText}</p>
        </div>
      ) : (
        <>
          <div className="min-w-0 flex-1 overflow-x-auto">
            <table className="w-full min-w-[450px] table-fixed text-left text-[13px]">
              <thead className="bg-[#fbfcfe] text-[11px] text-[#667085]">
                <tr>{headers.map((header) => <th key={header} className="px-4 py-3.5 font-bold">{header}</th>)}</tr>
              </thead>
              <tbody>
                {rows.slice(0, 5).map((row) => {
                  const date = formatRecentDate(row.date);
                  return (
                    <tr key={row.id} className="border-t border-[#edf0f6] transition-colors hover:bg-[#f8fbff]">
                      <td className="px-4 py-3.5 align-middle">
                        <Link href={row.href} className={cn("inline-flex max-w-full", codeTone ? "rounded-md border px-2 py-1 text-[11px] font-black" : "font-semibold text-[#263149]", codeTone)} title={row.code}>
                          <span className="truncate">{row.code}</span>
                        </Link>
                      </td>
                      {row.values.map((value, index) => (
                        <td key={`${row.id}-${index}`} className="truncate px-4 py-3.5 font-semibold text-[#263149]" title={value}>{value}</td>
                      ))}
                      <td className="px-4 py-3.5 font-medium text-[#344054]">
                        <span className="block whitespace-nowrap">{date.date}</span>
                        {date.time && <span className="mt-0.5 block text-[11px] text-[#7b8497]">{date.time}</span>}
                      </td>
                      <td className="px-4 py-3.5"><Status value={row.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Link href={href} className="mt-auto flex h-12 items-center justify-center gap-2 border-t border-[#edf0f6] text-sm font-bold text-[#0b6df6] transition hover:bg-[#f8fbff]">
            View all {title.replace("Recent ", "").toLowerCase()} <ArrowRight size={16} />
          </Link>
        </>
      )}
    </div>
  );
}

function BookingOverview({ data }: { data: Overview }) {
  const colors = ["#1fb875", "#f59e0b", "#ef344f", "#2563eb"];
  const total = data.bookingStatusBreakdown.reduce((sum, entry) => sum + Number(entry.value || 0), 0);
  let cursor = 0;
  const stops = data.bookingStatusBreakdown.map((entry, index) => {
    const start = total ? (cursor / total) * 100 : 0;
    cursor += entry.value;
    const end = total ? (cursor / total) * 100 : 0;
    return `${colors[index % colors.length]} ${start}% ${end}%`;
  });

  return (
    <div className="admin-card min-w-0 p-5">
      <h2 className="mb-4 text-lg font-black">Bookings Overview</h2>
      <div className="grid min-w-0 items-center gap-4 md:grid-cols-[minmax(0,260px)_1fr]">
        <div className="relative grid h-[245px] min-w-0 place-items-center">
          <div className="h-[220px] w-[220px] rounded-full" style={{ background: total ? `conic-gradient(${stops.join(", ")})` : "#edf0f6" }}>
            <div className="m-[34px] h-[152px] w-[152px] rounded-full bg-white" />
          </div>
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <p className="text-2xl font-black">{formatNumber(data.analytics.totalBookings)}</p>
              <p className="text-sm text-[#667085]">Total Bookings</p>
            </div>
          </div>
        </div>
        <div className="space-y-3">
          {data.bookingStatusBreakdown.map((entry, index) => (
            <div key={entry.status} className="flex items-center justify-between gap-4 text-sm">
              <span className="flex items-center gap-2 font-semibold text-[#344054]"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />{entry.status}</span>
              <span className="shrink-0 font-bold">{formatNumber(entry.value)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function activityTone(category: string) {
  if (category === "booking") return "bg-[#eef5ff] text-[#0b6df6]";
  if (category === "payment") return "bg-[#e8f8ef] text-[#079455]";
  if (category === "support" || category === "complaint") return "bg-[#fff4df] text-[#c26a00]";
  if (category === "user") return "bg-[#f3eaff] text-[#7c3aed]";
  return "bg-[#f2f4f7] text-[#475467]";
}

function LiveWorkflowActivity({ fallback = [] }: { fallback?: ActivityItem[] }) {
  const { data, isFetching, isError } = useQuery({
    ...liveQueryDefaults,
    queryKey: ["admin-activity"],
    queryFn: fetchActivity,
    refetchInterval: visibleRefetchInterval(15_000),
  });
  const activity = data?.activity?.length ? data.activity : fallback;

  return (
    <div className="admin-card p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-black">
          <Activity size={22} className="text-[#0b6df6]" />
          Live Workflow Activity
        </h2>
        <div className="flex items-center gap-2 text-xs font-bold text-[#667085]">
          <span className={cn("h-2.5 w-2.5 rounded-full", isError ? "bg-[#ef344f]" : "bg-[#12b76a]", isFetching && "animate-pulse")} />
          Real-time backend
        </div>
      </div>
      {isError && <div className="mb-3 rounded-lg border border-[#ffd3dc] bg-[#fff7f9] px-3 py-2 text-xs font-bold text-[#d92d4b]">Live activity endpoint unavailable.</div>}
      <div className="grid gap-3 xl:grid-cols-2">
        {activity.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#d9e1ee] px-4 py-8 text-center text-sm font-semibold text-[#667085] xl:col-span-2">
            No live workflow events yet.
          </div>
        ) : activity.slice(0, 12).map((entry) => (
          <div key={entry.id} className="rounded-lg border border-[#edf0f6] bg-white px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-[#111827]">{entry.title || entry.eventName}</p>
                <p className="mt-1 line-clamp-2 text-xs font-semibold text-[#667085]">{entry.detail || entry.eventName}</p>
              </div>
              <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black capitalize", activityTone(entry.category))}>{entry.category || "live"}</span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-bold text-[#667085]">
              {(entry.bookingCode || entry.ticketId || entry.complaintId) && <span className="rounded-full bg-[#f6f8fb] px-2 py-1">{entry.bookingCode || entry.ticketId || entry.complaintId}</span>}
              {entry.status && <span className="rounded-full bg-[#f6f8fb] px-2 py-1 capitalize">{entry.status.replace(/_/g, " ")}</span>}
              <span className="flex items-center gap-1"><Clock3 size={12} />{formatDate(entry.createdAt)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardClient() {
  const { data = emptyOverview, isFetching, isError, refetch } = useQuery({
    ...liveQueryDefaults,
    queryKey: ["overview"],
    queryFn: fetchOverview,
    refetchInterval: visibleRefetchInterval(30_000),
  });
  const analytics = data.analytics;

  const recentBookings: RecentRow[] = data.recentBookings.map((row, index) => ({
    id: asText(row.id || row.bookingCode || index),
    code: asText(row.bookingCode || row.id),
    values: [asText(row.userName), asText(row.serviceName || row.serviceCategory)],
    date: row.bookingDateTime || row.createdAt || row.bookingDate || row.scheduledAt,
    status: asText(row.status),
    href: `/bookings/${encodeURIComponent(asText(row.id || row.bookingCode))}`,
  }));
  const recentComplaints: RecentRow[] = data.recentComplaints.map((row, index) => ({
    id: asText(row.id || row.complaintId || index),
    code: asText(row.complaintId || row.id),
    values: [asText(row.userName), asText(row.type || row.category)],
    date: row.createdAt || row.lastUpdated,
    status: asText(row.status),
    href: row.source === "support_ticket" ? `/users/support/${encodeURIComponent(asText(row.id || row.complaintId))}` : "/complaints",
  }));
  const recentPayments: RecentRow[] = data.recentPayments.map((row, index) => ({
    id: asText(row.id || row.bookingCode || index),
    code: asText(row.partnerName || row.userName || row.bookingCode),
    values: [formatMoney(Number(row.amount || 0))],
    date: row.createdAt,
    status: asText(row.status),
    href: "/payments",
  }));

  return (
    <div>
      <PageTitle isFetching={isFetching} onRefresh={() => refetch()} />
      {isError && <div className="admin-card mb-5 border-[#ffd3dc] bg-[#fff7f9] p-4 text-sm font-bold text-[#d92d4b]">Live backend unavailable. No default dashboard data is being shown.</div>}

      <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-5">
        <MetricCard href="/users" label="Total Users" value={formatNumber(analytics.totalUsers)} note={`${formatNumber(analytics.newUsersToday)} new today`} icon={Users} tone="bg-[#eef5ff] text-[#0b6df6]" />
        <MetricCard href="/partners" label="Total Partners" value={formatNumber(analytics.totalPartners)} note={`${formatNumber(analytics.activePartners)} active`} icon={ShieldCheck} tone="bg-[#e8f8ef] text-[#079455]" />
        <MetricCard href="/bookings" label="Total Bookings" value={formatNumber(analytics.totalBookings)} note={`${formatNumber(analytics.completedBookings)} completed`} icon={ClipboardList} tone="bg-[#f3eaff] text-[#8b5cf6]" />
        <MetricCard href="/payments" label="Total Revenue" value={formatMoney(analytics.totalRevenue)} note={`${formatMoney(analytics.platformCommission)} commission`} icon={IndianRupee} tone="bg-[#fff4df] text-[#f59e0b]" />
        <MetricCard href="/payments" label="Pending Payments" value={formatMoney(analytics.pendingPaymentAmount)} note={`${formatNumber(analytics.totalTransactions)} transactions`} icon={WalletCards} tone="bg-[#ffebef] text-[#d92d4b]" />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_.95fr]">
        <BookingOverview data={data} />
        <div className="admin-card p-5">
          <h2 className="mb-4 text-lg font-black">Payments Summary</h2>
          {[
            ["Total Collection", analytics.totalCollection],
            ["Partner Earnings", analytics.partnerEarnings],
            ["Platform Commission", analytics.platformCommission],
            ["Pending Payments", analytics.pendingPaymentAmount],
          ].map(([label, value]) => (
            <div key={String(label)} className="flex items-center justify-between gap-4 border-b border-[#edf0f6] py-4 last:border-0">
              <span className="font-semibold text-[#475467]">{String(label)}</span>
              <span className="shrink-0 text-right font-black">{formatMoney(Number(value || 0))}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-5">
        <LiveWorkflowActivity fallback={data.recentActivity || []} />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-2 min-[1600px]:grid-cols-3">
        <RecentTable
          title="Recent Bookings"
          href="/bookings"
          headers={["Booking ID", "Customer", "Service", "Date", "Status"]}
          rows={recentBookings}
          icon={CalendarDays}
          iconTone="text-[#0b6df6]"
          codeTone="border-[#cfe0ff] bg-[#eef5ff] text-[#0b6df6]"
          emptyTitle="No bookings yet"
          emptyText="New customer bookings will appear here in real time."
        />
        <RecentTable
          title="Recent Complaints"
          href="/users/support"
          headers={["ID", "Customer", "Issue", "Date", "Status"]}
          rows={recentComplaints}
          icon={MessageSquareText}
          iconTone="text-[#7c3aed]"
          codeTone="border-[#ddd2ff] bg-[#f3eaff] text-[#7c3aed]"
          emptyTitle="No complaints yet"
          emptyText="Customer complaints and support requests will appear here."
        />
        <RecentTable
          title="Recent Payments"
          href="/payments"
          headers={["Name", "Amount", "Date", "Status"]}
          rows={recentPayments}
          icon={CreditCard}
          iconTone="text-[#12b76a]"
          codeTone=""
          emptyTitle="No payments yet"
          emptyText="Recent customer payments will appear here."
        />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-2">
        <Link href="/devices" className="admin-card block p-5 transition hover:border-[#bfd5ff] hover:shadow-md">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-lg font-black"><Smartphone size={22} className="text-[#0b6df6]" />iOS Operations</p>
              <p className="mt-1 text-sm font-medium text-[#667085]">All active iOS customer and partner devices</p>
            </div>
            <p className="text-3xl font-black text-[#0b6df6]">{formatNumber(data.operationalBreakdown.iosDevices)}</p>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-[#eef5ff] p-4"><p className="text-xs font-bold text-[#667085]">Customer iOS</p><p className="mt-1 text-xl font-black">{formatNumber(data.operationalBreakdown.iosCustomerDevices)}</p></div>
            <div className="rounded-xl bg-[#f3eaff] p-4"><p className="text-xs font-bold text-[#667085]">Partner iOS</p><p className="mt-1 text-xl font-black">{formatNumber(data.operationalBreakdown.iosPartnerDevices)}</p></div>
          </div>
        </Link>
        <Link href="/bookings" className="admin-card block p-5 transition hover:border-[#b7ead3] hover:shadow-md">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-lg font-black"><Sparkles size={22} className="text-[#079455]" />Cleaning Operations</p>
              <p className="mt-1 text-sm font-medium text-[#667085]">Cleaning bookings, progress and completed revenue</p>
            </div>
            <p className="text-3xl font-black text-[#079455]">{formatNumber(data.operationalBreakdown.cleaningBookings)}</p>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-[#e8f8ef] p-4"><p className="text-xs font-bold text-[#667085]">Completed</p><p className="mt-1 text-xl font-black">{formatNumber(data.operationalBreakdown.cleaningCompleted)}</p></div>
            <div className="rounded-xl bg-[#fff4df] p-4"><p className="text-xs font-bold text-[#667085]">In progress</p><p className="mt-1 text-xl font-black">{formatNumber(data.operationalBreakdown.cleaningPending)}</p></div>
            <div className="rounded-xl bg-[#eef5ff] p-4"><p className="text-xs font-bold text-[#667085]">Revenue</p><p className="mt-1 text-lg font-black">{formatMoney(data.operationalBreakdown.cleaningRevenue)}</p></div>
          </div>
        </Link>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[.9fr_1fr]">
        <div className="admin-card p-5">
          <h2 className="flex items-center gap-2 text-lg font-black"><ShieldCheck className="text-[#0b6df6]" size={22} />Partner Approval Status</h2>
          <div className="mt-5 grid grid-cols-3 gap-3">
            {[
              ["Pending Approval", analytics.pendingPartnerApprovals, "bg-[#fff4df] text-[#b54708]"],
              ["Active Partners", analytics.activePartners, "bg-[#e8f8ef] text-[#079455]"],
              ["Blocked Partners", analytics.blockedPartners, "bg-[#ffebef] text-[#d92d4b]"],
            ].map(([label, value, style]) => (
              <div key={String(label)} className={cn("rounded-xl p-4", String(style))}>
                <p className="text-xs font-bold">{String(label)}</p>
                <p className="mt-2 text-2xl font-black">{formatNumber(Number(value || 0))}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="admin-card p-5">
          <h2 className="text-lg font-black">At a Glance</h2>
          <div className="mt-5 grid grid-cols-2 gap-4">
            {[
              [CheckCircle2, "Active Users", analytics.activeUsers, "text-[#12b76a]"],
              [CalendarCheck, "Pending Bookings", analytics.pendingBookings, "text-[#0b6df6]"],
              [AlertTriangle, "Open Complaints", analytics.openComplaints, "text-[#f59e0b]"],
              [CheckCircle2, "Resolved Complaints", analytics.resolvedComplaints, "text-[#12b76a]"],
            ].map(([Icon, label, value, color]) => {
              const IconComponent = Icon as typeof Users;
              return (
                <div key={String(label)} className="flex items-center gap-3 rounded-xl border border-[#edf0f6] p-3">
                  <IconComponent size={22} className={String(color)} />
                  <div><p className="text-sm font-medium text-[#667085]">{String(label)}</p><p className="text-lg font-black">{formatNumber(Number(value || 0))}</p></div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
