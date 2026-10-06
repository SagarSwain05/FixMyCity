import { useEffect, useSyncExternalStore } from "react";
import { fetchSystemStatus, reconnectDatabase, wakeServer, type SystemStatus } from "./system";

export type Overall = "checking" | "ok" | "degraded" | "down" | "unreachable" | "waking";

interface State {
  status: SystemStatus | null;
  overall: Overall;
  checkedAt: Date | null;
  latency: number | null;
  wakeSeconds: number;
  message: string | null;
}

// One store shared by every indicator on the page, so the header pill and the
// panel always agree (e.g. both show "waking" during a cold start).
let state: State = { status: null, overall: "checking", checkedAt: null, latency: null, wakeSeconds: 0, message: null };
const listeners = new Set<() => void>();
const set = (patch: Partial<State>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};
let busy = false;
let lastCheck = 0;

async function check() {
  if (busy) return;
  lastCheck = Date.now();
  const t = performance.now();
  try {
    const s = await fetchSystemStatus();
    set({ status: s, overall: s.status, checkedAt: new Date(), latency: Math.round(performance.now() - t) });
  } catch {
    set({ overall: "unreachable", checkedAt: new Date() });
  }
}

async function wake() {
  if (busy) return;
  busy = true;
  set({ overall: "waking", wakeSeconds: 0, message: null });
  try {
    const s = await wakeServer((wakeSeconds) => set({ wakeSeconds }));
    set({ status: s, overall: s.status, checkedAt: new Date(), message: "Server is up and responding." });
  } catch (e) {
    set({ overall: "unreachable", message: (e as Error).message });
  } finally {
    busy = false;
  }
}

async function reconnect() {
  if (busy) return;
  busy = true;
  set({ message: "Reconnecting database…" });
  try {
    set({ message: (await reconnectDatabase()).message });
  } catch (e) {
    set({ message: (e as Error).message });
  } finally {
    busy = false;
  }
  await check();
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

const POLL_MS = 60_000;
let pollers = 0;
let timer: ReturnType<typeof setInterval> | null = null;

export function useSystemStatus() {
  const s = useSyncExternalStore(subscribe, () => state);
  useEffect(() => {
    if (pollers++ === 0) {
      if (Date.now() - lastCheck > 5000) check();
      timer = setInterval(check, POLL_MS);
    }
    return () => {
      if (--pollers === 0 && timer) clearInterval(timer);
    };
  }, []);
  return { ...s, check, wake, reconnect };
}
