import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Car, Calendar, DollarSign, MapPin, Wrench, FileText, TrendingUp, Settings, Building, User, X, CalendarDays } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import fleetService from '@/services/fleetService';
import { workPostService, WorkPost } from '@/services/workPostService';
import { costCenterService, CostCenterDTO } from '@/services/costCenterService';
import { employeeService } from '@/services/employeeService';
import { companyService } from '@/services/companyService';
import { departmentService, Department } from '@/services/departmentService';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { ptBR } from 'date-fns/locale';
import { formatDateForBackend, parseDateFromBackend, DEFAULT_DATE_PICKER_PROPS } from '@/utils/dateUtils';

interface VeiculoFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const VeiculoFormModal: React.FC<VeiculoFormModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    placa: '',
    marca: '',
    modelo: '',
    ano: new Date().getFullYear(),
    cor: '',
    combustivel: 'FLEX',
    quilometragem: 0,
    status: 'ACTIVE',
    capacidade: 5,
    postoDeTrabalho: '',
    departamento: '',
    departmentId: '',
    empresa: '',
    empresaId: '',
    dataManutencao: null as Date | null,
    proximaManutencao: null as Date | null,
    vencimentoSeguro: null as Date | null,
    vencimentoDocumentacao: null as Date | null,
    data_aquisicao: null as Date | null,
    valor_aquisicao: 0,
    observacoes: '',
    responsavel: '',
    fotos: null as FileList | null
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar postos de trabalho
  const { data: workPosts, isLoading: workPostsLoading, error: workPostsError } = useQuery({
    queryKey: ['workPosts'],
    queryFn: () => workPostService.getWorkPosts(),
    retry: 2,
    retryDelay: 1000
  });

  // Buscar centros de custo ativos
  const { data: costCenters, isLoading: costCentersLoading, error: costCentersError } = useQuery({
    queryKey: ['costCenters'],
    queryFn: () => costCenterService.listActive(),
    retry: 2,
    retryDelay: 1000
  });

  // Buscar funcionários ativos
  const { data: employees, isLoading: employeesLoading, error: employeesError } = useQuery({
    queryKey: ['employees'],
    queryFn: () => employeeService.getEmployeesByStatus('ACTIVE'),
    retry: 2,
    retryDelay: 1000
  });

  // Buscar empresas
  const { data: companies, isLoading: companiesLoading, error: companiesError } = useQuery({
    queryKey: ['companies'],
    queryFn: () => companyService.getAllCompanies(),
    retry: 2,
    retryDelay: 1000
  });

  // Buscar departamentos
  const { data: departments, isLoading: departmentsLoading, error: departmentsError } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentService.listActive(),
    retry: 2,
    retryDelay: 1000
  });


  // Debug para postos de trabalho
  console.log('🔍 POSTOS DE TRABALHO - Debug:', {
    workPosts,
    workPostsLoading,
    workPostsError,
    workPostsLength: workPosts?.length
  });

  // Debug para centros de custo
  console.log('🔍 CENTROS DE CUSTO - Debug:', {
    costCenters,
    costCentersLoading,
    costCentersError,
    costCentersLength: costCenters?.length
  });

  // Debug para funcionários
  console.log('🔍 FUNCIONÁRIOS - Debug:', {
    employees,
    employeesLoading,
    employeesError,
    employeesLength: employees?.length
  });


  // Limpar formulário quando o modal abre
  useEffect(() => {
    if (isOpen) {
      setFormData({
        placa: '',
        marca: '',
        modelo: '',
        ano: new Date().getFullYear(),
        cor: '',
        combustivel: 'FLEX',
        quilometragem: 0,
        status: 'ACTIVE',
        capacidade: 5,
        postoDeTrabalho: '',
        departamento: '',
    departmentId: '',
        empresa: '',
        empresaId: '',
        dataManutencao: null,
        proximaManutencao: null,
        vencimentoSeguro: null,
        vencimentoDocumentacao: null,
        data_aquisicao: null,
        valor_aquisicao: 0,
        observacoes: '',
        responsavel: '',
        fotos: null
      });
    }
  }, [isOpen]);

  // Função para buscar data da última manutenção quando um veículo existente for selecionado
  const fetchLastMaintenanceDate = async (vehicleId: string) => {
    try {
      const lastMaintenanceDate = await fleetService.getLastMaintenanceDate(vehicleId);
      if (lastMaintenanceDate) {
        console.log('🔧 Data da última manutenção encontrada:', lastMaintenanceDate);
        
        // Tratar tanto array quanto string
        let formattedDate = '';
        if (Array.isArray(lastMaintenanceDate)) {
          // Se for array [year, month, day], converter para string ISO
          const [year, month, day] = lastMaintenanceDate;
          formattedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          console.log('🔧 Data convertida de array para string:', formattedDate);
        } else if (typeof lastMaintenanceDate === 'string') {
          // Se for string, usar diretamente
          formattedDate = lastMaintenanceDate.split('T')[0];
          console.log('🔧 Data já é string, formatada:', formattedDate);
        } else {
          console.warn('⚠️ Formato de data desconhecido:', typeof lastMaintenanceDate, lastMaintenanceDate);
        }
        
        if (formattedDate) {
          setFormData(prev => ({
            ...prev,
            dataManutencao: formattedDate
          }));
        }
      }
    } catch (error) {
      console.error('❌ Erro ao buscar data da última manutenção:', error);
    }
  };

  // Mutation para criar veículo
  const createVehicleMutation = useMutation({
    mutationFn: (vehicleData: any) => fleetService.createVehicle(vehicleData),
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Veículo cadastrado com sucesso!"
      });

      // Limpar formulário
      setFormData({
        placa: '',
        marca: '',
        modelo: '',
        ano: new Date().getFullYear(),
        cor: '',
        combustivel: 'FLEX',
        quilometragem: 0,
        status: 'ACTIVE',
        capacidade: 5,
        postoDeTrabalho: '',
        departamento: '',
    departmentId: '',
        empresa: '',
        empresaId: '',
        dataManutencao: null,
        proximaManutencao: null,
        vencimentoSeguro: null,
        vencimentoDocumentacao: null,
        data_aquisicao: null,
        valor_aquisicao: 0,
        observacoes: '',
        responsavel: '',
        fotos: null
      });

      // Invalidar e refetch da query de veículos
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.removeQueries({ queryKey: ['vehicles'] });
      
      // Chamar callback de sucesso
      onSuccess();
    },
    onError: (error: any) => {
      console.error('Erro ao cadastrar veículo:', error);
      console.error('Response data:', error.response?.data);
      console.error('Response status:', error.response?.status);
      
      let errorMessage = "Erro ao cadastrar veículo. Tente novamente.";
      
      if (error.response?.status === 400) {
        errorMessage = "Esta placa já está cadastrada no sistema!";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message?.includes('duplicate')) {
        errorMessage = "Esta placa já está cadastrada!";
      }
      
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive"
      });
    }
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Mapear dados do formulário para o formato da API
      const vehicleData = {
        plate: formData.placa.toUpperCase(),
        brand: formData.marca,
        model: formData.modelo,
        year: Number(formData.ano),
        color: formData.cor,
        fuelType: formData.combustivel.toUpperCase() as 'GASOLINE' | 'ETHANOL' | 'DIESEL' | 'FLEX',
        currentMileage: Number(formData.quilometragem),
        status: formData.status.toUpperCase() as 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE',
        capacity: Number(formData.capacidade),
        workPostId: formData.postoDeTrabalho || undefined,
        department: formData.departamento || undefined,
        departmentId: formData.departmentId || undefined,
        companyId: formData.empresaId || undefined,
        lastMaintenanceDate: formData.dataManutencao ? formatDateForBackend(formData.dataManutencao) : undefined,
        nextMaintenanceDate: formData.proximaManutencao ? formatDateForBackend(formData.proximaManutencao) : undefined,
        insuranceExpiryDate: formData.vencimentoSeguro ? formatDateForBackend(formData.vencimentoSeguro) : undefined,
        documentationExpiryDate: formData.vencimentoDocumentacao ? formatDateForBackend(formData.vencimentoDocumentacao) : undefined,
        acquisitionDate: formData.data_aquisicao ? formatDateForBackend(formData.data_aquisicao) : undefined,
        acquisitionValue: formData.valor_aquisicao || undefined,
        notes: formData.observacoes || undefined,
        responsibleEmployeeId: formData.responsavel || undefined,
        photos: formData.fotos ? Array.from(formData.fotos).map(file => file.name).join(',') : undefined
      };

      createVehicleMutation.mutate(vehicleData);
    } catch (error: any) {
      console.error('Erro ao preparar dados do veículo:', error);
      toast({
        title: "Erro",
        description: "Erro ao preparar dados do veículo. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden bg-gradient-to-br from-seguranca-graphite via-gray-800 to-seguranca-black border-gray-600 shadow-2xl">
        <DialogHeader className="border-b border-gray-600 pb-4 mb-6">
          <DialogTitle className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-seguranca-yellow/20 rounded-lg">
              <Car className="h-6 w-6 text-seguranca-yellow" />
            </div>
            <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              Cadastrar Novo Veículo
            </span>
          </DialogTitle>
          <p className="text-gray-400 text-sm mt-2">
            Preencha as informações do veículo para adicioná-lo à frota
          </p>
        </DialogHeader>
        
        <div className="overflow-y-auto max-h-[calc(95vh-140px)] pr-2">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Seção 1: Informações Básicas do Veículo */}
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
              <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Car className="h-5 w-5 text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Informações Básicas</h3>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="placa" className="text-gray-300 font-medium">Placa *</Label>
                  <Input
                    id="placa"
                    value={formData.placa}
                    onChange={(e) => handleInputChange('placa', e.target.value)}
                    placeholder="ABC-1234"
                    maxLength={8}
                    required
                    className="bg-gray-900/50 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500/20 transition-all duration-200"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="marca" className="text-gray-300 font-medium">Marca *</Label>
                  <Input
                    id="marca"
                    value={formData.marca}
                    onChange={(e) => handleInputChange('marca', e.target.value)}
                    placeholder="Ex: Toyota, Honda, Ford"
                    required
                    className="bg-gray-900/50 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500/20 transition-all duration-200"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="modelo" className="text-gray-300 font-medium">Modelo *</Label>
                  <Input
                    id="modelo"
                    value={formData.modelo}
                    onChange={(e) => handleInputChange('modelo', e.target.value)}
                    placeholder="Ex: Corolla, Civic, Focus"
                    required
                    className="bg-gray-900/50 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500/20 transition-all duration-200"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="ano" className="text-gray-300 font-medium">Ano *</Label>
                  <Input
                    id="ano"
                    type="number"
                    value={formData.ano}
                    onChange={(e) => handleInputChange('ano', e.target.value)}
                    min="1900"
                    max={new Date().getFullYear() + 1}
                    required
                    className="bg-gray-900/50 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500/20 transition-all duration-200"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="cor" className="text-gray-300 font-medium">Cor</Label>
                  <Input
                    id="cor"
                    value={formData.cor}
                    onChange={(e) => handleInputChange('cor', e.target.value)}
                    placeholder="Ex: Branco, Prata, Preto"
                    className="bg-gray-900/50 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500/20 transition-all duration-200"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="quilometragem" className="text-gray-300 font-medium">Quilometragem</Label>
                  <Input
                    id="quilometragem"
                    type="number"
                    step="0.000001"
                    value={formData.quilometragem}
                    onChange={(e) => handleInputChange('quilometragem', e.target.value)}
                    min="0"
                    max="999999.999999"
                    placeholder="Ex: 120.236"
                    className="bg-gray-900/50 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500/20 transition-all duration-200"
                  />
                </div>
              </div>
            </div>

            {/* Seção 2: Especificações Técnicas */}
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
              <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <Settings className="h-5 w-5 text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Especificações Técnicas</h3>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="capacidade" className="text-gray-300 font-medium">Capacidade *</Label>
                  <Input
                    id="capacidade"
                    type="number"
                    value={formData.capacidade}
                    onChange={(e) => handleInputChange('capacidade', e.target.value)}
                    min="1"
                    max="20"
                    placeholder="Ex: 5"
                    required
                    className="bg-gray-900/50 border-gray-600 text-white placeholder-gray-400 focus:border-green-500 focus:ring-green-500/20 transition-all duration-200"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="status" className="text-gray-300 font-medium">Status *</Label>
                  <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                    <SelectTrigger className="bg-gray-900/50 border-gray-600 text-white focus:border-green-500 focus:ring-green-500/20 transition-all duration-200">
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-600">
                      <SelectItem value="ACTIVE" className="text-green-400">✅ Ativo</SelectItem>
                      <SelectItem value="INACTIVE" className="text-red-400">❌ Inativo</SelectItem>
                      <SelectItem value="MAINTENANCE" className="text-yellow-400">🔧 Manutenção</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="combustivel" className="text-gray-300 font-medium">Combustível *</Label>
                  <Select value={formData.combustivel} onValueChange={(value) => handleInputChange('combustivel', value)}>
                    <SelectTrigger className="bg-gray-900/50 border-gray-600 text-white focus:border-green-500 focus:ring-green-500/20 transition-all duration-200">
                      <SelectValue placeholder="Selecione o combustível" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-600">
                      <SelectItem value="GASOLINE">⛽ Gasolina</SelectItem>
                      <SelectItem value="ETHANOL">🌱 Etanol</SelectItem>
                      <SelectItem value="FLEX">🔄 Flex</SelectItem>
                      <SelectItem value="DIESEL">🚛 Diesel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Seção 3: Responsabilidades e Organização */}
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
              <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <User className="h-5 w-5 text-purple-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Responsabilidades e Organização</h3>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="empresa" className="text-gray-300 font-medium">
                    Empresa
                  </Label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Select
                      value={formData.empresaId}
                      onValueChange={(value) => {
                        const selectedCompany = companies?.find(c => c.id === value);
                        handleInputChange('empresaId', value);
                        handleInputChange('empresa', selectedCompany?.name || '');
                      }}
                      disabled={companiesLoading || !!companiesError || !companies || companies.length === 0}
                    >
                      <SelectTrigger className="bg-gray-900/50 border-gray-600 text-white pl-10 focus:border-purple-500 focus:ring-purple-500/20 transition-all duration-200 disabled:opacity-50">
                        <SelectValue placeholder="Selecione uma empresa" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-gray-600">
                        {companiesLoading ? (
                          <SelectItem value="loading" disabled className="text-gray-400">
                            <div className="flex items-center gap-2">
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                              Carregando empresas...
                            </div>
                          </SelectItem>
                        ) : companiesError ? (
                          <SelectItem value="error" disabled className="text-red-400">
                            ❌ Erro ao carregar empresas
                          </SelectItem>
                        ) : companies && companies.length > 0 ? (
                          companies.map((company) => (
                            <SelectItem key={company.id} value={company.id} className="text-white hover:bg-gray-700">
                              <div className="flex items-center gap-2">
                                <Building className="h-3 w-3 text-purple-400" />
                                <span className="font-medium">{company.name}</span>
                                {company.sigla && (
                                  <span className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded">
                                    {company.sigla}
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-data" disabled className="text-gray-400">
                            📭 Nenhuma empresa encontrada
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="postoDeTrabalho" className="text-gray-300 font-medium">Posto de Trabalho</Label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Select
                      value={formData.postoDeTrabalho}
                      onValueChange={(value) => handleInputChange('postoDeTrabalho', value)}
                      disabled={workPostsLoading || !!workPostsError || !workPosts || workPosts.length === 0}
                    >
                      <SelectTrigger className="bg-gray-900/50 border-gray-600 text-white pl-10 focus:border-purple-500 focus:ring-purple-500/20 transition-all duration-200 disabled:opacity-50">
                        <SelectValue placeholder="Selecione um posto" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-gray-600">
                        {workPostsLoading ? (
                          <SelectItem value="loading" disabled className="text-gray-400">
                            <div className="flex items-center gap-2">
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                              Carregando postos...
                            </div>
                          </SelectItem>
                        ) : workPostsError ? (
                          <SelectItem value="error" disabled className="text-red-400">
                            ❌ Erro ao carregar postos
                          </SelectItem>
                        ) : workPosts && workPosts.length > 0 ? (
                          workPosts.map((workPost: WorkPost) => (
                            <SelectItem key={workPost.id} value={workPost.id} className="text-white hover:bg-gray-700">
                              <div className="flex items-center gap-2">
                                <Building className="h-3 w-3 text-purple-400" />
                                {workPost.name}
                              </div>
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-data" disabled className="text-gray-400">
                            📭 Nenhum posto encontrado
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="departamento" className="text-gray-300 font-medium">Departamento</Label>
                  <div className="relative">
                    <Settings className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Select
                      value={formData.departmentId}
                      onValueChange={(value) => {
                        const selectedDepartment = departments?.find(d => d.id === value);
                        handleInputChange('departmentId', value);
                        handleInputChange('departamento', selectedDepartment?.name || '');
                      }}
                      disabled={departmentsLoading || !!departmentsError || !departments || departments.length === 0}
                    >
                      <SelectTrigger className="bg-gray-900/50 border-gray-600 text-white pl-10 focus:border-purple-500 focus:ring-purple-500/20 transition-all duration-200 disabled:opacity-50">
                        <SelectValue placeholder="Selecione um departamento" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-gray-600">
                        {departmentsLoading ? (
                          <SelectItem value="loading" disabled className="text-gray-400">
                            <div className="flex items-center gap-2">
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                              Carregando departamentos...
                            </div>
                          </SelectItem>
                        ) : departmentsError ? (
                          <SelectItem value="error" disabled className="text-red-400">
                            ❌ Erro ao carregar departamentos
                          </SelectItem>
                        ) : departments && departments.length > 0 ? (
                          departments.map((department: Department) => (
                            <SelectItem key={department.id} value={department.id} className="text-white hover:bg-gray-700">
                              <div className="flex items-center gap-2">
                                <Settings className="h-3 w-3 text-purple-400" />
                                <span className="font-medium">{department.name}</span>
                                {department.description && (
                                  <span className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded">
                                    {department.description}
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-data" disabled className="text-gray-400">
                            📭 Nenhum departamento encontrado
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="responsavel" className="text-gray-300 font-medium">
                    Responsável <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Select
                      value={formData.responsavel}
                      onValueChange={(value) => handleInputChange('responsavel', value)}
                      disabled={employeesLoading || !!employeesError || !employees || employees.length === 0}
                    >
                      <SelectTrigger className="bg-gray-900/50 border-gray-600 text-white pl-10 focus:border-purple-500 focus:ring-purple-500/20 transition-all duration-200 disabled:opacity-50">
                        <SelectValue placeholder="Selecione um responsável" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-gray-600">
                        {employeesLoading ? (
                          <SelectItem value="loading" disabled className="text-gray-400">
                            <div className="flex items-center gap-2">
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                              Carregando responsáveis...
                            </div>
                          </SelectItem>
                        ) : employeesError ? (
                          <SelectItem value="error" disabled className="text-red-400">
                            ❌ Erro ao carregar responsáveis
                          </SelectItem>
                        ) : employees && employees.length > 0 ? (
                          employees.map((employee) => (
                            <SelectItem key={employee.id} value={employee.id} className="text-white hover:bg-gray-700">
                              <div className="flex items-center gap-2">
                                <User className="h-3 w-3 text-purple-400" />
                                {employee.name}
                              </div>
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-data" disabled className="text-gray-400">
                            📭 Nenhum responsável encontrado
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {/* Seção 4: Informações Financeiras */}
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
              <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-yellow-500/20 rounded-lg">
                  <DollarSign className="h-5 w-5 text-yellow-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Informações Financeiras</h3>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="data_aquisicao" className="text-gray-300 font-medium">
                    Data de Aquisição
                  </Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="data_aquisicao"
                      type="date"
                      value={formData.data_aquisicao}
                      onChange={(e) => handleInputChange('data_aquisicao', e.target.value)}
                      className="pl-10 bg-gray-900/50 border-gray-600 text-white focus:border-yellow-500 focus:ring-yellow-500/20 transition-all duration-200"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="valor_aquisicao" className="text-gray-300 font-medium">
                    Valor de Aquisição
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 font-semibold text-lg">R$</span>
                    <Input
                      id="valor_aquisicao"
                      type="number"
                      step="0.01"
                      value={formData.valor_aquisicao}
                      onChange={(e) => handleInputChange('valor_aquisicao', e.target.value)}
                      min="0"
                      placeholder="0,00"
                      className="pl-12 bg-gray-900/50 border-gray-600 text-white placeholder-gray-400 focus:border-yellow-500 focus:ring-yellow-500/20 transition-all duration-200"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Seção 5: Manutenção e Documentação */}
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
              <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-orange-500/20 rounded-lg">
                  <Wrench className="h-5 w-5 text-orange-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Manutenção e Documentação</h3>
              </div>
              
              <div className="space-y-6">
                {/* Manutenção */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="dataManutencao" className="text-gray-300 font-medium">
                      Data da Última Manutenção
                    </Label>
                    <div className="relative">
                      <Wrench className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="dataManutencao"
                        type="date"
                        value={formData.dataManutencao}
                        onChange={(e) => handleInputChange('dataManutencao', e.target.value)}
                        className="pl-10 bg-gray-900/50 border-gray-600 text-white focus:border-orange-500 focus:ring-orange-500/20 transition-all duration-200"
                        placeholder="Será preenchida automaticamente"
                        readOnly
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                      <span className="text-orange-400">ℹ️</span>
                      Buscada automaticamente da tabela de manutenções
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="proximaManutencao" className="text-gray-300 font-medium">
                      Próxima Manutenção
                    </Label>
                    <div className="relative">
                      <Wrench className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="proximaManutencao"
                        type="date"
                        value={formData.proximaManutencao}
                        onChange={(e) => handleInputChange('proximaManutencao', e.target.value)}
                        className="pl-10 bg-gray-900/50 border-gray-600 text-white focus:border-orange-500 focus:ring-orange-500/20 transition-all duration-200"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Vencimentos */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="vencimentoSeguro" className="text-gray-300 font-medium">
                      Vencimento do Seguro
                    </Label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="vencimentoSeguro"
                        type="date"
                        value={formData.vencimentoSeguro}
                        onChange={(e) => handleInputChange('vencimentoSeguro', e.target.value)}
                        className="pl-10 bg-gray-900/50 border-gray-600 text-white focus:border-orange-500 focus:ring-orange-500/20 transition-all duration-200"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="vencimentoDocumentacao" className="text-gray-300 font-medium">
                      Vencimento da Documentação
                    </Label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="vencimentoDocumentacao"
                        type="date"
                        value={formData.vencimentoDocumentacao}
                        onChange={(e) => handleInputChange('vencimentoDocumentacao', e.target.value)}
                        className="pl-10 bg-gray-900/50 border-gray-600 text-white focus:border-orange-500 focus:ring-orange-500/20 transition-all duration-200"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Seção 6: Observações e Documentos */}
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
              <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-indigo-500/20 rounded-lg">
                  <FileText className="h-5 w-5 text-indigo-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Observações e Documentos</h3>
              </div>
              
              <div className="space-y-6">
                {/* Observações */}
                <div className="space-y-2">
                  <Label htmlFor="observacoes" className="text-gray-300 font-medium">
                    Observações
                  </Label>
                  <Textarea
                    id="observacoes"
                    value={formData.observacoes}
                    onChange={(e) => handleInputChange('observacoes', e.target.value)}
                    rows={4}
                    placeholder="Adicione observações importantes sobre o veículo..."
                    className="bg-gray-900/50 border-gray-600 text-white placeholder-gray-400 focus:border-indigo-500 focus:ring-indigo-500/20 transition-all duration-200 resize-none"
                  />
                </div>
                
                {/* Upload de Fotos */}
                <div className="space-y-2">
                  <Label htmlFor="fotos" className="text-gray-300 font-medium">
                    Fotos do Veículo (Opcional)
                  </Label>
                  <div className="relative">
                    <Input
                      id="fotos"
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => handleInputChange('fotos', e.target.files)}
                      className="h-16 flex items-center bg-gray-900/50 border-gray-600 text-white file:mr-4 file:py-4 file:px-8 file:rounded-xl file:border-0 file:text-base file:font-bold file:bg-gradient-to-r file:from-blue-500 file:to-purple-600 file:text-white hover:file:from-blue-600 hover:file:to-purple-700 hover:file:shadow-lg hover:file:shadow-blue-500/30 transition-all duration-300 cursor-pointer file:cursor-pointer file:transform file:hover:scale-105 file:transition-all file:duration-200"
                    />
                    <p className="text-sm text-gray-400 mt-3 flex items-center gap-2 bg-gray-800/50 p-3 rounded-lg border border-gray-700">
                      <span className="text-indigo-400 text-lg">📸</span>
                      <span>
                        Aceita múltiplas imagens (JPG, PNG, GIF) - Máximo 10MB por arquivo
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t border-gray-600 bg-gradient-to-r from-gray-800/30 to-gray-700/30 -mx-6 -mb-6 px-6 py-4 rounded-b-xl">
              <div className="text-sm text-gray-400 flex items-center gap-2">
                <span className="text-yellow-400">⚠️</span>
                Campos marcados com * são obrigatórios
              </div>
              
              <div className="flex gap-3 w-full sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isLoading || createVehicleMutation.isPending}
                  className="flex-1 sm:flex-none border-gray-500 text-gray-300 hover:bg-gray-700 hover:text-white transition-all duration-200 px-6"
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={isLoading || createVehicleMutation.isPending}
                  className="flex-1 sm:flex-none bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white transition-all duration-200 px-6 shadow-lg hover:shadow-blue-500/25"
                >
                  {isLoading || createVehicleMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Car className="mr-2 h-4 w-4" />
                      Salvar Veículo
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VeiculoFormModal;
