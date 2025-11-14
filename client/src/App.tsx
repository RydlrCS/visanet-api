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
import { Login, Register, ForgotPassword } from './components/auth';
import { Dashboard } from './components/Dashboard';
import { TransactionsList, NewTransaction } from './components/Transactions';
import { CardsList, AddCard } from './components/Cards';
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
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Protected routes - Complete User Journey */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/transactions"
            element={
              <ProtectedRoute>
                <TransactionsList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/transactions/new"
            element={
              <ProtectedRoute>
                <NewTransaction />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cards"
            element={
              <ProtectedRoute>
                <CardsList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cards/add"
            element={
              <ProtectedRoute>
                <AddCard />
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
