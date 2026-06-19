"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  CalendarCheck,
  CheckCircle2,
  Clock3,
  Download,
  Hourglass,
  IndianRupee,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { dashboardData } from "@/lib/mock-data";
import { cn, compactNumber, formatCurrency, statusTone } from "@/lib/utils";

const iconMap = {
  users: UsersRound,
  partners: UserRoundCheck,
  calendar: CalendarCheck,
  check: CheckCircle2,
  rupee: IndianRupee,
  hourglass: Hourglass,
};

type Overview = typeof dashboardData;
const demoDataEnabled = process.env.NEXT_PUBLIC_ENABLE_DEMO_DATA === "true";

const emptyOverview: Overview = {
  ...dashboardData,
  stats: dashboardData.stats.map((item) => ({ ...item, value: 0, delta: "0%", hint: "live data unavailable" })),
  bookingTrend: [],
  categories: [],
  recentActivity: [],
  recentBookings: [],
  pendingVerifications: [],
};

async function fetchOverview(): Promise<Overview> {
  const res = await fetch("/api/admin/overview");
  if (!res.ok) return demoDataEnabled ? dashboardData : emptyOverview;
  return res.json();
}

function StatCard({ item, index }: { item: Overview["stats"][number]; index: number }) {
  const Icon = iconMap[item.icon as keyof typeof iconMap] || UsersRound;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="glass-card rounded-[24px] p-6"
    >
      <div className="flex items-start gap-4">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#fff0f4] text-[#f32368]">
          <Icon size={24} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#6f646b]">{item.label}</p>
          <p className="mt-2 text-3xl font-black tracking-[-0.04em] text-[#1d1419]">
            {item.currency ? formatCurrency(item.value) : compactNumber(item.value)}
          </p>
          <p className="mt-3 text-sm text-[#7b7076]">
            <span className={cn("font-bold text-emerald-600", item.negative && "text-[#e43367]")}>{item.delta}</span>{" "}
            {item.hint}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone = statusTone(status);
  return (
    <span
      className={cn(
        "inline-flex rounded-xl px-3 py-1 text-xs font-bold",
        tone === "success" && "bg-emerald-50 text-emerald-700",
        tone === "danger" && "bg-rose-50 text-rose-700",
        tone === "info" && "bg-sky-50 text-sky-700",
        tone === "warning" && "bg-amber-50 text-amber-700",
      )}
    >
      {status}
    </span>
  );
}

export function DashboardClient() {
  const initialData = demoDataEnabled ? dashboardData : emptyOverview;
  const { data = initialData } = useQuery({ queryKey: ["overview"], queryFn: fetchOverview, initialData });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="space-y-7">
      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-3xl font-black tracking-[-0.04em] text-[#1d1419] sm:text-4xl">Welcome back, Admin!</h1>
          <p className="mt-2 text-[#756a70]">Here&apos;s what&apos;s happening with ApnaServo today.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="flex h-13 items-center gap-3 rounded-2xl border border-[#ecd3dc] bg-white px-5 text-sm font-bold text-[#2a1420] shadow-sm">
            <CalendarCheck size={18} />
            Today, 20 May 2025
          </button>
          <button className="flex h-13 items-center gap-3 rounded-2xl bg-gradient-to-r from-[#f32368] to-[#ff477b] px-6 text-sm font-bold text-white shadow-[0_16px_35px_rgba(249,43,116,.24)]">
            <Download size={18} />
            Export Report
          </button>
        </div>
      </section>

      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {data.stats.map((item, index) => (
          <StatCard key={item.label} item={item} index={index} />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.35fr_.85fr_.85fr]">
        <div className="glass-card rounded-[28px] p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-black">Bookings Overview</h2>
            <select className="rounded-xl border border-[#ecd3dc] bg-white px-3 py-2 text-sm font-semibold outline-none">
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
            </select>
          </div>
          <div className="h-[300px]">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.bookingTrend}>
                  <defs>
                    <linearGradient id="pinkArea" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#f32368" stopOpacity={0.34} />
                      <stop offset="100%" stopColor="#f32368" stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: "#8c7a82", fontSize: 12 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: "#8c7a82", fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: 18, border: "1px solid #f4dce4", boxShadow: "0 18px 45px rgba(82,19,42,.12)" }} />
                  <Area type="monotone" dataKey="bookings" stroke="#f32368" strokeWidth={3} fill="url(#pinkArea)" dot={{ r: 4, fill: "#f32368" }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full rounded-3xl bg-[#fff6f8]" />
            )}
          </div>
        </div>

        <div className="glass-card rounded-[28px] p-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-black">Bookings by Service Category</h2>
            <button className="text-sm font-bold text-[#f32368]">View All</button>
          </div>
          <div className="grid gap-4 md:grid-cols-[1fr_1fr] xl:grid-cols-1 2xl:grid-cols-[1fr_1fr]">
            <div className="h-[220px]">
              {mounted ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.categories} dataKey="value" innerRadius={62} outerRadius={96} paddingAngle={2}>
                      {data.categories.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full rounded-3xl bg-[#fff6f8]" />
              )}
            </div>
            <div className="space-y-3 self-center">
              {data.categories.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-[#5f555b]">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
                    {item.name}
                  </span>
                  <b>{item.value}%</b>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="glass-card rounded-[28px] p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-black">Recent Activity</h2>
            <button className="text-sm font-bold text-[#f32368]">View All</button>
          </div>
          <div className="space-y-4">
            {data.recentActivity.map((item) => (
              <div key={item.title} className="flex items-center gap-4 border-b border-[#f4dce4] pb-4 last:border-0 last:pb-0">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#fff0f4] text-[#f32368]">
                  <CheckCircle2 size={19} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-[#2a1420]">{item.title}</p>
                  <p className="text-sm text-[#756a70]">{item.note}</p>
                </div>
                <span className="text-xs text-[#9a8f95]">{item.time}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
        <div className="glass-card overflow-hidden rounded-[28px]">
          <div className="flex items-center justify-between px-6 py-5">
            <h2 className="text-lg font-black">Recent Bookings</h2>
            <button className="text-sm font-bold text-[#f32368]">View All</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-[#fff6f8] text-[#756a70]">
                <tr>
                  {["Booking ID", "Customer", "Service", "Partner", "Status", "Amount", "Time"].map((head) => (
                    <th key={head} className="px-6 py-4 font-bold">{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.recentBookings.map((booking) => (
                  <tr key={booking.id} className="border-b border-[#f4dce4] last:border-0">
                    <td className="px-6 py-4 font-bold">{booking.id}</td>
                    <td className="px-6 py-4">{booking.customer}</td>
                    <td className="px-6 py-4">{booking.service}</td>
                    <td className="px-6 py-4">{booking.partner}</td>
                    <td className="px-6 py-4"><StatusBadge status={booking.status} /></td>
                    <td className="px-6 py-4 font-bold">{formatCurrency(booking.amount)}</td>
                    <td className="px-6 py-4 text-[#756a70]">{booking.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass-card rounded-[28px] p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-black">Pending Verifications</h2>
            <button className="text-sm font-bold text-[#f32368]">View All</button>
          </div>
          <div className="space-y-4">
            {data.pendingVerifications.map((partner) => (
              <div key={partner.name} className="flex flex-wrap items-center gap-4 border-b border-[#f4dce4] pb-4 last:border-0 last:pb-0">
                <div className="grid h-13 w-13 place-items-center rounded-full bg-gradient-to-br from-[#ffd8e2] to-[#f32368] font-black text-white">
                  {partner.avatar}
                </div>
                <div className="min-w-[170px] flex-1">
                  <p className="font-black">{partner.name}</p>
                  <p className="text-sm text-[#756a70]">{partner.skill}</p>
                  <p className="text-sm text-[#756a70]">{partner.city}</p>
                </div>
                <p className="text-sm text-[#756a70]">Applied on {partner.applied}</p>
                <div className="flex gap-2">
                  <button className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700">Approve</button>
                  <button className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-bold text-rose-700">Reject</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
