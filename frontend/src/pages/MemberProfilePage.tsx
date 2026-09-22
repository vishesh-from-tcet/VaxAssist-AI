import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Calendar,
  Droplet,
  AlertCircle,
  FileText,
  Syringe,
  Plus,
  CheckCircle2,
  Clock,
  Edit3,
  Trash2,
  Search,
  ShieldCheck,
  Eye,
} from 'lucide-react';
import { familyService, Member } from '../services/familyService';
import {
  vaccinationService,
  VaccinationRecord,
  CreateVaccinationPayload,
  UpdateVaccinationPayload,
} from '../services/vaccinationService';
import { VaccinationModal } from '../components/VaccinationModal';
import { VaccinationDetailModal } from '../components/VaccinationDetailModal';

export const MemberProfilePage: React.FC = () => {
  const { memberId } = useParams<{ memberId: string }>();
  const navigate = useNavigate();

  const [member, setMember] = useState<Member | null>(null);
  const [vaccinations, setVaccinations] = useState<VaccinationRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter within member history
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Modals
  const [isVaxModalOpen, setIsVaxModalOpen] = useState<boolean>(false);
  const [editingRecord, setEditingRecord] = useState<VaccinationRecord | null>(null);
  const [selectedRecordForDetail, setSelectedRecordForDetail] = useState<VaccinationRecord | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);

  const loadData = async () => {
    if (!memberId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [memberData, vaxData] = await Promise.all([
        familyService.getMember(memberId),
        vaccinationService.getVaccinations({ member_id: memberId, sort_by: 'administration_date', order: 'desc' }),
      ]);
      setMember(memberData);
      setVaccinations(vaxData);
    } catch (err: any) {
      setError(err.message || 'Failed to load member profile');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [memberId]);

  const calculateAge = (dobString: string): string => {
    try {
      const birthDate = new Date(dobString);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      if (age < 1) {
        const totalMonths = (today.getFullYear() - birthDate.getFullYear()) * 12 + (today.getMonth() - birthDate.getMonth());
        return totalMonths <= 1 ? '1 month old' : `${totalMonths} months old`;
      }
      return `${age} years old`;
    } catch {
      return 'N/A';
    }
  };

  const filteredVaccinations = useMemo(() => {
    return vaccinations.filter((v) => {
      const matchesSearch =
        v.vaccine_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (v.clinic && v.clinic.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (v.batch_number && v.batch_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (v.provider && v.provider.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = statusFilter === 'All' || v.verification_status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [vaccinations, searchQuery, statusFilter]);

  const handleSaveVaccination = async (payload: CreateVaccinationPayload | UpdateVaccinationPayload) => {
    if (editingRecord) {
      await vaccinationService.updateVaccination(editingRecord.id, payload);
    } else {
      await vaccinationService.createVaccination(payload as CreateVaccinationPayload);
    }
    await loadData();
  };

  const handleDeleteVaccination = async (vaxId: string) => {
    await vaccinationService.deleteVaccination(vaxId);
    await loadData();
  };

  const verifiedCount = vaccinations.filter((v) => v.verification_status === 'verified').length;
  const pendingCount = vaccinations.filter((v) => v.verification_status === 'pending').length;

  if (isLoading) {
    return (
      <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl shadow-sm max-w-4xl mx-auto">
        <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-xs text-slate-500">Loading member medical passport...</p>
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs max-w-2xl mx-auto">
        <p className="font-semibold mb-1">Member Record Not Found</p>
        <p>{error || 'The requested family member profile does not exist or you lack permission to view it.'}</p>
        <button
          onClick={() => navigate('/family')}
          className="mt-4 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold text-xs inline-flex items-center space-x-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Family Vault</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/family')}
          className="px-3.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-center space-x-1.5 shadow-sm transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Family Vault</span>
        </button>

        <button
          onClick={() => {
            setEditingRecord(null);
            setIsVaxModalOpen(true);
          }}
          className="px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl font-semibold text-xs shadow-md shadow-teal-600/20 flex items-center space-x-1.5 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Log Immunization</span>
        </button>
      </div>

      {/* Member Hero Header Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex items-start space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white flex items-center justify-center font-bold text-xl shadow-md flex-shrink-0">
              {member.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h1 className="text-xl font-bold text-slate-900">{member.name}</h1>
                <span className="px-2.5 py-0.5 bg-teal-100 text-teal-800 border border-teal-200 text-xs font-semibold rounded-full">
                  {member.relationship}
                </span>
                {member.gender && (
                  <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-full">
                    {member.gender}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1 flex items-center space-x-2">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Born: {member.date_of_birth}</span>
                <span>•</span>
                <span className="font-semibold text-slate-700">{calculateAge(member.date_of_birth)}</span>
              </p>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 min-w-[280px]">
            <div className="text-center">
              <span className="text-[10px] text-slate-400 font-semibold block uppercase">Total Doses</span>
              <span className="text-lg font-bold text-slate-900">{vaccinations.length}</span>
            </div>
            <div className="text-center border-x border-slate-200">
              <span className="text-[10px] text-emerald-600 font-semibold block uppercase">Verified</span>
              <span className="text-lg font-bold text-emerald-700">{verifiedCount}</span>
            </div>
            <div className="text-center">
              <span className="text-[10px] text-amber-600 font-semibold block uppercase">Pending</span>
              <span className="text-lg font-bold text-amber-700">{pendingCount}</span>
            </div>
          </div>
        </div>

        {/* Clinical Info Sub-card */}
        <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-500 font-medium flex items-center mb-1">
              <Droplet className="w-3.5 h-3.5 mr-1 text-rose-500" /> Blood Group
            </span>
            <span className="font-bold text-slate-900">{member.blood_group || 'Not Recorded'}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-500 font-medium flex items-center mb-1">
              <AlertCircle className="w-3.5 h-3.5 mr-1 text-amber-500" /> Known Allergies
            </span>
            <span className="font-medium text-amber-800">{member.allergies || 'No allergies recorded'}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-500 font-medium flex items-center mb-1">
              <FileText className="w-3.5 h-3.5 mr-1 text-teal-600" /> Clinical Notes
            </span>
            <span className="font-medium text-slate-700">{member.medical_notes || 'No general clinical notes'}</span>
          </div>
        </div>
      </div>

      {/* Member's Vaccination Timeline & Log */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 border border-slate-200 rounded-2xl shadow-sm">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              <span>Immunization Records & History</span>
            </h2>
            <p className="text-xs text-slate-500">Historical doses administered and digital records</p>
          </div>

          <div className="flex items-center space-x-2">
            <div className="relative w-48 sm:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search vaccine, clinic..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="All">All Status</option>
              <option value="verified">Verified</option>
              <option value="pending">Pending</option>
              <option value="self_reported">Self-Reported</option>
            </select>
          </div>
        </div>

        {/* Records Table */}
        {filteredVaccinations.length === 0 ? (
          <div className="p-10 text-center bg-white border border-dashed border-slate-300 rounded-2xl shadow-sm">
            <Syringe className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="font-semibold text-slate-800 text-sm">No vaccination records found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {vaccinations.length === 0
                ? 'No immunization records logged yet for this member. Click below to add their first dose.'
                : 'No records match your search criteria.'}
            </p>
            {vaccinations.length === 0 && (
              <button
                onClick={() => {
                  setEditingRecord(null);
                  setIsVaxModalOpen(true);
                }}
                className="mt-3 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-xl shadow-sm inline-flex items-center space-x-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log First Dose</span>
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Vaccine Name</th>
                    <th className="py-3 px-4">Dose</th>
                    <th className="py-3 px-4">Administered Date</th>
                    <th className="py-3 px-4">Clinic / Center</th>
                    <th className="py-3 px-4">Batch #</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredVaccinations.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900">{rec.vaccine_name}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-medium text-[11px]">
                          {rec.dose}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">{rec.administration_date}</td>
                      <td className="py-3 px-4 text-slate-600">{rec.clinic || '—'}</td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600">{rec.batch_number || '—'}</td>
                      <td className="py-3 px-4">
                        {rec.verification_status === 'verified' ? (
                          <span className="inline-flex items-center px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-semibold rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" /> Verified
                          </span>
                        ) : rec.verification_status === 'pending' ? (
                          <span className="inline-flex items-center px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-semibold rounded-full border border-amber-200">
                            <Clock className="w-3 h-3 mr-1 text-amber-600" /> Pending
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 bg-sky-100 text-sky-800 text-[10px] font-semibold rounded-full border border-sky-200">
                            Self-Reported
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => {
                              setSelectedRecordForDetail(rec);
                              setIsDetailModalOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title="View record audit details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingRecord(rec);
                              setIsVaxModalOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit record"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteVaccination(rec.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Vaccination Modal */}
      {member && (
        <VaccinationModal
          isOpen={isVaxModalOpen}
          onClose={() => setIsVaxModalOpen(false)}
          onSave={handleSaveVaccination}
          members={[member]}
          initialRecord={editingRecord}
          defaultMemberId={member.id}
        />
      )}

      {/* Detail Audit Modal */}
      <VaccinationDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        record={selectedRecordForDetail}
        onEdit={(rec) => {
          setEditingRecord(rec);
          setIsVaxModalOpen(true);
        }}
        onDelete={handleDeleteVaccination}
      />
    </div>
  );
};
