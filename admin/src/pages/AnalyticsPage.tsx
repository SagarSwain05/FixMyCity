import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download } from "lucide-react";
import { api, type Analytics } from "../lib/api";
import { CATEGORIES, URGENCY_LABEL } from "../lib/format";
import { download } from "../lib/csv";
import { BarList, TrendChart } from "../components/charts";
import { Card, ErrorBanner, PageTitle, Spinner, btnSecondary, hours, select } from "../components/ui";
import { DepartmentTable } from "./DashboardPage";

const CAT_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.value, c.label]));

const AnalyticsPage: React.FC = () => {
  const navigate = useNavigate();
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setData(null);
    api.analytics(days).then(setData).catch((e) => setError(e.message));
  }, [days]);

  if (error) return <ErrorBanner message={error} />;

  const exportJson = () => data && download(`fixmycity-analytics-${days}d.json`, JSON.stringify(data, null, 2), "application/json");

  return (
    <div className="space-y-5">
      <PageTitle
        title="Analytics"
        subtitle="Department performance, ward hotspots and resolution times"
        right={
          <div className="flex gap-2">
            <select className={select} value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label="Time range">
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
              <option value={365}>Last 12 months</option>
            </select>
            <button className={btnSecondary} onClick={exportJson} disabled={!data}>
              <Download size={16} /> Export
            </button>
          </div>
        }
      />
      {!data ? (
        <Spinner />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              ["Resolution rate", `${data.totals.resolutionRate}%`],
              ["Avg. time to resolve", hours(data.totals.avgResolutionHours)],
              ["Citizen satisfaction", data.totals.satisfactionRate === null ? "–" : `${data.totals.satisfactionRate}%`],
              ["Rejected / spam", data.totals.rejected],
            ].map(([l, v]) => (
              <div key={l} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <p className="text-sm text-gray-500">{l}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{v}</p>
              </div>
            ))}
          </div>

          <Card title="Reports vs resolutions" subtitle={`Daily, last ${days} days`}>
            <TrendChart data={data.trend} height={300} />
          </Card>

          <Card title="Department performance">
            <DepartmentTable rows={data.byDepartment} onSelect={(id) => navigate(`/reports?department=${id ?? "unassigned"}`)} />
          </Card>

          <div className="grid lg:grid-cols-2 gap-5">
            <Card title="Ward hotspots" subtitle="Wards with the most reports (click to filter)">
              {data.byWard.length === 0 ? (
                <p className="text-sm text-gray-500">No ward data yet. Wards are captured from the reporter's location.</p>
              ) : (
                <div className="overflow-x-auto -mx-5 px-5">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
                        <th className="py-2 font-medium">Ward</th>
                        <th className="py-2 font-medium text-right">Total</th>
                        <th className="py-2 font-medium text-right">Open</th>
                        <th className="py-2 font-medium text-right">Resolved</th>
                        <th className="py-2 font-medium text-right">Avg. resolution</th>
                      </tr>
                    </thead>
                    <tbody className="tabular-nums">
                      {data.byWard.map((w) => (
                        <tr key={w.ward} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/reports?ward=${encodeURIComponent(w.ward)}`)}>
                          <td className="py-2">{w.ward}</td>
                          <td className="py-2 text-right">{w.total}</td>
                          <td className="py-2 text-right">{w.open}</td>
                          <td className="py-2 text-right">{w.resolved}</td>
                          <td className="py-2 text-right">{hours(w.avgResolutionHours)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
            <Card title="Average time to resolve, by category" subtitle="Resolved reports only">
              <BarList
                rows={Object.entries(data.resolutionByCategory)
                  .filter(([, v]) => v.avgHours !== null)
                  .sort((a, b) => (b[1].avgHours ?? 0) - (a[1].avgHours ?? 0))
                  .map(([k, v]) => ({ key: k, label: `${CAT_LABEL[k] ?? k} (${v.count})`, value: v.avgHours ?? 0 }))}
                format={(n) => hours(n)}
              />
            </Card>
          </div>

          <div className="grid lg:grid-cols-2 gap-5">
            <Card title="Reports by category">
              <BarList
                rows={Object.entries(data.byCategory)
                  .sort((a, b) => b[1] - a[1])
                  .map(([k, v]) => ({ key: k, label: CAT_LABEL[k] ?? k, value: v }))}
                onSelect={(k) => navigate(`/reports?category=${k}`)}
              />
            </Card>
            <Card title="Reports by urgency">
              <BarList
                rows={(["critical", "high", "medium", "low"] as const).map((u) => ({ key: u, label: URGENCY_LABEL[u], value: data.byUrgency[u] || 0 }))}
                onSelect={(k) => navigate(`/reports?urgency=${k}`)}
              />
            </Card>
          </div>

          <Card title="Recurring hotspots" subtitle="Clusters of 2+ open issues within ~100 m">
            {data.hotspots.length === 0 ? (
              <p className="text-sm text-gray-500">No clusters right now.</p>
            ) : (
              <ul className="divide-y divide-gray-100 text-sm">
                {data.hotspots.map((h) => (
                  <li key={`${h.lat},${h.lng}`} className="py-2 flex justify-between gap-3">
                    <span className="text-gray-700 truncate">{h.sampleLocation || `${h.lat}, ${h.lng}`}</span>
                    <span className="text-gray-500 shrink-0">
                      {h.count} open · {h.categories.map((c) => CAT_LABEL[c] ?? c).join(", ")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
};

export default AnalyticsPage;
