import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { OrderOfService, CreateOrderOfServiceRequest } from '@/services/orderOfServiceService';
import { employeeService } from '@/services/employeeService';
import { positionService, type Position } from '@/services/positionService';
import { companyService } from '@/services/companyService';
import clientService, { type Client } from '@/services/clientService';
import unitService from '@/services/unitService';
import { workPostService, type WorkPost } from '@/services/workPostService';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarDays, DollarSign, FileText, Upload, Plus, Users, Building2, Tag, Briefcase, AlertCircle, X, Clock } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { ptBR } from 'date-fns/locale';
import { DEFAULT_DATE_PICKER_PROPS } from '@/utils/dateUtils';
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
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [employees, setEmployees] = useState<{ id: string; name: string; document?: string }[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [workPosts, setWorkPosts] = useState<WorkPost[]>([]);
  const [uploading, setUploading] = useState(false);

  // Reset form when modal opens/closes or order changes
  useEffect(() => {
    if (isOpen) {
      (async () => {
        try {
          console.log('🔍 DEBUG: Carregando dados para modal de nova ordem...');
          
          const [emps, poss, comps, cls, uns] = await Promise.all([
            employeeService.getAllEmployees().catch(err => {
              console.error('❌ Erro ao carregar funcionários:', err);
              return [];
            }),
            positionService.getPositions().catch(err => {
              console.error('❌ Erro ao carregar posições:', err);
              return [];
            }),
            companyService.getAllCompanies().catch(err => {
              console.error('❌ Erro ao carregar empresas:', err);
              return [];
            }),
            clientService.getAllClients().catch(err => {
              console.error('❌ Erro ao carregar clientes:', err);
              return [];
            }),
            unitService.getAllUnits().catch(err => {
              console.error('❌ Erro ao carregar unidades:', err);
              return [];
            })
          ]);
          
          console.log('📊 Dados carregados:', {
            funcionários: emps.length,
            posições: poss.length,
            empresas: comps.length,
            clientes: cls.length,
            unidades: uns.length
          });
          
          setEmployees((emps as any[]).map((e: any) => ({ id: e.id, name: e.name, document: e.document || e.cpf })));
          setPositions(poss as Position[]);
          setCompanies((comps as any[]).map((c: any) => ({ id: c.id, name: c.name })));
          setClients(cls as Client[]);
          setUnits(uns as any[]);
          setWorkPosts([]); // Reset work posts when modal opens
          
          console.log('✅ Dados processados e definidos nos states');
        } catch (error) {
          console.error('❌ Erro geral ao carregar dados:', error);
        }
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
        setStartDate(order.startDate ? new Date(order.startDate) : null);
        setEndDate(order.endDate ? new Date(order.endDate) : null);
        
        // Marcamos que precisamos carregar posts após clients carregarem
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
        setStartDate(null);
        setEndDate(null);
      }
      setErrors({});
    }
  }, [isOpen, mode, order]);

  // Carregar posts do cliente quando clients carregarem (para modo de edição)
  useEffect(() => {
    if (mode === 'edit' && order?.client && clients.length > 0) {
      const client = clients.find(c => c.name === order.client);
      if (client) {
        loadWorkPostsByClient(client.id);
      }
    }
  }, [clients, mode, order]);

  // Update form data when dates change
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      startDate: startDate ? startDate.toISOString().split('T')[0] : '',
      endDate: endDate ? endDate.toISOString().split('T')[0] : ''
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

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const loadWorkPostsByClient = async (clientId: string) => {
    try {
      console.log('🔍 DEBUG: Carregando posts de trabalho para cliente:', clientId);
      const posts = await workPostService.getWorkPostsByClient(clientId);
      console.log('📊 Posts encontrados:', posts.length);
      setWorkPosts(posts);
    } catch (error) {
      console.error('❌ Erro ao carregar posts de trabalho:', error);
      setWorkPosts([]);
    }
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-seguranca-graphite border-gray-600 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-seguranca-yellow flex items-center gap-2">
            <Plus size={20} />
            {mode === 'create' ? 'Nova Ordem de Serviço' : 'Editar Ordem de Serviço'}
          </DialogTitle>
          <DialogDescription className="text-gray-300">
            {mode === 'create' ? 'Preencha os dados da nova ordem de serviço' : 'Atualize as informações da ordem de serviço'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Seção: Dados do Funcionário */}
          <div className="bg-seguranca-black p-4 rounded-lg border border-gray-700">
            <h3 className="text-lg font-semibold text-seguranca-lightgray mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-seguranca-yellow" />
              Dados do Funcionário
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Nome do Funcionário */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-blue-400 flex items-center gap-2">
                  <Users size={14} />
                  Nome do Funcionário *
                </label>
                <Select
                  value={formData.employeeId}
                  onValueChange={(value) => {
                    const employee = employees.find(e => e.id === value);
                    handleInputChange('employeeId', value);
                    handleInputChange('employeeName', employee?.name || '');
                    handleInputChange('employeeCpf', employee?.document || '');
                  }}
                  required
                >
                  <SelectTrigger className="border-gray-600 bg-seguranca-graphite text-seguranca-lightgray focus:border-seguranca-yellow focus:ring-seguranca-yellow">
                    <SelectValue placeholder="Selecione o funcionário" />
                  </SelectTrigger>
                  <SelectContent className="bg-seguranca-black border-gray-600">
                    {employees.map((employee) => (
                      <SelectItem 
                        key={employee.id} 
                        value={employee.id}
                        className="text-seguranca-lightgray hover:bg-seguranca-graphite"
                      >
                        {employee.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.employeeName && (
                  <div className="flex items-center gap-2 text-red-400 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    {errors.employeeName}
                  </div>
                )}
              </div>

              {/* CPF */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-red-400 flex items-center gap-2">
                  <FileText size={14} />
                  CPF *
                </label>
                <Input
                  value={formData.employeeCpf}
                  onChange={(e) => handleInputChange('employeeCpf', e.target.value)}
                  placeholder="000.000.000-00"
                  className="border-gray-600 bg-seguranca-graphite text-seguranca-lightgray placeholder:text-gray-400 focus:border-seguranca-yellow focus:ring-seguranca-yellow"
                  required
                />
                {errors.employeeCpf && (
                  <div className="flex items-center gap-2 text-red-400 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    {errors.employeeCpf}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Seção: Dados da Empresa */}
          <div className="bg-seguranca-black p-4 rounded-lg border border-gray-700">
            <h3 className="text-lg font-semibold text-seguranca-lightgray mb-4 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-seguranca-yellow" />
              Dados da Empresa
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Cargo */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-green-400 flex items-center gap-2">
                  <Tag size={14} />
                  Cargo *
                </label>
                <Select
                  value={positions.find(p => p.name === formData.role)?.id || ''}
                  onValueChange={(value) => {
                    const position = positions.find(p => p.id === value);
                    handleInputChange('role', position?.name || '');
                  }}
                  required
                >
                  <SelectTrigger className="border-gray-600 bg-seguranca-graphite text-seguranca-lightgray focus:border-seguranca-yellow focus:ring-seguranca-yellow">
                    <SelectValue placeholder="Selecione o cargo" />
                  </SelectTrigger>
                  <SelectContent className="bg-seguranca-black border-gray-600">
                    {positions.map((position) => (
                      <SelectItem 
                        key={position.id} 
                        value={position.id}
                        className="text-seguranca-lightgray hover:bg-seguranca-graphite"
                      >
                        {position.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.role && (
                  <div className="flex items-center gap-2 text-red-400 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    {errors.role}
                  </div>
                )}
              </div>

              {/* Empresa */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-purple-400 flex items-center gap-2">
                  <Building2 size={14} />
                  Empresa *
                </label>
                <Select
                  value={companies.find(c => c.name === formData.company)?.id || ''}
                  onValueChange={(value) => {
                    const company = companies.find(c => c.id === value);
                    handleInputChange('company', company?.name || '');
                  }}
                  required
                >
                  <SelectTrigger className="border-gray-600 bg-seguranca-graphite text-seguranca-lightgray focus:border-seguranca-yellow focus:ring-seguranca-yellow">
                    <SelectValue placeholder="Selecione a empresa" />
                  </SelectTrigger>
                  <SelectContent className="bg-seguranca-black border-gray-600">
                    {companies.map((company) => (
                      <SelectItem 
                        key={company.id} 
                        value={company.id}
                        className="text-seguranca-lightgray hover:bg-seguranca-graphite"
                      >
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.company && (
                  <div className="flex items-center gap-2 text-red-400 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    {errors.company}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Seção: Detalhes da Ordem */}
          <div className="bg-seguranca-black p-4 rounded-lg border border-gray-700">
            <h3 className="text-lg font-semibold text-seguranca-lightgray mb-4 flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-seguranca-yellow" />
              Detalhes da Ordem
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Cliente */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-cyan-400 flex items-center gap-2">
                  <Building2 size={14} />
                  Cliente *
                </label>
                <Select
                  value={clients.find(c => c.name === formData.client)?.id || ''}
                  onValueChange={(value) => {
                    const client = clients.find(c => c.id === value);
                    handleInputChange('client', client?.name || '');
                    handleInputChange('workplace', ''); // Limpar workplace quando cliente muda
                    if (value) {
                      loadWorkPostsByClient(value);
                    } else {
                      setWorkPosts([]);
                    }
                  }}
                  required
                >
                  <SelectTrigger className="border-gray-600 bg-seguranca-graphite text-seguranca-lightgray focus:border-seguranca-yellow focus:ring-seguranca-yellow">
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent className="bg-seguranca-black border-gray-600">
                    {clients.map((client) => (
                      <SelectItem 
                        key={client.id} 
                        value={client.id}
                        className="text-seguranca-lightgray hover:bg-seguranca-graphite"
                      >
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.client && (
                  <div className="flex items-center gap-2 text-red-400 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    {errors.client}
                  </div>
                )}
              </div>

              {/* Posto de Trabalho */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-orange-400 flex items-center gap-2">
                  <Briefcase size={14} />
                  Local de Trabalho *
                </label>
                <Select
                  value={workPosts.find((wp: WorkPost) => wp.name === formData.workplace)?.id || ''}
                  onValueChange={(value) => {
                    const workPost = workPosts.find((wp: WorkPost) => wp.id === value);
                    handleInputChange('workplace', workPost?.name || '');
                  }}
                  disabled={!formData.client || workPosts.length === 0}
                  required
                >
                  <SelectTrigger className="border-gray-600 bg-seguranca-graphite text-seguranca-lightgray focus:border-seguranca-yellow focus:ring-seguranca-yellow">
                    <SelectValue placeholder={
                      formData.client 
                        ? (workPosts.length === 0 ? "Nenhum posto encontrado" : "Selecione o posto")
                        : "Primeiro selecione um cliente"
                    } />
                  </SelectTrigger>
                  <SelectContent className="bg-seguranca-black border-gray-600">
                    {workPosts.map((workPost: WorkPost) => (
                      <SelectItem 
                        key={workPost.id} 
                        value={workPost.id}
                        className="text-seguranca-lightgray hover:bg-seguranca-graphite"
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">{workPost.name}</span>
                          <span className="text-xs text-gray-400">{workPost.postCode}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.client && !formData.workplace && workPosts.length > 0 && (
                  <p className="text-xs text-blue-400">Selecione um posto de trabalho do cliente escolhido</p>
                )}
                {formData.client && workPosts.length === 0 && (
                  <p className="text-xs text-yellow-400">Nenhum posto de trabalho encontrado para este cliente</p>
                )}
                {!formData.client && (
                  <p className="text-xs text-gray-400">Selecione um cliente primeiro para ver os postos de trabalho</p>
                )}
                {errors.workplace && (
                  <div className="flex items-center gap-2 text-red-400 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    {errors.workplace}
                  </div>
                )}
              </div>

              {/* Salário */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-yellow-400 flex items-center gap-2">
                  <DollarSign size={14} />
                  Salário *
                </label>
                <Input
                  value={formData.salary ? formData.salary.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : ''}
                  onChange={handleSalaryChange}
                  placeholder="0,00"
                  className="border-gray-600 bg-seguranca-graphite text-seguranca-lightgray placeholder:text-gray-400 focus:border-seguranca-yellow focus:ring-seguranca-yellow"
                  required
                />
                {errors.salary && (
                  <div className="flex items-center gap-2 text-red-400 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    {errors.salary}
                  </div>
                )}
              </div>

              {/* Data de Início */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-seguranca-yellow flex items-center gap-2">
                  <CalendarDays size={14} />
                  Data de Início *
                </label>
                <DatePicker
                  selected={startDate}
                  onChange={(date: Date | null) => setStartDate(date)}
                  dateFormat="dd/MM/yyyy"
                  locale={ptBR}
                  className="w-full px-3 py-2 border border-seguranca-yellow rounded-lg focus:outline-none focus:ring-2 focus:ring-seguranca-yellow focus:border-transparent bg-white text-black font-medium [&>input]:text-black [&>input]:bg-white"
                  {...DEFAULT_DATE_PICKER_PROPS}
                />
                {errors.startDate && (
                  <div className="flex items-center gap-2 text-red-400 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    {errors.startDate}
                  </div>
                )}
              </div>

              {/* Data de Fim */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-seguranca-yellow flex items-center gap-2">
                  <CalendarDays size={14} />
                  Data de Fim
                </label>
                <DatePicker
                  selected={endDate}
                  onChange={(date: Date | null) => setEndDate(date)}
                  dateFormat="dd/MM/yyyy"
                  locale={ptBR}
                  className="w-full px-3 py-2 border border-seguranca-yellow rounded-lg focus:outline-none focus:ring-2 focus:ring-seguranca-yellow focus:border-transparent bg-white text-black font-medium [&>input]:text-black [&>input]:bg-white"
                  {...DEFAULT_DATE_PICKER_PROPS}
                />
              </div>

              {/* Documento */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <Upload size={14} />
                  Documento
                </label>
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                  <Input
                    value={formData.documentUrl}
                    onChange={(e) => handleInputChange('documentUrl', e.target.value)}
                    className="flex-1 border-gray-600 bg-seguranca-graphite text-seguranca-lightgray placeholder:text-gray-400 focus:border-seguranca-yellow focus:ring-seguranca-yellow"
                    placeholder="URL do documento (opcional)"
                  />
                  <label className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-seguranca-red border border-seguranca-red rounded-lg cursor-pointer hover:bg-seguranca-darkred text-white transition-colors">
                    <Upload className="h-4 w-4" />
                    <span>Upload</span>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept=".pdf,image/*" 
                      onChange={(e) => handleUpload(e.target.files?.[0] || null)} 
                    />
                  </label>
                  {uploading && <div className="flex items-center gap-2 px-4 py-2 text-seguranca-yellow"><Clock className="h-4 w-4 animate-spin" />Enviando...</div>}
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
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4 border-t border-gray-700">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              className="border-gray-600 text-seguranca-lightgray hover:bg-gray-800 hover:text-white transition-colors"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading}
              className="bg-seguranca-red hover:bg-seguranca-darkred text-white transition-colors"
            >
              {isLoading && <Clock className="mr-2 h-4 w-4 animate-spin" />}
              {mode === 'create' ? 'Criar' : 'Atualizar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default OrderOfServiceFormModal;