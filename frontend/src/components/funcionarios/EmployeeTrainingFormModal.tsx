import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { ExternalLink, User, AlertCircle, Search, Building2 } from 'lucide-react';

import { employeeService } from '@/services/employeeService';
import { positionService, type Position } from '@/services/positionService';
import { trainingService, Training } from '@/services/trainingService';
import workPostService, { WorkPost } from '@/services/workPostService';
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
  const [workPosts, setWorkPosts] = useState<WorkPost[]>([]);
  const [filteredWorkPosts, setFilteredWorkPosts] = useState<WorkPost[]>([]);
  const [workPostSearchTerm, setWorkPostSearchTerm] = useState('');
  const [showWorkPostDropdown, setShowWorkPostDropdown] = useState(false);
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
    
    const loadWorkPosts = async () => {
      try {
        const workPostsList = await workPostService.getAllWorkPosts();
        setWorkPosts(workPostsList);
        setFilteredWorkPosts(workPostsList);
      } catch (error) {
        console.error('Erro ao carregar postos de trabalho:', error);
        setWorkPosts([]);
        setFilteredWorkPosts([]);
      }
    };
    
    if (open) { 
      loadEmployees(); 
      loadPositions();
      loadWorkPosts(); 
    }
  }, [open]);

  // Filtrar postos de trabalho conforme busca
  useEffect(() => {
    if (!workPostSearchTerm.trim()) {
      setFilteredWorkPosts(workPosts);
    } else {
      const filtered = workPosts.filter(wp => 
        wp.name.toLowerCase().includes(workPostSearchTerm.toLowerCase()) ||
        wp.postCode.toLowerCase().includes(workPostSearchTerm.toLowerCase()) ||
        (wp.description && wp.description.toLowerCase().includes(workPostSearchTerm.toLowerCase()))
      );
      setFilteredWorkPosts(filtered);
    }
  }, [workPostSearchTerm, workPosts]);

  // Ao selecionar funcionário, preenche CPF e Cargo
  const handleEmployeeChange = async (val) => {
    const emp = employees.find(e => String(e.id) === val);
    setSelectedEmployee(emp);
    
    // Buscar dados completos do funcionário para garantir que temos o cargo atualizado
    let employeeData = emp;
    if (emp) {
      try {
        const fullEmployee = await employeeService.getEmployeeById(emp.id);
        if (fullEmployee) {
          employeeData = {
            ...emp,
            document: fullEmployee.document || emp.document,
            position: fullEmployee.position?.name || fullEmployee.positionName || emp.position,
            positionId: fullEmployee.position?.id || emp.positionId
          };
          setSelectedEmployee(employeeData);
        }
      } catch (error) {
        console.error('Erro ao buscar dados completos do funcionário:', error);
      }
    }
    
    if (employeeData && !employeeData.document) {
      toast({
        title: 'Atenção',
        description: 'Este funcionário não possui CPF cadastrado no sistema. É necessário cadastrar o CPF antes de registrar treinamentos.',
        variant: 'destructive'
      });
    }
    
    // Preencher cargo automaticamente se existir
    const positionName = employeeData?.position || '';
    const positionId = employeeData?.positionId || '';
    
    setForm(f => ({
      ...f,
      employeeId: val,
      employee: employeeData?.name || '',
      cpf: employeeData?.document || '',
      position: positionName,
      asoDate: positionName === 'Vigilante' ? f.asoDate : '',
      psicotecnicoDate: positionName === 'Vigilante' ? f.psicotecnicoDate : '',
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
    if (!selectedEmployee) return;
    
    // Recarregar lista de funcionários para obter dados atualizados
    try {
      // Buscar dados completos do funcionário atualizado
      const updatedEmployeeData = await employeeService.getEmployeeById(selectedEmployee.id);
      
      if (updatedEmployeeData) {
        // Atualizar o funcionário selecionado com dados completos
        const updatedEmployee = {
          ...selectedEmployee,
          document: updatedEmployeeData.document,
          position: updatedEmployeeData.position?.name || updatedEmployeeData.positionName || '',
          positionId: updatedEmployeeData.position?.id || ''
        };
        
        setSelectedEmployee(updatedEmployee);
        
        // Atualizar o formulário com os novos dados, especialmente o cargo
        setForm(f => ({
          ...f,
          cpf: updatedEmployeeData.document || f.cpf,
          position: updatedEmployeeData.position?.name || updatedEmployeeData.positionName || f.position
        }));
        
        // Recarregar lista completa de funcionários
        const list = await employeeService.getAllEmployees();
        setEmployees(list.map((e: any) => ({ 
          id: e.id, 
          name: e.name, 
          document: e.document, 
          position: e.position?.name || e.positionName,
          positionId: e.position?.id
        })));
        
        toast({
          title: 'Sucesso',
          description: 'Funcionário atualizado com sucesso! O cargo foi carregado automaticamente.'
        });
      }
    } catch (error) {
      console.error('Erro ao recarregar dados do funcionário:', error);
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
      <DialogContent className="w-[95vw] sm:max-w-lg mx-auto p-4 sm:p-6 rounded-md max-h-[90vh] overflow-y-auto bg-seguranca-graphite border-gray-600">
        <DialogHeader className="mb-3 sm:mb-4">
          <DialogTitle className="text-base sm:text-lg font-semibold text-seguranca-lightgray">
            {form.id ? 'Editar Treinamento' : 'Novo Treinamento'}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-gray-400 mt-1">
            {form.id ? 'Atualize as informações do treinamento' : 'Preencha os dados para cadastrar um novo treinamento'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 sm:space-y-4">
          {/* Funcionário */}
          <div className="space-y-1.5 sm:space-y-2">
            <Label className="text-xs sm:text-sm font-medium text-seguranca-lightgray">Funcionário</Label>
            <Select value={form.employeeId} onValueChange={handleEmployeeChange}>
              <SelectTrigger className="w-full h-10 sm:h-11 text-sm bg-seguranca-black/50 border-gray-600 text-gray-100">
                <SelectValue placeholder="Selecione o funcionário" className="text-gray-400" />
              </SelectTrigger>
              <SelectContent className="bg-seguranca-black border-gray-600 text-gray-100">
                {employees.map(e => (
                  <SelectItem key={e.id} value={String(e.id)} className="text-sm hover:bg-seguranca-graphite focus:bg-seguranca-graphite cursor-pointer">
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>


          {/* CPF e Cargo em linha no desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-xs sm:text-sm font-medium text-seguranca-lightgray">CPF</Label>
              <div className="relative">
                <Input 
                  value={form.cpf} 
                  disabled 
                  className="w-full h-10 sm:h-11 text-xs sm:text-sm pr-10 bg-seguranca-black/50" 
                />
                {selectedEmployee && !selectedEmployee.document && (
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                    <button
                      onClick={handleEditEmployee}
                      className="text-seguranca-yellow hover:text-seguranca-yellow/80 touch-manipulation"
                      title="Editar funcionário para cadastrar CPF"
                    >
                      <ExternalLink className="h-4 w-4 sm:h-5 sm:w-5" />
                    </button>
                  </div>
                )}
              </div>
              {selectedEmployee && !selectedEmployee.document && (
                <div className="flex items-start gap-1.5 sm:gap-2 text-xs text-yellow-400 bg-yellow-400/10 p-2 rounded">
                  <AlertCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <span className="block sm:inline">CPF não cadastrado. </span>
                    <button
                      onClick={handleEditEmployee}
                      className="text-seguranca-yellow hover:underline flex items-center gap-1 mt-1 sm:mt-0 sm:inline-flex"
                    >
                      <User className="h-3 w-3" />
                      Editar funcionário
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-xs sm:text-sm font-medium text-seguranca-lightgray">Cargo</Label>
              <div className="relative">
                <Select 
                  value={
                    selectedEmployee?.positionId || 
                    (form.position ? positions.find(p => p.name === form.position)?.id : undefined) ||
                    undefined
                  } 
                  onValueChange={(value) => {
                    const position = positions.find(p => p.id === value);
                    const positionName = position?.name || '';
                    setForm(f => ({ ...f, position: positionName }));
                    // Atualizar também o selectedEmployee para manter sincronizado
                    if (selectedEmployee) {
                      setSelectedEmployee({
                        ...selectedEmployee,
                        position: positionName,
                        positionId: position?.id || ''
                      });
                    }
                  }}
                  disabled={!selectedEmployee}
                >
                  <SelectTrigger className="w-full h-10 sm:h-11 text-xs sm:text-sm bg-seguranca-black/50 border-gray-600 text-gray-100">
                    <SelectValue placeholder="Selecione o cargo" className="text-gray-400" />
                  </SelectTrigger>
                  <SelectContent className="bg-seguranca-black border-gray-600 text-gray-100">
                    {positions.length > 0 ? (
                      positions.map(position => (
                        <SelectItem key={position.id} value={position.id} className="text-sm hover:bg-seguranca-graphite focus:bg-seguranca-graphite cursor-pointer">
                          {position.name}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-sm text-gray-500">
                        Nenhum cargo disponível
                      </div>
                    )}
                  </SelectContent>
                </Select>
                {selectedEmployee && !selectedEmployee.position && !form.position && (
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                    <button
                      onClick={handleEditEmployee}
                      className="text-seguranca-yellow hover:text-seguranca-yellow/80 touch-manipulation"
                      title="Editar funcionário para cadastrar cargo"
                    >
                      <ExternalLink className="h-4 w-4 sm:h-5 sm:w-5" />
                    </button>
                  </div>
                )}
              </div>
              {selectedEmployee && !selectedEmployee.position && !form.position && (
                <div className="flex items-start gap-1.5 sm:gap-2 text-xs text-yellow-400 bg-yellow-400/10 p-2 rounded">
                  <AlertCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <span className="block sm:inline">Cargo não cadastrado. </span>
                    <button
                      onClick={handleEditEmployee}
                      className="text-seguranca-yellow hover:underline flex items-center gap-1 mt-1 sm:mt-0 sm:inline-flex touch-manipulation"
                    >
                      <User className="h-3 w-3" />
                      Editar funcionário
                    </button>
                  </div>
                </div>
              )}
              {selectedEmployee && (selectedEmployee.position || form.position) && (
                <div className="text-xs text-green-400 bg-green-400/10 p-2 rounded flex items-center gap-1.5">
                  <span className="text-green-500">✓</span>
                  <span>Cargo carregado: <strong>{form.position || selectedEmployee.position}</strong></span>
                </div>
              )}
            </div>
          </div>

          {/* Data de Validade */}
          <div className="space-y-1.5 sm:space-y-2">
            <Label className="text-xs sm:text-sm font-medium text-seguranca-lightgray">Data de Validade</Label>
            <Input 
              type="date" 
              value={form.validUntil} 
              onChange={e => setForm(f => ({ ...f, validUntil: e.target.value }))} 
              className="w-full h-10 sm:h-11 text-xs sm:text-sm" 
            />
          </div>

          {/* Setor/Posto de Trabalho com busca */}
          <div className="space-y-1.5 sm:space-y-2">
            <Label className="text-xs sm:text-sm font-medium text-seguranca-lightgray">Setor/Posto de Trabalho</Label>
            <div className="relative">
              <div className="relative">
                <Input
                  type="text"
                  value={workPostSearchTerm}
                  onChange={(e) => {
                    setWorkPostSearchTerm(e.target.value);
                    setShowWorkPostDropdown(true);
                  }}
                  onFocus={() => setShowWorkPostDropdown(true)}
                  onBlur={() => setTimeout(() => setShowWorkPostDropdown(false), 200)}
                  placeholder="Buscar posto de trabalho..."
                  className="w-full h-10 sm:h-11 text-xs sm:text-sm pr-10"
                />
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              
              {/* Dropdown de postos de trabalho */}
              {showWorkPostDropdown && filteredWorkPosts.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-seguranca-black border border-gray-600 rounded-lg shadow-lg max-h-60 overflow-auto">
                  {filteredWorkPosts.map((workPost) => (
                    <div
                      key={workPost.id}
                      className="px-3 py-2.5 hover:bg-seguranca-graphite cursor-pointer border-b border-gray-700 last:border-b-0"
                      onClick={() => {
                        setForm(f => ({ ...f, sector: workPost.name }));
                        setWorkPostSearchTerm(workPost.name);
                        setShowWorkPostDropdown(false);
                      }}
                    >
                      <div className="flex items-start gap-2">
                        <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-seguranca-yellow mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-seguranca-lightgray truncate">
                            {workPost.name}
                          </div>
                          {workPost.postCode && (
                            <div className="text-xs text-gray-400 mt-0.5">
                              Código: {workPost.postCode}
                            </div>
                          )}
                          {workPost.description && (
                            <div className="text-xs text-gray-500 mt-1 line-clamp-1">
                              {workPost.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {showWorkPostDropdown && workPostSearchTerm.trim() !== '' && filteredWorkPosts.length === 0 && (
                <div className="absolute z-50 w-full mt-1 bg-seguranca-black border border-gray-600 rounded-lg shadow-lg p-3">
                  <p className="text-xs sm:text-sm text-gray-400">Nenhum posto de trabalho encontrado</p>
                </div>
              )}
            </div>
            
            {/* Exibir posto selecionado */}
            {form.sector && (
              <div className="bg-seguranca-black/50 border border-gray-700 rounded-lg p-2.5 sm:p-3">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-seguranca-yellow flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-seguranca-lightgray truncate">
                      {form.sector}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setForm(f => ({ ...f, sector: '' }));
                      setWorkPostSearchTerm('');
                    }}
                    className="text-gray-400 hover:text-red-400 touch-manipulation"
                  >
                    <span className="text-xs">✕</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Horário de Trabalho */}
          <div className="space-y-1.5 sm:space-y-2">
            <Label className="text-xs sm:text-sm font-medium text-seguranca-lightgray">Horário de Trabalho</Label>
            <Input 
              value={form.workSchedule} 
              onChange={e => setForm(f => ({ ...f, workSchedule: e.target.value }))} 
              className="w-full h-10 sm:h-11 text-xs sm:text-sm" 
              placeholder="Ex: 06h às 18h"
            />
          </div>

          {/* Campos específicos para Vigilante */}
          {form.position === 'Vigilante' && (
            <div className="space-y-3 sm:space-y-4 border-t border-gray-700 pt-3 sm:pt-4">
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-xs sm:text-sm font-medium text-seguranca-lightgray">Data do ASO</Label>
                <Input 
                  type="date" 
                  value={form.asoDate} 
                  onChange={e => setForm(f => ({ ...f, asoDate: e.target.value }))} 
                  className="w-full h-10 sm:h-11 text-xs sm:text-sm" 
                />
                <div className="text-xs text-seguranca-lightgray/80 bg-seguranca-black/50 p-2 rounded">
                  Validade: {form.asoDate ? addYears(form.asoDate, 1) : '--'}
                </div>
              </div>
              
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-xs sm:text-sm font-medium text-seguranca-lightgray">Data do Psicotécnico</Label>
                <Input 
                  type="date" 
                  value={form.psicotecnicoDate} 
                  onChange={e => setForm(f => ({ ...f, psicotecnicoDate: e.target.value }))} 
                  className="w-full h-10 sm:h-11 text-xs sm:text-sm" 
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="pt-4 sm:pt-6 flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Button 
            onClick={handleSave} 
            className="w-full sm:w-auto h-10 sm:h-11 text-xs sm:text-sm font-medium bg-seguranca-red hover:bg-seguranca-red/90 touch-manipulation"
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