import React, { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { LayoutDashboard, MapPin, FileText, BarChart3, Building2, Users, Settings, LogOut, Menu, X, Bell, ShieldCheck } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { connectSocket, disconnectSocket } from "../lib/socket";
import { tokenStore, type Issue } from "../lib/api";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/reports", label: "Reports", icon: FileText },
  { to: "/verification", label: "Verification queue", icon: ShieldCheck },
  { to: "/map", label: "Live map", icon: MapPin },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/departments", label: "Departments", icon: Building2, adminOnly: true },
  { to: "/staff", label: "Staff & users", icon: Users, adminOnly: true },
  { to: "/settings", label: "Settings", icon: Settings },
];

interface LiveEvent {
  id: string;
  title: string;
  at: number;
}

const Layout: React.FC = () => {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [showEvents, setShowEvents] = useState(false);
  const [connected, setConnected] = useState(false);

  // Live feed of incoming reports for the command center.
  useEffect(() => {
    const s = connectSocket(tokenStore.get());
    s.on("connect", () => setConnected(true));
    s.on("disconnect", () => setConnected(false));
    s.on("issue:created", (i: Issue) => setEvents((e) => [{ id: i.id, title: i.title, at: Date.now() }, ...e].slice(0, 20)));
    return () => disconnectSocket();
  }, []);

  const dept = user?.department && typeof user.department === "object" ? user.department : null;

  return (
    <div className="h-screen flex bg-gray-50 overflow-hidden">
      <aside className={`fixed inset-y-0 left-0 z-[1100] w-64 bg-white border-r border-gray-200 flex flex-col transform transition-transform lg:static lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="h-16 flex items-center gap-2 px-5 border-b border-gray-200">
          <img src="/icon.svg" alt="" className="w-8 h-8" />
          <div>
            <p className="font-bold text-gray-900 leading-tight">FixMyCity</p>
            <p className="text-[11px] text-gray-500 leading-tight">Municipal Command Center</p>
          </div>
          <button className="ml-auto lg:hidden text-gray-500" onClick={() => setOpen(false)} aria-label="Close menu">
            <X size={20} />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {NAV.filter((n) => !n.adminOnly || isAdmin).map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium ${isActive ? "bg-green-50 text-green-800" : "text-gray-700 hover:bg-gray-50"}`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-2 text-xs text-gray-600 mb-3">
            <span className={`w-2 h-2 rounded-full ${connected ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
            {connected ? "Live updates connected" : "Live updates offline"}
          </div>
          <p className="text-sm font-medium text-gray-900 truncate">{user?.fullName}</p>
          <p className="text-xs text-gray-500 capitalize">{user?.role}{dept ? ` · ${dept.name}` : ""}</p>
          <button
            onClick={() => {
              logout();
              navigate("/login");
            }}
            className="mt-3 flex items-center gap-2 text-sm text-red-700 hover:text-red-800"
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>
      {open && <div className="fixed inset-0 bg-black/40 z-[1050] lg:hidden" onClick={() => setOpen(false)} />}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center gap-3 px-4 lg:px-6 shrink-0">
          <button className="lg:hidden text-gray-600" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu size={22} />
          </button>
          <p className="text-sm text-gray-500 hidden sm:block">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
          <div className="ml-auto relative">
            <button onClick={() => setShowEvents((v) => !v)} className="relative p-2 rounded-lg text-gray-600 hover:bg-gray-100" aria-label="Incoming reports">
              <Bell size={20} />
              {events.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">{events.length}</span>
              )}
            </button>
            {showEvents && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-[1200]">
                <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100">
                  <p className="font-semibold text-sm">New reports (live)</p>
                  {events.length > 0 && (
                    <button className="text-xs text-gray-500" onClick={() => setEvents([])}>
                      Clear
                    </button>
                  )}
                </div>
                {events.length === 0 ? (
                  <p className="text-sm text-gray-500 p-4">No new reports since you opened the dashboard.</p>
                ) : (
                  <ul className="max-h-80 overflow-y-auto">
                    {events.map((e) => (
                      <li key={e.id + e.at}>
                        <button
                          className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-sm"
                          onClick={() => {
                            setShowEvents(false);
                            navigate(`/reports?open=${e.id}`);
                          }}
                        >
                          {e.title}
                          <span className="block text-xs text-gray-400">{new Date(e.at).toLocaleTimeString("en-IN")}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
