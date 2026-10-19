import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { FileText, Download, Eye, User, Building, Calendar, Clock, MapPin, AlertTriangle, CheckCircle2, Loader2, Briefcase, Stamp } from 'lucide-react';
import { employeeService, SimpleEmployee, employeeToSimpleEmployee } from '@/services/employeeService';
import { SearchableSelect } from '../ui/searchable-select';
import { EmployeeCombobox } from '../ui/employee-combobox';

import { companyService } from '@/services/companyService';
import { clientService, Client } from '@/services/clientService';
import { workPostService } from '@/services/workPostService';
import {
  SST_PROFESSIONAL_TYPE_LABELS,
  SstProfessional,
  sstProfessionalService,
} from '@/services/sstProfessionalService';
import { formatCPF, formatCNPJ } from '@/utils/validation';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/axios';
import { refreshEmployeeDocuments } from '@/utils/refreshEmployeeDocuments';
import { employeeAdmissionIsoDate, employeeAdmissionIsoDateOrToday } from '@/utils/employeeAdmissionDate';
import {
  applyOrdemServicoTemplate,
  findOrdemServicoTemplate,
  resolveServiceTypesForContext,
  type OrdemServicoTemplateContext,
  type OsLayoutType,
} from '@/data/ordemServicoSafetyTemplates';

const todayIso = () => new Date().toISOString().split('T')[0];

type ClientPreview = Pick<Client, 'id' | 'name' | 'cnpj' | 'address'>;

function resolveClientIdFromWorkPost(wp?: { clientId?: string; client?: { id?: string } }): string {
  return wp?.clientId || wp?.client?.id || '';
}

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
    layoutType: 'STANDARD_NR01' as OsLayoutType,
    responsibility: '',
    employeeObligations: '',
    revision: '',
    documentDate: todayIso(),
    city: 'Contagem',
    hireDate: '',
    activities: '',
    risks: '',
    preventiveMeasures: '',
    uniform: '',
    uniformSectionTitle: '',
    mandatoryTrainings: '',
    accidentProcedure: '',
    safetyEngineerId: '',
  });

  const [activeTemplateLabel, setActiveTemplateLabel] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [selectedEmployeeData, setSelectedEmployeeData] = useState<SimpleEmployee | null>(null);
  const [companies, setCompanies] = useState<any[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [workPosts, setWorkPosts] = useState<any[]>([]);
  const [loadingWorkPosts, setLoadingWorkPosts] = useState(false);
  const [syncingEmployeeContext, setSyncingEmployeeContext] = useState(false);
  const [resolvedClientPreview, setResolvedClientPreview] = useState<ClientPreview | null>(null);
  const [sstProfessionals, setSstProfessionals] = useState<SstProfessional[]>([]);
  const [loadingSst, setLoadingSst] = useState(false);

  const funcionario = selectedEmployeeData;
  const empresa = companies.find(e => e.id === form.companyId);
  const selectedWorkPost = workPosts.find((wp) => wp.id === form.workPostId);
  const cliente = form.clientId ? clients.find((c) => c.id === form.clientId) : undefined;
  const selectedSst = sstProfessionals.find((p) => p.id === form.safetyEngineerId);

  const stampSrc = (url?: string) => {
    if (!url) return null;
    if (url.startsWith('blob:') || url.startsWith('data:')) return url;
    const fileName = url.replace(/^.*\//, '');
    if (!fileName) return null;
    return `/api/uploads/safety-engineers/stamps/${fileName}`;
  };

  const activeProfessionals = sstProfessionals.filter(
    (p) => p.active !== false,
  );

  /** Exibe cliente da lista, preview resolvido do posto ou dados do posto selecionado */
  const clienteExibicao =
    cliente ??
    resolvedClientPreview ??
    (selectedWorkPost?.clientName
      ? {
          id: selectedWorkPost.clientId || '',
          name: selectedWorkPost.clientName,
          cnpj: undefined as string | undefined,
          address: selectedWorkPost.address,
        }
      : null);

  const getTemplateContext = useCallback(
    (overrides?: Partial<OrdemServicoTemplateContext>): OrdemServicoTemplateContext => {
      const selectedWorkPost = workPosts.find((wp) => wp.id === form.workPostId);
      const sectorName =
        overrides?.sector ??
        selectedWorkPost?.name ??
        funcionario?.workPostName ??
        funcionario?.unitName ??
        funcionario?.departmentName ??
        '';
      return {
        positionName: overrides?.positionName || form.position || funcionario?.positionName || '',
        companyName: overrides?.companyName ?? empresa?.name,
        companySigla: overrides?.companySigla ?? empresa?.sigla,
        sector: sectorName,
        clientName:
          overrides?.clientName ||
          clienteExibicao?.name ||
          selectedWorkPost?.clientName ||
          '',
      };
    },
    [form.position, form.workPostId, funcionario, empresa, cliente, workPosts],
  );

  const applyTemplateForContext = useCallback(
    (ctx: OrdemServicoTemplateContext, options?: { silent?: boolean }) => {
      const tpl = findOrdemServicoTemplate(ctx);
      if (!tpl) {
        setActiveTemplateLabel(null);
        return false;
      }
      setActiveTemplateLabel(tpl.label);
      setForm((prev) => ({
        ...prev,
        ...applyOrdemServicoTemplate(tpl, prev, { overwrite: true }),
      }));
      if (!options?.silent) {
        toast({
          title: 'Conteúdo do cargo carregado',
          description: `PDR aplicado: ${tpl.label}. Você pode editar os campos antes de gerar o PDF.`,
        });
      }
      return true;
    },
    [toast],
  );

  useEffect(() => {
    setForm(prev => ({
      ...prev,
      employeeId: employeeId || prev.employeeId,
      companyId: companyId || prev.companyId
    }));
  }, [employeeId, companyId]);

  useEffect(() => {
    const companyIdToLoad = form.companyId;
    if (!companyIdToLoad) {
      setSstProfessionals([]);
      setForm((prev) => (prev.safetyEngineerId ? { ...prev, safetyEngineerId: '' } : prev));
      return;
    }

    let cancelled = false;
    const loadSst = async () => {
      setLoadingSst(true);
      try {
        const list = await sstProfessionalService.listByCompany(companyIdToLoad);
        if (cancelled) return;
        const active = (list || []).filter((p) => p.active !== false);
        setSstProfessionals(active);
        setForm((prev) => {
          const stillValid = active.some((p) => p.id === prev.safetyEngineerId);
          if (stillValid) return prev;
          const preferred =
            active.find((p) => p.companyDefault && p.stampImageUrl) ||
            active.find((p) => p.stampImageUrl) ||
            active[0];
          return { ...prev, safetyEngineerId: preferred?.id || '' };
        });
      } catch (err) {
        console.error('Erro ao carregar profissionais de SST:', err);
        if (!cancelled) setSstProfessionals([]);
      } finally {
        if (!cancelled) setLoadingSst(false);
      }
    };
    void loadSst();
    return () => {
      cancelled = true;
    };
  }, [form.companyId]);

  const resolveClientFromWorkPost = useCallback(
    async (
      wp: Awaited<ReturnType<typeof workPostService.getWorkPostById>>,
      clientsList: Client[],
    ): Promise<ClientPreview | null> => {
      const clientId = wp.clientId || '';
      if (clientId) {
        const fromList = clientsList.find((c) => c.id === clientId);
        if (fromList) {
          return {
            id: fromList.id,
            name: fromList.name,
            cnpj: fromList.cnpj,
            address: fromList.address || wp.address,
          };
        }
        try {
          const fetched = await clientService.getClientById(clientId);
          setClients((prev) =>
            prev.some((c) => c.id === fetched.id) ? prev : [...prev, fetched],
          );
          return {
            id: fetched.id,
            name: fetched.name,
            cnpj: fetched.cnpj,
            address: fetched.address || wp.address,
          };
        } catch {
          // segue com dados mínimos do posto
        }
      }
      if (wp.clientName) {
        return {
          id: clientId,
          name: wp.clientName,
          address: wp.address,
        };
      }
      return null;
    },
    [],
  );

  const syncEmployeeWorkContext = useCallback(async (empId: string) => {
    if (!empId) {
      setResolvedClientPreview(null);
      return;
    }
    setSyncingEmployeeContext(true);
    try {
      const full = await employeeService.getEmployeeById(empId);
      if (!full) {
        setResolvedClientPreview(null);
        return;
      }

      const simple = employeeToSimpleEmployee(full);
      setSelectedEmployeeData(simple);

      setForm((prev) => {
        const resolvedCompanyId = simple.companyId || prev.companyId || companyId || '';
        return { ...prev, companyId: resolvedCompanyId, position: full.position?.name || prev.position };
      });

      let workPostId = simple.workPostId;
      const sectorLabel = simple.workPostName || simple.unitName || simple.departmentName;
      const resolvedCompanyId = simple.companyId || companyId || '';

      if (!workPostId && sectorLabel && resolvedCompanyId) {
        const posts = await workPostService.getWorkPostsByCompany(resolvedCompanyId);
        const normalized = sectorLabel.trim().toLowerCase();
        const match = posts.find((p) => {
          const name = (p.name || '').trim().toLowerCase();
          return name === normalized || name.includes(normalized) || normalized.includes(name);
        });
        workPostId = match?.id;
      }

      let wpResolved: Awaited<ReturnType<typeof workPostService.getWorkPostById>> | null = null;
      let clientPreview: ClientPreview | null = null;

      if (workPostId) {
        wpResolved = await workPostService.getWorkPostById(workPostId);
        clientPreview = await resolveClientFromWorkPost(wpResolved, clients);
        setResolvedClientPreview(clientPreview);
        setForm((prev) => ({
          ...prev,
          companyId: simple.companyId || prev.companyId,
          workPostId: wpResolved!.id,
          clientId: wpResolved!.clientId || clientPreview?.id || '',
          location: wpResolved!.address || prev.location,
          position: full.position?.name || prev.position,
          hireDate: full.hireDate ? String(full.hireDate).split('T')[0] : prev.hireDate,
          documentDate: employeeAdmissionIsoDateOrToday(full.hireDate),
        }));
      } else {
        setResolvedClientPreview(null);
        setForm((prev) => ({
          ...prev,
          hireDate: full.hireDate ? String(full.hireDate).split('T')[0] : prev.hireDate,
          documentDate: employeeAdmissionIsoDateOrToday(full.hireDate),
        }));
      }

      applyTemplateForContext({
        positionName: full.position?.name || simple.positionName,
        companyName: full.company?.name ?? empresa?.name,
        companySigla: full.company?.sigla,
        sector:
          wpResolved?.name ??
          simple.workPostName ??
          simple.unitName ??
          simple.departmentName ??
          '',
        clientName: clientPreview?.name ?? wpResolved?.clientName ?? '',
      });
    } catch (error) {
      console.error('Erro ao sincronizar posto/cliente do funcionário:', error);
      setResolvedClientPreview(null);
      toast({
        title: 'Erro ao carregar cliente',
        description: 'Não foi possível vincular o posto de trabalho ao cliente deste funcionário.',
        variant: 'destructive',
      });
    } finally {
      setSyncingEmployeeContext(false);
    }
  }, [companyId, clients, toast, applyTemplateForContext, empresa?.name, empresa?.sigla, resolveClientFromWorkPost]);

  useEffect(() => {
    if (form.employeeId) {
      void syncEmployeeWorkContext(form.employeeId);
    }
  }, [form.employeeId, syncEmployeeWorkContext]);

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

  // Pre-fill position and suggested serviceType when employee changes
  useEffect(() => {
    if (funcionario) {
      const pos =
        (funcionario as any).position?.name ||
        funcionario.positionName ||
        form.position;
      const isBombeiro = (pos || '').toUpperCase().includes('BOMBEIRO');
      setForm(prev => ({
        ...prev,
        position: pos || prev.position,
        serviceType: prev.serviceType || (isBombeiro ? 'Bombeiro Civil' : prev.serviceType)
      }));
    }
  }, [funcionario]);

  // Pre-fill location when client is resolved
  useEffect(() => {
    if (cliente?.address) {
      setForm(prev => ({
        ...prev,
        location: cliente.address || prev.location
      }));
    }
  }, [cliente?.id, cliente?.address]);

  // Load work posts by client or company
  useEffect(() => {
    if (!form.companyId) {
      setWorkPosts([]);
      return;
    }

    let cancelled = false;
    const fetchWorkPosts = async () => {
      setLoadingWorkPosts(true);
      try {
        const posts = form.clientId
          ? await workPostService.getWorkPostsByClient(form.clientId)
          : await workPostService.getWorkPostsByCompany(form.companyId);
        if (!cancelled) setWorkPosts(posts ?? []);
      } catch (e) {
        console.error('Erro ao buscar postos:', e);
        if (!cancelled) setWorkPosts([]);
      } finally {
        if (!cancelled) setLoadingWorkPosts(false);
      }
    };
    fetchWorkPosts();
    return () => { cancelled = true; };
  }, [form.companyId, form.clientId]);

  const handleWorkPostChange = async (value: string) => {
    const wp = workPosts.find(w => w.id === value);
    const clientId = resolveClientIdFromWorkPost(wp) || wp?.clientId || '';
    setForm(prev => ({
      ...prev,
      workPostId: value,
      clientId,
      location: wp?.address || prev.location,
    }));
    if (wp?.clientName || clientId) {
      setResolvedClientPreview({
        id: clientId,
        name: wp?.clientName || '',
        address: wp?.address,
      });
    } else if (clientId) {
      try {
        const fetched = await clientService.getClientById(clientId);
        setResolvedClientPreview(fetched);
        setClients((prev) =>
          prev.some((c) => c.id === fetched.id) ? prev : [...prev, fetched],
        );
      } catch {
        setResolvedClientPreview(null);
      }
    } else {
      setResolvedClientPreview(null);
    }
    if (funcionario) {
      setTimeout(() => {
        applyTemplateForContext(getTemplateContext({ sector: wp?.name, clientName: wp?.clientName }), {
          silent: true,
        });
      }, 0);
    }
  };

  const handleApplyTemplate = () => {
    const ctx = getTemplateContext();
    if (!applyTemplateForContext(ctx)) {
      toast({
        title: 'Template não encontrado',
        description: `Não há PDR configurado para o cargo: ${ctx.positionName || '—'}.`,
        variant: 'destructive',
      });
      return;
    }
    toast({
      title: 'Template aplicado',
      description: 'Conteúdo recarregado conforme cargo, empresa e setor.',
    });
  };

  const buildOsPayload = async () => {
    const fullEmployee = await employeeService.getEmployeeById(funcionario!.id);
    if (!fullEmployee) throw new Error('Funcionário não encontrado');

    const selectedWorkPost = workPosts.find((wp) => wp.id === form.workPostId);
    const sectorName =
      selectedWorkPost?.name ||
      (fullEmployee as any).workPost?.name ||
      (fullEmployee as any).unit?.name ||
      (fullEmployee as any).department?.name ||
      '';

    return {
      companyId: empresa!.id,
      employeeId: fullEmployee.id,
      employeeName: fullEmployee.name,
      employeeCpf: fullEmployee.cpf || fullEmployee.document || '',
      employeePosition: fullEmployee.position?.name || form.position || '',
      sector: sectorName,
      clientName: clienteExibicao!.name,
      clientAddress: clienteExibicao!.address || '',
      serviceType: form.serviceType || form.responsibility,
      location: form.location,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      startTime: form.startTime,
      endTime: form.endTime,
      priority: form.priority,
      status: form.status,
      description: form.description,
      observations: form.observations,
      city: form.city || empresa!.city || 'Contagem',
      documentDate: form.documentDate || employeeAdmissionIsoDateOrToday(fullEmployee.hireDate),
      responsibility: form.responsibility,
      employeeObligations: form.employeeObligations,
      revision: form.revision,
      hireDate: employeeAdmissionIsoDate(form.hireDate || fullEmployee.hireDate) || null,
      layoutType: form.layoutType,
      activities: form.activities,
      risks: form.risks,
      preventiveMeasures: form.preventiveMeasures,
      uniform: form.uniform,
      uniformSectionTitle: form.uniformSectionTitle || undefined,
      mandatoryTrainings: form.mandatoryTrainings,
      accidentProcedure: form.accidentProcedure,
      safetyEngineerId: form.safetyEngineerId || undefined,
      stampImageUrl: selectedSst?.stampImageUrl || undefined,
    };
  };

  const serviceTypes = useMemo(() => {
    return resolveServiceTypesForContext({
      positionName: form.position || funcionario?.positionName,
      activities: form.activities,
      currentServiceType: form.serviceType,
    });
  }, [form.position, funcionario?.positionName, form.activities, form.serviceType]);

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

  const extractBlobErrorMessage = async (err: any, fallback: string) => {
    const blob = err?.response?.data;
    if (!(blob instanceof Blob)) {
      return err?.response?.data?.message || fallback;
    }

    try {
      const text = await blob.text();
      if (!text) return fallback;

      try {
        const parsed = JSON.parse(text);
        return parsed?.message || parsed?.error || fallback;
      } catch {
        return text;
      }
    } catch {
      return fallback;
    }
  };

  const handleGenerateOrder = async () => {
    if (!funcionario || !empresa || !clienteExibicao || !form.activities?.trim()) {
      toast({
        title: 'Atenção',
        description:
          'Preencha funcionário, empresa, posto com cliente e as atividades habituais (NR-01).',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const payload = await buildOsPayload();

      const response = await api.post('/api/operational-service-order/generate-pdf', payload, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ordem-servico-${payload.employeeName.replace(/\s+/g, '-').toLowerCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Sucesso',
        description: 'Ordem de Serviço gerada com sucesso!',
      });
      void refreshEmployeeDocuments(payload.employeeId);
    } catch (err: any) {
      console.error('Erro ao gerar OS:', err);
      const errorMessage = await extractBlobErrorMessage(err, 'Erro ao gerar Ordem de Serviço.');
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewOrder = async () => {
    if (!funcionario || !empresa || !clienteExibicao || !form.activities?.trim()) {
      toast({
        title: 'Atenção',
        description:
          'Preencha funcionário, empresa, posto com cliente e as atividades habituais (NR-01).',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const payload = await buildOsPayload();

      const response = await api.post('/api/operational-service-order/preview-pdf', payload, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');

      setTimeout(() => window.URL.revokeObjectURL(url), 100);
    } catch (err: any) {
      console.error('Erro ao gerar preview:', err);
      const errorMessage = await extractBlobErrorMessage(err, 'Erro ao gerar preview.');
      toast({
        title: 'Erro',
        description: errorMessage,
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
                {activeTemplateLabel ? ` Modelo aplicado: ${activeTemplateLabel}.` : ''}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {activeTemplateLabel && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 px-3 py-1">
                  Modelo: {activeTemplateLabel}
                </Badge>
              )}
              {(funcionario && empresa && clienteExibicao && form.activities) && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1 px-3 py-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Pronto para gerar
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-8">

          {/* Identificação */}
          <div className="bg-muted/30 p-6 rounded-xl border space-y-6">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
              <User className="h-4 w-4" />
              <span>Identificação</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

              <div className="space-y-2 md:col-span-2">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Stamp className="h-4 w-4 text-amber-500" />
                  Carimbo SST (3º quadro do PDF)
                  <span className="block text-[11px] font-normal text-muted-foreground/80 w-full">
                    Imagem do profissional de SST que aparece à direita do cabeçalho da Ordem de Serviço.
                    Se houver mais de um cadastrado, escolha qual carimbo usar.
                  </span>
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-start">
                  <Select
                    value={form.safetyEngineerId || 'NONE'}
                    onValueChange={(value) => setForm((prev) => ({ ...prev, safetyEngineerId: value === 'NONE' ? '' : value }))}
                    disabled={loadingSst || !form.companyId}
                  >
                    <SelectTrigger className="h-11 rounded-lg bg-black text-white border border-border/60">
                      <SelectValue
                        placeholder={
                          loadingSst
                            ? 'Carregando profissionais...'
                            : activeProfessionals.length === 0
                              ? 'Nenhum profissional SST cadastrado'
                              : 'Selecione o carimbo / profissional'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">
                        Nenhum — Exibir apenas &quot;Saúde e Segurança do trabalho&quot;
                      </SelectItem>
                      {activeProfessionals.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                          {p.creaNumber ? ` — ${p.creaNumber}` : ''}
                          {p.stampImageUrl ? ' (com carimbo)' : ' (somente texto)'}
                          {p.companyDefault ? ' (padrão)' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedSst ? (
                    selectedSst.stampImageUrl ? (
                      <div className="rounded border border-border bg-white/5 p-2 inline-flex flex-col items-center gap-1 min-w-[180px]">
                        <span className="text-[10px] font-bold text-cyan-400">Saúde e Segurança do trabalho</span>
                        <img
                          src={stampSrc(selectedSst.stampImageUrl) || ''}
                          alt={`Carimbo de ${selectedSst.name}`}
                          className="max-h-20 max-w-[170px] object-contain"
                          onError={(e) => {
                            const target = e.currentTarget;
                            target.onerror = null;
                            target.style.display = 'none';
                            if (target.parentElement && !target.parentElement.querySelector('.stamp-fallback')) {
                              const fallback = document.createElement('div');
                              fallback.className = 'stamp-fallback text-xs text-center py-1';
                              fallback.innerHTML = `<div className="font-bold text-white">${selectedSst.name}</div><div className="text-[10px] text-muted-foreground">${SST_PROFESSIONAL_TYPE_LABELS[selectedSst.professionalType] || selectedSst.professionalType}</div>${selectedSst.creaNumber ? `<div className="text-[10px] text-muted-foreground">${selectedSst.creaNumber}</div>` : ''}`;
                              target.parentElement.appendChild(fallback);
                            }
                          }}
                        />
                        <span className="text-[10px] text-muted-foreground text-center">
                          {SST_PROFESSIONAL_TYPE_LABELS[selectedSst.professionalType] || selectedSst.professionalType}
                        </span>
                      </div>
                    ) : (
                      <div className="rounded border border-border bg-white/5 p-2.5 inline-flex flex-col items-center justify-center text-center min-w-[180px] min-h-[70px]">
                        <span className="text-[10px] font-bold text-cyan-400">Saúde e Segurança do trabalho</span>
                        <span className="text-xs font-bold text-white mt-0.5">{selectedSst.name}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {SST_PROFESSIONAL_TYPE_LABELS[selectedSst.professionalType] || selectedSst.professionalType}
                        </span>
                        {selectedSst.creaNumber && (
                          <span className="text-[10px] text-muted-foreground font-mono">{selectedSst.creaNumber}</span>
                        )}
                      </div>
                    )
                  ) : (
                    <div className="rounded border border-border bg-white/5 p-2.5 inline-flex flex-col items-center justify-center text-center min-w-[180px] min-h-[70px]">
                      <span className="text-[10px] font-bold text-cyan-400">Saúde e Segurança do trabalho</span>
                      <span className="text-[10px] text-muted-foreground/80 mt-1 italic">(Profissional não definido)</span>
                    </div>
                  )}
                </div>
              </div>

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
                  {(workPosts.length > 0 || loadingWorkPosts) && (
                    <div className="space-y-1.5 mt-3">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider">Setor de Trabalho</Label>
                      <SearchableSelect
                        options={workPosts.map((wp: any) => ({
                          value: wp.id,
                          label: wp.clientName ? `${wp.name} (${wp.clientName})` : wp.name,
                          description: wp.address || ''
                        }))}
                        value={form.workPostId}
                        onChange={handleWorkPostChange}
                        disabled={loadingWorkPosts}
                        placeholder={loadingWorkPosts ? 'Carregando...' : 'Selecione o setor'}
                        searchPlaceholder="Buscar setor..."
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Cliente derivado do posto de trabalho */}
            {funcionario && (
              <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300 delay-100">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-2 font-medium">
                    <Building className="h-4 w-4 text-primary" />
                    Dados do Cliente
                  </div>
                </div>
                {syncingEmployeeContext ? (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Carregando posto e cliente do funcionário…
                  </p>
                ) : clienteExibicao ? (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider">Razão Social / Nome</Label>
                      <div className="p-2.5 bg-muted rounded-md text-sm font-medium border border-transparent hover:border-border transition-colors truncate">
                        {clienteExibicao.name}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider">CNPJ</Label>
                      <div className="p-2.5 bg-muted rounded-md text-sm font-medium border border-transparent hover:border-border transition-colors truncate">
                        {clienteExibicao.cnpj ? formatCNPJ(clienteExibicao.cnpj) : '-'}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider">Endereço</Label>
                      <div className="p-2.5 bg-muted rounded-md text-sm font-medium border border-transparent hover:border-border transition-colors truncate">
                        {clienteExibicao.address || '-'}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Não foi possível identificar o cliente. Verifique se o funcionário possui posto de trabalho vinculado.
                  </p>
                )}
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
                <Label>
                  {form.layoutType === 'BOMBEIRO_CIVIL'
                    ? "EPI's / EPC's de Uso Obrigatório"
                    : 'Uniforme de Uso Obrigatório'}
                </Label>
                <Textarea
                  value={form.uniform}
                  onChange={(e) => setForm(prev => ({ ...prev, uniform: e.target.value }))}
                  placeholder="Ex: Uniforme completo..."
                  rows={2}
                  className="bg-background resize-none"
                />
              </div>

              {form.layoutType === 'BOMBEIRO_CIVIL' && (
                <div className="space-y-2">
                  <Label>Procedimento em Caso de Acidentes</Label>
                  <Textarea
                    value={form.accidentProcedure}
                    onChange={(e) => setForm((prev) => ({ ...prev, accidentProcedure: e.target.value }))}
                    placeholder="Passos em caso de acidente..."
                    rows={4}
                    className="bg-background resize-none"
                  />
                </div>
              )}

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
              disabled={loading || !funcionario || !empresa || !clienteExibicao}
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
              disabled={loading || !funcionario || !empresa || !clienteExibicao}
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
