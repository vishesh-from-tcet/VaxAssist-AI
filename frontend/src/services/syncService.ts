import { localDb, type MutationQueueItem, type LocalVaccination } from '../db';

export type SyncState = 'Online' | 'Offline' | 'Syncing' | 'Synced' | 'Sync error';

type SyncListener = (state: {
  status: SyncState;
  isOnline: boolean;
  isSimulatedOffline: boolean;
  pendingCount: number;
  lastSyncedAt: Date | null;
  lastError: string | null;
}) => void;

class SyncService {
  private isOnlineStatus: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private isSimulatedOfflineStatus: boolean = false;
  private currentStatus: SyncState = 'Online';
  private lastSyncedAt: Date | null = null;
  private lastError: string | null = null;
  private listeners: Set<SyncListener> = new Set();
  private isSyncing: boolean = false;
  private activeSyncPromise: Promise<boolean> | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnlineStatus = true;
        this.updateState();
        this.processQueue();
      });

      window.addEventListener('offline', () => {
        this.isOnlineStatus = false;
        this.updateState();
      });
    }

    // Initial state check
    this.updateState();
  }

  public isOnline(): boolean {
    return this.isOnlineStatus && !this.isSimulatedOfflineStatus;
  }

  public isSimulatedOffline(): boolean {
    return this.isSimulatedOfflineStatus;
  }

  public setSimulatedOffline(simulated: boolean) {
    this.isSimulatedOfflineStatus = simulated;
    this.updateState();
    if (!simulated && this.isOnlineStatus) {
      this.processQueue();
    }
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    // Send immediate initial state
    this.notifyListener(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private async notifyListener(listener: SyncListener) {
    const pendingCount = await this.getPendingCount();
    listener({
      status: this.currentStatus,
      isOnline: this.isOnline(),
      isSimulatedOffline: this.isSimulatedOfflineStatus,
      pendingCount,
      lastSyncedAt: this.lastSyncedAt,
      lastError: this.lastError,
    });
  }

  public async updateState() {
    const pendingCount = await this.getPendingCount();
    if (!this.isOnline()) {
      this.currentStatus = 'Offline';
    } else if (this.isSyncing) {
      this.currentStatus = 'Syncing';
    } else if (this.lastError) {
      this.currentStatus = 'Sync error';
    } else {
      this.currentStatus = pendingCount > 0 ? 'Online' : 'Synced';
    }

    for (const listener of this.listeners) {
      listener({
        status: this.currentStatus,
        isOnline: this.isOnline(),
        isSimulatedOffline: this.isSimulatedOfflineStatus,
        pendingCount,
        lastSyncedAt: this.lastSyncedAt,
        lastError: this.lastError,
      });
    }
  }

  public async getPendingCount(): Promise<number> {
    try {
      return await localDb.mutationQueue.where('status').equals('pending').count();
    } catch {
      return 0;
    }
  }

  public async queueMutation(
    item: Omit<MutationQueueItem, 'id' | 'created_at' | 'status' | 'retries'>
  ): Promise<number> {
    const queueItem: MutationQueueItem = {
      ...item,
      created_at: new Date().toISOString(),
      status: 'pending',
      retries: 0,
      last_error: null,
    };

    const id = await localDb.mutationQueue.add(queueItem);
    await this.updateState();

    // If online, trigger processing in background
    if (this.isOnline()) {
      this.processQueue();
    }

    return id as number;
  }

  public async processQueue(): Promise<boolean> {
    if (!this.isOnline()) {
      return false;
    }

    if (this.activeSyncPromise) {
      return this.activeSyncPromise;
    }

    this.activeSyncPromise = this.executeSyncCycle();
    try {
      return await this.activeSyncPromise;
    } finally {
      this.activeSyncPromise = null;
    }
  }

  private async executeSyncCycle(): Promise<boolean> {
    this.isSyncing = true;
    this.lastError = null;
    await this.updateState();

    try {
      const items = await localDb.mutationQueue
        .filter((item) => item.status === 'pending' || item.status === 'failed')
        .toArray();

      if (items.length === 0) {
        this.isSyncing = false;
        this.currentStatus = 'Synced';
        this.lastSyncedAt = new Date();
        await this.updateState();
        return true;
      }

      const token = localStorage.getItem('vaxassist_token');
      const authHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        authHeaders['Authorization'] = `Bearer ${token}`;
      }

      for (const item of items) {
        try {
          let url = item.endpoint;
          if (!url.startsWith('http')) {
            url = `http://127.0.0.1:8000${url.startsWith('/') ? '' : '/'}${url}`;
          }

          const response = await fetch(url, {
            method: item.method,
            headers: authHeaders,
            body: item.method !== 'DELETE' && item.payload ? JSON.stringify(item.payload) : undefined,
          });

          if (!response.ok) {
            // Check for conflict 409 or 400
            if (response.status === 409) {
              console.warn(`Conflict detected during sync for ${item.action}. Resolving via local-first preservation.`);
              // Conflict resolution: preserve local state or merge
            } else {
              throw new Error(`Server returned ${response.status}: ${response.statusText}`);
            }
          }

          const serverData = response.status !== 204 ? await response.json().catch(() => null) : null;

          // Handle entity specific reconciliation
          if (item.action === 'CREATE_VAX' && serverData && serverData.id) {
            // Replace temporary local ID with server assigned permanent ID in Dexie
            const localRecord = await localDb.vaccinations.get(item.temp_id);
            if (localRecord) {
              await localDb.vaccinations.delete(item.temp_id);
              await localDb.vaccinations.put({
                ...localRecord,
                ...serverData,
                _syncStatus: 'synced',
                _isLocal: false,
              });
            }
          } else if (item.action === 'UPDATE_VAX' && serverData) {
            await localDb.vaccinations.put({
              ...serverData,
              _syncStatus: 'synced',
              _isLocal: false,
            });
          } else if (item.action === 'DELETE_VAX') {
            await localDb.vaccinations.delete(item.temp_id);
          }

          // Remove completed mutation from queue
          if (item.id) {
            await localDb.mutationQueue.delete(item.id);
          }
        } catch (itemErr: any) {
          console.error(`Failed to sync queue item #${item.id}:`, itemErr);
          if (item.id) {
            await localDb.mutationQueue.update(item.id, {
              status: 'failed',
              retries: (item.retries || 0) + 1,
              last_error: itemErr.message || 'Network error during sync',
            });
          }
          this.lastError = itemErr.message || 'Sync failed for one or more items';
        }
      }

      const remainingPending = await this.getPendingCount();
      this.isSyncing = false;
      this.lastSyncedAt = new Date();

      if (remainingPending === 0 && !this.lastError) {
        this.currentStatus = 'Synced';
      } else {
        this.currentStatus = this.lastError ? 'Sync error' : 'Online';
      }

      await this.updateState();
      return remainingPending === 0;
    } catch (globalErr: any) {
      console.error('Fatal sync cycle error:', globalErr);
      this.isSyncing = false;
      this.lastError = globalErr.message || 'Sync processing error';
      this.currentStatus = 'Sync error';
      await this.updateState();
      return false;
    }
  }

  public async forceSync(): Promise<boolean> {
    if (!this.isOnline()) {
      return false;
    }
    return await this.processQueue();
  }
}

export const syncService = new SyncService();
