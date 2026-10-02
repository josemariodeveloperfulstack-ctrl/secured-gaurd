import React, { useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Printer, 
  Edit, 
  X,
  CheckCircle, 
  AlertTriangle,
  Clock,
  XCircle,
  FileText
} from 'lucide-react';
import { ContaAPagar } from './ContasAPagarFormModal';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';

interface ContasAPagarViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  conta: ContaAPagar | null;
  onEdit?: (conta: ContaAPagar) => void;
  onGenerateReport?: (tipo: 'pdf' | 'excel') => void;
}

export const ContasAPagarViewModal: React.FC<ContasAPagarViewModalProps> = ({
  isOpen,
  onClose,
  conta,
  onEdit
}) => {
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!conta) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const formatDate = (date?: Date | string) => {
    if (!date) return '—';
    try {
      const d = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(d.getTime())) return '—';
      return format(d, 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return '—';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAGA':
        return 'bg-emerald-600 text-white border-emerald-600';
      case 'ABERTA':
        return 'bg-amber-500 text-black border-amber-500';
      case 'VENCIDA':
        return 'bg-red-600 text-white border-red-600';
      case 'CANCELADA':
        return 'bg-gray-600 text-white border-gray-600';
      default:
        return 'bg-gray-700 text-white border-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PAGA': return 'Paga';
      case 'ABERTA': return 'Aberta';
      case 'VENCIDA': return 'Vencida';
      case 'CANCELADA': return 'Cancelada';
      default: return status || 'Aberta';
    }
  };

  const handlePrint = () => {
    const printContent = printAreaRef.current;
    if (!printContent) return;

    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;

    win.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Conta a Pagar - ${conta.descricao || 'Detalhes'}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 15mm;
          }
          * {
            box-sizing: border-box;
            font-family: Arial, Helvetica, sans-serif;
          }
          body {
            background-color: #ffffff;
            color: #1a1a1a;
            margin: 0;
            padding: 10px;
            font-size: 11px;
          }
          .doc-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 2px solid #e11d48;
          }
          .company-info h2 {
            margin: 0 0 4px 0;
            font-size: 14px;
            font-weight: bold;
            color: #111;
            text-transform: uppercase;
          }
          .company-info p {
            margin: 0;
            font-size: 9.5px;
            color: #555;
          }
          .doc-title-box {
            text-align: right;
          }
          .doc-title {
            font-size: 16px;
            font-weight: 800;
            color: #dc2626;
            margin: 0 0 4px 0;
            letter-spacing: 0.5px;
          }
          .badge-status {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: bold;
            text-transform: uppercase;
            background-color: #16a34a;
            color: #ffffff;
            margin-bottom: 4px;
          }
          .badge-code {
            display: block;
            border: 1.5px solid #dc2626;
            color: #dc2626;
            padding: 2px 6px;
            font-weight: bold;
            font-size: 11px;
            border-radius: 4px;
            margin-top: 2px;
          }
          .emission-date {
            font-size: 9.5px;
            color: #444;
            margin-top: 4px;
          }
          .section-title {
            color: #dc2626;
            font-size: 11px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin: 12px 0 6px 0;
            border-left: 3.5px solid #dc2626;
            padding-left: 6px;
          }
          .table-grid {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 8px;
            border: 1px solid #cbd5e1;
          }
          .table-grid th, .table-grid td {
            border: 1px solid #cbd5e1;
            padding: 5px 7px;
            text-align: left;
            vertical-align: top;
          }
          .table-grid th {
            background-color: #f8fafc;
            color: #475569;
            font-size: 9px;
            font-weight: bold;
            text-transform: uppercase;
            width: 25%;
          }
          .table-grid td {
            background-color: #ffffff;
            color: #0f172a;
            font-size: 10px;
            width: 25%;
          }
          .content-box {
            border: 1px solid #cbd5e1;
            background-color: #f8fafc;
            padding: 8px;
            border-radius: 2px;
            font-size: 10.5px;
            color: #1e293b;
            margin-bottom: 8px;
            min-height: 28px;
            line-height: 1.4;
          }
          .valor-highlight {
            font-size: 12px;
            font-weight: bold;
            color: #047857;
          }
          .footer-sign {
            margin-top: 30px;
            display: flex;
            justify-content: space-between;
            padding-top: 10px;
          }
          .sign-box {
            width: 45%;
            text-align: center;
            border-top: 1px solid #94a3b8;
            padding-top: 4px;
            font-size: 9px;
            color: #475569;
          }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          };
        </script>
      </body>
      </html>
    `);
    win.document.close();
  };

  const codigoExibicao = conta.id ? `CP Nº CP-${conta.id.replace(/-/g, '').substring(0, 8).toUpperCase()}` : 'CP Nº CP-2026-000101';
  const empresaNome = conta.empresa || 'PROMOVER TERCEIRIZAÇÃO E SERVIÇOS LTDA';
  const empresaSigla = conta.companySigla || 'TERC';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto bg-gray-900 border-gray-700 p-4 sm:p-6 text-gray-900">
        {/* Barra superior de Ações da Modal */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-700 text-white">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-seguranca-yellow" />
            <span className="font-semibold text-sm sm:text-base text-gray-100">Ficha Detalhada da Conta a Pagar</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="bg-seguranca-black border-gray-600 text-seguranca-yellow hover:bg-seguranca-yellow hover:text-black transition-colors"
            >
              <Printer className="w-4 h-4 mr-1.5" />
              Imprimir / PDF
            </Button>
            {onEdit && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose();
                  onEdit(conta);
                }}
                className="bg-seguranca-black border-gray-600 text-blue-400 hover:bg-blue-500 hover:text-white transition-colors"
              >
                <Edit className="w-4 h-4 mr-1.5" />
                Editar
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-400 hover:text-white hover:bg-gray-800"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Folha do Documento no estilo executivo da imagem */}
        <div 
          ref={printAreaRef}
          className="bg-white text-gray-900 rounded-sm p-4 sm:p-6 shadow-xl border border-gray-300 mt-3"
        >
          {/* Cabeçalho do Documento */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-3 mb-3 border-b-2 border-red-600">
            <div className="space-y-0.5">
              <h2 className="text-base sm:text-lg font-bold text-gray-900 uppercase tracking-tight">
                {empresaNome}
              </h2>
              <p className="text-xs text-gray-600">
                {empresaSigla && <span className="font-semibold text-gray-700">[{empresaSigla}] </span>}
                Documento de Controle e Gestão Financeira • Secured Guard
              </p>
            </div>

            <div className="text-left sm:text-right w-full sm:w-auto shrink-0 space-y-1">
              <div className="flex sm:justify-end items-center gap-2">
                <span className="text-base sm:text-lg font-extrabold text-red-600 tracking-wide">
                  CONTAS A PAGAR
                </span>
                <span className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-bold uppercase ${getStatusColor(conta.status)}`}>
                  {getStatusLabel(conta.status)}
                </span>
              </div>
              <div className="inline-block border-2 border-red-600 text-red-600 font-bold px-2 py-0.5 text-xs rounded">
                {codigoExibicao}
              </div>
              <p className="text-[11px] text-gray-600">
                Data de Emissão: <span className="font-semibold text-gray-800">{formatDate(conta.dataEmissao)}</span>
              </p>
            </div>
          </div>

          {/* SEÇÃO 1: IDENTIFICAÇÃO E DADOS GERAIS */}
          <div className="mb-4">
            <div className="border-l-4 border-red-600 pl-2 text-red-600 font-bold uppercase tracking-wide text-xs sm:text-sm mb-1.5">
              IDENTIFICAÇÃO E DADOS GERAIS
            </div>
            <table className="w-full border-collapse border border-gray-300 text-xs">
              <tbody>
                <tr>
                  <th className="bg-gray-100 text-gray-700 font-semibold p-2 border border-gray-300 w-1/4 text-left uppercase text-[10px]">
                    FORNECEDOR / BENEFICIÁRIO:
                  </th>
                  <td className="p-2 border border-gray-300 w-1/4 font-medium text-gray-900">
                    {conta.employeeName || conta.fornecedor || '—'}
                  </td>
                  <th className="bg-gray-100 text-gray-700 font-semibold p-2 border border-gray-300 w-1/4 text-left uppercase text-[10px]">
                    EMPRESA (SIGLA):
                  </th>
                  <td className="p-2 border border-gray-300 w-1/4 font-semibold text-gray-900">
                    {conta.companySigla || conta.empresa || '—'}
                  </td>
                </tr>
                <tr>
                  <th className="bg-gray-100 text-gray-700 font-semibold p-2 border border-gray-300 text-left uppercase text-[10px]">
                    UNIDADE:
                  </th>
                  <td className="p-2 border border-gray-300 font-medium text-gray-900">
                    {conta.unitName || '—'}
                  </td>
                  <th className="bg-gray-100 text-gray-700 font-semibold p-2 border border-gray-300 text-left uppercase text-[10px]">
                    SETOR DE TRABALHO:
                  </th>
                  <td className="p-2 border border-gray-300 font-medium text-gray-900">
                    {conta.workSector || '—'}
                  </td>
                </tr>
                <tr>
                  <th className="bg-gray-100 text-gray-700 font-semibold p-2 border border-gray-300 text-left uppercase text-[10px]">
                    TIPO DE DESPESA:
                  </th>
                  <td className="p-2 border border-gray-300 font-medium text-gray-900">
                    {conta.tipo === 'FIXA' ? 'Fixa' : 'Variável'}
                  </td>
                  <th className="bg-gray-100 text-gray-700 font-semibold p-2 border border-gray-300 text-left uppercase text-[10px]">
                    STATUS DA CONTA:
                  </th>
                  <td className="p-2 border border-gray-300 font-bold text-gray-900">
                    {getStatusLabel(conta.status)}
                  </td>
                </tr>
                <tr>
                  <th className="bg-gray-100 text-gray-700 font-semibold p-2 border border-gray-300 text-left uppercase text-[10px]">
                    VÍNCULO FUNCIONÁRIO:
                  </th>
                  <td className="p-2 border border-gray-300 font-medium text-gray-900">
                    {conta.employeeName ? `${conta.employeeName} (RH)` : 'Não se aplica'}
                  </td>
                  <th className="bg-gray-100 text-gray-700 font-semibold p-2 border border-gray-300 text-left uppercase text-[10px]">
                    LANÇADO POR:
                  </th>
                  <td className="p-2 border border-gray-300 font-medium text-gray-900">
                    {conta.createdByName || 'Sistema'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* SEÇÃO 2: PLANO DE CONTAS E CLASSIFICAÇÃO */}
          <div className="mb-4">
            <div className="border-l-4 border-red-600 pl-2 text-red-600 font-bold uppercase tracking-wide text-xs sm:text-sm mb-1.5">
              PLANO DE CONTAS E CLASSIFICAÇÃO
            </div>
            <table className="w-full border-collapse border border-gray-300 text-xs">
              <tbody>
                <tr>
                  <th className="bg-gray-100 text-gray-700 font-semibold p-2 border border-gray-300 w-1/4 text-left uppercase text-[10px]">
                    CATEGORIA (PLANO):
                  </th>
                  <td className="p-2 border border-gray-300 w-1/4 font-semibold text-gray-900">
                    {conta.categoriaPaiCodigo ? `${conta.categoriaPaiCodigo} - ${conta.categoriaPaiNome || ''}` : (conta.categoria || '—')}
                  </td>
                  <th className="bg-gray-100 text-gray-700 font-semibold p-2 border border-gray-300 w-1/4 text-left uppercase text-[10px]">
                    CONTA / SUBCATEGORIA:
                  </th>
                  <td className="p-2 border border-gray-300 w-1/4 font-semibold text-gray-900">
                    {conta.subcategoriaCodigo ? `${conta.subcategoriaCodigo} - ${conta.subcategoriaNome || ''}` : '—'}
                  </td>
                </tr>
                <tr>
                  <th className="bg-gray-100 text-gray-700 font-semibold p-2 border border-gray-300 text-left uppercase text-[10px]">
                    CENTRO DE CUSTO:
                  </th>
                  <td className="p-2 border border-gray-300 font-medium text-gray-900">
                    {conta.centroCusto || '—'}
                  </td>
                  <th className="bg-gray-100 text-gray-700 font-semibold p-2 border border-gray-300 text-left uppercase text-[10px]">
                    CATEGORIA (TEXTO LIVRE):
                  </th>
                  <td className="p-2 border border-gray-300 font-medium text-gray-900">
                    {conta.categoria || '—'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* SEÇÃO 3: VALORES E DATAS DE PAGAMENTO */}
          <div className="mb-4">
            <div className="border-l-4 border-red-600 pl-2 text-red-600 font-bold uppercase tracking-wide text-xs sm:text-sm mb-1.5">
              VALORES E DATAS DE PAGAMENTO
            </div>
            <table className="w-full border-collapse border border-gray-300 text-xs">
              <tbody>
                <tr>
                  <th className="bg-gray-100 text-gray-700 font-semibold p-2 border border-gray-300 w-1/4 text-left uppercase text-[10px]">
                    VALOR DA CONTA:
                  </th>
                  <td className="p-2 border border-gray-300 w-1/4 font-extrabold text-emerald-700 text-sm">
                    {formatCurrency(conta.valor)}
                  </td>
                  <th className="bg-gray-100 text-gray-700 font-semibold p-2 border border-gray-300 w-1/4 text-left uppercase text-[10px]">
                    DATA DE VENCIMENTO:
                  </th>
                  <td className="p-2 border border-gray-300 w-1/4 font-bold text-gray-900">
                    {formatDate(conta.vencimento)}
                  </td>
                </tr>
                <tr>
                  <th className="bg-gray-100 text-gray-700 font-semibold p-2 border border-gray-300 text-left uppercase text-[10px]">
                    DATA DE EMISSÃO:
                  </th>
                  <td className="p-2 border border-gray-300 font-medium text-gray-900">
                    {formatDate(conta.dataEmissao)}
                  </td>
                  <th className="bg-gray-100 text-gray-700 font-semibold p-2 border border-gray-300 text-left uppercase text-[10px]">
                    DATA DE PAGAMENTO:
                  </th>
                  <td className="p-2 border border-gray-300 font-medium text-gray-900">
                    {formatDate(conta.dataPagamento)}
                  </td>
                </tr>
                <tr>
                  <th className="bg-gray-100 text-gray-700 font-semibold p-2 border border-gray-300 text-left uppercase text-[10px]">
                    STATUS DA BAIXA:
                  </th>
                  <td className="p-2 border border-gray-300 font-medium text-gray-900">
                    {conta.baixa ? 'Liquidada (Baixada)' : 'Pendente de Baixa'}
                  </td>
                  <th className="bg-gray-100 text-gray-700 font-semibold p-2 border border-gray-300 text-left uppercase text-[10px]">
                    CÓDIGO DE BARRAS:
                  </th>
                  <td className="p-2 border border-gray-300 font-mono text-[11px] text-gray-900 truncate" title={conta.codigoBarras || ''}>
                    {conta.codigoBarras || '—'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* SEÇÃO 4: DESCRIÇÃO DA DESPESA */}
          <div className="mb-4">
            <div className="border-l-4 border-red-600 pl-2 text-red-600 font-bold uppercase tracking-wide text-xs sm:text-sm mb-1.5">
              DESCRIÇÃO DA DESPESA
            </div>
            <div className="border border-gray-300 bg-gray-50/70 p-2.5 rounded-sm text-xs text-gray-900 min-h-[36px] whitespace-pre-wrap font-medium">
              {conta.descricao || '—'}
            </div>
          </div>

          {/* SEÇÃO 5: OBSERVAÇÕES ADICIONAIS */}
          <div className="mb-4">
            <div className="border-l-4 border-red-600 pl-2 text-red-600 font-bold uppercase tracking-wide text-xs sm:text-sm mb-1.5">
              OBSERVAÇÕES ADICIONAIS
            </div>
            <div className="border border-gray-300 bg-gray-50/70 p-2.5 rounded-sm text-xs text-gray-800 min-h-[36px] whitespace-pre-wrap">
              {conta.observacoes || 'Nenhuma observação informada.'}
            </div>
          </div>

          {/* Assinatura / Rodapé para Impressão */}
          <div className="mt-8 pt-4 border-t border-gray-300 flex justify-between items-center text-[10px] text-gray-500">
            <div>
              <span>Emitido via Sistema Secured Guard • {format(new Date(), 'dd/MM/yyyy HH:mm')}</span>
            </div>
            <div className="w-52 text-center border-t border-gray-400 pt-1 mt-6">
              <span>Responsável Financeiro</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

