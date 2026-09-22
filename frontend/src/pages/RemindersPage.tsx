import React, { useState, useEffect } from 'react';
import {
  Bell,
  AlertTriangle,
  Clock,
  CheckCircle,
  CheckCheck,
  Settings,
  Filter,
  RefreshCw,
  Trash2,
  Syringe,
  ChevronRight,
  ShieldCheck,
  Calendar,
  X
} from 'lucide-react';
import { reminderService, type ReminderPreferences } from '../services/reminderService';
import { familyService, type Member } from '../services/familyService';
import { type LocalReminder } from '../db';
import { useNavigate } from 'react-router-dom';

export const RemindersPage: React.FC = () => {
  const [reminders, setReminders] = useState<LocalReminder[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [filterTab, setFilterTab] = useState<'all' | 'overdue' | 'upcoming' | 'unread'>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [showPrefModal, setShowPrefModal] = useState<boolean>(false);
  const [preferences, setPreferences] = useState<ReminderPreferences>({
    days_in_advance: 30,
    show_upcoming: true,
    show_overdue: true,
    sound_enabled: true,
  });

  const navigate = useNavigate();

  const loadData = async () => {
    try {
      const [fams, prefs] = await Promise.all([
        familyService.getFamilies(),
        reminderService.getPreferences(),
      ]);
      setPreferences(prefs);

      let allMembers: Member[] = [];
      for (const f of fams) {
        const fullFam = await familyService.getFamily(f.id);
        if (fullFam.members) {
          allMembers = [...allMembers, ...fullFam.members];
        }
      }
      setMembers(allMembers);

      const items = await reminderService.getReminders();
      setReminders(items);
    } catch (err) {
      console.error('Failed to load reminders:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const fresh = await reminderService.generateRemindersForFamily();
      setReminders(fresh);
    } catch (err) {
      console.error('Failed to recalculate reminders:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    await reminderService.markAsRead(id);
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, is_read: true } : r))
    );
  };

  const handleMarkAllAsRead = async () => {
    await reminderService.markAllAsRead();
    setReminders((prev) => prev.map((r) => ({ ...r, is_read: true })));
  };

  const handleDeleteReminder = async (id: string) => {
    await reminderService.deleteReminder(id);
    setReminders((prev) => prev.filter((r) => r.id !== id));
  };

  const handleSavePreferences = async (updated: Partial<ReminderPreferences>) => {
    const saved = await reminderService.savePreferences(updated);
    setPreferences(saved);
    setShowPrefModal(false);
    handleRefresh();
  };

  // Filtered list
  const filteredReminders = reminders.filter((rem) => {
    if (selectedMemberId && rem.member_id !== selectedMemberId) return false;
    if (filterTab === 'overdue') return rem.status === 'overdue';
    if (filterTab === 'upcoming') return rem.status === 'upcoming';
    if (filterTab === 'unread') return !rem.is_read;
    return true;
  });

  const unreadCount = reminders.filter((r) => !r.is_read).length;
  const overdueCount = reminders.filter((r) => r.status === 'overdue').length;
  const upcomingCount = reminders.filter((r) => r.status === 'upcoming').length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold text-slate-900">Deterministic Reminders & Alerts</h1>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 bg-rose-500 text-white text-[11px] font-bold rounded-full">
                    {unreadCount} Unread
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Automated clinical schedule alerts for upcoming milestones and overdue immunizations
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
            title="Recalculate reminders from latest schedule"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Recalculating...' : 'Sync Milestones'}</span>
          </button>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="flex items-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark All Read</span>
            </button>
          )}

          <button
            onClick={() => setShowPrefModal(true)}
            className="flex items-center space-x-1.5 px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-semibold transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Preferences</span>
          </button>
        </div>
      </div>

      {/* Filter and Member Selector Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 border border-slate-200 rounded-2xl shadow-sm">
        {/* Tab Filters */}
        <div className="flex items-center space-x-1 w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setFilterTab('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
              filterTab === 'all'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All ({reminders.length})
          </button>

          <button
            onClick={() => setFilterTab('overdue')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap flex items-center space-x-1 ${
              filterTab === 'overdue'
                ? 'bg-rose-600 text-white'
                : 'text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Overdue ({overdueCount})</span>
          </button>

          <button
            onClick={() => setFilterTab('upcoming')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap flex items-center space-x-1 ${
              filterTab === 'upcoming'
                ? 'bg-amber-500 text-white'
                : 'text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Upcoming ({upcomingCount})</span>
          </button>

          <button
            onClick={() => setFilterTab('unread')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
              filterTab === 'unread'
                ? 'bg-purple-600 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Unread ({unreadCount})
          </button>
        </div>

        {/* Member Selector */}
        {members.length > 0 && (
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 w-full sm:w-auto"
            >
              <option value="">All Family Members</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.relationship})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Reminders List */}
      {isLoading ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl">
          <RefreshCw className="w-8 h-8 text-slate-400 animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500 font-medium">Evaluating deterministic schedule alerts...</p>
        </div>
      ) : filteredReminders.length === 0 ? (
        <div className="p-12 text-center bg-white border border-dashed border-slate-300 rounded-2xl">
          <ShieldCheck className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <h3 className="font-bold text-slate-900 text-base mb-1">
            {filterTab === 'overdue'
              ? 'No Overdue Vaccinations!'
              : filterTab === 'unread'
              ? 'All Caught Up!'
              : 'No Active Reminders'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
            {filterTab === 'overdue'
              ? 'All family members are currently compliant with the Universal Immunization Schedule.'
              : 'There are no active alerts within your configured notification window.'}
          </p>
          <button
            onClick={handleRefresh}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Check Schedule Again</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReminders.map((rem) => {
            const isOverdue = rem.status === 'overdue';
            return (
              <div
                key={rem.id}
                className={`p-4 bg-white border rounded-2xl shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  !rem.is_read ? 'border-l-4' : ''
                } ${
                  isOverdue
                    ? !rem.is_read
                      ? 'border-l-rose-500 border-slate-200 bg-rose-50/20'
                      : 'border-slate-200'
                    : !rem.is_read
                    ? 'border-l-amber-500 border-slate-200 bg-amber-50/15'
                    : 'border-slate-200'
                }`}
              >
                {/* Left content */}
                <div className="flex items-start space-x-3.5">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
                      isOverdue
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {isOverdue ? (
                      <AlertTriangle className="w-5 h-5 text-rose-600" />
                    ) : (
                      <Clock className="w-5 h-5 text-amber-600" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <span className="font-bold text-slate-900 text-sm">
                        {rem.vaccine_name} <span className="text-slate-500 font-normal">({rem.dose})</span>
                      </span>

                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                          isOverdue
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {rem.status}
                      </span>

                      <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">
                        Patient: {rem.member_name}
                      </span>

                      {!rem.is_read && (
                        <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                      {rem.message}
                    </p>

                    <div className="flex items-center space-x-3 text-[11px] text-slate-400 pt-0.5">
                      <span className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1 text-slate-400" />
                        Target: {rem.due_date}
                      </span>
                      <span>•</span>
                      <span>Deterministic Rule UIP-2026</span>
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center space-x-2 shrink-0 self-end md:self-center">
                  <button
                    onClick={() => navigate(`/schedule`)}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-slate-50 hover:bg-purple-50 hover:text-purple-700 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition-colors"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>View Timeline</span>
                  </button>

                  <button
                    onClick={() => navigate(`/vaccinations`)}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl text-xs font-semibold shadow-xs hover:from-teal-700 hover:to-emerald-700 transition-all"
                  >
                    <Syringe className="w-3.5 h-3.5" />
                    <span>Log Dose</span>
                  </button>

                  {!rem.is_read ? (
                    <button
                      onClick={() => handleMarkAsRead(rem.id)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Mark as read"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleDeleteReminder(rem.id)}
                      className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Dismiss reminder"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reminder Preferences Modal */}
      {showPrefModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Settings className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-slate-900 text-base">Reminder Preferences</h3>
              </div>
              <button
                onClick={() => setShowPrefModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Advance Notification Window
                </label>
                <select
                  value={preferences.days_in_advance}
                  onChange={(e) =>
                    setPreferences({ ...preferences, days_in_advance: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value={7}>7 days before milestone</option>
                  <option value={14}>14 days before milestone</option>
                  <option value={30}>30 days before milestone (Recommended)</option>
                  <option value={60}>60 days before milestone</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Upcoming reminders will only appear if the target date is within this range.
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.show_overdue}
                    onChange={(e) =>
                      setPreferences({ ...preferences, show_overdue: e.target.checked })
                    }
                    className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <span className="font-medium text-slate-700">Show Overdue Alerts</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.show_upcoming}
                    onChange={(e) =>
                      setPreferences({ ...preferences, show_upcoming: e.target.checked })
                    }
                    className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <span className="font-medium text-slate-700">Show Upcoming Milestones</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
              <button
                onClick={() => setShowPrefModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl font-semibold text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSavePreferences(preferences)}
                className="px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 rounded-xl font-semibold text-xs transition-colors"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
