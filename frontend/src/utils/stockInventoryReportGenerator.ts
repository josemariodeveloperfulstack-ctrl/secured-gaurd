import * as XLSX from 'xlsx';
import {
  StockCategory,
  StockCategoryLabels,
  StockItem,
  StockMovement,
  type StockItemLocation,
} from '@/types/stock';

export type StockReportType = 'by_items' | 'physical_check' | 'by_location' | 'critical';
export type StockReportSortBy = 'alphabetical' | 'last_registered' | 'last_movement';
export type StockReportExportFormat = 'pdf' | 'excel';

export type StockReportZeroFilter = 'all' | 'zero' | 'non_zero';

export interface StockReportFilters {
  sortBy: StockReportSortBy;
  category?: StockCategory | 'all';
  shelfId?: string;
  onlyActive: boolean;
  includeZeroStock: boolean;
  /** Filtro de estoque zerado: 'all' (Todos), 'zero' (Somente zerados), 'non_zero' (Somente com estoque) */
  zeroStockFilter?: StockReportZeroFilter;
  /** Atalho para filtrar apenas itens zerados */
  onlyZeroStock?: boolean;
  onlyLowStock: boolean;
  /** Agrupa a conferência física por localização (prateleira) para caminhar o almoxarifado. */
  groupByLocation: boolean;
}

export interface StockReportRow {
  id: string;
  code: string;
  itemName: string;
  subItem: string;
  category: string;
  location: string;
  quantity: number;
  minimum: number;
  createdAt?: string;
  lastMovementAt?: string;
  unitCost?: number;
  isGroupHeader?: boolean;
  groupLabel?: string;
}

export interface StockReportGenerateOptions {
  reportType: StockReportType;
  filters: StockReportFilters;
  format: StockReportExportFormat;
  companyName?: string;
  /** Empresa completa — define logo no cabeçalho do PDF. */
  company?: import('@/types/company').Company | null;
}

function categoryLabel(category: unknown): string {
  if (typeof category === 'string' && category in StockCategoryLabels) {
    return StockCategoryLabels[category as StockCategory];
  }
  return typeof category === 'string' ? category : '—';
}

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR');
}

function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function compareAlpha(a: string, b: string): number {
  return a.localeCompare(b, 'pt-BR', { sensitivity: 'base', numeric: true });
}

function formatLocation(locations?: StockItemLocation[]): string {
  if (!locations || locations.length === 0) return 'Sem localização';
  return locations
    .map((loc) => {
      const shelf = loc.shelfIdentification?.trim() || 'Prateleira';
      const floor = loc.floor?.trim();
      const qty = typeof loc.quantity === 'number' ? ` (${loc.quantity})` : '';
      return floor ? `${shelf} / Andar ${floor}${qty}` : `${shelf}${qty}`;
    })
    .join('; ');
}

function primaryLocationKey(locations?: StockItemLocation[]): string {
  if (!locations || locations.length === 0) return 'zzz-sem-localizacao';
  const first = locations[0];
  const shelf = first.shelfIdentification?.trim() || 'Prateleira';
  const floor = first.floor?.trim() || '';
  return `${shelf}|||${floor}`.toLowerCase();
}

function primaryLocationLabel(locations?: StockItemLocation[]): string {
  if (!locations || locations.length === 0) return 'Sem localização';
  const first = locations[0];
  const shelf = first.shelfIdentification?.trim() || 'Prateleira';
  const floor = first.floor?.trim();
  return floor ? `${shelf} — Andar ${floor}` : shelf;
}

export function buildLastMovementMap(movements: StockMovement[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const m of movements) {
    if (!m.stockItemId || !m.movementDate) continue;
    const current = map.get(m.stockItemId);
    if (!current || new Date(m.movementDate) > new Date(current)) {
      map.set(m.stockItemId, m.movementDate);
    }
  }
  return map;
}

function itemPassesFilters(item: StockItem, filters: StockReportFilters): boolean {
  if (filters.onlyActive && item.active === false) return false;

  const qty = item.currentQuantity ?? 0;

  if (filters.onlyZeroStock) {
    if (qty > 0) return false;
  } else if (filters.zeroStockFilter === 'zero') {
    if (qty > 0) return false;
  } else if (filters.zeroStockFilter === 'non_zero') {
    if (qty <= 0) return false;
  } else if (!filters.includeZeroStock) {
    if (qty <= 0) return false;
  }

  if (filters.onlyLowStock && !item.isLowStock && qty > (item.minimumQuantity ?? 0)) {
    return false;
  }
  if (filters.category && filters.category !== 'all' && item.category !== filters.category) return false;
  if (filters.shelfId) {
    const onShelf = (item.locations || []).some((l) => l.shelfId === filters.shelfId);
    if (!onShelf) return false;
  }
  return true;
}

function toRow(item: StockItem, lastMovementAt?: string): StockReportRow {
  const locSum = Array.isArray(item.locations)
    ? item.locations.reduce((sum, loc) => sum + (Number(loc.quantity) || 0), 0)
    : 0;
  const qty = locSum > 0 ? locSum : (item.currentQuantity ?? 0);
  const rawName = (item.name || '').trim();
  const rawSize = (item.sizeVariation || '').trim();

  let subItem = rawSize || '—';
  if (rawSize && rawName) {
    const nLower = rawName.toLowerCase();
    const sLower = rawSize.toLowerCase();
    if (
      nLower.endsWith(sLower) ||
      nLower.endsWith(` ${sLower}`) ||
      nLower.endsWith(`-${sLower}`) ||
      nLower.endsWith(` - ${sLower}`) ||
      nLower.endsWith(` (${sLower})`)
    ) {
      subItem = '—';
    }
  }

  return {
    id: item.id,
    code: item.code || '—',
    itemName: rawName || '—',
    subItem,
    category: categoryLabel(item.category),
    location: formatLocation(item.locations),
    quantity: qty,
    minimum: item.minimumQuantity ?? 0,
    createdAt: item.createdAt,
    lastMovementAt: lastMovementAt || item.updatedAt,
    unitCost: typeof item.unitCost === 'number' ? item.unitCost : Number(item.unitCost) || 0,
  };
}

function sortRows(
  rows: StockReportRow[],
  itemsById: Map<string, StockItem>,
  sortBy: StockReportSortBy
): StockReportRow[] {
  return [...rows].sort((a, b) => {
    if (sortBy === 'last_registered') {
      const da = new Date(a.createdAt || 0).getTime();
      const db = new Date(b.createdAt || 0).getTime();
      if (db !== da) return db - da;
    } else if (sortBy === 'last_movement') {
      const da = new Date(a.lastMovementAt || 0).getTime();
      const db = new Date(b.lastMovementAt || 0).getTime();
      if (db !== da) return db - da;
    }

    const nameCmp = compareAlpha(a.itemName, b.itemName);
    if (nameCmp !== 0) return nameCmp;
    const subCmp = compareAlpha(a.subItem === '—' ? '' : a.subItem, b.subItem === '—' ? '' : b.subItem);
    if (subCmp !== 0) return subCmp;

    const locA = primaryLocationKey(itemsById.get(a.id)?.locations);
    const locB = primaryLocationKey(itemsById.get(b.id)?.locations);
    return compareAlpha(locA, locB);
  });
}

function insertLocationGroupHeaders(rows: StockReportRow[], itemsById: Map<string, StockItem>): StockReportRow[] {
  const result: StockReportRow[] = [];
  let currentKey = '';
  for (const row of rows) {
    const item = itemsById.get(row.id);
    const key = primaryLocationKey(item?.locations);
    if (key !== currentKey) {
      currentKey = key;
      result.push({
        ...row,
        id: `group-${key}`,
        isGroupHeader: true,
        groupLabel: primaryLocationLabel(item?.locations),
        code: '',
        itemName: '',
        subItem: '',
        category: '',
        location: '',
        quantity: 0,
        minimum: 0,
      });
    }
    result.push(row);
  }
  return result;
}

export function buildStockReportRows(
  items: StockItem[],
  lastMovementByItem: Map<string, string>,
  reportType: StockReportType,
  filters: StockReportFilters
): StockReportRow[] {
  const itemsById = new Map(items.map((i) => [i.id, i]));
  let filtered = items.filter((item) => itemPassesFilters(item, filters));

  if (reportType === 'critical') {
    filtered = filtered.filter(
      (item) => item.isLowStock || (item.currentQuantity ?? 0) <= (item.minimumQuantity ?? 0)
    );
  }

  let rows = filtered.map((item) => toRow(item, lastMovementByItem.get(item.id)));

  if (reportType === 'by_location' || (reportType === 'physical_check' && filters.groupByLocation)) {
    rows = [...rows].sort((a, b) => {
      const locCmp = compareAlpha(
        primaryLocationKey(itemsById.get(a.id)?.locations),
        primaryLocationKey(itemsById.get(b.id)?.locations)
      );
      if (locCmp !== 0) return locCmp;
      const nameCmp = compareAlpha(a.itemName, b.itemName);
      if (nameCmp !== 0) return nameCmp;
      return compareAlpha(a.subItem === '—' ? '' : a.subItem, b.subItem === '—' ? '' : b.subItem);
    });
    rows = insertLocationGroupHeaders(rows, itemsById);
  } else {
    const sortBy = reportType === 'by_items' && filters.sortBy === 'alphabetical'
      ? 'alphabetical'
      : filters.sortBy;
    rows = sortRows(rows, itemsById, sortBy);
  }

  return rows;
}

function reportTypeTitle(type: StockReportType): string {
  switch (type) {
    case 'by_items':
      return 'RELATÓRIO POR ITENS (COM SUBITENS)';
    case 'physical_check':
      return 'CONFERÊNCIA FÍSICA DE ESTOQUE';
    case 'by_location':
      return 'RELATÓRIO POR LOCALIZAÇÃO';
    case 'critical':
      return 'ESTOQUE CRÍTICO (BAIXO / ZERADO)';
    default:
      return 'RELATÓRIO DE ESTOQUE';
  }
}

function sortByLabel(sortBy: StockReportSortBy): string {
  switch (sortBy) {
    case 'last_registered':
      return 'Último cadastrado';
    case 'last_movement':
      return 'Última movimentação';
    default:
      return 'Ordem alfabética';
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

/** PDF A4 com layout institucional (retrato ou paisagem conforme o tipo). */
async function generatePdf(
  rows: StockReportRow[],
  options: StockReportGenerateOptions
): Promise<void> {
  const { generateStockInventoryPremiumPDF } = await import('@/utils/stockInventoryReportExport');
  await generateStockInventoryPremiumPDF({
    rows,
    options,
    sortLabel: sortByLabel(options.filters.sortBy),
    company: options.company ?? null,
  });
}

function generateExcel(rows: StockReportRow[], options: StockReportGenerateOptions): void {
  const isPhysical = options.reportType === 'physical_check';
  const dataRows = rows.filter((r) => !r.isGroupHeader);

  const sheetData = dataRows.map((row) => {
    if (isPhysical) {
      return {
        Código: row.code,
        Item: row.itemName,
        Subitem: row.subItem,
        Categoria: row.category,
        Localização: row.location,
        'Qtd Sistema': row.quantity,
        'Qtd Física': '',
        Diferença: '',
        'Cadastrado em': formatDate(row.createdAt),
        'Última movimentação': formatDateTime(row.lastMovementAt),
        Observações: '',
      };
    }
    return {
      Código: row.code,
      Item: row.itemName,
      Subitem: row.subItem,
      Categoria: row.category,
      Localização: row.location,
      Quantidade: row.quantity,
      Mínimo: row.minimum,
      'Cadastrado em': formatDate(row.createdAt),
      'Última movimentação': formatDateTime(row.lastMovementAt),
      'Custo unitário': row.unitCost ?? 0,
    };
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(sheetData);

  const colWidths = Object.keys(sheetData[0] || { Código: '' }).map((key) => ({
    wch: Math.max(12, key.length + 2),
  }));
  ws['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, 'Estoque');

  const summary = [
    { Campo: 'Tipo', Valor: reportTypeTitle(options.reportType) },
    { Campo: 'Empresa', Valor: options.companyName || '—' },
    { Campo: 'Ordenação', Valor: sortByLabel(options.filters.sortBy) },
    { Campo: 'Itens', Valor: dataRows.length },
    { Campo: 'Quantidade total', Valor: dataRows.reduce((s, r) => s + r.quantity, 0) },
    { Campo: 'Gerado em', Valor: formatDateTime(new Date().toISOString()) },
  ];
  const wsSummary = XLSX.utils.json_to_sheet(summary);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumo');

  const array = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  downloadBlob(
    new Blob([array], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    `relatorio-estoque-${options.reportType}-${new Date().toISOString().slice(0, 10)}.xlsx`
  );
}

export async function generateStockInventoryReport(
  items: StockItem[],
  movements: StockMovement[],
  options: StockReportGenerateOptions
): Promise<{ rowCount: number }> {
  const lastMovementByItem = buildLastMovementMap(movements);
  const rows = buildStockReportRows(items, lastMovementByItem, options.reportType, options.filters);
  const dataCount = rows.filter((r) => !r.isGroupHeader).length;

  if (dataCount === 0) {
    throw new Error('Nenhum item encontrado com os filtros selecionados.');
  }

  if (options.format === 'excel') {
    generateExcel(rows, options);
  } else {
    await generatePdf(rows, options);
  }

  return { rowCount: dataCount };
}
