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
import { Checkbox } from '@/components/ui/checkbox';
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
  FileDown,
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
  FileSpreadsheet,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { proposalService, Proposal, CreateProposalRequest, UpdateProposalRequest } from '@/services/proposalService';
import { clientService, Client } from '@/services/clientService';
import { userService, User as UserType } from '@/services/userService';
import leadService from '@/services/leadService';
import { ClientFormModal } from '@/components/clientes/ClientFormModal';
import PropostaAcordo from '@/components/comercial/PropostaAcordo';
import { AgreementProposalsList } from '@/components/comercial/AgreementProposalsList';
import { PropostaComercial } from '@/types/proposta';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { contractService } from '@/services/contractService';
import { saveAs } from 'file-saver';
import { format, parseISO } from 'date-fns';
import { DatePicker } from '@/components/ui/date-picker';

/** Converte PropostaComercial em itens para o backend (com notes para agrupamento no PDF) */
function propostaComercialToItems(p: PropostaComercial): { description: string; quantity: number; unitPrice: number; notes: string }[] {
  const items: { description: string; quantity: number; unitPrice: number; notes: string }[] = [];
  const mao = p.maoDeObra;
  const mat = p.materiais;
  const bdi = p.bdi;
  const imp = p.impostos;

  items.push({ description: `Salário base (${mao.quantidadePorteiros} funcionário(s))`, quantity: 1, unitPrice: mao.salarioPorteiro * mao.quantidadePorteiros, notes: 'MAO_DE_OBRA' });
  items.push({ description: `Adicional Noturno (${mao.adicionalNoturnoPercent}%)`, quantity: 1, unitPrice: mao.adicionalNoturnoValor, notes: 'MAO_DE_OBRA' });
  items.push({ description: 'Reflexo Adicional Noturno/HE/DSR', quantity: 1, unitPrice: mao.reflexoAdicional, notes: 'MAO_DE_OBRA' });
  items.push({ description: 'Subtotal', quantity: 1, unitPrice: mao.subtotal, notes: 'MAO_DE_OBRA' });
  items.push({ description: `Encargos (${mao.encargosPercent}%)`, quantity: 1, unitPrice: mao.encargosValor, notes: 'MAO_DE_OBRA' });
  items.push({ description: 'Total Mão de Obra', quantity: 1, unitPrice: mao.total, notes: 'MAO_DE_OBRA' });

  items.push({ description: `Uniformes (${mat.uniformeQuantidade} x R$ ${mat.uniformeUnitario.toFixed(2)})`, quantity: 1, unitPrice: mat.uniformeQuantidade * mat.uniformeUnitario, notes: 'MATERIAIS' });
  items.push({ description: `Equipamentos (${mat.equipamentosQuantidade} x R$ ${mat.equipamentosUnitario.toFixed(2)})`, quantity: 1, unitPrice: mat.equipamentosQuantidade * mat.equipamentosUnitario, notes: 'MATERIAIS' });
  items.push({ description: 'Subtotal Materiais', quantity: 1, unitPrice: mat.subtotal, notes: 'MATERIAIS' });

  items.push({ description: `Taxa de Administração (${bdi.taxaAdministracaoPercent}%)`, quantity: 1, unitPrice: bdi.taxaAdministracaoValor, notes: 'BDI' });
  items.push({ description: `Lucro (${bdi.lucroPercent}%)`, quantity: 1, unitPrice: bdi.lucroValor, notes: 'BDI' });
  items.push({ description: 'Subtotal BDI', quantity: 1, unitPrice: bdi.subtotal, notes: 'BDI' });

  items.push({ description: `COFINS (${imp.cofinsPercent}%)`, quantity: 1, unitPrice: imp.cofinsValor, notes: 'IMPOSTOS' });
  items.push({ description: `PIS (${imp.pisPercent}%)`, quantity: 1, unitPrice: imp.pisValor, notes: 'IMPOSTOS' });
  items.push({ description: `ISSQN (${imp.issqnPercent}%)`, quantity: 1, unitPrice: imp.issqnValor, notes: 'IMPOSTOS' });
  items.push({ description: `IR (${imp.irPercent}%)`, quantity: 1, unitPrice: imp.irValor, notes: 'IMPOSTOS' });
  items.push({ description: `CSLL (${imp.csllPercent}%)`, quantity: 1, unitPrice: imp.csllValor, notes: 'IMPOSTOS' });
  items.push({ description: 'Total Impostos', quantity: 1, unitPrice: imp.total, notes: 'IMPOSTOS' });

  return items;
}

const Propostas = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
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
  const [generatingReport, setGeneratingReport] = useState<'pdf' | 'excel' | null>(null);
  const [generatingContract, setGeneratingContract] = useState<string | null>(null);
  const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null);
  
  // States para deleção e seleção
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleteReasonModalOpen, setIsDeleteReasonModalOpen] = useState(false);
  const [deleteMode, setDeleteMode] = useState<'single' | 'bulk' | 'all' | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [proposalToDelete, setProposalToDelete] = useState<string | null>(null);

  // Form state (inclui termsConditions e notes para edição completa)
  const [formData, setFormData] = useState<CreateProposalRequest & { clientId?: number | string; leadId?: number | string; assignedToId?: number | string; termsConditions?: string; notes?: string }>({
    title: '',
    clientId: undefined,
    leadId: undefined,
    assignedToId: undefined,
    totalValue: 0,
    validUntil: undefined,
    description: '',
    termsConditions: '',
    notes: '',
    status: 'DRAFT'
  });
  const [users, setUsers] = useState<UserType[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Load proposals from backend
  const loadProposals = async () => {
    try {
      setLoading(true);
      const data = await proposalService.getAllProposals();

      // Defensive check: ensure data is an array
      if (!Array.isArray(data)) {
        console.error('❌ API retornou dados inválidos (não é array):', data);
        toast({
          title: "Erro",
          description: "Formato de resposta inválido do servidor.",
          variant: "destructive"
        });
        setProposals([]);
        setFilteredProposals([]);
        return;
      }

      // Map backend data to frontend format (incluir clientId, leadId, assignedToId para edição)
      const mappedProposals = data.map((proposal: any) => ({
        id: proposal.id,
        title: proposal.title || '',
        proposalNumber: proposal.proposalNumber || '',
        clientId: proposal.clientId ?? proposal.client?.id,
        clientName: proposal.client?.name || proposal.clientName || 'N/A',
        leadId: proposal.leadId ?? proposal.lead?.id,
        leadName: proposal.lead?.name || proposal.leadName || '',
        assignedToId: proposal.assignedToId ?? proposal.assignedTo?.id,
        status: proposal.status || 'DRAFT',
        totalValue: proposal.totalValue ? Number(proposal.totalValue) : 0,
        validUntil: proposal.validUntil ? new Date(proposal.validUntil).toISOString().split('T')[0] : '',
        description: proposal.description || '',
        termsConditions: proposal.termsConditions || '',
        notes: proposal.notes || '',
        createdByName: proposal.createdBy?.name || proposal.createdByName || 'N/A',
        assignedToName: proposal.assignedTo?.name || proposal.assignedToName || 'Não atribuído',
        createdAt: proposal.createdAt ? new Date(proposal.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        updatedAt: proposal.updatedAt ? new Date(proposal.updatedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        contractId: proposal.contractId ?? proposal.contract?.id
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
      // Set empty arrays on error to prevent crashes
      setProposals([]);
      setFilteredProposals([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProposals();
    loadClients();
  }, []);

  // Load clients, leads and users when create or edit modal opens
  useEffect(() => {
    if (isCreateModalOpen || isEditModalOpen) {
      loadClients();
      loadLeads();
      loadUsers();
    }
  }, [isCreateModalOpen, isEditModalOpen]);

  // Load clients function
  const loadClients = async () => {
    try {
      setLoadingClients(true);
      const data = await clientService.getAllClients();
      console.log('📋 Clientes carregados:', data);
      // Garantir que os dados estão no formato correto
      const normalizedClients = Array.isArray(data) ? data.map((client: any) => ({
        id: client.id || client.uuid || String(client.id),
        name: client.name || client.nome || '',
        cnpj: client.cnpj || ''
      })) : [];
      setClients(normalizedClients);
      console.log('✅ Clientes normalizados:', normalizedClients);
    } catch (error: any) {
      console.error('❌ Erro ao carregar clientes:', error);
      toast({
        title: "Erro",
        description: error.response?.data?.message || "Não foi possível carregar os clientes.",
        variant: "destructive"
      });
      setClients([]);
    } finally {
      setLoadingClients(false);
    }
  };

  // Load users function
  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const data = await userService.getAllUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Erro ao carregar usuários:', error);
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Load leads function
  const loadLeads = async () => {
    try {
      setLoadingLeads(true);
      const data = await leadService.getAllLeads();
      console.log('📋 Leads carregados:', data);
      // Garantir que os dados estão no formato correto
      const normalizedLeads = Array.isArray(data) ? data.map((lead: any) => ({
        id: lead.id || lead.uuid || String(lead.id),
        name: lead.name || lead.nome || '',
        company: lead.company || lead.empresa || ''
      })) : [];
      setLeads(normalizedLeads);
      console.log('✅ Leads normalizados:', normalizedLeads);
    } catch (error: any) {
      console.error('❌ Erro ao carregar leads:', error);
      // Não mostrar toast para leads, pois é opcional
      setLeads([]);
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
      setFormData({ ...formData, clientId: isNaN(Number(createdClient.id)) ? createdClient.id : Number(createdClient.id) });
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
      // Converter IDs para o formato esperado pela API (pode ser string UUID ou number)
      const proposalData: CreateProposalRequest = {
        ...formData,
        clientId: formData.clientId ? (typeof formData.clientId === 'string' ? Number(formData.clientId) || formData.clientId : formData.clientId) : undefined,
        leadId: formData.leadId ? (typeof formData.leadId === 'string' ? Number(formData.leadId) || formData.leadId : formData.leadId) : undefined,
        assignedToId: formData.assignedToId ? (typeof formData.assignedToId === 'string' ? formData.assignedToId : String(formData.assignedToId)) : undefined,
      };
      console.log('📤 Enviando proposta:', proposalData);
      await proposalService.createProposal(proposalData);
      toast({
        title: "Sucesso",
        description: "Proposta criada com sucesso!",
      });
      setIsCreateModalOpen(false);
      resetForm();
      await loadProposals();
    } catch (error: any) {
      console.error('❌ Erro ao criar proposta:', error);
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
    if (!selectedProposal || !selectedProposal.id) {
      toast({
        title: "Erro",
        description: "Proposta não selecionada ou ID inválido.",
        variant: "destructive"
      });
      return;
    }
    try {
      setIsSubmitting(true);

      // Converter clientId e leadId para string (UUID) se necessário
      const clientId = formData.clientId
        ? (typeof formData.clientId === 'string' ? formData.clientId : String(formData.clientId))
        : undefined;

      const leadId = formData.leadId
        ? (typeof formData.leadId === 'string' ? formData.leadId : String(formData.leadId))
        : undefined;

      const assignedToId = formData.assignedToId
        ? (typeof formData.assignedToId === 'string' ? formData.assignedToId : String(formData.assignedToId))
        : undefined;

      const updateData: UpdateProposalRequest = {
        title: formData.title,
        clientId: clientId,
        leadId: leadId,
        assignedToId: assignedToId,
        totalValue: formData.totalValue,
        validUntil: formData.validUntil,
        description: formData.description ?? '',
        termsConditions: formData.termsConditions ?? '',
        notes: formData.notes ?? '',
        status: formData.status || selectedProposal.status
      };

      // Converter ID para string (pode ser UUID ou number)
      const proposalId = typeof selectedProposal.id === 'string'
        ? selectedProposal.id
        : String(selectedProposal.id);

      console.log('📤 Atualizando proposta:', { id: proposalId, data: updateData });
      await proposalService.updateProposal(proposalId, updateData);
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

  // Gerar contrato a partir de proposta aprovada
  const handleGenerateContract = async (proposal: Proposal) => {
    const id = typeof proposal.id === 'string' ? proposal.id : String(proposal.id);
    if (proposal.contractId) {
      toast({ title: 'Aviso', description: 'Esta proposta já possui um contrato associado.', variant: 'destructive' });
      return;
    }
    if (proposal.status !== 'APPROVED' && proposal.status !== 'CONVERTED') {
      toast({ title: 'Aviso', description: 'Apenas propostas aprovadas ou convertidas podem gerar contrato.', variant: 'destructive' });
      return;
    }
    try {
      setGeneratingContract(id);
      const contract = await contractService.createFromProposal(id);
      toast({ title: 'Sucesso', description: 'Contrato criado com sucesso! Redirecionando...' });
      navigate('/contratos');
    } catch (error: any) {
      toast({ title: 'Erro', description: error.response?.data?.message || 'Não foi possível gerar o contrato.', variant: 'destructive' });
    } finally {
      setGeneratingContract(null);
    }
  };

  // Gerar PDF da proposta
  const handleDownloadPdf = async (proposal: Proposal) => {
    const id = typeof proposal.id === 'string' ? proposal.id : String(proposal.id);
    try {
      setGeneratingPdfId(id);
      const blob = await proposalService.getProposalPdf(id);
      const fileName = `proposta_${proposal.proposalNumber || proposal.id}_${new Date().toISOString().split('T')[0]}.pdf`;
      saveAs(blob, fileName);
      toast({ title: 'Sucesso', description: 'PDF gerado com sucesso!' });
    } catch (error: any) {
      console.error('Erro ao gerar PDF:', error);
      toast({
        title: 'Erro',
        description: error.response?.data?.message || 'Não foi possível gerar o PDF.',
        variant: 'destructive'
      });
    } finally {
      setGeneratingPdfId(null);
    }
  };

  // Prepara a exclusão de uma proposta individual
  const handleDeleteProposal = (proposalId: number | string) => {
    const id = typeof proposalId === 'string' ? proposalId : String(proposalId);
    setProposalToDelete(id);
    setDeleteMode('single');
    setDeleteReason('');
    setIsDeleteReasonModalOpen(true);
  };

  // Prepara exclusão em massa
  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) {
      toast({ title: 'Aviso', description: 'Selecione ao menos uma proposta.', variant: 'destructive' });
      return;
    }
    setDeleteMode('bulk');
    setDeleteReason('');
    setIsDeleteReasonModalOpen(true);
  };

  // Prepara exclusão de todos
  const handleDeleteAll = () => {
    setDeleteMode('all');
    setDeleteReason('');
    setIsDeleteReasonModalOpen(true);
  };

  // Confirmação final da deleção (individual, múltipla ou todas)
  const confirmDelete = async () => {
    if (!deleteReason.trim()) {
      toast({ title: 'Erro', description: 'O motivo da exclusão é obrigatório.', variant: 'destructive' });
      return;
    }

    try {
      if (deleteMode === 'single' && proposalToDelete) {
        await proposalService.deleteProposal(proposalToDelete, deleteReason);
        toast({ title: 'Sucesso', description: 'Proposta excluída com sucesso!' });
      } else if (deleteMode === 'bulk') {
        await proposalService.deleteProposalsBulk(selectedIds, deleteReason);
        toast({ title: 'Sucesso', description: 'Propostas excluídas com sucesso!' });
        setSelectedIds([]);
      } else if (deleteMode === 'all') {
        await proposalService.deleteAllProposals(deleteReason);
        toast({ title: 'Sucesso', description: 'Todas as propostas foram excluídas!' });
        setSelectedIds([]);
      }
      setIsDeleteReasonModalOpen(false);
      setDeleteReason('');
      await loadProposals();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.response?.data?.message || 'Erro ao excluir.', variant: 'destructive' });
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredProposals.map(p => String(p.id)));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectProposal = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(item => item !== id));
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      title: '',
      clientId: undefined,
      leadId: undefined,
      assignedToId: undefined,
      totalValue: 0,
      validUntil: undefined,
      description: '',
      termsConditions: '',
      notes: '',
      status: 'DRAFT'
    });
    setSelectedProposal(null);
  };

  // Open edit modal
  const handleEdit = async (proposal: Proposal) => {
    setSelectedProposal(proposal);

    // Carregar clientes e leads se ainda não foram carregados
    if (clients.length === 0) {
      await loadClients();
    }
    if (leads.length === 0) {
      await loadLeads();
    }

    // Buscar a proposta completa do backend para ter todos os dados
    try {
      // Converter ID para string se necessário
      const proposalId = typeof proposal.id === 'string' ? proposal.id : String(proposal.id);
      const fullProposal = await proposalService.getProposalById(proposalId);

      // Extrair clientId e leadId (pode estar em client.id ou clientId direto)
      const clientId = (fullProposal as any).clientId
        ? String((fullProposal as any).clientId)
        : (fullProposal.client?.id ? String(fullProposal.client.id) : undefined);

      const leadId = (fullProposal as any).leadId
        ? String((fullProposal as any).leadId)
        : (fullProposal.lead?.id ? String(fullProposal.lead.id) : undefined);

      const assignedToId = (fullProposal as any).assignedToId
        ? String((fullProposal as any).assignedToId)
        : (fullProposal.assignedTo?.id ? String(fullProposal.assignedTo.id) : undefined);

      setFormData({
        title: fullProposal.title || proposal.title || '',
        clientId: clientId || undefined,
        leadId: leadId || undefined,
        assignedToId: assignedToId || undefined,
        totalValue: fullProposal.totalValue != null ? Number(fullProposal.totalValue) : proposal.totalValue || 0,
        validUntil: fullProposal.validUntil ? new Date(fullProposal.validUntil).toISOString().split('T')[0] : proposal.validUntil || undefined,
        description: fullProposal.description ?? proposal.description ?? '',
        termsConditions: (fullProposal as any).termsConditions ?? (proposal as any).termsConditions ?? '',
        notes: (fullProposal as any).notes ?? (proposal as any).notes ?? '',
        status: fullProposal.status || proposal.status || 'DRAFT'
      });
    } catch (error) {
      // Se falhar, usar os dados que temos
      console.error('Erro ao carregar proposta completa:', error);
      const clientId = (proposal as any).clientId
        ? String((proposal as any).clientId)
        : (proposal.client?.id ? String(proposal.client.id) : undefined);

      const leadId = (proposal as any).leadId
        ? String((proposal as any).leadId)
        : (proposal.lead?.id ? String(proposal.lead.id) : undefined);

      const assignedToId = (proposal as any).assignedToId
        ? String((proposal as any).assignedToId)
        : (proposal.assignedTo?.id ? String(proposal.assignedTo.id) : undefined);

      setFormData({
        title: proposal.title || '',
        clientId: clientId || undefined,
        leadId: leadId || undefined,
        assignedToId: assignedToId || undefined,
        totalValue: proposal.totalValue ?? 0,
        validUntil: proposal.validUntil || undefined,
        description: proposal.description ?? '',
        termsConditions: (proposal as any).termsConditions ?? '',
        notes: (proposal as any).notes ?? '',
        status: proposal.status || 'DRAFT'
      });
    }

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

  const handleGeneratePDF = async () => {
    try {
      setGeneratingReport('pdf');
      const filters = {
        status: statusFilter === 'all' ? undefined : statusFilter,
        clientName: clientFilter === 'all' ? undefined : clientFilter,
        searchTerm: searchTerm.trim() || undefined
      };
      const blob = await proposalService.generateReportPDF(filters);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio-propostas-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({
        title: 'Sucesso',
        description: 'Relatório PDF gerado com sucesso.'
      });
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao gerar relatório PDF. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setGeneratingReport(null);
    }
  };

  const handleGenerateExcel = async () => {
    try {
      setGeneratingReport('excel');
      const filters = {
        status: statusFilter === 'all' ? undefined : statusFilter,
        clientName: clientFilter === 'all' ? undefined : clientFilter,
        searchTerm: searchTerm.trim() || undefined
      };
      const blob = await proposalService.generateReportExcel(filters);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio-propostas-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({
        title: 'Sucesso',
        description: 'Relatório Excel gerado com sucesso.'
      });
    } catch (error) {
      console.error('Erro ao gerar Excel:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao gerar relatório Excel. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setGeneratingReport(null);
    }
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
                  variant="outline"
                  className="border-gray-600 text-seguranca-lightgray hover:bg-gray-700"
                  onClick={handleGeneratePDF}
                  disabled={generatingReport !== null}
                >
                  {generatingReport === 'pdf' ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <FileDown className="h-4 w-4 mr-2" />
                  )}
                  Gerar PDF
                </Button>
                <Button
                  variant="outline"
                  className="border-gray-600 text-seguranca-lightgray hover:bg-gray-700"
                  onClick={handleGenerateExcel}
                  disabled={generatingReport !== null}
                >
                  {generatingReport === 'excel' ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                  )}
                  Gerar Excel
                </Button>
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
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-seguranca-lightgray">Lista de Propostas</CardTitle>
                <div className="flex gap-2">
                  {selectedIds.length > 0 && (
                    <Button 
                      variant="destructive" 
                      onClick={handleDeleteSelected}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir Selecionados ({selectedIds.length})
                    </Button>
                  )}
                  {filteredProposals.length > 0 && (
                    <Button 
                      variant="outline" 
                      onClick={handleDeleteAll}
                      className="border-red-600 text-red-500 hover:bg-red-600 hover:text-white"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Limpar Tudo
                    </Button>
                  )}
                </div>
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
                          <TableHead className="w-12">
                            <Checkbox 
                              checked={selectedIds.length === filteredProposals.length && filteredProposals.length > 0}
                              onCheckedChange={handleSelectAll}
                              aria-label="Selecionar todos"
                            />
                          </TableHead>
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
                            <TableCell>
                              <Checkbox 
                                checked={selectedIds.includes(String(proposal.id))}
                                onCheckedChange={(checked) => handleSelectProposal(String(proposal.id), !!checked)}
                                aria-label={`Selecionar proposta ${proposal.title}`}
                              />
                            </TableCell>
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
                                  className="bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                                  onClick={() => handleDownloadPdf(proposal)}
                                  disabled={generatingPdfId === (typeof proposal.id === 'string' ? proposal.id : String(proposal.id))}
                                  title="Gerar PDF"
                                >
                                  {generatingPdfId === (typeof proposal.id === 'string' ? proposal.id : String(proposal.id)) ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <FileDown className="h-4 w-4" />
                                  )}
                                </Button>
                                {(proposal.status === 'APPROVED' || proposal.status === 'CONVERTED') && !proposal.contractId && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="bg-seguranca-black border-green-500 text-green-400 hover:bg-green-500/20"
                                    onClick={() => handleGenerateContract(proposal)}
                                    disabled={generatingContract === (typeof proposal.id === 'string' ? proposal.id : String(proposal.id))}
                                    title="Gerar Contrato"
                                  >
                                    {generatingContract === (typeof proposal.id === 'string' ? proposal.id : String(proposal.id)) ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <FileText className="h-4 w-4" />
                                    )}
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="bg-seguranca-black border-gray-600 text-red-400 hover:text-red-300"
                                  onClick={() => handleDeleteProposal(proposal.id)}
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

            {/* Modal de Motivo de Exclusão */}
            <Dialog open={isDeleteReasonModalOpen} onOpenChange={setIsDeleteReasonModalOpen}>
              <DialogContent className="bg-seguranca-graphite border-gray-600">
                <DialogHeader>
                  <DialogTitle className="text-seguranca-lightgray">
                    {deleteMode === 'all' ? 'Excluir Todas as Propostas' : 
                     deleteMode === 'bulk' ? `Excluir Propostas Selecionadas (${selectedIds.length})` : 
                     'Excluir Proposta'}
                  </DialogTitle>
                  <DialogDescription className="text-gray-400">
                    Por favor, informe o motivo para esta exclusão. Esta ação ficará registrada no histórico.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="deleteReason" className="text-seguranca-lightgray">Motivo da exclusão <span className="text-red-500">*</span></Label>
                    <Textarea
                      id="deleteReason"
                      value={deleteReason}
                      onChange={(e) => setDeleteReason(e.target.value)}
                      placeholder="Ex: Proposta cancelada pelo cliente, cadastro duplicado, etc."
                      className="bg-seguranca-black border-gray-600 text-seguranca-lightgray min-h-[100px]"
                      required
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setIsDeleteReasonModalOpen(false)} className="bg-transparent border-gray-600 text-seguranca-lightgray hover:bg-gray-800">
                    Cancelar
                  </Button>
                  <Button variant="destructive" onClick={confirmDelete} disabled={!deleteReason.trim()} className="bg-seguranca-red hover:bg-red-700 text-white">
                    Confirmar Exclusão
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

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
                      <Button
                        className="bg-seguranca-red hover:bg-seguranca-darkred"
                        onClick={() => {
                          if (selectedProposal) {
                            setIsViewModalOpen(false);
                            handleEdit(selectedProposal);
                          }
                        }}
                      >
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
                            value={formData.clientId ? String(formData.clientId) : ''}
                            onValueChange={(value) => {
                              console.log('🔵 Cliente selecionado:', value);
                              setFormData({ ...formData, clientId: value ? (isNaN(Number(value)) ? value : Number(value)) : undefined });
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
                            <SelectContent className="bg-seguranca-graphite border-gray-600 max-h-[300px]">
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
                                    value={String(client.id)}
                                    className="text-seguranca-lightgray hover:bg-seguranca-red/20 focus:bg-seguranca-black focus:text-seguranca-lightgray"
                                  >
                                    {client.name} {client.cnpj ? `- ${client.cnpj}` : ''}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsClientModalOpen(true)}
                          className="bg-seguranca-black border-gray-600 text-seguranca-yellow hover:text-yellow-400 hover:border-yellow-400 shrink-0"
                          title="Criar novo cliente"
                        >
                          <Plus className="h-4 w-4" />
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
                        value={formData.leadId ? String(formData.leadId) : '__NONE__'}
                        onValueChange={(value) => {
                          console.log('🔵 Lead selecionado:', value);
                          setFormData({ ...formData, leadId: value === '__NONE__' ? undefined : (isNaN(Number(value)) ? value : Number(value)) });
                        }}
                        disabled={loadingLeads}
                      >
                        <SelectTrigger className="bg-seguranca-black border-gray-600 text-seguranca-lightgray [&>span[data-placeholder]]:text-gray-400 [&>span:not([data-placeholder])]:text-seguranca-lightgray">
                          <SelectValue placeholder={loadingLeads ? "Carregando leads..." : "Selecione o lead (opcional)"} />
                        </SelectTrigger>
                        <SelectContent className="bg-seguranca-graphite border-gray-600 max-h-[300px]">
                          <SelectItem value="__NONE__" className="text-seguranca-lightgray hover:bg-seguranca-red/20 focus:bg-seguranca-black focus:text-seguranca-lightgray">Nenhum</SelectItem>
                          {loadingLeads ? (
                            <SelectItem value="loading" disabled className="text-gray-400">
                              Carregando leads...
                            </SelectItem>
                          ) : leads.length === 0 ? (
                            <SelectItem value="no-leads" disabled className="text-gray-400">
                              Nenhum lead encontrado
                            </SelectItem>
                          ) : (
                            leads.map((lead) => (
                              <SelectItem
                                key={lead.id}
                                value={String(lead.id)}
                                className="text-seguranca-lightgray hover:bg-seguranca-red/20 focus:bg-seguranca-black focus:text-seguranca-lightgray"
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
                      <DatePicker
                        date={formData.validUntil ? parseISO(formData.validUntil) : undefined}
                        onDateChange={(date) => setFormData({ ...formData, validUntil: date ? format(date, 'yyyy-MM-dd') : undefined })}
                        className="w-full bg-seguranca-black border-gray-600 text-seguranca-lightgray"
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
                    <div>
                      <Label htmlFor="assignedTo" className="text-seguranca-lightgray">Responsável</Label>
                      <Select
                        value={formData.assignedToId ? String(formData.assignedToId) : '__NONE__'}
                        onValueChange={(value) => setFormData({ ...formData, assignedToId: value === '__NONE__' ? undefined : value })}
                        disabled={loadingUsers}
                      >
                        <SelectTrigger className="bg-seguranca-black border-gray-600 text-seguranca-lightgray [&>span[data-placeholder]]:text-gray-400 [&>span:not([data-placeholder])]:text-seguranca-lightgray">
                          <SelectValue placeholder={loadingUsers ? "Carregando..." : "Selecione o responsável (opcional)"} />
                        </SelectTrigger>
                        <SelectContent className="bg-seguranca-graphite border-gray-600 max-h-[300px]">
                          <SelectItem value="__NONE__" className="text-seguranca-lightgray hover:bg-seguranca-red/20 focus:bg-seguranca-black focus:text-seguranca-lightgray">Nenhum</SelectItem>
                          {users.map((user) => (
                            <SelectItem
                              key={user.id}
                              value={String(user.id)}
                              className="text-seguranca-lightgray hover:bg-seguranca-red/20 focus:bg-seguranca-black focus:text-seguranca-lightgray"
                            >
                              {user.name}
                            </SelectItem>
                          ))}
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

            {/* Modal de Edição */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
              <DialogContent className="bg-seguranca-graphite border-gray-600 max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="text-seguranca-lightgray">Editar Proposta</DialogTitle>
                  <DialogDescription className="text-gray-400">
                    Atualize os dados da proposta comercial
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit-title" className="text-seguranca-lightgray">Título *</Label>
                      <Input
                        id="edit-title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                        placeholder="Título da proposta"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-client" className="text-seguranca-lightgray">Cliente *</Label>
                      <Select
                        value={formData.clientId ? String(formData.clientId) : ''}
                        onValueChange={(value) => {
                          setFormData({ ...formData, clientId: value ? (isNaN(Number(value)) ? value : Number(value)) : undefined });
                        }}
                        disabled={loadingClients}
                      >
                        <SelectTrigger className="bg-seguranca-black border-gray-600 text-seguranca-lightgray">
                          <SelectValue placeholder={loadingClients ? "Carregando..." : "Selecione o cliente"} />
                        </SelectTrigger>
                        <SelectContent className="bg-seguranca-graphite border-gray-600 max-h-[300px]">
                          {clients.map((client) => (
                            <SelectItem
                              key={client.id}
                              value={String(client.id)}
                              className="text-seguranca-lightgray hover:bg-seguranca-red/20"
                            >
                              {client.name} {client.cnpj ? `- ${client.cnpj}` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="edit-lead" className="text-seguranca-lightgray">Lead</Label>
                      <Select
                        value={formData.leadId ? String(formData.leadId) : '__NONE__'}
                        onValueChange={(value) => setFormData({ ...formData, leadId: value === '__NONE__' ? undefined : (isNaN(Number(value)) ? value : Number(value)) })}
                        disabled={loadingLeads}
                      >
                        <SelectTrigger className="bg-seguranca-black border-gray-600 text-seguranca-lightgray">
                          <SelectValue placeholder={loadingLeads ? "Carregando..." : "Selecione o lead (opcional)"} />
                        </SelectTrigger>
                        <SelectContent className="bg-seguranca-graphite border-gray-600 max-h-[300px]">
                          <SelectItem value="__NONE__" className="text-seguranca-lightgray">Nenhum</SelectItem>
                          {leads.map((lead) => (
                            <SelectItem key={lead.id} value={String(lead.id)} className="text-seguranca-lightgray hover:bg-seguranca-red/20">
                              {lead.name} {lead.company ? `- ${lead.company}` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="edit-totalValue" className="text-seguranca-lightgray">Valor Total *</Label>
                      <Input
                        id="edit-totalValue"
                        type="number"
                        step="0.01"
                        value={formData.totalValue || ''}
                        onChange={(e) => setFormData({ ...formData, totalValue: parseFloat(e.target.value) || 0 })}
                        className="bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                        placeholder="0,00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-validUntil" className="text-seguranca-lightgray">Válida Até</Label>
                      <DatePicker
                        date={formData.validUntil ? parseISO(formData.validUntil) : undefined}
                        onDateChange={(date) => setFormData({ ...formData, validUntil: date ? format(date, 'yyyy-MM-dd') : undefined })}
                        className="w-full bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-status" className="text-seguranca-lightgray">Status</Label>
                      <Select
                        value={formData.status || selectedProposal?.status || 'DRAFT'}
                        onValueChange={(value) => setFormData({ ...formData, status: value as any })}
                      >
                        <SelectTrigger className="bg-seguranca-black border-gray-600 text-seguranca-lightgray">
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                        <SelectContent className="bg-seguranca-graphite border-gray-600">
                          <SelectItem value="DRAFT" className="text-seguranca-lightgray">Rascunho</SelectItem>
                          <SelectItem value="SENT" className="text-seguranca-lightgray">Enviada</SelectItem>
                          <SelectItem value="UNDER_REVIEW" className="text-seguranca-lightgray">Em Análise</SelectItem>
                          <SelectItem value="APPROVED" className="text-seguranca-lightgray">Aprovada</SelectItem>
                          <SelectItem value="REJECTED" className="text-seguranca-lightgray">Rejeitada</SelectItem>
                          <SelectItem value="EXPIRED" className="text-seguranca-lightgray">Expirada</SelectItem>
                          <SelectItem value="CONVERTED" className="text-seguranca-lightgray">Convertida</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="edit-assignedTo" className="text-seguranca-lightgray">Responsável</Label>
                      <Select
                        value={formData.assignedToId ? String(formData.assignedToId) : '__NONE__'}
                        onValueChange={(value) => setFormData({ ...formData, assignedToId: value === '__NONE__' ? undefined : value })}
                        disabled={loadingUsers}
                      >
                        <SelectTrigger className="bg-seguranca-black border-gray-600 text-seguranca-lightgray">
                          <SelectValue placeholder={loadingUsers ? "Carregando..." : "Selecione o responsável (opcional)"} />
                        </SelectTrigger>
                        <SelectContent className="bg-seguranca-graphite border-gray-600 max-h-[300px]">
                          <SelectItem value="__NONE__" className="text-seguranca-lightgray hover:bg-seguranca-red/20 focus:bg-seguranca-black focus:text-seguranca-lightgray">Nenhum</SelectItem>
                          {users.map((user) => (
                            <SelectItem
                              key={user.id}
                              value={String(user.id)}
                              className="text-seguranca-lightgray hover:bg-seguranca-red/20 focus:bg-seguranca-black focus:text-seguranca-lightgray"
                            >
                              {user.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="edit-description" className="text-seguranca-lightgray">Descrição</Label>
                    <Textarea
                      id="edit-description"
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                      placeholder="Descrição detalhada da proposta..."
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-termsConditions" className="text-seguranca-lightgray">Termos e Condições</Label>
                    <Textarea
                      id="edit-termsConditions"
                      value={formData.termsConditions || ''}
                      onChange={(e) => setFormData({ ...formData, termsConditions: e.target.value })}
                      className="bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                      placeholder="Termos e condições..."
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-notes" className="text-seguranca-lightgray">Observações</Label>
                    <Textarea
                      id="edit-notes"
                      value={formData.notes || ''}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                      placeholder="Observações internas..."
                      rows={2}
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
                    >
                      Cancelar
                    </Button>
                    <Button
                      className="bg-seguranca-red hover:bg-seguranca-darkred"
                      onClick={handleUpdateProposal}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Atualizando...
                        </>
                      ) : (
                        'Atualizar Proposta'
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
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-seguranca-lightgray">Propostas de Acordo</h1>
                <p className="text-gray-400 mt-1">Simulação e gestão de propostas de acordo comercial</p>
              </div>
            </div>

            {/* Tabs internas para Simulação e Lista */}
            <Tabs defaultValue="simulacao" className="w-full">
              <TabsList className="mb-6">
                <TabsTrigger value="simulacao">Simulação</TabsTrigger>
                <TabsTrigger value="lista">Lista de Propostas de Acordo</TabsTrigger>
              </TabsList>

              <TabsContent value="simulacao">
                <PropostaAcordo
                  clients={clients.map(c => ({ id: c.id, name: c.name, cnpj: c.cnpj }))}
                  loadingClients={loadingClients}
                  onSaveProposal={async (proposalData: PropostaComercial, clientId?: string) => {
                    if (!clientId || !clientId.trim()) {
                      toast({
                        title: "Cliente obrigatório",
                        description: "Selecione um cliente para salvar a proposta de acordo.",
                        variant: "destructive"
                      });
                      return;
                    }
                    try {
                      const items = propostaComercialToItems(proposalData);
                      await proposalService.createProposal({
                        title: `Proposta de Acordo - ${new Date().toLocaleDateString('pt-BR')}`,
                        description: proposalData.descricaoServico || 'Proposta de Acordo Comercial',
                        totalValue: proposalData.resultado.valorMensal,
                        validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                        clientId: clientId,
                        items,
                      });
                      toast({
                        title: "Sucesso",
                        description: "Proposta de acordo salva com sucesso!",
                      });
                      await loadProposals();
                    } catch (error: any) {
                      console.error('Erro ao salvar proposta de acordo:', error);
                      toast({
                        title: "Erro",
                        description: error.response?.data?.message || "Não foi possível salvar a proposta de acordo.",
                        variant: "destructive"
                      });
                    }
                  }}
                />
              </TabsContent>

              <TabsContent value="lista">
                <AgreementProposalsList />
              </TabsContent>
            </Tabs>
          </div>
        </TabsContent>
      </Tabs>
    </StandardLayout>
  );
};

export default Propostas; 