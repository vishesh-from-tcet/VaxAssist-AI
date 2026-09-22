import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  HelpCircle,
  ShieldCheck,
  Users,
  Globe,
  Plus,
  ArrowRight,
  Filter,
  Info,
  WifiOff,
  RefreshCw,
  ExternalLink,
  Syringe,
} from 'lucide-react';
import { familyService, Family, Member } from '../services/familyService';
import {
  scheduleService,
  MemberScheduleEvaluation,
  ScheduleItem,
} from '../services/scheduleService';
import { vaccinationService, CreateVaccinationPayload, UpdateVaccinationPayload } from '../services/vaccinationService';
import { VaccinationModal } from '../components/VaccinationModal';

const COUNTRY_OPTIONS = [
  { id: 'IN', label: 'India (UIP Guidelines)' },
  { id: 'GLOBAL', label: 'Global (WHO Essential Guidelines)' },
  { id: 'US', label: 'United States (CDC Guidelines)' },
];

export const SchedulePage: React.FC = () => {
  const navigate = useNavigate();

  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [selectedCountry, setSelectedCountry] = useState<string>('IN');
  const [scheduleData, setScheduleData] = useState<MemberScheduleEvaluation | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter tab: 'all' | 'overdue' | 'upcoming' | 'completed' | 'unverified'
  const [activeTab, setActiveTab] = useState<'all' | 'overdue' | 'upcoming' | 'completed' | 'unverified'>('all');

  // Quick action modal
  const [isVaxModalOpen, setIsVaxModalOpen] = useState<boolean>(false);
  const [modalPrepopRecord, setModalPrepopRecord] = useState<any>(null);

  // Load initial members list
  useEffect(() => {
    const initMembers = async () => {
      setIsLoading(true);
      try {
        const famList = await familyService.getFamilies();
        let allMembers: Member[] = [];
        for (const f of famList) {
          const fullFam = await familyService.getFamily(f.id);
          if (fullFam.members) {
            allMembers = [...allMembers, ...fullFam.members];
          }
        }
        setMembers(allMembers);
        if (allMembers.length > 0) {
          setSelectedMemberId(allMembers[0].id);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load family members');
      } finally {
        setIsLoading(false);
      }
    };
    initMembers();
  }, []);

  // Load schedule when member or country changes
  const loadSchedule = async () => {
    if (!selectedMemberId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await scheduleService.getMemberSchedule(selectedMemberId, {
        country: selectedCountry,
      });
      setScheduleData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to evaluate immunization schedule');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSchedule();
  }, [selectedMemberId, selectedCountry]);

  // Quick Action: Log dose prefilled with rule data
  const handleQuickLogDose = (item: ScheduleItem) => {
    setModalPrepopRecord({
      member_id: selectedMemberId,
      vaccine_name: item.vaccine_name,
      dose: item.dose,
      administration_date: new Date().toISOString().split('T')[0],
      notes: `Logged via deterministic schedule guideline (${item.rule_id})`,
      verification_status: 'verified',
    });
    setIsVaxModalOpen(true);
  };

  const handleSaveVaccination = async (payload: CreateVaccinationPayload | UpdateVaccinationPayload) => {
    await vaccinationService.createVaccination(payload as CreateVaccinationPayload);
    await loadSchedule();
  };

  // Compile unified list for filtering
  const allTimelineItems = useMemo(() => {
    if (!scheduleData) return [];
    const list: (ScheduleItem & { category: 'completed' | 'overdue' | 'upcoming' | 'unverified' })[] = [
      ...scheduleData.overdue.map((i) => ({ ...i, category: 'overdue' as const })),
      ...scheduleData.upcoming.map((i) => ({ ...i, category: 'upcoming' as const })),
      ...scheduleData.completed.map((i) => ({ ...i, category: 'completed' as const })),
      ...scheduleData.unknown_unverified.map((i) => ({ ...i, category: 'unverified' as const })),
    ];
    // Sort items: overdue first, then upcoming by due_date, then completed by admin date
    return list;
  }, [scheduleData]);

  const filteredItems = useMemo(() => {
    if (activeTab === 'all') return allTimelineItems;
    return allTimelineItems.filter((item) => item.category === activeTab);
  }, [allTimelineItems, activeTab]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-slate-900">Immunization Schedule Engine</h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-teal-100 text-teal-800 rounded-full border border-teal-200">
              Deterministic Rules
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Guideline-based vaccination milestones, overdue alerts, and age-specific eligibility windows
          </p>
        </div>

        {/* Country / Guideline Selector */}
        <div className="flex items-center space-x-2">
          <Globe className="w-4 h-4 text-slate-400" />
          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            {COUNTRY_OPTIONS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Determinism & Version Guarantee Banner */}
      <div className="p-4 bg-gradient-to-r from-teal-900 to-slate-900 text-white rounded-2xl shadow-md border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start space-x-3">
          <div className="p-2 bg-teal-500/20 text-teal-300 rounded-xl mt-0.5 flex-shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-sm text-white">100% Deterministic Rule Engine</h3>
              {scheduleData?._fromCache && (
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-400/30 text-[10px] font-semibold rounded-full flex items-center">
                  <WifiOff className="w-3 h-3 mr-1" /> Offline Cached
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 mt-0.5 max-w-2xl">
              {scheduleData?.source || 'DEMO - Universal Immunization Program (UIP) & WHO Essential Guidelines'} (Version: {scheduleData?.schedule_version || 'v1.0.0-demo-2026'}, Effective: {scheduleData?.effective_date || '2024-01-01'}). No medical advice is invented by LLMs.
            </p>
          </div>
        </div>

        <button
          onClick={loadSchedule}
          disabled={isLoading}
          className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold border border-white/20 flex items-center space-x-1.5 transition-all self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Re-Evaluate</span>
        </button>
      </div>

      {/* Member Selector Carousel/Tabs */}
      {members.length === 0 ? (
        <div className="p-8 text-center bg-white border border-dashed border-slate-300 rounded-2xl shadow-sm">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="font-semibold text-slate-800 text-sm">No Family Profiles Available</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Please register your family members in the Family Health Vault to calculate personalized schedules.
          </p>
          <button
            onClick={() => navigate('/family')}
            className="mt-3 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-xl shadow-sm inline-flex items-center space-x-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Family Profile</span>
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Member Pills */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-2 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-2 pr-1">Member:</span>
            {members.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedMemberId(m.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-2 ${
                  selectedMemberId === m.id
                    ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md shadow-teal-600/20'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/60'
                }`}
              >
                <span>{m.name}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                  selectedMemberId === m.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  {m.relationship}
                </span>
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl shadow-sm">
              <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-xs text-slate-500">Evaluating deterministic guideline rules for member...</p>
            </div>
          ) : error ? (
            <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs">
              <p className="font-semibold mb-1">Evaluation Error</p>
              <p>{error}</p>
            </div>
          ) : scheduleData ? (
            <>
              {/* Summary KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div
                  onClick={() => setActiveTab('completed')}
                  className={`p-4 bg-white border rounded-2xl shadow-sm cursor-pointer transition-all ${
                    activeTab === 'completed' ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200 hover:border-emerald-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-xs font-semibold">Completed Doses</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-bold text-emerald-700">{scheduleData.summary.completed_count}</div>
                  <p className="text-[11px] text-slate-400 mt-0.5">Verified administrations</p>
                </div>

                <div
                  onClick={() => setActiveTab('upcoming')}
                  className={`p-4 bg-white border rounded-2xl shadow-sm cursor-pointer transition-all ${
                    activeTab === 'upcoming' ? 'border-sky-500 ring-2 ring-sky-500/20' : 'border-slate-200 hover:border-sky-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-xs font-semibold">Upcoming Milestones</span>
                    <Clock className="w-4 h-4 text-sky-600" />
                  </div>
                  <div className="text-2xl font-bold text-sky-700">{scheduleData.summary.upcoming_count}</div>
                  <p className="text-[11px] text-slate-400 mt-0.5">Scheduled future milestones</p>
                </div>

                <div
                  onClick={() => setActiveTab('overdue')}
                  className={`p-4 bg-white border rounded-2xl shadow-sm cursor-pointer transition-all ${
                    activeTab === 'overdue' ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-slate-200 hover:border-rose-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-xs font-semibold">Overdue Doses</span>
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                  </div>
                  <div className="text-2xl font-bold text-rose-700">{scheduleData.summary.overdue_count}</div>
                  <p className="text-[11px] text-rose-600 mt-0.5">Requires immediate attention</p>
                </div>

                <div
                  onClick={() => setActiveTab('unverified')}
                  className={`p-4 bg-white border rounded-2xl shadow-sm cursor-pointer transition-all ${
                    activeTab === 'unverified' ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-slate-200 hover:border-amber-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-xs font-semibold">Unverified / Custom</span>
                    <HelpCircle className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="text-2xl font-bold text-amber-700">{scheduleData.summary.unverified_count}</div>
                  <p className="text-[11px] text-slate-400 mt-0.5">Self-reported / unmapped</p>
                </div>
              </div>

              {/* Filter Tabs Bar */}
              <div className="flex items-center justify-between bg-white p-2.5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center space-x-1.5 overflow-x-auto">
                  <span className="text-xs font-semibold text-slate-400 px-2 flex items-center">
                    <Filter className="w-3.5 h-3.5 mr-1" /> View:
                  </span>
                  {[
                    { key: 'all', label: `All Rules (${allTimelineItems.length})` },
                    { key: 'overdue', label: `Overdue (${scheduleData.summary.overdue_count})` },
                    { key: 'upcoming', label: `Upcoming (${scheduleData.summary.upcoming_count})` },
                    { key: 'completed', label: `Completed (${scheduleData.summary.completed_count})` },
                    { key: 'unverified', label: `Unverified (${scheduleData.summary.unverified_count})` },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                        activeTab === tab.key
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <span className="text-[11px] text-slate-400 hidden md:inline pr-2">
                  Member Age: <strong className="text-slate-700">{scheduleData.calculated_age_label}</strong>
                </span>
              </div>

              {/* Visual Interactive Schedule Timeline */}
              {filteredItems.length === 0 ? (
                <div className="p-10 text-center bg-white border border-dashed border-slate-300 rounded-2xl shadow-sm">
                  <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <h3 className="font-semibold text-slate-800 text-sm">No doses match the "{activeTab}" filter</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Try switching back to "All Rules" to view the complete milestone timeline.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredItems.map((item, idx) => (
                    <div
                      key={`${item.rule_id}-${idx}`}
                      className={`p-4 bg-white border rounded-2xl shadow-sm transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                        item.category === 'overdue'
                          ? 'border-rose-200 hover:border-rose-300 bg-rose-50/20'
                          : item.category === 'completed'
                          ? 'border-emerald-200 hover:border-emerald-300 bg-emerald-50/10'
                          : item.category === 'upcoming'
                          ? 'border-sky-200 hover:border-sky-300'
                          : 'border-amber-200 hover:border-amber-300'
                      }`}
                    >
                      {/* Left: Vaccine Info & Milestone */}
                      <div className="flex items-start space-x-3.5">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5 ${
                            item.category === 'completed'
                              ? 'bg-emerald-100 text-emerald-700'
                              : item.category === 'overdue'
                              ? 'bg-rose-100 text-rose-700'
                              : item.category === 'upcoming'
                              ? 'bg-sky-100 text-sky-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          <Syringe className="w-5 h-5" />
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-bold text-slate-900 text-sm">{item.vaccine_name}</h4>
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-semibold rounded-md">
                              {item.dose}
                            </span>
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-mono rounded-md">
                              {item.recommended_age}
                            </span>
                          </div>

                          <p className="text-xs text-slate-600 mt-1 flex items-center space-x-2">
                            <Info className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <span>{item.explanation}</span>
                          </p>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-400 mt-1.5 font-mono">
                            <span>Rule ID: {item.rule_id}</span>
                            <span>•</span>
                            <span>Source: {item.source.split('(')[0].trim()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Status Badge & Action */}
                      <div className="flex items-center justify-between md:justify-end space-x-3 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                        {item.category === 'completed' ? (
                          <div className="text-right">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Completed
                            </span>
                            <span className="text-[10px] text-slate-500 block mt-0.5 font-mono">
                              Administered: {item.administered_date}
                            </span>
                          </div>
                        ) : item.category === 'overdue' ? (
                          <div className="text-right">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
                              <AlertTriangle className="w-3.5 h-3.5 mr-1 text-rose-600" /> Overdue ({item.overdue_days}d)
                            </span>
                            <button
                              onClick={() => handleQuickLogDose(item)}
                              className="mt-1.5 px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-semibold flex items-center space-x-1 shadow-sm transition-all"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Log Overdue Dose</span>
                            </button>
                          </div>
                        ) : item.category === 'upcoming' ? (
                          <div className="text-right">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-100 text-sky-800 border border-sky-200">
                              <Clock className="w-3.5 h-3.5 mr-1 text-sky-600" /> Due: {item.due_date}
                            </span>
                            <button
                              onClick={() => handleQuickLogDose(item)}
                              className="mt-1.5 px-3 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-[11px] font-semibold flex items-center space-x-1 shadow-sm transition-all"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Log Early / On Time</span>
                            </button>
                          </div>
                        ) : (
                          <div className="text-right">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                              <HelpCircle className="w-3.5 h-3.5 mr-1 text-amber-600" /> Unverified Dose
                            </span>
                            <span className="text-[10px] text-slate-500 block mt-0.5 font-mono">
                              Logged: {item.administered_date}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : null}
        </div>
      )}

      {/* Quick Action Vaccination Modal */}
      {members.length > 0 && (
        <VaccinationModal
          isOpen={isVaxModalOpen}
          onClose={() => {
            setIsVaxModalOpen(false);
            setModalPrepopRecord(null);
          }}
          onSave={handleSaveVaccination}
          members={members}
          initialRecord={modalPrepopRecord}
          defaultMemberId={selectedMemberId}
        />
      )}
    </div>
  );
};
