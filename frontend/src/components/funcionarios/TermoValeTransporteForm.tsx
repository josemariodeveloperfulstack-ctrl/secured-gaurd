import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Textarea } from '../ui/textarea';
import { Separator } from '../ui/separator';
import { Badge } from '../ui/badge';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { FileText, Download, Eye, User, Building, Calendar, Loader2, CheckCircle2, ArrowRight, ArrowLeft, PenLine } from 'lucide-react';
import { employeeService, SimpleEmployee } from '@/services/employeeService';

import { companyService } from '@/services/companyService';
import { useToast } from '@/hooks/use-toast';
import { formatCPF, formatCNPJ } from '@/utils/validation';
import api from '@/lib/axios';
import { EmployeeCombobox } from '@/components/ui/employee-combobox';
import { CompanyCombobox } from '@/components/ui/company-combobox';
import { useInvalidateDocumentosGerados } from '@/hooks/queries/useDocumentosGerados';

interface TermoValeTransporteFormProps {
  employeeId?: string;
  companyId?: string;
}

type EmployeeAddressSource = {
  address?: string | {
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  enderecoRua?: string;
  enderecoNumero?: string;
  enderecoComplemento?: string;
  enderecoBairro?: string;
  enderecoCidade?: string;
  enderecoEstado?: string;
  enderecoCep?: string;
};

function formatEmployeeAddress(emp: EmployeeAddressSource): string {
  if (typeof emp.address === 'string' && emp.address.trim()) {
    return emp.address.trim();
  }

  const addr = typeof emp.address === 'object' && emp.address ? emp.address : undefined;
  const parts: string[] = [];

  const streetLine = [addr?.street ?? emp.enderecoRua, addr?.number ?? emp.enderecoNumero]
    .filter(Boolean)
    .join(', ');
  if (streetLine) parts.push(streetLine);

  const complement = addr?.complement ?? emp.enderecoComplemento;
  if (complement) parts.push(complement);

  const neighborhood = addr?.neighborhood ?? emp.enderecoBairro;
  if (neighborhood) parts.push(neighborhood);

  const cityState = [addr?.city ?? emp.enderecoCidade, addr?.state ?? emp.enderecoEstado]
    .filter(Boolean)
    .join('/');
  if (cityState) parts.push(cityState);

  const zip = addr?.zipCode ?? emp.enderecoCep;
  if (zip) parts.push(`CEP ${zip}`);

  return parts.join(' - ');
}

const TermoValeTransporteForm: React.FC<TermoValeTransporteFormProps> = ({ employeeId, companyId }) => {
  const { toast } = useToast();
  const invalidateDocumentosGerados = useInvalidateDocumentosGerados();
  const [form, setForm] = useState({
    funcionarioId: employeeId || '',
    empresaId: companyId || '',
    valorVale: '',
    tipoVale: 'Vale Transporte',
    dataInicio: '',
    dataFim: '',
    observacoes: '',
    optingVoucher: 'true', // 'true' for SIM, 'false' for NÃO
    idaLinha: '',
    idaTarifa: '',
    voltaLinha: '',
    voltaTarifa: '',
    employeeWorkSector: '',
  });

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [selectedEmployeeData, setSelectedEmployeeData] = useState<SimpleEmployee | null>(null);
  const [companies, setCompanies] = useState<any[]>([]);

  const funcionario = selectedEmployeeData;
  const empresa = companies.find(e => e.id === form.empresaId);


  // Sincronizar props com state
  useEffect(() => {
    setForm(prev => ({
      ...prev,
      funcionarioId: employeeId || prev.funcionarioId,
      empresaId: companyId || prev.empresaId
    }));
  }, [employeeId, companyId]);


  const loadEmployeeDetails = async (id: string) => {
    try {
      const emp = await employeeService.getEmployeeById(id);
      if (!emp) return;

      setSelectedEmployeeData({
        id: emp.id,
        name: emp.name,
        document: emp.document || emp.cpf,
        cpf: emp.cpf || emp.document,
        email: emp.email,
        phone: emp.phone,
        registrationNumber: emp.registrationNumber,
        hireDate: emp.hireDate,
        positionName: emp.position?.name,
        unitName: emp.unit?.name,
        address: emp.address,
        enderecoRua: (emp as EmployeeAddressSource).enderecoRua,
        enderecoNumero: (emp as EmployeeAddressSource).enderecoNumero,
        enderecoComplemento: (emp as EmployeeAddressSource).enderecoComplemento,
        enderecoBairro: (emp as EmployeeAddressSource).enderecoBairro,
        enderecoCidade: (emp as EmployeeAddressSource).enderecoCidade,
        enderecoEstado: (emp as EmployeeAddressSource).enderecoEstado,
        enderecoCep: (emp as EmployeeAddressSource).enderecoCep,
      } as SimpleEmployee);

      setForm(prev => ({
        ...prev,
        dataInicio: emp.hireDate || prev.dataInicio,
        employeeWorkSector: emp.workPostName || emp.unitName || emp.unit?.name || emp.workPost?.name || '',
        empresaId: emp.companyId || (emp.company as { id?: string })?.id || prev.empresaId,
      }));
    } catch (error) {
      console.error('Erro ao carregar dados do funcionário:', error);
    }
  };

  useEffect(() => {
    if (form.funcionarioId) {
      loadEmployeeDetails(form.funcionarioId);
    }
  }, [form.funcionarioId]);


  // Carregar dados do backend (empresas)
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoadingData(true);
    try {
      const companiesData = await companyService.getAllCompanies();
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

  const tiposVale = [
    'Vale Transporte',
    'Vale Combustível',
    'Auxílio Transporte',
    'Reembolso de Passagem',
  ];

  const buildCompletePayload = async () => {
    if (!funcionario || !empresa) {
      throw new Error('MISSING_SELECTION');
    }
    if (!form.tipoVale || !form.dataInicio) {
      throw new Error('MISSING_FIELDS');
    }

    const fullEmployee = await employeeService.getEmployeeById(funcionario.id);
    if (!fullEmployee) {
      throw new Error('EMPLOYEE_NOT_FOUND');
    }

    const admissionDate = fullEmployee.hireDate || form.dataInicio || '';
    const addressValue = formatEmployeeAddress(fullEmployee as EmployeeAddressSource);

    return {
      companyId: empresa.id,
      employeeId: fullEmployee.id,
      employeeName: fullEmployee.name,
      employeeCpf: fullEmployee.cpf || (fullEmployee as { document?: string }).document || '',
      employeePosition: (fullEmployee as { positionName?: string; position?: { name?: string } }).positionName
        || (fullEmployee as { position?: { name?: string } }).position?.name
        || '',
      hireDate: admissionDate,
      employeeAddress: addressValue,
      voucherType: form.tipoVale,
      voucherValue: form.valorVale,
      startDate: form.dataInicio,
      endDate: form.dataFim || null,
      city: empresa.city || '',
      documentDate: admissionDate || undefined,
      observations: form.observacoes || '',
      optingVoucher: form.optingVoucher === 'true',
      idaLinha: form.idaLinha,
      idaTarifa: form.idaTarifa,
      voltaLinha: form.voltaLinha,
      voltaTarifa: form.voltaTarifa,
      employeeUnit: (fullEmployee as { unit?: { name?: string } }).unit?.name || '',
      employeeWorkSector: form.employeeWorkSector,
      manualFill: false,
    };
  };

  const buildManualPayload = () => {
    if (!empresa) {
      throw new Error('MISSING_COMPANY');
    }
    return {
      companyId: empresa.id,
      employeeId: form.funcionarioId || undefined,
      manualFill: true,
    };
  };

  const handlePreview = async () => {
    if (!funcionario || !empresa) {
      toast({
        title: 'Atenção',
        description: 'Selecione funcionário e empresa para visualizar o termo!',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      const payload = await buildCompletePayload();
      const response = await api.post('/api/transport-voucher/preview-pdf', payload, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => window.URL.revokeObjectURL(url), 100);
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'MISSING_FIELDS') {
        toast({
          title: 'Atenção',
          description: 'Preencha todos os campos obrigatórios para visualizar o termo!',
          variant: 'destructive',
        });
        return;
      }
      console.error('Erro ao gerar preview:', err);
      toast({
        title: 'Erro',
        description: 'Erro ao gerar preview do termo. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGerarPDF = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!funcionario || !empresa) {
      toast({
        title: 'Atenção',
        description: 'Selecione funcionário e empresa!',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const payload = await buildCompletePayload();
      const response = await api.post('/api/transport-voucher/generate-pdf', payload, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `termo-vale-transporte-${payload.employeeName.replace(/\s+/g, '-').toLowerCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      invalidateDocumentosGerados(form.funcionarioId);

      toast({
        title: 'Sucesso',
        description: 'Termo completo gerado com sucesso!',
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'MISSING_FIELDS') {
        toast({
          title: 'Atenção',
          description: 'Preencha todos os campos obrigatórios!',
          variant: 'destructive',
        });
        return;
      }
      console.error('Erro ao gerar PDF:', err);
      toast({
        title: 'Erro',
        description: 'Erro ao gerar PDF. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGerarManual = async () => {
    if (!empresa) {
      toast({
        title: 'Atenção',
        description: 'Selecione a empresa para gerar o termo em branco (cabeçalho da empresa).',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const payload = buildManualPayload();
      const response = await api.post('/api/transport-voucher/generate-pdf', payload, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'termo-vale-transporte-manual.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      if (form.funcionarioId) {
        invalidateDocumentosGerados(form.funcionarioId);
      }

      toast({
        title: 'Sucesso',
        description: 'Termo em branco gerado para preenchimento manual!',
      });
    } catch (err: unknown) {
      console.error('Erro ao gerar PDF manual:', err);
      toast({
        title: 'Erro',
        description: 'Erro ao gerar PDF manual. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewManual = async () => {
    if (!empresa) {
      toast({
        title: 'Atenção',
        description: 'Selecione a empresa para visualizar o modelo em branco.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const payload = buildManualPayload();
      const response = await api.post('/api/transport-voucher/preview-pdf', payload, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => window.URL.revokeObjectURL(url), 100);
    } catch (err: unknown) {
      console.error('Erro ao visualizar PDF manual:', err);
      toast({
        title: 'Erro',
        description: 'Erro ao visualizar o termo manual.',
        variant: 'destructive',
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
                Termo de Compromisso de Vale-Transporte
              </CardTitle>
              <CardDescription>
                Gere o termo completo com os dados do formulário ou a versão em branco para preenchimento manual.
              </CardDescription>
            </div>
            {(funcionario && empresa) && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1 px-3 py-1">
                <CheckCircle2 className="h-3 w-3" />
                Pronto para gerar
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <div className="space-y-6">
            {/* Seleção de Funcionário e Empresa */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="funcionarioId" className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  Funcionário <span className="text-destructive">*</span>
                </Label>
                <EmployeeCombobox
                  onEmployeeSelect={(emp) => {
                    setForm(prev => ({
                      ...prev,
                      funcionarioId: emp.id,
                      dataInicio: emp.hireDate || prev.dataInicio,
                      employeeWorkSector: emp.workPostName || emp.unitName || emp.unit?.name || emp.workPost?.name || '',
                      empresaId: emp.companyId || prev.empresaId,
                    }));
                    loadEmployeeDetails(emp.id);
                  }}
                  value={form.funcionarioId}
                  onChange={(id) => {
                    setForm(prev => ({ ...prev, funcionarioId: id }));
                    if (!id) {
                      setSelectedEmployeeData(null);
                    }
                  }}
                  initialDisplayName={funcionario?.name}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="empresaId" className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  Empresa <span className="text-destructive">*</span>
                </Label>
                <CompanyCombobox
                  value={form.empresaId}
                  onChange={(id) => setForm(prev => ({ ...prev, empresaId: id }))}
                  companies={companies}
                />
              </div>
            </div>

            {/* Dados do Funcionário Selecionado */}
            {funcionario && (
              <div className="bg-muted/50 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 border border-dashed">
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">CPF</p>
                  <p className="text-sm font-medium">{formatCPF(funcionario.cpf || funcionario.document || '')}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">Cargo</p>
                  <p className="text-sm font-medium">{funcionario.positionName || 'Não informado'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">Data de Admissão</p>
                  <p className="text-sm font-medium">{funcionario.hireDate ? new Date(funcionario.hireDate).toLocaleDateString('pt-BR') : 'Não informada'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">Posto de Trabalho</p>
                  <Input 
                    className="h-7 text-sm font-medium bg-transparent border-none p-0 focus-visible:ring-0"
                    value={form.employeeWorkSector}
                    onChange={(e) => setForm(prev => ({ ...prev, employeeWorkSector: e.target.value }))}
                    placeholder="Clique para editar"
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">Endereço do Funcionário</p>
                  <p className="text-sm font-medium">
                    {funcionario
                      ? formatEmployeeAddress(selectedEmployeeData as EmployeeAddressSource) || 'Não cadastrado'
                      : 'Selecione um funcionário'}
                  </p>
                </div>
                {empresa && (
                  <div className="space-y-1 md:col-span-2">
                    <p className="text-xs text-muted-foreground uppercase font-semibold">Empresa (no termo)</p>
                    <p className="text-sm font-medium">{empresa.name}</p>
                  </div>
                )}
              </div>
            )}

            <Separator />

            {/* Opção pelo Benefício */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">Opção pelo Benefício</Label>
              <RadioGroup 
                value={form.optingVoucher} 
                onValueChange={(val) => setForm(prev => ({ ...prev, optingVoucher: val }))}
                className="flex flex-col sm:flex-row gap-4"
              >
                <div className="flex items-center space-x-2 bg-background border rounded-md p-3 flex-1 cursor-pointer hover:border-primary transition-colors">
                  <RadioGroupItem value="true" id="opt-sim" />
                  <Label htmlFor="opt-sim" className="flex-1 cursor-pointer font-medium">SIM, desejo receber o Vale-Transporte</Label>
                </div>
                <div className="flex items-center space-x-2 bg-background border rounded-md p-3 flex-1 cursor-pointer hover:border-primary transition-colors">
                  <RadioGroupItem value="false" id="opt-nao" />
                  <Label htmlFor="opt-nao" className="flex-1 cursor-pointer font-medium">NÃO, não desejo receber o benefício</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Detalhes do Transporte - Visível apenas se for optante */}
            {form.optingVoucher === 'true' && (
              <div className="space-y-6 animate-in slide-in-from-top-2 duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Card Trajeto de IDA */}
                  <div className="relative overflow-hidden space-y-4 p-5 border rounded-xl bg-gradient-to-br from-blue-50/50 to-white dark:from-blue-950/10 dark:to-background shadow-sm hover:shadow-md transition-all duration-300 border-blue-100 dark:border-blue-900/40 group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
                      <ArrowRight className="h-12 w-12 text-blue-600" />
                    </div>
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-sm tracking-tight uppercase">
                      <div className="p-1.5 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                        <ArrowRight className="h-4 w-4" />
                      </div>
                      Trajeto de IDA
                    </div>
                    <p className="text-[10px] text-muted-foreground -mt-3 ml-9">Residência → Trabalho</p>

                    <div className="grid grid-cols-1 gap-4 pt-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="idaLinha" className="text-xs font-bold ml-1 text-blue-900 dark:text-blue-300">Linha / Empresa</Label>
                        <Input
                          id="idaLinha"
                          placeholder="Ex: 123 Centro / Viação X"
                          className="bg-background/80 border-blue-200/50 dark:border-blue-800/40 focus-visible:ring-blue-500 transition-all"
                          value={form.idaLinha}
                          onChange={(e) => setForm(prev => ({ ...prev, idaLinha: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="idaTarifa" className="text-xs font-bold ml-1 text-blue-900 dark:text-blue-300">Tarifa Unitária</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">R$</span>
                          <Input
                            id="idaTarifa"
                            type="text"
                            placeholder="0,00"
                            className="pl-9 bg-background/80 border-blue-200/50 dark:border-blue-800/40 focus-visible:ring-blue-500"
                            value={form.idaTarifa}
                            onChange={(e) => setForm(prev => ({ ...prev, idaTarifa: e.target.value }))}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Trajeto de VOLTA */}
                  <div className="relative overflow-hidden space-y-4 p-5 border rounded-xl bg-gradient-to-br from-green-50/50 to-white dark:from-green-950/10 dark:to-background shadow-sm hover:shadow-md transition-all duration-300 border-green-100 dark:border-green-900/40 group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
                      <ArrowLeft className="h-12 w-12 text-green-600" />
                    </div>

                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-bold text-sm tracking-tight uppercase">
                      <div className="p-1.5 bg-green-100 dark:bg-green-900/50 rounded-lg">
                        <ArrowLeft className="h-4 w-4" />
                      </div>
                      Trajeto de VOLTA
                    </div>
                    <p className="text-[10px] text-muted-foreground -mt-3 ml-9">Trabalho → Residência</p>

                    <div className="grid grid-cols-1 gap-4 pt-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="voltaLinha" className="text-xs font-bold ml-1 text-green-900 dark:text-green-300">Linha / Empresa</Label>
                        <Input
                          id="voltaLinha"
                          placeholder="Ex: 123 Centro / Viação X"
                          className="bg-background/80 border-green-200/50 dark:border-green-800/40 focus-visible:ring-green-500 transition-all"
                          value={form.voltaLinha}
                          onChange={(e) => setForm(prev => ({ ...prev, voltaLinha: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="voltaTarifa" className="text-xs font-bold ml-1 text-green-900 dark:text-green-300">Tarifa Unitária</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">R$</span>
                          <Input
                            id="voltaTarifa"
                            type="text"
                            placeholder="0,00"
                            className="pl-9 bg-background/80 border-green-200/50 dark:border-green-800/40 focus-visible:ring-green-500"
                            value={form.voltaTarifa}
                            onChange={(e) => setForm(prev => ({ ...prev, voltaTarifa: e.target.value }))}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="tipoVale">Tipo do Benefício</Label>
                    <Select
                      value={form.tipoVale}
                      onValueChange={(val) => setForm(prev => ({ ...prev, tipoVale: val }))}
                    >
                      <SelectTrigger id="tipoVale">
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {tiposVale.map((tipo) => (
                          <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="valorVale">Valor Total Diário (Opcional)</Label>
                    <Input
                      id="valorVale"
                      type="text"
                      placeholder="Ex: 11,00"
                      value={form.valorVale}
                      onChange={(e) => setForm(prev => ({ ...prev, valorVale: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="dataInicio" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  Data de Início do Benefício <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="dataInicio"
                  type="date"
                  value={form.dataInicio}
                  onChange={(e) => setForm(prev => ({ ...prev, dataInicio: e.target.value }))}
                />
                <p className="text-[10px] text-muted-foreground">Preenchido automaticamente com a data de admissão.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dataFim" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  Data de Fim (Opcional)
                </Label>
                <Input
                  id="dataFim"
                  type="date"
                  value={form.dataFim}
                  onChange={(e) => setForm(prev => ({ ...prev, dataFim: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações Adicionais</Label>
              <Textarea
                id="observacoes"
                placeholder="Alguma observação específica para este termo..."
                value={form.observacoes}
                onChange={(e) => setForm(prev => ({ ...prev, observacoes: e.target.value }))}
                className="resize-none h-20"
              />
            </div>

            <Separator />

            <div className="space-y-3 rounded-lg border p-4 bg-muted/30">
              <div>
                <p className="text-sm font-semibold">Termo completo (dados do sistema)</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Preenche automaticamente nome do funcionário, empresa, endereço residencial e data de assinatura
                  (data de admissão).
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePreview}
                  disabled={loading || !funcionario || !empresa}
                  className="flex-1 sm:flex-none gap-2"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                  Visualizar completo
                </Button>
                <Button
                  type="button"
                  onClick={() => handleGerarPDF()}
                  disabled={loading || !funcionario || !empresa}
                  className="flex-1 sm:flex-none gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  Baixar termo completo (PDF)
                </Button>
              </div>
            </div>

            <div className="space-y-3 rounded-lg border border-dashed border-amber-500/40 p-4 bg-amber-500/5">
              <div>
                <p className="text-sm font-semibold flex items-center gap-2">
                  <PenLine className="h-4 w-4 text-amber-600" />
                  Termo para preenchimento manual
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Gera o PDF no mesmo layout oficial, com campos em branco: ( ) SIM / ( ) NÃO, nome do
                  funcionário, empresa, endereço, linhas/tarifas de ida e volta, data e assinatura.
                  Basta selecionar a empresa (cabeçalho). Funcionário é opcional.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePreviewManual}
                  disabled={loading || !empresa}
                  className="flex-1 sm:flex-none gap-2 border-amber-500/30"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                  Visualizar em branco
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleGerarManual}
                  disabled={loading || !empresa}
                  className="flex-1 sm:flex-none gap-2"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenLine className="h-4 w-4" />}
                  Baixar PDF manual
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TermoValeTransporteForm;