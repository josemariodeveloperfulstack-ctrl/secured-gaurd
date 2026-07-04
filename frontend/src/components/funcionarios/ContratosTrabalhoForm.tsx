import React, { useState, useEffect } from 'react';
import CurrencyInput from 'react-currency-input-field';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Calendar, User, Building, FileText, Download, Eye, Loader2, CheckCircle2, Clock, Briefcase } from 'lucide-react';
import { employeeService, Employee, SimpleEmployee } from '@/services/employeeService';
import { EmployeeCombobox } from '../ui/employee-combobox';
import { SearchableSelect } from '../ui/searchable-select';

import {
  useCompanies,
  useCostCentersActive,
  useAllWorkPosts,
} from '@/hooks/queries';
import { formatCPF, formatCNPJ } from '@/utils/validation';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/axios';
import { resolveCompanySigningCity } from '@/utils/resolveCompanySigningCity';
import { formatEmployeeFullAddress, isVigilanciaCompany } from '@/utils/formatEmployeeAddress';
import { useInvalidateDocumentosGerados } from '@/hooks/queries/useDocumentosGerados';
import { employeeAdmissionIsoDateOrToday } from '@/utils/employeeAdmissionDate';

interface ContratosTrabalhoFormProps {
  employeeId?: string;
  companyId?: string;
  /** Valor atual do cadastro (ex.: formulário da modal), usado no PDF antes de persistir. */
  tipoSalarioContratual?: string;
  /** Prazo de experiência do cadastro (ex.: "45 DIAS", "12 MESES") — define o tipo de contrato sugerido. */
  prazoExperienciaTexto?: string;
}

function resolvePdfContractKind(
  contractType: string
): 'EXPERIENCE' | 'INTERMITTENT' | 'INDEFINITE' | 'STANDARD' {
  if (contractType === 'Contrato de Experiência') return 'EXPERIENCE';
  if (contractType === 'Intermitente') return 'INTERMITTENT';
  if (contractType === 'CLT - Prazo indeterminado (integral)') return 'INDEFINITE';
  return 'STANDARD';
}

function isExperienceContract(contractType: string): boolean {
  return contractType === 'Contrato de Experiência';
}

function isIntermittentContract(contractType: string): boolean {
  return contractType === 'Intermitente';
}

function isExperienceLikeContract(contractType: string): boolean {
  return isExperienceContract(contractType) || isIntermittentContract(contractType);
}

function inferContractTypeFromEmployee(
  tipoSalario?: string,
  prazoExperiencia?: string,
  company?: { sigla?: string; name?: string } | null
): string {
  const tipo = (tipoSalario || '').trim().toUpperCase();
  const prazo = (prazoExperiencia || '').trim().toUpperCase();

  if (tipo === 'HORISTA') return 'Intermitente';
  if (prazo.includes('INTERMITENTE') || /12\s*MES/.test(prazo)) return 'Intermitente';
  if (/\d+\s*DIA/.test(prazo) || prazo.includes('EXPERI')) return 'Contrato de Experiência';

  // VIG: contrato intermitente é o padrão, salvo prazo de experiência em dias no cadastro.
  if (isVigilanciaCompany(company)) return 'Intermitente';

  return '';
}

/**
 * Formata uma data ISO ("YYYY-MM-DD" ou ISO completo) como "dd/MM/yyyy"
 * SEM aplicar conversão de timezone — necessário porque `new Date("YYYY-MM-DD")`
 * é interpretado como UTC e em UTC-3 retorna o dia anterior (bug do -1 dia).
 */
function formatLocalDate(iso?: string | null): string {
  if (!iso) return '-';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return new Date(iso).toLocaleDateString('pt-BR');
}

/**
 * Soma dias a uma data ISO ("YYYY-MM-DD") sem conversão de timezone.
 * Retorna nova string ISO "YYYY-MM-DD".
 */
function addDaysIsoLocal(iso: string, days: number): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  d.setDate(d.getDate() + days);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function addMonthsIsoLocal(iso: string, months: number): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  d.setMonth(d.getMonth() + months);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** Valor enviado em `department` para o PDF como "SETOR DE TRABALHO" (setor + unidade + posto — não centro de custo). */
function buildSetorLocalTrabalhoContrato(emp: Employee): string {
  const raw = [
    emp.department?.name?.trim(),
    emp.unit?.name?.trim(),
    emp.workPost?.name?.trim(),
  ].filter((s): s is string => Boolean(s));

  const seen = new Set<string>();
  const unique: string[] = [];
  for (const p of raw) {
    const key = p.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(p);
  }
  return unique.join(' — ');
}

const ContratosTrabalhoForm: React.FC<ContratosTrabalhoFormProps> = ({
  employeeId,
  companyId,
  tipoSalarioContratual: tipoSalarioContratualProp,
  prazoExperienciaTexto: prazoExperienciaTextoProp
}) => {
  const invalidateDocumentosGerados = useInvalidateDocumentosGerados();
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
  const [selectedEmployeeData, setSelectedEmployeeData] = useState<SimpleEmployee | null>(null);

  // Hooks de cache (TanStack Query) — substituem o loadData() manual.
  // Cache compartilhado entre formulários elimina refetch redundante.
  const { data: companies = [], isLoading: loadingCompanies } = useCompanies();
  const { data: costCenters = [], isLoading: loadingCostCenters } = useCostCentersActive();
  const { data: allWorkPosts = [], isLoading: loadingAllWorkPosts } = useAllWorkPosts();

  const loadingData =
    loadingCompanies || loadingCostCenters || loadingAllWorkPosts;

  const funcionario = selectedEmployeeData;
  const empresa = companies.find(e => e.id === form.companyId);
  const costCenter = costCenters.find(cc => cc.id === form.department || cc.name === form.department);

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
              positionName: emp.position?.name,
              unitName: emp.unit?.name,
              address: emp.address,
              workPostId: emp.workPostId || emp.workPost?.id,
              workPostName: emp.workPostName || emp.workPost?.name,
              salario: emp.salario,
              diasTrabalho: emp.diasTrabalho,
              horarioTrabalho: emp.horarioTrabalho,
              escalaTrabalho: emp.escalaTrabalho,
              companyId: emp.company?.id || (emp as any).companyId
            } as SimpleEmployee);

            // Também atualizar o form.companyId se ele estiver vazio
            setForm(prev => ({
              ...prev,
              companyId: prev.companyId || emp.company?.id || (emp as any).companyId || ''
            }));
          }
        } catch (error) {
          console.error("Erro ao carregar dados iniciais do funcionário:", error);
        }
      };
      fetchEmployee();
    }
  }, [form.employeeId, selectedEmployeeData]);

  // Os dados de empresas, centros de custo, clientes e postos agora vêm dos hooks
  // useCompanies / useCostCentersActive / useClients / useAllWorkPosts / useWorkPostsByClient
  // (TanStack Query) — sem useEffect imperativo, com cache compartilhado.

  // Pre-fill some fields when employee is selected
  useEffect(() => {
    if (funcionario && allWorkPosts.length > 0) {
      // Try to find cost center by unit name
      const unitName = (funcionario as any).unit?.name;
      const matchingCostCenter = unitName
        ? costCenters.find(cc => cc.name.toLowerCase() === unitName.toLowerCase())
        : null;

      // Buscar posto de trabalho associado ao funcionário
      const workPostId = (funcionario as any).workPostId || (funcionario as any).workPost?.id;
      const matchingWorkPost = workPostId ? allWorkPosts.find(wp => wp.id === workPostId) : null;

      setForm(prev => {
        const salaryValue = (funcionario as any).salario;
        // O componente `CurrencyInput` (react-currency-input-field) espera o
        // `value` em formato RAW com ponto decimal (ex: "1500.50") e cuida
        // sozinho da formatação visual ("R$ 1.500,50"). Por isso aqui
        // convertemos o valor vindo do backend para esse formato raw.
        //
        // Aceitamos múltiplos formatos de entrada para robustez:
        //   - number              → 1500.5
        //   - "1500.50"           → ponto decimal (já raw)
        //   - "1.500,50"          → pt-BR (precisa converter)
        //   - "R$ 1.500,50"       → com prefixo (precisa limpar)
        const parseSalaryToRaw = (v: unknown): string => {
          if (v == null) return '';
          if (typeof v === 'number') {
            return Number.isFinite(v) ? String(v) : '';
          }
          const s = String(v).replace(/[^\d.,-]/g, '').trim();
          if (!s) return '';
          // Formato pt-BR com vírgula como separador decimal: "1.500,50" → 1500.50
          if (/,\d{1,2}$/.test(s)) {
            const raw = s.replace(/\./g, '').replace(',', '.');
            const n = Number(raw);
            return Number.isFinite(n) ? String(n) : '';
          }
          // Já está em formato raw com ponto decimal
          const n = Number(s);
          return Number.isFinite(n) ? String(n) : '';
        };
        const rawSalary = parseSalaryToRaw(salaryValue);

        return {
          ...prev,
          position: (funcionario as any).positionName || (funcionario as any).position?.name || prev.position,
          department: matchingWorkPost?.id || matchingCostCenter?.id || prev.department,
          startDate: funcionario.hireDate ? funcionario.hireDate.split('T')[0] : prev.startDate,
          salary: rawSalary || prev.salary,
          workSchedule: (funcionario as any).escalaTrabalho && (funcionario as any).horarioTrabalho
            ? `${(funcionario as any).escalaTrabalho} - ${(funcionario as any).horarioTrabalho}`
            : (funcionario as any).escalaTrabalho || (funcionario as any).horarioTrabalho || (funcionario as any).diasTrabalho || prev.workSchedule,
        };
      });
    }
  }, [funcionario, costCenters, allWorkPosts]);

  // Sugere tipo de contrato a partir do cadastro (horista → intermitente; prazo em dias → experiência).
  useEffect(() => {
    if (!funcionario || form.contractType) return;
    const inferred = inferContractTypeFromEmployee(
      tipoSalarioContratualProp,
      prazoExperienciaTextoProp,
      empresa
    );
    if (inferred) {
      setForm(prev => ({ ...prev, contractType: inferred }));
    }
  }, [
    funcionario,
    empresa,
    form.contractType,
    tipoSalarioContratualProp,
    prazoExperienciaTextoProp,
  ]);

  // Default da duração: 45 dias para experiência; 12 meses (365 dias) para intermitente
  useEffect(() => {
    if (isExperienceContract(form.contractType) && !form.experienceDuration) {
      setForm(prev => ({ ...prev, experienceDuration: '45' }));
    }
  }, [form.contractType, form.experienceDuration]);

  // Data de início = data de admissão (hireDate) para experiência e intermitente
  useEffect(() => {
    if (
      isExperienceLikeContract(form.contractType) &&
      funcionario?.hireDate &&
      !form.startDate
    ) {
      setForm(prev => ({
        ...prev,
        startDate: funcionario.hireDate!.split('T')[0],
      }));
    }
  }, [form.contractType, funcionario?.hireDate, form.startDate]);

  // Auto-calcula a Data de Término para contratos de experiência (dias) ou intermitente (12 meses).
  useEffect(() => {
    if (!form.startDate) return;

    if (isIntermittentContract(form.contractType)) {
      const newEnd = addMonthsIsoLocal(form.startDate, 12);
      if (newEnd) {
        setForm(prev => ({ ...prev, endDate: newEnd }));
      }
      return;
    }

    if (isExperienceContract(form.contractType) && form.experienceDuration) {
      const days = parseInt(form.experienceDuration, 10);
      if (!Number.isNaN(days)) {
        const newEnd = addDaysIsoLocal(form.startDate, days - 1);
        if (newEnd) {
          setForm(prev => ({ ...prev, endDate: newEnd }));
        }
      }
    }
  }, [form.contractType, form.startDate, form.experienceDuration]);

  const contractTypes = [
    'CLT - Efetivo',
    'CLT - Temporário',
    'Contrato de Experiência',
    'CLT - Prazo indeterminado (integral)',
    'PJ - Prestador de Serviços',
    'Estagiário',
    'Aprendiz',
    'Terceirizado',
    'Intermitente',
  ];

  const experienceDurations = [
    { value: '30', label: '30 dias' },
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
    if (isExperienceContract(form.contractType) && !form.experienceDuration) {
      toast({
        title: 'Atenção',
        description: 'Selecione a duração do período de experiência (30, 45, 60 ou 90 dias)!',
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

    const addressValue = formatEmployeeFullAddress(fullEmployee);

    const pdfKind = resolvePdfContractKind(form.contractType);
    const isExperiencia = pdfKind === 'EXPERIENCE';
    const isIntermitente = pdfKind === 'INTERMITTENT';
    const cidadeContrato = resolveCompanySigningCity(empresa as { city?: string; address?: string });

    // Resolve o nome do posto de trabalho selecionado no formulário
    const selectedWorkPost = allWorkPosts.find(wp => wp.id === form.department);
    const departmentName = selectedWorkPost 
      ? selectedWorkPost.name 
      : buildSetorLocalTrabalhoContrato(fullEmployee);

    return {
      companyId: empresa!.id,
      employeeId: funcionario?.id,
      employeeName: fullEmployee.name,
      employeeCpf: fullEmployee.cpf || fullEmployee.document || '',
      employeeRg: fullEmployee.rg || '',
      employeeAddress: addressValue,
      employeeCtps: (fullEmployee as any).ctps || '',
      employeeCtpsSeries: (fullEmployee as any).ctpsSeries || '',
      nationality: fullEmployee.nationality || '',
      maritalStatus: fullEmployee.maritalStatus || '',
      pis: fullEmployee.pis || '',
      position: form.position,
      department: departmentName,
      // form.salary é sempre armazenado em formato raw com ponto decimal
      // ("1500.50"), pois é o contrato do CurrencyInput. Basta parseFloat.
      salary: form.salary ? parseFloat(form.salary) || 0 : 0,
      admissionDate: form.startDate || null,
      workHoursDescription: '44 horas semanais', // Placeholder or add form field if exists
      workSchedule: form.workSchedule || 'a definir',
      city: cidadeContrato,
      contractDate: form.startDate || employeeAdmissionIsoDateOrToday(fullEmployee.hireDate),
      contractKind: pdfKind,
      experienceDurationDays: isExperiencia && form.experienceDuration
        ? parseInt(form.experienceDuration, 10)
        : undefined,
      intermittentDurationMonths: isIntermitente ? 12 : undefined,
      salaryInWords: (fullEmployee as any).salarioPorExtenso || (fullEmployee as any).salario_por_extenso || '',
      tipoSalarioContratual:
        tipoSalarioContratualProp?.trim() ||
        fullEmployee.tipoSalarioContratual ||
        ''
    };
  };

  const handleGenerateContract = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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

      invalidateDocumentosGerados(funcionario!.id);

      toast({
        title: 'Sucesso',
        description: 'Contrato de Trabalho gerado com sucesso! Confira em Documentos → Documentos gerados pelo sistema.',
      });
    } catch (err: any) {
      console.error('Erro ao gerar contrato:', err);
      let description = 'Erro ao gerar contrato.';
      const blob = err.response?.data;
      if (blob instanceof Blob && err.response?.status >= 400) {
        try {
          const text = await blob.text();
          const json = JSON.parse(text) as { message?: string; error?: string };
          description = json.message || json.error || description;
        } catch {
          /* mantém mensagem padrão */
        }
      } else if (err.message) {
        description = err.message;
      }
      toast({
        title: 'Erro',
        description,
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
                  <EmployeeCombobox
                    value={form.employeeId}
                    onChange={(value) => setForm(prev => ({ ...prev, employeeId: value }))}
                    disabled={loadingData}
                    onEmployeeSelect={(emp) => {
                      setSelectedEmployeeData({
                        ...emp,
                        workPostId: emp.workPostId,
                        workPostName: emp.workPostName
                      });
                      if (emp.companyId) {
                        setForm(prev => ({ ...prev, companyId: emp.companyId! }));
                      }
                    }}
                  />
                  {funcionario && (
                    <div className="mt-2.5 rounded-xl bg-seguranca-black/40 p-3.5 border border-seguranca-yellow/10 shadow-inner group transition-all hover:border-seguranca-yellow/30">
                      <div className="flex flex-col gap-2.5">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-seguranca-yellow/10 border border-seguranca-yellow/20">
                            <User className="h-4 w-4 text-seguranca-yellow" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-bold text-seguranca-lightgray truncate leading-tight" title={funcionario.name}>
                              {funcionario.name}
                            </span>
                            {(funcionario as any).positionName && (
                              <span className="text-[11px] font-medium text-seguranca-yellow/80 mt-0.5 uppercase tracking-wider">
                                {(funcionario as any).positionName}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-2.5 border-t border-white/5">
                          {(funcionario.cpf || (funcionario as any).document) && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold text-white/30 uppercase tracking-tighter">CPF</span>
                              <span className="text-[11px] font-mono text-seguranca-lightgray/70">
                                {formatCPF(funcionario.cpf || (funcionario as any).document || '')}
                              </span>
                            </div>
                          )}
                          {(funcionario as any).registrationNumber && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold text-white/30 uppercase tracking-tighter">Matrícula</span>
                              <span className="text-[11px] font-mono text-seguranca-lightgray/70">
                                {(funcionario as any).registrationNumber}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
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
                  <SearchableSelect
                    options={companies.map(e => ({
                      value: e.id,
                      label: e.sigla || e.tradeName || e.name,
                      description: e.cnpj ? `CNPJ: ${formatCNPJ(e.cnpj)}` : e.name
                    }))}
                    value={form.companyId}
                    onChange={(value) => setForm(prev => ({ ...prev, companyId: value }))}
                    disabled={loadingData}
                    placeholder="Selecione a empresa"
                    searchPlaceholder="Buscar empresa..."
                  />
                  {empresa && (
                    <div className="mt-2.5 rounded-xl bg-seguranca-black/40 p-3.5 border border-seguranca-yellow/10 shadow-inner group transition-all hover:border-seguranca-yellow/30">
                      <div className="flex flex-col gap-2.5">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-seguranca-yellow/10 border border-seguranca-yellow/20">
                            <Building className="h-4 w-4 text-seguranca-yellow" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-bold text-seguranca-lightgray truncate leading-tight" title={empresa.sigla || empresa.tradeName || empresa.name}>
                              {empresa.sigla || empresa.tradeName || empresa.name}
                            </span>
                            {empresa.name && (
                              <span className="text-[11px] font-medium text-seguranca-yellow/80 mt-0.5 uppercase tracking-wider truncate" title={empresa.name}>
                                {empresa.name}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-2.5 border-t border-white/5">
                          {empresa.cnpj && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold text-white/30 uppercase tracking-tighter">CNPJ</span>
                              <span className="text-[11px] font-mono text-seguranca-lightgray/70">
                                {formatCNPJ(empresa.cnpj)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
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
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
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
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Cargo</Label>
                      <div className="min-h-[2.5rem] px-3 py-2 rounded-lg bg-muted/50 text-sm font-medium text-foreground border border-border/40 truncate">
                        {funcionario.positionName || (funcionario as any).position?.name || '-'}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Admissão</Label>
                      <div className="min-h-[2.5rem] px-3 py-2 rounded-lg bg-muted/50 text-sm font-medium text-foreground border border-border/40">
                         {formatLocalDate(funcionario.hireDate)}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Endereço</Label>
                    <div className="min-h-[2.5rem] px-3 py-2 rounded-lg bg-muted/50 text-sm font-medium text-foreground border border-border/40 truncate">
                      {typeof funcionario.address === 'string' ? funcionario.address : (funcionario.address as any)?.street || '-'}
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

            {/* Configuração do Contrato Intermitente */}
            {isIntermittentContract(form.contractType) && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-orange-50 border-2 border-orange-300 rounded-lg animate-in fade-in zoom-in-95 duration-300">
                <div className="space-y-2 md:col-span-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-5 w-5 text-orange-600" />
                    <Label className="text-orange-700 font-bold text-base">
                      Configuração do Contrato Intermitente
                    </Label>
                  </div>
                  <p className="text-sm text-orange-700">
                    Gera o contrato <strong>CONTRATO DE TRABALHO INTERMITENTE</strong> (cláusulas art. 452-A, LGPD e termo de prorrogação).
                    A data de assinatura é a data de admissão do funcionário.
                    {tipoSalarioContratualProp === 'HORISTA' && (
                      <> Salário horista conforme cadastro.</>
                    )}
                  </p>
                  <p className="text-xs text-orange-600 mt-1">
                    Vigência padrão: <strong>12 meses</strong> a partir da data de admissão
                    {funcionario?.hireDate && (
                      <> (<strong>{formatLocalDate(funcionario.hireDate)}</strong>)</>
                    )}.
                  </p>
                </div>
                {form.startDate && (
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-orange-700 font-semibold">Data de Término Prevista (12 meses)</Label>
                    <div className="flex items-center gap-3 p-3 bg-white rounded-lg border-2 border-orange-400">
                      <Calendar className="h-5 w-5 text-orange-600" />
                      <span className="font-bold text-base text-gray-800">
                        {form.endDate ? formatLocalDate(form.endDate) : 'Calculando...'}
                      </span>
                      <Badge className="ml-auto bg-orange-600">Automático</Badge>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Duração do período de experiência */}
            {isExperienceContract(form.contractType) && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-orange-50 border-2 border-orange-300 rounded-lg animate-in fade-in zoom-in-95 duration-300">
                <div className="space-y-2 md:col-span-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-5 w-5 text-orange-600" />
                    <Label className="text-orange-700 font-bold text-base">
                      Configuração do Contrato de Experiência
                    </Label>
                  </div>
                  <p className="text-sm text-orange-700">
                    {isVigilanciaCompany(empresa)
                      ? 'Gera o modelo Promover Vigilância (escala 12x36, uniforme fornecido, LGPD específica e termo de prorrogação). A data do contrato é a data de admissão.'
                      : 'Selecione a duração do período de experiência. A data de término será calculada automaticamente.'}
                  </p>
                  <p className="text-xs text-orange-600 mt-1">
                    Padrão: <strong>45 dias</strong> a partir da data de admissão
                    {funcionario?.hireDate && (
                      <> (<strong>{formatLocalDate(funcionario.hireDate)}</strong>)</>
                    )}.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-orange-700 font-semibold">Duração da Experiência *</Label>
                  <Select
                    value={form.experienceDuration}
                    onValueChange={(value) => setForm(prev => ({ ...prev, experienceDuration: value }))}
                  >
                    <SelectTrigger className="bg-white h-12 border-orange-400 focus:border-orange-600 text-base font-semibold text-gray-800">
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
                      <span className="font-bold text-base text-gray-800">
                        {form.endDate ? formatLocalDate(form.endDate) : 'Calculando...'}
                      </span>
                      <Badge className="ml-auto bg-orange-600">Automático</Badge>
                    </div>
                  </div>
                )}
              </div>
            )}

            {form.contractType === 'CLT - Prazo indeterminado (integral)' && (
              <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                <p>
                  Este tipo gera o <span className="font-medium text-foreground">contrato CLT por prazo indeterminado</span>{' '}
                  (texto integral em várias páginas, com LGPD), indicado após o fim da experiência. A{' '}
                  <span className="font-medium text-foreground">data de início</span> abaixo entra na cláusula de início da
                  prestação; ajuste se for a data de assinatura do contrato definitivo.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label>
                  {isExperienceLikeContract(form.contractType) ? 'Data de Admissão (início do contrato)' : 'Data de Início'}
                </Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm(prev => ({ ...prev, startDate: e.target.value }))}
                  className="bg-background h-11"
                />
                {isExperienceLikeContract(form.contractType) && (
                  <p className="text-xs text-muted-foreground">
                    Esta data é usada na assinatura do contrato (cidade + data de admissão).
                  </p>
                )}
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
                <CurrencyInput
                  id="salary-base"
                  name="salary"
                  // form.salary é sempre raw decimal (ex: "1500.50") — formato
                  // esperado por este componente. A formatação visual
                  // ("R$ 1.500,50") é aplicada automaticamente.
                  value={form.salary || ''}
                  placeholder="R$ 0,00"
                  decimalsLimit={2}
                  decimalScale={2}
                  fixedDecimalLength={2}
                  groupSeparator="."
                  decimalSeparator=","
                  prefix="R$ "
                  allowNegativeValue={false}
                  onValueChange={(value) => setForm(prev => ({ ...prev, salary: value ?? '' }))}
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
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

              <div className="space-y-2 lg:col-span-3">
                <Label>Setor de Trabalho</Label>
                <SearchableSelect
                  options={allWorkPosts.map(wp => ({
                    value: wp.id || wp.name,
                    label: wp.name,
                    description: wp.clientName ? `Cliente: ${wp.clientName}` : (wp.address || '')
                  }))}
                  value={form.department}
                  onChange={(value) => setForm(prev => ({ ...prev, department: value }))}
                  disabled={loadingData}
                  placeholder="Selecione o setor de trabalho"
                  searchPlaceholder="Digite o nome do posto..."
                  minSearchChars={3}
                  minCharsMessage="Digite ao menos 3 caracteres para ver os postos de trabalho..."
                />
                <p className="text-xs text-muted-foreground">
                  Pré-preenchido com o posto cadastrado para o funcionário. Digite ao menos 3
                  caracteres para buscar outro posto, se necessário.
                </p>
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
              type="button"
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
              type="button"
              onClick={() => handleGenerateContract()}
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