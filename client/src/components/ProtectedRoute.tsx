import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Spinner } from "./ui";
import LandingPage from "../pages/LandingPage";

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return <Spinner label="Loading..." className="min-h-screen" />;
  // Visitors hitting the root URL get the public landing page instead of a login redirect.
  if (!isAuthenticated && location.pathname === "/") return <LandingPage />;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
};

export default ProtectedRoute;
