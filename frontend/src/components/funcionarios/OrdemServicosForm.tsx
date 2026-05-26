import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { FileText, Download, Eye, User, Building, Calendar, Clock, MapPin, AlertTriangle, CheckCircle2, Loader2, Briefcase } from 'lucide-react';
import { employeeService, Employee, SimpleEmployee } from '@/services/employeeService';
import { SearchableSelect } from '../ui/searchable-select';
import { EmployeeCombobox } from '../ui/employee-combobox';

import { companyService } from '@/services/companyService';
import { clientService, Client } from '@/services/clientService';
import { formatCPF, formatCNPJ } from '@/utils/validation';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/axios';
import { refreshEmployeeDocuments } from '@/utils/refreshEmployeeDocuments';

// Predefined Safety Templates for common roles
const SAFETY_TEMPLATES: Record<string, any> = {
  'RECEPCIONISTA': {
    activities: 'Recepcionar membros da comunidade e visitantes procurando identificá-los, averiguando suas pretensões para prestar-lhes informações e/ou encaminhá-los a pessoas ou setor procurados. Atender chamadas telefônicas. Anotar recados. Prestar informações.',
    risks: 'Riscos Ergonômicos: Postura inadequada.',
    preventiveMeasures: '- Adoção de medidas de proteção em ordem: coletivas e individuais.',
    uniform: '- Uniforme completo.',
    mandatoryTrainings: '- Treinamento de Ambientação de Segurança do Trabalho (SIM)\n- DSS – Diálogo de Segurança e Saúde Ocupacional\n- Treinamento sobre aspectos legais e técnicos no uso e conservação de EPIs.'
  },
  'PORTEIRO': {
    activities: 'Fiscalizar a guarda do patrimônio e exercer a observação de fábricas, armazéns, residências, estacionamentos, edifícios públicos, privados e outros estabelecimentos, percorrendo-os sistematicamente e inspecionando suas dependências.',
    risks: 'Riscos Ergonômicos: Postura inadequada, trabalho em pé.\nRiscos de Acidentes: Intrusão, violência física.',
    preventiveMeasures: '- Pausas ergonômicas.\n- Cumprimento de procedimentos de segurança.\n- Manter comunicação via rádio.',
    uniform: '- Uniforme completo padrão da portaria.',
    mandatoryTrainings: '- Treinamento de Ambientação de Segurança do Trabalho (SIM)\n- Procedimentos de Portaria e Controle de Acesso\n- Primeiros Socorros Básicos\n- DSS Diário'
  },
  'VIGILANTE': {
    activities: 'Garantir a segurança patrimonial e física do local, realizando rondas, controle de acesso e monitoramento. Agir preventivamente para evitar ocorrências e atuar de forma repressiva quando necessário e de acordo com a legislação.',
    risks: 'Riscos de Acidentes: Violência, assaltos.\nRiscos Ergonômicos: Postura prolongada.\nRiscos Físicos: Exposição a intempéries.',
    preventiveMeasures: '- Uso de colete balístico (se aplicável).\n- Atenção contínua e adoção de protocolos de segurança armada/desarmada.\n- Adoção de medidas de proteção coletivas e individuais.',
    uniform: '- Uniforme tático/padrão completo.\n- Calçado de segurança.',
    mandatoryTrainings: '- Reciclagem de Vigilante (obrigatório PF)\n- Treinamento de Ambientação de Segurança do Trabalho\n- Uso Progressivo da Força\n- Defesa Pessoal e Armamento (se aplicável)'
  },
  'AUXILIAR DE LIMPEZA': {
    activities: 'Realizar a limpeza e conservação das dependências do cliente. Varrer, lavar, encerar, limpar vidros e janelas, recolher o lixo, e repor materiais de higiene.',
    risks: 'Riscos Químicos: Manuseio de produtos de limpeza.\nRiscos Ergonômicos: Movimentos repetitivos.\nRiscos de Acidentes: Quedas em piso escorregadio.',
    preventiveMeasures: '- Uso de EPIs adequados (luvas, botas de borracha, óculos).\n- Sinalização de piso molhado.\n- Diluição correta de produtos químicos.',
    uniform: '- Uniforme padrão de limpeza.\n- Bota de borracha/Calçado fechado antiderrapante.',
    mandatoryTrainings: '- Treinamento de manuseio de produtos químicos (FISPQ)\n- Uso e conservação de EPIs\n- NR-32 (se aplicável a ambiente hospitalar)\n- DSS Semanal'
  }
};

interface OrdemServicosFormProps {
  employeeId?: string;
  companyId?: string;
}

const OrdemServicosForm: React.FC<OrdemServicosFormProps> = ({ employeeId, companyId }) => {
  const { toast } = useToast();
  const [form, setForm] = useState({
    employeeId: employeeId || '',
    companyId: companyId || '',
    clientId: '',
    position: '',
    serviceType: '',
    location: '',
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    description: '',
    status: '',
    observations: '',
    workPostId: '',
    activities: '',
    risks: '',
    preventiveMeasures: '',
    uniform: '',
    mandatoryTrainings: '',
  });

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [selectedEmployeeData, setSelectedEmployeeData] = useState<SimpleEmployee | null>(null);
  const [companies, setCompanies] = useState<any[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [workPosts, setWorkPosts] = useState<any[]>([]);
  const [loadingWorkPosts, setLoadingWorkPosts] = useState(false);

  const funcionario = selectedEmployeeData;
  const empresa = companies.find(e => e.id === form.companyId);
  const cliente = clients.find(c => c.id === form.clientId);

  useEffect(() => {
    setForm(prev => ({
      ...prev,
      employeeId: employeeId || prev.employeeId,
      companyId: companyId || prev.companyId
    }));
  }, [employeeId, companyId]);

  // Carregar dados iniciais do funcionário se vier apenas o ID via props
  useEffect(() => {
    if (form.employeeId && !selectedEmployeeData) {
      const fetchEmployee = async () => {
        try {
          const emp = await employeeService.getEmployeeById(form.employeeId);
          if (emp) {
            setSelectedEmployeeData({
              id: emp.id,
              name: emp.name,
              document: emp.document || emp.cpf,
              cpf: emp.cpf || emp.document,
              email: emp.email,
              phone: emp.phone,
              registrationNumber: emp.registrationNumber,
              hireDate: emp.hireDate,
              rg: emp.rg,
              positionName: emp.position?.name,
              unitName: emp.unit?.name,
              departmentName: emp.department?.name,
              workPostId: (emp as any).workPostId || emp.workPost?.id,
              workPostName: (emp as any).workPostName || emp.workPost?.name,
              companyId: emp.company?.id,
              companySigla: emp.company?.sigla,
              address: emp.address,
              salario: emp.salario,
              escalaTrabalho: emp.escalaTrabalho,
              horarioTrabalho: emp.horarioTrabalho,
            } as SimpleEmployee);
          }
        } catch (error) {
          console.error("Erro ao carregar dados iniciais do funcionário:", error);
        }
      };
      fetchEmployee();
    }
  }, [form.employeeId, selectedEmployeeData]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoadingData(true);
    try {
      const [companiesData, clientsData] = await Promise.all([
        companyService.getAllCompanies(),
        clientService.getAllClients()
      ]);
      setCompanies(companiesData);
      setClients(clientsData);

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar dados necessários.',
        variant: 'destructive'
      });
    } finally {
      setLoadingData(false);
    }
  };

  // Pre-fill position when employee changes
  useEffect(() => {
    if (funcionario) {
      setForm(prev => ({
        ...prev,
        position: (funcionario as any).position?.name || prev.position
      }));
    }
  }, [funcionario]);

  // Pre-fill location when client changes & fetch work posts
  useEffect(() => {
    if (cliente && cliente.address) {
      setForm(prev => ({
        ...prev,
        location: cliente.address || prev.location
      }));
    }
    if (form.clientId) {
      const fetchWorkPosts = async () => {
        setLoadingWorkPosts(true);
        try {
          const token = localStorage.getItem('token');
          const res = await fetch(`/api/work-posts/by-client/${form.clientId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            setWorkPosts(data);
          }
        } catch (e) {
          console.error('Erro ao buscar postos:', e);
        } finally {
          setLoadingWorkPosts(false);
        }
      };
      fetchWorkPosts();
    } else {
      setWorkPosts([]);
    }
  }, [form.clientId]);

  const handleApplyTemplate = () => {
    if (!funcionario?.positionName) return;
    const pos = funcionario.positionName.toUpperCase();
    
    // Tenta encontrar um template que corresponda ao cargo do funcionário
    const templateKey = Object.keys(SAFETY_TEMPLATES).find(k => pos.includes(k));
    
    if (templateKey) {
      const tpl = SAFETY_TEMPLATES[templateKey];
      setForm(prev => ({
        ...prev,
        activities: prev.activities || tpl.activities,
        risks: prev.risks || tpl.risks,
        preventiveMeasures: prev.preventiveMeasures || tpl.preventiveMeasures,
        uniform: prev.uniform || tpl.uniform,
        mandatoryTrainings: prev.mandatoryTrainings || tpl.mandatoryTrainings
      }));
      toast({
        title: "Template Aplicado",
        description: `Dados de segurança para o cargo de ${templateKey} foram carregados.`,
      });
    } else {
      toast({
        title: "Template não encontrado",
        description: `Não há um template padrão configurado para o cargo: ${pos}.`,
        variant: "destructive"
      });
    }
  };

  const serviceTypes = [
    'Vigilância Patrimonial',
    'Segurança Pessoal',
    'Escolta de Valores',
    'Controle de Acesso',
    'Monitoramento',
    'Ronda',
    'Recepção',
    'Portaria',
    'Eventos',
    'Emergência',
  ];

  const priorityLevels = [
    'Baixa',
    'Média',
    'Alta',
    'Urgente',
  ];

  const statusOptions = [
    'Pendente',
    'Em Andamento',
    'Concluído',
    'Cancelado',
    'Suspenso',
  ];

  const handleGenerateOrder = async () => {
    if (!funcionario || !empresa || !cliente || !form.serviceType || !form.startDate) {
      toast({
        title: 'Atenção',
        description: 'Preencha os campos obrigatórios (Funcionário, Empresa, Cliente, Tipo, Data Início)!',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      // Buscar dados completos do funcionário
      const fullEmployee = await employeeService.getEmployeeById(funcionario.id);
      if (!fullEmployee) throw new Error('Funcionário não encontrado');

      const selectedWorkPost = workPosts.find(wp => wp.id === form.workPostId);
      const sectorName = selectedWorkPost?.name || (fullEmployee as any).workPost?.name || (fullEmployee as any).unit?.name || (fullEmployee as any).department?.name || '';

      const payload = {
        companyId: empresa.id,
        employeeName: fullEmployee.name,
        employeeCpf: fullEmployee.cpf || fullEmployee.document || '',
        employeePosition: fullEmployee.position?.name || '',
        sector: sectorName,
        clientName: cliente.name,
        clientAddress: cliente.address || '',
        serviceType: form.serviceType,
        location: form.location,
        startDate: form.startDate,
        endDate: form.endDate || null,
        startTime: form.startTime,
        endTime: form.endTime,
        priority: form.priority,
        status: form.status,
        description: form.description,
        observations: form.observations,
        city: empresa.city || '',
        documentDate: new Date().toISOString().split('T')[0],
        activities: form.activities,
        risks: form.risks,
        preventiveMeasures: form.preventiveMeasures,
        uniform: form.uniform,
        mandatoryTrainings: form.mandatoryTrainings,
      };

      const response = await api.post('/api/operational-service-order/generate-pdf', payload, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ordem-servico-${fullEmployee.name.replace(/\s+/g, '-').toLowerCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Sucesso',
        description: 'Ordem de Serviço gerada com sucesso!',
      });
      void refreshEmployeeDocuments(fullEmployee.id);
    } catch (err: any) {
      console.error('Erro ao gerar OS:', err);
      toast({
        title: 'Erro',
        description: err.response?.data?.message || 'Erro ao gerar Ordem de Serviço.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewOrder = async () => {
    if (!funcionario || !empresa || !cliente) {
      toast({
        title: 'Atenção',
        description: 'Selecione funcionário, empresa e cliente!',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const fullEmployee = await employeeService.getEmployeeById(funcionario.id);

      const selectedWorkPost = workPosts.find(wp => wp.id === form.workPostId);
      const sectorName = selectedWorkPost?.name || (fullEmployee as any).workPost?.name || (fullEmployee as any).unit?.name || (fullEmployee as any).department?.name || '';

      const payload = {
        companyId: empresa.id,
        employeeName: fullEmployee.name,
        employeeCpf: fullEmployee.cpf || fullEmployee.document || '',
        employeePosition: fullEmployee.position?.name || '',
        sector: sectorName,
        clientName: cliente.name,
        clientAddress: cliente.address || '',
        serviceType: form.serviceType,
        location: form.location,
        startDate: form.startDate,
        endDate: form.endDate || null,
        startTime: form.startTime,
        endTime: form.endTime,
        priority: form.priority,
        status: form.status,
        description: form.description,
        observations: form.observations,
        city: empresa.city || '',
        documentDate: new Date().toISOString().split('T')[0],
        activities: form.activities,
        risks: form.risks,
        preventiveMeasures: form.preventiveMeasures,
        uniform: form.uniform,
        mandatoryTrainings: form.mandatoryTrainings,
      };

      const response = await api.post('/api/operational-service-order/preview-pdf', payload, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');

      setTimeout(() => window.URL.revokeObjectURL(url), 100);
    } catch (err: any) {
      console.error('Erro ao gerar preview:', err);
      toast({
        title: 'Erro',
        description: 'Erro ao gerar preview.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="border-t-4 border-t-primary shadow-md">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-2xl">
                <FileText className="h-6 w-6 text-primary" />
                Ordem de Serviço
              </CardTitle>
              <CardDescription>
                Emissão de ordem de serviço para execução de atividades.
              </CardDescription>
            </div>
            {(funcionario && empresa && cliente && form.serviceType) && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1 px-3 py-1">
                <CheckCircle2 className="h-3 w-3" />
                Pronto para gerar
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-8">

          {/* Identificação */}
          <div className="bg-muted/30 p-6 rounded-xl border space-y-6">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
              <User className="h-4 w-4" />
              <span>Identificação</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label className="text-base font-semibold">
                  Empresa
                  <span className="block text-[11px] font-normal text-muted-foreground/80">
                    Empresa contratante da ordem de serviço.
                  </span>
                </Label>
                <Select
                  value={form.companyId}
                  onValueChange={(value) => setForm(prev => ({ ...prev, companyId: value }))}
                  disabled={loadingData}
                >
                  <SelectTrigger className="h-11 rounded-lg bg-black text-white border border-border/60 shadow-sm hover:bg-black/90 focus:ring-2 focus:ring-primary/30 focus:border-primary/60 [&>span]:text-left [&>span]:truncate">
                    <SelectValue placeholder={loadingData ? "Carregando..." : "Selecione a empresa"} />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg shadow-lg border bg-popover">
                    {loadingData ? (
                      <div className="p-2 text-center text-sm text-gray-500">Carregando empresas...</div>
                    ) : companies.length > 0 ? (
                      companies.map(e => (
                        <SelectItem key={e.id} value={e.id} className="py-2.5 cursor-pointer rounded-md">
                          {e.sigla ? `${e.sigla} - ${e.name}` : e.name}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-2 text-center text-sm text-gray-500">Nenhuma empresa encontrada</div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {empresa && (
                <div className="mt-1.5 flex flex-wrap items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 border border-border/60 lg:col-span-1">
                  <Building className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-semibold text-foreground">
                    {empresa.sigla || empresa.tradeName || empresa.name}
                  </span>
                  {empresa.name && (
                    <span className="text-[11px] text-muted-foreground">
                      · Razão Social: {empresa.name}
                    </span>
                  )}
                  {empresa.cnpj && (
                    <span className="text-[11px] text-muted-foreground">
                      · CNPJ: {formatCNPJ(empresa.cnpj)}
                    </span>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-base font-semibold">
                  Funcionário
                  <span className="block text-[11px] font-normal text-muted-foreground/80">
                    Executante principal desta ordem de serviço.
                  </span>
                </Label>
                <EmployeeCombobox
                  value={form.employeeId}
                  onChange={(value) => setForm(prev => ({ ...prev, employeeId: value }))}
                  disabled={loadingData}
                  onEmployeeSelect={(emp) => {
                    setSelectedEmployeeData(emp);
                    if (emp.companyId) {
                      setForm(prev => ({ ...prev, companyId: emp.companyId! }));
                    }
                  }}
                />
              </div>

              {funcionario && (
                <div className="mt-1.5 flex flex-wrap items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 border border-border/60 lg:col-span-1">
                  <User className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-semibold text-foreground">
                    {funcionario.name}
                  </span>
                  {(funcionario.cpf || (funcionario as any).document) && (
                    <span className="text-[11px] text-muted-foreground">
                      · CPF: {formatCPF(funcionario.cpf || (funcionario as any).document || '')}
                    </span>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-base font-semibold">
                  Cliente
                  <span className="block text-[11px] font-normal text-muted-foreground/80">
                    Destinatário da prestação de serviço.
                  </span>
                </Label>
                <Select
                  value={form.clientId}
                  onValueChange={(value) => setForm(prev => ({ ...prev, clientId: value }))}
                  disabled={loadingData}
                >
                  <SelectTrigger className="h-11 rounded-lg bg-black text-white border border-border/60 shadow-sm hover:bg-black/90 focus:ring-2 focus:ring-primary/30 focus:border-primary/60 [&>span]:text-left [&>span]:truncate">
                    <SelectValue placeholder={loadingData ? "Carregando..." : "Selecione o cliente"} />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg shadow-lg border bg-popover">
                    {loadingData ? (
                      <div className="p-2 text-center text-sm text-gray-500">Carregando clientes...</div>
                    ) : clients.length > 0 ? (
                      clients.map(c => (
                        <SelectItem key={c.id} value={c.id} className="py-2.5 cursor-pointer rounded-md">
                          {c.name}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-2 text-center text-sm text-gray-500">Nenhum cliente encontrado</div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {cliente && (
                <div className="mt-1.5 flex flex-wrap items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 border border-border/60 lg:col-span-1">
                  <Building className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-semibold text-foreground">
                    {cliente.name}
                  </span>
                  {cliente.cnpj && (
                    <span className="text-[11px] text-muted-foreground">
                      · CNPJ: {formatCNPJ(cliente.cnpj)}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Informações do Funcionário (Read-only) */}
            {funcionario && (
              <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-2 font-medium">
                    <User className="h-4 w-4 text-primary" />
                    Dados do Executante
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider">Nome</Label>
                      <div className="p-2.5 bg-muted rounded-md text-sm font-medium border border-transparent hover:border-border transition-colors truncate">
                        {funcionario.name}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider">CPF</Label>
                      <div className="p-2.5 bg-muted rounded-md text-sm font-medium border border-transparent hover:border-border transition-colors">
                        {funcionario.cpf || (funcionario as any).document ? formatCPF(funcionario.cpf || (funcionario as any).document || '') : '-'}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider">Cargo</Label>
                      <div className="p-2.5 bg-muted rounded-md text-sm font-medium border border-transparent hover:border-border transition-colors truncate">
                        {form.position || funcionario.positionName || (funcionario as any).position?.name || '-'}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider">Admissão</Label>
                      <div className="p-2.5 bg-muted rounded-md text-sm font-medium border border-transparent hover:border-border transition-colors">
                        {funcionario.hireDate ? new Date(funcionario.hireDate).toLocaleDateString('pt-BR') : '-'}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Posto de Trabalho / Setor</Label>
                    <div className="p-2.5 bg-muted rounded-md text-sm font-medium border border-transparent hover:border-border transition-colors truncate">
                      {(funcionario as any).workPostName || funcionario.unitName || (funcionario as any).departmentName || '-'}
                    </div>
                  </div>
                  {workPosts.length > 0 && (
                    <div className="space-y-1.5 mt-3">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider">Setor de Trabalho (Cliente)</Label>
                      <SearchableSelect
                        options={workPosts.map((wp: any) => ({
                          value: wp.id,
                          label: wp.name,
                          description: wp.address || ''
                        }))}
                        value={form.workPostId}
                        onChange={(value) => setForm(prev => ({ ...prev, workPostId: value }))}
                        disabled={loadingWorkPosts}
                        placeholder={loadingWorkPosts ? 'Carregando...' : 'Selecione o setor'}
                        searchPlaceholder="Buscar setor..."
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Informações do Cliente (Read-only) */}
            {cliente && (
              <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300 delay-100">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-2 font-medium">
                    <Building className="h-4 w-4 text-primary" />
                    Dados do Cliente
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Razão Social / Nome</Label>
                    <div className="p-2.5 bg-muted rounded-md text-sm font-medium border border-transparent hover:border-border transition-colors truncate">
                      {cliente.name}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Endereço</Label>
                    <div className="p-2.5 bg-muted rounded-md text-sm font-medium border border-transparent hover:border-border transition-colors truncate">
                      {cliente.address || '-'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {(funcionario || empresa) && <Separator />}

          {/* Detalhes do Serviço */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Briefcase className="h-4 w-4" />
              <span>Detalhes do Serviço</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Tipo de Serviço</Label>
                <Select value={form.serviceType} onValueChange={(value) => setForm(prev => ({ ...prev, serviceType: value }))}>
                  <SelectTrigger className="bg-background h-11">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {serviceTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Local de Serviço</Label>
                <Input
                  value={form.location}
                  onChange={(e) => setForm(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Endereço completo do local de serviço"
                  className="bg-background h-11"
                />
              </div>
            </div>

            {/* Datas e Horários */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Data de Início</Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm(prev => ({ ...prev, startDate: e.target.value }))}
                  className="bg-background"
                />
              </div>

              <div className="space-y-2">
                <Label>Data de Término</Label>
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm(prev => ({ ...prev, endDate: e.target.value }))}
                  className="bg-background"
                />
              </div>

              <div className="space-y-2">
                <Label>Horário de Início</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm(prev => ({ ...prev, startTime: e.target.value }))}
                    className="bg-background pl-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Horário de Término</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setForm(prev => ({ ...prev, endTime: e.target.value }))}
                    className="bg-background pl-9"
                  />
                </div>
              </div>
            </div>

            {/* Prioridade e Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select value={form.priority} onValueChange={(value) => setForm(prev => ({ ...prev, priority: value }))}>
                  <SelectTrigger className="bg-background h-11">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {priorityLevels.map(priority => (
                      <SelectItem key={priority} value={priority}>{priority}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(value) => setForm(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger className="bg-background h-11">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(status => (
                      <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição do Serviço</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descreva detalhadamente o serviço a ser prestado..."
                rows={4}
                className="bg-background resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={form.observations}
                onChange={(e) => setForm(prev => ({ ...prev, observations: e.target.value }))}
                placeholder="Observações adicionais sobre a ordem de serviço..."
                rows={3}
                className="bg-background resize-none"
              />
            </div>
            <Separator />
            
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <AlertTriangle className="h-4 w-4" />
                <span>Segurança e Medicina do Trabalho (NR-01)</span>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleApplyTemplate}
                disabled={!funcionario?.positionName}
                title="Preenche os campos baseado no cargo do funcionário selecionado"
              >
                <Briefcase className="h-4 w-4 mr-2" />
                Carregar Padrão do Cargo
              </Button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Atividades Habituais</Label>
                <Textarea
                  value={form.activities}
                  onChange={(e) => setForm(prev => ({ ...prev, activities: e.target.value }))}
                  placeholder="Descreva as atividades habituais..."
                  rows={3}
                  className="bg-background resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label>Riscos</Label>
                <Textarea
                  value={form.risks}
                  onChange={(e) => setForm(prev => ({ ...prev, risks: e.target.value }))}
                  placeholder="Ex: Riscos Ergonômicos: Postura inadequada..."
                  rows={2}
                  className="bg-background resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label>Medidas Preventivas</Label>
                <Textarea
                  value={form.preventiveMeasures}
                  onChange={(e) => setForm(prev => ({ ...prev, preventiveMeasures: e.target.value }))}
                  placeholder="Ex: Adoção de medidas de proteção..."
                  rows={2}
                  className="bg-background resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label>Uniforme de Uso Obrigatório</Label>
                <Textarea
                  value={form.uniform}
                  onChange={(e) => setForm(prev => ({ ...prev, uniform: e.target.value }))}
                  placeholder="Ex: Uniforme completo..."
                  rows={2}
                  className="bg-background resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label>Treinamentos Obrigatórios</Label>
                <Textarea
                  value={form.mandatoryTrainings}
                  onChange={(e) => setForm(prev => ({ ...prev, mandatoryTrainings: e.target.value }))}
                  placeholder="Ex: Treinamento de Ambientação, DSS..."
                  rows={3}
                  className="bg-background resize-none"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Ações */}
          <div className="flex flex-col-reverse sm:flex-row gap-4 justify-end pt-2">
            <Button
              type="button"
              onClick={handlePreviewOrder}
              variant="outline"
              className="flex items-center gap-2 w-full sm:w-auto h-11"
              disabled={loading || !funcionario || !empresa || !cliente}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Gerando Preview...
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4" />
                  Visualizar Ordem
                </>
              )}
            </Button>
            <Button
              type="button"
              onClick={handleGenerateOrder}
              className="flex items-center gap-2 w-full sm:w-auto h-11 shadow-md hover:shadow-lg transition-all"
              disabled={loading || !funcionario || !empresa || !cliente}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Gerando PDF...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Gerar e Baixar
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrdemServicosForm;