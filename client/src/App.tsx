import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./components/AppLayout";
import { Spinner } from "./components/ui";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import HomePage from "./pages/HomePage";

// Heavier routes are split out so the first load on mobile stays small.
const ReportIssuePage = lazy(() => import("./pages/ReportIssuePage"));
const IssueDetailPage = lazy(() => import("./pages/IssueDetailPage"));
const MyReportsPage = lazy(() => import("./pages/MyReportsPage"));
const MapPage = lazy(() => import("./pages/MapPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const RewardsPage = lazy(() => import("./pages/RewardsPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));
const StatusPage = lazy(() => import("./pages/StatusPage"));
const LandingPage = lazy(() => import("./pages/LandingPage"));

function PublicOnly({ children }: { children: JSX.Element }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <Spinner className="min-h-screen" />;
  return isAuthenticated ? <Navigate to="/" replace /> : children;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <NotificationProvider>
            <Suspense fallback={<Spinner className="min-h-screen" />}>
              <Routes>
                <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
                <Route path="/signup" element={<PublicOnly><SignupPage /></PublicOnly>} />
                <Route path="/about" element={<LandingPage />} />
                <Route path="/status" element={<StatusPage />} />
                <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                  <Route index element={<HomePage />} />
                  <Route path="report" element={<ReportIssuePage />} />
                  <Route path="issues/:id" element={<IssueDetailPage />} />
                  <Route path="my-reports" element={<MyReportsPage />} />
                  <Route path="map" element={<MapPage />} />
                  <Route path="notifications" element={<NotificationsPage />} />
                  <Route path="rewards" element={<RewardsPage />} />
                  <Route path="profile" element={<ProfilePage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Route>
              </Routes>
            </Suspense>
          </NotificationProvider>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
