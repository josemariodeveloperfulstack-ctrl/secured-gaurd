import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Users, 
  Search, 
  Filter, 
  FileText, 
  FileSpreadsheet, 
  Eye, 
  RefreshCw, 
  Loader2, 
  Briefcase, 
  MapPin, 
  Building,
  Layers,
  QrCode, 
  UserCheck,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { employeeService } from '@/services/employeeService';
import { companyService } from '@/services/companyService';
import { workPostService } from '@/services/workPostService';
import { positionService } from '@/services/positionService';
import { Employee } from '@/types/employee';
import { WorkPost } from '@/types/workPost';
import { Position } from '@/types/position';
import { useToast } from '@/hooks/use-toast';
import { RelatoriosModal } from '@/components/funcionarios/RelatoriosModal';
import { EmployeeViewDetailsModal } from '@/components/funcionarios/EmployeeViewDetailsModal';
import { EmployeeQrCodeBadgeModal } from '@/components/funcionarios/EmployeeQrCodeBadgeModal';
import { formatDate as formatDatePtBr, formatCPF, formatPhone } from '@/utils/formatters';

const STATUS_CONFIG: Record<string, { label: string; bgClass: string }> = {
  ACTIVE: { label: 'Ativo', bgClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  INACTIVE: { label: 'Inativo', bgClass: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
  VACATION: { label: 'Férias', bgClass: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  MEDICAL_CERTIFICATE: { label: 'Atestado', bgClass: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  TERMINATED: { label: 'Demitido', bgClass: 'bg-red-500/20 text-red-400 border-red-500/30' },
  SUSPENDED: { label: 'Suspenso', bgClass: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
};

const WORK_POST_TYPE_LABELS: Record<string, string> = {
  POSTO_12X36_DIURNO: '12x36 Diurno',
  POSTO_12X36_NOTURNO: '12x36 Noturno',
  POSTO_24H: 'Posto 24h',
  POSTO_12H: 'Posto 12h',
  POSTO_6H: 'Posto 6h',
  POSTO_8H: 'Posto 8h',
  POSTO_8H_DIURNO: '8h Diurno',
  POSTO_8H_NOTURNO: '8h Noturno',
  POSTO_ESPECIAL: 'Posto Especial',
  OUTROS: '',
};

/** Formatação do Posto de Trabalho idêntica ao EmployeeViewDetailsModal */
function formatPostoTrabalhoLabel(employee: Employee | null): string {
  if (!employee) return '-';
  const wp = employee.workPost as {
    name?: string;
    description?: string;
    type?: string;
    workSchedule?: string;
    primaryPositionName?: string;
  } | undefined;

  const setor = wp?.name?.trim();
  const posto =
    wp?.description?.trim() ||
    (wp?.type ? WORK_POST_TYPE_LABELS[wp.type] || (wp.type !== 'OUTROS' ? wp.type : '') : '') ||
    wp?.primaryPositionName?.trim() ||
    '';
  const escala =
    (employee as { escalaTrabalho?: string }).escalaTrabalho?.trim() ||
    wp?.workSchedule?.trim() ||
    '';
  const parts = [setor, posto, escala].filter(Boolean);
  return parts.length > 0 ? parts.join(' — ') : '-';
}

/** Formatação do Setor de Trabalho idêntica ao EmployeeViewDetailsModal */
function getSetorDeTrabalho(employee: Employee | null): string {
  if (!employee) return '-';
  return (
    employee.workPost?.name ||
    employee.employeeWorkSector ||
    employee.unit?.name ||
    employee.department?.name ||
    '-'
  );
}

type SortKey = 'name' | 'cpf' | 'position' | 'company' | 'workPost' | 'hireDate' | 'status';

export const StockFuncionariosContent: React.FC = () => {
  const { toast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingDetailsId, setLoadingDetailsId] = useState<string | null>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [workPostFilter, setWorkPostFilter] = useState<string>('all');

  // Ordenação
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Dados para os selects e para o modal de relatórios
  const [companies, setCompanies] = useState<Array<{ id: string; name?: string; sigla?: string }>>([]);
  const [workPosts, setWorkPosts] = useState<WorkPost[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);

  // Modais
  const [relatoriosModalOpen, setRelatoriosModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [qrCodeModalOpen, setQrCodeModalOpen] = useState(false);
  const [qrCodeEmployee, setQrCodeEmployee] = useState<Employee | null>(null);

  // Carregar lista de funcionários e filtros
  const loadData = async (showLoadingState = true) => {
    if (showLoadingState) setLoading(true);
    try {
      const [empData, compData, wpData, posData] = await Promise.all([
        employeeService.getAllEmployees({}, 0, 500),
        companyService.getAllCompanies().catch(() => []),
        workPostService.getAllWorkPosts().catch(() => []),
        positionService.getPositions().catch(() => []),
      ]);

      setEmployees(Array.isArray(empData) ? empData : []);
      setCompanies(Array.isArray(compData) ? compData : []);
      setWorkPosts(Array.isArray(wpData) ? wpData : []);
      setPositions(Array.isArray(posData) ? posData : []);
    } catch (error) {
      console.error('Erro ao carregar lista de funcionários no almoxarifado:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar a lista de funcionários.',
        variant: 'destructive',
      });
    } finally {
      if (showLoadingState) setLoading(false);
    }
  };

  useEffect(() => {
    void loadData(true);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData(false);
    setRefreshing(false);
    toast({
      title: 'Sucesso',
      description: 'Lista de funcionários atualizada.',
    });
  };

  // Alternar ordenação pela coluna
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      // Para datas de admissão/cadastro, o primeiro clique coloca o último cadastrado no topo (desc)
      if (key === 'hireDate') {
        setSortDir('desc');
      } else {
        setSortDir('asc');
      }
    }
  };

  // Filtragem e Ordenação Local
  const filteredEmployees = useMemo(() => {
    const list = employees.filter((emp) => {
      // Busca textual (Nome, CPF, Matrícula, Cargo, Posto, Setor, Empresa)
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const nameMatch = emp.name?.toLowerCase().includes(q);
        const cpfMatch = emp.cpf?.includes(q);
        const regMatch = emp.registrationNumber?.toLowerCase().includes(q);
        const posMatch = emp.position?.name?.toLowerCase().includes(q) || emp.cargoFuncao?.toLowerCase().includes(q);
        const wpMatch = emp.workPost?.name?.toLowerCase().includes(q) || formatPostoTrabalhoLabel(emp).toLowerCase().includes(q);
        const sectorMatch = getSetorDeTrabalho(emp).toLowerCase().includes(q);
        const compMatch = emp.company?.name?.toLowerCase().includes(q) || emp.empresaNome?.toLowerCase().includes(q) || emp.company?.sigla?.toLowerCase().includes(q);

        if (!nameMatch && !cpfMatch && !regMatch && !posMatch && !wpMatch && !sectorMatch && !compMatch) {
          return false;
        }
      }

      // Filtro por Status
      if (statusFilter !== 'all' && emp.status !== statusFilter) {
        return false;
      }

      // Filtro por Empresa
      if (companyFilter !== 'all' && emp.companyId !== companyFilter && emp.company?.id !== companyFilter) {
        return false;
      }

      // Filtro por Posto de Trabalho
      if (workPostFilter !== 'all' && emp.workPostId !== workPostFilter && emp.workPost?.id !== workPostFilter) {
        return false;
      }

      return true;
    });

    // Executar ordenação
    list.sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';

      switch (sortKey) {
        case 'name':
          aVal = a.name || '';
          bVal = b.name || '';
          break;
        case 'hireDate':
          aVal = a.hireDate ? new Date(a.hireDate).getTime() : ((a as any).createdAt ? new Date((a as any).createdAt).getTime() : 0);
          bVal = b.hireDate ? new Date(b.hireDate).getTime() : ((b as any).createdAt ? new Date((b as any).createdAt).getTime() : 0);
          break;
        case 'company':
          aVal = a.company?.name || a.empresaNome || a.companyName || a.company?.sigla || '';
          bVal = b.company?.name || b.empresaNome || b.companyName || b.company?.sigla || '';
          break;
        case 'workPost':
          aVal = getSetorDeTrabalho(a) + ' ' + formatPostoTrabalhoLabel(a);
          bVal = getSetorDeTrabalho(b) + ' ' + formatPostoTrabalhoLabel(b);
          break;
        case 'position':
          aVal = a.position?.name || a.cargoFuncao || '';
          bVal = b.position?.name || b.cargoFuncao || '';
          break;
        case 'status':
          aVal = STATUS_CONFIG[a.status]?.label || a.status || '';
          bVal = STATUS_CONFIG[b.status]?.label || b.status || '';
          break;
        case 'cpf':
          aVal = a.cpf || a.registrationNumber || '';
          bVal = b.cpf || b.registrationNumber || '';
          break;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        const cmp = aVal.localeCompare(bVal, 'pt-BR', { sensitivity: 'base', numeric: true });
        return sortDir === 'asc' ? cmp : -cmp;
      }

      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [employees, searchTerm, statusFilter, companyFilter, workPostFilter, sortKey, sortDir]);

  // Exportação rápida para Excel
  const handleExportExcel = () => {
    if (filteredEmployees.length === 0) {
      toast({
        title: 'Aviso',
        description: 'Nenhum funcionário encontrado para exportação.',
        variant: 'destructive',
      });
      return;
    }

    const dataToExport = filteredEmployees.map((emp) => ({
      'Nome Completo': emp.name,
      'CPF': formatCPF(emp.cpf) || emp.cpf,
      'Matrícula': emp.registrationNumber || '-',
      'Cargo / Função': emp.position?.name || emp.cargoFuncao || '-',
      'Empresa': emp.company?.name || emp.empresaNome || emp.companyName || emp.company?.sigla || '-',
      'Setor de Trabalho': getSetorDeTrabalho(emp),
      'Posto de Trabalho': formatPostoTrabalhoLabel(emp),
      'Data Admissão': emp.hireDate ? formatDatePtBr(emp.hireDate) : '-',
      'Telefone': formatPhone(emp.phone) || emp.phone || '-',
      'E-mail': emp.email || '-',
      'Status': STATUS_CONFIG[emp.status]?.label || emp.status,
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Funcionários');
    XLSX.writeFile(wb, `Lista_Funcionarios_Almoxarifado_${new Date().toISOString().slice(0, 10)}.xlsx`);

    toast({
      title: 'Sucesso',
      description: 'Relatório Excel gerado com sucesso!',
    });
  };

  // Abrir a MESMA tela de visualização completa do RH / Departamento Pessoal
  const handleViewDetails = async (emp: Employee) => {
    setLoadingDetailsId(emp.id);
    try {
      const fullEmployee = await employeeService.getEmployeeById(emp.id);
      setSelectedEmployee(fullEmployee || emp);
    } catch (error) {
      console.warn('Erro ao carregar cadastro completo, abrindo com os dados atuais:', error);
      setSelectedEmployee(emp);
    } finally {
      setLoadingDetailsId(null);
      setDetailsModalOpen(true);
    }
  };

  // Abrir QR Code / Crachá
  const handleViewQrCode = (emp: Employee) => {
    setQrCodeEmployee(emp);
    setQrCodeModalOpen(true);
  };

  // Estatísticas rápidas
  const activeCount = useMemo(() => employees.filter((e) => e.status === 'ACTIVE').length, [employees]);
  const totalCount = employees.length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-seguranca-yellow" />
        <p className="text-seguranca-lightgray text-sm">Carregando lista de funcionários para o Almoxarifado...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com Ações */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-seguranca-lightgray flex items-center gap-2">
            <Users className="h-5 w-5 text-seguranca-yellow" />
            Consulta de Funcionários
          </h2>
          <p className="text-xs text-gray-400">
            Acesso para o Almoxarifado: consulte cadastros, empresas, setores, postos de trabalho e gere relatórios operacionais.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setRelatoriosModalOpen(true)}
            className="border-seguranca-yellow/40 text-seguranca-yellow hover:bg-seguranca-yellow/10"
          >
            <FileText className="h-4 w-4 mr-2" />
            Gerar Relatórios
          </Button>

          <Button
            variant="outline"
            onClick={handleExportExcel}
            className="border-emerald-600/50 text-emerald-400 hover:bg-emerald-600/10"
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Exportar Excel
          </Button>

          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
            className="border-gray-600 text-seguranca-lightgray hover:bg-seguranca-black"
          >
            {refreshing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Atualizar
          </Button>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-seguranca-graphite border-gray-600/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-400">Total de Cadastros</p>
              <p className="text-2xl font-bold text-seguranca-lightgray">{totalCount}</p>
            </div>
            <div className="p-3 bg-seguranca-black rounded-lg border border-gray-700">
              <Users className="h-5 w-5 text-seguranca-yellow" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-seguranca-graphite border-gray-600/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-400">Funcionários Ativos</p>
              <p className="text-2xl font-bold text-emerald-400">{activeCount}</p>
            </div>
            <div className="p-3 bg-seguranca-black rounded-lg border border-gray-700">
              <UserCheck className="h-5 w-5 text-emerald-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-seguranca-graphite border-gray-600/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-400">Exibindo Filtrados</p>
              <p className="text-2xl font-bold text-seguranca-yellow">{filteredEmployees.length}</p>
            </div>
            <div className="p-3 bg-seguranca-black rounded-lg border border-gray-700">
              <Filter className="h-5 w-5 text-seguranca-yellow" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros e Ordenação de Pesquisa */}
      <Card className="bg-seguranca-graphite border-gray-600/50 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Busca Textual */}
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar nome, CPF, cargo, setor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-seguranca-black border-gray-600 text-seguranca-lightgray placeholder:text-gray-500"
            />
          </div>

          {/* Filtro Status */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="bg-seguranca-black border-gray-600 text-seguranca-lightgray">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray">
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="ACTIVE">Ativo</SelectItem>
              <SelectItem value="INACTIVE">Inativo</SelectItem>
              <SelectItem value="VACATION">Férias</SelectItem>
              <SelectItem value="MEDICAL_CERTIFICATE">Atestado</SelectItem>
              <SelectItem value="TERMINATED">Demitido</SelectItem>
              <SelectItem value="SUSPENDED">Suspenso</SelectItem>
            </SelectContent>
          </Select>

          {/* Filtro Empresa */}
          <Select value={companyFilter} onValueChange={setCompanyFilter}>
            <SelectTrigger className="bg-seguranca-black border-gray-600 text-seguranca-lightgray">
              <SelectValue placeholder="Empresa" />
            </SelectTrigger>
            <SelectContent className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray">
              <SelectItem value="all">Todas as Empresas</SelectItem>
              {companies.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.sigla || c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Select de Ordenação Rápida */}
          <Select
            value={`${sortKey}-${sortDir}`}
            onValueChange={(val) => {
              const [k, d] = val.split('-') as [SortKey, 'asc' | 'desc'];
              setSortKey(k);
              setSortDir(d);
            }}
          >
            <SelectTrigger className="bg-seguranca-black border-gray-600 text-seguranca-lightgray">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray">
              <SelectItem value="name-asc">Ordem Alfabética (A-Z)</SelectItem>
              <SelectItem value="name-desc">Ordem Alfabética (Z-A)</SelectItem>
              <SelectItem value="hireDate-desc">Último Cadastrado / Admissão (Mais recente)</SelectItem>
              <SelectItem value="hireDate-asc">Admissão (Mais antiga)</SelectItem>
              <SelectItem value="company-asc">Empresa (A-Z)</SelectItem>
              <SelectItem value="position-asc">Cargo (A-Z)</SelectItem>
              <SelectItem value="status-asc">Status</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Tabela de Funcionários */}
      <Card className="bg-seguranca-graphite border-gray-600/50 overflow-hidden">
        {filteredEmployees.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <Users className="h-10 w-10 mx-auto mb-2 opacity-40 text-seguranca-yellow" />
            <p className="font-medium text-seguranca-lightgray">Nenhum funcionário encontrado</p>
            <p className="text-xs mt-1">Tente ajustar os filtros ou o termo de busca.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-seguranca-black/60">
                <TableRow className="border-gray-700/60">
                  {/* Column Header: Ordem Alfabética (Nome) */}
                  <TableHead className="text-gray-300 font-semibold">
                    <button
                      type="button"
                      onClick={() => handleSort('name')}
                      className="flex items-center gap-1.5 hover:text-white transition-colors focus:outline-none"
                      title="Clique para ordenar por Ordem Alfabética (A-Z / Z-A)"
                    >
                      <span>Funcionário</span>
                      <ArrowUpDown className={`h-3.5 w-3.5 ${sortKey === 'name' ? 'text-seguranca-yellow font-bold' : 'text-gray-500 opacity-60'}`} />
                      {sortKey === 'name' && (
                        <span className="text-[10px] text-seguranca-yellow font-mono">
                          {sortDir === 'asc' ? '▲' : '▼'}
                        </span>
                      )}
                    </button>
                  </TableHead>

                  {/* Column Header: CPF / Matrícula */}
                  <TableHead className="text-gray-300 font-semibold">
                    <button
                      type="button"
                      onClick={() => handleSort('cpf')}
                      className="flex items-center gap-1.5 hover:text-white transition-colors focus:outline-none"
                      title="Clique para ordenar por CPF / Matrícula"
                    >
                      <span>CPF / Matrícula</span>
                      <ArrowUpDown className={`h-3.5 w-3.5 ${sortKey === 'cpf' ? 'text-seguranca-yellow font-bold' : 'text-gray-500 opacity-60'}`} />
                      {sortKey === 'cpf' && (
                        <span className="text-[10px] text-seguranca-yellow font-mono">
                          {sortDir === 'asc' ? '▲' : '▼'}
                        </span>
                      )}
                    </button>
                  </TableHead>

                  {/* Column Header: Cargo / Função */}
                  <TableHead className="text-gray-300 font-semibold">
                    <button
                      type="button"
                      onClick={() => handleSort('position')}
                      className="flex items-center gap-1.5 hover:text-white transition-colors focus:outline-none"
                      title="Clique para ordenar por Cargo / Função"
                    >
                      <span>Cargo / Função</span>
                      <ArrowUpDown className={`h-3.5 w-3.5 ${sortKey === 'position' ? 'text-seguranca-yellow font-bold' : 'text-gray-500 opacity-60'}`} />
                      {sortKey === 'position' && (
                        <span className="text-[10px] text-seguranca-yellow font-mono">
                          {sortDir === 'asc' ? '▲' : '▼'}
                        </span>
                      )}
                    </button>
                  </TableHead>

                  {/* Column Header: Empresa */}
                  <TableHead className="text-gray-300 font-semibold">
                    <button
                      type="button"
                      onClick={() => handleSort('company')}
                      className="flex items-center gap-1.5 hover:text-white transition-colors focus:outline-none"
                      title="Clique para ordenar por Empresa"
                    >
                      <span>Empresa</span>
                      <ArrowUpDown className={`h-3.5 w-3.5 ${sortKey === 'company' ? 'text-seguranca-yellow font-bold' : 'text-gray-500 opacity-60'}`} />
                      {sortKey === 'company' && (
                        <span className="text-[10px] text-seguranca-yellow font-mono">
                          {sortDir === 'asc' ? '▲' : '▼'}
                        </span>
                      )}
                    </button>
                  </TableHead>

                  {/* Column Header: Setor / Posto de Trabalho */}
                  <TableHead className="text-gray-300 font-semibold">
                    <button
                      type="button"
                      onClick={() => handleSort('workPost')}
                      className="flex items-center gap-1.5 hover:text-white transition-colors focus:outline-none"
                      title="Clique para ordenar por Setor / Posto de Trabalho"
                    >
                      <span>Setor / Posto de Trabalho</span>
                      <ArrowUpDown className={`h-3.5 w-3.5 ${sortKey === 'workPost' ? 'text-seguranca-yellow font-bold' : 'text-gray-500 opacity-60'}`} />
                      {sortKey === 'workPost' && (
                        <span className="text-[10px] text-seguranca-yellow font-mono">
                          {sortDir === 'asc' ? '▲' : '▼'}
                        </span>
                      )}
                    </button>
                  </TableHead>

                  {/* Column Header: Data de Cadastro / Admissão (Último Cadastrado Primeiro) */}
                  <TableHead className="text-gray-300 font-semibold">
                    <button
                      type="button"
                      onClick={() => handleSort('hireDate')}
                      className="flex items-center gap-1.5 hover:text-white transition-colors focus:outline-none"
                      title="Clique para ordenar por Data de Cadastro / Admissão (Primeiro clique: último cadastrado primeiro)"
                    >
                      <span>Admissão / Cadastro</span>
                      <ArrowUpDown className={`h-3.5 w-3.5 ${sortKey === 'hireDate' ? 'text-seguranca-yellow font-bold' : 'text-gray-500 opacity-60'}`} />
                      {sortKey === 'hireDate' && (
                        <span className="text-[10px] text-seguranca-yellow font-mono">
                          {sortDir === 'desc' ? '▼ (Último)' : '▲ (Antigo)'}
                        </span>
                      )}
                    </button>
                  </TableHead>

                  {/* Column Header: Status */}
                  <TableHead className="text-gray-300 font-semibold">
                    <button
                      type="button"
                      onClick={() => handleSort('status')}
                      className="flex items-center gap-1.5 hover:text-white transition-colors focus:outline-none"
                      title="Clique para ordenar por Status"
                    >
                      <span>Status</span>
                      <ArrowUpDown className={`h-3.5 w-3.5 ${sortKey === 'status' ? 'text-seguranca-yellow font-bold' : 'text-gray-500 opacity-60'}`} />
                      {sortKey === 'status' && (
                        <span className="text-[10px] text-seguranca-yellow font-mono">
                          {sortDir === 'asc' ? '▲' : '▼'}
                        </span>
                      )}
                    </button>
                  </TableHead>

                  <TableHead className="text-gray-300 font-semibold text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map((emp) => {
                  const statusConf = STATUS_CONFIG[emp.status] || {
                    label: emp.status,
                    bgClass: 'bg-gray-500/20 text-gray-300',
                  };

                  const companyName = emp.company?.name || emp.empresaNome || emp.companyName || emp.company?.sigla || '-';
                  const setorName = getSetorDeTrabalho(emp);
                  const postoLabel = formatPostoTrabalhoLabel(emp);

                  return (
                    <TableRow key={emp.id} className="border-gray-700/40 hover:bg-seguranca-black/30 transition-colors">
                      {/* Nome / Foto */}
                      <TableCell className="font-medium text-seguranca-lightgray">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-seguranca-black border border-gray-600 flex items-center justify-center font-bold text-seguranca-yellow text-xs shrink-0">
                            {emp.photoUrl ? (
                              <img src={emp.photoUrl} alt={emp.name} className="w-8 h-8 rounded-full object-cover" />
                            ) : (
                              emp.name?.substring(0, 2).toUpperCase()
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-seguranca-lightgray">{emp.name}</p>
                            {emp.email && <p className="text-xs text-gray-400">{emp.email}</p>}
                          </div>
                        </div>
                      </TableCell>

                      {/* CPF / Matrícula */}
                      <TableCell className="text-gray-300 text-xs">
                        <p>{formatCPF(emp.cpf) || emp.cpf}</p>
                        {emp.registrationNumber && (
                          <p className="text-gray-400 text-[11px]">Matrícula: {emp.registrationNumber}</p>
                        )}
                      </TableCell>

                      {/* Cargo */}
                      <TableCell className="text-gray-300 text-xs">
                        <div className="flex items-center gap-1">
                          <Briefcase className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                          <span>{emp.position?.name || emp.cargoFuncao || 'Não informado'}</span>
                        </div>
                      </TableCell>

                      {/* Coluna Exclusiva Empresa */}
                      <TableCell className="text-gray-300 text-xs">
                        <div className="flex items-center gap-1.5 font-medium">
                          <Building className="h-3.5 w-3.5 text-seguranca-yellow shrink-0" />
                          <span>{companyName}</span>
                        </div>
                      </TableCell>

                      {/* Coluna Setor de Trabalho + Posto de Trabalho */}
                      <TableCell className="text-gray-300 text-xs">
                        <div className="space-y-1">
                          <p className="font-semibold text-seguranca-lightgray flex items-center gap-1">
                            <Layers className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                            <span>{setorName}</span>
                          </p>
                          {postoLabel !== '-' ? (
                            <p className="text-gray-400 text-[11px] flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-seguranca-yellow shrink-0" />
                              <span className="font-medium text-gray-300">Posto:</span> {postoLabel}
                            </p>
                          ) : (
                            <p className="text-gray-500 text-[11px]">Sem posto vinculado</p>
                          )}
                        </div>
                      </TableCell>

                      {/* Data Admissão / Cadastro */}
                      <TableCell className="text-gray-300 text-xs">
                        {emp.hireDate ? formatDatePtBr(emp.hireDate) : '-'}
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${statusConf.bgClass}`}>
                          {statusConf.label}
                        </span>
                      </TableCell>

                      {/* Ações: Visualização (Mesma tela do RH e DP) + QR Code */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Visualizar Ficha Completa do Funcionário (RH / DP)"
                            disabled={loadingDetailsId === emp.id}
                            onClick={() => handleViewDetails(emp)}
                            className="h-8 w-8 p-0 text-gray-300 hover:text-seguranca-yellow hover:bg-seguranca-black"
                          >
                            {loadingDetailsId === emp.id ? (
                              <Loader2 className="h-4 w-4 animate-spin text-seguranca-yellow" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            title="Ver Crachá / QR Code"
                            onClick={() => handleViewQrCode(emp)}
                            className="h-8 w-8 p-0 text-gray-300 hover:text-emerald-400 hover:bg-seguranca-black"
                          >
                            <QrCode className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Modal Avançado de Relatórios */}
      <RelatoriosModal
        open={relatoriosModalOpen}
        onOpenChange={setRelatoriosModalOpen}
        employees={employees}
        filterCompanies={companies}
        filterWorkPosts={workPosts}
        filterPositions={positions}
      />

      {/* Modal de Ficha Detalhada Completa do Funcionário (Mesma tela do RH e DP) */}
      {selectedEmployee && (
        <EmployeeViewDetailsModal
          open={detailsModalOpen}
          onOpenChange={setDetailsModalOpen}
          employee={selectedEmployee}
        />
      )}

      {/* Modal de Crachá / QR Code */}
      {qrCodeEmployee && (
        <EmployeeQrCodeBadgeModal
          open={qrCodeModalOpen}
          onOpenChange={setQrCodeModalOpen}
          employee={qrCodeEmployee}
        />
      )}
    </div>
  );
};

export default StockFuncionariosContent;
