import React from 'react';
import { Bell, Clock } from 'lucide-react';

export const RemindersPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reminders & Alerts</h1>
          <p className="text-xs text-slate-500">Upcoming vaccination notifications</p>
        </div>
      </div>

      <div className="p-8 text-center bg-white border border-dashed border-slate-300 rounded-2xl">
        <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="font-semibold text-slate-800 text-base mb-1">No Active Reminders</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
          Notification channels (email/SMS/push) will trigger alerts based on deterministic schedule milestones.
        </p>
        <span className="inline-block px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-mono">
          [Reminder Dispatch Module: Phase 2]
        </span>
      </div>
    </div>
  );
};
