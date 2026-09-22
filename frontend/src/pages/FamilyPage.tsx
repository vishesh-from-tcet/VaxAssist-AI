import React from 'react';
import { Users, UserPlus } from 'lucide-react';

export const FamilyPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Family Profiles</h1>
          <p className="text-xs text-slate-500">Manage dependent and family member health profiles</p>
        </div>
        <button
          disabled
          className="flex items-center px-4 py-2 bg-slate-300 text-slate-600 rounded-lg font-semibold text-xs cursor-not-allowed"
        >
          <UserPlus className="w-4 h-4 mr-1.5" /> Add Profile (Phase 2)
        </button>
      </div>

      <div className="p-8 text-center bg-white border border-dashed border-slate-300 rounded-2xl">
        <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="font-semibold text-slate-800 text-base mb-1">No Family Profiles Created</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
          This feature shell will store dependent family profiles in MongoDB. No fake records are loaded in foundation phase.
        </p>
        <span className="inline-block px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-mono">
          [Schema Ready in MongoDB]
        </span>
      </div>
    </div>
  );
};
