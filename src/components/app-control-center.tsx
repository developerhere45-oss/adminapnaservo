"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Eye,
  Megaphone,
  MonitorCog,
  Pencil,
  Plus,
  RefreshCw,
  Rocket,
  Save,
  Send,
  ShieldCheck,
  Trash2,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ControlConfig = {
  appStatus: {
    mode: string;
    title: string;
    message: string;
    bookingEnabled: boolean;
  };
  launch: {
    enabled: boolean;
    launchAt: string;
    timezone: string;
    title: string;
    dateText: string;
    description: string;
    ctaText: string;
    imageUrl: string;
  };
  update: {
    enabled: boolean;
    type: "soft" | "force";
    latestVersion: string;
    minimumVersion: string;
    title: string;
    message: string;
    buttonText: string;
    storeUrl: string;
  };
  features: Record<
    string,
    {
      enabled: boolean;
      audience: string;
      description: string;
      startsAt?: string;
      endsAt?: string;
    }
  >;
  services: Record<string, { status: string; message: string }>;
};
type Item = {
  _id: string;
  kind: "announcement" | "banner";
  title: string;
  message: string;
  status: string;
  priority: number;
  startsAt?: string;
  endsAt?: string;
  imageUrl?: string;
  ctaText?: string;
  ctaAction?: string;
  placement?: string;
  serviceCategory?: string;
};
type ServiceSummary = {
  _id: string;
  serviceCategory: string;
  name: string;
  description?: string;
  isActive?: boolean;
  availability?: string;
  availabilityMessage?: string;
  availabilityStartsAt?: string;
  availabilityEndsAt?: string;
};
type FeatureDefinition = {
  featureId: string;
  name: string;
  description: string;
  platform: "all" | "android" | "ios";
  minimumAppVersion?: string;
  dependencies?: string[];
  implementationState: "active" | "implementation_not_found";
  remoteConfigSupported?: boolean;
};
const defaults: ControlConfig = {
  appStatus: { mode: "LIVE", title: "", message: "", bookingEnabled: true },
  launch: {
    enabled: false,
    launchAt: "",
    timezone: "Asia/Kolkata",
    title: "",
    dateText: "",
    description: "",
    ctaText: "Notify me",
    imageUrl: "",
  },
  update: {
    enabled: false,
    type: "soft",
    latestVersion: "",
    minimumVersion: "",
    title: "",
    message: "",
    buttonText: "Update now",
    storeUrl: "",
  },
  features: {},
  services: {},
};
const modes = [
  "LIVE",
  "COMING_SOON",
  "PARTIALLY_AVAILABLE",
  "MAINTENANCE",
  "TEMPORARILY_UNAVAILABLE",
];
const modeDetails: Record<string, { label: string; description: string }> = {
  LIVE: { label: "Live", description: "Everything is available and customers can continue normally." },
  COMING_SOON: { label: "Coming soon", description: "Show the upcoming state and prevent new bookings." },
  PARTIALLY_AVAILABLE: { label: "Partially available", description: "Keep supported parts available while explaining limitations." },
  MAINTENANCE: { label: "Maintenance", description: "Temporarily block the app with a maintenance message." },
  TEMPORARILY_UNAVAILABLE: { label: "Temporarily unavailable", description: "Block the affected app temporarily and show the configured message." },
};
const serviceStates = [
  "AVAILABLE",
  "PREPARING",
  "HIGH_DEMAND",
  "TEMPORARILY_UNAVAILABLE",
  "COMING_SOON",
  "DISABLED",
];

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/admin/control-center${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || "Request failed");
  }
  return response.json();
}
function Toggle({
  value,
  onChange,
  label,
  disabled = false,
}: {
  value: boolean;
  onChange: (value: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <label className={cn("flex items-center gap-3 text-sm font-bold", disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer")}>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        disabled={disabled}
        onClick={() => onChange(!value)}
        className={cn(
          "relative h-6 w-11 rounded-full transition",
          value ? "bg-[#f32368]" : "bg-[#d0d5dd]",
        )}
      >
        <span
          className={cn(
            "absolute top-1 h-4 w-4 rounded-full bg-white transition",
            value ? "left-6" : "left-1",
          )}
        />
      </button>
      {label}
    </label>
  );
}

export function AppControlCenter() {
  const [selectedApp, setSelectedApp] = useState<"customer" | "partner">("customer");
  const [queryLoaded, setQueryLoaded] = useState(false);
  const [tab, setTab] = useState<
    | "status"
    | "launch"
    | "services"
    | "features"
    | "updates"
    | "announcements"
    | "banners"
    | "audit"
  >("status");
  const [draft, setDraft] = useState<ControlConfig>(defaults);
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState<Item | null>(null);
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();
  const controlPath = (path: string) => `${path}${path.includes("?") ? "&" : "?"}app=${selectedApp}`;
  useEffect(() => {
    if (!queryLoaded) {
      const requested = new URLSearchParams(window.location.search).get("app");
      setQueryLoaded(true);
      if (requested === "partner") setSelectedApp("partner");
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.set("app", selectedApp);
    window.history.replaceState({}, "", url);
    setEditing(null);
    setSearch("");
    if (selectedApp === "partner" && ["launch", "services", "banners"].includes(tab)) setTab("status");
  }, [selectedApp, tab, queryLoaded]);
  const overview = useQuery({
    queryKey: ["app-control-overview", selectedApp],
    queryFn: () =>
      api<{
        draft: ControlConfig;
        published: ControlConfig;
        version: number;
        counts: { announcements: number; banners: number; auditLogs: number; activePartners?: number };
        services: ServiceSummary[];
        features: FeatureDefinition[];
      }>(controlPath("")),
  });
  useEffect(() => {
    if (overview.data?.draft) setDraft(overview.data.draft);
  }, [overview.data?.draft]);
  const current = overview.data?.draft || defaults;
  const items = useQuery({
    queryKey: ["app-control-items", selectedApp, tab, search],
    queryFn: () =>
      api<{ items: Item[] }>(
        controlPath(`/${tab === "announcements" ? "announcement" : "banner"}?search=${encodeURIComponent(search)}`),
      ),
    enabled: tab === "announcements" || tab === "banners",
  });
  const audit = useQuery({
    queryKey: ["app-control-audit", selectedApp],
    queryFn: () =>
      api<{
        logs: Array<{
          _id: string;
          title: string;
          detail: string;
          actorName: string;
          createdAt: string;
        }>;
      }>(controlPath("/audit-logs")),
    enabled: tab === "audit",
  });
  const save = useMutation({
    mutationFn: ({ section, value }: { section: string; value: unknown }) =>
      api<{ draft: ControlConfig }>(controlPath("/draft"), {
        method: "PATCH",
        body: JSON.stringify({ section, value }),
      }),
    onSuccess: (result) => {
      setDraft(result.draft);
      setMessage("Draft saved. Publish when ready.");
      queryClient.invalidateQueries({ queryKey: ["app-control-overview", selectedApp] });
    },
    onError: (error: Error) => setMessage(error.message),
  });
  const publish = useMutation({
    mutationFn: () => api<{ ok: boolean }>(controlPath("/publish"), { method: "POST" }),
    onSuccess: () => {
      setMessage(`Published to ${selectedApp} configuration.`);
      queryClient.invalidateQueries({ queryKey: ["app-control-overview", selectedApp] });
      queryClient.invalidateQueries({ queryKey: ["app-control-audit", selectedApp] });
    },
    onError: (error: Error) => setMessage(error.message),
  });
  const openBookings = useMutation({
    mutationFn: () =>
      api<{ published: ControlConfig }>(controlPath("/open-bookings"), { method: "POST" }),
    onSuccess: (result) => {
      setDraft(result.published);
      setMessage("Launch screen removed. Customer booking flow is now live.");
      queryClient.invalidateQueries({ queryKey: ["app-control-overview", selectedApp] });
      queryClient.invalidateQueries({ queryKey: ["app-control-audit", selectedApp] });
    },
    onError: (error: Error) => setMessage(error.message),
  });
  const content = useMutation({
    mutationFn: ({ method, item }: { method: string; item: Partial<Item> }) =>
      api<{ ok?: boolean; item?: Item }>(
        controlPath(`/${item.kind}${item._id ? `/${item._id}` : ""}`),
        {
          method,
          body: method === "DELETE" ? undefined : JSON.stringify(item),
        },
      ),
    onSuccess: () => {
      setEditing(null);
      setMessage("Content saved.");
      queryClient.invalidateQueries({ queryKey: ["app-control-items", selectedApp] });
      queryClient.invalidateQueries({ queryKey: ["app-control-overview", selectedApp] });
    },
    onError: (error: Error) => setMessage(error.message),
  });
  const config = overview.data ? draft : current;
  const setSection = (section: keyof ControlConfig, value: unknown) => {
    const next = { ...config, [section]: value };
    setDraft(next);
    save.mutate({ section, value });
  };
  const displayedItems = useMemo(() => items.data?.items || [], [items.data]);
  const tabs: Array<typeof tab> = selectedApp === "partner"
    ? ["status", "features", "updates", "announcements", "audit"]
    : ["status", "launch", "services", "features", "updates", "announcements", "banners", "audit"];
  const input =
    "h-10 w-full rounded-lg border border-[#e6eaf2] bg-white px-3 text-sm outline-none focus:border-[#f32368]";
  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-[#f32368]">App Control Center</p>
          <h1 className="mt-1 text-3xl font-black">{selectedApp === "partner" ? "Partner App Controls" : "Customer App Controls"}</h1>
          <p className="mt-1 text-sm text-[#667085]">
            Draft → preview → publish. {selectedApp === "partner" ? "Partner" : "Customer"} devices use the last valid published configuration offline.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex rounded-lg border border-[#e6eaf2] bg-white p-1 text-sm font-bold">
            {(["customer", "partner"] as const).map((app) => <button key={app} onClick={() => setSelectedApp(app)} className={cn("rounded-md px-3 py-2 capitalize", selectedApp === app && "bg-[#fff0f4] text-[#bd1749]")}>{app} app</button>)}
          </div>
          <button
            onClick={() => overview.refetch()}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#e6eaf2] bg-white px-4 text-sm font-bold"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
          <button
            onClick={() => publish.mutate()}
            disabled={publish.isPending}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#f32368] px-4 text-sm font-black text-white disabled:opacity-60"
          >
            <Send size={16} />
            Publish changes
          </button>
        </div>
      </header>
      {message && (
        <div className="rounded-lg border border-[#f7bfd0] bg-[#fff5f7] px-4 py-3 text-sm font-bold text-[#bd1749]">
          {message}
        </div>
      )}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Published version", overview.data?.version || 0, ShieldCheck],
          ["Announcements", overview.data?.counts.announcements || 0, Bell],
          [selectedApp === "partner" ? "Active partners" : "Banners", selectedApp === "partner" ? overview.data?.counts.activePartners || 0 : overview.data?.counts.banners || 0, Megaphone],
          ["Audit actions", overview.data?.counts.auditLogs || 0, MonitorCog],
        ].map(([label, value, Icon]) => {
          const C = Icon as typeof ShieldCheck;
          return (
            <div key={String(label)} className="admin-card p-4">
              <C className="text-[#f32368]" size={22} />
              <p className="mt-3 text-xs font-bold text-[#667085]">
                {String(label)}
              </p>
              <p className="mt-1 text-2xl font-black">{String(value)}</p>
            </div>
          );
        })}
      </section>
      <nav className="flex max-w-full gap-1 overflow-x-auto border-b border-[#edf0f6]">
        {tabs.map((name) => (
          <button
            key={name}
            onClick={() => setTab(name)}
            className={cn(
              "shrink-0 border-b-2 px-4 py-3 text-sm font-black capitalize",
              tab === name
                ? "border-[#f32368] text-[#f32368]"
                : "border-transparent text-[#667085]",
            )}
          >
            {name === "updates" ? "Update Management" : name}
          </button>
        ))}
      </nav>
      {tab === "status" && (
        <section className="admin-card grid gap-6 p-5 lg:grid-cols-2">
          <div>
            <h2 className="text-lg font-black">App Status</h2>
            <p className="mt-1 text-sm text-[#667085]">
              Booking APIs enforce this after publishing.
            </p>
            <select
              className={cn(input, "mt-5")}
              value={config.appStatus.mode}
              onChange={(e) =>
                setSection("appStatus", {
                  ...config.appStatus,
                  mode: e.target.value,
                })
              }
            >
              {modes.map((mode) => (
                <option key={mode} value={mode}>{modeDetails[mode].label}</option>
              ))}
            </select>
            <p className="mt-2 text-xs font-bold text-[#667085]">{modeDetails[config.appStatus.mode]?.description}</p>
            <input
              className={cn(input, "mt-3")}
              placeholder="Customer title"
              value={config.appStatus.title}
              onChange={(e) =>
                setDraft({
                  ...config,
                  appStatus: { ...config.appStatus, title: e.target.value },
                })
              }
              onBlur={() => setSection("appStatus", draft.appStatus)}
            />
            <textarea
              className="mt-3 min-h-24 w-full rounded-lg border border-[#e6eaf2] p-3 text-sm"
              placeholder="Customer message"
              value={config.appStatus.message}
              onChange={(e) =>
                setDraft({
                  ...config,
                  appStatus: { ...config.appStatus, message: e.target.value },
                })
              }
              onBlur={() => setSection("appStatus", draft.appStatus)}
            />
            <div className="mt-4">
              <Toggle
                label="Allow bookings"
                value={config.appStatus.bookingEnabled}
                onChange={(bookingEnabled) =>
                  setSection("appStatus", {
                    ...config.appStatus,
                    bookingEnabled,
                  })
                }
              />
            </div>
          </div>
          <Preview config={config} />
        </section>
      )}
      {tab === "launch" && (
        <section className="admin-card grid gap-4 p-5 lg:grid-cols-2">
          <div className="space-y-3">
            <h2 className="text-lg font-black">Launch Configuration</h2>
            <p className="text-sm text-[#667085]">
              Remove the launch screen manually when you are ready to start
              customer bookings.
            </p>
            <Toggle
              label="Show launch screen"
              value={config.launch.enabled}
              onChange={(enabled) =>
                setSection("launch", { ...config.launch, enabled })
              }
            />
            <button
              type="button"
              onClick={() =>
                window.confirm(
                  "Remove the launch screen and open customer bookings now?",
                ) && openBookings.mutate()
              }
              disabled={openBookings.isPending}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-[#f32368] px-4 text-sm font-black text-white disabled:opacity-60"
            >
              {openBookings.isPending
                ? "Opening bookings..."
                : "Remove launch screen & open bookings"}
            </button>
            {(
              [
                ["launchAt", "datetime-local"],
                ["timezone", "text"],
                ["title", "text"],
                ["dateText", "text"],
                ["ctaText", "text"],
                ["imageUrl", "url"],
              ] as const
            ).map(([key, type]) => (
              <input
                key={key}
                type={type}
                className={input}
                placeholder={key}
                value={config.launch[key] || ""}
                onChange={(e) =>
                  setDraft({
                    ...config,
                    launch: { ...config.launch, [key]: e.target.value },
                  })
                }
                onBlur={() => setSection("launch", draft.launch)}
              />
            ))}
            <textarea
              className="min-h-24 w-full rounded-lg border border-[#e6eaf2] p-3 text-sm"
              placeholder="Description"
              value={config.launch.description}
              onChange={(e) =>
                setDraft({
                  ...config,
                  launch: { ...config.launch, description: e.target.value },
                })
              }
              onBlur={() => setSection("launch", draft.launch)}
            />
          </div>
          <Preview config={config} />
        </section>
      )}
      {tab === "services" && (
        <ServiceControls
          config={config}
          input={input}
          services={overview.data?.services || []}
          onChange={(services) => setSection("services", services)}
        />
      )}
      {tab === "features" && (
        <FeatureControls
          config={config}
          definitions={overview.data?.features || []}
          onChange={(features) => setSection("features", features)}
        />
      )}
      {tab === "updates" && (
        <UpdateControls
          config={config}
          input={input}
          onChange={(update) => setSection("update", update)}
        />
      )}
      {(tab === "announcements" || tab === "banners") && (
        <ContentManager
          kind={tab === "announcements" ? "announcement" : "banner"}
          input={input}
          items={displayedItems}
          search={search}
          setSearch={setSearch}
          editing={editing}
          setEditing={setEditing}
          mutation={content}
        />
      )}
      {tab === "audit" && (
        <section className="admin-card overflow-hidden">
          <div className="border-b border-[#edf0f6] p-5">
            <h2 className="text-lg font-black">Audit Logs</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-[#fbfcfe] text-xs text-[#667085]">
                <tr>
                  <th className="px-5 py-4">Time</th>
                  <th className="px-5 py-4">Action</th>
                  <th className="px-5 py-4">Details</th>
                  <th className="px-5 py-4">Admin</th>
                </tr>
              </thead>
              <tbody>
                {(audit.data?.logs || []).map((log) => (
                  <tr key={log._id} className="border-t border-[#edf0f6]">
                    <td className="px-5 py-4">
                      {new Date(log.createdAt).toLocaleString("en-IN")}
                    </td>
                    <td className="px-5 py-4 font-black">{log.title}</td>
                    <td className="px-5 py-4">{log.detail}</td>
                    <td className="px-5 py-4">{log.actorName}</td>
                  </tr>
                ))}
                {!audit.data?.logs?.length && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-5 py-12 text-center text-[#667085]"
                    >
                      No control-center activity yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function Preview({ config }: { config: ControlConfig }) {
  const mode = config.appStatus.mode;
  return (
    <aside className="rounded-2xl border border-[#f3d4dd] bg-[#fffafb] p-5">
      <p className="text-xs font-black text-[#f32368]">LIVE CUSTOMER PREVIEW</p>
      <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm">
        <Rocket className="text-[#f32368]" size={30} />
        <h3 className="mt-4 text-xl font-black">
          {mode === "LIVE"
            ? "ApnaServo is live"
            : config.appStatus.title || mode.replace(/_/g, " ")}
        </h3>
        <p className="mt-2 text-sm text-[#667085]">
          {config.appStatus.message ||
            config.launch.description ||
            "Your trusted home services app."}
        </p>
        <p className="mt-5 rounded-lg bg-[#fff0f4] px-3 py-2 text-xs font-black text-[#bd1749]">
          Booking: {config.appStatus.bookingEnabled ? "Available" : "Disabled"}
        </p>
      </div>
    </aside>
  );
}
function ServiceControls({
  config,
  input,
  services,
  onChange,
}: {
  config: ControlConfig;
  input: string;
  services: ServiceSummary[];
  onChange: (value: ControlConfig["services"]) => void;
}) {
  const [selected, setSelected] = useState("");
  const [filter, setFilter] = useState("");
  const visible = services.filter((service) =>
    `${service.name} ${service.serviceCategory}`
      .toLowerCase()
      .includes(filter.toLowerCase()),
  );
  const selectedService =
    services.find((service) => service.serviceCategory === selected) ||
    visible[0];
  const key = selectedService?.serviceCategory || "";
  const item = config.services[key] || {
    status:
      selectedService?.availability ||
      (selectedService?.isActive === false ? "DISABLED" : "AVAILABLE"),
    message: selectedService?.availabilityMessage || "",
  };
  const save = (patch: Partial<typeof item>) =>
    key && onChange({ ...config.services, [key]: { ...item, ...patch } });
  const counts = services.reduce(
    (total, service) => {
      const state =
        config.services[service.serviceCategory]?.status ||
        service.availability ||
        (service.isActive === false ? "DISABLED" : "AVAILABLE");
      total[state] = (total[state] || 0) + 1;
      return total;
    },
    {} as Record<string, number>,
  );
  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-2xl font-black">Service Availability</h2>
        <p className="mt-1 text-sm text-[#667085]">
          Manage which real services are visible and bookable in the customer
          app.
        </p>
      </header>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["AVAILABLE", "Available", "bg-emerald-50 text-emerald-700"],
          ["PREPARING", "Preparing", "bg-amber-50 text-amber-700"],
          [
            "TEMPORARILY_UNAVAILABLE",
            "Unavailable",
            "bg-rose-50 text-rose-700",
          ],
          ["HIGH_DEMAND", "High demand", "bg-blue-50 text-blue-700"],
        ].map(([state, label, color]) => (
          <div key={state} className="admin-card p-4">
            <span
              className={cn(
                "inline-flex rounded-full px-2 py-1 text-xs font-black",
                color,
              )}
            >
              {label}
            </span>
            <p className="mt-3 text-2xl font-black">{counts[state] || 0}</p>
            <p className="text-xs font-bold text-[#667085]">services</p>
          </div>
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="admin-card overflow-hidden">
          <div className="flex flex-wrap gap-3 border-b border-[#edf0f6] p-4">
            <input
              className={cn(input, "max-w-sm")}
              placeholder="Search service..."
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            />
            <span className="self-center text-xs font-bold text-[#667085]">
              {visible.length} real services
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-[#fbfcfe] text-xs text-[#667085]">
                <tr>
                  <th className="px-5 py-4">Service</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Booking</th>
                  <th className="px-5 py-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((service) => {
                  const state =
                    config.services[service.serviceCategory]?.status ||
                    service.availability ||
                    (service.isActive === false ? "DISABLED" : "AVAILABLE");
                  const bookable = ![
                    "PREPARING",
                    "TEMPORARILY_UNAVAILABLE",
                    "COMING_SOON",
                    "DISABLED",
                  ].includes(state);
                  return (
                    <tr key={service._id} className="border-t border-[#edf0f6]">
                      <td className="px-5 py-4">
                        <p className="font-black">{service.name}</p>
                        <p className="mt-1 text-xs text-[#667085]">
                          {service.description || service.serviceCategory}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={cn(
                            "rounded-full px-2 py-1 text-xs font-black",
                            state === "AVAILABLE"
                              ? "bg-emerald-50 text-emerald-700"
                              : state === "HIGH_DEMAND"
                                ? "bg-blue-50 text-blue-700"
                                : state === "PREPARING"
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-rose-50 text-rose-700",
                          )}
                        >
                          {state.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={cn(
                            "font-bold",
                            bookable ? "text-emerald-700" : "text-rose-600",
                          )}
                        >
                          {bookable ? "Enabled" : "Disabled"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => setSelected(service.serviceCategory)}
                          className="rounded-lg border border-[#e6eaf2] px-3 py-2 text-xs font-black"
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {!visible.length && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-5 py-12 text-center text-[#667085]"
                    >
                      No services found in the live service catalog.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <aside className="admin-card h-fit p-5">
          <h3 className="text-lg font-black">
            {selectedService?.name || "Service details"}
          </h3>
          {selectedService ? (
            <div className="mt-4 space-y-4">
              <p className="text-sm text-[#667085]">
                {selectedService.description ||
                  "Set customer visibility and booking availability."}
              </p>
              <label className="block text-xs font-bold text-[#667085]">
                Status
                <select
                  className={cn(input, "mt-1")}
                  value={item.status}
                  onChange={(event) => save({ status: event.target.value })}
                >
                  {serviceStates.map((state) => (
                    <option key={state}>{state}</option>
                  ))}
                </select>
              </label>
              <div>
                <Toggle
                  label={
                    ![
                      "PREPARING",
                      "TEMPORARILY_UNAVAILABLE",
                      "COMING_SOON",
                      "DISABLED",
                    ].includes(item.status)
                      ? "Booking enabled"
                      : "Booking disabled"
                  }
                  value={
                    ![
                      "PREPARING",
                      "TEMPORARILY_UNAVAILABLE",
                      "COMING_SOON",
                      "DISABLED",
                    ].includes(item.status)
                  }
                  onChange={(enabled) =>
                    save({
                      status: enabled ? "AVAILABLE" : "TEMPORARILY_UNAVAILABLE",
                    })
                  }
                />
              </div>
              <label className="block text-xs font-bold text-[#667085]">
                Customer message
                <textarea
                  className="mt-1 min-h-24 w-full rounded-lg border border-[#e6eaf2] p-3 text-sm"
                  value={item.message}
                  onChange={(event) => save({ message: event.target.value })}
                  placeholder="Explain service availability"
                />
              </label>
              <p className="text-xs text-[#667085]">
                Changes are saved as a draft. Use Publish changes to make them
                live.
              </p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-[#667085]">
              Select a service from the real catalog.
            </p>
          )}
        </aside>
      </div>
    </section>
  );
}
function FeatureControls({
  config,
  definitions,
  onChange,
}: {
  config: ControlConfig;
  definitions: FeatureDefinition[];
  onChange: (value: ControlConfig["features"]) => void;
}) {
  const [selected, setSelected] = useState("");
  const selectedDefinition =
    definitions.find((feature) => feature.featureId === selected) ||
    definitions[0];
  const selectedId = selectedDefinition?.featureId || "";
  const enabled = definitions.filter(
    (feature) => config.features[feature.featureId]?.enabled,
  ).length;
  const feature = config.features[selectedId] || {
    enabled: false,
    audience: "all",
    description: "",
  };
  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-2xl font-black">Feature Controls</h2>
        <p className="mt-1 text-sm text-[#667085]">
          Enable only implemented customer-app features, with audience controls
          and a safe published draft.
        </p>
      </header>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Configured", definitions.length],
          ["Enabled", enabled],
          ["Disabled", definitions.length - enabled],
          [
            "Scheduled",
            Object.values(config.features).filter(
              (item) => item.startsAt || item.endsAt,
            ).length,
          ],
        ].map(([label, value]) => (
          <div key={String(label)} className="admin-card p-4">
            <p className="text-xs font-bold text-[#667085]">
              {String(label)} features
            </p>
            <p className="mt-2 text-2xl font-black">{String(value)}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="admin-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-[#fbfcfe] text-xs text-[#667085]">
                <tr>
                  <th className="px-5 py-4">Feature</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Visibility</th>
                  <th className="px-5 py-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {definitions.map((definition) => {
                  const item = config.features[definition.featureId] || {
                    enabled: false,
                    audience: "all",
                    description: "",
                  };
                  return (
                    <tr
                      key={definition.featureId}
                      className="border-t border-[#edf0f6]"
                    >
                      <td className="px-5 py-4">
                        <p className="font-black">{definition.name}</p>
                        <p className="mt-1 text-xs text-[#667085]">
                          {item.description ||
                            definition.description ||
                            "No description configured"}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        {definition.remoteConfigSupported === false ? (
                          <span className="text-xs font-bold text-[#667085]">App integration required</span>
                        ) : <Toggle
                          label={item.enabled ? "Enabled" : "Disabled"}
                          value={item.enabled}
                          onChange={(enabled) => onChange({ ...config.features, [definition.featureId]: { ...item, enabled } })}
                        />}
                      </td>
                      <td className="px-5 py-4 capitalize">
                        {item.audience.replace(/_/g, " ")}
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => setSelected(definition.featureId)}
                          className="rounded-lg border border-[#e6eaf2] px-3 py-2 text-xs font-black"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <aside className="admin-card h-fit p-5">
          <h3 className="text-lg font-black">
            {selectedDefinition?.name || "Feature details"}
          </h3>
          {selectedDefinition?.remoteConfigSupported === false && <p className="mt-2 rounded-lg bg-[#fff6e8] p-3 text-xs font-bold text-[#9a6700]">This genuine partner-app feature needs the next signed AAB to consume remote configuration. It is intentionally not a fake admin toggle.</p>}
          <div className="mt-4 space-y-4">
            <Toggle
              label={feature.enabled ? "Enabled" : "Disabled"}
              value={feature.enabled}
              disabled={selectedDefinition?.remoteConfigSupported === false}
              onChange={(enabled) =>
                onChange({
                  ...config.features,
                  [selectedId]: { ...feature, enabled },
                })
              }
            />
            <label className="block text-xs font-bold text-[#667085]">
              Visibility
              <select
                className={cn(
                  "mt-1 h-10 w-full rounded-lg border border-[#e6eaf2] bg-white px-3 text-sm",
                )}
                value={feature.audience}
                onChange={(event) =>
                  onChange({
                    ...config.features,
                    [selectedId]: { ...feature, audience: event.target.value },
                  })
                }
              >
                <option value="all">All users</option>
                <option value="users">Users</option>
                <option value="logged_in">Logged-in users</option>
              </select>
            </label>
            <label className="block text-xs font-bold text-[#667085]">
              Description
              <textarea
                className="mt-1 min-h-24 w-full rounded-lg border border-[#e6eaf2] p-3 text-sm"
                value={feature.description}
                onChange={(event) =>
                  onChange({
                    ...config.features,
                    [selectedId]: {
                      ...feature,
                      description: event.target.value,
                    },
                  })
                }
              />
            </label>
          </div>
        </aside>
      </div>
    </section>
  );
}
function UpdateControls({
  config,
  input,
  onChange,
}: {
  config: ControlConfig;
  input: string;
  onChange: (value: ControlConfig["update"]) => void;
}) {
  const update = config.update;
  const change = (patch: Partial<ControlConfig["update"]>) =>
    onChange({ ...update, ...patch });
  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_310px]">
      <div className="space-y-4">
        <header>
          <h2 className="text-2xl font-black">Update Management</h2>
          <p className="mt-1 text-sm text-[#667085]">
            Manage app-update prompts without forcing an unsafe or incomplete
            version.
          </p>
        </header>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Current version", "Installed apps"],
            ["Latest version", update.latestVersion || "Not set"],
            ["Minimum version", update.minimumVersion || "Not set"],
            ["Update status", update.enabled ? "Active" : "Inactive"],
          ].map(([label, value]) => (
            <div key={label} className="admin-card p-4">
              <p className="text-xs font-bold text-[#667085]">{label}</p>
              <p className="mt-2 text-xl font-black">{value}</p>
            </div>
          ))}
        </div>
        <div className="admin-card p-5">
          <h3 className="text-lg font-black">Update configuration</h3>
          <div className="mt-4">
            <Toggle
              label="Update available"
              value={update.enabled}
              onChange={(enabled) => change({ enabled })}
            />
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={() => change({ type: "soft" })}
              className={cn(
                "rounded-xl border p-4 text-left",
                update.type === "soft"
                  ? "border-[#f32368] bg-[#fff5f7]"
                  : "border-[#e6eaf2]",
              )}
            >
              <p className="font-black">Normal update</p>
              <p className="mt-1 text-xs text-[#667085]">
                Send update prompt — user can choose Later and continue using the app.
              </p>
            </button>
            <button
              type="button"
              onClick={() => change({ type: "force" })}
              className={cn(
                "rounded-xl border p-4 text-left",
                update.type === "force"
                  ? "border-[#f32368] bg-[#fff5f7]"
                  : "border-[#e6eaf2]",
              )}
            >
              <p className="font-black">Mandatory update</p>
              <p className="mt-1 text-xs text-[#667085]">
                Block older versions until they update. Later is not available.
              </p>
            </button>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {(
              [
                "latestVersion",
                "minimumVersion",
                "title",
                "buttonText",
                "storeUrl",
              ] as const
            ).map((key) => (
              <input
                key={key}
                className={input}
                placeholder={key}
                value={update[key] || ""}
                onChange={(event) => change({ [key]: event.target.value })}
              />
            ))}
          </div>
          <textarea
            className="mt-3 min-h-24 w-full rounded-lg border border-[#e6eaf2] p-3 text-sm"
            placeholder="Update message"
            value={update.message}
            onChange={(event) => change({ message: event.target.value })}
          />
          <p className="mt-3 rounded-lg bg-[#fff6e8] p-3 text-xs font-bold text-[#9a6700]">
            Mandatory update works only when Minimum version is set higher than the installed app version. Save the draft, then Publish changes to send it.
          </p>
        </div>
      </div>
      <Preview config={config} />
    </section>
  );
}
function ContentManager({
  kind,
  input,
  items,
  search,
  setSearch,
  editing,
  setEditing,
  mutation,
}: {
  kind: "announcement" | "banner";
  input: string;
  items: Item[];
  search: string;
  setSearch: (value: string) => void;
  editing: Item | null;
  setEditing: (value: Item | null) => void;
  mutation: {
    mutate: (variables: { method: string; item: Partial<Item> }) => void;
  };
}) {
  const active = editing?.kind === kind ? editing : null;
  const update = (patch: Partial<Item>) =>
    setEditing({
      ...(active || {
        kind,
        title: "",
        message: "",
        status: "draft",
        priority: 100,
      }),
      ...patch,
    } as Item);
  return (
    <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <div className="admin-card overflow-hidden">
        <div className="flex flex-wrap justify-between gap-3 border-b border-[#edf0f6] p-5">
          <input
            className={cn(input, "max-w-sm")}
            placeholder={`Search ${kind}s`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            onClick={() =>
              setEditing({
                kind,
                title: "",
                message: "",
                status: "draft",
                priority: 100,
              } as Item)
            }
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#f32368] px-4 text-sm font-black text-white"
          >
            <Plus size={16} />
            Create {kind}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-[#fbfcfe] text-xs text-[#667085]">
              <tr>
                <th className="px-5 py-4">Title</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Priority</th>
                <th className="px-5 py-4">Schedule</th>
                <th className="px-5 py-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item._id} className="border-t border-[#edf0f6]">
                  <td className="px-5 py-4 font-black">
                    {item.title}
                    <p className="mt-1 max-w-[300px] truncate text-xs font-medium text-[#667085]">
                      {item.message}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-[#fff0f4] px-2 py-1 text-xs font-black text-[#bd1749]">
                      {item.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">{item.priority}</td>
                  <td className="px-5 py-4 text-xs">
                    {item.startsAt
                      ? new Date(item.startsAt).toLocaleString("en-IN")
                      : "Immediate"}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditing(item)}
                        className="grid h-8 w-8 place-items-center rounded border border-[#e6eaf2]"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        title="Preview or edit this draft"
                        onClick={() => setEditing(item)}
                        className="grid h-8 w-8 place-items-center rounded border border-[#e6eaf2]"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() =>
                          window.confirm(`Delete this ${kind}?`) &&
                          mutation.mutate({ method: "DELETE", item })
                        }
                        className="grid h-8 w-8 place-items-center rounded border border-[#f7c4d2] text-[#d92d4b]"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!items.length && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-12 text-center text-[#667085]"
                  >
                    No {kind}s found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <aside className="admin-card h-fit p-5">
        <h2 className="text-lg font-black">
          {active?._id ? "Edit" : "Create"} {kind}
        </h2>
        {!active ? (
          <p className="mt-3 text-sm text-[#667085]">
            Choose an item or create a new one.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            <input
              className={input}
              placeholder="Title"
              value={active.title}
              onChange={(e) => update({ title: e.target.value })}
            />
            <textarea
              className="min-h-24 w-full rounded-lg border border-[#e6eaf2] p-3 text-sm"
              placeholder="Message"
              value={active.message}
              onChange={(e) => update({ message: e.target.value })}
            />
            <input
              className={input}
              placeholder="Image URL"
              value={active.imageUrl || ""}
              onChange={(e) => update({ imageUrl: e.target.value })}
            />
            <label className="block text-xs font-bold text-[#667085]">
              Start time
              <input
                className={cn(input, "mt-1")}
                type="datetime-local"
                value={active.startsAt ? active.startsAt.slice(0, 16) : ""}
                onChange={(e) =>
                  update({ startsAt: e.target.value || undefined })
                }
              />
            </label>
            <label className="block text-xs font-bold text-[#667085]">
              End time
              <input
                className={cn(input, "mt-1")}
                type="datetime-local"
                value={active.endsAt ? active.endsAt.slice(0, 16) : ""}
                onChange={(e) =>
                  update({ endsAt: e.target.value || undefined })
                }
              />
            </label>
            <p className="rounded-lg bg-[#fff5f7] p-3 text-xs font-bold text-[#bd1749]">
              This content stays a draft until the top-level Publish changes action is confirmed.
            </p>
            <input
              className={input}
              type="number"
              min="0"
              max="9999"
              value={active.priority}
              onChange={(e) => update({ priority: Number(e.target.value) })}
            />
            <button
              onClick={() =>
                mutation.mutate({
                  method: active._id ? "PATCH" : "POST",
                  item: active,
                })
              }
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#f32368] text-sm font-black text-white"
            >
              <Save size={16} />
              Save
            </button>
          </div>
        )}
      </aside>
    </section>
  );
}
