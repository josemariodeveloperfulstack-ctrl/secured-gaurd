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

export interface FailedEmployeeSyncResult {
  item: PendingEmployeeSyncItem;
  message: string;
  status?: number;
}

export interface EmployeeSyncResult {
  synced: PendingEmployeeSyncItem[];
  failed: PendingEmployeeSyncItem[];
  rejected: FailedEmployeeSyncResult[];
}

type RefreshListener = () => void;

const refreshListeners = new Set<RefreshListener>();
let syncing = false;

const VALIDATION_STATUSES = new Set([400, 409, 422]);
const VALIDATION_MESSAGE_PATTERNS = [
  'CPF já cadastrado',
  'não pode estar ativo',
  'não pode ser admitido',
  'Data de admissão é obrigatória',
  'CPF inválido',
  'INVALID_ARGUMENT',
];

function extractErrorMessage(error: unknown): string {
  const err = error as {
    response?: { data?: { message?: string } };
    message?: string;
  };
  const apiMessage = err?.response?.data?.message;
  if (typeof apiMessage === 'string' && apiMessage.trim()) {
    return apiMessage.trim();
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }
  return 'Falha ao sincronizar';
}

function isDefinitiveValidationError(error: unknown, message: string): boolean {
  const status = (error as { response?: { status?: number }; status?: number })?.response?.status
    ?? (error as { status?: number })?.status;
  if (status != null && VALIDATION_STATUSES.has(status)) {
    return true;
  }
  return VALIDATION_MESSAGE_PATTERNS.some((pattern) => message.includes(pattern));
}

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
  onItemRejected?: (result: FailedEmployeeSyncResult) => void,
): Promise<EmployeeSyncResult> {
  if (syncing) {
    return { synced: [], failed: await listPendingEmployeeSyncs(userKey), rejected: [] };
  }

  const queue = await listPendingEmployeeSyncs(userKey);
  if (queue.length === 0) {
    return { synced: [], failed: [], rejected: [] };
  }

  syncing = true;
  const synced: PendingEmployeeSyncItem[] = [];
  const failed: PendingEmployeeSyncItem[] = [];
  const rejected: FailedEmployeeSyncResult[] = [];

  try {
    for (const item of queue) {
      try {
        const employee = await syncSingleItem(item);
        await removeEmployeeSyncItem(userKey, item.id);
        synced.push(item);
        onItemSynced?.({ item, employee: employee || undefined });
      } catch (error: unknown) {
        const message = extractErrorMessage(error);
        const status = (error as { response?: { status?: number }; status?: number })?.response?.status
          ?? (error as { status?: number })?.status;
        const isValidationError = isDefinitiveValidationError(error, message);

        if (isValidationError || item.attempts >= 4) {
          console.warn(
            `[OfflineSync] Removendo item da fila offline devido a erro definitivo (status=${status}):`,
            message,
          );
          await removeEmployeeSyncItem(userKey, item.id);
          rejected.push({ item, message, status });
          onItemRejected?.({ item, message, status });
        } else {
          await markEmployeeSyncAttempt(userKey, item.id, message);
          failed.push(item);

          if (isRetryableConnectionError(error)) {
            break;
          }
        }
      }
    }
  } finally {
    syncing = false;
    notifyRefresh();
  }

  return { synced, failed, rejected };
}

export function isEmployeeSyncRunning(): boolean {
  return syncing;
}
