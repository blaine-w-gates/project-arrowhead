import type { DataHealth } from "@/types/admin";
import { AdminApiError } from "@/types/admin";

// Default to "/pyapi" which is proxied by the Node server to the Python backend's "/api".
// Override via VITE_ADMIN_API_BASE when deploying with a different path.
export const API_BASE = (
  import.meta as ImportMeta & { env?: { VITE_ADMIN_API_BASE?: string } }
).env?.VITE_ADMIN_API_BASE ?? "/pyapi";

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
  let bodyJson: unknown = null;
  try {
    bodyText = await res.text();
    bodyJson = bodyText ? JSON.parse(bodyText) : null;
  } catch {
    // ignore JSON parse error; fall back to text
    void 0;
  }

  if (!res.ok) {
    let msg = bodyText || res.statusText;
    if (bodyJson && typeof bodyJson === "object") {
      const obj = bodyJson as { error?: unknown; message?: unknown };
      if (typeof obj.error === "string") msg = obj.error;
      else if (typeof obj.message === "string") msg = obj.message;
    }
    throw new AdminApiError(res.status, msg);
  }

  return bodyJson as DataHealth;
}
