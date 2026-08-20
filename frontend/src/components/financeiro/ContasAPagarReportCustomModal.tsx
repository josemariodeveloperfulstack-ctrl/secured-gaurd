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
import departmentService from '@/services/departmentService';

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
        const deptNames: string[] = [];
        if (deptResult.status === 'fulfilled' && Array.isArray(deptResult.value)) {
          deptResult.value.forEach((d: any) => {
            if (d?.name && typeof d.name === 'string') {
              deptNames.push(d.name.trim());
            }
          });
        }

        const postNames: string[] = [];
        if (postsResult.status === 'fulfilled') {
          const raw = postsResult.value?.data;
          const list = Array.isArray(raw) ? raw : (raw?.content || []);
          list.forEach((p: any) => {
            if (p?.name && typeof p.name === 'string') {
              postNames.push(p.name.trim());
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-700 text-gray-100">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2 text-seguranca-lightgray">
            <FileText className="w-5 h-5 text-seguranca-yellow" />
            Relatório Personalizado de Contas a Pagar
          </DialogTitle>
          <DialogDescription className="text-gray-400 text-xs">
            Selecione o período, filtros avançados e exatamente quais colunas deseja incluir no PDF gerado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Seção 1: Filtros de Período e Parâmetros */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-seguranca-yellow">
              <Filter className="w-4 h-4" />
              1. Filtros e Parâmetros
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {/* Campo de Data */}
              <div className="space-y-2">
                <Label className="text-xs text-gray-300 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Filtrar Data por
                </Label>
                <Select value={dateField} onValueChange={(val: any) => setDateField(val)}>
                  <SelectTrigger className="border-gray-600 bg-seguranca-black text-seguranca-lightgray">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-seguranca-black border-gray-600">
                    <SelectItem value="dueDate" className="hover:bg-seguranca-graphite">Data de Vencimento</SelectItem>
                    <SelectItem value="issueDate" className="hover:bg-seguranca-graphite">Data de Emissão</SelectItem>
                    <SelectItem value="paymentDate" className="hover:bg-seguranca-graphite">Data de Pagamento</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Data Inicial */}
              <div className="space-y-2">
                <Label className="text-xs text-gray-300">Data Inicial</Label>
                <DatePicker
                  date={startDate}
                  onSelect={setStartDate}
                  className="w-full border-gray-600 bg-seguranca-black text-seguranca-lightgray"
                />
              </div>

              {/* Data Final */}
              <div className="space-y-2">
                <Label className="text-xs text-gray-300">Data Final</Label>
                <DatePicker
                  date={endDate}
                  onSelect={setEndDate}
                  className="w-full border-gray-600 bg-seguranca-black text-seguranca-lightgray"
                />
              </div>

              {/* Unidade */}
              <div className="space-y-2">
                <Label className="text-xs text-gray-300 flex items-center gap-1">
                  <Building2 className="w-3 h-3" /> Unidade
                </Label>
                <Select value={unitId} onValueChange={setUnitId}>
                  <SelectTrigger className="border-gray-600 bg-seguranca-black text-seguranca-lightgray">
                    <SelectValue placeholder="Todas as unidades" />
                  </SelectTrigger>
                  <SelectContent className="bg-seguranca-black border-gray-600">
                    <SelectItem value="TODAS" className="hover:bg-seguranca-graphite">Todas as Unidades</SelectItem>
                    {unidades.map((u) => (
                      <SelectItem key={u.id} value={u.id} className="hover:bg-seguranca-graphite">
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Setor de Trabalho */}
              <div className="space-y-2">
                <Label className="text-xs text-gray-300 flex items-center gap-1">
                  <Tag className="w-3 h-3" /> Setor de Trabalho
                </Label>
                <Select value={workSector || 'TODOS'} onValueChange={setWorkSector}>
                  <SelectTrigger className="border-gray-600 bg-seguranca-black text-seguranca-lightgray">
                    <SelectValue placeholder="Todos os setores" />
                  </SelectTrigger>
                  <SelectContent className="bg-seguranca-black border-gray-600 max-h-60">
                    <SelectItem value="TODOS" className="hover:bg-seguranca-graphite">Todos os Setores de Trabalho</SelectItem>
                    {setoresSugeridos.map((s, idx) => (
                      <SelectItem key={idx} value={s} className="hover:bg-seguranca-graphite">
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Empresa (Sigla) */}
              <div className="space-y-2">
                <Label className="text-xs text-gray-300">Empresa (SIGLA)</Label>
                <Select value={companySigla} onValueChange={setCompanySigla}>
                  <SelectTrigger className="border-gray-600 bg-seguranca-black text-seguranca-lightgray">
                    <SelectValue placeholder="Todas as empresas" />
                  </SelectTrigger>
                  <SelectContent className="bg-seguranca-black border-gray-600">
                    <SelectItem value="TODAS" className="hover:bg-seguranca-graphite">Todas as Empresas</SelectItem>
                    {empresas.map((emp) => (
                      <SelectItem key={emp.id} value={emp.sigla || emp.name} className="hover:bg-seguranca-graphite">
                        {emp.sigla ? `${emp.sigla} - ${emp.name}` : emp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label className="text-xs text-gray-300">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="border-gray-600 bg-seguranca-black text-seguranca-lightgray">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-seguranca-black border-gray-600">
                    <SelectItem value="TODOS" className="hover:bg-seguranca-graphite">Todos os Status</SelectItem>
                    <SelectItem value="PENDENTE" className="hover:bg-seguranca-graphite">Aberta (Pendente)</SelectItem>
                    <SelectItem value="PAGA" className="hover:bg-seguranca-graphite">Paga</SelectItem>
                    <SelectItem value="CANCELADA" className="hover:bg-seguranca-graphite">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tipo */}
              <div className="space-y-2">
                <Label className="text-xs text-gray-300">Tipo de Despesa</Label>
                <Select value={tipo} onValueChange={setTipo}>
                  <SelectTrigger className="border-gray-600 bg-seguranca-black text-seguranca-lightgray">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-seguranca-black border-gray-600">
                    <SelectItem value="TODOS" className="hover:bg-seguranca-graphite">Todos os Tipos</SelectItem>
                    <SelectItem value="FIXA" className="hover:bg-seguranca-graphite">Fixa</SelectItem>
                    <SelectItem value="VARIAVEL" className="hover:bg-seguranca-graphite">Variável</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Fornecedor */}
              <div className="space-y-2">
                <Label className="text-xs text-gray-300">Fornecedor</Label>
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger className="border-gray-600 bg-seguranca-black text-seguranca-lightgray">
                    <SelectValue placeholder="Todos os fornecedores" />
                  </SelectTrigger>
                  <SelectContent className="bg-seguranca-black border-gray-600">
                    <SelectItem value="TODOS" className="hover:bg-seguranca-graphite">Todos os Fornecedores</SelectItem>
                    {fornecedores.map((f) => (
                      <SelectItem key={f.id} value={f.id} className="hover:bg-seguranca-graphite">
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Agrupamento */}
            <div className="pt-2 border-t border-gray-800">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <Label className="text-sm font-medium text-white">Agrupamento e Subtotais</Label>
                  <p className="text-xs text-gray-400">
                    Agrupa as despesas por Unidade e Setor de Trabalho, exibindo subtotais automáticos por grupo.
                  </p>
                </div>
                <Select value={groupBy} onValueChange={(val: any) => setGroupBy(val)}>
                  <SelectTrigger className="w-[260px] border-gray-600 bg-seguranca-black text-seguranca-lightgray">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-seguranca-black border-gray-600">
                    <SelectItem value="UNIT_SECTOR" className="hover:bg-seguranca-graphite">
                      🏢 Agrupar por Unidade e Setor
                    </SelectItem>
                    <SelectItem value="WORK_SECTOR" className="hover:bg-seguranca-graphite">
                      🏷️ Agrupar por Setor de Trabalho
                    </SelectItem>
                    <SelectItem value="UNIT" className="hover:bg-seguranca-graphite">
                      🏢 Agrupar por Unidade
                    </SelectItem>
                    <SelectItem value="COMPANY" className="hover:bg-seguranca-graphite">
                      🏢 Agrupar por Empresa
                    </SelectItem>
                    <SelectItem value="PERIOD" className="hover:bg-seguranca-graphite">
                      📅 Agrupar por Período (Mês/Ano)
                    </SelectItem>
                    <SelectItem value="STATUS" className="hover:bg-seguranca-graphite">
                      📊 Agrupar por Status (Pendente/Paga/Cancelada)
                    </SelectItem>
                    <SelectItem value="NONE" className="hover:bg-seguranca-graphite">
                      📄 Listagem Simples (Sem Agrupamento)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Seção 2: Seleção de Colunas */}
          <div className="rounded-lg border border-gray-700 bg-seguranca-black/50 p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-semibold text-seguranca-yellow flex items-center gap-2">
                  <Columns className="w-4 h-4" />
                  2. Colunas do Relatório ({selectedColumns.length} selecionadas)
                </h4>
                <p className="text-xs text-gray-400 mt-1">
                  Marque ou desmarque os campos que deseja visualizar nas colunas do PDF.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleSelectAllColumns}
                  className="text-xs h-7 border-gray-600 text-gray-300 hover:bg-seguranca-graphite"
                >
                  <CheckSquare className="w-3 h-3 mr-1" /> Todas
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleDeselectAllColumns}
                  className="text-xs h-7 border-gray-600 text-gray-300 hover:bg-seguranca-graphite"
                >
                  <Square className="w-3 h-3 mr-1" /> Mínimas
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleResetColumns}
                  className="text-xs h-7 border-gray-600 text-gray-300 hover:bg-seguranca-graphite"
                >
                  <RotateCcw className="w-3 h-3 mr-1" /> Padrão
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
              {AVAILABLE_COLUMNS.map((col) => {
                const checked = selectedColumns.includes(col.id);
                return (
                  <div
                    key={col.id}
                    onClick={() => handleToggleColumn(col.id)}
                    className={`flex items-center space-x-3 p-2.5 rounded-md border cursor-pointer transition-colors ${
                      checked
                        ? 'bg-seguranca-yellow/10 border-seguranca-yellow/50 text-white'
                        : 'bg-black/20 border-gray-700 text-gray-400 hover:bg-gray-800'
                    }`}
                  >
                    <Checkbox
                      id={`col-${col.id}`}
                      checked={checked}
                      onCheckedChange={() => handleToggleColumn(col.id)}
                      className="border-gray-500 data-[state=checked]:bg-seguranca-yellow data-[state=checked]:text-black"
                    />
                    <Label
                      htmlFor={`col-${col.id}`}
                      className="text-xs font-medium cursor-pointer flex-1"
                    >
                      {col.label}
                    </Label>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-gray-600 text-gray-300 hover:bg-seguranca-graphite"
            disabled={generating}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleGeneratePdf}
            disabled={generating}
            className="bg-seguranca-yellow hover:bg-seguranca-yellow/90 text-black font-semibold"
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
