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
import { TransactionsList, NewTransaction, TransactionDetail } from './components/Transactions';
import { CardsList, AddCard } from './components/Cards';
import { ProfileSettings } from './components/ProfileSettings';
import { Notifications } from './components/Notifications';
import { Invoices } from './components/Invoices';
import { Layout } from './components/Layout';
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
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/transactions"
            element={
              <ProtectedRoute>
                <Layout>
                  <TransactionsList />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/transactions/new"
            element={
              <ProtectedRoute>
                <Layout>
                  <NewTransaction />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/transactions/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <TransactionDetail />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/cards"
            element={
              <ProtectedRoute>
                <Layout>
                  <CardsList />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/cards/add"
            element={
              <ProtectedRoute>
                <Layout>
                  <AddCard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Layout>
                  <ProfileSettings />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <Layout>
                  <Notifications />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/invoices"
            element={
              <ProtectedRoute>
                <Layout>
                  <Invoices />
                </Layout>
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
