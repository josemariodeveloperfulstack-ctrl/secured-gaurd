import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Clock } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { formatDateForBackend, DEFAULT_DATE_PICKER_PROPS } from '@/utils/dateUtils';
import { ShiftChangeFormDTO } from '@/services/shiftChangeService';
import type { SimpleEmployee } from '@/services/employeeService';
import { EmployeeCombobox } from '@/components/ui/employee-combobox';
import { WorkPostCombobox } from '@/components/ui/work-post-combobox';
import { workPostService } from '@/services/workPostService';


interface ShiftChangeFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shiftChange?: ShiftChangeFormDTO | null;
  onSave: (formData: any) => void;
}

const ShiftChangeFormModal: React.FC<ShiftChangeFormModalProps> = ({
  open,
  onOpenChange,
  shiftChange,
  onSave
}) => {
  const [formData, setFormData] = useState({
    dateOfRequest: new Date(),
    requesterFullName: '',
    requesterEmployeeId: '',
    requesterSector: '',
    requesterWorkPostId: '',
    requesterDayOffDate: null as Date | null,
    requesterShiftDate: null as Date | null,
    replacingFullName: '',
    replacingEmployeeId: '',
    replacingSector: '',
    replacingWorkPostId: '',
    replacingShiftDate: null as Date | null,
    replacingDayOffDate: null as Date | null,
    shiftTime: '',
    status: undefined as any,
    approvedBy: '' as string | undefined,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Nomes exibidos para edição (mostrados nos comboboxes até que carreguem o item)
  const [requesterDisplayName, setRequesterDisplayName] = useState<string>('');
  const [replacingDisplayName, setReplacingDisplayName] = useState<string>('');
  // ID interno do "Aprovado por" — usado apenas pelo combobox; o payload continua com o NOME do aprovador
  const [approvedById, setApprovedById] = useState<string>('');

  const shiftTimeOptions = [
    { value: 'SHIFT_6H_18H', label: '6h às 18h' },
    { value: 'SHIFT_18H_6H', label: '18h às 6h' },
    { value: 'SHIFT_7H_19H', label: '7h às 19h' },
    { value: 'SHIFT_19H_7H', label: '19h às 7h' },
  ];

  const statusOptions = [
    { value: 'PENDING', label: 'Pendente' },
    { value: 'APPROVED', label: 'Aprovado' },
    { value: 'REJECTED', label: 'Rejeitado' },
  ];

  // Resetar/Inicializar formulário ao abrir o modal
  useEffect(() => {
    if (open) {
      if (!shiftChange) {
        // Reset form for new entry
        setFormData({
          dateOfRequest: new Date(),
          requesterFullName: '',
          requesterEmployeeId: '',
          requesterSector: '',
          requesterWorkPostId: '',
          requesterDayOffDate: null,
          requesterShiftDate: null,
          replacingFullName: '',
          replacingEmployeeId: '',
          replacingSector: '',
          replacingWorkPostId: '',
          replacingShiftDate: null,
          replacingDayOffDate: null,
          shiftTime: '',
          status: undefined,
          approvedBy: undefined,
        });
        setRequesterDisplayName('');
        setReplacingDisplayName('');
        setApprovedById('');
      }
      setErrors({});
    }
  }, [shiftChange, open]);

  // Preencher formulário em modo edição (carregamento sob demanda dos comboboxes)
  useEffect(() => {
    if (shiftChange) {
      setFormData({
        dateOfRequest: shiftChange.dateOfRequest ? new Date(shiftChange.dateOfRequest) : new Date(),
        requesterFullName: shiftChange.requesterFullName || '',
        requesterEmployeeId: shiftChange.requesterEmployeeId || '',
        requesterSector: shiftChange.requesterSector || '',
        requesterWorkPostId: '', // resolvido pelo useEffect abaixo a partir do nome do setor
        requesterDayOffDate: shiftChange.requesterDayOffDate ? new Date(shiftChange.requesterDayOffDate) : null,
        requesterShiftDate: shiftChange.requesterShiftDate ? new Date(shiftChange.requesterShiftDate) : null,
        replacingFullName: shiftChange.replacingFullName || '',
        replacingEmployeeId: shiftChange.replacingEmployeeId || '',
        replacingSector: shiftChange.replacingSector || '',
        replacingWorkPostId: '',
        replacingShiftDate: shiftChange.replacingShiftDate ? new Date(shiftChange.replacingShiftDate) : null,
        replacingDayOffDate: shiftChange.replacingDayOffDate ? new Date(shiftChange.replacingDayOffDate) : null,
        shiftTime: shiftChange.shiftTime || '',
        status: shiftChange.status,
        approvedBy: shiftChange.approvedBy || undefined,
      });
      setRequesterDisplayName(shiftChange.requesterFullName || '');
      setReplacingDisplayName(shiftChange.replacingFullName || '');
    }
  }, [shiftChange]);

  // Sincronizar IDs <-> nomes dos postos de trabalho (solicitante e colega).
  // Em edição: vem só o nome (setor), resolvemos o ID.
  // Em criação/edição via combobox: vem só o ID, resolvemos o nome.
  useEffect(() => {
    let cancelled = false;
    const requesterNeedsName = formData.requesterWorkPostId && !formData.requesterSector;
    const replacingNeedsName = formData.replacingWorkPostId && !formData.replacingSector;
    const requesterNeedsId = formData.requesterSector && !formData.requesterWorkPostId;
    const replacingNeedsId = formData.replacingSector && !formData.replacingWorkPostId;

    if (requesterNeedsName) {
      workPostService.getWorkPostById(formData.requesterWorkPostId)
        .then(wp => { if (!cancelled && wp) setFormData(prev => ({ ...prev, requesterSector: wp.name })); })
        .catch(() => { /* silencioso */ });
    }
    if (replacingNeedsName) {
      workPostService.getWorkPostById(formData.replacingWorkPostId)
        .then(wp => { if (!cancelled && wp) setFormData(prev => ({ ...prev, replacingSector: wp.name })); })
        .catch(() => { /* silencioso */ });
    }
    if (requesterNeedsId || replacingNeedsId) {
      workPostService.getAllWorkPosts()
        .then(posts => {
          if (cancelled) return;
          const findByName = (n: string): string => {
            if (!n) return '';
            const match = posts.find(wp => wp.name.toLowerCase() === n.toLowerCase());
            return match?.id ?? '';
          };
          setFormData(prev => ({
            ...prev,
            requesterWorkPostId: prev.requesterWorkPostId || findByName(prev.requesterSector),
            replacingWorkPostId: prev.replacingWorkPostId || findByName(prev.replacingSector),
          }));
        })
        .catch(() => { /* silencioso */ });
    }
    return () => { cancelled = true; };
  }, [formData.requesterWorkPostId, formData.replacingWorkPostId, formData.requesterSector, formData.replacingSector]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.dateOfRequest) newErrors.dateOfRequest = 'Data da solicitação é obrigatória';
    if (!formData.requesterFullName.trim()) newErrors.requesterFullName = 'Nome do solicitante é obrigatório';
    if (!formData.requesterSector.trim()) newErrors.requesterSector = 'Setor do solicitante é obrigatório';
    if (!formData.requesterShiftDate) newErrors.requesterShiftDate = 'Data do plantão do solicitante é obrigatória';
    if (!formData.replacingFullName.trim()) newErrors.replacingFullName = 'Nome do colega é obrigatório';
    if (!formData.replacingSector.trim()) newErrors.replacingSector = 'Setor do colega é obrigatório';
    if (!formData.replacingShiftDate) newErrors.replacingShiftDate = 'Data do plantão do colega é obrigatória';
    if (!formData.shiftTime) newErrors.shiftTime = 'Horário do plantão é obrigatório';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      // Mantém os IDs dos funcionários (necessários para integrar com o histórico)
      // e descarta apenas os IDs dos postos de trabalho, que o backend não persiste.
      const { requesterWorkPostId, replacingWorkPostId, ...restFormData } = formData;

      const submitData = {
        ...restFormData,
        dateOfRequest: formatDateForBackend(formData.dateOfRequest),
        requesterDayOffDate: formData.requesterDayOffDate ? formatDateForBackend(formData.requesterDayOffDate) : null,
        requesterShiftDate: formData.requesterShiftDate ? formatDateForBackend(formData.requesterShiftDate) : null,
        replacingShiftDate: formData.replacingShiftDate ? formatDateForBackend(formData.replacingShiftDate) : null,
        replacingDayOffDate: formData.replacingDayOffDate ? formatDateForBackend(formData.replacingDayOffDate) : null,
        // IDs dos funcionários para integração com histórico (podem ser nulos em fluxos legados)
        requesterEmployeeId: formData.requesterEmployeeId || null,
        replacingEmployeeId: formData.replacingEmployeeId || null,
        // Inclui o status se estiver editando, caso contrário deixa undefined
        status: formData.status || undefined,
        approvedBy: formData.approvedBy || undefined,
      };

      await onSave(submitData);
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao salvar:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setErrors({});
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-seguranca-graphite border-gray-600">
        <DialogHeader>
          <DialogTitle className="text-seguranca-lightgray flex items-center gap-2">
            <Clock className="h-5 w-5 text-seguranca-yellow" />
            {shiftChange ? 'Editar Troca de Plantão' : 'Nova Solicitação de Troca de Plantão'}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {shiftChange ? 'Edite os dados da solicitação de troca de plantão.' : 'Preencha os dados para solicitar uma troca de plantão.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Data da Solicitação */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-seguranca-lightgray">Data da Solicitação *</label>
            <DatePicker
              selected={formData.dateOfRequest}
              onChange={(date: Date) => handleInputChange('dateOfRequest', date)}
              {...DEFAULT_DATE_PICKER_PROPS}
              className="w-full p-2 border border-gray-600 rounded-md bg-seguranca-black text-seguranca-lightgray focus:border-seguranca-yellow focus:ring-seguranca-yellow"
              required
            />
            {errors.dateOfRequest && (
              <span className="text-red-400 text-sm">{errors.dateOfRequest}</span>
            )}
          </div>

          {/* Dados do Solicitante */}
          <div className="grid gap-4">
            <h3 className="text-lg font-semibold text-seguranca-yellow flex items-center gap-2">
              <User className="h-5 w-5" />
              Dados do Solicitante
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-seguranca-lightgray">Nome Completo *</label>
                <EmployeeCombobox
                  value={formData.requesterEmployeeId}
                  onChange={(value) => {
                    handleInputChange('requesterEmployeeId', value);
                    if (!value) {
                      handleInputChange('requesterFullName', '');
                      setRequesterDisplayName('');
                    }
                  }}
                  onEmployeeSelect={(emp: SimpleEmployee) => {
                    handleInputChange('requesterFullName', emp.name);
                    setRequesterDisplayName(emp.name);
                    // Auto-preencher o setor se o funcionário tiver posto de trabalho
                    if (emp.workPostId) {
                      handleInputChange('requesterWorkPostId', emp.workPostId);
                    }
                    if (emp.workPostName) {
                      handleInputChange('requesterSector', emp.workPostName);
                    }
                  }}
                  placeholder="Selecione o funcionário"
                  searchPlaceholder="Digite pelo menos 3 caracteres..."
                  initialDisplayName={requesterDisplayName}
                />
                {errors.requesterFullName && (
                  <span className="text-red-400 text-sm">{errors.requesterFullName}</span>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-seguranca-lightgray">Setor *</label>
                <WorkPostCombobox
                  value={formData.requesterWorkPostId}
                  onChange={(value) => {
                    handleInputChange('requesterWorkPostId', value);
                    if (!value) handleInputChange('requesterSector', '');
                  }}
                  placeholder="Selecione o posto de trabalho"
                  searchPlaceholder="Digite para buscar..."
                />
                {errors.requesterSector && (
                  <span className="text-red-400 text-sm">{errors.requesterSector}</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-seguranca-lightgray">Data do Plantão *</label>
                <DatePicker
                  selected={formData.requesterShiftDate}
                  onChange={(date: Date) => handleInputChange('requesterShiftDate', date)}
                  {...DEFAULT_DATE_PICKER_PROPS}
                  className="w-full p-2 border border-gray-600 rounded-md bg-seguranca-black text-seguranca-lightgray focus:border-seguranca-yellow focus:ring-seguranca-yellow"
                  required
                />
                {errors.requesterShiftDate && (
                  <span className="text-red-400 text-sm">{errors.requesterShiftDate}</span>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-seguranca-lightgray">Data da Folga (Opcional)</label>
                <DatePicker
                  selected={formData.requesterDayOffDate}
                  onChange={(date: Date) => handleInputChange('requesterDayOffDate', date)}
                  {...DEFAULT_DATE_PICKER_PROPS}
                  className="w-full p-2 border border-gray-600 rounded-md bg-seguranca-black text-seguranca-lightgray focus:border-seguranca-yellow focus:ring-seguranca-yellow"
                  isClearable
                />
              </div>
            </div>
          </div>

          {/* Dados do Colega */}
          <div className="grid gap-4">
            <h3 className="text-lg font-semibold text-blue-400 flex items-center gap-2">
              <User className="h-5 w-5" />
              Dados do Colega
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-seguranca-lightgray">Nome Completo *</label>
                <EmployeeCombobox
                  value={formData.replacingEmployeeId}
                  onChange={(value) => {
                    handleInputChange('replacingEmployeeId', value);
                    if (!value) {
                      handleInputChange('replacingFullName', '');
                      setReplacingDisplayName('');
                    }
                  }}
                  onEmployeeSelect={(emp: SimpleEmployee) => {
                    handleInputChange('replacingFullName', emp.name);
                    setReplacingDisplayName(emp.name);
                    if (emp.workPostId) {
                      handleInputChange('replacingWorkPostId', emp.workPostId);
                    }
                    if (emp.workPostName) {
                      handleInputChange('replacingSector', emp.workPostName);
                    }
                  }}
                  placeholder="Selecione o funcionário"
                  searchPlaceholder="Digite pelo menos 3 caracteres..."
                  initialDisplayName={replacingDisplayName}
                />
                {errors.replacingFullName && (
                  <span className="text-red-400 text-sm">{errors.replacingFullName}</span>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-seguranca-lightgray">Setor *</label>
                <WorkPostCombobox
                  value={formData.replacingWorkPostId}
                  onChange={(value) => {
                    handleInputChange('replacingWorkPostId', value);
                    if (!value) handleInputChange('replacingSector', '');
                  }}
                  placeholder="Selecione o posto de trabalho"
                  searchPlaceholder="Digite para buscar..."
                />
                {errors.replacingSector && (
                  <span className="text-red-400 text-sm">{errors.replacingSector}</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-seguranca-lightgray">Data do Plantão *</label>
                <DatePicker
                  selected={formData.replacingShiftDate}
                  onChange={(date: Date) => handleInputChange('replacingShiftDate', date)}
                  {...DEFAULT_DATE_PICKER_PROPS}
                  className="w-full p-2 border border-gray-600 rounded-md bg-seguranca-black text-seguranca-lightgray focus:border-seguranca-yellow focus:ring-seguranca-yellow"
                  required
                />
                {errors.replacingShiftDate && (
                  <span className="text-red-400 text-sm">{errors.replacingShiftDate}</span>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-seguranca-lightgray">Data da Folga (Opcional)</label>
                <DatePicker
                  selected={formData.replacingDayOffDate}
                  onChange={(date: Date) => handleInputChange('replacingDayOffDate', date)}
                  {...DEFAULT_DATE_PICKER_PROPS}
                  className="w-full p-2 border border-gray-600 rounded-md bg-seguranca-black text-seguranca-lightgray focus:border-seguranca-yellow focus:ring-seguranca-yellow"
                  isClearable
                />
              </div>
            </div>
          </div>

          {/* Horário do Plantão */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-seguranca-lightgray">
              Horário do Plantão *
            </label>
            <Select value={formData.shiftTime} onValueChange={(value) => handleInputChange('shiftTime', value)}>
              <SelectTrigger className="bg-seguranca-black border-gray-600 text-seguranca-lightgray h-11">
                <SelectValue placeholder="Selecione o horário do plantão" />
              </SelectTrigger>
              <SelectContent>
                {shiftTimeOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.shiftTime && (
              <span className="text-red-400 text-sm">{errors.shiftTime}</span>
            )}
          </div>

          {/* Status e Aprovado por */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-seguranca-lightgray">
                Status
              </label>
              <Select
                value={formData.status || 'PENDING'}
                onValueChange={(value) => handleInputChange('status', value)}
              >
                <SelectTrigger className="bg-seguranca-black border-gray-600 text-seguranca-lightgray h-11">
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent className="bg-seguranca-black border-gray-600">
                  {statusOptions.map(option => (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                      className="text-seguranca-lightgray hover:bg-seguranca-graphite"
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-seguranca-lightgray">
                Aprovado por:
              </label>
              <EmployeeCombobox
                value={approvedById}
                onChange={(value) => {
                  setApprovedById(value);
                  if (!value) handleInputChange('approvedBy', '');
                }}
                onEmployeeSelect={(emp: SimpleEmployee) => {
                  setApprovedById(emp.id);
                  handleInputChange('approvedBy', emp.name);
                }}
                placeholder={formData.status === 'APPROVED' || shiftChange ? "Selecione o aprovador" : "Status deve ser Aprovado"}
                searchPlaceholder="Digite pelo menos 3 caracteres..."
                disabled={formData.status !== 'APPROVED' && !shiftChange}
                initialDisplayName={formData.approvedBy || ''}
              />
              {formData.status !== 'APPROVED' && !shiftChange && (
                <p className="text-xs text-gray-500">Selecione "Aprovado" no status para habilitar este campo</p>
              )}
            </div>
          </div>

          {/* Botões */}
          <div className="flex justify-between items-center pt-4 border-t border-gray-600">
            <div>
              {/* PDF generation only available after saving */}
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="border-gray-600 text-gray-400 hover:bg-gray-700"
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-seguranca-yellow hover:bg-seguranca-darkyellow text-seguranca-black"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Salvando...' : (shiftChange ? 'Atualizar' : 'Criar Solicitação')}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ShiftChangeFormModal;
