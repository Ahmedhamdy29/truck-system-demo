import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { RegisterCompanyPage } from './pages/RegisterCompanyPage';
import { DashboardPage } from './pages/DashboardPage';
import { TrucksPage } from './pages/TrucksPage';
import { TruckDetailPage } from './pages/TruckDetailPage';
import { TripsPage } from './pages/TripsPage';
import { MaintenancePage } from './pages/MaintenancePage';
import { ExpensesPage } from './pages/ExpensesPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import DriversPage from './pages/DriversPage';
import { useAuth } from './contexts/AuthContext';

function AppRoutes() {
  const { user } = useAuth();
  if (user?.role === 'driver') {
    return (
      <Routes>
        <Route path="/trucks/:id" element={<TruckDetailPage />} />
        <Route path="*" element={<Navigate to={`/trucks/${user.truckId}`} replace />} />
      </Routes>
    );
  }
  return (
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register-company" element={<RegisterCompanyPage />} />
            <Route path="/" element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            } />
            <Route path="/trucks" element={
              <ProtectedRoute>
                <TrucksPage />
              </ProtectedRoute>
            } />
            <Route path="/trucks/:id" element={
              <ProtectedRoute>
                <TruckDetailPage />
              </ProtectedRoute>
            } />
      <Route path="/trips" element={
        <ProtectedRoute>
          <TripsPage />
        </ProtectedRoute>
      } />
      <Route path="/maintenance" element={
        <ProtectedRoute>
          <MaintenancePage />
        </ProtectedRoute>
      } />
            <Route path="/expenses" element={
              <ProtectedRoute>
                <ExpensesPage />
              </ProtectedRoute>
            } />
      <Route path="/reports" element={
        <ProtectedRoute adminOnly>
          <ReportsPage />
        </ProtectedRoute>
      } />
            <Route path="/settings" element={
              <ProtectedRoute adminOnly>
                <SettingsPage />
              </ProtectedRoute>
            } />
      <Route path="/drivers" element={<ProtectedRoute><DriversPage /></ProtectedRoute>} />
          </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <Router>
          <AppRoutes />
        </Router>
      </DataProvider>
    </AuthProvider>
  );
}

export default App;