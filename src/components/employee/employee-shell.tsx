"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CalendarCheck, LogOut, MessageSquare, Search, UserCheck, Users } from "lucide-react";
import { Providers } from "@/app/providers";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/employee/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/employee/bookings", label: "Bookings", icon: CalendarCheck },
  { href: "/employee/partners", label: "Partners", icon: UserCheck },
  { href: "/employee/users", label: "Users", icon: Users },
  { href: "/employee/chats", label: "Assigned Chats", icon: MessageSquare },
  { href: "/employee/logout", label: "Logout", icon: LogOut },
];

export function EmployeeShell({ children, name = "Employee", department = "Support" }: { children: React.ReactNode; name?: string; department?: string }) {
  const pathname = usePathname();

  return (
    <Providers>
      <div className="min-h-dvh bg-[#f7f9fc] text-[#111827]">
        <aside className="fixed left-0 top-0 hidden h-dvh w-[236px] border-r border-[#e8edf5] bg-white lg:block">
          <Link href="/employee/dashboard" className="flex h-[92px] items-center gap-3 px-7">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#eaf2ff] text-[#0b6df6]"><BarChart3 size={22} /></span>
            <span className="text-xl font-black">ServicePro</span>
          </Link>
          <nav className="space-y-2 px-5 py-4">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex h-12 items-center gap-3 rounded-xl px-4 text-sm font-bold text-[#344054] transition hover:bg-[#eef5ff] hover:text-[#0b6df6]",
                    active && "bg-[#eaf2ff] text-[#0b6df6]",
                  )}
                >
                  <Icon size={19} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <div className="lg:pl-[236px]">
          <header className="sticky top-0 z-20 flex h-[88px] items-center justify-between border-b border-[#e8edf5] bg-white/95 px-5 backdrop-blur lg:px-9">
            <div className="relative hidden w-full max-w-md md:block">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#667085]" size={18} />
              <input className="h-11 w-full rounded-xl border border-[#dfe6f2] bg-white px-11 text-sm font-semibold outline-none focus:border-[#0b6df6]" placeholder="Search assigned work..." />
            </div>
            <div className="ml-auto flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-black">{name}</p>
                <p className="text-xs font-bold capitalize text-[#667085]">{department} · Employee</p>
              </div>
              <div className="grid h-11 w-11 place-items-center rounded-full bg-[#eaf2ff] text-sm font-black text-[#0b6df6]">
                {name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "EM"}
              </div>
            </div>
          </header>
          <main className="px-5 py-7 lg:px-9">{children}</main>
        </div>
      </div>
    </Providers>
  );
}
