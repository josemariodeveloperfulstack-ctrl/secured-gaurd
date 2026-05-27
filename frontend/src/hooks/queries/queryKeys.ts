/**
 * Catálogo centralizado de queryKeys do TanStack Query.
 *
 * Padronizar as keys aqui evita "magic strings" espalhadas pela base
 * de código e permite invalidações precisas após mutações.
 */

import type { EmployeeFilters } from '@/services/employeeService';

export const queryKeys = {
  employees: {
    all: ['employees'] as const,
    list: (filters?: EmployeeFilters, page = 0, size = 500) =>
      ['employees', 'list', filters ?? {}, page, size] as const,
    count: () => ['employees', 'count'] as const,
    byId: (id: string) => ['employees', 'byId', id] as const,
    stats: (filters?: EmployeeFilters) => ['employees', 'stats', filters ?? {}] as const,
  },
  clients: {
    all: ['clients'] as const,
    list: () => ['clients', 'list'] as const,
    byId: (id: string) => ['clients', 'byId', id] as const,
  },
  workPosts: {
    all: ['workPosts'] as const,
    list: () => ['workPosts', 'list'] as const,
    byClient: (clientId: string) => ['workPosts', 'byClient', clientId] as const,
  },
  companies: {
    all: ['companies'] as const,
    list: () => ['companies', 'list'] as const,
  },
  costCenters: {
    all: ['costCenters'] as const,
    listActive: () => ['costCenters', 'listActive'] as const,
  },
  documentosGerados: {
    all: ['documentosGerados'] as const,
    byEmployee: (employeeId: string) =>
      ['documentosGerados', 'byEmployee', employeeId] as const,
    meus: () => ['documentosGerados', 'meus'] as const,
  },
} as const;
