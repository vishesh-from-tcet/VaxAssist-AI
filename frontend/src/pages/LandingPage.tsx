import React from 'react';
import { Shield, Sparkles, HeartPulse, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';

export const LandingPage: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="text-center py-12 px-6 rounded-2xl bg-gradient-to-br from-teal-800 to-slate-900 text-white shadow-xl">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-300 text-xs font-semibold mb-4">
          <Sparkles className="w-4 h-4" />
          <span>VaxAssist AI Foundation</span>
        </div>
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">
          Smart Immunization Companion
        </h1>
        <p className="text-slate-300 text-sm md:text-lg max-w-2xl mx-auto mb-8">
          A modern healthcare platform designed for family immunization tracking, deterministic schedule calculations, and AI-assisted healthcare knowledge.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            to="/dashboard"
            className="px-6 py-3 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-900 font-semibold text-sm transition-colors shadow-lg"
          >
            Explore System Dashboard
          </Link>
          <Link
            to="/ai"
            className="px-6 py-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-300 font-semibold text-sm border border-slate-700 transition-colors"
          >
            View AI Assistant Shell
          </Link>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm">
          <HeartPulse className="w-8 h-8 text-teal-600 mb-3" />
          <h3 className="font-bold text-slate-900 text-base mb-2">MongoDB Primary Storage</h3>
          <p className="text-xs text-slate-600">
            Stores all application and patient records securely. ChromaDB is isolated purely for RAG knowledge bases.
          </p>
        </div>

        <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm">
          <Shield className="w-8 h-8 text-sky-600 mb-3" />
          <h3 className="font-bold text-slate-900 text-base mb-2">Deterministic Schedules</h3>
          <p className="text-xs text-slate-600">
            Rule-based algorithms drive immunization schedules. LLM never calculates vaccine dates directly.
          </p>
        </div>

        <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm">
          <Activity className="w-8 h-8 text-emerald-600 mb-3" />
          <h3 className="font-bold text-slate-900 text-base mb-2">IndexedDB & PWA Ready</h3>
          <p className="text-xs text-slate-600">
            Configured with Dexie.js for offline capability and service worker manifests for PWA installation.
          </p>
        </div>
      </div>
    </div>
  );
};
