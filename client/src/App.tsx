/**
 * Main Application Component
 * 
 * Sets up routing, authentication, and application-wide providers.
 * Configures routes for login, register, dashboard, and protected pages.
 * 
 * @module App
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { logger } from './utils/logger';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login, Register } from './components/auth';
import { Loading } from './components/common';
import './App.css';

/**
 * Protected route component - requires authentication
 * 
 * @param props - Props containing children to render
 * @returns Protected route or redirect to login
 */
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  logger.debug('ProtectedRoute', 'Checking authentication', { isAuthenticated, loading });

  if (loading) {
    return <Loading fullScreen message="Loading application..." />;
  }

  if (!isAuthenticated) {
    logger.warn('ProtectedRoute', 'User not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

/**
 * Temporary Dashboard placeholder component
 * TODO: Replace with full Dashboard component
 */
const DashboardPlaceholder: React.FC = () => {
  const { user, logout } = useAuth();
  
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Welcome to LocaPay Dashboard
          </h1>
          <p className="text-gray-600 mb-4">
            Hello, {user?.firstName} {user?.lastName}!
          </p>
          <button
            onClick={logout}
            className="bg-danger text-white px-4 py-2 rounded hover:bg-danger-dark"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Main application component with routing
 * 
 * @returns Application component
 */
function App() {
  logger.entry('App');

  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPlaceholder />
              </ProtectedRoute>
            }
          />

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

logger.exit('App');

export default App;
