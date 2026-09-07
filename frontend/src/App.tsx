import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/common/Navbar';
import { Sidebar } from './components/common/Sidebar';
import { LandingPage } from './pages/LandingPage';
import { DashboardOverview } from './pages/DashboardOverview';
import { RiskMapPage } from './pages/RiskMapPage';
import { PredictionsPage } from './pages/PredictionsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { ModelInsightsPage } from './pages/ModelInsightsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { SettingsPage } from './pages/SettingsPage';
import { UserRole } from './types';

const Booting: React.FC = () => (
  <div className="flex min-h-screen items-center justify-center bg-ink-0">
    <div className="flex flex-col items-center gap-3">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      <span className="font-mono text-[11px] text-ash-300">Restoring session…</span>
    </div>
  </div>
);

/**
 * Route guard.
 *
 * Previously every route was wrapped in a layout component that did the auth
 * check as a side effect, and there was no role gate at all — the Audit screen
 * was hidden from the sidebar but reachable by typing the URL. This guard
 * checks both, and remembers where the user was headed so login returns them
 * there.
 */
const Protected: React.FC<{ children: React.ReactNode; roles?: UserRole[] }> = ({ children, roles }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) return <Booting />;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />;

  if (roles && user && user.role !== 'admin' && !roles.includes(user.role)) {
    return (
      <div className="cyber-card mx-auto mt-10 max-w-lg p-8 text-center">
        <h2 className="panel-title mb-2 text-base">Not available for your role</h2>
        <p className="text-sm text-ash-200">
          This screen is restricted to {roles.join(' and ')} accounts. You are signed in as{' '}
          <span className="font-mono text-ash-100">{user?.role}</span>.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex min-h-screen flex-col bg-ink-0">
    <Navbar />
    <div className="flex flex-1 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-5 lg:p-6">{children}</main>
    </div>
  </div>
);

const page = (element: React.ReactNode, roles?: UserRole[]) => (
  <Protected roles={roles}>
    <Shell>{element}</Shell>
  </Protected>
);

/** Sends an already-authenticated user away from the login screen. */
const LoginRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <Booting />;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <LandingPage />;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginRoute />} />
          <Route path="/" element={page(<DashboardOverview />)} />
          <Route path="/risk-map" element={page(<RiskMapPage />)} />
          <Route path="/predictions" element={page(<PredictionsPage />)} />
          <Route path="/analytics" element={page(<AnalyticsPage />)} />
          <Route path="/model-insights" element={page(<ModelInsightsPage />)} />
          <Route path="/audit-logs" element={page(<AuditLogsPage />, ['investigator'])} />
          <Route path="/settings" element={page(<SettingsPage />)} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
