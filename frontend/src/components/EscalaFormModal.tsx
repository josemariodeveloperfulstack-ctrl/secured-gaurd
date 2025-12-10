
import React, { useState, useEffect } from 'react';
import { format, addDays, isWeekend, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CalendarIcon,
  Clock,
  User,
  MapPin,
  Building,
  AlertCircle,
  CheckCircle2,
  Calendar as CalendarLucide,
  Users
} from 'lucide-react';

interface EscalaFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: EscalaFormData) => void;
  initialData?: EscalaFormData;
  mode?: 'create' | 'edit' | 'view';
}

interface EscalaFormData {
  employeeId: string;
  locationId: string;
  workPostId: string;
  scheduleDate: Date;
  shift: string;
  startTime: string;
  endTime: string;
  observations: string;
}

interface ValidationErrors {
  employeeId?: string;
  locationId?: string;
  workPostId?: string;
  scheduleDate?: string;
  shift?: string;
  startTime?: string;
  endTime?: string;
}

const EscalaFormModal: React.FC<EscalaFormModalProps> = ({
  open,
  onOpenChange,
  onSave,
  initialData,
  mode = 'create'
}) => {
  // Log para debug
  useEffect(() => {
    console.log('🎭 EscalaFormModal renderizado - open:', open, 'mode:', mode, 'initialData:', initialData);
    console.log('🎭 EscalaFormModal - Título será:', mode === 'view' ? 'Visualizar Escala' : mode === 'edit' ? 'Editar Escala' : 'Nova Escala');
  }, [open, mode, initialData]);
  // Função para obter dados padrão
  const getDefaultFormData = (): EscalaFormData => ({
    employeeId: '',
    locationId: '',
    workPostId: '',
    scheduleDate: new Date(),
    shift: '',
    startTime: '',
    endTime: '',
    observations: ''
  });

  const [formData, setFormData] = useState<EscalaFormData>(getDefaultFormData());
  const [selectedClientId, setSelectedClientId] = useState<string>(''); // Cliente selecionado (para exibição)

  const [usuarios, setUsuarios] = useState<{ id: string; name: string }[]>([]);
  const [clientes, setClientes] = useState<{ id: string; name: string }[]>([]);
  const [postosTrabalho, setPostosTrabalho] = useState<{ id: string; name: string; postCode: string; clientId?: string }[]>([]);
  const [postosFiltrados, setPostosFiltrados] = useState<{ id: string; name: string; postCode: string }[]>([]);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const { toast } = useToast();

  // Carregar dados do backend quando o modal abrir
  useEffect(() => {
    if (!open) return; // Não carregar se o modal estiver fechado
    
    const loadData = async () => {
      console.log('🔄 Carregando dados para o modal de escala...');
      
      try {
        // Carregar funcionários (employees, não users)
        const { employeeService } = await import('@/services/employeeService');
        const employees: any = await employeeService.getAllEmployees();
        // employeeService pode retornar um objeto com 'content' ou um array direto
        const employeesList = Array.isArray(employees) 
          ? employees 
          : (employees?.content || []);
        const mappedEmployees = employeesList.map((e: any) => ({ 
          id: e.id, 
          name: e.name || e.nome || 'Funcionário sem nome' 
        }));
        setUsuarios(mappedEmployees);
        console.log('✅ Funcionários carregados:', mappedEmployees.length);
      } catch (error) {
        console.error('❌ Erro ao carregar funcionários:', error);
        setUsuarios([]);
      }

      try {
        // Carregar clientes
        const { clientService } = await import('@/services/clientService');
        const clients = await clientService.getAllClients();
        const mappedClients = clients.map(c => ({ id: c.id, name: c.name }));
        setClientes(mappedClients);
        console.log('✅ Clientes carregados:', mappedClients.length, mappedClients);
      } catch (error) {
        console.error('❌ Erro ao carregar clientes:', error);
        console.error('❌ Detalhes do erro:', error);
        setClientes([]);
      }

      // Não precisamos mais carregar locations separadas
      // O Posto de Trabalho será usado como locationId

      try {
        // Carregar postos de trabalho
        const { workPostService } = await import('@/services/workPostService');
        const workPosts = await workPostService.getAllWorkPosts();
        const mappedWorkPosts = workPosts.map(wp => ({ 
          id: wp.id, 
          name: wp.name, 
          postCode: wp.postCode || '',
          clientId: wp.clientId 
        }));
        setPostosTrabalho(mappedWorkPosts);
        setPostosFiltrados(mappedWorkPosts); // Inicializar com todos os postos
        console.log('✅ Postos de trabalho carregados:', mappedWorkPosts.length);
      } catch (error) {
        console.error('❌ Erro ao carregar postos de trabalho:', error);
        console.error('❌ Detalhes do erro:', error);
        setPostosTrabalho([]);
        setPostosFiltrados([]);
      }
    };

    loadData();
  }, [open]); // Executar quando o modal abrir

  // Atualizar lista de postos filtrados quando postosTrabalho ou cliente selecionado mudar
  useEffect(() => {
    if (selectedClientId) {
      // Filtrar postos pelo cliente selecionado
      const filtered = postosTrabalho.filter(posto => posto.clientId === selectedClientId);
      console.log('🔄 Filtrando postos para o cliente:', selectedClientId, 'Total encontrado:', filtered.length);
      setPostosFiltrados(filtered);
    } else {
      // Se não há cliente selecionado, mostrar todos os postos
      console.log('🔄 Mostrando todos os postos (nenhum cliente selecionado). Total:', postosTrabalho.length);
      setPostosFiltrados(postosTrabalho);
    }
  }, [postosTrabalho, selectedClientId]);

  // Validação de formulário
  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    if (!formData.employeeId) {
      newErrors.employeeId = 'Funcionário é obrigatório';
    }

    if (!selectedClientId) {
      newErrors.locationId = 'Cliente é obrigatório';
    }

    if (!formData.workPostId) {
      newErrors.workPostId = 'Posto de Trabalho é obrigatório';
    }

    if (!formData.scheduleDate) {
      newErrors.scheduleDate = 'Data é obrigatória';
    } else if (isBefore(startOfDay(formData.scheduleDate), startOfDay(new Date()))) {
      newErrors.scheduleDate = 'Data não pode ser no passado';
    }

    if (!formData.shift) {
      newErrors.shift = 'Turno é obrigatório';
    }

    if (!formData.startTime) {
      newErrors.startTime = 'Horário de início é obrigatório';
    }

    if (!formData.endTime) {
      newErrors.endTime = 'Horário de término é obrigatório';
    }

    if (formData.startTime && formData.endTime) {
      const start = new Date(`2000-01-01T${formData.startTime}`);
      let end = new Date(`2000-01-01T${formData.endTime}`);

      // Se o horário de fim for menor que o de início, assumir que é no dia seguinte (turno noturno)
      if (end <= start) {
        end = new Date(`2000-01-02T${formData.endTime}`);
      }

      // Calcular duração em horas
      const durationMs = end.getTime() - start.getTime();
      const durationHours = durationMs / (1000 * 60 * 60);

      // Validar se a duração é razoável (entre 1 e 24 horas)
      if (durationHours < 1) {
        newErrors.endTime = 'Turno deve ter pelo menos 1 hora de duração';
      } else if (durationHours > 24) {
        newErrors.endTime = 'Turno não pode exceder 24 horas';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof EscalaFormData, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Limpar erro do campo quando o usuário começar a digitar
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }

    // Auto-preenchimento de horários baseado no turno
    if (field === 'shift') {
      switch (value) {
        case 'DAY':
          setFormData(prev => ({
            ...prev,
            shift: value,
            startTime: '08:00',
            endTime: '17:00'
          }));
          break;
        case 'NIGHT':
          setFormData(prev => ({
            ...prev,
            shift: value,
            startTime: '22:00',
            endTime: '06:00'
          }));
          break;
        case 'MIXED':
          setFormData(prev => ({
            ...prev,
            shift: value,
            startTime: '14:00',
            endTime: '22:00'
          }));
          break;
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Não permitir submit no modo view
    if (mode === 'view') {
      return;
    }

    // Garantir que locationId = workPostId (Posto de Trabalho = Localização)
    if (formData.workPostId && formData.locationId !== formData.workPostId) {
      console.log('✅ Ajustando locationId para usar workPostId:', formData.workPostId);
      setFormData(prev => ({ ...prev, locationId: prev.workPostId }));
      // Aguardar um momento para o state atualizar e validar novamente
      setTimeout(() => {
        if (!validateForm()) {
          toast({
            title: "Erro de Validação",
            description: "Por favor, corrija os campos destacados.",
            variant: "destructive"
          });
          return;
        }
        submitForm();
      }, 100);
      return;
    }

    if (!validateForm()) {
      toast({
        title: "Erro de Validação",
        description: "Por favor, corrija os campos destacados.",
        variant: "destructive"
      });
      return;
    }

    submitForm();
  };

  const submitForm = async () => {
    setIsSubmitting(true);

    try {
      console.log('💾 Submetendo escala com dados:', formData);
      await onSave(formData);
      toast({
        title: "Sucesso",
        description: initialData ? "Escala atualizada com sucesso!" : "Escala criada com sucesso!",
        variant: "default"
      });
      onOpenChange(false);
    } catch (error) {
      console.error('❌ Erro ao salvar escala:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar escala. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Função para calcular duração do turno
  const calculateShiftDuration = (): string => {
    if (!formData.startTime || !formData.endTime) return '';

    const start = new Date(`2000-01-01T${formData.startTime}`);
    let end = new Date(`2000-01-01T${formData.endTime}`);

    // Se o horário de fim for menor que o de início, assumir que é no dia seguinte
    if (end <= start) {
      end = new Date(`2000-01-02T${formData.endTime}`);
    }

    const diffMs = end.getTime() - start.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    return `${diffHours}h${diffMinutes > 0 ? ` ${diffMinutes}min` : ''}`;
  };

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setErrors({});
      setIsSubmitting(false);
      setCalendarOpen(false);
    }
  }, [open]);

  // Atualizar formData quando initialData mudar OU quando o modal abrir (importante para modo view/edit)
  useEffect(() => {
    console.log('🔄 EscalaFormModal useEffect - open:', open, 'initialData:', initialData, 'mode:', mode);
    console.log('🔄 initialData completo:', JSON.stringify(initialData, null, 2));
    console.log('🔄 postosTrabalho.length:', postosTrabalho.length);
    console.log('🔄 usuarios.length:', usuarios.length);
    console.log('🔄 clientes.length:', clientes.length);
    
    if (open) {
      if (initialData && (mode === 'edit' || mode === 'view')) {
        // Processar scheduleDate - garantir que seja um objeto Date válido
        let scheduleDateValue: Date;
        if (initialData.scheduleDate) {
          if (initialData.scheduleDate instanceof Date) {
            scheduleDateValue = initialData.scheduleDate;
          } else if (typeof initialData.scheduleDate === 'string') {
            scheduleDateValue = new Date(initialData.scheduleDate);
          } else {
            scheduleDateValue = new Date();
          }
        } else {
          scheduleDateValue = new Date();
        }
        
        // Garantir que todos os valores sejam sempre strings válidas (nunca undefined)
        const newFormData = {
          employeeId: String(initialData.employeeId || ''),
          locationId: String(initialData.locationId || initialData.workPostId || ''),
          workPostId: String(initialData.workPostId || ''),
          scheduleDate: scheduleDateValue,
          shift: String(initialData.shift || ''),
          startTime: String(initialData.startTime || ''),
          endTime: String(initialData.endTime || ''),
          observations: String(initialData.observations || '')
        };
        console.log('📝 Atualizando formData com initialData (modo edit/view):', newFormData);
        console.log('📝 Campos preenchidos:');
        console.log('  - employeeId:', newFormData.employeeId);
        console.log('  - workPostId:', newFormData.workPostId);
        console.log('  - locationId:', newFormData.locationId);
        console.log('  - scheduleDate:', newFormData.scheduleDate);
        console.log('  - shift:', newFormData.shift);
        console.log('  - startTime:', newFormData.startTime);
        console.log('  - endTime:', newFormData.endTime);
        console.log('  - observations:', newFormData.observations);
        
        // Atualizar formData imediatamente
        setFormData(newFormData);
        
        // Mapear workPostId para clientId
        // Primeiro tentar usar clientId diretamente do initialData (se foi passado)
        const clientIdFromData = (initialData as any).clientId;
        if (clientIdFromData) {
          const clientIdStr = String(clientIdFromData);
          setSelectedClientId(clientIdStr);
          console.log('✅ Cliente mapeado diretamente do initialData:', clientIdStr);
        } else {
          // Se não há clientId direto, buscar do workPost
          const workPostIdToSearch = String(initialData.workPostId || initialData.locationId || '');
          console.log('🔍 Buscando cliente pelo workPostId:', workPostIdToSearch, 'postosTrabalho.length:', postosTrabalho.length);
          
          if (workPostIdToSearch && postosTrabalho.length > 0) {
            const workPost = postosTrabalho.find(wp => String(wp.id) === workPostIdToSearch);
            console.log('🔍 WorkPost encontrado:', workPost);
            if (workPost && workPost.clientId) {
              const clientIdStr = String(workPost.clientId);
              setSelectedClientId(clientIdStr);
              console.log('✅ Cliente mapeado do workPostId:', clientIdStr, 'workPost:', workPost);
            } else {
              console.warn('⚠️ WorkPost não encontrado ou sem clientId. workPostId:', workPostIdToSearch);
            }
          } else if (workPostIdToSearch && postosTrabalho.length === 0) {
            // Se os postos ainda não foram carregados, aguardar e tentar novamente quando carregarem
            console.log('⏳ Aguardando carregamento dos postos de trabalho...');
          }
        }
      } else if (!initialData || mode === 'create') {
        // Se não há initialData ou é modo create, resetar para valores padrão
        console.log('📝 Resetando formData (sem initialData ou modo create)');
        setFormData({
          employeeId: '',
          locationId: '',
          workPostId: '',
          scheduleDate: new Date(),
          shift: '',
          startTime: '',
          endTime: '',
          observations: ''
        });
        setSelectedClientId('');
      }
    } else {
      // Reset apenas quando o modal fechar
      setSelectedClientId('');
      console.log('📝 Resetando formData (modal fechado)');
      setFormData({
        employeeId: '',
        locationId: '',
        workPostId: '',
        scheduleDate: new Date(),
        shift: '',
        startTime: '',
        endTime: '',
        observations: ''
      });
    }
  }, [initialData, open, mode, postosTrabalho, usuarios, clientes]);

  // Efeito adicional para atualizar formData e clientId quando dados forem carregados e houver initialData
  useEffect(() => {
    if (open && initialData && (mode === 'edit' || mode === 'view') && postosTrabalho.length > 0 && usuarios.length > 0) {
      console.log('🔄 Efeito adicional - Atualizando dados após carregamento completo');
      console.log('🔄 initialData completo:', JSON.stringify(initialData, null, 2));
      console.log('🔄 initialData.employeeId:', initialData.employeeId);
      console.log('🔄 initialData.workPostId:', initialData.workPostId);
      console.log('🔄 initialData.startTime:', initialData.startTime);
      console.log('🔄 initialData.endTime:', initialData.endTime);
      
      // Processar scheduleDate
      let scheduleDateValue: Date;
      if (initialData.scheduleDate) {
        if (initialData.scheduleDate instanceof Date) {
          scheduleDateValue = initialData.scheduleDate;
        } else if (typeof initialData.scheduleDate === 'string') {
          scheduleDateValue = new Date(initialData.scheduleDate);
        } else {
          scheduleDateValue = new Date();
        }
      } else {
        scheduleDateValue = new Date();
      }
      
      // Atualizar formData para garantir que os valores estejam corretos
      const currentEmployeeId = String(initialData.employeeId || '');
      const currentWorkPostId = String(initialData.workPostId || '');
      const currentLocationId = String(initialData.locationId || currentWorkPostId || '');
      const currentShift = String(initialData.shift || '');
      const currentStartTime = String(initialData.startTime || '');
      const currentEndTime = String(initialData.endTime || '');
      const currentObservations = String(initialData.observations || '');
      
      // Verificar se os valores no formData estão corretos e atualizar se necessário
      const needsUpdate = 
        formData.employeeId !== currentEmployeeId || 
        formData.workPostId !== currentWorkPostId ||
        formData.locationId !== currentLocationId ||
        formData.shift !== currentShift ||
        formData.startTime !== currentStartTime ||
        formData.endTime !== currentEndTime ||
        formData.observations !== currentObservations ||
        formData.scheduleDate.getTime() !== scheduleDateValue.getTime();
      
      if (needsUpdate) {
        console.log('🔄 Atualizando formData com valores corretos após carregamento');
        setFormData({
          employeeId: currentEmployeeId,
          workPostId: currentWorkPostId,
          locationId: currentLocationId,
          scheduleDate: scheduleDateValue,
          shift: currentShift,
          startTime: currentStartTime,
          endTime: currentEndTime,
          observations: currentObservations
        });
        console.log('✅ formData atualizado com sucesso');
      }
      
      // Primeiro tentar usar clientId diretamente do initialData
      const clientIdFromData = (initialData as any).clientId;
      if (clientIdFromData) {
        const clientIdStr = String(clientIdFromData);
        if (selectedClientId !== clientIdStr) {
          setSelectedClientId(clientIdStr);
          console.log('✅ Cliente mapeado do initialData (após carregamento):', clientIdStr);
        }
        return;
      }
      
      // Se não há clientId direto, buscar do workPost
      const workPostIdToSearch = String(initialData.workPostId || initialData.locationId || '');
      if (workPostIdToSearch) {
        const workPost = postosTrabalho.find(wp => String(wp.id) === workPostIdToSearch);
        if (workPost && workPost.clientId) {
          const clientIdStr = String(workPost.clientId);
          if (selectedClientId !== clientIdStr) {
            setSelectedClientId(clientIdStr);
            console.log('✅ Cliente mapeado do workPostId (após carregamento):', clientIdStr);
          }
        } else {
          console.warn('⚠️ WorkPost não encontrado após carregamento. workPostId:', workPostIdToSearch);
        }
      }
    }
  }, [postosTrabalho, usuarios, open, initialData, selectedClientId, mode, formData]);


  const turnos = [
    {
      value: 'DAY',
      label: 'Diurno',
      description: '08:00 - 17:00',
      color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
    },
    {
      value: 'NIGHT',
      label: 'Noturno',
      description: '22:00 - 06:00',
      color: 'bg-blue-500/20 text-blue-300 border-blue-500/30'
    },
    {
      value: 'MIXED',
      label: 'Misto',
      description: '14:00 - 22:00',
      color: 'bg-purple-500/20 text-purple-300 border-purple-500/30'
    }
  ];

  console.log('🎭 EscalaFormModal render - open:', open, 'mode:', mode, 'initialData:', initialData);
  console.log('🎭 Título do modal será:', mode === 'view' ? 'Visualizar Escala' : mode === 'edit' ? 'Editar Escala' : 'Nova Escala');
  console.log('🎭 formData atual:', formData);
  console.log('🎭 selectedClientId atual:', selectedClientId);
  console.log('🎭 usuarios.length:', usuarios.length);
  console.log('🎭 clientes.length:', clientes.length);
  console.log('🎭 postosTrabalho.length:', postosTrabalho.length);
  console.log('🎭 postosFiltrados.length:', postosFiltrados.length);
  
  // Log quando open mudar
  useEffect(() => {
    console.log('🔄 EscalaFormModal - open mudou para:', open);
    console.log('🔄 EscalaFormModal - mode:', mode);
    console.log('🔄 EscalaFormModal - Título será:', mode === 'view' ? 'Visualizar Escala' : mode === 'edit' ? 'Editar Escala' : 'Nova Escala');
    console.log('🔄 EscalaFormModal - initialData:', initialData);
  }, [open, mode, initialData]);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-seguranca-graphite text-seguranca-lightgray border-gray-700 sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-seguranca-yellow/20 rounded-lg flex items-center justify-center">
              <CalendarLucide className="w-5 h-5 text-seguranca-yellow" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold">
                {mode === 'view' ? 'Visualizar Escala' : mode === 'edit' ? 'Editar Escala' : 'Nova Escala'}
              </DialogTitle>
              <DialogDescription className="text-gray-400 mt-1">
                {mode === 'view' ? 'Visualize as informações da escala' : mode === 'edit' ? 'Atualize as informações da escala' : 'Preencha os dados para criar uma nova escala de trabalho'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Funcionário */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-seguranca-yellow" />
              <Label htmlFor="employeeId" className="text-sm font-medium">
                Funcionário <span className="text-red-400">*</span>
              </Label>
            </div>
            <Select
              value={String(formData.employeeId || '')}
              onValueChange={(value) => {
                console.log('👤 Funcionário selecionado:', value);
                handleInputChange('employeeId', value);
              }}
              disabled={mode === 'view'}
            >
              <SelectTrigger className={`bg-seguranca-black border-2 transition-colors h-11 ${errors.employeeId
                ? 'border-red-500 focus:border-red-500'
                : 'border-gray-600 hover:border-gray-500 focus:border-seguranca-yellow'
                } ${mode === 'view' ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <SelectValue placeholder="Selecione um funcionário">
                  {formData.employeeId && usuarios.length > 0 ? (
                    usuarios.find(u => String(u.id) === String(formData.employeeId))?.name || 'Selecione um funcionário'
                  ) : 'Selecione um funcionário'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-seguranca-graphite border-gray-600 z-[10002]">
                {usuarios.length > 0 ? (
                  usuarios.map(user => (
                    <SelectItem key={String(user.id)} value={String(user.id)} className="hover:bg-seguranca-black/50 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        {user.name}
                      </div>
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="loading" disabled>
                    Carregando funcionários...
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            {errors.employeeId && (
              <div className="flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4" />
                {errors.employeeId}
              </div>
            )}
          </div>

          {/* Cliente */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-seguranca-yellow" />
              <Label htmlFor="locationId" className="text-sm font-medium">
                Cliente <span className="text-red-400">*</span>
              </Label>
            </div>
            <Select
              value={String(selectedClientId || '')}
              onValueChange={(value) => {
                console.log('🔍 Cliente selecionado:', value);
                setSelectedClientId(value);
                // Limpar locationId e workPostId quando mudar o cliente
                handleInputChange('locationId', '');
                handleInputChange('workPostId', '');
                // Limpar erros
                if (errors.locationId) {
                  setErrors(prev => ({ ...prev, locationId: undefined }));
                }
                if (errors.workPostId) {
                  setErrors(prev => ({ ...prev, workPostId: undefined }));
                }
              }}
              disabled={mode === 'view'}
            >
              <SelectTrigger className={`bg-seguranca-black border-2 transition-colors h-11 ${errors.locationId
                ? 'border-red-500 focus:border-red-500'
                : 'border-gray-600 hover:border-gray-500 focus:border-seguranca-yellow'
                } ${mode === 'view' ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <SelectValue placeholder="Selecione um cliente">
                  {selectedClientId && clientes.length > 0 ? (
                    clientes.find(c => String(c.id) === String(selectedClientId))?.name || 'Selecione um cliente'
                  ) : 'Selecione um cliente'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-seguranca-graphite border-gray-600 z-[10002]">
                {clientes.length > 0 ? (
                  clientes.map(client => (
                    <SelectItem key={String(client.id)} value={String(client.id)} className="hover:bg-seguranca-black/50 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3 h-3 text-gray-400" />
                        {client.name}
                      </div>
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="loading" disabled>
                    Carregando clientes...
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            {errors.locationId && (
              <div className="flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4" />
                {errors.locationId}
              </div>
            )}
          </div>

          {/* Posto de Trabalho */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-seguranca-yellow" />
              <Label htmlFor="workPostId" className="text-sm font-medium">
                Posto de Trabalho <span className="text-red-400">*</span>
              </Label>
            </div>
            <Select
              value={String(formData.workPostId || '')}
              onValueChange={(value) => {
                // Quando selecionar o Posto de Trabalho, usar o workPostId como locationId
                console.log('🏢 Posto de Trabalho selecionado:', value);
                handleInputChange('workPostId', value);
                handleInputChange('locationId', value); // Posto de Trabalho = Localização
                console.log('✅ Posto de Trabalho selecionado:', value, 'usado como locationId');
                // Limpar erro se houver
                if (errors.workPostId) {
                  setErrors(prev => ({ ...prev, workPostId: undefined }));
                }
                if (errors.locationId) {
                  setErrors(prev => ({ ...prev, locationId: undefined }));
                }
              }}
              disabled={mode === 'view' || !selectedClientId}
            >
              <SelectTrigger className={`bg-seguranca-black border-2 transition-colors h-11 ${errors.workPostId
                ? 'border-red-500 focus:border-red-500'
                : 'border-gray-600 hover:border-gray-500 focus:border-seguranca-yellow'
                } ${mode === 'view' || !selectedClientId ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <SelectValue placeholder={selectedClientId ? "Selecione um posto de trabalho" : "Selecione primeiro um cliente"}>
                  {formData.workPostId && postosFiltrados.length > 0 ? (
                    postosFiltrados.find(p => String(p.id) === String(formData.workPostId))?.name || 'Selecione um posto de trabalho'
                  ) : selectedClientId ? "Selecione um posto de trabalho" : "Selecione primeiro um cliente"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-seguranca-graphite border-gray-600">
                {postosFiltrados.length > 0 ? (
                  postosFiltrados.map(posto => (
                    <SelectItem key={String(posto.id)} value={String(posto.id)} className="hover:bg-seguranca-black/50">
                      <div className="flex items-center gap-2">
                        <Building className="w-3 h-3 text-gray-400" />
                        <span>{posto.name}</span>
                        {posto.postCode && (
                          <span className="text-xs text-gray-400">({posto.postCode})</span>
                        )}
                      </div>
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="loading" disabled>
                    {!selectedClientId 
                      ? 'Selecione primeiro um cliente' 
                      : postosTrabalho.length === 0 
                        ? 'Carregando postos de trabalho...' 
                        : 'Nenhum posto disponível para este cliente'}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            {errors.workPostId && (
              <div className="flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4" />
                {errors.workPostId}
              </div>
            )}
          </div>

          {/* Data e Turno */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Data */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-seguranca-yellow" />
                <Label htmlFor="scheduleDate" className="text-sm font-medium">
                  Data <span className="text-red-400">*</span>
                </Label>
              </div>
              <Popover open={calendarOpen && mode !== 'view'} onOpenChange={(open) => mode !== 'view' && setCalendarOpen(open)}>
                <PopoverTrigger asChild>
                  <Button
                    id="date"
                    variant="outline"
                    disabled={mode === 'view'}
                    className={`w-full justify-start text-left font-normal h-11 border-2 transition-colors ${errors.scheduleDate
                      ? 'border-red-500 focus:border-red-500 bg-seguranca-black'
                      : 'border-gray-600 hover:border-gray-500 focus:border-seguranca-yellow bg-seguranca-black'
                      } ${mode === 'view' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.scheduleDate ? (
                      <div className="flex items-center gap-2">
                        <span>{format(formData.scheduleDate, 'PPP', { locale: ptBR })}</span>
                        {isWeekend(formData.scheduleDate) && (
                          <Badge variant="secondary" className="text-xs bg-orange-500/20 text-orange-300">
                            Final de semana
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">Selecionar data</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-seguranca-graphite border-gray-600" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.scheduleDate}
                    onSelect={(date) => {
                      if (date) {
                        handleInputChange('scheduleDate', date);
                        setCalendarOpen(false);
                      }
                    }}
                    disabled={(date) => isBefore(startOfDay(date), startOfDay(new Date()))}
                    initialFocus
                    className="rounded-md border-0"
                    classNames={{
                      months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                      month: "space-y-4",
                      caption: "flex justify-center pt-1 relative items-center text-seguranca-lightgray",
                      caption_label: "text-sm font-medium",
                      nav: "space-x-1 flex items-center",
                      nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 text-seguranca-lightgray hover:bg-seguranca-black rounded-md",
                      nav_button_previous: "absolute left-1",
                      nav_button_next: "absolute right-1",
                      table: "w-full border-collapse space-y-1",
                      head_row: "flex",
                      head_cell: "text-gray-400 rounded-md w-9 font-normal text-[0.8rem]",
                      row: "flex w-full mt-2",
                      cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-seguranca-yellow/20 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                      day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-seguranca-black rounded-md text-seguranca-lightgray",
                      day_selected: "bg-seguranca-yellow text-seguranca-black hover:bg-seguranca-yellow hover:text-seguranca-black focus:bg-seguranca-yellow focus:text-seguranca-black",
                      day_today: "bg-seguranca-graphite text-seguranca-yellow font-semibold",
                      day_outside: "text-gray-500 opacity-50",
                      day_disabled: "text-gray-500 opacity-30 cursor-not-allowed",
                      day_range_middle: "aria-selected:bg-seguranca-yellow/20 aria-selected:text-seguranca-lightgray",
                      day_hidden: "invisible",
                    }}
                  />
                </PopoverContent>
              </Popover>
              {errors.scheduleDate && (
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {errors.scheduleDate}
                </div>
              )}
            </div>

            {/* Turno */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-seguranca-yellow" />
                <Label htmlFor="shift" className="text-sm font-medium">
                  Turno <span className="text-red-400">*</span>
                </Label>
              </div>
              <Select
                value={formData.shift || ''}
                onValueChange={(value) => handleInputChange('shift', value)}
                disabled={mode === 'view'}
              >
                <SelectTrigger className={`bg-seguranca-black border-2 transition-colors h-11 ${errors.shift
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-gray-600 hover:border-gray-500 focus:border-seguranca-yellow'
                  } ${mode === 'view' ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <SelectValue placeholder="Selecione o turno" />
                </SelectTrigger>
                <SelectContent className="bg-seguranca-graphite border-gray-600">
                  {turnos.map((turno) => (
                    <SelectItem key={turno.value} value={turno.value} className="hover:bg-seguranca-black/50">
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${turno.value === 'DAY' ? 'bg-yellow-500' :
                            turno.value === 'NIGHT' ? 'bg-blue-500' : 'bg-purple-500'
                            }`}></div>
                          <span>{turno.label}</span>
                        </div>
                        <span className="text-xs text-gray-400 ml-2">{turno.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.shift && (
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {errors.shift}
                </div>
              )}
            </div>
          </div>

          {/* Horários */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-seguranca-yellow" />
              <Label className="text-sm font-medium">Horários de Trabalho</Label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <Label htmlFor="startTime" className="text-sm">
                  Horário de Início <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="startTime"
                  type="time"
                  value={formData.startTime || ''}
                  onChange={(e) => handleInputChange('startTime', e.target.value)}
                  disabled={mode === 'view'}
                  className={`bg-seguranca-black border-2 transition-colors h-11 ${errors.startTime
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-gray-600 hover:border-gray-500 focus:border-seguranca-yellow'
                    } ${mode === 'view' ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
                {errors.startTime && (
                  <div className="flex items-center gap-2 text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {errors.startTime}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <Label htmlFor="endTime" className="text-sm">
                  Horário de Término <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="endTime"
                  type="time"
                  value={formData.endTime || ''}
                  onChange={(e) => handleInputChange('endTime', e.target.value)}
                  disabled={mode === 'view'}
                  className={`bg-seguranca-black border-2 transition-colors h-11 ${errors.endTime
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-gray-600 hover:border-gray-500 focus:border-seguranca-yellow'
                    } ${mode === 'view' ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
                {errors.endTime && (
                  <div className="flex items-center gap-2 text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {errors.endTime}
                  </div>
                )}
              </div>
            </div>

            {/* Duração calculada */}
            {formData.startTime && formData.endTime && !errors.endTime && (
              <div className="flex items-center gap-2 p-3 bg-seguranca-black/50 rounded-lg border border-gray-600">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span className="text-sm text-gray-300">
                  Duração do turno: <span className="text-seguranca-yellow font-medium">{calculateShiftDuration()}</span>
                </span>
              </div>
            )}
          </div>

          {/* Observações */}
          <div className="space-y-3">
            <Label htmlFor="observations" className="text-sm font-medium">
              Observações
            </Label>
            <Textarea
              id="observations"
              value={formData.observations || ''}
              onChange={(e) => handleInputChange('observations', e.target.value)}
              placeholder="Adicione observações sobre esta escala (opcional)"
              disabled={mode === 'view'}
              className={`bg-seguranca-black border-2 border-gray-600 hover:border-gray-500 focus:border-seguranca-yellow transition-colors resize-none ${mode === 'view' ? 'opacity-50 cursor-not-allowed' : ''}`}
              rows={3}
            />
          </div>

          <DialogFooter className="pt-6 border-t border-gray-600">
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
                className="bg-seguranca-black border-gray-600 hover:bg-seguranca-graphite hover:border-gray-500 transition-colors"
              >
                {mode === 'view' ? 'Fechar' : 'Cancelar'}
              </Button>
              {mode !== 'view' && (
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-seguranca-red hover:bg-seguranca-red/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Salvando...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      {mode === 'edit' ? 'Atualizar Escala' : 'Criar Escala'}
                    </div>
                  )}
                </Button>
              )}
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EscalaFormModal;
