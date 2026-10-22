import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FeriasPeriodo } from '@/services/feriasService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EmployeeExtraInfo {
  cpf?: string;
  cargo?: string;
  matricula?: string;
  admissao?: string;
  empresaRazaoSocial?: string;
  empresaCnpj?: string;
}

export const generateAvisoFeriasPDF = async (
  ferias: FeriasPeriodo, 
  extraInfo?: EmployeeExtraInfo
): Promise<void> => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - (margin * 2);

  // Cores do layout
  const primaryColor = [15, 23, 42]; // slate-900

  // 1. Barra de Topo com Gradiente Corporativo
  doc.setFillColor(217, 119, 6); // amber-600
  doc.rect(0, 0, pageWidth, 4, 'F');

  // 2. Cabeçalho Corporativo
  let currentY = 16;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('AVISO E SOLICITAÇÃO DE FÉRIAS (CLT)', margin, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('DOCUMENTO OFICIAL DE CONCESSÃO EM CONFORMIDADE COM O ART. 135 DA CLT', margin, currentY + 5);

  const hojeFormatado = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  doc.text(`Emitido em: ${hojeFormatado}`, pageWidth - margin, currentY, { align: 'right' });

  // Linha divisória
  currentY += 10;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(margin, currentY, pageWidth - margin, currentY);

  // 3. Status de Aprovação em Destaque
  currentY += 6;
  doc.setFillColor(236, 253, 245); // emerald-50
  doc.setDrawColor(16, 185, 129); // emerald-500
  doc.roundedRect(margin, currentY, contentWidth, 12, 2, 2, 'FD');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(6, 95, 70); // emerald-800
  doc.text('STATUS: APROVADO PELO DEPARTAMENTO DE RECURSOS HUMANOS / GESTÃO', margin + 6, currentY + 7.5);

  currentY += 18;

  // 4. Dados do Colaborador e Contrato
  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    theme: 'grid',
    head: [[
      { content: '1. DADOS DO COLABORADOR E CONTRATO DE TRABALHO', colSpan: 2, styles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 } }
    ]],
    body: [
      ['Colaborador:', ferias.employeeName || 'Não especificado'],
      ['CPF / Matrícula:', extraInfo?.cpf || extraInfo?.matricula || 'Conforme Ficha Funcional'],
      ['Cargo / Função:', extraInfo?.cargo || 'Colaborador Efetivo'],
      ['Empresa / Unidade:', ferias.empresa || extraInfo?.empresaRazaoSocial || 'Secured Guard Segurança'],
      ['Setor / Posto de Trabalho:', ferias.setor || 'Operacional']
    ],
    styles: { fontSize: 8.5, cellPadding: 3, textColor: [30, 41, 59] },
    columnStyles: {
      0: { fontStyle: 'bold', width: 45, fillColor: [248, 250, 252] },
      1: { width: contentWidth - 45 }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 6;

  // Calcular dias de gozo
  const dInicio = new Date(ferias.dataInicio);
  const dFim = new Date(ferias.dataFim);
  const diasGozo = Math.max(1, Math.ceil((dFim.getTime() - dInicio.getTime()) / (1000 * 60 * 60 * 24)) + 1);

  const formatDataStr = (dataStr: string) => {
    try {
      if (!dataStr) return '-';
      const d = new Date(dataStr.includes('T') ? dataStr : dataStr + 'T00:00:00');
      return format(d, 'dd/MM/yyyy');
    } catch {
      return dataStr;
    }
  };

  const tipoFormatado = ferias.tipo === 'FERIAS_VENDIDAS' ? 'Férias Vendidas (com abono)' :
                        ferias.tipo === 'ABONO_PECUNIARIO' ? 'Abono Pecuniário' : 'Férias Integrais Regulares';

  // 5. Dados da Concessão e Período de Gozo
  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    theme: 'grid',
    head: [[
      { content: '2. PROGRAMAÇÃO E DETALHAMENTO DO PERÍODO DE FÉRIAS', colSpan: 2, styles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 } }
    ]],
    body: [
      ['Período Aquisitivo de Direito:', ferias.periodoAquisitivo || 'Conforme apuração'],
      ['Data de Início do Gozo:', formatDataStr(ferias.dataInicio)],
      ['Data de Término do Gozo:', formatDataStr(ferias.dataFim)],
      ['Total de Dias de Férias:', `${diasGozo} dias corridos`],
      ['Data de Retorno ao Trabalho:', formatDataStr(new Date(dFim.getTime() + (24 * 60 * 60 * 1000)).toISOString())],
      ['Modalidade da Concessão:', tipoFormatado],
      ['Observações / Justificativa:', ferias.observacoes || 'Nenhuma observação complementar registrada.']
    ],
    styles: { fontSize: 8.5, cellPadding: 3, textColor: [30, 41, 59] },
    columnStyles: {
      0: { fontStyle: 'bold', width: 45, fillColor: [248, 250, 252] },
      1: { width: contentWidth - 45 }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // 6. Texto Legal de Ciência e Convocação
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  const textoLegal = 'Em cumprimento ao disposto no Artigo 135 da Consolidação das Leis do Trabalho (CLT), comunicamos-lhe que lhe serão concedidas férias regulamentares relativas ao período aquisitivo supracitado, devendo você afastar-se de suas atividades profissionais no período ora fixado e retornar no primeiro dia útil subsequente ao término das férias.';
  const splitTextoLegal = doc.splitTextToSize(textoLegal, contentWidth);
  doc.text(splitTextoLegal, margin, currentY);

  currentY += (splitTextoLegal.length * 4) + 16;

  // 7. Campos de Assinatura
  const sigWidth = (contentWidth - 10) / 2;
  
  // Linha da Empresa
  doc.setDrawColor(100, 116, 139);
  doc.setLineWidth(0.5);
  doc.line(margin, currentY, margin + sigWidth, currentY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text('EMPREGADOR / RECURSOS HUMANOS', margin + (sigWidth / 2), currentY + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Departamento de Pessoal e Operações', margin + (sigWidth / 2), currentY + 8, { align: 'center' });

  // Linha do Empregado
  doc.line(pageWidth - margin - sigWidth, currentY, pageWidth - margin, currentY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('CIENTE DO COLABORADOR', pageWidth - margin - (sigWidth / 2), currentY + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(ferias.employeeName || 'Assinatura do Empregado', pageWidth - margin - (sigWidth / 2), currentY + 8, { align: 'center' });
  doc.text('Data do Ciente: ____/____/________', pageWidth - margin - (sigWidth / 2), currentY + 12, { align: 'center' });

  // 8. Rodapé Corporativo
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`Secured Guard Gestão Operacional & Segurança Integrada — ID Registro: ${ferias.id}`, margin, pageHeight - 8);
  doc.text(`Página 1 de 1`, pageWidth - margin, pageHeight - 8, { align: 'right' });

  // Salvar o PDF
  const nomeSanitizado = (ferias.employeeName || 'solicitacao').replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Aviso_Ferias_${nomeSanitizado}_${diasGozo}dias.pdf`);
};

export const viewAvisoFeriasPDF = async (
  ferias: FeriasPeriodo, 
  extraInfo?: EmployeeExtraInfo
): Promise<void> => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - (margin * 2);

  const primaryColor = [15, 23, 42];

  doc.setFillColor(217, 119, 6);
  doc.rect(0, 0, pageWidth, 4, 'F');

  let currentY = 16;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('AVISO E SOLICITAÇÃO DE FÉRIAS (CLT)', margin, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('DOCUMENTO OFICIAL DE CONCESSÃO EM CONFORMIDADE COM O ART. 135 DA CLT', margin, currentY + 5);

  const hojeFormatado = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  doc.text(`Emitido em: ${hojeFormatado}`, pageWidth - margin, currentY, { align: 'right' });

  currentY += 10;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(margin, currentY, pageWidth - margin, currentY);

  currentY += 6;
  doc.setFillColor(236, 253, 245);
  doc.setDrawColor(16, 185, 129);
  doc.roundedRect(margin, currentY, contentWidth, 12, 2, 2, 'FD');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(6, 95, 70);
  doc.text('STATUS: APROVADO PELO DEPARTAMENTO DE RECURSOS HUMANOS / GESTÃO', margin + 6, currentY + 7.5);

  currentY += 18;

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    theme: 'grid',
    head: [[
      { content: '1. DADOS DO COLABORADOR E CONTRATO DE TRABALHO', colSpan: 2, styles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 } }
    ]],
    body: [
      ['Colaborador:', ferias.employeeName || 'Não especificado'],
      ['CPF / Matrícula:', extraInfo?.cpf || extraInfo?.matricula || 'Conforme Ficha Funcional'],
      ['Cargo / Função:', extraInfo?.cargo || 'Colaborador Efetivo'],
      ['Empresa / Unidade:', ferias.empresa || extraInfo?.empresaRazaoSocial || 'Secured Guard Segurança'],
      ['Setor / Posto de Trabalho:', ferias.setor || 'Operacional']
    ],
    styles: { fontSize: 8.5, cellPadding: 3, textColor: [30, 41, 59] },
    columnStyles: {
      0: { fontStyle: 'bold', width: 45, fillColor: [248, 250, 252] },
      1: { width: contentWidth - 45 }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 6;

  const dInicio = new Date(ferias.dataInicio);
  const dFim = new Date(ferias.dataFim);
  const diasGozo = Math.max(1, Math.ceil((dFim.getTime() - dInicio.getTime()) / (1000 * 60 * 60 * 24)) + 1);

  const formatDataStr = (dataStr: string) => {
    try {
      if (!dataStr) return '-';
      const d = new Date(dataStr.includes('T') ? dataStr : dataStr + 'T00:00:00');
      return format(d, 'dd/MM/yyyy');
    } catch {
      return dataStr;
    }
  };

  const tipoFormatado = ferias.tipo === 'FERIAS_VENDIDAS' ? 'Férias Vendidas (com abono)' :
                        ferias.tipo === 'ABONO_PECUNIARIO' ? 'Abono Pecuniário' : 'Férias Integrais Regulares';

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    theme: 'grid',
    head: [[
      { content: '2. PROGRAMAÇÃO E DETALHAMENTO DO PERÍODO DE FÉRIAS', colSpan: 2, styles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 } }
    ]],
    body: [
      ['Período Aquisitivo de Direito:', ferias.periodoAquisitivo || 'Conforme apuração'],
      ['Data de Início do Gozo:', formatDataStr(ferias.dataInicio)],
      ['Data de Término do Gozo:', formatDataStr(ferias.dataFim)],
      ['Total de Dias de Férias:', `${diasGozo} dias corridos`],
      ['Data de Retorno ao Trabalho:', formatDataStr(new Date(dFim.getTime() + (24 * 60 * 60 * 1000)).toISOString())],
      ['Modalidade da Concessão:', tipoFormatado],
      ['Observações / Justificativa:', ferias.observacoes || 'Nenhuma observação complementar registrada.']
    ],
    styles: { fontSize: 8.5, cellPadding: 3, textColor: [30, 41, 59] },
    columnStyles: {
      0: { fontStyle: 'bold', width: 45, fillColor: [248, 250, 252] },
      1: { width: contentWidth - 45 }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  const textoLegal = 'Em cumprimento ao disposto no Artigo 135 da Consolidação das Leis do Trabalho (CLT), comunicamos-lhe que lhe serão concedidas férias regulamentares relativas ao período aquisitivo supracitado, devendo você afastar-se de suas atividades profissionais no período ora fixado e retornar no primeiro dia útil subsequente ao término das férias.';
  const splitTextoLegal = doc.splitTextToSize(textoLegal, contentWidth);
  doc.text(splitTextoLegal, margin, currentY);

  currentY += (splitTextoLegal.length * 4) + 16;

  const sigWidth = (contentWidth - 10) / 2;
  
  doc.setDrawColor(100, 116, 139);
  doc.setLineWidth(0.5);
  doc.line(margin, currentY, margin + sigWidth, currentY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text('EMPREGADOR / RECURSOS HUMANOS', margin + (sigWidth / 2), currentY + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Departamento de Pessoal e Operações', margin + (sigWidth / 2), currentY + 8, { align: 'center' });

  doc.line(pageWidth - margin - sigWidth, currentY, pageWidth - margin, currentY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('CIENTE DO COLABORADOR', pageWidth - margin - (sigWidth / 2), currentY + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(ferias.employeeName || 'Assinatura do Empregado', pageWidth - margin - (sigWidth / 2), currentY + 8, { align: 'center' });
  doc.text('Data do Ciente: ____/____/________', pageWidth - margin - (sigWidth / 2), currentY + 12, { align: 'center' });

  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`Secured Guard Gestão Operacional & Segurança Integrada — ID Registro: ${ferias.id}`, margin, pageHeight - 8);
  doc.text(`Página 1 de 1`, pageWidth - margin, pageHeight - 8, { align: 'right' });

  // Abrir no navegador em nova aba para visualização
  const pdfBlob = doc.output('blob');
  const blobUrl = URL.createObjectURL(pdfBlob);
  window.open(blobUrl, '_blank');
};
