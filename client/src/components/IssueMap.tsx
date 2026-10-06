import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import type { IssueStatus, MapIssue } from "../lib/api";
import { CATEGORY_EMOJI, STATUS_COLOR, STATUS_LABEL } from "../lib/format";
import type { LatLng } from "../lib/geo";

export function pinIcon(status: IssueStatus, emoji: string, highlight = false) {
  const size = highlight ? 38 : 32;
  return L.divIcon({
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
    html: `<div style="width:${size}px;height:${size}px;background:${STATUS_COLOR[status]};border:2px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center"><span style="transform:rotate(45deg);font-size:${size / 2.2}px">${emoji}</span></div>`,
  });
}

export const userIcon = L.divIcon({
  className: "",
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  html: '<div style="width:18px;height:18px;background:#2563eb;border:3px solid #fff;border-radius:50%;box-shadow:0 0 0 6px rgba(37,99,235,.25)"></div>',
});

const Recenter: React.FC<{ center: LatLng; zoom?: number }> = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.setView([center.lat, center.lng], zoom ?? map.getZoom());
  }, [center.lat, center.lng, zoom, map]);
  return null;
};

interface Props {
  issues: MapIssue[];
  center: LatLng;
  zoom?: number;
  user?: LatLng | null;
  radius?: number;
  className?: string;
  onSelect?: (issue: MapIssue) => void;
  interactive?: boolean;
}

const IssueMap: React.FC<Props> = ({ issues, center, zoom = 14, user, radius, className = "h-64", onSelect, interactive = true }) => (
  <MapContainer
    center={[center.lat, center.lng]}
    zoom={zoom}
    className={`w-full rounded-xl z-0 ${className}`}
    scrollWheelZoom={interactive}
    dragging={interactive}
    zoomControl={interactive}
    attributionControl
  >
    <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
    <Recenter center={center} zoom={zoom} />
    {user && <Marker position={[user.lat, user.lng]} icon={userIcon} />}
    {user && radius && <Circle center={[user.lat, user.lng]} radius={radius} pathOptions={{ color: "#2563eb", weight: 1, fillOpacity: 0.05 }} />}
    {issues.map((i) => (
      <Marker key={i.id} position={[i.coordinates.lat, i.coordinates.lng]} icon={pinIcon(i.status, CATEGORY_EMOJI[i.category])}>
        <Popup>
          <div className="min-w-[180px]">
            {i.thumbnail && <img src={i.thumbnail} alt="" className="w-full h-24 object-cover rounded mb-2" />}
            <p className="font-semibold text-sm">{i.title}</p>
            <p className="text-xs text-gray-600 mt-0.5">
              {i.categoryLabel} · {STATUS_LABEL[i.status]} · 👍 {i.upvoteCount}
            </p>
            {onSelect && (
              <button onClick={() => onSelect(i)} className="mt-2 text-xs font-semibold text-green-700">
                View details →
              </button>
            )}
          </div>
        </Popup>
      </Marker>
    ))}
  </MapContainer>
);

export default IssueMap;
