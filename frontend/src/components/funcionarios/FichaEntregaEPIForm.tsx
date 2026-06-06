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
import { FileText, Download, Eye, User, Building, Calendar, Shield, Plus, X, HardHat, Loader2, CheckCircle2, ChevronsUpDown, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { employeeService, SimpleEmployee } from '@/services/employeeService';
import { companyService } from '@/services/companyService';
import { EmployeeCombobox } from '../ui/employee-combobox';

import { epiDeliveryFormService } from '@/services/epiDeliveryFormService';
import { refreshEmployeeDocuments } from '@/utils/refreshEmployeeDocuments';
import { employeeAdmissionIsoDateOrToday } from '@/utils/employeeAdmissionDate';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/axios';
import { caepiService, CAEPIResponse } from '@/services/caepiService';
import { formatCPF, formatCNPJ } from '@/utils/validation';
import SignaturePad from '@/components/SignaturePad';
import { stockService } from '@/services/stockService';
import { StockItem } from '@/types/stock';
import { Switch } from '@/components/ui/switch';

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
  fichaId?: string;
  onSuccess?: () => void;
}

const MIN_EMPLOYEE_SEARCH_CHARS = 3;

function resolveCompanyIdFromEmployee(emp: SimpleEmployee | undefined): string {
  if (!emp) return '';
  return emp.companyId || '';
}

function buildWorkSectorSnapshot(emp: SimpleEmployee | null): string {
  if (!emp) return '';
  const parts = [];
  if (emp.departmentName) parts.push(emp.departmentName);
  if (emp.workPostName) parts.push(emp.workPostName);
  if (emp.unitName) parts.push(emp.unitName);
  if (emp.positionName) parts.push(emp.positionName);
  
  // Use Set to remove potential duplicates (e.g. if department and workPost have same name)
  return Array.from(new Set(parts)).filter(Boolean).join(' / ').toUpperCase();
}


const FichaEntregaEPIForm: React.FC<FichaEntregaEPIFormProps> = ({ employeeId, companyId, fichaId, onSuccess }) => {
  const { toast } = useToast();

  // Load ficha data if editing
  useEffect(() => {
    if (fichaId) {
      const loadFicha = async () => {
        try {
          setLoadingData(true);
          const ficha = await epiDeliveryFormService.getById(fichaId);
          setForm({
            funcionarioId: ficha.employeeId,
            empresaId: ficha.companyId,
            dataEntrega: ficha.deliveryDate,
            responsavelEntregaId: ficha.responsibleEmployeeId || '',
            observacoes: ficha.observations || '',
            status: ficha.status || 'DRAFT',
            signatureType: ficha.signatureType || 'ON_SCREEN',
            signatureBase64: '', // Signature is not returned for security/storage reasons in edit mode usually, or we can't edit it easily
            employeeWorkSector: ficha.employeeWorkSector || '',
            tipoEntrega: ficha.deliveryType || 'PRIMEIRA_ENTREGA',
          });
          setEpis(ficha.items.map(item => ({
            nome: item.epiName,
            quantidade: String(item.quantity),
            ca: item.ca || '',
            caName: item.caName || '',
            validade: item.validityDate || '',
            observacoes: item.observations || '',
            uniformeTipo: item.uniformType || '',
            uniformePeca: item.uniformPiece || '',
            stockItemId: item.stockItemId || '',
          })));
          
          // Trigger data resolution for employee and company
          const emp = await employeeService.getEmployeeById(ficha.employeeId);
          if (emp) {
            const mappedEmp: SimpleEmployee = {
              id: emp.id,
              name: emp.name,
              document: emp.document || emp.cpf,
              cpf: emp.cpf || emp.document,
              email: emp.email,
              phone: emp.phone,
              registrationNumber: emp.registrationNumber,
              hireDate: emp.hireDate,
              terminationDate: emp.terminationDate,
              positionName: emp.position?.name,
              unitName: emp.unit?.name,
              departmentName: emp.department?.name,
              workPostName: emp.workPost?.name,
              address: emp.address,
              companyId: emp.company?.id,
              companySigla: emp.company?.sigla,
            } as SimpleEmployee;
            setSelectedEmployeeData(mappedEmp);
          }

          if (ficha.responsibleEmployeeId) {
            const resp = await employeeService.getEmployeeById(ficha.responsibleEmployeeId);
            if (resp) {
              const mappedResp: SimpleEmployee = {
                id: resp.id,
                name: resp.name,
                document: resp.document || resp.cpf,
                cpf: resp.cpf || resp.document,
                email: resp.email,
                phone: resp.phone,
                registrationNumber: resp.registrationNumber,
                hireDate: resp.hireDate,
                terminationDate: resp.terminationDate,
                positionName: resp.position?.name,
                unitName: resp.unit?.name,
                departmentName: resp.department?.name,
                workPostName: resp.workPost?.name,
                address: resp.address,
                companyId: resp.company?.id,
                companySigla: resp.company?.sigla,
              } as SimpleEmployee;
              setSelectedResponsibleData(mappedResp);
            }
          }
        } catch (error) {
          console.error('Erro ao carregar ficha para edição:', error);
          toast({
            title: 'Erro',
            description: 'Não foi possível carregar os dados da ficha.',
            variant: 'destructive'
          });
        } finally {
          setLoadingData(false);
        }
      };
      loadFicha();
    }
  }, [fichaId]);
  
  // 1. All State and Ref declarations first
  const [form, setForm] = useState({
    funcionarioId: employeeId || '',
    empresaId: companyId || '',
    dataEntrega: new Date().toISOString().split('T')[0],
    responsavelEntregaId: '',
    observacoes: '',
    status: 'DRAFT' as 'DRAFT' | 'COMPLETED',
    signatureType: 'ON_SCREEN' as 'ON_SCREEN' | 'PHYSICAL_ACKNOWLEDGEMENT',
    signatureBase64: '',
    employeeWorkSector: '',
    tipoEntrega: 'PRIMEIRA_ENTREGA'
  });

  const [epis, setEpis] = useState([
    {
      nome: '',
      quantidade: '1',
      ca: '',
      caName: '',
      validade: '',
      observacoes: '',
      uniformeTipo: '',
      uniformePeca: '',
      stockItemId: ''
    }
  ]);

  const [caSuggestions, setCaSuggestions] = useState<{ [key: number]: CAEPIResponse[] }>({});
  const [caLoading, setCaLoading] = useState<{ [key: number]: boolean }>({});
  const [caSearchTimeouts, setCaSearchTimeouts] = useState<{ [key: number]: NodeJS.Timeout }>({});
  const [showCaSuggestions, setShowCaSuggestions] = useState<{ [key: number]: boolean }>({});

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [selectedEmployeeData, setSelectedEmployeeData] = useState<SimpleEmployee | null>(null);
  const [selectedResponsibleData, setSelectedResponsibleData] = useState<SimpleEmployee | null>(null);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [showSignaturePad, setShowSignaturePad] = useState(false);

  useEffect(() => {
    const fetchStockItems = async () => {
      try {
        const items = await stockService.getAllItems();
        setStockItems(items);
      } catch (error) {
        console.error('Erro ao buscar itens de estoque:', error);
      }
    };
    fetchStockItems();
  }, []);
  const [companies, setCompanies] = useState<any[]>([]);

  
  const prevFuncionarioIdForCompanySync = useRef<string | undefined>(undefined);


  const funcionario = selectedEmployeeData;
  const empresa = companies.find(e => e.id === form.empresaId);
  const responsavel = selectedResponsibleData;


  useEffect(() => {
    setForm(prev => ({
      ...prev,
      funcionarioId: employeeId || prev.funcionarioId,
      empresaId: companyId || prev.empresaId
    }));
  }, [employeeId, companyId]);

  useEffect(() => {
    if (!selectedEmployeeData) return;
    if (companyId) return;
    const cid = resolveCompanyIdFromEmployee(selectedEmployeeData);
    if (!cid) return;

    const funcionarioMudou = prevFuncionarioIdForCompanySync.current !== form.funcionarioId;
    prevFuncionarioIdForCompanySync.current = form.funcionarioId;

    setForm((prev) => {
      if (funcionarioMudou) return { ...prev, empresaId: cid };
      if (!prev.empresaId) return { ...prev, empresaId: cid };
      return prev;
    });
  }, [form.funcionarioId, selectedEmployeeData, companyId]);

  useEffect(() => {
    if (form.funcionarioId && !selectedEmployeeData) {
      const fetchEmployee = async () => {
        try {
          const emp = await employeeService.getEmployeeById(form.funcionarioId);
          if (emp) {
            const mappedEmp = {
              id: emp.id,
              name: emp.name,
              document: emp.document || emp.cpf,
              cpf: emp.cpf || emp.document,
              email: emp.email,
              phone: emp.phone,
              registrationNumber: emp.registrationNumber,
              hireDate: emp.hireDate,
              terminationDate: emp.terminationDate,
              positionName: emp.position?.name,
              unitName: emp.unit?.name,
              departmentName: emp.department?.name,
              workPostName: emp.workPost?.name,
              address: emp.address,
              companyId: emp.company?.id,
              companySigla: emp.company?.sigla
            } as SimpleEmployee;
            setSelectedEmployeeData(mappedEmp);
            setForm(prev => ({ ...prev, employeeWorkSector: buildWorkSectorSnapshot(mappedEmp) }));
          }
        } catch (error) {
          console.error("Erro ao carregar dados iniciais do funcionário:", error);
        }
      };
      fetchEmployee();
    }
  }, [form.funcionarioId, selectedEmployeeData]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (fichaId) return;

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
              caName: epi.caName || '',
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
            setEpis([{ 
              nome: '', 
              quantidade: '1', 
              ca: '', 
              caName: '',
              validade: '', 
              observacoes: '', 
              uniformeTipo: '', 
              uniformePeca: '' 
            }]);
          }
        }
      }
    }
  }, [form.empresaId]);


  const loadData = async () => {
    setLoadingData(true);
    try {
      const companiesData = await companyService.getAllCompanies();
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

  const handleEpiChange = (idx: number, field: string, value: any) => {
    setEpis(prevEpis => {
      const updatedEpis = [...prevEpis];
      const updatedItem = { ...updatedEpis[idx], [field]: value };
      
      if (field === 'stockItemId' && value && value !== 'none') {
        const selectedItem = stockItems.find(item => item.id === value);
        if (selectedItem && !updatedItem.nome) {
          updatedItem.nome = selectedItem.name || selectedItem.fullName || '';
        }
      }
      
      updatedEpis[idx] = updatedItem;
      return updatedEpis;
    });
  };

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

  const handleCASearch = async (idx: number, searchTerm: string) => {
    if (caSearchTimeouts[idx]) {
      clearTimeout(caSearchTimeouts[idx]);
    }

    if (!searchTerm || searchTerm.trim().length < 3) {
      setCaSuggestions(prev => ({ ...prev, [idx]: [] }));
      setShowCaSuggestions(prev => ({ ...prev, [idx]: false }));
      return;
    }

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

    if (epis.some(epi => epi.nome === 'Uniforme de Trabalho' && epi.uniformeTipo === 'INDIVIDUAL' && (!epi.stockItemId || epi.stockItemId === 'none'))) {
      toast({
        title: 'Atenção',
        description: 'Uniforme de Trabalho Individual deve ser vinculado a um item do estoque!',
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
        employeeWorkSector: form.employeeWorkSector,
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

  const handleGerarPDF = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

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
      const fullEmployee = await employeeService.getEmployeeById(funcionario.id);
      if (!fullEmployee) {
        throw new Error('Funcionário não encontrado');
      }

      const buildEpiFormData = () => ({
        employeeId: form.funcionarioId,
        companyId: form.empresaId,
        deliveryDate: form.dataEntrega,
        responsibleEmployeeId: form.responsavelEntregaId || undefined,
        observations: form.observacoes || undefined,
        deliveryType: form.tipoEntrega || 'PRIMEIRA_ENTREGA',
        signatureBase64: form.signatureBase64 || undefined,
        signatureType: form.signatureType,
        employeeWorkSector: form.employeeWorkSector || undefined,
        status: form.status,
        items: epis.map(epi => ({
          epiName: epi.nome,
          quantity: parseInt(epi.quantidade) || 1,
          ca: epi.ca || undefined,
          caName: epi.caName || undefined,
          validityDate: epi.validade || undefined,
          uniformType: epi.uniformeTipo || undefined,
          uniformPiece: epi.uniformePeca || undefined,
          observations: epi.observacoes || undefined,
          stockItemId: epi.stockItemId || undefined
        }))
      });

      const blob = await epiDeliveryFormService.generateAndSavePdf(buildEpiFormData());

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
      void refreshEmployeeDocuments(form.funcionarioId);
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

    if (form.status === 'COMPLETED' && !form.signatureBase64 && form.signatureType === 'ON_SCREEN') {
      toast({
        title: 'Assinatura Obrigatória',
        description: 'Para concluir a ficha, a assinatura do funcionário é necessária!',
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
        status: form.status,
        signatureType: form.signatureType,
        signatureBase64: form.signatureBase64 || undefined,
        employeeWorkSector: form.employeeWorkSector || undefined,
        deliveryType: form.tipoEntrega || 'PRIMEIRA_ENTREGA',
        items: epis.map(epi => ({
          epiName: epi.nome,
          quantity: parseInt(epi.quantity) || 1,
          ca: epi.ca || undefined,
          caName: epi.caName || undefined,
          validityDate: epi.validade || undefined,
          uniformType: epi.uniformeTipo || undefined,
          uniformPiece: epi.uniformePeca || undefined,
          observations: epi.observacoes || undefined,
          stockItemId: epi.stockItemId || undefined
        }))
      };

      if (fichaId) {
        await epiDeliveryFormService.update(fichaId, formData);
      } else {
        await epiDeliveryFormService.create(formData);
      }

      toast({
        title: '✅ Sucesso',
        description: form.status === 'COMPLETED' 
          ? 'Ficha concluída e estoque atualizado com sucesso!' 
          : 'Ficha salva com sucesso!',
      });
      
      if (form.status === 'COMPLETED') {
        setForm(prev => ({ ...prev, signatureBase64: '' }));
      }

      if (onSuccess) {
        onSuccess();
      }
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
                <EmployeeCombobox
                  value={form.funcionarioId}
                  onChange={(value) => setForm(prev => ({ ...prev, funcionarioId: value }))}
                  onEmployeeSelect={(emp) => {
                    setSelectedEmployeeData(emp);
                    const cid = resolveCompanyIdFromEmployee(emp);
                    setForm(prev => ({
                      ...prev,
                      funcionarioId: emp.id,
                      empresaId: cid || prev.empresaId,
                      employeeWorkSector: buildWorkSectorSnapshot(emp),
                      dataEntrega: employeeAdmissionIsoDateOrToday(emp.hireDate),
                    }));
                  }}
                />
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
                          {e.sigla ? `${e.sigla} - ${e.name}` : e.name}
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
                        {funcionario.positionName || '-'}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider">Admissão</Label>
                      <div className="p-2.5 bg-muted rounded-md text-sm font-medium border border-transparent hover:border-border transition-colors">
                        {funcionario.hireDate ? new Date(funcionario.hireDate).toLocaleDateString('pt-BR') : '-'}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider">Setor / Departamento</Label>
                      <div className="p-2.5 bg-muted rounded-md text-sm font-medium border border-transparent hover:border-border transition-colors truncate">
                        {form.employeeWorkSector || buildWorkSectorSnapshot(funcionario) || funcionario.departmentName || funcionario.unitName || '-'}
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

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              <div className="md:col-span-4 space-y-2">
                <Label className="text-base font-semibold">Data de Entrega</Label>
                <Input
                  type="date"
                  value={form.dataEntrega}
                  onChange={(e) => {
                    let value = e.target.value;
                    if (value && value.length > 10) {
                      const match = value.match(/(\d{4}-\d{2}-\d{2})/);
                      if (match) value = match[1];
                    }
                    setForm(prev => ({ ...prev, dataEntrega: value }));
                  }}
                  className="h-11 bg-background border-2 border-gray-600 focus:border-seguranca-yellow"
                  max="9999-12-31"
                />
              </div>

              <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0">
                <div className="space-y-2 min-w-0">
                  <Label className="text-base font-semibold">Setor/Trabalho</Label>
                  <Input
                    value={form.employeeWorkSector}
                    onChange={(e) => setForm(prev => ({ ...prev, employeeWorkSector: e.target.value }))}
                    placeholder="Setor/Cargo do funcionário"
                    className="h-11 bg-background border-2 border-gray-600 focus:border-seguranca-yellow"
                  />
                </div>
                <div className="space-y-2 min-w-0">
                  <Label className="text-base font-semibold">Responsável pela Entrega</Label>
                  <EmployeeCombobox
                    value={form.responsavelEntregaId}
                    onChange={(value) => setForm(prev => ({ ...prev, responsavelEntregaId: value }))}
                    onEmployeeSelect={(emp) => setSelectedResponsibleData(emp)}
                    placeholder="Selecione o responsável"
                  />
                  {!form.responsavelEntregaId && (
                    <p className="text-[10px] text-muted-foreground italic pl-1 leading-tight">
                      * Padrão: <strong>Almoxarifado</strong>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Status e Tipo de Assinatura */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-dashed">
              <div className="flex items-center justify-between p-4 bg-background rounded-lg border border-primary/20 shadow-sm">
                <div className="space-y-1">
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <CheckCircle2 className={cn("h-4 w-4", form.status === 'COMPLETED' ? "text-green-500" : "text-muted-foreground")} />
                    Status da Ficha
                  </Label>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {form.status === 'COMPLETED' 
                      ? 'CONCLUÍDA: Gera baixa automática no estoque.' 
                      : 'RASCUNHO: Apenas salva as informações.'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={form.status === 'COMPLETED' ? 'default' : 'secondary'} className="h-6">
                    {form.status === 'COMPLETED' ? 'CONCLUÍDA' : 'RASCUNHO'}
                  </Badge>
                  <Switch
                    checked={form.status === 'COMPLETED'}
                    onCheckedChange={(checked) => setForm(prev => ({ 
                      ...prev, 
                      status: checked ? 'COMPLETED' : 'DRAFT' 
                    }))}
                  />
                </div>
              </div>

              <div className="space-y-2 p-4 bg-background rounded-lg border shadow-sm">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Forma de Assinatura
                </Label>
                <Select
                  value={form.signatureType}
                  onValueChange={(value: any) => setForm(prev => ({ ...prev, signatureType: value }))}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ON_SCREEN">Assinar na Tela Digital</SelectItem>
                    <SelectItem value="PHYSICAL_ACKNOWLEDGEMENT">Assinatura em Papel (Anexo)</SelectItem>
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
                        {/* Vincular ao Estoque (Prioridade) */}
                        <div className="space-y-2 lg:col-span-2">
                          <Label className="text-sm font-medium flex items-center gap-2">
                            Vincular ao Estoque
                            <Badge variant="outline" className="text-[10px] h-4">Recomendado</Badge>
                          </Label>
                          <Select
                            value={epi.stockItemId || 'none'}
                            onValueChange={(value) => handleEpiChange(idx, 'stockItemId', value === 'none' ? '' : value)}
                          >
                            <SelectTrigger className="h-10 bg-background border-primary/20">
                              <SelectValue placeholder="Selecione um item do estoque" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Nenhum vínculo (Entrada Manual)</SelectItem>
                              {stockItems.map(item => (
                                <SelectItem key={item.id} value={item.id}>
                                  {item.fullName || item.name} {item.code ? `(${item.code})` : ''} - Saldo: {item.currentStock || 0}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-[10px] text-muted-foreground">
                            O nome do EPI será preenchido automaticamente ao selecionar um item.
                          </p>
                        </div>

                        {/* Nome do EPI */}
                        <div className="space-y-2 lg:col-span-2">
                          <Label className="text-sm font-medium">Nome do EPI / Equipamento</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                className="w-full h-10 justify-between font-normal bg-background"
                              >
                                {epi.nome || "Selecione ou digite o nome..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-full p-0" align="start">
                              <Command>
                                <CommandInput placeholder="Buscar EPI..." />
                                <CommandList>
                                  <CommandEmpty>Nenhum EPI encontrado.</CommandEmpty>
                                  <CommandGroup heading="Sugestões">
                                    {epiOptions.map((option) => (
                                      <CommandItem
                                        key={option}
                                        value={option}
                                        onSelect={() => {
                                          handleEpiChange(idx, 'nome', option);
                                          // Limpar campos de uniforme se mudar o EPI
                                          if (option !== 'Uniforme de Trabalho') {
                                            handleEpiChange(idx, 'uniformeTipo', '');
                                            handleEpiChange(idx, 'uniformePeca', '');
                                          }
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            epi.nome === option ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                        {option}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
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

          {/* Assinatura Digital */}
          {form.signatureType === 'ON_SCREEN' && (
            <div className="space-y-4 p-6 bg-muted/30 rounded-xl border border-primary/20 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>Assinatura do Funcionário</span>
                </div>
                {form.signatureBase64 ? (
                  <Badge className="bg-green-500 hover:bg-green-600 gap-1 text-white border-none">
                    <CheckCircle2 className="h-3 w-3" />
                    Assinado
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-amber-500 border-amber-500 gap-1 animate-pulse">
                    <AlertCircle className="h-3 w-3" />
                    Aguardando Assinatura
                  </Badge>
                )}
              </div>
              
              {!form.signatureBase64 ? (
                <div className="bg-white rounded-lg p-2 border-2 border-dashed border-muted-foreground/30">
                  <SignaturePad 
                    onSave={(base64) => setForm(prev => ({ ...prev, signatureBase64: base64 }))} 
                  />
                </div>
              ) : (
                <div className="relative group max-w-lg mx-auto bg-white rounded-lg border-2 border-green-200 p-4 shadow-inner">
                  <img 
                    src={form.signatureBase64} 
                    alt="Assinatura" 
                    className="max-h-32 mx-auto" 
                  />
                  <Button 
                    type="button"
                    variant="destructive" 
                    size="sm" 
                    className="absolute -top-2 -right-2 h-8 w-8 rounded-full p-0 shadow-lg"
                    onClick={() => setForm(prev => ({ ...prev, signatureBase64: '' }))}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <p className="text-[10px] text-center text-muted-foreground mt-2 uppercase tracking-widest font-mono">
                    Assinatura Digital Registrada
                  </p>
                </div>
              )}
            </div>
          )}

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
              type="button"
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
              type="button"
              onClick={() => handleGerarPDF()}
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