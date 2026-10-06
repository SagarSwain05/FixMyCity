import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, Circle, Tooltip } from "react-leaflet";
import { api, type Analytics, type MapIssue } from "../lib/api";
import { CATEGORIES, CATEGORY_EMOJI, STATUS_COLOR, STATUS_LABEL, timeAgo } from "../lib/format";
import { useDepartments } from "../lib/useDepartments";
import { getSocket } from "../lib/socket";
import { pinIcon } from "../components/mapIcons";
import { ErrorBanner, PageTitle, select } from "../components/ui";

const [defLat, defLng] = (import.meta.env.VITE_DEFAULT_CENTER || "20.2961,85.8245").split(",").map(Number);

const MapPage: React.FC = () => {
  const navigate = useNavigate();
  const { departments } = useDepartments();
  const [issues, setIssues] = useState<MapIssue[]>([]);
  const [hotspots, setHotspots] = useState<Analytics["hotspots"]>([]);
  const [status, setStatus] = useState("pending,verified,in-progress");
  const [category, setCategory] = useState("");
  const [department, setDepartment] = useState("");
  const [showHotspots, setShowHotspots] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = () =>
      api
        .mapIssues({ status, category, department })
        .then(setIssues)
        .catch((e) => setError(e.message));
    load();
    const s = getSocket();
    s?.on("issue:created", load);
    s?.on("issue:updated", load);
    return () => {
      s?.off("issue:created", load);
      s?.off("issue:updated", load);
    };
  }, [status, category, department]);

  useEffect(() => {
    api.analytics(30).then((a) => setHotspots(a.hotspots)).catch(() => undefined);
  }, []);

  const center: [number, number] = issues.length
    ? [issues.reduce((s, i) => s + i.coordinates.lat, 0) / issues.length, issues.reduce((s, i) => s + i.coordinates.lng, 0) / issues.length]
    : [defLat, defLng];

  return (
    <div className="space-y-4">
      <PageTitle title="Live map" subtitle={`${issues.length} reports plotted · ${hotspots.length} hotspots (2+ open issues within ~100 m)`} />
      <div className="flex flex-wrap gap-2 items-center">
        <select className={select} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="pending,verified,in-progress">Open</option>
          <option value="pending">Pending verification</option>
          <option value="resolved,closed">Resolved</option>
          <option value="">All</option>
        </select>
        <select className={select} value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <select className={select} value={department} onChange={(e) => setDepartment(e.target.value)} aria-label="Department">
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d._id} value={d._id}>
              {d.name}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-700 ml-2">
          <input type="checkbox" checked={showHotspots} onChange={(e) => setShowHotspots(e.target.checked)} /> Show hotspots
        </label>
      </div>
      {error && <ErrorBanner message={error} />}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <MapContainer key={center.join()} center={center} zoom={13} className="h-[calc(100vh-280px)] min-h-[420px] z-0">
          <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {showHotspots &&
            hotspots.map((h) => (
              <Circle key={`${h.lat},${h.lng}`} center={[h.lat, h.lng]} radius={80 + h.count * 25} pathOptions={{ color: "#dc2626", weight: 1.5, fillColor: "#dc2626", fillOpacity: 0.15 }}>
                <Tooltip>
                  Hotspot: {h.count} open issues ({h.critical} high/critical) · {h.categories.join(", ")}
                </Tooltip>
              </Circle>
            ))}
          {issues.map((i) => (
            <Marker key={i.id} position={[i.coordinates.lat, i.coordinates.lng]} icon={pinIcon(i.status, CATEGORY_EMOJI[i.category])}>
              <Popup>
                <div className="min-w-[200px]">
                  {i.thumbnail && <img src={i.thumbnail} alt="" className="w-full h-24 object-cover rounded mb-2" />}
                  <p className="font-semibold">{i.title}</p>
                  <p className="text-xs text-gray-600">
                    {i.categoryLabel} · {STATUS_LABEL[i.status]} · {i.urgency} · {timeAgo(i.createdAt)}
                  </p>
                  <p className="text-xs text-gray-600">{i.department?.name ?? "Unassigned"}</p>
                  <button className="mt-2 text-xs font-semibold text-green-700" onClick={() => navigate(`/reports?open=${i.id}`)}>
                    Open & act →
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
      <div className="flex flex-wrap gap-4 text-xs text-gray-600">
        {Object.entries(STATUS_LABEL).map(([s, l]) => (
          <span key={s} className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full" style={{ background: STATUS_COLOR[s as keyof typeof STATUS_COLOR] }} /> {l}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full border border-red-600 bg-red-600/20" /> Hotspot
        </span>
      </div>
    </div>
  );
};

export default MapPage;
