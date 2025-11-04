import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import MeasurementCompleteTable from '@/components/financeiro/MeasurementCompleteTable';
import MeasurementSimpleTable from '@/components/financeiro/MeasurementSimpleTable';
import {
  Calculator,
  DollarSign,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Calendar,
  Users,
  Target,
  RefreshCw,
  Download,
  Upload,
  Settings,
  AlertTriangle,
  CheckCircle,
  Clock,
  Building,
  FileText,
  ClipboardList,
  CheckSquare,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import api from '@/lib/axios';

interface MeasurementItem {
  id: string;
  itemNumber: number;
  code: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalValue: number;
  costCenterId?: string;
  costCenterName?: string;
}

interface MeasurementBulletin {
  id: string;
  companyName: string;
  periodStart: string;
  periodEnd: string;
  contractNumber: string;
  contractStart?: string;
  contractEnd?: string;
  nfNumber?: string;
  elaboratedBy: string;
  measuredBy: string;
  validatedBy?: string;
  checkedBy?: string;
  status: 'DRAFT' | 'PENDING' | 'VALIDATED' | 'CANCELLED';
  subtotal: number;
  items: MeasurementItem[];
  client?: {
    id: string;
    name: string;
  };
  contract?: {
    id: string;
    number: string;
  };
  unit?: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt?: string;
  notes?: string;
}

interface MeasurementSummary {
  totalBulletins: number;
  draftBulletins: number;
  pendingBulletins: number;
  validatedBulletins: number;
  totalValue: number;
  averageValue: number;
}

const MedicoesTab: React.FC = () => {
  const { toast } = useToast();
  
  // Estados
  const [loading, setLoading] = useState(true);
  const [bulletins, setBulletins] = useState<MeasurementBulletin[]>([]);
  const [summary, setSummary] = useState<MeasurementSummary>({
    totalBulletins: 0,
    draftBulletins: 0,
    pendingBulletins: 0,
    validatedBulletins: 0,
    totalValue: 0,
    averageValue: 0
  });
  const [showFormModal, setShowFormModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingBulletin, setEditingBulletin] = useState<MeasurementBulletin | null>(null);
  const [viewingBulletin, setViewingBulletin] = useState<MeasurementBulletin | null>(null);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('TODOS');
  const [contractFilter, setContractFilter] = useState<string>('');
  
  // Formulário
  const [formData, setFormData] = useState<Partial<MeasurementBulletin>>({
    companyName: 'PROMOVER VIGILÂNCIA PATRIMONIAL LTDA',
    periodStart: '',
    periodEnd: '',
    contractNumber: '',
    elaboratedBy: '',
    measuredBy: '',
    status: 'DRAFT',
    notes: ''
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-100 text-gray-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'VALIDATED': return 'bg-green-100 text-green-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'DRAFT': return <FileText className="h-4 w-4" />;
      case 'PENDING': return <Clock className="h-4 w-4" />;
      case 'VALIDATED': return <CheckCircle className="h-4 w-4" />;
      case 'CANCELLED': return <X className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'Rascunho';
      case 'PENDING': return 'Pendente';
      case 'VALIDATED': return 'Validado';
      case 'CANCELLED': return 'Cancelado';
      default: return status;
    }
  };

  const carregarDados = async () => {
    try {
      setLoading(true);
      
      // Carregar boletins de medição da API
      const response = await api.get('/measurements/all');
      setBulletins(response.data);

      // Calcular resumo
      const totalBulletins = response.data.length;
      const draftBulletins = response.data.filter((b: MeasurementBulletin) => b.status === 'DRAFT').length;
      const pendingBulletins = response.data.filter((b: MeasurementBulletin) => b.status === 'PENDING').length;
      const validatedBulletins = response.data.filter((b: MeasurementBulletin) => b.status === 'VALIDATED').length;
      const totalValue = response.data.reduce((sum: number, b: MeasurementBulletin) => sum + b.subtotal, 0);
      const averageValue = totalBulletins > 0 ? totalValue / totalBulletins : 0;

      setSummary({
        totalBulletins,
        draftBulletins,
        pendingBulletins,
        validatedBulletins,
        totalValue,
        averageValue
      });

    } catch (error) {
      console.error('Erro ao carregar boletins de medição:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar boletins de medição",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSalvarBoletim = async () => {
    try {
      if (editingBulletin) {
        // Atualizar boletim existente
        await api.put(`/measurements/${editingBulletin.id}`, formData);
        toast({
          title: "Sucesso",
          description: "Boletim de medição atualizado com sucesso",
        });
      } else {
        // Criar novo boletim
        await api.post('/measurements', formData);
        toast({
          title: "Sucesso",
          description: "Boletim de medição criado com sucesso",
        });
      }
      
      setShowFormModal(false);
      setEditingBulletin(null);
      setFormData({
        companyName: 'PROMOVER VIGILÂNCIA PATRIMONIAL LTDA',
        periodStart: '',
        periodEnd: '',
        contractNumber: '',
        elaboratedBy: '',
        measuredBy: '',
        status: 'DRAFT',
        notes: ''
      });
      
      carregarDados();
    } catch (error) {
      console.error('Erro ao salvar boletim:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar boletim de medição",
        variant: "destructive",
      });
    }
  };

  const handleExcluirBoletim = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este boletim de medição?')) return;
    
    try {
      await api.delete(`/measurements/${id}`);
      toast({
        title: "Sucesso",
        description: "Boletim de medição excluído com sucesso",
      });
      carregarDados();
    } catch (error) {
      console.error('Erro ao excluir boletim:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir boletim de medição",
        variant: "destructive",
      });
    }
  };

  const handleValidarBoletim = async (id: string) => {
    try {
      await api.patch(`/measurements/${id}/validate`, null, {
        params: {
          validatedBy: 'Usuário Atual',
          checkedBy: 'Usuário Atual'
        }
      });
      toast({
        title: "Sucesso",
        description: "Boletim de medição validado com sucesso",
      });
      carregarDados();
    } catch (error) {
      console.error('Erro ao validar boletim:', error);
      toast({
        title: "Erro",
        description: "Erro ao validar boletim de medição",
        variant: "destructive",
      });
    }
  };

  const handleEditarBoletim = (bulletin: MeasurementBulletin) => {
    setEditingBulletin(bulletin);
    setFormData({
      companyName: bulletin.companyName,
      periodStart: bulletin.periodStart,
      periodEnd: bulletin.periodEnd,
      contractNumber: bulletin.contractNumber,
      elaboratedBy: bulletin.elaboratedBy,
      measuredBy: bulletin.measuredBy,
      status: bulletin.status,
      notes: bulletin.notes || ''
    });
    setShowFormModal(true);
  };

  const handleVisualizarBoletim = (bulletin: MeasurementBulletin) => {
    setViewingBulletin(bulletin);
    setShowViewModal(true);
  };

  const handleNovoBoletim = () => {
    setEditingBulletin(null);
    setFormData({
      companyName: 'PROMOVER VIGILÂNCIA PATRIMONIAL LTDA',
      periodStart: '',
      periodEnd: '',
      contractNumber: '',
      elaboratedBy: '',
      measuredBy: '',
      status: 'DRAFT',
      notes: ''
    });
    setShowFormModal(true);
  };

  // Filtrar boletins
  const filteredBulletins = bulletins.filter(bulletin => {
    const matchesSearch = searchTerm === '' || 
      bulletin.contractNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bulletin.elaboratedBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bulletin.measuredBy.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'TODOS' || bulletin.status === statusFilter;
    const matchesContract = contractFilter === '' || bulletin.contractNumber.includes(contractFilter);
    
    return matchesSearch && matchesStatus && matchesContract;
  });

  useEffect(() => {
    carregarDados();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-seguranca-yellow"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-seguranca-lightgray flex items-center gap-2">
            <Calculator className="h-6 w-6 text-seguranca-yellow" />
            Medições
          </h2>
          <p className="text-gray-400 mt-1">
            Gerencie boletins de medição e acompanhe contratos
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={carregarDados}
            variant="outline"
            size="sm"
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button 
            onClick={handleNovoBoletim}
            className="bg-seguranca-yellow hover:bg-yellow-600 text-black"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Boletim
          </Button>
        </div>
      </div>

      {/* Tabs - Padrão SST */}
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-seguranca-graphite border-gray-600">
          <TabsTrigger value="dashboard" className="text-seguranca-lightgray data-[state='active']:bg-seguranca-red text-xs sm:text-sm">
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="completa" className="text-seguranca-lightgray data-[state='active']:bg-seguranca-red text-xs sm:text-sm">
            Completa
          </TabsTrigger>
          <TabsTrigger value="simplificada" className="text-seguranca-lightgray data-[state='active']:bg-seguranca-red text-xs sm:text-sm">
            Simplificada
          </TabsTrigger>
        </TabsList>

        {/* Tab Dashboard */}
        <TabsContent value="dashboard" className="space-y-6 mt-6">

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-blue-600/20 border-blue-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-200 text-sm">Total de Boletins</p>
                <p className="text-2xl font-bold text-white">{summary.totalBulletins}</p>
                <p className="text-blue-200 text-xs">{summary.draftBulletins} rascunhos</p>
              </div>
              <ClipboardList className="h-8 w-8 text-blue-300" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-600/20 border-green-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-200 text-sm">Validados</p>
                <p className="text-2xl font-bold text-white">{summary.validatedBulletins}</p>
                <p className="text-green-200 text-xs">Boletins aprovados</p>
              </div>
              <CheckSquare className="h-8 w-8 text-green-300" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-yellow-600/20 border-yellow-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-200 text-sm">Pendentes</p>
                <p className="text-2xl font-bold text-white">{summary.pendingBulletins}</p>
                <p className="text-yellow-200 text-xs">Aguardando validação</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-300" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-600/20 border-purple-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-200 text-sm">Valor Total</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(summary.totalValue)}</p>
                <p className="text-purple-200 text-xs">Média: {formatCurrency(summary.averageValue)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-purple-300" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="bg-seguranca-graphite border-gray-600">
        <CardHeader>
          <CardTitle className="text-seguranca-lightgray flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Contrato, elaborado por, medido por..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-seguranca-black border-gray-600 text-white"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-seguranca-black border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos</SelectItem>
                  <SelectItem value="DRAFT">Rascunho</SelectItem>
                  <SelectItem value="PENDING">Pendente</SelectItem>
                  <SelectItem value="VALIDATED">Validado</SelectItem>
                  <SelectItem value="CANCELLED">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Contrato</label>
              <Input
                placeholder="Número do contrato"
                value={contractFilter}
                onChange={(e) => setContractFilter(e.target.value)}
                className="bg-seguranca-black border-gray-600 text-white"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Boletins */}
      <Card className="bg-seguranca-graphite border-gray-600">
        <CardHeader>
          <CardTitle className="text-seguranca-lightgray">
            Boletins de Medição ({filteredBulletins.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-600">
                  <TableHead className="text-gray-300">Contrato</TableHead>
                  <TableHead className="text-gray-300">Período</TableHead>
                  <TableHead className="text-gray-300">Elaborado por</TableHead>
                  <TableHead className="text-gray-300">Medido por</TableHead>
                  <TableHead className="text-gray-300">Valor</TableHead>
                  <TableHead className="text-gray-300">Status</TableHead>
                  <TableHead className="text-gray-300">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBulletins.map((bulletin) => (
                  <TableRow key={bulletin.id} className="border-gray-600 hover:bg-gray-700/50">
                    <TableCell className="text-white font-medium">
                      {bulletin.contractNumber}
                    </TableCell>
                    <TableCell className="text-gray-300">
                      {format(new Date(bulletin.periodStart), 'dd/MM/yy', { locale: ptBR })} - {format(new Date(bulletin.periodEnd), 'dd/MM/yy', { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-gray-300">
                      {bulletin.elaboratedBy}
                    </TableCell>
                    <TableCell className="text-gray-300">
                      {bulletin.measuredBy}
                    </TableCell>
                    <TableCell className="text-white font-medium">
                      {formatCurrency(bulletin.subtotal)}
                    </TableCell>
                    <TableCell>
                      <Badge className={`${getStatusColor(bulletin.status)} flex items-center gap-1 w-fit`}>
                        {getStatusIcon(bulletin.status)}
                        {getStatusText(bulletin.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleVisualizarBoletim(bulletin)}
                          className="text-blue-400 hover:text-blue-300"
                          title="Visualizar boletim"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditarBoletim(bulletin)}
                          className="text-yellow-400 hover:text-yellow-300"
                          title="Editar boletim"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {bulletin.status === 'PENDING' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleValidarBoletim(bulletin.id)}
                            className="text-green-400 hover:text-green-300"
                            title="Validar boletim"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleExcluirBoletim(bulletin.id)}
                          className="text-red-400 hover:text-red-300"
                          title="Excluir boletim"
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
                  </CardContent>
        </Card>
        </TabsContent>

        {/* Tab Completa */}
        <TabsContent value="completa" className="mt-6">
          <MeasurementCompleteTable
            onView={handleVisualizarBoletim}
            onEdit={handleEditarBoletim}
            onDelete={handleExcluirBoletim}
            onCreate={handleNovoBoletim}
            onValidate={handleValidarBoletim}
          />
        </TabsContent>

        {/* Tab Simplificada */}
        <TabsContent value="simplificada" className="mt-6">
          <MeasurementSimpleTable
            onView={handleVisualizarBoletim}
            onEdit={handleEditarBoletim}
            onDelete={handleExcluirBoletim}
            onCreate={handleNovoBoletim}
            onValidate={handleValidarBoletim}
          />
        </TabsContent>
      </Tabs>

      {/* Modal de Formulário */}
      <Dialog open={showFormModal} onOpenChange={setShowFormModal}>
        <DialogContent className="max-w-2xl bg-seguranca-graphite border-gray-600">
          <DialogHeader>
            <DialogTitle className="text-seguranca-lightgray">
              {editingBulletin ? 'Editar Boletim' : 'Novo Boletim de Medição'}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {editingBulletin ? 'Atualize os dados do boletim' : 'Preencha os dados do novo boletim de medição'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Nome da Empresa</label>
              <Input
                value={formData.companyName}
                onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                className="bg-seguranca-black border-gray-600 text-white"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Número do Contrato *</label>
                <Input
                  value={formData.contractNumber}
                  onChange={(e) => setFormData({...formData, contractNumber: e.target.value})}
                  placeholder="Ex: CONT-2024-001"
                  className="bg-seguranca-black border-gray-600 text-white"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Status</label>
                <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value as any})}>
                  <SelectTrigger className="bg-seguranca-black border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Rascunho</SelectItem>
                    <SelectItem value="PENDING">Pendente</SelectItem>
                    <SelectItem value="VALIDATED">Validado</SelectItem>
                    <SelectItem value="CANCELLED">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Data Início do Período *</label>
                <Input
                  type="date"
                  value={formData.periodStart}
                  onChange={(e) => setFormData({...formData, periodStart: e.target.value})}
                  className="bg-seguranca-black border-gray-600 text-white"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Data Fim do Período *</label>
                <Input
                  type="date"
                  value={formData.periodEnd}
                  onChange={(e) => setFormData({...formData, periodEnd: e.target.value})}
                  className="bg-seguranca-black border-gray-600 text-white"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Elaborado por *</label>
                <Input
                  value={formData.elaboratedBy}
                  onChange={(e) => setFormData({...formData, elaboratedBy: e.target.value})}
                  placeholder="Nome do responsável"
                  className="bg-seguranca-black border-gray-600 text-white"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Medido por *</label>
                <Input
                  value={formData.measuredBy}
                  onChange={(e) => setFormData({...formData, measuredBy: e.target.value})}
                  placeholder="Nome do responsável"
                  className="bg-seguranca-black border-gray-600 text-white"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Observações</label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Observações adicionais"
                className="bg-seguranca-black border-gray-600 text-white"
                rows={3}
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowFormModal(false)}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSalvarBoletim}
              className="bg-seguranca-yellow hover:bg-yellow-600 text-black"
            >
              {editingBulletin ? 'Atualizar' : 'Criar'} Boletim
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Visualização */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="max-w-4xl bg-seguranca-graphite border-gray-600">
          <DialogHeader>
            <DialogTitle className="text-seguranca-lightgray">
              Detalhes do Boletim de Medição
            </DialogTitle>
          </DialogHeader>
          
          {viewingBulletin && (
            <div className="space-y-6">
              {/* Informações Básicas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-300">Empresa</label>
                  <p className="text-white">{viewingBulletin.companyName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-300">Contrato</label>
                  <p className="text-white font-medium">{viewingBulletin.contractNumber}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-300">Período</label>
                  <p className="text-white">
                    {format(new Date(viewingBulletin.periodStart), 'dd/MM/yyyy', { locale: ptBR })} - {format(new Date(viewingBulletin.periodEnd), 'dd/MM/yyyy', { locale: ptBR })}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-300">Status</label>
                  <Badge className={`${getStatusColor(viewingBulletin.status)} flex items-center gap-1 w-fit`}>
                    {getStatusIcon(viewingBulletin.status)}
                    {getStatusText(viewingBulletin.status)}
                  </Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-300">Elaborado por</label>
                  <p className="text-white">{viewingBulletin.elaboratedBy}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-300">Medido por</label>
                  <p className="text-white">{viewingBulletin.measuredBy}</p>
                </div>
              </div>
              
              {viewingBulletin.validatedBy && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-300">Validado por</label>
                    <p className="text-white">{viewingBulletin.validatedBy}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-300">Verificado por</label>
                    <p className="text-white">{viewingBulletin.checkedBy}</p>
                  </div>
                </div>
              )}
              
              <div>
                <label className="text-sm font-medium text-gray-300">Valor Total</label>
                <p className="text-white text-2xl font-bold">{formatCurrency(viewingBulletin.subtotal)}</p>
              </div>
              
              {/* Itens da Medição */}
              {viewingBulletin.items && viewingBulletin.items.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-2 block">Itens da Medição</label>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-gray-600">
                          <TableHead className="text-gray-300">Item</TableHead>
                          <TableHead className="text-gray-300">Código</TableHead>
                          <TableHead className="text-gray-300">Descrição</TableHead>
                          <TableHead className="text-gray-300">Unidade</TableHead>
                          <TableHead className="text-gray-300">Quantidade</TableHead>
                          <TableHead className="text-gray-300">Preço Unit.</TableHead>
                          <TableHead className="text-gray-300">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {viewingBulletin.items.map((item) => (
                          <TableRow key={item.id} className="border-gray-600">
                            <TableCell className="text-white">{item.itemNumber}</TableCell>
                            <TableCell className="text-gray-300">{item.code}</TableCell>
                            <TableCell className="text-gray-300">{item.description}</TableCell>
                            <TableCell className="text-gray-300">{item.unit}</TableCell>
                            <TableCell className="text-gray-300">{item.quantity}</TableCell>
                            <TableCell className="text-gray-300">{formatCurrency(item.unitPrice)}</TableCell>
                            <TableCell className="text-white font-medium">{formatCurrency(item.totalValue)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
              
              {viewingBulletin.notes && (
                <div>
                  <label className="text-sm font-medium text-gray-300">Observações</label>
                  <p className="text-white">{viewingBulletin.notes}</p>
                </div>
              )}
            </div>
          )}
          
          <div className="flex justify-end pt-4">
            <Button
              variant="outline"
              onClick={() => setShowViewModal(false)}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MedicoesTab;
