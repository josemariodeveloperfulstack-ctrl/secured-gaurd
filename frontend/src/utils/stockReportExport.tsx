import React from 'react';
import { createRoot } from 'react-dom/client';
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

/**
 * Gera um PDF de relatório de estoque no frontend usando o mesmo layout premium
 * utilizado no módulo de Frota (barra gradiente, logo, cabeçalho e rodapé).
 *
 * O conteúdo é renderizado em um container oculto com `StandardReportTemplate`
 * + `StockReportPrintable` e capturado por `reportLayoutService.generatePremiumPDF`.
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

  // Container oculto para renderizar o layout premium
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  container.style.width = '800px';
  container.style.backgroundColor = '#ffffff';

  document.body.appendChild(container);

  const root = createRoot(container);

  try {
    root.render(
      <StandardReportTemplate title={reportTitle} company={company}>
        <StockReportPrintable
          reports={reports}
          stats={stats}
          periodLabel={periodLabel}
        />
      </StandardReportTemplate>
    );

    // Dar um tick para o React montar o conteúdo antes da captura
    await sleep(50);

    const normalizedTitle = reportTitle.trim().replace(/\s+/g, '_').toLowerCase();
    const effectiveFilename =
      filename || `${normalizedTitle}_${new Date().toISOString().split('T')[0]}.pdf`;

    await reportLayoutService.generatePremiumPDF(container, {
      title: reportTitle,
      filename: effectiveFilename,
      company,
      elementHasFullLayout: true
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

