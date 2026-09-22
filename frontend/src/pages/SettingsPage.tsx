import React from 'react';
import { Settings, Sliders, Database, Smartphone } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Platform Settings</h1>
        <p className="text-xs text-slate-500">System configuration, local cache, and PWA options</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="flex items-center space-x-2 text-slate-800 font-semibold mb-2 text-sm">
            <Database className="w-4 h-4 text-purple-600" />
            <span>Dexie IndexedDB Storage</span>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Local browser storage state for offline caching and synchronization.
          </p>
          <span className="px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-md text-xs font-mono">
            DB: VaxAssistLocalDB (v1)
          </span>
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="flex items-center space-x-2 text-slate-800 font-semibold mb-2 text-sm">
            <Smartphone className="w-4 h-4 text-teal-600" />
            <span>Progressive Web App (PWA)</span>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Service worker registration status for installable app capability.
          </p>
          <span className="px-2.5 py-1 bg-teal-50 text-teal-700 border border-teal-200 rounded-md text-xs font-mono">
            Vite PWA Plugin Configured
          </span>
        </div>
      </div>
    </div>
  );
};
