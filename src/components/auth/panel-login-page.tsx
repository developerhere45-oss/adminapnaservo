"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, UserRound } from "lucide-react";

type LoginKind = "admin" | "employee";

export function PanelLoginPage({ kind }: { kind: LoginKind }) {
  const router = useRouter();
  const isEmployee = kind === "employee";
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch(isEmployee ? "/api/employee/login" : "/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(isEmployee ? { identifier, password } : { email: identifier, password }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.message || "Login failed");
      return;
    }
    router.push(isEmployee ? "/employee/dashboard" : "/admin/dashboard");
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-[radial-gradient(circle_at_top,#eaf2ff,transparent_38%),linear-gradient(135deg,#f8fbff,#ffffff)] p-5">
      <section className="grid w-full max-w-5xl overflow-hidden rounded-[30px] border border-[#e3e9f5] bg-white shadow-[0_30px_90px_rgba(16,24,40,.12)] lg:grid-cols-[0.92fr_1.08fr]">
        <div className="hidden bg-[#0b6df6] p-10 text-white lg:block">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15">
              <ShieldCheck size={27} />
            </div>
            <div>
              <h1 className="text-3xl font-black italic tracking-[-0.05em]">ApnaServo</h1>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">{isEmployee ? "Employee Workspace" : "Admin Command Center"}</p>
            </div>
          </div>
          <div className="mt-24 max-w-sm">
            <h2 className="text-5xl font-black tracking-[-0.055em]">{isEmployee ? "Focused tools for support teams." : "Secure control for live operations."}</h2>
            <p className="mt-5 text-lg text-white/78">
              {isEmployee ? "Only assigned chats, safe customer data, bookings and verification workflows." : "Bookings, users, partners, chats, employees and platform operations."}
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="p-8 sm:p-12">
          <div className="mb-9">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#0b6df6]">{isEmployee ? "Employee Login" : "Admin Login"}</p>
            <h2 className="mt-2 text-4xl font-black tracking-[-0.05em]">Welcome back</h2>
            <p className="mt-2 text-[#667085]">{isEmployee ? "Sign in to your assigned support workspace." : "Sign in to manage ApnaServo operations."}</p>
          </div>
          <label className="mb-4 block">
            <span className="mb-2 block text-sm font-bold">{isEmployee ? "Employee email or ID" : "Email address"}</span>
            <span className="relative block">
              {isEmployee ? <UserRound className="absolute left-4 top-1/2 -translate-y-1/2 text-[#667085]" size={19} /> : <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#667085]" size={19} />}
              <input value={identifier} onChange={(event) => setIdentifier(event.target.value)} autoComplete="username" className="h-14 w-full rounded-2xl border border-[#dfe6f2] bg-white px-12 text-sm font-semibold outline-none focus:border-[#0b6df6] focus:ring-4 focus:ring-[#dceaff]" />
            </span>
          </label>
          <label className="mb-5 block">
            <span className="mb-2 block text-sm font-bold">Password</span>
            <span className="relative block">
              <LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 text-[#667085]" size={19} />
              <input value={password} onChange={(event) => setPassword(event.target.value)} type={showPassword ? "text" : "password"} autoComplete="current-password" className="h-14 w-full rounded-2xl border border-[#dfe6f2] bg-white px-12 pr-14 text-sm font-semibold outline-none focus:border-[#0b6df6] focus:ring-4 focus:ring-[#dceaff]" />
              <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#667085]" aria-label="Show or hide password">
                {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </span>
          </label>
          {error && <p className="mb-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p>}
          <button disabled={loading} className="h-14 w-full rounded-2xl bg-[#0b6df6] font-black text-white shadow-[0_16px_35px_rgba(11,109,246,.22)] disabled:opacity-60">
            {loading ? "Signing in..." : isEmployee ? "Login to Employee Panel" : "Login to Admin Panel"}
          </button>
          <p className="mt-5 text-center text-sm font-semibold text-[#667085]">Role based access is enforced by backend APIs.</p>
        </form>
      </section>
    </main>
  );
}
