import React from 'react';
import { FeriasPeriodo } from '@/services/feriasService';
import { Employee } from '@/services/employeeService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  X, 
  Calendar, 
  User, 
  FileText, 
  Building2, 
  Briefcase, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Download, 
  Eye, 
  Trash2, 
  ShieldCheck, 
  Edit,
  Info
} from 'lucide-react';
import { generateAvisoFeriasPDF, viewAvisoFeriasPDF } from '@/utils/feriasAvisoPdfGenerator';

interface FeriasDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  ferias: FeriasPeriodo | null;
  employee?: Employee | null;
  onEdit?: (ferias: FeriasPeriodo) => void;
  onDelete?: (ferias: FeriasPeriodo) => void;
}

export const FeriasDetailsModal: React.FC<FeriasDetailsModalProps> = ({
  isOpen,
  onClose,
  ferias,
  employee,
  onEdit,
  onDelete
}) => {
  if (!isOpen || !ferias) return null;

  const isAprovado = String(ferias.status || '').toUpperCase() === 'APROVADO';

  const formatDataBr = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const parts = dateStr.split('T')[0].split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return format(new Date(dateStr), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const calcularDias = (inicio?: string, fim?: string) => {
    if (!inicio || !fim) return 0;
    try {
      const d1 = new Date(inicio.split('T')[0] + 'T00:00:00');
      const d2 = new Date(fim.split('T')[0] + 'T00:00:00');
      const diffTime = d2.getTime() - d1.getTime();
      return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);
    } catch {
      return 0;
    }
  };

  const dias = calcularDias(ferias.dataInicio, ferias.dataFim);

  const getTipoLabel = (tipo?: string) => {
    switch (tipo) {
      case 'FERIAS_VENDIDAS':
        return 'Férias Vendidas (Abono + Gozo)';
      case 'ABONO_PECUNIARIO':
        return 'Abono Pecuniário (10 dias)';
      case 'FERIAS_NORMAIS':
      default:
        return 'Férias Regulares CLT';
    }
  };

  const getStatusBadge = (status?: string) => {
    const s = String(status || '').toUpperCase();
    if (s === 'APROVADO') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          Aprovado
        </span>
      );
    }
    if (s === 'PENDENTE') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          Pendente de Aprovação
        </span>
      );
    }
    if (s === 'REJEITADO' || s === 'CANCELADO') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-300 border border-red-500/40">
          <AlertCircle className="w-3.5 h-3.5 text-red-400" />
          {s === 'REJEITADO' ? 'Rejeitado' : 'Cancelado'}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-500/20 text-gray-300 border border-gray-500/40">
        {status}
      </span>
    );
  };

  const handleVisualizarPdf = () => {
    if (!isAprovado) return;
    viewAvisoFeriasPDF(ferias, {
      cpf: employee?.cpf,
      cargo: employee?.position,
      matricula: employee?.registrationNumber || employee?.id,
      admissao: employee?.hireDate,
      empresaRazaoSocial: employee?.company?.razaoSocial || employee?.company?.name,
      empresaCnpj: employee?.company?.cnpj,
    });
  };

  const handleBaixarPdf = () => {
    if (!isAprovado) return;
    generateAvisoFeriasPDF(ferias, {
      cpf: employee?.cpf,
      cargo: employee?.position,
      matricula: employee?.registrationNumber || employee?.id,
      admissao: employee?.hireDate,
      empresaRazaoSocial: employee?.company?.razaoSocial || employee?.company?.name,
      empresaCnpj: employee?.company?.cnpj,
    });
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="bg-seguranca-darkgray border border-seguranca-graphite rounded-xl w-full max-w-2xl sm:max-w-3xl overflow-hidden shadow-2xl my-auto flex flex-col max-h-[92vh] animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="shrink-0 flex justify-between items-center px-4 py-3.5 sm:px-6 sm:py-4 border-b border-seguranca-graphite bg-seguranca-graphite/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-seguranca-yellow">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Detalhes da Solicitação de Férias
              </h2>
              <p className="text-xs text-gray-400">
                Registro oficial de concessão e controle CLT
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-seguranca-graphite"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo do Modal com Rolagem Fluida */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5 text-sm">
          {/* Status e Destaque */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-gray-700/60 bg-seguranca-black/40">
            <div className="space-y-1">
              <span className="text-xs uppercase tracking-wider text-gray-400 font-semibold">
                Status Atual da Solicitação
              </span>
              <div>{getStatusBadge(ferias.status)}</div>
            </div>

            {/* Aviso sobre os Botões de PDF */}
            <div className="text-xs text-gray-400 sm:text-right">
              {isAprovado ? (
                <div className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
                  <ShieldCheck className="w-4 h-4" />
                  Aviso de férias liberado para impressão e assinatura
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 text-amber-400/90">
                  <Info className="w-4 h-4" />
                  PDF disponível somente após o status mudar para <strong>Aprovado</strong>
                </div>
              )}
            </div>
          </div>

          {/* Dados do Colaborador */}
          <div className="rounded-xl border border-gray-700/60 bg-seguranca-graphite/20 p-4 space-y-3">
            <h3 className="text-xs font-semibold text-seguranca-yellow uppercase tracking-wider flex items-center gap-2">
              <User className="w-4 h-4" />
              Dados do Funcionário
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
              <div>
                <p className="text-xs text-gray-400">Nome Completo</p>
                <p className="font-semibold text-white text-sm sm:text-base">
                  {ferias.employeeName || employee?.name || 'Funcionário não especificado'}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-400">Empresa / Posto</p>
                <p className="font-medium text-gray-200">
                  {ferias.empresa || employee?.company?.sigla || employee?.company?.name || 'Não informada'}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-400">Setor / Departamento</p>
                <p className="font-medium text-gray-200">
                  {ferias.setor || (employee as any)?.workPost?.name || (typeof (employee as any)?.workPost === 'string' ? (employee as any).workPost : null) || employee?.department?.name || (employee as any)?.unit?.name || 'Não informado'}
                </p>
              </div>

              {employee?.position && (
                <div>
                  <p className="text-xs text-gray-400">Cargo</p>
                  <p className="font-medium text-gray-200">{employee.position}</p>
                </div>
              )}

              {employee?.cpf && (
                <div>
                  <p className="text-xs text-gray-400">CPF</p>
                  <p className="font-mono text-gray-200">{employee.cpf}</p>
                </div>
              )}

              {employee?.hireDate && (
                <div>
                  <p className="text-xs text-gray-400">Data de Admissão</p>
                  <p className="font-medium text-gray-200">{formatDataBr(employee.hireDate)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Período de Gozo e Aquisição */}
          <div className="rounded-xl border border-gray-700/60 bg-seguranca-graphite/20 p-4 space-y-3">
            <h3 className="text-xs font-semibold text-seguranca-yellow uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Período e Modalidade de Gozo
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
              <div>
                <p className="text-xs text-gray-400">Data de Início</p>
                <p className="font-bold text-white text-base">
                  {formatDataBr(ferias.dataInicio)}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-400">Data de Término</p>
                <p className="font-bold text-white text-base">
                  {formatDataBr(ferias.dataFim)}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-400">Duração Total</p>
                <p className="font-bold text-seguranca-yellow text-base">
                  {dias} dias {dias === 30 ? '(Integral)' : '(Fracionado)'}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-400">Período Aquisitivo</p>
                <p className="font-bold text-white text-base">
                  {ferias.periodoAquisitivo || 'Automático'}
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-700/40 flex flex-wrap gap-4 text-xs">
              <div>
                <span className="text-gray-400">Tipo de Férias: </span>
                <span className="font-semibold text-gray-200">{getTipoLabel(ferias.tipo)}</span>
              </div>
              {ferias.createdAt && (
                <div>
                  <span className="text-gray-400">Solicitado em: </span>
                  <span className="text-gray-300">{formatDataBr(ferias.createdAt)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Observações e Justificativas */}
          {ferias.observacoes && (
            <div className="rounded-xl border border-gray-700/60 bg-seguranca-graphite/20 p-4 space-y-1.5">
              <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-gray-400" />
                Observações e Justificativas
              </h3>
              <p className="text-gray-300 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap bg-seguranca-black/30 p-3 rounded-lg border border-gray-700/30">
                {ferias.observacoes}
              </p>
            </div>
          )}
        </div>

        {/* Rodapé Fixo com Ações: Visualizar PDF, Baixar PDF, Excluir, Editar */}
        <div className="shrink-0 p-3.5 sm:p-4 border-t border-seguranca-graphite bg-seguranca-graphite/40 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 sm:gap-3">
          {/* Lado Esquerdo: Ações de Excluir / Cancelar */}
          <div className="flex items-center gap-2">
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(ferias)}
                className="px-3 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-colors flex items-center justify-center gap-1.5 w-full sm:w-auto"
                title="Excluir ou cancelar esta solicitação"
              >
                <Trash2 className="w-4 h-4" />
                Excluir
              </button>
            )}

            {onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(ferias);
                }}
                className="px-3 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-seguranca-graphite text-gray-300 border border-gray-600 hover:bg-gray-700 hover:text-white transition-colors flex items-center justify-center gap-1.5 w-full sm:w-auto"
                title="Editar informações"
              >
                <Edit className="w-4 h-4" />
                Editar
              </button>
            )}
          </div>

          {/* Lado Direito: Ações de PDF (Visualizar e Baixar) + Fechar */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
            {/* Botão Visualizar PDF - Ativo somente se Aprovado */}
            <button
              type="button"
              disabled={!isAprovado}
              onClick={handleVisualizarPdf}
              title={isAprovado ? 'Visualizar aviso de férias oficial em PDF' : 'Disponível apenas após aprovação da solicitação'}
              className="px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg border flex items-center justify-center gap-1.5 transition-all flex-1 sm:flex-initial shadow-sm disabled:opacity-40 disabled:cursor-not-allowed bg-blue-600/15 text-blue-300 border-blue-500/30 hover:bg-blue-600/25 active:scale-95"
            >
              <Eye className="w-4 h-4 text-blue-400" />
              Visualizar PDF
            </button>

            {/* Botão Baixar PDF - Ativo somente se Aprovado */}
            <button
              type="button"
              disabled={!isAprovado}
              onClick={handleBaixarPdf}
              title={isAprovado ? 'Baixar aviso de férias oficial em PDF' : 'Disponível apenas após aprovação da solicitação'}
              className="px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg border flex items-center justify-center gap-1.5 transition-all flex-1 sm:flex-initial shadow-sm disabled:opacity-40 disabled:cursor-not-allowed bg-emerald-600/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-600/25 active:scale-95"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              Baixar PDF
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs sm:text-sm font-medium rounded-lg bg-seguranca-graphite text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeriasDetailsModal;
