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
  Loader2
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

  // Form state
  const [formData, setFormData] = useState<CreateLeadRequest>({
    name: '',
    email: '',
    phone: '',
    company: '',
    position: '',
    source: 'WEBSITE',
    description: ''
  });

  // Load leads from backend
  const loadLeads = async () => {
    try {
      setLoading(true);
      const data = await leadService.getAllLeads();
      // Map backend data to frontend format
      const mappedLeads = data.map((lead: any) => ({
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
        assignedToName: lead.assignedTo?.name || lead.assignedToName || 'Não atribuído',
        nextFollowUp: lead.nextFollowUp ? new Date(lead.nextFollowUp).toISOString().split('T')[0] : '',
        createdAt: lead.createdAt ? new Date(lead.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
      }));
      setLeads(mappedLeads);
      setFilteredLeads(mappedLeads);
    } catch (error: any) {
      console.error('Erro ao carregar leads:', error);
      toast({
        title: "Erro",
        description: error.response?.data?.message || "Não foi possível carregar os leads.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeads();
  }, []);

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
      await leadService.createLead(formData);
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
    if (!selectedLead) return;
    try {
      setIsSubmitting(true);
      const updateData: UpdateLeadRequest = {
        ...formData,
        status: formData.status || selectedLead.status
      };
      await leadService.updateLead(Number(selectedLead.id), updateData);
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
  const handleDeleteLead = async (leadId: number) => {
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
      description: ''
    });
    setSelectedLead(null);
  };

  // Open edit modal
  const handleEdit = (lead: Lead) => {
    setSelectedLead(lead);
    setFormData({
      name: lead.name || '',
      email: lead.email || '',
      phone: lead.phone || '',
      company: lead.company || '',
      position: lead.position || '',
      source: lead.source || 'WEBSITE',
      description: lead.description || ''
    });
    setIsEditModalOpen(true);
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
                              onClick={() => handleDeleteLead(Number(lead.id))}
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