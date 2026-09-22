import { api } from './api';
import { localDb } from '../db';
import { syncService } from './syncService';

export interface Member {
  id: string;
  family_id: string;
  user_id?: string;
  name: string;
  date_of_birth: string;
  relationship: string;
  gender?: string;
  blood_group?: string;
  allergies?: string;
  medical_notes?: string;
  created_at?: string;
  updated_at?: string;
  vaccination_count?: number;
}

export interface Family {
  id: string;
  user_id?: string;
  name: string;
  address?: string;
  emergency_contact?: string;
  created_at?: string;
  updated_at?: string;
  member_count?: number;
  members?: Member[];
}

export interface CreateFamilyPayload {
  name: string;
  address?: string;
  emergency_contact?: string;
}

export interface UpdateFamilyPayload {
  name?: string;
  address?: string;
  emergency_contact?: string;
}

export interface CreateMemberPayload {
  name: string;
  date_of_birth: string;
  relationship: string;
  gender?: string;
  blood_group?: string;
  allergies?: string;
  medical_notes?: string;
}

export interface UpdateMemberPayload {
  name?: string;
  date_of_birth?: string;
  relationship?: string;
  gender?: string;
  blood_group?: string;
  allergies?: string;
  medical_notes?: string;
}

export const familyService = {
  getFamilies: async (): Promise<Family[]> => {
    if (syncService.isOnline()) {
      try {
        const families = await api.get<Family[]>('/api/v1/families');
        for (const fam of families) {
          await localDb.families.put({
            id: fam.id,
            user_id: fam.user_id || '',
            name: fam.name,
            created_at: fam.created_at || new Date().toISOString(),
            updated_at: fam.updated_at || new Date().toISOString(),
            members_count: fam.member_count,
            _syncStatus: 'synced',
          });
        }
        return families;
      } catch (err) {
        console.warn('Network getFamilies failed, reading from Dexie:', err);
      }
    }

    const localFams = await localDb.families.toArray();
    return localFams.map((f) => ({
      id: f.id,
      user_id: f.user_id,
      name: f.name,
      created_at: f.created_at,
      updated_at: f.updated_at,
      member_count: f.members_count || 0,
    }));
  },

  getFamily: async (familyId: string): Promise<Family> => {
    if (syncService.isOnline()) {
      try {
        const fam = await api.get<Family>(`/api/v1/families/${familyId}`);
        await localDb.families.put({
          id: fam.id,
          user_id: fam.user_id || '',
          name: fam.name,
          created_at: fam.created_at || new Date().toISOString(),
          updated_at: fam.updated_at || new Date().toISOString(),
          members_count: fam.members?.length || fam.member_count,
          _syncStatus: 'synced',
        });

        if (fam.members) {
          for (const m of fam.members) {
            await localDb.members.put({
              id: m.id,
              family_id: fam.id,
              name: m.name,
              date_of_birth: m.date_of_birth,
              relationship: m.relationship,
              gender: m.gender || null,
              profile_info: {
                blood_group: m.blood_group,
                allergies: m.allergies,
                medical_notes: m.medical_notes,
              },
              created_at: m.created_at || new Date().toISOString(),
              updated_at: m.updated_at || new Date().toISOString(),
              _syncStatus: 'synced',
            });
          }
        }
        return fam;
      } catch (err) {
        console.warn('Network getFamily failed, reading from Dexie:', err);
      }
    }

    const localFam = await localDb.families.get(familyId);
    const localMembers = await localDb.members.where('family_id').equals(familyId).toArray();

    return {
      id: familyId,
      user_id: localFam?.user_id || '',
      name: localFam?.name || 'Local Family',
      created_at: localFam?.created_at,
      updated_at: localFam?.updated_at,
      member_count: localMembers.length,
      members: localMembers.map((m) => ({
        id: m.id,
        family_id: m.family_id,
        name: m.name,
        date_of_birth: m.date_of_birth,
        relationship: m.relationship,
        gender: m.gender || undefined,
        blood_group: m.profile_info?.blood_group,
        allergies: m.profile_info?.allergies,
        medical_notes: m.profile_info?.medical_notes,
        created_at: m.created_at,
        updated_at: m.updated_at,
      })),
    };
  },

  createFamily: async (payload: CreateFamilyPayload): Promise<Family> => {
    return await api.post<Family>('/api/v1/families', payload);
  },

  updateFamily: async (familyId: string, payload: UpdateFamilyPayload): Promise<Family> => {
    return await api.put<Family>(`/api/v1/families/${familyId}`, payload);
  },

  addMember: async (familyId: string, payload: CreateMemberPayload): Promise<Member> => {
    const member = await api.post<Member>(`/api/v1/families/${familyId}/members`, payload);
    await localDb.members.put({
      id: member.id,
      family_id: familyId,
      name: member.name,
      date_of_birth: member.date_of_birth,
      relationship: member.relationship,
      gender: member.gender || null,
      profile_info: {
        blood_group: member.blood_group,
        allergies: member.allergies,
        medical_notes: member.medical_notes,
      },
      created_at: member.created_at || new Date().toISOString(),
      updated_at: member.updated_at || new Date().toISOString(),
      _syncStatus: 'synced',
    });
    return member;
  },

  getMember: async (memberId: string): Promise<Member> => {
    if (syncService.isOnline()) {
      try {
        const member = await api.get<Member>(`/api/v1/members/${memberId}`);
        await localDb.members.put({
          id: member.id,
          family_id: member.family_id,
          name: member.name,
          date_of_birth: member.date_of_birth,
          relationship: member.relationship,
          gender: member.gender || null,
          profile_info: {
            blood_group: member.blood_group,
            allergies: member.allergies,
            medical_notes: member.medical_notes,
          },
          created_at: member.created_at || new Date().toISOString(),
          updated_at: member.updated_at || new Date().toISOString(),
          _syncStatus: 'synced',
        });
        return member;
      } catch (err) {
        console.warn('Network getMember failed, reading from Dexie:', err);
      }
    }

    const m = await localDb.members.get(memberId);
    if (!m) throw new Error(`Member ${memberId} not found in offline store`);
    return {
      id: m.id,
      family_id: m.family_id,
      name: m.name,
      date_of_birth: m.date_of_birth,
      relationship: m.relationship,
      gender: m.gender || undefined,
      blood_group: m.profile_info?.blood_group,
      allergies: m.profile_info?.allergies,
      medical_notes: m.profile_info?.medical_notes,
      created_at: m.created_at,
      updated_at: m.updated_at,
    };
  },

  updateMember: async (memberId: string, payload: UpdateMemberPayload): Promise<Member> => {
    const updated = await api.put<Member>(`/api/v1/members/${memberId}`, payload);
    await localDb.members.put({
      id: updated.id,
      family_id: updated.family_id,
      name: updated.name,
      date_of_birth: updated.date_of_birth,
      relationship: updated.relationship,
      gender: updated.gender || null,
      profile_info: {
        blood_group: updated.blood_group,
        allergies: updated.allergies,
        medical_notes: updated.medical_notes,
      },
      created_at: updated.created_at || new Date().toISOString(),
      updated_at: updated.updated_at || new Date().toISOString(),
      _syncStatus: 'synced',
    });
    return updated;
  },

  deleteMember: async (memberId: string): Promise<{ message: string; id: string }> => {
    const res = await api.delete<{ message: string; id: string }>(`/api/v1/members/${memberId}`);
    await localDb.members.delete(memberId);
    return res;
  },
};
