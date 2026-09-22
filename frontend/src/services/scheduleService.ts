import { api } from './api';
import { localDb } from '../db';
import { syncService } from './syncService';

export interface ScheduleItem {
  rule_id: string;
  vaccine_name: string;
  dose: string;
  recommended_age: string;
  due_date?: string;
  administered_date?: string;
  overdue_since?: string;
  overdue_days?: number;
  days_until_due?: number;
  is_due_now?: boolean;
  record_id?: string;
  clinic?: string;
  provider?: string;
  batch_number?: string;
  verification_status?: string;
  status: 'completed' | 'upcoming' | 'due_now' | 'overdue' | 'unverified';
  source: string;
  schedule_version: string;
  effective_date: string;
  explanation: string;
}

export interface ScheduleSummary {
  total_rules: number;
  completed_count: number;
  upcoming_count: number;
  overdue_count: number;
  unverified_count: number;
}

export interface MemberScheduleEvaluation {
  member_id: string;
  member_name: string;
  date_of_birth: string;
  calculated_age_days: number;
  calculated_age_label: string;
  country: string;
  region: string;
  schedule_version: string;
  effective_date: string;
  source: string;
  summary: ScheduleSummary;
  completed: ScheduleItem[];
  upcoming: ScheduleItem[];
  overdue: ScheduleItem[];
  unknown_unverified: ScheduleItem[];
  _fromCache?: boolean;
}

export interface FamilyScheduleResponse {
  family_id: string;
  family_name: string;
  schedule_version: string;
  source: string;
  members_evaluations: MemberScheduleEvaluation[];
  _fromCache?: boolean;
}

export interface ScheduleCatalogRule {
  rule_id: string;
  country: string;
  region: string;
  vaccine: string;
  vaccine_display_name: string;
  dose: string;
  recommended_age_label: string;
  recommended_age_days: number;
  overdue_grace_days: number;
  description: string;
  source: string;
  schedule_version: string;
  effective_date: string;
}

const CACHE_PREFIX = 'vaxassist_schedule_cache_';

export const scheduleService = {
  getMemberSchedule: async (
    memberId: string,
    params?: { country?: string; region?: string; schedule_version?: string }
  ): Promise<MemberScheduleEvaluation> => {
    const query = new URLSearchParams();
    if (params?.country) query.append('country', params.country);
    if (params?.region) query.append('region', params.region);
    if (params?.schedule_version) query.append('schedule_version', params.schedule_version);
    const qs = query.toString();
    const endpoint = `/api/v1/schedule/${memberId}${qs ? `?${qs}` : ''}`;
    const cacheKey = `${CACHE_PREFIX}member_${memberId}_${params?.country || 'IN'}`;

    if (syncService.isOnline()) {
      try {
        const data = await api.get<MemberScheduleEvaluation>(endpoint);
        try {
          localStorage.setItem(cacheKey, JSON.stringify(data));
          await localDb.schedules.put({
            member_id: memberId,
            schedule_version: data.schedule_version,
            country: data.country,
            generated_at: new Date().toISOString(),
            summary: {
              total_milestones: data.summary.total_rules,
              completed_count: data.summary.completed_count,
              upcoming_count: data.summary.upcoming_count,
              overdue_count: data.summary.overdue_count,
              unverified_count: data.summary.unverified_count,
            },
            milestones: [
              ...data.completed,
              ...data.upcoming,
              ...data.overdue,
              ...data.unknown_unverified,
            ],
          });
        } catch {}
        return data;
      } catch (err) {
        console.warn('Schedule network get failed, falling back to local cache:', err);
      }
    }

    // Offline fallback from localStorage
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as MemberScheduleEvaluation;
        parsed._fromCache = true;
        return parsed;
      } catch {}
    }

    throw new Error('Offline schedule not cached yet for this member. Please connect online once to generate.');
  },

  getFamilySchedule: async (
    familyId: string,
    params?: { country?: string; region?: string; schedule_version?: string }
  ): Promise<FamilyScheduleResponse> => {
    const query = new URLSearchParams();
    if (params?.country) query.append('country', params.country);
    if (params?.region) query.append('region', params.region);
    if (params?.schedule_version) query.append('schedule_version', params.schedule_version);
    const qs = query.toString();
    const endpoint = `/api/v1/schedule/family/${familyId}${qs ? `?${qs}` : ''}`;
    const cacheKey = `${CACHE_PREFIX}family_${familyId}`;

    if (syncService.isOnline()) {
      try {
        const data = await api.get<FamilyScheduleResponse>(endpoint);
        try {
          localStorage.setItem(cacheKey, JSON.stringify(data));
        } catch {}
        return data;
      } catch (err) {
        console.warn('Family schedule network get failed, falling back to local cache:', err);
      }
    }

    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as FamilyScheduleResponse;
        parsed._fromCache = true;
        return parsed;
      } catch {}
    }

    throw new Error('Offline family schedule not available.');
  },

  getCatalogRules: async (params?: { country?: string; region?: string }): Promise<ScheduleCatalogRule[]> => {
    const query = new URLSearchParams();
    if (params?.country) query.append('country', params.country);
    if (params?.region) query.append('region', params.region);
    const qs = query.toString();
    return await api.get<ScheduleCatalogRule[]>(`/api/v1/schedule/catalog${qs ? `?${qs}` : ''}`);
  },
};
