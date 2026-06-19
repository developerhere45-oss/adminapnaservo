"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  BarChart3,
  Bell,
  CalendarCheck,
  ChevronDown,
  ClipboardList,
  Headphones,
  ImageIcon,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareWarning,
  Search,
  Settings,
  ShieldCheck,
  UserRoundCog,
  UsersRound,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Providers, useAdminUi } from "@/app/providers";
import { LiveStatusPill, RealtimeBridge } from "./realtime-bridge";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/bookings", label: "Bookings", icon: CalendarCheck },
  { href: "/partners", label: "Service Partners", icon: UserRoundCog },
  { href: "/users", label: "Users", icon: UsersRound },
  { href: "/services", label: "Services", icon: Wrench },
  { href: "/quotes", label: "Quotes", icon: ClipboardList },
  { href: "/complaints", label: "Complaints", icon: MessageSquareWarning },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/banners", label: "Banners", icon: ImageIcon },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/audit-logs", label: "Audit Logs", icon: Activity },
  { href: "/settings", label: "Settings", icon: Settings },
];

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-[#ff4f86] to-[#d40b54] text-white shadow-[0_14px_35px_rgba(249,43,116,.25)]">
        <ShieldCheck size={25} strokeWidth={2.4} />
      </div>
      <div>
        <div className="text-[26px] font-black italic tracking-[-0.05em] text-[#2a1420]">
          Apna<span className="text-[#f32368]">Servo</span>
        </div>
        <p className="-mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8c7a82]">
          Home Services At Your Doorstep
        </p>
      </div>
    </div>
  );
}

function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-30 hidden h-dvh w-[292px] border-r border-[#f4dce4] bg-white/78 px-5 py-6 backdrop-blur-2xl xl:block">
      <Logo />
      <nav className="mt-9 space-y-2">
        {navItems.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex h-13 items-center gap-4 rounded-2xl px-4 text-[15px] font-semibold text-[#4b4248] transition-all hover:bg-[#fff0f4] hover:text-[#e91d63]",
                active && "bg-[#fff0f4] text-[#e91d63] shadow-[0_12px_30px_rgba(249,43,116,.08)]",
              )}
            >
              <Icon size={19} className={cn("text-[#756a70]", active && "text-[#e91d63]")} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="absolute bottom-6 left-5 right-5 rounded-3xl bg-gradient-to-br from-[#fff0f4] to-white p-5 shadow-[0_18px_45px_rgba(107,34,60,.09)]">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-[#f32368] shadow-sm">
            <Headphones size={22} />
          </div>
          <div>
            <p className="font-bold text-[#2a1420]">Need Help?</p>
            <p className="text-xs text-[#8c7a82]">Contact support</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function Topbar() {
  const router = useRouter();
  const { toggleSidebar } = useAdminUi();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-20 flex h-[92px] items-center justify-between border-b border-[#f4dce4] bg-white/78 px-4 backdrop-blur-2xl sm:px-8 xl:pl-10">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={toggleSidebar}
          className="grid h-12 w-12 place-items-center rounded-2xl bg-[#fff0f4] text-[#f32368] xl:hidden"
          aria-label="Open menu"
        >
          <Menu size={21} />
        </button>
        <div className="relative hidden w-[430px] max-w-[42vw] md:block">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8c7a82]" size={20} />
          <input
            className="h-13 w-full rounded-2xl border border-[#eed5dd] bg-white px-12 text-sm outline-none transition focus:border-[#f32368] focus:ring-4 focus:ring-[#ffd4e1]"
            placeholder="Search for bookings, users, partners..."
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <LiveStatusPill />
        <button className="relative grid h-12 w-12 place-items-center rounded-2xl bg-white shadow-[0_12px_30px_rgba(107,34,60,.08)]" aria-label="Notifications">
          <Bell size={21} />
          <span className="absolute right-2 top-2 grid h-5 min-w-5 place-items-center rounded-full bg-[#f32368] px-1 text-[10px] font-bold text-white">
            12
          </span>
        </button>
        <button className="flex items-center gap-3 rounded-2xl bg-white px-3 py-2 shadow-[0_12px_30px_rgba(107,34,60,.08)]" onClick={logout}>
          <div className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-[#ffd8e2] to-[#f32368] text-sm font-black text-white">
            AU
          </div>
          <div className="hidden text-left md:block">
            <p className="text-sm font-bold text-[#2a1420]">Admin User</p>
            <p className="text-xs text-[#8c7a82]">Super Admin</p>
          </div>
          <ChevronDown size={16} className="hidden text-[#8c7a82] md:block" />
          <LogOut size={17} className="text-[#f32368] md:hidden" />
        </button>
      </div>
    </header>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <RealtimeBridge />
      <div className="min-h-dvh bg-[radial-gradient(circle_at_top_left,#fff0f4,transparent_34%),linear-gradient(180deg,#fffafa,#fff6f7)] text-[#181018]">
        <Sidebar />
        <div className="xl:pl-[292px]">
          <Topbar />
          <main className="px-4 py-7 sm:px-8 xl:px-10">{children}</main>
          <footer className="flex flex-wrap justify-between gap-4 border-t border-[#f4dce4] px-8 py-6 text-xs text-[#8c7a82] xl:px-10">
            <span>© 2026 ApnaServo. All rights reserved.</span>
            <span>Terms & Conditions &nbsp; | &nbsp; Privacy Policy</span>
          </footer>
        </div>
      </div>
    </Providers>
  );
}
