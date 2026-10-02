import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { MedicalDocument, MEDICAL_TYPE_LABELS } from '@/services/medicalDocumentService';
import { formatDate, formatCPF } from '@/utils/formatters';

export interface AtestadosReportFilters {
  dateFrom?: string;
  dateTo?: string;
  sector?: string;
  documentType?: string;
  employeeName?: string;
}

export interface AtestadosReportTotals {
  totalDocs: number;
  totalDays: number;
  totalHours: number;
  uniqueEmployees: number;
  inssAlertsCount: number;
  cidMaisRecorrente?: string;
}

/**
 * Gera um arquivo Excel (.xlsx) profissional e completo com todas as informações dos atestados.
 */
export function exportAtestadosToExcel(
  documents: MedicalDocument[],
  totals?: AtestadosReportTotals,
  filters?: AtestadosReportFilters
): void {
  const workbook = XLSX.utils.book_new();

  // 1. Aba Principal: Atestados e Afastamentos Detalhados
  const detailedRows = documents.map((doc, idx) => ({
    'Nº': idx + 1,
    'Colaborador': doc.employeeName || 'Não informado',
    'CPF': formatCPF(doc.employeeCpf),
    'Empresa': doc.companyName || 'Matriz / Geral',
    'Setor de Trabalho': doc.employeeDepartment || 'Não informado',
    'Cargo / Função': doc.employeePosition || 'Não informado',
    'Tipo de Documento': MEDICAL_TYPE_LABELS[doc.documentType] || doc.documentType || 'Atestado',
    'Data Início': formatDate(doc.startDate),
    'Data Fim': doc.endDate ? formatDate(doc.endDate) : '-',
    'Dias de Afastamento': doc.days ?? 0,
    'Horas Ausentes': doc.hours ?? 0,
    'Código CID-10': doc.cidCode || '-',
    'Diagnóstico / Descrição CID': doc.cidDescription || '-',
    'Médico / Profissional': doc.doctorName || '-',
    'CRM / Registro': doc.crm || '-',
    'Especialidade': doc.specialty || '-',
    'Alerta INSS': doc.inssAlert ? 'SIM (Afastamento >= 15d)' : (doc.days && doc.days >= 12 ? 'ATENÇÃO (12-14d)' : 'Não'),
    'Obs / Justificativa': doc.observations || '-',
    'Cadastrado Por': doc.createdByName || '-',
    'Data de Cadastro': formatDate(doc.createdAt),
  }));

  const mainWorksheet = XLSX.utils.json_to_sheet(detailedRows);

  // Ajustar larguras das colunas da aba principal
  mainWorksheet['!cols'] = [
    { wch: 5 },  // Nº
    { wch: 30 }, // Colaborador
    { wch: 16 }, // CPF
    { wch: 28 }, // Empresa
    { wch: 25 }, // Setor
    { wch: 22 }, // Cargo
    { wch: 32 }, // Tipo
    { wch: 13 }, // Data Início
    { wch: 13 }, // Data Fim
    { wch: 20 }, // Dias
    { wch: 15 }, // Horas
    { wch: 15 }, // CID
    { wch: 35 }, // Descrição CID
    { wch: 26 }, // Médico
    { wch: 16 }, // CRM
    { wch: 20 }, // Especialidade
    { wch: 25 }, // Alerta INSS
    { wch: 35 }, // Observações
    { wch: 22 }, // Cadastrado Por
    { wch: 18 }, // Data Cadastro
  ];

  XLSX.utils.book_append_sheet(workbook, mainWorksheet, 'Atestados Médicos');

  // 2. Aba de Resumo e Indicadores (KPIs)
  const calcTotalDocs = totals?.totalDocs ?? documents.length;
  const calcTotalDays = totals?.totalDays ?? documents.reduce((acc, d) => acc + (d.days || 0), 0);
  const calcTotalHours = totals?.totalHours ?? documents.reduce((acc, d) => acc + (d.hours || 0), 0);
  const calcUniqueEmployees = totals?.uniqueEmployees ?? new Set(documents.map(d => d.employeeId).filter(Boolean)).size;
  const inssCount = totals?.inssAlertsCount ?? documents.filter(d => d.inssAlert || (d.days && d.days >= 15)).length;

  const kpiRows = [
    { 'Indicador / Métrica': 'Total de Atestados / Registros', 'Valor': calcTotalDocs },
    { 'Indicador / Métrica': 'Total de Dias Afastados', 'Valor': `${calcTotalDays} dias` },
    { 'Indicador / Métrica': 'Total de Horas Ausentes', 'Valor': `${calcTotalHours}h` },
    { 'Indicador / Métrica': 'Total de Funcionários Afetados', 'Valor': calcUniqueEmployees },
    { 'Indicador / Métrica': 'Casos Críticos com Alerta INSS (>= 15 dias)', 'Valor': inssCount },
    { 'Indicador / Métrica': 'Data do Relatório', 'Valor': new Date().toLocaleDateString('pt-BR') },
  ];

  if (filters?.dateFrom || filters?.dateTo) {
    kpiRows.push({
      'Indicador / Métrica': 'Período Filtrado',
      'Valor': `${filters.dateFrom ? formatDate(filters.dateFrom) : 'Início'} até ${filters.dateTo ? formatDate(filters.dateTo) : 'Atual'}`,
    });
  }
  if (filters?.sector && filters.sector !== 'ALL') {
    kpiRows.push({ 'Indicador / Métrica': 'Setor Filtrado', 'Valor': filters.sector });
  }

  const kpiWorksheet = XLSX.utils.json_to_sheet(kpiRows);
  kpiWorksheet['!cols'] = [{ wch: 45 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(workbook, kpiWorksheet, 'Resumo Geral e KPIs');

  // 3. Aba de Casos Críticos INSS (se houver)
  const inssDocs = documents.filter(d => (d.days && d.days >= 15) || d.inssAlert);
  if (inssDocs.length > 0) {
    const inssRows = inssDocs.map((doc, idx) => ({
      'Nº': idx + 1,
      'Colaborador': doc.employeeName || 'Não informado',
      'CPF': formatCPF(doc.employeeCpf),
      'Empresa': doc.companyName || '-',
      'Setor': doc.employeeDepartment || '-',
      'Período': `${formatDate(doc.startDate)} a ${doc.endDate ? formatDate(doc.endDate) : '-'}`,
      'Dias': doc.days ?? 0,
      'CID-10': doc.cidCode ? `${doc.cidCode} - ${doc.cidDescription || ''}` : '-',
      'Médico / CRM': `${doc.doctorName || '-'} (${doc.crm || '-'})`,
      'Enquadramento Legal': 'CLT Art. 476 / Lei 8.213/91 (Encaminhar à Perícia INSS)',
      'Observações': doc.observations || '-',
    }));
    const inssWorksheet = XLSX.utils.json_to_sheet(inssRows);
    inssWorksheet['!cols'] = [
      { wch: 5 },
      { wch: 30 },
      { wch: 16 },
      { wch: 25 },
      { wch: 22 },
      { wch: 25 },
      { wch: 10 },
      { wch: 35 },
      { wch: 28 },
      { wch: 45 },
      { wch: 30 },
    ];
    XLSX.utils.book_append_sheet(workbook, inssWorksheet, 'Casos Críticos INSS');
  }

  const fileName = `relatorio_atestados_medicos_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

/**
 * Gera um relatório PDF executivo de alta resolução e design profissional.
 */
export function exportAtestadosToPdf(
  documents: MedicalDocument[],
  totals?: AtestadosReportTotals,
  filters?: AtestadosReportFilters
): void {
  // Configuração da página: A4 Paisagem (297 x 210 mm)
  const doc = new jsPDF('l', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  let currentY = margin;

  // 1. Cabeçalho Executivo Superior
  // Barra superior escura de destaque
  doc.setFillColor(15, 23, 42); // slate-900 / seguranca-black
  doc.roundedRect(margin, currentY, pageWidth - 2 * margin, 24, 2, 2, 'F');

  // Faixa decorativa vermelha na lateral
  doc.setFillColor(220, 38, 38); // seguranca-red
  doc.rect(margin, currentY, 4, 24, 'F');

  // Textos do Cabeçalho
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('SECURED GUARD — GESTÃO INTEGRADA DE SEGURANÇA E RH', margin + 8, currentY + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text('Relatório Gerencial de Atestados Médicos, Declarações e Afastamentos Ocupacionais', margin + 8, currentY + 14);

  // Data / Hora de Emissão
  const emissionStr = `Emissão: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`;
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(emissionStr, pageWidth - margin - 8, currentY + 8, { align: 'right' });

  currentY += 28;

  // 2. Barra de Filtros Aplicados
  const filterParts: string[] = [];
  if (filters?.dateFrom || filters?.dateTo) {
    filterParts.push(`Período: ${filters.dateFrom ? formatDate(filters.dateFrom) : 'Início'} a ${filters.dateTo ? formatDate(filters.dateTo) : 'Atual'}`);
  }
  if (filters?.sector && filters.sector !== 'ALL') {
    filterParts.push(`Setor: ${filters.sector}`);
  }
  if (filters?.documentType && filters.documentType !== 'ALL') {
    filterParts.push(`Tipo: ${MEDICAL_TYPE_LABELS[filters.documentType as any] || filters.documentType}`);
  }
  if (filters?.employeeName?.trim()) {
    filterParts.push(`Colaborador: ${filters.employeeName.trim()}`);
  }

  doc.setFillColor(241, 245, 249); // slate-100
  doc.roundedRect(margin, currentY, pageWidth - 2 * margin, 8, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text('Filtros:', margin + 3, currentY + 5.5);

  doc.setFont('helvetica', 'normal');
  const filtersText = filterParts.length > 0 ? filterParts.join('  |  ') : 'Todos os registros (Sem restrições de filtro)';
  doc.text(filtersText, margin + 18, currentY + 5.5);

  currentY += 12;

  // 3. Painel de Indicadores (KPI Cards)
  const calcTotalDocs = totals?.totalDocs ?? documents.length;
  const calcTotalDays = totals?.totalDays ?? documents.reduce((acc, d) => acc + (d.days || 0), 0);
  const calcTotalHours = totals?.totalHours ?? documents.reduce((acc, d) => acc + (d.hours || 0), 0);
  const calcUniqueEmployees = totals?.uniqueEmployees ?? new Set(documents.map(d => d.employeeId).filter(Boolean)).size;
  const inssCount = totals?.inssAlertsCount ?? documents.filter(d => d.inssAlert || (d.days && d.days >= 15)).length;

  const kpis = [
    { label: 'Total Atestados', val: String(calcTotalDocs), color: [30, 41, 59] },
    { label: 'Dias Afastados', val: `${calcTotalDays}d`, color: [217, 119, 6] },
    { label: 'Horas Ausentes', val: `${calcTotalHours}h`, color: [5, 150, 105] },
    { label: 'Colaboradores', val: String(calcUniqueEmployees), color: [37, 99, 235] },
    { label: 'Alertas INSS (15d+)', val: String(inssCount), color: inssCount > 0 ? [220, 38, 38] : [100, 116, 139] },
  ];

  const cardWidth = (pageWidth - 2 * margin - (kpis.length - 1) * 3) / kpis.length;
  const cardHeight = 13;

  kpis.forEach((kpi, idx) => {
    const cardX = margin + idx * (cardWidth + 3);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(cardX, currentY, cardWidth, cardHeight, 1.5, 1.5, 'FD');

    // Mini barra colorida no topo do card
    doc.setFillColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.rect(cardX, currentY, cardWidth, 1.5, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, cardX + cardWidth / 2, currentY + 5.5, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.text(kpi.val, cardX + cardWidth / 2, currentY + 10.5, { align: 'center' });
  });

  currentY += cardHeight + 5;

  // 4. Tabela de Detalhamento dos Atestados
  const tableData = documents.map((doc, idx) => {
    const period = `${formatDate(doc.startDate)}${doc.endDate ? ` a ${formatDate(doc.endDate)}` : ''}`;
    const duration = doc.days != null && doc.days > 0 ? `${doc.days} dia(s)` : (doc.hours ? `${doc.hours}h` : '-');
    const cidStr = doc.cidCode ? `${doc.cidCode}${doc.cidDescription ? ` - ${doc.cidDescription}` : ''}` : '-';
    const doctorStr = doc.doctorName ? `${doc.doctorName}${doc.crm ? ` (CRM: ${doc.crm})` : ''}` : '-';
    const isCritical = (doc.days && doc.days >= 15) || doc.inssAlert;

    return [
      String(idx + 1),
      doc.employeeName || 'Não informado',
      doc.companyName || '-',
      doc.employeeDepartment || '-',
      MEDICAL_TYPE_LABELS[doc.documentType] || doc.documentType || 'Atestado',
      period,
      duration,
      cidStr,
      doctorStr,
      isCritical ? '🚨 INSS (15d+)' : (doc.days && doc.days >= 12 ? '⚠️ Alerta' : 'Regular'),
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [[
      '#',
      'Colaborador',
      'Empresa',
      'Setor',
      'Tipo de Documento',
      'Período',
      'Duração',
      'CID-10 / Diagnóstico',
      'Profissional / CRM',
      'Status INSS',
    ]],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left',
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },   // #
      1: { cellWidth: 42, fontStyle: 'bold' }, // Colaborador
      2: { cellWidth: 32 },                    // Empresa
      3: { cellWidth: 26 },                    // Setor
      4: { cellWidth: 36 },                    // Tipo
      5: { cellWidth: 28 },                    // Período
      6: { cellWidth: 18, halign: 'center', fontStyle: 'bold' }, // Duração
      7: { cellWidth: 42 },                    // CID
      8: { cellWidth: 26 },                    // Médico
      9: { cellWidth: 15, halign: 'center', fontStyle: 'bold' }, // Status
    },
    didParseCell: (data) => {
      // Destaque visual para linhas com alerta INSS
      if (data.section === 'body') {
        const row = data.row.raw as string[];
        const statusText = row[9];
        if (statusText && statusText.includes('INSS')) {
          if (data.column.index === 9 || data.column.index === 6) {
            data.cell.styles.textColor = [220, 38, 38];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    },
    margin: { left: margin, right: margin, bottom: 15 },
    didDrawPage: (data) => {
      // Rodapé em todas as páginas
      const str = `Secured Guard - Sistema Integrado de Gestão | Página ${data.pageNumber}`;
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(str, margin, pageHeight - 6);
      doc.text(`Total de registros no relatório: ${documents.length}`, pageWidth - margin, pageHeight - 6, { align: 'right' });
    },
  });

  const fileName = `relatorio_atestados_medicos_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}
