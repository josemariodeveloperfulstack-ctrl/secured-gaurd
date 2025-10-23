import React, { useState, useEffect } from 'react';
import { StandardLayout } from '@/components/StandardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  HardHat,
  Plus,
  Search,
  Filter,
  Calendar,
  User,
  Package,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Edit,
  Trash2,
  Download,
  Upload,
  Shield,
  X,
  FileText,
  UserPlus,
  RefreshCw,
  ArrowLeftRight,
  MessageSquare,
  Info
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { sstService, PersonalProtectiveEquipment, EPIDelivery, CreateEPIDeliveryDTO } from '@/services/sstService';
import { useToast } from '@/hooks/use-toast';

const EPIs: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Estados
  const [epis, setEpis] = useState<PersonalProtectiveEquipment[]>([]);
  const [deliveries, setDeliveries] = useState<EPIDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'epis' | 'deliveries'>('epis');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Estados para modal de entrega
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [deliveryForm, setDeliveryForm] = useState<CreateEPIDeliveryDTO>({
    employeeId: '',
    epiId: '',
    deliveryDate: '',
    quantity: 1,
    reason: 'ADMISSAO',
    notes: ''
  });

  // Carregar dados
  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [episData, deliveriesData] = await Promise.all([
        sstService.getPersonalProtectiveEquipments(),
        sstService.getEPIDeliveries()
      ]);
      setEpis(episData);
      setDeliveries(deliveriesData);
    } catch (err) {
      console.error('Erro ao carregar dados de EPIs:', err);
      setError('Erro ao carregar dados de EPIs');
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados de EPIs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filtrar EPIs
  const filteredEpis = epis.filter(epi => {
    const matchesSearch = epi.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      epi.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      epi.caNumber?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = categoryFilter === 'all' || epi.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  // Filtrar entregas
  const filteredDeliveries = deliveries.filter(delivery => {
    const matchesSearch = delivery.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      delivery.epiName?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  // Criar nova entrega
  const handleCreateDelivery = async () => {
    try {
      if (!deliveryForm.employeeId || !deliveryForm.epiId || !deliveryForm.deliveryDate) {
        toast({
          title: "Erro",
          description: "Preencha todos os campos obrigatórios",
          variant: "destructive",
        });
        return;
      }

      await sstService.createEPIDelivery(deliveryForm);
      toast({
        title: "Sucesso",
        description: "Entrega de EPI registrada com sucesso",
      });

      setShowDeliveryModal(false);
      setDeliveryForm({
        employeeId: '',
        epiId: '',
        deliveryDate: '',
        quantity: 1,
        reason: 'ADMISSAO',
        notes: ''
      });

      loadData();
    } catch (err) {
      console.error('Erro ao criar entrega de EPI:', err);
      toast({
        title: "Erro",
        description: "Não foi possível registrar a entrega de EPI",
        variant: "destructive",
      });
    }
  };

  // Obter cor da categoria
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'CABECA':
        return 'bg-blue-100 text-blue-800';
      case 'OLHOS':
        return 'bg-green-100 text-green-800';
      case 'AUDITIVO':
        return 'bg-yellow-100 text-yellow-800';
      case 'RESPIRATORIO':
        return 'bg-red-100 text-red-800';
      case 'MAOS':
        return 'bg-purple-100 text-purple-800';
      case 'PES':
        return 'bg-indigo-100 text-indigo-800';
      case 'CORPO':
        return 'bg-pink-100 text-pink-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Obter cor do motivo
  const getReasonColor = (reason: string) => {
    switch (reason) {
      case 'ADMISSAO':
        return 'bg-green-100 text-green-800';
      case 'REPOSICAO':
        return 'bg-blue-100 text-blue-800';
      case 'TROCA':
        return 'bg-yellow-100 text-yellow-800';
      case 'PERDA':
        return 'bg-red-100 text-red-800';
      case 'DANO':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <StandardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-4">
            <HardHat className="h-8 w-8 animate-pulse text-seguranca-yellow" />
            <p className="text-seguranca-lightgray">Carregando dados de EPIs...</p>
          </div>
        </div>
      </StandardLayout>
    );
  }

  if (error) {
    return (
      <StandardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-4">
            <AlertTriangle className="h-8 w-8 text-red-500" />
            <p className="text-red-500">{error}</p>
            <Button
              onClick={loadData}
              className="bg-seguranca-red hover:bg-seguranca-darkred"
            >
              Tentar Novamente
            </Button>
          </div>
        </div>
      </StandardLayout>
    );
  }

  return (
    <StandardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-seguranca-lightgray flex items-center gap-2">
              <HardHat className="h-8 w-8 text-seguranca-yellow" />
              Equipamentos de Proteção Individual (EPIs)
            </h1>
            <p className="text-gray-400 mt-1">Gestão de EPIs e Controle de Entregas</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate('/rh/sst')}
              className="border-gray-600 text-seguranca-lightgray hover:bg-seguranca-black"
            >
              Voltar
            </Button>
            <Button
              onClick={() => setShowDeliveryModal(true)}
              className="bg-seguranca-red hover:bg-seguranca-darkred"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Entrega
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-600">
          <Button
            variant={activeTab === 'epis' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('epis')}
            className={activeTab === 'epis' ? 'bg-seguranca-red' : 'text-seguranca-lightgray hover:bg-seguranca-black'}
          >
            <Package className="h-4 w-4 mr-2" />
            Catálogo de EPIs
          </Button>
          <Button
            variant={activeTab === 'deliveries' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('deliveries')}
            className={activeTab === 'deliveries' ? 'bg-seguranca-red' : 'text-seguranca-lightgray hover:bg-seguranca-black'}
          >
            <Shield className="h-4 w-4 mr-2" />
            Entregas
          </Button>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="search" className="text-seguranca-lightgray">Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder={activeTab === 'epis' ? 'Nome do EPI, descrição, CA...' : 'Funcionário, EPI...'}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                  />
                </div>
              </div>

              {activeTab === 'epis' && (
                <div>
                  <Label htmlFor="category" className="text-seguranca-lightgray">Categoria</Label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="bg-seguranca-black border-gray-600 text-seguranca-lightgray">
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="CABECA">Cabeça</SelectItem>
                      <SelectItem value="OLHOS">Olhos</SelectItem>
                      <SelectItem value="AUDITIVO">Auditivo</SelectItem>
                      <SelectItem value="RESPIRATORIO">Respiratório</SelectItem>
                      <SelectItem value="MAOS">Mãos</SelectItem>
                      <SelectItem value="PES">Pés</SelectItem>
                      <SelectItem value="CORPO">Corpo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Conteúdo das Tabs */}
        {activeTab === 'epis' ? (
          /* Catálogo de EPIs */
          <Card className="bg-seguranca-graphite border-gray-600">
            <CardHeader>
              <CardTitle className="text-seguranca-lightgray">
                Catálogo de EPIs ({filteredEpis.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredEpis.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredEpis.map((epi) => (
                    <div key={epi.id} className="p-4 bg-seguranca-black rounded-lg border border-gray-600">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-seguranca-lightgray mb-1">
                            {epi.name}
                          </h3>
                          <Badge className={getCategoryColor(epi.category)}>
                            {epi.category}
                          </Badge>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/rh/sst/epis/${epi.id}`)}
                            className="border-gray-600 text-seguranca-lightgray"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <p className="text-sm text-gray-400 mb-3">{epi.description}</p>

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">CA:</span>
                          <span className="text-seguranca-lightgray">{epi.caNumber}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Validade:</span>
                          <span className="text-seguranca-lightgray">{epi.validityMonths} meses</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Status:</span>
                          <Badge className={epi.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {epi.isActive ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-seguranca-lightgray">Nenhum EPI encontrado</p>
                  <p className="text-gray-400 text-sm mt-1">
                    {searchTerm || categoryFilter !== 'all'
                      ? 'Tente ajustar os filtros de busca'
                      : 'Nenhum EPI cadastrado no sistema'
                    }
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          /* Entregas de EPIs */
          <Card className="bg-seguranca-graphite border-gray-600">
            <CardHeader>
              <CardTitle className="text-seguranca-lightgray">
                Entregas de EPIs ({filteredDeliveries.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredDeliveries.length > 0 ? (
                <div className="space-y-4">
                  {filteredDeliveries.map((delivery) => (
                    <div key={delivery.id} className="p-4 bg-seguranca-black rounded-lg border border-gray-600">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-seguranca-lightgray">
                              {delivery.employeeName}
                            </h3>
                            <Badge className={getReasonColor(delivery.reason)}>
                              {delivery.reason}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-400">
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4" />
                              <span>{delivery.epiName}</span>
                            </div>

                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <span>
                                {new Date(delivery.deliveryDate).toLocaleDateString('pt-BR')}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              <span>Qtd: {delivery.quantity}</span>
                            </div>
                          </div>

                          {delivery.notes && (
                            <p className="text-sm text-gray-400 mt-2">{delivery.notes}</p>
                          )}

                          <p className="text-xs text-gray-500 mt-2">
                            Entregue por: {delivery.deliveredBy}
                          </p>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/rh/sst/entregas/${delivery.id}`)}
                            className="border-gray-600 text-seguranca-lightgray"
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Editar
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-seguranca-lightgray">Nenhuma entrega encontrada</p>
                  <p className="text-gray-400 text-sm mt-1">
                    {searchTerm
                      ? 'Tente ajustar os filtros de busca'
                      : 'Clique em "Nova Entrega" para registrar a primeira entrega'
                    }
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Modal de Entrega - Versão Melhorada */}
        {showDeliveryModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-seguranca-graphite border border-gray-600 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-600">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-seguranca-red/20 rounded-lg flex items-center justify-center">
                    <Shield className="w-5 h-5 text-seguranca-red" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-seguranca-lightgray">
                      Nova Entrega de EPI
                    </h2>
                    <p className="text-sm text-gray-400">
                      Registre a entrega de equipamentos de proteção individual
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeliveryModal(false)}
                  className="text-gray-400 hover:text-white hover:bg-gray-700"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Funcionário */}
                  <div className="md:col-span-2">
                    <Label htmlFor="employeeId" className="text-seguranca-lightgray font-medium flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Funcionário *
                    </Label>
                    <div className="mt-2">
                      <Input
                        id="employeeId"
                        placeholder="Digite o ID ou nome do funcionário"
                        value={deliveryForm.employeeId}
                        onChange={(e) => setDeliveryForm({ ...deliveryForm, employeeId: e.target.value })}
                        className="bg-seguranca-black border-gray-600 text-seguranca-lightgray focus:border-seguranca-red focus:ring-seguranca-red/20 h-11"
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        Informe o ID ou nome completo do funcionário
                      </p>
                    </div>
                  </div>

                  {/* EPI */}
                  <div className="md:col-span-2">
                    <Label htmlFor="epiId" className="text-seguranca-lightgray font-medium flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      EPI *
                    </Label>
                    <div className="mt-2">
                      <Select
                        value={deliveryForm.epiId}
                        onValueChange={(value) => setDeliveryForm({ ...deliveryForm, epiId: value })}
                      >
                        <SelectTrigger className="bg-seguranca-black border-gray-600 text-seguranca-lightgray focus:border-seguranca-red h-11">
                          <SelectValue placeholder="Selecione o EPI" />
                        </SelectTrigger>
                        <SelectContent className="bg-seguranca-black border-gray-600">
                          {epis.filter(epi => epi.isActive).map((epi) => (
                            <SelectItem key={epi.id} value={epi.id} className="text-seguranca-lightgray hover:bg-seguranca-graphite">
                              <div className="flex items-center gap-2">
                                <Shield className="w-4 h-4 text-seguranca-red" />
                                <div>
                                  <div className="font-medium">{epi.name}</div>
                                  <div className="text-xs text-gray-400">CA: {epi.caNumber}</div>
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Data da Entrega */}
                  <div>
                    <Label htmlFor="deliveryDate" className="text-seguranca-lightgray font-medium flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Data da Entrega *
                    </Label>
                    <div className="mt-2">
                      <Input
                        id="deliveryDate"
                        type="date"
                        value={deliveryForm.deliveryDate}
                        onChange={(e) => setDeliveryForm({ ...deliveryForm, deliveryDate: e.target.value })}
                        className="bg-seguranca-black border-gray-600 text-seguranca-lightgray focus:border-seguranca-red focus:ring-seguranca-red/20 h-11"
                      />
                    </div>
                  </div>

                  {/* Quantidade */}
                  <div>
                    <Label htmlFor="quantity" className="text-seguranca-lightgray font-medium flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      Quantidade
                    </Label>
                    <div className="mt-2">
                      <Input
                        id="quantity"
                        type="number"
                        min="1"
                        max="999"
                        value={deliveryForm.quantity}
                        onChange={(e) => setDeliveryForm({ ...deliveryForm, quantity: parseInt(e.target.value) || 1 })}
                        className="bg-seguranca-black border-gray-600 text-seguranca-lightgray focus:border-seguranca-red focus:ring-seguranca-red/20 h-11"
                      />
                    </div>
                  </div>

                  {/* Motivo */}
                  <div className="md:col-span-2">
                    <Label htmlFor="reason" className="text-seguranca-lightgray font-medium flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Motivo da Entrega
                    </Label>
                    <div className="mt-2">
                      <Select
                        value={deliveryForm.reason}
                        onValueChange={(value) => setDeliveryForm({ ...deliveryForm, reason: value })}
                      >
                        <SelectTrigger className="bg-seguranca-black border-gray-600 text-seguranca-lightgray focus:border-seguranca-red h-11">
                          <SelectValue placeholder="Selecione o motivo" />
                        </SelectTrigger>
                        <SelectContent className="bg-seguranca-black border-gray-600">
                          <SelectItem value="ADMISSAO" className="text-seguranca-lightgray hover:bg-seguranca-graphite">
                            <div className="flex items-center gap-2">
                              <UserPlus className="w-4 h-4 text-green-400" />
                              Admissão
                            </div>
                          </SelectItem>
                          <SelectItem value="REPOSICAO" className="text-seguranca-lightgray hover:bg-seguranca-graphite">
                            <div className="flex items-center gap-2">
                              <RefreshCw className="w-4 h-4 text-blue-400" />
                              Reposição
                            </div>
                          </SelectItem>
                          <SelectItem value="TROCA" className="text-seguranca-lightgray hover:bg-seguranca-graphite">
                            <div className="flex items-center gap-2">
                              <ArrowLeftRight className="w-4 h-4 text-yellow-400" />
                              Troca
                            </div>
                          </SelectItem>
                          <SelectItem value="PERDA" className="text-seguranca-lightgray hover:bg-seguranca-graphite">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4 text-orange-400" />
                              Perda
                            </div>
                          </SelectItem>
                          <SelectItem value="DANO" className="text-seguranca-lightgray hover:bg-seguranca-graphite">
                            <div className="flex items-center gap-2">
                              <XCircle className="w-4 h-4 text-red-400" />
                              Dano
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Observações */}
                  <div className="md:col-span-2">
                    <Label htmlFor="notes" className="text-seguranca-lightgray font-medium flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Observações
                    </Label>
                    <div className="mt-2">
                      <Textarea
                        id="notes"
                        placeholder="Observações adicionais sobre a entrega..."
                        value={deliveryForm.notes}
                        onChange={(e) => setDeliveryForm({ ...deliveryForm, notes: e.target.value })}
                        className="bg-seguranca-black border-gray-600 text-seguranca-lightgray focus:border-seguranca-red focus:ring-seguranca-red/20 resize-none"
                        rows={4}
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        Máximo de 500 caracteres
                      </p>
                    </div>
                  </div>
                </div>

                {/* Info Card */}
                <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-medium text-blue-400 mb-1">
                        Informações Importantes
                      </h4>
                      <ul className="text-xs text-gray-300 space-y-1">
                        <li>• Certifique-se de que o funcionário está presente para receber o EPI</li>
                        <li>• Verifique se o EPI está em perfeitas condições antes da entrega</li>
                        <li>• O registro será permanente e não poderá ser alterado após confirmação</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between p-6 border-t border-gray-600 bg-seguranca-black/50">
                <div className="text-xs text-gray-400">
                  * Campos obrigatórios
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowDeliveryModal(false)}
                    className="border-gray-600 text-seguranca-lightgray hover:bg-gray-700 hover:border-gray-500"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleCreateDelivery}
                    className="bg-seguranca-red hover:bg-seguranca-darkred text-white shadow-lg"
                    disabled={!deliveryForm.employeeId || !deliveryForm.epiId || !deliveryForm.deliveryDate}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Registrar Entrega
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </StandardLayout>
  );
};

export default EPIs;

