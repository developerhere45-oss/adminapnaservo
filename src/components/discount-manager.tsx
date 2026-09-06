"use client";

import { useCallback, useEffect, useState } from "react";
import { BadgePercent, Plus, RefreshCw, Trash2 } from "lucide-react";

type Rule = { id: string; name: string; serviceCategory: string; audience: "all" | "new_users" | "individual"; targetUserId: string; discountType: "fixed" | "percent"; value: number; maxDiscount: number; minimumAmount: number; active: boolean; startsAt: string; endsAt: string };
const blank = { name: "New User Offer", serviceCategory: "all", audience: "new_users", targetUserId: "", discountType: "fixed", value: 100, maxDiscount: 0, minimumAmount: 0, active: true, startsAt: "", endsAt: "" };
const services = ["all", "ac", "plumbing", "electrician", "carpenter", "painting", "cleaning", "laundry", "interior", "roadside", "appliances", "pest", "ro"];

export function DiscountManager() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [form, setForm] = useState(blank);
  const [bookingId, setBookingId] = useState("");
  const [bookingAmount, setBookingAmount] = useState("");
  const [bookingReason, setBookingReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const load = useCallback(async () => { const response = await fetch("/api/admin/discounts", { cache: "no-store" }); const data = await response.json(); if (!response.ok) throw new Error(data.message || "Unable to load discounts"); setRules(data.rules || []); }, []);
  useEffect(() => { load().catch((error) => setMessage(error.message)); }, [load]);
  async function createRule(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try { const response = await fetch("/api/admin/discounts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }); const data = await response.json(); if (!response.ok) throw new Error(data.message || "Unable to save"); setForm(blank); await load(); setMessage("Discount rule saved. New eligible invoices will use it automatically."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Unable to save"); } finally { setBusy(false); }
  }
  async function change(rule: Rule, patch: Partial<Rule>) { setBusy(true); setMessage(""); try { const response = await fetch(`/api/admin/discounts/${rule.id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) }); const data = await response.json(); if (!response.ok) throw new Error(data.message || "Update failed"); await load(); setMessage(data.rule?.active ? "Discount offer is active." : "Discount offer has been paused."); } catch (error) { setMessage(error instanceof Error ? error.message : "Update failed"); } finally { setBusy(false); } }
  async function remove(rule: Rule) { if (!window.confirm(`Delete ${rule.name}? Existing invoices will keep their applied discount.`)) return; setBusy(true); setMessage(""); try { const response = await fetch(`/api/admin/discounts/${rule.id}`, { method: "DELETE" }); const data = await response.json(); if (!response.ok) throw new Error(data.message || "Delete failed"); setRules(current => current.filter(item => item.id !== rule.id)); setMessage("Discount offer deleted."); } catch (error) { setMessage(error instanceof Error ? error.message : "Delete failed"); } finally { setBusy(false); } }
  async function applyBookingDiscount(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try { const response = await fetch("/api/admin/discounts/booking", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bookingId, amount: Number(bookingAmount), reason: bookingReason }) }); const data = await response.json(); if (!response.ok) throw new Error(data.message || "Unable to apply booking discount"); setBookingId(""); setBookingAmount(""); setBookingReason(""); setMessage(data.appliedNow ? "Booking discount applied. The pending payable amount has been updated." : "Booking discount saved. It will apply when the partner sends the quote."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Unable to apply booking discount"); } finally { setBusy(false); }
  }
  const field = "h-11 rounded-xl border border-[#dfe5ef] bg-white px-3 text-sm font-semibold outline-none focus:border-[#0b6df6]";
  return <main className="space-y-6 p-5 md:p-8">
    <div className="flex items-center justify-between"><div><h1 className="flex items-center gap-2 text-2xl font-black text-[#111827]"><BadgePercent className="text-[#0b6df6]" /> Discounts</h1><p className="mt-1 text-sm font-semibold text-[#667085]">Server-controlled offers apply without releasing a new customer app.</p></div><button onClick={() => load().catch(e => setMessage(e.message))} className="rounded-xl border p-3"><RefreshCw size={18} /></button></div>
    <form onSubmit={createRule} className="grid gap-3 rounded-2xl border border-[#e6eaf0] bg-white p-5 shadow-sm md:grid-cols-4">
      <input className={field} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Offer name" required />
      <select className={field} value={form.serviceCategory} onChange={e => setForm({ ...form, serviceCategory: e.target.value })}>{services.map(item => <option key={item} value={item}>{item === "all" ? "All services" : item}</option>)}</select>
      <select className={field} value={form.audience} onChange={e => setForm({ ...form, audience: e.target.value, targetUserId: "" })}><option value="new_users">New users only</option><option value="all">All users</option><option value="individual">Individual user</option></select>
      {form.audience === "individual" && <label className="flex flex-col gap-1 text-sm font-semibold md:col-span-2">User ID<input className={field} value={form.targetUserId} onChange={e => setForm({ ...form, targetUserId: e.target.value })} placeholder="Copy User ID from Users" maxLength={100} required /><span className="text-xs text-[#667085]">This offer applies only to this user. <a href="/users" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Open Users</a></span></label>}
      <select className={field} value={form.discountType} onChange={e => setForm({ ...form, discountType: e.target.value as "fixed" | "percent" })}><option value="fixed">Fixed ₹</option><option value="percent">Percentage %</option></select>
      <input className={field} type="number" min="1" max={form.discountType === "percent" ? 100 : undefined} value={form.value} onChange={e => setForm({ ...form, value: Number(e.target.value) })} placeholder="Discount" required />
      <input className={field} type="number" min="0" value={form.minimumAmount} onChange={e => setForm({ ...form, minimumAmount: Number(e.target.value) })} placeholder="Minimum bill ₹" />
      <input className={field} type="datetime-local" value={form.endsAt} onChange={e => setForm({ ...form, endsAt: e.target.value })} />
      <button disabled={busy} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#0b6df6] font-black text-white disabled:opacity-60"><Plus size={17} /> Create Offer</button>
    </form>
    <form onSubmit={applyBookingDiscount} className="grid gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm md:grid-cols-4">
      <div className="md:col-span-4"><h2 className="text-base font-black text-[#111827]">Existing booking discount</h2><p className="mt-1 text-sm font-semibold text-[#667085]">Apply any one-time ₹ discount to a booked job. Pending quotes update immediately; paid or completed jobs need a refund or credit note.</p></div>
      <input className={field} value={bookingId} onChange={e => setBookingId(e.target.value)} placeholder="Booking ID" maxLength={100} required />
      <input className={field} type="number" min="1" value={bookingAmount} onChange={e => setBookingAmount(e.target.value)} placeholder="Discount ₹" required />
      <input className={field} value={bookingReason} onChange={e => setBookingReason(e.target.value)} placeholder="Reason (optional)" maxLength={300} />
      <button disabled={busy} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-amber-600 font-black text-white disabled:opacity-60"><BadgePercent size={17} /> Apply to Booking</button>
    </form>
    {message && <p className="rounded-xl bg-[#eef5ff] p-3 text-sm font-bold text-[#1849a9]">{message}</p>}
    <div className="overflow-x-auto rounded-2xl border border-[#e6eaf0] bg-white"><table className="w-full text-left text-sm"><thead className="bg-[#f8fafc] text-[#667085]"><tr>{["Offer", "Service", "Audience", "Discount", "Minimum", "Status", ""].map(h => <th key={h} className="px-4 py-3 font-black">{h}</th>)}</tr></thead><tbody>{rules.map(rule => <tr key={rule.id} className="border-t"><td className="px-4 py-4 font-black">{rule.name}</td><td className="px-4 py-4">{rule.serviceCategory}</td><td className="px-4 py-4">{rule.audience === "individual" ? `User: ${rule.targetUserId}` : rule.audience === "new_users" ? "New users" : "All users"}</td><td className="px-4 py-4 font-black">{rule.discountType === "fixed" ? `₹${rule.value}` : `${rule.value}%`}</td><td className="px-4 py-4">₹{rule.minimumAmount}</td><td className="px-4 py-4"><button disabled={busy} onClick={() => change(rule, { active: !rule.active })} className={`rounded-full px-3 py-1 text-xs font-black ${rule.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>{rule.active ? "Active" : "Paused"}</button></td><td className="px-4 py-4"><button onClick={() => remove(rule)} className="text-red-600" aria-label="Delete"><Trash2 size={17} /></button></td></tr>)}</tbody></table></div>
  </main>;
}
