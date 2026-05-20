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
import { FileText, Download, Eye, User, Building, Calendar, MapPin, CreditCard, Loader2, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';
import { employeeService, SimpleEmployee } from '@/services/employeeService';

import { companyService } from '@/services/companyService';
import { useToast } from '@/hooks/use-toast';
import { formatCPF, formatCNPJ } from '@/utils/validation';
import api from '@/lib/axios';
import { EmployeeCombobox } from '@/components/ui/employee-combobox';
import { CompanyCombobox } from '@/components/ui/company-combobox';

interface TermoValeTransporteFormProps {
  employeeId?: string;
  companyId?: string;
}

const TermoValeTransporteForm: React.FC<TermoValeTransporteFormProps> = ({ employeeId, companyId }) => {
  const { toast } = useToast();
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


  // Carregar dados iniciais do funcionário se vier apenas o ID via props
  useEffect(() => {
    if (form.funcionarioId && !selectedEmployeeData) {
      const fetchEmployee = async () => {
        try {
          const emp = await employeeService.getEmployeeById(form.funcionarioId);
          if (emp) {
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
              address: emp.address
            } as SimpleEmployee);
            
            // Auto-preencher data de início, posto de trabalho e empresa
            setForm(prev => ({
              ...prev,
              dataInicio: emp.hireDate || prev.dataInicio,
              employeeWorkSector: emp.workPostName || emp.unitName || emp.unit?.name || emp.workPost?.name || '',
              empresaId: emp.companyId || (emp.company as any)?.id || prev.empresaId
            }));
          }
        } catch (error) {
          console.error("Erro ao carregar dados iniciais do funcionário:", error);
        }
      };
      fetchEmployee();
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

  const handlePreview = async () => {
    if (!funcionario || !empresa) {
      toast({
        title: 'Atenção',
        description: 'Selecione funcionário e empresa para visualizar o termo!',
        variant: 'destructive'
      });
      return;
    }

    if (!form.tipoVale || !form.dataInicio) {
      toast({
        title: 'Atenção',
        description: 'Preencha todos os campos obrigatórios para visualizar o termo!',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);
      // Buscar dados completos do funcionário
      const fullEmployee = await employeeService.getEmployeeById(funcionario.id);
      if (!fullEmployee) {
        toast({
          title: 'Erro',
          description: 'Funcionário não encontrado!',
          variant: 'destructive'
        });
        return;
      }

      const addressValue = typeof fullEmployee.address === 'string'
        ? fullEmployee.address
        : (fullEmployee.address as any)?.street || '';

      const payload = {
        companyId: empresa.id,
        employeeName: fullEmployee.name,
        employeeCpf: fullEmployee.cpf || (fullEmployee as any).document || '',
        employeePosition: (fullEmployee as any).positionName || (fullEmployee as any).position?.name || '',
        hireDate: fullEmployee.hireDate || '',
        employeeAddress: addressValue,
        voucherType: form.tipoVale,
        voucherValue: form.valorVale,
        startDate: form.dataInicio,
        endDate: form.dataFim || null,
        city: empresa.city || '',
        documentDate: new Date().toISOString().split('T')[0],
        observations: form.observacoes || '',
        optingVoucher: form.optingVoucher === 'true',
        idaLinha: form.idaLinha,
        idaTarifa: form.idaTarifa,
        voltaLinha: form.voltaLinha,
        voltaTarifa: form.voltaTarifa,
        employeeUnit: (fullEmployee as any).unit?.name || '',
        employeeWorkSector: form.employeeWorkSector
      };


      // Gerar PDF para visualização
      const response = await api.post('/api/transport-voucher/preview-pdf', payload, {
        responseType: 'blob'
      });

      // Abrir PDF em nova aba para visualização
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');

      // Limpar URL após um tempo
      setTimeout(() => window.URL.revokeObjectURL(url), 100);

    } catch (err: any) {
      console.error('Erro ao gerar preview:', err);
      toast({
        title: 'Erro',
        description: err.response?.data?.message || 'Erro ao gerar preview do termo. Tente novamente.',
        variant: 'destructive'
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
        variant: 'destructive'
      });
      return;
    }

    if (!form.tipoVale || !form.dataInicio) {
      toast({
        title: 'Atenção',
        description: 'Preencha todos os campos obrigatórios!',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      // Buscar dados completos do funcionário
      const fullEmployee = await employeeService.getEmployeeById(funcionario.id);
      if (!fullEmployee) {
        throw new Error('Funcionário não encontrado');
      }

      // Preparar dados para o template
      const addressValue = typeof fullEmployee.address === 'string'
        ? fullEmployee.address
        : (fullEmployee.address as any)?.street || '';

      const payload = {
        companyId: empresa.id,
        employeeName: fullEmployee.name,
        employeeCpf: fullEmployee.cpf || (fullEmployee as any).document || '',
        employeePosition: (fullEmployee as any).positionName || (fullEmployee as any).position?.name || '',
        hireDate: fullEmployee.hireDate || '',
        employeeAddress: addressValue,
        voucherType: form.tipoVale,
        voucherValue: form.valorVale,
        startDate: form.dataInicio,
        endDate: form.dataFim || null,
        city: empresa.city || '',
        documentDate: new Date().toISOString().split('T')[0],
        observations: form.observacoes || '',
        optingVoucher: form.optingVoucher === 'true',
        idaLinha: form.idaLinha,
        idaTarifa: form.idaTarifa,
        voltaLinha: form.voltaLinha,
        voltaTarifa: form.voltaTarifa,
        employeeUnit: (fullEmployee as any).unit?.name || '',
        employeeWorkSector: form.employeeWorkSector
      };

      // Gerar PDF
      const response = await api.post('/api/transport-voucher/generate-pdf', payload, {
        responseType: 'blob'
      });

      // Fazer download do PDF
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `termo-vale-transporte-${fullEmployee.name.replace(/\s+/g, '-').toLowerCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Sucesso',
        description: 'Termo de Vale-Transporte gerado com sucesso!',
      });

    } catch (err: any) {
      console.error('Erro ao gerar PDF:', err);
      toast({
        title: 'Erro',
        description: err.response?.data?.message || 'Erro ao gerar PDF. Tente novamente.',
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
                <CreditCard className="h-6 w-6 text-primary" />
                Termo de Compromisso de Vale-Transporte
              </CardTitle>
              <CardDescription>
                Preencha os dados abaixo para gerar o termo de compromisso.
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
                    setSelectedEmployeeData({
                      id: emp.id,
                      name: emp.name,
                      cpf: emp.cpf,
                      hireDate: emp.hireDate,
                      positionName: emp.positionName
                    } as any);
                    
                    // Auto-preencher data de início, posto de trabalho e empresa
                    setForm(prev => ({ 
                      ...prev, 
                      dataInicio: emp.hireDate || prev.dataInicio,
                      employeeWorkSector: emp.workPostName || emp.unitName || emp.unit?.name || emp.workPost?.name || '',
                      empresaId: emp.companyId || prev.empresaId
                    }));
                  }}
                  value={form.funcionarioId}
                  onChange={(id) => {
                    setForm(prev => ({ ...prev, funcionarioId: id }));
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
                {empresa && (
                  <div className="space-y-1 md:col-span-2 lg:col-span-4">
                    <p className="text-xs text-muted-foreground uppercase font-semibold">Endereço da Empresa</p>
                    <p className="text-sm font-medium">{empresa.address || 'Endereço não cadastrado'}</p>
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

            {/* Ações */}
            <div className="flex flex-col sm:flex-row gap-4 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={handlePreview}
                disabled={loading || !funcionario || !empresa}
                className="flex-1 sm:flex-none gap-2"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                Visualizar Termo
              </Button>
              <Button
                type="button"
                onClick={() => handleGerarPDF()}
                disabled={loading || !funcionario || !empresa}
                className="flex-1 sm:flex-none gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Gerar e Baixar Termo (PDF)
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TermoValeTransporteForm;