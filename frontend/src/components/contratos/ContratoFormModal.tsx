import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  FileText, 
  Calendar, 
  DollarSign, 
  Users, 
  Building2, 
  Plus, 
  Sparkles,
  Bell,
  CheckCircle,
  Clock,
  AlertCircle,
  CalendarDays,
  Shield,
  Briefcase,
  Sliders,
  MapPin
} from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { ptBR } from 'date-fns/locale';
import { clientService } from '@/services/clientService';
import { userService } from '@/services/userService';
import { companyService } from '@/services/companyService';
import { workPostService } from '@/services/workPostService';
import { SearchableSelect } from '@/components/ui/searchable-select';
import WorkPostFormModal from '@/components/postos/WorkPostFormModal';
import { formatCpfForInput, formatCnpjForInput } from '@/utils/validation';

type StatusType = 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'CANCELLED' | 'EXPIRED' | 'SUSPENDED';
type OriginType = 'PROPOSAL' | 'RENEWAL' | 'MANUAL';
type ContractTypeForm = 'VIGILANCIA_PATRIMONIAL' | 'PORTARIA' | 'FACILITIES';
type AdjustmentTypeForm = 'INPC' | 'IPCA' | 'MANUAL';
type TemplateTypeForm = 'ADMINISTRATIVO' | 'VIGILANCIA_PATRIMONIAL' | 'COMBINADO';

interface ContratoFormData {
  clientId: string;
  contractNumber: string;
  description: string;
  startDate: Date | null;
  endDate?: Date | null;
  value: number;
  status: StatusType;
  notes?: string;
  contractOrigin?: OriginType;
  contractType?: ContractTypeForm;
  responsibleCommercialId?: string;
  responsibleManagerId?: string;
  monthlyValue?: number;
  annualValue?: number;
  adjustmentType?: AdjustmentTypeForm;
  nextAdjustmentDate?: Date | null;
  autoRenewal?: boolean;
  notificar_rh?: boolean;
  notificar_dp?: boolean;
  notificar_operacional?: boolean;
  notificar_almoxarifado?: boolean;

  // Novos campos para minutas comerciais
  contractTemplate?: TemplateTypeForm;
  companyId?: string; // ID Físico (UUID) da filial do Secured Guard
  contractedCompanyCnpj?: string; // CNPJ texto da filial
  representativeName?: string;
  representativeCpf?: string;
  replacementTimeHours?: number;
  maxAbsenceMinutes?: number;
  patrolFrequency?: string;
  penalties?: string;
  workPostIds?: string[];
}

interface ContratoFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (data: any) => void;
  onSuccess?: () => void;
  contrato?: ContratoFormData | null;
}

export const ContratoFormModal: React.FC<ContratoFormModalProps> = ({
  open,
  onOpenChange,
  onSubmit,
  onSuccess,
  contrato
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [companiesList, setCompaniesList] = useState<any[]>([]);
  const [clientWorkPosts, setClientWorkPosts] = useState<any[]>([]);
  const [loadingWorkPosts, setLoadingWorkPosts] = useState(false);
  const [workPostModalOpen, setWorkPostModalOpen] = useState(false);
  const [lastAddedPostName, setLastAddedPostName] = useState<string | null>(null);

  const [formData, setFormData] = useState<ContratoFormData>({
    clientId: '',
    contractNumber: '',
    description: '',
    startDate: new Date(),
    endDate: null,
    value: 0,
    status: 'DRAFT',
    notes: '',
    contractOrigin: 'MANUAL',
    contractType: 'VIGILANCIA_PATRIMONIAL',
    autoRenewal: false,
    notificar_rh: false,
    notificar_dp: false,
    notificar_operacional: false,
    notificar_almoxarifado: false,

    // Minuta default
    contractTemplate: 'ADMINISTRATIVO',
    companyId: '',
    contractedCompanyCnpj: '57.303.811/0001-89',
    representativeName: '',
    representativeCpf: '',
    replacementTimeHours: 72,
    maxAbsenceMinutes: 15,
    patrolFrequency: 'Ronda preventiva a cada 2 horas',
    penalties: '',
    workPostIds: []
  });

  // Gerar número do contrato baseado no cliente selecionado
  const generateContractNumber = () => {
    if (!formData.clientId) {
      toast({
        title: "Aviso",
        description: "Selecione um cliente primeiro",
        variant: "destructive"
      });
      return;
    }

    const selectedClient = clients.find(client => client.id === formData.clientId);
    if (!selectedClient) return;

    const clientName = selectedClient.name.toUpperCase();
    const words = clientName.split(' ').filter((w: string) => w.length > 0);
    const sigla = words.map((w: string) => w.charAt(0)).join('').substring(0, 4);
    
    const currentYear = new Date().getFullYear();
    const randomSuffix = Math.random().toString(36).substr(2, 4).toUpperCase();
    
    const contractNumber = `CON-${sigla}-${currentYear}-${randomSuffix}`;
    
    setFormData(prev => ({
      ...prev,
      contractNumber
    }));

    toast({
      title: "Número Gerado",
      description: `Número do contrato gerado automaticamente: ${contractNumber}`,
    });
  };

  // Carregar listas
  useEffect(() => {
    if (open) {
      loadClients();
      loadUsers();
      loadCompanies();
    }
  }, [open]);

  // Carregar postos de trabalho do cliente selecionado
  useEffect(() => {
    if (formData.clientId) {
      loadClientWorkPosts(formData.clientId);
    } else {
      setClientWorkPosts([]);
    }
  }, [formData.clientId]);

  // Preencher dados do cliente (CNPJ, representante) quando cliente é selecionado
  useEffect(() => {
    if (formData.clientId && clients.length > 0) {
      const selectedClient = clients.find(client => client.id === formData.clientId);
      if (selectedClient) {
        setFormData(prev => ({
          ...prev,
          contractedCompanyCnpj: selectedClient.cnpj || prev.contractedCompanyCnpj,
          representativeName: selectedClient.contactName || prev.representativeName,
          representativeCpf: selectedClient.contactPhone || prev.representativeCpf
        }));
      }
    }
  }, [formData.clientId, clients]);

  const loadUsers = async () => {
    try {
      const data = await userService.getAllUsers();
      setUsers(data.map((u: any) => ({ id: u.id, name: u.name || u.username })));
    } catch { /* ignore */ }
  };

  const loadCompanies = async () => {
    try {
      const data = await companyService.getAllCompanies();
      setCompaniesList(data);
      console.log('🏢 Empresas carregadas para minutas:', data);
    } catch (error) {
      console.error('Erro ao carregar empresas:', error);
    }
  };

  // Sincronizar o ID Físico (companyId) com o CNPJ default ao carregar a lista de empresas
  useEffect(() => {
    if (companiesList.length > 0 && !formData.companyId && !contrato) {
      const targetCnpj = formData.contractedCompanyCnpj || '57.303.811/0001-89';
      const cleanTarget = targetCnpj.replace(/\D/g, '');
      const matched = companiesList.find(c => c.cnpj?.replace(/\D/g, '') === cleanTarget);
      setFormData(prev => ({
        ...prev,
        companyId: matched ? matched.id : companiesList[0].id,
        contractedCompanyCnpj: matched ? matched.cnpj : companiesList[0].cnpj
      }));
    }
  }, [companiesList, contrato]);

  const loadClientWorkPosts = async (clientId: string) => {
    setLoadingWorkPosts(true);
    try {
      console.log('🔄 Buscando postos para o cliente:', clientId);
      const data = await workPostService.getWorkPostsByClient(clientId);
      setClientWorkPosts(data || []);
      console.log('✅ Postos carregados:', data);
    } catch (error) {
      console.error('Erro ao carregar postos de trabalho do cliente:', error);
      setClientWorkPosts([]);
    } finally {
      setLoadingWorkPosts(false);
    }
  };

  const loadClients = async () => {
    try {
      const clientsData = await clientService.getClients({ page: 0, size: 1000 });
      let clientes = [];
      if (Array.isArray(clientsData)) {
        clientes = clientsData;
      } else if (clientsData && typeof clientsData === 'object') {
        if (Array.isArray(clientsData.content)) {
          clientes = clientsData.content;
        }
      }
      setClients(clientes);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os clientes",
        variant: "destructive"
      });
    }
  };

  // Carregar dados de edição se fornecido
  useEffect(() => {
    if (contrato) {
      setFormData({
        ...contrato,
        startDate: contrato.startDate ? new Date(contrato.startDate) : new Date(),
        endDate: contrato.endDate ? new Date(contrato.endDate) : null,
        status: (contrato.status as StatusType) || 'DRAFT',
        contractOrigin: (contrato as any).contractOrigin || 'MANUAL',
        contractType: (contrato as any).contractType || 'VIGILANCIA_PATRIMONIAL',
        responsibleCommercialId: (contrato as any).responsibleCommercialId,
        responsibleManagerId: (contrato as any).responsibleManagerId,
        nextAdjustmentDate: (contrato as any).nextAdjustmentDate ? new Date((contrato as any).nextAdjustmentDate) : null,
        notificar_rh: contrato.notificar_rh || false,
        notificar_dp: contrato.notificar_dp || false,
        notificar_operacional: contrato.notificar_operacional || false,
        notificar_almoxarifado: (contrato as any).notificar_almoxarifado || false,

        // Minuta campos
        contractTemplate: (contrato as any).contractTemplate || 'ADMINISTRATIVO',
        companyId: (contrato as any).companyId || '',
        contractedCompanyCnpj: (contrato as any).contractedCompanyCnpj || '57.303.811/0001-89',
        representativeName: (contrato as any).representativeName || '',
        representativeCpf: (contrato as any).representativeCpf || '',
        replacementTimeHours: (contrato as any).replacementTimeHours ?? 72,
        maxAbsenceMinutes: (contrato as any).maxAbsenceMinutes ?? 15,
        patrolFrequency: (contrato as any).patrolFrequency || 'Ronda preventiva a cada 2 horas',
        penalties: (contrato as any).penalties || '',
        workPostIds: (contrato as any).workPostIds || []
      });
    } else {
      setFormData({
        clientId: '',
        contractNumber: '',
        description: '',
        startDate: new Date(),
        endDate: null,
        value: 0,
        status: 'DRAFT',
        notes: '',
        contractOrigin: 'MANUAL',
        contractType: 'VIGILANCIA_PATRIMONIAL',
        autoRenewal: false,
        notificar_rh: false,
        notificar_dp: false,
        notificar_operacional: false,
        notificar_almoxarifado: false,

        // Defaults
        contractTemplate: 'ADMINISTRATIVO',
        companyId: '',
        contractedCompanyCnpj: '57.303.811/0001-89',
        representativeName: '',
        representativeCpf: '',
        replacementTimeHours: 72,
        maxAbsenceMinutes: 15,
        patrolFrequency: 'Ronda preventiva a cada 2 horas',
        penalties: '',
        workPostIds: []
      });
    }
  }, [contrato]);

  // Alteração inteligente do template da Minuta
  const handleTemplateChange = (template: TemplateTypeForm) => {
    let cnpj = '';
    let contractType: ContractTypeForm = 'VIGILANCIA_PATRIMONIAL';

    if (template === 'ADMINISTRATIVO') {
      cnpj = '57.303.811/0001-89'; // Promover Serviços Administrativos LTDA
      contractType = 'PORTARIA';
    } else {
      cnpj = '43.576.260/0001-12'; // Promover Vigilância Patrimonial LTDA
      contractType = 'VIGILANCIA_PATRIMONIAL';
    }

    // Achar empresa correspondente ao CNPJ
    const matched = companiesList.find(c => {
      const cClean = c.cnpj?.replace(/\D/g, '');
      const cleanTarget = cnpj.replace(/\D/g, '');
      return cClean === cleanTarget;
    });

    setFormData(prev => ({
      ...prev,
      contractTemplate: template,
      contractedCompanyCnpj: cnpj,
      contractType,
      companyId: matched ? matched.id : (prev.companyId || companiesList[0]?.id || '')
    }));

    toast({
      title: "Minuta Selecionada",
      description: `Vinculada à Filial com CNPJ: ${cnpj}`,
    });
  };

  // Alteração manual da Filial Contratada (Updates companyId AND contractedCompanyCnpj)
  const handleCompanyChange = (id: string) => {
    const matched = companiesList.find(c => c.id === id);
    if (matched) {
      setFormData(prev => ({
        ...prev,
        companyId: id,
        contractedCompanyCnpj: matched.cnpj || ''
      }));
      toast({
        title: "Filial Alterada",
        description: `Nova filial física selecionada: ${matched.name}`,
      });
    }
  };

  // Sucesso da Drawer Lateral (Opção A: Salva de forma permanente no banco de dados)
  const handleWorkPostSuccess = (newPost: any) => {
    // 1. Mostrar o aviso/confirmação explícita de que foi salvo no banco e selecionado
    toast({
      title: "Vínculo Confirmado!",
      description: `O posto "${newPost.name}" foi salvo permanentemente no banco de dados sob este cliente e selecionado automaticamente no contrato!`,
    });
    
    // 2. Alerta visual na tela por 10s
    setLastAddedPostName(newPost.name);
    setTimeout(() => {
      setLastAddedPostName(null);
    }, 10000);

    // 3. Recarregar os postos do cliente
    if (formData.clientId) {
      loadClientWorkPosts(formData.clientId);
    }

    // 4. Selecionar automaticamente na lista
    setFormData(prev => ({
      ...prev,
      workPostIds: [...(prev.workPostIds || []), newPost.id]
    }));
  };

  const handleWorkPostCheckboxChange = (postId: string, checked: boolean) => {
    setFormData(prev => {
      const currentIds = prev.workPostIds || [];
      if (checked) {
        return { ...prev, workPostIds: [...currentIds, postId] };
      } else {
        return { ...prev, workPostIds: currentIds.filter(id => id !== postId) };
      }
    });
  };

  const selectedClient = clients.find(client => client.id === formData.clientId);

  const createNotifications = async (contratoId: string, contratoData: ContratoFormData) => {
    const notifications = [];
    const selectedClient = clients.find(c => c.id === contratoData.clientId);
    const clientName = selectedClient ? selectedClient.name : 'Cliente';
    
    if (contratoData.notificar_rh) {
      notifications.push({
        contrato_id: contratoId,
        departamento: 'rh',
        titulo: 'Novo Contrato - RH',
        mensagem: `Novo contrato cadastrado com o cliente ${clientName}. Tipo: ${contratoData.contractType}. Valor: R$ ${contratoData.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`
      });
    }

    if (contratoData.notificar_dp) {
      notifications.push({
        contrato_id: contratoId,
        departamento: 'dp',
        titulo: 'Novo Contrato - DP',
        mensagem: `Novo contrato cadastrado com o cliente ${clientName}. Vigência de início: ${contratoData.startDate ? new Date(contratoData.startDate).toLocaleDateString('pt-BR') : ''}.`
      });
    }

    if (contratoData.notificar_operacional) {
      notifications.push({
        contrato_id: contratoId,
        departamento: 'operacional',
        titulo: 'Novo Contrato - Operacional',
        mensagem: `Novo contrato operacional cadastrado com ${clientName}. Tipo de serviço: ${contratoData.contractType}.`
      });
    }

    if (contratoData.notificar_almoxarifado) {
      notifications.push({
        contrato_id: contratoId,
        departamento: 'almoxarifado',
        titulo: 'Novo Contrato - Almoxarifado',
        mensagem: `Novo contrato cadastrado com o cliente ${clientName}. Verifique os materiais e equipamentos necessários para implantação.`
      });
    }

    if (notifications.length > 0) {
      const { error } = await supabase
        .from('notificacoes')
        .insert(notifications);

      if (error) {
        console.error('Erro ao criar notificações:', error);
        toast({
          title: "Aviso",
          description: "Contrato salvo, mas houve erro ao criar notificações.",
          variant: "destructive",
        });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientId) {
      toast({
        title: "Erro de Validação",
        description: "Selecione o cliente para associar ao contrato.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const contractNumber = formData.contractNumber || 
        `CON-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
      
      const contractData = {
        contractNumber,
        description: formData.description,
        startDate: formData.startDate ? formData.startDate.toISOString().split('T')[0] : '',
        endDate: formData.endDate ? formData.endDate.toISOString().split('T')[0] : null,
        value: formData.value,
        status: formData.status,
        clientId: formData.clientId,
        notes: formData.notes,
        contractOrigin: formData.contractOrigin,
        contractType: formData.contractType,
        responsibleCommercialId: formData.responsibleCommercialId || undefined,
        responsibleManagerId: formData.responsibleManagerId || undefined,
        monthlyValue: formData.monthlyValue || formData.value,
        annualValue: formData.annualValue || (formData.value * 12),
        adjustmentType: formData.adjustmentType,
        nextAdjustmentDate: formData.nextAdjustmentDate ? formData.nextAdjustmentDate.toISOString().split('T')[0] : undefined,
        autoRenewal: formData.autoRenewal,

        // Minutas comerciais
        contractTemplate: formData.contractTemplate,
        companyId: formData.companyId || undefined,
        contractedCompanyCnpj: formData.contractedCompanyCnpj,
        representativeName: formData.representativeName,
        representativeCpf: formData.representativeCpf,
        replacementTimeHours: formData.replacementTimeHours,
        maxAbsenceMinutes: formData.maxAbsenceMinutes,
        patrolFrequency: formData.patrolFrequency,
        penalties: formData.penalties,
        workPostIds: formData.workPostIds
      };
      
      console.log('📤 Enviando contrato estruturado para o backend:', contractData);
      
      if (onSubmit) {
        await onSubmit(contractData);
      } else {
        // Fallback Supabase
        const { data, error } = await supabase
          .from('contratos')
          .insert([{
            cliente: clients.find(c => c.id === formData.clientId)?.name || 'Cliente',
            tipo: formData.contractType,
            valor: formData.value,
            vigencia: formData.startDate ? formData.startDate.toISOString() : null,
            status: formData.status,
            observacoes: formData.notes,
            notificar_rh: formData.notificar_rh,
            notificar_dp: formData.notificar_dp,
            notificar_operacional: formData.notificar_operacional
          }])
          .select()
          .single();

        if (error) throw error;
        await createNotifications(data.id, formData);
      }

      toast({
        title: "Sucesso",
        description: "Contrato comercial salvo com sucesso!",
      });

      if (onSuccess) onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao salvar contrato:', error);
      toast({
        title: "Erro",
        description: error.response?.data?.message || "Erro ao salvar contrato comercial.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[850px] max-h-[90vh] overflow-y-auto bg-[#121212] border-2 border-zinc-800 text-white p-0 rounded-none select-none">
        
        {/* Header Brutalista HUD */}
        <DialogHeader className="p-5 border-b-2 border-zinc-800 bg-[#161616]">
          <div className="flex items-center gap-3">
            <div className="p-2 border border-zinc-700 bg-zinc-900 rounded-none">
              <FileText className="h-6 w-6 text-yellow-500" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-white uppercase tracking-wider flex items-center gap-2">
                {contrato ? 'Editar Contrato Comercial' : 'Novo Contrato Comercial'}
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-400 mt-1 uppercase tracking-wide">
                Configuração dinâmica de minuta comercial, filial executora e postos de trabalho
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            
            {/* CARD 1: FILIAL & TEMPLATE DE MINUTA */}
            <div className="bg-[#161616] border border-zinc-800 p-4 rounded-none space-y-4">
              <h3 className="text-xs font-bold text-yellow-500 uppercase tracking-widest flex items-center gap-1.5 border-b border-zinc-800 pb-2">
                <Building2 className="h-4 w-4" /> Filial & Modelo de Minuta
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Modelo de Minuta */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-300 font-bold uppercase">Modelo de Minuta *</Label>
                  <Select
                    value={formData.contractTemplate}
                    onValueChange={(val) => handleTemplateChange(val as TemplateTypeForm)}
                  >
                    <SelectTrigger className="bg-black border-zinc-800 text-white rounded-none h-10 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                      <SelectItem value="ADMINISTRATIVO" className="hover:bg-zinc-800 text-xs">Administrativo (Promover Serviços Administrativos)</SelectItem>
                      <SelectItem value="VIGILANCIA_PATRIMONIAL" className="hover:bg-zinc-800 text-xs">Vigilância Patrimonial (Promover Vigilância)</SelectItem>
                      <SelectItem value="COMBINADO" className="hover:bg-zinc-800 text-xs">Combinado (Ambos os Modelos Mesclados)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Filial Contratada (Physical companyId) */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-300 font-bold uppercase">Filial Contratada (Empresa Executora) *</Label>
                  <Select
                    value={formData.companyId || '__none__'}
                    onValueChange={handleCompanyChange}
                  >
                    <SelectTrigger className="bg-black border-zinc-800 text-white rounded-none h-10 text-xs">
                      <SelectValue placeholder="Selecione a Filial" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                      <SelectItem value="__none__" className="hover:bg-zinc-800 text-xs" disabled>Selecione a Filial</SelectItem>
                      {companiesList.map(c => (
                        <SelectItem key={c.id} value={c.id} className="hover:bg-zinc-800 text-xs">
                          {c.name} ({c.sigla || 'SECURE'}) - {c.cnpj}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* CNPJ Info Banner */}
              <div className="bg-zinc-900 border border-zinc-800 p-2.5 text-[10px] text-zinc-400 font-mono flex items-center justify-between">
                <span>CNPJ PROMOTOR VINCULADO: <strong className="text-yellow-500">{formData.contractedCompanyCnpj || 'N/A'}</strong></span>
                <span>REF FÍSICA ID: <strong className="text-zinc-500">{formData.companyId || 'NENHUMA'}</strong></span>
              </div>
            </div>

            {/* CARD 2: INFORMAÇÕES BÁSICAS DO CONTRATANTE & REPRESENTANTE */}
            <div className="bg-[#161616] border border-zinc-800 p-4 rounded-none space-y-4">
              <h3 className="text-xs font-bold text-yellow-500 uppercase tracking-widest flex items-center gap-1.5 border-b border-zinc-800 pb-2">
                <Users className="h-4 w-4" /> Dados do Contratante (Cliente)
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Cliente */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-300 font-bold uppercase">Cliente Contratante *</Label>
                  <SearchableSelect
                    options={clients.map(client => ({
                      value: client.id,
                      label: client.name,
                      description: client.cnpj || 'Sem CNPJ'
                    }))}
                    value={formData.clientId}
                    onChange={(value) => setFormData({ ...formData, clientId: value === 'all' ? '' : value })}
                    placeholder="Selecione o cliente"
                    searchPlaceholder="Digite o nome ou CNPJ do cliente..."
                    emptyPlaceholder="Nenhum cliente cadastrado."
                    className="border-zinc-850 bg-black text-white hover:bg-zinc-900 focus:border-yellow-500 focus:ring-yellow-500 h-10 text-xs rounded-none"
                  />
                </div>

                {/* Número do Contrato */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-300 font-bold uppercase">Número do Contrato *</Label>
                  <div className="flex gap-2">
                    <Input
                      value={formData.contractNumber}
                      onChange={(e) => setFormData({ ...formData, contractNumber: e.target.value })}
                      className="bg-black border-zinc-800 text-white placeholder-zinc-650 rounded-none focus-visible:ring-1 focus-visible:ring-yellow-500 h-10 text-xs"
                      placeholder="Deixe em branco para gerar"
                      required
                    />
                    <Button
                      type="button"
                      onClick={generateContractNumber}
                      className="bg-zinc-900 border border-zinc-700 hover:bg-yellow-500 hover:text-black rounded-none h-10 px-3 text-xs"
                      disabled={!formData.clientId}
                    >
                      <Sparkles className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Representante do Cliente */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-300 font-bold uppercase">Representante Legal (Signatário) *</Label>
                  <Input
                    value={formData.representativeName}
                    onChange={(e) => setFormData({ ...formData, representativeName: e.target.value })}
                    placeholder="Nome completo do signatário"
                    className="bg-black border-zinc-800 text-white placeholder-zinc-600 rounded-none focus-visible:ring-1 focus-visible:ring-yellow-500 h-10 text-xs"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-300 font-bold uppercase">CPF do Representante *</Label>
                  <Input
                    value={formData.representativeCpf}
                    onChange={(e) => setFormData({ ...formData, representativeCpf: formatCpfForInput(e.target.value) })}
                    placeholder="000.000.000-00"
                    className="bg-black border-zinc-800 text-white placeholder-zinc-600 rounded-none focus-visible:ring-1 focus-visible:ring-yellow-500 h-10 text-xs"
                    required
                  />
                </div>
              </div>

              {/* Descrição do Objeto */}
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-300 font-bold uppercase">Objeto do Contrato (Descrição Simplificada) *</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Ex: Prestação de serviços contínuos de portaria e vigilância patrimonial armada escala 12x36..."
                  className="bg-black border-zinc-800 text-white placeholder-zinc-600 rounded-none focus-visible:ring-1 focus-visible:ring-yellow-500 min-h-[70px] text-xs"
                  required
                />
              </div>
            </div>

            {/* CARD 3: SLA, REGRAS DE VIGILÂNCIA E FINANCEIRO */}
            <div className="bg-[#161616] border border-zinc-800 p-4 rounded-none space-y-4">
              <h3 className="text-xs font-bold text-yellow-500 uppercase tracking-widest flex items-center gap-1.5 border-b border-zinc-800 pb-2">
                <Sliders className="h-4 w-4" /> Parâmetros de SLA & Financeiro
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Valor do Contrato */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-300 font-bold uppercase">Valor Mensal (R$) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
                    className="bg-black border-zinc-800 text-green-400 font-mono rounded-none focus-visible:ring-1 focus-visible:ring-green-400 h-10 text-xs"
                    required
                  />
                </div>

                {/* Status */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-300 font-bold uppercase">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(val) => setFormData({ ...formData, status: val as StatusType })}
                  >
                    <SelectTrigger className="bg-black border-zinc-800 text-white rounded-none h-10 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#121212] border-zinc-800 text-white text-xs">
                      <SelectItem value="DRAFT" className="hover:bg-zinc-800 text-xs">DRAFT (Em Elaboração)</SelectItem>
                      <SelectItem value="ACTIVE" className="hover:bg-zinc-800 text-xs">ACTIVE (Ativo)</SelectItem>
                      <SelectItem value="PENDING" className="hover:bg-zinc-800 text-xs">PENDING (Pendente)</SelectItem>
                      <SelectItem value="INACTIVE" className="hover:bg-zinc-800 text-xs">INACTIVE (Inativo)</SelectItem>
                      <SelectItem value="CANCELLED" className="hover:bg-zinc-800 text-xs">CANCELLED (Cancelado)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* SLA: Reposição (Cláusula 3a) */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-300 font-bold uppercase">Tempo Reposição (Horas)</Label>
                  <Input
                    type="number"
                    value={formData.replacementTimeHours}
                    onChange={(e) => setFormData({ ...formData, replacementTimeHours: parseInt(e.target.value) || 72 })}
                    className="bg-black border-zinc-800 text-white rounded-none h-10 text-xs font-mono"
                  />
                </div>

                {/* SLA: Ausência Máxima (Minutos) */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-300 font-bold uppercase">Ausência Máx (Minutos)</Label>
                  <Input
                    type="number"
                    value={formData.maxAbsenceMinutes}
                    onChange={(e) => setFormData({ ...formData, maxAbsenceMinutes: parseInt(e.target.value) || 15 })}
                    className="bg-black border-zinc-800 text-white rounded-none h-10 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Rondas Frequência */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-300 font-bold uppercase">Frequência e Método de Rondas</Label>
                  <Input
                    value={formData.patrolFrequency}
                    onChange={(e) => setFormData({ ...formData, patrolFrequency: e.target.value })}
                    placeholder="Ex: Ronda preventiva ativa a cada 2 horas com bastão"
                    className="bg-black border-zinc-800 text-white placeholder-zinc-700 rounded-none h-10 text-xs"
                  />
                </div>

                {/* Tipo de Reajuste */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-300 font-bold uppercase">Índice de Reajuste Anual</Label>
                  <Select
                    value={formData.adjustmentType || 'MANUAL'}
                    onValueChange={(val) => setFormData({ ...formData, adjustmentType: val as AdjustmentTypeForm })}
                  >
                    <SelectTrigger className="bg-black border-zinc-800 text-white rounded-none h-10 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                      <SelectItem value="MANUAL" className="hover:bg-zinc-800 text-xs">Manual / Negociação Direta</SelectItem>
                      <SelectItem value="INPC" className="hover:bg-zinc-800 text-xs">INPC (Índice Nacional de Preços)</SelectItem>
                      <SelectItem value="IPCA" className="hover:bg-zinc-800 text-xs">IPCA (Inflação Oficial)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Penalidades e Multas */}
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-300 font-bold uppercase">Penalidades Especiais (Cláusula Penal Dinâmica)</Label>
                <Textarea
                  value={formData.penalties}
                  onChange={(e) => setFormData({ ...formData, penalties: e.target.value })}
                  placeholder="Cláusulas específicas de multas por descumprimento de SLA contratual..."
                  className="bg-black border-zinc-800 text-white placeholder-zinc-655 rounded-none min-h-[60px] text-xs"
                />
              </div>

              {/* Datas de Vigência */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-300 font-bold uppercase flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" /> Início da Vigência *
                  </Label>
                  <DatePicker
                    selected={formData.startDate}
                    onChange={(d) => setFormData({ ...formData, startDate: d })}
                    dateFormat="dd/MM/yyyy"
                    locale={ptBR}
                    className="w-full h-10 bg-black border border-zinc-800 text-white px-3 text-xs rounded-none focus:outline-none focus:ring-1 focus:ring-yellow-500"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-300 font-bold uppercase flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" /> Término do Contrato
                  </Label>
                  <DatePicker
                    selected={formData.endDate}
                    onChange={(d) => setFormData({ ...formData, endDate: d })}
                    dateFormat="dd/MM/yyyy"
                    locale={ptBR}
                    className="w-full h-10 bg-black border border-zinc-800 text-white px-3 text-xs rounded-none focus:outline-none"
                    placeholderText="Vigência Indeterminada"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-300 font-bold uppercase flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" /> Próximo Reajuste
                  </Label>
                  <DatePicker
                    selected={formData.nextAdjustmentDate}
                    onChange={(d) => setFormData({ ...formData, nextAdjustmentDate: d })}
                    dateFormat="dd/MM/yyyy"
                    locale={ptBR}
                    className="w-full h-10 bg-black border border-zinc-800 text-white px-3 text-xs rounded-none focus:outline-none"
                    placeholderText="Data Automática (1 Ano)"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1.5">
                <Checkbox
                  id="autoRenewal"
                  checked={formData.autoRenewal}
                  onCheckedChange={(c) => setFormData({ ...formData, autoRenewal: !!c })}
                  className="border-zinc-800 data-[state=checked]:bg-yellow-500 data-[state=checked]:text-black"
                />
                <Label htmlFor="autoRenewal" className="text-xs text-zinc-300 font-bold uppercase cursor-pointer">Permitir Renovação Automática por igual período</Label>
              </div>
            </div>

            {/* CARD 4: POSTOS DE TRABALHO VINCULADOS AO CLIENTE (CHECKLIST & DRAWER INLINE) */}
            <div className="bg-[#161616] border border-zinc-800 p-4 rounded-none space-y-4">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                <h3 className="text-xs font-bold text-yellow-500 uppercase tracking-widest flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" /> Postos de Trabalho do Cliente
                </h3>
                <Button
                  type="button"
                  onClick={() => setWorkPostModalOpen(true)}
                  disabled={!formData.clientId}
                  className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold uppercase tracking-wider rounded-none h-7 px-3 text-[10px]"
                >
                  <Plus className="h-3 w-3 mr-1" /> Novo Posto
                </Button>
              </div>

              {/* Alerta de Confirmação Explicita (Opção A) */}
              <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-none text-xs text-zinc-400 space-y-1">
                <p className="font-bold text-yellow-500 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5" /> Fluxo de Salvamento Instantâneo
                </p>
                <p>
                  Todos os postos criados no botão <strong className="text-yellow-500">"+ Novo Posto"</strong> são persistidos imediatamente no banco de dados sob o cliente. Se você decidir fechar ou cancelar este contrato, os postos cadastrados <strong className="text-white">NÃO serão perdidos</strong>.
                </p>
              </div>

              {/* Alerta Dinâmico Temporário de Sucesso */}
              {lastAddedPostName && (
                <div className="bg-green-950/40 border border-green-800 p-3 rounded-none text-xs text-green-300 animate-pulse flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-bold">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    O posto "{lastAddedPostName}" foi criado e associado ao cliente com sucesso! Já o selecionamos para você abaixo.
                  </span>
                  <button 
                    type="button" 
                    onClick={() => setLastAddedPostName(null)}
                    className="text-green-500 hover:text-green-300 font-bold"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Checklist Grid */}
              <div className="space-y-2">
                <Label className="text-xs text-zinc-300 font-bold uppercase">Selecione os postos vinculados a este contrato:</Label>
                
                {!formData.clientId ? (
                  <div className="bg-black/50 border border-dashed border-zinc-800 p-5 text-center text-xs text-zinc-500">
                    Selecione um Cliente Contratante primeiro para listar os postos de trabalho correspondentes.
                  </div>
                ) : loadingWorkPosts ? (
                  <div className="flex items-center justify-center p-6 bg-black/30 border border-zinc-800">
                    <Loader2 className="h-5 w-5 text-yellow-500 animate-spin mr-2" />
                    <span className="text-xs text-zinc-400">Carregando postos de trabalho do cliente...</span>
                  </div>
                ) : clientWorkPosts.length === 0 ? (
                  <div className="bg-black/50 border border-dashed border-zinc-800 p-5 text-center text-xs text-zinc-500 space-y-2">
                    <p>Nenhum posto de trabalho cadastrado para este cliente.</p>
                    <Button
                      type="button"
                      onClick={() => setWorkPostModalOpen(true)}
                      className="bg-zinc-900 border border-zinc-700 hover:bg-yellow-500 hover:text-black rounded-none h-7 px-3 text-[10px] uppercase font-bold"
                    >
                      Criar Primeiro Posto
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[160px] overflow-y-auto bg-black p-3 border border-zinc-800">
                    {clientWorkPosts.map(post => {
                      const isChecked = (formData.workPostIds || []).includes(post.id);
                      return (
                        <div 
                          key={post.id} 
                          className={`flex items-start gap-2.5 p-2 border transition-all ${
                            isChecked 
                              ? 'border-yellow-500/50 bg-yellow-500/5' 
                              : 'border-zinc-800 bg-[#161616] hover:border-zinc-700'
                          }`}
                        >
                          <Checkbox
                            id={`post-${post.id}`}
                            checked={isChecked}
                            onCheckedChange={(checked) => handleWorkPostCheckboxChange(post.id, !!checked)}
                            className="mt-0.5 border-zinc-800 data-[state=checked]:bg-yellow-500 data-[state=checked]:text-black"
                          />
                          <div className="space-y-0.5">
                            <Label 
                              htmlFor={`post-${post.id}`} 
                              className="text-xs font-bold text-white uppercase tracking-wide cursor-pointer flex items-center gap-1.5"
                            >
                              {post.name} 
                              <Badge className="bg-zinc-800 text-zinc-400 font-mono text-[9px] hover:bg-zinc-800 border-none rounded-none px-1 h-3.5">
                                {post.postCode}
                              </Badge>
                            </Label>
                            <p className="text-[10px] text-zinc-500 font-mono">
                              {post.workSchedule} • {post.shiftStart}-{post.shiftEnd} • Efetivo: {post.requiredVigilantes || 1}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* CARD 5: NOTIFICAÇÕES DE DEPARTAMENTO & OBSERVAÇÕES */}
            <div className="bg-[#161616] border border-zinc-800 p-4 rounded-none space-y-4">
              <h3 className="text-xs font-bold text-yellow-500 uppercase tracking-widest flex items-center gap-1.5 border-b border-zinc-800 pb-2">
                <Bell className="h-4 w-4" /> Alertas Automáticos de Implantação
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="flex items-center space-x-3 p-2.5 bg-black border border-zinc-800 rounded-none">
                  <Checkbox
                    id="notificar_rh"
                    checked={formData.notificar_rh}
                    onCheckedChange={(c) => setFormData({ ...formData, notificar_rh: !!c })}
                    className="border-zinc-800 data-[state=checked]:bg-yellow-500 data-[state=checked]:text-black"
                  />
                  <Label htmlFor="notificar_rh" className="text-zinc-300 text-xs font-bold uppercase cursor-pointer">Recursos Humanos</Label>
                </div>

                <div className="flex items-center space-x-3 p-2.5 bg-black border border-zinc-800 rounded-none">
                  <Checkbox
                    id="notificar_dp"
                    checked={formData.notificar_dp}
                    onCheckedChange={(c) => setFormData({ ...formData, notificar_dp: !!c })}
                    className="border-zinc-800 data-[state=checked]:bg-yellow-500 data-[state=checked]:text-black"
                  />
                  <Label htmlFor="notificar_dp" className="text-zinc-300 text-xs font-bold uppercase cursor-pointer">Depto Pessoal</Label>
                </div>

                <div className="flex items-center space-x-3 p-2.5 bg-black border border-zinc-800 rounded-none">
                  <Checkbox
                    id="notificar_operacional"
                    checked={formData.notificar_operacional}
                    onCheckedChange={(c) => setFormData({ ...formData, notificar_operacional: !!c })}
                    className="border-zinc-800 data-[state=checked]:bg-yellow-500 data-[state=checked]:text-black"
                  />
                  <Label htmlFor="notificar_operacional" className="text-zinc-300 text-xs font-bold uppercase cursor-pointer">Operacional (Rondas)</Label>
                </div>

                <div className="flex items-center space-x-3 p-2.5 bg-black border border-zinc-800 rounded-none">
                  <Checkbox
                    id="notificar_almoxarifado"
                    checked={formData.notificar_almoxarifado}
                    onCheckedChange={(c) => setFormData({ ...formData, notificar_almoxarifado: !!c })}
                    className="border-zinc-800 data-[state=checked]:bg-yellow-500 data-[state=checked]:text-black"
                  />
                  <Label htmlFor="notificar_almoxarifado" className="text-zinc-300 text-xs font-bold uppercase cursor-pointer">Almoxarifado</Label>
                </div>
              </div>

              {/* Observações Gerais */}
              <div className="space-y-1.5 pt-2">
                <Label className="text-xs text-zinc-300 font-bold uppercase">Observações e Notas do Contrato</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Qualquer anotação comercial ou administrativa adicional pertinente a este contrato..."
                  className="bg-black border-zinc-800 text-white placeholder-zinc-650 rounded-none min-h-[60px] text-xs"
                />
              </div>
            </div>

          </div>

          {/* Footer Brutalista com Ações */}
          <div className="p-4 border-t-2 border-zinc-800 bg-[#161616] flex gap-3 justify-end">
            <Button
              type="button"
              onClick={() => onOpenChange(false)}
              className="border-zinc-700 hover:bg-zinc-900 hover:text-white rounded-none bg-transparent text-zinc-300 text-xs uppercase font-bold tracking-wider px-5 h-10"
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold uppercase tracking-wider rounded-none min-w-[140px] text-xs h-10"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  {contrato ? 'Atualizar Contrato' : 'Criar Contrato'}
                </>
              )}
            </Button>
          </div>
        </form>

        <WorkPostFormModal
          open={workPostModalOpen}
          onOpenChange={setWorkPostModalOpen}
          clients={clients}
          onSubmit={(savedWorkPost) => {
            setWorkPostModalOpen(false);
            if (savedWorkPost) {
              handleWorkPostSuccess(savedWorkPost);
              return;
            }
            if (formData.clientId) {
              void loadClientWorkPosts(formData.clientId);
            }
          }}
          forcedClientId={formData.clientId || undefined}
          defaultAddress={selectedClient?.address}
          defaultCity={selectedClient?.city}
          defaultState={selectedClient?.state}
          defaultZipCode={selectedClient?.zipCode}
        />

      </DialogContent>
    </Dialog>
  );
};
