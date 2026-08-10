import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Building2, Mail, Phone, MapPin, User, Hash,
  FileText, Save, X, Smartphone, Home, CreditCard, CheckCircle,
  Briefcase, Plus, Edit, Trash2, Eye
} from 'lucide-react';
import { Client, ClientFormData, ClientStatus } from '@/types/client';
import { clientService } from '@/services/clientService';
import { workPostService, WorkPost } from '@/services/workPostService';
import { companyService, DEFAULT_GROUP_COMPANIES } from '@/services/companyService';
import { useToast } from '@/hooks/use-toast';
import WorkPostFormModal from '@/components/postos/WorkPostFormModal';
import WorkPostDeleteDialog from '@/components/postos/WorkPostDeleteDialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const CLIENT_NOTIFICATION_DEPARTMENTS = [
  { id: 'comercial', label: 'Comercial' },
  { id: 'operacional', label: 'Operacional' },
  { id: 'pessoal', label: 'DP / Pessoal' },
  { id: 'rh', label: 'Recursos Humanos' },
  { id: 'financeiro', label: 'Financeiro' },
  { id: 'almoxarifado', label: 'Almoxarifado' },
  { id: 'administrador', label: 'Administrador' }
] as const;

const CLIENT_EMAIL_PLACEHOLDERS = new Set([
  'contato@empresa.com',
  'email@empresa.com',
  'cliente@empresa.com'
]);

// Funções de máscara
const formatCNPJ = (value: string): string => {
  // Remove todos os caracteres não numéricos
  const numbers = value.replace(/\D/g, '');

  // Aplica a máscara do CNPJ: 00.000.000/0000-00
  if (numbers.length <= 2) {
    return numbers;
  } else if (numbers.length <= 5) {
    return `${numbers.slice(0, 2)}.${numbers.slice(2)}`;
  } else if (numbers.length <= 8) {
    return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5)}`;
  } else if (numbers.length <= 12) {
    return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8)}`;
  } else {
    return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12, 14)}`;
  }
};

const formatPhone = (value: string): string => {
  // Remove todos os caracteres não numéricos
  const numbers = value.replace(/\D/g, '');

  // Aplica a máscara do telefone: (00) 0000-0000 ou (00) 00000-0000
  if (numbers.length <= 2) {
    return numbers;
  } else if (numbers.length <= 6) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  } else if (numbers.length <= 10) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
  } else {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  }
};

const formatZipCode = (value: string): string => {
  // Remove todos os caracteres não numéricos
  const numbers = value.replace(/\D/g, '');

  // Aplica a máscara do CEP: 00000-000
  if (numbers.length <= 5) {
    return numbers;
  } else {
    return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
  }
};

interface ClientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (createdClient?: Client) => void;
  client?: Client;
}

export const ClientFormModal: React.FC<ClientFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  client
}) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dados-basicos');
  const [activeClient, setActiveClient] = useState<Client | undefined>(client);
  const [formData, setFormData] = useState<ClientFormData>({
    name: '',
    cnpj: '',
    email: '',
    phone: '',
    mobile: '',
    address: '',
    neighborhood: '',
    addressNumber: '',
    addressComplement: '',
    city: '',
    state: '',
    zipCode: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    status: ClientStatus.ACTIVE,
    notes: ''
  });

  const [workPosts, setWorkPosts] = useState<WorkPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [isPostFormOpen, setIsPostFormOpen] = useState(false);
  const [isPostDeleteDialogOpen, setIsPostDeleteDialogOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<WorkPost | null>(null);
  const [editingPost, setEditingPost] = useState<WorkPost | null>(null);
  const [selectedPostIds, setSelectedPostIds] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [loadingCep, setLoadingCep] = useState(false);
  const [companies, setCompanies] = useState<Array<{ id: string; name: string; sigla?: string }>>([]);

  const handleToggleSelectAllPosts = (checked: boolean) => {
    if (checked) {
      setSelectedPostIds(workPosts.map((p) => p.id));
    } else {
      setSelectedPostIds([]);
    }
  };

  const handleToggleSelectPost = (postId: string, checked: boolean) => {
    if (checked) {
      setSelectedPostIds((prev) => Array.from(new Set([...prev, postId])));
    } else {
      setSelectedPostIds((prev) => prev.filter((id) => id !== postId));
    }
  };

  const handleExecuteBulkDeletePosts = async () => {
    if (selectedPostIds.length === 0) return;
    setIsBulkDeleting(true);
    try {
      await Promise.all(selectedPostIds.map((id) => workPostService.deleteWorkPost(id)));
      toast({
        title: "✅ Exclusão em Massa Concluída",
        description: `${selectedPostIds.length} setor(es) de trabalho foi(ram) excluído(s) com sucesso.`,
      });
      setSelectedPostIds([]);
      setIsBulkDeleteDialogOpen(false);
      loadWorkPosts();
    } catch (error) {
      console.error('Erro ao excluir setores em massa:', error);
      toast({
        title: "❌ Erro na Exclusão",
        description: "Ocorreu um erro ao excluir alguns setores de trabalho.",
        variant: "destructive",
      });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleExecuteDeletePost = async (post: WorkPost) => {
    try {
      await workPostService.deleteWorkPost(post.id);
      toast({
        title: "✅ Setor de Trabalho removido",
        description: `O setor de trabalho "${post.name}" foi excluído com sucesso.`,
      });
      loadWorkPosts();
    } catch (error) {
      console.error('Erro ao excluir setor de trabalho:', error);
      toast({
        title: "❌ Erro ao excluir",
        description: "Não foi possível excluir o setor de trabalho.",
        variant: "destructive",
      });
    } finally {
      setDeletingPostId(null);
    }
  };

  const buscarCep = async (cep: string) => {
    const cepLimpo = cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) return;

    setLoadingCep(true);
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cep/v1/${cepLimpo}`);

      if (response.ok) {
        const data = await response.json();
        const enderecoLogradouro = data.street || '';
        setFormData(prev => ({
          ...prev,
          address: enderecoLogradouro || prev.address,
          neighborhood: data.neighborhood || prev.neighborhood,
          city: data.city || prev.city,
          state: data.state || prev.state,
          zipCode: formatZipCode(cepLimpo)
        }));
        toast({
          title: "CEP encontrado",
          description: "Endereço preenchido automaticamente.",
        });
      } else {
        toast({
          title: "CEP não encontrado",
          description: "Verifique o CEP digitado.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      toast({
        title: "Erro",
        description: "Não foi possível buscar o CEP.",
        variant: "destructive",
      });
    } finally {
      setLoadingCep(false);
    }
  };

  const loadWorkPosts = async () => {
    if (!activeClient?.id) return;
    try {
      setLoadingPosts(true);
      const posts = await workPostService.getWorkPostsByClient(activeClient.id);
      setWorkPosts(posts);
    } catch (error) {
      console.error('Erro ao carregar postos:', error);
    } finally {
      setLoadingPosts(false);
    }
  };

  useEffect(() => {
    if (isOpen && activeClient?.id && activeTab === 'postos-de-trabalho') {
      loadWorkPosts();
    }
  }, [isOpen, activeClient, activeTab]);

  useEffect(() => {
    if (!isOpen) return;

    const loadCompanies = async () => {
      try {
        const data = await companyService.getAllCompanies();
        const list = Array.isArray(data) && data.length > 0 ? data : DEFAULT_GROUP_COMPANIES;
        const ordered = [...list].sort((a, b) =>
          `${a.sigla || a.name || ''}`.localeCompare(`${b.sigla || b.name || ''}`, 'pt-BR', { sensitivity: 'base' })
        );
        setCompanies(ordered);
      } catch (error) {
        console.error('Erro ao carregar empresas para o cliente:', error);
        setCompanies(DEFAULT_GROUP_COMPANIES);
      }
    };

    void loadCompanies();
  }, [isOpen]);

  useEffect(() => {
    setActiveClient(client);
    if (client) {
      setFormData({
        name: client.name,
        cnpj: formatCNPJ(client.cnpj), // Aplicar máscara ao CNPJ
        companyId: client.companyId || '',
        email: client.email || '',
        phone: client.phone ? formatPhone(client.phone) : '',
        mobile: client.mobile ? formatPhone(client.mobile) : '',
        address: client.address || '',
        neighborhood: client.neighborhood || '',
        addressNumber: client.addressNumber || '',
        addressComplement: client.addressComplement || '',
        city: client.city || '',
        state: client.state || '',
        zipCode: client.zipCode ? formatZipCode(client.zipCode) : '',
        contactName: client.contactName || '',
        contactEmail: client.contactEmail || '',
        contactPhone: client.contactPhone ? formatPhone(client.contactPhone) : '',
        status: client.status,
        notes: client.notes || '',
        notifiedDepartments: client.notifiedDepartments || []
      });
    } else {
      setFormData({
        name: '',
        cnpj: '',
        companyId: '',
        email: '',
        phone: '',
        mobile: '',
        address: '',
        neighborhood: '',
        addressNumber: '',
        addressComplement: '',
        city: '',
        state: '',
        zipCode: '',
        contactName: '',
        contactEmail: '',
        contactPhone: '',
        status: ClientStatus.ACTIVE,
        notes: '',
        notifiedDepartments: []
      });
    }
    setActiveTab('dados-basicos');
  }, [client, isOpen]);

  const handleInputChange = (field: keyof ClientFormData, value: string) => {
    let formattedValue = value;

    // Aplicar máscaras específicas
    if (field === 'cnpj') {
      formattedValue = formatCNPJ(value);
    } else if (field === 'phone' || field === 'mobile' || field === 'contactPhone') {
      formattedValue = formatPhone(value);
    } else if (field === 'zipCode') {
      formattedValue = formatZipCode(value);
    }

    setFormData(prev => ({
      ...prev,
      [field]: formattedValue
    }));
  };

  // Seleção de empresa do cliente (o backend aceita uma única companyId)
  const selectedCompanyIds = (formData.companyId || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);

  const handleToggleCompany = (companyId: string, checked: boolean) => {
    // Apenas uma empresa: marcar substitui a anterior; desmarcar limpa
    handleInputChange('companyId', checked ? companyId : '');
  };

  const handleRemoveCompany = (_companyId: string) => {
    handleInputChange('companyId', '');
  };

  const buildClientPayload = () => {
    const companyIds = (formData.companyId || '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
    // Backend espera UUID único — nunca enviar lista separada por vírgula
    const companyId = companyIds[0] || undefined;

    return {
      ...formData,
      cnpj: formData.cnpj.replace(/\D/g, ''),
      companyId,
      email: normalizeOptionalEmail(formData.email),
      contactEmail: normalizeOptionalEmail(formData.contactEmail),
      phone: formData.phone?.replace(/\D/g, '') || undefined,
      mobile: formData.mobile?.replace(/\D/g, '') || undefined,
      address: formData.address?.trim() || undefined,
      neighborhood: formData.neighborhood?.trim() || undefined,
      addressNumber: formData.addressNumber?.trim() || undefined,
      addressComplement: formData.addressComplement?.trim() || undefined,
      city: formData.city?.trim() || undefined,
      state: formData.state?.trim().toUpperCase().slice(0, 2) || undefined,
      zipCode: formData.zipCode?.replace(/\D/g, '') || undefined,
      contactName: formData.contactName?.trim() || undefined,
      contactPhone: formData.contactPhone?.replace(/\D/g, '') || undefined,
      notes: formData.notes?.trim() || undefined,
      notifiedDepartments: (formData.notifiedDepartments || []).filter(Boolean)
    };
  };

  const normalizeOptionalEmail = (value?: string) => {
    const normalized = value?.trim().toLowerCase() || '';
    if (!normalized || CLIENT_EMAIL_PLACEHOLDERS.has(normalized)) {
      return undefined;
    }
    return normalized;
  };

  const persistClient = async (options?: { openPostFormAfterSave?: boolean }) => {
    setIsLoading(true);

    try {
      console.log('[DEBUG] ClientFormModal - Dados do formulário:', formData);

      const cleanData = buildClientPayload();
      if (!cleanData.companyId) {
        toast({
          title: "Empresa obrigatória",
          description: "Selecione a empresa vinculada ao cliente antes de salvar.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      if (!cleanData.cnpj || String(cleanData.cnpj).replace(/\D/g, '').length !== 14) {
        toast({
          title: "CNPJ inválido",
          description: "Informe um CNPJ com 14 dígitos.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      if (activeClient) {
        const saved = await clientService.updateClient(activeClient.id, cleanData);
        toast({
          title: "✅ Cliente atualizado",
          description: "As informações do cliente foram atualizadas com sucesso!",
        });
        setActiveClient(saved);
        onSuccess(saved);
        if (options?.openPostFormAfterSave) {
          setActiveTab('postos-de-trabalho');
          setEditingPost(null);
          setIsPostFormOpen(true);
          return saved;
        }
        onClose();
        return saved;
      } else {
        console.log('[DEBUG] ClientFormModal - Criando novo cliente com dados:', cleanData);
        const saved = await clientService.createClient(cleanData);
        console.log('[DEBUG] ClientFormModal - Cliente criado com sucesso:', saved);
        
        setActiveClient(saved);
        toast({
          title: "✅ Cliente criado",
          description: `Cliente ${formData.name} foi criado com sucesso! Agora você pode cadastrar postos de trabalho para ele na aba "Postos de Trabalho".`,
        });
        onSuccess(saved);
        setActiveTab('postos-de-trabalho');
        if (options?.openPostFormAfterSave) {
          setEditingPost(null);
          setIsPostFormOpen(true);
        }
        return saved;
      }
    } catch (error: any) {
      console.error('[ERROR] ClientFormModal - Erro ao salvar cliente:', error);
      console.error('[ERROR] ClientFormModal - Response data:', error.response?.data);
      const apiMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        (typeof error.response?.data === 'string' ? error.response.data : null);
      toast({
        title: "❌ Erro ao salvar cliente",
        description: apiMessage || "Não foi possível salvar o cliente. Verifique CNPJ, empresa e demais campos.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await persistClient();
  };

  const formatCnpj = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length === 11) {
      return numbers.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
    } else if (numbers.length === 10) {
      return numbers.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
    }
    return numbers;
  };

  const formatZipCode = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/^(\d{5})(\d{3})$/, '$1-$2');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-4xl h-[85vh] max-h-[850px] flex flex-col overflow-hidden bg-gradient-to-br from-seguranca-graphite to-seguranca-black border-2 border-gray-600/50 text-white p-0 sm:w-full">
        {/* Header */}
        <DialogHeader className="shrink-0 px-6 pt-5 pb-3 border-b border-gray-600/30 bg-seguranca-black/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-seguranca-red/20 border border-seguranca-red/30">
              <Building2 className="h-5 w-5 text-seguranca-red" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                {activeClient ? 'Editar Cliente' : 'Novo Cliente'}
              </DialogTitle>
              <p className="text-xs text-gray-400 mt-0.5">
                {activeClient ? 'Atualize as informações do cliente' : 'Preencha os dados do novo cliente'}
              </p>
            </div>
          </div>
          <DialogDescription className="sr-only">
            Modal para criar ou editar cliente, notificações e postos de trabalho vinculados.
          </DialogDescription>
        </DialogHeader>

        {/* Form Content */}
        <form onSubmit={handleSubmit} autoComplete="off" className="flex flex-1 flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="flex w-full overflow-x-auto bg-seguranca-black/50 border border-gray-600/30 p-1 no-scrollbar space-x-1">
                <TabsTrigger
                  value="dados-basicos"
                  className="min-w-fit px-4 flex-1 data-[state='active']:bg-seguranca-red data-[state='active']:text-white text-gray-400 whitespace-nowrap"
                >
                  <Building2 className="h-4 w-4 mr-2" />
                  Dados Básicos
                </TabsTrigger>
                <TabsTrigger
                  value="endereco"
                  className="min-w-fit px-4 flex-1 data-[state='active']:bg-seguranca-red data-[state='active']:text-white text-gray-400 whitespace-nowrap"
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  Endereço
                </TabsTrigger>
                <TabsTrigger
                  value="contato"
                  className="min-w-fit px-4 flex-1 data-[state='active']:bg-seguranca-red data-[state='active']:text-white text-gray-400 whitespace-nowrap"
                >
                  <User className="h-4 w-4 mr-2" />
                  Contato
                </TabsTrigger>
                <TabsTrigger
                  value="notificacoes"
                  className="min-w-fit px-4 flex-1 data-[state='active']:bg-seguranca-red data-[state='active']:text-white text-gray-400 whitespace-nowrap"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Notificações
                </TabsTrigger>
                <TabsTrigger
                  value="postos-de-trabalho"
                  className="min-w-fit px-4 flex-1 data-[state='active']:bg-seguranca-red data-[state='active']:text-white text-gray-400 whitespace-nowrap"
                >
                  <Briefcase className="h-4 w-4 mr-2" />
                  Setores de Trabalho
                </TabsTrigger>
              </TabsList>

              {/* Dados Básicos */}
              <TabsContent value="dados-basicos" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="name" className="text-seguranca-lightgray flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Nome da Empresa <span className="text-seguranca-red">*</span>
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Nome completo do cliente"
                      className="border-gray-600 bg-seguranca-black/70 text-seguranca-lightgray placeholder:text-gray-500 focus:border-seguranca-yellow focus:ring-seguranca-yellow/20 h-11"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cnpj" className="text-seguranca-lightgray flex items-center gap-2">
                      <Hash className="h-4 w-4" />
                      CNPJ <span className="text-seguranca-red">*</span>
                    </Label>
                    <Input
                      id="cnpj"
                      value={formData.cnpj}
                      onChange={(e) => handleInputChange('cnpj', formatCnpj(e.target.value))}
                      placeholder="00.000.000/0000-00"
                      maxLength={18}
                      className="border-gray-600 bg-seguranca-black/70 text-seguranca-lightgray placeholder:text-gray-500 focus:border-seguranca-yellow focus:ring-seguranca-yellow/20 font-mono h-11"
                      required
                    />
                  </div>

                  <div className="space-y-3 md:col-span-2">
                    <Label htmlFor="companyId" className="text-seguranca-lightgray flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Empresa Vinculada <span className="text-seguranca-red">*</span>
                    </Label>
                    <p className="text-xs text-gray-500">Selecione uma empresa do grupo (obrigatório).</p>
                    
                    {/* Lista de Checkboxes de Empresas */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 border border-gray-600/60 rounded-lg p-3 bg-seguranca-black/70">
                      {companies.map((company) => {
                        const isChecked = selectedCompanyIds.includes(company.id);
                        const labelText = company.sigla ? `${company.sigla} - ${company.name}` : company.name;
                        return (
                          <div key={company.id} className="flex items-center space-x-2 p-1.5 rounded hover:bg-seguranca-graphite/40 transition-colors">
                            <input
                              type="checkbox"
                              id={`client-company-${company.id}`}
                              checked={isChecked}
                              onChange={(e) => handleToggleCompany(company.id, e.target.checked)}
                              className="rounded border-gray-500 text-amber-500 focus:ring-amber-500 h-4 w-4 accent-amber-500 cursor-pointer"
                            />
                            <Label htmlFor={`client-company-${company.id}`} className="cursor-pointer text-xs font-medium text-gray-200">
                              {labelText}
                            </Label>
                          </div>
                        );
                      })}
                    </div>

                    {/* Badges de Empresas Selecionadas */}
                    {selectedCompanyIds.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-xs font-medium text-gray-400">
                          Empresa selecionada:
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {selectedCompanyIds.map((compKey) => {
                            const compObj = companies.find((c) => c.id === compKey);
                            const name = compObj ? (compObj.sigla ? `${compObj.sigla} - ${compObj.name}` : compObj.name) : compKey;
                            return (
                              <Badge key={compKey} variant="secondary" className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs flex items-center gap-1.5 py-1 px-2.5">
                                <span>{name}</span>
                                <X
                                  className="h-3.5 w-3.5 cursor-pointer text-amber-300/70 hover:text-white"
                                  onClick={() => handleRemoveCompany(compKey)}
                                />
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status" className="text-seguranca-lightgray flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Status
                    </Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => handleInputChange('status', value as ClientStatus)}
                    >
                      <SelectTrigger className="border-gray-600 bg-seguranca-black/70 text-seguranca-lightgray focus:border-seguranca-yellow focus:ring-seguranca-yellow/20 h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-seguranca-black border-gray-600">
                        <SelectItem value={ClientStatus.ACTIVE} className="text-green-300 hover:bg-seguranca-graphite">
                          ✅ Ativo
                        </SelectItem>
                        <SelectItem value={ClientStatus.INACTIVE} className="text-gray-300 hover:bg-seguranca-graphite">
                          ⭕ Inativo
                        </SelectItem>
                        <SelectItem value={ClientStatus.SUSPENDED} className="text-red-300 hover:bg-seguranca-graphite">
                          🚫 Suspenso
                        </SelectItem>
                        <SelectItem value={ClientStatus.PENDING} className="text-yellow-300 hover:bg-seguranca-graphite">
                          ⏳ Pendente
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-seguranca-lightgray flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email
                    </Label>
                    <Input
                      id="email"
                      name="client_optional_email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="contato@empresa.com"
                      autoComplete="new-password"
                      spellCheck={false}
                      className="border-gray-600 bg-seguranca-black/70 text-seguranca-lightgray placeholder:text-gray-500 focus:border-seguranca-yellow focus:ring-seguranca-yellow/20 h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-seguranca-lightgray flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Telefone
                    </Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', formatPhone(e.target.value))}
                      placeholder="(00) 0000-0000"
                      maxLength={15}
                      className="border-gray-600 bg-seguranca-black/70 text-seguranca-lightgray placeholder:text-gray-500 focus:border-seguranca-yellow focus:ring-seguranca-yellow/20 h-11"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="notes" className="text-seguranca-lightgray flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Observações
                    </Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                      placeholder="Informações adicionais sobre o cliente..."
                      rows={3}
                      className="border-gray-600 bg-seguranca-black/70 text-seguranca-lightgray placeholder:text-gray-500 focus:border-seguranca-yellow focus:ring-seguranca-yellow/20 resize-none"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Endereço */}
              <TabsContent value="endereco" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="zipCode" className="text-seguranca-lightgray flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      CEP
                    </Label>
                    <Input
                      id="zipCode"
                      value={formData.zipCode}
                      onChange={(e) => {
                        const val = formatZipCode(e.target.value);
                        handleInputChange('zipCode', val);
                        void buscarCep(val.replace(/\D/g, ''));
                      }}
                      placeholder="00000-000"
                      maxLength={9}
                      className="border-gray-600 bg-seguranca-black/70 text-seguranca-lightgray placeholder:text-gray-500 focus:border-seguranca-yellow focus:ring-seguranca-yellow/20 font-mono h-11"
                    />
                    {loadingCep && (
                      <p className="text-xs text-seguranca-yellow animate-pulse">Buscando endereço via CEP...</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="state" className="text-seguranca-lightgray flex items-center gap-2">
                      <Home className="h-4 w-4" />
                      Estado (UF)
                    </Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => handleInputChange('state', e.target.value.toUpperCase())}
                      placeholder="UF"
                      maxLength={2}
                      className="border-gray-600 bg-seguranca-black/70 text-seguranca-lightgray placeholder:text-gray-500 focus:border-seguranca-yellow focus:ring-seguranca-yellow/20 uppercase h-11"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address" className="text-seguranca-lightgray flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Logradouro (Rua/Avenida)
                    </Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      placeholder="Nome da rua ou avenida"
                      className="border-gray-600 bg-seguranca-black/70 text-seguranca-lightgray placeholder:text-gray-500 focus:border-seguranca-yellow focus:ring-seguranca-yellow/20 h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="addressNumber" className="text-seguranca-lightgray flex items-center gap-2">
                      <Home className="h-4 w-4" />
                      Número
                    </Label>
                    <Input
                      id="addressNumber"
                      value={formData.addressNumber}
                      onChange={(e) => handleInputChange('addressNumber', e.target.value)}
                      placeholder="Nº"
                      className="border-gray-600 bg-seguranca-black/70 text-seguranca-lightgray placeholder:text-gray-500 focus:border-seguranca-yellow focus:ring-seguranca-yellow/20 h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="addressComplement" className="text-seguranca-lightgray flex items-center gap-2">
                      <Home className="h-4 w-4" />
                      Complemento
                    </Label>
                    <Input
                      id="addressComplement"
                      value={formData.addressComplement}
                      onChange={(e) => handleInputChange('addressComplement', e.target.value)}
                      placeholder="Apto, sala, bloco..."
                      className="border-gray-600 bg-seguranca-black/70 text-seguranca-lightgray placeholder:text-gray-500 focus:border-seguranca-yellow focus:ring-seguranca-yellow/20 h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="neighborhood" className="text-seguranca-lightgray flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Bairro
                    </Label>
                    <Input
                      id="neighborhood"
                      value={formData.neighborhood}
                      onChange={(e) => handleInputChange('neighborhood', e.target.value)}
                      placeholder="Bairro"
                      className="border-gray-600 bg-seguranca-black/70 text-seguranca-lightgray placeholder:text-gray-500 focus:border-seguranca-yellow focus:ring-seguranca-yellow/20 h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city" className="text-seguranca-lightgray flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Cidade
                    </Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      placeholder="Nome da cidade"
                      className="border-gray-600 bg-seguranca-black/70 text-seguranca-lightgray placeholder:text-gray-500 focus:border-seguranca-yellow focus:ring-seguranca-yellow/20 h-11"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Contato */}
              <TabsContent value="contato" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="contactName" className="text-seguranca-lightgray flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Nome do Contato Principal
                    </Label>
                    <Input
                      id="contactName"
                      value={formData.contactName}
                      onChange={(e) => handleInputChange('contactName', e.target.value)}
                      placeholder="Nome da pessoa responsável pelo contato"
                      className="border-gray-600 bg-seguranca-black/70 text-seguranca-lightgray placeholder:text-gray-500 focus:border-seguranca-yellow focus:ring-seguranca-yellow/20 h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contactEmail" className="text-seguranca-lightgray flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email do Contato
                    </Label>
                    <Input
                      id="contactEmail"
                      name="client_optional_contact_email"
                      type="email"
                      value={formData.contactEmail}
                      onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                      placeholder="contato.responsavel@empresa.com"
                      autoComplete="new-password"
                      spellCheck={false}
                      className="border-gray-600 bg-seguranca-black/70 text-seguranca-lightgray placeholder:text-gray-500 focus:border-seguranca-yellow focus:ring-seguranca-yellow/20 h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contactPhone" className="text-seguranca-lightgray flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Telefone do Contato
                    </Label>
                    <Input
                      id="contactPhone"
                      value={formData.contactPhone}
                      onChange={(e) => handleInputChange('contactPhone', formatPhone(e.target.value))}
                      placeholder="(00) 0000-0000"
                      maxLength={15}
                      className="border-gray-600 bg-seguranca-black/70 text-seguranca-lightgray placeholder:text-gray-500 focus:border-seguranca-yellow focus:ring-seguranca-yellow/20 h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mobile" className="text-seguranca-lightgray flex items-center gap-2">
                      <Smartphone className="h-4 w-4" />
                      Celular / WhatsApp
                    </Label>
                    <Input
                      id="mobile"
                      value={formData.mobile}
                      onChange={(e) => handleInputChange('mobile', formatPhone(e.target.value))}
                      placeholder="(00) 00000-0000"
                      maxLength={15}
                      className="border-gray-600 bg-seguranca-black/70 text-seguranca-lightgray placeholder:text-gray-500 focus:border-seguranca-yellow focus:ring-seguranca-yellow/20 h-11"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Notificações por Departamento */}
              <TabsContent value="notificacoes" className="space-y-4 mt-4">
                <div className="bg-seguranca-black/50 border border-gray-600/30 rounded-xl p-4 sm:p-6">
                  <div className="mb-4">
                    <h4 className="text-base font-semibold flex items-center gap-2 text-white">
                      <Mail className="h-4 w-4 text-seguranca-red" />
                      Departamentos para Notificação de Ocorrências
                    </h4>
                    <p className="text-xs text-gray-400 mt-1">
                      Selecione quais departamentos desta empresa de segurança devem receber alertas e notificações automáticas de ocorrências geradas para este cliente.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                    {CLIENT_NOTIFICATION_DEPARTMENTS.map((dept) => {
                      const isChecked = (formData.notifiedDepartments || []).includes(dept.id);
                      return (
                        <label
                          key={dept.id}
                          htmlFor={`client-dept-${dept.id}`}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                            isChecked
                              ? 'bg-seguranca-red/15 border-seguranca-red/50 text-white'
                              : 'bg-seguranca-black/40 border-gray-600/40 text-gray-300 hover:bg-seguranca-graphite/40'
                          }`}
                        >
                          <input
                            type="checkbox"
                            id={`client-dept-${dept.id}`}
                            checked={isChecked}
                            onChange={(e) => {
                              const current = formData.notifiedDepartments || [];
                              const updated = e.target.checked
                                ? Array.from(new Set([...current, dept.id]))
                                : current.filter((id) => id !== dept.id);
                              handleInputChange('notifiedDepartments', updated as any);
                            }}
                            className="rounded border-gray-500 text-seguranca-red focus:ring-seguranca-red h-4 w-4 accent-red-600 cursor-pointer"
                          />
                          <span className="text-sm font-medium">{dept.label}</span>
                        </label>
                      );
                    })}
                  </div>

                  {(formData.notifiedDepartments || []).length > 0 && (
                    <div className="mt-4 pt-3 border-t border-gray-600/30 flex items-center gap-2 text-xs text-seguranca-yellow">
                      <CheckCircle className="h-3.5 w-3.5" />
                      <span>
                        {(formData.notifiedDepartments || []).length} departamento(s) selecionado(s) para receber notificações.
                      </span>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Setores de Trabalho */}
              <TabsContent value="postos-de-trabalho" className="space-y-4 mt-4">
                <div className="bg-seguranca-black/50 border border-gray-600/30 rounded-xl p-4 sm:p-6 min-h-[260px] sm:min-h-[400px]">
                  <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h4 className="text-lg font-semibold flex items-center gap-2">
                        <Briefcase className="h-5 w-5 text-seguranca-red" />
                        Setores de Trabalho Vinculados
                      </h4>
                      <p className="text-sm text-gray-400 mt-1">
                        Gerencie os setores de trabalho deste cliente.
                      </p>
                    </div>
                    {activeClient?.id && (
                      <Button
                        type="button"
                        onClick={() => {
                          setEditingPost(null);
                          setIsPostFormOpen(true);
                        }}
                        className="w-full bg-seguranca-red hover:bg-seguranca-darkred sm:w-auto"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Novo Setor de Trabalho
                      </Button>
                    )}
                  </div>

                  {!activeClient?.id ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="p-4 rounded-full bg-gray-600/10 mb-4">
                        <Save className="h-10 w-10 text-gray-500" />
                      </div>
                      <h5 className="text-white font-medium">Cliente ainda não salvo</h5>
                      <p className="text-gray-400 max-w-xs mt-2">
                        Salve o cliente primeiro para poder cadastrar setores de trabalho para ele.
                      </p>
                      <Button
                        type="button"
                        onClick={() => void persistClient({ openPostFormAfterSave: true })}
                        disabled={isLoading}
                        className="mt-6 bg-seguranca-red hover:bg-seguranca-darkred"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {isLoading ? 'Salvando...' : 'Salvar cliente e cadastrar setor'}
                      </Button>
                    </div>
                  ) : loadingPosts ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-seguranca-red"></div>
                      <p className="text-gray-400 mt-4">Carregando setores de trabalho...</p>
                    </div>
                  ) : workPosts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-gray-600/30 rounded-xl">
                      <Briefcase className="h-10 w-10 text-gray-600 mb-4" />
                      <h5 className="text-white font-medium">Nenhum setor de trabalho encontrado</h5>
                      <p className="text-gray-400 max-w-xs mt-2">
                        Este cliente ainda não possui setores de trabalho cadastrados.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Barra de Ações em Massa */}
                      {selectedPostIds.length > 0 && (
                        <div className="flex items-center justify-between bg-red-950/40 border border-red-500/40 rounded-lg p-3 animate-in fade-in-0 duration-150">
                          <span className="text-xs font-medium text-red-200 flex items-center gap-2">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                              {selectedPostIds.length}
                            </span>
                            setor(es) de trabalho selecionado(s)
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setIsBulkDeleteDialogOpen(true);
                            }}
                            className="bg-red-600 hover:bg-red-700 text-white text-xs h-8 px-3 gap-1.5 shadow-md"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Excluir Selecionados ({selectedPostIds.length})
                          </Button>
                        </div>
                      )}

                      <div className="rounded-xl border border-gray-600/30 overflow-hidden">
                        <div className="overflow-x-auto">
                        <Table>
                          <TableHeader className="bg-seguranca-black/80">
                            <TableRow className="hover:bg-transparent border-gray-600/30">
                              <TableHead className="w-10 text-center">
                                <input
                                  type="checkbox"
                                  checked={selectedPostIds.length === workPosts.length && workPosts.length > 0}
                                  onChange={(e) => handleToggleSelectAllPosts(e.target.checked)}
                                  className="rounded border-gray-500 text-red-600 focus:ring-red-600 h-4 w-4 accent-red-600 cursor-pointer"
                                  title="Selecionar Todos os Setores"
                                />
                              </TableHead>
                              <TableHead className="text-gray-300 font-bold">Código</TableHead>
                              <TableHead className="text-gray-300 font-bold">Setor de Trabalho</TableHead>
                              <TableHead className="text-gray-300 font-bold">Posto / Tipo</TableHead>
                              <TableHead className="text-gray-300 font-bold">Status</TableHead>
                              <TableHead className="text-right text-gray-300 font-bold">Ações</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {workPosts.map((post) => {
                              const isSelected = selectedPostIds.includes(post.id);
                              return (
                                <TableRow key={post.id} className={`hover:bg-white/5 border-gray-600/30 ${isSelected ? 'bg-red-950/20' : ''}`}>
                                  <TableCell className="text-center">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={(e) => handleToggleSelectPost(post.id, e.target.checked)}
                                      className="rounded border-gray-500 text-red-600 focus:ring-red-600 h-4 w-4 accent-red-600 cursor-pointer"
                                    />
                                  </TableCell>
                                  <TableCell className="font-mono text-seguranca-yellow text-xs">{post.postCode}</TableCell>
                                  <TableCell className="font-medium text-white">{post.name}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="text-[10px] uppercase border-gray-600">
                                      {post.type?.replace('POSTO_', '')}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Badge className={`text-[10px] ${post.status === 'ATIVO' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                      {post.status?.replace('_', ' ')}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-gray-400 hover:text-white"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          setEditingPost(post);
                                          setIsPostFormOpen(true);
                                        }}
                                        title="Editar Setor de Trabalho"
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-gray-400 hover:text-seguranca-red"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          setSelectedPost(post);
                                          setIsPostDeleteDialogOpen(true);
                                        }}
                                        title="Excluir Setor de Trabalho"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-gray-600/30 bg-seguranca-black/95 px-3 py-3 backdrop-blur sm:px-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-center text-xs text-gray-400 sm:text-left">
                <span className="text-seguranca-red">*</span> Campos obrigatórios
              </p>
              <div className="flex w-full flex-row items-center justify-end gap-2 sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="border-gray-600 px-4 h-9 text-xs text-white hover:bg-seguranca-black hover:text-white"
                  disabled={isLoading}
                >
                  <X className="h-3.5 w-3.5 mr-1.5" />
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="bg-seguranca-red px-5 h-9 text-xs shadow-lg shadow-seguranca-red/20 hover:bg-seguranca-darkred"
                >
                  <Save className="h-3.5 w-3.5 mr-1.5" />
                  {isLoading ? 'Salvando...' : (activeClient ? 'Atualizar Cliente' : 'Criar Cliente')}
                </Button>
              </div>
            </div>
          </div>
        </form>

        {/* WorkPost Modals */}
        {activeClient?.id && (
          <>
            <WorkPostFormModal
              open={isPostFormOpen}
              onOpenChange={setIsPostFormOpen}
              workPost={editingPost}
              clients={[]}
              onSubmit={() => {
                setIsPostFormOpen(false);
                loadWorkPosts();
              }}
              forcedClientId={activeClient?.id}
              defaultAddress={formData.address}
              defaultCity={formData.city}
              defaultState={formData.state}
              defaultZipCode={formData.zipCode}
            />

            <WorkPostDeleteDialog
              open={isPostDeleteDialogOpen}
              onOpenChange={setIsPostDeleteDialogOpen}
              workPost={selectedPost}
              onConfirm={async () => {
                if (!selectedPost) return;
                try {
                  await workPostService.deleteWorkPost(selectedPost.id);
                  loadWorkPosts();
                  setIsPostDeleteDialogOpen(false);
                  toast({
                    title: "✅ Setor de trabalho removido",
                    description: `O setor "${selectedPost.name}" foi excluído com sucesso.`,
                  });
                } catch (error) {
                  toast({
                    title: "❌ Erro",
                    description: "Erro ao excluir setor de trabalho.",
                    variant: "destructive",
                  });
                }
              }}
            />
          </>
        )}

        {/* Modal de Confirmação de Exclusão em Massa */}
        {isBulkDeleteDialogOpen && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in-0 duration-200">
            <div 
              className="w-full max-w-md rounded-xl border border-gray-600/60 bg-seguranca-black p-6 shadow-2xl space-y-4 text-white animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 border-b border-gray-600/30 pb-3">
                <div className="p-2 rounded-lg bg-red-500/20 border border-red-500/30">
                  <Trash2 className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Exclusão em Massa</h3>
                  <p className="text-xs text-gray-400">Excluir múltiplos setores selecionados</p>
                </div>
              </div>

              <div className="space-y-2 text-sm text-gray-300 py-1">
                <p>
                  Tem certeza que deseja excluir permanentemente os <strong className="text-white">{selectedPostIds.length}</strong> setores de trabalho selecionados deste cliente?
                </p>
                <p className="text-xs text-gray-400 bg-red-950/40 p-2.5 rounded-lg border border-red-500/20 mt-2">
                  ⚠️ Esta ação não pode ser desfeita e todos os setores selecionados serão removidos do cliente.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-600/30">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isBulkDeleting}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsBulkDeleteDialogOpen(false);
                  }}
                  className="border-gray-600 px-4 text-xs text-white hover:bg-seguranca-graphite"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  disabled={isBulkDeleting}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    void handleExecuteBulkDeletePosts();
                  }}
                  className="bg-red-600 hover:bg-red-700 px-5 text-xs text-white shadow-lg shadow-red-600/20"
                >
                  {isBulkDeleting ? 'Excluindo...' : `Excluir ${selectedPostIds.length} Setores`}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
