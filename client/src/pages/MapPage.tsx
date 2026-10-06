import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, type Category, type MapIssue } from "../lib/api";
import { CATEGORIES, CATEGORY_EMOJI, STATUS_COLOR, STATUS_LABEL } from "../lib/format";
import { usePosition } from "../lib/usePosition";
import IssueMap from "../components/IssueMap";
import { ErrorBanner, PageHeader } from "../components/ui";

const STATUS_FILTERS = [
  { id: "pending,verified,in-progress", label: "Open" },
  { id: "resolved,closed", label: "Resolved" },
  { id: "", label: "All" },
];

const MapPage: React.FC = () => {
  const navigate = useNavigate();
  const { position, center } = usePosition();
  const [issues, setIssues] = useState<MapIssue[]>([]);
  const [status, setStatus] = useState(STATUS_FILTERS[0].id);
  const [category, setCategory] = useState<Category | "">("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    api
      .mapIssues({ status, category })
      .then(setIssues)
      .catch((e) => setError(e.message));
  }, [status, category]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    issues.forEach((i) => (c[i.status] = (c[i.status] || 0) + 1));
    return c;
  }, [issues]);

  return (
    <div>
      <PageHeader title="Issue map" subtitle={`${issues.length} reports shown`} />
      <div className="flex flex-wrap gap-2 mb-3">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.label}
            onClick={() => setStatus(f.id)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium ${
              status === f.id ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900" : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
            }`}
          >
            {f.label}
          </button>
        ))}
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as Category | "")}
          aria-label="Filter by category"
          className="px-3 py-1.5 rounded-full text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {CATEGORY_EMOJI[c.value]} {c.label}
            </option>
          ))}
        </select>
      </div>
      {error && <ErrorBanner message={error} />}
      <IssueMap issues={issues} center={center} user={position} zoom={13} className="h-[calc(100vh-260px)] min-h-[380px]" onSelect={(i) => navigate(`/issues/${i.id}`)} />
      <div className="flex flex-wrap gap-3 mt-3 text-xs text-gray-600 dark:text-gray-300">
        {Object.entries(STATUS_LABEL).map(([s, label]) => (
          <span key={s} className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full" style={{ background: STATUS_COLOR[s as keyof typeof STATUS_COLOR] }} />
            {label} {counts[s] ? `(${counts[s]})` : ""}
          </span>
        ))}
      </div>
    </div>
  );
};

export default MapPage;
