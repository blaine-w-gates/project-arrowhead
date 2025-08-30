import type { DataHealth } from "@/types/admin";
import { AdminApiError } from "@/types/admin";

export const API_BASE = (import.meta as any).env?.VITE_ADMIN_API_BASE ?? "/api";

export async function getDataHealth(adminKey: string): Promise<DataHealth> {
  if (!adminKey) {
    throw new AdminApiError(403, "Missing admin key");
  }
  const url = `${API_BASE}/admin/data-health`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "X-Admin-Key": adminKey,
    },
    credentials: "include",
  });

  let bodyText = "";
  let bodyJson: any = null;
  try {
    bodyText = await res.text();
    bodyJson = bodyText ? JSON.parse(bodyText) : null;
  } catch {
    // ignore JSON parse error; fall back to text
  }

  if (!res.ok) {
    const msg = bodyJson?.error || bodyText || res.statusText;
    throw new AdminApiError(res.status, msg);
  }

  return bodyJson as DataHealth;
}
