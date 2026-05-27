
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
  Building,
  AlertCircle,
  CheckCircle2,
  Calendar as CalendarLucide,
  Eye,
  Activity,
  Briefcase
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { EmployeeCombobox } from '@/components/ui/employee-combobox';
import type { ScheduleStatus } from '@/services/scheduleService';
import { employeeService } from '@/services/employeeService';
import { clientService } from '@/services/clientService';

interface EscalaFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: EscalaFormData) => void;
  initialData?: EscalaFormData;
  mode?: 'create' | 'edit' | 'view';
}

interface EscalaFormData {
  employeeId: string;
  employeeName?: string;
  employeeStatus?: string;
  locationId: string;
  workPostId: string;
  scheduleDate: Date;
  shift: string;
  startTime: string;
  endTime: string;
  observations: string;
  sigla?: string;
  isMonitoria?: boolean;
  isHoraExtra?: boolean;
  status?: string;
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
    console.log('🎭 EscalaFormModal - Título será:', mode === 'view' ? 'Visualizar Escala' : mode === 'edit' ? 'Edição de Escala' : 'Nova Escala');
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
    status: 'PENDING',
    observations: '',
    sigla: '',
    isMonitoria: false,
    isHoraExtra: false
  });

  const [formData, setFormData] = useState<EscalaFormData>(getDefaultFormData());
  const [selectedClientId, setSelectedClientId] = useState<string>(''); // Cliente selecionado (para exibição)

  /** Nomes para modo visualização e rótulos iniciais nos comboboxes */
  const [displayEmployeeName, setDisplayEmployeeName] = useState('');
  const [displayPositionName, setDisplayPositionName] = useState('');
  const [displayClientName, setDisplayClientName] = useState('');

  const [postosTrabalho, setPostosTrabalho] = useState<{ id: string; name: string; postCode: string; clientId?: string }[]>([]);
  const [postosFiltrados, setPostosFiltrados] = useState<{ id: string; name: string; postCode: string }[]>([]);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const { toast } = useToast();
  
  // Helper para garantir que um posto de trabalho esteja na lista (evita duplicados)
  const ensureWorkPostInList = (wp: any) => {
    if (!wp || !wp.id) return;
    const wpId = String(wp.id);
    
    setPostosTrabalho(prev => {
      if (prev.find(p => String(p.id) === wpId)) return prev;
      
      console.log('➕ Adicionando posto ausente à lista local:', wp.name, `(${wpId})`);
      return [...prev, {
        id: wpId,
        name: wp.name,
        postCode: wp.postCode || '',
        clientId: wp.clientId,
        clientName: wp.clientName
      }];
    });
  };

  // Carregar dados do backend quando o modal abrir
  useEffect(() => {
    if (!open) return; // Não carregar se o modal estiver fechado

    const loadData = async () => {
      console.log('🔄 Carregando postos para o modal de escala...');

      try {
        // Carregar postos de trabalho
        const { workPostService } = await import('@/services/workPostService');
        const workPosts = await workPostService.getAllWorkPosts();
        const mappedWorkPosts = workPosts.map(wp => ({
          id: wp.id,
          name: wp.name,
          postCode: wp.postCode || '',
          clientId: wp.clientId,
          clientName: wp.clientName
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

  /** Se a API da escala não trouxe clientId no workPost (JSON antigo), busca o posto e preenche o cliente. */
  useEffect(() => {
    if (!open || mode === 'create') return;
    const wpId = String(formData.workPostId || formData.locationId || '').trim();
    if (!wpId || wpId === 'none') return;
    if (selectedClientId) return;

    let cancelled = false;
    (async () => {
      try {
        const { workPostService } = await import('@/services/workPostService');
        const wp = await workPostService.getWorkPostById(wpId);
        if (cancelled || !wp?.clientId) return;
        ensureWorkPostInList(wp);
        setSelectedClientId(String(wp.clientId));
        if (wp.clientName) setDisplayClientName(wp.clientName);
      } catch {
        /* silencioso — posto pode não existir ou sem permissão */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, mode, formData.workPostId, formData.locationId, selectedClientId]);

  // Atualizar lista de postos filtrados:
  // - Com cliente derivado do funcionário selecionado: filtra somente postos daquele cliente.
  // - Sem cliente (ex.: nenhum funcionário selecionado ainda): mostra todos os postos.
  useEffect(() => {
    const wpId = String(formData.workPostId || '').trim();
    let filtered: typeof postosTrabalho;

    if (selectedClientId) {
      const sid = String(selectedClientId).toLowerCase().trim();
      filtered = postosTrabalho.filter((posto) => {
        if (!posto.clientId) return false;
        return String(posto.clientId).toLowerCase().trim() === sid;
      });
    } else {
      filtered = postosTrabalho;
    }

    if (wpId) {
      const current = postosTrabalho.find((p) => String(p.id) === wpId);
      if (current && !filtered.some((p) => String(p.id) === wpId)) {
        filtered = [current, ...filtered];
      }
    }

    setPostosFiltrados(filtered);
  }, [postosTrabalho, selectedClientId, formData.workPostId]);

  // Nomes para visualização / rótulo inicial nos comboboxes
  useEffect(() => {
    if (!open) {
      setDisplayEmployeeName('');
      setDisplayPositionName('');
      setDisplayClientName('');
      return;
    }
    if (!formData.employeeId) {
      setDisplayEmployeeName('');
      setDisplayPositionName('');
      return;
    }

    const initialEmployeeId = String(
      initialData?.employeeId || (initialData as { employee?: { id?: string } })?.employee?.id || ''
    );

    // Se o funcionário selecionado é o mesmo dos dados iniciais, usar o nome que já temos de forma síncrona
    if (initialData && formData.employeeId === initialEmployeeId) {
      const empName =
        String(initialData.employeeName || '').trim() ||
        String((initialData as { employee?: { name?: string } }).employee?.name || '').trim();
      if (empName) {
        setDisplayEmployeeName(empName);
      }
    }

    let cancelled = false;
    employeeService
      .getEmployeeById(formData.employeeId)
      .then((e) => {
        if (cancelled || !e) return;
        if (e.name) setDisplayEmployeeName(e.name);
        const cargo = e.position?.name || '';
        if (cargo) setDisplayPositionName(cargo);
      })
      .catch(() => {
        if (!cancelled) {
          setDisplayEmployeeName('');
          setDisplayPositionName('');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, formData.employeeId, initialData]);

  useEffect(() => {
    if (!open || !selectedClientId) {
      setDisplayClientName('');
      return;
    }
    let cancelled = false;
    clientService
      .getClientById(selectedClientId)
      .then((c) => {
        if (!cancelled && c?.name) setDisplayClientName(c.name);
      })
      .catch(() => {
        if (!cancelled) setDisplayClientName('');
      });
    return () => {
      cancelled = true;
    };
  }, [open, selectedClientId]);

  // Labels para turno
  const shiftLabels: Record<string, { label: string; badgeClass: string }> = {
    DAY: { label: 'Diurno', badgeClass: 'bg-blue-600/20 text-blue-300 border border-blue-500/40' },
    NIGHT: { label: 'Noturno', badgeClass: 'bg-purple-600/20 text-purple-300 border border-purple-500/40' },
    MIXED: { label: 'Misto', badgeClass: 'bg-amber-600/20 text-amber-200 border border-amber-500/40' },
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

  const employeeName = displayEmployeeName || '—';
  const clientName = displayClientName || '—';
  const workPost = postosTrabalho.find(p => String(p.id) === String(formData.workPostId));
  const workPostName = workPost?.name || '—';
  const workPostCode = workPost?.postCode;
  const scheduleDateFormatted = formData.scheduleDate ? format(formData.scheduleDate, "dd/MM/yyyy", { locale: ptBR }) : '—';
  const shiftInfo = shiftLabels[formData.shift] || { label: formData.shift || '—', badgeClass: 'bg-gray-700 text-gray-200 border border-gray-600' };
  const duration = calculateShiftDuration();

  // Validação de formulário
  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    if (!formData.employeeId) {
      newErrors.employeeId = 'Funcionário é obrigatório';
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

    if (open) {
      // Check if we have data to populate (checking employeeId is a good proxy for existing record)
      const hasData = initialData && initialData.employeeId && String(initialData.employeeId) !== '';

      if (initialData && (mode === 'edit' || mode === 'view' || hasData)) {
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

        // Helper safely access nested properties
        const getProperty = (obj: any, path: string): string => {
          return path.split('.').reduce((o, i) => (o ? o[i] : undefined), obj) || '';
        };

        // Extract IDs handling both flat EscalaFormData and nested Schedule object structures
        const employeeId = String(initialData.employeeId || getProperty(initialData, 'employee.id') || '');

        let workPostId = String(initialData.workPostId || getProperty(initialData, 'workPost.id') || '');

        // Sometimes workPostId is passed but empty, check if we can get it from location if it's actually a workPost
        if (!workPostId) {
          const nestedWorkPostId = getProperty(initialData, 'workPost.id');
          if (nestedWorkPostId) workPostId = String(nestedWorkPostId);
        }

        let locationId = String(initialData.locationId || getProperty(initialData, 'location.id') || '');
        // Fallback: If no locationId but we have workPostId, use workPostId as locationId (common in this app)
        if (!locationId && workPostId) {
          locationId = workPostId;
        }

        // Handle Shift - check both shift (string) and shift object variants if they exist
        const shift = String(initialData.shift || '');

        // Handle Times
        let startTime = String(initialData.startTime || '');
        let endTime = String(initialData.endTime || '');

        // Basic time extraction from Schedule object if simple props are missing
        if (!startTime && getProperty(initialData, 'workPost.shiftStart')) {
          const start = getProperty(initialData, 'workPost.shiftStart');
          startTime = typeof start === 'string' && start.length >= 5 ? start.substring(0, 5) : String(start);
        }
        if (!endTime && getProperty(initialData, 'workPost.shiftEnd')) {
          const end = getProperty(initialData, 'workPost.shiftEnd');
          endTime = typeof end === 'string' && end.length >= 5 ? end.substring(0, 5) : String(end);
        }

        // Extrair status - verificar se existe no initialData ou usar padrão
        const status = (initialData as any).status || getProperty(initialData, 'status') || 'PENDING';
        const validStatus: ScheduleStatus = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'].includes(status) 
          ? status as ScheduleStatus 
          : 'PENDING';

        // Garantir que todos os valores sejam sempre strings válidas
        const newFormData: EscalaFormData = {
          employeeId,
          locationId,
          workPostId,
          scheduleDate: scheduleDateValue,
          shift,
          startTime,
          endTime,
          status: validStatus,
          observations: String(initialData.observations || ''),
          sigla: String((initialData as any).sigla || getProperty(initialData, 'sigla') || ''),
          isMonitoria: !!((initialData as any).isMonitoria || getProperty(initialData, 'isMonitoria')),
          isHoraExtra: !!((initialData as any).isHoraExtra || getProperty(initialData, 'isHoraExtra')),
        };
        console.log('📝 Atualizando formData com dados processados:', newFormData);

        const empNameFromData =
          String(getProperty(initialData, 'employee.name') || '').trim() ||
          String((initialData as any).employeeName || '').trim();
        if (empNameFromData) setDisplayEmployeeName(empNameFromData);

        const clientNameFromData =
          String(getProperty(initialData, 'client.name') || '').trim() ||
          String(getProperty(initialData, 'workPost.clientName') || '').trim() ||
          String((initialData as any).clientName || '').trim();
        if (clientNameFromData) setDisplayClientName(clientNameFromData);

        // Atualizar formData imediatamente
        setFormData(newFormData);

        // Se temos employeeId mas não temos workPostId/clientId, buscar do funcionário
        if (employeeId && !workPostId) {
          console.log('🔍 Buscando posto de trabalho para funcionário pré-selecionado:', employeeId);
          employeeService.getEmployeeById(employeeId).then(async (emp) => {
            if (emp) {
              const wpId = emp.workPostId || emp.workPost?.id;
              if (wpId) {
                const wpIdStr = String(wpId);
                // Buscar o posto para achar o cliente
                const wpItem = postosTrabalho.find(p => String(p.id) === wpIdStr);
                if (wpItem && wpItem.clientId) {
                  const cIdStr = String(wpItem.clientId);
                  setSelectedClientId(cIdStr);
                  setFormData(prev => ({
                    ...prev,
                    workPostId: wpIdStr,
                    locationId: wpIdStr
                  }));
                } else {
                  // Tentar carregar do service se não estiver no cache
                  try {
                    const { workPostService } = await import('@/services/workPostService');
                    const wpInfo = await workPostService.getWorkPostById(wpIdStr);
                    if (wpInfo && wpInfo.clientId) {
                      const cIdStr = String(wpInfo.clientId);
                      ensureWorkPostInList(wpInfo);
                      setSelectedClientId(cIdStr);
                      setFormData(prev => ({
                        ...prev,
                        workPostId: wpIdStr,
                        locationId: wpIdStr
                      }));
                    }
                  } catch (e) {
                    console.error('Erro ao buscar posto por ID no useEffect:', e);
                  }
                }
              }
            }
          });
        }

        // Mapear workPostId para clientId
        // Primeiro tentar usar clientId diretamente do initialData
        const clientIdFromData = (initialData as any).clientId || getProperty(initialData, 'workPost.clientId') || getProperty(initialData, 'client.id');
        if (clientIdFromData) {
          const clientIdStr = String(clientIdFromData);
          setSelectedClientId(clientIdStr);
          console.log('✅ Cliente mapeado diretamente do initialData:', clientIdStr);
          // Forçar atualização dos postos filtrados imediatamente se possível
          if (postosTrabalho.length > 0) {
            const filtered = postosTrabalho.filter(
              (posto) => posto.clientId != null && String(posto.clientId) === clientIdStr
            );
            setPostosFiltrados(filtered);
            console.log('✅ Postos filtrados forçados:', filtered.length);
          }
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
          status: 'PENDING',
          observations: '',
          sigla: '',
          isMonitoria: false,
          isHoraExtra: false
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
        sigla: '',
        isMonitoria: false,
        isHoraExtra: false
      });
    }
  }, [initialData, open, mode, postosTrabalho]);

  // Efeito adicional removido - a lógica foi consolidada no primeiro useEffect
  // para evitar conflitos de reescrita de dados.


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
  console.log('🎭 Título do modal será:', mode === 'view' ? 'Visualizar Escala' : mode === 'edit' ? 'Edição de Escala' : 'Nova Escala');
  console.log('🎭 formData atual:', formData);
  console.log('🎭 selectedClientId atual:', selectedClientId);
  console.log('🎭 postosTrabalho.length:', postosTrabalho.length);
  console.log('🎭 postosFiltrados.length:', postosFiltrados.length);

  // Log quando open mudar
  useEffect(() => {
    console.log('🔄 EscalaFormModal - open mudou para:', open);
    console.log('🔄 EscalaFormModal - mode:', mode);
    console.log('🔄 EscalaFormModal - Título será:', mode === 'view' ? 'Visualizar Escala' : mode === 'edit' ? 'Edição de Escala' : 'Nova Escala');
    console.log('🔄 EscalaFormModal - initialData:', initialData);
  }, [open, mode, initialData]);

  console.log('🎭 EscalaFormModal renderizando - open:', open, 'mode:', mode);
  console.log('🎭 EscalaFormModal - initialData:', initialData);

  // Layout de visualização (estilo cartão, semelhante ao modal de Troca de Plantão)
  if (mode === 'view') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-seguranca-graphite text-seguranca-lightgray border-gray-700 sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-6">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-seguranca-yellow/20 rounded-lg flex items-center justify-center">
                <Eye className="w-5 h-5 text-seguranca-yellow" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold text-seguranca-lightgray flex items-center gap-2">
                  Detalhes da Escala
                  <Badge className={`${shiftInfo.badgeClass} text-xs px-2 py-1`}>
                    {shiftInfo.label}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-gray-400 mt-1">
                  Visualize as informações completas da escala selecionada.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            {/* Cabeçalho resumido */}
            <div className="rounded-lg border border-gray-700 bg-seguranca-black/70 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-seguranca-yellow/15 border border-seguranca-yellow/30 flex items-center justify-center">
                  <CalendarLucide className="w-6 h-6 text-seguranca-yellow" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Data da Escala</p>
                  <p className="text-lg font-semibold text-seguranca-lightgray">{scheduleDateFormatted}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm text-gray-400">Duração</p>
                  <p className="text-lg font-semibold text-seguranca-lightgray">{duration || '—'}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-blue-300" />
                </div>
              </div>
            </div>

            {/* Dados principais */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-lg border border-gray-700 bg-seguranca-black/70 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <User className="w-4 h-4 text-seguranca-yellow" />
                  <h3 className="text-base font-semibold text-seguranca-lightgray">Dados do Funcionário</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-400">Nome:</span>
                    <span className="text-seguranca-lightgray font-medium text-right">{employeeName}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-400">Cliente:</span>
                    <span className="text-seguranca-lightgray font-medium text-right">{clientName}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-400">Posto:</span>
                    <span className="text-seguranca-lightgray font-medium text-right">
                      {workPostName}
                      {workPostCode ? ` (${workPostCode})` : ''}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-gray-700 bg-seguranca-black/70 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-seguranca-yellow" />
                  <h3 className="text-base font-semibold text-seguranca-lightgray">Horário</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-400">Turno:</span>
                    <span className="text-seguranca-lightgray font-medium text-right">{shiftInfo.label}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-400">Início:</span>
                    <span className="text-seguranca-lightgray font-medium text-right">{formData.startTime || '—'}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-400">Fim:</span>
                    <span className="text-seguranca-lightgray font-medium text-right">{formData.endTime || '—'}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-400">Duração:</span>
                    <span className="text-seguranca-lightgray font-medium text-right">{duration || '—'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Status e Inteligência Operacional */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-lg border border-gray-700 bg-seguranca-black/70 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-4 h-4 text-seguranca-yellow" />
                  <h3 className="text-base font-semibold text-seguranca-lightgray">Status</h3>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={
                    formData.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' :
                    formData.status === 'CONFIRMED' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' :
                    formData.status === 'COMPLETED' ? 'bg-green-500/20 text-green-300 border-green-500/30' :
                    'bg-red-500/20 text-red-300 border-red-500/30'
                  }>
                    {formData.status === 'PENDING' && 'Pendente'}
                    {formData.status === 'CONFIRMED' && 'Confirmada'}
                    {formData.status === 'COMPLETED' && 'Concluída'}
                    {formData.status === 'CANCELLED' && 'Cancelada'}
                  </Badge>
                </div>
              </div>

              <div className="rounded-lg border border-gray-700 bg-seguranca-black/70 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="w-4 h-4 text-seguranca-yellow" />
                  <h3 className="text-base font-semibold text-seguranca-lightgray">Inteligência</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400">Sigla:</span>
                    <Badge variant="outline" className="text-seguranca-yellow border-seguranca-yellow/30">
                      {formData.sigla || 'Automática'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400">Monitoria:</span>
                    <span className={formData.isMonitoria ? "text-green-400 text-xs font-bold" : "text-gray-600 text-xs"}>
                      {formData.isMonitoria ? "SIM" : "NÃO"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400">Hora Extra:</span>
                    <span className={formData.isHoraExtra ? "text-orange-400 text-xs font-bold" : "text-gray-600 text-xs"}>
                      {formData.isHoraExtra ? "SIM" : "NÃO"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Observações */}
            <div className="rounded-lg border border-gray-700 bg-seguranca-black/70 p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-4 h-4 text-seguranca-yellow" />
                <h3 className="text-base font-semibold text-seguranca-lightgray">Observações</h3>
              </div>
              <p className="text-sm text-gray-300 leading-relaxed">
                {formData.observations?.trim() ? formData.observations : 'Nenhuma observação adicionada.'}
              </p>
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" className="border-gray-600 text-seguranca-lightgray hover:bg-gray-800" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Sempre renderizar o Dialog, mesmo quando fechado, para permitir animações
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
                {mode === 'view' ? 'Visualizar Escala' : (mode === 'edit' || (initialData?.employeeId && String(initialData.employeeId) !== '')) ? 'Edição de Escala' : 'Nova Escala'}
              </DialogTitle>
              <DialogDescription className="text-gray-400 mt-1">
                {mode === 'view' ? 'Visualize as informações da escala' : (mode === 'edit' || (initialData?.employeeId && String(initialData.employeeId) !== '')) ? 'Atualize as informações da escala' : 'Preencha os dados para criar uma nova escala de trabalho'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Funcionário e cargo */}
          <div className="rounded-lg border border-gray-700/80 bg-seguranca-black/40 p-4 space-y-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Dados do funcionário</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-seguranca-yellow shrink-0" />
                  <Label htmlFor="employeeId" className="text-sm font-medium">
                    Funcionário <span className="text-red-400">*</span>
                  </Label>
                </div>
                <EmployeeCombobox
                  value={String(formData.employeeId || '')}
                  displayNameOnly
                  onChange={(id) => {
                    handleInputChange('employeeId', id);
                    if (!id) {
                      setFormData(prev => ({ ...prev, locationId: '', workPostId: '' }));
                      setSelectedClientId('');
                      setDisplayEmployeeName('');
                      setDisplayPositionName('');
                    }
                    if (errors.employeeId) setErrors((prev) => ({ ...prev, employeeId: undefined }));
                  }}
                  onEmployeeSelect={async (emp) => {
                    if (emp.name) setDisplayEmployeeName(emp.name);
                    setDisplayPositionName(emp.positionName || '');

                    const wpIdStr = String(emp.workPostId || (emp as { workPost?: { id?: string } }).workPost?.id || '');
                    if (wpIdStr) {
                      let workPost = postosTrabalho.find(wp => String(wp.id) === wpIdStr);
                      if (!workPost) {
                        try {
                          const { workPostService } = await import('@/services/workPostService');
                          workPost = await workPostService.getWorkPostById(wpIdStr);
                          if (workPost) ensureWorkPostInList(workPost);
                        } catch (e) { console.error(e); }
                      }

                      if (workPost) {
                        const clientIdStr = String(workPost.clientId);
                        setSelectedClientId(clientIdStr);
                        setFormData(prev => ({
                          ...prev,
                          locationId: wpIdStr,
                          workPostId: wpIdStr,
                          shift: workPost?.type === '12H_NOTURNO' ? 'NIGHT' : 'DAY',
                          startTime: workPost?.shiftStart || '',
                          endTime: workPost?.shiftEnd || '',
                          sigla: prev.sigla || 'PL'
                        }));
                        if (workPost.clientName) setDisplayClientName(workPost.clientName);
                        setErrors(prev => ({
                          ...prev,
                          employeeId: undefined,
                          locationId: undefined,
                          workPostId: undefined
                        }));
                      }
                    } else {
                      setFormData(prev => ({ ...prev, locationId: '', workPostId: '' }));
                      setSelectedClientId('');
                    }
                  }}
                  disabled={mode === 'view'}
                  minChars={3}
                  initialDisplayName={displayEmployeeName || undefined}
                  placeholder="Selecione um funcionário"
                  searchPlaceholder="Digite pelo menos 3 letras do nome..."
                  emptyPlaceholder="Nenhum funcionário encontrado."
                />
                {errors.employeeId && (
                  <div className="flex items-center gap-2 text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {errors.employeeId}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-seguranca-yellow shrink-0" />
                  <Label htmlFor="employeePosition" className="text-sm font-medium">
                    Cargo
                  </Label>
                </div>
                <Input
                  id="employeePosition"
                  readOnly
                  value={displayPositionName || '—'}
                  placeholder="Selecione um funcionário"
                  className="h-11 bg-seguranca-black border-2 border-gray-600 text-seguranca-lightgray cursor-default opacity-90"
                />
              </div>
            </div>
          </div>

          {/* Posto de Trabalho */}
          <div className="rounded-lg border border-gray-700/80 bg-seguranca-black/40 p-4 space-y-3">
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
                
                // Limpar erro se houver
                if (errors.workPostId) {
                  setErrors(prev => ({ ...prev, workPostId: undefined }));
                }
                if (errors.locationId) {
                  setErrors(prev => ({ ...prev, locationId: undefined }));
                }
              }}
              disabled={mode === 'view'}
            >
              <SelectTrigger className={`bg-seguranca-black border-2 transition-colors h-11 ${errors.workPostId
                ? 'border-red-500 focus:border-red-500'
                : 'border-gray-600 hover:border-gray-500 focus:border-seguranca-yellow'
                } ${mode === 'view' ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <SelectValue placeholder="Selecione um posto de trabalho">
                  {formData.workPostId
                    ? postosFiltrados.find(p => String(p.id) === String(formData.workPostId))?.name ||
                      postosTrabalho.find(p => String(p.id) === String(formData.workPostId))?.name ||
                      'Selecione um posto de trabalho'
                    : 'Selecione um posto de trabalho'}
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
                    {postosTrabalho.length === 0
                      ? 'Carregando postos de trabalho...'
                      : 'Nenhum posto disponível'}
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
                    className="p-3 pointer-events-auto"
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

          {/* Novos Campos Operacionais (Sigla, Monitoria, Hora Extra) */}
          <div className="p-4 bg-seguranca-black/30 rounded-xl border border-gray-700/50 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-seguranca-yellow" />
              <h3 className="text-sm font-semibold text-gray-200">Inteligência Operacional</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Sigla */}
              <div className="space-y-3">
                <Label htmlFor="sigla" className="text-sm font-medium flex items-center gap-2">
                  Sigla da Escala
                  <Badge variant="outline" className="text-[10px] py-0 h-4 border-gray-600">Exporta p/ DP</Badge>
                </Label>
                <Select
                  value={formData.sigla || ''}
                  onValueChange={(value) => handleInputChange('sigla', value)}
                  disabled={mode === 'view'}
                >
                  <SelectTrigger className="bg-seguranca-black border-2 border-gray-600 hover:border-gray-500 transition-colors h-11">
                    <SelectValue placeholder="Sugerida pelo sistema" />
                  </SelectTrigger>
                  <SelectContent className="bg-seguranca-graphite border-gray-600 z-[10002]">
                    <SelectItem value="PL">PL - Plantão</SelectItem>
                    <SelectItem value="MT">MT - Monitoria</SelectItem>
                    <SelectItem value="HE">HE - Hora Extra</SelectItem>
                    <SelectItem value="FT">FT - Falta</SelectItem>
                    <SelectItem value="AT">AT - Atestado</SelectItem>
                    <SelectItem value="FE">FE - Férias</SelectItem>
                    <SelectItem value="CF">CF - Cobertura Férias</SelectItem>
                    <SelectItem value="RM">RM - Remanejamento</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-gray-500 italic">* Se vazio, o sistema aplicará a regra automática.</p>
              </div>

              {/* Toggles */}
              <div className="flex flex-col gap-4 justify-center">
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Monitoria (MT)</Label>
                    <p className="text-[10px] text-gray-500">Escala de treinamento/acompanhamento</p>
                  </div>
                  <Switch 
                    checked={formData.isMonitoria}
                    onCheckedChange={(checked: boolean) => handleInputChange('isMonitoria', checked)}
                    disabled={mode === 'view'}
                  />
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium text-orange-400">Hora Extra (HE)</Label>
                    <p className="text-[10px] text-gray-500">Adicional fora da jornada padrão</p>
                  </div>
                  <Switch 
                    checked={formData.isHoraExtra}
                    onCheckedChange={(checked: boolean) => handleInputChange('isHoraExtra', checked)}
                    disabled={mode === 'view'}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-seguranca-yellow" />
              <Label htmlFor="status" className="text-sm font-medium">
                Status <span className="text-red-400">*</span>
              </Label>
            </div>
            <Select
              value={formData.status || 'PENDING'}
              onValueChange={(value) => {
                handleInputChange('status', value as ScheduleStatus);
              }}
              disabled={mode === 'view'}
            >
              <SelectTrigger className={`bg-seguranca-black border-2 transition-colors h-11 ${
                mode === 'view' ? 'opacity-50 cursor-not-allowed' : 'border-gray-600 hover:border-gray-500 focus:border-seguranca-yellow'
              }`}>
                <SelectValue placeholder="Selecione o status">
                  {formData.status === 'PENDING' && 'Pendente'}
                  {formData.status === 'CONFIRMED' && 'Confirmada'}
                  {formData.status === 'CANCELLED' && 'Cancelada'}
                  {formData.status === 'COMPLETED' && 'Concluída'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-seguranca-graphite border-gray-600 z-[10002]">
                <SelectItem value="PENDING" className="hover:bg-seguranca-black/50 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    Pendente
                  </div>
                </SelectItem>
                <SelectItem value="CONFIRMED" className="hover:bg-seguranca-black/50 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    Confirmada
                  </div>
                </SelectItem>
                <SelectItem value="COMPLETED" className="hover:bg-seguranca-black/50 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    Concluída
                  </div>
                </SelectItem>
                <SelectItem value="CANCELLED" className="hover:bg-seguranca-black/50 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    Cancelada
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
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
