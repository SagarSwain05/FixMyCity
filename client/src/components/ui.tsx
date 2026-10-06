import React from "react";
import { Loader2 } from "lucide-react";
import type { IssueStatus } from "../lib/api";
import { STATUS_LABEL, STATUS_STYLE } from "../lib/format";

export const Spinner: React.FC<{ label?: string; className?: string }> = ({ label, className = "" }) => (
  <div className={`flex flex-col items-center justify-center py-10 text-gray-500 dark:text-gray-400 ${className}`}>
    <Loader2 className="animate-spin" size={28} />
    {label && <p className="mt-2 text-sm">{label}</p>}
  </div>
);

export const EmptyState: React.FC<{ icon?: React.ReactNode; title: string; text?: string; action?: React.ReactNode }> = ({
  icon,
  title,
  text,
  action,
}) => (
  <div className="text-center py-10 px-6 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
    {icon && <div className="mx-auto mb-3 text-gray-400 flex justify-center">{icon}</div>}
    <p className="font-medium text-gray-900 dark:text-white">{title}</p>
    {text && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{text}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const StatusBadge: React.FC<{ status: IssueStatus; className?: string }> = ({ status, className = "" }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${STATUS_STYLE[status]} ${className}`}>
    {STATUS_LABEL[status]}
  </span>
);

export const ErrorBanner: React.FC<{ message: string; onRetry?: () => void }> = ({ message, onRetry }) => (
  <div className="flex items-center justify-between gap-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm p-3 rounded-lg">
    <span>{message}</span>
    {onRetry && (
      <button onClick={onRetry} className="font-medium underline shrink-0">
        Retry
      </button>
    )}
  </div>
);

export const PageHeader: React.FC<{ title: string; subtitle?: string; right?: React.ReactNode }> = ({ title, subtitle, right }) => (
  <div className="flex items-start justify-between gap-3 mb-5">
    <div>
      <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
      {subtitle && <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
    {right}
  </div>
);

export const inputClass =
  "w-full px-3.5 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-gray-900 dark:text-white placeholder:text-gray-400";

export const btnPrimary =
  "inline-flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-medium px-4 py-2.5 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed transition-colors";

export const btnSecondary =
  "inline-flex items-center justify-center gap-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium px-4 py-2.5 rounded-lg disabled:opacity-60 transition-colors";
