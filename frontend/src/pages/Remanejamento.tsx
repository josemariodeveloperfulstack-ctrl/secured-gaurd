import React, { useState } from 'react';
import { StandardLayout } from '@/components/StandardLayout';
import RemanejamentoFormModal from '@/components/funcionarios/RemanejamentoFormModal';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { remanejamentoService, Remanejamento } from '@/services/remanejamentoService';
import { Loader2, Plus, Filter, Search, RefreshCw, Download, Eye, Trash2 } from 'lucide-react';
import { employeeService, Employee } from '@/services/employeeService';
import { workPostService, WorkPost } from '@/services/workPostService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { formatWorkPostDisplayName } from '@/utils/formatters';
import { companyService } from '@/services/companyService';

const tipoOptions: { value: string; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'TRANSFERENCIA_UNIDADE', label: 'Transferência de Unidade' },
  { value: 'TRANSFERENCIA_POSTO_TRABALHO', label: 'Transferência de Posto de Trabalho' },
  { value: 'TROCA_FUNCAO', label: 'Troca de Função' },
  { value: 'PROMOCAO', label: 'Promoção' },
  { value: 'COBRIR_FERIAS', label: 'Cobrir Férias' },
  { value: 'COBRIR_FALTA', label: 'Cobrir Falta' },
  { value: 'PLANTAO', label: 'Plantão' },
  { value: 'OUTROS', label: 'Outros' },
];

const getTipoLabel = (tipo: string): string => tipoOptions.find(o => o.value === tipo)?.label || tipo || '-';

const RemanejamentoPage: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRemanejamento, setSelectedRemanejamento] = useState<Remanejamento | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    tipo: '',
    funcionarioId: '',
    dataInicio: '',
    dataFim: ''
  });
  const [cannotDeleteModalOpen, setCannotDeleteModalOpen] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [workPosts, setWorkPosts] = useState<WorkPost[]>([]);
  const [companies, setCompanies] = useState<{ id: string; name: string; sigla?: string }[]>([]);
  const { toast } = useToast();
  
  // State for PDF report modal
  const [isPDFModalOpen, setIsPDFModalOpen] = useState(false);
  const [pdfFilters, setPdfFilters] = useState({
    employeeId: '',
    tipo: '',
    workPostId: '',
    companyId: '',
    lastDays: '' as string | number,
    startDate: '',
    endDate: ''
  });
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  React.useEffect(() => {
    const loadData = async () => {
      try {
        const [employeesData, workPostsData, companiesData] = await Promise.all([
          employeeService.getAllEmployees(),
          workPostService.getAllWorkPosts(),
          companyService.getAllCompanies().catch(() => [])
        ]);
        setEmployees(employeesData);
        setWorkPosts(workPostsData);
        setCompanies((companiesData || []).map((c: any) => ({ id: c.id, name: c.name || c.sigla || '', sigla: c.sigla })));
        console.log('✅ Dados carregados:', {
          employees: employeesData.length,
          workPosts: workPostsData.length,
          companies: companiesData.length
        });
      } catch (error) {
        console.error('❌ Erro ao carregar dados:', error);
        toast({
          title: "Erro ao carregar dados",
          description: "Não foi possível carregar todas as informações. Alguns campos podem não aparecer corretamente.",
          variant: "destructive",
        });
      }
    };
    loadData();
  }, [toast]);

  // Função helper para verificar se uma string é um UUID válido
  const isValidUUID = (str: string | undefined | null): boolean => {
    if (!str) return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  // Função helper para obter o nome do posto de trabalho (com fallback origem/destino)
  const getWorkPostName = (workstationId: string | undefined | null, fallback?: string): string => {
    if (workstationId && isValidUUID(workstationId)) {
      const workPost = workPosts.find(wp => wp.id === workstationId);
      if (workPost) return formatWorkPostDisplayName(workPost);
    }
    if (fallback && fallback.trim()) return fallback.trim();
    if (workstationId && workPosts.length === 0) return 'Carregando...';
    return '-';
  };

  // Busca lista de remanejamentos (sem filtros no backend)
  const { data: remanejamentosRaw, isLoading, refetch } = useQuery<Remanejamento[]>({
    queryKey: ['remanejamentos'],
    queryFn: () => remanejamentoService.getRemanejamentosTyped(),
  });

  // Filtrar no frontend (filtros + busca por texto)
  const remanejamentos = React.useMemo(() => {
    if (!remanejamentosRaw) return [];
    const term = searchTerm.trim().toLowerCase();
    return remanejamentosRaw.filter(rem => {
      if (filters.tipo && rem.tipo !== filters.tipo) return false;
      if (filters.funcionarioId && rem.employeeId !== filters.funcionarioId) return false;
      const remanejamentoDate = rem.dataRemanejamento || rem.remanejamentoDate;
      if (filters.dataInicio && remanejamentoDate && remanejamentoDate < filters.dataInicio) return false;
      if (filters.dataFim && remanejamentoDate && remanejamentoDate > filters.dataFim) return false;
      if (term) {
        const employeeName = (rem.employeeName || employees.find(e => e.id === rem.employeeId)?.name || '').toLowerCase();
        const observacao = (rem.observacao || rem.notes || '').toLowerCase();
        const origem = (rem.origem || '').toLowerCase();
        const destino = (rem.destino || '').toLowerCase();
        if (!employeeName.includes(term) && !observacao.includes(term) && !origem.includes(term) && !destino.includes(term)) return false;
      }
      return true;
    });
  }, [remanejamentosRaw, filters, searchTerm, employees]);

  const handleOpenModal = () => {
    setSelectedRemanejamento(null);
    setModalOpen(true);
  };

  const handleEdit = async (rem: Remanejamento) => {
    try {
      // Buscar remanejamento completo do backend para garantir que todos os campos estejam presentes
      const remanejamentoCompleto = await remanejamentoService.getRemanejamentoById(rem.id);
      setSelectedRemanejamento(remanejamentoCompleto);
      setModalOpen(true);
    } catch (error) {
      console.error('Erro ao buscar remanejamento completo:', error);
      // Em caso de erro, usar o objeto da lista mesmo
      setSelectedRemanejamento(rem);
      setModalOpen(true);
    }
  };

  const handleView = (rem: Remanejamento) => {
    setSelectedRemanejamento(rem);
    setViewModalOpen(true);
  };

  const handleDelete = (_rem: Remanejamento) => {
    setCannotDeleteModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedRemanejamento(null);
    refetch();
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setFilters({
      tipo: '',
      funcionarioId: '',
      dataInicio: '',
      dataFim: ''
    });
  };

  const handleGeneratePDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const filters: Record<string, string | number | undefined> = {};
      
      if (pdfFilters.employeeId && pdfFilters.employeeId !== 'all') {
        filters.employeeId = pdfFilters.employeeId;
      }
      if (pdfFilters.tipo && pdfFilters.tipo !== 'all') {
        filters.tipo = pdfFilters.tipo;
      }
      if (pdfFilters.workPostId && pdfFilters.workPostId !== 'all') {
        filters.workPostId = pdfFilters.workPostId;
      }
      if (pdfFilters.companyId && pdfFilters.companyId !== 'all') {
        filters.companyId = pdfFilters.companyId;
      }
      if (pdfFilters.lastDays && pdfFilters.lastDays !== 'all') {
        const days = typeof pdfFilters.lastDays === 'string' ? parseInt(pdfFilters.lastDays, 10) : pdfFilters.lastDays;
        if (!isNaN(days) && days > 0) filters.lastDays = days;
      }
      if (pdfFilters.startDate) {
        filters.startDate = pdfFilters.startDate;
      }
      if (pdfFilters.endDate) {
        filters.endDate = pdfFilters.endDate;
      }

      const blob = await remanejamentoService.exportRemanejamentosReportPDF(filters);
      
      // Criar URL para download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Definir nome do arquivo
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
      link.download = `relatorio_remanejamentos_${timestamp}.pdf`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Relatório gerado com sucesso!",
        description: "O relatório de remanejamentos foi baixado com sucesso.",
        variant: "default",
      });
      
      setIsPDFModalOpen(false);
    } catch (error: any) {
      console.error('Erro ao gerar relatório PDF:', error);
      const errorMessage = error?.message || 'Ocorreu um erro ao gerar o relatório PDF. Tente novamente.';
      toast({
        title: "Erro ao gerar relatório",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <StandardLayout title="Remanejamento de Funcionários">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-seguranca-lightgray">Remanejamento de Funcionários</h1>
            <p className="text-gray-400 mt-1">Gestão de transferências, troca de função e movimentações de pessoal</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
              onClick={() => setIsPDFModalOpen(true)}
            >
              <Download className="mr-2 h-4 w-4" />
              Gerar Relatório PDF
            </Button>
            <Button onClick={handleOpenModal} className="bg-seguranca-yellow text-black hover:bg-yellow-500">
              <Plus className="mr-2 h-4 w-4" /> Novo Remanejamento
            </Button>
          </div>
        </div>

        {/* Filtros Avançados */}
        <Card className="bg-seguranca-graphite border-gray-600">
          <CardHeader className="pb-3">
            <CardTitle className="text-seguranca-lightgray flex items-center gap-2 text-lg">
              <Filter className="h-5 w-5 text-seguranca-yellow" />
              Filtros Avançados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Primeira linha - 3 colunas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-seguranca-lightgray mb-2 text-sm font-medium">Tipo de Remanejamento</label>
                <select
                  className="w-full rounded bg-seguranca-black text-seguranca-lightgray p-3 text-sm border border-gray-600 focus:border-seguranca-yellow focus:outline-none"
                  value={filters.tipo}
                  onChange={e => setFilters(f => ({ ...f, tipo: e.target.value }))}
                >
                  {tipoOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-seguranca-lightgray mb-2 text-sm font-medium">Funcionário</label>
                <select
                  className="w-full rounded bg-seguranca-black text-seguranca-lightgray p-3 text-sm border border-gray-600 focus:border-seguranca-yellow focus:outline-none"
                  value={filters.funcionarioId}
                  onChange={e => setFilters(f => ({ ...f, funcionarioId: e.target.value }))}
                >
                  <option value="">Todos os funcionários</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Segunda linha - 3 colunas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-seguranca-lightgray mb-2 text-sm font-medium">Data de Início</label>
                <input
                  type="date"
                  className="w-full rounded bg-seguranca-black text-seguranca-lightgray p-3 text-sm border border-gray-600 focus:border-seguranca-yellow focus:outline-none"
                  value={filters.dataInicio}
                  onChange={e => setFilters(f => ({ ...f, dataInicio: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-seguranca-lightgray mb-2 text-sm font-medium">Data de Fim</label>
                <input
                  type="date"
                  className="w-full rounded bg-seguranca-black text-seguranca-lightgray p-3 text-sm border border-gray-600 focus:border-seguranca-yellow focus:outline-none"
                  value={filters.dataFim}
                  onChange={e => setFilters(f => ({ ...f, dataFim: e.target.value }))}
                />
              </div>
            </div>

            {/* Botões de ação dos filtros */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-gray-600">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Buscar por funcionário, unidade ou observação..."
                    className="w-full pl-10 pr-4 py-2 bg-seguranca-black border border-gray-600 rounded text-seguranca-lightgray focus:border-seguranca-yellow focus:outline-none text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={handleClearFilters}
                  className="border-gray-600 text-seguranca-lightgray hover:bg-gray-600"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Limpar
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => refetch()}
                  className="border-seguranca-yellow text-seguranca-yellow hover:bg-seguranca-yellow hover:text-black"
                >
                  <Filter className="mr-2 h-4 w-4" />
                  Aplicar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resultados */}
        <Card className="bg-seguranca-graphite border-gray-600">
          <CardHeader>
            <CardTitle className="text-seguranca-lightgray flex items-center justify-between">
              <span>Resultados ({remanejamentos?.length || 0} remanejamentos)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="animate-spin mr-2" /> Carregando...
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-seguranca-yellow text-left border-b border-gray-700">
                      <th className="p-3 text-sm font-medium">Funcionário</th>
                      <th className="p-3 text-sm font-medium">Tipo</th>
                      <th className="p-3 text-sm font-medium">Posto de Trabalho de Origem</th>
                      <th className="p-3 text-sm font-medium">Posto de Trabalho de Destino</th>
                      <th className="p-3 text-sm font-medium">Data</th>
                      <th className="p-3 text-sm font-medium">Observação</th>
                      <th className="p-3 text-sm font-medium w-40">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {remanejamentos && remanejamentos.length > 0 ? (
                      remanejamentos.map((rem) => (
                        <tr key={rem.id} className="border-b border-gray-700 text-seguranca-lightgray hover:bg-seguranca-black transition-colors">
                          <td className="p-3 text-sm font-medium">{rem.employeeName || employees.find(e => e.id === rem.employeeId)?.name || '-'}</td>
                          <td className="p-3 text-sm">
                            <Badge className="bg-blue-500 text-white text-xs">
                              {getTipoLabel(rem.tipo || rem.status || '')}
                            </Badge>
                          </td>
                          <td className="p-3 text-sm">{getWorkPostName(rem.originWorkstationId, rem.origem)}</td>
                          <td className="p-3 text-sm">{getWorkPostName(rem.destinationWorkstationId, rem.destino)}</td>
                          <td className="p-3 text-sm">{new Date(rem.dataRemanejamento || rem.remanejamentoDate || '').toLocaleDateString('pt-BR')}</td>
                          <td className="p-3 text-sm max-w-xs truncate">{rem.observacao || rem.notes || '-'}</td>
                          <td className="p-3 text-sm w-40">
                            <div className="flex items-center gap-1">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-8 w-8 p-0 text-blue-400 border-blue-400 hover:bg-blue-400 hover:text-seguranca-black" 
                                onClick={() => handleView(rem)}
                                title="Visualizar"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-8 px-2 text-yellow-400 border-yellow-400 hover:bg-yellow-400 hover:text-seguranca-black" 
                                onClick={() => handleEdit(rem)}
                                title="Editar"
                              >
                                Editar
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-8 w-8 p-0 text-red-400 border-red-400 hover:bg-red-400 hover:text-white" 
                                onClick={() => handleDelete(rem)}
                                title="Excluir"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="text-center text-seguranca-lightgray py-8">
                          <div className="flex flex-col items-center gap-2">
                            <p className="text-lg">Nenhum remanejamento encontrado</p>
                            <p className="text-sm text-gray-400">Tente ajustar os filtros ou criar um novo remanejamento</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {modalOpen && (
        <RemanejamentoFormModal
          onSuccess={handleCloseModal}
          onClose={handleCloseModal}
          {...(selectedRemanejamento ? { initialRemanejamento: selectedRemanejamento } : {})}
        />
      )}

      {/* Modal de Geração de PDF */}
      <Dialog open={isPDFModalOpen} onOpenChange={setIsPDFModalOpen}>
        <DialogContent className="sm:max-w-2xl bg-seguranca-graphite border-gray-600 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-seguranca-lightgray">
              Gerar Relatório de Remanejamentos
            </DialogTitle>
            <DialogDescription asChild>
              <p className="text-gray-400 text-sm">
                Filtre por setor de trabalho, empresa, período ou últimos remanejamentos. Disponível para RH e DPE.
              </p>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-seguranca-lightgray">Por Setor de Trabalho</Label>
                <Select 
                  value={pdfFilters.workPostId || 'all'} 
                  onValueChange={(value) => setPdfFilters({ ...pdfFilters, workPostId: value })}
                >
                  <SelectTrigger className="bg-seguranca-black border-gray-600 text-seguranca-lightgray">
                    <SelectValue placeholder="Todos os setores" />
                  </SelectTrigger>
                  <SelectContent className="bg-seguranca-graphite border-gray-600">
                    <SelectItem value="all">Todos os setores</SelectItem>
                    {workPosts.map((wp) => (
                      <SelectItem key={wp.id} value={wp.id}>
                        {formatWorkPostDisplayName(wp)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-seguranca-lightgray">Por Empresa</Label>
                <Select 
                  value={pdfFilters.companyId || 'all'} 
                  onValueChange={(value) => setPdfFilters({ ...pdfFilters, companyId: value })}
                >
                  <SelectTrigger className="bg-seguranca-black border-gray-600 text-seguranca-lightgray">
                    <SelectValue placeholder="Todas as empresas" />
                  </SelectTrigger>
                  <SelectContent className="bg-seguranca-graphite border-gray-600">
                    <SelectItem value="all">Todas as empresas</SelectItem>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}{c.sigla ? ` (${c.sigla})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-seguranca-lightgray">Funcionário</Label>
                <Select 
                  value={pdfFilters.employeeId || 'all'} 
                  onValueChange={(value) => setPdfFilters({ ...pdfFilters, employeeId: value })}
                >
                  <SelectTrigger className="bg-seguranca-black border-gray-600 text-seguranca-lightgray">
                    <SelectValue placeholder="Todos os funcionários" />
                  </SelectTrigger>
                  <SelectContent className="bg-seguranca-graphite border-gray-600">
                    <SelectItem value="all">Todos os funcionários</SelectItem>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-seguranca-lightgray">Tipo de Movimentação</Label>
                <Select 
                  value={pdfFilters.tipo || 'all'} 
                  onValueChange={(value) => setPdfFilters({ ...pdfFilters, tipo: value })}
                >
                  <SelectTrigger className="bg-seguranca-black border-gray-600 text-seguranca-lightgray">
                    <SelectValue placeholder="Todos os tipos" />
                  </SelectTrigger>
                  <SelectContent className="bg-seguranca-graphite border-gray-600">
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    {tipoOptions.filter(opt => opt.value).map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-seguranca-lightgray">Últimos Remanejamentos</Label>
              <Select 
                value={String(pdfFilters.lastDays || 'all')} 
                onValueChange={(value) => setPdfFilters({ ...pdfFilters, lastDays: value === 'all' ? '' : value })}
              >
                <SelectTrigger className="bg-seguranca-black border-gray-600 text-seguranca-lightgray">
                  <SelectValue placeholder="Período personalizado" />
                </SelectTrigger>
                <SelectContent className="bg-seguranca-graphite border-gray-600">
                  <SelectItem value="all">Período personalizado (usar datas abaixo)</SelectItem>
                  <SelectItem value="7">Últimos 7 dias</SelectItem>
                  <SelectItem value="15">Últimos 15 dias</SelectItem>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                  <SelectItem value="60">Últimos 60 dias</SelectItem>
                  <SelectItem value="90">Últimos 90 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-seguranca-lightgray">Data Início (período personalizado)</Label>
                <Input
                  type="date"
                  value={pdfFilters.startDate}
                  onChange={(e) => setPdfFilters({ ...pdfFilters, startDate: e.target.value })}
                  className="bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                  disabled={!!pdfFilters.lastDays}
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-seguranca-lightgray">Data Fim (período personalizado)</Label>
                <Input
                  type="date"
                  value={pdfFilters.endDate}
                  onChange={(e) => setPdfFilters({ ...pdfFilters, endDate: e.target.value })}
                  className="bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                  disabled={!!pdfFilters.lastDays}
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-2 pt-4 border-t border-gray-700">
              <Button
                variant="outline"
                onClick={() => setIsPDFModalOpen(false)}
                className="border-gray-600 text-gray-400 hover:bg-gray-700"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleGeneratePDF}
                disabled={isGeneratingPDF}
                className="bg-seguranca-red hover:bg-seguranca-darkred"
              >
                {isGeneratingPDF ? 'Gerando...' : 'Gerar PDF'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Visualização */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="sm:max-w-2xl bg-seguranca-graphite border-gray-600 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-seguranca-lightgray">
              Detalhes do Remanejamento
            </DialogTitle>
            <DialogDescription asChild>
              <p className="text-gray-400">
                Informações completas do remanejamento
              </p>
            </DialogDescription>
          </DialogHeader>
          
          {selectedRemanejamento && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-seguranca-lightgray">Funcionário</Label>
                  <div className="bg-seguranca-black border border-gray-600 rounded p-3 text-seguranca-lightgray">
                    {selectedRemanejamento.employeeName || employees.find(e => e.id === selectedRemanejamento.employeeId)?.name || '-'}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-seguranca-lightgray">Tipo</Label>
                  <div className="bg-seguranca-black border border-gray-600 rounded p-3">
                    <Badge className="bg-blue-500 text-white text-xs">
                      {getTipoLabel(selectedRemanejamento.tipo || selectedRemanejamento.status || '')}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-seguranca-lightgray">Posto de Trabalho de Origem</Label>
                  <div className="bg-seguranca-black border border-gray-600 rounded p-3 text-seguranca-lightgray">
                    {getWorkPostName(selectedRemanejamento.originWorkstationId, selectedRemanejamento.origem)}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-seguranca-lightgray">Posto de Trabalho de Destino</Label>
                  <div className="bg-seguranca-black border border-gray-600 rounded p-3 text-seguranca-lightgray">
                    {getWorkPostName(selectedRemanejamento.destinationWorkstationId, selectedRemanejamento.destino)}
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-seguranca-lightgray">Data do Remanejamento</Label>
                <div className="bg-seguranca-black border border-gray-600 rounded p-3 text-seguranca-lightgray">
                  {new Date(selectedRemanejamento.dataRemanejamento || selectedRemanejamento.remanejamentoDate || '').toLocaleDateString('pt-BR')}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-seguranca-lightgray">Observação</Label>
                <div className="bg-seguranca-black border border-gray-600 rounded p-3 text-seguranca-lightgray min-h-[100px]">
                  {selectedRemanejamento.observacao || selectedRemanejamento.notes || 'Nenhuma observação registrada.'}
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setViewModalOpen(false)}
              className="border-gray-600 text-gray-400 hover:bg-gray-700"
            >
              Fechar
            </Button>
            {selectedRemanejamento && (
              <Button
                onClick={() => {
                  setViewModalOpen(false);
                  handleEdit(selectedRemanejamento);
                }}
                className="bg-seguranca-yellow hover:bg-yellow-500 text-black"
              >
                Editar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal informativo: remanejamento não pode ser excluído */}
      <Dialog open={cannotDeleteModalOpen} onOpenChange={setCannotDeleteModalOpen}>
        <DialogContent className="sm:max-w-md bg-seguranca-graphite border-gray-600">
          <DialogHeader>
            <DialogTitle className="text-seguranca-lightgray">Remanejamento não pode ser excluído</DialogTitle>
            <DialogDescription asChild>
              <div className="text-gray-400 text-sm space-y-2 pt-1">
                <p>
                  A exclusão de um remanejamento repercutiria no <strong className="text-seguranca-lightgray">Módulo Operacional</strong> e no <strong className="text-seguranca-lightgray">histórico do funcionário</strong>, por isso esta ação não é permitida.
                </p>
                <p>
                  Para alterar dados do remanejamento, utilize a opção <strong className="text-seguranca-yellow">Editar</strong>.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => setCannotDeleteModalOpen(false)}
              className="bg-seguranca-yellow hover:bg-yellow-500 text-black"
            >
              Entendi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </StandardLayout>
  );
};

export default RemanejamentoPage;
