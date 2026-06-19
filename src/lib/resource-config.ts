export const resourceConfig: Record<string, { title: string; subtitle: string; permission: string; action: string }> = {
  bookings: {
    title: "Booking Management",
    subtitle: "Assign, reassign, cancel and track every booking timeline.",
    permission: "bookings:read",
    action: "Assign Technician",
  },
  partners: {
    title: "Service Partners",
    subtitle: "Verify technicians, manage skills, documents and performance.",
    permission: "technicians:manage",
    action: "Approve Partner",
  },
  users: {
    title: "User Management",
    subtitle: "Search customers, view profiles, block or unblock access.",
    permission: "users:read",
    action: "Export Users",
  },
  services: {
    title: "Service Management",
    subtitle: "Create service categories, base pricing, banners and availability.",
    permission: "services:read",
    action: "Add Service",
  },
  quotes: {
    title: "Quote Management",
    subtitle: "Compare technician quotes and flag suspicious pricing.",
    permission: "bookings:manage",
    action: "Review Quotes",
  },
  complaints: {
    title: "Complaints & Disputes",
    subtitle: "Investigate, resolve, refund or escalate support issues.",
    permission: "complaints:manage",
    action: "Resolve",
  },
  notifications: {
    title: "Notification Center",
    subtitle: "Send push, SMS and email updates with delivery history.",
    permission: "bookings:manage",
    action: "Send Notification",
  },
  banners: {
    title: "Banner Management",
    subtitle: "Upload, preview, publish and unpublish app banners.",
    permission: "services:read",
    action: "Upload Banner",
  },
  analytics: {
    title: "Analytics",
    subtitle: "Track users, retention, revenue and service category growth.",
    permission: "analytics:read",
    action: "Export Report",
  },
  "audit-logs": {
    title: "Audit Logs",
    subtitle: "Every admin action with timestamp, entity and IP address.",
    permission: "analytics:read",
    action: "Download Logs",
  },
  settings: {
    title: "Settings",
    subtitle: "Security, roles, commission and platform-level configuration.",
    permission: "analytics:read",
    action: "Save Changes",
  },
};
