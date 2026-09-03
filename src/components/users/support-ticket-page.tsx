"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  FileText,
  Headphones,
  Mail,
  MapPin,
  MessageCircle,
  Paperclip,
  Phone,
  RefreshCw,
  Save,
  Send,
  ShieldAlert,
  Ticket,
  Upload,
  User,
  UserPlus,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Attachment = {
  id?: string;
  name?: string;
  url: string;
  mimeType?: string;
  sizeBytes?: number;
};

type TicketMessage = {
  id: string;
  senderRole: string;
  senderName: string;
  message: string;
  attachments: Attachment[];
  createdAt: string;
};

type TicketTimeline = {
  event: string;
  by: string;
  note: string;
  at: string;
};

type SupportTicket = {
  id: string;
  ticketId: string;
  userId: string;
  partnerId?: string;
  partnerName?: string;
  bookingId: string;
  bookingCode: string;
  userName: string;
  mobileNumber: string;
  email: string;
  ticketCategory: string;
  priority: string;
  status: string;
  source: string;
  createdDateTime: string;
  lastUpdated: string;
  complaint: string;
  aiSummary: string;
  conversationHistory: TicketMessage[];
  ticketTimeline: TicketTimeline[];
  adminReplies: TicketMessage[];
  resolutionNotes: string;
  internalNotes: { id: string; note: string; addedBy: string; addedAt: string }[];
  attachments: Attachment[];
  assignedTo: string;
  escalatedTo: string;
  serviceCategory?: string;
  serviceName?: string;
  area?: string;
  customerAddress?: string;
  assignedPartnerName?: string;
};

async function fetchTicket(ticketId: string): Promise<{ ticket: SupportTicket | null }> {
  const res = await fetch(`/api/admin/support-tickets/${encodeURIComponent(ticketId)}`, { cache: "no-store" });
  if (!res.ok) return { ticket: null };
  return res.json();
}

function formatDateTime(value: string) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function normalizeLabel(value: string) {
  return (value || "not recorded").replace(/_/g, " ");
}

function statusTone(value: string) {
  const text = value.toLowerCase();
  if (text.includes("resolved") || text.includes("closed") || text.includes("low")) return "bg-[#e8f8ef] text-[#079455] border-[#b7ebcd]";
  if (text.includes("high") || text.includes("urgent") || text.includes("critical") || text.includes("open")) return "bg-[#ffebef] text-[#d92d4b] border-[#ffd1dc]";
  if (text.includes("medium") || text.includes("progress") || text.includes("assigned")) return "bg-[#fff4df] text-[#b54708] border-[#ffe0a3]";
  return "bg-[#eef5ff] text-[#0b6df6] border-[#bfd5ff]";
}

function Badge({ value }: { value: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-3 py-1 text-xs font-black capitalize", statusTone(value))}>
      {normalizeLabel(value)}
    </span>
  );
}

function Card({ title, icon: Icon, children, action }: { title: string; icon: typeof Ticket; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="admin-card overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-[#edf0f6] px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#eef5ff] text-[#0b6df6]">
            <Icon size={18} />
          </div>
          <h2 className="text-base font-black text-[#111827]">{title}</h2>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function InfoCell({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon?: typeof User }) {
  return (
    <div className="min-h-[92px] border-b border-r border-[#edf0f6] p-4 last:border-r-0">
      <p className="text-xs font-bold text-[#667085]">{label}</p>
      <div className="mt-2 flex items-start gap-2 text-sm font-black text-[#111827]">
        {Icon ? <Icon className="mt-0.5 shrink-0 text-[#667085]" size={16} /> : null}
        <span className="break-words">{value || "Not recorded"}</span>
      </div>
    </div>
  );
}

function AttachmentList({ attachments }: { attachments: Attachment[] }) {
  if (!attachments.length) return <p className="text-sm font-semibold text-[#667085]">No attachments uploaded.</p>;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {attachments.map((attachment, index) => (
        <a key={`${attachment.url}-${index}`} href={attachment.url} target="_blank" rel="noreferrer" className="rounded-lg border border-[#edf0f6] bg-[#fbfcff] p-3 hover:bg-[#f4f8ff]">
          {attachment.mimeType?.startsWith("image/") ? (
            <img src={attachment.url} alt={attachment.name || "Attachment"} className="mb-3 h-28 w-full rounded-lg object-cover" />
          ) : (
            <div className="mb-3 grid h-20 place-items-center rounded-lg bg-white text-[#0b6df6]">
              <Paperclip size={24} />
            </div>
          )}
          <p className="truncate text-sm font-black text-[#111827]">{attachment.name || `Attachment ${index + 1}`}</p>
          <p className="mt-1 text-xs font-semibold text-[#667085]">{attachment.mimeType || "file"}</p>
        </a>
      ))}
    </div>
  );
}

function ConversationItem({ message }: { message: TicketMessage }) {
  const role = normalizeLabel(message.senderRole);
  const isAdmin = message.senderRole === "admin" || message.senderRole === "support";
  return (
    <div className="flex gap-3 rounded-lg border border-[#edf0f6] bg-[#fbfcff] p-4">
      <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-full text-xs font-black", isAdmin ? "bg-[#eaf2ff] text-[#0b6df6]" : "bg-[#e8f8ef] text-[#079455]")}>
        {role.slice(0, 2).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-black text-[#111827]">{message.senderName || role}</p>
            <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-black capitalize text-[#0b6df6]">{role}</span>
          </div>
          <p className="text-xs font-semibold text-[#667085]">{formatDateTime(message.createdAt)}</p>
        </div>
        <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-[#344054]">{message.message || "-"}</p>
        {message.attachments.length ? <div className="mt-3"><AttachmentList attachments={message.attachments} /></div> : null}
      </div>
    </div>
  );
}

export function SupportTicketPage({ ticketId }: { ticketId: string }) {
  const queryClient = useQueryClient();
  const { data = { ticket: null }, isFetching } = useQuery({
    queryKey: ["support-ticket", ticketId],
    queryFn: () => fetchTicket(ticketId),
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
  });
  const ticket = data.ticket;
  const [assignedTo, setAssignedTo] = useState("");
  const [status, setStatus] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [adminReply, setAdminReply] = useState("");
  const [escalatedTo, setEscalatedTo] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function runAction(payload: Record<string, string>) {
    if (isSaving) return;
    if (Object.prototype.hasOwnProperty.call(payload, "adminReply") && !payload.adminReply.trim()) {
      setFeedback("Reply message cannot be empty.");
      return;
    }
    setIsSaving(true);
    setFeedback("");
    try {
      const response = await fetch(`/api/admin/support-tickets/${encodeURIComponent(ticketId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({})) as { message?: string };
        throw new Error(errorBody.message || "Action failed on live backend.");
      }
      if (payload.internalNote) setInternalNote("");
      if (payload.adminReply) setAdminReply("");
      setFeedback(payload.adminReply ? "Reply sent to the user." : "Saved on live backend.");
      await queryClient.invalidateQueries({ queryKey: ["support-ticket", ticketId] });
      await queryClient.invalidateQueries({ queryKey: ["users-control-center"] });
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Action failed. Live backend unavailable.");
    } finally {
      setIsSaving(false);
    }
  }

  const allMessages = useMemo(() => {
    if (!ticket) return [];
    const merged = [...ticket.conversationHistory, ...ticket.adminReplies];
    const seen = new Set<string>();
    return merged
      .filter((message) => {
        const key = `${message.createdAt}-${message.senderRole}-${message.message}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());
  }, [ticket]);

  if (!ticket) {
    return (
      <div className="admin-card p-10 text-center font-bold text-[#667085]">
        Support ticket was not returned by the live backend.
      </div>
    );
  }

  const currentAssignedTo = assignedTo || ticket.assignedTo;
  const currentStatus = status || ticket.status;
  const currentResolutionNotes = resolutionNotes || ticket.resolutionNotes;
  const service = ticket.serviceName || ticket.serviceCategory || "Not recorded";
  const area = ticket.area || "Not recorded";
  const assignedName = ticket.assignedTo || ticket.assignedPartnerName || "Unassigned";

  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-black text-[#667085]">
            <Link href="/users/support" className="text-[#0b6df6]">Support & Complaints</Link>
            <span>&gt;</span>
            <span>Ticket Details</span>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <h1 className="text-[28px] font-black text-[#111827]">{ticket.ticketId}</h1>
            <Badge value={ticket.status} />
          </div>
          <p className="mt-2 text-sm font-semibold text-[#667085]">
            {normalizeLabel(ticket.ticketCategory)} • Created on {formatDateTime(ticket.createdDateTime)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-5">
          <div className="flex items-center gap-2 text-xs font-black text-[#475467]">
            <span>Priority</span>
            <Badge value={ticket.priority} />
          </div>
          <div className="flex items-center gap-2 text-xs font-black text-[#475467]">
            <span>Category</span>
            <Badge value={ticket.ticketCategory} />
          </div>
          <span className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#e6eaf2] bg-white px-4 text-sm font-black text-[#111827]">
            <Headphones size={16} />
            {isFetching ? "Refreshing" : "Live backend ticket"}
          </span>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_460px]">
        <div className="space-y-5">
          <Card title="Ticket Overview" icon={Ticket}>
            <div className="overflow-hidden rounded-lg border border-[#edf0f6]">
              <div className="grid md:grid-cols-4">
                <InfoCell label="User Name" value={ticket.userName} icon={User} />
                <InfoCell label="Mobile Number" value={ticket.mobileNumber || "Not recorded"} icon={Phone} />
                <InfoCell label="Email" value={ticket.email || "Not available"} icon={Mail} />
                <InfoCell label="Booking Code" value={ticket.bookingCode || ticket.bookingId || "Not linked"} icon={Ticket} />
              </div>
              <div className="grid md:grid-cols-4">
                <InfoCell label="Ticket Category" value={normalizeLabel(ticket.ticketCategory)} icon={ShieldAlert} />
                <InfoCell label="Service" value={service} icon={Wrench} />
                <InfoCell label="Area" value={area} icon={MapPin} />
                <InfoCell label="Assigned To" value={assignedName} icon={UserPlus} />
              </div>
              <div className="grid md:grid-cols-4">
                <InfoCell label="Created Date & Time" value={formatDateTime(ticket.createdDateTime)} icon={CalendarClock} />
                <InfoCell label="Last Updated" value={formatDateTime(ticket.lastUpdated)} icon={RefreshCw} />
                <InfoCell label="Source" value={normalizeLabel(ticket.source)} icon={Briefcase} />
                <InfoCell label="Status" value={<Badge value={ticket.status} />} />
              </div>
            </div>
          </Card>

          <Card title="Customer Complaint" icon={MessageCircle}>
            <p className="whitespace-pre-wrap rounded-lg bg-[#fbfcff] p-4 text-sm font-semibold leading-6 text-[#344054]">
              {ticket.complaint || "No complaint body recorded."}
            </p>
            {ticket.aiSummary ? (
              <div className="mt-4 rounded-lg border border-[#e6eaf2] bg-white p-4">
                <p className="text-xs font-black uppercase text-[#667085]">AI Generated Summary</p>
                <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-[#344054]">{ticket.aiSummary}</p>
              </div>
            ) : null}
          </Card>

          <Card title="Conversation History" icon={MessageCircle}>
            <div className="space-y-3">
              {allMessages.length === 0 ? (
                <p className="text-sm font-semibold text-[#667085]">No conversation history.</p>
              ) : allMessages.map((message) => <ConversationItem key={`${message.id}-${message.createdAt}-${message.senderRole}`} message={message} />)}
            </div>
          </Card>

          <Card
            title={`Attached Files (${ticket.attachments.length})`}
            icon={Paperclip}
            action={
              <button className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#bfd5ff] bg-white px-3 text-xs font-black text-[#0b6df6]">
                <Upload size={15} />
                Upload File
              </button>
            }
          >
            <AttachmentList attachments={ticket.attachments} />
          </Card>
        </div>

        <div className="space-y-5">
          <Card title="Admin Actions" icon={ShieldAlert}>
            <div className="space-y-4">
              <label className="block">
                <span className="text-xs font-black text-[#475467]">Assign Ticket To</span>
                <div className="mt-2 flex gap-2">
                  <select value={currentAssignedTo} onChange={(event) => setAssignedTo(event.target.value)} className="h-11 min-w-0 flex-1 rounded-lg border border-[#d9e1ee] bg-white px-3 text-sm font-bold outline-none focus:border-[#0b6df6]">
                    <option value="">Select support agent</option>
                    <option value="admin-dashboard@apnaservo.internal">Admin Support</option>
                    <option value="senior_support">Senior Support</option>
                    <option value="field_operations">Field Operations</option>
                    <option value="partner_operations">Partner Operations</option>
                  </select>
                  <button onClick={() => runAction({ assignedTo: currentAssignedTo })} className="grid h-11 w-11 place-items-center rounded-lg border border-[#d9e1ee] bg-white text-[#0b6df6]" aria-label="Assign ticket">
                    <UserPlus size={17} />
                  </button>
                </div>
              </label>

              <label className="block">
                <span className="text-xs font-black text-[#475467]">Change Status</span>
                <select value={currentStatus} onChange={(event) => setStatus(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-[#d9e1ee] bg-white px-3 text-sm font-bold outline-none focus:border-[#0b6df6]">
                  <option value="open">Open</option>
                  <option value="assigned">Assigned</option>
                  <option value="in_progress">In progress</option>
                  <option value="waiting_on_customer">Waiting on customer</option>
                  <option value="resolved">Resolved</option>
                  <option value="reopened">Reopened</option>
                  <option value="escalated">Escalated</option>
                  <option value="closed">Closed</option>
                </select>
              </label>

              <div>
                <span className="text-xs font-black text-[#475467]">Priority Level</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {[
                    ["low", "Low"],
                    ["medium", "Medium"],
                    ["high", "High"],
                    ["urgent", "Critical"],
                  ].map(([value, label]) => (
                    <button key={value} onClick={() => runAction({ priority: value })} className={cn("h-9 rounded-lg border px-4 text-xs font-black", ticket.priority === value ? statusTone(value) : "border-[#ffd1dc] bg-white text-[#d92d4b]")}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <label className="block">
                <span className="text-xs font-black text-[#475467]">Internal Note <span className="font-semibold text-[#98a2b3]">(visible only to admin)</span></span>
                <textarea value={internalNote} onChange={(event) => setInternalNote(event.target.value)} className="mt-2 min-h-24 w-full rounded-lg border border-[#d9e1ee] bg-white p-3 text-sm outline-none focus:border-[#0b6df6]" placeholder="Add internal note..." />
                <button onClick={() => runAction({ internalNote })} className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#d9e1ee] bg-white text-sm font-black text-[#0b6df6]">
                  <Save size={15} />
                  Save Internal Note
                </button>
              </label>

              <label className="block">
                <span className="text-xs font-black text-[#475467]">Resolution Notes <span className="font-semibold text-[#98a2b3]">(visible to user)</span></span>
                <textarea value={currentResolutionNotes} onChange={(event) => setResolutionNotes(event.target.value)} className="mt-2 min-h-24 w-full rounded-lg border border-[#d9e1ee] bg-white p-3 text-sm outline-none focus:border-[#0b6df6]" placeholder="Write resolution or next steps..." />
                <button onClick={() => runAction({ resolutionNotes: currentResolutionNotes })} className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#d9e1ee] bg-white text-sm font-black text-[#0b6df6]">
                  <Save size={15} />
                  Save Resolution Note
                </button>
              </label>

              <div className="space-y-3 pt-1">
                <button onClick={() => runAction({ action: "mark_resolved", resolutionNotes: currentResolutionNotes })} className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#079455] text-sm font-black text-white">
                  <CheckCircle2 size={16} />
                  Mark as Resolved
                </button>
                <button onClick={() => runAction({ action: "reopen", internalNote })} className="flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-[#ff99aa] bg-white text-sm font-black text-[#d92d4b]">
                  <RefreshCw size={16} />
                  Reopen Ticket
                </button>
              </div>
              {feedback ? <p className="rounded-lg bg-[#eef5ff] px-3 py-2 text-sm font-bold text-[#0b6df6]">{feedback}</p> : null}
            </div>
          </Card>

          <Card title="Quick Actions" icon={Bell}>
            <div className="grid gap-3 sm:grid-cols-2">
              <button disabled={!ticket.assignedTo} onClick={() => runAction({ adminReply: adminReply || "Support team is reviewing your issue and will update you shortly." })} className="flex h-11 items-center justify-center gap-2 rounded-lg border border-[#e6eaf2] bg-white text-sm font-black text-[#344054] disabled:cursor-not-allowed disabled:opacity-50">
                <MessageCircle size={16} className="text-[#0b6df6]" />
                Send Message
              </button>
              <a href={ticket.mobileNumber ? `tel:${ticket.mobileNumber}` : undefined} className="flex h-11 items-center justify-center gap-2 rounded-lg border border-[#e6eaf2] bg-white text-sm font-black text-[#344054]">
                <Phone size={16} className="text-[#079455]" />
                Call User
              </a>
              <Link href={ticket.bookingId ? `/bookings/${encodeURIComponent(ticket.bookingId)}` : "/bookings"} className="flex h-11 items-center justify-center gap-2 rounded-lg border border-[#e6eaf2] bg-white text-sm font-black text-[#344054]">
                <Ticket size={16} className="text-[#7a5af8]" />
                View Booking
              </Link>
              <button onClick={() => runAction({ action: "escalate", escalatedTo: escalatedTo || "senior_support", internalNote })} className="flex h-11 items-center justify-center gap-2 rounded-lg border border-[#ffd1dc] bg-white text-sm font-black text-[#d92d4b]">
                <AlertTriangle size={16} />
                Escalate Issue
              </button>
            </div>

            <div className="mt-4">
              <textarea value={adminReply} onChange={(event) => setAdminReply(event.target.value)} className="min-h-24 w-full rounded-lg border border-[#d9e1ee] bg-white p-3 text-sm outline-none focus:border-[#0b6df6]" placeholder={ticket.assignedTo ? `Reply as ${ticket.assignedTo}...` : "Assign a support agent before replying..."} />
              <button disabled={isSaving || !adminReply.trim() || !ticket.assignedTo} onClick={() => runAction({ adminReply: adminReply.trim() })} className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#0b6df6] text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50">
                <Send size={15} />
                {isSaving ? "Sending..." : ticket.assignedTo ? `Reply as ${ticket.assignedTo}` : "Assign Agent First"}
              </button>
            </div>
          </Card>

          <Card title="Ticket Timeline" icon={FileText}>
            <div className="space-y-3">
              {ticket.ticketTimeline.length === 0 ? (
                <p className="text-sm font-semibold text-[#667085]">No timeline events.</p>
              ) : ticket.ticketTimeline.map((entry, index) => (
                <div key={`${entry.event}-${entry.at}-${index}`} className="relative border-l-2 border-[#e6eaf2] pb-4 pl-4 last:pb-0">
                  <span className="absolute -left-[7px] top-1 h-3 w-3 rounded-full bg-[#0b6df6]" />
                  <div className="flex flex-wrap justify-between gap-2">
                    <p className="text-sm font-black capitalize text-[#111827]">{normalizeLabel(entry.event)}</p>
                    <p className="text-xs font-semibold text-[#667085]">{formatDateTime(entry.at)}</p>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-[#667085]">{entry.note || entry.by}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
