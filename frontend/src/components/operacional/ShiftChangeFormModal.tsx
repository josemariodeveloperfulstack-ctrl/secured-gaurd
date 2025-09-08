import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, User, Clock, Building2, Calendar as CalendarIconLucide } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ShiftChangeFormDTO } from '@/services/shiftChangeService';

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
    requesterSector: '',
    requesterDayOffDate: null as Date | null,
    requesterShiftDate: null as Date | null,
    replacingFullName: '',
    replacingSector: '',
    replacingShiftDate: null as Date | null,
    replacingDayOffDate: null as Date | null,
    shiftTime: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const shiftTimeOptions = [
    { value: 'SHIFT_6H_18H', label: '6h às 18h' },
    { value: 'SHIFT_18H_6H', label: '18h às 6h' },
    { value: 'SHIFT_7H_19H', label: '7h às 19h' },
    { value: 'SHIFT_19H_7H', label: '19h às 7h' },
  ];

  // Carregar dados quando o modal abrir para edição
  useEffect(() => {
    if (shiftChange && open) {
      setFormData({
        dateOfRequest: shiftChange.dateOfRequest ? new Date(shiftChange.dateOfRequest) : new Date(),
        requesterFullName: shiftChange.requesterFullName || '',
        requesterSector: shiftChange.requesterSector || '',
        requesterDayOffDate: shiftChange.requesterDayOffDate ? new Date(shiftChange.requesterDayOffDate) : null,
        requesterShiftDate: shiftChange.requesterShiftDate ? new Date(shiftChange.requesterShiftDate) : null,
        replacingFullName: shiftChange.replacingFullName || '',
        replacingSector: shiftChange.replacingSector || '',
        replacingShiftDate: shiftChange.replacingShiftDate ? new Date(shiftChange.replacingShiftDate) : null,
        replacingDayOffDate: shiftChange.replacingDayOffDate ? new Date(shiftChange.replacingDayOffDate) : null,
        shiftTime: shiftChange.shiftTime || '',
      });
    } else if (!shiftChange && open) {
      // Reset form for new entry
      setFormData({
        dateOfRequest: new Date(),
        requesterFullName: '',
        requesterSector: '',
        requesterDayOffDate: null,
        requesterShiftDate: null,
        replacingFullName: '',
        replacingSector: '',
        replacingShiftDate: null,
        replacingDayOffDate: null,
        shiftTime: '',
      });
    }
    setErrors({});
  }, [shiftChange, open]);

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
      const submitData = {
        ...formData,
        dateOfRequest: format(formData.dateOfRequest, 'yyyy-MM-dd'),
        requesterDayOffDate: formData.requesterDayOffDate ? format(formData.requesterDayOffDate, 'yyyy-MM-dd') : null,
        requesterShiftDate: formData.requesterShiftDate ? format(formData.requesterShiftDate, 'yyyy-MM-dd') : null,
        replacingShiftDate: formData.replacingShiftDate ? format(formData.replacingShiftDate, 'yyyy-MM-dd') : null,
        replacingDayOffDate: formData.replacingDayOffDate ? format(formData.replacingDayOffDate, 'yyyy-MM-dd') : null,
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
          <div className="grid gap-3">
            <Label htmlFor="dateOfRequest" className="text-seguranca-lightgray font-medium">
              Data da Solicitação <CalendarIconLucide className="inline h-4 w-4 mr-1 text-seguranca-yellow" />
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal bg-seguranca-black border-gray-600 text-seguranca-lightgray h-11",
                    !formData.dateOfRequest && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 text-seguranca-yellow" />
                  {formData.dateOfRequest ? format(formData.dateOfRequest, "PPP", { locale: ptBR }) : <span>Selecione uma data</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-seguranca-black border-gray-600">
                <Calendar
                  mode="single"
                  selected={formData.dateOfRequest}
                  onSelect={(date) => handleInputChange('dateOfRequest', date)}
                  initialFocus
                  className="bg-seguranca-black text-seguranca-lightgray"
                />
              </PopoverContent>
            </Popover>
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
              <div className="grid gap-3">
                <Label htmlFor="requesterFullName" className="text-seguranca-lightgray font-medium">
                  Nome Completo <User className="inline h-4 w-4 mr-1 text-seguranca-yellow" />
                </Label>
                <Input
                  id="requesterFullName"
                  value={formData.requesterFullName}
                  onChange={(e) => handleInputChange('requesterFullName', e.target.value)}
                  className="bg-seguranca-black border-gray-600 text-seguranca-lightgray h-11"
                  placeholder="Nome do solicitante"
                />
                {errors.requesterFullName && (
                  <span className="text-red-400 text-sm">{errors.requesterFullName}</span>
                )}
              </div>

              <div className="grid gap-3">
                <Label htmlFor="requesterSector" className="text-seguranca-lightgray font-medium">
                  Setor <Building2 className="inline h-4 w-4 mr-1 text-seguranca-yellow" />
                </Label>
                <Input
                  id="requesterSector"
                  value={formData.requesterSector}
                  onChange={(e) => handleInputChange('requesterSector', e.target.value)}
                  className="bg-seguranca-black border-gray-600 text-seguranca-lightgray h-11"
                  placeholder="Setor do solicitante"
                />
                {errors.requesterSector && (
                  <span className="text-red-400 text-sm">{errors.requesterSector}</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-3">
                <Label htmlFor="requesterShiftDate" className="text-seguranca-lightgray font-medium">
                  Data do Plantão <CalendarIconLucide className="inline h-4 w-4 mr-1 text-seguranca-yellow" />
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal bg-seguranca-black border-gray-600 text-seguranca-lightgray h-11",
                        !formData.requesterShiftDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 text-seguranca-yellow" />
                      {formData.requesterShiftDate ? format(formData.requesterShiftDate, "PPP", { locale: ptBR }) : <span>Selecione uma data</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-seguranca-black border-gray-600">
                    <Calendar
                      mode="single"
                      selected={formData.requesterShiftDate}
                      onSelect={(date) => handleInputChange('requesterShiftDate', date)}
                      initialFocus
                      className="bg-seguranca-black text-seguranca-lightgray"
                    />
                  </PopoverContent>
                </Popover>
                {errors.requesterShiftDate && (
                  <span className="text-red-400 text-sm">{errors.requesterShiftDate}</span>
                )}
              </div>

              <div className="grid gap-3">
                <Label htmlFor="requesterDayOffDate" className="text-seguranca-lightgray font-medium">
                  Data da Folga (Opcional) <CalendarIconLucide className="inline h-4 w-4 mr-1 text-gray-400" />
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal bg-seguranca-black border-gray-600 text-seguranca-lightgray h-11",
                        !formData.requesterDayOffDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 text-seguranca-yellow" />
                      {formData.requesterDayOffDate ? format(formData.requesterDayOffDate, "PPP", { locale: ptBR }) : <span>Selecione uma data</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-seguranca-black border-gray-600">
                    <Calendar
                      mode="single"
                      selected={formData.requesterDayOffDate}
                      onSelect={(date) => handleInputChange('requesterDayOffDate', date)}
                      initialFocus
                      className="bg-seguranca-black text-seguranca-lightgray"
                    />
                  </PopoverContent>
                </Popover>
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
              <div className="grid gap-3">
                <Label htmlFor="replacingFullName" className="text-seguranca-lightgray font-medium">
                  Nome Completo <User className="inline h-4 w-4 mr-1 text-blue-400" />
                </Label>
                <Input
                  id="replacingFullName"
                  value={formData.replacingFullName}
                  onChange={(e) => handleInputChange('replacingFullName', e.target.value)}
                  className="bg-seguranca-black border-gray-600 text-seguranca-lightgray h-11"
                  placeholder="Nome do colega"
                />
                {errors.replacingFullName && (
                  <span className="text-red-400 text-sm">{errors.replacingFullName}</span>
                )}
              </div>

              <div className="grid gap-3">
                <Label htmlFor="replacingSector" className="text-seguranca-lightgray font-medium">
                  Setor <Building2 className="inline h-4 w-4 mr-1 text-blue-400" />
                </Label>
                <Input
                  id="replacingSector"
                  value={formData.replacingSector}
                  onChange={(e) => handleInputChange('replacingSector', e.target.value)}
                  className="bg-seguranca-black border-gray-600 text-seguranca-lightgray h-11"
                  placeholder="Setor do colega"
                />
                {errors.replacingSector && (
                  <span className="text-red-400 text-sm">{errors.replacingSector}</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-3">
                <Label htmlFor="replacingShiftDate" className="text-seguranca-lightgray font-medium">
                  Data do Plantão <CalendarIconLucide className="inline h-4 w-4 mr-1 text-blue-400" />
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal bg-seguranca-black border-gray-600 text-seguranca-lightgray h-11",
                        !formData.replacingShiftDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 text-seguranca-yellow" />
                      {formData.replacingShiftDate ? format(formData.replacingShiftDate, "PPP", { locale: ptBR }) : <span>Selecione uma data</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-seguranca-black border-gray-600">
                    <Calendar
                      mode="single"
                      selected={formData.replacingShiftDate}
                      onSelect={(date) => handleInputChange('replacingShiftDate', date)}
                      initialFocus
                      className="bg-seguranca-black text-seguranca-lightgray"
                    />
                  </PopoverContent>
                </Popover>
                {errors.replacingShiftDate && (
                  <span className="text-red-400 text-sm">{errors.replacingShiftDate}</span>
                )}
              </div>

              <div className="grid gap-3">
                <Label htmlFor="replacingDayOffDate" className="text-seguranca-lightgray font-medium">
                  Data da Folga (Opcional) <CalendarIconLucide className="inline h-4 w-4 mr-1 text-gray-400" />
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal bg-seguranca-black border-gray-600 text-seguranca-lightgray h-11",
                        !formData.replacingDayOffDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 text-seguranca-yellow" />
                      {formData.replacingDayOffDate ? format(formData.replacingDayOffDate, "PPP", { locale: ptBR }) : <span>Selecione uma data</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-seguranca-black border-gray-600">
                    <Calendar
                      mode="single"
                      selected={formData.replacingDayOffDate}
                      onSelect={(date) => handleInputChange('replacingDayOffDate', date)}
                      initialFocus
                      className="bg-seguranca-black text-seguranca-lightgray"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Horário do Plantão */}
          <div className="grid gap-3">
            <Label htmlFor="shiftTime" className="text-seguranca-lightgray font-medium">
              Horário do Plantão <Clock className="inline h-4 w-4 mr-1 text-seguranca-yellow" />
            </Label>
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

          {/* Botões */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-600">
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
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ShiftChangeFormModal;
