import { useCallback, useEffect, useRef, useState } from 'react';
import {
  listPendingEmployeeSyncs,
  PendingEmployeeSyncItem,
} from '@/utils/employeeOfflineSync';
import {
  EmployeeSyncResult,
  runPendingEmployeeSync,
  subscribeEmployeeSyncRefresh,
  SyncedEmployeeResult,
} from '@/utils/employeeOfflineSyncRunner';

export type { EmployeeSyncResult, SyncedEmployeeResult };

interface UseEmployeeOfflineSyncOptions {
  onItemSynced?: (result: SyncedEmployeeResult) => void;
  employeeId?: string | null;
}

export function useEmployeeOfflineSync(
  userKey?: string | null,
  options?: UseEmployeeOfflineSyncOptions,
) {
  const onItemSyncedRef = useRef(options?.onItemSynced);
  onItemSyncedRef.current = options?.onItemSynced;
  const employeeId = options?.employeeId;

  const [pendingItems, setPendingItems] = useState<PendingEmployeeSyncItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  const refreshPending = useCallback(async () => {
    const items = await listPendingEmployeeSyncs(userKey);
  setPendingItems(
      employeeId
        ? items.filter((item) => item.employeeId === employeeId)
        : items,
    );
  }, [employeeId, userKey]);

  const syncPending = useCallback(async (): Promise<EmployeeSyncResult> => {
    setIsSyncing(true);
    try {
      const result = await runPendingEmployeeSync(userKey, (syncedResult) => {
        if (employeeId && syncedResult.item.employeeId !== employeeId) {
          return;
        }
        onItemSyncedRef.current?.(syncedResult);
      });
      await refreshPending();
      return result;
    } finally {
      setIsSyncing(false);
    }
  }, [employeeId, refreshPending, userKey]);

  useEffect(() => {
    void refreshPending();
  }, [refreshPending]);

  useEffect(() => {
    return subscribeEmployeeSyncRefresh(() => {
      void refreshPending();
    });
  }, [refreshPending]);

  useEffect(() => {
    const handleOnline = () => {
      void syncPending();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [syncPending]);

  useEffect(() => {
    if (pendingItems.length === 0 || !navigator.onLine) {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (navigator.onLine) {
        void syncPending();
      }
    }, 30000);

    return () => window.clearInterval(intervalId);
  }, [pendingItems.length, syncPending]);

  return {
    pendingItems,
    pendingCount: pendingItems.length,
    isSyncing,
    refreshPending,
    syncPending,
  };
}
