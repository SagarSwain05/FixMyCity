import React from "react";

const StatTile: React.FC<{ label: string; value: React.ReactNode; hint?: string; icon: React.ElementType; tone?: "default" | "warn" | "good" }> = ({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}) => (
  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
    <div className="flex items-center justify-between">
      <p className="text-sm text-gray-500">{label}</p>
      <Icon size={18} className={tone === "warn" ? "text-red-600" : tone === "good" ? "text-green-600" : "text-gray-400"} />
    </div>
    <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
    {hint && <p className={`text-xs mt-1 ${tone === "warn" ? "text-red-700" : "text-gray-500"}`}>{hint}</p>}
  </div>
);

export default StatTile;
