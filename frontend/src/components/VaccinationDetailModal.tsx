import React from 'react';
import { X, Syringe, Calendar, User, Building2, Stethoscope, Hash, FileText, CheckCircle2, Clock, AlertTriangle, Edit3, Trash2 } from 'lucide-react';
import { VaccinationRecord } from '../services/vaccinationService';

interface VaccinationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: VaccinationRecord | null;
  onEdit: (record: VaccinationRecord) => void;
  onDelete: (recordId: string) => Promise<void>;
}

export const VaccinationDetailModal: React.FC<VaccinationDetailModalProps> = ({
  isOpen,
  onClose,
  record,
  onEdit,
  onDelete,
}) => {
  const [isDeleting, setIsDeleting] = React.useState(false);

  if (!isOpen || !record) return null;

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to permanently delete the vaccination record for "${record.vaccine_name}"?`)) {
      setIsDeleting(true);
      try {
        await onDelete(record.id);
        onClose();
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const getStatusBadge = (status?: string | null) => {
    switch (status) {
      case 'verified':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Verified Record
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3.5 h-3.5 mr-1 text-amber-600" /> Pending Verification
          </span>
        );
      case 'self_reported':
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-100 text-sky-800 border border-sky-200">
            <AlertTriangle className="w-3.5 h-3.5 mr-1 text-sky-600" /> Self-Reported
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-teal-500/20 text-teal-300 rounded-xl">
              <Syringe className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold">{record.vaccine_name}</h2>
              <p className="text-slate-400 text-xs mt-0.5">{record.dose} • {record.member_name || 'Family Member'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Status & Date */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <div>
              <span className="text-[11px] font-medium text-slate-500 block">Verification Status</span>
              <div className="mt-1">{getStatusBadge(record.verification_status)}</div>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-medium text-slate-500 block">Administration Date</span>
              <span className="text-xs font-bold text-slate-900 mt-1 flex items-center justify-end">
                <Calendar className="w-3.5 h-3.5 mr-1 text-teal-600" /> {record.administration_date}
              </span>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-slate-500 font-medium flex items-center mb-1">
                <User className="w-3.5 h-3.5 mr-1 text-slate-400" /> Member Name
              </span>
              <span className="font-semibold text-slate-800">{record.member_name || 'N/A'}</span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-slate-500 font-medium flex items-center mb-1">
                <Hash className="w-3.5 h-3.5 mr-1 text-slate-400" /> Batch / Lot Number
              </span>
              <span className="font-semibold text-slate-800 font-mono">{record.batch_number || 'Not Recorded'}</span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-slate-500 font-medium flex items-center mb-1">
                <Building2 className="w-3.5 h-3.5 mr-1 text-slate-400" /> Clinic / Center
              </span>
              <span className="font-semibold text-slate-800">{record.clinic || 'Not Specified'}</span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-slate-500 font-medium flex items-center mb-1">
                <Stethoscope className="w-3.5 h-3.5 mr-1 text-slate-400" /> Healthcare Provider
              </span>
              <span className="font-semibold text-slate-800">{record.provider || 'Not Specified'}</span>
            </div>
          </div>

          {/* Clinical Notes */}
          {record.notes && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-slate-500 font-medium text-xs flex items-center mb-1.5">
                <FileText className="w-3.5 h-3.5 mr-1 text-slate-400" /> Clinical Notes & Observations
              </span>
              <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{record.notes}</p>
            </div>
          )}

          {/* Audit Timestamps */}
          <div className="p-3 bg-slate-100/70 border border-slate-200/60 rounded-xl text-[11px] text-slate-500 space-y-1">
            <div className="flex justify-between">
              <span>Record ID:</span>
              <span className="font-mono text-slate-700">{record.id}</span>
            </div>
            <div className="flex justify-between">
              <span>Source Type:</span>
              <span className="capitalize text-slate-700">{record.source || 'manual'}</span>
            </div>
            {record.created_at && (
              <div className="flex justify-between">
                <span>Created:</span>
                <span className="text-slate-700">{new Date(record.created_at).toLocaleString()}</span>
              </div>
            )}
            {record.updated_at && (
              <div className="flex justify-between">
                <span>Last Updated:</span>
                <span className="text-slate-700">{new Date(record.updated_at).toLocaleString()}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-3.5 py-2 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isDeleting ? 'Deleting...' : 'Delete Record'}</span>
            </button>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(record);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
