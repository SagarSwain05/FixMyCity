import React from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";

// Chart tokens (light surface). Series slots 1–2 validated for CVD separation.
export const VIZ = {
  series1: "#2a78d6",
  series2: "#eb6834",
  grid: "#e1e0d9",
  axis: "#898781",
  ink: "#0b0b0b",
  inkSecondary: "#52514e",
  seq: "#2a78d6",
  seqTrack: "#eef4fc",
};

const fmtDay = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

export const TrendChart: React.FC<{ data: Array<{ date: string; reports: number; resolved: number }>; height?: number }> = ({ data, height = 260 }) => (
  <ResponsiveContainer width="100%" height={height}>
    <LineChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
      <CartesianGrid stroke={VIZ.grid} vertical={false} />
      <XAxis dataKey="date" tickFormatter={fmtDay} tick={{ fill: VIZ.axis, fontSize: 11 }} axisLine={{ stroke: "#c3c2b7" }} tickLine={false} minTickGap={24} />
      <YAxis allowDecimals={false} tick={{ fill: VIZ.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
      <Tooltip
        labelFormatter={(d) => fmtDay(String(d))}
        cursor={{ stroke: VIZ.axis, strokeDasharray: "3 3" }}
        contentStyle={{ borderRadius: 8, border: "1px solid rgba(11,11,11,.1)", fontSize: 12, color: VIZ.ink }}
      />
      <Legend iconType="plainline" wrapperStyle={{ fontSize: 12, color: VIZ.inkSecondary }} />
      <Line type="monotone" dataKey="reports" name="Reported" stroke={VIZ.series1} strokeWidth={2} dot={false} activeDot={{ r: 4, stroke: "#fff", strokeWidth: 2 }} />
      <Line type="monotone" dataKey="resolved" name="Resolved" stroke={VIZ.series2} strokeWidth={2} dot={false} activeDot={{ r: 4, stroke: "#fff", strokeWidth: 2 }} />
    </LineChart>
  </ResponsiveContainer>
);

// Sorted horizontal bars for one measure; label + value in ink, bar carries magnitude.
export const BarList: React.FC<{
  rows: Array<{ key: string; label: React.ReactNode; value: number; color?: string; title?: string }>;
  format?: (n: number) => string;
  onSelect?: (key: string) => void;
}> = ({ rows, format = (n) => n.toLocaleString(), onSelect }) => {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.key}>
          <button
            type="button"
            disabled={!onSelect}
            onClick={() => onSelect?.(r.key)}
            title={r.title ?? `${typeof r.label === "string" ? r.label : r.key}: ${format(r.value)}`}
            className="w-full text-left group disabled:cursor-default"
          >
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-700 truncate">{r.label}</span>
              <span className="text-gray-900 font-medium tabular-nums ml-2">{format(r.value)}</span>
            </div>
            <div className="h-2 rounded bg-[#eef4fc]">
              <div className="h-2 rounded group-hover:opacity-80" style={{ width: `${(r.value / max) * 100}%`, background: r.color ?? VIZ.seq }} />
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
};
