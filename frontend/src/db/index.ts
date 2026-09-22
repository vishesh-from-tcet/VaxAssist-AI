import Dexie, { type Table } from 'dexie';

export interface LocalFamily {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
  members_count?: number;
  members?: LocalMember[];
  _syncStatus?: 'synced' | 'pending' | 'conflict';
}

export interface LocalMember {
  id: string;
  family_id: string;
  name: string;
  date_of_birth: string;
  relationship: string;
  gender?: string | null;
  profile_info?: Record<string, any> | null;
  created_at: string;
  updated_at: string;
  _syncStatus?: 'synced' | 'pending' | 'conflict';
}

export interface LocalVaccination {
  id: string;
  member_id: string;
  vaccine_name: string;
  dose: string;
  administration_date: string;
  provider?: string | null;
  clinic?: string | null;
  batch_lot_number?: string | null;
  notes?: string | null;
  source?: string | null;
  verification_status?: string | null;
  created_at: string;
  updated_at: string;
  _syncStatus?: 'synced' | 'pending' | 'conflict';
  _isLocal?: boolean;
}

export interface LocalScheduleRecord {
  member_id: string;
  schedule_version: string;
  country: string;
  generated_at: string;
  summary: {
    total_milestones: number;
    completed_count: number;
    upcoming_count: number;
    overdue_count: number;
    unverified_count: number;
  };
  milestones: any[];
}

export interface MutationQueueItem {
  id?: number;
  temp_id: string;
  action: 'CREATE_VAX' | 'UPDATE_VAX' | 'DELETE_VAX' | 'CREATE_MEMBER' | 'UPDATE_MEMBER' | 'DELETE_MEMBER';
  entity: 'vaccination' | 'member' | 'family';
  endpoint: string;
  method: 'POST' | 'PUT' | 'DELETE';
  payload: any;
  created_at: string;
  status: 'pending' | 'syncing' | 'failed';
  retries: number;
  last_error?: string | null;
}

export interface LocalReminder {
  id: string;
  member_id: string;
  member_name: string;
  vaccine_name: string;
  dose: string;
  due_date: string;
  status: 'upcoming' | 'overdue';
  urgency: 'high' | 'medium' | 'low';
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface UserPreference {
  key: string;
  value: any;
}

export interface LocalCacheItem {
  key: string;
  value: unknown;
  updatedAt: Date;
}

export class VaxAssistLocalDatabase extends Dexie {
  families!: Table<LocalFamily, string>;
  members!: Table<LocalMember, string>;
  vaccinations!: Table<LocalVaccination, string>;
  schedules!: Table<LocalScheduleRecord, string>;
  mutationQueue!: Table<MutationQueueItem, number>;
  reminders!: Table<LocalReminder, string>;
  preferences!: Table<UserPreference, string>;
  cache!: Table<LocalCacheItem, string>;

  constructor() {
    super('VaxAssistLocalDB');

    this.version(1).stores({
      profiles: '++id, name, createdAt',
      cache: 'key, updatedAt'
    });

    this.version(2).stores({
      families: 'id, user_id, name, updated_at',
      members: 'id, family_id, name, date_of_birth, relationship, updated_at',
      vaccinations: 'id, member_id, vaccine_name, dose, administration_date, status, updated_at, _syncStatus',
      schedules: 'member_id, schedule_version, generated_at',
      mutationQueue: '++id, temp_id, action, entity, status, created_at',
      reminders: 'id, member_id, vaccine_name, due_date, status, is_read, created_at',
      preferences: 'key',
      cache: 'key, updatedAt'
    });
  }
}

export const localDb = new VaxAssistLocalDatabase();
