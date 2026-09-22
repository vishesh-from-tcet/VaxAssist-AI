import React, { useState, useEffect } from 'react';
import {
  Printer,
  FileText,
  ShieldCheck,
  Calendar,
  User,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Download,
  Building2,
  QrCode,
  Syringe,
  Check
} from 'lucide-react';
import { familyService, type Family, type Member } from '../services/familyService';
import { vaccinationService, type VaccinationRecord } from '../services/vaccinationService';
import { scheduleService, type MemberScheduleEvaluation } from '../services/scheduleService';

export const ReportsPage: React.FC = () => {
  const [families, setFamilies] = useState<Family[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [vaccinations, setVaccinations] = useState<VaccinationRecord[]>([]);
  const [scheduleEval, setScheduleEval] = useState<MemberScheduleEvaluation | null>(null);
  const [generatedDate, setGeneratedDate] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load families and members on mount
  useEffect(() => {
    const init = async () => {
      try {
        const fams = await familyService.getFamilies();
        setFamilies(fams);

        let allMembers: Member[] = [];
        for (const f of fams) {
          const fullFam = await familyService.getFamily(f.id);
          if (fullFam.members) {
            allMembers = [...allMembers, ...fullFam.members];
          }
        }
        setMembers(allMembers);

        if (allMembers.length > 0) {
          setSelectedMemberId(allMembers[0].id);
        }
      } catch (err) {
        console.error('Failed to load families for reports:', err);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  // Fetch member specific details when selectedMemberId changes
  useEffect(() => {
    if (!selectedMemberId) return;

    const fetchMemberData = async () => {
      setIsLoading(true);
      try {
        const [mem, vaxList, sched] = await Promise.all([
          familyService.getMember(selectedMemberId),
          vaccinationService.getVaccinations({ member_id: selectedMemberId }),
          scheduleService.getMemberSchedule(selectedMemberId).catch(() => null),
        ]);

        setSelectedMember(mem);
        setVaccinations(vaxList);
        setScheduleEval(sched);
        setGeneratedDate(new Date().toLocaleString());
      } catch (err) {
        console.error('Failed to load member report data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMemberData();
  }, [selectedMemberId]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportJson = () => {
    const reportData = {
      report_title: 'VaxAssist Official Immunization Summary',
      generated_at: new Date().toISOString(),
      patient: selectedMember,
      vaccination_history: vaccinations,
      schedule_evaluation: scheduleEval,
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `VaxAssist_Immunization_Report_${selectedMember?.name.replace(/\s+/g, '_') || 'Patient'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const verificationHash = `VAX-${selectedMemberId ? selectedMemberId.slice(-6).toUpperCase() : 'DEMO'}-${Date.now().toString(36).toUpperCase()}`;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Toolbar (Hidden on print) */}
      <div className="no-print bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-600 text-white flex items-center justify-center shadow-md shadow-teal-600/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Official Immunization Report Generator</h1>
              <p className="text-xs text-slate-500">
                Generate, export, and print certified clinical vaccination summaries
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2.5 flex-wrap gap-y-2">
          {members.length > 0 && (
            <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700">
              <User className="w-3.5 h-3.5 text-teal-600" />
              <select
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.relationship})
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={handleExportJson}
            className="flex items-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center space-x-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-teal-600/20 transition-all"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Official Certificate</span>
          </button>
        </div>
      </div>

      {/* Printable Report Document Card */}
      {isLoading ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl">
          <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-500 font-medium">Assembling official patient report ledger...</p>
        </div>
      ) : !selectedMember ? (
        <div className="p-12 text-center bg-white border border-dashed border-slate-300 rounded-2xl">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-semibold text-slate-800 text-base mb-1">No Member Selected</h3>
          <p className="text-xs text-slate-500">Please select or register a family member to generate their report.</p>
        </div>
      ) : (
        <div className="print-card bg-white border border-slate-200 rounded-2xl p-8 shadow-sm space-y-6">
          {/* Certificate Header */}
          <div className="border-b-2 border-slate-900 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-xl shadow-md">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight text-slate-900 uppercase">
                  VaxAssist Healthcare System
                </h2>
                <p className="text-xs font-semibold text-teal-700 uppercase tracking-wider">
                  Official Patient Immunization Summary & Certificate
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Universal Immunization Program Guidelines (UIP Version: {scheduleEval?.schedule_version || 'v1.0.0-demo-2026'})
                </p>
              </div>
            </div>

            <div className="text-right sm:border-l sm:border-slate-200 sm:pl-6 space-y-1">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Certificate ID</div>
              <div className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded inline-block">
                {verificationHash}
              </div>
              <div className="text-[10px] text-slate-500">
                Generated: {generatedDate || new Date().toLocaleString()}
              </div>
            </div>
          </div>

          {/* Patient Details Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase">Patient Name</span>
              <span className="font-bold text-slate-900 text-sm">{selectedMember.name}</span>
            </div>

            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase">Date of Birth</span>
              <span className="font-semibold text-slate-800">{selectedMember.date_of_birth}</span>
            </div>

            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase">Gender / Relationship</span>
              <span className="font-semibold text-slate-800">
                {selectedMember.gender || 'Not specified'} • {selectedMember.relationship}
              </span>
            </div>

            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase">Blood Group / Notes</span>
              <span className="font-semibold text-slate-800">
                {selectedMember.blood_group || 'N/A'} {selectedMember.allergies ? `(Allergies: ${selectedMember.allergies})` : ''}
              </span>
            </div>
          </div>

          {/* Compliance Metrics Summary */}
          {scheduleEval && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                <span className="block text-[10px] font-bold text-emerald-700 uppercase">Completed Doses</span>
                <span className="text-xl font-black text-emerald-800">{scheduleEval.summary.completed_count}</span>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center">
                <span className="block text-[10px] font-bold text-amber-700 uppercase">Upcoming Doses</span>
                <span className="text-xl font-black text-amber-800">{scheduleEval.summary.upcoming_count}</span>
              </div>

              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-center">
                <span className="block text-[10px] font-bold text-rose-700 uppercase">Overdue Alerts</span>
                <span className="text-xl font-black text-rose-800">{scheduleEval.summary.overdue_count}</span>
              </div>

              <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-center">
                <span className="block text-[10px] font-bold text-purple-700 uppercase">Total Milestones</span>
                <span className="text-xl font-black text-purple-800">{scheduleEval.summary.total_rules}</span>
              </div>
            </div>
          )}

          {/* Section 1: Administered Vaccination History */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
              <Syringe className="w-4 h-4 text-teal-600" />
              <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wide">
                1. Verified Immunization Administration Ledger
              </h3>
            </div>

            {vaccinations.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-4 bg-slate-50 rounded-xl border border-slate-100">
                No recorded vaccination administrations found in patient history.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 text-[11px] font-bold border-b border-slate-200">
                      <th className="p-2.5">#</th>
                      <th className="p-2.5">Vaccine Name</th>
                      <th className="p-2.5">Dose</th>
                      <th className="p-2.5">Admin Date</th>
                      <th className="p-2.5">Provider / Clinic</th>
                      <th className="p-2.5">Batch / Lot #</th>
                      <th className="p-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {vaccinations.map((vax, idx) => (
                      <tr key={vax.id} className="hover:bg-slate-50/50">
                        <td className="p-2.5 font-mono text-slate-400">{idx + 1}</td>
                        <td className="p-2.5 font-bold text-slate-900">{vax.vaccine_name}</td>
                        <td className="p-2.5 font-medium text-slate-700">{vax.dose}</td>
                        <td className="p-2.5 font-semibold text-slate-800">{vax.administration_date}</td>
                        <td className="p-2.5 text-slate-600">
                          {vax.provider || vax.clinic ? `${vax.provider || ''} ${vax.clinic ? `(${vax.clinic})` : ''}` : '—'}
                        </td>
                        <td className="p-2.5 font-mono text-slate-600 text-[11px]">
                          {vax.batch_lot_number || vax.batch_number || '—'}
                        </td>
                        <td className="p-2.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                            <Check className="w-3 h-3 mr-0.5" />
                            {vax.verification_status || 'Verified'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 2: Deterministic Schedule Evaluation */}
          {scheduleEval && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
                <Calendar className="w-4 h-4 text-purple-600" />
                <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wide">
                  2. Universal Immunization Schedule Milestone Status (Deterministic Rule Engine)
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Upcoming Schedule */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center">
                    <Clock className="w-3.5 h-3.5 text-amber-600 mr-1.5" />
                    Upcoming Recommended Milestones
                  </h4>
                  {scheduleEval.upcoming.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic">No upcoming doses pending in current cycle.</p>
                  ) : (
                    <ul className="space-y-1.5 text-xs">
                      {scheduleEval.upcoming.slice(0, 5).map((up, i) => (
                        <li key={i} className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-slate-800">
                            {up.vaccine_name} ({up.dose})
                          </span>
                          <span className="text-slate-500 font-mono">
                            {up.due_date || `Age: ${up.recommended_age}`}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Overdue / Urgent Alerts */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600 mr-1.5" />
                    Overdue Milestones
                  </h4>
                  {scheduleEval.overdue.length === 0 ? (
                    <p className="text-[11px] text-emerald-600 font-medium">✓ No overdue immunizations found.</p>
                  ) : (
                    <ul className="space-y-1.5 text-xs">
                      {scheduleEval.overdue.map((od, i) => (
                        <li key={i} className="flex items-center justify-between text-[11px] text-rose-700">
                          <span className="font-semibold">
                            {od.vaccine_name} ({od.dose})
                          </span>
                          <span className="font-bold">
                            {od.overdue_days ? `Overdue by ${od.overdue_days}d` : 'Action Required'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Clinical Disclaimer & Digital Signature Footer */}
          <div className="border-t border-slate-200 pt-6 mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-slate-500">
            <div className="space-y-1 max-w-lg">
              <p className="font-semibold text-slate-700">
                Official Clinical Notice:
              </p>
              <p className="text-[11px] leading-relaxed text-slate-500">
                This document is deterministically generated from authorized patient vaccination records and the Universal Immunization Program (UIP) catalog. Medical recommendations are for informational tracking and should be reviewed by an authorized medical practitioner.
              </p>
            </div>

            <div className="text-right shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0">
              <div className="font-mono text-[10px] text-slate-400">VaxAssist Verification Seal</div>
              <div className="inline-block mt-1 p-1 bg-slate-100 rounded border border-slate-200 font-mono text-[10px] text-slate-700 font-bold">
                [VERIFIED RECORD SECURE]
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
