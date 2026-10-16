import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { FileText, Download, Filter, Columns, Loader2, Calendar, Building2, Tag, CheckSquare, Square, RotateCcw } from 'lucide-react';
import { contasAReceberService, CustomContasAReceberReportRequest } from '@/services/contasAReceberService';
import { formatDateForBackend } from '@/utils/dateUtils';
import api from '@/lib/axios';

interface ContasAReceberReportCustomModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ColumnOption {
  id: string;
  label: string;
  defaultChecked: boolean;
}

const AVAILABLE_COLUMNS: ColumnOption[] = [
  { id: 'dueDate', label: 'Data de Vencimento', defaultChecked: true },
  { id: 'issueDate', label: 'Data de Emissão', defaultChecked: false },
  { id: 'paymentDate', label: 'Data de Recebimento', defaultChecked: false },
  { id: 'invoiceNumber', label: 'Nº da Fatura', defaultChecked: true },
  { id: 'description', label: 'Descrição da Receita', defaultChecked: true },
  { id: 'client', label: 'Cliente', defaultChecked: true },
  { id: 'unit', label: 'Unidade / Filial', defaultChecked: true },
  { id: 'workPost', label: 'Posto de Trabalho', defaultChecked: false },
  { id: 'category', label: 'Plano de Contas', defaultChecked: true },
  { id: 'paymentMethod', label: 'Forma de Pagamento', defaultChecked: false },
  { id: 'amount', label: 'Valor Total (R$)', defaultChecked: true },
  { id: 'amountPaid', label: 'Valor Recebido (R$)', defaultChecked: true },
  { id: 'status', label: 'Status', defaultChecked: true },
  { id: 'measurementNumber', label: 'Nº da Medição', defaultChecked: false },
];

export const ContasAReceberReportCustomModal: React.FC<ContasAReceberReportCustomModalProps> = ({
  open,
  onOpenChange,
}) => {
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);

  // Listas de dados para filtros
  const [unidades, setUnidades] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [subcategorias, setSubcategorias] = useState<any[]>([]);

  // Filtros
  const [startDate, setStartDate] = useState<Date | undefined>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
  );
  const [dateField, setDateField] = useState<'dueDate' | 'issueDate' | 'paymentDate'>('dueDate');
  const [expiringInDays, setExpiringInDays] = useState<string>('ALL');
  const [status, setStatus] = useState<string>('TODOS');
  const [reportSegment, setReportSegment] = useState<string>('TODOS');
  const [unitId, setUnitId] = useState<string>('TODAS');
  const [clientId, setClientId] = useState<string>('TODOS');
  const [subcategoriaId, setSubcategoriaId] = useState<string>('TODAS');
  const [paymentMethod, setPaymentMethod] = useState<string>('TODOS');
  const [groupBy, setGroupBy] = useState<string>('CLIENT');

  // Seleção de colunas
  const [selectedColumns, setSelectedColumns] = useState<string[]>(
    AVAILABLE_COLUMNS.filter((c) => c.defaultChecked).map((c) => c.id)
  );

  useEffect(() => {
    if (open) {
      api.get('/units')
        .then((res) => setUnidades(Array.isArray(res.data) ? res.data : []))
        .catch(() => setUnidades([]));

      api.get('/clients/all')
        .catch(() => api.get('/clients'))
        .then((res) => {
          const list = Array.isArray(res.data) ? res.data : (res.data?.content || []);
          setClientes(list);
        })
        .catch(() => setClientes([]));

      api.get('/plano-contas/subcategorias')
        .catch(() => api.get('/subcategorias'))
        .then((res) => setSubcategorias(Array.isArray(res.data) ? res.data : []))
        .catch(() => setSubcategorias([]));
    }
  }, [open]);

  const toggleColumn = (colId: string) => {
    if (selectedColumns.includes(colId)) {
      if (selectedColumns.length === 1) {
        toast({
          title: 'Atenção',
          description: 'Você precisa manter pelo menos 1 coluna selecionada.',
          variant: 'destructive',
        });
        return;
      }
      setSelectedColumns(selectedColumns.filter((id) => id !== colId));
    } else {
      setSelectedColumns([...selectedColumns, colId]);
    }
  };

  const handleSelectAllColumns = () => {
    setSelectedColumns(AVAILABLE_COLUMNS.map((c) => c.id));
  };

  const handleResetColumns = () => {
    setSelectedColumns(AVAILABLE_COLUMNS.filter((c) => c.defaultChecked).map((c) => c.id));
  };

  const handleQuickExpiringFilter = (days: number) => {
    setExpiringInDays(String(days));
    setDateField('dueDate');
    setStatus('PENDING');
    const today = new Date();
    setStartDate(today);
    const end = new Date();
    end.setDate(today.getDate() + days);
    setEndDate(end);
  };

  const handleGeneratePdf = async () => {
    if (selectedColumns.length === 0) {
      toast({
        title: 'Atenção',
        description: 'Selecione pelo menos uma coluna para gerar o relatório.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setGenerating(true);

      const parsedExpiring = expiringInDays !== 'ALL' ? parseInt(expiringInDays, 10) : undefined;

      const requestPayload: CustomContasAReceberReportRequest = {
        startDate: startDate ? formatDateForBackend(startDate) : undefined,
        endDate: endDate ? formatDateForBackend(endDate) : undefined,
        dateField,
        status: status !== 'TODOS' ? status : undefined,
        reportSegment: reportSegment !== 'TODOS' ? reportSegment : undefined,
        paymentMethod: paymentMethod !== 'TODOS' ? paymentMethod : undefined,
        unitId: unitId !== 'TODAS' ? unitId : undefined,
        clientId: clientId !== 'TODOS' ? clientId : undefined,
        subcategoriaId: subcategoriaId !== 'TODAS' ? subcategoriaId : undefined,
        expiringInDays: parsedExpiring,
        selectedColumns,
        groupBy,
      };

      const pdfBlob = await contasAReceberService.generateCustomPdfReport(requestPayload);

      const url = window.URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio-contas-a-receber-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Sucesso',
        description: 'Relatório personalizado gerado e baixado com sucesso!',
      });

      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao gerar relatório personalizado em PDF:', error);
      toast({
        title: 'Erro na geração',
        description: error.response?.data?.message || 'Não foi possível gerar o PDF.',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto bg-slate-950 border-slate-800 text-slate-100 shadow-2xl p-0">
        {/* Top Header */}
        <div className="p-6 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950">
          <DialogTitle className="text-xl font-bold flex items-center gap-2.5 text-white">
            <span className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <FileText className="w-5 h-5" />
            </span>
            Relatório Personalizado de Contas a Receber
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-xs mt-1.5 ml-11">
            Configure filtros avançados, vencimentos próximos, agrupamento e colunas para o PDF executivo com layout corporativo.
          </DialogDescription>
        </div>

        <div className="p-6 space-y-6">
          {/* Seção 1: Período & Vencimentos Próximos */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-400">
                <Calendar className="w-4 h-4" />
                1. Período & Vencimentos Próximos
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-400 mr-1 hidden sm:inline">Vencendo em:</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickExpiringFilter(7)}
                  className={`h-7 px-2.5 text-xs font-medium border transition-colors ${
                    expiringInDays === '7'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  7 dias
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickExpiringFilter(15)}
                  className={`h-7 px-2.5 text-xs font-medium border transition-colors ${
                    expiringInDays === '15'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  15 dias
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickExpiringFilter(30)}
                  className={`h-7 px-2.5 text-xs font-medium border transition-colors ${
                    expiringInDays === '30'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  30 dias
                </Button>
                {expiringInDays !== 'ALL' && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpiringInDays('ALL')}
                    className="h-7 px-2 text-xs text-slate-400 hover:text-white"
                  >
                    Limpar
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs text-slate-300 mb-1.5 block">Campo de Data Base</Label>
                <Select value={dateField} onValueChange={(val: any) => setDateField(val)}>
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-slate-200 h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700 text-slate-200">
                    <SelectItem value="dueDate">Data de Vencimento</SelectItem>
                    <SelectItem value="issueDate">Data de Emissão</SelectItem>
                    <SelectItem value="paymentDate">Data de Recebimento</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-slate-300 mb-1.5 block">Data Inicial</Label>
                <DatePicker date={startDate} onDateChange={setStartDate} placeholder="Início" />
              </div>

              <div>
                <Label className="text-xs text-slate-300 mb-1.5 block">Data Final</Label>
                <DatePicker date={endDate} onDateChange={setEndDate} placeholder="Fim" />
              </div>
            </div>
          </div>

          {/* Seção 2: Filtros de Negócio */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-400 border-b border-slate-800 pb-3">
              <Filter className="w-4 h-4" />
              2. Filtros de Negócio & Escopo
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs text-slate-300 mb-1.5 block">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-slate-200 h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700 text-slate-200">
                    <SelectItem value="TODOS">Todos os Status</SelectItem>
                    <SelectItem value="PENDING">Aberta / Pendente</SelectItem>
                    <SelectItem value="PAID">Recebida</SelectItem>
                    <SelectItem value="OVERDUE">Vencida</SelectItem>
                    <SelectItem value="CANCELLED">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-slate-300 mb-1.5 block">Segmento Especial</Label>
                <Select value={reportSegment} onValueChange={setReportSegment}>
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-slate-200 h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700 text-slate-200">
                    <SelectItem value="TODOS">Sem filtro de segmento</SelectItem>
                    <SelectItem value="RECEBIDOS">Recebidos</SelectItem>
                    <SelectItem value="A_VENCER">A Vencer</SelectItem>
                    <SelectItem value="VENCIDOS">Vencidos</SelectItem>
                    <SelectItem value="INADIMPLENCIA">Inadimplência</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-slate-300 mb-1.5 block">Cliente</Label>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-slate-200 h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700 text-slate-200 max-h-56">
                    <SelectItem value="TODOS">Todos os Clientes</SelectItem>
                    {clientes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-slate-300 mb-1.5 block">Unidade / Filial</Label>
                <Select value={unitId} onValueChange={setUnitId}>
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-slate-200 h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700 text-slate-200 max-h-56">
                    <SelectItem value="TODAS">Todas as Unidades</SelectItem>
                    {unidades.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-slate-300 mb-1.5 block">Plano de Contas</Label>
                <Select value={subcategoriaId} onValueChange={setSubcategoriaId}>
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-slate-200 h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700 text-slate-200 max-h-56">
                    <SelectItem value="TODAS">Todas as Contas</SelectItem>
                    {subcategorias.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.codigo ? `${s.codigo} - ` : ''}{s.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-slate-300 mb-1.5 block">Método de Pagamento</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-slate-200 h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700 text-slate-200">
                    <SelectItem value="TODOS">Todos os Métodos</SelectItem>
                    <SelectItem value="PIX">PIX</SelectItem>
                    <SelectItem value="BOLETO">Boleto Bancário</SelectItem>
                    <SelectItem value="TRANSFER">Transferência (TED/DOC)</SelectItem>
                    <SelectItem value="CARD">Cartão</SelectItem>
                    <SelectItem value="CASH">Dinheiro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Seção 3: Agrupamento e Subtotais */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-400 border-b border-slate-800 pb-3">
              <Building2 className="w-4 h-4" />
              3. Agrupamento & Subtotais no PDF
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-slate-300 mb-1.5 block">Agrupar Registros Por</Label>
                <Select value={groupBy} onValueChange={setGroupBy}>
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-slate-200 h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700 text-slate-200">
                    <SelectItem value="CLIENT">Cliente (com subtotais)</SelectItem>
                    <SelectItem value="UNIT">Unidade / Filial</SelectItem>
                    <SelectItem value="STATUS">Status (Aberta, Recebida, Vencida)</SelectItem>
                    <SelectItem value="PERIOD">Mês / Competência de Vencimento</SelectItem>
                    <SelectItem value="PAYMENT_METHOD">Método de Pagamento</SelectItem>
                    <SelectItem value="NONE">Sem Agrupamento (Lista Contínua)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center text-xs text-slate-400 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                Cada grupo exibirá uma barra executiva destacada com subtotal financeiro e quantidade de contas calculadas automaticamente.
              </div>
            </div>
          </div>

          {/* Seção 4: Seleção de Colunas */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-400">
                <Columns className="w-4 h-4" />
                4. Colunas do Relatório ({selectedColumns.length} selecionadas)
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAllColumns}
                  className="h-7 px-2 text-xs text-slate-300 hover:text-white"
                >
                  <CheckSquare className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                  Marcar Todas
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleResetColumns}
                  className="h-7 px-2 text-xs text-slate-300 hover:text-white"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1 text-amber-400" />
                  Padrão
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 pt-1">
              {AVAILABLE_COLUMNS.map((col) => {
                const isChecked = selectedColumns.includes(col.id);
                return (
                  <label
                    key={col.id}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                      isChecked
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                        : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:bg-slate-800/60'
                    }`}
                  >
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() => toggleColumn(col.id)}
                      className="border-slate-600 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                    />
                    <span className="font-medium truncate">{col.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 border-t border-slate-800 bg-slate-900/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            Formato de saída: <span className="font-semibold text-slate-200">PDF Executivo Paisagem (A4)</span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={generating}
              className="border-slate-700 text-slate-300 hover:bg-slate-800 w-full sm:w-auto text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleGeneratePdf}
              disabled={generating}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-2 w-full sm:w-auto text-xs shadow-lg shadow-emerald-900/30"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Gerando PDF...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Gerar Relatório (PDF)
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
