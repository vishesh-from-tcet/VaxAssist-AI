import React from 'react';
import { LayoutDashboard, Database, Cpu, HardDrive, CheckCircle2 } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Platform Dashboard</h1>
          <p className="text-xs text-slate-500">Overview of VaxAssist AI Foundation & Connected Services</p>
        </div>
        <span className="px-3 py-1 bg-teal-100 text-teal-800 border border-teal-200 text-xs font-semibold rounded-full">
          DEMO SHELL
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Primary Database</span>
            <Database className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">MongoDB</div>
          <p className="text-xs text-emerald-600 mt-1 flex items-center">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Ready for Patient Data
          </p>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Vector Store</span>
            <Cpu className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">ChromaDB</div>
          <p className="text-xs text-sky-600 mt-1 flex items-center">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Knowledge Base Only
          </p>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Local Storage</span>
            <HardDrive className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">Dexie IndexedDB</div>
          <p className="text-xs text-purple-600 mt-1 flex items-center">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Initialized Schema
          </p>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">PWA Support</span>
            <LayoutDashboard className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">Enabled</div>
          <p className="text-xs text-amber-600 mt-1 flex items-center">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Service Worker Active
          </p>
        </div>
      </div>

      <div className="p-6 bg-white border border-slate-200 rounded-xl shadow-sm">
        <h3 className="font-bold text-slate-900 text-sm mb-3">System Architecture Status</h3>
        <p className="text-xs text-slate-600 mb-4">
          All foundation layers are running cleanly. MongoDB is connected for future user profiles and immunization records. ChromaDB is prepared for medical guidance RAG.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="font-semibold text-slate-700">Backend API Endpoint:</span>
            <code className="block mt-1 font-mono text-teal-700">http://localhost:8000/api/v1/health</code>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="font-semibold text-slate-700">Database Driver:</span>
            <code className="block mt-1 font-mono text-slate-700">Motor (Async MongoDB Driver)</code>
          </div>
        </div>
      </div>
    </div>
  );
};
