import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { SystemStatusPanel } from "../components/SystemStatus";

const StatusPage: React.FC = () => (
  <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-start sm:items-center justify-center p-4 py-10">
    <div className="w-full max-w-lg">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300 mb-4">
        <ArrowLeft size={16} /> Back to FixMyCity
      </Link>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-1">
          <img src="/icon.svg" alt="" className="w-7 h-7" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">System status</h1>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Live health of every FixMyCity service. If the server is asleep, wake it here.</p>
        <SystemStatusPanel />
      </div>
    </div>
  </div>
);

export default StatusPage;
