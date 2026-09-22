import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  UserPlus,
  Plus,
  Edit3,
  Trash2,
  Heart,
  Droplet,
  AlertCircle,
  Calendar,
  Syringe,
  Search,
  Shield,
  Home,
  Phone,
  X,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';
import { familyService, Family, Member, CreateMemberPayload, UpdateMemberPayload } from '../services/familyService';
import { vaccinationService, CreateVaccinationPayload, UpdateVaccinationPayload } from '../services/vaccinationService';
import { VaccinationModal } from '../components/VaccinationModal';

const RELATIONSHIPS = ['Self', 'Spouse', 'Child', 'Parent', 'Sibling', 'Grandparent', 'Other'];
const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-', 'Unknown'];

export const FamilyPage: React.FC = () => {
  const navigate = useNavigate();
  const [families, setFamilies] = useState<Family[]>([]);
  const [selectedFamily, setSelectedFamily] = useState<Family | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [relationshipFilter, setRelationshipFilter] = useState<string>('All');

  // Modals state
  const [isFamilyModalOpen, setIsFamilyModalOpen] = useState<boolean>(false);
  const [familyFormMode, setFamilyFormMode] = useState<'create' | 'edit'>('create');
  const [familyNameInput, setFamilyNameInput] = useState<string>('');
  const [familyAddressInput, setFamilyAddressInput] = useState<string>('');
  const [familyEmergencyInput, setFamilyEmergencyInput] = useState<string>('');

  const [isMemberModalOpen, setIsMemberModalOpen] = useState<boolean>(false);
  const [memberFormMode, setMemberFormMode] = useState<'create' | 'edit'>('create');
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [memberName, setMemberName] = useState<string>('');
  const [memberDob, setMemberDob] = useState<string>('');
  const [memberRelationship, setMemberRelationship] = useState<string>('Child');
  const [memberGender, setMemberGender] = useState<string>('Female');
  const [memberBloodGroup, setMemberBloodGroup] = useState<string>('O+');
  const [memberAllergies, setMemberAllergies] = useState<string>('');
  const [memberNotes, setMemberNotes] = useState<string>('');

  // Vaccination Log Modal state
  const [isVaxModalOpen, setIsVaxModalOpen] = useState<boolean>(false);
  const [vaxDefaultMemberId, setVaxDefaultMemberId] = useState<string | undefined>(undefined);

  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);

  // Load family data
  const loadFamilyData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const famList = await familyService.getFamilies();
      setFamilies(famList);
      if (famList.length > 0) {
        // Load the full family with members
        const currentFamId = selectedFamily ? selectedFamily.id : famList[0].id;
        const fullFam = await familyService.getFamily(currentFamId);
        setSelectedFamily(fullFam);
      } else {
        setSelectedFamily(null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load family data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFamilyData();
  }, []);

  // Filtered members list
  const filteredMembers = useMemo(() => {
    if (!selectedFamily || !selectedFamily.members) return [];
    return selectedFamily.members.filter((m) => {
      const matchesSearch =
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.allergies && m.allergies.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (m.medical_notes && m.medical_notes.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesRel = relationshipFilter === 'All' || m.relationship === relationshipFilter;
      return matchesSearch && matchesRel;
    });
  }, [selectedFamily, searchQuery, relationshipFilter]);

  // Family Modal Actions
  const handleOpenCreateFamily = () => {
    setFamilyFormMode('create');
    setFamilyNameInput('');
    setFamilyAddressInput('');
    setFamilyEmergencyInput('');
    setIsFamilyModalOpen(true);
  };

  const handleOpenEditFamily = () => {
    if (!selectedFamily) return;
    setFamilyFormMode('edit');
    setFamilyNameInput(selectedFamily.name);
    setFamilyAddressInput(selectedFamily.address || '');
    setFamilyEmergencyInput(selectedFamily.emergency_contact || '');
    setIsFamilyModalOpen(true);
  };

  const handleSaveFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyNameInput.trim()) return;

    setIsActionLoading(true);
    try {
      if (familyFormMode === 'create') {
        const created = await familyService.createFamily({
          name: familyNameInput.trim(),
          address: familyAddressInput.trim() || undefined,
          emergency_contact: familyEmergencyInput.trim() || undefined,
        });
        setIsFamilyModalOpen(false);
        const fullFam = await familyService.getFamily(created.id);
        setSelectedFamily(fullFam);
        const updatedList = await familyService.getFamilies();
        setFamilies(updatedList);
      } else if (selectedFamily) {
        await familyService.updateFamily(selectedFamily.id, {
          name: familyNameInput.trim(),
          address: familyAddressInput.trim() || undefined,
          emergency_contact: familyEmergencyInput.trim() || undefined,
        });
        setIsFamilyModalOpen(false);
        const fullFam = await familyService.getFamily(selectedFamily.id);
        setSelectedFamily(fullFam);
        const updatedList = await familyService.getFamilies();
        setFamilies(updatedList);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to save family');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Member Modal Actions
  const handleOpenAddMember = () => {
    setMemberFormMode('create');
    setEditingMember(null);
    setMemberName('');
    setMemberDob('');
    setMemberRelationship('Child');
    setMemberGender('Female');
    setMemberBloodGroup('O+');
    setMemberAllergies('');
    setMemberNotes('');
    setIsMemberModalOpen(true);
  };

  const handleOpenEditMember = (member: Member) => {
    setMemberFormMode('edit');
    setEditingMember(member);
    setMemberName(member.name);
    setMemberDob(member.date_of_birth);
    setMemberRelationship(member.relationship);
    setMemberGender(member.gender || 'Female');
    setMemberBloodGroup(member.blood_group || 'O+');
    setMemberAllergies(member.allergies || '');
    setMemberNotes(member.medical_notes || '');
    setIsMemberModalOpen(true);
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFamily || !memberName.trim() || !memberDob) return;

    setIsActionLoading(true);
    try {
      if (memberFormMode === 'create') {
        const payload: CreateMemberPayload = {
          name: memberName.trim(),
          date_of_birth: memberDob,
          relationship: memberRelationship,
          gender: memberGender,
          blood_group: memberBloodGroup,
          allergies: memberAllergies.trim() || undefined,
          medical_notes: memberNotes.trim() || undefined,
        };
        await familyService.addMember(selectedFamily.id, payload);
      } else if (editingMember) {
        const payload: UpdateMemberPayload = {
          name: memberName.trim(),
          date_of_birth: memberDob,
          relationship: memberRelationship,
          gender: memberGender,
          blood_group: memberBloodGroup,
          allergies: memberAllergies.trim() || undefined,
          medical_notes: memberNotes.trim() || undefined,
        };
        await familyService.updateMember(editingMember.id, payload);
      }
      setIsMemberModalOpen(false);
      // Refresh family members
      const refreshedFam = await familyService.getFamily(selectedFamily.id);
      setSelectedFamily(refreshedFam);
    } catch (err: any) {
      alert(err.message || 'Failed to save family member');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeleteMember = async (member: Member) => {
    if (window.confirm(`Are you sure you want to remove "${member.name}"? This will also remove their logged vaccination records.`)) {
      setIsActionLoading(true);
      try {
        await familyService.deleteMember(member.id);
        if (selectedFamily) {
          const refreshedFam = await familyService.getFamily(selectedFamily.id);
          setSelectedFamily(refreshedFam);
        }
      } catch (err: any) {
        alert(err.message || 'Failed to delete member');
      } finally {
        setIsActionLoading(false);
      }
    }
  };

  // Quick Log Vaccine Handler
  const handleQuickLogVaccine = (memberId: string) => {
    setVaxDefaultMemberId(memberId);
    setIsVaxModalOpen(true);
  };

  const handleSaveVaccination = async (payload: CreateVaccinationPayload | UpdateVaccinationPayload) => {
    await vaccinationService.createVaccination(payload as CreateVaccinationPayload);
    // Refresh to update member vaccination counts
    if (selectedFamily) {
      const refreshedFam = await familyService.getFamily(selectedFamily.id);
      setSelectedFamily(refreshedFam);
    }
  };

  // Helper for Age calculation
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
        return totalMonths <= 1 ? '1 mo' : `${totalMonths} mos`;
      }
      return `${age} yrs`;
    } catch {
      return 'N/A';
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center space-x-2">
            <span>Family Health Vault</span>
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-teal-100 text-teal-800 rounded-full border border-teal-200">
              Active Management
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage dependents, immunization records, and medical profiles in one centralized location
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          {families.length > 0 && (
            <button
              onClick={handleOpenEditFamily}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl font-semibold text-xs flex items-center space-x-1.5 shadow-sm transition-all"
            >
              <Edit3 className="w-3.5 h-3.5 text-slate-500" />
              <span>Edit Family</span>
            </button>
          )}

          {selectedFamily && (
            <button
              id="add-member-btn"
              onClick={handleOpenAddMember}
              className="px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl font-semibold text-xs shadow-md shadow-teal-600/20 flex items-center space-x-1.5 transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Member</span>
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-500">Loading family health profiles from database...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs">
          <p className="font-semibold mb-1">Error Loading Family Data</p>
          <p>{error}</p>
        </div>
      ) : !selectedFamily ? (
        /* Empty State: Prompt user to create family */
        <div className="p-10 text-center bg-gradient-to-b from-white to-slate-50 border border-slate-200 rounded-2xl shadow-sm max-w-2xl mx-auto">
          <div className="w-16 h-16 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-teal-100">
            <Users className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-1.5">No Family Unit Registered Yet</h2>
          <p className="text-xs text-slate-600 max-w-md mx-auto mb-6">
            Create your family health vault to start adding dependents, tracking immunization milestones, and logging verified vaccinations.
          </p>
          <button
            id="create-first-family-btn"
            onClick={handleOpenCreateFamily}
            className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-xl shadow-lg shadow-teal-600/20 inline-flex items-center space-x-2 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create Your Family Unit</span>
          </button>
        </div>
      ) : (
        /* Family View */
        <div className="space-y-6">
          {/* Family Banner Card */}
          <div className="p-5 bg-gradient-to-r from-teal-900 via-slate-900 to-emerald-950 text-white rounded-2xl shadow-md border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300 flex-shrink-0">
                <Home className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-lg font-bold text-white">{selectedFamily.name}</h2>
                  <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-semibold rounded-full">
                    {selectedFamily.members?.length || 0} Registered Members
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300 mt-1">
                  {selectedFamily.address && (
                    <span className="flex items-center">
                      <span className="text-slate-400 mr-1">Address:</span> {selectedFamily.address}
                    </span>
                  )}
                  {selectedFamily.emergency_contact && (
                    <span className="flex items-center">
                      <Phone className="w-3 h-3 mr-1 text-emerald-400" /> {selectedFamily.emergency_contact}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleOpenAddMember}
                className="px-3.5 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs rounded-xl shadow transition-all flex items-center space-x-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Family Member</span>
              </button>
            </div>
          </div>

          {/* Search and Filters Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 border border-slate-200 rounded-2xl shadow-sm">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search member, allergy, notes..."
                className="w-full pl-9 pr-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
              />
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Filter:</span>
              {['All', 'Self', 'Child', 'Spouse', 'Parent'].map((rel) => (
                <button
                  key={rel}
                  onClick={() => setRelationshipFilter(rel)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    relationshipFilter === rel
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {rel}
                </button>
              ))}
            </div>
          </div>

          {/* Members Cards Grid */}
          {filteredMembers.length === 0 ? (
            <div className="p-10 text-center bg-white border border-dashed border-slate-300 rounded-2xl">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h3 className="font-semibold text-slate-800 text-sm">No members match your filter</h3>
              <p className="text-xs text-slate-500 mt-1">
                {selectedFamily.members?.length === 0
                  ? 'Get started by adding your first family member profile.'
                  : 'Try adjusting your search keyword or relationship filter.'}
              </p>
              {selectedFamily.members?.length === 0 && (
                <button
                  onClick={handleOpenAddMember}
                  className="mt-3 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-xl shadow-sm"
                >
                  Add First Member
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMembers.map((member) => (
                <div
                  key={member.id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-teal-300 transition-all flex flex-col justify-between group"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-white flex items-center justify-center font-bold text-sm shadow-sm flex-shrink-0">
                          {member.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm group-hover:text-teal-700 transition-colors">
                            {member.name}
                          </h3>
                          <div className="flex items-center space-x-1.5 mt-0.5">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-semibold rounded-md">
                              {member.relationship}
                            </span>
                            <span className="text-[10px] text-slate-400">•</span>
                            <span className="text-[11px] text-slate-500 font-medium">
                              {calculateAge(member.date_of_birth)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleOpenEditMember(member)}
                          className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Edit member"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteMember(member)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete member"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Meta attributes */}
                    <div className="space-y-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 my-3">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 flex items-center">
                          <Calendar className="w-3 h-3 mr-1" /> Born:
                        </span>
                        <span className="font-medium text-slate-800">{member.date_of_birth}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 flex items-center">
                          <Droplet className="w-3 h-3 mr-1 text-rose-500" /> Blood Group:
                        </span>
                        <span className="font-semibold text-slate-800">{member.blood_group || 'Unknown'}</span>
                      </div>
                      {member.allergies && (
                        <div className="flex items-start justify-between">
                          <span className="text-slate-400 flex items-center">
                            <AlertCircle className="w-3 h-3 mr-1 text-amber-500" /> Allergies:
                          </span>
                          <span className="font-medium text-amber-700 max-w-[140px] text-right truncate">
                            {member.allergies}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer & Actions */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center space-x-1 text-xs text-teal-700 font-semibold">
                      <Syringe className="w-3.5 h-3.5" />
                      <span>{member.vaccination_count || 0} Doses Logged</span>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => handleQuickLogVaccine(member.id)}
                        className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg text-[11px] font-semibold transition-colors flex items-center space-x-1"
                        title="Log a vaccination for this member"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Log Vaccine</span>
                      </button>

                      <button
                        onClick={() => navigate(`/family/members/${member.id}`)}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition-colors"
                        title="View Full Profile"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Family Create / Edit Modal */}
      {isFamilyModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100">
            <div className="bg-gradient-to-r from-teal-600 to-emerald-600 p-5 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Home className="w-5 h-5" />
                <h3 className="font-bold text-base">
                  {familyFormMode === 'create' ? 'Create Family Unit' : 'Edit Family Details'}
                </h3>
              </div>
              <button
                onClick={() => setIsFamilyModalOpen(false)}
                className="p-1.5 text-white/80 hover:text-white rounded-full hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveFamily} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Family Name *</label>
                <input
                  type="text"
                  value={familyNameInput}
                  onChange={(e) => setFamilyNameInput(e.target.value)}
                  placeholder="e.g. The Sharma Household"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Primary Address</label>
                <input
                  type="text"
                  value={familyAddressInput}
                  onChange={(e) => setFamilyAddressInput(e.target.value)}
                  placeholder="e.g. 42 Park Avenue, City"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Emergency Contact Number</label>
                <input
                  type="text"
                  value={familyEmergencyInput}
                  onChange={(e) => setFamilyEmergencyInput(e.target.value)}
                  placeholder="e.g. +1 (555) 019-2834"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={() => setIsFamilyModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isActionLoading}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold text-xs shadow-md shadow-teal-600/20 disabled:opacity-50"
                >
                  {isActionLoading ? 'Saving...' : familyFormMode === 'create' ? 'Create Family' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Member Create / Edit Modal */}
      {isMemberModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100">
            <div className="bg-gradient-to-r from-teal-600 to-emerald-600 p-5 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <UserPlus className="w-5 h-5" />
                <h3 className="font-bold text-base">
                  {memberFormMode === 'create' ? 'Add Family Member' : 'Edit Member Profile'}
                </h3>
              </div>
              <button
                onClick={() => setIsMemberModalOpen(false)}
                className="p-1.5 text-white/80 hover:text-white rounded-full hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMember} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  placeholder="e.g. Leo Sharma"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date of Birth *</label>
                  <input
                    type="date"
                    value={memberDob}
                    onChange={(e) => setMemberDob(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Relationship *</label>
                  <select
                    value={memberRelationship}
                    onChange={(e) => setMemberRelationship(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
                  >
                    {RELATIONSHIPS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Gender</label>
                  <select
                    value={memberGender}
                    onChange={(e) => setMemberGender(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
                  >
                    {GENDERS.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Blood Group</label>
                  <select
                    value={memberBloodGroup}
                    onChange={(e) => setMemberBloodGroup(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
                  >
                    {BLOOD_GROUPS.map((bg) => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Known Allergies</label>
                <input
                  type="text"
                  value={memberAllergies}
                  onChange={(e) => setMemberAllergies(e.target.value)}
                  placeholder="e.g. Penicillin, Peanuts, Latex"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Medical Notes & Health History</label>
                <textarea
                  value={memberNotes}
                  onChange={(e) => setMemberNotes(e.target.value)}
                  placeholder="e.g. Asthma, premature infant milestones, pediatrician contact..."
                  rows={3}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={() => setIsMemberModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isActionLoading}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold text-xs shadow-md shadow-teal-600/20 disabled:opacity-50"
                >
                  {isActionLoading ? 'Saving...' : memberFormMode === 'create' ? 'Add Member' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Vaccination Modal */}
      {selectedFamily && (
        <VaccinationModal
          isOpen={isVaxModalOpen}
          onClose={() => setIsVaxModalOpen(false)}
          onSave={handleSaveVaccination}
          members={selectedFamily.members || []}
          defaultMemberId={vaxDefaultMemberId}
        />
      )}
    </div>
  );
};
