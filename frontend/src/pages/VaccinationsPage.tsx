import React, { useState, useEffect, useMemo } from 'react';
import {
  Syringe,
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  Calendar,
  Building2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Eye,
  Edit3,
  Trash2,
  Users,
  ShieldCheck,
  FileSpreadsheet,
} from 'lucide-react';
import {
  vaccinationService,
  VaccinationRecord,
  CreateVaccinationPayload,
  UpdateVaccinationPayload,
} from '../services/vaccinationService';
import { familyService, Family, Member } from '../services/familyService';
import { VaccinationModal } from '../components/VaccinationModal';
import { VaccinationDetailModal } from '../components/VaccinationDetailModal';

export const VaccinationsPage: React.FC = () => {
  const [vaccinations, setVaccinations] = useState<VaccinationRecord[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedMemberFilter, setSelectedMemberFilter] = useState<string>('All');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'administration_date' | 'vaccine_name' | 'created_at'>('administration_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Modals
  const [isVaxModalOpen, setIsVaxModalOpen] = useState<boolean>(false);
  const [editingRecord, setEditingRecord] = useState<VaccinationRecord | null>(null);
  const [detailRecord, setDetailRecord] = useState<VaccinationRecord | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Load families to get all family members
      const families = await familyService.getFamilies();
      let allMembers: Member[] = [];
      for (const f of families) {
        const fullFam = await familyService.getFamily(f.id);
        if (fullFam.members) {
          allMembers = [...allMembers, ...fullFam.members];
        }
      }
      setMembers(allMembers);

      // Load vaccinations
      const vaxList = await vaccinationService.getVaccinations({
        sort_by: sortBy,
        order: sortOrder,
      });
      setVaccinations(vaxList);
    } catch (err: any) {
      setError(err.message || 'Failed to load vaccination records');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [sortBy, sortOrder]);

  // Filtered and searched records
  const filteredRecords = useMemo(() => {
    return vaccinations.filter((rec) => {
      const matchesSearch =
        rec.vaccine_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (rec.member_name && rec.member_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (rec.clinic && rec.clinic.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (rec.provider && rec.provider.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (rec.batch_number && rec.batch_number.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesMember = selectedMemberFilter === 'All' || rec.member_id === selectedMemberFilter;
      const matchesStatus = selectedStatusFilter === 'All' || rec.verification_status === selectedStatusFilter;

      return matchesSearch && matchesMember && matchesStatus;
    });
  }, [vaccinations, searchQuery, selectedMemberFilter, selectedStatusFilter]);

  const handleSaveVaccination = async (payload: CreateVaccinationPayload | UpdateVaccinationPayload) => {
    if (editingRecord) {
      await vaccinationService.updateVaccination(editingRecord.id, payload);
    } else {
      await vaccinationService.createVaccination(payload as CreateVaccinationPayload);
    }
    await loadData();
  };

  const handleDeleteVaccination = async (recordId: string) => {
    await vaccinationService.deleteVaccination(recordId);
    await loadData();
  };

  // Real Stats computed from actual database data
  const totalCount = vaccinations.length;
  const verifiedCount = vaccinations.filter((v) => v.verification_status === 'verified').length;
  const pendingCount = vaccinations.filter((v) => v.verification_status === 'pending').length;
  const uniqueMembersImmunized = new Set(vaccinations.map((v) => v.member_id)).size;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center space-x-2">
            <span>Immunization Registry</span>
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
              Verified Records
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Log, track, and verify immunization certificates for your family
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            id="log-vaccine-btn"
            onClick={() => {
              if (members.length === 0) {
                alert('Please add a family member first in Family Profiles before logging a vaccination.');
                return;
              }
              setEditingRecord(null);
              setIsVaxModalOpen(true);
            }}
            className="px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl font-semibold text-xs shadow-md shadow-teal-600/20 flex items-center space-x-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Log Vaccination</span>
          </button>
        </div>
      </div>

      {/* Real Live Stats Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Total Logged Doses</span>
            <Syringe className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{totalCount}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Across all family members</p>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Verified Records</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700">{verifiedCount}</div>
          <p className="text-[11px] text-emerald-600 mt-0.5">Validated certificates</p>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Pending Review</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-700">{pendingCount}</div>
          <p className="text-[11px] text-amber-600 mt-0.5">Awaiting clinic confirmation</p>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Immunized Members</span>
            <Users className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-bold text-sky-700">{uniqueMembersImmunized}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Out of {members.length} total members</p>
        </div>
      </div>

      {/* Search, Filter & Sort Toolbar */}
      <div className="bg-white p-4 border border-slate-200 rounded-2xl shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search vaccine, member, clinic, lot #..."
              className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* Member filter */}
            <div className="flex items-center space-x-1.5 text-xs text-slate-600">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedMemberFilter}
                onChange={(e) => setSelectedMemberFilter(e.target.value)}
                className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="All">All Members</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status filter */}
            <div className="flex items-center space-x-1.5 text-xs text-slate-600">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="All">All Statuses</option>
                <option value="verified">Verified</option>
                <option value="pending">Pending</option>
                <option value="self_reported">Self-Reported</option>
              </select>
            </div>

            {/* Sort toggle */}
            <button
              onClick={() => {
                if (sortBy === 'administration_date') {
                  setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
                } else {
                  setSortBy('administration_date');
                  setSortOrder('desc');
                }
              }}
              className="px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 flex items-center space-x-1.5 transition-colors"
              title="Sort by date"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
              <span>Date ({sortOrder === 'desc' ? 'Newest' : 'Oldest'})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Table / Empty State */}
      {isLoading ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-500">Loading verified vaccination registry from MongoDB...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs">
          <p className="font-semibold mb-1">Error Loading Records</p>
          <p>{error}</p>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="p-12 text-center bg-white border border-dashed border-slate-300 rounded-2xl shadow-sm">
          <Syringe className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-semibold text-slate-800 text-base mb-1">No Immunization Records Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
            {vaccinations.length === 0
              ? 'Start building your digital vaccination passport by logging your first dose.'
              : 'No records match your active search filters.'}
          </p>
          {members.length > 0 && (
            <button
              onClick={() => {
                setEditingRecord(null);
                setIsVaxModalOpen(true);
              }}
              className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-teal-600/20 inline-flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
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
                  <th className="py-3.5 px-4">Vaccine & Dose</th>
                  <th className="py-3.5 px-4">Member</th>
                  <th className="py-3.5 px-4">Date Administered</th>
                  <th className="py-3.5 px-4">Clinic & Provider</th>
                  <th className="py-3.5 px-4">Batch / Lot #</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors group">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 group-hover:text-teal-700 transition-colors">
                        {rec.vaccine_name}
                      </div>
                      <span className="inline-block mt-0.5 px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-medium">
                        {rec.dose}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-800">{rec.member_name || 'Family Member'}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                      {rec.administration_date}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      <div>{rec.clinic || '—'}</div>
                      {rec.provider && <div className="text-[10px] text-slate-400 mt-0.5">{rec.provider}</div>}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                      {rec.batch_number ? (
                        <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-700">{rec.batch_number}</span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
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
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          onClick={() => {
                            setDetailRecord(rec);
                            setIsDetailModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingRecord(rec);
                            setIsVaxModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Edit Record"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteVaccination(rec.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Record"
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

      {/* Add / Edit Vaccination Modal */}
      <VaccinationModal
        isOpen={isVaxModalOpen}
        onClose={() => setIsVaxModalOpen(false)}
        onSave={handleSaveVaccination}
        members={members}
        initialRecord={editingRecord}
      />

      {/* Detail Audit Modal */}
      <VaccinationDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        record={detailRecord}
        onEdit={(rec) => {
          setEditingRecord(rec);
          setIsVaxModalOpen(true);
        }}
        onDelete={handleDeleteVaccination}
      />
    </div>
  );
};
