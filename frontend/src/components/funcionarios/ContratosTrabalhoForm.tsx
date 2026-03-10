import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Calendar, User, Building, FileText, Download, Eye, Loader2, CheckCircle2, Clock, Briefcase } from 'lucide-react';
import { employeeService, Employee } from '@/services/employeeService';
import { companyService } from '@/services/companyService';
import { costCenterService, CostCenterDTO } from '@/services/costCenterService';
import { formatCPF, formatCNPJ } from '@/utils/validation';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/axios';

interface ContratosTrabalhoFormProps {
  employeeId?: string;
  companyId?: string;
}

const ContratosTrabalhoForm: React.FC<ContratosTrabalhoFormProps> = ({ employeeId, companyId }) => {
  const { toast } = useToast();
  const [form, setForm] = useState({
    employeeId: employeeId || '',
    companyId: companyId || '',
    position: '',
    contractType: '',
    startDate: '',
    endDate: '',
    salary: '',
    workSchedule: '',
    department: '',
    supervisor: '',
    benefits: [] as string[],
    observations: '',
    experienceDuration: '', // 45, 60 ou 90 dias
  });

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenterDTO[]>([]);

  const funcionario = employees.find(f => f.id === form.employeeId);
  const empresa = companies.find(e => e.id === form.companyId);
  const costCenter = costCenters.find(cc => cc.id === form.department || cc.name === form.department);

  useEffect(() => {
    setForm(prev => ({
      ...prev,
      employeeId: employeeId || prev.employeeId,
      companyId: companyId || prev.companyId
    }));
  }, [employeeId, companyId]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoadingData(true);
    try {
      const [employeesData, companiesData, costCentersData] = await Promise.all([
        employeeService.getAllEmployees(),
        companyService.getAllCompanies(),
        costCenterService.listActive()
      ]);
      setEmployees(employeesData);
      setCompanies(companiesData);
      setCostCenters(Array.isArray(costCentersData) ? costCentersData : []);
      console.log('📊 Centros de Custo carregados:', costCentersData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar funcionários, empresas e centros de custos.',
        variant: 'destructive'
      });
    } finally {
      setLoadingData(false);
    }
  };

  // Pre-fill some fields when employee is selected
  useEffect(() => {
    if (funcionario) {
      // Try to find cost center by unit name
      const unitName = (funcionario as any).unit?.name;
      const matchingCostCenter = unitName
        ? costCenters.find(cc => cc.name.toLowerCase() === unitName.toLowerCase())
        : null;

      setForm(prev => ({
        ...prev,
        position: (funcionario as any).position?.name || prev.position,
        department: matchingCostCenter?.id || prev.department,
        startDate: funcionario.hireDate ? funcionario.hireDate.split('T')[0] : prev.startDate,
      }));
    }
  }, [funcionario, costCenters]);

  // Auto-calculate end date for experience contracts
  useEffect(() => {
    if (form.contractType === 'Contrato de Experiência' && form.startDate && form.experienceDuration) {
      const startDate = new Date(form.startDate);
      const durationDays = parseInt(form.experienceDuration);

      if (!isNaN(startDate.getTime()) && !isNaN(durationDays)) {
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + durationDays);

        setForm(prev => ({
          ...prev,
          endDate: endDate.toISOString().split('T')[0]
        }));
      }
    }
  }, [form.contractType, form.startDate, form.experienceDuration]);

  const contractTypes = [
    'CLT - Efetivo',
    'CLT - Temporário',
    'Contrato de Experiência',
    'PJ - Prestador de Serviços',
    'Estagiário',
    'Aprendiz',
    'Terceirizado',
    'Intermitente',
  ];

  const experienceDurations = [
    { value: '45', label: '45 dias' },
    { value: '60', label: '60 dias' },
    { value: '90', label: '90 dias' },
  ];

  const benefitOptions = [
    'Vale Transporte',
    'Vale Refeição',
    'Vale Alimentação',
    'Plano de Saúde',
    'Plano Odontológico',
    'Seguro de Vida',
    'Auxílio Creche',
    'Gympass',
    'PLR',
  ];

  const handleBenefitToggle = (benefit: string) => {
    setForm(prev => ({
      ...prev,
      benefits: prev.benefits.includes(benefit)
        ? prev.benefits.filter(b => b !== benefit)
        : [...prev.benefits, benefit]
    }));
  };

  const validateForm = () => {
    if (!funcionario || !empresa) {
      toast({
        title: 'Atenção',
        description: 'Selecione funcionário e empresa!',
        variant: 'destructive'
      });
      return false;
    }
    if (!form.contractType || !form.startDate || !form.salary || !form.position) {
      toast({
        title: 'Atenção',
        description: 'Preencha os campos obrigatórios (Tipo, Data Início, Salário, Cargo)!',
        variant: 'destructive'
      });
      return false;
    }
    if (form.contractType === 'Contrato de Experiência' && !form.experienceDuration) {
      toast({
        title: 'Atenção',
        description: 'Selecione a duração do período de experiência (45, 60 ou 90 dias)!',
        variant: 'destructive'
      });
      return false;
    }
    return true;
  };

  const preparePayload = async () => {
    // Buscar dados completos do funcionário
    const fullEmployee = await employeeService.getEmployeeById(funcionario!.id);
    if (!fullEmployee) throw new Error('Funcionário não encontrado');

    const addressValue = typeof fullEmployee.address === 'string'
      ? fullEmployee.address
      : fullEmployee.address?.street || '';

    return {
      companyId: empresa!.id,
      employeeName: fullEmployee.name,
      employeeCpf: fullEmployee.cpf || fullEmployee.document || '',
      employeeRg: fullEmployee.rg || '',
      employeeAddress: addressValue,
      employeeCtps: (fullEmployee as any).ctps || '',
      employeeCtpsSeries: (fullEmployee as any).ctpsSeries || '',
      position: form.position,
      department: costCenter?.name || form.department || '',
      salary: form.salary ? parseFloat(form.salary.replace(/\./g, '').replace(',', '.')) : 0,
      admissionDate: form.startDate || null,
      workHoursDescription: '44 horas semanais', // Placeholder or add form field if exists
      workSchedule: form.workSchedule || 'a definir',
      city: empresa!.address && typeof empresa!.address === 'string' ? empresa!.address.split(',')[0] : '',
      contractDate: new Date().toISOString().split('T')[0]
    };
  };

  const handleGenerateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const payload = await preparePayload();

      const response = await api.post('/api/employment-contract/generate-pdf', payload, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contrato-trabalho-${funcionario!.name.replace(/\s+/g, '-').toLowerCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Sucesso',
        description: 'Contrato de Trabalho gerado com sucesso!',
      });
    } catch (err: any) {
      console.error('Erro ao gerar contrato:', err);
      toast({
        title: 'Erro',
        description: err.response?.data?.message || 'Erro ao gerar contrato.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewContract = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const payload = await preparePayload();

      const response = await api.post('/api/employment-contract/preview-pdf', payload, {
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
        description: 'Erro ao gerar preview do contrato.',
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
                Contrato de Trabalho
              </CardTitle>
              <CardDescription>
                Elaboração e emissão de contratos de trabalho.
              </CardDescription>
            </div>
            {(funcionario && empresa && form.contractType) && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1 px-3 py-1">
                <CheckCircle2 className="h-3 w-3" />
                Pronto para gerar
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-8">

          {/* Identificação das Partes */}
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b bg-muted/40">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm font-semibold text-foreground">Identificação das Partes</span>
              </div>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">
                    Funcionário
                    <span className="block text-[11px] font-normal text-muted-foreground/80">
                      Selecione o colaborador que terá o contrato gerado.
                    </span>
                  </Label>
                  <Select
                    value={form.employeeId}
                    onValueChange={(value) => setForm(prev => ({ ...prev, employeeId: value }))}
                    disabled={loadingData}
                  >
                    <SelectTrigger className="h-12 rounded-lg border border-input bg-muted/40 text-foreground font-medium shadow-sm transition-colors hover:bg-muted/60 focus:ring-2 focus:ring-primary/20 focus:border-primary/50 [&>span]:line-clamp-2 [&>span]:text-left [&>span]:normal-case">
                      <SelectValue placeholder={loadingData ? "Carregando..." : "Selecione o funcionário"} />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg shadow-lg border bg-popover">
                      {loadingData ? (
                        <div className="p-3 text-center text-sm text-muted-foreground">Carregando funcionários...</div>
                      ) : employees.length > 0 ? (
                        employees.map(f => (
                          <SelectItem key={f.id} value={f.id} className="py-2.5 cursor-pointer rounded-md">
                            <div className="flex flex-col gap-0.5 text-left">
                              <span className="font-medium normal-case">{f.name}</span>
                              {(f.cpf || (f as any).document) && (
                                <span className="text-xs text-muted-foreground">
                                  CPF: {formatCPF(f.cpf || (f as any).document || '')}
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <div className="p-3 text-center text-sm text-muted-foreground">Nenhum funcionário encontrado</div>
                      )}
                    </SelectContent>
                  </Select>
                  {funcionario && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 border border-border/60">
                      <User className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-semibold text-foreground">
                        {funcionario.name}
                      </span>
                      {(funcionario.cpf || (funcionario as any).document) && (
                        <span className="text-[11px] text-muted-foreground">
                          · CPF: {formatCPF(funcionario.cpf || (funcionario as any).document || '')}
                        </span>
                      )}
                      {(funcionario as any).position?.name && (
                        <span className="text-[11px] text-muted-foreground">
                          · Cargo: {(funcionario as any).position?.name}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">
                    Empresa
                    <span className="block text-[11px] font-normal text-muted-foreground/80">
                      Escolha a empresa empregadora que assinará o contrato.
                    </span>
                  </Label>
                  <Select
                    value={form.companyId}
                    onValueChange={(value) => setForm(prev => ({ ...prev, companyId: value }))}
                    disabled={loadingData}
                  >
                    <SelectTrigger className="h-12 rounded-lg border border-input bg-muted/40 text-foreground font-medium shadow-sm transition-colors hover:bg-muted/60 focus:ring-2 focus:ring-primary/20 focus:border-primary/50 [&>span]:line-clamp-2 [&>span]:text-left [&>span]:normal-case">
                      <SelectValue placeholder={loadingData ? "Carregando..." : "Selecione a empresa"} />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg shadow-lg border bg-popover">
                      {loadingData ? (
                        <div className="p-3 text-center text-sm text-muted-foreground">Carregando empresas...</div>
                      ) : companies.length > 0 ? (
                        companies.map(e => (
                          <SelectItem key={e.id} value={e.id} className="py-2.5 cursor-pointer rounded-md">
                            <div className="flex flex-col gap-0.5 text-left">
                              <span className="font-medium normal-case">
                                {e.sigla || e.tradeName || e.name}
                              </span>
                              {(e.sigla || e.tradeName) && e.name && (
                                <span className="text-xs text-muted-foreground">{e.name}</span>
                              )}
                              {e.cnpj && (
                                <span className="text-[11px] text-muted-foreground">
                                  CNPJ: {formatCNPJ(e.cnpj)}
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <div className="p-3 text-center text-sm text-muted-foreground">Nenhuma empresa encontrada</div>
                      )}
                    </SelectContent>
                  </Select>
                  {empresa && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 border border-border/60">
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
                </div>
              </div>
            </div>
          </div>

          <div className={`grid grid-cols-1 gap-5 ${funcionario && empresa && costCenter
            ? 'lg:grid-cols-3'
            : funcionario && empresa
              ? 'lg:grid-cols-2'
              : 'lg:grid-cols-1'
            }`}>
            {/* Dados do Empregado */}
            {funcionario && (
              <div className="rounded-xl border bg-card shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                <div className="px-4 py-3 border-b bg-muted/40">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm font-semibold text-foreground">Dados do Empregado</span>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Nome</Label>
                    <div className="min-h-[2.5rem] px-3 py-2 rounded-lg bg-muted/50 text-sm font-medium text-foreground border border-border/40 truncate">
                      {funcionario.name}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">CPF</Label>
                    <div className="min-h-[2.5rem] px-3 py-2 rounded-lg bg-muted/50 text-sm font-medium text-foreground border border-border/40">
                      {funcionario.cpf || (funcionario as any).document ? formatCPF(funcionario.cpf || (funcionario as any).document || '') : '-'}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Endereço</Label>
                    <div className="min-h-[2.5rem] px-3 py-2 rounded-lg bg-muted/50 text-sm font-medium text-foreground border border-border/40 truncate">
                      {typeof funcionario.address === 'string' ? funcionario.address : funcionario.address?.street || '-'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Dados do Empregador */}
            {empresa && (
              <div className="rounded-xl border bg-card shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-300 delay-100">
                <div className="px-4 py-3 border-b bg-muted/40">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                      <Building className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm font-semibold text-foreground">Dados do Empregador</span>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Razão Social</Label>
                    <div className="min-h-[2.5rem] px-3 py-2 rounded-lg bg-muted/50 text-sm font-medium text-foreground border border-border/40 truncate">
                      {empresa.name}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">CNPJ</Label>
                    <div className="min-h-[2.5rem] px-3 py-2 rounded-lg bg-muted/50 text-sm font-medium text-foreground border border-border/40">
                      {empresa.cnpj ? formatCNPJ(empresa.cnpj) : '-'}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Sigla</Label>
                    <div className="min-h-[2.5rem] px-3 py-2 rounded-lg bg-muted/50 text-sm font-medium text-foreground border border-border/40">
                      {empresa.sigla || '-'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Centro de Custos Selecionado */}
            {costCenter && (
              <div className="rounded-xl border bg-card shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-300 delay-200">
                <div className="px-4 py-3 border-b bg-muted/40">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                      <Briefcase className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm font-semibold text-foreground">Centro de Custos Selecionado</span>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Nome</Label>
                    <div className="min-h-[2.5rem] px-3 py-2 rounded-lg bg-muted/50 text-sm font-medium text-foreground border border-border/40 truncate">
                      {costCenter.name}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Código</Label>
                    <div className="min-h-[2.5rem] px-3 py-2 rounded-lg bg-muted/50 text-sm font-medium text-foreground border border-border/40">
                      {costCenter.code || '-'}
                    </div>
                  </div>
                  {costCenter.description && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Descrição</Label>
                      <div className="min-h-[2.5rem] px-3 py-2 rounded-lg bg-muted/50 text-sm font-medium text-foreground border border-border/40 truncate">
                        {costCenter.description}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {(funcionario || empresa || costCenter) && <Separator />}

          {/* Detalhes do Contrato */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Briefcase className="h-4 w-4" />
              <span>Detalhes do Contrato</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2 lg:col-span-2">
                <Label>Cargo</Label>
                <Input
                  value={form.position}
                  onChange={(e) => setForm(prev => ({ ...prev, position: e.target.value }))}
                  placeholder="Ex: Vigilante Patrimonial"
                  className="bg-background h-11"
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo de Contrato</Label>
                <Select value={form.contractType} onValueChange={(value) => setForm(prev => ({ ...prev, contractType: value }))}>
                  <SelectTrigger className="bg-background h-11">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {contractTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Campo de Duração da Experiência (aparece apenas para Contrato de Experiência) */}
            {form.contractType === 'Contrato de Experiência' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-orange-50 border-2 border-orange-300 rounded-lg animate-in fade-in zoom-in-95 duration-300">
                <div className="space-y-2 md:col-span-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-5 w-5 text-orange-600" />
                    <Label className="text-orange-700 font-bold text-base">⚠️ Configuração do Contrato de Experiência</Label>
                  </div>
                  <p className="text-sm text-orange-700">
                    Selecione a duração do período de experiência. A data de término será calculada automaticamente.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-orange-700 font-semibold">Duração da Experiência *</Label>
                  <Select
                    value={form.experienceDuration}
                    onValueChange={(value) => setForm(prev => ({ ...prev, experienceDuration: value }))}
                  >
                    <SelectTrigger className="bg-white h-12 border-orange-400 focus:border-orange-600 text-base font-semibold">
                      <SelectValue placeholder="Selecione o período" />
                    </SelectTrigger>
                    <SelectContent>
                      {experienceDurations.map(duration => (
                        <SelectItem key={duration.value} value={duration.value} className="text-base font-medium">
                          {duration.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {form.experienceDuration && form.startDate && (
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-orange-700 font-semibold">Data de Término Calculada</Label>
                    <div className="flex items-center gap-3 p-3 bg-white rounded-lg border-2 border-orange-400">
                      <Calendar className="h-5 w-5 text-orange-600" />
                      <span className="font-bold text-base">
                        {form.endDate ? new Date(form.endDate).toLocaleDateString('pt-BR') : 'Calculando...'}
                      </span>
                      <Badge className="ml-auto bg-orange-600">Automático</Badge>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label>Data de Início</Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm(prev => ({ ...prev, startDate: e.target.value }))}
                  className="bg-background h-11"
                />
              </div>

              <div className="space-y-2">
                <Label>Data de Término (Opcional)</Label>
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm(prev => ({ ...prev, endDate: e.target.value }))}
                  className="bg-background h-11"
                />
              </div>

              <div className="space-y-2">
                <Label>Salário Base (R$)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">R$</span>
                  <Input
                    value={form.salary}
                    onChange={(e) => setForm(prev => ({ ...prev, salary: e.target.value }))}
                    placeholder="0,00"
                    className="bg-background h-11 pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2 lg:col-span-2">
                <Label>Jornada de Trabalho</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                  <Input
                    value={form.workSchedule}
                    onChange={(e) => setForm(prev => ({ ...prev, workSchedule: e.target.value }))}
                    placeholder="Ex: 44h semanais, escala 12x36"
                    className="bg-background h-11 pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Departamento (Centro de Custo)</Label>
                <Select
                  value={form.department}
                  onValueChange={(value) => setForm(prev => ({ ...prev, department: value }))}
                  disabled={loadingData}
                >
                  <SelectTrigger className="h-11 bg-background">
                    <SelectValue placeholder={loadingData ? "Carregando..." : "Selecione o departamento"} />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingData ? (
                      <div className="p-2 text-center text-sm text-gray-500">Carregando centros de custo...</div>
                    ) : costCenters.length > 0 ? (
                      costCenters.map(cc => (
                        <SelectItem key={cc.id} value={cc.id || cc.name}>
                          <div className="flex flex-col py-1">
                            <span className="font-medium text-base">{cc.name}</span>
                            {cc.code && (
                              <span className="text-xs text-muted-foreground">Código: {cc.code}</span>
                            )}
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-2 text-center text-sm text-gray-500">Nenhum centro de custo encontrado</div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Benefícios */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <CheckCircle2 className="h-4 w-4" />
              <span>Benefícios Incluídos</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {benefitOptions.map(benefit => (
                <Button
                  key={benefit}
                  type="button"
                  variant={form.benefits.includes(benefit) ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleBenefitToggle(benefit)}
                  className={`justify-start h-10 transition-all ${form.benefits.includes(benefit)
                    ? 'border-primary'
                    : 'hover:border-primary/50 text-muted-foreground'
                    }`}
                >
                  <div className={`mr-2 h-4 w-4 rounded-full border flex items-center justify-center ${form.benefits.includes(benefit) ? 'border-primary-foreground bg-primary-foreground text-primary' : 'border-muted-foreground'
                    }`}>
                    {form.benefits.includes(benefit) && <CheckCircle2 className="h-3 w-3" />}
                  </div>
                  <span className="truncate">{benefit}</span>
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Observações Adicionais</Label>
            <Textarea
              value={form.observations}
              onChange={(e) => setForm(prev => ({ ...prev, observations: e.target.value }))}
              placeholder="Cláusulas extras ou observações sobre o contrato..."
              rows={3}
              className="resize-none bg-background"
            />
          </div>

          <Separator />

          {/* Ações */}
          <div className="flex flex-col-reverse sm:flex-row gap-4 justify-end pt-2">
            <Button
              onClick={handlePreviewContract}
              variant="outline"
              className="flex items-center gap-2 w-full sm:w-auto h-11"
              disabled={loading || loadingData || !funcionario || !empresa}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Gerando Preview...
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4" />
                  Visualizar Contrato
                </>
              )}
            </Button>
            <Button
              onClick={handleGenerateContract}
              className="flex items-center gap-2 w-full sm:w-auto h-11 shadow-md hover:shadow-lg transition-all"
              disabled={loading || loadingData || !funcionario || !empresa}
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

export default ContratosTrabalhoForm;