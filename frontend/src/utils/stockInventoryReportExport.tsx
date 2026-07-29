import React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { Company } from '@/types/company';
import { reportLayoutService } from '@/services/reportLayoutService';
import { StandardReportTemplate } from '@/components/reporting/StandardReportTemplate';
import type {
  StockReportGenerateOptions,
  StockReportRow,
  StockReportType,
} from '@/utils/stockInventoryReportGenerator';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const PORTRAIT_WIDTH_PX = 800;
const LANDSCAPE_WIDTH_PX = 1122;

export function stockInventoryReportTitle(type: StockReportType): string {
  switch (type) {
    case 'by_items':
      return 'RELATÓRIO DE ESTOQUE POR ITENS';
    case 'physical_check':
      return 'CONFERÊNCIA FÍSICA DE ESTOQUE';
    case 'by_location':
      return 'RELATÓRIO DE ESTOQUE POR LOCALIZAÇÃO';
    case 'critical':
      return 'ESTOQUE CRÍTICO (BAIXO / ZERADO)';
    default:
      return 'RELATÓRIO DE ESTOQUE';
  }
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

/** Colunas > 4 → paisagem (padrão do sistema). */
export function resolveStockReportOrientation(
  options: StockReportGenerateOptions
): 'portrait' | 'landscape' {
  if (options.reportType === 'physical_check') return 'landscape';
  return 'portrait';
}

async function preloadReportBackgrounds(): Promise<void> {
  await Promise.all([
    new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => resolve();
      img.src = '/report-background-template.png';
    }),
    new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => resolve();
      img.src = '/report-background-landscape.jpg';
    }),
  ]);
}

async function waitForContainerImages(container: HTMLElement): Promise<void> {
  const images = Array.from(container.querySelectorAll('img'));
  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) {
            resolve();
            return;
          }
          img.onload = () => resolve();
          img.onerror = () => resolve();
        })
    )
  );
}

interface StockInventoryReportPrintableProps {
  rows: StockReportRow[];
  options: StockReportGenerateOptions;
  sortLabel: string;
}

/**
 * Conteúdo do relatório — o frame (curva, faixa, marca d'água, rodapé)
 * vem exclusivamente do StandardReportTemplate (imagens oficiais).
 */
export const StockInventoryReportPrintable: React.FC<StockInventoryReportPrintableProps> = ({
  rows,
  options,
  sortLabel,
}) => {
  const isPhysical = options.reportType === 'physical_check';
  const dataRows = rows.filter((r) => !r.isGroupHeader);
  const totalQty = dataRows.reduce((s, r) => s + (Number(r.quantity) || 0), 0);

  return (
    <div className="space-y-4 text-[11px] text-gray-800" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="flex items-start justify-between gap-4 border-b-2 border-amber-500/80 pb-3">
        <div>
          <h2 className="text-base font-black uppercase tracking-tight text-black m-0">
            {stockInventoryReportTitle(options.reportType)}
          </h2>
          <p className="text-[10px] text-gray-600 mt-1 mb-0 uppercase tracking-wider font-bold">
            {options.companyName || options.company?.name || 'Secured Guard'}
          </p>
        </div>
        <div className="text-right text-[10px] text-gray-600 leading-relaxed">
          <div>
            <span className="font-semibold text-gray-800">Gerado:</span> {formatDateTime(new Date().toISOString())}
          </div>
          <div>
            <span className="font-semibold text-gray-800">Ordenação:</span> {sortLabel}
          </div>
          <div>
            <span className="font-semibold text-gray-800">Itens:</span> {dataRows.length} ·{' '}
            <span className="font-semibold text-gray-800">Qtd total:</span> {totalQty}
          </div>
        </div>
      </div>

      {isPhysical && (
        <p className="text-[10px] text-gray-600 italic m-0">
          Preencha a coluna &quot;Físico&quot; na conferência. Diferença = Físico − Sistema.
        </p>
      )}

      <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
        <thead>
          <tr className="bg-gray-100">
            {isPhysical ? (
              <>
                <th className="border border-gray-300 px-1.5 py-1.5 text-left font-bold text-[10px] uppercase w-[16%]">
                  Código
                </th>
                <th className="border border-gray-300 px-1.5 py-1.5 text-left font-bold text-[10px] uppercase w-[48%]">
                  Item
                </th>
                <th className="border border-gray-300 px-1.5 py-1.5 text-center font-bold text-[10px] uppercase w-[18%]">
                  Sist.
                </th>
                <th className="border border-gray-300 px-1.5 py-1.5 text-center font-bold text-[10px] uppercase w-[18%]">
                  Físico
                </th>
              </>
            ) : (
              <>
                <th className="border border-gray-300 px-1.5 py-1.5 text-left font-bold text-[10px] uppercase w-[18%]">
                  Código
                </th>
                <th className="border border-gray-300 px-1.5 py-1.5 text-left font-bold text-[10px] uppercase w-[58%]">
                  Item
                </th>
                <th className="border border-gray-300 px-1.5 py-1.5 text-center font-bold text-[10px] uppercase w-[24%]">
                  Qtd / Mín
                </th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            if (row.isGroupHeader) {
              return (
                <tr key={`g-${idx}`}>
                  <td
                    colSpan={isPhysical ? 4 : 3}
                    className="border border-gray-300 px-2 py-1.5 bg-gray-800 text-white font-bold text-[10px] uppercase"
                  >
                    {row.groupLabel || row.itemName}
                  </td>
                </tr>
              );
            }

            const itemLabel =
              row.subItem && row.subItem !== '—'
                ? `${row.itemName} — ${row.subItem}`
                : row.itemName;

            return (
              <tr key={row.id || `r-${idx}`} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="border border-gray-300 px-1.5 py-1 align-top font-mono text-[10px] break-words">
                  {row.code || '—'}
                </td>
                <td className="border border-gray-300 px-1.5 py-1 align-top break-words">
                  <div className="font-semibold text-[10px] leading-snug">{itemLabel}</div>
                  {row.category && row.category !== '—' && (
                    <div className="text-[9px] text-gray-500 mt-0.5">{row.category}</div>
                  )}
                </td>
                {isPhysical ? (
                  <>
                    <td className="border border-gray-300 px-1.5 py-1 text-center font-semibold align-top">
                      {row.quantity}
                    </td>
                    <td className="border border-gray-300 px-1.5 py-1 text-center align-top text-gray-400">
                      ______
                    </td>
                  </>
                ) : (
                  <td className="border border-gray-300 px-1.5 py-1 text-center align-top">
                    <span className="font-semibold">{row.quantity}</span>
                    <span className="text-gray-400"> / </span>
                    <span>{row.minimum}</span>
                    {row.lastMovementAt && (
                      <div className="text-[9px] text-gray-500 mt-0.5">Mov.: {formatDate(row.lastMovementAt)}</div>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>

      {isPhysical && (
        <div className="pt-4 space-y-3 text-[10px] text-gray-700">
          <p className="m-0">
            Observações: _______________________________________________________________________________
          </p>
          <p className="m-0">
            Assinatura do conferente: ______________________________________ Data: ___/___/______
          </p>
        </div>
      )}
    </div>
  );
};

export interface GenerateStockInventoryPremiumPdfParams {
  rows: StockReportRow[];
  options: StockReportGenerateOptions;
  sortLabel: string;
  company?: Company | null;
  orientation?: 'portrait' | 'landscape';
}

/**
 * Gera PDF com o layout oficial do sistema:
 * - Retrato: /report-background-template.png
 * - Paisagem: /report-background-landscape.jpg
 */
export async function generateStockInventoryPremiumPDF(
  params: GenerateStockInventoryPremiumPdfParams
): Promise<void> {
  if (typeof document === 'undefined') {
    throw new TypeError('Geração de PDF disponível apenas no navegador.');
  }

  const { rows, options, sortLabel, company } = params;
  const title = stockInventoryReportTitle(options.reportType);
  const orientation = params.orientation ?? resolveStockReportOrientation(options);
  const isLandscape = orientation === 'landscape';
  const widthPx = isLandscape ? LANDSCAPE_WIDTH_PX : PORTRAIT_WIDTH_PX;
  const minHeightPx = isLandscape ? 750 : 1100;

  await preloadReportBackgrounds();

  // Container na viewport — html2canvas não captura bem imagens em left:-9999px
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '0';
  container.style.width = `${widthPx}px`;
  container.style.minHeight = `${minHeightPx}px`;
  container.style.backgroundColor = '#ffffff';
  container.style.zIndex = '99999';
  container.style.pointerEvents = 'none';
  document.body.appendChild(container);

  const root = createRoot(container);

  try {
    const companyForTemplate: Company | undefined = company
      ? company
      : options.company
        ? options.company
        : options.companyName
          ? ({ name: options.companyName } as Company)
          : undefined;

    flushSync(() => {
      root.render(
        <StandardReportTemplate title={title} company={companyForTemplate} orientation={orientation}>
          <StockInventoryReportPrintable rows={rows} options={options} sortLabel={sortLabel} />
        </StandardReportTemplate>
      );
    });

    await waitForContainerImages(container);
    await sleep(600);

    const filename = `relatorio-estoque-${options.reportType}-${new Date().toISOString().slice(0, 10)}.pdf`;

    await reportLayoutService.generatePremiumPDF(container, {
      title,
      filename,
      company: companyForTemplate,
      elementHasFullLayout: true,
      orientation,
    });
  } finally {
    try {
      root.unmount();
    } catch {
      // ignore
    }
    container.remove();
  }
}
