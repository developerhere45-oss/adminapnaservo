import { fetchBackendJson } from "./backend";
export { resourceConfig } from "./resource-config";

type Row = Record<string, unknown>;
type ResourcePayload = { resource: string; rows: Row[]; metrics?: Record<string, unknown> };

function firstValue(...values: unknown[]) {
  return values.find((value) => value !== undefined && value !== null && String(value).trim() !== "") ?? "";
}

export function normalizeAdminRow(row: Row): Row {
  const customerName = firstValue(row.customerName, row.userName, row.fullName, row.ownerType === "user" ? row.ownerName : "", row.name);
  const customerPhone = firstValue(row.customerPhone, row.customerMobile, row.userMobile, row.mobileNumber, row.phone);
  const partnerName = firstValue(row.partnerName, row.assignedPartnerName, row.ownerType === "partner" ? row.ownerName : "");
  const partnerPhone = firstValue(row.partnerPhone, row.partnerMobile, row.assignedPartnerMobileNumber);

  return {
    ...row,
    customerName,
    customerPhone,
    userName: firstValue(row.userName, customerName),
    userMobile: firstValue(row.userMobile, customerPhone),
    fullName: firstValue(row.fullName, row.name, customerName),
    mobileNumber: firstValue(row.mobileNumber, row.phone, customerPhone),
    partnerName,
    partnerPhone,
    partnerMobile: firstValue(row.partnerMobile, partnerPhone),
    name: firstValue(row.name, row.fullName, row.ownerName),
    phone: firstValue(row.phone, row.mobileNumber),
  };
}

function normalizePayload(payload: ResourcePayload): ResourcePayload {
  return { ...payload, rows: Array.isArray(payload.rows) ? payload.rows.map(normalizeAdminRow) : [] };
}

export async function getOverview() {
  const [dashboard, devices, bookings] = await Promise.all([
    fetchBackendJson<Record<string, unknown>>("/api/admin/dashboard"),
    getResourceRows("devices").catch(() => ({ resource: "devices", rows: [] })),
    getResourceRows("bookings").catch(() => ({ resource: "bookings", rows: [] })),
  ]);
  const deviceRows = devices.rows;
  const bookingRows = bookings.rows;
  const cleaningRows = bookingRows.filter((row) => `${row.serviceCategory || ""} ${row.serviceName || ""}`.toLowerCase().includes("clean"));
  const completedCleaning = cleaningRows.filter((row) => String(row.status || "").toLowerCase() === "completed");
  const amount = (row: Row) => Number(row.finalServiceCost || row.amount || 0) || 0;

  return {
    ...dashboard,
    recentBookings: Array.isArray(dashboard.recentBookings) ? dashboard.recentBookings.map((row) => normalizeAdminRow(row as Row)) : [],
    recentComplaints: Array.isArray(dashboard.recentComplaints) ? dashboard.recentComplaints.map((row) => normalizeAdminRow(row as Row)) : [],
    recentPayments: Array.isArray(dashboard.recentPayments) ? dashboard.recentPayments.map((row) => normalizeAdminRow(row as Row)) : [],
    operationalBreakdown: {
      iosDevices: deviceRows.filter((row) => String(row.platform || "").toLowerCase() === "ios").length,
      iosCustomerDevices: deviceRows.filter((row) => String(row.platform || "").toLowerCase() === "ios" && String(row.ownerType || row.appType || "").toLowerCase() === "user").length,
      iosPartnerDevices: deviceRows.filter((row) => String(row.platform || "").toLowerCase() === "ios" && String(row.ownerType || row.appType || "").toLowerCase() === "partner").length,
      cleaningBookings: cleaningRows.length,
      cleaningCompleted: completedCleaning.length,
      cleaningPending: cleaningRows.filter((row) => !["completed", "cancelled", "canceled"].includes(String(row.status || "").toLowerCase())).length,
      cleaningRevenue: completedCleaning.reduce((sum, row) => sum + amount(row), 0),
    },
  };
}

export async function getResourceRows(resource: string, bearerToken?: string) {
  const payload = await fetchBackendJson<ResourcePayload>(`/api/admin/${resource}`, { bearerToken });
  return normalizePayload(payload);
}
