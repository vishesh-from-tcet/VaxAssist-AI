import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navigation } from './Navigation';
import {
  Menu,
  X,
  ShieldCheck,
  Database,
  Cpu,
  Activity,
  AlertCircle,
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { fetchHealth, fetchDbHealth, fetchVectorDbHealth, type HealthStatus } from '../services/api';
import { useSync } from '../context/SyncContext';

export const Layout: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [backendStatus, setBackendStatus] = useState<HealthStatus | null>(null);
  const [mongoStatus, setMongoStatus] = useState<HealthStatus | null>(null);
  const [chromaStatus, setChromaStatus] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    status: syncStatus,
    isOnline,
    isSimulatedOffline,
    pendingCount,
    forceSync,
    toggleSimulatedOffline,
  } = useSync();

  const location = useLocation();

  const runHealthChecks = async () => {
    setLoading(true);
    const [bRes, mRes, cRes] = await Promise.all([
      fetchHealth(),
      fetchDbHealth(),
      fetchVectorDbHealth(),
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
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs md:hidden"
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
        <header className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between shadow-xs z-10">
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
                VaxAssist AI Healthcare Platform
              </span>
            </div>
          </div>

          {/* Sync Status & Offline Controls */}
          <div className="flex items-center space-x-2 text-xs">
            {/* Sync State Badge */}
            <div
              className={`flex items-center px-2.5 py-1 rounded-full border text-xs font-semibold ${
                syncStatus === 'Synced'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : syncStatus === 'Syncing'
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : syncStatus === 'Offline'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : syncStatus === 'Sync error'
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : 'bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              {syncStatus === 'Synced' && <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />}
              {syncStatus === 'Syncing' && <RefreshCw className="w-3.5 h-3.5 mr-1 text-blue-600 animate-spin" />}
              {syncStatus === 'Offline' && <WifiOff className="w-3.5 h-3.5 mr-1 text-amber-600" />}
              {syncStatus === 'Sync error' && <AlertTriangle className="w-3.5 h-3.5 mr-1 text-rose-600" />}
              {syncStatus === 'Online' && <Wifi className="w-3.5 h-3.5 mr-1 text-teal-600" />}
              <span>{syncStatus}</span>
            </div>

            {/* Pending Queue Count Pill */}
            {pendingCount > 0 && (
              <button
                onClick={() => forceSync()}
                className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 border border-purple-200 text-xs font-bold hover:bg-purple-200 transition-colors"
                title="Click to manually sync pending changes"
              >
                <span>{pendingCount} Pending</span>
                <RefreshCw className="w-3 h-3 ml-0.5" />
              </button>
            )}

            {/* Offline Simulation Toggle Button */}
            <button
              onClick={toggleSimulatedOffline}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                isSimulatedOffline
                  ? 'bg-amber-500 text-white border-amber-600 hover:bg-amber-600'
                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
              }`}
              title="Toggle network simulation to test offline local reads and mutation queueing"
            >
              {isSimulatedOffline ? 'Simulating Offline' : 'Go Offline (Sim)'}
            </button>
          </div>
        </header>

        {/* Dynamic Route Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-slate-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
