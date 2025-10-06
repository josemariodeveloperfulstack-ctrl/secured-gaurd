import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { ExternalLink, User, AlertCircle } from 'lucide-react';

import { employeeService } from '@/services/employeeService';
import { positionService, type Position } from '@/services/positionService';
import { trainingService, Training, Unit } from '@/services/trainingService';
import { useToast } from '@/hooks/use-toast';
import FuncionarioEditModal from './FuncionarioEditModal';
import { Employee } from '@/types/employee';

// Fallback enquanto carrega
const mockEmployees = [] as Array<{ id: string; name: string; cpf?: string; position?: string }>;

const cargos = ['Vigilante', 'Porteiro', 'Auxiliar Administrativo', 'Supervisor', 'Gestor'];

function addYears(dateStr, years) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().split('T')[0];
}

const EmployeeTrainingFormModal = ({ open, onOpenChange, onSave, editData }) => {
  const [form, setForm] = useState({
    employeeId: '',
    employee: '',
    cpf: '',
    position: '',
    validUntil: '',
    sector: '',
    workSchedule: '',
    asoDate: '',
    psicotecnicoDate: '',
    id: undefined,
  });
  const [employees, setEmployees] = useState(mockEmployees);
  const [positions, setPositions] = useState<Position[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [saving, setSaving] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [showEditEmployeeModal, setShowEditEmployeeModal] = useState(false);
  const [employeeToEdit, setEmployeeToEdit] = useState<Employee | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (editData) {
      setForm(editData);
    } else {
      setForm({
        employeeId: '', employee: '', cpf: '', position: '', validUntil: '', sector: '', workSchedule: '', asoDate: '', psicotecnicoDate: '', id: undefined
      });
    }
  }, [editData, open]);

  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const list = await employeeService.getAllEmployees();
        setEmployees(list.map((e: any) => ({ 
          id: e.id, 
          name: e.name, 
          document: e.document, 
          position: e.position?.name || e.positionName,
          positionId: e.position?.id
        })));
      } catch (_) {
        setEmployees([]);
      }
    };
    
    const loadPositions = async () => {
      try {
        const positionsList = await positionService.getAllPositions();
        setPositions(positionsList);
      } catch (_) {
        setPositions([]);
      }
    };
    
    const loadUnits = async () => {
      try {
        const unitsList = await trainingService.getUnits();
        setUnits(unitsList);
      } catch (_) {
        setUnits([]);
      }
    };
    
    if (open) { 
      loadEmployees(); 
      loadPositions();
      loadUnits(); 
    }
  }, [open]);

  // Ao selecionar funcionário, preenche CPF e Cargo
  const handleEmployeeChange = (val) => {
    const emp = employees.find(e => String(e.id) === val);
    setSelectedEmployee(emp);
    
    if (emp && !emp.document) {
      toast({
        title: 'Atenção',
        description: 'Este funcionário não possui CPF cadastrado no sistema. É necessário cadastrar o CPF antes de registrar treinamentos.',
        variant: 'destructive'
      });
    }
    
    setForm(f => ({
      ...f,
      employeeId: val,
      employee: emp?.name || '',
      cpf: emp?.document || '',
      position: emp?.position || '',
      asoDate: emp?.position === 'Vigilante' ? f.asoDate : '',
      psicotecnicoDate: emp?.position === 'Vigilante' ? f.psicotecnicoDate : '',
    }));
  };

  // Validação automática das datas de validade
  useEffect(() => {
    if (form.position === 'Vigilante') {
      setForm(f => ({
        ...f,
        asoDate: f.asoDate,
        psicotecnicoDate: f.psicotecnicoDate,
      }));
    }
  }, [form.position]);

  // Função para abrir modal de edição de funcionário
  const handleEditEmployee = async () => {
    if (!selectedEmployee) return;
    
    try {
      // Buscar dados completos do funcionário
      const employeeData = await employeeService.getEmployeeById(selectedEmployee.id);
      setEmployeeToEdit(employeeData);
      setShowEditEmployeeModal(true);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados do funcionário.',
        variant: 'destructive'
      });
    }
  };

  // Função chamada quando o funcionário é editado com sucesso
  const handleEmployeeEditSuccess = async () => {
    // Recarregar lista de funcionários para obter dados atualizados
    try {
      const list = await employeeService.getAllEmployees();
      setEmployees(list.map((e: any) => ({ 
        id: e.id, 
        name: e.name, 
        document: e.document, 
        position: e.position?.name || e.positionName,
        positionId: e.position?.id
      })));
      
      // Atualizar o funcionário selecionado
      const updatedEmployee = list.find((e: any) => e.id === selectedEmployee.id);
      if (updatedEmployee) {
        setSelectedEmployee({
          ...selectedEmployee,
          document: updatedEmployee.document,
          position: updatedEmployee.position?.name || updatedEmployee.positionName,
          positionId: updatedEmployee.position?.id
        });
        
        // Atualizar o formulário com os novos dados
        setForm(f => ({
          ...f,
          cpf: updatedEmployee.document || '',
          position: updatedEmployee.position?.name || updatedEmployee.positionName || ''
        }));
      }
      
      toast({
        title: 'Sucesso',
        description: 'Funcionário atualizado com sucesso!'
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao recarregar dados do funcionário.',
        variant: 'destructive'
      });
    }
  };

  const handleSave = async () => {
    if (!form.employeeId || !form.validUntil) return;
    
    // Validação adicional de CPF antes de salvar
    if (!form.cpf) {
      toast({
        title: 'Erro',
        description: 'Funcionário deve ter CPF cadastrado para registrar treinamento. Clique no link para editar o funcionário.',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      setSaving(true);
      // Criar um treinamento genérico primeiro
      const training = await trainingService.createTraining({
        name: `Treinamento ${form.position} - ${form.sector || 'Geral'}`,
        description: `Treinamento específico para ${form.position}`,
        provider: 'Empresa',
        duration: 40
      });
      
      // Criar certificação para o funcionário
      await trainingService.createEmployeeCertification({
        employeeId: form.employeeId,
        trainingId: training.id,
        certificationNumber: `CERT-${Date.now()}`,
        issueDate: new Date().toISOString().slice(0,10),
        expirationDate: form.validUntil,
      });
      toast({ title: 'Sucesso', description: 'Treinamento registrado com sucesso!' });
      onSave({ ...form, id: Date.now() });
    } catch (e) {
      toast({ title: 'Erro', description: 'Falha ao salvar treinamento.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md mx-auto p-4 sm:p-6 rounded-md max-h-[90vh] overflow-y-auto bg-seguranca-graphite border-gray-600">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-lg sm:text-xl font-semibold text-center sm:text-left text-seguranca-lightgray">
            {form.id ? 'Editar Treinamento' : 'Novo Treinamento'}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-400 text-center sm:text-left">
            {form.id ? 'Atualize as informações do treinamento' : 'Preencha os dados para cadastrar um novo treinamento'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 sm:space-y-5">
          {/* Funcionário */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-seguranca-lightgray">Funcionário</Label>
            <Select value={form.employeeId} onValueChange={handleEmployeeChange}>
              <SelectTrigger className="w-full h-10 sm:h-11">
                <SelectValue placeholder="Selecione o funcionário" />
              </SelectTrigger>
              <SelectContent>
                {employees.map(e => (
                  <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>


          {/* CPF e Cargo em linha no desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-seguranca-lightgray">CPF</Label>
              <div className="relative">
                <Input 
                  value={form.cpf} 
                  disabled 
                  className="w-full h-10 sm:h-11 text-sm pr-10" 
                />
                {selectedEmployee && !selectedEmployee.document && (
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                    <button
                      onClick={handleEditEmployee}
                      className="text-seguranca-yellow hover:text-seguranca-yellow/80"
                      title="Editar funcionário para cadastrar CPF"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
              {selectedEmployee && !selectedEmployee.document && (
                <div className="flex items-center gap-2 text-xs text-yellow-400 bg-yellow-400/10 p-2 rounded">
                  <AlertCircle className="h-3 w-3" />
                  <span>CPF não cadastrado. </span>
                  <button
                    onClick={handleEditEmployee}
                    className="text-seguranca-yellow hover:underline flex items-center gap-1"
                  >
                    <User className="h-3 w-3" />
                    Editar funcionário
                  </button>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-seguranca-lightgray">Cargo</Label>
              <div className="relative">
                <Select 
                  value={selectedEmployee?.positionId || ''} 
                  onValueChange={(value) => {
                    const position = positions.find(p => p.id === value);
                    setForm(f => ({ ...f, position: position?.name || '' }));
                  }}
                >
                  <SelectTrigger className="w-full h-10 sm:h-11 text-sm">
                    <SelectValue placeholder={form.position || "Selecione o cargo"} />
                  </SelectTrigger>
                  <SelectContent>
                    {positions.map(position => (
                      <SelectItem key={position.id} value={position.id}>
                        {position.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedEmployee && !selectedEmployee.position && (
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                    <button
                      onClick={handleEditEmployee}
                      className="text-seguranca-yellow hover:text-seguranca-yellow/80"
                      title="Editar funcionário para cadastrar cargo"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
              {selectedEmployee && !selectedEmployee.position && (
                <div className="flex items-center gap-2 text-xs text-yellow-400 bg-yellow-400/10 p-2 rounded">
                  <AlertCircle className="h-3 w-3" />
                  <span>Cargo não cadastrado. </span>
                  <button
                    onClick={handleEditEmployee}
                    className="text-seguranca-yellow hover:underline flex items-center gap-1"
                  >
                    <User className="h-3 w-3" />
                    Editar funcionário
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Data de Validade */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-seguranca-lightgray">Data de Validade</Label>
            <Input 
              type="date" 
              value={form.validUntil} 
              onChange={e => setForm(f => ({ ...f, validUntil: e.target.value }))} 
              className="w-full h-10 sm:h-11 text-sm" 
            />
          </div>

          {/* Setor e Horário em linha no desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-seguranca-lightgray">Setor/Posto de Trabalho</Label>
              <Select value={form.sector} onValueChange={(val) => setForm(f => ({ ...f, sector: val }))}>
                <SelectTrigger className="w-full h-10 sm:h-11">
                  <SelectValue placeholder="Selecione o setor" />
                </SelectTrigger>
                <SelectContent>
                  {units.map(unit => (
                    <SelectItem key={unit.id} value={unit.name}>{unit.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-seguranca-lightgray">Horário de Trabalho</Label>
              <Input 
                value={form.workSchedule} 
                onChange={e => setForm(f => ({ ...f, workSchedule: e.target.value }))} 
                className="w-full h-10 sm:h-11 text-sm" 
                placeholder="Ex: 06h às 18h"
              />
            </div>
          </div>

          {/* Campos específicos para Vigilante */}
          {form.position === 'Vigilante' && (
            <div className="space-y-4 sm:space-y-5 border-t pt-4 sm:pt-5">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-seguranca-lightgray">Data do ASO</Label>
                <Input 
                  type="date" 
                  value={form.asoDate} 
                  onChange={e => setForm(f => ({ ...f, asoDate: e.target.value }))} 
                  className="w-full h-10 sm:h-11 text-sm" 
                />
                <div className="text-xs text-seguranca-lightgray/80 bg-seguranca-black p-2 rounded">
                  Validade: {form.asoDate ? addYears(form.asoDate, 1) : '--'}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium text-seguranca-lightgray">Data do Psicotécnico</Label>
                <Input 
                  type="date" 
                  value={form.psicotecnicoDate} 
                  onChange={e => setForm(f => ({ ...f, psicotecnicoDate: e.target.value }))} 
                  className="w-full h-10 sm:h-11 text-sm" 
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="pt-6 flex flex-col sm:flex-row gap-3 sm:gap-4">
          <Button 
            onClick={handleSave} 
            className="w-full sm:w-auto h-10 sm:h-11 text-sm font-medium bg-seguranca-red hover:bg-seguranca-red/90"
            size="lg"
            disabled={saving}
          >
            {saving ? 'Salvando...' : (form.id ? 'Salvar Alterações' : 'Cadastrar Treinamento')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Modal de Edição de Funcionário */}
    <FuncionarioEditModal
      open={showEditEmployeeModal}
      onOpenChange={setShowEditEmployeeModal}
      funcionario={employeeToEdit}
      onSuccess={handleEmployeeEditSuccess}
    />
    </>
  );
};

export default EmployeeTrainingFormModal; 