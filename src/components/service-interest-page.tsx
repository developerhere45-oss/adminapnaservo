"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, MousePointerClick, Search, Smartphone, Users } from "lucide-react";
import { liveQueryDefaults, visibleRefetchInterval } from "@/lib/live-query";

type ServiceRow = {
  serviceId: string;
  serviceName: string;
  serviceCategory: string;
  totalClicks: number;
  uniqueUsers: number;
  iosClicks: number;
  androidClicks: number;
  lastClickedAt: string;
};
type RecentClick = {
  id: string;
  userId: string;
  userName: string;
  serviceId: string;
  serviceName: string;
  serviceCategory: string;
  platform: string;
  screen: string;
  clickedAt: string;
};
type InterestData = { days: number; totalClicks: number; services: ServiceRow[]; recentClicks: RecentClick[] };

function time(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function ServiceInterestPage() {
  const [days, setDays] = useState("30");
  const [platform, setPlatform] = useState("all");
  const [search, setSearch] = useState("");
  const query = useQuery({
    ...liveQueryDefaults,
    queryKey: ["service-interest", days, platform, search],
    queryFn: async (): Promise<InterestData> => {
      const params = new URLSearchParams({ days, platform });
      if (search.trim()) params.set("service", search.trim());
      const response = await fetch(`/api/admin/service-interest?${params}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Service interest data unavailable");
      return response.json();
    },
    refetchInterval: visibleRefetchInterval(20_000),
  });
  const data = query.data;
  const totalUsers = (data?.services || []).reduce((sum, row) => sum + row.uniqueUsers, 0);

  return <main className="mx-auto max-w-7xl space-y-6 p-5 md:p-7">
    <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#fff0f4] text-[#f32368]"><BarChart3 size={21} /></div><h1 className="text-3xl font-black text-[#111827]">Service Interest</h1></div>
        <p className="mt-2 text-sm font-medium text-[#667085]">Every customer service click, including Preparing and High Demand services, before a booking is made.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <select value={days} onChange={(event) => setDays(event.target.value)} className="h-10 rounded-lg border border-[#dfe6f2] bg-white px-3 text-sm font-bold"><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option></select>
        <select value={platform} onChange={(event) => setPlatform(event.target.value)} className="h-10 rounded-lg border border-[#dfe6f2] bg-white px-3 text-sm font-bold"><option value="all">Android + iOS</option><option value="android">Android</option><option value="ios">iOS</option></select>
      </div>
    </header>

    <label className="relative block max-w-xl"><Search size={18} className="absolute left-3 top-3 text-[#98a2b3]" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search service, category or service ID" className="h-11 w-full rounded-xl border border-[#dfe6f2] bg-white pl-10 pr-3 text-sm font-semibold outline-none focus:border-[#f32368]" /></label>

    <section className="grid gap-4 sm:grid-cols-3">
      <Metric icon={MousePointerClick} label="Total service clicks" value={data?.totalClicks || 0} />
      <Metric icon={Users} label="Unique customer-service visits" value={totalUsers} />
      <Metric icon={Smartphone} label="Services clicked" value={data?.services.length || 0} />
    </section>

    {query.isError ? <div className="rounded-xl border border-[#ffd3dc] bg-[#fff7f9] p-4 text-sm font-bold text-[#c01048]">Live service click analytics is unavailable. Check the backend deployment.</div> : <>
      <section className="admin-card overflow-hidden">
        <div className="border-b border-[#edf0f6] px-5 py-4"><h2 className="text-lg font-black text-[#111827]">Most clicked services</h2><p className="mt-1 text-sm font-semibold text-[#667085]">Counts are real customer click events, not booking attempts.</p></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left"><thead className="bg-[#f8fafc] text-xs uppercase tracking-wide text-[#667085]"><tr><th className="px-5 py-3">Service</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Clicks</th><th className="px-4 py-3">Unique users</th><th className="px-4 py-3">Android</th><th className="px-4 py-3">iOS</th><th className="px-4 py-3">Last click</th></tr></thead><tbody className="divide-y divide-[#edf0f6]">{(data?.services || []).map((row) => <tr key={`${row.serviceId}-${row.serviceName}`}><td className="px-5 py-4 font-black text-[#111827]">{row.serviceName || row.serviceId || "Unknown service"}</td><td className="px-4 py-4 text-sm font-semibold text-[#475467]">{row.serviceCategory || "—"}</td><td className="px-4 py-4 text-lg font-black text-[#f32368]">{row.totalClicks}</td><td className="px-4 py-4 text-sm font-bold">{row.uniqueUsers}</td><td className="px-4 py-4 text-sm font-bold">{row.androidClicks}</td><td className="px-4 py-4 text-sm font-bold">{row.iosClicks}</td><td className="px-4 py-4 text-sm font-semibold text-[#475467]">{time(row.lastClickedAt)}</td></tr>)}{!query.isLoading && !(data?.services.length) && <tr><td colSpan={7} className="px-5 py-10 text-center text-sm font-bold text-[#667085]">No service-click events in this period yet.</td></tr>}</tbody></table></div>
      </section>
      <section className="admin-card overflow-hidden"><div className="border-b border-[#edf0f6] px-5 py-4"><h2 className="text-lg font-black text-[#111827]">Recent customer service clicks</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[780px] text-left"><thead className="bg-[#f8fafc] text-xs uppercase tracking-wide text-[#667085]"><tr><th className="px-5 py-3">Customer</th><th className="px-4 py-3">Service</th><th className="px-4 py-3">Platform</th><th className="px-4 py-3">Screen</th><th className="px-4 py-3">Clicked at</th></tr></thead><tbody className="divide-y divide-[#edf0f6]">{(data?.recentClicks || []).map((click) => <tr key={click.id}><td className="px-5 py-4 font-black text-[#111827]">{click.userName || "Customer"}</td><td className="px-4 py-4"><p className="font-bold">{click.serviceName || click.serviceId}</p><p className="text-xs font-semibold text-[#667085]">{click.serviceCategory}</p></td><td className="px-4 py-4 capitalize text-sm font-bold">{click.platform}</td><td className="px-4 py-4 text-sm font-semibold text-[#475467]">{click.screen || "—"}</td><td className="px-4 py-4 text-sm font-semibold text-[#475467]">{time(click.clickedAt)}</td></tr>)}</tbody></table></div></section>
    </>}
  </main>;
}

function Metric({ icon: Icon, label, value }: { icon: typeof BarChart3; label: string; value: number }) {
  return <div className="admin-card p-5"><div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-[#667085]"><Icon size={16} className="text-[#f32368]" />{label}</div><p className="mt-3 text-3xl font-black text-[#111827]">{value.toLocaleString("en-IN")}</p></div>;
}
