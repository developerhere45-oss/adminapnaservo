"use client";

import { useState } from "react";

export function LogoutButton({ redirectTo = "/admin/login" }: { redirectTo?: string }) {
  const [loading, setLoading] = useState(false);
  return (
    <button
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
        window.location.href = redirectTo;
      }}
      className="mt-8 grid h-12 w-full place-items-center rounded-lg bg-[#0b6df6] text-sm font-black text-white disabled:opacity-60"
    >
      {loading ? "Logging out..." : "Yes, Logout"}
    </button>
  );
}
