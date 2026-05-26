import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { useToast } from '../../hooks/use-toast';
import { Download, Eye, User, Building, FileCheck, CheckCircle2, Loader2, Shield } from 'lucide-react';
import { employeeService, SimpleEmployee } from '@/services/employeeService';
import { companyService } from '@/services/companyService';
import { EmployeeCombobox } from '../ui/employee-combobox';


import { Employee } from '@/types/employee';
import { Company } from '@/types/company';
import api from '@/lib/axios';
import { refreshEmployeeDocuments } from '@/utils/refreshEmployeeDocuments';
import { formatCNPJ, formatCPF } from '@/utils/validation';

interface TermoLGPDFormProps {
  employeeId?: string;
  companyId?: string;
}

const TermoLGPDForm: React.FC<TermoLGPDFormProps> = ({ employeeId, companyId }) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    funcionarioId: employeeId || '',
    empresaId: companyId || '',
    consentTypes: [] as string[],
    dataUsage: '',
    dataRetention: '',
    additionalInfo: '',
    consentDate: new Date().toISOString().split('T')[0],
  });

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [selectedEmployeeData, setSelectedEmployeeData] = useState<SimpleEmployee | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);


  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      funcionarioId: employeeId || prev.funcionarioId,
      empresaId: companyId || prev.empresaId
    }));
  }, [employeeId, companyId]);

  // Carregar dados iniciais do funcionário se vier apenas o ID via props
  useEffect(() => {
    if (formData.funcionarioId && !selectedEmployeeData) {
      const fetchEmployee = async () => {
        try {
          const emp = await employeeService.getEmployeeById(formData.funcionarioId);
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
              rg: emp.rg,
              positionName: emp.position?.name,
              unitName: emp.unit?.name,
              departmentName: emp.department?.name,
              workPostId: (emp as any).workPostId || emp.workPost?.id,
              workPostName: (emp as any).workPostName || emp.workPost?.name,
              companyId: emp.company?.id,
              companySigla: emp.company?.sigla,
              address: emp.address,
              salario: emp.salario,
              escalaTrabalho: emp.escalaTrabalho,
              horarioTrabalho: emp.horarioTrabalho,
            } as SimpleEmployee);
          }
        } catch (error) {
          console.error("Erro ao carregar dados iniciais do funcionário:", error);
        }
      };
      fetchEmployee();
    }
  }, [formData.funcionarioId, selectedEmployeeData]);

  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true);
      try {
        const companiesData = await companyService.getAllCompanies();
        setCompanies(companiesData);
      } catch (error) {
        console.error('Erro ao buscar dados:', error);
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar os dados.',
          variant: 'destructive',
        });
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, []);

  const funcionario = selectedEmployeeData;
  const empresa = companies.find(e => e.id === formData.empresaId);


  const consentOptions = [
    { id: 'data_processing', label: 'Processamento de Dados Pessoais' },
    { id: 'data_sharing', label: 'Compartilhamento de Dados' },
    { id: 'marketing', label: 'Marketing e Comunicações' },
    { id: 'third_party', label: 'Transferência para Terceiros' },
    { id: 'automated_processing', label: 'Processamento Automatizado' },
  ];

  const handleConsentChange = (consentId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      consentTypes: checked
        ? [...prev.consentTypes, consentId]
        : prev.consentTypes.filter(id => id !== consentId)
    }));
  };

  const handleGenerateDocument = async () => {
    if (!funcionario || !empresa || formData.consentTypes.length === 0) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios e selecione pelo menos um tipo de consentimento.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const address = funcionario.address;
      let employeeAddress = '';
      let employeeNumber = '';
      let employeeComplement = '';
      let employeeNeighborhood = '';
      let employeeCity = '';
      let employeeState = '';
      let employeeCep = '';

      if (typeof address === 'object' && address !== null) {
        employeeAddress = (address as any).street || '';
        employeeNumber = (address as any).number || '';
        employeeComplement = (address as any).complement || '';
        employeeNeighborhood = (address as any).neighborhood || '';
        employeeCity = (address as any).city || '';
        employeeState = (address as any).state || '';
        employeeCep = (address as any).zipCode || '';
      } else {
        employeeAddress = String(address || '');
      }


      const payload = {
        companyId: empresa.id,
        employeeId: funcionario.id,
        employeeName: funcionario.name,
        employeeCpf: funcionario.cpf || (funcionario as any).document || '',
        employeeRg: funcionario.rg || '',
        employeePosition: (funcionario as any).positionName || (funcionario as any).position?.name || '',
        employeeAddress: employeeAddress,
        employeeNumber: employeeNumber,
        employeeComplement: employeeComplement,
        employeeNeighborhood: employeeNeighborhood,
        employeeCity: employeeCity,
        employeeState: employeeState,
        employeeCep: employeeCep,

        consentTypes: formData.consentTypes.map(id => consentOptions.find(opt => opt.id === id)?.label || id),
        dataUsagePurpose: formData.dataUsage,
        retentionPeriod: formData.dataRetention,
        additionalInformation: formData.additionalInfo,
        consentDate: formData.consentDate,
        city: empresa.city || '',
      };

      const response = await api.post('/api/lgpd-consent/generate-pdf', payload, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `termo-lgpd-${funcionario.name.replace(/\s+/g, '-').toLowerCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Sucesso",
        description: "Termo LGPD gerado com sucesso!",
      });
      void refreshEmployeeDocuments(funcionario.id);

    } catch (error) {
      console.error('Erro ao gerar documento:', error);
      toast({
        title: "Erro",
        description: "Erro ao gerar o documento. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async () => {
    if (!funcionario || !empresa) {
      toast({
        title: 'Atenção',
        description: 'Selecione funcionário e empresa para visualizar o termo!',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const address = funcionario.address;
      let employeeAddress = '';
      let employeeNumber = '';
      let employeeComplement = '';
      let employeeNeighborhood = '';
      let employeeCity = '';
      let employeeState = '';
      let employeeCep = '';

      if (typeof address === 'object' && address !== null) {
        employeeAddress = (address as any).street || '';
        employeeNumber = (address as any).number || '';
        employeeComplement = (address as any).complement || '';
        employeeNeighborhood = (address as any).neighborhood || '';
        employeeCity = (address as any).city || '';
        employeeState = (address as any).state || '';
        employeeCep = (address as any).zipCode || '';
      } else {
        employeeAddress = String(address || '');
      }

      const payload = {
        companyId: empresa.id,
        employeeId: funcionario.id,
        employeeName: funcionario.name,
        employeeCpf: funcionario.cpf || (funcionario as any).document || '',
        employeeRg: funcionario.rg || '',
        employeePosition: (funcionario as any).positionName || (funcionario as any).position?.name || '',
        employeeAddress: employeeAddress,
        employeeNumber: employeeNumber,
        employeeComplement: employeeComplement,
        employeeNeighborhood: employeeNeighborhood,
        employeeCity: employeeCity,
        employeeState: employeeState,
        employeeCep: employeeCep,

        consentTypes: formData.consentTypes.map(id => consentOptions.find(opt => opt.id === id)?.label || id),
        dataUsagePurpose: formData.dataUsage,
        retentionPeriod: formData.dataRetention,
        additionalInformation: formData.additionalInfo,
        consentDate: formData.consentDate,
        city: empresa.city || '',
      };

      const response = await api.post('/api/lgpd-consent/preview-pdf', payload, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');

      setTimeout(() => window.URL.revokeObjectURL(url), 100);

    } catch (error) {
      console.error('Erro ao gerar preview:', error);
      toast({
        title: "Erro",
        description: "Erro ao gerar preview. Tente novamente.",
        variant: "destructive"
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
                <FileCheck className="h-6 w-6 text-primary" />
                Termo de Consentimento LGPD
              </CardTitle>
              <CardDescription>
                Geração de termo de consentimento para tratamento de dados pessoais (Lei Geral de Proteção de Dados).
              </CardDescription>
            </div>
            {(funcionario && empresa && formData.consentTypes.length > 0) && (
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
                <Label className="text-base font-semibold">
                  Funcionário (Titular dos Dados)
                  <span className="block text-[11px] font-normal text-muted-foreground/80">
                    Selecione o titular dos dados pessoais.
                  </span>
                </Label>
                <EmployeeCombobox
                  value={formData.funcionarioId}
                  onChange={(value) => setFormData(prev => ({ ...prev, funcionarioId: value }))}
                  onEmployeeSelect={(emp) => {
                    setSelectedEmployeeData(emp);
                    setFormData(prev => ({
                      ...prev,
                      funcionarioId: emp.id,
                      empresaId: emp.companyId || prev.empresaId
                    }));
                  }}
                />
              </div>

              {funcionario && (
                <div className="mt-1.5 flex flex-wrap items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 border border-border/60 md:col-span-1">
                  <User className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-semibold text-foreground">
                    {funcionario.name}
                  </span>
                  {(funcionario.cpf || funcionario.document) && (
                    <span className="text-[11px] text-muted-foreground">
                      · CPF: {formatCPF(funcionario.cpf || funcionario.document || '')}
                    </span>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-base font-semibold">
                  Empresa (Controladora)
                  <span className="block text-[11px] font-normal text-muted-foreground/80">
                    Escolha a empresa controladora dos dados.
                  </span>
                </Label>
                <Select
                  value={formData.empresaId}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, empresaId: value }))}
                  disabled={loadingData}
                >
                  <SelectTrigger className="h-11 rounded-lg bg-black text-white border border-border/60 shadow-sm hover:bg-black/90 focus:ring-2 focus:ring-primary/30 focus:border-primary/60 [&>span]:text-left [&>span]:truncate">
                    <SelectValue placeholder={loadingData ? "Carregando..." : "Selecione a empresa"} />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg shadow-lg border bg-popover">
                    {loadingData ? (
                      <div className="p-2 text-center text-sm text-gray-500">Carregando empresas...</div>
                    ) : companies.length > 0 ? (
                      companies.map(e => (
                        <SelectItem key={e.id} value={e.id} className="py-2.5 cursor-pointer rounded-md">
                          {e.sigla ? `${e.sigla} - ${e.name}` : e.name}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-2 text-center text-sm text-gray-500">Nenhuma empresa encontrada</div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {empresa && (
                <div className="mt-1.5 flex flex-wrap items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 border border-border/60 md:col-span-1">
                  <Building className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-semibold text-foreground">
                    {empresa.sigla || empresa.tradeName || empresa.name}
                  </span>
                  {empresa.name && (
                    <span className="text-[11px] text-muted-foreground">
                      · Razão Social: {empresa.name}
                    </span>
                  )}
                  {empresa.cnpj && (
                    <span className="text-[11px] text-muted-foreground">
                      · CNPJ: {formatCNPJ(empresa.cnpj)}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Detalhes do Funcionário */}
            {funcionario && (
              <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-2 font-medium">
                    <User className="h-4 w-4 text-primary" />
                    Dados do Titular
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
                        {(funcionario as any).document || '-'}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider">Cargo</Label>
                      <div className="p-2.5 bg-muted rounded-md text-sm font-medium border border-transparent hover:border-border transition-colors truncate">
                        {funcionario.positionName || (funcionario as any).position?.name || '-'}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider">Admissão</Label>
                      <div className="p-2.5 bg-muted rounded-md text-sm font-medium border border-transparent hover:border-border transition-colors">
                        {funcionario.hireDate ? new Date(funcionario.hireDate).toLocaleDateString('pt-BR') : '-'}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Posto de Trabalho / Setor</Label>
                    <div className="p-2.5 bg-muted rounded-md text-sm font-medium border border-transparent hover:border-border transition-colors truncate">
                      {funcionario.unitName || (funcionario as any).workPostName || (funcionario as any).unit?.name || (funcionario as any).workPost?.name || '-'}
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
                    Dados da Controladora
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
                        {empresa.cnpj ? formatCNPJ(empresa.cnpj) : '-'}
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

          {/* Tipos de Consentimento */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Shield className="h-4 w-4" />
              <span>Escopo do Consentimento</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {consentOptions.map((option) => (
                <div key={option.id} className={`flex items-start space-x-3 p-4 rounded-lg border transition-all ${formData.consentTypes.includes(option.id)
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
                  }`}>
                  <Checkbox
                    id={option.id}
                    checked={formData.consentTypes.includes(option.id)}
                    onCheckedChange={(checked) => handleConsentChange(option.id, checked as boolean)}
                    className="mt-1"
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label
                      htmlFor={option.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {option.label}
                    </Label>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Configurações Adicionais */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Finalidade do Uso dos Dados</Label>
              <Textarea
                value={formData.dataUsage}
                onChange={(e) => setFormData(prev => ({ ...prev, dataUsage: e.target.value }))}
                className="bg-background resize-none"
                placeholder="Descreva a finalidade específica..."
                rows={4}
              />
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Prazo de Retenção</Label>
                <Select
                  value={formData.dataRetention}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, dataRetention: value }))}
                >
                  <SelectTrigger className="bg-background h-11">
                    <SelectValue placeholder="Selecione o prazo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1_ano">1 ano</SelectItem>
                    <SelectItem value="2_anos">2 anos</SelectItem>
                    <SelectItem value="3_anos">3 anos</SelectItem>
                    <SelectItem value="5_anos">5 anos</SelectItem>
                    <SelectItem value="10_anos">10 anos</SelectItem>
                    <SelectItem value="indefinido">Indefinido (até rescisão)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Data do Consentimento</Label>
                <Input
                  type="date"
                  value={formData.consentDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, consentDate: e.target.value }))}
                  className="bg-background h-11"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Informações Adicionais</Label>
            <Textarea
              value={formData.additionalInfo}
              onChange={(e) => setFormData(prev => ({ ...prev, additionalInfo: e.target.value }))}
              className="bg-background resize-none"
              placeholder="Outras observações relevantes..."
              rows={3}
            />
          </div>

          <Separator />

          {/* Ações */}
          <div className="flex flex-col-reverse sm:flex-row gap-4 justify-end pt-2">
            <Button
              onClick={handlePreview}
              variant="outline"
              className="flex items-center gap-2 w-full sm:w-auto h-11"
              disabled={loading || !funcionario || !empresa}
            >
              <Eye className="h-4 w-4" />
              Visualizar
            </Button>
            <Button
              onClick={handleGenerateDocument}
              className="flex items-center gap-2 w-full sm:w-auto h-11 shadow-md hover:shadow-lg transition-all"
              disabled={loading || !funcionario || !empresa || formData.consentTypes.length === 0}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Gerando...
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

export default TermoLGPDForm;