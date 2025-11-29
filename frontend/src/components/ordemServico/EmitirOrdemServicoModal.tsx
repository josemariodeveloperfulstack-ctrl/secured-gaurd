import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { orderOfServiceService } from '@/services/orderOfServiceService';
import { CreateOrderOfServiceDTO } from '@/types/orderOfService';
import { employeeService, Employee } from '@/services/employeeService';
import { companyService } from '@/services/companyService';
import { clientService, Client } from '@/services/clientService';
import { workPostService, WorkPost } from '@/services/workPostService';
import { positionService, Position } from '@/services/positionService';
import NovoCargoModal from '@/components/funcionarios/NovoCargoModal';
import FuncionarioEditModal from '@/components/funcionarios/FuncionarioEditModal';
import { ordemServicoPDFGenerator } from '@/utils/ordemServicoPDFGenerator';
import { Search, Plus, AlertCircle, CalendarDays, Loader2, Building, User, Briefcase, MapPin, Edit, FileText } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { ptBR } from 'date-fns/locale';
import { formatDateForBackend, parseDateFromBackend } from '@/utils/dateUtils';

interface EmitirOrdemServicoModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const initialState: CreateOrderOfServiceDTO = {
  employeeId: 0,
  employeeName: '',
  employeeCpf: '',
  role: '',
  company: '',
  client: '',
  workplace: '',
  salary: 0,
  startDate: '',
  endDate: '',
};

const EmitirOrdemServicoModal: React.FC<EmitirOrdemServicoModalProps> = ({ open, onClose, onCreated }) => {
  const [form, setForm] = useState<CreateOrderOfServiceDTO>(initialState);
  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [observations, setObservations] = useState('');
  const [model, setModel] = useState('Padrão');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados para os dados dos selects
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [workPosts, setWorkPosts] = useState<WorkPost[]>([]);
  const [filteredWorkPosts, setFilteredWorkPosts] = useState<WorkPost[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [novoCargoModalOpen, setNovoCargoModalOpen] = useState(false);
  const [editEmployeeModalOpen, setEditEmployeeModalOpen] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  // Estados para busca e filtros
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [fullEmployeeData, setFullEmployeeData] = useState<Employee | null>(null);

  // Funções para máscara monetária
  const formatCurrency = (value: number | string): string => {
    if (value === null || value === undefined || value === '') return '';
    
    const numValue = typeof value === 'string' 
      ? parseFloat(value.replace(/[^\d,.-]/g, '').replace(',', '.')) 
      : Number(value);
    
    if (isNaN(numValue) || numValue === 0) return '';

    const isNegative = numValue < 0;
    const absValue = Math.abs(numValue);
    
    const formattedValue = absValue.toFixed(2);
    const parts = formattedValue.split('.');
    const integerPart = parts[0];
    const decimalPart = parts[1] || '00';
    
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    
    const sign = isNegative ? '-' : '';
    return `${sign}R$ ${formattedInteger},${decimalPart}`;
  };

  const handleSalaryChange = (value: string) => {
    let cleaned = value.replace(/R\$\s?/g, '').trim();
    
    const parts = cleaned.split(/[,.]/);
    if (parts.length > 2) {
      cleaned = parts[0] + ',' + parts.slice(1).join('');
    }
    
    if (parts.length === 2 && parts[1].length > 2) {
      cleaned = parts[0] + ',' + parts[1].substring(0, 2);
    }
    
    const normalizedValue = cleaned.replace(',', '.');
    
    if (normalizedValue === '' || normalizedValue === '.' || normalizedValue === '-') {
      setForm((prev) => ({ ...prev, salary: 0 }));
      return;
    }
    
    const numValue = parseFloat(normalizedValue);
    if (!isNaN(numValue)) {
      const absValue = Math.abs(numValue);
      const integerPart = Math.floor(absValue).toString();
      const decimalPart = normalizedValue.includes('.') ? normalizedValue.split('.')[1] : '';
      
      if (integerPart.length + decimalPart.length <= 15 && decimalPart.length <= 2) {
        const roundedValue = Math.round(numValue * 100) / 100;
        setForm((prev) => ({ ...prev, salary: roundedValue }));
      }
    }
  };

  useEffect(() => {
    if (open) {
      loadData();
    } else {
      setForm(initialState);
      setStartDate(new Date());
      setEndDate(null);
      setObservations('');
      setModel('Padrão');
      setSelectedEmployee(null);
      setFullEmployeeData(null);
      setEmployeeSearchTerm('');
      setSelectedClientId(null);
      setFilteredWorkPosts(workPosts);
      setNovoCargoModalOpen(false);
      setEditEmployeeModalOpen(false);
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    if (employeeSearchTerm.trim() === '') {
      setFilteredEmployees(employees);
    } else {
      const filtered = employees.filter(emp =>
        emp.name?.toLowerCase().includes(employeeSearchTerm.toLowerCase()) ||
        emp.document?.includes(employeeSearchTerm) ||
        emp.email?.toLowerCase().includes(employeeSearchTerm.toLowerCase())
      );
      setFilteredEmployees(filtered);
    }
  }, [employeeSearchTerm, employees]);

  const loadData = async () => {
    setLoadingData(true);
    try {
      const [employeesData, companiesData, clientsData, workPostsData, positionsData] = await Promise.all([
        employeeService.getAllEmployees(),
        companyService.getAllCompanies(),
        clientService.getAllClients(),
        workPostService.getAllWorkPosts(),
        positionService.getPositions()
      ]);

      setEmployees(employeesData);
      setFilteredEmployees(employeesData);
      setCompanies(companiesData);
      setClients(clientsData);
      setWorkPosts(workPostsData);
      setFilteredWorkPosts(workPostsData);
      setPositions(positionsData);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setError('Erro ao carregar dados. Tente novamente.');
    } finally {
      setLoadingData(false);
    }
  };

  const handleEmployeeSelect = async (employeeId: string) => {
    try {
      const employee = employees.find(emp => emp.id === employeeId);
      if (employee) {
        setSelectedEmployee(employee);
        setEmployeeSearchTerm(employee.name || '');
        
        const fullEmployee = await employeeService.getEmployeeById(employeeId);
        if (fullEmployee) {
          setFullEmployeeData(fullEmployee);
          setForm(prev => ({
            ...prev,
            employeeId: parseInt(employeeId) || 0,
            employeeName: fullEmployee.name || '',
            employeeCpf: fullEmployee.document || fullEmployee.cpf || '',
            company: (fullEmployee as any).company?.name || prev.company,
            client: (fullEmployee as any).client?.name || prev.client,
            workplace: (fullEmployee as any).workPost?.name || (fullEmployee as any).workplace || prev.workplace,
            role: (fullEmployee as any).position?.name || prev.role,
            salary: fullEmployee.salario || prev.salary
          }));
        } else {
          setFullEmployeeData(employee);
          setForm(prev => ({
            ...prev,
            employeeId: parseInt(employeeId) || 0,
            employeeName: employee.name || '',
            employeeCpf: employee.document || ''
          }));
        }
      }
    } catch (err) {
      console.error('Erro ao buscar dados do funcionário:', err);
      setError('Erro ao carregar dados do funcionário.');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ 
      ...prev, 
      [name]: name === 'salary' || name === 'employeeId' ? Number(value) : value 
    }));
  };

  const handleSelectChange = async (field: string, value: string) => {
    if (field === 'client') {
      const selectedClient = clients.find(c => c.id === value || c.name === value);
      if (selectedClient) {
        setSelectedClientId(selectedClient.id);
        setForm((prev) => ({ ...prev, [field]: selectedClient.name, workplace: '' }));
        
        try {
          const clientWorkPosts = await workPostService.getWorkPostsByClient(selectedClient.id);
          setFilteredWorkPosts(clientWorkPosts);
        } catch (err) {
          console.error('Erro ao buscar postos do cliente:', err);
          setFilteredWorkPosts(workPosts);
        }
      } else {
        setSelectedClientId(null);
        setFilteredWorkPosts(workPosts);
        setForm((prev) => ({ ...prev, [field]: value }));
      }
    } else {
      setForm((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleEditEmployeeSuccess = () => {
    if (selectedEmployee) {
      handleEmployeeSelect(selectedEmployee.id);
    }
    loadData(); // Reload lists
    setEditEmployeeModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload = {
        employeeId: form.employeeId.toString(),
        employeeName: form.employeeName,
        employeeCpf: form.employeeCpf,
        role: form.role,
        company: form.company,
        client: form.client,
        workplace: form.workplace,
        salary: form.salary,
        startDate: formatDateForBackend(startDate) || '',
        endDate: formatDateForBackend(endDate) || ''
      };
      
      const createdOrder = await orderOfServiceService.createOrder(payload);
      
      const selectedCompany = companies.find(c => c.name === form.company || c.sigla === form.company);
      const selectedClient = clients.find(c => c.name === form.client);
      const selectedPosition = positions.find(p => p.name === form.role || p.description === form.role);
      
      const pdfData = {
        ordem: {
          numero: createdOrder.id || Date.now().toString(),
          dataInicio: formatDateForBackend(startDate) || '',
          dataFim: formatDateForBackend(endDate) || '',
          observacoes: observations,
          modelo: model,
          status: 'ATIVA'
        },
        funcionario: {
          name: form.employeeName,
          document: form.employeeCpf,
          position: selectedPosition ? { name: selectedPosition.name || selectedPosition.description || form.role } : undefined,
          unit: undefined
        },
        cliente: {
          name: form.client,
          document: selectedClient?.cnpj || ''
        },
        empresa: {
          name: form.company,
          document: selectedCompany?.cnpj || ''
        },
        unidade: {
          name: form.workplace,
          code: ''
        },
        cargo: {
          name: form.role
        }
      };
      
      try {
        await ordemServicoPDFGenerator.generatePDF(pdfData);
      } catch (pdfError) {
        console.error('Erro ao gerar PDF:', pdfError);
        alert('Ordem de serviço criada com sucesso, mas houve um erro ao gerar o PDF.');
      }
      
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao emitir ordem de serviço.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] sm:max-w-4xl mx-auto p-0 rounded-lg max-h-[90vh] overflow-y-auto bg-seguranca-graphite border-gray-600">
        <DialogHeader className="p-4 sm:p-6 border-b border-gray-700 bg-seguranca-black/30 sticky top-0 z-10">
          <DialogTitle className="text-seguranca-lightgray text-lg sm:text-2xl flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-seguranca-yellow" />
            Editar Ordem de Serviço
          </DialogTitle>
          <DialogDescription className="text-gray-400 text-sm">
            Preencha os dados abaixo para gerar uma nova ordem de serviço. Dica: Você pode fechar este modal clicando no X, pressionando ESC ou clicando fora da área do formulário.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Número da Ordem */}
            <div>
              <Label className="block text-xs sm:text-sm mb-1 text-seguranca-lightgray">Número da Ordem</Label>
              <Input 
                value={`OS-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`} 
                disabled 
                className="bg-seguranca-black border-gray-600 text-gray-400"
              />
            </div>

            {/* Modelo */}
            <div>
              <Label className="block text-xs sm:text-sm mb-1 text-seguranca-lightgray">Modelo</Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger className="bg-seguranca-black border-gray-600 text-seguranca-lightgray">
                  <SelectValue placeholder="Selecione o modelo" />
                </SelectTrigger>
                <SelectContent className="bg-seguranca-black border-gray-600 text-seguranca-lightgray">
                  <SelectItem value="Padrão">Padrão</SelectItem>
                  <SelectItem value="CSN">CSN</SelectItem>
                  <SelectItem value="Detalhado">Detalhado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Funcionário */}
            <div>
              <Label className="block text-xs sm:text-sm mb-1 text-seguranca-lightgray">Funcionário</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <Input
                  placeholder="Selecione o funcionário"
                  value={employeeSearchTerm}
                  onChange={(e) => setEmployeeSearchTerm(e.target.value)}
                  className="pl-10 bg-seguranca-black border-gray-600 text-seguranca-lightgray focus-visible:ring-seguranca-yellow"
                />
                {employeeSearchTerm && !selectedEmployee && (
                   <div className="mt-1 bg-seguranca-black border border-gray-600 rounded-md max-h-40 overflow-y-auto z-50 absolute w-full shadow-lg">
                    {filteredEmployees.length > 0 ? (
                      filteredEmployees.map((emp) => (
                        <div 
                          key={emp.id} 
                          className="p-2 hover:bg-gray-700 cursor-pointer flex flex-col border-b border-gray-700 last:border-0"
                          onClick={() => handleEmployeeSelect(emp.id)}
                        >
                          <span className="text-sm font-medium text-seguranca-lightgray">{emp.name}</span>
                          <span className="text-xs text-gray-400">CPF: {emp.document || 'N/A'}</span>
                        </div>
                      ))
                    ) : (
                      <div className="p-2 text-xs text-gray-400">Nenhum funcionário encontrado</div>
                    )}
                   </div>
                )}
              </div>
            </div>

            {/* Cargo */}
            <div>
              <Label className="block text-xs sm:text-sm mb-1 text-seguranca-lightgray">Cargo</Label>
              <div className="flex gap-2">
                <Select
                  value={(() => {
                    const selectedPosition = positions.find(p => p.name === form.role);
                    return selectedPosition?.id;
                  })()}
                  onValueChange={(value) => {
                    const selectedPosition = positions.find(p => p.id === value);
                    if (selectedPosition) {
                      handleSelectChange('role', selectedPosition.name);
                    } else {
                      handleSelectChange('role', value);
                    }
                  }}
                >
                  <SelectTrigger className="bg-seguranca-black border-gray-600 text-seguranca-lightgray flex-1">
                    <SelectValue placeholder="Selecione o cargo" />
                  </SelectTrigger>
                  <SelectContent className="bg-seguranca-black border-gray-600 text-seguranca-lightgray">
                    {positions.map((position) => (
                      <SelectItem key={position.id} value={position.id}>
                        {position.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedEmployee && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditEmployeeModalOpen(true)}
                    className="px-3 border-gray-600 text-seguranca-yellow hover:bg-gray-700"
                    title="Editar Funcionário"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setNovoCargoModalOpen(true)}
                  className="px-3 border-gray-600 text-seguranca-lightgray hover:bg-gray-700"
                  title="Novo Cargo"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Cliente */}
            <div>
              <Label className="block text-xs sm:text-sm mb-1 text-seguranca-lightgray">Cliente</Label>
              <Select
                value={(() => {
                  const selectedClient = clients.find(c => c.name === form.client);
                  return selectedClient?.id;
                })()}
                onValueChange={(value) => {
                  const selectedClient = clients.find(c => c.id === value);
                  if (selectedClient) {
                    handleSelectChange('client', selectedClient.name);
                  } else {
                    handleSelectChange('client', value);
                  }
                }}
              >
                <SelectTrigger className="bg-seguranca-black border-gray-600 text-seguranca-lightgray">
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent className="bg-seguranca-black border-gray-600 text-seguranca-lightgray">
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Empresa */}
            <div>
              <Label className="block text-xs sm:text-sm mb-1 text-seguranca-lightgray">Empresa</Label>
              <Select
                value={(() => {
                  const selectedCompany = companies.find(c => c.name === form.company || c.sigla === form.company);
                  return selectedCompany?.id;
                })()}
                onValueChange={(value) => {
                  const selectedCompany = companies.find(c => c.id === value);
                  if (selectedCompany) {
                    handleSelectChange('company', selectedCompany.name || selectedCompany.sigla || value);
                  } else {
                    handleSelectChange('company', value);
                  }
                }}
              >
                <SelectTrigger className="bg-seguranca-black border-gray-600 text-seguranca-lightgray">
                  <SelectValue placeholder="Selecione a empresa" />
                </SelectTrigger>
                <SelectContent className="bg-seguranca-black border-gray-600 text-seguranca-lightgray">
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.sigla || company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Unidade (Antigo Posto de Trabalho) */}
            <div>
              <Label className="block text-xs sm:text-sm mb-1 text-seguranca-lightgray">Unidade</Label>
              <Select
                value={(() => {
                  const selectedWorkPost = filteredWorkPosts.find(wp => wp.name === form.workplace);
                  return selectedWorkPost?.id;
                })()}
                onValueChange={(value) => {
                  const selectedWorkPost = filteredWorkPosts.find(wp => wp.id === value);
                  if (selectedWorkPost) {
                    handleSelectChange('workplace', selectedWorkPost.name);
                  } else {
                    handleSelectChange('workplace', value);
                  }
                }}
                disabled={!selectedClientId}
              >
                <SelectTrigger className={`bg-seguranca-black border-gray-600 text-seguranca-lightgray ${!selectedClientId ? 'opacity-50' : ''}`}>
                  <SelectValue placeholder="Selecione a unidade" />
                </SelectTrigger>
                <SelectContent className="bg-seguranca-black border-gray-600 text-seguranca-lightgray">
                  {filteredWorkPosts.map((wp) => (
                    <SelectItem key={wp.id} value={wp.id}>
                      {wp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Data de Início */}
            <div>
              <Label className="block text-xs sm:text-sm mb-1 text-seguranca-lightgray">Data de Início</Label>
              <DatePicker
                selected={startDate}
                onChange={(date: Date | null) => setStartDate(date)}
                dateFormat="dd/MM/yyyy"
                locale={ptBR}
                placeholderText="dd/mm/aaaa"
                className="w-full px-3 h-10 bg-seguranca-black border border-gray-600 rounded-md text-seguranca-lightgray focus:outline-none focus:ring-2 focus:ring-seguranca-yellow"
                required
              />
            </div>

            {/* Data de Fim */}
            <div>
              <Label className="block text-xs sm:text-sm mb-1 text-seguranca-lightgray">Data de Fim</Label>
              <DatePicker
                selected={endDate}
                onChange={(date: Date | null) => setEndDate(date)}
                dateFormat="dd/MM/yyyy"
                locale={ptBR}
                placeholderText="dd/mm/aaaa"
                className="w-full px-3 h-10 bg-seguranca-black border border-gray-600 rounded-md text-seguranca-lightgray focus:outline-none focus:ring-2 focus:ring-seguranca-yellow"
              />
            </div>
          </div>

          {/* Observações */}
          <div>
            <Label className="block text-xs sm:text-sm mb-1 text-seguranca-lightgray">Observações</Label>
            <Textarea
              placeholder="Observações adicionais..."
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              className="bg-seguranca-black border-gray-600 text-seguranca-lightgray min-h-[100px]"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-900/20 border border-red-900/50 p-3 rounded-md text-red-400 text-sm">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
          
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0 pt-4 border-t border-gray-700">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose} 
              disabled={loading}
              className="w-full sm:w-auto border-gray-600 text-seguranca-lightgray hover:bg-gray-700 hover:text-white"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading || loadingData}
              className="w-full sm:w-auto bg-seguranca-red hover:bg-seguranca-darkred text-white gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Emitindo...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4" />
                  Criar Ordem de Serviço
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      <NovoCargoModal
        open={novoCargoModalOpen}
        onClose={() => setNovoCargoModalOpen(false)}
        onCargoCreated={(cargo) => {
          setPositions(prev => [...prev, {
            id: cargo.id,
            name: cargo.name,
            description: cargo.description || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }]);
          setForm(prev => ({ ...prev, role: cargo.name }));
          setNovoCargoModalOpen(false);
        }}
      />

      <FuncionarioEditModal
        open={editEmployeeModalOpen}
        onOpenChange={setEditEmployeeModalOpen}
        funcionario={fullEmployeeData}
        onSuccess={handleEditEmployeeSuccess}
      />
    </Dialog>
  );
};

export default EmitirOrdemServicoModal;