import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FileText } from "lucide-react";
import { api, type Issue } from "../lib/api";
import IssueCard from "../components/IssueCard";
import { EmptyState, ErrorBanner, PageHeader, Spinner, btnPrimary } from "../components/ui";

const FILTERS = [
  { id: "", label: "All" },
  { id: "open", label: "Open" },
  { id: "resolved,closed", label: "Resolved" },
  { id: "rejected", label: "Rejected" },
];

const MyReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const status = params.get("status") === "resolved" ? "resolved,closed" : params.get("status") || "";
  const [items, setItems] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .listIssues({ mine: true, status, limit: 100 })
      .then((r) => setItems(r.items))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [status]);

  useEffect(load, [load]);

  return (
    <div>
      <PageHeader title="My reports" subtitle="Track everything you've reported" />
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setParams(f.id ? { status: f.id } : {})}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ${
              status === f.id ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900" : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
      {error && <ErrorBanner message={error} onRetry={load} />}
      {loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<FileText size={32} />}
          title="Nothing here yet"
          text="Reports you submit will show up here with live status."
          action={
            <button className={btnPrimary} onClick={() => navigate("/report")}>
              Report an issue
            </button>
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((i) => (
            <IssueCard key={i.id} issue={i} onClick={() => navigate(`/issues/${i.id}`)} />
          ))}
        </div>
      )}
    </div>
  );
};

export default MyReportsPage;
