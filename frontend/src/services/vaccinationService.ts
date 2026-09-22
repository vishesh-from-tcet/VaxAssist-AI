import { api } from './api';
import { localDb, type LocalVaccination } from '../db';
import { syncService } from './syncService';

export interface VaccinationRecord {
  id: string;
  user_id?: string;
  family_id?: string;
  member_id: string;
  member_name?: string;
  vaccine_name: string;
  dose: string;
  administration_date: string;
  provider?: string | null;
  clinic?: string | null;
  batch_lot_number?: string | null;
  batch_number?: string | null;
  notes?: string | null;
  source?: string | null;
  verification_status?: 'verified' | 'pending' | 'self_reported' | string | null;
  created_at?: string;
  updated_at?: string;
  _syncStatus?: 'synced' | 'pending' | 'conflict';
  _isLocal?: boolean;
}

export interface CreateVaccinationPayload {
  member_id: string;
  vaccine_name: string;
  dose: string;
  administration_date: string;
  provider?: string | null;
  clinic?: string | null;
  batch_lot_number?: string | null;
  batch_number?: string | null;
  notes?: string | null;
  source?: string | null;
  verification_status?: string | null;
}

export interface UpdateVaccinationPayload {
  member_id?: string;
  vaccine_name?: string;
  dose?: string;
  administration_date?: string;
  provider?: string | null;
  clinic?: string | null;
  batch_lot_number?: string | null;
  batch_number?: string | null;
  notes?: string | null;
  source?: string | null;
  verification_status?: string | null;
}

export interface GetVaccinationsParams {
  member_id?: string;
  family_id?: string;
  verification_status?: string;
  search?: string;
  sort_by?: 'administration_date' | 'vaccine_name' | 'created_at';
  order?: 'asc' | 'desc';
}

export const vaccinationService = {
  getVaccinations: async (params?: GetVaccinationsParams): Promise<VaccinationRecord[]> => {
    // If online, attempt network fetch first
    if (syncService.isOnline()) {
      try {
        const query = new URLSearchParams();
        if (params) {
          if (params.member_id) query.append('member_id', params.member_id);
          if (params.family_id) query.append('family_id', params.family_id);
          if (params.verification_status) query.append('verification_status', params.verification_status);
          if (params.search) query.append('search', params.search);
          if (params.sort_by) query.append('sort_by', params.sort_by);
          if (params.order) query.append('order', params.order);
        }
        const queryString = query.toString();
        const endpoint = queryString ? `/api/v1/vaccinations?${queryString}` : '/api/v1/vaccinations';
        const records = await api.get<VaccinationRecord[]>(endpoint);

        // Cache remote records into local Dexie store
        for (const record of records) {
          await localDb.vaccinations.put({
            id: record.id,
            member_id: record.member_id,
            vaccine_name: record.vaccine_name,
            dose: record.dose,
            administration_date: record.administration_date,
            provider: record.provider || null,
            clinic: record.clinic || null,
            batch_lot_number: record.batch_lot_number || record.batch_number || null,
            notes: record.notes || null,
            source: record.source || null,
            verification_status: record.verification_status || null,
            created_at: record.created_at || new Date().toISOString(),
            updated_at: record.updated_at || new Date().toISOString(),
            _syncStatus: 'synced',
            _isLocal: false,
          });
        }

        return records;
      } catch (err) {
        console.warn('Network request failed, falling back to local Dexie IndexedDB cache:', err);
      }
    }

    // Offline / fallback read from Dexie
    let collection = localDb.vaccinations.toCollection();
    if (params?.member_id) {
      collection = localDb.vaccinations.where('member_id').equals(params.member_id);
    }

    let localRecords = await collection.toArray();

    if (params?.search) {
      const q = params.search.toLowerCase();
      localRecords = localRecords.filter(
        (r) =>
          r.vaccine_name.toLowerCase().includes(q) ||
          r.dose.toLowerCase().includes(q) ||
          (r.provider && r.provider.toLowerCase().includes(q)) ||
          (r.clinic && r.clinic.toLowerCase().includes(q))
      );
    }

    if (params?.sort_by === 'administration_date') {
      localRecords.sort((a, b) =>
        params.order === 'asc'
          ? a.administration_date.localeCompare(b.administration_date)
          : b.administration_date.localeCompare(a.administration_date)
      );
    } else {
      localRecords.sort((a, b) => b.administration_date.localeCompare(a.administration_date));
    }

    return localRecords.map((r) => ({
      ...r,
      batch_number: r.batch_lot_number || undefined,
    }));
  },

  getVaccination: async (id: string): Promise<VaccinationRecord> => {
    if (syncService.isOnline()) {
      try {
        const record = await api.get<VaccinationRecord>(`/api/v1/vaccinations/${id}`);
        await localDb.vaccinations.put({
          id: record.id,
          member_id: record.member_id,
          vaccine_name: record.vaccine_name,
          dose: record.dose,
          administration_date: record.administration_date,
          provider: record.provider || null,
          clinic: record.clinic || null,
          batch_lot_number: record.batch_lot_number || record.batch_number || null,
          notes: record.notes || null,
          source: record.source || null,
          verification_status: record.verification_status || null,
          created_at: record.created_at || new Date().toISOString(),
          updated_at: record.updated_at || new Date().toISOString(),
          _syncStatus: 'synced',
          _isLocal: false,
        });
        return record;
      } catch (err) {
        console.warn('Network get failed, falling back to local Dexie cache:', err);
      }
    }

    const localRec = await localDb.vaccinations.get(id);
    if (!localRec) {
      throw new Error(`Vaccination record ${id} not found in offline store`);
    }
    return {
      ...localRec,
      batch_number: localRec.batch_lot_number || undefined,
    };
  },

  createVaccination: async (payload: CreateVaccinationPayload): Promise<VaccinationRecord> => {
    const batchVal = payload.batch_lot_number || payload.batch_number || null;
    const cleanPayload = {
      ...payload,
      batch_lot_number: batchVal,
    };

    if (syncService.isOnline()) {
      try {
        const remote = await api.post<VaccinationRecord>('/api/v1/vaccinations', cleanPayload);
        await localDb.vaccinations.put({
          id: remote.id,
          member_id: remote.member_id,
          vaccine_name: remote.vaccine_name,
          dose: remote.dose,
          administration_date: remote.administration_date,
          provider: remote.provider || null,
          clinic: remote.clinic || null,
          batch_lot_number: remote.batch_lot_number || remote.batch_number || null,
          notes: remote.notes || null,
          source: remote.source || null,
          verification_status: remote.verification_status || null,
          created_at: remote.created_at || new Date().toISOString(),
          updated_at: remote.updated_at || new Date().toISOString(),
          _syncStatus: 'synced',
          _isLocal: false,
        });
        return {
          ...remote,
          _syncStatus: 'synced',
          _isLocal: false,
        };
      } catch (err) {
        console.warn('Online creation failed, queueing offline mutation:', err);
      }
    }

    // Offline optimistic creation
    const tempId = `loc-vax-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();
    const optimisticRecord: LocalVaccination = {
      id: tempId,
      member_id: payload.member_id,
      vaccine_name: payload.vaccine_name,
      dose: payload.dose,
      administration_date: payload.administration_date,
      provider: payload.provider || null,
      clinic: payload.clinic || null,
      batch_lot_number: batchVal,
      notes: payload.notes || null,
      source: payload.source || 'Offline Clinical Entry',
      verification_status: payload.verification_status || 'pending',
      created_at: nowIso,
      updated_at: nowIso,
      _syncStatus: 'pending',
      _isLocal: true,
    };

    await localDb.vaccinations.put(optimisticRecord);

    await syncService.queueMutation({
      temp_id: tempId,
      action: 'CREATE_VAX',
      entity: 'vaccination',
      endpoint: '/api/v1/vaccinations',
      method: 'POST',
      payload: cleanPayload,
    });

    return {
      ...optimisticRecord,
      batch_number: batchVal || undefined,
    };
  },

  updateVaccination: async (id: string, payload: UpdateVaccinationPayload): Promise<VaccinationRecord> => {
    const batchVal = payload.batch_lot_number || payload.batch_number || null;
    const cleanPayload = {
      ...payload,
      batch_lot_number: batchVal,
    };

    if (syncService.isOnline() && !id.startsWith('loc-')) {
      try {
        const remote = await api.put<VaccinationRecord>(`/api/v1/vaccinations/${id}`, cleanPayload);
        await localDb.vaccinations.put({
          id: remote.id,
          member_id: remote.member_id,
          vaccine_name: remote.vaccine_name,
          dose: remote.dose,
          administration_date: remote.administration_date,
          provider: remote.provider || null,
          clinic: remote.clinic || null,
          batch_lot_number: remote.batch_lot_number || remote.batch_number || null,
          notes: remote.notes || null,
          source: remote.source || null,
          verification_status: remote.verification_status || null,
          created_at: remote.created_at || new Date().toISOString(),
          updated_at: remote.updated_at || new Date().toISOString(),
          _syncStatus: 'synced',
          _isLocal: false,
        });
        return {
          ...remote,
          _syncStatus: 'synced',
          _isLocal: false,
        };
      } catch (err) {
        console.warn('Online update failed, queueing offline mutation:', err);
      }
    }

    // Offline optimistic update
    const existing = await localDb.vaccinations.get(id);
    const nowIso = new Date().toISOString();
    const updatedRecord: LocalVaccination = {
      id,
      member_id: payload.member_id || existing?.member_id || '',
      vaccine_name: payload.vaccine_name || existing?.vaccine_name || '',
      dose: payload.dose || existing?.dose || '',
      administration_date: payload.administration_date || existing?.administration_date || '',
      provider: payload.provider !== undefined ? payload.provider : existing?.provider,
      clinic: payload.clinic !== undefined ? payload.clinic : existing?.clinic,
      batch_lot_number: batchVal !== null ? batchVal : existing?.batch_lot_number,
      notes: payload.notes !== undefined ? payload.notes : existing?.notes,
      source: payload.source !== undefined ? payload.source : existing?.source,
      verification_status: payload.verification_status !== undefined ? payload.verification_status : existing?.verification_status,
      created_at: existing?.created_at || nowIso,
      updated_at: nowIso,
      _syncStatus: 'pending',
      _isLocal: existing?._isLocal || id.startsWith('loc-'),
    };

    await localDb.vaccinations.put(updatedRecord);

    await syncService.queueMutation({
      temp_id: id,
      action: 'UPDATE_VAX',
      entity: 'vaccination',
      endpoint: `/api/v1/vaccinations/${id}`,
      method: 'PUT',
      payload: cleanPayload,
    });

    return {
      ...updatedRecord,
      batch_number: updatedRecord.batch_lot_number || undefined,
    };
  },

  deleteVaccination: async (id: string): Promise<{ message: string; id: string }> => {
    if (syncService.isOnline() && !id.startsWith('loc-')) {
      try {
        const res = await api.delete<{ message: string; id: string }>(`/api/v1/vaccinations/${id}`);
        await localDb.vaccinations.delete(id);
        return res;
      } catch (err) {
        console.warn('Online delete failed, queueing offline mutation:', err);
      }
    }

    await localDb.vaccinations.delete(id);

    if (!id.startsWith('loc-')) {
      await syncService.queueMutation({
        temp_id: id,
        action: 'DELETE_VAX',
        entity: 'vaccination',
        endpoint: `/api/v1/vaccinations/${id}`,
        method: 'DELETE',
        payload: null,
      });
    }

    return { message: 'Vaccination deleted locally', id };
  },
};
