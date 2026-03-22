import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { StandardLayout } from '@/components/StandardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
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
  Info,
  ChevronsUpDown,
  Check,
  Building2
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { sstService, PersonalProtectiveEquipment, EPIDelivery, CreateEPIDeliveryDTO } from '@/services/sstService';
import { employeeService, Employee } from '@/services/employeeService';
import { companyService } from '@/services/companyService';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { formatCPF } from '@/utils/validation';

const MIN_EMPLOYEE_SEARCH_CHARS = 3;

function resolveCompanyIdFromEmployee(emp: Employee | undefined): string {
  if (!emp) return '';
  const raw = (emp as { companyId?: string }).companyId ?? emp.company?.id;
  return raw != null && String(raw).trim() !== '' ? String(raw) : '';
}

const EPIs: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const { toast } = useToast();
  const { user } = useAuth();

  // Estados
  const [epis, setEpis] = useState<PersonalProtectiveEquipment[]>([]);
  const [deliveries, setDeliveries] = useState<EPIDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'epis' | 'deliveries'>('epis');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [companies, setCompanies] = useState<Array<{ id: string; name?: string; sigla?: string; tradeName?: string; cnpj?: string }>>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [deliveryCompanyId, setDeliveryCompanyId] = useState('');
  const [employeePickerOpen, setEmployeePickerOpen] = useState(false);
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState('');

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
  const [uniformType, setUniformType] = useState<'COMPLETO' | 'INDIVIDUAL' | ''>('');
  const [uniformItems, setUniformItems] = useState<string[]>([]);

  // Estado para modal de visualização de EPI
  const [selectedEPI, setSelectedEPI] = useState<PersonalProtectiveEquipment | null>(null);
  const [showEPIDetailModal, setShowEPIDetailModal] = useState(false);

  // Carregar dados
  const loadData = useCallback(async () => {
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
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Se houver um ID na URL, buscar o EPI específico e mostrar detalhes
  useEffect(() => {
    if (id) {
      // Primeiro, tentar encontrar nos EPIs já carregados
      if (epis.length > 0) {
        const epi = epis.find(e => e.id === id);
        if (epi) {
          setSelectedEPI(epi);
          setShowEPIDetailModal(true);
          return;
        }
      }
      
      // Se não encontrou, buscar diretamente do backend
      const fetchEPI = async () => {
        try {
          const epi = await sstService.getPersonalProtectiveEquipmentById(id);
          if (epi) {
            setSelectedEPI(epi);
            setShowEPIDetailModal(true);
          } else {
            toast({
              title: "EPI não encontrado",
              description: "O EPI solicitado não foi encontrado.",
              variant: "destructive",
            });
            navigate('/rh/sst/epis');
          }
        } catch (err: any) {
          console.error('Erro ao buscar EPI:', err);
          const errorMessage = err.response?.status === 404 
            ? "O EPI solicitado não foi encontrado."
            : err.response?.data?.message || "Não foi possível carregar os detalhes do EPI.";
          
          toast({
            title: "Erro",
            description: errorMessage,
            variant: "destructive",
          });
          navigate('/rh/sst/epis');
        }
      };

      fetchEPI();
    } else {
      // Se não há ID, fechar o modal se estiver aberto
      if (showEPIDetailModal) {
        setShowEPIDetailModal(false);
        setSelectedEPI(null);
      }
    }
  }, [id, epis, navigate, toast, showEPIDetailModal]);

  // Carregar funcionários quando o modal abrir
  const loadEmployees = useCallback(async () => {
    try {
      setLoadingEmployees(true);
      const employeesData = await employeeService.getAllEmployees();
      // Filtrar apenas funcionários ativos
      const activeEmployees = employeesData.filter(emp => emp.status === 'ACTIVE' || !emp.status);
      setEmployees(activeEmployees);
    } catch (err) {
      console.error('Erro ao carregar funcionários:', err);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os funcionários",
        variant: "destructive",
      });
    } finally {
      setLoadingEmployees(false);
    }
  }, [toast]);

  const loadCompanies = useCallback(async () => {
    try {
      setLoadingCompanies(true);
      const data = await companyService.getAllCompanies();
      setCompanies(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Erro ao carregar empresas:', err);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as empresas',
        variant: 'destructive',
      });
    } finally {
      setLoadingCompanies(false);
    }
  }, [toast]);

  // Garantir que os EPIs e funcionários sejam carregados quando o modal abrir
  useEffect(() => {
    if (showDeliveryModal) {
      if (epis.length === 0) {
        loadData();
      }
      if (employees.length === 0) {
        loadEmployees();
      }
      if (companies.length === 0) {
        loadCompanies();
      }
    }
  }, [showDeliveryModal, epis.length, employees.length, companies.length, loadData, loadEmployees, loadCompanies]);

  const deliveryEmployee = useMemo(
    () => employees.find((e) => e.id === deliveryForm.employeeId),
    [employees, deliveryForm.employeeId]
  );

  const filteredEmployeesForDeliveryPicker = useMemo(() => {
    const q = employeeSearchQuery.trim().toLowerCase();
    if (q.length < MIN_EMPLOYEE_SEARCH_CHARS) return [];
    const qDigits = q.replace(/\D/g, '');
    return employees.filter((f) => {
      const name = (f.name || '').toLowerCase();
      const mat = (f.registrationNumber || '').toLowerCase();
      const cpfDigits = (f.cpf || (f as { document?: string }).document || '').replace(/\D/g, '');
      if (name.includes(q) || mat.includes(q)) return true;
      if (qDigits.length >= MIN_EMPLOYEE_SEARCH_CHARS && cpfDigits.includes(qDigits)) return true;
      return false;
    });
  }, [employees, employeeSearchQuery]);

  const handleSelectDeliveryEmployee = (id: string) => {
    const emp = employees.find((e) => e.id === id);
    const cid = resolveCompanyIdFromEmployee(emp);
    setDeliveryForm((prev) => ({ ...prev, employeeId: id }));
    setDeliveryCompanyId(cid);
    setEmployeePickerOpen(false);
    setEmployeeSearchQuery('');
    if (emp && !cid) {
      toast({
        title: 'Atenção',
        description: 'Funcionário sem empresa vinculada no cadastro. Selecione a empresa manualmente.',
      });
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

  // Resetar formulário
  const resetDeliveryForm = () => {
    setDeliveryForm({
      employeeId: '',
      epiId: '',
      deliveryDate: '',
      quantity: 1,
      reason: 'ADMISSAO',
      notes: ''
    });
    setUniformType('');
    setUniformItems([]);
    setDeliveryCompanyId('');
    setEmployeeSearchQuery('');
    setEmployeePickerOpen(false);
  };

  // Fechar modal e resetar formulário
  const handleCloseModal = () => {
    setShowDeliveryModal(false);
    resetDeliveryForm();
  };

  // Verificar se o EPI selecionado é Uniforme de Trabalho
  const selectedEPIForDelivery = epis.find(epi => epi.id.toString() === deliveryForm.epiId);
  const isUniformeTrabalho = selectedEPIForDelivery?.name?.toLowerCase().includes('uniforme de trabalho') || 
                             selectedEPIForDelivery?.name?.toLowerCase().includes('uniforme');

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

      // Validar uniforme se for Uniforme de Trabalho
      if (isUniformeTrabalho) {
        if (!uniformType) {
          toast({
            title: "Erro",
            description: "Selecione se é uniforme completo ou individual",
            variant: "destructive",
          });
          return;
        }
        if (uniformType === 'INDIVIDUAL' && uniformItems.length === 0) {
          toast({
            title: "Erro",
            description: "Selecione pelo menos um item do uniforme",
            variant: "destructive",
          });
          return;
        }
      }

      // Construir notas com informações do uniforme
      let notes = deliveryForm.notes || '';
      if (isUniformeTrabalho && uniformType) {
        const itemLabels: { [key: string]: string } = {
          'CALCA': 'Calça',
          'CAMISA': 'Camisa',
          'CAMISA_SOCIAL': 'Camisa Social',
          'JAQUETA': 'Jaqueta',
          'CINTO': 'Cinto',
          'SAPATO': 'Sapato',
          'SAPATO_SOCIAL': 'Sapato Social',
          'BLASER': 'Blaser',
          'PERNEIRA': 'Perneira'
        };
        
        const uniformInfo = uniformType === 'COMPLETO' 
          ? 'Primeira entrega com uniforme completo: Calça, Camisa, Camisa Social, Jaqueta, Cinto, Sapato, Sapato Social, Blaser, Perneira'
          : `Uniforme individual - Itens: ${uniformItems.map(item => itemLabels[item] || item).join(', ')}`;
        
        notes = notes ? `${notes}\n\n${uniformInfo}` : uniformInfo;
      }

      // Adicionar o ID do usuário autenticado ao payload
      const deliveryPayload: CreateEPIDeliveryDTO = {
        ...deliveryForm,
        deliveredByUserId: user?.id || undefined,
        notes: notes
      };
      
      await sstService.createEPIDelivery(deliveryPayload);
      toast({
        title: "Sucesso",
        description: "Entrega de EPI registrada com sucesso",
      });

      setShowDeliveryModal(false);
      resetDeliveryForm();

      loadData();
    } catch (err: any) {
      console.error('Erro ao criar entrega de EPI:', err);
      const errorMessage = err?.response?.data?.error || err?.message || "Não foi possível registrar a entrega de EPI";
      toast({
        title: "Erro",
        description: errorMessage,
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
              variant="outline"
              onClick={() => navigate('/fichas-entrega-epi')}
              className="border-gray-600 text-seguranca-lightgray hover:bg-seguranca-black"
            >
              <FileText className="h-4 w-4 mr-2" />
              Fichas de EPI
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
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-white hover:bg-gray-700"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Identificação: Funcionário + Empresa */}
                  <div className="md:col-span-2 space-y-2 border-b border-gray-600 pb-6 mb-2">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Identificação</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-seguranca-lightgray font-medium flex items-center gap-2">
                          <User className="w-4 h-4" />
                          Funcionário *
                        </Label>
                        <p className="text-[11px] text-gray-500">
                          Digite pelo menos 3 caracteres do nome, matrícula ou CPF para buscar.
                        </p>
                        <div className="mt-1">
                          {loadingEmployees ? (
                            <div className="flex items-center gap-2 p-3 bg-seguranca-black border border-gray-600 rounded-md">
                              <RefreshCw className="w-4 h-4 text-gray-400 animate-spin" />
                              <span className="text-sm text-gray-400">Carregando funcionários...</span>
                            </div>
                          ) : (
                            <>
                              <Popover
                                open={employeePickerOpen}
                                onOpenChange={(open) => {
                                  setEmployeePickerOpen(open);
                                  if (!open) setEmployeeSearchQuery('');
                                }}
                              >
                                <PopoverTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={employeePickerOpen}
                                    disabled={employees.length === 0}
                                    className="h-11 w-full justify-between bg-seguranca-black border-gray-600 text-seguranca-lightgray hover:bg-seguranca-black/90 hover:text-seguranca-lightgray focus:border-seguranca-red"
                                  >
                                    <span className={cn('truncate text-left', !deliveryEmployee && 'text-gray-400')}>
                                      {deliveryEmployee ? deliveryEmployee.name : 'Selecione o funcionário'}
                                    </span>
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                  className="w-[var(--radix-popover-trigger-width)] p-0 border border-gray-600 bg-seguranca-graphite"
                                  align="start"
                                >
                                  <Command shouldFilter={false}>
                                    <CommandInput
                                      placeholder={`Mín. ${MIN_EMPLOYEE_SEARCH_CHARS} caracteres (nome, matrícula ou CPF)...`}
                                      value={employeeSearchQuery}
                                      onValueChange={setEmployeeSearchQuery}
                                      className="border-gray-600"
                                    />
                                    <CommandList>
                                      <CommandEmpty>
                                        {employeeSearchQuery.trim().length < MIN_EMPLOYEE_SEARCH_CHARS
                                          ? `Digite pelo menos ${MIN_EMPLOYEE_SEARCH_CHARS} caracteres para exibir os registros.`
                                          : 'Nenhum funcionário encontrado.'}
                                      </CommandEmpty>
                                      <CommandGroup>
                                        {filteredEmployeesForDeliveryPicker.map((f) => {
                                          const doc = f.cpf || f.document || '';
                                          return (
                                            <CommandItem
                                              key={f.id}
                                              value={f.id}
                                              onSelect={() => handleSelectDeliveryEmployee(f.id)}
                                              className="text-seguranca-lightgray cursor-pointer aria-selected:bg-seguranca-black"
                                            >
                                              <Check
                                                className={cn(
                                                  'mr-2 h-4 w-4 shrink-0',
                                                  deliveryForm.employeeId === f.id ? 'opacity-100' : 'opacity-0'
                                                )}
                                              />
                                              <div className="flex flex-col min-w-0 text-left">
                                                <span className="font-medium truncate">{f.name}</span>
                                                {(f.registrationNumber || doc) && (
                                                  <span className="text-xs text-gray-400">
                                                    {f.registrationNumber ? `Matr.: ${f.registrationNumber}` : ''}
                                                    {f.registrationNumber && doc ? ' · ' : ''}
                                                    {doc ? `CPF: ${formatCPF(doc)}` : ''}
                                                  </span>
                                                )}
                                              </div>
                                            </CommandItem>
                                          );
                                        })}
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                              {employees.length === 0 && !loadingEmployees && (
                                <p className="text-xs text-yellow-400 mt-1">
                                  Nenhum funcionário ativo cadastrado no sistema.
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-seguranca-lightgray font-medium flex items-center gap-2">
                          <Building2 className="w-4 h-4" />
                          Empresa
                        </Label>
                        <p className="text-[11px] text-gray-500">
                          Preenchida automaticamente ao escolher o funcionário; você pode alterar se necessário.
                        </p>
                        <div className="mt-1">
                          {loadingCompanies ? (
                            <div className="flex items-center gap-2 p-3 bg-seguranca-black border border-gray-600 rounded-md">
                              <RefreshCw className="w-4 h-4 text-gray-400 animate-spin" />
                              <span className="text-sm text-gray-400">Carregando empresas...</span>
                            </div>
                          ) : (
                            <Select
                              value={deliveryCompanyId || undefined}
                              onValueChange={(value) => setDeliveryCompanyId(value)}
                              disabled={companies.length === 0}
                            >
                              <SelectTrigger className="bg-seguranca-black border-gray-600 text-seguranca-lightgray focus:border-seguranca-red h-11 [&>span[data-placeholder]]:text-gray-400 [&>span:not([data-placeholder])]:!text-white [&>span:not([data-placeholder])]:!opacity-100">
                                <SelectValue placeholder="Selecione a empresa" />
                              </SelectTrigger>
                              <SelectContent className="bg-seguranca-graphite border-gray-600">
                                {companies.map((c) => (
                                  <SelectItem
                                    key={c.id}
                                    value={c.id}
                                    className="text-seguranca-lightgray focus:bg-seguranca-black"
                                  >
                                    <div className="flex flex-col text-left">
                                      <span className="font-medium">{c.sigla || c.tradeName || c.name}</span>
                                      {c.name && (c.sigla || c.tradeName) && (
                                        <span className="text-xs text-gray-400">{c.name}</span>
                                      )}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* EPI */}
                  <div className="md:col-span-2">
                    <Label htmlFor="epiId" className="text-seguranca-lightgray font-medium flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      EPI *
                    </Label>
                    <div className="mt-2">
                      {loading ? (
                        <div className="flex items-center gap-2 p-3 bg-seguranca-black border border-gray-600 rounded-md">
                          <RefreshCw className="w-4 h-4 text-gray-400 animate-spin" />
                          <span className="text-sm text-gray-400">Carregando EPIs...</span>
                        </div>
                      ) : (
                        <>
                          <Select
                            value={deliveryForm.epiId}
                            onValueChange={(value) => {
                              setDeliveryForm({ ...deliveryForm, epiId: value });
                              // Resetar campos de uniforme quando mudar o EPI
                              const selectedEPI = epis.find(epi => epi.id.toString() === value);
                              const isUniform = selectedEPI?.name?.toLowerCase().includes('uniforme de trabalho') || 
                                               selectedEPI?.name?.toLowerCase().includes('uniforme');
                              if (!isUniform) {
                                setUniformType('');
                                setUniformItems([]);
                              }
                            }}
                            disabled={epis.filter(epi => epi.isActive).length === 0}
                          >
                            <SelectTrigger className="bg-seguranca-black border-gray-600 text-seguranca-lightgray focus:border-seguranca-red h-11 [&>span[data-placeholder]]:text-gray-400 [&>span:not([data-placeholder])]:!text-white [&>span:not([data-placeholder])]:!opacity-100">
                              <SelectValue placeholder="Selecione o EPI" />
                            </SelectTrigger>
                            <SelectContent className="bg-seguranca-graphite border-gray-600">
                              {epis.filter(epi => epi.isActive).length > 0 ? (
                                epis.filter(epi => epi.isActive).map((epi) => (
                                  <SelectItem 
                                    key={epi.id} 
                                    value={epi.id.toString()} 
                                    className="text-seguranca-lightgray focus:bg-seguranca-black focus:text-seguranca-lightgray"
                                  >
                                    <div className="flex items-center gap-2">
                                      <Shield className="w-4 h-4 text-seguranca-red" />
                                      <div>
                                        <div className="font-medium">{epi.name}</div>
                                        <div className="text-xs text-gray-400">CA: {epi.caNumber}</div>
                                      </div>
                                    </div>
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="__NO_EPIS__" disabled className="text-gray-400">
                                  Nenhum EPI ativo encontrado
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          {epis.filter(epi => epi.isActive).length === 0 && (
                            <p className="text-xs text-yellow-400 mt-1">
                              Nenhum EPI ativo cadastrado no sistema. Cadastre um EPI antes de registrar uma entrega.
                            </p>
                          )}
                        </>
                      )}
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

                  {/* Campos específicos para Uniforme de Trabalho */}
                  {isUniformeTrabalho && (
                    <>
                      <div className="md:col-span-2">
                        <Label className="text-seguranca-lightgray font-medium flex items-center gap-2">
                          <Shield className="w-4 h-4" />
                          Tipo de Entrega do Uniforme *
                        </Label>
                        <div className="mt-2">
                          <Select
                            value={uniformType}
                            onValueChange={(value: 'COMPLETO' | 'INDIVIDUAL') => {
                              setUniformType(value);
                              if (value === 'COMPLETO') {
                                setUniformItems([]);
                              }
                            }}
                          >
                            <SelectTrigger className="bg-seguranca-black border-gray-600 text-seguranca-lightgray focus:border-seguranca-red h-11">
                              <SelectValue placeholder="Selecione o tipo de entrega" />
                            </SelectTrigger>
                            <SelectContent className="bg-seguranca-black border-gray-600">
                              <SelectItem value="COMPLETO" className="text-seguranca-lightgray hover:bg-seguranca-graphite">
                                <div className="flex items-center gap-2">
                                  <CheckCircle className="w-4 h-4 text-green-400" />
                                  Primeira entrega com uniforme completo
                                </div>
                              </SelectItem>
                              <SelectItem value="INDIVIDUAL" className="text-seguranca-lightgray hover:bg-seguranca-graphite">
                                <div className="flex items-center gap-2">
                                  <Package className="w-4 h-4 text-blue-400" />
                                  Entrega individual de peças
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Descrição do uniforme completo */}
                      {uniformType === 'COMPLETO' && (
                        <div className="md:col-span-2">
                          <div className="p-4 bg-seguranca-black/50 border border-seguranca-yellow/30 rounded-lg">
                            <p className="text-sm font-medium text-seguranca-yellow mb-2">
                              Itens incluídos no uniforme completo:
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-gray-300">
                              <div className="flex items-center gap-2">
                                <CheckCircle className="w-3 h-3 text-green-400" />
                                Calça
                              </div>
                              <div className="flex items-center gap-2">
                                <CheckCircle className="w-3 h-3 text-green-400" />
                                Camisa
                              </div>
                              <div className="flex items-center gap-2">
                                <CheckCircle className="w-3 h-3 text-green-400" />
                                Camisa Social
                              </div>
                              <div className="flex items-center gap-2">
                                <CheckCircle className="w-3 h-3 text-green-400" />
                                Jaqueta
                              </div>
                              <div className="flex items-center gap-2">
                                <CheckCircle className="w-3 h-3 text-green-400" />
                                Cinto
                              </div>
                              <div className="flex items-center gap-2">
                                <CheckCircle className="w-3 h-3 text-green-400" />
                                Sapato
                              </div>
                              <div className="flex items-center gap-2">
                                <CheckCircle className="w-3 h-3 text-green-400" />
                                Sapato Social
                              </div>
                              <div className="flex items-center gap-2">
                                <CheckCircle className="w-3 h-3 text-green-400" />
                                Blaser
                              </div>
                              <div className="flex items-center gap-2">
                                <CheckCircle className="w-3 h-3 text-green-400" />
                                Perneira
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Seleção de itens individuais */}
                      {uniformType === 'INDIVIDUAL' && (
                        <div className="md:col-span-2">
                          <Label className="text-seguranca-lightgray font-medium flex items-center gap-2">
                            <Package className="w-4 h-4" />
                            Itens do Uniforme *
                          </Label>
                          <div className="mt-2">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-seguranca-black/50 border border-gray-600 rounded-lg">
                              {[
                                { value: 'CALCA', label: 'Calça' },
                                { value: 'CAMISA', label: 'Camisa' },
                                { value: 'CAMISA_SOCIAL', label: 'Camisa Social' },
                                { value: 'JAQUETA', label: 'Jaqueta' },
                                { value: 'CINTO', label: 'Cinto' },
                                { value: 'SAPATO', label: 'Sapato' },
                                { value: 'SAPATO_SOCIAL', label: 'Sapato Social' },
                                { value: 'BLASER', label: 'Blaser' },
                                { value: 'PERNEIRA', label: 'Perneira' }
                              ].map((item) => (
                                <label
                                  key={item.value}
                                  className="flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-gray-700 transition-colors"
                                >
                                  <input
                                    type="checkbox"
                                    checked={uniformItems.includes(item.value)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setUniformItems([...uniformItems, item.value]);
                                      } else {
                                        setUniformItems(uniformItems.filter(i => i !== item.value));
                                      }
                                    }}
                                    className="w-4 h-4 rounded border-gray-600 bg-seguranca-black text-seguranca-red focus:ring-seguranca-red focus:ring-offset-seguranca-black"
                                  />
                                  <span className="text-sm text-seguranca-lightgray">{item.label}</span>
                                </label>
                              ))}
                            </div>
                            {uniformItems.length === 0 && (
                              <p className="text-xs text-yellow-400 mt-2">
                                Selecione pelo menos um item do uniforme
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}

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
                    onClick={handleCloseModal}
                    className="border-gray-600 text-seguranca-lightgray hover:bg-gray-700 hover:border-gray-500"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleCreateDelivery}
                    className="bg-seguranca-red hover:bg-seguranca-darkred text-white shadow-lg"
                    disabled={
                      !deliveryForm.employeeId || 
                      !deliveryForm.epiId || 
                      !deliveryForm.deliveryDate ||
                      (isUniformeTrabalho && (!uniformType || (uniformType === 'INDIVIDUAL' && uniformItems.length === 0)))
                    }
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Registrar Entrega
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Detalhes do EPI */}
        {showEPIDetailModal && selectedEPI && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-seguranca-graphite border border-gray-600 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 text-seguranca-lightgray hover:bg-seguranca-black z-10"
                onClick={() => {
                  setShowEPIDetailModal(false);
                  setSelectedEPI(null);
                  navigate('/rh/sst/epis');
                }}
              >
                <X className="h-5 w-5" />
              </Button>
              
              <div className="p-6">
                {/* Header */}
                <div className="bg-seguranca-red text-white p-6 rounded-t-lg -m-6 mb-6">
                  <div className="flex items-center gap-3">
                    <Shield className="h-6 w-6" />
                    <div>
                      <h2 className="text-2xl font-bold">{selectedEPI.name}</h2>
                      <p className="text-sm opacity-90">Detalhes do Equipamento de Proteção Individual</p>
                    </div>
                  </div>
                </div>

                {/* Informações do EPI */}
                <div className="space-y-6">
                  {/* Seção: Informações Básicas */}
                  <Card className="bg-seguranca-black border-gray-600">
                    <CardHeader>
                      <CardTitle className="text-seguranca-lightgray flex items-center gap-2">
                        <Package className="h-5 w-5 text-seguranca-yellow" />
                        Informações Básicas
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-gray-400">Nome</Label>
                          <p className="text-seguranca-lightgray mt-1">{selectedEPI.name}</p>
                        </div>
                        <div>
                          <Label className="text-gray-400">Categoria</Label>
                          <div className="mt-1">
                            <Badge className={getCategoryColor(selectedEPI.category)}>
                              {selectedEPI.category}
                            </Badge>
                          </div>
                        </div>
                        <div>
                          <Label className="text-gray-400">Fabricante</Label>
                          <p className="text-seguranca-lightgray mt-1">{selectedEPI.manufacturer || 'N/A'}</p>
                        </div>
                        <div>
                          <Label className="text-gray-400">Modelo</Label>
                          <p className="text-seguranca-lightgray mt-1">{selectedEPI.model || 'N/A'}</p>
                        </div>
                        <div>
                          <Label className="text-gray-400">Número do CA</Label>
                          <p className="text-seguranca-lightgray mt-1">{selectedEPI.caNumber || 'N/A'}</p>
                        </div>
                        <div>
                          <Label className="text-gray-400">Validade do CA</Label>
                          <p className="text-seguranca-lightgray mt-1">
                            {selectedEPI.caValidity ? (typeof selectedEPI.caValidity === 'string' 
                              ? new Date(selectedEPI.caValidity).toLocaleDateString('pt-BR')
                              : selectedEPI.caValidity) : 'N/A'}
                          </p>
                        </div>
                      </div>
                      {selectedEPI.description && (
                        <div>
                          <Label className="text-gray-400">Descrição</Label>
                          <p className="text-seguranca-lightgray mt-1">{selectedEPI.description}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Seção: Estoque */}
                  <Card className="bg-seguranca-black border-gray-600">
                    <CardHeader>
                      <CardTitle className="text-seguranca-lightgray flex items-center gap-2">
                        <Package className="h-5 w-5 text-seguranca-yellow" />
                        Estoque
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label className="text-gray-400">Estoque Atual</Label>
                          <p className="text-2xl font-bold text-seguranca-lightgray mt-1">{selectedEPI.currentStock || 0}</p>
                        </div>
                        <div>
                          <Label className="text-gray-400">Estoque Mínimo</Label>
                          <p className="text-2xl font-bold text-seguranca-lightgray mt-1">{selectedEPI.minimumStock || 0}</p>
                        </div>
                        <div>
                          <Label className="text-gray-400">Custo Unitário</Label>
                          <p className="text-2xl font-bold text-seguranca-lightgray mt-1">
                            {selectedEPI.unitCost ? `R$ ${selectedEPI.unitCost.toFixed(2)}` : 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4">
                        <Label className="text-gray-400">Status</Label>
                        <div className="mt-1">
                          {selectedEPI.isActive ? (
                            <Badge className="bg-green-600">Ativo</Badge>
                          ) : (
                            <Badge className="bg-red-600">Inativo</Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Botões de Ação */}
                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-600">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowEPIDetailModal(false);
                      setSelectedEPI(null);
                      navigate('/rh/sst/epis');
                    }}
                    className="border-gray-600 text-seguranca-lightgray hover:bg-seguranca-black"
                  >
                    Fechar
                  </Button>
                  <Button
                    onClick={() => {
                      setShowEPIDetailModal(false);
                      setDeliveryForm(prev => ({ ...prev, epiId: selectedEPI.id }));
                      setShowDeliveryModal(true);
                    }}
                    className="bg-seguranca-red hover:bg-seguranca-darkred"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
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

