import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2, User, Building, MapPin, DollarSign, UploadCloud, Briefcase, AlertCircle, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { OrderOfService, CreateOrderOfServiceRequest } from '@/services/orderOfServiceService';
import { employeeService } from '@/services/employeeService';
import { positionService, type Position } from '@/services/positionService';
import { companyService } from '@/services/companyService';
import clientService, { type Client } from '@/services/clientService';
import { unitService, type Unit } from '@/services/unitService';
import { Calendar } from '@/components/ui/calendar';
import api from '@/lib/axios';

interface OrderOfServiceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateOrderOfServiceRequest) => Promise<void>;
  order?: OrderOfService | null;
  mode: 'create' | 'edit';
}

const OrderOfServiceFormModal: React.FC<OrderOfServiceFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  order,
  mode
}) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<CreateOrderOfServiceRequest>({
    employeeId: '',
    employeeName: '',
    employeeCpf: '',
    role: '',
    company: '',
    client: '',
    workplace: '',
    salary: 0,
    startDate: '',
    endDate: '',
    documentUrl: ''
  });
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [employees, setEmployees] = useState<{ id: string; name: string; document?: string }[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [uploading, setUploading] = useState(false);

  // Search state for autocomplete
  const [employeeQuery, setEmployeeQuery] = useState('');
  const [positionQuery, setPositionQuery] = useState('');
  const [companyQuery, setCompanyQuery] = useState('');
  const [clientQuery, setClientQuery] = useState('');
  const [unitQuery, setUnitQuery] = useState('');

  // Derived filtered lists
  const filteredEmployees = employees.filter(e => e.name.toLowerCase().includes(employeeQuery.toLowerCase()));
  const filteredPositions = positions.filter(p => p.name.toLowerCase().includes(positionQuery.toLowerCase()));
  const filteredCompanies = companies.filter(c => c.name.toLowerCase().includes(companyQuery.toLowerCase()));
  const filteredClients = clients.filter(c => c.name.toLowerCase().includes(clientQuery.toLowerCase()));
  const filteredUnits = (units as any[]).filter((u: any) => (u.name || '').toLowerCase().includes(unitQuery.toLowerCase()));

  // Reset form when modal opens/closes or order changes
  useEffect(() => {
    if (isOpen) {
      (async () => {
        try {
          const [emps, poss, comps, cls, uns] = await Promise.all([
            employeeService.getAllEmployees().catch(() => []),
            positionService.getPositions().catch(() => []),
            companyService.getAllCompanies().catch(() => []),
            clientService.getAllClients().catch(() => []),
            unitService.getAllUnits().catch(() => [])
          ]);
          setEmployees((emps as any[]).map((e: any) => ({ id: e.id, name: e.name, document: e.document || e.cpf })));
          setPositions(poss as Position[]);
          setCompanies((comps as any[]).map((c: any) => ({ id: c.id, name: c.name })));
          setClients(cls as Client[]);
          setUnits(uns as Unit[]);
        } catch {}
      })();
      if (mode === 'edit' && order) {
        setFormData({
          employeeId: order.employeeId,
          employeeName: order.employeeName,
          employeeCpf: order.employeeCpf,
          role: order.role,
          company: order.company,
          client: order.client,
          workplace: order.workplace,
          salary: order.salary,
          startDate: order.startDate,
          endDate: order.endDate || '',
          documentUrl: order.documentUrl || ''
        });
        setStartDate(order.startDate ? new Date(order.startDate) : undefined);
        setEndDate(order.endDate ? new Date(order.endDate) : undefined);
      } else {
        setFormData({
          employeeId: '',
          employeeName: '',
          employeeCpf: '',
          role: '',
          company: '',
          client: '',
          workplace: '',
          salary: 0,
          startDate: '',
          endDate: '',
          documentUrl: ''
        });
        setStartDate(undefined);
        setEndDate(undefined);
      }
      setErrors({});
    }
  }, [isOpen, mode, order]);

  // Update form data when dates change
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      startDate: startDate ? format(startDate, 'yyyy-MM-dd') : '',
      endDate: endDate ? format(endDate, 'yyyy-MM-dd') : ''
    }));
  }, [startDate, endDate]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.employeeName.trim()) newErrors.employeeName = 'Nome do funcionário é obrigatório';
    if (!formData.employeeCpf.trim()) newErrors.employeeCpf = 'CPF é obrigatório';
    if (!formData.role.trim()) newErrors.role = 'Cargo é obrigatório';
    if (!formData.company.trim()) newErrors.company = 'Empresa é obrigatória';
    if (!formData.client.trim()) newErrors.client = 'Cliente é obrigatório';
    if (!formData.workplace.trim()) newErrors.workplace = 'Local de trabalho é obrigatório';
    if (formData.salary <= 0) newErrors.salary = 'Salário deve ser maior que zero';
    if (!formData.startDate) newErrors.startDate = 'Data de início é obrigatória';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      toast({ title: 'Erro de validação', description: 'Por favor, corrija os erros no formulário.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      await onSubmit(formData);
      toast({ title: 'Sucesso!', description: `Ordem de serviço ${mode === 'create' ? 'criada' : 'atualizada'} com sucesso.` });
      onClose();
    } catch (error) {
      toast({ title: 'Erro', description: `Não foi possível ${mode === 'create' ? 'criar' : 'atualizar'} a ordem de serviço.`, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: string) => {
    const numericValue = value.replace(/\D/g, '');
    const number = parseInt(numericValue) / 100;
    return number.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleSalaryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCurrency(e.target.value);
    const numericValue = parseFloat(formatted.replace(/\./g, '').replace(',', '.')) || 0;
    setFormData(prev => ({ ...prev, salary: numericValue }));
  };

  const handleEmployeeSelect = (employeeId: string) => {
    const emp = employees.find(e => e.id === employeeId);
    setFormData(prev => ({ ...prev, employeeId, employeeName: emp?.name || prev.employeeName, employeeCpf: emp?.document || prev.employeeCpf }));
  };

  const handlePositionSelect = (positionId: string) => {
    const pos = positions.find(p => p.id === positionId);
    setFormData(prev => ({ ...prev, role: pos?.name || '' }));
  };

  const handleCompanySelect = (companyId: string) => {
    const comp = companies.find(c => c.id === companyId);
    setFormData(prev => ({ ...prev, company: comp?.name || '' }));
  };

  const handleClientSelect = (clientId: string) => {
    const cli = clients.find(c => c.id === clientId);
    setFormData(prev => ({ ...prev, client: cli?.name || '' }));
  };

  const handleUnitSelect = (unitId: string) => {
    const u = (units as any[]).find((x: any) => x.id === unitId);
    setFormData(prev => ({ ...prev, workplace: (u as any)?.name || '' }));
  };

  const handleUpload = async (file: File | null) => {
    if (!file) return;
    try {
      setUploading(true);
      const form = new FormData();
      form.append('file', file);
      const res = await api.post('/api/uploads/comprovantes', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      const url = (res as any).data?.url;
      if (url) setFormData(prev => ({ ...prev, documentUrl: url }));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-[700px] lg:max-w-[900px] max-h-[95vh] overflow-y-auto bg-seguranca-graphite border-gray-700 text-seguranca-lightgray">
        <DialogHeader className="bg-seguranca-black -m-6 mb-6 px-6 py-4 rounded-t-lg">
          <div className="flex justify-between items-center">
            <DialogTitle className="text-xl font-semibold text-white flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-seguranca-yellow" />
              {mode === 'create' ? 'Nova Ordem de Serviço' : 'Editar Ordem de Serviço'}
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-seguranca-graphite p-2"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 px-2">
          {/* Linha 1: Funcionário e CPF */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-white font-medium flex items-center gap-2">
                <User className="h-4 w-4 text-seguranca-yellow" />
                Nome do Funcionário *
              </Label>
              <div className="space-y-2">
                <Input
                  placeholder="Buscar funcionário..."
                  value={employeeQuery}
                  onChange={(e) => setEmployeeQuery(e.target.value)}
                  className="bg-seguranca-black border-gray-600 text-seguranca-lightgray placeholder-gray-400 focus:border-seguranca-yellow focus:ring-1 focus:ring-seguranca-yellow transition-colors"
                />
                <select
                  value={formData.employeeId}
                  onChange={(e) => handleEmployeeSelect(e.target.value)}
                  className="w-full bg-seguranca-black border border-gray-600 text-seguranca-lightgray rounded-lg px-3 py-2.5 focus:outline-none focus:border-seguranca-yellow focus:ring-1 focus:ring-seguranca-yellow transition-colors"
                >
                  <option value="">Selecione o funcionário</option>
                  {filteredEmployees.map(emp => (<option key={emp.id} value={emp.id}>{emp.name}</option>))}
                </select>
              </div>
              {errors.employeeName && <p className="text-red-400 text-sm flex items-center gap-1"><span>⚠</span>{errors.employeeName}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-white font-medium flex items-center gap-2">
                <span className="text-seguranca-yellow">📄</span>
                CPF *
              </Label>
              <Input
                value={formData.employeeCpf}
                onChange={(e) => setFormData(prev => ({ ...prev, employeeCpf: e.target.value }))}
                className="bg-seguranca-black border-gray-600 text-seguranca-lightgray placeholder-gray-400 focus:border-seguranca-yellow focus:ring-1 focus:ring-seguranca-yellow transition-colors"
                placeholder="000.000.000-00"
              />
              {errors.employeeCpf && <p className="text-red-400 text-sm flex items-center gap-1"><span>⚠</span>{errors.employeeCpf}</p>}
            </div>
          </div>

          {/* Linha 2: Cargo e Empresa */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-white font-medium flex items-center gap-2">
                <span className="text-seguranca-yellow">👔</span>
                Cargo *
              </Label>
              <div className="space-y-2">
                <Input
                  placeholder="Buscar cargo..."
                  value={positionQuery}
                  onChange={(e) => setPositionQuery(e.target.value)}
                  className="bg-seguranca-black border-gray-600 text-seguranca-lightgray placeholder-gray-400 focus:border-seguranca-yellow focus:ring-1 focus:ring-seguranca-yellow transition-colors"
                />
                <select
                  value={positions.find(p => p.name === formData.role)?.id || ''}
                  onChange={(e) => handlePositionSelect(e.target.value)}
                  className="w-full bg-seguranca-black border border-gray-600 text-seguranca-lightgray rounded-lg px-3 py-2.5 focus:outline-none focus:border-seguranca-yellow focus:ring-1 focus:ring-seguranca-yellow transition-colors"
                >
                  <option value="">Selecione o cargo</option>
                  {filteredPositions.map(pos => (<option key={pos.id} value={pos.id}>{pos.name}</option>))}
                </select>
              </div>
              {errors.role && <p className="text-red-400 text-sm flex items-center gap-1"><span>⚠</span>{errors.role}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-white font-medium flex items-center gap-2">
                <Building className="h-4 w-4 text-seguranca-yellow" />
                Empresa *
              </Label>
              <div className="space-y-2">
                <Input
                  placeholder="Buscar empresa..."
                  value={companyQuery}
                  onChange={(e) => setCompanyQuery(e.target.value)}
                  className="bg-seguranca-black border-gray-600 text-seguranca-lightgray placeholder-gray-400 focus:border-seguranca-yellow focus:ring-1 focus:ring-seguranca-yellow transition-colors"
                />
                <select
                  value={companies.find(c => c.name === formData.company)?.id || ''}
                  onChange={(e) => handleCompanySelect(e.target.value)}
                  className="w-full bg-seguranca-black border border-gray-600 text-seguranca-lightgray rounded-lg px-3 py-2.5 focus:outline-none focus:border-seguranca-yellow focus:ring-1 focus:ring-seguranca-yellow transition-colors"
                >
                  <option value="">Selecione a empresa</option>
                  {filteredCompanies.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
                </select>
              </div>
              {errors.company && <p className="text-red-400 text-sm flex items-center gap-1"><span>⚠</span>{errors.company}</p>}
            </div>
          </div>

          {/* Linha 3: Cliente e Local */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-white font-medium flex items-center gap-2">
                <span className="text-seguranca-yellow">🏢</span>
                Cliente *
              </Label>
              <div className="space-y-2">
                <Input
                  placeholder="Buscar cliente..."
                  value={clientQuery}
                  onChange={(e) => setClientQuery(e.target.value)}
                  className="bg-seguranca-black border-gray-600 text-seguranca-lightgray placeholder-gray-400 focus:border-seguranca-yellow focus:ring-1 focus:ring-seguranca-yellow transition-colors"
                />
                <select
                  value={clients.find(c => c.name === formData.client)?.id || ''}
                  onChange={(e) => handleClientSelect(e.target.value)}
                  className="w-full bg-seguranca-black border border-gray-600 text-seguranca-lightgray rounded-lg px-3 py-2.5 focus:outline-none focus:border-seguranca-yellow focus:ring-1 focus:ring-seguranca-yellow transition-colors"
                >
                  <option value="">Selecione o cliente</option>
                  {filteredClients.map(cli => (<option key={cli.id} value={cli.id}>{cli.name}</option>))}
                </select>
              </div>
              {errors.client && <p className="text-red-400 text-sm flex items-center gap-1"><span>⚠</span>{errors.client}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-white font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4 text-seguranca-yellow" />
                Local de Trabalho *
              </Label>
              <div className="space-y-2">
                <Input
                  placeholder="Buscar local..."
                  value={unitQuery}
                  onChange={(e) => setUnitQuery(e.target.value)}
                  className="bg-seguranca-black border-gray-600 text-seguranca-lightgray placeholder-gray-400 focus:border-seguranca-yellow focus:ring-1 focus:ring-seguranca-yellow transition-colors"
                />
                <select
                  value={(units as any[]).find((u: any) => u.name === formData.workplace)?.id || ''}
                  onChange={(e) => handleUnitSelect(e.target.value)}
                  className="w-full bg-seguranca-black border border-gray-600 text-seguranca-lightgray rounded-lg px-3 py-2.5 focus:outline-none focus:border-seguranca-yellow focus:ring-1 focus:ring-seguranca-yellow transition-colors"
                >
                  <option value="">Selecione o local</option>
                  {filteredUnits.map((u: any) => (<option key={u.id} value={u.id}>{u.name}</option>))}
                </select>
              </div>
              {errors.workplace && <p className="text-red-400 text-sm flex items-center gap-1"><span>⚠</span>{errors.workplace}</p>}
            </div>
          </div>

          {/* Linha 4: Salário e Datas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="salary" className="text-white font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-seguranca-yellow" />
                Salário *
              </Label>
              <div className="relative">
                <Input
                  id="salary"
                  value={formData.salary ? formData.salary.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : ''}
                  onChange={handleSalaryChange}
                  className="bg-seguranca-black border-gray-600 text-seguranca-lightgray placeholder-gray-400 focus:border-seguranca-yellow focus:ring-1 focus:ring-seguranca-yellow transition-colors"
                  placeholder="0,00"
                />
              </div>
              {errors.salary && <p className="text-red-400 text-sm flex items-center gap-1"><span>⚠</span>{errors.salary}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-white font-medium flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-seguranca-yellow" />
                Data de Início *
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal bg-seguranca-black border-gray-600 text-seguranca-lightgray hover:bg-seguranca-graphite focus:border-seguranca-yellow focus:ring-1 focus:ring-seguranca-yellow transition-colors"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-seguranca-yellow" />
                    {startDate ? format(startDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecionar data'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-seguranca-graphite border-gray-700 shadow-xl" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                    locale={ptBR}
                    className="bg-seguranca-graphite text-seguranca-lightgray"
                  />
                </PopoverContent>
              </Popover>
              {errors.startDate && <p className="text-red-400 text-sm flex items-center gap-1"><span>⚠</span>{errors.startDate}</p>}
            </div>
          </div>

          {/* Linha 5: Data fim e Documento */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-white font-medium flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-seguranca-yellow" />
                Data de Fim
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal bg-seguranca-black border-gray-600 text-seguranca-lightgray hover:bg-seguranca-graphite focus:border-seguranca-yellow focus:ring-1 focus:ring-seguranca-yellow transition-colors"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-seguranca-yellow" />
                    {endDate ? format(endDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecionar data'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-seguranca-graphite border-gray-700 shadow-xl" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                    locale={ptBR}
                    className="bg-seguranca-graphite text-seguranca-lightgray"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label className="text-white font-medium flex items-center gap-2">
                <UploadCloud className="h-4 w-4 text-seguranca-yellow" />
                Documento
              </Label>
              <div className="flex flex-col md:flex-row gap-3">
                <Input
                  value={formData.documentUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, documentUrl: e.target.value }))}
                  className="bg-seguranca-black border-gray-600 text-seguranca-lightgray placeholder-gray-400 focus:border-seguranca-yellow focus:ring-1 focus:ring-seguranca-yellow transition-colors"
                  placeholder="URL do documento (opcional)"
                />
                <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-seguranca-red text-white rounded-lg cursor-pointer hover:bg-seguranca-darkred transition-colors">
                  <UploadCloud className="h-4 w-4" />
                  Upload
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,image/*"
                    onChange={(e) => handleUpload(e.target.files?.[0] || null)}
                  />
                </label>
                {uploading && (
                  <div className="flex items-center gap-2 px-4 py-2.5 text-seguranca-yellow">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enviando...
                  </div>
                )}
              </div>
              {formData.documentUrl && (
                <a
                  href={formData.documentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-seguranca-yellow text-sm underline hover:text-yellow-400 transition-colors"
                >
                  Ver documento
                </a>
              )}
            </div>
          </div>

          <DialogFooter className="px-0 bg-seguranca-black -m-4 mt-6 pt-6 px-4 justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-gray-600 text-seguranca-lightgray hover:bg-seguranca-graphite font-medium"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-seguranca-red hover:bg-seguranca-darkred text-white font-medium"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === 'create' ? 'Criar' : 'Atualizar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default OrderOfServiceFormModal;
