import React, { useCallback, useEffect, useState } from "react";
import { Loader2, Power } from "lucide-react";
import { API_URL } from "../lib/api";

type State = "checking" | "online" | "asleep" | "waking";

async function ping(timeoutMs: number) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(`${API_URL}/api/system/status`, { signal: ctrl.signal });
    return r.ok || r.status === 503;
  } finally {
    clearTimeout(t);
  }
}

// Free-tier API sleeps when idle; lets officials boot it before signing in.
const ServerWake: React.FC = () => {
  const [state, setState] = useState<State>("checking");
  const [secs, setSecs] = useState(0);

  useEffect(() => {
    ping(8000)
      .then((ok) => setState(ok ? "online" : "asleep"))
      .catch(() => setState("asleep"));
  }, []);

  const wake = useCallback(async () => {
    setState("waking");
    const started = Date.now();
    const tick = setInterval(() => setSecs(Math.round((Date.now() - started) / 1000)), 1000);
    try {
      while (Date.now() - started < 120_000) {
        try {
          if (await ping(25000)) return setState("online");
        } catch {
          await new Promise((r) => setTimeout(r, 3000));
        }
      }
      setState("asleep");
    } finally {
      clearInterval(tick);
    }
  }, []);

  const dot = state === "online" ? "bg-green-500" : state === "asleep" ? "bg-red-500" : "bg-amber-500 animate-pulse";
  return (
    <div className="flex items-center justify-between gap-3 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
      <span className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${dot}`} />
        {state === "checking" && "Checking server…"}
        {state === "online" && "Server online"}
        {state === "asleep" && "Server asleep or offline"}
        {state === "waking" && `Waking server… ${secs}s (up to ~60s)`}
      </span>
      {(state === "asleep" || state === "waking") && (
        <button type="button" onClick={wake} disabled={state === "waking"} className="inline-flex items-center gap-1 font-semibold text-green-700 disabled:opacity-60">
          {state === "waking" ? <Loader2 size={14} className="animate-spin" /> : <Power size={14} />} Wake server
        </button>
      )}
    </div>
  );
};

export default ServerWake;
