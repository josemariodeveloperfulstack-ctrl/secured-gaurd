import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Route, 
  CheckCircle, 
  AlertCircle,
  Building2,
  Truck,
  BarChart3,
  X,
  GripVertical,
  Compass,
  ArrowDownUp,
  Sparkles,
  Map
} from 'lucide-react';
import { toast } from 'sonner';
import { Client, Unit, CreateVisitScheduleDTO, VisitSchedule } from '@/types/visit';
import { Employee } from '@/types/employee';
import clientService from '@/services/clientService';
import unitService from '@/services/unitService';
import { employeeService } from '@/services/employeeService';
import { workPostService } from '@/services/workPostService';
import visitScheduleService from '@/services/visitScheduleService';

interface CreateVisitScheduleProps {
  onScheduleCreated?: (schedule: VisitSchedule) => void;
  onCancel?: () => void;
}

const CreateVisitSchedule: React.FC<CreateVisitScheduleProps> = ({
  onScheduleCreated,
  onCancel
}) => {
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [supervisors, setSupervisors] = useState<Employee[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [selectedUnits, setSelectedUnits] = useState<string[]>([]);
  const [selectedCityFilter, setSelectedCityFilter] = useState<string>('all');
  const [draggedUnitId, setDraggedUnitId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<CreateVisitScheduleDTO>({
    supervisorId: '',
    clientId: '',
    scheduleDate: '',
    unitIds: [],
    startTime: '08:00',
    endTime: '17:00',
    observations: ''
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (formData.clientId) {
      loadClientUnits(formData.clientId);
    } else {
      setUnits([]);
      setSelectedUnits([]);
    }
  }, [formData.clientId]);

  const loadInitialData = async () => {
    try {
      setInitialLoading(true);
      
      // Carregar clientes com fallback para select e paginação
      let clientsList: any[] = [];
      try {
        const clientsRes = await clientService.getAllClients();
        if (Array.isArray(clientsRes) && clientsRes.length > 0) {
          clientsList = clientsRes;
        } else {
          const selectRes = await clientService.getClientsForSelect();
          clientsList = Array.isArray(selectRes) ? selectRes : [];
        }
      } catch (err) {
        console.warn('Fallback para getClientsForSelect:', err);
        try {
          const selectRes = await clientService.getClientsForSelect();
          clientsList = Array.isArray(selectRes) ? selectRes : [];
        } catch (e2) {
          console.error('Falha ao carregar clientes:', e2);
        }
      }
      setClients(clientsList);

      // Carregar funcionários / supervisores
      let supervisorsList: Employee[] = [];
      try {
        const employeesData = await employeeService.getAllEmployees(undefined, 0, 500);
        const list = Array.isArray(employeesData) ? employeesData : [];
        
        // Filtro resiliente para supervisor (posição, jobInfo, nome do cargo ou role)
        const filtered = list.filter((emp: any) => {
          const posName = String(emp.position?.name || emp.positionName || emp.jobInfo?.position || '').toLowerCase();
          const role = String(emp.role || emp.user?.roles || '').toLowerCase();
          const dept = String(emp.department?.name || '').toLowerCase();
          return posName.includes('supervisor') || 
                 posName.includes('supervis') || 
                 role.includes('supervisor') ||
                 dept.includes('supervis');
        });

        // Se o filtro restrito não encontrar ninguém cadastrado com cargo de supervisor,
        // disponibiliza a lista de colaboradores ativos para não travar a criação da escala
        supervisorsList = filtered.length > 0 ? filtered : list;
      } catch (err) {
        console.error('Falha ao carregar funcionários para supervisão:', err);
      }
      setSupervisors(supervisorsList);
    } catch (error) {
      console.error('Erro geral ao carregar dados:', error);
      toast.error('Erro ao carregar dados iniciais');
    } finally {
      setInitialLoading(false);
    }
  };

  const loadClientUnits = async (clientId: string) => {
    try {
      let loadedUnits: Unit[] = [];
      try {
        const unitsData = await unitService.getUnitsByClient(clientId);
        if (Array.isArray(unitsData) && unitsData.length > 0) {
          loadedUnits = unitsData;
        }
      } catch (err) {
        console.warn('Tentando carregar postos de trabalho diretamente...', err);
      }

      // Se não houver unidades cadastradas, busca os Postos de Trabalho diretamente vinculados ao cliente
      if (loadedUnits.length === 0) {
        try {
          const posts = await workPostService.getWorkPostsByClient(clientId);
          if (Array.isArray(posts) && posts.length > 0) {
            loadedUnits = posts.map(p => ({
              id: p.id,
              name: p.name || p.postCode || 'Posto sem nome',
              address: [p.address, p.city, p.state].filter(Boolean).join(' - ') || undefined,
              postCode: p.postCode,
              city: p.city,
              state: p.state,
              clientId: p.clientId,
              clientName: p.clientName
            }));
          }
        } catch (postErr) {
          console.error('Erro ao buscar postos do cliente:', postErr);
        }
      }

      setUnits(loadedUnits);
      setSelectedUnits([]);
      setSelectedCityFilter('all');
    } catch (error) {
      console.error('Erro ao carregar unidades/postos:', error);
      toast.error('Erro ao carregar postos do cliente');
    }
  };

  const handleUnitToggle = (unitId: string) => {
    setSelectedUnits(prev => {
      const updated = prev.includes(unitId)
        ? prev.filter(id => id !== unitId)
        : [...prev, unitId];
      
      setFormData(prevForm => ({
        ...prevForm,
        unitIds: updated
      }));
      
      return updated;
    });
  };

  // Agrupamento por cidade/região para facilidade de visualização
  const cities = Array.from(new Set(units.map(u => u.city || 'Sem cidade definida'))).filter(Boolean);

  const filteredUnits = selectedCityFilter === 'all' 
    ? units 
    : units.filter(u => (u.city || 'Sem cidade definida') === selectedCityFilter);

  // Otimizar ordem automaticamente por agrupamento de cidade/proximidade
  const handleAutoGroupRoute = () => {
    if (selectedUnits.length <= 1) {
      toast.info('Selecione pelo menos 2 postos para organizar a rota');
      return;
    }

    const selectedObjs = selectedUnits
      .map(id => units.find(u => u.id === id))
      .filter(Boolean) as Unit[];

    // Ordena primariamente por cidade, e secundariamente por nome do posto
    const sorted = [...selectedObjs].sort((a, b) => {
      const cityA = (a.city || 'ZZZ').toLowerCase();
      const cityB = (b.city || 'ZZZ').toLowerCase();
      if (cityA !== cityB) return cityA.localeCompare(cityB);
      return (a.name || '').localeCompare(b.name || '');
    });

    const newOrderedIds = sorted.map(u => u.id);
    setSelectedUnits(newOrderedIds);
    setFormData(prev => ({ ...prev, unitIds: newOrderedIds }));
    toast.success('Rota organizada por agrupamento de cidade e proximidade geográfica!');
  };

  // Drag and drop para reordenação manual das paradas da rota
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedUnitId(id);
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedUnitId || draggedUnitId === targetId) return;

    const currentOrder = [...selectedUnits];
    const sourceIdx = currentOrder.indexOf(draggedUnitId);
    const targetIdx = currentOrder.indexOf(targetId);

    if (sourceIdx !== -1 && targetIdx !== -1) {
      currentOrder.splice(sourceIdx, 1);
      currentOrder.splice(targetIdx, 0, draggedUnitId);
      setSelectedUnits(currentOrder);
      setFormData(prev => ({ ...prev, unitIds: currentOrder }));
      toast.success('Ordem das paradas atualizada!');
    }
    setDraggedUnitId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.supervisorId || !formData.clientId || !formData.scheduleDate || selectedUnits.length === 0) {
      toast.error('Preencha todos os campos obrigatórios (Supervisor, Cliente, Data e Postos)');
      return;
    }

    setLoading(true);
    try {
      const scheduleData = {
        ...formData,
        unitIds: selectedUnits
      };
      
      const newSchedule = await visitScheduleService.createOptimizedSchedule(scheduleData);
      
      toast.success(
        `Escala de Visitas criada com sucesso! Score de otimização: ${newSchedule.routeOptimizationScore?.toFixed(1) || '100'}%`,
        { duration: 5000 }
      );
      
      onScheduleCreated?.(newSchedule);
    } catch (error) {
      console.error('Erro ao criar escala:', error);
      toast.error('Erro ao criar escala de visitas');
    } finally {
      setLoading(false);
    }
  };

  const getOptimizationPreview = () => {
    if (selectedUnits.length < 2) return null;
    
    const selectedUnitObjects = selectedUnits
      .map(id => units.find(u => u.id === id))
      .filter(Boolean) as Unit[];
    const estimatedTime = selectedUnits.length * 35; // ~35 min por visita
    const hasCoordinates = selectedUnitObjects.some(unit => unit.latitude && unit.longitude);
    
    return (
      <Card className="border-gray-600 bg-seguranca-graphite">
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center justify-between text-seguranca-lightgray">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-seguranca-yellow" />
              <span>Sequência da Rota Definida ({selectedUnits.length} paradas)</span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAutoGroupRoute}
              className="text-xs border-seguranca-yellow text-seguranca-yellow hover:bg-seguranca-yellow/20"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1" />
              Reagrupar por Proximidade de Cidade
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 bg-seguranca-black rounded-lg border border-gray-600">
              <div className="w-8 h-8 bg-seguranca-darkred rounded-full flex items-center justify-center">
                <MapPin className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Total de Visitas</p>
                <p className="font-semibold text-seguranca-lightgray">{selectedUnits.length}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-seguranca-black rounded-lg border border-gray-600">
              <div className="w-8 h-8 bg-green-700 rounded-full flex items-center justify-center">
                <Clock className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Tempo Estimado</p>
                <p className="font-semibold text-seguranca-lightgray">
                  {Math.ceil(estimatedTime / 60)}h {estimatedTime % 60}min
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-seguranca-black rounded-lg border border-gray-600">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                hasCoordinates ? 'bg-green-700' : 'bg-yellow-600'
              }`}>
                {hasCoordinates ? (
                  <CheckCircle className="w-4 h-4 text-white" />
                ) : (
                  <Compass className="w-4 h-4 text-white" />
                )}
              </div>
              <div>
                <p className="text-xs text-gray-400">Roteirização Geográfica</p>
                <p className={`font-semibold text-sm ${
                  hasCoordinates ? 'text-green-400' : 'text-yellow-400'
                }`}>
                  {hasCoordinates ? 'Por GPS e Bairro' : 'Por Região e Cidade'}
                </p>
              </div>
            </div>
          </div>

          {/* Lista com Drag & Drop ordenado da Rota */}
          <div className="p-3 bg-seguranca-black/70 rounded-lg border border-gray-700">
            <p className="text-xs text-gray-400 mb-2 flex items-center gap-1.5">
              <ArrowDownUp className="w-3.5 h-3.5 text-seguranca-yellow" />
              <strong>Ordem de Visitação:</strong> Arraste e solte os cards abaixo para reordenar a sequência de paradas do supervisor.
            </p>
            <div className="space-y-2">
              {selectedUnitObjects.map((unit, index) => (
                <div
                  key={unit.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, unit.id)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, unit.id)}
                  className={`flex items-center justify-between p-2.5 rounded border transition-all cursor-move select-none ${
                    draggedUnitId === unit.id 
                      ? 'border-seguranca-yellow bg-seguranca-yellow/20' 
                      : 'border-gray-700 bg-seguranca-graphite hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-seguranca-darkred text-white flex items-center justify-center text-xs font-bold shrink-0">
                      {index + 1}
                    </span>
                    <GripVertical className="w-4 h-4 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium text-white">{unit.name}</p>
                      <p className="text-xs text-gray-400">{unit.city ? `${unit.city} • ` : ''}{unit.address || 'Sem endereço detalhado'}</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleUnitToggle(unit.id)}
                    className="text-gray-400 hover:text-red-400 h-7 w-7 p-0"
                    title="Remover parada"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (initialLoading) {
    return (
      <div className="w-full">
        <div className="flex items-center justify-center py-16">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 mx-auto border-4 border-seguranca-yellow border-t-transparent rounded-full animate-spin"></div>
            <div>
              <h3 className="text-lg font-medium text-seguranca-lightgray">Carregando dados...</h3>
              <p className="text-sm text-gray-400">Aguarde enquanto carregamos supervisores e clientes</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header com botão de fechar */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-600">
        <div>
          <h2 className="text-xl font-semibold text-seguranca-lightgray">Criar Nova Escala de Visitas</h2>
          <p className="text-sm text-gray-400 mt-1">Configure o supervisor, cliente e os postos de trabalho da rota</p>
        </div>
        {onCancel && (
          <Button 
            type="button" 
            variant="ghost" 
            size="sm"
            onClick={onCancel}
            className="text-gray-400 hover:text-seguranca-lightgray hover:bg-gray-700"
          >
            <X className="w-5 h-5" />
          </Button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6">
          {/* Informações Básicas */}
          <Card className="h-fit bg-seguranca-graphite border-gray-600">
            <CardHeader className="border-b border-gray-600">
              <CardTitle className="flex items-center gap-2 text-seguranca-lightgray">
                <Calendar className="w-5 h-5 text-seguranca-yellow" />
                Informações da Escala
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 p-4 lg:p-6">
              {/* Supervisor */}
              <div className="space-y-2">
                <Label htmlFor="supervisor" className="text-sm font-medium text-seguranca-lightgray">
                  Supervisor Responsável *
                </Label>
                <Select
                  value={formData.supervisorId}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, supervisorId: value }))}
                >
                  <SelectTrigger className="h-11 bg-seguranca-black border-gray-600 text-seguranca-lightgray">
                    <SelectValue placeholder="Selecione o supervisor responsável" />
                  </SelectTrigger>
                  <SelectContent className="bg-seguranca-black border-gray-600">
                    {supervisors.filter(supervisor => supervisor.id).map(supervisor => (
                      <SelectItem key={supervisor.id} value={supervisor.id!} className="text-seguranca-lightgray hover:bg-gray-700">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-seguranca-yellow" />
                          {supervisor.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {supervisors.length === 0 && (
                  <p className="text-xs text-yellow-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Nenhum supervisor encontrado
                  </p>
                )}
              </div>

              {/* Cliente */}
              <div className="space-y-2">
                <Label htmlFor="client" className="text-sm font-medium text-seguranca-lightgray">
                  Cliente *
                </Label>
                <Select
                  value={formData.clientId}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, clientId: value }))}
                >
                  <SelectTrigger className="h-11 bg-seguranca-black border-gray-600 text-seguranca-lightgray">
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent className="bg-seguranca-black border-gray-600">
                    {clients.filter(client => client.id).map(client => (
                      <SelectItem key={client.id} value={client.id} className="text-seguranca-lightgray hover:bg-gray-700">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-green-400" />
                          {client.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {clients.length === 0 && (
                  <p className="text-xs text-yellow-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Nenhum cliente encontrado
                  </p>
                )}
              </div>

              {/* Data da Escala */}
              <div className="space-y-2">
                <Label htmlFor="scheduleDate" className="text-sm font-medium text-seguranca-lightgray">
                  Data da Escala *
                </Label>
                <div className="relative">
                  <Input
                    id="scheduleDate"
                    type="date"
                    value={formData.scheduleDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, scheduleDate: e.target.value }))}
                    className="h-11 bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                  />
                </div>
                <p className="text-xs text-gray-400">
                  Data em que a rota de visitas será executada pelo supervisor
                </p>
              </div>

              {/* Horários */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime" className="text-sm font-medium text-seguranca-lightgray">
                    Horário de Início
                  </Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="startTime"
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                      className="h-11 pl-10 bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime" className="text-sm font-medium text-seguranca-lightgray">
                    Horário de Término
                  </Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="endTime"
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                      className="h-11 pl-10 bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                    />
                  </div>
                </div>
              </div>

              {/* Observações */}
              <div className="space-y-2">
                <Label htmlFor="observations" className="text-sm font-medium text-seguranca-lightgray">
                  Observações e Instruções da Rota
                </Label>
                <Textarea
                  id="observations"
                  value={formData.observations}
                  onChange={(e) => setFormData(prev => ({ ...prev, observations: e.target.value }))}
                  placeholder="Ex: Priorizar postos da região de Nova Lima pela manhã, verificar livro de ocorrências..."
                  rows={3}
                  className="resize-none bg-seguranca-black border-gray-600 text-seguranca-lightgray placeholder:text-gray-500"
                />
              </div>
            </CardContent>
          </Card>

          {/* Seleção de Postos de Trabalho */}
          <Card className="h-fit bg-seguranca-graphite border-gray-600">
            <CardHeader className="border-b border-gray-600">
              <CardTitle className="flex items-center justify-between text-seguranca-lightgray">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-seguranca-yellow" />
                  Postos de Trabalho do Cliente
                </div>
                <Badge variant="secondary" className="bg-seguranca-darkred text-white">
                  {selectedUnits.length} selecionados
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 lg:p-6">
              {!formData.clientId ? (
                <div className="text-center py-8 lg:py-12 space-y-3">
                  <div className="w-16 h-16 mx-auto bg-gray-700 rounded-full flex items-center justify-center">
                    <Building2 className="w-8 h-8 text-gray-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-seguranca-lightgray">Selecione um cliente</h3>
                    <p className="text-sm text-gray-400 mt-1">
                      Escolha o cliente para visualizar os postos de trabalho e setores disponíveis
                    </p>
                  </div>
                </div>
              ) : units.length === 0 ? (
                <div className="text-center py-8 lg:py-12 space-y-3">
                  <div className="w-16 h-16 mx-auto bg-yellow-600/20 rounded-full flex items-center justify-center">
                    <MapPin className="w-8 h-8 text-yellow-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-seguranca-lightgray">Nenhum posto encontrado</h3>
                    <p className="text-sm text-gray-400 mt-1">
                      Este cliente não possui postos de trabalho cadastrados
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Filtro por Cidade/Região Geográfica */}
                  {cities.length > 1 && (
                    <div className="flex items-center gap-2 p-2.5 bg-seguranca-black rounded-lg border border-gray-700">
                      <Map className="w-4 h-4 text-seguranca-yellow shrink-0" />
                      <span className="text-xs text-gray-300 font-medium">Filtrar por Região:</span>
                      <div className="flex flex-wrap gap-1.5 flex-1">
                        <button
                          type="button"
                          onClick={() => setSelectedCityFilter('all')}
                          className={`text-xs px-2.5 py-1 rounded transition-colors ${
                            selectedCityFilter === 'all'
                              ? 'bg-seguranca-yellow text-seguranca-black font-semibold'
                              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                          }`}
                        >
                          Todas ({units.length})
                        </button>
                        {cities.map(city => {
                          const count = units.filter(u => (u.city || 'Sem cidade definida') === city).length;
                          return (
                            <button
                              key={city}
                              type="button"
                              onClick={() => setSelectedCityFilter(city)}
                              className={`text-xs px-2.5 py-1 rounded transition-colors ${
                                selectedCityFilter === city
                                  ? 'bg-seguranca-yellow text-seguranca-black font-semibold'
                                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                              }`}
                            >
                              {city} ({count})
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Controles de seleção em lote */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 bg-seguranca-black rounded-lg border border-gray-600">
                    <span className="text-sm font-medium text-seguranca-lightgray">
                      {filteredUnits.length} postos listados
                    </span>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const currentFilteredIds = filteredUnits.map(unit => unit.id);
                          const combined = Array.from(new Set([...selectedUnits, ...currentFilteredIds]));
                          setSelectedUnits(combined);
                          setFormData(prev => ({ ...prev, unitIds: combined }));
                        }}
                        className="bg-transparent border-gray-600 text-seguranca-lightgray hover:bg-gray-700 text-xs"
                      >
                        Selecionar da Região
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const allIds = units.map(unit => unit.id);
                          setSelectedUnits(allIds);
                          setFormData(prev => ({ ...prev, unitIds: allIds }));
                        }}
                        disabled={selectedUnits.length === units.length}
                        className="bg-transparent border-gray-600 text-seguranca-lightgray hover:bg-gray-700 text-xs"
                      >
                        Todos ({units.length})
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedUnits([]);
                          setFormData(prev => ({ ...prev, unitIds: [] }));
                        }}
                        disabled={selectedUnits.length === 0}
                        className="bg-transparent border-gray-600 text-seguranca-lightgray hover:bg-gray-700 text-xs"
                      >
                        Limpar
                      </Button>
                    </div>
                  </div>

                  {/* Lista de unidades / postos */}
                  <div className="space-y-3 max-h-72 lg:max-h-96 overflow-y-auto pr-2">
                    {filteredUnits.map(unit => (
                      <div
                        key={unit.id}
                        className={`flex items-start space-x-3 p-3 lg:p-4 border rounded-lg transition-all cursor-pointer ${
                          selectedUnits.includes(unit.id) 
                            ? 'border-seguranca-yellow bg-seguranca-yellow/10' 
                            : 'border-gray-600 hover:border-gray-500 bg-seguranca-black/50'
                        }`}
                        onClick={() => handleUnitToggle(unit.id)}
                      >
                        <Checkbox
                          id={`unit-${unit.id}`}
                          checked={selectedUnits.includes(unit.id)}
                          onCheckedChange={() => handleUnitToggle(unit.id)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <label
                              htmlFor={`unit-${unit.id}`}
                              className="text-sm font-semibold cursor-pointer block text-seguranca-lightgray"
                            >
                              {unit.name}
                            </label>
                            {unit.city && (
                              <Badge variant="outline" className="text-[11px] border-gray-600 text-gray-300">
                                {unit.city}
                              </Badge>
                            )}
                          </div>
                          {unit.address && (
                            <p className="text-xs text-gray-400 mt-1 line-clamp-2">{unit.address}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            {unit.latitude && unit.longitude ? (
                              <Badge variant="outline" className="text-xs border-green-500 text-green-400 bg-green-500/10">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Coordenadas GPS OK
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs border-gray-500 text-gray-400 bg-gray-500/10">
                                <MapPin className="w-3 h-3 mr-1" />
                                Endereço Cadastrado
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Preview da Otimização e Sequenciamento Drag & Drop */}
        {getOptimizationPreview()}

        {/* Botões de Ação */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-gray-600">
          <Button
            type="submit"
            disabled={loading || selectedUnits.length === 0 || !formData.supervisorId || !formData.clientId || !formData.scheduleDate}
            className="bg-seguranca-darkred hover:bg-seguranca-red text-white order-1 min-w-[220px] h-11 text-base font-semibold"
          >
            {loading ? (
              <>
                <BarChart3 className="w-4 h-4 mr-2 animate-pulse" />
                Otimizando Rota...
              </>
            ) : (
              <>
                <Route className="w-4 h-4 mr-2" />
                Criar Escala Otimizada ({selectedUnits.length} postos)
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreateVisitSchedule;
