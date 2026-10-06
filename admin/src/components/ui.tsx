import React from "react";
import { Loader2 } from "lucide-react";
import type { IssueStatus, Urgency } from "../lib/api";
import { STATUS_LABEL, STATUS_STYLE, URGENCY_LABEL } from "../lib/format";

export const Spinner: React.FC<{ label?: string; className?: string }> = ({ label, className = "" }) => (
  <div className={`flex flex-col items-center justify-center py-12 text-gray-500 ${className}`}>
    <Loader2 className="animate-spin" size={28} />
    {label && <p className="mt-2 text-sm">{label}</p>}
  </div>
);

export const Card: React.FC<{ title?: string; subtitle?: string; right?: React.ReactNode; className?: string; children: React.ReactNode }> = ({
  title,
  subtitle,
  right,
  className = "",
  children,
}) => (
  <section className={`bg-white rounded-xl border border-gray-200 shadow-sm ${className}`}>
    {(title || right) && (
      <header className="flex items-start justify-between gap-3 px-5 pt-4 pb-2">
        <div>
          {title && <h2 className="font-semibold text-gray-900">{title}</h2>}
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        {right}
      </header>
    )}
    <div className="px-5 pb-5 pt-2">{children}</div>
  </section>
);

export const StatusBadge: React.FC<{ status: IssueStatus }> = ({ status }) => (
  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${STATUS_STYLE[status]}`}>{STATUS_LABEL[status]}</span>
);

const URG_STYLE: Record<Urgency, string> = {
  low: "text-gray-600 bg-gray-100",
  medium: "text-amber-800 bg-amber-50",
  high: "text-orange-800 bg-orange-100",
  critical: "text-red-800 bg-red-100",
};
export const UrgencyBadge: React.FC<{ urgency: Urgency }> = ({ urgency }) => (
  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${URG_STYLE[urgency]}`}>{URGENCY_LABEL[urgency]}</span>
);

export const ErrorBanner: React.FC<{ message: string; onRetry?: () => void }> = ({ message, onRetry }) => (
  <div className="flex items-center justify-between gap-3 bg-red-50 text-red-700 text-sm p-3 rounded-lg border border-red-200">
    <span>{message}</span>
    {onRetry && (
      <button onClick={onRetry} className="font-medium underline">
        Retry
      </button>
    )}
  </div>
);

export const PageTitle: React.FC<{ title: string; subtitle?: string; right?: React.ReactNode }> = ({ title, subtitle, right }) => (
  <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
    <div>
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
    {right}
  </div>
);

export const input = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white";
export const select = "px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500";
export const btn = "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed transition-colors";
export const btnPrimary = `${btn} bg-green-600 hover:bg-green-700 text-white`;
export const btnSecondary = `${btn} bg-white border border-gray-300 text-gray-800 hover:bg-gray-50`;
export const btnDanger = `${btn} bg-white border border-red-300 text-red-700 hover:bg-red-50`;

export function hours(h: number | null | undefined) {
  if (h === null || h === undefined) return "–";
  if (h < 48) return `${h.toFixed(1)} h`;
  return `${(h / 24).toFixed(1)} d`;
}
