import React, { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Download, Search, ThumbsUp, ShieldCheck, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { api, type Issue, type IssueFilters } from "../lib/api";
import { CATEGORIES, CATEGORY_EMOJI, STATUS_LABEL, timeAgo } from "../lib/format";
import { issuesToCsv, download } from "../lib/csv";
import { useDepartments } from "../lib/useDepartments";
import { getSocket } from "../lib/socket";
import IssueDrawer from "../components/IssueDrawer";
import { Card, ErrorBanner, PageTitle, Spinner, StatusBadge, UrgencyBadge, btnSecondary, input, select } from "../components/ui";
import { useAuth } from "../contexts/AuthContext";

const FILTER_KEYS = ["status", "category", "urgency", "department", "ward", "q", "sort", "from", "to"] as const;

const ReportsPage: React.FC<{ preset?: IssueFilters; title?: string; subtitle?: string }> = ({ preset, title = "Reports", subtitle = "Every citizen report, filterable" }) => {
  const [params, setParams] = useSearchParams();
  const { departments } = useDepartments();
  const { isAdmin } = useAuth();
  const [data, setData] = useState<{ items: Issue[]; total: number; pages: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [search, setSearch] = useState(params.get("q") || "");

  const filters: IssueFilters = { ...preset };
  for (const k of FILTER_KEYS) {
    const v = params.get(k);
    if (v) (filters as Record<string, string>)[k] = v;
  }
  const page = Number(params.get("page")) || 1;
  const openId = params.get("open");
  const filterKey = JSON.stringify(filters);

  const load = useCallback(() => {
    setError(null);
    api
      .issues({ ...JSON.parse(filterKey), page, limit: 25 })
      .then(setData)
      .catch((e) => setError(e.message));
  }, [filterKey, page]);

  useEffect(load, [load]);

  useEffect(() => {
    const s = getSocket();
    s?.on("issue:created", load);
    return () => {
      s?.off("issue:created", load);
    };
  }, [load]);

  const setFilter = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    next.delete("page");
    setParams(next);
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const all: Issue[] = [];
      for (let p = 1; p <= 50; p++) {
        const r = await api.issues({ ...filters, page: p, limit: 200 });
        all.push(...r.items);
        if (p >= r.pages) break;
      }
      download(`fixmycity-reports-${new Date().toISOString().slice(0, 10)}.csv`, issuesToCsv(all));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setExporting(false);
    }
  };

  const closeDrawer = () => {
    const next = new URLSearchParams(params);
    next.delete("open");
    setParams(next);
  };

  return (
    <div className="space-y-4">
      <PageTitle
        title={title}
        subtitle={data ? `${subtitle} · ${data.total.toLocaleString()} matching` : subtitle}
        right={
          <button className={btnSecondary} onClick={exportCsv} disabled={exporting}>
            <Download size={16} /> {exporting ? "Exporting…" : "Export CSV"}
          </button>
        }
      />

      <Card>
        <div className="flex flex-wrap gap-2 pt-2">
          <form
            className="relative flex-1 min-w-[200px]"
            onSubmit={(e) => {
              e.preventDefault();
              setFilter("q", search.trim());
            }}
          >
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className={`${input} pl-9`} placeholder="Search title, description, address…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search reports" />
          </form>
          {!preset?.status && (
            <select className={select} value={filters.status || ""} onChange={(e) => setFilter("status", e.target.value)} aria-label="Status">
              <option value="">All statuses</option>
              <option value="open">Open (any)</option>
              {Object.entries(STATUS_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          )}
          <select className={select} value={filters.category || ""} onChange={(e) => setFilter("category", e.target.value)} aria-label="Category">
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <select className={select} value={filters.urgency || ""} onChange={(e) => setFilter("urgency", e.target.value)} aria-label="Urgency">
            <option value="">Any urgency</option>
            <option value="critical">Critical</option>
            <option value="high,critical">High + critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          {isAdmin && (
            <select className={select} value={filters.department || ""} onChange={(e) => setFilter("department", e.target.value)} aria-label="Department">
              <option value="">All departments</option>
              <option value="unassigned">Unassigned</option>
              {departments.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name}
                </option>
              ))}
            </select>
          )}
          <select className={select} value={filters.sort || "newest"} onChange={(e) => setFilter("sort", e.target.value === "newest" ? "" : e.target.value)} aria-label="Sort">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="upvotes">Most upvoted</option>
            <option value="updated">Recently updated</option>
          </select>
          {filters.ward && (
            <button className="text-xs px-2.5 py-1 rounded-full bg-gray-100" onClick={() => setFilter("ward", "")}>
              Ward: {filters.ward} ✕
            </button>
          )}
        </div>
      </Card>

      {error && <ErrorBanner message={error} onRetry={load} />}
      {!data ? (
        <Spinner />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-2.5 font-medium">Report</th>
                <th className="px-3 py-2.5 font-medium">Location</th>
                <th className="px-3 py-2.5 font-medium">Urgency</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-3 py-2.5 font-medium">Department</th>
                <th className="px-3 py-2.5 font-medium">Signals</th>
                <th className="px-3 py-2.5 font-medium">Reported</th>
              </tr>
            </thead>
            <tbody>
              {data.items.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-gray-500 py-10">
                    No reports match these filters.
                  </td>
                </tr>
              )}
              {data.items.map((i) => (
                <tr key={i.id} className="border-b border-gray-100 hover:bg-green-50/40 cursor-pointer" onClick={() => setFilter("open", i.id)}>
                  <td className="px-4 py-2.5 max-w-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{CATEGORY_EMOJI[i.category]}</span>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{i.title}</p>
                        <p className="text-xs text-gray-500">{i.categoryLabel}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-gray-600 max-w-[200px] truncate">{i.ward || i.location || "—"}</td>
                  <td className="px-3 py-2.5">
                    <UrgencyBadge urgency={i.urgency} />
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusBadge status={i.status} />
                  </td>
                  <td className="px-3 py-2.5 text-gray-700">{i.assignedDepartment?.code ?? <span className="text-gray-400">—</span>}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <span className="inline-flex items-center gap-0.5" title="Upvotes">
                        <ThumbsUp size={12} /> {i.upvoteCount}
                      </span>
                      {i.communityVerified && <ShieldCheck size={14} className="text-green-600" aria-label="Community verified" />}
                      {i.possibleDuplicateOf && <AlertTriangle size={14} className="text-amber-600" aria-label="Possible duplicate" />}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">{timeAgo(i.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 text-sm text-gray-600">
              <span>
                Page {page} of {data.pages}
              </span>
              <div className="flex gap-2">
                <button className={btnSecondary} disabled={page <= 1} onClick={() => setFilter("page", String(page - 1))} aria-label="Previous page">
                  <ChevronLeft size={16} />
                </button>
                <button className={btnSecondary} disabled={page >= data.pages} onClick={() => setFilter("page", String(page + 1))} aria-label="Next page">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {openId && (
        <IssueDrawer
          issueId={openId}
          departments={departments}
          onClose={closeDrawer}
          onChanged={(updated) =>
            setData((d) =>
              d ? { ...d, items: updated ? d.items.map((x) => (x.id === updated.id ? updated : x)) : d.items.filter((x) => x.id !== openId) } : d
            )
          }
        />
      )}
    </div>
  );
};

export default ReportsPage;
