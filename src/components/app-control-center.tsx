"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  CircleAlert,
  CircleCheckBig,
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
  ui: { homeTitle: string; homeSubtitle: string; primaryColor: string; hiddenSections: string[] };
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
  appStatus: { mode: "LIVE" },
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
  ui: { homeTitle: "", homeSubtitle: "", primaryColor: "#f32368", hiddenSections: [] },
  features: {},
  services: {},
};
const modes = [
  "LIVE",
  "PARTIALLY_AVAILABLE",
  "HIGH_DEMAND",
  "MAINTENANCE",
];
const modeDetails: Record<string, { label: string; description: string; Icon: typeof ShieldCheck; tone: string; selected: string }> = {
  LIVE: { label: "LIVE", description: "Everything is available and customers can continue normally.", Icon: CircleCheckBig, tone: "text-[#12b886]", selected: "border-[#12b886] bg-[#f2fffa]" },
  PARTIALLY_AVAILABLE: { label: "PARTIALLY AVAILABLE", description: "Some services or regions may be temporarily unavailable.", Icon: CircleAlert, tone: "text-[#f0a21a]", selected: "border-[#f0a21a] bg-[#fffaf0]" },
  HIGH_DEMAND: { label: "HIGH DEMAND", description: "App operates normally but shows a high-demand warning banner.", Icon: Megaphone, tone: "text-[#ef7f3b]", selected: "border-[#ef7f3b] bg-[#fff7f2]" },
  MAINTENANCE: { label: "MAINTENANCE", description: "App is locked. Users see a maintenance screen and cannot interact.", Icon: Wrench, tone: "text-[#e25368]", selected: "border-[#e25368] bg-[#fff7f8]" },
};
const serviceStates = [
  "AVAILABLE",
  "PREPARING",
  "HIGH_DEMAND",
  "TEMPORARILY_UNAVAILABLE",
  "DISABLED",
];
// Matches the services implemented in the signed customer application. This
// keeps operations usable while a backend catalog migration is still empty or
// a server instance is in the middle of a rollout.
const CUSTOMER_SERVICE_CATALOG: ServiceSummary[] = [
  ["ac", "AC Repair & Service", "AC inspection, cleaning, gas refilling, performance check, and repair replacement."],
  ["electrician", "Electrician", "Switchboard, wiring, fan, MCB, socket, inverter, and urgent electrical repair."],
  ["plumbing", "Plumber", "Tap, sink, flush tank, blocked drain, water motor, leakage, and pipe repair."],
  ["carpenter", "Carpenter", "Door, lock, curtain rod, furniture assembly, wall shelf, and cabinet fixes."],
  ["painting", "Painting", "Wall painting, touch-ups, damp patch repair, rental move-out paint, and finish work."],
  ["interior", "Interior Design", "Consultation for room planning, furniture placement, lighting, and home styling."],
  ["roadside", "Roadside Assistance", "Emergency roadside help, jump-start support, towing coordination, and tyre help."],
  ["cleaning", "Cleaning Services", "Home and office cleaning, bathroom cleaning, sofa cleaning, and deep cleaning."],
  ["laundry", "Laundry", "Clothes washing, ironing, dry cleaning pickup, stain care, and doorstep laundry service."],
  ["pest", "Pest Control", "Safe pest treatment for home, kitchen, bathroom, and office spaces."],
  ["appliances", "Appliances", "Washing machine, refrigerator, microwave, RO, chimney, and geyser inspection."],
  ["ro", "RO Service", "RO water purifier inspection, filter change, leakage repair, servicing, and installation."],
].map(([serviceCategory, name, description]) => ({
  _id: `catalog:${serviceCategory}`,
  serviceCategory,
  name,
  description,
  isActive: true,
  availability: "AVAILABLE",
  availabilityMessage: "",
}));

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
    | "ui"
    | "announcements"
    | "banners"
    | "audit"
  >("status");
  const [draft, setDraft] = useState<ControlConfig>(defaults);
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState<Item | null>(null);
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();
  const activeDraftApp = useRef<"customer" | "partner">("customer");
  const draftRevision = useRef(0);
  const draftSnapshot = useRef<ControlConfig>(defaults);
  // Persist each draft patch in order. Without this, two quick select changes
  // can finish out of order and make the UI (or a publish) use an old value.
  const draftSaveQueue = useRef<Promise<unknown>>(Promise.resolve());
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
    // Network data is only the initial source. Once the admin has made a
    // local selection, a late/stale overview response must never roll it back.
    if (overview.data?.draft && draftRevision.current === 0) {
      draftSnapshot.current = overview.data.draft;
      setDraft(overview.data.draft);
    }
  }, [overview.data?.draft]);
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
    mutationFn: ({ section, value, app }: { section: string; value: unknown; app: "customer" | "partner"; revision: number }) =>
      api<{ draft: ControlConfig }>(`/draft?app=${app}`, {
        method: "PATCH",
        body: JSON.stringify({ section, value }),
      }),
    onSuccess: (result, request) => {
      setMessage("Draft saved. Publish when ready.");
      if (request.app === activeDraftApp.current && request.revision === draftRevision.current) {
        draftSnapshot.current = result.draft;
        setDraft(result.draft);
        queryClient.setQueryData(["app-control-overview", request.app], (previous: typeof overview.data) =>
          previous ? { ...previous, draft: result.draft } : previous,
        );
      }
    },
    onError: (error: Error) => setMessage(error.message),
  });
  const publish = useMutation({
    mutationFn: async () => {
      await draftSaveQueue.current;
      return api<{ ok: boolean }>(controlPath("/publish"), { method: "POST" });
    },
    onSuccess: () => {
      setMessage(`Published to ${selectedApp} configuration.`);
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
  const config = draft;
  const setSection = (section: keyof ControlConfig, value: unknown) => {
    // Update the visual draft first. The serialized save queue then persists
    // the exact state in order, so changing several services cannot make an
    // earlier network response overwrite a later selection.
    const revision = ++draftRevision.current;
    const next = { ...draftSnapshot.current, [section]: value };
    draftSnapshot.current = next;
    setDraft(next);
    const app = selectedApp;
    draftSaveQueue.current = draftSaveQueue.current
      .catch(() => undefined)
      .then(() => save.mutateAsync({ section, value, app, revision }));
  };
  const displayedItems = useMemo(() => items.data?.items || [], [items.data]);
  const tabs: Array<typeof tab> = selectedApp === "partner"
    ? ["status", "ui", "features", "updates", "announcements", "audit"]
    : ["status", "launch", "services", "ui", "features", "updates", "announcements", "banners", "audit"];
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
            {(["customer", "partner"] as const).map((app) => <button key={app} onClick={() => { activeDraftApp.current = app; draftRevision.current = 0; draftSnapshot.current = defaults; setDraft(defaults); setSelectedApp(app); }} className={cn("rounded-md px-3 py-2 capitalize", selectedApp === app && "bg-[#fff0f4] text-[#bd1749]")}>{app} app</button>)}
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
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-2xl border border-[#f0d6dc] bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black">App Status Override</h2>
            <p className="mt-1 max-w-xl text-sm leading-5 text-[#667085]">
              Select the operational status to force-broadcast to all customer devices. This overrides normal API availability.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {modes.map((mode) => {
                const detail = modeDetails[mode];
                const Icon = detail.Icon;
                const selected = config.appStatus.mode === mode;
                return <button
                  key={mode}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setSection("appStatus", { ...config.appStatus, mode })}
                  className={cn(
                    "min-h-28 rounded-xl border-2 p-4 text-left transition hover:border-[#f3a1b9]",
                    selected ? detail.selected : "border-[#efd7dd] bg-white",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Icon size={19} className={detail.tone} />
                    <span className="text-xs font-black tracking-wide text-[#30343b]">{detail.label}</span>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-[#667085]">{detail.description}</p>
                </button>;
              })}
            </div>
          </div>
          <Preview config={config} />
        </section>
      )}
      {tab === "launch" && (() => {
        const publishedLaunch = overview.data?.published.launch.enabled ?? false;
        const draftLaunch = config.launch.enabled;
        const hasChanges = Boolean(overview.data) && publishedLaunch !== draftLaunch;
        const setLaunchScreen = (enabled: boolean) => setSection("launch", { ...config.launch, enabled });
        const publishedLabel = publishedLaunch ? "Launch Screen" : "Customer App Open";
        const draftLabel = draftLaunch ? "Launch Screen" : "Customer App Open";
        return <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div className="space-y-4">
            <div className={cn("rounded-xl border px-4 py-3", publishedLaunch ? "border-[#f5d7a6] bg-[#fff9ed]" : "border-[#b9e8da] bg-[#effcf8]")}>
              <div className="flex items-center gap-2 text-sm font-black text-[#344054]">
                <span className={publishedLaunch ? "text-[#c97800]" : "text-[#078a61]"}>{publishedLaunch ? "◉" : "●"}</span>
                {publishedLaunch ? "Customer Launch Screen is Active" : "Customer App is Open"}
              </div>
              <p className="mt-1 text-xs leading-5 text-[#667085]">{publishedLaunch ? "Customers see the holding screen and cannot create bookings. This is the published state." : "Customers can currently access the app and create bookings. This is the published state."}</p>
            </div>
            <p className="pt-1 text-[11px] font-black tracking-wide text-[#7a4d57]">WHAT SHOULD CUSTOMERS SEE?</p>
            <button type="button" aria-pressed={draftLaunch} onClick={() => setLaunchScreen(true)} className={cn("w-full rounded-xl border-2 p-4 text-left transition", draftLaunch ? "border-[#f32368] bg-[#fff8fa]" : "border-[#f1d6dc] bg-white hover:border-[#f4a2b9]")}>
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#e9f1ff] text-xl">▯</span>
                <span><span className="block text-sm font-black text-[#344054]">Show Launch Screen</span><span className="mt-1 block text-xs leading-5 text-[#667085]">Customers will see the launch screen when they open the app. Customer bookings remain unavailable.</span></span>
                {draftLaunch && <span className="ml-auto rounded bg-[#fff0f4] px-2 py-1 text-[10px] font-black text-[#bd1749]">Selected</span>}
              </div>
            </button>
            <button type="button" aria-pressed={!draftLaunch} onClick={() => setLaunchScreen(false)} className={cn("w-full rounded-xl border-2 p-4 text-left transition", !draftLaunch ? "border-[#078a61] bg-[#f5fffb]" : "border-[#f1d6dc] bg-white hover:border-[#a5dfcc]")}>
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#dff5ed] text-xl">🚀</span>
                <span><span className="flex items-center gap-2 text-sm font-black text-[#344054]">Open Customer App {!draftLaunch && <span className="rounded bg-[#dff5ed] px-2 py-1 text-[10px] text-[#067647]">Currently active</span>}</span><span className="mt-1 block text-xs leading-5 text-[#667085]">Remove the launch screen and allow customers to access the app and create bookings.</span></span>
              </div>
            </button>
          </div>
          <aside className="space-y-4">
            <div className="rounded-xl border border-[#f1cbd4] bg-white p-4 shadow-sm">
              <p className="text-[10px] font-black tracking-wide text-[#7a4d57]">PUBLISH STATUS</p>
              <div className="mt-4 space-y-3 text-xs text-[#667085]">
                <p className="flex justify-between gap-3"><span>Published:</span><span className="font-bold text-[#344054]"><i className="mr-1 text-[#078a61]">●</i>{publishedLabel}</span></p>
                <p className="flex justify-between gap-3"><span>Draft:</span><span className="font-bold text-[#344054]"><i className={cn("mr-1", hasChanges ? "text-[#c97800]" : "text-[#078a61]")}>●</i>{draftLabel}</span></p>
              </div>
              <button type="button" onClick={() => publish.mutate()} disabled={!hasChanges || publish.isPending} className="mt-5 h-10 w-full rounded-lg bg-[#f32368] text-xs font-black text-white disabled:bg-[#e7effc] disabled:text-[#a6afbd]">{publish.isPending ? "Publishing…" : "Publish changes"}</button>
              <p className="mt-3 text-center text-[10px] font-bold text-[#98a2b3]">{hasChanges ? "Pending changes need publishing" : "No pending changes"}</p>
            </div>
            <div className="rounded-xl border border-[#cbdcf8] bg-[#eaf2ff] p-4 text-xs leading-5 text-[#475467]">
              <p className="font-black text-[#344054]">💡 How Launch Control Works</p>
              <ol className="mt-3 list-decimal space-y-2 pl-4"><li><b>Show Launch Screen:</b> Holds customer bookings.</li><li><b>Open Customer App:</b> Allows customers to browse and book.</li><li><b>Publish changes:</b> Sends the draft state live to customer devices.</li></ol>
            </div>
          </aside>
        </section>;
      })()}
      {tab === "services" && (
        <ServiceControls
          config={config}
          input={input}
          services={overview.data?.services?.length ? overview.data.services : CUSTOMER_SERVICE_CATALOG}
          saving={save.isPending}
          onChange={(services) => setSection("services", services)}
        />
      )}
      {tab === "ui" && (
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_310px]">
          <div className="admin-card p-5">
            <h2 className="text-xl font-black">Remote UI Manager</h2>
            <p className="mt-1 text-sm text-[#667085]">Safely change supported copy and the accent color. These fields update the real selected app after Publish; native screens and code cannot be uploaded here.</p>
            <div className="mt-5 grid gap-3">
              <label className="text-xs font-bold text-[#667085]">Home headline<input className={cn(input, "mt-1")} value={config.ui.homeTitle} placeholder={selectedApp === "partner" ? "Welcome back" : "Trusted home services"} onChange={(e) => setDraft({ ...config, ui: { ...config.ui, homeTitle: e.target.value } })} onBlur={() => setSection("ui", draft.ui)} /></label>
              <label className="text-xs font-bold text-[#667085]">Home subtitle<input className={cn(input, "mt-1")} value={config.ui.homeSubtitle} placeholder="A short message shown in the home experience" onChange={(e) => setDraft({ ...config, ui: { ...config.ui, homeSubtitle: e.target.value } })} onBlur={() => setSection("ui", draft.ui)} /></label>
              <div className="rounded-lg border border-[#e6eaf2] p-3"><p className="text-xs font-bold text-[#667085]">Visible home sections</p><div className="mt-2 flex flex-wrap gap-2">{(selectedApp === "partner" ? ["online", "stats", "recent_requests"] : ["hero", "announcements", "quick_services", "commercial", "popular_services", "more_services", "feature_strip"]).map((section) => <label key={section} className="flex items-center gap-1 text-xs"><input type="checkbox" checked={!config.ui.hiddenSections.includes(section)} onChange={(e) => { const hiddenSections = e.target.checked ? config.ui.hiddenSections.filter((item) => item !== section) : [...config.ui.hiddenSections, section]; setSection("ui", { ...config.ui, hiddenSections }); }} />{section.replace(/_/g, " ")}</label>)}</div></div>
            </div>
          </div>
          <aside className="admin-card h-fit border-t-4 border-[#f32368] p-5"><p className="text-xs font-bold text-[#667085]">Draft preview</p><h3 className="mt-3 text-xl font-black">{config.ui.homeTitle || (selectedApp === "partner" ? "Welcome back" : "Home services at your doorstep")}</h3><p className="mt-2 text-sm text-[#667085]">{config.ui.homeSubtitle || "Your published app content will appear here."}</p></aside>
        </section>
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
  const selected = modeDetails[mode] || modeDetails.LIVE;
  const Icon = selected.Icon;
  const blocking = mode === "HIGH_DEMAND" || mode === "MAINTENANCE";
  const details = mode === "MAINTENANCE"
    ? { title: "ApnaServo is Under Maintenance", message: "We are currently performing some maintenance to improve your experience.", booking: "Booking blocked", screen: "Maintenance popup" }
    : mode === "HIGH_DEMAND"
      ? { title: "App is facing high demand", message: "We are currently receiving a high number of service requests.", booking: "Booking paused", screen: "High-demand popup" }
      : mode === "PARTIALLY_AVAILABLE"
        ? { title: "ApnaServo is partially available", message: "Some services may be temporarily unavailable.", booking: "Booking available", screen: "Customer home" }
        : { title: "ApnaServo is live", message: "Your trusted home services app.", booking: "Booking available", screen: "Customer home" };
  return (
    <aside className="rounded-2xl border border-[#f3d4dd] bg-[#fffafb] p-5">
      <p className="text-xs font-black text-[#f32368]">LIVE CUSTOMER PREVIEW</p>
      <div className="mt-3 flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-black text-[#344054]">
        <Icon size={16} className={selected.tone} />
        <span>USER SEES: {details.screen}</span>
      </div>
      <div className="mx-auto mt-4 w-full max-w-[280px] rounded-[2.25rem] border-[6px] border-[#e5e7eb] bg-white p-2 shadow-md">
        <div className="mx-auto h-5 w-24 rounded-b-xl bg-[#e5e7eb]" />
        <div className="mt-1 min-h-[360px] overflow-hidden rounded-[1.65rem] bg-[#fafcff] p-4">
          <div className="flex items-center gap-2 text-sm font-black text-[#bd1749]"><Rocket size={17} /> ApnaServo</div>
          {blocking ? (
            <div className="mt-8 rounded-2xl bg-white px-4 py-6 text-center shadow-sm ring-1 ring-[#f5dce3]">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#fff0f4]"><Icon size={29} className={selected.tone} /></div>
              <h3 className="mt-4 text-lg font-black leading-6 text-[#1d2939]">{details.title}</h3>
              <p className="mt-3 text-xs leading-5 text-[#667085]">{details.message}</p>
              <p className="mt-5 rounded-lg bg-[#f32368] px-3 py-2 text-xs font-black text-white">{mode === "MAINTENANCE" ? "Okay, Got It" : "Okay"}</p>
            </div>
          ) : (
            <>
              <p className="mt-7 text-xl font-black text-[#1d2939]">Hi, Rahul 👋</p>
              <p className="mt-1 text-sm text-[#667085]">How can we help you today?</p>
              <div className="mt-5 rounded-xl border border-[#edf0f6] bg-white px-3 py-3 text-xs text-[#98a2b3]">Search for services...</div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {['AC Repair', 'Electrician', 'Cleaning', 'Plumbing'].map((service) => <div key={service} className="rounded-xl bg-white p-3 text-center text-[11px] font-black text-[#344054] shadow-sm">{service}</div>)}
              </div>
              <p className="mt-6 rounded-lg bg-[#e8fff7] px-3 py-2 text-center text-xs font-black text-[#067647]">{details.booking}</p>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
function ServiceControls({
  config,
  input,
  services,
  saving,
  onChange,
}: {
  config: ControlConfig;
  input: string;
  services: ServiceSummary[];
  saving: boolean;
  onChange: (value: ControlConfig["services"]) => void;
}) {
  const [selected, setSelected] = useState("");
  const [filter, setFilter] = useState("");
  const visible = services.filter((service) =>
    `${service.name} ${service.serviceCategory}`
      .toLowerCase()
      .includes(filter.toLowerCase()),
  );
  const selectedService = services.find((service) => service.serviceCategory === selected);
  const key = selectedService?.serviceCategory || "";
  const item = config.services[key] || {
    status:
      selectedService?.availability ||
      (selectedService?.isActive === false ? "DISABLED" : "AVAILABLE"),
    message: selectedService?.availabilityMessage || "",
  };
  const save = (patch: Partial<typeof item>) =>
    key && onChange({ ...config.services, [key]: { ...item, ...patch } });
  const stateFor = (service: ServiceSummary) =>
    config.services[service.serviceCategory]?.status ||
    service.availability ||
    (service.isActive === false ? "DISABLED" : "AVAILABLE");
  const labelFor = (state: string) => state === "TEMPORARILY_UNAVAILABLE" || state === "DISABLED" ? "Not available" : state.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  const blocksBooking = (state: string) => ["PREPARING", "TEMPORARILY_UNAVAILABLE", "DISABLED", "HIGH_DEMAND"].includes(state);
  const counts = services.reduce(
    (total, service) => {
      const state = stateFor(service);
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
            "Not available",
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
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="bg-[#fbfcfe] text-xs text-[#667085]">
                <tr>
                  <th className="px-5 py-4">Service</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((service) => {
                  const state = stateFor(service);
                  const isSelected = selected === service.serviceCategory;
                  return (
                    <tr
                      key={service._id}
                      onClick={() => setSelected(service.serviceCategory)}
                      className={cn("cursor-pointer border-t border-[#edf0f6] transition hover:bg-[#fff7f9]", isSelected && "bg-[#fff1f5]")}
                    >
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
                          {labelFor(state)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelected(service.serviceCategory);
                          }}
                          className={cn("rounded-lg border px-3 py-2 text-xs font-black transition", isSelected ? "border-[#f32368] bg-[#f32368] text-white" : "border-[#e6eaf2] hover:border-[#f32368] hover:text-[#bd1749]")}
                        >
                          {isSelected ? "Selected" : "Change Status"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {!visible.length && (
                  <tr>
                    <td
                      colSpan={3}
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
          <h3 className="text-lg font-black">{selectedService?.name || "Service details"}</h3>
          {selectedService ? (
            <div className="mt-4 space-y-4">
              <p className="text-sm text-[#667085]">{selectedService.description || "Set the published customer booking experience for this real service."}</p>
              <div>
                <p className="text-xs font-black text-[#667085]">CHOOSE CUSTOMER STATUS</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {serviceStates.filter((state) => state !== "DISABLED").map((state) => (
                    <button
                      key={state}
                      type="button"
                      onClick={() => save({ status: state })}
                      className={cn(
                        "rounded-lg border px-2 py-2 text-xs font-black transition",
                        item.status === state
                          ? "border-[#f32368] bg-[#fff0f4] text-[#bd1749]"
                          : "border-[#e6eaf2] bg-white text-[#475467] hover:border-[#f3a1b9]",
                      )}
                    >
                      {labelFor(state)}
                    </button>
                  ))}
                </div>
              </div>
              <p className="rounded-lg bg-[#f7f8fa] px-3 py-2 text-xs font-bold text-[#344054]">
                Selected: {selectedService.name} · {labelFor(item.status)} {saving ? "· Saving draft…" : "· Draft saved"}
              </p>
              <div className={cn("rounded-xl border p-3 text-xs", item.status === "HIGH_DEMAND" ? "border-[#f6d2d7] bg-[#fff7f8]" : blocksBooking(item.status) ? "border-[#f5dfb7] bg-[#fffaf0]" : "border-[#bfe9d8] bg-[#f3fffa]")}>
                <p className="font-black text-[#344054]">Customer preview</p>
                <p className="mt-1 leading-5 text-[#667085]">{item.status === "HIGH_DEMAND" ? "High demand for this service popup. Booking is blocked only for this service." : blocksBooking(item.status) ? "We're Preparing This Service screen. Booking is blocked only for this service." : "Normal booking flow. This service remains available to customers."}</p>
              </div>
              <label className="block text-xs font-bold text-[#667085]">
                Customer message
                <textarea
                  className="mt-1 min-h-24 w-full rounded-lg border border-[#e6eaf2] p-3 text-sm"
                  value={item.message}
                  onChange={(event) => save({ message: event.target.value })}
                placeholder="Optional customer message"
                />
              </label>
              <p className="text-xs text-[#667085]">Status updates immediately in this draft. Click Publish changes once to broadcast it to customer devices.</p>
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
