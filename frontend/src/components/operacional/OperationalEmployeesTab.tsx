import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  MapPin,
  MapPinOff,
  Clock,
  FileText,
  ChevronDown,
  ChevronRight,
  Loader2,
  Stethoscope,
  Award,
  Activity,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Pencil,
  Briefcase,
  DollarSign,
  CalendarOff,
  AlertCircle,
  User,
  Building2,
  ArrowRightLeft,
  Search,
} from 'lucide-react';
import { employeeService } from '@/services/employeeService';
import { operationalService, WorkPostAssignment } from '@/services/operationalService';
import { employeeChangeHistoryService, EmployeeChangeHistoryItem } from '@/services/employeeChangeHistoryService';
import api from '@/lib/axios';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission } from '@/utils/permissions';
import FuncionarioEditModal from '@/components/funcionarios/FuncionarioEditModal';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { RelatoriosModal } from '@/components/funcionarios/RelatoriosModal';
import { Employee } from '@/types/employee';

interface EmployeeWithDetails {
  id: string;
  name: string;
  registrationNumber?: string;
  status?: string;
  workPost?: { id: string; name?: string };
  workPosts?: Array<{ id: string; name?: string }>;
  department?: { id: string; name?: string };
  position?: { name?: string };
  company?: { id?: string; name?: string; sigla?: string };
  hireDate?: string;
  terminationDate?: string;
  horarioTrabalho?: string;
  escalaTrabalho?: string;
  diasTrabalho?: string;
  exameMedicoData?: string;
  exameMedicoVencimento?: string;
  exameMedicoTipo?: string;
}

const formatDate = (d?: string) => {
  if (!d) return '-';
  try {
    return new Date(d).toLocaleDateString('pt-BR');
  } catch {
    return d;
  }
};

const getStatusBadge = (status?: string) => {
  const config: Record<string, { label: string; className: string }> = {
    ACTIVE: { label: 'Ativo', className: 'bg-green-500/20 text-green-300' },
    TERMINATED: { label: 'Demitido', className: 'bg-red-500/20 text-red-300' },
    INACTIVE: { label: 'Inativo', className: 'bg-gray-500/20 text-gray-300' },
    VACATION: { label: 'Férias', className: 'bg-blue-500/20 text-blue-300' },
  };
  const c = config[status || ''] || { label: status || '-', className: 'bg-gray-500/20' };
  return <Badge variant="outline" className={c.className}>{c.label}</Badge>;
};

const isExpired = (dateStr?: string) => {
  if (!dateStr) return false;
  try {
    return new Date(dateStr) < new Date();
  } catch {
    return false;
  }
};

export const OperationalEmployeesTab: React.FC = () => {
  const [employees, setEmployees] = useState<EmployeeWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState<string | null>(null);
  const [employeeToEdit, setEmployeeToEdit] = useState<EmployeeWithDetails | null>(null);
  const [relatoriosModalOpen, setRelatoriosModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const { user } = useAuth();

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const data = await employeeService.getAllEmployees({}, 0, 500);
      setEmployees(data as EmployeeWithDetails[]);
    } catch (error) {
      console.error('Erro ao carregar funcionários:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar a lista de funcionários.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const getCurrentWorkPost = (emp: EmployeeWithDetails) => {
    if (emp.workPosts && emp.workPosts.length > 0) {
      return emp.workPosts.map(w => w.name).filter(Boolean).join(', ') || '-';
    }
    if (emp.workPost?.name) return emp.workPost.name;
    if (emp.department?.name) return emp.department.name;
    // Não usar cargo como fallback - Posto de Trabalho e Cargo são conceitos distintos.
    // O cargo é exibido separadamente, evitar duplicação.
    return '-';
  };

  const sortedEmployees = [...employees].sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  const searchLower = searchTerm.trim().toLowerCase();
  const filteredEmployees = searchLower
    ? sortedEmployees.filter((emp) => {
        const name = (emp.name || '').toLowerCase();
        const matricula = (emp.registrationNumber || '').toLowerCase();
        const company = (emp.company?.name || emp.company?.sigla || '').toLowerCase();
        const post = (getCurrentWorkPost(emp) || '').toLowerCase();
        const cargo = (emp.position?.name || '').toLowerCase();
        return (
          name.includes(searchLower) ||
          matricula.includes(searchLower) ||
          company.includes(searchLower) ||
          post.includes(searchLower) ||
          cargo.includes(searchLower)
        );
      })
    : sortedEmployees;

  const employeesByCompany = filteredEmployees.reduce((acc, emp) => {
    const companyName = emp.company?.name || emp.company?.sigla || 'Sem Empresa';
    if (!acc[companyName]) acc[companyName] = [];
    acc[companyName].push(emp);
    return acc;
  }, {} as Record<string, EmployeeWithDetails[]>);

  const employeesByWorkPost = filteredEmployees.reduce((acc, emp) => {
    const workPosts = [];
    if (emp.workPosts && emp.workPosts.length > 0) {
      workPosts.push(...emp.workPosts.map(w => w.name).filter(Boolean));
    } else if (emp.workPost?.name) {
      workPosts.push(emp.workPost.name);
    } else if (emp.department?.name) {
      workPosts.push(emp.department.name);
    }

    if (workPosts.length === 0) {
      const wpName = 'Sem Posto Vinculado';
      if (!acc[wpName]) acc[wpName] = [];
      acc[wpName].push(emp);
    } else {
      workPosts.forEach(wpName => {
        const name = wpName || 'Sem Posto Vinculado';
        if (!acc[name]) acc[name] = [];
        acc[name].push(emp);
      });
    }
    return acc;
  }, {} as Record<string, EmployeeWithDetails[]>);

  const employeesByStatus = filteredEmployees.reduce((acc, emp) => {
    const status = emp.status || 'ACTIVE';
    if (!acc[status]) acc[status] = [];
    acc[status].push(emp);
    return acc;
  }, {} as Record<string, EmployeeWithDetails[]>);

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      ACTIVE: 'Ativo',
      TERMINATED: 'Demitido',
      INACTIVE: 'Inativo',
      VACATION: 'Férias',
    };
    return labels[status] || status;
  };

  const generatePdfReport = async (title: string, data: EmployeeWithDetails[]) => {
    try {
      const employeeIds = data.map(e => e.id);
      const companyId = user?.company?.id ?? undefined;
      const blob = await employeeService.exportEmployeesReportPdf(companyId, employeeIds);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Relatorio_Funcionarios_${new Date().toISOString().split('T')[0]}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast({
        title: 'Sucesso',
        description: 'Relatório gerado com sucesso.',
      });
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao gerar o relatório em PDF.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        <span className="ml-2 text-slate-400">Carregando funcionários...</span>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Lista de Funcionários ({filteredEmployees.length}{searchTerm.trim() ? ` de ${employees.length}` : ''})
          </CardTitle>
          <div className="flex gap-2">
            <Button onClick={loadEmployees} variant="outline" size="sm">
              Atualizar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Pesquisar por nome, matrícula, empresa, posto ou cargo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500"
            />
          </div>
          <Button 
            onClick={() => setRelatoriosModalOpen(true)} 
            variant="outline" 
            size="sm"
            className="text-slate-300 hover:text-white"
          >
            <FileText className="h-4 w-4 mr-2" />
            Gerar Relatório
          </Button>
        </div>

        <Tabs defaultValue="todos" className="w-full">
          <TabsList className="mb-4 bg-slate-800/50">
            <TabsTrigger value="todos">Todos</TabsTrigger>
            <TabsTrigger value="empresa">Por Empresa</TabsTrigger>
            <TabsTrigger value="posto">Por Posto de Trabalho</TabsTrigger>
            <TabsTrigger value="status">Por Status</TabsTrigger>
          </TabsList>

          <TabsContent value="todos" className="space-y-4">
            <div className="space-y-2">
              {filteredEmployees.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  {searchTerm.trim() ? 'Nenhum funcionário encontrado para esta pesquisa.' : 'Nenhum funcionário encontrado.'}
                </p>
              ) : (
                filteredEmployees.map((emp) => (
                  <EmployeeRow
                    key={emp.id}
                    employee={emp}
                    currentWorkPost={getCurrentWorkPost(emp)}
                    expanded={expandedId === emp.id}
                    onToggle={() => setExpandedId(expandedId === emp.id ? null : emp.id)}
                    historyLoading={historyLoading === emp.id}
                    setHistoryLoading={(v) => setHistoryLoading(v ? emp.id : null)}
                    onEmployeeUpdated={loadEmployees}
                    onEditClick={setEmployeeToEdit}
                  />
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="empresa" className="space-y-6">
            {Object.keys(employeesByCompany).length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                {searchTerm.trim() ? 'Nenhum funcionário encontrado para esta pesquisa.' : 'Nenhum funcionário encontrado.'}
              </p>
            ) : (
            <Tabs defaultValue={Object.keys(employeesByCompany).sort((a, b) => a.localeCompare(b))[0]} className="w-full">
              <TabsList className="mb-4 bg-slate-800/50 flex-wrap h-auto p-1">
                {Object.keys(employeesByCompany).sort((a, b) => a.localeCompare(b)).map(company => (
                  <TabsTrigger key={company} value={company} className="flex-1 min-w-[120px] whitespace-nowrap">
                    {company} ({employeesByCompany[company].length})
                  </TabsTrigger>
                ))}
              </TabsList>

              {Object.keys(employeesByCompany).sort((a, b) => a.localeCompare(b)).map(company => (
                <TabsContent key={company} value={company} className="space-y-3">
                  <div className="flex items-center justify-between bg-slate-800/50 p-3 rounded-md">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-seguranca-red" />
                      {company} ({employeesByCompany[company].length})
                    </h3>
                    <Button 
                      onClick={() => generatePdfReport(`Relatório de Funcionários - Empresa: ${company}`, employeesByCompany[company])} 
                      variant="ghost" 
                      size="sm"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      PDF
                    </Button>
                  </div>
                  <div className="space-y-2 pl-4 border-l-2 border-slate-800">
                    {employeesByCompany[company].map((emp) => (
                      <EmployeeRow
                        key={emp.id}
                        employee={emp}
                        currentWorkPost={getCurrentWorkPost(emp)}
                        expanded={expandedId === emp.id}
                        onToggle={() => setExpandedId(expandedId === emp.id ? null : emp.id)}
                        historyLoading={historyLoading === emp.id}
                        setHistoryLoading={(v) => setHistoryLoading(v ? emp.id : null)}
                        onEmployeeUpdated={loadEmployees}
                        onEditClick={setEmployeeToEdit}
                      />
                    ))}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
            )}
          </TabsContent>

          <TabsContent value="posto" className="space-y-6">
            {Object.keys(employeesByWorkPost).length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                {searchTerm.trim() ? 'Nenhum funcionário encontrado para esta pesquisa.' : 'Nenhum funcionário encontrado.'}
              </p>
            ) : (
            <Tabs defaultValue={Object.keys(employeesByWorkPost).sort((a, b) => a.localeCompare(b))[0]} className="w-full">
              <TabsList className="mb-4 bg-slate-800/50 flex-wrap h-auto p-1">
                {Object.keys(employeesByWorkPost).sort((a, b) => a.localeCompare(b)).map(wp => (
                  <TabsTrigger 
                    key={wp} 
                    value={wp} 
                    className="flex-1 min-w-[120px] max-w-[200px] truncate block"
                    title={`${wp} (${employeesByWorkPost[wp].length})`}
                  >
                    <span className="truncate block w-full">{wp} ({employeesByWorkPost[wp].length})</span>
                  </TabsTrigger>
                ))}
              </TabsList>

              {Object.keys(employeesByWorkPost).sort((a, b) => a.localeCompare(b)).map(wp => (
                <TabsContent key={wp} value={wp} className="space-y-3">
                  <div className="flex items-center justify-between bg-slate-800/50 p-3 rounded-md">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-seguranca-red" />
                      {wp} ({employeesByWorkPost[wp].length})
                    </h3>
                    <Button 
                      onClick={() => generatePdfReport(`Relatório de Funcionários - Posto: ${wp}`, employeesByWorkPost[wp])} 
                      variant="ghost" 
                      size="sm"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      PDF
                    </Button>
                  </div>
                  <div className="space-y-2 pl-4 border-l-2 border-slate-800">
                    {employeesByWorkPost[wp].map((emp) => (
                      <EmployeeRow
                        key={emp.id}
                        employee={emp}
                        currentWorkPost={getCurrentWorkPost(emp)}
                        expanded={expandedId === emp.id}
                        onToggle={() => setExpandedId(expandedId === emp.id ? null : emp.id)}
                        historyLoading={historyLoading === emp.id}
                        setHistoryLoading={(v) => setHistoryLoading(v ? emp.id : null)}
                        onEmployeeUpdated={loadEmployees}
                        onEditClick={setEmployeeToEdit}
                      />
                    ))}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
            )}
          </TabsContent>

          <TabsContent value="status" className="space-y-6">
            {Object.keys(employeesByStatus).length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                {searchTerm.trim() ? 'Nenhum funcionário encontrado para esta pesquisa.' : 'Nenhum funcionário encontrado.'}
              </p>
            ) : (
            <Tabs defaultValue={Object.keys(employeesByStatus).sort((a, b) => a.localeCompare(b))[0]} className="w-full">
              <TabsList className="mb-4 bg-slate-800/50 flex-wrap h-auto p-1">
                {Object.keys(employeesByStatus).sort((a, b) => a.localeCompare(b)).map(status => (
                  <TabsTrigger key={status} value={status} className="flex-1 min-w-[120px] whitespace-nowrap">
                    {getStatusLabel(status)} ({employeesByStatus[status].length})
                  </TabsTrigger>
                ))}
              </TabsList>

              {Object.keys(employeesByStatus).sort((a, b) => a.localeCompare(b)).map(status => (
                <TabsContent key={status} value={status} className="space-y-3">
                  <div className="flex items-center justify-between bg-slate-800/50 p-3 rounded-md">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <Activity className="h-5 w-5 text-seguranca-red" />
                      {getStatusLabel(status)} ({employeesByStatus[status].length})
                    </h3>
                    <Button 
                      onClick={() => generatePdfReport(`Relatório de Funcionários - Status: ${getStatusLabel(status)}`, employeesByStatus[status])} 
                      variant="ghost" 
                      size="sm"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      PDF
                    </Button>
                  </div>
                  <div className="space-y-2 pl-4 border-l-2 border-slate-800">
                    {employeesByStatus[status].map((emp) => (
                      <EmployeeRow
                        key={emp.id}
                        employee={emp}
                        currentWorkPost={getCurrentWorkPost(emp)}
                        expanded={expandedId === emp.id}
                        onToggle={() => setExpandedId(expandedId === emp.id ? null : emp.id)}
                        historyLoading={historyLoading === emp.id}
                        setHistoryLoading={(v) => setHistoryLoading(v ? emp.id : null)}
                        onEmployeeUpdated={loadEmployees}
                        onEditClick={setEmployeeToEdit}
                      />
                    ))}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      <FuncionarioEditModal
        open={!!employeeToEdit}
        onOpenChange={(open) => { if (!open) setEmployeeToEdit(null); }}
        funcionario={employeeToEdit as any}
        onSuccess={() => { loadEmployees(); setEmployeeToEdit(null); }}
      />
      <RelatoriosModal
        open={relatoriosModalOpen}
        onOpenChange={setRelatoriosModalOpen}
        employees={employees as Employee[]}
      />
    </Card>
  );
};

interface EmployeeRowProps {
  employee: EmployeeWithDetails;
  currentWorkPost: string;
  expanded: boolean;
  onToggle: () => void;
  historyLoading: boolean;
  setHistoryLoading: (v: boolean) => void;
  onEmployeeUpdated?: () => void;
}

const EmployeeRow: React.FC<EmployeeRowProps> = ({
  employee,
  currentWorkPost,
  expanded,
  onToggle,
  historyLoading,
  setHistoryLoading,
  onEmployeeUpdated,
  onEditClick,
}) => {
  const { user } = useAuth();
  const canEdit = user?.permissions && hasPermission(user.permissions, 'EMPLOYEES_WRITE');
  const [history, setHistory] = useState<{
    fullEmployee: EmployeeWithDetails | null;
    changes: EmployeeChangeHistoryItem[];
    assignments: WorkPostAssignment[];
    medicalExams: Array<{ id: string; scheduledDate?: string; completionDate?: string; category?: string; status?: string }>;
    trainings: Array<{ id: string; training?: { name?: string }; completionDate?: string; status?: string }>;
    activities: Array<{ id: string; activityType?: string; activityDate?: string; status?: string }>;
  } | null>(null);

  const loadHistory = async () => {
    if (history) return;
    setHistoryLoading(true);
    try {
      const [fullEmployeeRes, changesRes, assignments, medicalExams, trainings, activities] = await Promise.allSettled([
        employeeService.getEmployeeById(employee.id),
        employeeChangeHistoryService.getByEmployeeId(employee.id, 0, 50),
        operationalService.getAllWorkPostAssignments().then(list =>
          list.filter((a: WorkPostAssignment) => a.employee?.id === employee.id)
        ),
        api.get(`/api/sst/medical-exams/employee/${employee.id}`).then(r => r.data || []).catch(() => []),
        api.get(`/api/sst/trainings/participations/employee/${employee.id}`).then(r => r.data || []).catch(() => []),
        operationalService.getAllSpecificActivities().then(list =>
          list.filter((a: { employee?: { id?: string } }) => a.employee?.id === employee.id)
        ),
      ]);

      const fullEmp = fullEmployeeRes.status === 'fulfilled' ? fullEmployeeRes.value : null;
      setHistory({
        fullEmployee: fullEmp as EmployeeWithDetails | null,
        changes: changesRes.status === 'fulfilled' ? changesRes.value.content : [],
        assignments: assignments.status === 'fulfilled' ? assignments.value : [],
        medicalExams: medicalExams.status === 'fulfilled' ? (medicalExams.value as any[]) : [],
        trainings: trainings.status === 'fulfilled' ? (trainings.value as any[]) : [],
        activities: activities.status === 'fulfilled' ? activities.value : [],
      });
    } catch (e) {
      console.error('Erro ao carregar histórico:', e);
      setHistory({
        fullEmployee: null,
        changes: [],
        assignments: [],
        medicalExams: [],
        trainings: [],
        activities: [],
      });
    } finally {
      setHistoryLoading(false);
    }
  };

  const asoExpired = isExpired(employee.exameMedicoVencimento);

  return (
    <Collapsible open={expanded} onOpenChange={(open) => { if (open) loadHistory(); onToggle(); }}>
      <div className="border rounded-lg overflow-hidden">
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer transition-colors">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex-shrink-0">
                {expanded ? (
                  <ChevronDown className="h-5 w-5 text-slate-400" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-slate-400" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold truncate">{employee.name}</p>
                <div className="flex flex-wrap gap-3 mt-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    <strong>Posto atual:</strong> {currentWorkPost}
                  </span>
                  {employee.position?.name && (
                    <span><strong>Cargo:</strong> {employee.position.name}</span>
                  )}
                  {employee.registrationNumber && (
                    <span>Mat: {employee.registrationNumber}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {canEdit && onEditClick && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => { e.stopPropagation(); onEditClick(employee); }}
                    title="Editar funcionário"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                {getStatusBadge(employee.status)}
                {asoExpired && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    ASO vencido
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t bg-slate-900/30 p-4">
            {historyLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : history ? (
              <EmployeeHistoryPanel employee={history.fullEmployee || employee} history={history} />
            ) : null}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

const getCategoryIcon = (category?: string) => {
  const icons: Record<string, React.ComponentType<{ className?: string }>> = {
    CARGO: Briefcase,
    SETOR: Building2,
    REMANEJAMENTO: ArrowRightLeft,
    SALARIO: DollarSign,
    HORARIO: Clock,
    ESCALA: Calendar,
    FERIAS: Calendar,
    FALTA: CalendarOff,
    OCORRENCIA: AlertCircle,
    ADVERTENCIA: AlertTriangle,
    POSTO_TRABALHO: MapPin,
    ATIVIDADE: Activity,
    EXAME_ASO: Stethoscope,
    STATUS: User,
    DADOS_CADASTRAIS: User,
    EMPRESA: Building2,
    UNIDADE: Building2,
    BENEFICIOS: FileText,
    OUTROS: FileText,
  };
  return icons[category || ''] || FileText;
};

interface EmployeeHistoryPanelProps {
  employee: EmployeeWithDetails;
  history: {
    fullEmployee?: EmployeeWithDetails | null;
    changes: EmployeeChangeHistoryItem[];
    assignments: WorkPostAssignment[];
    medicalExams: Array<{ id: string; scheduledDate?: string; completionDate?: string; category?: string; status?: string }>;
    trainings: Array<{ id: string; training?: { name?: string }; completionDate?: string; status?: string }>;
    activities: Array<{ id: string; activityType?: string; activityDate?: string; status?: string }>;
  };
}

const EmployeeHistoryPanel: React.FC<EmployeeHistoryPanelProps> = ({ employee, history }) => {
  const { toast } = useToast();
  const [reportLoading, setReportLoading] = useState(false);

  const formatDate = (d?: string) => {
    if (!d) return '-';
    try {
      return new Date(d).toLocaleDateString('pt-BR');
    } catch {
      return d;
    }
  };

  const handleGenerateReport = async (format: 'pdf' | 'excel') => {
    setReportLoading(true);
    try {
      const blob = format === 'pdf'
        ? await employeeService.generateEmployeeHistoryPdf(employee.id)
        : await employeeService.generateEmployeeRecordExcel(employee.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `historico-${employee.name.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Sucesso', description: `Relatório ${format.toUpperCase()} gerado com sucesso.` });
    } catch (e) {
      toast({ title: 'Erro', description: 'Não foi possível gerar o relatório.', variant: 'destructive' });
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-slate-200">Histórico completo</h4>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => handleGenerateReport('pdf')} disabled={reportLoading}>
            {reportLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4 mr-1" />}
            PDF
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleGenerateReport('excel')} disabled={reportLoading}>
            Excel
          </Button>
        </div>
      </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Posto atual e último */}
      {(() => {
        const sorted = [...history.assignments].sort((a, b) =>
          new Date(b.assignmentDate || 0).getTime() - new Date(a.assignmentDate || 0).getTime()
        );
                              const currentPost = sorted[0]?.workPost?.name || employee.workPost?.name || employee.department?.name || '-';
        const lastPost = sorted[1]?.workPost?.name || (sorted.length === 1 ? '-' : '-');
        return (
          <div className="space-y-4 lg:col-span-2">
            <h4 className="font-semibold text-slate-200 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Postos de trabalho
            </h4>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg px-4 py-2">
                <MapPin className="h-4 w-4 text-emerald-400" />
                <span className="text-sm"><strong>Posto atual:</strong> {currentPost}</span>
              </div>
              {lastPost !== '-' && (
                <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg px-4 py-2">
                  <MapPinOff className="h-4 w-4 text-slate-400" />
                  <span className="text-sm"><strong>Último posto:</strong> {lastPost}</span>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Dados atuais */}
      <div className="space-y-4">
        <h4 className="font-semibold text-slate-200 flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Dados atuais
        </h4>
        <div className="bg-slate-800/50 rounded-lg p-4 space-y-2 text-sm">
          <p><strong>Horário de trabalho:</strong> {employee.horarioTrabalho || '-'}</p>
          <p><strong>Escala de trabalho:</strong> {employee.escalaTrabalho || '-'}</p>
          <p><strong>Dias de trabalho:</strong> {employee.diasTrabalho || '-'}</p>
          <p><strong>Admissão:</strong> {formatDate(employee.hireDate)}</p>
          {employee.terminationDate && (
            <p><strong>Demissão:</strong> {formatDate(employee.terminationDate)}</p>
          )}
          <p><strong>ASO:</strong> {formatDate(employee.exameMedicoData)} | Vencimento: {formatDate(employee.exameMedicoVencimento)} {employee.exameMedicoTipo && `(${employee.exameMedicoTipo})`}</p>
        </div>
      </div>

      {/* Histórico de alterações */}
      <div className="space-y-4">
        <h4 className="font-semibold text-slate-200 flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Histórico de alterações
        </h4>
        <div className="bg-slate-800/50 rounded-lg p-4 max-h-48 overflow-y-auto space-y-2">
          {history.changes.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhuma alteração registrada.</p>
          ) : (
            history.changes.slice(0, 20).map((c) => {
              const Icon = getCategoryIcon(c.category);
              return (
                <div key={c.id} className="text-xs border-b border-slate-700/50 pb-2 last:border-0 flex items-start gap-2">
                  <Icon className="h-3.5 w-3.5 text-slate-500 mt-0.5 flex-shrink-0" />
                  <span>
                    <span className="text-slate-400">{formatDate(c.changedAt)}</span> • {c.categoryLabel}: {c.fieldLabel} → {c.newValue || '-'}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Alterações de posto */}
      <div className="space-y-4">
        <h4 className="font-semibold text-slate-200 flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Histórico de postos
        </h4>
        <div className="bg-slate-800/50 rounded-lg p-4 max-h-40 overflow-y-auto space-y-2">
          {history.assignments.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhuma atribuição de posto.</p>
          ) : (
            history.assignments.map((a) => (
              <div key={a.id} className="text-sm flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-slate-500" />
                {formatDate(a.assignmentDate)} - {a.workPost?.name || '-'} ({a.shift})
              </div>
            ))
          )}
        </div>
      </div>

      {/* Exames ASO */}
      <div className="space-y-4">
        <h4 className="font-semibold text-slate-200 flex items-center gap-2">
          <Stethoscope className="h-4 w-4" />
          Exames ASO
        </h4>
        <div className="bg-slate-800/50 rounded-lg p-4 max-h-40 overflow-y-auto space-y-2">
          {history.medicalExams.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum exame registrado.</p>
          ) : (
            history.medicalExams.map((m) => (
              <div key={m.id} className="text-sm flex items-center gap-2">
                {isExpired(m.completionDate || m.scheduledDate) ? (
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                ) : (
                  <CheckCircle className="h-3.5 w-3.5 text-green-400" />
                )}
                {formatDate(m.completionDate || m.scheduledDate)} - {m.category || '-'}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Treinamentos */}
      <div className="space-y-4">
        <h4 className="font-semibold text-slate-200 flex items-center gap-2">
          <Award className="h-4 w-4" />
          Treinamentos e reciclagem
        </h4>
        <div className="bg-slate-800/50 rounded-lg p-4 max-h-40 overflow-y-auto space-y-2">
          {history.trainings.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum treinamento.</p>
          ) : (
            history.trainings.map((t) => (
              <div key={t.id} className="text-sm flex items-center gap-2">
                {t.completionDate ? (
                  <CheckCircle className="h-3.5 w-3.5 text-green-400" />
                ) : (
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                )}
                {t.training?.name || '-'} - {formatDate(t.completionDate) || 'Pendente'}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Atividades */}
      <div className="space-y-4 lg:col-span-2">
        <h4 className="font-semibold text-slate-200 flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Atividades realizadas
        </h4>
        <div className="bg-slate-800/50 rounded-lg p-4 max-h-40 overflow-y-auto space-y-2">
          {history.activities.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhuma atividade.</p>
          ) : (
            history.activities.map((a) => (
              <div key={a.id} className="text-sm flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-slate-500" />
                {formatDate(a.activityDate)} - {a.activityType?.replace('_', ' ') || '-'}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
    </div>
  );
};
