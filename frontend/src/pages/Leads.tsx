import React, { useState, useEffect } from 'react';
import { StandardLayout } from '@/components/StandardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { notificationService } from '@/services/notificationService';
import leadService, { Lead, CreateLeadRequest, UpdateLeadRequest } from '@/services/leadService';
import { employeeService } from '@/services/employeeService';
import {
  Users,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Phone,
  Mail,
  Building,
  Calendar,
  DollarSign,
  Loader2,
  User
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const Leads = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [employees, setEmployees] = useState<Array<{ id: string | number; name: string }>>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CreateLeadRequest>({
    name: '',
    email: '',
    phone: '',
    company: '',
    position: '',
    source: 'WEBSITE',
    status: 'NEW',
    description: '',
    assignedToId: undefined,
    nextFollowUp: undefined,
    estimatedValue: undefined
  });

  // Load leads from backend
  const loadLeads = async () => {
    try {
      setLoading(true);
      const data = await leadService.getAllLeads();
      console.log('📥 Leads received from backend:', data);

      // Map backend data to frontend format
      const mappedLeads = data.map((lead: any) => {
        // Debug logger for specific lead assignment issues
        if (lead.assignedTo || lead.assignedToName) {
          console.log(`🔍 Processing lead ${lead.id} assignment:`, {
            assignedTo: lead.assignedTo,
            assignedToName: lead.assignedToName,
            assignedToId: lead.assignedTo?.id
          });
        }

        // Robust name extraction
        let finalAssignedToName = 'Não atribuído';
        if (lead.assignedToName) {
          finalAssignedToName = lead.assignedToName;
        } else if (lead.assignedTo) {
          if (typeof lead.assignedTo === 'string') {
            finalAssignedToName = lead.assignedTo; // In case backend sends name string directly
          } else if (typeof lead.assignedTo === 'object') {
            finalAssignedToName = lead.assignedTo.name || lead.assignedTo.username || lead.assignedTo.email || 'Usuário sem nome';
          }
        }

        return {
          id: lead.id,
          name: lead.name || '',
          email: lead.email || '',
          phone: lead.phone || '',
          mobile: lead.mobile || '',
          company: lead.company || '',
          position: lead.position || '',
          status: lead.status || 'NEW',
          source: lead.source || 'OTHER',
          estimatedValue: lead.estimatedValue ? Number(lead.estimatedValue) : 0,
          notes: lead.notes || lead.description || '',
          description: lead.description || lead.notes || '',
          assignedTo: lead.assignedTo ? {
            id: lead.assignedTo.id,
            name: lead.assignedTo.name || lead.assignedTo.username || ''
          } : undefined,
          assignedToName: finalAssignedToName,
          nextFollowUp: lead.nextFollowUp ? new Date(lead.nextFollowUp).toISOString().split('T')[0] : '',
          createdAt: lead.createdAt ? new Date(lead.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
        };
      });
      setLeads(mappedLeads);
      setFilteredLeads(mappedLeads);
    } catch (error: any) {
      console.error('Error loading leads:', error);
      toast({
        title: "Erro",
        description: error.response?.data?.message || "Não foi possível carregar os leads.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Load employees for assignment
  const loadEmployees = async () => {
    try {
      setLoadingEmployees(true);
      const data = await employeeService.getAllEmployees();
      const normalizedEmployees = Array.isArray(data) ? data.map((emp: any) => ({
        // PREFERÊNCIA CRÍTICA: Usar userId se disponível, pois o LeadService espera um ID de Usuário (users table) e não de Funcionário (employees table).
        // Se userId não existir, fallback para id (assumindo que seja o mesmo ou compatível, ou erro de mapeamento)
        id: emp.userId || emp.id || emp.uuid || String(emp.id),
        // Guardar o ID original do funcionário para referência se necessário
        employeeId: emp.id,
        name: emp.name || emp.nome || ''
      })) : [];
      setEmployees(normalizedEmployees);
    } catch (error: any) {
      console.error('Erro ao carregar funcionários:', error);
      setEmployees([]);
    } finally {
      setLoadingEmployees(false);
    }
  };

  useEffect(() => {
    loadLeads();
  }, []);

  useEffect(() => {
    if ((isCreateModalOpen || isEditModalOpen) && employees.length === 0) {
      loadEmployees();
    }
  }, [isCreateModalOpen, isEditModalOpen]);

  // Atualizar assignedToId quando funcionários forem carregados e houver um lead selecionado
  useEffect(() => {
    if (isEditModalOpen && selectedLead && employees.length > 0 && !formData.assignedToId) {
      // Tentar obter assignedToId do lead selecionado
      let assignedToId: string | undefined = undefined;

      if ((selectedLead as any).assignedToId) {
        assignedToId = String((selectedLead as any).assignedToId);
      } else if (selectedLead.assignedTo?.id) {
        assignedToId = String(selectedLead.assignedTo.id);
      }

      if (assignedToId) {
        console.log('🔄 Atualizando assignedToId após carregar funcionários:', {
          assignedToId,
          matchingEmployee: employees.find(emp => String(emp.id) === String(assignedToId))
        });
        setFormData(prev => ({ ...prev, assignedToId }));
      }
    }
  }, [isEditModalOpen, selectedLead, employees, formData.assignedToId]);

  useEffect(() => {
    let filtered = leads;

    if (searchTerm) {
      filtered = filtered.filter(lead =>
        lead.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(lead => lead.status === statusFilter);
    }

    if (sourceFilter !== 'all') {
      filtered = filtered.filter(lead => lead.source === sourceFilter);
    }

    setFilteredLeads(filtered);
  }, [leads, searchTerm, statusFilter, sourceFilter]);

  // Handle create lead
  const handleCreateLead = async () => {
    try {
      setIsSubmitting(true);

      // Preparar dados de criação, convertendo nextFollowUp se necessário
      const createData: CreateLeadRequest = {
        ...formData
      };

      // Converter nextFollowUp para formato ISO com hora se necessário
      if (createData.nextFollowUp && createData.nextFollowUp.length === 10) {
        createData.nextFollowUp = `${createData.nextFollowUp}T00:00:00`;
      }

      await leadService.createLead(createData);
      toast({
        title: "Sucesso",
        description: "Lead criado com sucesso!",
      });
      setIsCreateModalOpen(false);
      resetForm();
      await loadLeads();
    } catch (error: any) {
      console.error('Erro ao criar lead:', error);
      toast({
        title: "Erro",
        description: error.response?.data?.message || "Não foi possível criar o lead.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle update lead
  const handleUpdateLead = async () => {
    if (!selectedLead || !selectedLead.id) {
      toast({
        title: "Erro",
        description: "Lead não selecionado ou ID inválido.",
        variant: "destructive"
      });
      return;
    }
    try {
      setIsSubmitting(true);

      // Converter assignedToId para string UUID se necessário, ou undefined se vazio
      let assignedToId: string | undefined = undefined;
      if (formData.assignedToId) {
        const assignedToIdStr = typeof formData.assignedToId === 'string' ? formData.assignedToId : String(formData.assignedToId);
        // Validar se é um UUID válido (não vazio, não "null", não "undefined")
        if (assignedToIdStr && assignedToIdStr.trim() !== '' &&
          assignedToIdStr !== 'null' && assignedToIdStr !== 'undefined' &&
          assignedToIdStr !== 'NaN') {
          assignedToId = assignedToIdStr.trim();
        }
      }

      // Preparar dados de atualização
      const updateData: UpdateLeadRequest = {
        name: formData.name,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        company: formData.company || undefined,
        position: formData.position || undefined,
        source: formData.source,
        description: formData.description || undefined,
        status: formData.status || selectedLead.status,
        estimatedValue: formData.estimatedValue || undefined
      };

      // Adicionar assignedToId sempre (mesmo que seja undefined, para permitir remover o responsável)
      // Se assignedToId for válido, incluir; se for undefined, enviar explicitamente para manter o existente
      updateData.assignedToId = assignedToId;

      console.log('📤 Enviando updateData:', {
        ...updateData,
        assignedToId: updateData.assignedToId,
        hasAssignedToId: !!updateData.assignedToId,
        assignedToIdType: typeof updateData.assignedToId
      });

      // Adicionar nextFollowUp apenas se tiver valor, convertendo para formato ISO com hora
      if (formData.nextFollowUp) {
        // Se for apenas data (YYYY-MM-DD), adicionar hora 00:00:00 para LocalDateTime
        const nextFollowUpStr = formData.nextFollowUp;
        if (nextFollowUpStr.length === 10) {
          // Formato apenas data, adicionar hora
          updateData.nextFollowUp = `${nextFollowUpStr}T00:00:00`;
        } else {
          updateData.nextFollowUp = nextFollowUpStr;
        }
      }

      const leadId = typeof selectedLead.id === 'string' ? selectedLead.id : String(selectedLead.id);

      console.log('📤 Atualizando lead:', {
        id: leadId,
        data: updateData,
        assignedToId: updateData.assignedToId,
        hasAssignedToId: !!updateData.assignedToId
      });

      const updatedLead = await leadService.updateLead(leadId, updateData);
      console.log('✅ Lead atualizado:', updatedLead);
      toast({
        title: "Sucesso",
        description: "Lead atualizado com sucesso!",
      });
      setIsEditModalOpen(false);
      resetForm();
      await loadLeads();
    } catch (error: any) {
      console.error('Erro ao atualizar lead:', error);
      toast({
        title: "Erro",
        description: error.response?.data?.message || "Não foi possível atualizar o lead.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete lead
  const handleDeleteLead = async (leadId: string | number) => {
    if (!confirm('Tem certeza que deseja excluir este lead?')) return;
    try {
      await leadService.deleteLead(leadId);
      toast({
        title: "Sucesso",
        description: "Lead excluído com sucesso!",
      });
      await loadLeads();
    } catch (error: any) {
      console.error('Erro ao excluir lead:', error);
      toast({
        title: "Erro",
        description: error.response?.data?.message || "Não foi possível excluir o lead.",
        variant: "destructive"
      });
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      company: '',
      position: '',
      source: 'WEBSITE',
      status: 'NEW',
      description: '',
      assignedToId: undefined,
      nextFollowUp: undefined,
      estimatedValue: undefined
    });
    setSelectedLead(null);
  };

  // Open edit modal
  const handleEdit = async (lead: Lead) => {
    setSelectedLead(lead);

    // Carregar funcionários se necessário
    if (employees.length === 0) {
      await loadEmployees();
    }

    // Buscar lead completo do backend para ter assignedToId e nextFollowUp
    try {
      const leadId = typeof lead.id === 'string' ? lead.id : String(lead.id);
      const fullLead = await leadService.getLeadById(leadId);

      // Tentar obter assignedToId de diferentes formas possíveis
      let assignedToId: string | undefined = undefined;

      // 1. Tentar do objeto fullLead (mais recente)
      if ((fullLead as any).assignedToId) {
        assignedToId = String((fullLead as any).assignedToId);
      } else if (fullLead.assignedTo && fullLead.assignedTo.id) {
        assignedToId = String(fullLead.assignedTo.id);
      }

      // 2. Fallback para o lead da lista (se o fullLead veio sem mas a lista tinha)
      if (!assignedToId && lead.assignedTo && lead.assignedTo.id) {
        console.log('⚠️ Usando fallback de assignedToId do lead da lista');
        assignedToId = String(lead.assignedTo.id);
      }

      console.log('🔍 Lead carregado do backend:', {
        leadId: leadId,
        assignedToId: assignedToId,
        fullLeadAssignedTo: fullLead.assignedTo,
        listLeadAssignedTo: lead.assignedTo
      });

      // Se tivermos um ID mas ele não estiver na lista (e a lista já carregou), adicionar temporariamente?
      // Melhor apenas logar aviso por enquanto.
      if (assignedToId && employees.length > 0) {
        const match = employees.find(e => String(e.id) === String(assignedToId));
        if (!match) {
          console.warn(`⚠️ ID ${assignedToId} não encontrado na lista de ${employees.length} funcionários`);
        } else {
          console.log(`✅ ID ${assignedToId} corresponde a ${match.name}`);
        }
      }

      const nextFollowUp = (fullLead as any).nextFollowUp
        ? new Date((fullLead as any).nextFollowUp).toISOString().split('T')[0]
        : (lead.nextFollowUp || undefined);

      setFormData({
        name: fullLead.name || lead.name || '',
        email: fullLead.email || lead.email || '',
        phone: fullLead.phone || lead.phone || '',
        company: fullLead.company || lead.company || '',
        position: fullLead.position || lead.position || '',
        source: fullLead.source || lead.source || 'WEBSITE',
        status: fullLead.status || lead.status || 'NEW',
        description: fullLead.description || fullLead.notes || lead.description || lead.notes || '',
        assignedToId: assignedToId,
        nextFollowUp: nextFollowUp,
        estimatedValue: fullLead.estimatedValue !== undefined ? Number(fullLead.estimatedValue) : (lead.estimatedValue !== undefined ? lead.estimatedValue : undefined)
      });


      console.log('✅ FormData atualizado:', {
        assignedToId: assignedToId,
        formDataAssignedToId: assignedToId,
        fullLeadAssignedTo: fullLead.assignedTo,
        employeesCount: employees.length,
        matchingEmployee: assignedToId ? employees.find(emp => String(emp.id) === String(assignedToId)) : null
      });
    } catch (error) {
      // Se falhar, usar os dados que temos
      console.error('Erro ao carregar lead completo:', error);
      // Tentar obter assignedToId de diferentes formas possíveis (fallback)
      let assignedToId: string | undefined = undefined;

      if ((lead as any).assignedToId) {
        assignedToId = String((lead as any).assignedToId);
      } else if (lead.assignedTo?.id) {
        assignedToId = String(lead.assignedTo.id);
      }

      console.log('🔍 Lead (fallback):', {
        lead,
        assignedToId,
        assignedTo: lead.assignedTo
      });

      setFormData({
        name: lead.name || '',
        email: lead.email || '',
        phone: lead.phone || '',
        company: lead.company || '',
        position: lead.position || '',
        source: lead.source || 'WEBSITE',
        status: lead.status || 'NEW',
        description: lead.description || '',
        assignedToId: assignedToId,
        nextFollowUp: lead.nextFollowUp || undefined,
        estimatedValue: lead.estimatedValue || 0
      });

      console.log('✅ FormData atualizado (fallback):', {
        assignedToId: assignedToId,
        formDataAssignedToId: assignedToId,
        leadAssignedTo: lead.assignedTo,
        employeesCount: employees.length,
        matchingEmployee: assignedToId ? employees.find(emp => String(emp.id) === String(assignedToId)) : null
      });
    }

    setIsEditModalOpen(true);

    // Aguardar um pouco para garantir que os funcionários foram carregados
    setTimeout(() => {
      console.log('⏰ Verificando após timeout:', {
        assignedToId: formData.assignedToId,
        employeesCount: employees.length,
        selectedLeadAssignedTo: lead.assignedTo
      });
    }, 500);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      NEW: { label: 'Novo', color: 'bg-blue-500' },
      CONTACTED: { label: 'Contactado', color: 'bg-yellow-500' },
      QUALIFIED: { label: 'Qualificado', color: 'bg-green-500' },
      PROPOSAL_SENT: { label: 'Proposta Enviada', color: 'bg-purple-500' },
      NEGOTIATION: { label: 'Em Negociação', color: 'bg-orange-500' },
      WON: { label: 'Ganho', color: 'bg-green-600' },
      LOST: { label: 'Perdido', color: 'bg-red-500' },
      INACTIVE: { label: 'Inativo', color: 'bg-gray-500' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.NEW;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const getSourceBadge = (source: string) => {
    const sourceConfig = {
      WEBSITE: { label: 'Website', color: 'bg-blue-100 text-blue-800' },
      REFERRAL: { label: 'Indicação', color: 'bg-green-100 text-green-800' },
      COLD_CALL: { label: 'Ligação a Frio', color: 'bg-yellow-100 text-yellow-800' },
      EMAIL_MARKETING: { label: 'Email Marketing', color: 'bg-purple-100 text-purple-800' },
      SOCIAL_MEDIA: { label: 'Redes Sociais', color: 'bg-pink-100 text-pink-800' },
      GOOGLE_ADS: { label: 'Google Ads', color: 'bg-red-100 text-red-800' },
      EVENT: { label: 'Evento', color: 'bg-indigo-100 text-indigo-800' },
      PARTNER: { label: 'Parceiro', color: 'bg-teal-100 text-teal-800' },
      OTHER: { label: 'Outro', color: 'bg-gray-100 text-gray-800' }
    };

    const config = sourceConfig[source as keyof typeof sourceConfig] || sourceConfig.OTHER;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  return (
    <StandardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-seguranca-lightgray">Leads</h1>
            <p className="text-gray-400 mt-1">Gestão de leads e oportunidades comerciais</p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              className="bg-seguranca-red hover:bg-seguranca-darkred"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Lead
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <Card className="bg-seguranca-graphite border-gray-600">
          <CardHeader>
            <CardTitle className="text-seguranca-lightgray flex items-center">
              <Filter className="h-5 w-5 mr-2" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="search" className="text-seguranca-lightgray">Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Nome, empresa ou email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="status" className="text-seguranca-lightgray">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="bg-seguranca-black border-gray-600 text-seguranca-lightgray">
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="NEW">Novo</SelectItem>
                    <SelectItem value="CONTACTED">Contactado</SelectItem>
                    <SelectItem value="QUALIFIED">Qualificado</SelectItem>
                    <SelectItem value="PROPOSAL_SENT">Proposta Enviada</SelectItem>
                    <SelectItem value="NEGOTIATION">Em Negociação</SelectItem>
                    <SelectItem value="WON">Ganho</SelectItem>
                    <SelectItem value="LOST">Perdido</SelectItem>
                    <SelectItem value="INACTIVE">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="source" className="text-seguranca-lightgray">Fonte</Label>
                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger className="bg-seguranca-black border-gray-600 text-seguranca-lightgray">
                    <SelectValue placeholder="Todas as fontes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as fontes</SelectItem>
                    <SelectItem value="WEBSITE">Website</SelectItem>
                    <SelectItem value="REFERRAL">Indicação</SelectItem>
                    <SelectItem value="COLD_CALL">Ligação a Frio</SelectItem>
                    <SelectItem value="EMAIL_MARKETING">Email Marketing</SelectItem>
                    <SelectItem value="SOCIAL_MEDIA">Redes Sociais</SelectItem>
                    <SelectItem value="GOOGLE_ADS">Google Ads</SelectItem>
                    <SelectItem value="EVENT">Evento</SelectItem>
                    <SelectItem value="PARTNER">Parceiro</SelectItem>
                    <SelectItem value="OTHER">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button
                  variant="outline"
                  className="w-full bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                    setSourceFilter('all');
                  }}
                >
                  Limpar Filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-seguranca-graphite border-gray-600">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total de Leads</p>
                  <p className="text-2xl font-bold text-seguranca-lightgray">{leads.length}</p>
                </div>
                <Users className="h-8 w-8 text-seguranca-red" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-seguranca-graphite border-gray-600">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Novos</p>
                  <p className="text-2xl font-bold text-blue-500">
                    {leads.filter(l => l.status === 'NEW').length}
                  </p>
                </div>
                <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">N</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-seguranca-graphite border-gray-600">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Em Negociação</p>
                  <p className="text-2xl font-bold text-orange-500">
                    {leads.filter(l => l.status === 'NEGOTIATION').length}
                  </p>
                </div>
                <div className="h-8 w-8 bg-orange-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">N</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-seguranca-graphite border-gray-600">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Valor Total</p>
                  <p className="text-2xl font-bold text-green-500">
                    {formatCurrency(leads.reduce((sum, lead) => sum + lead.estimatedValue, 0))}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabela de Leads */}
        <Card className="bg-seguranca-graphite border-gray-600">
          <CardHeader>
            <CardTitle className="text-seguranca-lightgray">Lista de Leads</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-seguranca-yellow" />
              </div>
            ) : filteredLeads.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                Nenhum lead encontrado.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-600">
                      <TableHead className="text-seguranca-lightgray">Nome</TableHead>
                      <TableHead className="text-seguranca-lightgray">Empresa</TableHead>
                      <TableHead className="text-seguranca-lightgray">Status</TableHead>
                      <TableHead className="text-seguranca-lightgray">Fonte</TableHead>
                      <TableHead className="text-seguranca-lightgray">Valor Estimado</TableHead>
                      <TableHead className="text-seguranca-lightgray">Responsável</TableHead>
                      <TableHead className="text-seguranca-lightgray">Próximo Follow-up</TableHead>
                      <TableHead className="text-seguranca-lightgray text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLeads.map((lead) => (
                      <TableRow key={lead.id} className="border-gray-600">
                        <TableCell className="text-seguranca-lightgray">
                          <div>
                            <div className="font-medium">{lead.name}</div>
                            <div className="text-sm text-gray-400">{lead.email}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-seguranca-lightgray">
                          <div>
                            <div className="font-medium">{lead.company || '-'}</div>
                            <div className="text-sm text-gray-400">{lead.position || '-'}</div>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(lead.status)}</TableCell>
                        <TableCell>{getSourceBadge(lead.source)}</TableCell>
                        <TableCell className="text-seguranca-lightgray">
                          {lead.estimatedValue ? formatCurrency(lead.estimatedValue) : '-'}
                        </TableCell>
                        <TableCell className="text-seguranca-lightgray">
                          {lead.assignedToName}
                        </TableCell>
                        <TableCell className="text-seguranca-lightgray">
                          {lead.nextFollowUp ? formatDate(lead.nextFollowUp) : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                              onClick={() => {
                                setSelectedLead(lead);
                                setIsViewModalOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                              onClick={() => handleEdit(lead)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-seguranca-black border-gray-600 text-red-400 hover:text-red-300"
                              onClick={() => handleDeleteLead(lead.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal de Visualização */}
        <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
          <DialogContent className="bg-seguranca-graphite border-gray-600 max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-seguranca-lightgray">Detalhes do Lead</DialogTitle>
              <DialogDescription className="text-gray-400">
                Visualize todas as informações do lead selecionado
              </DialogDescription>
            </DialogHeader>
            {selectedLead && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-400">Nome</Label>
                    <p className="text-seguranca-lightgray font-medium">{selectedLead.name}</p>
                  </div>
                  <div>
                    <Label className="text-gray-400">Email</Label>
                    <p className="text-seguranca-lightgray">{selectedLead.email}</p>
                  </div>
                  <div>
                    <Label className="text-gray-400">Telefone</Label>
                    <p className="text-seguranca-lightgray">{selectedLead.phone}</p>
                  </div>
                  <div>
                    <Label className="text-gray-400">Celular</Label>
                    <p className="text-seguranca-lightgray">{selectedLead.mobile}</p>
                  </div>
                  <div>
                    <Label className="text-gray-400">Empresa</Label>
                    <p className="text-seguranca-lightgray">{selectedLead.company}</p>
                  </div>
                  <div>
                    <Label className="text-gray-400">Cargo</Label>
                    <p className="text-seguranca-lightgray">{selectedLead.position}</p>
                  </div>
                  <div>
                    <Label className="text-gray-400">Status</Label>
                    <div className="mt-1">{getStatusBadge(selectedLead.status)}</div>
                  </div>
                  <div>
                    <Label className="text-gray-400">Fonte</Label>
                    <div className="mt-1">{getSourceBadge(selectedLead.source)}</div>
                  </div>
                  <div>
                    <Label className="text-gray-400">Valor Estimado</Label>
                    <p className="text-seguranca-lightgray font-medium">
                      {formatCurrency(selectedLead.estimatedValue)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-gray-400">Responsável</Label>
                    <p className="text-seguranca-lightgray">{selectedLead.assignedToName}</p>
                  </div>
                  <div>
                    <Label className="text-gray-400">Próximo Follow-up</Label>
                    <p className="text-seguranca-lightgray">{formatDate(selectedLead.nextFollowUp)}</p>
                  </div>
                  <div>
                    <Label className="text-gray-400">Data de Criação</Label>
                    <p className="text-seguranca-lightgray">{formatDate(selectedLead.createdAt)}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-gray-400">Observações</Label>
                  <p className="text-seguranca-lightgray mt-1">{selectedLead.notes}</p>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    className="bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                    onClick={() => setIsViewModalOpen(false)}
                  >
                    Fechar
                  </Button>
                  <Button
                    className="bg-seguranca-red hover:bg-seguranca-darkred"
                    onClick={() => {
                      setIsViewModalOpen(false);
                      handleEdit(selectedLead);
                    }}
                  >
                    Editar Lead
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Modal de Edição */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="bg-seguranca-graphite border-gray-600 max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-seguranca-lightgray">Editar Lead</DialogTitle>
              <DialogDescription className="text-gray-400">
                Atualize as informações do lead
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-name" className="text-seguranca-lightgray">Nome *</Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                    placeholder="Nome completo"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-email" className="text-seguranca-lightgray">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-phone" className="text-seguranca-lightgray">Telefone</Label>
                  <Input
                    id="edit-phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                    placeholder="(11) 99999-9999"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-company" className="text-seguranca-lightgray">Empresa</Label>
                  <Input
                    id="edit-company"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                    placeholder="Nome da empresa"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-position" className="text-seguranca-lightgray">Cargo</Label>
                  <Input
                    id="edit-position"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    className="bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                    placeholder="Cargo/função"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-source" className="text-seguranca-lightgray">Fonte *</Label>
                  <Select value={formData.source} onValueChange={(value) => setFormData({ ...formData, source: value })}>
                    <SelectTrigger className="bg-seguranca-black border-gray-600 text-seguranca-lightgray">
                      <SelectValue placeholder="Selecione a fonte" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WEBSITE">Website</SelectItem>
                      <SelectItem value="REFERRAL">Indicação</SelectItem>
                      <SelectItem value="COLD_CALL">Ligação a Frio</SelectItem>
                      <SelectItem value="SOCIAL_MEDIA">Redes Sociais</SelectItem>
                      <SelectItem value="EVENT">Evento</SelectItem>
                      <SelectItem value="OTHER">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-status" className="text-seguranca-lightgray">Status</Label>
                  <Select
                    value={formData.status || selectedLead?.status || 'NEW'}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger className="bg-seguranca-black border-gray-600 text-seguranca-lightgray">
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent className="bg-seguranca-graphite border-gray-600">
                      <SelectItem value="NEW" className="text-seguranca-lightgray">Novo</SelectItem>
                      <SelectItem value="CONTACTED" className="text-seguranca-lightgray">Contactado</SelectItem>
                      <SelectItem value="QUALIFIED" className="text-seguranca-lightgray">Qualificado</SelectItem>
                      <SelectItem value="PROPOSAL_SENT" className="text-seguranca-lightgray">Proposta Enviada</SelectItem>
                      <SelectItem value="NEGOTIATION" className="text-seguranca-lightgray">Em Negociação</SelectItem>
                      <SelectItem value="WON" className="text-seguranca-lightgray">Ganho</SelectItem>
                      <SelectItem value="LOST" className="text-seguranca-lightgray">Perdido</SelectItem>
                      <SelectItem value="INACTIVE" className="text-seguranca-lightgray">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-assignedTo" className="text-seguranca-lightgray">Responsável</Label>
                  <Select
                    value={formData.assignedToId ? String(formData.assignedToId) : ''}
                    onValueChange={(value) => {
                      console.log('🔄 Mudando responsável:', { value, currentValue: formData.assignedToId });
                      setFormData({ ...formData, assignedToId: value || undefined });
                    }}
                    disabled={loadingEmployees}
                  >
                    <SelectTrigger className="bg-seguranca-black border-gray-600 text-seguranca-lightgray">
                      <SelectValue placeholder={loadingEmployees ? "Carregando..." : "Selecione o responsável"}>
                        {formData.assignedToId && employees.find(emp => String(emp.id) === String(formData.assignedToId))?.name}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-seguranca-graphite border-gray-600 max-h-[300px]">
                      {employees.map((emp) => (
                        <SelectItem
                          key={emp.id}
                          value={String(emp.id)}
                          className="text-seguranca-lightgray hover:bg-seguranca-red/20"
                        >
                          {emp.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.assignedToId && (
                    <p className="text-xs text-gray-500 mt-1">
                      ID selecionado: {String(formData.assignedToId)}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="edit-nextFollowUp" className="text-seguranca-lightgray">Próximo Follow-up</Label>
                  <Input
                    id="edit-nextFollowUp"
                    type="date"
                    value={formData.nextFollowUp || ''}
                    onChange={(e) => setFormData({ ...formData, nextFollowUp: e.target.value || undefined })}
                    className="bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-estimatedValue" className="text-seguranca-lightgray">Valor Estimado</Label>
                  <Input
                    id="edit-estimatedValue"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.estimatedValue || ''}
                    onChange={(e) => setFormData({ ...formData, estimatedValue: e.target.value ? Number(e.target.value) : 0 })}
                    className="bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="edit-description" className="text-seguranca-lightgray">Descrição</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                  placeholder="Informações adicionais sobre o lead..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  className="bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    resetForm();
                  }}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button
                  className="bg-seguranca-red hover:bg-seguranca-darkred"
                  onClick={handleUpdateLead}
                  disabled={isSubmitting || !formData.name}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Atualizando...
                    </>
                  ) : (
                    'Atualizar Lead'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal de Criação */}
        <Dialog open={isCreateModalOpen} onOpenChange={(open) => {
          setIsCreateModalOpen(open);
          if (!open) resetForm();
        }}>
          <DialogContent className="bg-seguranca-graphite border-gray-600 max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-seguranca-lightgray">Novo Lead</DialogTitle>
              <DialogDescription className="text-gray-400">
                Preencha as informações para criar um novo lead
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name" className="text-seguranca-lightgray">Nome *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                    placeholder="Nome completo"
                  />
                </div>
                <div>
                  <Label htmlFor="email" className="text-seguranca-lightgray">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div>
                  <Label htmlFor="phone" className="text-seguranca-lightgray">Telefone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                    placeholder="(11) 99999-9999"
                  />
                </div>
                <div>
                  <Label htmlFor="company" className="text-seguranca-lightgray">Empresa</Label>
                  <Input
                    id="company"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                    placeholder="Nome da empresa"
                  />
                </div>
                <div>
                  <Label htmlFor="position" className="text-seguranca-lightgray">Cargo</Label>
                  <Input
                    id="position"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    className="bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                    placeholder="Cargo/função"
                  />
                </div>
                <div>
                  <Label htmlFor="source" className="text-seguranca-lightgray">Fonte *</Label>
                  <Select value={formData.source} onValueChange={(value) => setFormData({ ...formData, source: value })}>
                    <SelectTrigger className="bg-seguranca-black border-gray-600 text-seguranca-lightgray">
                      <SelectValue placeholder="Selecione a fonte" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WEBSITE">Website</SelectItem>
                      <SelectItem value="REFERRAL">Indicação</SelectItem>
                      <SelectItem value="COLD_CALL">Ligação a Frio</SelectItem>
                      <SelectItem value="SOCIAL_MEDIA">Redes Sociais</SelectItem>
                      <SelectItem value="EVENT">Evento</SelectItem>
                      <SelectItem value="OTHER">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="status" className="text-seguranca-lightgray">Status</Label>
                  <Select
                    value={formData.status || 'NEW'}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger className="bg-seguranca-black border-gray-600 text-seguranca-lightgray">
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent className="bg-seguranca-graphite border-gray-600">
                      <SelectItem value="NEW" className="text-seguranca-lightgray">Novo</SelectItem>
                      <SelectItem value="CONTACTED" className="text-seguranca-lightgray">Contactado</SelectItem>
                      <SelectItem value="QUALIFIED" className="text-seguranca-lightgray">Qualificado</SelectItem>
                      <SelectItem value="PROPOSAL_SENT" className="text-seguranca-lightgray">Proposta Enviada</SelectItem>
                      <SelectItem value="NEGOTIATION" className="text-seguranca-lightgray">Em Negociação</SelectItem>
                      <SelectItem value="WON" className="text-seguranca-lightgray">Ganho</SelectItem>
                      <SelectItem value="LOST" className="text-seguranca-lightgray">Perdido</SelectItem>
                      <SelectItem value="INACTIVE" className="text-seguranca-lightgray">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="assignedTo" className="text-seguranca-lightgray">Responsável</Label>
                  <Select
                    value={formData.assignedToId ? String(formData.assignedToId) : ''}
                    onValueChange={(value) => {
                      setFormData({ ...formData, assignedToId: value || undefined });
                    }}
                    disabled={loadingEmployees}
                  >
                    <SelectTrigger className="bg-seguranca-black border-gray-600 text-seguranca-lightgray">
                      <SelectValue placeholder={loadingEmployees ? "Carregando..." : "Selecione o responsável"} />
                    </SelectTrigger>
                    <SelectContent className="bg-seguranca-graphite border-gray-600 max-h-[300px]">
                      {employees.map((emp) => (
                        <SelectItem
                          key={emp.id}
                          value={String(emp.id)}
                          className="text-seguranca-lightgray hover:bg-seguranca-red/20"
                        >
                          {emp.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="nextFollowUp" className="text-seguranca-lightgray">Próximo Follow-up</Label>
                  <Input
                    id="nextFollowUp"
                    type="date"
                    value={formData.nextFollowUp || ''}
                    onChange={(e) => setFormData({ ...formData, nextFollowUp: e.target.value || undefined })}
                    className="bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                  />
                </div>
                <div>
                  <Label htmlFor="estimatedValue" className="text-seguranca-lightgray">Valor Estimado</Label>
                  <Input
                    id="estimatedValue"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.estimatedValue || ''}
                    onChange={(e) => setFormData({ ...formData, estimatedValue: e.target.value ? Number(e.target.value) : 0 })}
                    className="bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description" className="text-seguranca-lightgray">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                  placeholder="Informações adicionais sobre o lead..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  className="bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    resetForm();
                  }}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button
                  className="bg-seguranca-red hover:bg-seguranca-darkred"
                  onClick={handleCreateLead}
                  disabled={isSubmitting || !formData.name}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    'Criar Lead'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </StandardLayout>
  );
};

export default Leads; 