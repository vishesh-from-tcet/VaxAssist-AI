import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Syringe,
  ShieldCheck,
  Clock,
  Plus,
  ArrowRight,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Activity,
  Heart,
  TrendingUp,
} from 'lucide-react';
import { familyService, Family, Member } from '../services/familyService';
import { vaccinationService, VaccinationRecord } from '../services/vaccinationService';
import { useAuth } from '../context/AuthContext';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [families, setFamilies] = useState<Family[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [vaccinations, setVaccinations] = useState<VaccinationRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDashboardData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [famList, vaxList] = await Promise.all([
          familyService.getFamilies(),
          vaccinationService.getVaccinations({ sort_by: 'administration_date', order: 'desc' }),
        ]);
        setFamilies(famList);
        setVaccinations(vaxList);

        let allMembers: Member[] = [];
        for (const f of famList) {
          const fullFam = await familyService.getFamily(f.id);
          if (fullFam.members) {
            allMembers = [...allMembers, ...fullFam.members];
          }
        }
        setMembers(allMembers);
      } catch (err: any) {
        setError(err.message || 'Failed to load live dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  // Computed Real Live Stats
  const totalMembers = members.length;
  const totalVaccines = vaccinations.length;
  const verifiedCount = vaccinations.filter((v) => v.verification_status === 'verified').length;
  const pendingCount = vaccinations.filter((v) => v.verification_status === 'pending').length;
  const immunizedMembersCount = new Set(vaccinations.map((v) => v.member_id)).size;
  const protectionRate = totalMembers > 0 ? Math.round((immunizedMembersCount / totalMembers) * 100) : 0;

  // Recent vaccinations (up to 5)
  const recentVaccinations = vaccinations.slice(0, 5);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Welcome Banner */}
      <div className="p-6 bg-gradient-to-r from-teal-900 via-slate-900 to-emerald-950 text-white rounded-3xl shadow-lg border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="px-2.5 py-0.5 bg-teal-500/20 text-teal-300 border border-teal-400/30 text-[11px] font-bold uppercase tracking-wider rounded-full">
            Live Health Dashboard
          </span>
          <h1 className="text-2xl font-black mt-2 text-white">
            Welcome back, {user?.full_name || 'Health Guardian'}
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Real-time digital immunization records and family health management powered by MongoDB & AI assistance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => navigate('/family')}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs rounded-xl border border-white/20 transition-all flex items-center space-x-1.5"
          >
            <Users className="w-3.5 h-3.5 text-teal-300" />
            <span>Family Vault</span>
          </button>
          <button
            onClick={() => navigate('/vaccinations')}
            className="px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all flex items-center space-x-1.5"
          >
            <Syringe className="w-3.5 h-3.5" />
            <span>Vaccine Registry</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-500">Retrieving real-time records from database...</p>
        </div>
      ) : error ? (
        <div className="p-5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs">
          <p className="font-semibold mb-1">Could Not Load Live Data</p>
          <p>{error}</p>
        </div>
      ) : (
        <>
          {/* Live Metric Statistics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center justify-between text-slate-500 mb-1.5">
                <span className="text-xs font-semibold">Active Family Profiles</span>
                <Users className="w-4 h-4 text-teal-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900">{totalMembers}</div>
              <p className="text-[11px] text-slate-500 mt-1 flex items-center">
                <span className="font-medium text-teal-700">{families.length}</span>
                <span className="ml-1">registered family units</span>
              </p>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center justify-between text-slate-500 mb-1.5">
                <span className="text-xs font-semibold">Logged Immunizations</span>
                <Syringe className="w-4 h-4 text-sky-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900">{totalVaccines}</div>
              <p className="text-[11px] text-slate-500 mt-1 flex items-center">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                <span>{verifiedCount} verified certificates</span>
              </p>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center justify-between text-slate-500 mb-1.5">
                <span className="text-xs font-semibold">Coverage Status</span>
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold text-emerald-700">{protectionRate}%</div>
              <p className="text-[11px] text-slate-500 mt-1">
                {immunizedMembersCount} of {totalMembers} members with doses
              </p>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center justify-between text-slate-500 mb-1.5">
                <span className="text-xs font-semibold">Pending Review</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-bold text-amber-700">{pendingCount}</div>
              <p className="text-[11px] text-slate-500 mt-1">Self-reported / unverified</p>
            </div>
          </div>

          {/* Two Columns: Recent Vaccinations & Family Members Snapshot */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Vaccinations Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <Activity className="w-4 h-4 text-teal-600" />
                    <h3 className="font-bold text-sm text-slate-900">Recent Immunization Activity</h3>
                  </div>
                  <button
                    onClick={() => navigate('/vaccinations')}
                    className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center space-x-1"
                  >
                    <span>View All</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                {recentVaccinations.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl my-2">
                    <Syringe className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-700">No vaccination doses logged yet</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Log a vaccine record to begin tracking immunization timelines.
                    </p>
                    <button
                      onClick={() => navigate('/vaccinations')}
                      className="mt-3 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold"
                    >
                      Log Vaccination
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {recentVaccinations.map((vax) => (
                      <div
                        key={vax.id}
                        className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-100 flex items-center justify-between transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                            <Syringe className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900">{vax.vaccine_name}</p>
                            <p className="text-[11px] text-slate-500">
                              {vax.member_name} • <span className="font-medium text-slate-700">{vax.dose}</span>
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[11px] font-mono text-slate-600 block">{vax.administration_date}</span>
                          <span className="inline-block mt-0.5 px-2 py-0.2 bg-emerald-100 text-emerald-800 text-[9px] font-bold rounded-full">
                            {vax.verification_status || 'verified'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {recentVaccinations.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-100 text-center">
                  <button
                    onClick={() => navigate('/vaccinations')}
                    className="text-xs font-semibold text-teal-600 hover:text-teal-800"
                  >
                    + Manage All {totalVaccines} Vaccination Records
                  </button>
                </div>
              )}
            </div>

            {/* Family Members Snapshot Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-teal-600" />
                    <h3 className="font-bold text-sm text-slate-900">Family Members Overview</h3>
                  </div>
                  <button
                    onClick={() => navigate('/family')}
                    className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center space-x-1"
                  >
                    <span>Manage Vault</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                {members.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl my-2">
                    <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-700">No family members registered</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Add profiles for yourself and dependents in the Family Vault.
                    </p>
                    <button
                      onClick={() => navigate('/family')}
                      className="mt-3 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold"
                    >
                      Add Family Member
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {members.slice(0, 5).map((m) => (
                      <div
                        key={m.id}
                        onClick={() => navigate(`/family/members/${m.id}`)}
                        className="p-3 bg-slate-50 hover:bg-teal-50/50 hover:border-teal-200 rounded-xl border border-slate-100 flex items-center justify-between cursor-pointer transition-all group"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs flex-shrink-0 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                            {m.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900 group-hover:text-teal-800 transition-colors">
                              {m.name}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {m.relationship} • Born {m.date_of_birth}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-0.5 bg-white border border-slate-200 text-slate-700 text-[10px] font-semibold rounded-md">
                            {m.vaccination_count || 0} Doses
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-teal-600 transition-colors" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {members.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-100 text-center">
                  <button
                    onClick={() => navigate('/family')}
                    className="text-xs font-semibold text-teal-600 hover:text-teal-800"
                  >
                    + View All {totalMembers} Family Profiles
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
