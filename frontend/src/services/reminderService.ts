import { localDb, type LocalReminder } from '../db';
import { scheduleService, type MemberScheduleEvaluation } from './scheduleService';
import { familyService } from './familyService';

export interface ReminderPreferences {
  days_in_advance: number; // e.g. 14 or 30 days
  show_upcoming: boolean;
  show_overdue: boolean;
  sound_enabled: boolean;
}

const DEFAULT_PREFERENCES: ReminderPreferences = {
  days_in_advance: 30,
  show_upcoming: true,
  show_overdue: true,
  sound_enabled: true,
};

export const reminderService = {
  getPreferences: async (): Promise<ReminderPreferences> => {
    try {
      const pref = await localDb.preferences.get('reminder_prefs');
      if (pref && pref.value) {
        return { ...DEFAULT_PREFERENCES, ...pref.value };
      }
    } catch {}
    return DEFAULT_PREFERENCES;
  },

  savePreferences: async (prefs: Partial<ReminderPreferences>): Promise<ReminderPreferences> => {
    const current = await reminderService.getPreferences();
    const updated = { ...current, ...prefs };
    await localDb.preferences.put({
      key: 'reminder_prefs',
      value: updated,
    });
    return updated;
  },

  generateRemindersForFamily: async (): Promise<LocalReminder[]> => {
    const prefs = await reminderService.getPreferences();
    const families = await familyService.getFamilies();
    const generated: LocalReminder[] = [];

    for (const fam of families) {
      const fullFam = await familyService.getFamily(fam.id);
      if (!fullFam.members || fullFam.members.length === 0) continue;

      for (const member of fullFam.members) {
        try {
          const sched = await scheduleService.getMemberSchedule(member.id);
          const memberReminders = reminderService.generateFromSchedule(sched, prefs);
          generated.push(...memberReminders);
        } catch (err) {
          console.warn(`Could not compute reminders for member ${member.name}:`, err);
        }
      }
    }

    // Upsert into localDb.reminders, preserving existing is_read status
    for (const rem of generated) {
      const existing = await localDb.reminders.get(rem.id);
      if (existing) {
        await localDb.reminders.put({
          ...rem,
          is_read: existing.is_read,
        });
      } else {
        await localDb.reminders.put(rem);
      }
    }

    return await reminderService.getReminders();
  },

  generateFromSchedule: (
    evaluation: MemberScheduleEvaluation,
    prefs: ReminderPreferences
  ): LocalReminder[] => {
    const reminders: LocalReminder[] = [];
    const now = new Date();

    // 1. Overdue reminders
    if (prefs.show_overdue && evaluation.overdue) {
      for (const item of evaluation.overdue) {
        const id = `rem-overdue-${evaluation.member_id}-${item.rule_id}`;
        reminders.push({
          id,
          member_id: evaluation.member_id,
          member_name: evaluation.member_name,
          vaccine_name: item.vaccine_name,
          dose: item.dose,
          due_date: item.due_date || 'Overdue',
          status: 'overdue',
          urgency: 'high',
          message: `${item.vaccine_name} (${item.dose}) is overdue for ${evaluation.member_name}${
            item.overdue_days ? ` by ${item.overdue_days} days` : ''
          }. Please schedule with your clinician.`,
          is_read: false,
          created_at: now.toISOString(),
        });
      }
    }

    // 2. Upcoming reminders
    if (prefs.show_upcoming && evaluation.upcoming) {
      for (const item of evaluation.upcoming) {
        // Check if within window
        const daysUntil = item.days_until_due ?? 999;
        if (daysUntil <= prefs.days_in_advance) {
          const id = `rem-upcoming-${evaluation.member_id}-${item.rule_id}`;
          reminders.push({
            id,
            member_id: evaluation.member_id,
            member_name: evaluation.member_name,
            vaccine_name: item.vaccine_name,
            dose: item.dose,
            due_date: item.due_date || `Target Age: ${item.recommended_age}`,
            status: 'upcoming',
            urgency: daysUntil <= 7 ? 'high' : daysUntil <= 14 ? 'medium' : 'low',
            message: `${item.vaccine_name} (${item.dose}) is scheduled for ${evaluation.member_name}${
              daysUntil > 0 ? ` in ${daysUntil} days` : item.is_due_now ? ' (Due Now)' : ''
            }.`,
            is_read: false,
            created_at: now.toISOString(),
          });
        }
      }
    }

    return reminders;
  },

  getReminders: async (filter?: {
    member_id?: string;
    status?: 'upcoming' | 'overdue';
    unread_only?: boolean;
  }): Promise<LocalReminder[]> => {
    let list = await localDb.reminders.toArray();

    if (filter?.member_id) {
      list = list.filter((r) => r.member_id === filter.member_id);
    }
    if (filter?.status) {
      list = list.filter((r) => r.status === filter.status);
    }
    if (filter?.unread_only) {
      list = list.filter((r) => !r.is_read);
    }

    // Sort: overdue first, then by urgency, then newest
    return list.sort((a, b) => {
      if (a.status === 'overdue' && b.status !== 'overdue') return -1;
      if (b.status === 'overdue' && a.status !== 'overdue') return 1;
      if (a.urgency === 'high' && b.urgency !== 'high') return -1;
      if (b.urgency === 'high' && a.urgency !== 'high') return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  },

  getUnreadCount: async (): Promise<number> => {
    try {
      const list = await localDb.reminders.filter((r) => !r.is_read).toArray();
      return list.length;
    } catch {
      return 0;
    }
  },

  markAsRead: async (id: string): Promise<void> => {
    await localDb.reminders.update(id, { is_read: true });
  },

  markAllAsRead: async (): Promise<void> => {
    const list = await localDb.reminders.toArray();
    for (const item of list) {
      await localDb.reminders.update(item.id, { is_read: true });
    }
  },

  deleteReminder: async (id: string): Promise<void> => {
    await localDb.reminders.delete(id);
  },
};
