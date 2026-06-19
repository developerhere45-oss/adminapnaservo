"use client";

import { useEffect } from "react";
import { io, type Socket } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import { create } from "zustand";

type LiveState = {
  connected: boolean;
  backendUrl: string;
  lastEvent: string;
  eventCount: number;
  setConnected: (connected: boolean) => void;
  setBackendUrl: (backendUrl: string) => void;
  pushEvent: (eventName: string) => void;
};

export const useLiveAdmin = create<LiveState>((set) => ({
  connected: false,
  backendUrl: "",
  lastEvent: "Waiting for backend",
  eventCount: 0,
  setConnected: (connected) => set({ connected }),
  setBackendUrl: (backendUrl) => set({ backendUrl }),
  pushEvent: (eventName) =>
    set((state) => ({
      lastEvent: eventName,
      eventCount: state.eventCount + 1,
    })),
}));

const bookingEvents = [
  "booking:new_request",
  "booking:accepted",
  "booking:rejected",
  "booking:status_update",
  "partner:online",
  "partner:offline",
  "partner:location_update",
  "admin:activity",
];

export function RealtimeBridge() {
  const queryClient = useQueryClient();
  const setConnected = useLiveAdmin((state) => state.setConnected);
  const setBackendUrl = useLiveAdmin((state) => state.setBackendUrl);
  const pushEvent = useLiveAdmin((state) => state.pushEvent);

  useEffect(() => {
    let socket: Socket | null = null;
    let closed = false;

    async function connect() {
      try {
        const response = await fetch("/api/admin/realtime-token", { cache: "no-store" });
        if (!response.ok) {
          pushEvent("Realtime token unavailable");
          return;
        }
        const config = (await response.json()) as { backendUrl: string; token: string };
        if (closed) return;

        setBackendUrl(config.backendUrl);
        socket = io(config.backendUrl, {
          transports: ["websocket", "polling"],
          auth: {
            role: "admin",
            adminToken: config.token,
          },
          reconnection: true,
          reconnectionAttempts: Infinity,
          reconnectionDelay: 1200,
        });

        socket.on("connect", () => {
          setConnected(true);
          pushEvent("Connected to live backend");
        });

        socket.on("disconnect", () => {
          setConnected(false);
          pushEvent("Backend disconnected");
        });

        socket.on("connect_error", () => {
          setConnected(false);
          pushEvent("Backend realtime auth failed");
        });

        for (const eventName of bookingEvents) {
          socket.on(eventName, () => {
            pushEvent(eventName);
            queryClient.invalidateQueries({ queryKey: ["overview"] });
            queryClient.invalidateQueries({ queryKey: ["admin-resource"] });
          });
        }
      } catch {
        setConnected(false);
        pushEvent("Realtime connection failed");
      }
    }

    connect();

    return () => {
      closed = true;
      socket?.disconnect();
    };
  }, [pushEvent, queryClient, setBackendUrl, setConnected]);

  return null;
}

export function LiveStatusPill() {
  const connected = useLiveAdmin((state) => state.connected);
  const lastEvent = useLiveAdmin((state) => state.lastEvent);
  const eventCount = useLiveAdmin((state) => state.eventCount);

  return (
    <div className="hidden items-center gap-2 rounded-2xl border border-[#ecd3dc] bg-white px-4 py-2 text-xs font-bold text-[#5f555b] shadow-sm lg:flex">
      <span className={`h-2.5 w-2.5 rounded-full ${connected ? "bg-emerald-500 shadow-[0_0_0_6px_rgba(16,185,129,.14)]" : "bg-rose-500"}`} />
      <span>{connected ? "Live backend" : "Backend offline"}</span>
      <span className="text-[#a09198]">•</span>
      <span>{lastEvent}</span>
      {eventCount > 0 && <span className="rounded-full bg-[#fff0f4] px-2 py-0.5 text-[#f32368]">{eventCount}</span>}
    </div>
  );
}
