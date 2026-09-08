import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/common/Navbar';
import { Sidebar } from './components/common/Sidebar';
import { DashboardOverview } from './pages/DashboardOverview';
import { RiskMapPage } from './pages/RiskMapPage';
import { PredictionsPage } from './pages/PredictionsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { ModelInsightsPage } from './pages/ModelInsightsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { SettingsPage } from './pages/SettingsPage';

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex min-h-screen flex-col bg-ink-0">
    <Navbar />
    <div className="flex flex-1 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-5 lg:p-6">{children}</main>
    </div>
  </div>
);

const page = (element: React.ReactNode) => <Shell>{element}</Shell>;

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={page(<DashboardOverview />)} />
        <Route path="/risk-map" element={page(<RiskMapPage />)} />
        <Route path="/predictions" element={page(<PredictionsPage />)} />
        <Route path="/analytics" element={page(<AnalyticsPage />)} />
        <Route path="/model-insights" element={page(<ModelInsightsPage />)} />
        <Route path="/audit-logs" element={page(<AuditLogsPage />)} />
        <Route path="/settings" element={page(<SettingsPage />)} />
        {/* /login used to live here. Anyone landing on the old URL from a
            bookmark is sent to the dashboard rather than shown a dead route. */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
