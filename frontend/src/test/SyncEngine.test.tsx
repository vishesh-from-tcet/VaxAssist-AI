import { describe, it, expect, beforeEach, vi } from 'vitest';
import { localDb } from '../db';
import { syncService } from '../services/syncService';
import { vaccinationService } from '../services/vaccinationService';

describe('VaxAssist Phase 7 Offline Sync Engine', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await localDb.vaccinations.clear();
    await localDb.mutationQueue.clear();
    syncService.setSimulatedOffline(false);
  });

  it('stores optimistic vaccination locally and queues mutation when offline', async () => {
    // 1. Simulate offline
    syncService.setSimulatedOffline(true);
    expect(syncService.isOnline()).toBe(false);

    // 2. Create vaccination offline
    const record = await vaccinationService.createVaccination({
      member_id: 'mem-offline-1',
      vaccine_name: 'MMR Dose 1',
      dose: '0.5 ml',
      administration_date: '2026-09-23',
      provider: 'Dr. Test Offline',
      clinic: 'Field Clinic',
    });

    expect(record.id).toMatch(/^loc-vax-/);
    expect(record._syncStatus).toBe('pending');
    expect(record._isLocal).toBe(true);

    // 3. Verify record saved in local Dexie database
    const localSaved = await localDb.vaccinations.get(record.id);
    expect(localSaved).toBeDefined();
    expect(localSaved?.vaccine_name).toBe('MMR Dose 1');

    // 4. Verify mutation queued
    const queuedItems = await localDb.mutationQueue.toArray();
    expect(queuedItems.length).toBe(1);
    expect(queuedItems[0].action).toBe('CREATE_VAX');
    expect(queuedItems[0].temp_id).toBe(record.id);
    expect(queuedItems[0].status).toBe('pending');

    // 5. Verify pending count
    const count = await syncService.getPendingCount();
    expect(count).toBe(1);
  });

  it('reads records from local Dexie when offline', async () => {
    // Insert local mock data
    await localDb.vaccinations.put({
      id: 'loc-vax-cached-1',
      member_id: 'mem-100',
      vaccine_name: 'BCG',
      dose: '0.1 ml',
      administration_date: '2026-01-01',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      _syncStatus: 'synced',
    });

    syncService.setSimulatedOffline(true);

    const results = await vaccinationService.getVaccinations({ member_id: 'mem-100' });
    expect(results.length).toBe(1);
    expect(results[0].vaccine_name).toBe('BCG');
  });
});
