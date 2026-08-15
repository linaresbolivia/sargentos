import React from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ProtectedRoute } from '@shared/components/ProtectedRoute';
import { useSelector } from 'react-redux';
import { RootState } from '@store/store';

import { Login } from '@modules/auth/pages/Login';
import { Register } from '@modules/auth/pages/Register';
import { MemberDashboard } from '@modules/members/pages/MemberDashboard';
import { AccessControl } from '@modules/members/pages/AccessControl';
import { SuperAdminDashboard } from '@modules/admin/pages/SuperAdminDashboard';
import { GatehouseDashboard } from './modules/gatehouse/pages/GatehouseDashboard';
import WhatsAppDashboard from './modules/whatsapp/pages/WhatsAppDashboard';
import { PqrsPublicForm } from './modules/pqrs/pages/PqrsPublicForm';
import { PqrsDashboard } from './modules/pqrs/pages/PqrsDashboard';
import { PqrsAnalytics } from './modules/pqrs/pages/PqrsAnalytics';
import { PqrsReports } from './modules/pqrs/pages/PqrsReports';
import { CourtBooking } from './modules/reservations/pages/CourtBooking';
import { CourtAdminDashboard } from './modules/reservations/pages/CourtAdminDashboard';

import { MainPortal } from '@shared/pages/MainPortal';

// Smart Dashboard Redirect Component
const DashboardRedirect: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  
  if (user?.roles.some(r => ['ADMIN', 'SUPER_ADMIN', 'STAFF', 'MODULO_WHATSAPP', 'MODULO_PQRS', 'MODULO_USUARIO_PQRS'].includes(r))) {
    return <MainPortal />;
  }
  return <Navigate to="/member" replace />;
};

// Unauthorized Page
const Unauthorized: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="glass-panel p-8 max-w-md text-center flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-red-400">Acceso Denegado</h1>
      <p className="text-gray-400 text-sm">No tienes permisos necesarios para ver este contenido.</p>
      <Link to="/" className="glass-button-primary">Volver al Dashboard</Link>
    </div>
  </div>
);

// Router Config
export const App: React.FC = () => {
  return (
    <BrowserRouter>
      {/* Toast Notification Container with customized glass styling */}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'rgba(15, 18, 36, 0.8)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            color: '#f3f4f6',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
            borderRadius: '12px',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#ffffff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#ffffff',
            },
          },
        }}
      />
      
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="/pqrs" element={<PqrsPublicForm />} />

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<DashboardRedirect />} />
          <Route path="/member" element={<MemberDashboard />} />
          <Route path="/member/reservations" element={<CourtBooking />} />
        </Route>

        {/* Admin only protected routes */}
        <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']} />}>
          <Route path="/admin/access" element={<AccessControl />} />
          <Route path="/gatehouse" element={<GatehouseDashboard />} />
          <Route path="/admin/reservations" element={<CourtAdminDashboard />} />
        </Route>

        {/* PQRS Module routes */}
        <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN', 'MODULO_PQRS', 'MODULO_USUARIO_PQRS']} />}>
          <Route path="/admin/pqrs" element={<PqrsDashboard />} />
          <Route path="/admin/pqrs/analytics" element={<PqrsAnalytics />} />
          <Route path="/admin/pqrs/reports" element={<PqrsReports />} />
        </Route>

        {/* Super Admin only protected routes */}
        {/* Super Admin only protected routes */}
        <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']} />}>
          <Route path="/superadmin" element={<SuperAdminDashboard />} />
        </Route>

        {/* Whatsapp Module protected routes */}
        <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'MODULO_WHATSAPP']} />}>
          <Route path="/admin/whatsapp" element={<WhatsAppDashboard />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
