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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Trash2, 
  Building2,
  Calendar,
  DollarSign,
  User,
  FileSpreadsheet
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { proposalService, Proposal, CreateProposalRequest, UpdateProposalRequest } from '@/services/proposalService';
import { clientService, Client } from '@/services/clientService';
import leadService from '@/services/leadService';
import { ClientFormModal } from '@/components/clientes/ClientFormModal';
import PropostaAcordo from '@/components/comercial/PropostaAcordo';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Loader2, Plus as PlusIcon, Link as LinkIcon } from 'lucide-react';

const Propostas = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [filteredProposals, setFilteredProposals] = useState<Proposal[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [leads, setLeads] = useState<any[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CreateProposalRequest>({
    title: '',
    clientId: undefined,
    leadId: undefined,
    totalValue: 0,
    validUntil: undefined,
    description: '',
    status: 'DRAFT'
  });

  // Load proposals from backend
  const loadProposals = async () => {
    try {
      setLoading(true);
      const data = await proposalService.getAllProposals();
      // Map backend data to frontend format
      const mappedProposals = data.map((proposal: any) => ({
        id: proposal.id,
        title: proposal.title || '',
        proposalNumber: proposal.proposalNumber || '',
        clientName: proposal.client?.name || proposal.clientName || 'N/A',
        leadName: proposal.lead?.name || proposal.leadName || '',
        status: proposal.status || 'DRAFT',
        totalValue: proposal.totalValue ? Number(proposal.totalValue) : 0,
        validUntil: proposal.validUntil ? new Date(proposal.validUntil).toISOString().split('T')[0] : '',
        description: proposal.description || '',
        createdByName: proposal.createdBy?.name || proposal.createdByName || 'N/A',
        assignedToName: proposal.assignedTo?.name || proposal.assignedToName || 'Não atribuído',
        createdAt: proposal.createdAt ? new Date(proposal.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        updatedAt: proposal.updatedAt ? new Date(proposal.updatedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
      }));
      setProposals(mappedProposals);
      setFilteredProposals(mappedProposals);
    } catch (error: any) {
      console.error('Erro ao carregar propostas:', error);
      toast({
        title: "Erro",
        description: error.response?.data?.message || "Não foi possível carregar as propostas.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProposals();
  }, []);

  // Load clients and leads when create modal opens
  useEffect(() => {
    if (isCreateModalOpen) {
      loadClients();
      loadLeads();
    }
  }, [isCreateModalOpen]);

  // Load clients function
  const loadClients = async () => {
    try {
      setLoadingClients(true);
      const data = await clientService.getAllClients();
      setClients(data);
    } catch (error: any) {
      console.error('Erro ao carregar clientes:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os clientes.",
        variant: "destructive"
      });
    } finally {
      setLoadingClients(false);
    }
  };

  // Load leads function
  const loadLeads = async () => {
    try {
      setLoadingLeads(true);
      const data = await leadService.getAllLeads();
      setLeads(data);
    } catch (error: any) {
      console.error('Erro ao carregar leads:', error);
      // Não mostrar toast para leads, pois é opcional
    } finally {
      setLoadingLeads(false);
    }
  };

  // Handle client creation success
  const handleClientCreated = async (createdClient?: Client) => {
    await loadClients();
    setIsClientModalOpen(false);
    
    // Se um cliente foi criado, selecioná-lo automaticamente
    if (createdClient && createdClient.id) {
      setFormData({ ...formData, clientId: Number(createdClient.id) });
      toast({
        title: "Sucesso",
        description: `Cliente "${createdClient.name}" criado e selecionado com sucesso!`,
      });
    } else {
      toast({
        title: "Sucesso",
        description: "Cliente criado com sucesso! Agora você pode selecioná-lo.",
      });
    }
  };

  useEffect(() => {
    let filtered = proposals;

    if (searchTerm) {
      filtered = filtered.filter(proposal =>
        proposal.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        proposal.proposalNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        proposal.clientName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(proposal => proposal.status === statusFilter);
    }

    if (clientFilter !== 'all') {
      filtered = filtered.filter(proposal => proposal.clientName === clientFilter);
    }

    setFilteredProposals(filtered);
  }, [proposals, searchTerm, statusFilter, clientFilter]);

  // Handle create proposal
  const handleCreateProposal = async () => {
    try {
      setIsSubmitting(true);
      await proposalService.createProposal(formData);
      toast({
        title: "Sucesso",
        description: "Proposta criada com sucesso!",
      });
      setIsCreateModalOpen(false);
      resetForm();
      await loadProposals();
    } catch (error: any) {
      console.error('Erro ao criar proposta:', error);
      toast({
        title: "Erro",
        description: error.response?.data?.message || "Não foi possível criar a proposta.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle update proposal
  const handleUpdateProposal = async () => {
    if (!selectedProposal) return;
    try {
      setIsSubmitting(true);
      const updateData: UpdateProposalRequest = {
        ...formData,
        status: formData.status || selectedProposal.status
      };
      await proposalService.updateProposal(Number(selectedProposal.id), updateData);
      toast({
        title: "Sucesso",
        description: "Proposta atualizada com sucesso!",
      });
      setIsEditModalOpen(false);
      resetForm();
      await loadProposals();
    } catch (error: any) {
      console.error('Erro ao atualizar proposta:', error);
      toast({
        title: "Erro",
        description: error.response?.data?.message || "Não foi possível atualizar a proposta.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete proposal
  const handleDeleteProposal = async (proposalId: number) => {
    if (!confirm('Tem certeza que deseja excluir esta proposta?')) return;
    try {
      await proposalService.deleteProposal(proposalId);
      toast({
        title: "Sucesso",
        description: "Proposta excluída com sucesso!",
      });
      await loadProposals();
    } catch (error: any) {
      console.error('Erro ao excluir proposta:', error);
      toast({
        title: "Erro",
        description: error.response?.data?.message || "Não foi possível excluir a proposta.",
        variant: "destructive"
      });
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      title: '',
      clientId: undefined,
      leadId: undefined,
      totalValue: 0,
      validUntil: undefined,
      description: '',
      status: 'DRAFT'
    });
    setSelectedProposal(null);
  };

  // Open edit modal
  const handleEdit = (proposal: Proposal) => {
    setSelectedProposal(proposal);
    setFormData({
      title: proposal.title || '',
      totalValue: proposal.totalValue || 0,
      description: proposal.description || ''
    });
    setIsEditModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      DRAFT: { label: 'Rascunho', color: 'bg-gray-500' },
      SENT: { label: 'Enviada', color: 'bg-blue-500' },
      UNDER_REVIEW: { label: 'Em Análise', color: 'bg-yellow-500' },
      APPROVED: { label: 'Aprovada', color: 'bg-green-500' },
      REJECTED: { label: 'Rejeitada', color: 'bg-red-500' },
      EXPIRED: { label: 'Expirada', color: 'bg-orange-500' },
      CONVERTED: { label: 'Convertida', color: 'bg-purple-500' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.DRAFT;
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

  const getUniqueClients = () => {
    return Array.from(new Set(proposals.map(p => p.clientName)));
  };

  return (
    <StandardLayout>
      <Tabs defaultValue="lista" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="lista">Propostas Comerciais</TabsTrigger>
          <TabsTrigger value="acordo">Proposta de Acordo</TabsTrigger>
        </TabsList>
        <TabsContent value="lista">
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-seguranca-lightgray">Propostas</h1>
                <p className="text-gray-400 mt-1">Gestão de propostas comerciais</p>
              </div>
              
              <div className="flex items-center gap-2">
                <Button 
                  className="bg-seguranca-red hover:bg-seguranca-darkred"
                  onClick={() => setIsCreateModalOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Proposta
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
                        placeholder="Título, número ou cliente..."
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
                        <SelectItem value="DRAFT">Rascunho</SelectItem>
                        <SelectItem value="SENT">Enviada</SelectItem>
                        <SelectItem value="UNDER_REVIEW">Em Análise</SelectItem>
                        <SelectItem value="APPROVED">Aprovada</SelectItem>
                        <SelectItem value="REJECTED">Rejeitada</SelectItem>
                        <SelectItem value="EXPIRED">Expirada</SelectItem>
                        <SelectItem value="CONVERTED">Convertida</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="client" className="text-seguranca-lightgray">Cliente</Label>
                    <Select value={clientFilter} onValueChange={setClientFilter}>
                      <SelectTrigger className="bg-seguranca-black border-gray-600 text-seguranca-lightgray">
                        <SelectValue placeholder="Todos os clientes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os clientes</SelectItem>
                        {getUniqueClients().map(client => (
                          <SelectItem key={client} value={client}>{client}</SelectItem>
                        ))}
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
                        setClientFilter('all');
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
                      <p className="text-gray-400 text-sm">Total de Propostas</p>
                      <p className="text-2xl font-bold text-seguranca-lightgray">{proposals.length}</p>
                    </div>
                    <FileText className="h-8 w-8 text-seguranca-red" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-seguranca-graphite border-gray-600">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Em Análise</p>
                      <p className="text-2xl font-bold text-yellow-500">
                        {proposals.filter(p => p.status === 'UNDER_REVIEW').length}
                      </p>
                    </div>
                    <div className="h-8 w-8 bg-yellow-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">A</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-seguranca-graphite border-gray-600">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Aprovadas</p>
                      <p className="text-2xl font-bold text-green-500">
                        {proposals.filter(p => p.status === 'APPROVED').length}
                      </p>
                    </div>
                    <div className="h-8 w-8 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">✓</span>
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
                        {formatCurrency(proposals.reduce((sum, proposal) => sum + proposal.totalValue, 0))}
                      </p>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabela de Propostas */}
            <Card className="bg-seguranca-graphite border-gray-600">
              <CardHeader>
                <CardTitle className="text-seguranca-lightgray">Lista de Propostas</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-seguranca-yellow" />
                  </div>
                ) : filteredProposals.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    Nenhuma proposta encontrada.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-gray-600">
                          <TableHead className="text-seguranca-lightgray">Número</TableHead>
                          <TableHead className="text-seguranca-lightgray">Título</TableHead>
                          <TableHead className="text-seguranca-lightgray">Cliente</TableHead>
                          <TableHead className="text-seguranca-lightgray">Status</TableHead>
                          <TableHead className="text-seguranca-lightgray">Valor</TableHead>
                          <TableHead className="text-seguranca-lightgray">Válida Até</TableHead>
                          <TableHead className="text-seguranca-lightgray">Responsável</TableHead>
                          <TableHead className="text-seguranca-lightgray text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredProposals.map((proposal) => (
                          <TableRow key={proposal.id} className="border-gray-600">
                            <TableCell className="text-seguranca-lightgray font-medium">
                              {proposal.proposalNumber || '-'}
                            </TableCell>
                            <TableCell className="text-seguranca-lightgray">
                              <div>
                                <div className="font-medium">{proposal.title}</div>
                                <div className="text-sm text-gray-400">{proposal.description || ''}</div>
                              </div>
                            </TableCell>
                            <TableCell className="text-seguranca-lightgray">
                              <div>
                                <div className="font-medium">{proposal.clientName}</div>
                                {proposal.leadName && (
                                  <div className="text-sm text-gray-400">Lead: {proposal.leadName}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{getStatusBadge(proposal.status)}</TableCell>
                            <TableCell className="text-seguranca-lightgray font-medium">
                              {proposal.totalValue ? formatCurrency(proposal.totalValue) : '-'}
                            </TableCell>
                            <TableCell className="text-seguranca-lightgray">
                              {proposal.validUntil ? formatDate(proposal.validUntil) : '-'}
                            </TableCell>
                            <TableCell className="text-seguranca-lightgray">
                              {proposal.assignedToName}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                                  onClick={() => {
                                    setSelectedProposal(proposal);
                                    setIsViewModalOpen(true);
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                                  onClick={() => handleEdit(proposal)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="bg-seguranca-black border-gray-600 text-red-400 hover:text-red-300"
                                  onClick={() => handleDeleteProposal(Number(proposal.id))}
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
                  <DialogTitle className="text-seguranca-lightgray">Detalhes da Proposta</DialogTitle>
                  <DialogDescription className="text-gray-400">
                    Visualize os detalhes completos da proposta selecionada
                  </DialogDescription>
                </DialogHeader>
                {selectedProposal && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-gray-400">Número da Proposta</Label>
                        <p className="text-seguranca-lightgray font-medium">{selectedProposal.proposalNumber}</p>
                      </div>
                      <div>
                        <Label className="text-gray-400">Status</Label>
                        <div className="mt-1">{getStatusBadge(selectedProposal.status)}</div>
                      </div>
                      <div>
                        <Label className="text-gray-400">Título</Label>
                        <p className="text-seguranca-lightgray">{selectedProposal.title}</p>
                      </div>
                      <div>
                        <Label className="text-gray-400">Cliente</Label>
                        <p className="text-seguranca-lightgray">{selectedProposal.clientName}</p>
                      </div>
                      <div>
                        <Label className="text-gray-400">Lead</Label>
                        <p className="text-seguranca-lightgray">{selectedProposal.leadName}</p>
                      </div>
                      <div>
                        <Label className="text-gray-400">Valor Total</Label>
                        <p className="text-seguranca-lightgray font-medium">
                          {formatCurrency(selectedProposal.totalValue)}
                        </p>
                      </div>
                      <div>
                        <Label className="text-gray-400">Válida Até</Label>
                        <p className="text-seguranca-lightgray">{formatDate(selectedProposal.validUntil)}</p>
                      </div>
                      <div>
                        <Label className="text-gray-400">Responsável</Label>
                        <p className="text-seguranca-lightgray">{selectedProposal.assignedToName}</p>
                      </div>
                      <div>
                        <Label className="text-gray-400">Criado Por</Label>
                        <p className="text-seguranca-lightgray">{selectedProposal.createdByName}</p>
                      </div>
                      <div>
                        <Label className="text-gray-400">Data de Criação</Label>
                        <p className="text-seguranca-lightgray">{formatDate(selectedProposal.createdAt)}</p>
                      </div>
                      <div>
                        <Label className="text-gray-400">Última Atualização</Label>
                        <p className="text-seguranca-lightgray">{formatDate(selectedProposal.updatedAt)}</p>
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-gray-400">Descrição</Label>
                      <p className="text-seguranca-lightgray mt-1">{selectedProposal.description}</p>
                    </div>
                    
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        className="bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                        onClick={() => setIsViewModalOpen(false)}
                      >
                        Fechar
                      </Button>
                      <Button className="bg-seguranca-red hover:bg-seguranca-darkred">
                        Editar Proposta
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            {/* Modal de Criação */}
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
              <DialogContent className="bg-seguranca-graphite border-gray-600 max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="text-seguranca-lightgray">Nova Proposta</DialogTitle>
                  <DialogDescription className="text-gray-400">
                    Preencha os dados para criar uma nova proposta comercial
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="title" className="text-seguranca-lightgray">Título *</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                        placeholder="Título da proposta"
                      />
                    </div>
                    <div>
                      <Label htmlFor="client" className="text-seguranca-lightgray">Cliente *</Label>
                      <div className="flex gap-2">
                        <div className="flex-1 relative">
                          <Select
                            value={formData.clientId?.toString() || ''}
                            onValueChange={(value) => {
                              setFormData({ ...formData, clientId: Number(value) });
                            }}
                            disabled={loadingClients}
                          >
                            <SelectTrigger 
                              className="bg-seguranca-black border-gray-600 text-white [&>span[data-placeholder]]:text-gray-400 [&>span[data-placeholder]]:opacity-70"
                            >
                              <SelectValue 
                                placeholder={loadingClients ? "Carregando clientes..." : clients.length === 0 ? "Nenhum cliente cadastrado" : "Selecione o cliente"}
                              />
                            </SelectTrigger>
                            <SelectContent className="bg-seguranca-graphite border-gray-600">
                              {loadingClients ? (
                                <SelectItem value="loading" disabled className="text-gray-400">
                                  Carregando clientes...
                                </SelectItem>
                              ) : clients.length === 0 ? (
                                <SelectItem value="no-clients" disabled className="text-gray-400">
                                  Nenhum cliente encontrado
                                </SelectItem>
                              ) : (
                                clients.map((client) => (
                                  <SelectItem 
                                    key={client.id} 
                                    value={client.id.toString()}
                                    className="text-seguranca-lightgray focus:bg-seguranca-black focus:text-seguranca-lightgray"
                                  >
                                    {client.name} {client.cnpj ? `- ${client.cnpj}` : ''}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          {/* Exibição customizada do nome do cliente selecionado - fallback se Radix UI não renderizar */}
                          {formData.clientId && clients.length > 0 && (() => {
                            const selectedClient = clients.find(c => c.id === formData.clientId);
                            if (selectedClient) {
                              return (
                                <div 
                                  className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10 pr-8"
                                  style={{ color: '#ffffff' }}
                                >
                                  <span className="text-sm font-medium text-white whitespace-nowrap overflow-hidden text-ellipsis block max-w-full">
                                    {selectedClient.name} {selectedClient.cnpj ? `- ${selectedClient.cnpj}` : ''}
                                  </span>
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsClientModalOpen(true)}
                          className="bg-seguranca-black border-gray-600 text-seguranca-yellow hover:text-yellow-400 hover:border-yellow-400 shrink-0"
                          title="Criar novo cliente"
                        >
                          <PlusIcon className="h-4 w-4" />
                        </Button>
                      </div>
                      {clients.length === 0 && !loadingClients && (
                        <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                          <span>Nenhum cliente cadastrado.</span>
                          <button
                            type="button"
                            onClick={() => setIsClientModalOpen(true)}
                            className="text-seguranca-yellow hover:text-yellow-400 underline"
                          >
                            Clique aqui para criar um novo cliente
                          </button>
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="lead" className="text-seguranca-lightgray">Lead</Label>
                      <Select
                        value={formData.leadId?.toString() || '__NONE__'}
                        onValueChange={(value) => setFormData({ ...formData, leadId: value === '__NONE__' ? undefined : Number(value) })}
                        disabled={loadingLeads}
                      >
                        <SelectTrigger className="bg-seguranca-black border-gray-600 text-seguranca-lightgray [&>span[data-placeholder]]:text-gray-400 [&>span:not([data-placeholder])]:text-seguranca-lightgray">
                          <SelectValue placeholder={loadingLeads ? "Carregando leads..." : "Selecione o lead (opcional)"} />
                        </SelectTrigger>
                        <SelectContent className="bg-seguranca-graphite border-gray-600">
                          <SelectItem value="__NONE__" className="text-seguranca-lightgray focus:bg-seguranca-black focus:text-seguranca-lightgray">Nenhum</SelectItem>
                          {leads.length === 0 ? (
                            <SelectItem value="no-leads" disabled className="text-gray-400">
                              Nenhum lead encontrado
                            </SelectItem>
                          ) : (
                            leads.map((lead) => (
                              <SelectItem 
                                key={lead.id} 
                                value={lead.id.toString()}
                                className="text-seguranca-lightgray focus:bg-seguranca-black focus:text-seguranca-lightgray"
                              >
                                {lead.name} {lead.company ? `- ${lead.company}` : ''}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="totalValue" className="text-seguranca-lightgray">Valor Total *</Label>
                      <Input
                        id="totalValue"
                        type="number"
                        step="0.01"
                        value={formData.totalValue || ''}
                        onChange={(e) => setFormData({ ...formData, totalValue: parseFloat(e.target.value) || 0 })}
                        className="bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                        placeholder="0,00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="validUntil" className="text-seguranca-lightgray">Válida Até</Label>
                      <Input
                        id="validUntil"
                        type="date"
                        value={formData.validUntil || ''}
                        onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                        className="bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                      />
                    </div>
                    <div>
                      <Label htmlFor="status" className="text-seguranca-lightgray">Status</Label>
                      <Select
                        value={formData.status || 'DRAFT'}
                        onValueChange={(value) => setFormData({ ...formData, status: value as any })}
                      >
                        <SelectTrigger className="bg-seguranca-black border-gray-600 text-seguranca-lightgray [&>span[data-placeholder]]:text-gray-400 [&>span:not([data-placeholder])]:text-seguranca-lightgray">
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                        <SelectContent className="bg-seguranca-graphite border-gray-600">
                          <SelectItem value="DRAFT" className="text-seguranca-lightgray focus:bg-seguranca-black focus:text-seguranca-lightgray">Rascunho</SelectItem>
                          <SelectItem value="SENT" className="text-seguranca-lightgray focus:bg-seguranca-black focus:text-seguranca-lightgray">Enviada</SelectItem>
                          <SelectItem value="UNDER_REVIEW" className="text-seguranca-lightgray focus:bg-seguranca-black focus:text-seguranca-lightgray">Em Análise</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="description" className="text-seguranca-lightgray">Descrição</Label>
                    <Textarea
                      id="description"
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                      placeholder="Descrição detalhada da proposta..."
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
                    >
                      Cancelar
                    </Button>
                    <Button 
                      className="bg-seguranca-red hover:bg-seguranca-darkred"
                      onClick={handleCreateProposal}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Criando...
                        </>
                      ) : (
                        'Criar Proposta'
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Modal de Criação de Cliente */}
            <ClientFormModal
              isOpen={isClientModalOpen}
              onClose={() => setIsClientModalOpen(false)}
              onSuccess={handleClientCreated}
            />
          </div>
        </TabsContent>
        <TabsContent value="acordo">
          <PropostaAcordo />
        </TabsContent>
      </Tabs>
    </StandardLayout>
  );
};

export default Propostas; 