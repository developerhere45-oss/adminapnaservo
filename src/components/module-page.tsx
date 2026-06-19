"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Filter, Plus, Search, SlidersHorizontal } from "lucide-react";
import { moduleRows } from "@/lib/mock-data";
import { resourceConfig } from "@/lib/resource-config";
import { cn, statusTone } from "@/lib/utils";

type Row = Record<string, string | number | boolean | null | undefined>;
const demoDataEnabled = process.env.NEXT_PUBLIC_ENABLE_DEMO_DATA === "true";

async function fetchRows(resource: string): Promise<Row[]> {
  const res = await fetch(`/api/admin/${resource}`);
  if (!res.ok) return demoDataEnabled ? (moduleRows as Record<string, Row[]>)[resource] || [] : [];
  const json = await res.json();
  return json.rows || [];
}

function Badge({ value }: { value: string }) {
  const tone = statusTone(value);
  return (
    <span
      className={cn(
        "inline-flex rounded-xl px-3 py-1 text-xs font-black",
        tone === "success" && "bg-emerald-50 text-emerald-700",
        tone === "danger" && "bg-rose-50 text-rose-700",
        tone === "info" && "bg-sky-50 text-sky-700",
        tone === "warning" && "bg-amber-50 text-amber-700",
      )}
    >
      {value}
    </span>
  );
}

export function ModulePage({ resource }: { resource: string }) {
  const config = resourceConfig[resource] || resourceConfig.bookings;
  const fallback = demoDataEnabled ? (moduleRows as Record<string, Row[]>)[resource] || [] : [];
  const { data: rows = fallback } = useQuery({
    queryKey: ["admin-resource", resource],
    queryFn: () => fetchRows(resource),
    initialData: fallback,
  });
  const columns = Object.keys(rows[0] || { id: "ID", status: "Status" });

  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.16em] text-[#f32368]">ApnaServo Admin</p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">{config.title}</h1>
          <p className="mt-2 max-w-2xl text-[#756a70]">{config.subtitle}</p>
        </div>
        <button className="flex h-13 items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#f32368] to-[#ff477b] px-6 text-sm font-bold text-white shadow-[0_16px_35px_rgba(249,43,116,.24)]">
          <Plus size={18} />
          {config.action}
        </button>
      </section>

      <section className="glass-card rounded-[28px] p-5">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8c7a82]" size={19} />
            <input
              className="h-13 w-full rounded-2xl border border-[#ecd3dc] bg-white px-12 text-sm outline-none transition focus:border-[#f32368] focus:ring-4 focus:ring-[#ffd4e1]"
              placeholder={`Search ${config.title.toLowerCase()}...`}
            />
          </div>
          <button className="flex h-13 items-center justify-center gap-2 rounded-2xl border border-[#ecd3dc] bg-white px-5 text-sm font-bold">
            <Filter size={18} />
            Filters
          </button>
          <button className="flex h-13 items-center justify-center gap-2 rounded-2xl border border-[#ecd3dc] bg-white px-5 text-sm font-bold">
            <SlidersHorizontal size={18} />
            Columns
          </button>
        </div>
      </section>

      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card overflow-hidden rounded-[28px]">
        <div className="flex items-center justify-between border-b border-[#f4dce4] px-6 py-5">
          <div>
            <h2 className="text-lg font-black">Records</h2>
            <p className="text-sm text-[#756a70]">{rows.length} records loaded through the admin API.</p>
          </div>
          <button className="rounded-2xl bg-[#fff0f4] px-4 py-2 text-sm font-black text-[#f32368]">Export CSV</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-[#fff6f8] text-[#756a70]">
              <tr>
                {columns.map((column) => (
                  <th key={column} className="px-6 py-4 font-black capitalize">{column.replace(/([A-Z])/g, " $1")}</th>
                ))}
                <th className="px-6 py-4 font-black">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={columns.length + 1} className="px-6 py-10 text-center font-bold text-[#756a70]">
                    No live records available. Check backend connectivity and admin permissions.
                  </td>
                </tr>
              )}
              {rows.map((row, index) => (
                <tr key={String(row.id || index)} className="border-b border-[#f4dce4] last:border-0">
                  {columns.map((column) => {
                    const value = row[column];
                    const text = String(value ?? "-");
                    return (
                      <td key={column} className="px-6 py-4">
                        {column.toLowerCase().includes("status") ? <Badge value={text} /> : <span className={column === "id" ? "font-black" : ""}>{text}</span>}
                      </td>
                    );
                  })}
                  <td className="px-6 py-4">
                    <button className="rounded-xl border border-[#f5bed0] bg-white px-4 py-2 text-sm font-black text-[#f32368]">Manage</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.section>
    </div>
  );
}
