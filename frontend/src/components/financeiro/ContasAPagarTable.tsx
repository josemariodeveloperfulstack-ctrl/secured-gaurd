import React, { useState, useMemo, useCallback } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Edit,
  Trash2,
  Eye,
  Search,
  Filter,
  Download,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Square,
  MinusSquare,
  Sparkles
} from 'lucide-react';
import { ContaAPagar } from './ContasAPagarFormModal';
import { BulkDeleteDialog } from './BulkDeleteDialog';
import { contasAPagarService, formatContaPlanoDeContas } from '@/services/contasAPagarService';
import { useToast } from '@/hooks/use-toast';
import { format, isAfter, isBefore, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';

interface ContasAPagarTableProps {
  contas: ContaAPagar[];
  onEdit: (conta: ContaAPagar) => void;
  onDelete: (id: string) => void;
  onView: (conta: ContaAPagar) => void;
  onRefresh: () => void;
  loading?: boolean;
  onExportPeriodo?: () => void;
  exportLoading?: boolean;
}

export const ContasAPagarTable: React.FC<ContasAPagarTableProps> = ({
  contas,
  onEdit,
  onDelete,
  onView,
  onRefresh,
  loading = false,
  onExportPeriodo,
  exportLoading = false
}) => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [tipoFilter, setTipoFilter] = useState('');
  const [fornecedorFilter, setFornecedorFilter] = useState('');

  // Estados da seleção em massa inteligente
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Filtrar e Ordenar contas com prioridade (Vencidos e Próximos primeiro)
  const contasFiltradas = useMemo(() => {
    const list = contas.filter(conta => {
      const matchesSearch = 
        conta.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conta.fornecedor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (conta.employeeName && conta.employeeName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        conta.codigoBarras?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (conta.unitName && conta.unitName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (conta.workSector && conta.workSector.toLowerCase().includes(searchTerm.toLowerCase())) ||
        formatContaPlanoDeContas(conta).toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = !statusFilter || conta.status === statusFilter;
      const matchesTipo = !tipoFilter || conta.tipo === tipoFilter;
      const matchesFornecedor = !fornecedorFilter || 
        conta.fornecedor.toLowerCase().includes(fornecedorFilter.toLowerCase()) ||
        (conta.employeeName && conta.employeeName.toLowerCase().includes(fornecedorFilter.toLowerCase()));

      return matchesSearch && matchesStatus && matchesTipo && matchesFornecedor;
    });

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    return list.sort((a, b) => {
      const isOverdueA = (a.status === 'ABERTA' || a.status === 'ATRASADA') && isBefore(a.vencimento, hoje);
      const isOverdueB = (b.status === 'ABERTA' || b.status === 'ATRASADA') && isBefore(b.vencimento, hoje);

      const isOpenA = a.status === 'ABERTA' || a.status === 'ATRASADA';
      const isOpenB = b.status === 'ABERTA' || b.status === 'ATRASADA';

      const isPaidA = a.status === 'PAGA';
      const isPaidB = b.status === 'PAGA';

      const isCanceledA = a.status === 'CANCELADA';
      const isCanceledB = b.status === 'CANCELADA';

      // 1. Contas Vencidas vêm PRIMEIRO (ordenadas pela data de vencimento mais antiga = maior atraso)
      if (isOverdueA && !isOverdueB) return -1;
      if (!isOverdueA && isOverdueB) return 1;
      if (isOverdueA && isOverdueB) {
        return new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime();
      }

      // 2. Contas Abertas / Vencendo Próximo vêm em seguida (ordem cronológica crescente: mais próxima primeiro)
      if (isOpenA && !isOpenB) return -1;
      if (!isOpenA && isOpenB) return 1;
      if (isOpenA && isOpenB) {
        return new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime();
      }

      // 3. Contas Pagas vêm antes de Canceladas
      if (isPaidA && isCanceledB) return -1;
      if (isCanceledA && isPaidB) return 1;

      // Desempate
      return new Date(b.vencimento).getTime() - new Date(a.vencimento).getTime();
    });
  }, [contas, searchTerm, statusFilter, tipoFilter, fornecedorFilter]);

  // Paginação local da tabela
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const totalPages = Math.ceil(contasFiltradas.length / pageSize) || 1;

  const contasPaginadas = useMemo(() => {
    return contasFiltradas.slice(
      (page - 1) * pageSize,
      page * pageSize
    );
  }, [contasFiltradas, page, pageSize]);

  // Resetar página ao mudar filtros
  React.useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter, tipoFilter, fornecedorFilter]);

  // Cálculos de seleção
  const isAllPageSelected = useMemo(() => {
    if (contasPaginadas.length === 0) return false;
    return contasPaginadas.every(c => c.id && selectedIds.has(c.id));
  }, [contasPaginadas, selectedIds]);

  const isSomePageSelected = useMemo(() => {
    if (contasPaginadas.length === 0) return false;
    return contasPaginadas.some(c => c.id && selectedIds.has(c.id));
  }, [contasPaginadas, selectedIds]);

  const isAllFilteredSelected = useMemo(() => {
    if (contasFiltradas.length === 0) return false;
    return contasFiltradas.length === selectedIds.size && contasFiltradas.every(c => c.id && selectedIds.has(c.id));
  }, [contasFiltradas, selectedIds]);

  // Soma dos valores selecionados
  const selectedTotalAmount = useMemo(() => {
    return contas
      .filter(c => c.id && selectedIds.has(c.id))
      .reduce((sum, c) => sum + (c.valor || 0), 0);
  }, [contas, selectedIds]);

  // Handlers de Seleção Inteligente
  const handleToggleRow = useCallback((id: string, indexOnPage: number, shiftKey: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);

      // Seleção em intervalo com tecla Shift (Range Multi-select)
      if (shiftKey && lastClickedIndex !== null && lastClickedIndex !== indexOnPage) {
        const start = Math.min(lastClickedIndex, indexOnPage);
        const end = Math.max(lastClickedIndex, indexOnPage);
        for (let i = start; i <= end; i++) {
          const rowId = contasPaginadas[i]?.id;
          if (rowId) next.add(rowId);
        }
      } else {
        // Toggle individual
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
      }

      return next;
    });

    setLastClickedIndex(indexOnPage);
  }, [contasPaginadas, lastClickedIndex]);

  const handleToggleSelectPage = useCallback(() => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (isAllPageSelected) {
        // Desmarcar todos da página atual
        contasPaginadas.forEach(c => {
          if (c.id) next.delete(c.id);
        });
      } else {
        // Marcar todos da página atual
        contasPaginadas.forEach(c => {
          if (c.id) next.add(c.id);
        });
      }
      return next;
    });
  }, [contasPaginadas, isAllPageSelected]);

  const handleSelectAllFiltered = useCallback(() => {
    const next = new Set<string>();
    contasFiltradas.forEach(c => {
      if (c.id) next.add(c.id);
    });
    setSelectedIds(next);
  }, [contasFiltradas]);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setLastClickedIndex(null);
  }, []);

  // Executar exclusão em massa
  const handleConfirmBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    try {
      setBulkDeleting(true);
      const idsArray = Array.from(selectedIds);
      const result = await contasAPagarService.bulkDeleteContasAPagar(idsArray);
      
      toast({
        title: "Exclusão em Massa Concluída",
        description: `${result.deletedCount} conta(s) excluída(s) com sucesso.`,
      });

      handleClearSelection();
      setShowBulkDeleteDialog(false);
      onRefresh();
    } catch (error) {
      console.error('Erro ao excluir contas em massa:', error);
      toast({
        title: "Erro na exclusão em massa",
        description: "Não foi possível excluir todas as contas selecionadas.",
        variant: "destructive"
      });
    } finally {
      setBulkDeleting(false);
    }
  };

  const getStatusBadge = (status: string, vencimento: Date) => {
    // Vencidas -> Vermelho
    if ((status === 'ABERTA' || status === 'ATRASADA' || status === 'VENCIDA') && isBefore(vencimento, new Date())) {
      return (
        <Badge className="bg-red-600 hover:bg-red-700 text-white font-semibold flex items-center gap-1 text-[11px] px-2 py-0.5 shadow-sm">
          <AlertTriangle size={11} />
          Vencida
        </Badge>
      );
    }

    switch (status) {
      // Pagas -> Verde
      case 'PAGA':
        return (
          <Badge className="bg-green-600 hover:bg-green-700 text-white font-semibold flex items-center gap-1 text-[11px] px-2 py-0.5 shadow-sm">
            <CheckCircle size={11} />
            Paga
          </Badge>
        );

      // Aberto -> Azul
      case 'ABERTA':
        return (
          <Badge className="bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1 text-[11px] px-2 py-0.5 shadow-sm">
            <Clock size={11} />
            Aberta
          </Badge>
        );

      // Atrasada (se não vencida no horário) -> Vermelho
      case 'ATRASADA':
      case 'VENCIDA':
        return (
          <Badge className="bg-red-600 hover:bg-red-700 text-white font-semibold flex items-center gap-1 text-[11px] px-2 py-0.5 shadow-sm">
            <AlertTriangle size={11} />
            Vencida
          </Badge>
        );

      // Cancelada -> Laranja
      case 'CANCELADA':
        return (
          <Badge className="bg-orange-600 hover:bg-orange-700 text-white font-semibold flex items-center gap-1 text-[11px] px-2 py-0.5 shadow-sm">
            <XCircle size={11} />
            Cancelada
          </Badge>
        );

      default:
        return <Badge className="bg-blue-600 text-white text-[11px] px-2 py-0.5">{status}</Badge>;
    }
  };

  const getTipoBadge = (tipo: string) => {
    return tipo === 'FIXA' 
      ? <Badge className="bg-seguranca-yellow text-seguranca-black text-[10px] px-1.5 py-0.5 font-semibold">Fixa</Badge>
      : <Badge className="bg-seguranca-graphite text-seguranca-lightgray text-[10px] px-1.5 py-0.5">Variável</Badge>;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const isVencendoEmBreve = (vencimento: Date) => {
    const hoje = new Date();
    const em7Dias = addDays(hoje, 7);
    return isAfter(vencimento, hoje) && isBefore(vencimento, em7Dias);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">Carregando contas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Barra Flutuante / Topo de Ações em Massa Inteligente */}
      {selectedIds.size > 0 && (
        <div className="bg-gradient-to-r from-gray-900 via-gray-850 to-gray-900 border border-seguranca-yellow/40 rounded-lg p-3 shadow-xl flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <div className="bg-seguranca-yellow/20 border border-seguranca-yellow/40 px-2.5 py-1 rounded-md flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-seguranca-yellow" />
              <span className="text-xs font-bold text-seguranca-yellow">
                {selectedIds.size} selecionada(s)
              </span>
            </div>

            <div className="text-xs text-gray-300">
              Total Selecionado:{' '}
              <strong className="text-green-400 font-mono text-sm ml-1">
                {formatCurrency(selectedTotalAmount)}
              </strong>
            </div>

            {!isAllFilteredSelected && contasFiltradas.length > contasPaginadas.length && (
              <button
                type="button"
                onClick={handleSelectAllFiltered}
                className="text-xs text-blue-400 hover:text-blue-300 font-medium underline flex items-center gap-1 transition-colors"
              >
                <Sparkles size={12} />
                Selecionar todas as {contasFiltradas.length} contas filtradas
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearSelection}
              className="h-8 text-xs border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              Limpar Seleção
            </Button>

            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowBulkDeleteDialog(true)}
              className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white font-semibold flex items-center gap-1.5 shadow-md"
            >
              <Trash2 size={14} />
              Excluir {selectedIds.size} Selecionada(s)
            </Button>
          </div>
        </div>
      )}

      {/* Listagem de Contas */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader className="bg-gradient-to-r from-gray-700 to-gray-600 py-3 px-4">
          <div className="flex justify-between items-center">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Calendar size={18} />
              Listagem de Contas a Pagar
            </CardTitle>
            
          </div>
        </CardHeader>
        <CardContent className="bg-gray-800 p-0">
          <div className="overflow-x-auto w-full">
            <Table className="w-full table-fixed">
              <colgroup><col style={{ width: '40px' }} /><col style={{ width: '92px' }} /><col style={{ width: '160px' }} /><col style={{ width: '150px' }} /><col style={{ width: '130px' }} /><col style={{ width: '68px' }} /><col style={{ width: '92px' }} /><col style={{ width: '92px' }} /><col style={{ width: '76px' }} /><col style={{ width: '96px' }} /><col style={{ width: '84px' }} /><col style={{ width: '44px' }} /><col style={{ width: '84px' }} /><col style={{ width: '92px' }} /></colgroup>
              <TableHeader>
                <TableRow className="border-gray-600 bg-gray-700">
                  {/* Master Checkbox */}
                  <TableHead className="text-gray-200 px-2 py-2 text-center">
                    <button
                      type="button"
                      onClick={handleToggleSelectPage}
                      title={isAllPageSelected ? "Desmarcar todos desta página" : "Selecionar todos desta página"}
                      className="text-gray-300 hover:text-white transition-colors focus:outline-none flex items-center justify-center mx-auto"
                    >
                      {isAllPageSelected ? (
                        <CheckSquare className="h-4 w-4 text-seguranca-yellow" />
                      ) : isSomePageSelected ? (
                        <MinusSquare className="h-4 w-4 text-seguranca-yellow" />
                      ) : (
                        <Square className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </TableHead>
                  <TableHead className="text-gray-200 font-semibold text-xs px-2 py-2 whitespace-nowrap">Vencimento</TableHead>
                  <TableHead className="text-gray-200 font-semibold text-xs px-2 py-2">Fornecedor / Funcionário</TableHead>
                  <TableHead className="text-gray-200 font-semibold text-xs px-2 py-2">Descrição</TableHead>
                  <TableHead className="text-gray-200 font-semibold text-xs px-2 py-2">Conta</TableHead>
                  <TableHead className="text-gray-200 font-semibold text-xs px-2 py-2">Empresa</TableHead>
                  <TableHead className="text-gray-200 font-semibold text-xs px-2 py-2">Unidade</TableHead>
                  <TableHead className="text-gray-200 font-semibold text-xs px-2 py-2">Setor</TableHead>
                  <TableHead className="text-gray-200 font-semibold text-xs px-2 py-2">Tipo</TableHead>
                  <TableHead className="text-gray-200 font-semibold text-xs px-2 py-2 whitespace-nowrap">Valor</TableHead>
                  <TableHead className="text-gray-200 font-semibold text-xs px-2 py-2">Status</TableHead>
                  <TableHead className="text-gray-200 font-semibold text-xs px-2 py-2 text-center">Baixa</TableHead>
                  <TableHead className="text-gray-200 font-semibold text-xs px-2 py-2 whitespace-nowrap">Dt. Pag.</TableHead>
                  <TableHead className="text-gray-200 font-semibold text-xs px-2 py-2 text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contasPaginadas.map((conta, index) => {
                  const nomeFornecedor = conta.employeeName || conta.fornecedor || '-';
                  const descricao = conta.descricao || '-';
                  const contaLabel = formatContaPlanoDeContas(conta) || '-';
                  const vencido = isBefore(conta.vencimento, new Date()) && conta.status === 'ABERTA';
                  const vencendo = isVencendoEmBreve(conta.vencimento) && conta.status === 'ABERTA';
                  const isSelected = conta.id ? selectedIds.has(conta.id) : false;

                  return (
                    <TableRow 
                      key={conta.id || index} 
                      onClick={() => onEdit(conta)}
                      className={`
                        border-gray-600 transition-colors duration-150 cursor-pointer group
                        ${isSelected ? 'bg-seguranca-yellow/15 hover:bg-seguranca-yellow/20' : 'hover:bg-gray-750'}
                        ${!isSelected && vencendo ? 'bg-yellow-500/5 hover:bg-yellow-500/10' : ''}
                        ${!isSelected && vencido ? 'bg-red-500/5 hover:bg-red-500/10' : ''}
                      `}
                    >
                      {/* Checkbox da Linha com Suporte a Shift+Click */}
                      <TableCell className="px-2 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (conta.id) handleToggleRow(conta.id, index, e.shiftKey);
                          }}
                          className="text-gray-400 hover:text-white transition-colors focus:outline-none flex items-center justify-center mx-auto"
                          title="Clique para selecionar (Segure Shift para selecionar intervalo)"
                        >
                          {isSelected ? (
                            <CheckSquare className="h-4 w-4 text-seguranca-yellow" />
                          ) : (
                            <Square className="h-4 w-4 text-gray-500 hover:text-gray-300" />
                          )}
                        </button>
                      </TableCell>

                      {/* Vencimento */}
                      <TableCell className="px-2 py-2 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          {(vencendo || vencido) && (
                            <AlertTriangle size={12} className={vencido ? 'text-red-500 shrink-0' : 'text-yellow-500 shrink-0'} />
                          )}
                          <span className={`text-xs font-medium ${
                            vencido ? 'text-red-400' : vencendo ? 'text-yellow-400' : 'text-gray-300'
                          }`}>
                            {format(conta.vencimento, 'dd/MM/yy', { locale: ptBR })}
                          </span>
                        </div>
                      </TableCell>

                      {/* Fornecedor / Funcionário */}
                      <TableCell className="px-2 py-2">
                        <p
                          className="text-xs font-semibold text-gray-100 truncate leading-tight"
                          title={nomeFornecedor}
                        >
                          {nomeFornecedor}
                        </p>
                      </TableCell>

                      {/* Descrição */}
                      <TableCell className="px-2 py-2">
                        <p className="text-xs text-gray-400 truncate" title={descricao}>
                          {descricao}
                        </p>
                      </TableCell>

                      {/* Conta */}
                      <TableCell className="px-2 py-2">
                        <p className="text-xs text-gray-400 truncate" title={contaLabel}>
                          {contaLabel}
                        </p>
                      </TableCell>

                      {/* Empresa */}
                      <TableCell className="px-2 py-2">
                        <span className="text-xs font-bold text-seguranca-yellow truncate block" title={conta.companySigla || ''}>
                          {conta.companySigla || '-'}
                        </span>
                      </TableCell>

                      {/* Unidade */}
                      <TableCell className="px-2 py-2">
                        <p className="text-xs text-gray-400 truncate" title={conta.unitName || ''}>
                          {conta.unitName || '-'}
                        </p>
                      </TableCell>

                      {/* Setor */}
                      <TableCell className="px-2 py-2">
                        <p className="text-xs text-gray-400 truncate" title={conta.workSector || ''}>
                          {conta.workSector || '-'}
                        </p>
                      </TableCell>

                      {/* Tipo */}
                      <TableCell className="px-2 py-2">
                        {getTipoBadge(conta.tipo)}
                      </TableCell>

                      {/* Valor */}
                      <TableCell className="px-2 py-2 whitespace-nowrap">
                        <span className="text-xs font-bold text-gray-100">
                          {formatCurrency(conta.valor)}
                        </span>
                      </TableCell>

                      {/* Status */}
                      <TableCell className="px-2 py-2">
                        {getStatusBadge(conta.status, conta.vencimento)}
                      </TableCell>

                      {/* Baixa */}
                      <TableCell className="px-2 py-2 text-center">
                        {conta.baixa ? (
                          <CheckCircle size={14} className="text-green-500 mx-auto" />
                        ) : (
                          <XCircle size={14} className="text-gray-600 mx-auto" />
                        )}
                      </TableCell>

                      {/* Dt. Pagamento */}
                      <TableCell className="px-2 py-2 whitespace-nowrap">
                        <span className="text-xs text-gray-400">
                          {conta.dataPagamento ? format(conta.dataPagamento, 'dd/MM/yy', { locale: ptBR }) : '-'}
                        </span>
                      </TableCell>

                      {/* Ações */}
                      <TableCell className="px-2 py-2" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            title="Visualizar"
                            onClick={(e) => { e.stopPropagation(); onView(conta); }} 
                            className="h-7 w-7 p-0 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10"
                          >
                            <Eye size={14} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            title="Editar"
                            onClick={(e) => { e.stopPropagation(); onEdit(conta); }} 
                            className="h-7 w-7 p-0 text-gray-400 hover:text-yellow-400 hover:bg-yellow-500/10"
                          >
                            <Edit size={14} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            title="Excluir"
                            onClick={(e) => { e.stopPropagation(); onDelete(conta.id!); }}
                            className="h-7 w-7 p-0 text-gray-400 hover:text-red-400 hover:bg-red-500/10"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            
            {contasFiltradas.length === 0 && (
              <div className="text-center py-12 bg-gray-800">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center">
                    <Calendar className="w-8 h-8 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-gray-300 text-lg font-medium">Nenhuma conta encontrada</p>
                    <p className="text-gray-500 text-sm mt-1">Ajuste os filtros para ver mais resultados</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Paginação */}
      {contasFiltradas.length > 0 && (
        <div className="flex items-center justify-between text-xs sm:text-sm text-gray-300 bg-seguranca-black border border-gray-700 rounded-lg px-3 py-2">
          <div className="truncate">
            Mostrando{' '}
            {Math.min((page - 1) * pageSize + 1, contasFiltradas.length)} -{' '}
            {Math.min(page * pageSize, contasFiltradas.length)} de{' '}
            {contasFiltradas.length} conta(s)
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="border-gray-600 text-gray-300 hover:bg-seguranca-black disabled:opacity-30 disabled:cursor-not-allowed h-7 text-xs"
            >
              <ChevronLeft size={14} className="mr-1" />
              Anterior
            </Button>

            <span className="px-1 sm:px-2 text-xs">
              Página {page} de {totalPages}
            </span>

            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() =>
                setPage((p) => (p < totalPages ? p + 1 : p))
              }
              className="border-gray-600 text-gray-300 hover:bg-seguranca-black disabled:opacity-30 disabled:cursor-not-allowed h-7 text-xs"
            >
              Próxima
              <ChevronRight size={14} className="ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão em Massa */}
      <BulkDeleteDialog
        open={showBulkDeleteDialog}
        onOpenChange={setShowBulkDeleteDialog}
        onConfirm={handleConfirmBulkDelete}
        itemCount={selectedIds.size}
        itemType="conta(s) a pagar"
        loading={bulkDeleting}
      />
    </div>
  );
};