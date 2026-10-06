import React from "react";
import { Link } from "react-router-dom";
import { btnPrimary } from "../components/ui";

const NotFoundPage: React.FC = () => (
  <div className="text-center py-20">
    <p className="text-6xl">🗺️</p>
    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-4">Page not found</h1>
    <p className="text-gray-600 dark:text-gray-400 mt-2">This street doesn't exist on our map.</p>
    <Link to="/" className={`${btnPrimary} mt-6`}>
      Back home
    </Link>
  </div>
);

export default NotFoundPage;
