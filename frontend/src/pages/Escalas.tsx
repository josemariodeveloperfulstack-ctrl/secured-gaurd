import React, { useState, useEffect, useMemo } from 'react';
import { format, startOfWeek, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { StandardLayout } from '@/components/StandardLayout';
import EscalaFormModal from '../components/EscalaFormModal';
import { Calendar as CalendarIcon, Filter, Users, AlertTriangle, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/components/ui/use-toast';
import { scheduleService, Schedule, ScheduleFilters, CreateScheduleRequest } from '@/services/scheduleService';
import { dashboardService, ScheduleSummary } from '@/services/dashboardService';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// Interface para os dados do formulário de escala
interface EscalaFormData {
  employeeId: string;
  locationId: string;
  workPostId: string;
  scheduleDate: Date;
  shift: string;
  startTime: string;
  endTime: string;
  observations: string;
  status?: string;
} // Ajustado para refletir os campos esperados pelo backend

const Escalas = () => {
  const { toast } = useToast();
  const [date, setDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'semanal' | 'mensal'>('semanal');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEscala, setSelectedEscala] = useState<Schedule | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [scheduleSummary, setScheduleSummary] = useState<ScheduleSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [escalaToDelete, setEscalaToDelete] = useState<Schedule | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Monitorar mudanças no estado do modal
  useEffect(() => {
    console.log('📊 Estado do modal mudou:', {
      isModalOpen,
      modalMode,
      selectedEscala: selectedEscala ? selectedEscala.id : null
    });
  }, [isModalOpen, modalMode, selectedEscala]);

  // Gere dias da semana começando da segunda-feira
  const startDate = startOfWeek(date, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(startDate, i));

  // Carregar escalas do backend
  const loadSchedules = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Carregando escalas...');
      
      // Por enquanto, buscar todas as escalas sem filtros de data
      // O backend pode não suportar filtros ainda
      const data = await scheduleService.getSchedules();
      
      console.log('✅ Escalas recebidas do backend:', data);
      console.log('📊 Quantidade de escalas:', data?.length || 0);
      
      setSchedules(data || []);
    } catch (err: any) {
      console.error('❌ Erro ao carregar escalas:', err);
      console.error('❌ Status:', err.response?.status);
      console.error('❌ Mensagem:', err.response?.data);
      
      setError('Erro ao carregar escalas. Tente novamente.');
      toast({
        title: 'Erro',
        description: err.response?.data?.message || 'Não foi possível carregar as escalas.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Carregar resumo das escalas
  const loadScheduleSummary = async () => {
    try {
      setLoadingSummary(true);
      const summary = await dashboardService.getScheduleSummary();
      setScheduleSummary(summary);
    } catch (err) {
      console.error('Erro ao carregar resumo das escalas:', err);
      // Não mostrar erro para o usuário, apenas log
    } finally {
      setLoadingSummary(false);
    }
  };

  useEffect(() => {
    loadSchedules();
    loadScheduleSummary();
    // eslint-disable-next-line
  }, [date]);

  // Agrupar escalas por funcionário para exibição semanal
  const escalasFuncionarios = React.useMemo(() => {
    const map: { [employeeId: string]: { nome: string; cargo: string; escalas: any[] } } = {};
    schedules.forEach((s) => {
      // Acessar employee como objeto (conforme interface Schedule)
      const employeeId = s.employee?.id || (s as any).employeeId || '';
      const employeeName = s.employee?.name || (s as any).employeeName || 'Sem funcionário';
      const locationName = s.location?.name || (s as any).locationName || (s as any).clientName || 'Sem local';
      
      if (!map[employeeId]) {
        map[employeeId] = {
          nome: employeeName,
          cargo: '', // Pode ser preenchido se vier do backend
          escalas: Array(7).fill({ turno: '', cliente: '', horario: '' }),
        };
      }
      const dia = weekDays.findIndex((d) => format(d, 'yyyy-MM-dd') === s.scheduleDate);
      if (dia >= 0) {
        map[employeeId].escalas[dia] = {
          turno: s.shift,
          cliente: locationName,
          horario: `${(s as any).startTime || ''} - ${(s as any).endTime || ''}`,
        };
      }
    });
    return Object.entries(map).map(([id, v]) => ({ id, ...v }));
  }, [schedules, weekDays]);

  // Alertas de escalas
  const alertasEscalas = [
    {
      id: 1,
      tipo: 'warning',
      mensagem: 'Carlos Oliveira não possui folga semanal conforme lei',
      funcionario: 'Carlos Oliveira'
    },
    {
      id: 2,
      tipo: 'alert',
      mensagem: 'Antônio Ferreira sem cobertura no dia 25/05',
      funcionario: 'Antônio Ferreira'
    },
    {
      id: 3,
      tipo: 'warning',
      mensagem: 'Juliana Costa completará 7 dias consecutivos de trabalho',
      funcionario: 'Juliana Costa'
    }
  ];

  const getTurnoCellClass = (turno: string) => {
    switch (turno) {
      case 'Diurno':
        return 'bg-seguranca-yellow/30 text-seguranca-black';
      case 'Noturno':
        return 'bg-seguranca-red/30 text-seguranca-black';
      case 'Administrativo':
        return 'bg-blue-500/30 text-seguranca-black';
      case 'Folga':
        return 'bg-gray-500/30 text-seguranca-black';
      default:
        return '';
    }
  };

  // Função para lidar com a criação/edição de escala
  const handleSaveEscala = async (data: EscalaFormData) => {
  try {
    console.log('💾 Salvando escala com dados:', data);
    
    // Validação: verificar se todos os campos obrigatórios estão preenchidos
    if (!data.employeeId || !data.locationId || !data.shift || !data.scheduleDate) {
      toast({
        title: 'Erro de validação',
        description: 'Por favor, preencha todos os campos obrigatórios.',
        variant: 'destructive',
      });
      return;
    }
    
    // Ajustar o mapeamento para o DTO correto do backend
    const mappedData: any = {
      employeeId: data.employeeId,
      locationId: data.locationId,
      scheduleDate: format(data.scheduleDate, 'yyyy-MM-dd'),
      shift: data.shift, // O backend espera 'DAY', 'NIGHT', 'MIXED', etc.
      status: 'PENDING', // Status padrão
    };
    
    // Adicionar workPostId apenas se foi selecionado (e não for string vazia)
    if (data.workPostId && data.workPostId.trim() !== '' && data.workPostId !== 'none') {
      mappedData.workPostId = data.workPostId;
    }
    
    // Adicionar observations apenas se não for vazio
    if (data.observations && data.observations.trim() !== '') {
      mappedData.observations = data.observations;
    }
    
    // Remover campos undefined para evitar problemas de serialização
    Object.keys(mappedData).forEach(key => {
      if (mappedData[key] === undefined) {
        delete mappedData[key];
      }
    });
    
    console.log('📤 Dados mapeados para envio:', mappedData);
    if (modalMode === 'edit' && selectedEscala) {
      await scheduleService.update(selectedEscala.id, mappedData);
      toast({
        title: 'Escala editada com sucesso!',
        description: `Escala para ${data.shift} no dia ${format(data.scheduleDate, 'dd/MM/yyyy')}`,
      });
    } else {
      await scheduleService.create(mappedData);
      toast({
        title: 'Escala salva com sucesso!',
        description: `Escala para ${data.shift} no dia ${format(data.scheduleDate, 'dd/MM/yyyy')}`,
      });
    }
    setIsModalOpen(false);
    setSelectedEscala(null);
    loadSchedules();
  } catch (err: any) {
    console.error('❌ Erro detalhado ao salvar escala:', err);
    console.error('❌ Response data:', err.response?.data);
    console.error('❌ Response status:', err.response?.status);
    
    const errorMessage = err.response?.data?.message || 
                        err.response?.data?.error || 
                        err.message || 
                        'Não foi possível salvar a escala.';
    
    toast({
      title: 'Erro ao salvar escala',
      description: errorMessage,
      variant: 'destructive',
    });
    }
  };

  // Função para abrir diálogo de confirmação de exclusão
  const handleDeleteClick = (escala: Schedule) => {
    setEscalaToDelete(escala);
    setDeleteDialogOpen(true);
  };

  // Função para confirmar e deletar escala
  const handleDeleteConfirm = async () => {
    if (!escalaToDelete) return;
    
    setIsDeleting(true);
    try {
      await scheduleService.deleteSchedule(escalaToDelete.id);
      toast({ 
        title: 'Excluída com sucesso!', 
        description: `A escala de ${escalaToDelete.employee?.name || 'funcionário'} foi removida.` 
      });
      setDeleteDialogOpen(false);
      setEscalaToDelete(null);
      loadSchedules();
    } catch (err) {
      console.error('Erro ao excluir escala:', err);
      toast({ 
        title: 'Erro ao excluir', 
        description: 'Não foi possível excluir a escala. Tente novamente.', 
        variant: 'destructive' 
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Função para editar escala
  const handleEditEscala = (escala: Schedule) => {
    console.log('✏️ handleEditEscala INICIADO - escala recebida:', escala);
    console.log('✏️ handleEditEscala - Dados completos:', JSON.stringify(escala, null, 2));
    
    try {
      setSelectedEscala(escala);
      setModalMode('edit');
      setIsModalOpen(true);
      console.log('✏️ handleEditEscala - CONCLUÍDO com sucesso');
    } catch (error) {
      console.error('❌ handleEditEscala - ERRO:', error);
    }
  };

  // Função para visualizar escala
  const handleViewEscala = (escala: Schedule) => {
    console.log('🔍 handleViewEscala INICIADO - escala recebida:', escala);
    console.log('🔍 handleViewEscala - Estado ANTES da atualização:', {
      isModalOpen,
      modalMode,
      selectedEscala: selectedEscala?.id
    });
    
    // Atualizar estados de forma síncrona
    setSelectedEscala(escala);
    setModalMode('view');
    setIsModalOpen(true);
    
    console.log('🔍 handleViewEscala - Estados atualizados (síncrono):', {
      selectedEscala: escala.id,
      modalMode: 'view',
      isModalOpen: true
    });
    
    // Verificar após um pequeno delay para ver se os estados foram atualizados
    setTimeout(() => {
      console.log('🔍 handleViewEscala - Estado DEPOIS (100ms):', {
        isModalOpen,
        modalMode,
        selectedEscala: selectedEscala?.id
      });
    }, 100);
  };

  // Loading state
  if (loading) {
    return (
      <StandardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-seguranca-red mb-4" />
          <p className="text-seguranca-lightgray">Carregando escalas...</p>
        </div>
      </StandardLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <StandardLayout>
        <div className="flex items-center justify-center h-64">
          <AlertCircle className="mx-auto h-8 w-8 text-red-500 mb-4" />
          <p className="text-seguranca-lightgray mb-4">{error}</p>
          <Button onClick={loadSchedules} className="bg-seguranca-red hover:bg-seguranca-darkred">Tentar Novamente</Button>
        </div>
      </StandardLayout>
    );
  }

  return (
    <StandardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-seguranca-lightgray">Escalas de Trabalho</h1>
            <p className="text-gray-400 mt-1">Gerenciamento de escalas e turnos</p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray">
              <Filter className="mr-2 h-4 w-4" />
              Filtros
            </Button>
            <Button 
              className="bg-seguranca-red hover:bg-seguranca-darkred"
              onClick={() => { setSelectedEscala(null); setModalMode('create'); setIsModalOpen(true); }}
            >
              + Nova Escala
            </Button>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(date, 'PPP', { locale: ptBR })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-seguranca-graphite border-gray-600">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(date) => date && setDate(date)}
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            
            <div className="flex items-center bg-seguranca-graphite border border-gray-600 rounded-lg overflow-hidden">
              <Button
                variant={viewMode === 'semanal' ? 'default' : 'outline'}
                className={`rounded-none border-0 ${viewMode === 'semanal' ? 'bg-seguranca-red' : 'bg-transparent text-seguranca-lightgray'}`}
                onClick={() => setViewMode('semanal')}
              >
                Semanal
              </Button>
              <Button
                variant={viewMode === 'mensal' ? 'default' : 'outline'} 
                className={`rounded-none border-0 ${viewMode === 'mensal' ? 'bg-seguranca-red' : 'bg-transparent text-seguranca-lightgray'}`}
                onClick={() => setViewMode('mensal')}
              >
                Mensal
              </Button>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2">
            <Card className="bg-seguranca-graphite border-gray-600">
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between text-seguranca-lightgray">
                  <span>Escalas da Semana</span>
                  <Button variant="outline" size="sm" className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray">
                    <Users className="mr-2 h-4 w-4" />
                    Visualizar Todos
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-600">
                        <TableHead className="text-seguranca-lightgray">Funcionário</TableHead>
                        {weekDays.map((day, index) => (
                          <TableHead key={index} className="text-seguranca-lightgray text-center">
                            <div>{format(day, 'EEE', { locale: ptBR })}</div>
                            <div className="text-xs">{format(day, 'dd/MM')}</div>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {escalasFuncionarios.map((funcionario) => (
                        <TableRow key={funcionario.id} className="border-gray-600">
                          <TableCell className="font-medium text-seguranca-lightgray">
                            <div>{funcionario.nome}</div>
                            <div className="text-xs text-gray-400">{funcionario.cargo}</div>
                          </TableCell>
                          {funcionario.escalas.map((escala, index) => (
                            <TableCell 
                              key={index} 
                              className={`text-center ${getTurnoCellClass(escala.turno)}`}
                            >
                              <div className="font-medium">{escala.turno}</div>
                              {escala.turno !== 'Folga' && (
                                <>
                                  <div className="text-xs">{escala.horario}</div>
                                  <div className="text-xs truncate max-w-32">{escala.cliente}</div>
                                </>
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div>
            <Card className="bg-seguranca-graphite border-gray-600">
              <CardHeader>
                <CardTitle className="text-lg flex items-center text-seguranca-lightgray">
                  <AlertTriangle className="h-5 w-5 text-seguranca-yellow mr-2" />
                  Alertas de Escalas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {alertasEscalas.map((alerta) => (
                    <div 
                      key={alerta.id} 
                      className="p-3 bg-seguranca-black rounded-lg border-l-4 border-seguranca-yellow"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">
                          <AlertTriangle size={16} className="text-seguranca-yellow" />
                        </div>
                        <div>
                          <h4 className="font-medium text-sm text-seguranca-lightgray">{alerta.funcionario}</h4>
                          <p className="text-sm text-gray-400 my-1">{alerta.mensagem}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <Button variant="link" className="text-seguranca-yellow hover:underline text-sm w-full">
                    Ver todos os alertas
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-seguranca-graphite border-gray-600 mt-6">
              <CardHeader>
                <CardTitle className="text-lg text-seguranca-lightgray">Resumo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {loadingSummary ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Funcionários escalados:</span>
                        <span className="font-medium text-seguranca-lightgray">
                          {scheduleSummary?.totalEmployees || 0}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Turnos diurnos:</span>
                        <span className="font-medium text-seguranca-lightgray">
                          {scheduleSummary?.dayShifts || 0}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Turnos noturnos:</span>
                        <span className="font-medium text-seguranca-lightgray">
                          {scheduleSummary?.nightShifts || 0}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Postos de trabalho:</span>
                        <span className="font-medium text-seguranca-lightgray">
                          {scheduleSummary?.totalLocations || 0}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Faltas previstas:</span>
                        <span className="font-medium text-seguranca-red">
                          {scheduleSummary?.expectedAbsences || 0}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-seguranca-graphite border-gray-600">
            <CardHeader>
              <CardTitle className="text-lg text-seguranca-lightgray">Trocas de Turno Pendentes</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-600">
                    <TableHead className="text-seguranca-lightgray">Solicitante</TableHead>
                    <TableHead className="text-seguranca-lightgray">Data</TableHead>
                    <TableHead className="text-seguranca-lightgray">Turno</TableHead>
                    <TableHead className="text-seguranca-lightgray text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="border-gray-600">
                    <TableCell className="text-seguranca-lightgray">Ana Silva</TableCell>
                    <TableCell className="text-seguranca-lightgray">24/05/2025</TableCell>
                    <TableCell className="text-seguranca-lightgray">Noturno</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray">
                        Detalhes
                      </Button>
                    </TableCell>
                  </TableRow>
                  <TableRow className="border-gray-600">
                    <TableCell className="text-seguranca-lightgray">Marcos Santos</TableCell>
                    <TableCell className="text-seguranca-lightgray">27/05/2025</TableCell>
                    <TableCell className="text-seguranca-lightgray">Diurno</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray">
                        Detalhes
                      </Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          
          <Card className="bg-seguranca-graphite border-gray-600">
            <CardHeader>
              <CardTitle className="text-lg text-seguranca-lightgray">Solicitações de Folga</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-600">
                    <TableHead className="text-seguranca-lightgray">Funcionário</TableHead>
                    <TableHead className="text-seguranca-lightgray">Data</TableHead>
                    <TableHead className="text-seguranca-lightgray">Motivo</TableHead>
                    <TableHead className="text-seguranca-lightgray text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="border-gray-600">
                    <TableCell className="text-seguranca-lightgray">Carlos Oliveira</TableCell>
                    <TableCell className="text-seguranca-lightgray">30/05/2025</TableCell>
                    <TableCell className="text-seguranca-lightgray">Médico</TableCell>
                    <TableCell className="text-right">
                      <span className="text-yellow-500">Pendente</span>
                    </TableCell>
                  </TableRow>
                  <TableRow className="border-gray-600">
                    <TableCell className="text-seguranca-lightgray">Juliana Costa</TableCell>
                    <TableCell className="text-seguranca-lightgray">03/06/2025</TableCell>
                    <TableCell className="text-seguranca-lightgray">Pessoal</TableCell>
                    <TableCell className="text-right">
                      <span className="text-yellow-500">Pendente</span>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
        
        {/* Modal de Formulário de Escala */}
        <EscalaTrabalhoTable
          escalas={schedules}
          isLoading={loading}
          onRefresh={loadSchedules}
          onEdit={handleEditEscala}
          onDelete={handleDeleteClick}
          onView={(escala) => {
            console.log('📞 onView chamado diretamente na prop, escala:', escala);
            handleViewEscala(escala);
          }}
          onCreate={() => { setSelectedEscala(null); setModalMode('create'); setIsModalOpen(true); }}
        />

        <EscalaFormModal
          key={`modal-${selectedEscala?.id || 'new'}-${modalMode}`}
          open={isModalOpen}
          onOpenChange={(open) => {
            console.log('🎭 EscalaFormModal onOpenChange chamado:', open, 'isModalOpen atual:', isModalOpen);
            setIsModalOpen(open);
            if (!open) {
              setSelectedEscala(null);
              setModalMode('create');
            }
          }}
          onSave={handleSaveEscala}
          initialData={useMemo(() => {
            if (selectedEscala) {
              const mappedData = {
                employeeId: selectedEscala.employee?.id || '',
                locationId: selectedEscala.location?.id || '',
                workPostId: selectedEscala.workPost?.id || '',
                scheduleDate: selectedEscala.scheduleDate ? new Date(selectedEscala.scheduleDate) : new Date(),
                shift: selectedEscala.shift || '',
                startTime: (selectedEscala as any).startTime || (selectedEscala.shift === 'DAY' ? '08:00' : selectedEscala.shift === 'NIGHT' ? '22:00' : '14:00') || '',
                endTime: (selectedEscala as any).endTime || (selectedEscala.shift === 'DAY' ? '17:00' : selectedEscala.shift === 'NIGHT' ? '06:00' : '22:00') || '',
                observations: selectedEscala.observations || '',
              };
              console.log('📋 initialData mapeado (useMemo):', mappedData);
              console.log('📋 selectedEscala original:', selectedEscala);
              return mappedData;
            }
            return {
              employeeId: '',
              locationId: '',
              workPostId: '',
              scheduleDate: new Date(),
              shift: '',
              startTime: '',
              endTime: '',
              observations: '',
            };
          }, [selectedEscala])}
          mode={modalMode}
        />

        {/* Diálogo de Confirmação de Exclusão */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="bg-seguranca-graphite border-gray-600">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-seguranca-lightgray">
                Confirmar Exclusão
              </AlertDialogTitle>
              <AlertDialogDescription className="text-gray-400">
                Tem certeza que deseja excluir a escala de{' '}
                <span className="font-semibold text-white">
                  {escalaToDelete?.employee?.name || 'funcionário'}
                </span>
                {' '}para o dia{' '}
                <span className="font-semibold text-white">
                  {escalaToDelete?.scheduleDate ? format(new Date(escalaToDelete.scheduleDate), 'dd/MM/yyyy', { locale: ptBR }) : 'data'}
                </span>?
                <br />
                <span className="text-xs text-gray-500 mt-2 block">
                  Esta ação não pode ser desfeita.
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel 
                className="bg-seguranca-graphite text-seguranca-lightgray border-gray-600 hover:bg-gray-700"
                disabled={isDeleting}
              >
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isDeleting ? 'Excluindo...' : 'Excluir'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </StandardLayout>
  );
};

export default Escalas;
