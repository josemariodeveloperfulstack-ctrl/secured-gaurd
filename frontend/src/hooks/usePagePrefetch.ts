/**
 * usePagePrefetch
 *
 * Prefetches lazy-loaded page chunks after the user logs in.
 *
 * Em dev o Vite serve cada chunk como requisição HTTPS separada — prefetch
 * em massa (50+ páginas) satura o servidor e causa ERR_CONNECTION_CLOSED.
 * Por isso o prefetch automático fica desabilitado em dev; hover na sidebar
 * continua funcionando via fila com concorrência limitada.
 */

import { useEffect, useRef } from 'react';

type ImportFn = () => Promise<unknown>;

const prefetched = new Set<ImportFn>();
const prefetchQueue: ImportFn[] = [];
let activePrefetches = 0;

const IS_DEV = import.meta.env.DEV;
const MAX_CONCURRENT = IS_DEV ? 1 : 3;
const GAP_BETWEEN_MS = IS_DEV ? 1200 : 400;

function drainPrefetchQueue(): void {
  while (activePrefetches < MAX_CONCURRENT && prefetchQueue.length > 0) {
    const importFn = prefetchQueue.shift()!;
    activePrefetches++;
    importFn()
      .catch(() => {
        prefetched.delete(importFn);
      })
      .finally(() => {
        activePrefetches--;
        setTimeout(drainPrefetchQueue, GAP_BETWEEN_MS);
      });
  }
}

/**
 * Enfileira prefetch de um chunk. Seguro chamar várias vezes — executa só uma.
 */
export function prefetchRoute(importFn: ImportFn): void {
  if (prefetched.has(importFn)) return;
  prefetched.add(importFn);
  prefetchQueue.push(importFn);
  drainPrefetchQueue();
}

import { ROUTE_PREFETCH_MAP } from '@/config/routePrefetch';

const PRIORITY_PAGES: ImportFn[] = [
  () => import('@/pages/Dashboard'),
  () => import('@/pages/Index'),
  () => import('@/pages/Funcionarios'),
  () => import('@/pages/RH'),
  () => import('@/pages/Clientes'),
  () => import('@/pages/Contratos'),
  () => import('@/pages/Financeiro'),
  () => import('@/pages/Operacional'),
  () => import('@/pages/Holerites'),
  () => import('@/pages/Configuracoes'),
];

const MAP_PREFETCH_PATHS = new Set([
  '/dashboard', '/dashboard-home', '/funcionarios', '/financeiro', '/operacional',
  '/holerites', '/clientes', '/contratos', '/comercial/marketing', '/configuracoes',
]);

const SECONDARY_PAGES: ImportFn[] = Object.entries(ROUTE_PREFETCH_MAP)
  .filter(([path]) => !MAP_PREFETCH_PATHS.has(path))
  .map(([, fn]) => fn);

type IdleDeadline = { timeRemaining: () => number; didTimeout: boolean };
type IdleCallback = (deadline: IdleDeadline) => void;

const rIC: (cb: IdleCallback, opts?: { timeout: number }) => number =
  typeof requestIdleCallback !== 'undefined'
    ? requestIdleCallback
    : (cb) => setTimeout(() => cb({ timeRemaining: () => 50, didTimeout: false }), 1) as unknown as number;

const cIC: (id: number) => void =
  typeof cancelIdleCallback !== 'undefined'
    ? cancelIdleCallback
    : clearTimeout;

function schedulePrefetchQueue(pages: ImportFn[], startDelayMs: number, stepMs: number): number[] {
  const ids: number[] = [];
  pages.forEach((importFn, index) => {
    const id = rIC(() => prefetchRoute(importFn), {
      timeout: startDelayMs + index * stepMs,
    });
    ids.push(id);
  });
  return ids;
}

export function usePagePrefetch(): void {
  const scheduledRef = useRef<number[]>([]);

  useEffect(() => {
    if (IS_DEV) {
      // Em dev: sem prefetch em massa — evita derrubar o Vite HTTPS.
      // Hover na sidebar ainda prefetcha via prefetchRoute (fila serial).
      return;
    }

    const ids = [
      ...schedulePrefetchQueue(PRIORITY_PAGES, 4000, 600),
      ...schedulePrefetchQueue(SECONDARY_PAGES, 12000, 800),
    ];
    scheduledRef.current = ids;

    return () => {
      scheduledRef.current.forEach(cIC);
    };
  }, []);
}
