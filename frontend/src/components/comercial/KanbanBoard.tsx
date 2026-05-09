import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  Search, 
  Filter, 
  User, 
  Building2, 
  Calendar, 
  DollarSign, 
  Phone, 
  Mail,
  Target,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Star,
  Trash2
} from 'lucide-react';
import KanbanCard from './KanbanCard';
import styles from './KanbanBoard.module.css';
import { 
  fetchOpportunities, 
  fetchKanbanStatuses, 
  createOpportunity, 
  updateOpportunity, 
  createKanbanStatus,
  deleteOpportunity,
  deleteMultipleOpportunities
} from '@/services/crmService';
import { userService } from '@/services/userService';
import leadService from '@/services/leadService';
import { useToast } from '@/hooks/use-toast';

interface KanbanStatus {
  id: string | number;
  name: string;
  orderIndex: number;
  color?: string;
  bgColor?: string;
}

interface Lead {
  id: number;
  name: string;
  company: string;
  email: string;
  phone: string;
  status: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL_SENT' | 'NEGOTIATION' | 'WON' | 'LOST';
  source: string;
  value: number;
  createdAt: string;
}

interface Opportunity {
  id: number;
  title: string;
  description: string;
  statusId: number;
  lead: Lead;
  value: number;
  probability: number;
  expectedCloseDate: string;
  assignedTo: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  lastContact: string;
  tags: string[];
}

// Dados mockados melhorados
const mockStatuses: KanbanStatus[] = [
  { id: 1, name: 'Novos Leads', orderIndex: 1, color: '#3B82F6', bgColor: '#DBEAFE' },
  { id: 2, name: 'Em Contato', orderIndex: 2, color: '#F59E0B', bgColor: '#FEF3C7' },
  { id: 3, name: 'Proposta Enviada', orderIndex: 3, color: '#8B5CF6', bgColor: '#EDE9FE' },
  { id: 4, name: 'Em Negociação', orderIndex: 4, color: '#EF4444', bgColor: '#FEE2E2' },
  { id: 5, name: 'Fechado', orderIndex: 5, color: '#10B981', bgColor: '#D1FAE5' },
];

const mockLeads: Lead[] = [
  {
    id: 1,
    name: 'João Silva',
    company: 'Shopping Center ABC',
    email: 'joao.silva@shoppingabc.com',
    phone: '(11) 99999-9999',
    status: 'QUALIFIED',
    source: 'Website',
    value: 45000,
    createdAt: '2025-01-15'
  },
  {
    id: 2,
    name: 'Maria Santos',
    company: 'Condomínio Solar',
    email: 'maria.santos@condominio.com',
    phone: '(11) 88888-8888',
    status: 'PROPOSAL_SENT',
    source: 'Indicação',
    value: 32000,
    createdAt: '2025-01-12'
  },
  {
    id: 3,
    name: 'Pedro Costa',
    company: 'Indústria XYZ',
    email: 'pedro.costa@industria.com',
    phone: '(11) 77777-7777',
    status: 'NEGOTIATION',
    source: 'LinkedIn',
    value: 78000,
    createdAt: '2025-01-10'
  },
  {
    id: 4,
    name: 'Ana Beatriz',
    company: 'Escritório Comercial',
    email: 'ana.beatriz@escritorio.com',
    phone: '(11) 66666-6666',
    status: 'NEW',
    source: 'Google Ads',
    value: 28000,
    createdAt: '2025-01-08'
  },
  {
    id: 5,
    name: 'Carlos Oliveira',
    company: 'Hospital São João',
    email: 'carlos.oliveira@hospital.com',
    phone: '(11) 55555-5555',
    status: 'CONTACTED',
    source: 'Telefone',
    value: 95000,
    createdAt: '2025-01-05'
  },
  {
    id: 6,
    name: 'Fernanda Lima',
    company: 'Universidade Federal',
    email: 'fernanda.lima@universidade.com',
    phone: '(11) 44444-4444',
    status: 'WON',
    source: 'Evento',
    value: 120000,
    createdAt: '2024-12-20'
  }
];

const mockOpportunities: Opportunity[] = [
  {
    id: 1,
    title: 'Segurança Shopping Center ABC',
    description: 'Serviços de vigilância 24h para shopping center com 200 lojas',
    statusId: 3,
    lead: mockLeads[0],
    value: 45000,
    probability: 75,
    expectedCloseDate: '2025-02-15',
    assignedTo: 'Maria Santos',
    priority: 'HIGH',
    lastContact: '2025-01-20',
    tags: ['Shopping', '24h', 'Vigilância']
  },
  {
    id: 2,
    title: 'Portaria Condomínio Solar',
    description: 'Serviços de portaria para condomínio residencial de luxo',
    statusId: 4,
    lead: mockLeads[1],
    value: 32000,
    probability: 90,
    expectedCloseDate: '2025-02-10',
    assignedTo: 'João Silva',
    priority: 'MEDIUM',
    lastContact: '2025-01-22',
    tags: ['Condomínio', 'Portaria', 'Residencial']
  },
  {
    id: 3,
    title: 'Segurança Industrial XYZ',
    description: 'Sistema completo de segurança para indústria química',
    statusId: 2,
    lead: mockLeads[2],
    value: 78000,
    probability: 60,
    expectedCloseDate: '2025-03-01',
    assignedTo: 'Carlos Oliveira',
    priority: 'URGENT',
    lastContact: '2025-01-18',
    tags: ['Industrial', 'Química', 'Sistema']
  },
  {
    id: 4,
    title: 'Vigilância Escritório Comercial',
    description: 'Serviços de vigilância para escritório comercial',
    statusId: 1,
    lead: mockLeads[3],
    value: 28000,
    probability: 40,
    expectedCloseDate: '2025-02-28',
    assignedTo: 'Ana Beatriz',
    priority: 'LOW',
    lastContact: '2025-01-15',
    tags: ['Escritório', 'Comercial']
  },
  {
    id: 5,
    title: 'Segurança Hospital São João',
    description: 'Sistema de segurança para hospital com 500 leitos',
    statusId: 3,
    lead: mockLeads[4],
    value: 95000,
    probability: 80,
    expectedCloseDate: '2025-02-20',
    assignedTo: 'Pedro Costa',
    priority: 'HIGH',
    lastContact: '2025-01-21',
    tags: ['Hospital', 'Sistema', '500 leitos']
  },
  {
    id: 6,
    title: 'Segurança Universidade Federal',
    description: 'Contrato anual de segurança para campus universitário',
    statusId: 5,
    lead: mockLeads[5],
    value: 120000,
    probability: 100,
    expectedCloseDate: '2025-01-30',
    assignedTo: 'Fernanda Lima',
    priority: 'HIGH',
    lastContact: '2025-01-25',
    tags: ['Universidade', 'Anual', 'Campus']
  }
];

export default function KanbanBoard() {
  const [statuses, setStatuses] = useState<KanbanStatus[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [filteredOpportunities, setFilteredOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Opportunity | null>(null);
  const [form, setForm] = useState({ 
    title: '', 
    description: '', 
    statusId: '',
    closeDate: '',
    estimatedValue: '',
    assignedToId: '',
    leadId: '',
    leadSource: ''
  });
  const [users, setUsers] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedOppIds, setSelectedOppIds] = useState<number[]>([]);
  const { toast } = useToast();

  const toggleSelect = (id: number) => {
    setSelectedOppIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedOppIds(filteredOpportunities.map(opp => opp.id));
  };

  const deselectAll = () => {
    setSelectedOppIds([]);
  };

  const handleDeleteSelected = async () => {
    if (selectedOppIds.length === 0) return;
    
    const reason = prompt("Por favor, informe o motivo da exclusão:", "Exclusão em massa via sistema");
    if (reason === null) return; // Cancelado

    if (!confirm(`Deseja realmente excluir ${selectedOppIds.length} oportunidades?`)) return;

    try {
      setLoading(true);
      await deleteMultipleOpportunities(selectedOppIds, reason);
      toast({
        title: "Sucesso",
        description: `${selectedOppIds.length} oportunidades excluídas com sucesso!`,
      });
      setSelectedOppIds([]);
      await loadData();
    } catch (err: any) {
      console.error('Erro ao excluir em massa:', err);
      toast({
        title: "Erro",
        description: "Não foi possível excluir as oportunidades selecionadas.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOpportunity = async (id: number) => {
    const reason = prompt("Por favor, informe o motivo da exclusão:", "Exclusão individual");
    if (reason === null) return; // Cancelado

    if (!confirm('Deseja realmente excluir esta oportunidade?')) return;

    try {
      setLoading(true);
      await deleteOpportunity(id, reason);
      toast({
        title: "Sucesso",
        description: "Oportunidade excluída com sucesso!",
      });
      setSelectedOppIds(prev => prev.filter(i => i !== id));
      await loadData();
    } catch (err: any) {
      console.error('Erro ao excluir oportunidade:', err);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a oportunidade.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Carregar dados do backend
  useEffect(() => {
    // Carregar usuários e leads primeiro para ter o mapa disponível
    loadUsersAndLeads().then(() => {
      loadData();
    });
  }, []);

  const loadUsersAndLeads = async () => {
    try {
      const [usersData, leadsData] = await Promise.all([
        userService.getAllUsers(),
        leadService.getAllLeads().catch(() => []) // Se não houver leadService, retornar array vazio
      ]);
      setUsers(usersData || []);
      setLeads(leadsData || []);
    } catch (err) {
      console.error('Erro ao carregar usuários e leads:', err);
      // Não bloquear a aplicação se falhar
    }
  };
  
  // Re-carregar usuários e leads quando necessário para garantir que estão atualizados
  useEffect(() => {
    if (opportunities.length > 0 && users.length === 0) {
      loadUsersAndLeads();
    }
  }, [opportunities]);

  // Função helper para normalizar o source do Lead (pode vir como string, enum object ou null/undefined)
  function normalizeLeadSource(source: any): string {
    if (!source) return 'Não informado';
    if (typeof source === 'string') {
      return source;
    }
    if (typeof source === 'object') {
      if (source.name) return source.name;
      if (source.value) return source.value;
      if (source.displayName) return source.displayName;
      // Tentar pegar a primeira chave válida que não seja uma propriedade padrão
      const keys = Object.keys(source);
      const validKeys = keys.filter(k => k !== 'name' && k !== 'value' && k !== 'displayName');
      if (validKeys.length > 0) {
        return validKeys[0];
      }
      return source.toString();
    }
    return 'Não informado';
  }

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Garantir que usuários estão carregados antes de mapear oportunidades
      if (users.length === 0) {
        await loadUsersAndLeads();
      }
      
      // 1. Carregar status
      let statusesData = [];
      try {
        statusesData = await fetchKanbanStatuses();
      } catch (statusErr: any) {
        console.error('Erro ao buscar status do Kanban:', statusErr);
        // Se falhar com 404 ou 400, tentaremos criar padrões abaixo
        if (statusErr.response?.status !== 404 && statusErr.response?.status !== 400) {
          throw statusErr; // Re-throw if it's a critical error (500, etc)
        }
      }

      // Mapear status do backend (adicionar cores padrão se não existirem)
      let mappedStatuses = (statusesData || []).map((status: any, index: number) => ({
        id: status.id,
        name: status.name,
        orderIndex: status.orderIndex || index + 1,
        color: mockStatuses[index]?.color || '#3B82F6',
        bgColor: mockStatuses[index]?.bgColor || '#DBEAFE'
      })).sort((a, b) => a.orderIndex - b.orderIndex);

      // Se não houver status no backend, criar status padrão automaticamente
      if (mappedStatuses.length === 0) {
        console.warn('Nenhum status encontrado no backend ou erro na busca. Tentando obter ou criar status padrão...');
        try {
          const defaultStatuses = [
            { name: 'Novos Leads', orderIndex: 1 },
            { name: 'Em Contato', orderIndex: 2 },
            { name: 'Proposta Enviada', orderIndex: 3 },
            { name: 'Em Negociação', orderIndex: 4 },
            { name: 'Fechado', orderIndex: 5 }
          ];
          
          const createdStatuses = [];
          for (const statusData of defaultStatuses) {
            try {
              // Tentar criar - se já existir, o backend deve lidar ou nós tratamos o erro aqui
              const created = await createKanbanStatus(statusData);
              createdStatuses.push({
                id: created.id,
                name: created.name,
                orderIndex: created.orderIndex || statusData.orderIndex,
                color: mockStatuses[statusData.orderIndex - 1]?.color || '#3B82F6',
                bgColor: mockStatuses[statusData.orderIndex - 1]?.bgColor || '#DBEAFE'
              });
            } catch (err: any) {
              // Se o erro for "já existe" (409 ou 500 com mensagem específica), ignorar
              if (err.response?.status === 409 || (err.response?.data?.message && err.response.data.message.includes('already exists'))) {
                console.log(`Status ${statusData.name} já existe.`);
              } else {
                console.error(`Erro ao criar status ${statusData.name}:`, err);
              }
            }
          }
          
          // Se falhou ao criar mas alguns já existiam, precisamos recarregar para pegar os IDs corretos
          if (createdStatuses.length === 0) {
            statusesData = await fetchKanbanStatuses();
            mappedStatuses = statusesData.map((status: any, index: number) => ({
              id: status.id,
              name: status.name,
              orderIndex: status.orderIndex || index + 1,
              color: mockStatuses[index]?.color || '#3B82F6',
              bgColor: mockStatuses[index]?.bgColor || '#DBEAFE'
            })).sort((a, b) => a.orderIndex - b.orderIndex);
          } else {
            mappedStatuses = createdStatuses;
          }
        } catch (err) {
          console.error('Erro ao gerenciar status padrão:', err);
        }
      }

      if (mappedStatuses.length > 0) {
        setStatuses(mappedStatuses);
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        setHasValidStatuses(mappedStatuses.some(s => uuidRegex.test(String(s.id))));
      } else {
        setStatuses(mockStatuses);
        setHasValidStatuses(false);
      }

      // 2. Carregar oportunidades
      const opportunitiesData = await fetchOpportunities();
      const usersMap = new Map(users.map(u => [u.id, u.name]));
      
      const mappedOpportunities = (opportunitiesData || []).map((opp: any) => {
        let assignedToName = opp.assignedToName || 'Não atribuído';
        if (!assignedToName || assignedToName === 'Não atribuído') {
          if (opp.assignedToId) {
            const userName = usersMap.get(opp.assignedToId);
            if (userName) assignedToName = userName;
          }
        }
        
        return {
          id: opp.id,
          title: opp.title,
          description: opp.description || '',
          statusId: opp.statusId,
          leadId: opp.lead?.id || opp.leadId || null,
          value: opp.estimatedValue ? Number(opp.estimatedValue) : 0,
          estimatedValue: opp.estimatedValue ? Number(opp.estimatedValue) : 0,
          expectedCloseDate: opp.closeDate || '',
          closeDate: opp.closeDate || '',
          assignedToId: opp.assignedToId,
          assignedTo: assignedToName,
          probability: 50,
          priority: 'MEDIUM' as const,
          lastContact: opp.updatedAt || opp.createdAt || '',
          tags: [],
          lead: opp.lead ? {
            id: opp.lead.id || null,
            name: opp.lead.name || 'Sem nome',
            company: opp.lead.company || '',
            email: opp.lead.email || '',
            phone: opp.lead.phone || '',
            status: opp.lead.status || 'NEW' as const,
            source: normalizeLeadSource(opp.lead.source),
            value: opp.lead.value ? Number(opp.lead.value) : (opp.estimatedValue ? Number(opp.estimatedValue) : 0),
            createdAt: opp.lead.createdAt || opp.createdAt || ''
          } : {
            id: opp.leadId || null,
            name: 'Lead não encontrado',
            company: '',
            email: '',
            phone: '',
            status: 'NEW' as const,
            source: 'Não informado',
            value: 0,
            createdAt: opp.createdAt || ''
          }
        };
      });

      setOpportunities(mappedOpportunities);
      setFilteredOpportunities(mappedOpportunities);
    } catch (err: any) {
      console.error('Erro crítico ao carregar dados do Kanban:', err);
      setError(err.message || 'Erro ao carregar dados');
      setStatuses(mockStatuses);
      setOpportunities(mockOpportunities || []);
      setFilteredOpportunities(mockOpportunities || []);
      setHasValidStatuses(false);
      toast({
        title: "Erro",
        description: "Não foi possível carregar dados do backend. Usando dados de exemplo.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let filtered = opportunities;
    
    if (searchTerm) {
      filtered = filtered.filter(opp => 
        opp.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        opp.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        opp.lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        opp.lead.company.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (selectedStatus) {
      filtered = filtered.filter(opp => opp.statusId === selectedStatus);
    }

    if (selectedPriority !== 'all') {
      filtered = filtered.filter(opp => opp.priority === selectedPriority);
    }
    
    setFilteredOpportunities(filtered);
  }, [opportunities, searchTerm, selectedStatus, selectedPriority]);

  function openModal(statusId: string | number) {
    // Validar se é um UUID válido antes de abrir o modal
    const statusIdStr = String(statusId);
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (!hasValidStatuses) {
      toast({
        title: "Erro",
        description: "Nenhum status válido encontrado no backend. Por favor, crie status antes de adicionar oportunidades.",
        variant: "destructive"
      });
      return;
    }
    
    if (!uuidRegex.test(statusIdStr)) {
      toast({
        title: "Erro",
        description: "Status inválido. Por favor, certifique-se de que há status válidos cadastrados no backend.",
        variant: "destructive"
      });
      return;
    }
    
    setForm({ 
      title: '', 
      description: '', 
      statusId: statusIdStr,
      closeDate: '',
      estimatedValue: '',
      assignedToId: '',
      leadId: ''
    });
    setEditing(null);
    setShowModal(true);
  }

  function openEditModal(opp: Opportunity) {
    // Converter data de LocalDateTime para formato de input date (YYYY-MM-DD)
    let closeDateFormatted = '';
    if (opp.expectedCloseDate || (opp as any).closeDate) {
      const dateStr = opp.expectedCloseDate || (opp as any).closeDate;
      try {
        // Se vier como LocalDateTime do backend (formato ISO), extrair apenas a data
        if (dateStr.includes('T')) {
          closeDateFormatted = dateStr.split('T')[0];
        } else {
          // Se já vier como data apenas, usar diretamente
          closeDateFormatted = dateStr.substring(0, 10);
        }
      } catch (e) {
        console.error('Erro ao formatar data:', e);
      }
    }
    
    // Buscar assignedToId - pode estar em diferentes formatos
    let assignedToIdValue = '';
    if ((opp as any).assignedToId) {
      assignedToIdValue = String((opp as any).assignedToId);
    } else if ((opp as any).assignedTo?.id) {
      assignedToIdValue = String((opp as any).assignedTo.id);
    }
    
    // Buscar leadId e leadSource
    let leadIdValue = '';
    let leadSourceValue = '';
    if ((opp as any).leadId) {
      leadIdValue = String((opp as any).leadId);
    } else if ((opp.lead as any)?.id) {
      leadIdValue = String((opp.lead as any).id);
    }
    
    // Buscar fonte do lead se disponível
    if ((opp.lead as any)?.source) {
      leadSourceValue = normalizeLeadSource((opp.lead as any).source);
    }
    
    // Formatar valor estimado - pode estar em opp.value ou opp.estimatedValue
    let estimatedValueFormatted = '';
    const valueToUse = (opp as any).estimatedValue !== undefined ? (opp as any).estimatedValue : (opp.value !== undefined ? opp.value : 0);
    if (valueToUse && valueToUse > 0) {
      // Converter para número e formatar com ponto como separador decimal (padrão para input type="number")
      estimatedValueFormatted = Number(valueToUse).toFixed(2);
    }
    
    setForm({ 
      title: opp.title, 
      description: opp.description || '', 
      statusId: String(opp.statusId),
      closeDate: closeDateFormatted,
      estimatedValue: estimatedValueFormatted,
      assignedToId: assignedToIdValue,
      leadId: leadIdValue,
      leadSource: leadSourceValue
    });
    setEditing(opp);
    setShowModal(true);
  }

  const handleSaveOpportunity = async () => {
    try {
      // Validação básica
      if (!form.title || !form.title.trim()) {
        toast({
          title: "Erro",
          description: "Por favor, preencha o título da oportunidade.",
          variant: "destructive"
        });
        return;
      }

      if (!form.description || !form.description.trim()) {
        toast({
          title: "Erro",
          description: "Por favor, preencha a descrição da oportunidade.",
          variant: "destructive"
        });
        return;
      }

      if (!form.statusId || !form.statusId.trim()) {
        toast({
          title: "Erro",
          description: "Por favor, selecione um status para a oportunidade.",
          variant: "destructive"
        });
        return;
      }

      // Validar se o statusId é um UUID válido (não pode ser um número mockado)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(form.statusId)) {
        toast({
          title: "Erro",
          description: "Status inválido. Por favor, selecione um status válido do backend.",
          variant: "destructive"
        });
        return;
      }

      const opportunityData: any = {
        title: form.title.trim(),
        description: form.description.trim(),
        statusId: form.statusId
      };

      // Adicionar campos opcionais se preenchidos
      if (form.closeDate) {
        // Converter data para LocalDateTime (adicionar hora 00:00:00)
        opportunityData.closeDate = form.closeDate + 'T00:00:00';
      }
      
      if (form.estimatedValue) {
        opportunityData.estimatedValue = parseFloat(form.estimatedValue.replace(/[^\d,.-]/g, '').replace(',', '.'));
      }
      
      if (form.assignedToId) {
        opportunityData.assignedToId = form.assignedToId;
      }
      
      if (form.leadId) {
        opportunityData.leadId = form.leadId;
      }

      // Atualizar fonte do lead se especificada (fazer antes de salvar a oportunidade)
      if (form.leadId && form.leadSource) {
        try {
          await leadService.updateLead(form.leadId, { source: form.leadSource });
        } catch (err) {
          console.error('Erro ao atualizar fonte do lead:', err);
          // Não bloquear a atualização da oportunidade se falhar
        }
      }

      if (editing) {
        // Atualizar oportunidade existente
        await updateOpportunity(String(editing.id), opportunityData);
        toast({
          title: "Sucesso",
          description: "Oportunidade atualizada com sucesso!",
        });
      } else {
        // Criar nova oportunidade
        await createOpportunity(opportunityData);
        
        toast({
          title: "Sucesso",
          description: "Oportunidade criada com sucesso!",
        });
      }
      
      setShowModal(false);
      // Recarregar dados (inclui usuários e oportunidades)
      await loadUsersAndLeads();
      await loadData();
    } catch (err: any) {
      console.error('Erro ao salvar oportunidade:', err);
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || "Não foi possível salvar a oportunidade.";
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const handleDeleteAllLeads = async () => {
    if (!confirm('⚠️ ATENÇÃO: Esta ação irá excluir PERMANENTEMENTE TODOS os leads e oportunidades do sistema. Deseja continuar?')) return;
    
    const reason = prompt("Por favor, informe o motivo da exclusão de TODOS os dados:", "Limpeza total do CRM");
    if (reason === null) return;

    try {
      setLoading(true);
      await leadService.deleteAllLeads(reason);
      toast({
        title: "Sucesso",
        description: "Todos os leads e oportunidades foram excluídos!",
      });
      await loadData();
    } catch (err: any) {
      console.error('Erro ao excluir todos os leads:', err);
      toast({
        title: "Erro",
        description: "Não foi possível excluir todos os leads.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-500';
      case 'HIGH': return 'bg-orange-500';
      case 'MEDIUM': return 'bg-yellow-500';
      case 'LOW': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getLeadStatusColor = (status: string) => {
    switch (status) {
      case 'NEW': return 'bg-blue-500';
      case 'CONTACTED': return 'bg-yellow-500';
      case 'QUALIFIED': return 'bg-purple-500';
      case 'PROPOSAL_SENT': return 'bg-indigo-500';
      case 'NEGOTIATION': return 'bg-red-500';
      case 'WON': return 'bg-green-500';
      case 'LOST': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getLeadStatusText = (status: string) => {
    switch (status) {
      case 'NEW': return 'Novo';
      case 'CONTACTED': return 'Contactado';
      case 'QUALIFIED': return 'Qualificado';
      case 'PROPOSAL_SENT': return 'Proposta Enviada';
      case 'NEGOTIATION': return 'Em Negociação';
      case 'WON': return 'Ganho';
      case 'LOST': return 'Perdido';
      default: return status;
    }
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

  if (loading) return <div className="flex items-center justify-center p-8">Carregando Kanban...</div>;
  if (error) return <div className="text-red-500 p-8">{error}</div>;

  return (
    <div className="space-y-6 w-full min-w-0">
      {/* Header com estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-seguranca-graphite border-gray-600">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total de Oportunidades</p>
                <p className="text-2xl font-bold text-seguranca-yellow">{opportunities.length}</p>
              </div>
              <Target className="h-8 w-8 text-seguranca-yellow" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-seguranca-graphite border-gray-600">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Valor Total</p>
                <p className="text-2xl font-bold text-seguranca-yellow">
                  {formatCurrency(opportunities.reduce((sum, opp) => sum + opp.value, 0))}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-seguranca-yellow" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-seguranca-graphite border-gray-600">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Taxa de Conversão</p>
                <p className="text-2xl font-bold text-seguranca-yellow">
                  {Math.round((opportunities.filter(opp => opp.statusId === 5).length / opportunities.length) * 100)}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-seguranca-yellow" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-seguranca-graphite border-gray-600">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Média de Valor</p>
                <p className="text-2xl font-bold text-seguranca-yellow">
                  {formatCurrency(opportunities.reduce((sum, opp) => sum + opp.value, 0) / opportunities.length)}
                </p>
              </div>
              <Star className="h-8 w-8 text-seguranca-yellow" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="bg-seguranca-graphite border-gray-600">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar oportunidades, leads, empresas..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10 bg-seguranca-black border-gray-600 text-seguranca-lightgray"
              />
            </div>
            
            <Select value={selectedStatus?.toString() || 'all'} onValueChange={(value) => setSelectedStatus(value === 'all' ? null : value)}>
              <SelectTrigger className="w-48 bg-seguranca-black border-gray-600 text-seguranca-lightgray">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {statuses.map(status => (
                  <SelectItem key={status.id} value={status.id.toString()}>{status.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedPriority} onValueChange={setSelectedPriority}>
              <SelectTrigger className="w-48 bg-seguranca-black border-gray-600 text-seguranca-lightgray">
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as prioridades</SelectItem>
                <SelectItem value="URGENT">Urgente</SelectItem>
                <SelectItem value="HIGH">Alta</SelectItem>
                <SelectItem value="MEDIUM">Média</SelectItem>
                <SelectItem value="LOW">Baixa</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              onClick={() => { setSearchTerm(''); setSelectedStatus(null); setSelectedPriority('all'); }}
              className="border-gray-600 text-seguranca-lightgray hover:bg-seguranca-black"
            >
              Limpar Filtros
            </Button>

            <div className="flex gap-2 ml-auto">
              {selectedOppIds.length > 0 ? (
                <>
                  <Button 
                    variant="destructive" 
                    onClick={handleDeleteSelected}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir Selecionados ({selectedOppIds.length})
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={deselectAll}
                    className="border-gray-600 text-seguranca-lightgray hover:bg-seguranca-black"
                  >
                    Desmarcar Tudo
                  </Button>
                </>
              ) : (
                <Button 
                  variant="outline" 
                  onClick={selectAll}
                  className="border-gray-600 text-seguranca-lightgray hover:bg-seguranca-black"
                >
                  Selecionar Todos
                </Button>
              )}

              <Button 
                variant="destructive" 
                onClick={handleDeleteAllLeads}
                className="bg-red-900/50 hover:bg-red-900 text-white border-red-800"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Limpar Tudo
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Kanban Board */}
      <div className={styles['kanban-board-scroll']}>
        {statuses.map(status => {
          const statusOpportunities = filteredOpportunities.filter(opp => String(opp.statusId) === String(status.id));
          const totalValue = statusOpportunities.reduce((sum, opp) => sum + opp.value, 0);
          
          return (
            <div
              key={status.id}
              className={styles['kanban-column']}
              style={{ borderLeft: `4px solid ${status.color}` }}
            >
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-seguranca-lightgray">{status.name}</h3>
                  <p className="text-sm text-gray-400">
                    {statusOpportunities.length} oportunidades • {formatCurrency(totalValue)}
                  </p>
                </div>
                <Button 
                  size="sm"
                  onClick={() => openModal(status.id)}
                  className="bg-seguranca-yellow text-black hover:bg-yellow-500"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="space-y-3">
                {statusOpportunities.map(opp => (
                  <KanbanCard
                    key={opp.id}
                    opportunity={opp}
                    onEdit={openEditModal}
                    onDragStart={() => {}}
                    getPriorityColor={getPriorityColor}
                    getLeadStatusColor={getLeadStatusColor}
                    getLeadStatusText={getLeadStatusText}
                    selected={selectedOppIds.includes(opp.id)}
                    onSelect={toggleSelect}
                    onDelete={handleDeleteOpportunity}
                    formatCurrency={formatCurrency}
                    formatDate={formatDate}
                  />
                ))}
              </div>
              
              <Button 
                variant="outline"
                onClick={() => openModal(status.id)}
                disabled={!hasValidStatuses}
                className="w-full mt-4 border-dashed border-gray-600 text-gray-400 hover:bg-seguranca-black disabled:opacity-50 disabled:cursor-not-allowed"
                title={!hasValidStatuses ? "Crie status no backend antes de adicionar oportunidades" : "Adicionar oportunidade"}
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Oportunidade
              </Button>
            </div>
          );
        })}
      </div>

      {/* Modal de Oportunidade */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[95vh] overflow-y-auto w-[98vw] sm:w-[95vw] md:w-[90vw] lg:w-full p-0 sm:p-6 bg-seguranca-graphite border-gray-600">
          <DialogHeader className="px-4 sm:px-0 pt-4 sm:pt-0 pb-2">
            <DialogTitle className="text-lg sm:text-xl lg:text-2xl font-semibold text-seguranca-lightgray">
              {editing ? 'Editar Oportunidade' : 'Nova Oportunidade'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={(e) => { e.preventDefault(); handleSaveOpportunity(); }} className="space-y-4 sm:space-y-6 px-4 sm:px-0">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium text-seguranca-lightgray">
                Título <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                required
                placeholder="Título da oportunidade"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="bg-seguranca-black border-gray-600 text-seguranca-lightgray h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium text-seguranca-lightgray">
                Descrição <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="description"
                required
                placeholder="Descrição da oportunidade"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="bg-seguranca-black border-gray-600 text-seguranca-lightgray resize-none"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status" className="text-sm font-medium text-seguranca-lightgray">
                Status <span className="text-red-500">*</span>
              </Label>
              <Select value={form.statusId || ''} onValueChange={(value) => setForm(f => ({ ...f, statusId: value }))} required>
                <SelectTrigger id="status" className="bg-seguranca-black border-gray-600 text-seguranca-lightgray h-10">
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent className="bg-seguranca-graphite border-gray-600">
                  {statuses.map(status => (
                    <SelectItem key={String(status.id)} value={String(status.id)} className="text-seguranca-lightgray hover:bg-seguranca-black">
                      {status.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2">
                <Label htmlFor="closeDate" className="text-sm font-medium text-seguranca-lightgray">
                  Data de Fechamento
                </Label>
                <Input
                  id="closeDate"
                  type="date"
                  value={form.closeDate}
                  onChange={e => setForm(f => ({ ...f, closeDate: e.target.value }))}
                  className="bg-seguranca-black border-gray-600 text-seguranca-lightgray h-10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="estimatedValue" className="text-sm font-medium text-seguranca-lightgray">
                  Valor Estimado (R$)
                </Label>
                <Input
                  id="estimatedValue"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={form.estimatedValue}
                  onChange={e => setForm(f => ({ ...f, estimatedValue: e.target.value }))}
                  className="bg-seguranca-black border-gray-600 text-seguranca-lightgray h-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignedTo" className="text-sm font-medium text-seguranca-lightgray">
                Responsável
              </Label>
              <Select 
                value={form.assignedToId ? form.assignedToId : undefined} 
                onValueChange={(value) => setForm(f => ({ ...f, assignedToId: value }))}
              >
                <SelectTrigger id="assignedTo" className="bg-seguranca-black border-gray-600 text-seguranca-lightgray h-10">
                  <SelectValue placeholder="Selecione o responsável (opcional)" />
                </SelectTrigger>
                <SelectContent className="bg-seguranca-graphite border-gray-600">
                  {users.map(user => (
                    <SelectItem key={String(user.id)} value={String(user.id)} className="text-seguranca-lightgray hover:bg-seguranca-black">
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="leadId" className="text-sm font-medium text-seguranca-lightgray">
                Lead
              </Label>
              <Select 
                value={form.leadId ? form.leadId : undefined} 
                onValueChange={(value) => {
                  const selectedLead = leads.find(l => String(l.id) === value);
                  // Buscar source do lead - pode estar como objeto (enum) ou string
                  let sourceValue = '';
                  if (selectedLead) {
                    if (typeof selectedLead.source === 'string') {
                      sourceValue = selectedLead.source;
                    } else if (selectedLead.source && typeof selectedLead.source === 'object') {
                      // Se for um objeto enum, pegar a chave
                      sourceValue = Object.keys(selectedLead.source)[0] || selectedLead.source.toString();
                    }
                  }
                  setForm(f => ({ 
                    ...f, 
                    leadId: value,
                    leadSource: sourceValue
                  }));
                }}
              >
                <SelectTrigger id="leadId" className="bg-seguranca-black border-gray-600 text-seguranca-lightgray h-10">
                  <SelectValue placeholder="Selecione o lead (opcional)" />
                </SelectTrigger>
                <SelectContent className="bg-seguranca-graphite border-gray-600">
                  {leads.map(lead => (
                    <SelectItem key={String(lead.id)} value={String(lead.id)} className="text-seguranca-lightgray hover:bg-seguranca-black">
                      {lead.name || lead.company || `Lead #${lead.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {form.leadId && (
              <div className="space-y-2">
                <Label htmlFor="leadSource" className="text-sm font-medium text-seguranca-lightgray">
                  Fonte do Lead
                </Label>
                <Select 
                  value={form.leadSource || undefined} 
                  onValueChange={(value) => setForm(f => ({ ...f, leadSource: value }))}
                >
                  <SelectTrigger id="leadSource" className="bg-seguranca-black border-gray-600 text-seguranca-lightgray h-10">
                    <SelectValue placeholder="Selecione a fonte do lead" />
                  </SelectTrigger>
                  <SelectContent className="bg-seguranca-graphite border-gray-600">
                    <SelectItem value="WEBSITE" className="text-seguranca-lightgray hover:bg-seguranca-black">Website</SelectItem>
                    <SelectItem value="REFERRAL" className="text-seguranca-lightgray hover:bg-seguranca-black">Indicação</SelectItem>
                    <SelectItem value="COLD_CALL" className="text-seguranca-lightgray hover:bg-seguranca-black">Ligação a Frio</SelectItem>
                    <SelectItem value="EMAIL_MARKETING" className="text-seguranca-lightgray hover:bg-seguranca-black">Email Marketing</SelectItem>
                    <SelectItem value="SOCIAL_MEDIA" className="text-seguranca-lightgray hover:bg-seguranca-black">Redes Sociais</SelectItem>
                    <SelectItem value="GOOGLE_ADS" className="text-seguranca-lightgray hover:bg-seguranca-black">Google Ads</SelectItem>
                    <SelectItem value="EVENT" className="text-seguranca-lightgray hover:bg-seguranca-black">Evento</SelectItem>
                    <SelectItem value="PARTNER" className="text-seguranca-lightgray hover:bg-seguranca-black">Parceiro</SelectItem>
                    <SelectItem value="OTHER" className="text-seguranca-lightgray hover:bg-seguranca-black">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2 sm:pt-4">
              <Button 
                type="submit" 
                className="flex-1 sm:flex-none sm:order-2 bg-seguranca-yellow text-black hover:bg-yellow-500 h-10"
              >
                {editing ? 'Atualizar' : 'Criar'}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowModal(false)}
                className="flex-1 sm:flex-none sm:order-1 border-gray-600 text-seguranca-lightgray hover:bg-seguranca-black h-10"
              >
                Cancelar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
} 