import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Layout from "./components/Layout";
import { Spinner } from "./components/ui";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";

const ReportsPage = lazy(() => import("./pages/ReportsPage"));
const MapPage = lazy(() => import("./pages/MapPage"));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage"));
const DepartmentsPage = lazy(() => import("./pages/DepartmentsPage"));
const StaffPage = lazy(() => import("./pages/StaffPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));

function RequireOfficial({ children, adminOnly = false }: { children: JSX.Element; adminOnly?: boolean }) {
  const { user, isLoading, isAdmin } = useAuth();
  if (isLoading) return <Spinner className="min-h-screen" />;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<Spinner className="min-h-screen" />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<RequireOfficial><Layout /></RequireOfficial>}>
              <Route index element={<DashboardPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route
                path="verification"
                element={<ReportsPage preset={{ status: "pending", sort: "upvotes" }} title="Verification queue" subtitle="New reports awaiting official verification, most-upvoted first" />}
              />
              <Route path="map" element={<MapPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="departments" element={<RequireOfficial adminOnly><DepartmentsPage /></RequireOfficial>} />
              <Route path="staff" element={<RequireOfficial adminOnly><StaffPage /></RequireOfficial>} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
