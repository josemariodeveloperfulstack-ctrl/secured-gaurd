import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Calendar, User, Building, FileText, Download, Eye, Loader2, CheckCircle2, DollarSign, Clock, Briefcase } from 'lucide-react';
import { employeeService, Employee } from '@/services/employeeService';
import { companyService } from '@/services/companyService';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/axios';

const ContratosTrabalhoForm = () => {
  const { toast } = useToast();
  const [form, setForm] = useState({
    employeeId: '',
    companyId: '',
    position: '',
    contractType: '',
    startDate: '',
    endDate: '',
    salary: '',
    workSchedule: '',
    department: '',
    supervisor: '',
    benefits: [] as string[],
    observations: '',
  });

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);

  const funcionario = employees.find(f => f.id === form.employeeId);
  const empresa = companies.find(e => e.id === form.companyId);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoadingData(true);
    try {
      const [employeesData, companiesData] = await Promise.all([
        employeeService.getAllEmployees(),
        companyService.getAllCompanies()
      ]);
      setEmployees(employeesData);
      setCompanies(companiesData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar funcionários e empresas.',
        variant: 'destructive'
      });
    } finally {
      setLoadingData(false);
    }
  };

  // Pre-fill some fields when employee is selected
  useEffect(() => {
    if (funcionario) {
      setForm(prev => ({
        ...prev,
        position: (funcionario as any).position?.name || prev.position,
        department: (funcionario as any).unit?.name || prev.department,
        startDate: funcionario.hireDate ? funcionario.hireDate.split('T')[0] : prev.startDate,
      }));
    }
  }, [funcionario]);

  const contractTypes = [
    'CLT - Efetivo',
    'CLT - Temporário',
    'PJ - Prestador de Serviços',
    'Estagiário',
    'Aprendiz',
    'Terceirizado',
    'Intermitente',
  ];

  const benefitOptions = [
    'Vale Transporte',
    'Vale Refeição',
    'Vale Alimentação',
    'Plano de Saúde',
    'Plano Odontológico',
    'Seguro de Vida',
    'Auxílio Creche',
    'Gympass',
    'PLR',
  ];

  const handleBenefitToggle = (benefit: string) => {
    setForm(prev => ({
      ...prev,
      benefits: prev.benefits.includes(benefit)
        ? prev.benefits.filter(b => b !== benefit)
        : [...prev.benefits, benefit]
    }));
  };

  const validateForm = () => {
    if (!funcionario || !empresa) {
      toast({
        title: 'Atenção',
        description: 'Selecione funcionário e empresa!',
        variant: 'destructive'
      });
      return false;
    }
    if (!form.contractType || !form.startDate || !form.salary || !form.position) {
      toast({
        title: 'Atenção',
        description: 'Preencha os campos obrigatórios (Tipo, Data Início, Salário, Cargo)!',
        variant: 'destructive'
      });
      return false;
    }
    return true;
  };

  const preparePayload = async () => {
    // Buscar dados completos do funcionário
    const fullEmployee = await employeeService.getEmployeeById(funcionario!.id);
    if (!fullEmployee) throw new Error('Funcionário não encontrado');

    const addressValue = typeof fullEmployee.address === 'string' 
      ? fullEmployee.address 
      : fullEmployee.address?.street || '';

    return {
      templateName: 'contrato-trabalho.html',
      // Dados do Funcionário
      funcionario: fullEmployee.name,
      cpf: fullEmployee.cpf || fullEmployee.document || '',
      rg: fullEmployee.rg || '',
      ctps: fullEmployee.ctps || '',
      endereco: addressValue,
      estadoCivil: fullEmployee.maritalStatus || '',
      nacionalidade: fullEmployee.nationality || 'Brasileira',
      
      // Dados da Empresa
      empresa: empresa!.name,
      cnpj: empresa!.cnpj,
      enderecoEmpresa: empresa!.address || '',
      
      // Dados do Contrato
      cargo: form.position,
      tipoContrato: form.contractType,
      dataInicio: new Date(form.startDate).toLocaleDateString('pt-BR'),
      dataFim: form.endDate ? new Date(form.endDate).toLocaleDateString('pt-BR') : 'Indeterminado',
      salario: form.salary,
      jornada: form.workSchedule || '44 horas semanais',
      departamento: form.department,
      supervisor: form.supervisor,
      beneficios: form.benefits.join(', '),
      observacoes: form.observations,
      dataAtual: new Date().toLocaleDateString('pt-BR')
    };
  };

  const handleGenerateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const payload = await preparePayload();
      
      const response = await api.post('/api/documents/generate-pdf', payload, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contrato-trabalho-${funcionario!.name.replace(/\s+/g, '-').toLowerCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
      toast({
        title: 'Sucesso',
        description: 'Contrato de Trabalho gerado com sucesso!',
      });
    } catch (err: any) {
      console.error('Erro ao gerar contrato:', err);
      toast({
        title: 'Erro',
        description: err.response?.data?.message || 'Erro ao gerar contrato.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewContract = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const payload = await preparePayload();
      
      const response = await api.post('/api/documents/generate-pdf', payload, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      
      setTimeout(() => window.URL.revokeObjectURL(url), 100);
    } catch (err: any) {
      console.error('Erro ao gerar preview:', err);
      toast({
        title: 'Erro',
        description: 'Erro ao gerar preview do contrato.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="border-t-4 border-t-primary shadow-md">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-2xl">
                <FileText className="h-6 w-6 text-primary" />
                Contrato de Trabalho
              </CardTitle>
              <CardDescription>
                Elaboração e emissão de contratos de trabalho.
              </CardDescription>
            </div>
            {(funcionario && empresa && form.contractType) && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1 px-3 py-1">
                <CheckCircle2 className="h-3 w-3" />
                Pronto para gerar
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          
          {/* Identificação */}
          <div className="bg-muted/30 p-6 rounded-xl border space-y-6">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
              <User className="h-4 w-4" />
              <span>Identificação das Partes</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-base font-semibold">Funcionário</Label>
                <Select 
                  value={form.employeeId} 
                  onValueChange={(value) => setForm(prev => ({ ...prev, employeeId: value }))}
                  disabled={loadingData}
                >
                  <SelectTrigger className="h-11 bg-background">
                    <SelectValue placeholder={loadingData ? "Carregando..." : "Selecione o funcionário"} />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingData ? (
                      <div className="p-2 text-center text-sm text-gray-500">Carregando funcionários...</div>
                    ) : employees.length > 0 ? (
                      employees.map(f => (
                        <SelectItem key={f.id} value={f.id}>
                          <div className="flex flex-col py-1">
                            <span className="font-medium text-base">{f.name}</span>
                            {f.document && (
                              <span className="text-xs text-muted-foreground">CPF: {f.document}</span>
                            )}
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-2 text-center text-sm text-gray-500">Nenhum funcionário encontrado</div>
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-base font-semibold">Empresa</Label>
                <Select 
                  value={form.companyId} 
                  onValueChange={(value) => setForm(prev => ({ ...prev, companyId: value }))}
                  disabled={loadingData}
                >
                  <SelectTrigger className="h-11 bg-background">
                    <SelectValue placeholder={loadingData ? "Carregando..." : "Selecione a empresa"} />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingData ? (
                      <div className="p-2 text-center text-sm text-gray-500">Carregando empresas...</div>
                    ) : companies.length > 0 ? (
                      companies.map(e => (
                        <SelectItem key={e.id} value={e.id}>
                          <div className="flex flex-col py-1">
                            <span className="font-medium text-base">
                              {e.sigla || e.tradeName || e.name}
                            </span>
                            {(e.sigla || e.tradeName) && e.name && (
                              <span className="text-xs text-muted-foreground">{e.name}</span>
                            )}
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-2 text-center text-sm text-gray-500">Nenhuma empresa encontrada</div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Detalhes do Funcionário */}
            {funcionario && (
              <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-2 font-medium">
                    <User className="h-4 w-4 text-primary" />
                    Dados do Empregado
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider">Nome</Label>
                      <div className="p-2.5 bg-muted rounded-md text-sm font-medium border border-transparent hover:border-border transition-colors truncate">
                        {funcionario.name}
                      </div>
                    </div>
                     <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider">CPF</Label>
                      <div className="p-2.5 bg-muted rounded-md text-sm font-medium border border-transparent hover:border-border transition-colors">
                        {funcionario.cpf || funcionario.document || '-'}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Endereço</Label>
                    <div className="p-2.5 bg-muted rounded-md text-sm font-medium border border-transparent hover:border-border transition-colors truncate">
                       {typeof funcionario.address === 'string' ? funcionario.address : funcionario.address?.street || '-'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Detalhes da Empresa */}
            {empresa && (
              <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300 delay-100">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-2 font-medium">
                    <Building className="h-4 w-4 text-primary" />
                    Dados do Empregador
                  </div>
                </div>
                <div className="space-y-4">
                   <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Razão Social</Label>
                    <div className="p-2.5 bg-muted rounded-md text-sm font-medium border border-transparent hover:border-border transition-colors truncate">
                      {empresa.name}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider">CNPJ</Label>
                      <div className="p-2.5 bg-muted rounded-md text-sm font-medium border border-transparent hover:border-border transition-colors">
                        {empresa.cnpj}
                      </div>
                    </div>
                     <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider">Sigla</Label>
                      <div className="p-2.5 bg-muted rounded-md text-sm font-medium border border-transparent hover:border-border transition-colors">
                         {empresa.sigla || '-'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {(funcionario || empresa) && <Separator />}

          {/* Detalhes do Contrato */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Briefcase className="h-4 w-4" />
              <span>Detalhes do Contrato</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2 lg:col-span-2">
                <Label>Cargo</Label>
                <Input 
                  value={form.position} 
                  onChange={(e) => setForm(prev => ({ ...prev, position: e.target.value }))}
                  placeholder="Ex: Vigilante Patrimonial"
                  className="bg-background h-11"
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo de Contrato</Label>
                <Select value={form.contractType} onValueChange={(value) => setForm(prev => ({ ...prev, contractType: value }))}>
                  <SelectTrigger className="bg-background h-11">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {contractTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Data de Início</Label>
                <Input 
                  type="date" 
                  value={form.startDate} 
                  onChange={(e) => setForm(prev => ({ ...prev, startDate: e.target.value }))}
                  className="bg-background h-11"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Data de Término (Opcional)</Label>
                <Input 
                  type="date" 
                  value={form.endDate} 
                  onChange={(e) => setForm(prev => ({ ...prev, endDate: e.target.value }))}
                  className="bg-background h-11"
                />
              </div>

              <div className="space-y-2">
                <Label>Salário Base</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                  <Input 
                    value={form.salary} 
                    onChange={(e) => setForm(prev => ({ ...prev, salary: e.target.value }))}
                    placeholder="0,00"
                    className="bg-background h-11 pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2 lg:col-span-2">
                <Label>Jornada de Trabalho</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                  <Input 
                    value={form.workSchedule} 
                    onChange={(e) => setForm(prev => ({ ...prev, workSchedule: e.target.value }))}
                    placeholder="Ex: 44h semanais, escala 12x36"
                    className="bg-background h-11 pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Departamento</Label>
                <Input 
                  value={form.department} 
                  onChange={(e) => setForm(prev => ({ ...prev, department: e.target.value }))}
                  placeholder="Ex: Operacional"
                  className="bg-background h-11"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Benefícios */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <CheckCircle2 className="h-4 w-4" />
              <span>Benefícios Incluídos</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {benefitOptions.map(benefit => (
                <Button
                  key={benefit}
                  type="button"
                  variant={form.benefits.includes(benefit) ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleBenefitToggle(benefit)}
                  className={`justify-start h-10 transition-all ${
                    form.benefits.includes(benefit) 
                      ? 'border-primary' 
                      : 'hover:border-primary/50 text-muted-foreground'
                  }`}
                >
                  <div className={`mr-2 h-4 w-4 rounded-full border flex items-center justify-center ${
                     form.benefits.includes(benefit) ? 'border-primary-foreground bg-primary-foreground text-primary' : 'border-muted-foreground'
                  }`}>
                    {form.benefits.includes(benefit) && <CheckCircle2 className="h-3 w-3" />}
                  </div>
                  <span className="truncate">{benefit}</span>
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Observações Adicionais</Label>
            <Textarea 
              value={form.observations} 
              onChange={(e) => setForm(prev => ({ ...prev, observations: e.target.value }))}
              placeholder="Cláusulas extras ou observações sobre o contrato..."
              rows={3}
              className="resize-none bg-background"
            />
          </div>

          <Separator />

          {/* Ações */}
          <div className="flex flex-col-reverse sm:flex-row gap-4 justify-end pt-2">
            <Button 
              onClick={handlePreviewContract} 
              variant="outline" 
              className="flex items-center gap-2 w-full sm:w-auto h-11"
              disabled={loading || loadingData || !funcionario || !empresa}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Gerando Preview...
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4" />
                  Visualizar Contrato
                </>
              )}
            </Button>
            <Button 
              onClick={handleGenerateContract} 
              className="flex items-center gap-2 w-full sm:w-auto h-11 shadow-md hover:shadow-lg transition-all" 
              disabled={loading || loadingData || !funcionario || !empresa}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Gerando PDF...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Gerar e Baixar
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ContratosTrabalhoForm;