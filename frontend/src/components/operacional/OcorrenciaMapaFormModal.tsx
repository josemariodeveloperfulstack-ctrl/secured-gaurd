import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { occurrenceService, CreateOccurrenceRequest, Occurrence } from '@/services/occurrenceService';
import { employeeService, Employee } from '@/services/employeeService';
import { EmployeeCombobox } from '@/components/ui/employee-combobox';
import { Clock, MapPin, AlertCircle } from 'lucide-react';

interface OcorrenciaMapaFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  occurrence?: Occurrence | null;
}

const OcorrenciaMapaFormModal: React.FC<OcorrenciaMapaFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  occurrence
}) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState<Partial<CreateOccurrenceRequest>>({
    type: 'FALTA',
    status: 'CONCLUIDO',
    priority: 'MEDIA',
    date: new Date().toISOString().split('T')[0],
    description: '',
    location: '',
    category: '',
    originalStartTime: '',
    originalEndTime: '',
    substituteStartTime: '',
    substituteEndTime: '',
    totalHours: 0
  });

  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedSubstitute, setSelectedSubstitute] = useState<Employee | null>(null);

  useEffect(() => {
    if (occurrence) {
      setFormData({
        ...occurrence,
        date: occurrence.date ? occurrence.date.split('T')[0] : new Date().toISOString().split('T')[0]
      });
      // Load employee/substitute objects if needed
      if (occurrence.employeeId) {
        employeeService.getEmployeeById(occurrence.employeeId).then(setSelectedEmployee);
      }
      if (occurrence.substituteId) {
        employeeService.getEmployeeById(occurrence.substituteId).then(setSelectedSubstitute);
      }
    } else {
      setFormData({
        type: 'FALTA',
        status: 'CONCLUIDO',
        priority: 'MEDIA',
        date: new Date().toISOString().split('T')[0],
        description: '',
        location: '',
        category: '',
        originalStartTime: '',
        originalEndTime: '',
        substituteStartTime: '',
        substituteEndTime: '',
        totalHours: 0
      });
      setSelectedEmployee(null);
      setSelectedSubstitute(null);
    }
  }, [occurrence, isOpen]);

  const handleEmployeeSelect = (employee: Employee | null) => {
    setSelectedEmployee(employee);
    if (employee) {
      setFormData(prev => ({
        ...prev,
        employeeId: employee.id,
        location: employee.workPost?.name || employee.workplaceName || ''
      }));
    }
  };

  const handleSubstituteSelect = (employee: Employee | null) => {
    setSelectedSubstitute(employee);
    if (employee) {
      setFormData(prev => ({
        ...prev,
        substituteId: employee.id
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        substituteId: undefined
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employeeId || !formData.date || !formData.type) {
      toast({
        title: 'Campos Obrigatórios',
        description: 'Por favor, preencha o funcionário, data e tipo de ocorrência.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreateOccurrenceRequest = {
        ...formData as CreateOccurrenceRequest,
        title: `Mapa de Ocorrência: ${formData.type} - ${selectedEmployee?.name}`,
        responsible: 'Gestor Operacional' // Should be current user
      };

      if (occurrence?.id) {
        await occurrenceService.updateOccurrence(occurrence.id, payload);
        toast({ title: 'Sucesso', description: 'Ocorrência atualizada com sucesso.' });
      } else {
        await occurrenceService.createOccurrence(payload);
        toast({ title: 'Sucesso', description: 'Ocorrência lançada com sucesso.' });
      }
      onSuccess();
    } catch (error) {
      console.error('Erro ao salvar ocorrência:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao salvar o registro no banco de dados.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] bg-slate-900 border-slate-800 text-white max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-red-500" />
            {occurrence ? 'Editar Lançamento' : 'Lançamento Manual de Ocorrência'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Linha 1: Data e Tipo */}
            <div className="space-y-2">
              <Label className="text-slate-400">Data da Ocorrência</Label>
              <Input 
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                className="bg-slate-950 border-slate-800 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-400">Tipo de Ocorrência</Label>
              <Select 
                value={formData.type} 
                onValueChange={(val) => setFormData(prev => ({ ...prev, type: val }))}
              >
                <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                  <SelectItem value="FALTA">Falta</SelectItem>
                  <SelectItem value="TROCA">Troca</SelectItem>
                  <SelectItem value="HE">Hora Extra (HE)</SelectItem>
                  <SelectItem value="FREE_LANCE">Free Lance</SelectItem>
                  <SelectItem value="PEDIDO_DEMISSAO">Pedido de Demissão</SelectItem>
                  <SelectItem value="FALTA_EFETIVO">Falta de Efetivo</SelectItem>
                  <SelectItem value="SOLICITACAO_CLIENTE">Solicitação do Cliente</SelectItem>
                  <SelectItem value="OUTROS">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Linha 2: Funcionário Efetivo */}
            <div className="space-y-2 md:col-span-2">
              <Label className="text-slate-400">Funcionário (Efetivo/Original)</Label>
              <EmployeeCombobox
                value={selectedEmployee?.id ?? ''}
                initialDisplayName={selectedEmployee?.name}
                placeholder="Buscar funcionário (mín. 3 letras)"
                onChange={async (id) => {
                  if (!id) {
                    handleEmployeeSelect(null);
                    return;
                  }
                  const emp = await employeeService.getEmployeeById(id);
                  handleEmployeeSelect(emp ?? null);
                }}
              />
            </div>

            {/* Linha 3: Posto e Categoria */}
            <div className="space-y-2">
              <Label className="text-slate-400">Posto de Trabalho</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input 
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Nome do posto..."
                  className="pl-10 bg-slate-950 border-slate-800 text-white"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-400">Categoria (Opcional)</Label>
              <Input 
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                placeholder="Ex: Doença, Problema Pessoal..."
                className="bg-slate-950 border-slate-800 text-white"
              />
            </div>

            {/* Seção: Horários Originais */}
            <div className="md:col-span-2 pt-2 border-t border-slate-800">
              <h4 className="text-sm font-semibold text-slate-500 mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4" /> Horários Originais da Escala
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-slate-500">Início Original</Label>
                  <Input 
                    type="time"
                    value={formData.originalStartTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, originalStartTime: e.target.value }))}
                    className="bg-slate-950 border-slate-800 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-slate-500">Fim Original</Label>
                  <Input 
                    type="time"
                    value={formData.originalEndTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, originalEndTime: e.target.value }))}
                    className="bg-slate-950 border-slate-800 text-white"
                  />
                </div>
              </div>
            </div>

            {/* Linha 4: Substituto */}
            <div className="space-y-2 md:col-span-2 pt-2 border-t border-slate-800">
              <Label className="text-slate-400">Funcionário Substituto (Opcional)</Label>
              <EmployeeCombobox
                value={selectedSubstitute?.id ?? ''}
                initialDisplayName={selectedSubstitute?.name}
                placeholder="Substituto (opcional)"
                onChange={async (id) => {
                  if (!id) {
                    handleSubstituteSelect(null);
                    return;
                  }
                  const emp = await employeeService.getEmployeeById(id);
                  handleSubstituteSelect(emp ?? null);
                }}
              />
            </div>

            {/* Seção: Horários do Substituto */}
            <div className="md:col-span-2">
              <h4 className="text-sm font-semibold text-slate-500 mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4" /> Horários do Substituto / Realizado
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-slate-500">Início Substituto</Label>
                  <Input 
                    type="time"
                    value={formData.substituteStartTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, substituteStartTime: e.target.value }))}
                    className="bg-slate-950 border-slate-800 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-slate-500">Fim Substituto</Label>
                  <Input 
                    type="time"
                    value={formData.substituteEndTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, substituteEndTime: e.target.value }))}
                    className="bg-slate-950 border-slate-800 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-slate-500">Total de Horas</Label>
                  <Input 
                    type="number"
                    step="0.5"
                    value={formData.totalHours}
                    onChange={(e) => setFormData(prev => ({ ...prev, totalHours: parseFloat(e.target.value) }))}
                    className="bg-slate-950 border-slate-800 text-white font-bold text-center"
                  />
                </div>
              </div>
            </div>

            {/* Observações */}
            <div className="space-y-2 md:col-span-2">
              <Label className="text-slate-400">Observações / Detalhes</Label>
              <Textarea 
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Detalhes adicionais sobre a ocorrência..."
                rows={3}
                className="bg-slate-950 border-slate-800 text-white"
              />
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-slate-800">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              className="border-slate-800 text-slate-400 hover:text-white"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700 text-white px-8"
            >
              {isSubmitting ? 'Salvando...' : 'Salvar Lançamento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default OcorrenciaMapaFormModal;
