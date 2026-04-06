import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { ProtectedRoute } from './router/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { DashboardPage } from './pages/DashboardPage';
import { DetailedViewPage } from './pages/DetailedViewPage';
import { ReportsPage } from './pages/ReportsPage';
import { StatisticsPage } from './pages/StatisticsPage';
import { AdminPage } from './pages/AdminPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/dashboard/event/:id" element={<DetailedViewPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/statistics" element={<StatisticsPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
