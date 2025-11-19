/**
 * Layout Component with Navigation
 * 
 * Provides consistent layout with sidebar navigation for all authenticated pages
 * 
 * @module components/Layout
 */

import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { logger } from '../utils/logger';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = () => {
    logger.info('Layout', 'User logging out');
    logout();
    navigate('/login');
  };

  const navigation = [
    { name: 'Dashboard', path: '/dashboard', icon: '📊' },
    { name: 'Transactions', path: '/transactions', icon: '💳' },
    { name: 'New Transaction', path: '/transactions/new', icon: '➕' },
    { name: 'Cards', path: '/cards', icon: '💳' },
    { name: 'Add Card', path: '/cards/add', icon: '🆕' },
    { name: 'Invoices', path: '/invoices', icon: '📄' },
    { name: 'Notifications', path: '/notifications', icon: '🔔' },
    { name: 'Profile Settings', path: '/profile', icon: '⚙️' },
  ];

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Top Navigation Bar */}
      <nav className="bg-white border-b border-neutral-200 fixed w-full z-30 top-0">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-md text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 lg:hidden"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <img src="/logo-with-text.png" alt="Rydlr" className="h-8 w-auto ml-4" />
              <span className="ml-4 text-lg font-semibold text-neutral-900">Visanet API</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <Link 
                to="/notifications"
                className="p-2 rounded-full text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 relative"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-danger-500 ring-2 ring-white"></span>
              </Link>
              
              <div className="flex items-center space-x-3">
                <div className="text-right hidden md:block">
                  <p className="text-sm font-medium text-neutral-900">{user?.email}</p>
                  <p className="text-xs text-neutral-500">Rydlr Account</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Sidebar */}
      <div className="flex pt-16">
        <aside
          className={`${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } fixed inset-y-0 left-0 z-20 w-64 bg-white border-r border-neutral-200 transition-transform duration-300 ease-in-out lg:translate-x-0 pt-16`}
        >
          <nav className="h-full overflow-y-auto py-6 px-4">
            <ul className="space-y-1">
              {navigation.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                        isActive
                          ? 'bg-primary-50 text-primary-700 border-l-4 border-primary-600'
                          : 'text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900'
                      }`}
                    >
                      <span className="text-xl mr-3">{item.icon}</span>
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 lg:ml-64">
          <div className="py-8 px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-neutral-900 bg-opacity-50 z-10 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}
    </div>
  );
};
