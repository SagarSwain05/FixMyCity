import React, { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import type { LatLng } from "../lib/geo";

const pickIcon = L.divIcon({
  className: "",
  iconSize: [34, 34],
  iconAnchor: [17, 34],
  html: '<div style="width:34px;height:34px;background:#16a34a;border:3px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 8px rgba(0,0,0,.4)"></div>',
});

const ClickHandler: React.FC<{ onPick: (p: LatLng) => void }> = ({ onPick }) => {
  useMapEvents({ click: (e) => onPick({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
};

const Follow: React.FC<{ value: LatLng }> = ({ value }) => {
  const map = useMap();
  useEffect(() => {
    map.panTo([value.lat, value.lng]);
  }, [value.lat, value.lng, map]);
  return null;
};

// Tap or drag to set the exact problem location.
const LocationPicker: React.FC<{ value: LatLng; onChange: (p: LatLng) => void; radius?: number }> = ({ value, onChange, radius }) => {
  const handlers = useMemo(
    () => ({
      dragend: (e: L.LeafletEvent) => {
        const ll = (e.target as L.Marker).getLatLng();
        onChange({ lat: ll.lat, lng: ll.lng });
      },
    }),
    [onChange]
  );
  return (
    <MapContainer center={[value.lat, value.lng]} zoom={17} className="w-full h-56 rounded-xl z-0">
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <ClickHandler onPick={onChange} />
      <Follow value={value} />
      {radius && <Circle center={[value.lat, value.lng]} radius={radius} pathOptions={{ color: "#16a34a", weight: 1, fillOpacity: 0.08 }} />}
      <Marker position={[value.lat, value.lng]} draggable eventHandlers={handlers} icon={pickIcon} />
    </MapContainer>
  );
};

export default LocationPicker;
