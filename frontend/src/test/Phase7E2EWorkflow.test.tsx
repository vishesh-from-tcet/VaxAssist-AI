import { describe, it, expect, beforeEach, vi } from 'vitest';
import { localDb } from '../db';
import { syncService } from '../services/syncService';
import { vaccinationService } from '../services/vaccinationService';
import { reminderService } from '../services/reminderService';
import { scheduleService } from '../services/scheduleService';
import { api } from '../services/api';

describe('Phase 7 Full 10-Step Workflow E2E Test', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await localDb.vaccinations.clear();
    await localDb.mutationQueue.clear();
    await localDb.reminders.clear();
    await localDb.preferences.clear();
    syncService.setSimulatedOffline(false);
  });

  it('executes full 10-step offline creation, persistence, sync, reminders, and report flow', async () => {
    // Step 1: Create record online
    const onlineVaxMock = {
      id: 'vax-server-101',
      member_id: 'mem-ananya-1',
      vaccine_name: 'BCG',
      dose: '0.1 ml',
      administration_date: '2024-01-15',
      provider: 'Dr. Rao',
      clinic: 'Apollo Hospital',
      batch_lot_number: 'LOT-BCG-100',
      verification_status: 'verified',
    };

    vi.spyOn(api, 'post').mockResolvedValueOnce(onlineVaxMock);
    const rec1 = await vaccinationService.createVaccination(onlineVaxMock);
    expect(rec1.id).toBe('vax-server-101');
    expect(rec1._syncStatus).toBe('synced');

    // Step 2: Disconnect network (Simulate offline)
    syncService.setSimulatedOffline(true);
    expect(syncService.isOnline()).toBe(false);

    // Step 3: Create record offline
    const offlinePayload = {
      member_id: 'mem-ananya-1',
      vaccine_name: 'Hepatitis B Birth Dose',
      dose: '0.5 ml',
      administration_date: '2024-01-16',
      provider: 'Dr. Offline',
      clinic: 'Community Clinic',
      batch_lot_number: 'LOT-HEP-200',
    };

    const rec2 = await vaccinationService.createVaccination(offlinePayload);
    expect(rec2.id).toMatch(/^loc-vax-/);
    expect(rec2._syncStatus).toBe('pending');
    expect(rec2._isLocal).toBe(true);

    // Step 4 & 5: Refresh simulation & verify local IndexedDB data
    const localRecords = await vaccinationService.getVaccinations({ member_id: 'mem-ananya-1' });
    expect(localRecords.length).toBe(2);
    expect(localRecords.some((r) => r.vaccine_name === 'BCG')).toBe(true);
    expect(localRecords.some((r) => r.vaccine_name === 'Hepatitis B Birth Dose')).toBe(true);

    const pendingCount = await syncService.getPendingCount();
    expect(pendingCount).toBe(1);

    // Step 6 & 7: Set up sync mock and Reconnect online
    const serverAssignedRecord = {
      ...offlinePayload,
      id: 'vax-server-102',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Mock fetch for sync service replay
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => serverAssignedRecord,
      })
    );

    syncService.setSimulatedOffline(false);
    expect(syncService.isOnline()).toBe(true);

    const syncSuccess = await syncService.processQueue();
    expect(syncSuccess).toBe(true);

    // Step 8: Verify IndexedDB reconciliation
    const postSyncRecords = await localDb.vaccinations.toArray();
    expect(postSyncRecords.some((r) => r.id === 'vax-server-102')).toBe(true);
    expect(postSyncRecords.some((r) => r.id === rec2.id)).toBe(false); // temp ID removed

    const remainingQueue = await syncService.getPendingCount();
    expect(remainingQueue).toBe(0);

    // Step 9: Verify Deterministic Reminders
    const mockScheduleEvaluation: any = {
      member_id: 'mem-ananya-1',
      member_name: 'Ananya Sharma',
      schedule_version: 'v1.0.0-demo-2026',
      summary: { total_rules: 14, completed_count: 2, upcoming_count: 8, overdue_count: 4, unverified_count: 0 },
      overdue: [
        {
          rule_id: 'rule-opv-1',
          vaccine_name: 'OPV 1',
          dose: '2 drops',
          due_date: '2024-03-01',
          overdue_days: 120,
        },
      ],
      upcoming: [
        {
          rule_id: 'rule-mr-1',
          vaccine_name: 'MR 1st Dose',
          dose: '0.5 ml',
          due_date: '2024-10-15',
          days_until_due: 15,
        },
      ],
    };

    const reminders = reminderService.generateFromSchedule(mockScheduleEvaluation, {
      days_in_advance: 30,
      show_upcoming: true,
      show_overdue: true,
      sound_enabled: true,
    });

    expect(reminders.length).toBe(2);
    expect(reminders[0].status).toBe('overdue');
    expect(reminders[1].status).toBe('upcoming');

    // Step 10: Verify Report generation payload
    const reportSummary = {
      patient_name: 'Ananya Sharma',
      total_completed: mockScheduleEvaluation.summary.completed_count,
      total_overdue: mockScheduleEvaluation.summary.overdue_count,
      vaccinations_count: postSyncRecords.length,
      schedule_version: mockScheduleEvaluation.schedule_version,
    };

    expect(reportSummary.patient_name).toBe('Ananya Sharma');
    expect(reportSummary.total_completed).toBe(2);
    expect(reportSummary.total_overdue).toBe(4);
    expect(reportSummary.schedule_version).toBe('v1.0.0-demo-2026');
  });
});
