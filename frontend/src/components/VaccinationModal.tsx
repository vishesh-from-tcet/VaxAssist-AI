import React, { useState, useEffect } from 'react';
import { X, Syringe, Calendar, User, Building2, Stethoscope, Hash, FileText, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Member } from '../services/familyService';
import { VaccinationRecord, CreateVaccinationPayload, UpdateVaccinationPayload } from '../services/vaccinationService';

interface VaccinationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: CreateVaccinationPayload | UpdateVaccinationPayload) => Promise<void>;
  members: Member[];
  initialRecord?: VaccinationRecord | null;
  defaultMemberId?: string;
}

const COMMON_VACCINES = [
  'COVID-19 (Covishield / AstraZeneca)',
  'COVID-19 (Pfizer-BioNTech / Comirnaty)',
  'COVID-19 (Moderna / Spikevax)',
  'COVID-19 (Covaxin)',
  'Influenza (Quadrivalent Flu Shot)',
  'Hepatitis B (HepB)',
  'Hepatitis A (HepA)',
  'MMR (Measles, Mumps, Rubella)',
  'BCG (Tuberculosis)',
  'Polio (OPV / IPV)',
  'Tdap / DTP (Diphtheria, Tetanus, Pertussis)',
  'Varicella (Chickenpox)',
  'HPV (Human Papillomavirus)',
  'Pneumococcal (PCV13 / PPSV23)',
  'Rotavirus',
  'Typhoid (Typbar-TCV)',
  'Rabies',
  'Yellow Fever',
];

const COMMON_DOSES = ['Dose 1', 'Dose 2', 'Dose 3', 'Booster 1', 'Booster 2', 'Annual Dose', 'Single Dose'];

export const VaccinationModal: React.FC<VaccinationModalProps> = ({
  isOpen,
  onClose,
  onSave,
  members,
  initialRecord,
  defaultMemberId,
}) => {
  const [memberId, setMemberId] = useState<string>('');
  const [vaccineName, setVaccineName] = useState<string>('');
  const [dose, setDose] = useState<string>('Dose 1');
  const [administrationDate, setAdministrationDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [provider, setProvider] = useState<string>('');
  const [clinic, setClinic] = useState<string>('');
  const [batchNumber, setBatchNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [source, setSource] = useState<string>('manual');
  const [verificationStatus, setVerificationStatus] = useState<string>('verified');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialRecord) {
      setMemberId(initialRecord.member_id);
      setVaccineName(initialRecord.vaccine_name);
      setDose(initialRecord.dose);
      setAdministrationDate(initialRecord.administration_date);
      setProvider(initialRecord.provider || '');
      setClinic(initialRecord.clinic || '');
      setBatchNumber(initialRecord.batch_number || '');
      setNotes(initialRecord.notes || '');
      setSource(initialRecord.source || 'manual');
      setVerificationStatus(initialRecord.verification_status || 'verified');
    } else {
      setMemberId(defaultMemberId || (members.length > 0 ? members[0].id : ''));
      setVaccineName('');
      setDose('Dose 1');
      setAdministrationDate(new Date().toISOString().split('T')[0]);
      setProvider('');
      setClinic('');
      setBatchNumber('');
      setNotes('');
      setSource('manual');
      setVerificationStatus('verified');
    }
    setError(null);
  }, [initialRecord, defaultMemberId, members, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberId) {
      setError('Please select a family member.');
      return;
    }
    if (!vaccineName.trim()) {
      setError('Please enter or select a vaccine name.');
      return;
    }
    if (!administrationDate) {
      setError('Please select the date of administration.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSave({
        member_id: memberId,
        vaccine_name: vaccineName.trim(),
        dose: dose.trim(),
        administration_date: administrationDate,
        provider: provider.trim() || undefined,
        clinic: clinic.trim() || undefined,
        batch_number: batchNumber.trim() || undefined,
        notes: notes.trim() || undefined,
        source,
        verification_status: verificationStatus,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save vaccination record');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-600 to-emerald-600 p-6 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-md">
              <Syringe className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">
                {initialRecord ? 'Edit Immunization Record' : 'Log New Immunization'}
              </h2>
              <p className="text-teal-100 text-xs mt-0.5">
                {initialRecord ? 'Update dose details and verification info' : 'Add verified dose to personal immunization passport'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Member Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center">
              <User className="w-3.5 h-3.5 mr-1 text-teal-600" /> Family Member *
            </label>
            <select
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
            >
              <option value="" disabled>Select family member</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.relationship})
                </option>
              ))}
            </select>
          </div>

          {/* Vaccine Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
              <span className="flex items-center">
                <Syringe className="w-3.5 h-3.5 mr-1 text-teal-600" /> Vaccine Name *
              </span>
              <span className="text-[10px] text-slate-400">Search or select below</span>
            </label>
            <input
              type="text"
              list="vaccine-options"
              value={vaccineName}
              onChange={(e) => setVaccineName(e.target.value)}
              placeholder="e.g. COVID-19 (Covishield / AstraZeneca)"
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
            />
            <datalist id="vaccine-options">
              {COMMON_VACCINES.map((v) => (
                <option key={v} value={v} />
              ))}
            </datalist>
          </div>

          {/* Dose & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Dose *</label>
              <input
                type="text"
                list="dose-options"
                value={dose}
                onChange={(e) => setDose(e.target.value)}
                placeholder="e.g. Dose 1, Booster"
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
              />
              <datalist id="dose-options">
                {COMMON_DOSES.map((d) => (
                  <option key={d} value={d} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center">
                <Calendar className="w-3.5 h-3.5 mr-1 text-teal-600" /> Administration Date *
              </label>
              <input
                type="date"
                value={administrationDate}
                onChange={(e) => setAdministrationDate(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Clinic & Provider */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center">
                <Building2 className="w-3.5 h-3.5 mr-1 text-slate-400" /> Clinic / Hospital
              </label>
              <input
                type="text"
                value={clinic}
                onChange={(e) => setClinic(e.target.value)}
                placeholder="e.g. City Immunization Clinic"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center">
                <Stethoscope className="w-3.5 h-3.5 mr-1 text-slate-400" /> Healthcare Provider
              </label>
              <input
                type="text"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                placeholder="e.g. Dr. A. Sharma"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Batch Number & Verification Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center">
                <Hash className="w-3.5 h-3.5 mr-1 text-slate-400" /> Batch / Lot Number
              </label>
              <input
                type="text"
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                placeholder="e.g. LOT-2024-X99"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-slate-400" /> Verification Status
              </label>
              <select
                value={verificationStatus}
                onChange={(e) => setVerificationStatus(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
              >
                <option value="verified">Verified (Official Certificate)</option>
                <option value="pending">Pending Verification</option>
                <option value="self_reported">Self-Reported</option>
              </select>
            </div>
          </div>

          {/* Clinical Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center">
              <FileText className="w-3.5 h-3.5 mr-1 text-slate-400" /> Clinical Notes / Observations
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any post-vaccination reactions, booster reminders, or certificate reference..."
              rows={3}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all resize-none"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl font-semibold text-xs shadow-md shadow-teal-600/20 disabled:opacity-50 transition-all"
            >
              {isSubmitting ? 'Saving...' : initialRecord ? 'Save Changes' : 'Log Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
