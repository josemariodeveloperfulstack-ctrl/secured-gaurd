import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { WorkPost } from '@/services/workPostService';

export interface WorkPostReportStats {
  total: number;
  ativos: number;
  emImplantacao: number;
  inativos: number;
  totalVigilantes: number;
}

export interface WorkPostReportFilters {
  searchTerm?: string;
  status?: string;
  type?: string;
  clientName?: string;
  city?: string;
  state?: string;
}

const getStatusText = (status: string): string => {
  const map: Record<string, string> = {
    ATIVO: 'Ativo',
    EM_IMPLANTACAO: 'Em Implantação',
    INATIVO: 'Inativo',
    SUSPENSO: 'Suspenso',
    CANCELADO: 'Cancelado',
    EM_ANALISE: 'Em Análise',
    PENDENTE: 'Pendente',
  };
  return map[status] || status;
};

const getTypeText = (type: string): string => {
  const map: Record<string, string> = {
    POSTO_24H: 'Posto 24h',
    POSTO_SDF: 'Posto SDF',
    POSTO_12H_NOTURNO: '12h Noturno',
    POSTO_12H_DIURNO: '12h Diurno',
    POSTO_6H: 'Posto 6h',
    POSTO_8H: 'Posto 8h',
    OUTROS: 'Outros',
  };
  return map[type] || type;
};

function formatDate(dateString?: string): string {
  if (!dateString) return 'Não definida';
  try {
    return new Date(dateString).toLocaleDateString('pt-BR');
  } catch {
    return dateString;
  }
}

/**
 * Gera relatório em PDF dos postos de trabalho com resumo e tabela,
 * respeitando os dados e filtros da tela atual.
 */
export function generateWorkPostsPdf(
  workPosts: WorkPost[],
  stats: WorkPostReportStats,
  filters?: WorkPostReportFilters
): Blob {
  const doc = new jsPDF('l', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  let yPos = margin;

  // Título
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Relatório de Postos de Trabalho', margin, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`,
    margin,
    yPos
  );
  yPos += 6;

  // Filtros aplicados (se houver)
  const filterParts: string[] = [];
  if (filters?.searchTerm?.trim()) filterParts.push(`Busca: "${filters.searchTerm.trim()}"`);
  if (filters?.status && filters.status !== 'all') filterParts.push(`Status: ${getStatusText(filters.status)}`);
  if (filters?.type && filters.type !== 'all') filterParts.push(`Tipo: ${getTypeText(filters.type)}`);
  if (filters?.clientName?.trim()) filterParts.push(`Cliente: ${filters.clientName.trim()}`);
  if (filters?.city?.trim()) filterParts.push(`Cidade: ${filters.city.trim()}`);
  if (filters?.state?.trim()) filterParts.push(`Estado: ${filters.state.trim()}`);
  if (filterParts.length > 0) {
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(`Filtros aplicados: ${filterParts.join(' | ')}`, margin, yPos);
    doc.setTextColor(0, 0, 0);
    yPos += 6;
  }

  yPos += 4;

  // Resumo (cards)
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Resumo', margin, yPos);
  yPos += 6;

  const colWidth = (pageWidth - 2 * margin) / 5;
  const labels = ['Total de Postos', 'Ativos', 'Em Implantação', 'Inativos', 'Total Vigilantes'];
  const values = [
    String(stats.total),
    String(stats.ativos),
    String(stats.emImplantacao),
    String(stats.inativos),
    String(stats.totalVigilantes),
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  for (let i = 0; i < 5; i++) {
    const x = margin + i * colWidth;
    doc.setFont('helvetica', 'normal');
    doc.text(labels[i], x, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text(values[i], x, yPos + 5);
  }
  yPos += 14;

  // Tabela de postos
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Postos de Trabalho (${workPosts.length})`, margin, yPos);
  yPos += 2;

  const tableData = workPosts.map((wp) => [
    wp.postCode || '-',
    wp.name || '-',
    wp.clientName || 'N/A',
    getTypeText(wp.type || ''),
    getStatusText(wp.status || ''),
    wp.city && wp.state ? `${wp.city}, ${wp.state}` : (wp.address?.substring(0, 25) || '-'),
    String(wp.requiredVigilantes ?? '-'),
    wp.workSchedule || '-',
    formatDate(wp.implementationDate),
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [
      [
        'Código',
        'Nome',
        'Cliente',
        'Tipo',
        'Status',
        'Localização',
        'Vigilantes',
        'Escala',
        'Implantação',
      ],
    ],
    body: tableData,
    theme: 'grid',
    headStyles: { fontSize: 8, fillColor: [60, 60, 60] },
    bodyStyles: { fontSize: 7 },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 35 },
      2: { cellWidth: 30 },
      3: { cellWidth: 22 },
      4: { cellWidth: 28 },
      5: { cellWidth: 35 },
      6: { cellWidth: 18 },
      7: { cellWidth: 25 },
      8: { cellWidth: 25 },
    },
    margin: { left: margin },
  });

  return doc.output('blob');
}
