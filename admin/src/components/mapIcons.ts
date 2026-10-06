import L from "leaflet";
import type { IssueStatus } from "../lib/api";
import { STATUS_COLOR } from "../lib/format";

export function pinIcon(status: IssueStatus, emoji = "") {
  return L.divIcon({
    className: "",
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30],
    html: `<div style="width:30px;height:30px;background:${STATUS_COLOR[status]};border:2px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center"><span style="transform:rotate(45deg);font-size:13px">${emoji}</span></div>`,
  });
}
