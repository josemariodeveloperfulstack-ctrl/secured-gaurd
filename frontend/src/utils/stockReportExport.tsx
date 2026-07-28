import React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { Company } from '@/types/company';
import { reportLayoutService } from '@/services/reportLayoutService';
import { StandardReportTemplate } from '@/components/reporting/StandardReportTemplate';
import StockReportPrintable, {
  PrintableStockReport,
  PrintableStockStats
} from '@/components/stock/StockReportPrintable';

export interface StockReportExportParams {
  reportTitle: string;
  periodLabel: string;
  reports: PrintableStockReport[];
  stats: PrintableStockStats;
  company?: Company;
  filename?: string;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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

/**
 * Gera PDF de estoque com o layout oficial (retrato: template.png / paisagem: landscape.jpg).
 */
export async function generateStockReportPDF(params: StockReportExportParams): Promise<void> {
  if (typeof document === 'undefined') {
    throw new TypeError('Geração de PDF disponível apenas no ambiente do navegador.');
  }

  const {
    reportTitle,
    periodLabel,
    reports,
    stats,
    company,
    filename
  } = params;

  await preloadReportBackgrounds();

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '0';
  container.style.width = '800px';
  container.style.minHeight = '1100px';
  container.style.backgroundColor = '#ffffff';
  container.style.zIndex = '99999';
  container.style.pointerEvents = 'none';

  document.body.appendChild(container);

  const root = createRoot(container);

  try {
    flushSync(() => {
      root.render(
        <StandardReportTemplate title={reportTitle} company={company} orientation="portrait">
          <StockReportPrintable
            reports={reports}
            stats={stats}
            periodLabel={periodLabel}
          />
        </StandardReportTemplate>
      );
    });

    await sleep(600);

    const normalizedTitle = reportTitle.trim().replace(/\s+/g, '_').toLowerCase();
    const effectiveFilename =
      filename || `${normalizedTitle}_${new Date().toISOString().split('T')[0]}.pdf`;

    await reportLayoutService.generatePremiumPDF(container, {
      title: reportTitle,
      filename: effectiveFilename,
      company,
      elementHasFullLayout: true,
      orientation: 'portrait'
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

