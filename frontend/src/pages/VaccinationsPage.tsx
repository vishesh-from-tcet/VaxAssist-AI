import React from 'react';
import { Syringe, Plus } from 'lucide-react';

export const VaccinationsPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Vaccination History</h1>
          <p className="text-xs text-slate-500">Log and verify completed immunizations</p>
        </div>
        <button
          disabled
          className="flex items-center px-4 py-2 bg-slate-300 text-slate-600 rounded-lg font-semibold text-xs cursor-not-allowed"
        >
          <Plus className="w-4 h-4 mr-1.5" /> Log Vaccine (Phase 2)
        </button>
      </div>

      <div className="p-8 text-center bg-white border border-dashed border-slate-300 rounded-2xl">
        <Syringe className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="font-semibold text-slate-800 text-base mb-1">No Immunization Records Logged</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
          Strict requirement: Fake medical records are not generated. Completed vaccination logs will be stored in primary MongoDB database in future phases.
        </p>
        <span className="inline-block px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-mono">
          [MongoDB Collection: vaccination_records]
        </span>
      </div>
    </div>
  );
};
