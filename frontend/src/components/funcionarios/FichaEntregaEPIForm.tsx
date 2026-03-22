import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { FileText, Download, Eye, User, Building, Calendar, Shield, Plus, X, HardHat, Loader2, CheckCircle2, ChevronsUpDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { employeeService, Employee } from '@/services/employeeService';
import { companyService } from '@/services/companyService';
import { epiDeliveryFormService } from '@/services/epiDeliveryFormService';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/axios';
import { caepiService, CAEPIResponse } from '@/services/caepiService';
import { formatCPF, formatCNPJ } from '@/utils/validation';

const epiOptions = [
  'Capacete de Segurança',
  'Óculos de Proteção',
  'Protetor Auditivo',
  'Máscara Respiratória',
  'Luvas de Segurança',
  'Calçado de Segurança',
  'Cinto de Segurança',
  'Avental de Proteção',
  'Protetor Facial',
  'Uniforme de Trabalho',
  'Colete Refletivo',
  'Luminária de Cabeça',
  'Detector de Gás',
  'Protetor Solar',
  'Outros',
];

const uniformePecasOptions = [
  { value: 'CALCA', label: 'Calça' },
  { value: 'CAMISA', label: 'Camisa' },
  { value: 'CAMISA_SOCIAL', label: 'Camisa Social' },
  { value: 'JAQUETA', label: 'Jaqueta' },
  { value: 'SAPATO', label: 'Sapato' },
  { value: 'SAPATA_SOCIAL', label: 'Sapata Social' },
  { value: 'PERNEIRA', label: 'Perneira' },
  { value: 'BLASER', label: 'Blaser' },
  { value: 'LUVA_LATEX', label: 'Luva Latex' },
];

interface FichaEntregaEPIFormProps {
  employeeId?: string;
  companyId?: string;
}

const MIN_EMPLOYEE_SEARCH_CHARS = 3;

function resolveCompanyIdFromEmployee(emp: Employee | undefined): string {
  if (!emp) return '';
  const raw = (emp as { companyId?: string }).companyId ?? emp.company?.id;
  return raw != null && String(raw).trim() !== '' ? String(raw) : '';
}

const FichaEntregaEPIForm: React.FC<FichaEntregaEPIFormProps> = ({ employeeId, companyId }) => {
  const { toast } = useToast();
  
  // 1. All State and Ref declarations first
  const [form, setForm] = useState({
    funcionarioId: employeeId || '',
    empresaId: companyId || '',
    dataEntrega: '',
    responsavelEntregaId: '',
    observacoes: '',
  });

  const [epis, setEpis] = useState([
    {
      nome: '',
      quantidade: '1',
      ca: '', // Número do Certificado de Aprovação
      caName: '', // Nome/Descrição do CA
      validade: '',
      observacoes: '',
      uniformeTipo: '', // 'COMPLETO' ou 'INDIVIDUAL'
      uniformePeca: '' // Peça específica se for individual
    }
  ]);

  const [caSuggestions, setCaSuggestions] = useState<{ [key: number]: CAEPIResponse[] }>({});
  const [caLoading, setCaLoading] = useState<{ [key: number]: boolean }>({});
  const [caSearchTimeouts, setCaSearchTimeouts] = useState<{ [key: number]: NodeJS.Timeout }>({});
  const [showCaSuggestions, setShowCaSuggestions] = useState<{ [key: number]: boolean }>({});

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [employeePickerOpen, setEmployeePickerOpen] = useState(false);
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState('');
  
  const prevFuncionarioIdForCompanySync = useRef<string | undefined>(undefined);

  // 2. Memoized values
  const funcionario = employees.find(f => f.id === form.funcionarioId);
  const empresa = companies.find(e => e.id === form.empresaId);
  const responsavel = employees.find(f => f.id === form.responsavelEntregaId);

  const filteredEmployeesForPicker = useMemo(() => {
    const q = employeeSearchQuery.trim().toLowerCase();
    if (q.length < MIN_EMPLOYEE_SEARCH_CHARS) return [];
    const qDigits = q.replace(/\D/g, '');
    return employees.filter((f) => {
      const name = (f.name || '').toLowerCase();
      const mat = (f.registrationNumber || '').toLowerCase();
      const cpfDigits = (f.cpf || (f as { document?: string }).document || '').replace(/\D/g, '');
      if (name.includes(q) || mat.includes(q)) return true;
      if (qDigits.length >= MIN_EMPLOYEE_SEARCH_CHARS && cpfDigits.includes(qDigits)) return true;
      return false;
    });
  }, [employees, employeeSearchQuery]);

  // 3. All Effects
  
  // Atualizar funcionarioId e empresaId quando props mudarem
  useEffect(() => {
    setForm(prev => ({
      ...prev,
      funcionarioId: employeeId || prev.funcionarioId,
      empresaId: companyId || prev.empresaId
    }));
  }, [employeeId, companyId]);

  // Preenche empresa pelo cadastro do funcionário (prop sem companyId ou lista que carrega depois).
  useEffect(() => {
    if (!form.funcionarioId || employees.length === 0) return;
    if (companyId) return;
    const emp = employees.find((e) => e.id === form.funcionarioId);
    const cid = resolveCompanyIdFromEmployee(emp);
    if (!cid) return;

    const funcionarioMudou = prevFuncionarioIdForCompanySync.current !== form.funcionarioId;
    prevFuncionarioIdForCompanySync.current = form.funcionarioId;

    setForm((prev) => {
      if (funcionarioMudou) return { ...prev, empresaId: cid };
      if (!prev.empresaId) return { ...prev, empresaId: cid };
      return prev;
    });
  }, [form.funcionarioId, employees, companyId]);

  // Carregar dados iniciais
  useEffect(() => {
    loadData();
  }, []);

  // Carregar EPIs padrão quando empresa for selecionada
  useEffect(() => {
    if (form.empresaId && companies.length > 0) {
      const selectedCompany = companies.find(c => c.id === form.empresaId);
      if (selectedCompany) {
        const companyDefaultEpis = (selectedCompany as any).defaultEpis;
        if (companyDefaultEpis && companyDefaultEpis.length > 0) {
          const firstEpiName = epis.length > 0 ? epis[0].nome : '';
          const shouldLoad = firstEpiName === '' || firstEpiName !== companyDefaultEpis[0]?.epiName;

          if (shouldLoad) {
            const loadedEpis = companyDefaultEpis.map((epi: any) => ({
              nome: epi.epiName || '',
              quantidade: String(epi.quantity || 1),
              ca: epi.caNumber || '',
              validade: epi.validity || '',
              observacoes: epi.observations || '',
              uniformeTipo: '',
              uniformePeca: ''
            }));
            setEpis(loadedEpis);
            toast({
              title: 'EPIs carregados',
              description: `${loadedEpis.length} EPI(s) padrão da empresa foram carregados automaticamente.`,
              variant: 'default'
            });
          }
        } else {
          if (epis.length === 0 || (epis.length === 1 && epis[0].nome === '')) {
            setEpis([{ nome: '', quantidade: '1', ca: '', validade: '', observacoes: '', uniformeTipo: '', uniformePeca: '' }]);
          }
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.empresaId]);
  const handleSelectEmployee = (id: string) => {
    const emp = employees.find((e) => e.id === id);
    const cid = resolveCompanyIdFromEmployee(emp);
    prevFuncionarioIdForCompanySync.current = id;
    setForm((prev) => ({ ...prev, funcionarioId: id, empresaId: cid }));
    setEmployeePickerOpen(false);
    setEmployeeSearchQuery('');
    if (emp && !cid) {
      toast({
        title: 'Atenção',
        description: 'Este funcionário não possui empresa vinculada no cadastro. Selecione a empresa manualmente.',
        variant: 'default',
      });
    }
  };

  const loadData = async () => {
    setLoadingData(true);
    try {
      const [employeesData, companiesData] = await Promise.all([
        employeeService.getAllEmployees(),
        companyService.getAllCompanies()
      ]);
      setEmployees(employeesData);
      setCompanies(companiesData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar funcionários e empresas.',
        variant: 'destructive'
      });
    } finally {
      setLoadingData(false);
    }
  };

  const handleEpiChange = (idx: number, field: string, value: string) => {
    setEpis(prevEpis => {
      const updatedEpis = [...prevEpis];
      updatedEpis[idx] = { ...updatedEpis[idx], [field]: value };
      return updatedEpis;
    });
  };

  // Função para buscar CA quando o usuário digita
  const handleCABlur = async (idx: number, caNumber: string) => {
    if (!caNumber || caNumber.trim().length < 3) {
      setShowCaSuggestions(prev => ({ ...prev, [idx]: false }));
      return;
    }

    try {
      setCaLoading(prev => ({ ...prev, [idx]: true }));
      const caInfo = await caepiService.buscarCA(caNumber);

      if (caInfo) {
        handleEpiChange(idx, 'ca', caInfo.numero);
        handleEpiChange(idx, 'caName', caInfo.nome || caInfo.descricao || '');
        toast({
          title: "CA encontrado",
          description: `CA ${caInfo.numero} - ${caInfo.nome}`,
          variant: "default"
        });
      }
    } catch (error) {
      console.error('Erro ao buscar CA:', error);
    } finally {
      setCaLoading(prev => ({ ...prev, [idx]: false }));
      setShowCaSuggestions(prev => ({ ...prev, [idx]: false }));
    }
  };

  // Função para buscar sugestões de CA enquanto digita
  const handleCASearch = async (idx: number, searchTerm: string) => {
    // Limpar timeout anterior
    if (caSearchTimeouts[idx]) {
      clearTimeout(caSearchTimeouts[idx]);
    }

    if (!searchTerm || searchTerm.trim().length < 3) {
      setCaSuggestions(prev => ({ ...prev, [idx]: [] }));
      setShowCaSuggestions(prev => ({ ...prev, [idx]: false }));
      return;
    }

    // Debounce de 500ms
    const timeout = setTimeout(async () => {
      try {
        setCaLoading(prev => ({ ...prev, [idx]: true }));
        const resultados = await caepiService.buscarCAs(searchTerm);
        setCaSuggestions(prev => ({ ...prev, [idx]: resultados }));
        setShowCaSuggestions(prev => ({ ...prev, [idx]: resultados.length > 0 }));
      } catch (error) {
        console.error('Erro ao buscar sugestões de CA:', error);
      } finally {
        setCaLoading(prev => ({ ...prev, [idx]: false }));
      }
    }, 500);

    setCaSearchTimeouts(prev => ({ ...prev, [idx]: timeout }));
  };

  // Função para selecionar uma sugestão de CA
  const handleCASelect = (idx: number, ca: CAEPIResponse) => {
    handleEpiChange(idx, 'ca', ca.numero);
    handleEpiChange(idx, 'caName', ca.nome || ca.descricao || '');
    setShowCaSuggestions(prev => ({ ...prev, [idx]: false }));
    setCaSuggestions(prev => ({ ...prev, [idx]: [] }));
  };

  const addEpi = () => {
    setEpis([...epis, {
      nome: '',
      quantidade: '1',
      ca: '',
      caName: '',
      validade: '',
      observacoes: '',
      uniformeTipo: '',
      uniformePeca: ''
    }]);
  };

  const removeEpi = (idx: number) => {
    if (epis.length > 1) {
      setEpis(epis.filter((_, i) => i !== idx));
    }
  };

  const handlePreview = async () => {
    if (!form.funcionarioId || !form.empresaId || !form.dataEntrega) {
      toast({
        title: 'Atenção',
        description: 'Preencha todos os campos obrigatórios para visualizar a ficha!',
        variant: 'destructive'
      });
      return;
    }

    if (epis.some(epi => !epi.nome)) {
      toast({
        title: 'Atenção',
        description: 'Preencha o nome de todos os EPIs para visualizar a ficha!',
        variant: 'destructive'
      });
      return;
    }

    // Validar campos específicos de Uniforme de Trabalho
    if (epis.some(epi => epi.nome === 'Uniforme de Trabalho' && !epi.uniformeTipo)) {
      toast({
        title: 'Atenção',
        description: 'Para Uniforme de Trabalho, é necessário selecionar se é Completo ou Individual!',
        variant: 'destructive'
      });
      return;
    }

    if (epis.some(epi => epi.nome === 'Uniforme de Trabalho' && epi.uniformeTipo === 'INDIVIDUAL' && !epi.uniformePeca)) {
      toast({
        title: 'Atenção',
        description: 'Para Uniforme de Trabalho Individual, é necessário selecionar a peça específica!',
        variant: 'destructive'
      });
      return;
    }

    if (!funcionario || !empresa) {
      toast({
        title: 'Atenção',
        description: 'Selecione funcionário e empresa para visualizar a ficha!',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);
      // Buscar dados completos do funcionário
      const fullEmployee = await employeeService.getEmployeeById(funcionario.id);
      if (!fullEmployee) {
        toast({
          title: 'Erro',
          description: 'Funcionário não encontrado!',
          variant: 'destructive'
        });
        return;
      }

      const formData = {
        employeeId: form.funcionarioId,
        companyId: form.empresaId,
        deliveryDate: form.dataEntrega,
        responsibleEmployeeId: form.responsavelEntregaId || undefined,
        observations: form.observacoes || undefined,
        items: epis.map(epi => ({
          epiName: epi.nome,
          quantity: parseInt(epi.quantidade) || 1,
          ca: epi.ca || undefined,
          caName: epi.caName || undefined,
          validityDate: epi.validade || undefined,
          uniformType: epi.uniformeTipo || undefined,
          uniformPiece: epi.uniformePeca || undefined,
          observations: epi.observacoes || undefined
        }))
      };

      // Gerar PDF com o mesmo layout padrão, mas apenas para visualização (abre em nova aba)
      const blob = await epiDeliveryFormService.generateAndSavePdf(formData);
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => window.URL.revokeObjectURL(url), 100);

    } catch (err: any) {
      console.error('Erro ao gerar preview:', err);
      toast({
        title: 'Erro',
        description: err.response?.data?.message || 'Erro ao gerar preview da ficha. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGerarPDF = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.funcionarioId || !form.empresaId || !form.dataEntrega) {
      toast({
        title: 'Atenção',
        description: 'Preencha todos os campos obrigatórios!',
        variant: 'destructive'
      });
      return;
    }

    if (epis.some(epi => !epi.nome)) {
      toast({
        title: 'Atenção',
        description: 'Preencha o nome de todos os EPIs!',
        variant: 'destructive'
      });
      return;
    }

    if (!funcionario || !empresa) {
      toast({
        title: 'Atenção',
        description: 'Selecione funcionário e empresa!',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      // Buscar dados completos do funcionário
      const fullEmployee = await employeeService.getEmployeeById(funcionario.id);
      if (!fullEmployee) {
        throw new Error('Funcionário não encontrado');
      }

      const payload = {
        templateName: 'ficha-entrega-epi.html',
        funcionario: fullEmployee.name,
        cpf: fullEmployee.cpf || fullEmployee.document || '',
        cargo: (fullEmployee as any).position?.name || '',
        setor: (fullEmployee as any).unit?.name || '',
        empresa: empresa.name,
        cnpj: empresa.cnpj || '',
        dataEntrega: form.dataEntrega,
        responsavelEntrega: responsavel?.name || '',
        epis: epis.map(epi => {
          // Formatar nome do EPI para incluir informações de uniforme se aplicável
          let nomeFormatado = epi.nome;
          if (epi.nome === 'Uniforme de Trabalho') {
            if (epi.uniformeTipo === 'INDIVIDUAL' && epi.uniformePeca) {
              const pecaLabel = uniformePecasOptions.find(p => p.value === epi.uniformePeca)?.label || epi.uniformePeca;
              nomeFormatado = `Uniforme de Trabalho - Individual (${pecaLabel})`;
            } else if (epi.uniformeTipo === 'COMPLETO') {
              nomeFormatado = 'Uniforme de Trabalho - Completo';
            }
          }

          return {
            nome: nomeFormatado,
            quantidade: epi.quantidade,
            ca: epi.ca || '',
            validade: epi.validade || '',
            observacoes: epi.observacoes || '',
            uniformeTipo: epi.uniformeTipo || '',
            uniformePeca: epi.uniformePeca || ''
          };
        }),
        observacoes: form.observacoes || '',
        dataAtual: new Date().toLocaleDateString('pt-BR')
      };

      const buildEpiFormData = () => ({
        employeeId: form.funcionarioId,
        companyId: form.empresaId,
        deliveryDate: form.dataEntrega,
        responsibleEmployeeId: form.responsavelEntregaId || undefined,
        observations: form.observacoes || undefined,
        items: epis.map(epi => ({
          epiName: epi.nome,
          quantity: parseInt(epi.quantidade) || 1,
          ca: epi.ca || undefined,
          caName: epi.caName || undefined,
          validityDate: epi.validade || undefined,
          uniformType: epi.uniformeTipo || undefined,
          uniformPiece: epi.uniformePeca || undefined,
          observations: epi.observacoes || undefined
        }))
      });

      // Gerar PDF completo (novo padrão de layout) e salvar no banco
      const blob = await epiDeliveryFormService.generateAndSavePdf(buildEpiFormData());

      // Fazer download do PDF
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ficha-entrega-epi-${fullEmployee.name.replace(/\s+/g, '-').toLowerCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Sucesso',
        description: 'Ficha de Entrega de EPI gerada e salva com sucesso!',
      });
    } catch (err: any) {
      console.error('Erro ao gerar PDF:', err);
      toast({
        title: 'Erro',
        description: err.response?.data?.message || 'Erro ao gerar PDF. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSalvarFicha = async () => {
    if (!form.funcionarioId || !form.empresaId || !form.dataEntrega) {
      toast({
        title: 'Atenção',
        description: 'Preencha todos os campos obrigatórios!',
        variant: 'destructive'
      });
      return;
    }

    if (epis.some(epi => !epi.nome)) {
      toast({
        title: 'Atenção',
        description: 'Preencha o nome de todos os EPIs!',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const formData = {
        employeeId: form.funcionarioId,
        companyId: form.empresaId,
        deliveryDate: form.dataEntrega,
        responsibleEmployeeId: form.responsavelEntregaId || undefined,
        observations: form.observacoes || undefined,
        items: epis.map(epi => ({
          epiName: epi.nome,
          quantity: parseInt(epi.quantidade) || 1,
          ca: epi.ca || undefined,
          caName: epi.caName || undefined,
          validityDate: epi.validade || undefined,
          uniformType: epi.uniformeTipo || undefined,
          uniformPiece: epi.uniformePeca || undefined,
          observations: epi.observacoes || undefined
        }))
      };

      await epiDeliveryFormService.create(formData);
      toast({
        title: '✅ Salvo',
        description: 'Ficha de entrega de EPI salva com sucesso!',
      });
    } catch (err: any) {
      console.error('❌ Erro ao salvar ficha de EPI:', err);
      toast({
        title: 'Erro',
        description: err.response?.data?.message || 'Erro ao salvar a ficha. Tente novamente.',
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
                <HardHat className="h-6 w-6 text-primary" />
                Ficha de Entrega de EPI
              </CardTitle>
              <CardDescription>
                Registre a entrega de Equipamentos de Proteção Individual.
              </CardDescription>
            </div>
            {(funcionario && empresa) && (
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-base font-semibold">
                  Funcionário
                  <span className="block text-[11px] font-normal text-muted-foreground/80">
                    Selecione o colaborador que receberá os EPIs. Digite pelo menos 3 caracteres do nome, matrícula ou CPF para buscar.
                  </span>
                </Label>
                <Popover
                  open={employeePickerOpen}
                  onOpenChange={(open) => {
                    setEmployeePickerOpen(open);
                    if (!open) setEmployeeSearchQuery('');
                  }}
                >
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-expanded={employeePickerOpen}
                      disabled={loadingData}
                      className="h-11 w-full justify-between rounded-lg bg-black text-white border border-border/60 shadow-sm hover:bg-black/90 focus:ring-2 focus:ring-primary/30 focus:border-primary/60 font-normal"
                    >
                      <span className={cn('truncate text-left', !funcionario && 'text-muted-foreground')}>
                        {loadingData ? 'Carregando...' : funcionario ? funcionario.name : 'Selecione o funcionário'}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 border bg-popover" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder={`Mín. ${MIN_EMPLOYEE_SEARCH_CHARS} caracteres (nome, matrícula ou CPF)...`}
                        value={employeeSearchQuery}
                        onValueChange={setEmployeeSearchQuery}
                      />
                      <CommandList>
                        <CommandEmpty>
                          {employeeSearchQuery.trim().length < MIN_EMPLOYEE_SEARCH_CHARS
                            ? `Digite pelo menos ${MIN_EMPLOYEE_SEARCH_CHARS} caracteres para exibir os registros.`
                            : 'Nenhum funcionário encontrado.'}
                        </CommandEmpty>
                        <CommandGroup>
                          {filteredEmployeesForPicker.map((f) => (
                            <CommandItem
                              key={f.id}
                              value={f.id}
                              onSelect={() => handleSelectEmployee(f.id)}
                              className="cursor-pointer"
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4 shrink-0',
                                  form.funcionarioId === f.id ? 'opacity-100' : 'opacity-0'
                                )}
                              />
                              <div className="flex flex-col gap-0.5 text-left min-w-0">
                                <span className="font-medium text-sm normal-case truncate">{f.name}</span>
                                {(f.registrationNumber || f.cpf || (f as { document?: string }).document) && (
                                  <span className="text-[11px] text-muted-foreground">
                                    {f.registrationNumber ? `Matr.: ${f.registrationNumber}` : ''}
                                    {f.registrationNumber && (f.cpf || (f as { document?: string }).document) ? ' · ' : ''}
                                    {(f.cpf || (f as { document?: string }).document) &&
                                      `CPF: ${formatCPF(f.cpf || (f as { document?: string }).document || '')}`}
                                  </span>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
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
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-base font-semibold">
                  Empresa
                  <span className="block text-[11px] font-normal text-muted-foreground/80">
                    Escolha a empresa responsável pela entrega.
                  </span>
                </Label>
                <Select
                  value={form.empresaId}
                  onValueChange={(value) => setForm(prev => ({ ...prev, empresaId: value }))}
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
                          <div className="flex flex-col gap-0.5 text-left">
                            <span className="font-medium text-sm normal-case">
                              {e.sigla || e.tradeName || e.name}
                            </span>
                            {(e.sigla || e.tradeName) && e.name && (
                              <span className="text-[11px] text-muted-foreground">{e.name}</span>
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
                      <div className="p-2 text-center text-sm text-gray-500">Nenhuma empresa encontrada</div>
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Detalhes do Funcionário */}
            {funcionario && (
              <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-2 font-medium">
                    <User className="h-4 w-4 text-primary" />
                    Dados do Funcionário
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
                        {(funcionario as any).position?.name || '-'}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider">Setor</Label>
                      <div className="p-2.5 bg-muted rounded-md text-sm font-medium border border-transparent hover:border-border transition-colors truncate">
                        {(funcionario as any).unit?.name || '-'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Detalhes da Empresa */}
            {empresa && (
              <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300 delay-100">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-2 font-medium">
                    <Building className="h-4 w-4 text-primary" />
                    Dados da Empresa
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Razão Social</Label>
                    <div className="p-2.5 bg-muted rounded-md text-sm font-medium border border-transparent hover:border-border transition-colors truncate">
                      {empresa.name}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider">CNPJ</Label>
                      <div className="p-2.5 bg-muted rounded-md text-sm font-medium border border-transparent hover:border-border transition-colors">
                        {empresa.cnpj ? formatCNPJ(empresa.cnpj) : '-'}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider">Sigla</Label>
                      <div className="p-2.5 bg-muted rounded-md text-sm font-medium border border-transparent hover:border-border transition-colors">
                        {empresa.sigla || '-'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {(funcionario || empresa) && <Separator />}

          {/* Dados da Entrega */}
          <div className="bg-muted/30 p-6 rounded-xl border space-y-6">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
              <Calendar className="h-4 w-4" />
              <span>Dados da Entrega</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-base font-semibold">Data de Entrega</Label>
                <Input
                  type="date"
                  value={form.dataEntrega}
                  onChange={(e) => {
                    let value = e.target.value;
                    // Limpar qualquer valor inválido ou duplicado
                    // Formato esperado: YYYY-MM-DD (10 caracteres)
                    if (value && value.length > 10) {
                      // Se o valor for maior que 10 caracteres, pode estar duplicado
                      // Tentar extrair apenas a parte válida
                      const match = value.match(/(\d{4}-\d{2}-\d{2})/);
                      if (match) {
                        value = match[1];
                      }
                    }
                    setForm(prev => ({ ...prev, dataEntrega: value }));
                  }}
                  className="h-11 bg-background"
                  max="9999-12-31"
                  pattern="\d{4}-\d{2}-\d{2}"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-base font-semibold">Responsável pela Entrega</Label>
                <Select
                  value={form.responsavelEntregaId || ''}
                  onValueChange={(value) => setForm(prev => ({ ...prev, responsavelEntregaId: value }))}
                  disabled={loadingData}
                >
                  <SelectTrigger className="h-11 bg-background">
                    <SelectValue placeholder={loadingData ? "Carregando..." : "Selecione o responsável"} />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingData ? (
                      <div className="p-2 text-center text-sm text-gray-500">Carregando funcionários...</div>
                    ) : employees.length > 0 ? (
                      employees.map(f => (
                        <SelectItem key={f.id} value={f.id}>
                          <div className="flex flex-col py-1">
                            <span className="font-medium text-base">{f.name}</span>
                            {f.document && (
                              <span className="text-xs text-muted-foreground">CPF: {f.document}</span>
                            )}
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-2 text-center text-sm text-gray-500">Nenhum funcionário encontrado</div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Exibir dados do responsável quando selecionado */}
            {responsavel && (
              <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300 pt-2">
                <div className="flex items-center justify-between border-t pt-4">
                  <div className="flex items-center gap-2 font-medium text-sm">
                    <User className="h-4 w-4 text-primary" />
                    Dados do Responsável
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Nome Completo</Label>
                    <div className="p-2.5 bg-muted rounded-md text-sm font-medium border border-transparent hover:border-border transition-colors truncate">
                      {responsavel.name}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">CPF</Label>
                    <div className="p-2.5 bg-muted rounded-md text-sm font-medium border border-transparent hover:border-border transition-colors">
                      {responsavel.cpf || responsavel.document || '-'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Lista de EPIs */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Shield className="h-4 w-4" />
                <span>EPIs Entregues</span>
              </div>
              <Button type="button" size="sm" onClick={addEpi} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Adicionar EPI
              </Button>
            </div>

            <div className="space-y-4">
              {epis.map((epi, idx) => (
                <Card key={idx} className="relative overflow-hidden border-l-4 border-l-primary/50">
                  <div className="absolute top-0 right-0 p-2">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => removeEpi(idx)}
                      disabled={epis.length === 1}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <CardContent className="p-6 pt-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Badge variant="secondary" className="font-mono">#{idx + 1}</Badge>
                    </div>

                    <div className="space-y-4">
                      {/* Primeira linha: Nome do EPI */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-2 lg:col-span-2">
                          <Label>Nome do EPI</Label>
                          <Select
                            value={epi.nome || ''}
                            onValueChange={(value) => {
                              handleEpiChange(idx, 'nome', value);
                              // Limpar campos de uniforme se mudar o EPI
                              if (value !== 'Uniforme de Trabalho') {
                                handleEpiChange(idx, 'uniformeTipo', '');
                                handleEpiChange(idx, 'uniformePeca', '');
                              }
                            }}
                          >
                            <SelectTrigger className="bg-background w-full">
                              <SelectValue placeholder="Selecione o EPI" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                              {epiOptions.map(option => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Campos padrão quando NÃO é Uniforme de Trabalho */}
                        {epi.nome !== 'Uniforme de Trabalho' && (
                          <>
                            <div className="space-y-2">
                              <Label>Quantidade</Label>
                              <Input
                                type="number"
                                min="1"
                                value={epi.quantidade}
                                onChange={(e) => handleEpiChange(idx, 'quantidade', e.target.value)}
                                className="bg-background"
                              />
                            </div>

                            <div className="space-y-2 relative">
                              <Label>CA</Label>
                              <div className="relative">
                                <Input
                                  value={epi.ca}
                                  onChange={(e) => {
                                    handleEpiChange(idx, 'ca', e.target.value);
                                    handleCASearch(idx, e.target.value);
                                  }}
                                  onBlur={() => {
                                    setTimeout(() => {
                                      if (epi.ca) {
                                        handleCABlur(idx, epi.ca);
                                      }
                                    }, 200);
                                  }}
                                  placeholder="Digite o número do CA"
                                  className="bg-background pr-8"
                                />
                                {caLoading[idx] && (
                                  <Loader2 className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
                                )}
                              </div>
                              {epi.caName && (
                                <p className="text-xs text-gray-500 mt-1">{epi.caName}</p>
                              )}
                              {showCaSuggestions[idx] && caSuggestions[idx] && caSuggestions[idx].length > 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
                                  {caSuggestions[idx].map((suggestion, sugIdx) => (
                                    <div
                                      key={sugIdx}
                                      onClick={() => handleCASelect(idx, suggestion)}
                                      className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-200 dark:border-gray-700 last:border-b-0"
                                    >
                                      <div className="font-medium text-sm">{suggestion.numero}</div>
                                      <div className="text-xs text-gray-500">{suggestion.nome || suggestion.descricao}</div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>

                      {/* Campos específicos para Uniforme de Trabalho */}
                      {epi.nome === 'Uniforme de Trabalho' && (
                        <div className="bg-seguranca-black/40 p-4 rounded-lg border border-seguranca-yellow/40 space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="font-semibold text-seguranca-lightgray">Tipo de Uniforme *</Label>
                              <Select
                                value={epi.uniformeTipo || ''}
                                onValueChange={(value) => {
                                  handleEpiChange(idx, 'uniformeTipo', value);
                                  if (value !== 'INDIVIDUAL') {
                                    handleEpiChange(idx, 'uniformePeca', '');
                                  }
                                }}
                              >
                                <SelectTrigger className="bg-background">
                                  <SelectValue placeholder="Selecione o tipo" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="COMPLETO">Completo</SelectItem>
                                  <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Se for Individual, mostrar seleção de peça */}
                            {epi.uniformeTipo === 'INDIVIDUAL' && (
                              <div className="space-y-2">
                                <Label className="font-semibold text-seguranca-lightgray">Peça do Uniforme *</Label>
                                <Select
                                  value={epi.uniformePeca || ''}
                                  onValueChange={(value) => handleEpiChange(idx, 'uniformePeca', value)}
                                >
                                  <SelectTrigger className="bg-background">
                                    <SelectValue placeholder="Selecione a peça" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {uniformePecasOptions.map(option => (
                                      <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}

                            {/* Campos comuns para uniforme */}
                            {epi.uniformeTipo && (
                              <>
                                <div className="space-y-2">
                                  <Label>Quantidade</Label>
                                  <Input
                                    type="number"
                                    min="1"
                                    value={epi.quantidade}
                                    onChange={(e) => handleEpiChange(idx, 'quantidade', e.target.value)}
                                    className="bg-background"
                                  />
                                </div>

                                <div className="space-y-2 relative">
                                  <Label>CA</Label>
                                  <div className="relative">
                                    <Input
                                      value={epi.ca}
                                      onChange={(e) => {
                                        handleEpiChange(idx, 'ca', e.target.value);
                                        handleCASearch(idx, e.target.value);
                                      }}
                                      onBlur={() => {
                                        setTimeout(() => {
                                          if (epi.ca) {
                                            handleCABlur(idx, epi.ca);
                                          }
                                        }, 200);
                                      }}
                                      placeholder="Digite o número do CA"
                                      className="bg-background pr-8"
                                    />
                                    {caLoading[idx] && (
                                      <Loader2 className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
                                    )}
                                  </div>
                                  {epi.caName && (
                                    <p className="text-xs text-gray-500 mt-1">{epi.caName}</p>
                                  )}
                                  {showCaSuggestions[idx] && caSuggestions[idx] && caSuggestions[idx].length > 0 && (
                                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
                                      {caSuggestions[idx].map((suggestion, sugIdx) => (
                                        <div
                                          key={sugIdx}
                                          onClick={() => handleCASelect(idx, suggestion)}
                                          className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-200 dark:border-gray-700 last:border-b-0"
                                        >
                                          <div className="font-medium text-sm">{suggestion.numero}</div>
                                          <div className="text-xs text-gray-500">{suggestion.nome || suggestion.descricao}</div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </>
                            )}
                          </div>

                          {/* Validade para uniforme */}
                          {epi.uniformeTipo && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Validade</Label>
                                <Input
                                  type="date"
                                  value={epi.validade}
                                  onChange={(e) => handleEpiChange(idx, 'validade', e.target.value)}
                                  className="bg-background"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Validade para EPIs que não são uniforme */}
                      {epi.nome !== 'Uniforme de Trabalho' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="space-y-2">
                            <Label>Validade</Label>
                            <Input
                              type="date"
                              value={epi.validade}
                              onChange={(e) => handleEpiChange(idx, 'validade', e.target.value)}
                              className="bg-background"
                            />
                          </div>
                        </div>
                      )}

                      {/* Observações do Item (sempre visível) */}
                      <div className="space-y-2">
                        <Label>Observações do Item</Label>
                        <Input
                          value={epi.observacoes}
                          onChange={(e) => handleEpiChange(idx, 'observacoes', e.target.value)}
                          placeholder="Observações específicas..."
                          className="bg-background"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Observações Gerais</Label>
            <Textarea
              value={form.observacoes}
              onChange={(e) => setForm(prev => ({ ...prev, observacoes: e.target.value }))}
              placeholder="Observações adicionais sobre a entrega dos EPIs..."
              rows={3}
              className="resize-none bg-background"
            />
          </div>

          <Separator />

          {/* Ações */}
          <div className="flex flex-col-reverse sm:flex-row gap-4 justify-end pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={handleSalvarFicha}
              className="flex items-center gap-2 w-full sm:w-auto h-11"
              disabled={loading || loadingData || !funcionario || !empresa}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Salvar Ficha
                </>
              )}
            </Button>
            <Button
              onClick={handlePreview}
              variant="outline"
              className="flex items-center gap-2 w-full sm:w-auto h-11"
              disabled={loading || loadingData || !funcionario || !empresa || !form.dataEntrega || epis.some(epi => !epi.nome)}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Gerando Preview...
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4" />
                  Visualizar Ficha
                </>
              )}
            </Button>
            <Button
              onClick={handleGerarPDF}
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

export default FichaEntregaEPIForm;