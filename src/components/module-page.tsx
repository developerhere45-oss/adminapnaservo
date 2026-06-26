"use client";

import Link from "next/link";
import {
  AlertTriangle,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  Filter,
  IndianRupee,
  LogOut,
  RefreshCw,
  Search,
  Settings,
  Star,
  Users,
  WalletCards,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { resourceConfig } from "@/lib/resource-config";
import { cn } from "@/lib/utils";

type ResourceRow = Record<string, unknown> & { id?: string };
type ResourcePayload = {
  resource: string;
  rows: ResourceRow[];
  metrics?: Record<string, unknown>;
};
type PartnerDocument = {
  id: string;
  documentType: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  storageProvider: string;
  validationStatus: string;
  validationReasons: string[];
  uploadedAt: string;
};
type PartnerProfilePayload = {
  partner: Record<string, unknown>;
  documents: PartnerDocument[];
  supportTickets: ResourceRow[];
  bookingHistory: ResourceRow[];
};

const metricIcons = [Users, CheckCircle2, Clock3, XCircle, CalendarCheck, IndianRupee, WalletCards, AlertTriangle, Star];
const metricTones = [
  "bg-[#eef5ff] text-[#0b6df6]",
  "bg-[#e8f8ef] text-[#079455]",
  "bg-[#fff4df] text-[#f59e0b]",
  "bg-[#ffebef] text-[#d92d4b]",
  "bg-[#f3eaff] text-[#8b5cf6]",
  "bg-[#e6fffb] text-[#0e9384]",
];

async function fetchResource(resource: string): Promise<ResourcePayload> {
  const response = await fetch(`/api/admin/${encodeURIComponent(resource)}`, { cache: "no-store" });
  if (!response.ok) throw new Error("Live backend unavailable");
  return response.json();
}

async function runAdminAction(action: string, targetId: string) {
  const response = await fetch("/api/admin/actions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, targetId }),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(typeof payload.message === "string" ? payload.message : "Action failed");
  }
  return response.json();
}

async function fetchPartnerProfile(partnerId: string): Promise<PartnerProfilePayload> {
  const response = await fetch(`/api/admin/partners/${encodeURIComponent(partnerId)}`, { cache: "no-store" });
  if (!response.ok) throw new Error("Partner profile unavailable");
  return response.json();
}

async function updatePartnerDocument(partnerId: string, documentId: string, validationStatus: "accepted" | "rejected" | "review") {
  const response = await fetch(`/api/admin/partners/${encodeURIComponent(partnerId)}/documents/${encodeURIComponent(documentId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ validationStatus }),
  });
  if (!response.ok) throw new Error("Document update failed");
  return response.json();
}

function asText(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);
  return String(value);
}

function titleFromKey(key: string) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .trim();
}

function formatDate(value: unknown) {
  if (!value) return "-";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return asText(value);
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function formatNumber(value: unknown) {
  const number = Number(value || 0);
  return new Intl.NumberFormat("en-IN").format(number);
}

function formatMoney(value: unknown) {
  return `Rs ${new Intl.NumberFormat("en-IN").format(Math.round(Number(value || 0)))}`;
}

function formatValue(key: string, value: unknown) {
  const lower = key.toLowerCase();
  if (lower.includes("date") || lower.endsWith("at") || lower.includes("time")) return formatDate(value);
  if (lower.includes("amount") || lower.includes("revenue") || lower.includes("payment") || lower.includes("earning") || lower.includes("cost")) return formatMoney(value);
  if (typeof value === "number") return formatNumber(value);
  return asText(value);
}

function statusStyle(value: string) {
  const clean = value.toLowerCase();
  if (clean.includes("active") || clean.includes("paid") || clean.includes("verified") || clean.includes("completed") || clean.includes("resolved") || clean.includes("success")) return "bg-[#e8f8ef] text-[#079455]";
  if (clean.includes("pending") || clean.includes("waiting") || clean.includes("progress") || clean.includes("medium") || clean.includes("due") || clean.includes("created")) return "bg-[#fff4df] text-[#c26a00]";
  if (clean.includes("blocked") || clean.includes("denied") || clean.includes("rejected") || clean.includes("open") || clean.includes("high") || clean.includes("cancel") || clean.includes("failed")) return "bg-[#ffebef] text-[#d92d4b]";
  return "bg-[#eef2f6] text-[#475467]";
}

function Status({ value }: { value: string }) {
  return <span className={cn("status-pill", statusStyle(value))}>{value || "-"}</span>;
}

function columnsFor(resource: string, rows: ResourceRow[]) {
  const known: Record<string, string[]> = {
    bookings: ["bookingCode", "userName", "userMobile", "serviceName", "partnerName", "bookingDateTime", "scheduledDateTime", "status", "finalServiceCost", "paymentStatus"],
    partners: ["code", "name", "phone", "services", "city", "online", "totalBookings", "rating", "kyc", "trust", "status"],
    "partner-approvals": ["code", "name", "phone", "services", "city", "approval", "kyc", "trust", "joinedAt"],
    payments: ["bookingCode", "userName", "partnerName", "amount", "currency", "status", "razorpayPaymentId", "createdAt"],
    reports: ["reportType", "currentValue"],
  };
  if (known[resource]) return known[resource];
  const first = rows[0] || {};
  return Object.keys(first).filter((key) => key !== "id").slice(0, 10);
}

function PageHeader({ resource, isFetching, onRefresh, onExport }: { resource: string; isFetching: boolean; onRefresh: () => void; onExport: () => void }) {
  const config = resourceConfig[resource] || resourceConfig.bookings;
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
      <div>
        <h1 className="text-[28px] font-black text-[#111827]">{config.title}</h1>
        <p className="mt-1 text-sm font-medium text-[#667085]">{config.subtitle} - live backend data only</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <button onClick={onRefresh} className="flex h-11 items-center gap-2 rounded-lg border border-[#e6eaf2] bg-white px-4 text-sm font-bold">
          <RefreshCw size={17} className={cn(isFetching && "animate-spin")} />
          Refresh
        </button>
        <button onClick={onExport} className="flex h-11 items-center gap-2 rounded-lg border border-[#e6eaf2] bg-white px-4 text-sm font-bold">
          <Download size={17} />
          Export
        </button>
      </div>
    </div>
  );
}

function MetricCard({ label, value, index }: { label: string; value: unknown; index: number }) {
  const Icon = metricIcons[index % metricIcons.length];
  return (
    <div className="admin-card p-5">
      <div className="flex items-center gap-4">
        <div className={cn("metric-icon", metricTones[index % metricTones.length])}><Icon size={25} /></div>
        <div>
          <p className="text-sm font-semibold text-[#475467]">{titleFromKey(label)}</p>
          <p className="mt-1 text-2xl font-black">{formatValue(label, value)}</p>
          <p className="mt-2 text-xs font-bold text-[#079455]">Live database</p>
        </div>
      </div>
    </div>
  );
}

function DataTable({
  resource,
  rows,
  selectedId,
  onSelect,
  onAdminAction,
  pendingAction,
}: {
  resource: string;
  rows: ResourceRow[];
  selectedId: string;
  onSelect: (row: ResourceRow) => void;
  onAdminAction: (action: string, targetId: string) => void;
  pendingAction?: string;
}) {
  const [search, setSearch] = useState("");
  const columns = columnsFor(resource, rows);
  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) => Object.values(row).some((value) => asText(value).toLowerCase().includes(needle)));
  }, [rows, search]);

  return (
    <div className="admin-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf0f6] px-5 py-4">
        <h2 className="text-lg font-black">{resourceConfig[resource]?.title || "Records"} List</h2>
        <div className="flex flex-wrap gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#667085]" size={17} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} className="h-11 w-[320px] rounded-lg border border-[#e6eaf2] bg-white px-10 text-sm outline-none" placeholder="Search live records..." />
          </div>
          <button className="flex h-11 items-center gap-2 rounded-lg border border-[#e6eaf2] px-4 text-sm font-bold"><Filter size={16} />Filter</button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="text-xs text-[#667085]">
            <tr>
              {columns.map((header) => <th key={header} className="px-5 py-4 font-bold">{titleFromKey(header)}</th>)}
              <th className="px-5 py-4 font-bold">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={columns.length + 1} className="px-5 py-12 text-center text-sm font-semibold text-[#667085]">No live records found.</td></tr>
            ) : filtered.map((row) => (
              <tr key={row.id || JSON.stringify(row)} onClick={() => onSelect(row)} className={cn("cursor-pointer border-t border-[#edf0f6] hover:bg-[#f8fbff]", selectedId && row.id === selectedId && "bg-[#f5f9ff]")}>
                {columns.map((column) => {
                  const value = formatValue(column, row[column]);
                  const statusLike = ["status", "paymentStatus", "kyc", "trust", "priority", "approval"].includes(column);
                  return (
                    <td key={column} className="whitespace-pre-line px-5 py-3 font-medium text-[#263149]">
                      {statusLike ? <Status value={value} /> : value}
                    </td>
                  );
                })}
                <td className="px-5 py-3">
                  {resource === "partner-approvals" && row.id ? (
                    <div className="flex min-w-[180px] gap-2" onClick={(event) => event.stopPropagation()}>
                      <button
                        disabled={pendingAction === `${row.id}:approve-technician`}
                        className="flex h-9 items-center gap-1 rounded-lg bg-[#079455] px-3 text-xs font-black text-white disabled:opacity-60"
                        onClick={() => onAdminAction("approve-technician", String(row.id))}
                      >
                        <CheckCircle2 size={14} />
                        Approve
                      </button>
                      <button
                        disabled={pendingAction === `${row.id}:reject-technician`}
                        className="flex h-9 items-center gap-1 rounded-lg border border-[#ffd3dc] bg-white px-3 text-xs font-black text-[#d92d4b] disabled:opacity-60"
                        onClick={() => onAdminAction("reject-technician", String(row.id))}
                      >
                        <XCircle size={14} />
                        Deny
                      </button>
                    </div>
                  ) : resource === "bookings" && row.id ? (
                    <Link href={`/bookings/${encodeURIComponent(String(row.id))}`} className="grid h-9 w-12 place-items-center rounded-lg border border-[#e6eaf2]" onClick={(event) => event.stopPropagation()}><Eye size={16} /></Link>
                  ) : (
                    <button className="grid h-9 w-12 place-items-center rounded-lg border border-[#e6eaf2]" onClick={(event) => { event.stopPropagation(); onSelect(row); }}><Eye size={16} /></button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-[#edf0f6] px-5 py-4 text-sm font-medium text-[#667085]">
        <span>Showing {filtered.length} of {rows.length} live records</span>
      </div>
    </div>
  );
}

function PartnerDetailPanel({
  row,
  onAdminAction,
  pendingAction,
}: {
  row: ResourceRow;
  onAdminAction: (action: string, targetId: string) => void;
  pendingAction?: string;
}) {
  const partnerId = String(row.id || "");
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-partner-profile", partnerId],
    queryFn: () => fetchPartnerProfile(partnerId),
    enabled: Boolean(partnerId),
    refetchInterval: 30_000,
  });
  const documentMutation = useMutation({
    mutationFn: ({ documentId, validationStatus }: { documentId: string; validationStatus: "accepted" | "rejected" | "review" }) =>
      updatePartnerDocument(partnerId, documentId, validationStatus),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-partner-profile", partnerId] });
    },
  });

  const partner = data?.partner || row;
  const profilePhoto = asText(partner.profilePhoto);
  const fields = [
    "fullName", "mobileNumber", "email", "dateOfBirth", "gender", "completeResidentialAddress",
    "city", "state", "pinCode", "emergencyContactNumber", "professionServiceCategory",
    "yearsOfExperience", "workingAreas", "serviceArea", "languagesKnown", "registrationDate",
    "currentVerificationStatus", "kycStatus", "trustStatus", "accountStatus",
  ];

  return (
    <div className="admin-card p-5">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black">Partner Verification</h2>
          <p className="mt-1 text-xs font-bold text-[#667085]">{asText(partner.partnerCode || row.code)}</p>
        </div>
        {partner.currentVerificationStatus ? <Status value={asText(partner.currentVerificationStatus)} /> : null}
      </div>

      {isError && <div className="mb-4 rounded-lg bg-[#fff7f9] p-3 text-xs font-bold text-[#d92d4b]">Full live profile unavailable.</div>}
      {isLoading && <div className="mb-4 rounded-lg bg-[#f8fbff] p-3 text-xs font-bold text-[#667085]">Loading complete profile...</div>}

      <div className="mb-5 grid grid-cols-2 gap-2">
        <button
          disabled={pendingAction === `${partnerId}:approve-technician`}
          className="flex h-10 items-center justify-center gap-2 rounded-lg bg-[#079455] text-xs font-black text-white disabled:opacity-60"
          onClick={() => onAdminAction("approve-technician", partnerId)}
        >
          <CheckCircle2 size={15} />
          Approve
        </button>
        <button
          disabled={pendingAction === `${partnerId}:reject-technician`}
          className="flex h-10 items-center justify-center gap-2 rounded-lg border border-[#ffd3dc] bg-white text-xs font-black text-[#d92d4b] disabled:opacity-60"
          onClick={() => onAdminAction("reject-technician", partnerId)}
        >
          <XCircle size={15} />
          Reject
        </button>
      </div>

      <div className="max-h-[720px] space-y-5 overflow-y-auto pr-1">
        <section>
          <h3 className="mb-3 text-sm font-black">Complete Profile</h3>
          <div className="mb-4 flex items-center gap-3 rounded-lg border border-[#edf0f6] bg-[#f8fbff] p-3">
            {profilePhoto !== "-" ? (
              <img src={profilePhoto} alt="Partner profile" className="h-16 w-16 rounded-full border border-[#dbeafe] object-cover" />
            ) : (
              <div className="grid h-16 w-16 place-items-center rounded-full bg-[#eef5ff] text-sm font-black text-[#0b6df6]">AS</div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-black text-[#111827]">Profile Photo</p>
              <p className="mt-1 break-all text-xs font-semibold text-[#667085]">{profilePhoto !== "-" ? "Uploaded and available for review" : "No uploaded profile photo found"}</p>
              {profilePhoto !== "-" && <a href={profilePhoto} target="_blank" className="mt-2 inline-flex text-xs font-black text-[#0b6df6]">Open profile photo</a>}
            </div>
          </div>
          <div className="space-y-3 text-sm">
            {fields.map((field) => (
              <div key={field} className="grid grid-cols-[145px_1fr] gap-3 border-b border-[#edf0f6] pb-2 last:border-0">
                <span className="font-semibold text-[#667085]">{titleFromKey(field)}</span>
                <span className="break-words font-bold text-[#111827]">{formatValue(field, partner[field])}</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="mb-3 text-sm font-black">Uploaded Documents</h3>
          {!data?.documents?.length ? (
            <p className="rounded-lg bg-[#fff7f9] p-3 text-xs font-bold text-[#d92d4b]">No live documents uploaded.</p>
          ) : (
            <div className="space-y-3">
              {data.documents.map((document) => (
                <div key={document.id} className="rounded-lg border border-[#edf0f6] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-black text-[#111827]">{titleFromKey(document.documentType)}</p>
                      <p className="mt-1 text-xs font-semibold text-[#667085]">{formatDate(document.uploadedAt)} | {document.storageProvider || "storage"} | {document.sizeBytes ? `${Math.round(document.sizeBytes / 1024)} KB` : "size unknown"}</p>
                    </div>
                    <Status value={document.validationStatus} />
                  </div>
                  {document.url && (document.mimeType?.startsWith("image/") || document.url.startsWith("data:image/")) ? (
                    <a href={document.url} target="_blank" className="mt-3 block overflow-hidden rounded-lg border border-[#edf0f6] bg-[#f8fbff]">
                      <img src={document.url} alt={titleFromKey(document.documentType)} className="h-36 w-full object-cover" />
                    </a>
                  ) : null}
                  {document.url ? (
                    <a href={document.url} target="_blank" className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg border border-[#e6eaf2] px-3 text-xs font-black text-[#0b6df6]">
                      <Eye size={14} />
                      Open File
                    </a>
                  ) : (
                    <p className="mt-3 rounded-lg bg-[#fff7f9] p-3 text-xs font-bold text-[#d92d4b]">File URL missing. Ask partner to re-upload this document.</p>
                  )}
                  {document.validationReasons?.length ? (
                    <p className="mt-2 text-xs font-semibold text-[#667085]">Checks: {document.validationReasons.join(", ")}</p>
                  ) : null}
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button className="h-9 rounded-lg bg-[#079455] text-xs font-black text-white" onClick={() => documentMutation.mutate({ documentId: document.id, validationStatus: "accepted" })}>Verify</button>
                    <button className="h-9 rounded-lg border border-[#ffd3dc] bg-white text-xs font-black text-[#d92d4b]" onClick={() => documentMutation.mutate({ documentId: document.id, validationStatus: "rejected" })}>Reject</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h3 className="mb-3 text-sm font-black">Verification Support Tickets</h3>
          {!data?.supportTickets?.length ? (
            <p className="rounded-lg bg-[#f8fbff] p-3 text-xs font-bold text-[#667085]">No support ticket for this partner.</p>
          ) : data.supportTickets.slice(0, 5).map((ticket) => (
            <div key={asText(ticket.id)} className="rounded-lg border border-[#edf0f6] p-3 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-black text-[#111827]">{asText(ticket.ticketId)}</span>
                <Status value={asText(ticket.status)} />
              </div>
              <p className="mt-2 font-bold text-[#667085]">{asText(ticket.ticketCategory)}</p>
              <p className="mt-1 line-clamp-3 text-[#475467]">{asText(ticket.complaint)}</p>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

function DetailPanel({
  resource,
  row,
  onAdminAction,
  pendingAction,
}: {
  resource: string;
  row: ResourceRow | null;
  onAdminAction: (action: string, targetId: string) => void;
  pendingAction?: string;
}) {
  if (!row) {
    return (
      <div className="admin-card p-5">
        <h2 className="text-lg font-black">Selected Record</h2>
        <p className="mt-5 text-sm font-semibold text-[#667085]">Select a live row to inspect details.</p>
      </div>
    );
  }

  if ((resource === "partners" || resource === "partner-approvals") && row.id) {
    return <PartnerDetailPanel row={row} onAdminAction={onAdminAction} pendingAction={pendingAction} />;
  }

  return (
    <div className="admin-card p-5">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-black">Selected Record</h2>
        {row.status ? <Status value={asText(row.status)} /> : null}
      </div>
      <div className="max-h-[620px] space-y-4 overflow-y-auto pr-1 text-sm">
        {Object.entries(row).map(([label, value]) => (
          <div key={label} className="grid grid-cols-[130px_1fr] gap-4 border-b border-[#edf0f6] pb-3 last:border-0">
            <span className="font-semibold text-[#667085]">{titleFromKey(label)}</span>
            <span className="break-words font-bold text-[#111827]">{formatValue(label, value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function exportRows(resource: string, rows: ResourceRow[]) {
  const columns = columnsFor(resource, rows);
  const csv = [
    columns.map(titleFromKey).join(","),
    ...rows.map((row) => columns.map((column) => `"${asText(row[column]).replace(/"/g, '""')}"`).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${resource}-live-export.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function SettingsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[28px] font-black text-[#111827]">Settings</h1>
        <p className="mt-1 text-sm font-medium text-[#667085]">No default settings are displayed until a live settings backend endpoint is connected.</p>
      </div>
      <div className="admin-card p-8">
        <div className="flex items-center gap-3">
          <Settings className="text-[#0b6df6]" size={24} />
          <div>
            <h2 className="text-lg font-black">Live Settings Required</h2>
            <p className="mt-1 text-sm font-semibold text-[#667085]">This panel is intentionally empty instead of showing fake/default configuration values.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function LogoutPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[28px] font-black text-[#111827]">Logout</h1>
        <p className="mt-1 text-sm font-medium text-[#667085]">Dashboard &gt; Logout</p>
      </div>
      <div className="grid min-h-[620px] place-items-center">
        <div className="admin-card w-full max-w-[560px] p-10 text-center">
          <div className="mx-auto grid h-28 w-28 place-items-center rounded-full bg-[#eef5ff] text-[#0b6df6]"><LogOut size={54} /></div>
          <h2 className="mt-7 text-3xl font-black">Ready to Logout?</h2>
          <p className="mt-4 text-[#667085]">Password/login is disabled for this local build as requested.</p>
          <Link href="/dashboard" className="mt-8 grid h-12 w-full place-items-center rounded-lg bg-[#0b6df6] text-sm font-black text-white">Back to Dashboard</Link>
        </div>
      </div>
    </div>
  );
}

export function ModulePage({ resource }: { resource: string }) {
  const [selected, setSelected] = useState<ResourceRow | null>(null);
  const [actionMessage, setActionMessage] = useState("");
  const [pendingAction, setPendingAction] = useState("");
  const queryClient = useQueryClient();
  const { data, isFetching, isError, refetch } = useQuery({
    queryKey: ["admin-resource", resource],
    queryFn: () => fetchResource(resource),
    refetchInterval: 30_000,
    enabled: resource !== "settings" && resource !== "logout",
  });
  const actionMutation = useMutation({
    mutationFn: ({ action, targetId }: { action: string; targetId: string }) => runAdminAction(action, targetId),
    onMutate: ({ action, targetId }) => {
      setPendingAction(`${targetId}:${action}`);
      setActionMessage("");
    },
    onSuccess: async (_result, variables) => {
      setActionMessage(variables.action === "approve-technician" ? "Partner approved and notified." : "Partner denied and notified.");
      setSelected(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-resource", resource] });
    },
    onError: (error) => {
      setActionMessage(error instanceof Error ? error.message : "Action failed");
    },
    onSettled: () => setPendingAction(""),
  });

  if (resource === "settings") return <SettingsPage />;
  if (resource === "logout") return <LogoutPage />;

  const rows = data?.rows || [];
  const selectedRow = selected && rows.some((row) => row.id === selected.id) ? selected : rows[0] || null;
  const metrics = Object.entries(data?.metrics || {});

  return (
    <div>
      <PageHeader resource={resource} isFetching={isFetching} onRefresh={() => refetch()} onExport={() => exportRows(resource, rows)} />
      {isError && <div className="admin-card mb-5 border-[#ffd3dc] bg-[#fff7f9] p-4 text-sm font-bold text-[#d92d4b]">Live backend unavailable. No default records are being shown.</div>}
      {actionMessage && (
        <div className={cn("admin-card mb-5 p-4 text-sm font-bold", actionMessage.includes("failed") || actionMessage.includes("unavailable") ? "border-[#ffd3dc] bg-[#fff7f9] text-[#d92d4b]" : "border-[#c7f0d8] bg-[#f3fff7] text-[#079455]")}>
          {actionMessage}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {metrics.length === 0 ? (
          <div className="admin-card p-5 text-sm font-semibold text-[#667085]">No live metrics returned.</div>
        ) : metrics.map(([label, value], index) => <MetricCard key={label} label={label} value={value} index={index} />)}
      </section>

      <section className="mt-5 grid gap-5 2xl:grid-cols-[1fr_430px]">
        <DataTable
          resource={resource}
          rows={rows}
          selectedId={asText(selectedRow?.id)}
          onSelect={setSelected}
          onAdminAction={(action, targetId) => actionMutation.mutate({ action, targetId })}
          pendingAction={pendingAction}
        />
        <DetailPanel
          resource={resource}
          row={selectedRow}
          onAdminAction={(action, targetId) => actionMutation.mutate({ action, targetId })}
          pendingAction={pendingAction}
        />
      </section>
    </div>
  );
}
