import React, { createContext, useContext, useEffect, useState } from 'react';
import { syncService, type SyncState } from '../services/syncService';

interface SyncContextType {
  status: SyncState;
  isOnline: boolean;
  isSimulatedOffline: boolean;
  pendingCount: number;
  lastSyncedAt: Date | null;
  lastError: string | null;
  forceSync: () => Promise<boolean>;
  setSimulatedOffline: (simulated: boolean) => void;
  toggleSimulatedOffline: () => void;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<SyncState>('Online');
  const [isOnline, setIsOnline] = useState<boolean>(syncService.isOnline());
  const [isSimulatedOffline, setIsSimulatedOffline] = useState<boolean>(syncService.isSimulatedOffline());
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = syncService.subscribe((state) => {
      setStatus(state.status);
      setIsOnline(state.isOnline);
      setIsSimulatedOffline(state.isSimulatedOffline);
      setPendingCount(state.pendingCount);
      setLastSyncedAt(state.lastSyncedAt);
      setLastError(state.lastError);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const forceSync = async () => {
    return await syncService.forceSync();
  };

  const setSimulatedOffline = (simulated: boolean) => {
    syncService.setSimulatedOffline(simulated);
  };

  const toggleSimulatedOffline = () => {
    syncService.setSimulatedOffline(!isSimulatedOffline);
  };

  return (
    <SyncContext.Provider
      value={{
        status,
        isOnline,
        isSimulatedOffline,
        pendingCount,
        lastSyncedAt,
        lastError,
        forceSync,
        setSimulatedOffline,
        toggleSimulatedOffline,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = (): SyncContextType => {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
};
