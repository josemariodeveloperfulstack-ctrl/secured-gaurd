/**
 * usePagePrefetch
 *
 * Prefetches lazy-loaded page chunks after the user logs in, using
 * requestIdleCallback so it never blocks the main thread.
 *
 * Strategy:
 *  1. On mount (authenticated user), schedule idle-time prefetch for the most
 *     commonly used pages across all roles.
 *  2. Exports `prefetchRoute(importFn)` so the sidebar can trigger a targeted
 *     prefetch on hover — the chunk will already be in the module cache by the
 *     time the user actually clicks.
 */

import { useEffect, useRef } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

type ImportFn = () => Promise<unknown>;

// ─── Global module cache (prevents duplicate fetches) ─────────────────────────

const prefetched = new Set<ImportFn>();

/**
 * Trigger an immediate prefetch for a single import function.
 * Safe to call multiple times — will only execute once per function reference.
 */
export function prefetchRoute(importFn: ImportFn): void {
  if (prefetched.has(importFn)) return;
  prefetched.add(importFn);
  importFn().catch(() => {
    // Remove from cache so a retry is possible on the next hover/idle cycle.
    prefetched.delete(importFn);
  });
}

// ─── Priority page imports (most visited pages across all roles) ───────────────

const PRIORITY_PAGES: ImportFn[] = [
  // Core
  () => import('@/pages/Dashboard'),
  () => import('@/pages/Index'),
  // RH / Funcionários
  () => import('@/pages/Funcionarios'),
  () => import('@/pages/RH'),
  () => import('@/pages/RH/PontoEletronico'),
  () => import('@/pages/RH/FechamentoHoras'),
  // Comercial
  () => import('@/pages/Clientes'),
  () => import('@/pages/Contratos'),
  // Financeiro
  () => import('@/pages/Financeiro'),
  () => import('@/pages/ContasAPagar'),
  () => import('@/pages/ContasAReceber'),
  // Operacional
  () => import('@/pages/Operacional'),
  () => import('@/pages/Frota'),
  // Holerites / Docs
  () => import('@/pages/Holerites'),
  () => import('@/pages/DocumentosUnificados'),
  // Comunicação
  () => import('@/pages/Mensagens'),
  () => import('@/pages/ChatInterno'),
  // Estoque / Compras
  () => import('@/pages/EstoqueSimplificado'),
  () => import('@/pages/Compras'),
  // Sistema
  () => import('@/pages/Configuracoes'),
  () => import('@/pages/Usuarios'),
];

// ─── Secondary pages (prefetched after priority ones) ─────────────────────────

const SECONDARY_PAGES: ImportFn[] = [
  () => import('@/pages/Relatorios'),
  () => import('@/pages/Grupos'),
  () => import('@/pages/Leads'),
  () => import('@/pages/CrmKanban'),
  () => import('@/pages/Ocorrencias'),
  () => import('@/pages/ControleRondas'),
  () => import('@/pages/RH/Aniversariantes'),
  () => import('@/pages/RH/SST'),
  () => import('@/pages/Vagas'),
  () => import('@/pages/GestaoAtendimento'),
  () => import('@/pages/Profile'),
];

// ─── requestIdleCallback polyfill ─────────────────────────────────────────────

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

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePagePrefetch(): void {
  const scheduledRef = useRef<number[]>([]);

  useEffect(() => {
    const ids: number[] = [];

    // Batch priority pages with a short delay between each to stay idle-friendly
    PRIORITY_PAGES.forEach((importFn, index) => {
      const id = rIC(
        () => prefetchRoute(importFn),
        // Stagger: first 5 quickly, then spread out at 200ms intervals
        { timeout: 3000 + index * 200 }
      );
      ids.push(id);
    });

    // Secondary pages after a longer initial delay
    SECONDARY_PAGES.forEach((importFn, index) => {
      const id = rIC(
        () => prefetchRoute(importFn),
        { timeout: 8000 + index * 300 }
      );
      ids.push(id);
    });

    scheduledRef.current = ids;

    return () => {
      // Cancel any pending idle callbacks on unmount
      scheduledRef.current.forEach(cIC);
    };
  }, []); // Run once on mount — authenticated layout is already mounted
}
