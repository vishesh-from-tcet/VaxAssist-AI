import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navigation } from './Navigation';
import { Menu, X, ShieldCheck, Database, Cpu, Activity, AlertCircle } from 'lucide-react';
import { fetchHealth, fetchDbHealth, fetchVectorDbHealth, type HealthStatus } from '../services/api';

export const Layout: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [backendStatus, setBackendStatus] = useState<HealthStatus | null>(null);
  const [mongoStatus, setMongoStatus] = useState<HealthStatus | null>(null);
  const [chromaStatus, setChromaStatus] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const location = useLocation();

  const runHealthChecks = async () => {
    setLoading(true);
    const [bRes, mRes, cRes] = await Promise.all([
      fetchHealth(),
      fetchDbHealth(),
      fetchVectorDbHealth()
    ]);
    setBackendStatus(bRes);
    setMongoStatus(mRes);
    setChromaStatus(cRes);
    setLoading(false);
  };

  useEffect(() => {
    runHealthChecks();
  }, []);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex shrink-0">
        <Navigation />
      </div>

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out md:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Navigation onCloseMobile={() => setMobileOpen(false)} />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm z-10">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 md:hidden"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-teal-600" />
              <span className="font-semibold text-slate-800 text-sm md:text-base">
                VaxAssist AI Foundation Shell
              </span>
            </div>
          </div>

          {/* Infrastructure Health Badges */}
          <div className="flex items-center space-x-2 text-xs">
            {/* Backend Pill */}
            <div
              className={`hidden sm:flex items-center px-2.5 py-1 rounded-full border ${
                backendStatus?.status === 'ok'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5 mr-1" />
              <span>API: {backendStatus?.status || 'checking'}</span>
            </div>

            {/* MongoDB Pill */}
            <div
              className={`hidden md:flex items-center px-2.5 py-1 rounded-full border ${
                mongoStatus?.status === 'healthy'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
            >
              <Database className="w-3.5 h-3.5 mr-1" />
              <span>MongoDB: {mongoStatus?.status || 'checking'}</span>
            </div>

            {/* ChromaDB Pill */}
            <div
              className={`hidden lg:flex items-center px-2.5 py-1 rounded-full border ${
                chromaStatus?.status === 'healthy'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
            >
              <Cpu className="w-3.5 h-3.5 mr-1" />
              <span>Chroma: {chromaStatus?.status || 'checking'}</span>
            </div>

            <button
              onClick={runHealthChecks}
              disabled={loading}
              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium text-xs transition-colors disabled:opacity-50"
            >
              {loading ? 'Refreshing...' : 'Check Status'}
            </button>
          </div>
        </header>

        {/* Dynamic Route Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-slate-50">
          {/* Environment/Foundation Alert Banner */}
          <div className="mb-6 p-4 rounded-xl bg-teal-900 text-white shadow-md flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-teal-300 shrink-0 mt-0.5" />
            <div className="text-xs md:text-sm">
              <p className="font-semibold text-teal-100">Phase 1 Architecture Foundation</p>
              <p className="text-teal-200/90 mt-0.5">
                Routes and UI layout shell are loaded. Business logic, authentication, and live vaccination tracking are disabled for Phase 1.
              </p>
            </div>
          </div>

          <Outlet />
        </main>
      </div>
    </div>
  );
};
