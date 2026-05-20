import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { WorkPostAssignment, CreateWorkPostAssignmentDTO } from '@/services/operationalService';
import { Loader2, User, MapPin, Calendar, Clock, FileText } from 'lucide-react';
import { workPostService, WorkPost } from '@/services/workPostService';
import { employeeService } from '@/services/employeeService';

const assignmentSchema = z.object({
  employeeId: z.string().min(1, 'Funcionário é obrigatório'),
  workPostId: z.string().min(1, 'Posto de trabalho é obrigatório'),
  assignmentDate: z.string().min(1, 'Data é obrigatória'),
  shift: z.enum(['DAY', 'NIGHT', 'MIXED']),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  observations: z.string().optional(),
});

type AssignmentFormData = z.infer<typeof assignmentSchema>;

interface WorkPostAssignmentFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignment?: WorkPostAssignment | null;
  onSubmit: (data: CreateWorkPostAssignmentDTO) => Promise<void>;
  employees: Array<{ id: string; name: string }>;
  fixedEmployeeId?: string;
}

const shiftTypeLabels: Record<string, string> = {
  DAY: 'Diurno',
  NIGHT: 'Noturno',
  MIXED: 'Misto',
};

export default function WorkPostAssignmentFormModal({
  open,
  onOpenChange,
  assignment,
  onSubmit,
  employees,
  fixedEmployeeId,
}: WorkPostAssignmentFormModalProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [workPosts, setWorkPosts] = useState<WorkPost[]>([]);
  const [loadingWorkPosts, setLoadingWorkPosts] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AssignmentFormData>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      shift: 'DAY',
    },
  });

  // Carregar postos de trabalho
  useEffect(() => {
    if (open) {
      loadWorkPosts();
    }
  }, [open]);

  const loadWorkPosts = async () => {
    setLoadingWorkPosts(true);
    try {
      const posts = await workPostService.getAllWorkPosts();
      setWorkPosts(posts);
    } catch (error) {
      console.error('Erro ao carregar postos de trabalho:', error);
      setWorkPosts([]);
    } finally {
      setLoadingWorkPosts(false);
    }
  };

  useEffect(() => {
    if (assignment) {
      setValue('employeeId', assignment.employee?.id || '');
      setValue('workPostId', assignment.workPost?.id || '');
      setValue('assignmentDate', assignment.assignmentDate);
      setValue('shift', assignment.shift);
      setValue('startTime', assignment.startTime || '');
      setValue('endTime', assignment.endTime || '');
      setValue('observations', assignment.observations || '');
    } else {
      const defaultValues: Partial<AssignmentFormData> = {
        shift: 'DAY',
        assignmentDate: new Date().toISOString().split('T')[0],
      };
      if (fixedEmployeeId) {
        defaultValues.employeeId = fixedEmployeeId;
        // Auto-carregar o posto do funcionário fixado se for novo
        employeeService.getEmployeeById(fixedEmployeeId)
          .then((emp) => {
            if (emp) {
              const wpId = emp.workPostId || emp.workPost?.id;
              if (wpId) {
                setValue('workPostId', String(wpId), { shouldValidate: true });
              }
            }
          })
          .catch((err) => console.error('Erro ao carregar posto do funcionário fixo:', err));
      }
      reset(defaultValues);
    }
  }, [assignment, setValue, reset, fixedEmployeeId]);

  const handleEmployeeChange = async (employeeId: string) => {
    const val = employeeId === 'all' ? '' : employeeId;
    setValue('employeeId', val, { shouldValidate: true });
    
    if (val) {
      try {
        const emp = await employeeService.getEmployeeById(val);
        if (emp) {
          const wpId = emp.workPostId || emp.workPost?.id;
          if (wpId) {
            const wpIdStr = String(wpId);
            setValue('workPostId', wpIdStr, { shouldValidate: true });
            
            // Tentar preencher turno e horários com base no posto
            const post = workPosts.find(p => String(p.id) === wpIdStr);
            if (post) {
              if (post.type === '12H_NOTURNO' || post.type === 'NIGHT') {
                setValue('shift', 'NIGHT');
              } else if (post.type === 'MIXED') {
                setValue('shift', 'MIXED');
              } else {
                setValue('shift', 'DAY');
              }
              if (post.shiftStart) {
                setValue('startTime', post.shiftStart.substring(0, 5));
              }
              if (post.shiftEnd) {
                setValue('endTime', post.shiftEnd.substring(0, 5));
              }
            }
          }
        }
      } catch (error) {
        console.error('Erro ao carregar posto do funcionário selecionado:', error);
      }
    }
  };

  const handleFormSubmit = async (data: AssignmentFormData) => {
    setIsSubmitting(true);
    try {
      await onSubmit({
        employeeId: data.employeeId,
        workPostId: data.workPostId,
        assignmentDate: data.assignmentDate,
        shift: data.shift,
        startTime: data.startTime || undefined,
        endTime: data.endTime || undefined,
        observations: data.observations,
      });
      onOpenChange(false);
      reset();
    } catch (error) {
      console.error('Erro ao salvar atribuição:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const shift = watch('shift');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-seguranca-graphite border-gray-600">
        <DialogHeader className="bg-gradient-to-r from-seguranca-red to-red-600 p-6 -m-6 mb-4 rounded-t-lg">
          <DialogTitle className="text-white text-2xl font-bold flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <MapPin className="h-6 w-6" />
            </div>
            {assignment ? 'Editar Atribuição de Posto' : 'Nova Atribuição de Posto'}
          </DialogTitle>
          <DialogDescription className="text-white/80 text-sm">
            {assignment ? 'Atualize as informações da atribuição de posto' : 'Preencha os dados para atribuir um funcionário a um posto de trabalho'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* Seção: Informações do Funcionário */}
          <Card className="bg-gradient-to-r from-seguranca-graphite to-gray-700 border-gray-600">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-seguranca-lightgray flex items-center gap-2">
                <div className="p-1.5 bg-seguranca-red/20 rounded-lg">
                  <User className="h-5 w-5 text-seguranca-red" />
                </div>
                Informações do Funcionário
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="employeeId" className="text-seguranca-lightgray font-medium">
                  Funcionário <span className="text-seguranca-red">*</span>
                </Label>
                <SearchableSelect
                  options={(employees || [])
                    .filter((employee) => employee && employee.id)
                    .map((employee) => ({
                      value: employee.id,
                      label: employee.name || '',
                    }))}
                  value={watch('employeeId') || ''}
                  onChange={handleEmployeeChange}
                  placeholder="Selecione o funcionário"
                  searchPlaceholder="Digite ao menos 3 caracteres do nome..."
                  emptyPlaceholder="Nenhum funcionário encontrado."
                  minSearchChars={3}
                  minCharsMessage="Digite ao menos 3 caracteres para buscar funcionários..."
                  disabled={!!fixedEmployeeId}
                />
                {errors.employeeId && (
                  <p className="text-sm text-seguranca-red">{errors.employeeId.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Seção: Posto de Trabalho */}
          <Card className="bg-gradient-to-r from-seguranca-graphite to-gray-700 border-gray-600">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-seguranca-lightgray flex items-center gap-2">
                <div className="p-1.5 bg-seguranca-red/20 rounded-lg">
                  <MapPin className="h-5 w-5 text-seguranca-red" />
                </div>
                Local de Trabalho
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="workPostId" className="text-seguranca-lightgray font-medium">
                  Posto de Trabalho <span className="text-seguranca-red">*</span>
                </Label>
                <SearchableSelect
                  options={(workPosts || [])
                    .filter((post) => post && post.id)
                    .map((post) => ({
                      value: post.id,
                      label: `${post.postCode || ''} - ${post.name || ''}`,
                    }))}
                  value={watch('workPostId') || ''}
                  onChange={(value) =>
                    setValue('workPostId', value === 'all' ? '' : value, {
                      shouldValidate: true,
                    })
                  }
                  placeholder={
                    loadingWorkPosts ? 'Carregando...' : 'Selecione o posto de trabalho'
                  }
                  searchPlaceholder="Digite ao menos 3 caracteres do código ou nome..."
                  emptyPlaceholder="Nenhum posto de trabalho encontrado."
                  minSearchChars={3}
                  minCharsMessage="Digite ao menos 3 caracteres para buscar postos de trabalho..."
                  disabled={loadingWorkPosts}
                />
                {errors.workPostId && (
                  <p className="text-sm text-seguranca-red">{errors.workPostId.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Seção: Data e Horário */}
          <Card className="bg-gradient-to-r from-seguranca-graphite to-gray-700 border-gray-600">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-seguranca-lightgray flex items-center gap-2">
                <div className="p-1.5 bg-seguranca-red/20 rounded-lg">
                  <Calendar className="h-5 w-5 text-seguranca-red" />
                </div>
                Data e Horário
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Data da Atribuição */}
                <div className="space-y-2">
                  <Label htmlFor="assignmentDate" className="text-seguranca-lightgray font-medium">
                    Data da Atribuição <span className="text-seguranca-red">*</span>
                  </Label>
                  <Input
                    id="assignmentDate"
                    type="date"
                    className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray focus:border-seguranca-yellow h-11"
                    {...register('assignmentDate')}
                  />
                  {errors.assignmentDate && (
                    <p className="text-sm text-seguranca-red">{errors.assignmentDate.message}</p>
                  )}
                </div>

                {/* Turno */}
                <div className="space-y-2">
                  <Label htmlFor="shift" className="text-seguranca-lightgray font-medium">
                    Turno <span className="text-seguranca-red">*</span>
                  </Label>
                  <Select
                    value={shift}
                    onValueChange={(value) => setValue('shift', value as any)}
                  >
                    <SelectTrigger className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray focus:border-seguranca-yellow h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-seguranca-graphite border-gray-600">
                      {Object.entries(shiftTypeLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key} className="text-seguranca-lightgray hover:bg-seguranca-red/20">
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Horário de Início */}
                <div className="space-y-2">
                  <Label htmlFor="startTime" className="text-seguranca-lightgray font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Horário de Início
                  </Label>
                  <Input
                    id="startTime"
                    type="time"
                    className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray focus:border-seguranca-yellow h-11"
                    {...register('startTime')}
                  />
                  {errors.startTime && (
                    <p className="text-sm text-seguranca-red">{errors.startTime.message}</p>
                  )}
                </div>

                {/* Horário de Término */}
                <div className="space-y-2">
                  <Label htmlFor="endTime" className="text-seguranca-lightgray font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Horário de Término
                  </Label>
                  <Input
                    id="endTime"
                    type="time"
                    className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray focus:border-seguranca-yellow h-11"
                    {...register('endTime')}
                  />
                  {errors.endTime && (
                    <p className="text-sm text-seguranca-red">{errors.endTime.message}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Seção: Observações */}
          <Card className="bg-gradient-to-r from-seguranca-graphite to-gray-700 border-gray-600">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-seguranca-lightgray flex items-center gap-2">
                <div className="p-1.5 bg-seguranca-red/20 rounded-lg">
                  <FileText className="h-5 w-5 text-seguranca-red" />
                </div>
                Observações Adicionais
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="observations" className="text-seguranca-lightgray font-medium">
                  Observações
                </Label>
                <Textarea
                  id="observations"
                  placeholder="Observações sobre esta atribuição (opcional)"
                  className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray placeholder:text-gray-400 focus:border-seguranca-yellow min-h-[100px]"
                  {...register('observations')}
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          <DialogFooter className="gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="border-gray-600 text-seguranca-lightgray hover:bg-seguranca-graphite hover:text-white"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="bg-gradient-to-r from-seguranca-red to-red-600 hover:from-seguranca-red/90 hover:to-red-600/90 text-white font-semibold shadow-lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Atribuição'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

