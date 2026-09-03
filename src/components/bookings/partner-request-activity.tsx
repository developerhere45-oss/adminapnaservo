"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronRight,
  Clock3,
  Eye,
  Filter,
  MapPin,
  Search,
  Send,
  ShieldCheck,
  Star,
  UserRound,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type PartnerRequest = {
  requestId: string;
  partnerId: string;
  partnerPublicId: string;
  partner: {
    name: string;
    photoUrl: string;
    phone: string;
    serviceCategory: string;
    rating: number;
    totalJobs: number;
    availability: string;
  };
  routing: Record<string, unknown>;
  source: string;
  dispatchAttempt: number;
  dispatchStage: number;
  status: string;
  rawStatus: string;
  createdAt: string;
  sentAt: string;
  deliveredAt: string;
  viewedAt: string;
  respondedAt: string;
  expiresAt: string;
  expiredAt: string;
  cancelledAt: string;
  failedAt: string;
  responseTimeSeconds: number | null;
  rejectionReason: string;
  failureReason: string;
  failureTechnicalDetails: string;
  expiryReason: string;
  cancellationReason: string;
  notification: {
    notificationId: string;
    pushStatus: string;
    pushSuccessCount: number;
    pushFailureCount: number;
  };
};

export type PartnerRequestSummary = {
  total: number;
  eligiblePartners: number;
  requestsSent: number;
  delivered: number;
  viewed: number;
  accepted: number;
  rejected: number;
  expired: number;
  cancelled: number;
  failed: number;
  notResponded: number;
  assignedPartnerId: string;
  assignedPartnerName: string;
  assignedAt: string | null;
  assignmentMethod: string;
};

type FilterKey = "all" | "requested" | "delivered" | "viewed" | "accepted" | "rejected" | "expired" | "failed" | "not_responded" | "cancelled";

const filters: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "requested", label: "Requested" },
  { key: "delivered", label: "Delivered" },
  { key: "viewed", label: "Viewed" },
  { key: "accepted", label: "Accepted" },
  { key: "rejected", label: "Rejected" },
  { key: "expired", label: "Expired" },
  { key: "failed", label: "Failed" },
  { key: "not_responded", label: "Not responded" },
  { key: "cancelled", label: "Cancelled" },
];

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "medium" }).format(date);
}

function formatSeconds(seconds: number | null | undefined) {
  const value = Number(seconds);
  if (!Number.isFinite(value) || value < 0) return "—";
  if (value < 60) return `${Math.round(value)} sec`;
  const minutes = Math.floor(value / 60);
  return `${minutes}m ${Math.round(value % 60)}s`;
}

function title(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusTone(status: string) {
  switch (status.toLowerCase()) {
    case "accepted": return "bg-[#e8f8ef] text-[#067647]";
    case "rejected":
    case "failed": return "bg-[#ffebef] text-[#c01048]";
    case "expired":
    case "cancelled": return "bg-[#f2f4f7] text-[#475467]";
    case "viewed":
    case "not_responded": return "bg-[#fff4df] text-[#b54708]";
    case "delivered": return "bg-[#eef5ff] text-[#0b6df6]";
    default: return "bg-[#f4f3ff] text-[#6941c6]";
  }
}

function StatusBadge({ status }: { status: string }) {
  return <span className={cn("status-pill whitespace-nowrap", statusTone(status))}>{title(status || "requested")}</span>;
}

function maskPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "Protected";
  return `••••••${digits.slice(-4)}`;
}

function Detail({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="rounded-lg border border-[#edf0f6] bg-[#fbfcfe] p-3">
      <p className="text-[11px] font-black uppercase tracking-wide text-[#667085]">{label}</p>
      <p className="mt-1 break-words text-sm font-bold text-[#1d2939]">{value === null || value === undefined || value === "" ? "—" : value}</p>
    </div>
  );
}

function RoutingCriteria({ routing }: { routing: Record<string, unknown> }) {
  const criteria = [
    ["serviceMatched", "Service matched"],
    ["partnerOnline", "Partner was online"],
    ["accountActive", "Active account"],
    ["partnerVerified", "Verified partner"],
    ["kycVerified", "KYC verified"],
    ["trustedPartner", "Trusted partner"],
    ["locationTrusted", "Trusted location"],
    ["withinDispatchRadius", "Within dispatch radius"],
    ["withinPartnerServiceRadius", "Within partner service radius"],
  ].filter(([key]) => routing[key] === true) as [string, string][];
  if (!criteria.length) return <p className="text-sm font-semibold text-[#667085]">The legacy dispatch did not record routing criteria for this request.</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {criteria.map(([key, label]) => (
        <span key={key} className="inline-flex items-center gap-1 rounded-full bg-[#e8f8ef] px-2.5 py-1 text-xs font-bold text-[#067647]"><CheckCircle2 size={13} />{label}</span>
      ))}
    </div>
  );
}

function RequestDrawer({ request, onClose }: { request: PartnerRequest; onClose: () => void }) {
  const distance = Number(request.routing.distanceMeters || 0);
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#101828]/35 p-0 sm:p-4" role="dialog" aria-modal="true" aria-label="Partner request details">
      <button type="button" aria-label="Close request details" onClick={onClose} className="absolute inset-0 cursor-default" />
      <aside className="relative h-full w-full overflow-y-auto bg-white shadow-2xl sm:max-w-xl sm:rounded-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-[#eaecf0] bg-white px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-[#edf4ff] text-[#0b6df6]">
              {request.partner.photoUrl ? <img src={request.partner.photoUrl} alt="" className="h-full w-full object-cover" /> : <UserRound size={20} />}
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-lg font-black text-[#111827]">{request.partner.name}</h3>
              <p className="text-xs font-bold text-[#667085]">{request.partnerPublicId || request.partnerId}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg text-[#667085] hover:bg-[#f2f4f7]"><X size={19} /></button>
        </div>

        <div className="space-y-6 p-5">
          <div className="flex flex-wrap items-center gap-2"><StatusBadge status={request.status} /><span className="text-xs font-bold text-[#667085]">Round {request.dispatchStage} · {title(request.source)}</span></div>
          <section>
            <h4 className="text-sm font-black text-[#111827]">Partner details</h4>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Detail label="Phone" value={maskPhone(request.partner.phone)} />
              <Detail label="Service category" value={request.partner.serviceCategory} />
              <Detail label="Rating" value={request.partner.rating ? `${request.partner.rating.toFixed(1)} / 5` : "Not rated"} />
              <Detail label="Total jobs" value={request.partner.totalJobs} />
              <Detail label="Current availability" value={request.partner.availability} />
              <Detail label="Distance from customer" value={distance > 0 ? `${(distance / 1000).toFixed(1)} km` : "Not recorded"} />
            </div>
          </section>

          <section>
            <h4 className="text-sm font-black text-[#111827]">Request activity</h4>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Detail label="Request ID" value={request.requestId} />
              <Detail label="Booking request source" value={title(request.source)} />
              <Detail label="Sent" value={formatDateTime(request.sentAt)} />
              <Detail label="Delivered" value={formatDateTime(request.deliveredAt)} />
              <Detail label="Viewed" value={formatDateTime(request.viewedAt)} />
              <Detail label="Responded" value={formatDateTime(request.respondedAt)} />
              <Detail label="Response time" value={formatSeconds(request.responseTimeSeconds)} />
              <Detail label="Deadline" value={formatDateTime(request.expiresAt)} />
            </div>
          </section>

          <section>
            <h4 className="text-sm font-black text-[#111827]">Why this partner received the request</h4>
            <div className="mt-3"><RoutingCriteria routing={request.routing} /></div>
          </section>

          {(request.rejectionReason || request.failureReason || request.expiryReason || request.cancellationReason) && (
            <section className="rounded-xl border border-[#f0d5dc] bg-[#fff8f9] p-4">
              <h4 className="text-sm font-black text-[#9b1749]">Response / exception details</h4>
              <div className="mt-3 space-y-2 text-sm font-semibold text-[#667085]">
                {request.rejectionReason && <p><span className="font-black text-[#344054]">Rejection reason:</span> {request.rejectionReason}</p>}
                {request.failureReason && <p><span className="font-black text-[#344054]">Failure reason:</span> {request.failureReason}</p>}
                {request.expiryReason && <p><span className="font-black text-[#344054]">Expiry:</span> {request.expiryReason}</p>}
                {request.cancellationReason && <p><span className="font-black text-[#344054]">Cancellation:</span> {request.cancellationReason}</p>}
              </div>
              {request.failureTechnicalDetails && <details className="mt-4 rounded-lg border border-[#efdbe1] bg-white p-3 text-xs text-[#475467]"><summary className="cursor-pointer font-black">Technical details</summary><p className="mt-2 break-words font-mono">{request.failureTechnicalDetails}</p></details>}
            </section>
          )}

          <section>
            <h4 className="text-sm font-black text-[#111827]">Exact request log</h4>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Detail label="Booking ID" value="Available in booking header" />
              <Detail label="Partner ID" value={request.partnerId} />
              <Detail label="Push status" value={title(request.notification.pushStatus)} />
              <Detail label="Push accepted / failed" value={`${request.notification.pushSuccessCount} / ${request.notification.pushFailureCount}`} />
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}

export function PartnerRequestActivity({
  bookingId,
  requests,
  summary,
  isRefreshing = false,
}: {
  bookingId: string;
  requests: PartnerRequest[];
  summary: PartnerRequestSummary;
  isRefreshing?: boolean;
}) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<PartnerRequest | null>(null);
  const visibleRequests = useMemo(() => {
    const query = search.trim().toLowerCase();
    return requests.filter((request) => {
      const matchesFilter = filter === "all"
        || (filter === "viewed" ? Boolean(request.viewedAt) : request.status === filter);
      const matchesSearch = !query || [request.partner.name, request.partnerPublicId, request.partnerId].some((value) => value.toLowerCase().includes(query));
      return matchesFilter && matchesSearch;
    });
  }, [filter, requests, search]);

  const flow = [
    ["Booking created", 1, "bg-[#eef5ff] text-[#0b6df6]"],
    ["Eligible partners", summary.eligiblePartners, "bg-[#f4f3ff] text-[#6941c6]"],
    ["Requests sent", summary.requestsSent, "bg-[#eef5ff] text-[#0b6df6]"],
    ["Delivered", summary.delivered, "bg-[#e8f8ef] text-[#067647]"],
    ["Viewed", summary.viewed, "bg-[#fff4df] text-[#b54708]"],
    ["Rejected", summary.rejected, "bg-[#ffebef] text-[#c01048]"],
    ["Accepted", summary.accepted, "bg-[#e8f8ef] text-[#067647]"],
  ] as const;
  const metrics: { label: string; value: number; Icon: typeof Users }[] = [
    { label: "Partner requests", value: summary.total, Icon: Users },
    { label: "Delivered", value: summary.delivered, Icon: Send },
    { label: "Viewed", value: summary.viewed, Icon: Eye },
    { label: "Accepted", value: summary.accepted, Icon: CheckCircle2 },
    { label: "Rejected", value: summary.rejected, Icon: XCircle },
    { label: "Expired / failed", value: summary.expired + summary.failed, Icon: Clock3 },
  ];

  return (
    <section className="space-y-5">
      <div className="admin-card overflow-hidden">
        <div className="border-b border-[#edf0f6] px-5 py-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2"><Send size={18} className="text-[#0b6df6]" /><h2 className="text-lg font-black text-[#111827]">Partner Request Activity</h2>{isRefreshing && <span className="text-xs font-bold text-[#667085]">Refreshing…</span>}</div>
              <p className="mt-1 text-sm font-semibold text-[#667085]">Real dispatch, response, notification, and assignment events for {bookingId}.</p>
            </div>
            <Link href="/smart-assignment" className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#bfd5ff] bg-white px-4 text-sm font-black text-[#0b6df6] hover:bg-[#f5f9ff]">Open Smart Assignment <ChevronRight size={16} /></Link>
          </div>
        </div>

        <div className="grid gap-px bg-[#edf0f6] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {metrics.map(({ label, value, Icon }) => {
            return <div key={label} className="bg-white px-5 py-4"><div className="flex items-center gap-2 text-xs font-black uppercase text-[#667085]"><Icon size={14} className="text-[#0b6df6]" />{label}</div><p className="mt-1 text-2xl font-black text-[#111827]">{value.toLocaleString("en-IN")}</p></div>;
          })}
        </div>
        <div className="grid gap-4 border-t border-[#edf0f6] p-5 md:grid-cols-[1fr_auto]">
          <div><p className="text-xs font-black uppercase tracking-wide text-[#667085]">Final assignment</p><p className="mt-1 text-lg font-black text-[#111827]">{summary.assignedPartnerName || "No partner assigned"}</p><p className="mt-1 text-sm font-semibold text-[#667085]">{summary.assignmentMethod} {summary.assignedAt ? `· ${formatDateTime(summary.assignedAt)}` : ""}</p></div>
          <div className="rounded-xl bg-[#f8fbff] px-4 py-3 text-sm font-bold text-[#475467]">{summary.notResponded > 0 ? `${summary.notResponded} viewed request(s) awaiting a response` : "No viewed request is awaiting a response"}</div>
        </div>
      </div>

      <div className="admin-card p-5">
        <div className="flex items-center gap-2"><Filter size={17} className="text-[#0b6df6]" /><h3 className="text-base font-black text-[#111827]">Routing flow</h3></div>
        <div className="mt-5 grid gap-3 md:grid-cols-4 xl:grid-cols-7">
          {flow.map(([label, count, tone], index) => <div key={label} className="relative"><div className={cn("rounded-xl p-3", tone)}><p className="text-xs font-black uppercase tracking-wide">{label}</p><p className="mt-1 text-2xl font-black">{count}</p></div>{index < flow.length - 1 && <ChevronRight className="absolute -right-[17px] top-5 z-10 hidden text-[#98a2b3] xl:block" size={22} />}</div>)}
        </div>
      </div>

      <div className="admin-card overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-[#edf0f6] p-5">
          <div className="flex flex-wrap gap-2">
            {filters.map((entry) => <button key={entry.key} type="button" onClick={() => setFilter(entry.key)} className={cn("h-9 rounded-full px-3 text-xs font-black", filter === entry.key ? "bg-[#0b6df6] text-white" : "bg-[#f2f4f7] text-[#475467] hover:bg-[#e8edf5]")}>{entry.label}</button>)}
          </div>
          <label className="relative block max-w-md"><Search className="pointer-events-none absolute left-3 top-3 text-[#98a2b3]" size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search partner" className="h-11 w-full rounded-lg border border-[#dfe6f2] bg-white pl-10 pr-3 text-sm font-semibold outline-none focus:border-[#0b6df6]" /></label>
        </div>
        {requests.length === 0 ? (
          <div className="p-10 text-center"><Users className="mx-auto text-[#98a2b3]" size={38} /><p className="mt-4 font-black text-[#344054]">No partner request history</p><p className="mt-1 text-sm font-semibold text-[#667085]">This booking predates request tracking, or no eligible partner was found.</p></div>
        ) : visibleRequests.length === 0 ? (
          <div className="p-10 text-center text-sm font-semibold text-[#667085]">No partner requests match this filter.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full text-left">
              <thead className="bg-[#f8fafc] text-xs uppercase tracking-wide text-[#667085]"><tr><th className="px-5 py-3">Partner</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Sent</th><th className="px-4 py-3">Viewed</th><th className="px-4 py-3">Response</th><th className="px-4 py-3">Deadline</th><th className="px-4 py-3" /></tr></thead>
              <tbody className="divide-y divide-[#edf0f6]">
                {visibleRequests.map((request) => <tr key={request.requestId} className="cursor-pointer hover:bg-[#fbfdff]" onClick={() => setSelected(request)}><td className="px-5 py-4"><div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-[#edf4ff] text-[#0b6df6]">{request.partner.photoUrl ? <img src={request.partner.photoUrl} alt="" className="h-full w-full object-cover" /> : <UserRound size={16} />}</div><div><p className="font-black text-[#1d2939]">{request.partner.name}</p><p className="text-xs font-bold text-[#667085]">{request.partnerPublicId || request.partner.serviceCategory || "Partner"}</p></div></div></td><td className="px-4 py-4"><StatusBadge status={request.status} /></td><td className="px-4 py-4 text-sm font-semibold text-[#475467]">{formatDateTime(request.sentAt)}</td><td className="px-4 py-4 text-sm font-semibold text-[#475467]">{formatDateTime(request.viewedAt)}</td><td className="px-4 py-4"><p className="text-sm font-bold text-[#344054]">{formatDateTime(request.respondedAt)}</p><p className="mt-0.5 text-xs font-bold text-[#667085]">{formatSeconds(request.responseTimeSeconds)}</p></td><td className="px-4 py-4 text-sm font-semibold text-[#475467]">{formatDateTime(request.expiresAt)}</td><td className="px-4 py-4"><ChevronRight size={18} className="text-[#98a2b3]" /></td></tr>)}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {selected && <RequestDrawer request={selected} onClose={() => setSelected(null)} />}
    </section>
  );
}
