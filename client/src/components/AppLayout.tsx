import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Bell, Home, Map, Plus, Trophy, User as UserIcon, Moon, Sun } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useNotifications } from "../contexts/NotificationContext";
import { useTheme } from "../contexts/ThemeContext";
import ChatBot from "./ChatBot";

const NAV = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/map", label: "Map", icon: Map },
  { to: "/report", label: "Report", icon: Plus, primary: true },
  { to: "/rewards", label: "Rewards", icon: Trophy },
  { to: "/profile", label: "Profile", icon: UserIcon },
];

const Logo: React.FC = () => (
  <span className="flex items-center gap-2 font-bold text-lg text-gray-900 dark:text-white">
    <img src="/icon.svg" alt="" className="w-7 h-7" />
    Fix<span className="text-primary-600 dark:text-primary-400 -ml-2">MyCity</span>
  </span>
);

const AppLayout: React.FC = () => {
  const { user } = useAuth();
  const { unread } = useNotifications();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const bell = (
    <button
      onClick={() => navigate("/notifications")}
      className="relative p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
      aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
    >
      <Bell size={20} />
      {unread > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-[1000] bg-white/90 dark:bg-gray-900/90 backdrop-blur border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-screen-lg mx-auto px-4 h-14 flex items-center gap-4">
          <button onClick={() => navigate("/")} aria-label="FixMyCity home">
            <Logo />
          </button>
          <nav className="hidden md:flex items-center gap-1 ml-4">
            {NAV.filter((n) => !n.primary).map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "text-primary-700 bg-primary-50 dark:text-primary-300 dark:bg-primary-900/30"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`
                }
              >
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            {bell}
            <span className="hidden sm:inline-flex items-center gap-1 ml-1 px-2.5 py-1 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs font-semibold">
              <Trophy size={14} /> {user?.points ?? 0}
            </span>
            <button onClick={() => navigate("/report")} className="hidden md:inline-flex ml-2 items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
              <Plus size={18} /> Report issue
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-screen-lg mx-auto px-4 pt-5 pb-28 md:pb-10">
        <Outlet />
      </main>

      {/* Mobile bottom navigation */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-[1000] bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 pb-[env(safe-area-inset-bottom)]">
        <div className="flex justify-around items-center h-16 max-w-md mx-auto">
          {NAV.map(({ to, label, icon: Icon, primary, end }) =>
            primary ? (
              <NavLink key={to} to={to} aria-label="Report an issue" className="-mt-6 bg-primary-600 hover:bg-primary-700 text-white rounded-full p-4 shadow-lg shadow-primary-600/30">
                <Icon size={26} />
              </NavLink>
            ) : (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex flex-col items-center px-3 py-1 text-[11px] font-medium ${
                    isActive ? "text-primary-600 dark:text-primary-400" : "text-gray-500 dark:text-gray-400"
                  }`
                }
              >
                <Icon size={22} />
                <span className="mt-0.5">{label}</span>
              </NavLink>
            )
          )}
        </div>
      </nav>

      <ChatBot />
    </div>
  );
};

export default AppLayout;
