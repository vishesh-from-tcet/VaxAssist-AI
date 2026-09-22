import React from 'react';
import { User, ShieldCheck } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">User Profile</h1>
        <p className="text-xs text-slate-500">Account details and security preferences</p>
      </div>

      <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm flex items-center space-x-4">
        <div className="p-4 bg-teal-100 text-teal-700 rounded-full">
          <User className="w-8 h-8" />
        </div>
        <div>
          <h3 className="font-bold text-slate-800 text-base">Primary User Profile</h3>
          <p className="text-xs text-slate-500">Phase 1 Anonymous Local Session</p>
          <div className="mt-2 inline-flex items-center text-xs text-teal-700 font-medium">
            <ShieldCheck className="w-4 h-4 mr-1" /> Foundation Profile Shell Active
          </div>
        </div>
      </div>
    </div>
  );
};
