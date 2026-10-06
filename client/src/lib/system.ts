import { API_URL } from "./api";

export type CheckStatus = "ok" | "degraded" | "down" | "disabled";
export interface Check {
  status: CheckStatus;
  detail?: string;
  latencyMs?: number;
}
export interface SystemStatus {
  status: "ok" | "degraded" | "down";
  checkedAt: string;
  api: { status: "ok"; uptimeSeconds: number; version: string; node: string; memoryMb: number; environment: string };
  database: Check;
  storage: Check;
  email: Check;
  realtime: Check;
}

export interface PublicStats {
  totals: {
    reports: number;
    resolved: number;
    open: number;
    communityVerified: number;
    resolutionRate: number;
    avgResolutionHours: number | null;
    citizens: number;
    departments: number;
    wards: number;
  };
  recentResolved: Array<{
    id: string;
    title: string;
    category: string;
    categoryLabel: string;
    ward?: string;
    department?: { name: string; code: string; color: string } | null;
    resolvedAt: string;
    hoursToResolve: number | null;
  }>;
  byCategory: Array<{ category: string; label: string; count: number }>;
}

async function getJson<T>(path: string, timeoutMs: number, init: RequestInit = {}): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_URL}/api${path}`, { ...init, signal: ctrl.signal });
    const body = await res.json().catch(() => null);
    if (!res.ok && !body) throw new Error(`HTTP ${res.status}`);
    return body as T;
  } finally {
    clearTimeout(timer);
  }
}

export const fetchSystemStatus = (timeoutMs = 8000) => getJson<SystemStatus>("/system/status", timeoutMs);
export const fetchPublicStats = (timeoutMs = 15000) => getJson<PublicStats>("/public/stats", timeoutMs);
export const reconnectDatabase = () => getJson<{ success: boolean; message: string }>("/system/reconnect", 30000, { method: "POST" });

// Free-tier hosting sleeps after inactivity; the first request boots it (~30-60 s).
// Keeps polling until the API answers or the deadline passes.
export async function wakeServer(onTick: (elapsedSeconds: number) => void, maxSeconds = 120): Promise<SystemStatus> {
  const started = Date.now();
  const tick = setInterval(() => onTick(Math.round((Date.now() - started) / 1000)), 1000);
  try {
    while (Date.now() - started < maxSeconds * 1000) {
      try {
        return await fetchSystemStatus(25000);
      } catch {
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
    throw new Error("The server did not respond within 2 minutes. It may be redeploying; try again shortly.");
  } finally {
    clearInterval(tick);
  }
}
