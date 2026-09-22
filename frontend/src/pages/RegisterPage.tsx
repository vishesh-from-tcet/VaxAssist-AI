import React from 'react';
import { UserPlus, Shield } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  return (
    <div className="max-w-md mx-auto mt-10 p-8 bg-white border border-slate-200 rounded-2xl shadow-sm">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2.5 bg-teal-100 text-teal-700 rounded-xl">
          <UserPlus className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Create Account</h2>
          <p className="text-xs text-slate-500">Registration Shell Placeholder</p>
        </div>
      </div>

      <div className="mb-6 p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg flex items-center space-x-2">
        <Shield className="w-4 h-4 shrink-0 text-amber-600" />
        <span>Registration system is prepared for Phase 2 integration.</span>
      </div>

      <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
          <input
            type="text"
            placeholder="John Doe"
            disabled
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50 cursor-not-allowed"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
          <input
            type="email"
            placeholder="john@example.com"
            disabled
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50 cursor-not-allowed"
          />
        </div>
        <button
          type="button"
          disabled
          className="w-full py-2.5 bg-teal-600 text-white rounded-lg font-semibold text-sm opacity-60 cursor-not-allowed"
        >
          Register (Disabled in Phase 1)
        </button>
      </form>
    </div>
  );
};
