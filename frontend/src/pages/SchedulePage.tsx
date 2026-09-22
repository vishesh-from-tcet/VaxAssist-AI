import React from 'react';
import { Calendar, CheckSquare, ShieldCheck } from 'lucide-react';

export const SchedulePage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Immunization Schedule</h1>
          <p className="text-xs text-slate-500">Deterministic vaccination schedule timeline</p>
        </div>
      </div>

      <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl text-xs text-teal-800 flex items-start space-x-3">
        <ShieldCheck className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-teal-900">Deterministic Schedule Guarantee</p>
          <p className="mt-0.5 text-teal-700">
            Due dates and immunization intervals are calculated strictly using deterministic Python medical rules (UIP/WHO). The LLM is never relied upon for calculation logic.
          </p>
        </div>
      </div>

      <div className="p-8 text-center bg-white border border-dashed border-slate-300 rounded-2xl">
        <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="font-semibold text-slate-800 text-base mb-1">Schedule Engine Ready</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
          Select or add a family profile in Phase 2 to view personalized immunization timelines.
        </p>
        <span className="inline-block px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-mono">
          [Engine: Python Rule-Based Calculator]
        </span>
      </div>
    </div>
  );
};
