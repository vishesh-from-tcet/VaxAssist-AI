import React from 'react';
import { FileText, Download } from 'lucide-react';

export const ReportsPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports & Certificates</h1>
          <p className="text-xs text-slate-500">Export immunization cards and official compliance reports</p>
        </div>
        <button
          disabled
          className="flex items-center px-4 py-2 bg-slate-300 text-slate-600 rounded-lg font-semibold text-xs cursor-not-allowed"
        >
          <Download className="w-4 h-4 mr-1.5" /> Export PDF (Phase 2)
        </button>
      </div>

      <div className="p-8 text-center bg-white border border-dashed border-slate-300 rounded-2xl">
        <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="font-semibold text-slate-800 text-base mb-1">Report Generator Ready</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
          Immunization certificate PDF generation and digital record export shells prepared.
        </p>
        <span className="inline-block px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-mono">
          [Export Module: Phase 2]
        </span>
      </div>
    </div>
  );
};
