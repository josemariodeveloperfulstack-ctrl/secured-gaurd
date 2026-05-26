import dependentService from '@/services/dependentService';
import { Employee, employeeService } from '@/services/employeeService';
import { isRetryableConnectionError } from '@/utils/connectionError';
import {
  listPendingEmployeeSyncs,
  markEmployeeSyncAttempt,
  PendingEmployeeSyncItem,
  removeEmployeeSyncItem,
} from '@/utils/employeeOfflineSync';

export interface SyncedEmployeeResult {
  item: PendingEmployeeSyncItem;
  employee?: Employee;
}

export interface EmployeeSyncResult {
  synced: PendingEmployeeSyncItem[];
  failed: PendingEmployeeSyncItem[];
}

type RefreshListener = () => void;

const refreshListeners = new Set<RefreshListener>();
let syncing = false;

export function subscribeEmployeeSyncRefresh(listener: RefreshListener): () => void {
  refreshListeners.add(listener);
  return () => refreshListeners.delete(listener);
}

function notifyRefresh(): void {
  refreshListeners.forEach((listener) => listener());
}

async function syncSingleItem(item: PendingEmployeeSyncItem): Promise<Employee | void> {
  if (item.operation === 'create') {
    const created = await employeeService.createEmployee(item.payload);
    if (item.pendingDependents.length > 0 && created.id) {
      for (const dependent of item.pendingDependents) {
        await dependentService.createDependent({
          ...dependent,
          employeeId: created.id,
        });
      }
    }
    return created;
  }

  if (!item.employeeId) {
    throw new Error('ID do funcionário ausente para sincronização.');
  }

  return employeeService.updateEmployee(item.employeeId, item.payload);
}

export async function runPendingEmployeeSync(
  userKey?: string | null,
  onItemSynced?: (result: SyncedEmployeeResult) => void,
): Promise<EmployeeSyncResult> {
  if (syncing) {
    return { synced: [], failed: await listPendingEmployeeSyncs(userKey) };
  }

  const queue = await listPendingEmployeeSyncs(userKey);
  if (queue.length === 0) {
    return { synced: [], failed: [] };
  }

  syncing = true;
  const synced: PendingEmployeeSyncItem[] = [];
  const failed: PendingEmployeeSyncItem[] = [];

  try {
    for (const item of queue) {
      try {
        const employee = await syncSingleItem(item);
        await removeEmployeeSyncItem(userKey, item.id);
        synced.push(item);
        onItemSynced?.({ item, employee: employee || undefined });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Falha ao sincronizar';
        await markEmployeeSyncAttempt(userKey, item.id, message);
        failed.push(item);

        if (isRetryableConnectionError(error)) {
          break;
        }
      }
    }
  } finally {
    syncing = false;
    notifyRefresh();
  }

  return { synced, failed };
}

export function isEmployeeSyncRunning(): boolean {
  return syncing;
}
