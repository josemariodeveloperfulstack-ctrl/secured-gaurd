import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { FileText, Download, Filter, Columns, Loader2, Calendar, Building2, Tag, CheckSquare, Square, RotateCcw } from 'lucide-react';
import { contasAPagarService, CustomContasAPagarReportRequest, Supplier } from '@/services/contasAPagarService';
import { formatDateForBackend } from '@/utils/dateUtils';
import api from '@/lib/axios';
import departmentService, { filterCompanyDepartments, isValidSectorName } from '@/services/departmentService';

interface ContasAPagarReportCustomModalProps {
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
  { id: 'paymentDate', label: 'Data de Pagamento', defaultChecked: false },
  { id: 'description', label: 'Descrição da Despesa', defaultChecked: true },
  { id: 'supplier', label: 'Fornecedor / Beneficiário', defaultChecked: true },
  { id: 'company', label: 'Empresa (Sigla)', defaultChecked: false },
  { id: 'unit', label: 'Unidade', defaultChecked: true },
  { id: 'workSector', label: 'Setor de Trabalho', defaultChecked: true },
  { id: 'category', label: 'Conta / Categoria', defaultChecked: true },
  { id: 'centroCusto', label: 'Centro de Custo', defaultChecked: false },
  { id: 'type', label: 'Tipo (Fixa/Variável)', defaultChecked: false },
  { id: 'amount', label: 'Valor (R$)', defaultChecked: true },
  { id: 'status', label: 'Status', defaultChecked: true },
  { id: 'barcode', label: 'Código de Barras', defaultChecked: false },
  { id: 'observations', label: 'Observações / Anotações', defaultChecked: false },
];

export const ContasAPagarReportCustomModal: React.FC<ContasAPagarReportCustomModalProps> = ({
  open,
  onOpenChange,
}) => {
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);

  // Listas de dados para filtros
  const [unidades, setUnidades] = useState<any[]>([]);
  const [setoresSugeridos, setSetoresSugeridos] = useState<string[]>([]);
  const [fornecedores, setFornecedores] = useState<Supplier[]>([]);
  const [empresas, setEmpresas] = useState<any[]>([]);

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
  const [tipo, setTipo] = useState<string>('TODOS');
  const [unitId, setUnitId] = useState<string>('TODAS');
  const [workSector, setWorkSector] = useState<string>('TODOS');
  const [companySigla, setCompanySigla] = useState<string>('TODAS');
  const [supplierId, setSupplierId] = useState<string>('TODOS');
  const [groupBy, setGroupBy] = useState<'UNIT_SECTOR' | 'NONE'>('UNIT_SECTOR');

  // Seleção de colunas
  const [selectedColumns, setSelectedColumns] = useState<string[]>(
    AVAILABLE_COLUMNS.filter((c) => c.defaultChecked).map((c) => c.id)
  );

  useEffect(() => {
    if (open) {
      // Carregar unidades
      api.get('/units')
        .then((res) => setUnidades(Array.isArray(res.data) ? res.data : []))
        .catch(() => setUnidades([]));

      // Carregar setores de trabalho do banco de dados (Departamentos + Postos de Trabalho)
      Promise.allSettled([
        departmentService.listActive(),
        api.get('/work-posts/all').catch(() => api.get('/work-posts'))
      ]).then(([deptResult, postsResult]) => {
        // Departamentos: aplicar filtro para remover dados inválidos (estado civil, etc.)
        const rawDepts = deptResult.status === 'fulfilled' && Array.isArray(deptResult.value)
          ? deptResult.value
          : [];
        const deptNames: string[] = filterCompanyDepartments(rawDepts)
          .map((d: any) => d.name?.trim())
          .filter(Boolean);

        // Postos de Trabalho: usar apenas o campo "name" do posto, filtrar inválidos
        const postNames: string[] = [];
        if (postsResult.status === 'fulfilled') {
          const raw = postsResult.value?.data;
          const list = Array.isArray(raw) ? raw : (raw?.content || []);
          list.forEach((p: any) => {
            const n = p?.name?.trim();
            if (n && typeof n === 'string' && isValidSectorName(n)) {
              postNames.push(n);
            }
          });
        }

        const combined = Array.from(new Set([...deptNames, ...postNames])).filter(Boolean).sort((a, b) => a.localeCompare(b));
        setSetoresSugeridos(combined);
      }).catch(err => {
        console.warn('Erro ao carregar setores de trabalho:', err);
        setSetoresSugeridos([]);
      });

      // Carregar fornecedores
      contasAPagarService.getFornecedores()
        .then((data) => setFornecedores(Array.isArray(data) ? data : []))
        .catch(() => setFornecedores([]));

      // Carregar empresas
      contasAPagarService.getEmpresas()
        .then((data) => setEmpresas(Array.isArray(data) ? data : []))
        .catch(() => setEmpresas([]));
    }
  }, [open]);

  const handleToggleColumn = (colId: string) => {
    setSelectedColumns((prev) =>
      prev.includes(colId) ? prev.filter((id) => id !== colId) : [...prev, colId]
    );
  };

  const handleSelectAllColumns = () => {
    setSelectedColumns(AVAILABLE_COLUMNS.map((c) => c.id));
  };

  const handleDeselectAllColumns = () => {
    setSelectedColumns(['dueDate', 'description', 'amount', 'status']);
  };

  const handleResetColumns = () => {
    setSelectedColumns(AVAILABLE_COLUMNS.filter((c) => c.defaultChecked).map((c) => c.id));
  };

  const handleQuickExpiringFilter = (days: number) => {
    setExpiringInDays(String(days));
    setDateField('dueDate');
    setStatus('PENDENTE');
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

      const requestPayload = {
        startDate: startDate ? formatDateForBackend(startDate) : undefined,
        endDate: endDate ? formatDateForBackend(endDate) : undefined,
        dateField,
        status: status !== 'TODOS' ? status : undefined,
        type: tipo !== 'TODOS' ? tipo : undefined,
        unitId: unitId !== 'TODAS' ? unitId : undefined,
        workSector: workSector && workSector !== 'TODOS' ? workSector : undefined,
        companySigla: companySigla !== 'TODAS' ? companySigla : undefined,
        supplierId: supplierId !== 'TODOS' ? supplierId : undefined,
        expiringInDays: parsedExpiring,
        selectedColumns,
        groupBy,
      };

      const pdfBlob = await contasAPagarService.generateCustomPdfReport(requestPayload);

      // Download do arquivo
      const url = window.URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio-contas-a-pagar-${new Date().toISOString().split('T')[0]}.pdf`;
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
        {/* Top Header com gradiente sutil */}
        <div className="p-6 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950">
          <DialogTitle className="text-xl font-bold flex items-center gap-2.5 text-white">
            <span className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <FileText className="w-5 h-5" />
            </span>
            Relatório Personalizado de Contas a Pagar
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-xs mt-1.5 ml-11">
            Configure filtros avançados, selecione o período ou vencimentos iminentes e defina as colunas do PDF oficial.
          </DialogDescription>
        </div>

        <div className="p-6 space-y-6">
          {/* Seção 1: Período e Alerta de Vencimento */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-amber-400">
                <Calendar className="w-4 h-4" />
                1. Período & Vencimentos Próximos
              </div>
              {/* Botões Rápidos de Vencimento */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-400 mr-1 hidden sm:inline">Vencendo em:</span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleQuickExpiringFilter(7)}
                  className={`text-xs h-7 px-2.5 rounded-full border transition-all ${
                    expiringInDays === '7'
                      ? 'bg-amber-500 text-black font-bold border-amber-400'
                      : 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  ⚡ Próx. 7 dias
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleQuickExpiringFilter(15)}
                  className={`text-xs h-7 px-2.5 rounded-full border transition-all ${
                    expiringInDays === '15'
                      ? 'bg-amber-500 text-black font-bold border-amber-400'
                      : 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  15 dias
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleQuickExpiringFilter(30)}
                  className={`text-xs h-7 px-2.5 rounded-full border transition-all ${
                    expiringInDays === '30'
                      ? 'bg-amber-500 text-black font-bold border-amber-400'
                      : 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  30 dias
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {/* Campo Base de Data */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-300">Base da Data</Label>
                <Select value={dateField} onValueChange={(val: any) => setDateField(val)}>
                  <SelectTrigger className="border-slate-700 bg-slate-950 text-slate-200 focus:ring-amber-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700 text-slate-200">
                    <SelectItem value="dueDate" className="hover:bg-slate-800">Data de Vencimento</SelectItem>
                    <SelectItem value="issueDate" className="hover:bg-slate-800">Data de Emissão</SelectItem>
                    <SelectItem value="paymentDate" className="hover:bg-slate-800">Data de Pagamento</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Data Inicial */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-300">Data Inicial</Label>
                <DatePicker
                  date={startDate}
                  onDateChange={setStartDate}
                  className="w-full border-slate-700 bg-slate-950 text-slate-200"
                />
              </div>

              {/* Data Final */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-300">Data Final</Label>
                <DatePicker
                  date={endDate}
                  onDateChange={setEndDate}
                  className="w-full border-slate-700 bg-slate-950 text-slate-200"
                />
              </div>

              {/* Filtro de Vencimento Iminente */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                  <span>Vencendo em Breve</span>
                  {expiringInDays !== 'ALL' && (
                    <span className="text-[10px] text-amber-400 font-semibold">Ativo ({expiringInDays}d)</span>
                  )}
                </Label>
                <Select value={expiringInDays} onValueChange={(val) => {
                  setExpiringInDays(val);
                  if (val !== 'ALL') {
                    handleQuickExpiringFilter(parseInt(val, 10));
                  }
                }}>
                  <SelectTrigger className="border-slate-700 bg-slate-950 text-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700 text-slate-200">
                    <SelectItem value="ALL" className="hover:bg-slate-800">Qualquer período</SelectItem>
                    <SelectItem value="7" className="hover:bg-slate-800">Próximos 7 dias (Urgente)</SelectItem>
                    <SelectItem value="15" className="hover:bg-slate-800">Próximos 15 dias</SelectItem>
                    <SelectItem value="30" className="hover:bg-slate-800">Próximos 30 dias (Mensal)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Seção 2: Filtros Organizacionais e Cadastrais */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-400 border-b border-slate-800 pb-3">
              <Filter className="w-4 h-4" />
              2. Filtros Corporativos e Status
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {/* Empresa (Sigla) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-300">Empresa (SIGLA)</Label>
                <Select value={companySigla} onValueChange={setCompanySigla}>
                  <SelectTrigger className="border-slate-700 bg-slate-950 text-slate-200">
                    <SelectValue placeholder="Todas as empresas" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700 text-slate-200">
                    <SelectItem value="TODAS" className="hover:bg-slate-800">Todas as Empresas</SelectItem>
                    {empresas.map((emp) => (
                      <SelectItem key={emp.id} value={emp.sigla || emp.name} className="hover:bg-slate-800">
                        {emp.sigla ? `${emp.sigla} - ${emp.name}` : emp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Unidade */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-300">Unidade Operacional</Label>
                <Select value={unitId} onValueChange={setUnitId}>
                  <SelectTrigger className="border-slate-700 bg-slate-950 text-slate-200">
                    <SelectValue placeholder="Todas as unidades" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700 text-slate-200 max-h-56">
                    <SelectItem value="TODAS" className="hover:bg-slate-800">Todas as Unidades</SelectItem>
                    {unidades.map((u) => (
                      <SelectItem key={u.id} value={u.id} className="hover:bg-slate-800">
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Setor de Trabalho */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-300">Setor de Trabalho</Label>
                <Select value={workSector || 'TODOS'} onValueChange={setWorkSector}>
                  <SelectTrigger className="border-slate-700 bg-slate-950 text-slate-200">
                    <SelectValue placeholder="Todos os setores" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700 text-slate-200 max-h-56">
                    <SelectItem value="TODOS" className="hover:bg-slate-800">Todos os Setores</SelectItem>
                    {setoresSugeridos.map((s, idx) => (
                      <SelectItem key={idx} value={s} className="hover:bg-slate-800">
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-300">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="border-slate-700 bg-slate-950 text-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700 text-slate-200">
                    <SelectItem value="TODOS" className="hover:bg-slate-800">Todos os Status</SelectItem>
                    <SelectItem value="PENDENTE" className="hover:bg-slate-800">Aberta (Pendente)</SelectItem>
                    <SelectItem value="PAGA" className="hover:bg-slate-800">Paga</SelectItem>
                    <SelectItem value="CANCELADA" className="hover:bg-slate-800">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tipo */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-300">Tipo de Despesa</Label>
                <Select value={tipo} onValueChange={setTipo}>
                  <SelectTrigger className="border-slate-700 bg-slate-950 text-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700 text-slate-200">
                    <SelectItem value="TODOS" className="hover:bg-slate-800">Todos os Tipos</SelectItem>
                    <SelectItem value="FIXA" className="hover:bg-slate-800">Fixa</SelectItem>
                    <SelectItem value="VARIAVEL" className="hover:bg-slate-800">Variável</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Fornecedor */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-300">Fornecedor</Label>
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger className="border-slate-700 bg-slate-950 text-slate-200">
                    <SelectValue placeholder="Todos os fornecedores" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700 text-slate-200 max-h-56">
                    <SelectItem value="TODOS" className="hover:bg-slate-800">Todos os Fornecedores</SelectItem>
                    {fornecedores.map((f) => (
                      <SelectItem key={f.id} value={f.id} className="hover:bg-slate-800">
                        <span className="truncate block max-w-[340px]" title={f.name}>{f.name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Seção 3: Agrupamento e Subtotais */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <Label className="text-sm font-semibold text-white">Agrupamento e Subtotais Automáticos</Label>
                <p className="text-xs text-slate-400 mt-0.5">
                  Organiza a quebra de tabela no PDF calculando totais parciais para cada grupo selecionado.
                </p>
              </div>
              <Select value={groupBy} onValueChange={(val: any) => setGroupBy(val)}>
                <SelectTrigger className="w-full sm:w-[280px] border-slate-700 bg-slate-950 text-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700 text-slate-200">
                  <SelectItem value="UNIT_SECTOR" className="hover:bg-slate-800">
                    🏢 Agrupar por Unidade e Setor
                  </SelectItem>
                  <SelectItem value="WORK_SECTOR" className="hover:bg-slate-800">
                    🏷️ Agrupar por Setor de Trabalho
                  </SelectItem>
                  <SelectItem value="UNIT" className="hover:bg-slate-800">
                    🏢 Agrupar por Unidade
                  </SelectItem>
                  <SelectItem value="COMPANY" className="hover:bg-slate-800">
                    🏢 Agrupar por Empresa
                  </SelectItem>
                  <SelectItem value="PERIOD" className="hover:bg-slate-800">
                    📅 Agrupar por Período (Mês/Ano)
                  </SelectItem>
                  <SelectItem value="STATUS" className="hover:bg-slate-800">
                    📊 Agrupar por Status (Pendente/Paga)
                  </SelectItem>
                  <SelectItem value="NONE" className="hover:bg-slate-800">
                    📄 Listagem Simples (Sem Agrupamento)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Seção 4: Seleção de Colunas */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h4 className="text-sm font-semibold text-amber-400 flex items-center gap-2">
                  <Columns className="w-4 h-4" />
                  3. Colunas do Relatório ({selectedColumns.length} de {AVAILABLE_COLUMNS.length} selecionadas)
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Escolha as informações que serão impressas no documento.
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleSelectAllColumns}
                  className="text-xs h-7 border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  <CheckSquare className="w-3 h-3 mr-1" /> Todas
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleDeselectAllColumns}
                  className="text-xs h-7 border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  <Square className="w-3 h-3 mr-1" /> Mínimas
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleResetColumns}
                  className="text-xs h-7 border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  <RotateCcw className="w-3 h-3 mr-1" /> Padrão
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {AVAILABLE_COLUMNS.map((col) => {
                const checked = selectedColumns.includes(col.id);
                return (
                  <div
                    key={col.id}
                    onClick={() => handleToggleColumn(col.id)}
                    className={`flex items-center space-x-3 p-2.5 rounded-lg border cursor-pointer transition-all ${
                      checked
                        ? 'bg-amber-500/10 border-amber-500/40 text-amber-200 font-medium'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <Checkbox
                      id={`col-${col.id}`}
                      checked={checked}
                      onCheckedChange={() => handleToggleColumn(col.id)}
                      className="border-slate-600 data-[state=checked]:bg-amber-500 data-[state=checked]:text-black"
                    />
                    <Label
                      htmlFor={`col-${col.id}`}
                      className="text-xs cursor-pointer flex-1 select-none"
                    >
                      {col.label}
                    </Label>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer com botões de ação */}
        <DialogFooter className="p-4 px-6 border-t border-slate-800 bg-slate-950 flex flex-col sm:flex-row justify-between items-center gap-2">
          <div className="text-xs text-slate-400">
            {selectedColumns.length === 0 ? (
              <span className="text-red-400">Selecione ao menos 1 coluna</span>
            ) : (
              <span>Pronto para gerar em formato paisagem A4</span>
            )}
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
              disabled={generating}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleGeneratePdf}
              disabled={generating || selectedColumns.length === 0}
              className="bg-amber-500 hover:bg-amber-400 text-black font-bold shadow-lg shadow-amber-500/10"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Gerando PDF...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
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
