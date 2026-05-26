import { DependentCreateRequest } from '@/types/dependent';
import { CreateEmployeeDTO } from '@/types/employee';
import {
  migrateLocalStorageToIndexedDB,
  offlineStorageGet,
  offlineStorageRemove,
  offlineStorageSet,
} from '@/utils/offlineStorage';

const STORAGE_PREFIX = 'secured-guard:employee-offline-sync';
const QUEUE_VERSION = 1;

export type EmployeeSyncOperation = 'create' | 'update';

export interface PendingEmployeeSyncItem {
  id: string;
  version: number;
  operation: EmployeeSyncOperation;
  employeeId?: string;
  payload: CreateEmployeeDTO;
  pendingDependents: DependentCreateRequest[];
  createdAt: string;
  updatedAt: string;
  attempts: number;
  lastError?: string;
  userKey: string;
}

export function getEmployeeOfflineSyncKey(userKey?: string | null): string {
  const safeUser = (userKey || 'anonymous').trim() || 'anonymous';
  return `${STORAGE_PREFIX}:${safeUser}`;
}

async function readQueue(storageKey: string): Promise<PendingEmployeeSyncItem[]> {
  const migrated = await migrateLocalStorageToIndexedDB<PendingEmployeeSyncItem[]>(storageKey);
  const queue = migrated ?? await offlineStorageGet<PendingEmployeeSyncItem[]>(storageKey);

  if (!Array.isArray(queue)) {
    return [];
  }

  return queue.filter((item) => item?.version === QUEUE_VERSION && item?.id);
}

async function writeQueue(storageKey: string, items: PendingEmployeeSyncItem[]): Promise<void> {
  if (items.length === 0) {
    await offlineStorageRemove(storageKey);
    return;
  }

  await offlineStorageSet(storageKey, items);
}

export async function listPendingEmployeeSyncs(
  userKey?: string | null,
): Promise<PendingEmployeeSyncItem[]> {
  return readQueue(getEmployeeOfflineSyncKey(userKey));
}

export async function listPendingEmployeeSyncsForEmployee(
  userKey: string | null | undefined,
  employeeId: string,
): Promise<PendingEmployeeSyncItem[]> {
  const queue = await listPendingEmployeeSyncs(userKey);
  return queue.filter((item) => item.employeeId === employeeId);
}

export async function enqueueEmployeeSync(params: {
  userKey?: string | null;
  operation: EmployeeSyncOperation;
  payload: CreateEmployeeDTO;
  pendingDependents?: DependentCreateRequest[];
  employeeId?: string;
  queueId?: string;
}): Promise<PendingEmployeeSyncItem> {
  const storageKey = getEmployeeOfflineSyncKey(params.userKey);
  const queue = await readQueue(storageKey);
  const now = new Date().toISOString();
  const existingIndex = params.queueId
    ? queue.findIndex((item) => item.id === params.queueId)
    : -1;

  const item: PendingEmployeeSyncItem = {
    id: params.queueId || crypto.randomUUID(),
    version: QUEUE_VERSION,
    operation: params.operation,
    employeeId: params.employeeId,
    payload: JSON.parse(JSON.stringify(params.payload)) as CreateEmployeeDTO,
    pendingDependents: JSON.parse(
      JSON.stringify(params.pendingDependents || []),
    ) as DependentCreateRequest[],
    createdAt: existingIndex >= 0 ? queue[existingIndex].createdAt : now,
    updatedAt: now,
    attempts: existingIndex >= 0 ? queue[existingIndex].attempts : 0,
    userKey: (params.userKey || 'anonymous').trim() || 'anonymous',
  };

  if (existingIndex >= 0) {
    queue[existingIndex] = item;
  } else {
    queue.push(item);
  }

  await writeQueue(storageKey, queue);
  return item;
}

export async function removeEmployeeSyncItem(
  userKey: string | null | undefined,
  queueId: string,
): Promise<void> {
  const storageKey = getEmployeeOfflineSyncKey(userKey);
  const queue = await readQueue(storageKey);
  await writeQueue(
    storageKey,
    queue.filter((item) => item.id !== queueId),
  );
}

export async function markEmployeeSyncAttempt(
  userKey: string | null | undefined,
  queueId: string,
  errorMessage?: string,
): Promise<void> {
  const storageKey = getEmployeeOfflineSyncKey(userKey);
  const queue = await readQueue(storageKey).then((items) =>
    items.map((item) =>
      item.id === queueId
        ? {
            ...item,
            attempts: item.attempts + 1,
            updatedAt: new Date().toISOString(),
            lastError: errorMessage,
          }
        : item,
    ),
  );
  await writeQueue(storageKey, queue);
}
