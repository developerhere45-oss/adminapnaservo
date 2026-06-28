"use client";

import Link from "next/link";
import {
  AlertTriangle,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Clipboard,
  Copy,
  Download,
  Eye,
  FileText,
  Filter,
  IndianRupee,
  LogOut,
  MapPin,
  MessageSquare,
  MoreVertical,
  RefreshCw,
  Search,
  Settings,
  Star,
  Trash2,
  UserRound,
  Users,
  WalletCards,
  Wrench,
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

function adminActionMessage(action: string, result?: { reapproved?: boolean }) {
  if (action === "approve-technician") return result?.reapproved ? "Partner approved again and notified." : "Partner approved and notified.";
  if (action === "reject-technician") return "Partner denied and notified.";
  if (action === "suspend-technician" || action === "block-technician") return "Partner blocked.";
  if (action === "delete-partner") return "Partner deleted from active admin records.";
  if (action === "delete-device") return "Device deleted and notifications disabled for that device.";
  return "Action completed.";
}

function partnerApprovalState(partner: ResourceRow) {
  const verification = asText(partner.currentVerificationStatus || partner.approval).toLowerCase();
  const kyc = asText(partner.kycStatus || partner.kyc).toLowerCase();
  const account = asText(partner.accountStatus || partner.status).toLowerCase();
  const trust = asText(partner.trustStatus || partner.trust).toLowerCase();
  return {
    approved: verification === "approved" || (kyc === "verified" && trust === "trusted" && account === "active"),
    rejected: verification === "rejected" || verification === "denied" || kyc === "rejected",
    blocked: verification === "blocked" || account === "blocked" || account === "suspended" || trust === "suspended",
  };
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

function initials(value: unknown) {
  const words = asText(value).replace("-", "ApnaServo").split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((word) => word[0]?.toUpperCase()).join("") || "AS";
}

function documentLabel(type: string) {
  const labels: Record<string, string> = {
    aadhaar_front: "Aadhaar Card Front",
    aadhaar_back: "Aadhaar Card Back",
    pan_card: "PAN Card",
    selfie_photo: "Selfie / Face Photo",
    profile_photo: "Profile Photo",
    id_proof: "Identity Proof",
    address_proof: "Address Proof",
    experience_certificate: "Experience Certificate",
    skill_certificate: "Skill Certificate",
    training_certificate: "Training Certificate",
    government_license: "Government License",
    trade_license: "Trade License",
    other_supporting_document: "Supporting Document",
  };
  return labels[type] || titleFromKey(type || "Document");
}

function serviceTone(service: unknown) {
  const value = asText(service).toLowerCase();
  if (value.includes("plumb")) return "bg-[#fff0f4] text-[#f32368]";
  if (value.includes("electric")) return "bg-[#fff8e6] text-[#c26a00]";
  if (value.includes("clean")) return "bg-[#e8f8ef] text-[#079455]";
  return "bg-[#eef5ff] text-[#0b6df6]";
}

function shortDate(value: unknown) {
  if (!value) return "-";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return asText(value);
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function shortTime(value: unknown) {
  if (!value) return "";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit" }).format(date);
}

function copyText(value: unknown) {
  const text = asText(value);
  if (text === "-") return;
  navigator.clipboard?.writeText(text).catch(() => undefined);
}

function columnsFor(resource: string, rows: ResourceRow[]) {
  const known: Record<string, string[]> = {
    bookings: ["bookingCode", "userName", "userMobile", "serviceName", "partnerName", "bookingDateTime", "scheduledDateTime", "status", "finalServiceCost", "paymentStatus"],
    partners: ["code", "name", "phone", "services", "city", "online", "totalBookings", "rating", "kyc", "trust", "status"],
    devices: ["ownerType", "ownerName", "mobileNumber", "platform", "appType", "deviceId", "status", "lastUpdatedAt"],
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

function BookingOperationsTable({ rows }: { rows: ResourceRow[] }) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) => Object.values(row).some((value) => asText(value).toLowerCase().includes(needle)));
  }, [rows, search]);
  const visible = filtered.slice(0, 10);

  return (
    <div className="admin-card overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#edf0f6] px-5 py-5">
        <div>
          <h2 className="text-xl font-black text-[#111827]">Bookings List</h2>
          <p className="mt-1 text-sm font-semibold text-[#667085]">Manage and track all customer bookings in real time</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#667085]" size={17} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} className="h-11 w-[360px] max-w-full rounded-lg border border-[#e6eaf2] bg-white px-10 text-sm font-semibold outline-none" placeholder="Search live records..." />
          </div>
          <button className="flex h-11 items-center gap-2 rounded-lg border border-[#bfd5ff] bg-white px-4 text-sm font-black text-[#0b6df6]"><Filter size={16} />Filter</button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1220px] text-left text-sm">
          <thead className="bg-[#fbfcff] text-xs text-[#667085]">
            <tr>
              {["Booking Code", "User Name", "User Mobile", "Service Name", "Partner Name", "Booking Date Time", "Scheduled Date Time", "Status", "Final Service Cost", "Payment Status", "Action"].map((head) => (
                <th key={head} className="px-5 py-4 font-black">{head}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr><td colSpan={11} className="px-5 py-14 text-center text-sm font-semibold text-[#667085]">No live bookings found.</td></tr>
            ) : visible.map((row) => (
              <tr key={asText(row.id || row.bookingCode)} className="border-t border-[#edf0f6] odd:bg-[#f8fbff] hover:bg-[#f4f8ff]">
                <td className="px-5 py-4 align-top">
                  <p className="font-black text-[#111827]">{asText(row.bookingCode)}</p>
                  <button onClick={() => copyText(row.bookingCode)} className="mt-2 inline-flex items-center gap-1 text-xs font-black text-[#0b6df6]"><Copy size={13} />Copy</button>
                </td>
                <td className="px-5 py-4 align-top">
                  <p className="font-black text-[#111827]">{asText(row.userName)}</p>
                  <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#667085]"><UserRound size={13} />Customer</p>
                </td>
                <td className="px-5 py-4 align-top font-bold text-[#263149]">{asText(row.userMobile)}</td>
                <td className="px-5 py-4 align-top">
                  <div className="flex items-center gap-3">
                    <span className={cn("grid h-9 w-9 place-items-center rounded-lg", serviceTone(row.serviceName || row.serviceCategory))}><Wrench size={17} /></span>
                    <div>
                      <p className="font-black text-[#263149]">{asText(row.serviceName)}</p>
                      {row.serviceCategory ? <p className="text-xs font-semibold text-[#667085]">{asText(row.serviceCategory)}</p> : null}
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 align-top font-bold text-[#263149]">{asText(row.partnerName)}</td>
                <td className="px-5 py-4 align-top">
                  <p className="inline-flex items-center gap-2 font-black text-[#263149]"><CalendarDays size={15} className="text-[#0b6df6]" />{shortDate(row.bookingDateTime)}</p>
                  <p className="mt-1 text-xs font-semibold text-[#263149]">{shortTime(row.bookingDateTime)}</p>
                </td>
                <td className="px-5 py-4 align-top">
                  <p className="inline-flex items-center gap-2 font-black text-[#263149]"><Clock3 size={15} className="text-[#8b5cf6]" />{asText(row.scheduledDateTime)}</p>
                </td>
                <td className="px-5 py-4 align-top"><Status value={asText(row.status)} /></td>
                <td className="px-5 py-4 align-top font-black text-[#111827]">{formatMoney(row.finalServiceCost)}</td>
                <td className="px-5 py-4 align-top"><Status value={asText(row.paymentStatus)} /></td>
                <td className="px-5 py-4 align-top">
                  <Link href={`/bookings/${encodeURIComponent(asText(row.id))}`} className="grid h-9 w-12 place-items-center rounded-lg border border-[#e6eaf2] bg-white text-[#0b6df6]"><Eye size={16} /></Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf0f6] px-5 py-4 text-sm font-semibold text-[#667085]">
        <span>Showing {visible.length ? `1 to ${visible.length}` : "0"} of {filtered.length} bookings</span>
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((page) => <button key={page} className={cn("h-9 w-9 rounded-lg border border-[#e6eaf2] font-black", page === 1 ? "bg-[#0b6df6] text-white" : "bg-white text-[#263149]")}>{page}</button>)}
          <span className="px-2">...</span>
          <button className="h-9 w-9 rounded-lg border border-[#e6eaf2] bg-white font-black text-[#263149]">{Math.max(Math.ceil(filtered.length / 10), 1)}</button>
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
                    <div className="flex min-w-[240px] gap-2" onClick={(event) => event.stopPropagation()}>
                      <button
                        disabled={pendingAction === `${row.id}:approve-technician`}
                        className="flex h-9 items-center gap-1 rounded-lg bg-[#079455] px-3 text-xs font-black text-white disabled:opacity-60"
                        onClick={() => onAdminAction("approve-technician", String(row.id))}
                      >
                        <CheckCircle2 size={14} />
                        {partnerApprovalState(row).rejected ? "Approve Again" : "Approve"}
                      </button>
                      {!partnerApprovalState(row).rejected && (
                        <button
                          disabled={pendingAction === `${row.id}:reject-technician`}
                          className="flex h-9 items-center gap-1 rounded-lg border border-[#ffd3dc] bg-white px-3 text-xs font-black text-[#d92d4b] disabled:opacity-60"
                          onClick={() => onAdminAction("reject-technician", String(row.id))}
                        >
                          <XCircle size={14} />
                          Deny
                        </button>
                      )}
                      <button
                        disabled={pendingAction === `${row.id}:delete-partner`}
                        className="grid h-9 w-9 place-items-center rounded-lg border border-[#ffd3dc] bg-white text-[#d92d4b] disabled:opacity-60"
                        aria-label="Delete partner"
                        onClick={() => {
                          if (window.confirm("Delete this partner from active admin records? This will disable partner login notifications and receiving bookings.")) {
                            onAdminAction("delete-partner", String(row.id));
                          }
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ) : resource === "partners" && row.id ? (
                    <div className="flex min-w-[150px] gap-2" onClick={(event) => event.stopPropagation()}>
                      <button className="grid h-9 w-10 place-items-center rounded-lg border border-[#e6eaf2]" onClick={() => onSelect(row)} aria-label="View partner"><Eye size={16} /></button>
                      <button
                        disabled={pendingAction === `${row.id}:block-technician`}
                        className="grid h-9 w-10 place-items-center rounded-lg border border-[#ffd3dc] bg-white text-[#d92d4b] disabled:opacity-60"
                        aria-label="Block partner"
                        onClick={() => {
                          if (window.confirm("Block this partner from receiving bookings?")) {
                            onAdminAction("block-technician", String(row.id));
                          }
                        }}
                      >
                        <XCircle size={15} />
                      </button>
                      <button
                        disabled={pendingAction === `${row.id}:delete-partner`}
                        className="grid h-9 w-10 place-items-center rounded-lg border border-[#ffd3dc] bg-white text-[#d92d4b] disabled:opacity-60"
                        aria-label="Delete partner"
                        onClick={() => {
                          if (window.confirm("Delete this partner from active admin records? Active bookings must be completed or reassigned first.")) {
                            onAdminAction("delete-partner", String(row.id));
                          }
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ) : resource === "devices" && row.id ? (
                    <div className="flex min-w-[100px] gap-2" onClick={(event) => event.stopPropagation()}>
                      <button className="grid h-9 w-10 place-items-center rounded-lg border border-[#e6eaf2]" onClick={() => onSelect(row)} aria-label="View device"><Eye size={16} /></button>
                      <button
                        disabled={pendingAction === `${row.id}:delete-device`}
                        className="grid h-9 w-10 place-items-center rounded-lg border border-[#ffd3dc] bg-white text-[#d92d4b] disabled:opacity-60"
                        aria-label="Delete device"
                        onClick={() => {
                          if (window.confirm("Delete this device token? Push notifications will stop for this device.")) {
                            onAdminAction("delete-device", String(row.id));
                          }
                        }}
                      >
                        <Trash2 size={15} />
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
  const approvalState = partnerApprovalState(partner);
  const profilePhoto = asText(partner.profilePhoto);
  const docs = data?.documents || [];
  const verifiedDocumentCount = docs.filter((document) => document.validationStatus === "accepted").length + (profilePhoto !== "-" ? 1 : 0);
  const profileDocument = profilePhoto !== "-" ? [{
    id: "profile-photo",
    documentType: "profile_photo",
    originalName: "Profile Photo",
    mimeType: "image/jpeg",
    sizeBytes: 0,
    url: profilePhoto,
    storageProvider: "profile",
    validationStatus: asText(partner.currentVerificationStatus) === "Approved" ? "accepted" : "review",
    validationReasons: [],
    uploadedAt: asText(partner.registrationDate),
  } satisfies PartnerDocument] : [];
  const visibleDocs = [...profileDocument, ...docs];
  const detailRows: Array<[string, unknown]> = [
    ["Emergency Contact Number", partner.emergencyContactNumber],
    ["Profession Service Category", partner.professionServiceCategory],
    ["Years Of Experience", partner.yearsOfExperience],
    ["Working Areas", partner.workingAreas],
    ["Service Area", partner.serviceArea],
    ["Languages Known", partner.languagesKnown],
    ["Registration Date", partner.registrationDate],
    ["Current Verification Status", partner.currentVerificationStatus],
    ["Last Approved At", partner.approvedAt],
    ["Last Rejected At", partner.rejectedAt],
    ["Rejection Reason", partner.rejectionReason],
    ["Kyc Status", partner.kycStatus],
    ["Trust Status", partner.trustStatus],
    ["Account Status", partner.accountStatus],
  ];

  return (
    <div className="space-y-4">
      <div className="admin-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#edf0f6] px-4 py-3">
          <button className="text-xs font-black text-[#667085]">Back to Partners</button>
          <button className="grid h-8 w-8 place-items-center rounded-lg border border-[#e6eaf2] text-[#667085]"><MoreVertical size={16} /></button>
        </div>
        <div className="bg-gradient-to-r from-[#eefbf4] to-[#f8fffb] p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              {profilePhoto !== "-" ? (
                <img src={profilePhoto} alt="Partner profile" className="h-16 w-16 rounded-full border-4 border-white object-cover shadow-sm" />
              ) : (
                <div className="grid h-16 w-16 place-items-center rounded-full bg-[#dff8ea] text-lg font-black text-[#079455]">{initials(partner.fullName || partner.name)}</div>
              )}
              <div className="min-w-0">
                <h2 className="text-lg font-black text-[#111827]">Partner Verification</h2>
                <p className="mt-1 text-xs font-bold text-[#667085]">{asText(partner.partnerCode || row.code)} <Status value={asText(partner.currentVerificationStatus || row.approval)} /></p>
                <p className="mt-1 text-xs font-semibold text-[#667085]">Registration Date: {formatDate(partner.registrationDate || row.joinedAt)}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {!approvalState.approved && (
                <button disabled={pendingAction === `${partnerId}:approve-technician`} onClick={() => onAdminAction("approve-technician", partnerId)} className="flex h-10 items-center gap-2 rounded-lg bg-[#079455] px-4 text-xs font-black text-white disabled:opacity-60"><CheckCircle2 size={15} />{approvalState.rejected ? "Approve Again" : approvalState.blocked ? "Restore & Approve" : "Approve Partner"}</button>
              )}
              {!approvalState.approved && !approvalState.rejected && !approvalState.blocked && (
                <button disabled={pendingAction === `${partnerId}:reject-technician`} onClick={() => onAdminAction("reject-technician", partnerId)} className="flex h-10 items-center gap-2 rounded-lg border border-[#ffd3dc] bg-white px-4 text-xs font-black text-[#d92d4b] disabled:opacity-60"><XCircle size={15} />Reject Partner</button>
              )}
              {approvalState.approved && (
                <button
                  disabled={pendingAction === `${partnerId}:block-technician`}
                  onClick={() => {
                    if (window.confirm("Block this partner from receiving bookings?")) {
                      onAdminAction("block-technician", partnerId);
                    }
                  }}
                  className="flex h-10 items-center gap-2 rounded-lg border border-[#ffd3dc] bg-white px-4 text-xs font-black text-[#d92d4b] disabled:opacity-60"
                >
                  <XCircle size={15} />Block
                </button>
              )}
              <button
                disabled={pendingAction === `${partnerId}:delete-partner`}
                onClick={() => {
                  if (window.confirm("Delete this partner from active admin records? Active bookings must be completed or reassigned first.")) {
                    onAdminAction("delete-partner", partnerId);
                  }
                }}
                className="flex h-10 items-center gap-2 rounded-lg bg-[#d92d4b] px-4 text-xs font-black text-white disabled:opacity-60"
              >
                <Trash2 size={15} />Delete
              </button>
            </div>
          </div>
        </div>
        <div className="flex gap-2 border-b border-[#edf0f6] px-4 py-3 text-xs font-black">
          {["Overview", "Documents", "History", "Activity"].map((tab, index) => (
            <span key={tab} className={cn("rounded-lg px-3 py-2", index === 0 ? "bg-[#e8f8ef] text-[#079455]" : "text-[#667085]")}>{tab}</span>
          ))}
        </div>

        {isError && <div className="m-4 rounded-lg bg-[#fff7f9] p-3 text-xs font-bold text-[#d92d4b]">Full live profile unavailable.</div>}
        {isLoading && <div className="m-4 rounded-lg bg-[#f8fbff] p-3 text-xs font-bold text-[#667085]">Loading complete profile...</div>}

        <div className="grid gap-4 p-4 xl:grid-cols-[1fr_320px]">
          <section className="rounded-lg border border-[#edf0f6]">
            <div className="flex items-center gap-2 border-b border-[#edf0f6] px-4 py-3">
              <UserRound size={16} className="text-[#079455]" />
              <h3 className="text-sm font-black">Partner Details</h3>
            </div>
            <div className="divide-y divide-[#edf0f6] text-sm">
              {detailRows.map(([label, value]) => (
                <div key={String(label)} className="grid grid-cols-[155px_1fr] gap-3 px-4 py-3">
                  <span className="font-semibold text-[#667085]">{label}</span>
                  <span className="break-words font-black text-[#111827]">{formatValue(String(label), value)}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-[#edf0f6]">
            <div className="flex items-center justify-between border-b border-[#edf0f6] px-4 py-3">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-[#079455]" />
                <h3 className="text-sm font-black">Uploaded Documents</h3>
              </div>
              <span className="rounded-full bg-[#e8f8ef] px-2 py-1 text-xs font-black text-[#079455]">{visibleDocs.length}</span>
            </div>
            <div className="max-h-[520px] space-y-3 overflow-y-auto p-4">
              {visibleDocs.length === 0 ? (
                <p className="rounded-lg bg-[#fff7f9] p-3 text-xs font-bold text-[#d92d4b]">No profile photo or documents uploaded yet.</p>
              ) : visibleDocs.map((document) => (
                <div key={document.id} className="flex gap-3 rounded-lg border border-[#edf0f6] p-2">
                  <a href={document.url || "#"} target="_blank" className="grid h-16 w-20 shrink-0 place-items-center overflow-hidden rounded-lg bg-[#f8fbff]">
                    {document.url && (document.mimeType?.startsWith("image/") || document.url.startsWith("data:image/")) ? (
                      <img src={document.url} alt={documentLabel(document.documentType)} className="h-full w-full object-cover" />
                    ) : <FileText size={22} className="text-[#667085]" />}
                  </a>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-black text-[#111827]">{documentLabel(document.documentType)}</p>
                    <Status value={document.validationStatus === "accepted" ? "Verified" : document.validationStatus} />
                    {document.url ? <a href={document.url} target="_blank" className="mt-1 block text-xs font-black text-[#0b6df6]">View</a> : <p className="mt-1 text-xs font-bold text-[#d92d4b]">Missing file URL</p>}
                    {document.id !== "profile-photo" && (
                      <div className="mt-2 flex gap-2">
                        <button onClick={() => documentMutation.mutate({ documentId: document.id, validationStatus: "accepted" })} className="rounded-md bg-[#e8f8ef] px-2 py-1 text-[11px] font-black text-[#079455]">Verify</button>
                        <button onClick={() => documentMutation.mutate({ documentId: document.id, validationStatus: "rejected" })} className="rounded-md bg-[#fff0f4] px-2 py-1 text-[11px] font-black text-[#d92d4b]">Reject</button>
                      </div>
                    )}
                  </div>
                  {document.url ? <a href={document.url} target="_blank" className="grid h-9 w-9 place-items-center rounded-lg border border-[#d7f2e2] text-[#079455]"><Download size={15} /></a> : null}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-[#edf0f6] p-4">
            <div className="flex items-center gap-2"><UserRound size={16} className="text-[#079455]" /><h3 className="text-sm font-black">About Partner</h3></div>
            <p className="mt-3 rounded-lg bg-[#f8fbff] p-3 text-sm font-semibold text-[#475467]">
              {asText(partner.fullName || row.name)} is registered for {formatValue("services", partner.professionServiceCategory || row.services)} with {formatValue("yearsOfExperience", partner.yearsOfExperience || 0)} years of experience.
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <div className="rounded-lg border border-[#edf0f6] p-3"><Clock3 size={15} className="mb-2 text-[#667085]" /><b>{asText(partner.yearsOfExperience || 0)}</b><br />Years Exp.</div>
              <div className="rounded-lg border border-[#edf0f6] p-3"><Wrench size={15} className="mb-2 text-[#667085]" /><b>{formatValue("services", partner.professionServiceCategory || row.services)}</b><br />Specialization</div>
              <div className="rounded-lg border border-[#edf0f6] p-3"><MapPin size={15} className="mb-2 text-[#667085]" /><b>{asText(partner.city || row.city)}</b><br />Service Area</div>
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-1">
            <div className="rounded-lg border border-[#edf0f6] p-4">
              <h3 className="text-sm font-black">Verification Notes</h3>
              <p className="mt-3 rounded-lg bg-[#effbf4] p-3 text-xs font-bold text-[#079455]">All documents and profile photo are fetched from the live backend. Verified documents: {verifiedDocumentCount}.</p>
            </div>
            <div className="rounded-lg border border-[#edf0f6] p-4">
              <h3 className="text-sm font-black">Quick Actions</h3>
              <Link href={`/notifications?target=partner&partnerId=${encodeURIComponent(partnerId)}`} className="mt-3 flex w-full items-center justify-between rounded-lg border border-[#edf0f6] px-3 py-3 text-xs font-black hover:bg-[#f8fbff]"><span className="inline-flex items-center gap-2"><MessageSquare size={15} />Send Message</span><span>&gt;</span></Link>
              <Link href={`/partners/${encodeURIComponent(partnerId)}`} className="mt-2 flex w-full items-center justify-between rounded-lg border border-[#edf0f6] px-3 py-3 text-xs font-black hover:bg-[#f8fbff]"><span className="inline-flex items-center gap-2"><UserRound size={15} />View Partner Profile</span><span>&gt;</span></Link>
            </div>
          </section>
        </div>
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

export function StandalonePartnerProfile({ partnerId }: { partnerId: string }) {
  const [actionMessage, setActionMessage] = useState("");
  const [pendingAction, setPendingAction] = useState("");
  const queryClient = useQueryClient();
  const profileQuery = useQuery({
    queryKey: ["admin-partner-profile-shell", partnerId],
    queryFn: () => fetchPartnerProfile(partnerId),
    enabled: Boolean(partnerId),
  });
  const row = useMemo<ResourceRow>(() => {
    const partner = profileQuery.data?.partner || {};
    return {
      ...partner,
      id: partnerId,
      name: partner.fullName || partner.name || "Partner",
      services: partner.professionServiceCategory || partner.services,
      city: partner.city || partner.serviceArea,
      status: partner.verificationStatus || partner.accountStatus,
    };
  }, [partnerId, profileQuery.data]);
  const actionMutation = useMutation({
    mutationFn: ({ action, targetId }: { action: string; targetId: string }) => runAdminAction(action, targetId),
    onMutate: ({ action, targetId }) => {
      setPendingAction(`${targetId}:${action}`);
      setActionMessage("");
    },
    onSuccess: async (result, variables) => {
      setActionMessage(adminActionMessage(variables.action, result));
      await queryClient.invalidateQueries({ queryKey: ["admin-partner-profile", partnerId] });
      await queryClient.invalidateQueries({ queryKey: ["admin-partner-profile-shell", partnerId] });
      await queryClient.invalidateQueries({ queryKey: ["admin-resource", "partners"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-resource", "partner-approvals"] });
    },
    onError: (error) => {
      setActionMessage(error instanceof Error ? error.message : "Action failed");
    },
    onSettled: () => setPendingAction(""),
  });

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <Link href="/partners" className="text-xs font-black text-[#0b6df6]">&lt; Back to Partners</Link>
          <h1 className="mt-3 text-[28px] font-black text-[#111827]">Partner Verification</h1>
          <p className="mt-1 text-sm font-semibold text-[#667085]">Live partner profile, documents, actions and verification state.</p>
        </div>
        <button onClick={() => profileQuery.refetch()} className="flex h-10 items-center gap-2 rounded-lg border border-[#e6eaf2] bg-white px-4 text-sm font-black text-[#17233c]">
          <RefreshCw size={16} /> Refresh
        </button>
      </div>
      {profileQuery.isError && <div className="admin-card mb-5 border-[#ffd3dc] bg-[#fff7f9] p-4 text-sm font-bold text-[#d92d4b]">Partner profile unavailable from live backend.</div>}
      {actionMessage && (
        <div className={cn("admin-card mb-5 p-4 text-sm font-bold", actionMessage.includes("failed") || actionMessage.includes("unavailable") ? "border-[#ffd3dc] bg-[#fff7f9] text-[#d92d4b]" : "border-[#c7f0d8] bg-[#f3fff7] text-[#079455]")}>
          {actionMessage}
        </div>
      )}
      {profileQuery.isLoading ? (
        <div className="admin-card p-8 text-sm font-bold text-[#667085]">Loading complete partner profile...</div>
      ) : (
        <PartnerDetailPanel
          row={row}
          onAdminAction={(action, targetId) => actionMutation.mutate({ action, targetId })}
          pendingAction={pendingAction}
        />
      )}
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
    onSuccess: async (result, variables) => {
      setActionMessage(adminActionMessage(variables.action, result));
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

      {resource === "bookings" ? (
        <section className="mt-5">
          <BookingOperationsTable rows={rows} />
        </section>
      ) : (
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
      )}
    </div>
  );
}
