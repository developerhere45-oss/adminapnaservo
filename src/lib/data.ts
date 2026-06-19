import { dashboardData, moduleRows } from "./mock-data";
import { fetchBackendJson } from "./backend";
export { resourceConfig } from "./resource-config";

export async function getOverview() {
  return fetchBackendJson("/api/admin/dashboard", dashboardData);
}

export type ResourceKey = keyof typeof moduleRows;

export async function getResourceRows(resource: string) {
  const fallback = moduleRows[resource as ResourceKey] || [];
  const response = await fetchBackendJson<{ rows?: typeof fallback }>(`/api/admin/${resource}`, { rows: fallback });
  return response.rows || fallback;
}
