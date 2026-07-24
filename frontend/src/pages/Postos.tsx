import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Edit, 
  Trash2, 
  MapPin, 
  Users, 
  Clock,
  Building,
  FileText,
  AlertCircle,
  CheckCircle,
  XCircle,
  Pause,
  Play,
  Calendar,
  QrCode,
  Printer,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { workPostService, WorkPost, WorkPostFilters } from '@/services/workPostService';
import { clientService } from '@/services/clientService';
import { Client } from '@/types/client';
import WorkPostFormModal from '@/components/postos/WorkPostFormModal';
import WorkPostViewModal from '@/components/postos/WorkPostViewModal';
import WorkPostDeleteDialog from '@/components/postos/WorkPostDeleteDialog';
import { StandardLayout } from '@/components/StandardLayout';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import qrCodeService, { QRCodeWorkPost } from '@/services/qrCodeService';
import { useAuth } from '@/contexts/AuthContext';

// Funções utilitárias de formatação
const getStatusColor = (status: string) => {
  switch (status) {
    case 'ATIVO': return 'bg-green-100 text-green-800';
    case 'EM_IMPLANTACAO': return 'bg-blue-100 text-blue-800';
    case 'INATIVO': return 'bg-gray-100 text-gray-800';
    case 'SUSPENSO': return 'bg-yellow-100 text-yellow-800';
    case 'CANCELADO': return 'bg-red-100 text-red-800';
    case 'EM_ANALISE': return 'bg-purple-100 text-purple-800';
    case 'PENDENTE': return 'bg-orange-100 text-orange-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'ATIVO': return 'Ativo';
    case 'EM_IMPLANTACAO': return 'Em Implantação';
    case 'INATIVO': return 'Inativo';
    case 'SUSPENSO': return 'Suspenso';
    case 'CANCELADO': return 'Cancelado';
    case 'EM_ANALISE': return 'Em Análise';
    case 'PENDENTE': return 'Pendente';
    default: return status;
  }
};

const getTypeText = (type: string) => {
  switch (type) {
    case 'POSTO_24H': return 'Posto 24h';
    case 'POSTO_SDF': return 'Posto SDF';
    case 'POSTO_12H_NOTURNO': return '12h Noturno';
    case 'POSTO_12H_DIURNO': return '12h Diurno';
    case 'POSTO_6H': return 'Posto 6h';
    case 'POSTO_8H': return 'Posto 8h';
    case 'OUTROS': return 'Outros';
    default: return type;
  }
};

const INVALID_SECTOR_KEYWORDS = [
  'ENSINO FUNDAMENTAL',
  'ENSINO MÉDIO',
  'ENSINO MEDIO',
  'EDUCAÇÃO SUPERIOR',
  'EDUCACAO SUPERIOR',
  'PÓS-GRADUAÇÃO',
  'POS-GRADUACAO',
  'MESTRADO',
  'DOUTORADO',
  'ANALFABETO',
  'PRETA',
  'BRANCA',
  'PARDA',
  'AMARELA',
  'INDÍGENA',
  'INDIGENA'
];

const isValidSector = (workPost: WorkPost) => {
  const nameUpper = (workPost.name || '').trim().toUpperCase();
  const codeUpper = (workPost.postCode || '').trim().toUpperCase();

  for (const kw of INVALID_SECTOR_KEYWORDS) {
    if (nameUpper === kw || codeUpper === kw || (kw.length > 5 && nameUpper.includes(kw))) {
      return false;
    }
  }
  return true;
};

const Postos: React.FC = () => {
  const [workPosts, setWorkPosts] = useState<WorkPost[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [cityFilter, setCityFilter] = useState<string>('');
  const [stateFilter, setStateFilter] = useState<string>('');
  
  // Modais
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedWorkPost, setSelectedWorkPost] = useState<WorkPost | null>(null);
  const [editingWorkPost, setEditingWorkPost] = useState<WorkPost | null>(null);

  // Gestão de QR Codes
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrSelectedWorkPost, setQrSelectedWorkPost] = useState<WorkPost | null>(null);
  const [qrCodes, setQrCodes] = useState<QRCodeWorkPost[]>([]);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrDescription, setQrDescription] = useState('');
  const [qrRadius, setQrRadius] = useState<number>(100);
  const [qrImageUrls, setQrImageUrls] = useState<Record<string, string>>({});

  const revokeQrImageUrls = useCallback((urls: Record<string, string>) => {
    Object.values(urls).forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const { toast } = useToast();
  const { user } = useAuth();

  // Carregar dados
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [workPostsData, clientsData] = await Promise.all([
        workPostService.getAllWorkPosts(),
        clientService.getAllClients()
      ]);
      setWorkPosts(workPostsData);
      setClients(clientsData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados dos postos de trabalho",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filtrar postos
  const filteredWorkPosts = workPosts.filter(workPost => {
    if (!isValidSector(workPost)) return false;

    const matchesSearch = !searchTerm || 
      workPost.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      workPost.postCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      workPost.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (workPost.clientName && workPost.clientName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all'
      ? (workPost.status !== 'INATIVO' && workPost.status !== 'CANCELADO')
      : workPost.status === statusFilter;
    const matchesType = typeFilter === 'all' || workPost.type === typeFilter;
    const matchesClient = clientFilter === 'all' || workPost.clientId === clientFilter;
    const matchesCity = !cityFilter || workPost.city?.toLowerCase().includes(cityFilter.toLowerCase());
    const matchesState = !stateFilter || workPost.state?.toLowerCase().includes(stateFilter.toLowerCase());
    
    return matchesSearch && matchesStatus && matchesType && matchesClient && matchesCity && matchesState;
  });

  // Accordion de Clientes
  const [expandedClients, setExpandedClients] = useState<Record<string, boolean>>({});

  const toggleClientExpanded = (clientKey: string) => {
    setExpandedClients((prev) => ({
      ...prev,
      [clientKey]: !prev[clientKey],
    }));
  };

  // Grouping by Client
  const clientGroups = React.useMemo(() => {
    const groupsMap: Record<string, {
      clientKey: string;
      clientId?: string;
      clientName: string;
      clientCnpj?: string;
      posts: WorkPost[];
      sectors: string[];
      postTypes: string[];
      locations: string[];
      statuses: string[];
      implementationDates: string[];
    }> = {};

    filteredWorkPosts.forEach((workPost) => {
      const postNameNorm = (workPost.name || '').trim().toLowerCase();
      const clientNameNorm = (workPost.clientName || '').trim().toLowerCase();

      // 1. Tentar resolver o cliente diretamente pelo ID do posto (workPost.clientId)
      let matchedClient = workPost.clientId ? clients.find((c) => c.id === workPost.clientId) : undefined;

      if (matchedClient) {
        const cNameNorm = matchedClient.name.trim().toLowerCase();
        // Se o nome do posto NÃO bate com o cliente do ID, mas é o nome exato de OUTRO cliente cadastrado
        if (postNameNorm !== cNameNorm) {
          const otherClient = clients.find((c) => {
            const otherNorm = c.name.trim().toLowerCase();
            return otherNorm === postNameNorm || (postNameNorm.length > 5 && otherNorm.includes(postNameNorm));
          });
          if (otherClient) {
            matchedClient = otherClient;
          }
        }
      } else {
        // Se o posto não tinha clientId válido, tentar pelo nome do posto ou clientName
        matchedClient = clients.find((c) => {
          const cNameNorm = c.name.trim().toLowerCase();
          return cNameNorm === postNameNorm || (postNameNorm.length > 5 && cNameNorm.includes(postNameNorm));
        });

        if (!matchedClient && clientNameNorm && clientNameNorm !== 'cliente não encontrado') {
          matchedClient = clients.find((c) => c.name.trim().toLowerCase() === clientNameNorm);
        }
      }

      // 2. Definir a chave de agrupamento
      const clientKey = matchedClient
        ? matchedClient.id
        : (workPost.clientId || (workPost.clientName && workPost.clientName !== 'Cliente não encontrado' ? `name_${workPost.clientName.trim()}` : `name_${workPost.name.trim()}`));

      const clientName = matchedClient
        ? matchedClient.name
        : (workPost.clientName && workPost.clientName !== 'Cliente não encontrado' ? workPost.clientName : workPost.name);

      const clientCnpj = matchedClient?.cnpj || (workPost.clientCnpj && workPost.clientCnpj !== 'N/A' ? workPost.clientCnpj : '');
      const sectorName = (workPost.name || workPost.postCode || 'Setor Geral').trim();
      const postType = getTypeText(workPost.type);
      const location = workPost.city && workPost.state 
        ? `${workPost.city}, ${workPost.state}` 
        : (workPost.address ? workPost.address.substring(0, 30) : 'Não informada');
      const status = workPost.status || 'ATIVO';
      const implDate = workPost.implementationDate;

      if (!groupsMap[clientKey]) {
        groupsMap[clientKey] = {
          clientKey,
          clientId: matchedClient?.id || workPost.clientId,
          clientName,
          clientCnpj,
          posts: [],
          sectors: [],
          postTypes: [],
          locations: [],
          statuses: [],
          implementationDates: [],
        };
      }

      groupsMap[clientKey].posts.push(workPost);

      if (sectorName && !groupsMap[clientKey].sectors.includes(sectorName)) {
        groupsMap[clientKey].sectors.push(sectorName);
      }
      if (postType && !groupsMap[clientKey].postTypes.includes(postType)) {
        groupsMap[clientKey].postTypes.push(postType);
      }
      if (location && !groupsMap[clientKey].locations.includes(location)) {
        groupsMap[clientKey].locations.push(location);
      }
      if (status && !groupsMap[clientKey].statuses.includes(status)) {
        groupsMap[clientKey].statuses.push(status);
      }
      if (implDate && !groupsMap[clientKey].implementationDates.includes(implDate)) {
        groupsMap[clientKey].implementationDates.push(implDate);
      }
    });

    return Object.values(groupsMap);
  }, [filteredWorkPosts, clients]);

  // Handlers
  const [forcedClientId, setForcedClientId] = useState<string | undefined>(undefined);

  const handleCreateWorkPost = () => {
    setEditingWorkPost(null);
    setForcedClientId(undefined);
    setIsFormModalOpen(true);
  };

  const handleCreateForClient = (clientId?: string) => {
    setEditingWorkPost(null);
    setForcedClientId(clientId);
    setIsFormModalOpen(true);
  };

  const handleEditWorkPost = (workPost: WorkPost) => {
    setEditingWorkPost(workPost);
    setIsFormModalOpen(true);
  };

  const handleViewWorkPost = (workPost: WorkPost) => {
    setSelectedWorkPost(workPost);
    setIsViewModalOpen(true);
  };

  const handleDeleteWorkPost = (workPost: WorkPost) => {
    setSelectedWorkPost(workPost);
    setIsDeleteDialogOpen(true);
  };

  const handleStatusChange = async (workPostId: string, newStatus: string) => {
    try {
      await workPostService.updateWorkPostStatus(workPostId, newStatus);
      await loadData();
      toast({
        title: "Sucesso",
        description: "Status do posto atualizado com sucesso",
      });
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar status do posto",
        variant: "destructive",
      });
    }
  };

  const handleFormSubmit = async () => {
    await loadData();
    setIsFormModalOpen(false);
    setEditingWorkPost(null);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedWorkPost) return;
    
    try {
      await workPostService.deleteWorkPost(selectedWorkPost.id);
      await loadData();
      setIsDeleteDialogOpen(false);
      setSelectedWorkPost(null);
      toast({
        title: "Sucesso",
        description: "Posto de trabalho excluído com sucesso",
      });
    } catch (error) {
      console.error('Erro ao excluir posto:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir posto de trabalho",
        variant: "destructive",
      });
    }
  };

  // Carrega as imagens PNG dos QR Codes (via axios com JWT → blob URL)
  useEffect(() => {
    if (!isQrModalOpen || qrCodes.length === 0) {
      return;
    }
    let cancelled = false;
    const loadImages = async () => {
      const pairs = await Promise.all(
        qrCodes.map(async (qr) => {
          try {
            const url = await qrCodeService.getQRCodeImage(qr.id);
            return [qr.id, url] as const;
          } catch {
            return [qr.id, ''] as const;
          }
        }),
      );
      if (cancelled) {
        pairs.forEach(([, url]) => url && URL.revokeObjectURL(url));
        return;
      }
      setQrImageUrls((prev) => {
        revokeQrImageUrls(prev);
        return Object.fromEntries(pairs.filter(([, url]) => url));
      });
    };
    void loadImages();
    return () => {
      cancelled = true;
    };
  }, [isQrModalOpen, qrCodes, revokeQrImageUrls]);

  useEffect(() => {
    if (!isQrModalOpen) {
      setQrImageUrls((prev) => {
        revokeQrImageUrls(prev);
        return {};
      });
    }
  }, [isQrModalOpen, revokeQrImageUrls]);

  // QR Codes - carregar lista para um posto
  const openQrModalForWorkPost = async (workPost: WorkPost) => {
    setQrSelectedWorkPost(workPost);
    setIsQrModalOpen(true);
    setQrDescription('');
    setQrRadius(100);

    try {
      setQrLoading(true);
      const response = await qrCodeService.getQRCodesByWorkPost(workPost.id);
      if (response?.success && Array.isArray(response.data)) {
        setQrCodes(response.data);
      } else {
        setQrCodes([]);
      }
    } catch (error) {
      console.error('Erro ao carregar QR Codes:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os QR Codes deste posto.',
        variant: 'destructive',
      });
    } finally {
      setQrLoading(false);
    }
  };

  const handleGenerateQrCode = async () => {
    if (!qrSelectedWorkPost || !user) return;

    try {
      setQrLoading(true);
      const result = await qrCodeService.generateQRCode(
        qrSelectedWorkPost.id,
        qrDescription || `QR Code para ${qrSelectedWorkPost.name}`,
        user.id,
        undefined,
        undefined,
        qrRadius
      );

      if (result?.success && result.data) {
        // recarregar lista
        const refreshed = await qrCodeService.getQRCodesByWorkPost(qrSelectedWorkPost.id);
        setQrCodes(refreshed?.data ?? []);
        toast({
          title: 'QR Code gerado',
          description: 'QR Code gerado com sucesso para o posto.',
        });
      } else {
        toast({
          title: 'Erro ao gerar QR Code',
          description: result?.error || 'Tente novamente mais tarde.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Erro ao gerar QR Code:', error);
      toast({
        title: 'Erro ao gerar QR Code',
        description: error?.response?.data?.error || error.message || 'Não foi possível gerar o QR Code.',
        variant: 'destructive',
      });
    } finally {
      setQrLoading(false);
    }
  };

  const handleDownloadQrImage = async (qr: QRCodeWorkPost) => {
    try {
      const url = qrImageUrls[qr.id] ?? (await qrCodeService.getQRCodeImage(qr.id));
      const link = document.createElement('a');
      link.href = url;
      link.download = `qrcode-posto-${qrSelectedWorkPost?.postCode || ''}-${qr.id}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      if (!qrImageUrls[qr.id]) {
        URL.revokeObjectURL(url);
      }
    } catch (error: any) {
      console.error('Erro ao baixar QR Code:', error);
      toast({
        title: 'Erro ao baixar QR Code',
        description: error?.response?.data?.error || error.message || 'Não foi possível baixar o QR Code.',
        variant: 'destructive',
      });
    }
  };

  const handlePrintQrImage = (qr: QRCodeWorkPost) => {
    const url = qrImageUrls[qr.id];
    if (!url || !qrSelectedWorkPost) {
      toast({
        title: 'Imagem indisponível',
        description: 'Aguarde o carregamento do QR Code ou tente novamente.',
        variant: 'destructive',
      });
      return;
    }
    const w = window.open('', '_blank', 'width=480,height=560');
    if (!w) {
      toast({
        title: 'Pop-up bloqueado',
        description: 'Permita pop-ups para imprimir o QR Code.',
        variant: 'destructive',
      });
      return;
    }
    const title = qr.description || `QR Code - ${qrSelectedWorkPost.name}`;
    w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"/>
      <title>${title}</title>
      <style>body{font-family:Arial,sans-serif;text-align:center;padding:24px}
      h1{font-size:16px;margin-bottom:16px}img{width:280px;height:280px}</style></head>
      <body><h1>${qrSelectedWorkPost.name}</h1><p>${title}</p>
      <img src="${url}" alt="QR Code"/><p style="font-size:12px;color:#666">Raio: ${qr.radiusMeters}m</p></body></html>`);
    w.document.close();
    w.onload = () => { w.focus(); w.print(); };
  };

  const handleToggleQrActive = async (qr: QRCodeWorkPost) => {
    try {
      await qrCodeService.toggleQRCode(qr.id);
      if (!qrSelectedWorkPost) return;
      const refreshed = await qrCodeService.getQRCodesByWorkPost(qrSelectedWorkPost.id);
      setQrCodes(refreshed?.data ?? []);
    } catch (error: any) {
      console.error('Erro ao alterar status do QR Code:', error);
      toast({
        title: 'Erro ao alterar status',
        description: error?.response?.data?.error || error.message || 'Não foi possível alterar o status do QR Code.',
        variant: 'destructive',
      });
    }
  };



  // Estatísticas (conjunto completo)
  const stats = {
    total: workPosts.length,
    ativos: workPosts.filter(wp => wp.status === 'ATIVO').length,
    emImplantacao: workPosts.filter(wp => wp.status === 'EM_IMPLANTACAO').length,
    inativos: workPosts.filter(wp => wp.status === 'INATIVO').length,
    totalVigilantes: workPosts.reduce((total, wp) => total + (wp.requiredVigilantes ?? 0), 0)
  };

  const handleGeneratePdf = async () => {
    try {
      const blob = await workPostService.exportReportPdf({
        searchTerm: searchTerm.trim() || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        type: typeFilter !== 'all' ? typeFilter : undefined,
        clientId: clientFilter !== 'all' ? clientFilter : undefined,
        city: cityFilter.trim() || undefined,
        state: stateFilter.trim() || undefined,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `postos-de-trabalho-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({
        title: 'Relatório gerado',
        description: 'O PDF foi gerado com o layout padrão do sistema.',
      });
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível gerar o relatório em PDF.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <StandardLayout title="Postos de Trabalho" subtitle="Gestão e implantação de postos de serviço">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Carregando postos de trabalho...</p>
          </div>
        </div>
      </StandardLayout>
    );
  }

  return (
    <StandardLayout title="Postos de Trabalho" subtitle="Gestão e implantação de postos de serviço">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Gestão de Setores e Postos de Trabalho</h1>
            <p className="text-muted-foreground">
              Gerencie os setores de trabalho e seus postos de serviço
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleGeneratePdf}>
              <FileText className="h-4 w-4 mr-2" />
              Gerar Relatório PDF
            </Button>
            <Button onClick={handleCreateWorkPost}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Setor de Trabalho
            </Button>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Postos</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ativos</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.ativos}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Em Implantação</CardTitle>
              <Clock className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.emImplantacao}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inativos</CardTitle>
              <XCircle className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-600">{stats.inativos}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Vigilantes</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalVigilantes}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Buscar</label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Nome, código ou endereço..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="ATIVO">Ativo</SelectItem>
                    <SelectItem value="EM_IMPLANTACAO">Em Implantação</SelectItem>
                    <SelectItem value="INATIVO">Inativo</SelectItem>
                    <SelectItem value="SUSPENSO">Suspenso</SelectItem>
                    <SelectItem value="CANCELADO">Cancelado</SelectItem>
                    <SelectItem value="EM_ANALISE">Em Análise</SelectItem>
                    <SelectItem value="PENDENTE">Pendente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo</label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os tipos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    <SelectItem value="POSTO_24H">Posto 24h</SelectItem>
                    <SelectItem value="POSTO_SDF">Posto SDF</SelectItem>
                    <SelectItem value="POSTO_12H_NOTURNO">12h Noturno</SelectItem>
                    <SelectItem value="POSTO_12H_DIURNO">12h Diurno</SelectItem>
                    <SelectItem value="POSTO_6H">Posto 6h</SelectItem>
                    <SelectItem value="POSTO_8H">Posto 8h</SelectItem>
                    <SelectItem value="OUTROS">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Cliente</label>
                <Select value={clientFilter} onValueChange={setClientFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os clientes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os clientes</SelectItem>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id.toString()}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Cidade</label>
                <Input
                  placeholder="Filtrar por cidade..."
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Estado</label>
                <Input
                  placeholder="Filtrar por estado..."
                  value={stateFilter}
                  onChange={(e) => setStateFilter(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabela */}
        <Card>
          <CardHeader>
            <CardTitle>Setores de Trabalho ({filteredWorkPosts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Setor de Trabalho</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Implantação</TableHead>
                    <TableHead>Postos</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientGroups.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <div className="flex flex-col items-center gap-2">
                          <Building className="h-8 w-8 text-muted-foreground" />
                          <p className="text-muted-foreground">Nenhum setor ou cliente encontrado</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    clientGroups.map((group) => {
                      const isExpanded = !!expandedClients[group.clientKey];
                      const hasMultiplePosts = group.posts.length > 1;
                      const firstPost = group.posts[0];

                      return (
                        <React.Fragment key={group.clientKey}>
                          <TableRow
                            onClick={() => toggleClientExpanded(group.clientKey)}
                            className="cursor-pointer hover:bg-muted/40 font-medium transition-colors select-none"
                          >
                            {/* 1. Cliente */}
                            <TableCell className="font-medium max-w-[280px]">
                              <div className="flex items-center gap-2">
                                <Building className="h-4 w-4 text-muted-foreground shrink-0" />
                                <div className="flex flex-col truncate">
                                  <span className="font-semibold text-foreground truncate" title={group.clientName}>
                                    {group.clientName}
                                  </span>
                                  {group.clientCnpj && (
                                    <span className="text-[11px] text-muted-foreground font-normal">
                                      CNPJ: {group.clientCnpj}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </TableCell>

                            {/* 2. Setores de Trabalho */}
                            <TableCell className="max-w-[300px]">
                              <div className="flex flex-wrap gap-1 items-center">
                                {group.sectors.slice(0, 2).map((sec, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs bg-background truncate max-w-[260px]">
                                    {sec}
                                  </Badge>
                                ))}
                                {group.sectors.length > 2 && (
                                  <Badge variant="secondary" className="text-xs shrink-0 font-normal">
                                    +{group.sectors.length - 2} outros
                                  </Badge>
                                )}
                              </div>
                            </TableCell>

                            {/* 4. Status */}
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {group.statuses.map((st, idx) => (
                                  <Badge key={idx} className={getStatusColor(st)}>
                                    {getStatusText(st)}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>

                            {/* 5. Implantação */}
                            <TableCell>
                              {group.implementationDates.length > 0 ? (
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                  <span className="text-sm">
                                    {group.implementationDates
                                      .map((d) => new Date(d).toLocaleDateString('pt-BR'))
                                      .join(', ')}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">Não definida</span>
                              )}
                            </TableCell>

                            {/* 6. Postos */}
                            <TableCell className="max-w-[220px]">
                              <div className="flex flex-wrap gap-1 items-center">
                                {group.postTypes.slice(0, 2).map((pt, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {pt}
                                  </Badge>
                                ))}
                                {group.postTypes.length > 2 && (
                                  <Badge variant="secondary" className="text-xs shrink-0 font-normal">
                                    +{group.postTypes.length - 2} mais
                                  </Badge>
                                )}
                              </div>
                            </TableCell>

                            {/* 7. Ações / Accordion Indicator */}
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleClientExpanded(group.clientKey);
                                }}
                                className="h-8 text-xs flex items-center gap-1.5 float-right"
                              >
                                <span>{isExpanded ? 'Recolher' : 'Ver Setores'}</span>
                                <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                              </Button>
                            </TableCell>
                          </TableRow>

                          {/* Conteúdo do Accordion quando expandido */}
                          {isExpanded && (
                            <TableRow className="bg-muted/15 hover:bg-muted/15">
                              <TableCell colSpan={6} className="p-4">
                                <div className="space-y-4">
                                  <div className="flex items-center justify-between border-b pb-2">
                                    <div className="flex items-center gap-2">
                                      <Building className="h-4 w-4 text-primary" />
                                      <span className="font-semibold text-base text-foreground">
                                        Setores e Postos de Trabalho — {group.clientName}
                                      </span>
                                      {group.clientCnpj && (
                                        <Badge variant="outline" className="text-xs font-normal">
                                          CNPJ: {group.clientCnpj}
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 text-xs flex items-center gap-1"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCreateForClient(group.clientId);
                                        }}
                                      >
                                        <Plus className="h-3.5 w-3.5" />
                                        Novo Setor
                                      </Button>
                                      <Badge variant="outline" className="text-xs">
                                        {group.sectors.length} Setor{group.sectors.length > 1 ? 'es' : ''} | {group.posts.length} Posto{group.posts.length > 1 ? 's' : ''}
                                      </Badge>
                                    </div>
                                  </div>

                                  {/* Agrupamento por Setor de Trabalho */}
                                  {(() => {
                                    const sectorsMap: Record<string, { code: string; name: string; posts: WorkPost[] }> = {};
                                    group.posts.forEach((post) => {
                                      const sectorKey = (post.name || post.postCode || 'Setor Geral').trim();
                                      if (!sectorsMap[sectorKey]) {
                                        sectorsMap[sectorKey] = {
                                          code: post.postCode || 'SETOR',
                                          name: post.name || 'Setor sem nome',
                                          posts: [],
                                        };
                                      }
                                      sectorsMap[sectorKey].posts.push(post);
                                    });

                                    const sectorList = Object.values(sectorsMap);

                                    return sectorList.map((sector, secIdx) => (
                                      <div key={secIdx} className="rounded-lg border bg-card p-4 space-y-3 shadow-sm">
                                        <div className="flex items-center justify-between bg-muted/40 p-2.5 rounded-md">
                                          <div className="flex items-center gap-2">
                                            <Badge variant="default" className="text-xs font-semibold">
                                              Setor: {sector.code}
                                            </Badge>
                                            <span className="font-medium text-sm text-foreground">{sector.name}</span>
                                          </div>
                                          <Badge variant="secondary" className="text-xs">
                                            {sector.posts.length} Posto{sector.posts.length > 1 ? 's' : ''} de Trabalho
                                          </Badge>
                                        </div>

                                        <div className="rounded-md border overflow-x-auto bg-background">
                                          <Table>
                                            <TableHeader>
                                              <TableRow className="bg-muted/30 text-xs">
                                                <TableHead>Posto de Trabalho</TableHead>
                                                <TableHead>Localização</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Implantação</TableHead>
                                                <TableHead>Escala / Vigilantes</TableHead>
                                                <TableHead className="text-right">Ações do Posto</TableHead>
                                              </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                              {sector.posts.map((post) => (
                                                <TableRow key={post.id} className="hover:bg-muted/30">
                                                  <TableCell>
                                                    <div className="font-semibold text-sm">
                                                      {getTypeText(post.type)}
                                                    </div>
                                                    {post.primaryPositionName && (
                                                      <div className="text-xs text-muted-foreground">
                                                        {post.primaryPositionName}
                                                      </div>
                                                    )}
                                                  </TableCell>
                                                  <TableCell>
                                                    <div className="flex items-center gap-1 text-xs">
                                                      <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                                                      <span>
                                                        {post.city && post.state
                                                          ? `${post.city}, ${post.state}`
                                                          : (post.address ? post.address.substring(0, 30) + '...' : 'Não informada')}
                                                      </span>
                                                    </div>
                                                  </TableCell>
                                                  <TableCell>
                                                    <Badge className={getStatusColor(post.status)}>
                                                      {getStatusText(post.status)}
                                                    </Badge>
                                                  </TableCell>
                                                  <TableCell>
                                                    <span className="text-xs text-muted-foreground">
                                                      {post.implementationDate
                                                        ? new Date(post.implementationDate).toLocaleDateString('pt-BR')
                                                        : 'Não definida'}
                                                    </span>
                                                  </TableCell>
                                                  <TableCell>
                                                    <div className="text-xs">
                                                      <div>{post.requiredVigilantes || 1} vigilante(s)</div>
                                                      <div className="text-muted-foreground">{post.workSchedule || '12X36'}</div>
                                                    </div>
                                                  </TableCell>
                                                  <TableCell className="text-right">
                                                    <DropdownMenu>
                                                      <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                                          <span className="sr-only">Abrir menu</span>
                                                          <FileText className="h-4 w-4" />
                                                        </Button>
                                                      </DropdownMenuTrigger>
                                                      <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => handleViewWorkPost(post)}>
                                                          <Eye className="mr-2 h-4 w-4" />
                                                          Visualizar Posto
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleEditWorkPost(post)}>
                                                          <Edit className="mr-2 h-4 w-4" />
                                                          Editar Posto
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => openQrModalForWorkPost(post)}>
                                                          <QrCode className="mr-2 h-4 w-4" />
                                                          QR Codes do Posto
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleDeleteWorkPost(post)}>
                                                          <Trash2 className="mr-2 h-4 w-4 text-destructive" />
                                                          Excluir Posto
                                                        </DropdownMenuItem>
                                                      </DropdownMenuContent>
                                                    </DropdownMenu>
                                                  </TableCell>
                                                </TableRow>
                                              ))}
                                            </TableBody>
                                          </Table>
                                        </div>
                                      </div>
                                    ));
                                  })()}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Modais */}
        <WorkPostFormModal
          open={isFormModalOpen}
          onOpenChange={setIsFormModalOpen}
          workPost={editingWorkPost}
          clients={clients}
          forcedClientId={forcedClientId}
          onSubmit={handleFormSubmit}
        />

        <WorkPostViewModal
          open={isViewModalOpen}
          onOpenChange={setIsViewModalOpen}
          workPost={selectedWorkPost}
          onStatusChange={handleStatusChange}
        />

        <WorkPostDeleteDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          workPost={selectedWorkPost}
          onConfirm={handleDeleteConfirm}
        />

        {/* Modal de gestão de QR Codes do posto */}
        <Dialog open={isQrModalOpen} onOpenChange={setIsQrModalOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                QR Codes do Posto
              </DialogTitle>
              <DialogDescription>
                Gere e baixe os QR Codes para este posto de trabalho. Cada QR pode ser impresso e afixado no local.
              </DialogDescription>
            </DialogHeader>

            {qrSelectedWorkPost && (
              <div className="space-y-4">
                <div className="text-sm">
                  <p><span className="font-semibold">Posto:</span> {qrSelectedWorkPost.name}</p>
                  <p className="text-muted-foreground">
                    Código: {qrSelectedWorkPost.postCode} • {qrSelectedWorkPost.city}, {qrSelectedWorkPost.state}
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-semibold">Novo QR Code</p>
                  <Input
                    placeholder="Descrição (opcional) - ex: Portaria Principal"
                    value={qrDescription}
                    onChange={(e) => setQrDescription(e.target.value)}
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Raio da área (m):</span>
                    <Input
                      type="number"
                      className="w-24"
                      value={qrRadius}
                      onChange={(e) => setQrRadius(Number(e.target.value) || 0)}
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={handleGenerateQrCode}
                    disabled={qrLoading || !user}
                  >
                    {qrLoading ? 'Gerando...' : 'Gerar QR Code'}
                  </Button>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-semibold">QR Codes existentes</p>
                  {qrLoading ? (
                    <p className="text-sm text-muted-foreground">Carregando...</p>
                  ) : qrCodes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nenhum QR Code gerado ainda para este posto.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {qrCodes.map((qr) => (
                        <div
                          key={qr.id}
                          className="flex items-center gap-3 rounded-md border px-3 py-3 text-sm"
                        >
                          {qrImageUrls[qr.id] ? (
                            <img
                              src={qrImageUrls[qr.id]}
                              alt={qr.description || 'QR Code do posto'}
                              className="h-20 w-20 shrink-0 rounded border bg-white p-1"
                            />
                          ) : (
                            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded border bg-muted">
                              <QrCode className="h-8 w-8 text-muted-foreground animate-pulse" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1 flex flex-col">
                            <span className="font-medium truncate">
                              {qr.description || 'QR Code sem descrição'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Raio: {qr.radiusMeters}m • {qr.isActive ? 'Ativo' : 'Inativo'}
                            </span>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1"
                              onClick={() => handleDownloadQrImage(qr)}
                            >
                              <Download className="h-4 w-4" />
                              Baixar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1"
                              onClick={() => handlePrintQrImage(qr)}
                            >
                              <Printer className="h-4 w-4" />
                              Imprimir
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleQrActive(qr)}
                            >
                              {qr.isActive ? 'Desativar' : 'Ativar'}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </StandardLayout>
  );
};

export default Postos;  