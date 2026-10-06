import React from "react";
import { Moon, Sun, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { SystemStatusButton } from "../components/SystemStatus";
import { useTheme } from "../contexts/ThemeContext";

const AuthShell: React.FC<{ title: string; subtitle: string; children: React.ReactNode }> = ({ title, subtitle, children }) => {
  const { isDark, toggleTheme } = useTheme();
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-sky-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center p-4">
      <Link to="/" className="fixed top-4 left-4 inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 p-2">
        <ArrowLeft size={16} /> Home
      </Link>
      <SystemStatusButton compact className="fixed top-4 right-16" />
      <button onClick={toggleTheme} aria-label="Toggle dark mode" className="fixed top-4 right-4 p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-white/60 dark:hover:bg-gray-800">
        {isDark ? <Sun size={20} /> : <Moon size={20} />}
      </button>
      <div className="w-full max-w-md pt-12 sm:pt-0">
        <div className="text-center mb-6">
          <img src="/icon.svg" alt="" className="w-14 h-14 mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{subtitle}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-700 p-6">{children}</div>
      </div>
    </div>
  );
};

export default AuthShell;
