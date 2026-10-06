import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Clock, CheckCircle2, AlertOctagon, ShieldCheck, Timer, RefreshCw } from "lucide-react";
import { api, type Analytics, type Issue } from "../lib/api";
import { CATEGORY_EMOJI, STATUS_LABEL, timeAgo } from "../lib/format";
import { getSocket } from "../lib/socket";
import StatTile from "../components/StatTile";
import { BarList, TrendChart } from "../components/charts";
import { Card, ErrorBanner, PageTitle, Spinner, StatusBadge, UrgencyBadge, btnSecondary, hours } from "../components/ui";
import { useAuth } from "../contexts/AuthContext";

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState<Analytics | null>(null);
  const [urgent, setUrgent] = useState<Issue[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [a, u] = await Promise.all([api.analytics(30), api.issues({ status: "pending,verified,in-progress", urgency: "high,critical", limit: 8 })]);
      setData(a);
      setUrgent(u.items);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    load();
    const s = getSocket();
    const refresh = () => load();
    s?.on("issue:created", refresh);
    s?.on("issue:updated", refresh);
    return () => {
      s?.off("issue:created", refresh);
      s?.off("issue:updated", refresh);
    };
  }, [load]);

  if (error) return <ErrorBanner message={error} onRetry={load} />;
  if (!data) return <Spinner label="Loading command center…" />;
  const t = data.totals;
  const dept = user?.department && typeof user.department === "object" ? user.department.name : null;

  return (
    <div className="space-y-5">
      <PageTitle
        title={dept ? `${dept} dashboard` : "City-wide overview"}
        subtitle={`Last 30 days · updated ${timeAgo(data.generatedAt)}`}
        right={
          <button className={btnSecondary} onClick={load}>
            <RefreshCw size={16} /> Refresh
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatTile label="Total reports" value={t.total.toLocaleString()} icon={FileText} />
        <StatTile label="Open" value={t.open.toLocaleString()} hint={`${t.pendingVerification} awaiting verification`} icon={Clock} />
        <StatTile label="Resolved" value={t.resolved.toLocaleString()} hint={`${t.resolutionRate}% resolution rate`} icon={CheckCircle2} tone="good" />
        <StatTile label="SLA breaches" value={t.slaBreaches} hint="Open past target time" icon={AlertOctagon} tone={t.slaBreaches ? "warn" : "default"} />
        <StatTile label="Avg. resolution" value={hours(t.avgResolutionHours)} icon={Timer} />
        <StatTile label="Community verified" value={t.communityVerified} hint={`${t.flaggedDuplicates} duplicates flagged`} icon={ShieldCheck} />
      </div>

      <div className="grid xl:grid-cols-3 gap-5">
        <Card title="Reports vs resolutions" subtitle="Daily, last 30 days" className="xl:col-span-2">
          <TrendChart data={data.trend} />
        </Card>
        <Card title="By category" subtitle="All reports">
          <BarList
            rows={Object.entries(data.byCategory)
              .sort((a, b) => b[1] - a[1])
              .map(([k, v]) => ({ key: k, label: `${CATEGORY_EMOJI[k as keyof typeof CATEGORY_EMOJI] ?? ""} ${k[0].toUpperCase()}${k.slice(1)}`, value: v }))}
            onSelect={(k) => navigate(`/reports?category=${k}`)}
          />
        </Card>
      </div>

      <div className="grid xl:grid-cols-3 gap-5">
        <Card
          title="Urgent open issues"
          subtitle="High and critical, newest first"
          className="xl:col-span-2"
          right={
            <button className="text-sm text-green-700 font-medium" onClick={() => navigate("/reports?urgency=high,critical&status=open")}>
              View all
            </button>
          }
        >
          {urgent.length === 0 ? (
            <p className="text-sm text-gray-500">No urgent open issues. 🎉</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {urgent.map((i) => (
                <li key={i.id}>
                  <button className="w-full text-left py-2.5 flex items-center gap-3 hover:bg-gray-50 rounded-lg px-1" onClick={() => navigate(`/reports?open=${i.id}`)}>
                    <span className="text-xl">{CATEGORY_EMOJI[i.category]}</span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-medium text-gray-900 truncate">{i.title}</span>
                      <span className="block text-xs text-gray-500 truncate">
                        {i.ward || i.location || "—"} · {timeAgo(i.createdAt)} · {i.assignedDepartment?.code ?? "Unassigned"}
                      </span>
                    </span>
                    <UrgencyBadge urgency={i.urgency} />
                    <StatusBadge status={i.status} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Pipeline" subtitle="Current status of all reports">
          <BarList
            rows={(["pending", "verified", "in-progress", "resolved", "closed", "rejected"] as const).map((s) => ({
              key: s,
              label: STATUS_LABEL[s],
              value: data.byStatus[s] || 0,
            }))}
            onSelect={(k) => navigate(`/reports?status=${k}`)}
          />
        </Card>
      </div>

      <Card title="Department performance" subtitle="Click a department to see its queue" right={<button className="text-sm text-green-700 font-medium" onClick={() => navigate("/analytics")}>Full analytics</button>}>
        <DepartmentTable rows={data.byDepartment} onSelect={(id) => navigate(`/reports?department=${id ?? "unassigned"}`)} />
      </Card>
    </div>
  );
};

export const DepartmentTable: React.FC<{ rows: Analytics["byDepartment"]; onSelect?: (id: string | null) => void }> = ({ rows, onSelect }) => (
  <div className="overflow-x-auto -mx-5 px-5">
    <table className="w-full text-sm min-w-[640px]">
      <thead>
        <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
          <th className="py-2 font-medium">Department</th>
          <th className="py-2 font-medium text-right">Total</th>
          <th className="py-2 font-medium text-right">Open</th>
          <th className="py-2 font-medium text-right">SLA breaches</th>
          <th className="py-2 font-medium text-right">Avg. resolution</th>
          <th className="py-2 font-medium pl-6 w-48">Resolution rate</th>
        </tr>
      </thead>
      <tbody className="tabular-nums">
        {rows.map((d) => (
          <tr key={d.departmentId ?? "none"} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => onSelect?.(d.departmentId)}>
            <td className="py-2.5">
              <span className="inline-block w-2.5 h-2.5 rounded-sm mr-2 align-middle" style={{ background: d.color }} />
              {d.name}
            </td>
            <td className="py-2.5 text-right">{d.total}</td>
            <td className="py-2.5 text-right">{d.open}</td>
            <td className={`py-2.5 text-right ${d.slaBreaches ? "text-red-700 font-medium" : ""}`}>{d.slaBreaches}</td>
            <td className="py-2.5 text-right">{hours(d.avgResolutionHours)}</td>
            <td className="py-2.5 pl-6">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 rounded bg-[#eef4fc]">
                  <div className="h-2 rounded bg-[#2a78d6]" style={{ width: `${d.resolutionRate}%` }} />
                </div>
                <span className="w-12 text-right">{d.resolutionRate}%</span>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default DashboardPage;
