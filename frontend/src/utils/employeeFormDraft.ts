import { CreateEmployeeDTO } from '@/types/employee';
import { DependentCreateRequest } from '@/types/dependent';
import {
  migrateLocalStorageToIndexedDB,
  offlineStorageGet,
  offlineStorageRemove,
  offlineStorageSet,
} from '@/utils/offlineStorage';

const DRAFT_VERSION = 2;
const STORAGE_PREFIX = 'secured-guard:employee-form-draft';

export interface EmployeeFormDraft {
  version: number;
  savedAt: string;
  form: CreateEmployeeDTO;
  pendingDependents: DependentCreateRequest[];
  temIntervaloAlmoco: 'sim' | 'nao';
  activeTab: string;
  doctorSearchTerm: string;
  userSearchTerm?: string;
  positionSearchTerm?: string;
}

export function getEmployeeFormDraftKey(userKey?: string | null): string {
  const safeUser = (userKey || 'anonymous').trim() || 'anonymous';
  return `${STORAGE_PREFIX}:${safeUser}`;
}

function mergeNestedIdObject<T extends { id?: string }>(
  base: T | undefined,
  patch: T | undefined,
): T {
  return {
    ...(base || ({} as T)),
    ...(patch || ({} as T)),
  };
}

export function mergeEmployeeFormDraft(
  draftForm: CreateEmployeeDTO,
  base: CreateEmployeeDTO,
): CreateEmployeeDTO {
  return {
    ...base,
    ...draftForm,
    bankData: mergeNestedIdObject(base.bankData, draftForm.bankData),
    position: mergeNestedIdObject(base.position, draftForm.position),
    unit: mergeNestedIdObject(base.unit, draftForm.unit),
    user: mergeNestedIdObject(base.user, draftForm.user),
    company: mergeNestedIdObject(base.company, draftForm.company),
    exameMedicoDoctor: mergeNestedIdObject(
      base.exameMedicoDoctor,
      draftForm.exameMedicoDoctor,
    ),
  };
}

function hasMeaningfulValue(value: unknown): boolean {
  if (value == null) {
    return false;
  }
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  if (typeof value === 'number') {
    return !Number.isNaN(value) && value !== 0;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  if (typeof value === 'object') {
    return Object.values(value).some(hasMeaningfulValue);
  }
  return false;
}

export function hasAnyFilledEmployeeField(form: CreateEmployeeDTO): boolean {
  return hasMeaningfulValue(form);
}

export function isEmployeeFormDraftEmpty(
  form: CreateEmployeeDTO,
  pendingDependents: DependentCreateRequest[] = [],
): boolean {
  return pendingDependents.length === 0 && !hasAnyFilledEmployeeField(form);
}

export async function loadEmployeeFormDraft(storageKey: string): Promise<EmployeeFormDraft | null> {
  try {
    const migrated = await migrateLocalStorageToIndexedDB<EmployeeFormDraft>(storageKey);
    const parsed = migrated ?? await offlineStorageGet<EmployeeFormDraft>(storageKey);

    if (!parsed?.form || (parsed.version !== 1 && parsed.version !== 2)) {
      if (parsed) {
        await offlineStorageRemove(storageKey);
      }
      return null;
    }

    return parsed;
  } catch {
    await offlineStorageRemove(storageKey);
    return null;
  }
}

export async function saveEmployeeFormDraft(
  storageKey: string,
  data: Omit<EmployeeFormDraft, 'version' | 'savedAt'>,
): Promise<EmployeeFormDraft | null> {
  if (isEmployeeFormDraftEmpty(data.form, data.pendingDependents)) {
    await clearEmployeeFormDraft(storageKey);
    return null;
  }

  const draft: EmployeeFormDraft = {
    version: DRAFT_VERSION,
    savedAt: new Date().toISOString(),
    form: JSON.parse(JSON.stringify(data.form)) as CreateEmployeeDTO,
    pendingDependents: JSON.parse(JSON.stringify(data.pendingDependents)) as DependentCreateRequest[],
    temIntervaloAlmoco: data.temIntervaloAlmoco,
    activeTab: data.activeTab,
    doctorSearchTerm: data.doctorSearchTerm,
    userSearchTerm: data.userSearchTerm,
    positionSearchTerm: data.positionSearchTerm,
  };

  await offlineStorageSet(storageKey, draft);
  return draft;
}

export async function clearEmployeeFormDraft(storageKey: string): Promise<void> {
  localStorage.removeItem(storageKey);
  await offlineStorageRemove(storageKey);
}

export function formatDraftSavedTime(isoDate: string): string {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(isoDate));
  } catch {
    return '';
  }
}
