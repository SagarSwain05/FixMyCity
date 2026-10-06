import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, CheckCircle2, AlertTriangle, XCircle, MinusCircle, Loader2, Power, RefreshCw, Database, X, Server, Image, Mail, Radio, Smartphone, LayoutDashboard } from "lucide-react";
import { useSystemStatus, type Overall } from "../lib/useSystemStatus";
import type { Check } from "../lib/system";
import { API_URL } from "../lib/api";

const ADMIN_URL = import.meta.env.VITE_ADMIN_URL || "http://localhost:5174";

const OVERALL: Record<Overall, { label: string; dot: string; pulse?: boolean }> = {
  checking: { label: "Checking systems…", dot: "bg-gray-400", pulse: true },
  ok: { label: "All systems operational", dot: "bg-green-500" },
  degraded: { label: "Partially degraded", dot: "bg-amber-500" },
  down: { label: "Database offline", dot: "bg-red-500" },
  unreachable: { label: "Server sleeping / offline", dot: "bg-red-500" },
  waking: { label: "Waking server…", dot: "bg-amber-500", pulse: true },
};

const Dot: React.FC<{ className: string; pulse?: boolean }> = ({ className, pulse }) => (
  <span className="relative flex w-2.5 h-2.5 shrink-0">
    {pulse && <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-60 ${className}`} />}
    <span className={`relative inline-flex rounded-full w-2.5 h-2.5 ${className}`} />
  </span>
);

const STATE_ICON = {
  ok: <CheckCircle2 size={16} className="text-green-600 dark:text-green-400" aria-hidden />,
  degraded: <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400" aria-hidden />,
  down: <XCircle size={16} className="text-red-600 dark:text-red-400" aria-hidden />,
  disabled: <MinusCircle size={16} className="text-gray-400" aria-hidden />,
};
const STATE_TEXT = { ok: "Operational", degraded: "Degraded", down: "Down", disabled: "Not configured" };

const Row: React.FC<{ icon: React.ElementType; name: string; check: Check | null; fallback?: string }> = ({ icon: Icon, name, check, fallback }) => (
  <li className="flex items-center gap-3 py-2.5">
    <Icon size={18} className="text-gray-500 dark:text-gray-400 shrink-0" aria-hidden />
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-gray-900 dark:text-white">{name}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
        {check ? [check.detail, check.latencyMs !== undefined ? `${check.latencyMs} ms` : null].filter(Boolean).join(" · ") || " " : fallback}
      </p>
    </div>
    {check ? (
      <span className="flex items-center gap-1.5 text-xs font-medium text-gray-700 dark:text-gray-200">
        {STATE_ICON[check.status]} {STATE_TEXT[check.status]}
      </span>
    ) : (
      <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
        <MinusCircle size={16} aria-hidden /> Unknown
      </span>
    )}
  </li>
);

function formatUptime(s: number) {
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
  return `${Math.floor(s / 86400)}d ${Math.floor((s % 86400) / 3600)}h`;
}

// Full status panel: per-service health plus wake/reconnect controls.
export const SystemStatusPanel: React.FC = () => {
  const { status, overall, checkedAt, latency, wakeSeconds, message, check, wake, reconnect } = useSystemStatus();
  const o = OVERALL[overall];
  const reachable = overall !== "unreachable" && overall !== "waking" && overall !== "checking";
  const unknown: Check | null = null;

  return (
    <div>
      <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700">
        <Dot className={o.dot} pulse={o.pulse} />
        <div className="flex-1">
          <p className="font-semibold text-gray-900 dark:text-white">{o.label}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {checkedAt ? `Checked ${checkedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : "Checking…"}
            {latency !== null && reachable ? ` · ${latency} ms round trip` : ""}
          </p>
        </div>
      </div>

      <ul className="divide-y divide-gray-100 dark:divide-gray-700 mt-2">
        <Row icon={Smartphone} name="Citizen app" check={{ status: "ok", detail: window.location.host }} />
        <Row
          icon={Server}
          name="API server"
          check={reachable && status ? { status: "ok", detail: `Up ${formatUptime(status.api.uptimeSeconds)} · v${status.api.version} · ${status.api.memoryMb} MB` } : overall === "checking" ? unknown : { status: "down", detail: overall === "waking" ? "Booting…" : "Not responding (likely asleep)" }}
          fallback="Checking…"
        />
        <Row icon={Database} name="Database (MongoDB Atlas)" check={reachable ? status?.database ?? null : null} fallback="Needs the API server" />
        <Row icon={Image} name="Media storage" check={reachable ? status?.storage ?? null : null} fallback="Needs the API server" />
        <Row icon={Mail} name="Email notifications" check={reachable ? status?.email ?? null : null} fallback="Needs the API server" />
        <Row icon={Radio} name="Realtime updates" check={reachable ? status?.realtime ?? null : null} fallback="Needs the API server" />
      </ul>

      {overall === "waking" && (
        <div className="mt-3">
          <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
            <div className="h-full bg-amber-500 transition-all duration-1000" style={{ width: `${Math.min(100, (wakeSeconds / 60) * 100)}%` }} />
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-300 mt-1.5">Cold start in progress: {wakeSeconds}s elapsed (usually 30–60 s on the free tier).</p>
        </div>
      )}
      {message && <p className="text-sm text-gray-700 dark:text-gray-200 mt-3">{message}</p>}

      <div className="flex flex-wrap gap-2 mt-4">
        {(overall === "unreachable" || overall === "waking") && (
          <button onClick={wake} disabled={overall === "waking"} className="flex-1 inline-flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2.5 rounded-lg">
            {overall === "waking" ? <Loader2 size={16} className="animate-spin" /> : <Power size={16} />}
            {overall === "waking" ? "Starting server…" : "Wake / restart server"}
          </button>
        )}
        {overall === "down" && (
          <button onClick={reconnect} className="flex-1 inline-flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg">
            <Database size={16} /> Reconnect database
          </button>
        )}
        <button onClick={check} disabled={overall === "waking"} className="inline-flex items-center justify-center gap-2 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-100 text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-60">
          <RefreshCw size={16} /> Re-check
        </button>
        <a href={ADMIN_URL} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-100 text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
          <LayoutDashboard size={16} /> Command center
        </a>
      </div>
      <p className="text-[11px] text-gray-400 mt-3 break-all">API: {API_URL}</p>
    </div>
  );
};

// Compact pill that opens the panel in a dialog. Used in headers and the landing page.
export const SystemStatusButton: React.FC<{ compact?: boolean; className?: string }> = ({ compact, className = "" }) => {
  const { overall } = useSystemStatus();
  const [open, setOpen] = useState(false);
  const o = OVERALL[overall];

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-800/70 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 hover:border-gray-300 ${className}`}
        aria-label={`System status: ${o.label}`}
      >
        <Dot className={o.dot} pulse={o.pulse} />
        {compact ? <Activity size={14} aria-hidden /> : <span className="whitespace-nowrap">{o.label}</span>}
      </button>
      {/* Portal: headers use backdrop-filter, which would otherwise trap position:fixed */}
      {createPortal(
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[1500] flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-label="System status">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              className="relative w-full sm:max-w-md bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-2xl p-5 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">System status</h2>
                <button onClick={() => setOpen(false)} aria-label="Close" className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400">
                  <X size={20} />
                </button>
              </div>
              <SystemStatusPanel />
            </motion.div>
          </div>
        )}
      </AnimatePresence>,
        document.body
      )}
    </>
  );
};
