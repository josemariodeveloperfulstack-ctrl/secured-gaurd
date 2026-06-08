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
import {
  formatEmployeeAddressForLgpdVig,
  isVigilanciaCompany,
} from '@/utils/formatEmployeeAddress';
import { employeeAdmissionIsoDateOrToday } from '@/utils/employeeAdmissionDate';
import { resolveCompanySigningCity } from '@/utils/resolveCompanySigningCity';

type LgpdTermVariant = 'VIGILANCIA' | 'DEFAULT' | 'auto';

interface TermoLGPDFormProps {
  employeeId?: string;
  companyId?: string;
  /** VIGILANCIA = modelo Promover Vigilância; DEFAULT = consentimento para outros cargos; auto = detecta pela empresa */
  termVariant?: LgpdTermVariant;
}

const TermoLGPDForm: React.FC<TermoLGPDFormProps> = ({
  employeeId,
  companyId,
  termVariant = 'auto',
}) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    funcionarioId: employeeId || '',
    empresaId: companyId || '',
    consentTypes: [] as string[],
    dataUsage: '',
    dataRetention: '',
    additionalInfo: '',
    consentDate: employeeAdmissionIsoDateOrToday(),
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

  const loadEmployee = async (id: string) => {
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

      setFormData(prev => ({
        ...prev,
        funcionarioId: emp.id,
        empresaId: companyId || emp.company?.id || prev.empresaId,
        consentDate: employeeAdmissionIsoDateOrToday(emp.hireDate),
      }));
    } catch (error) {
      console.error('Erro ao carregar dados do funcionário:', error);
    }
  };

  useEffect(() => {
    if (formData.funcionarioId) {
      loadEmployee(formData.funcionarioId);
    }
  }, [formData.funcionarioId]);

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
  const isVigilanciaTerm =
    termVariant === 'VIGILANCIA'
      ? true
      : termVariant === 'DEFAULT'
        ? false
        : isVigilanciaCompany(empresa);
  const resolvedTermVariant = isVigilanciaTerm ? 'VIGILANCIA' : 'DEFAULT';
  const employeeFullAddress = funcionario
    ? formatEmployeeAddressForLgpdVig(funcionario)
    : '';

  const buildPayload = () => {
    const address = funcionario?.address;
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

    return {
      companyId: empresa!.id,
      employeeId: funcionario!.id,
      employeeName: funcionario!.name,
      employeeCpf: funcionario!.cpf || (funcionario as any).document || '',
      employeeRg: funcionario!.rg || '',
      employeePosition: (funcionario as any).positionName || (funcionario as any).position?.name || '',
      employeeAddress,
      employeeNumber,
      employeeComplement,
      employeeNeighborhood,
      employeeCity,
      employeeState,
      employeeCep,
      employeeFullAddress: isVigilanciaTerm ? employeeFullAddress : undefined,
      termVariant: resolvedTermVariant,
      consentTypes: formData.consentTypes.map(id => consentOptions.find(opt => opt.id === id)?.label || id),
      dataUsagePurpose: formData.dataUsage,
      retentionPeriod: formData.dataRetention,
      additionalInformation: formData.additionalInfo,
      consentDate: formData.consentDate,
      city: resolveCompanySigningCity(empresa as { city?: string; address?: string }) || 'Contagem',
    };
  };

  const isReadyToGenerate = Boolean(
    funcionario &&
    empresa &&
    (isVigilanciaTerm || formData.consentTypes.length > 0)
  );

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
    if (!isReadyToGenerate) {
      toast({
        title: "Erro",
        description: isVigilanciaTerm
          ? "Selecione funcionário e empresa para gerar o termo."
          : "Preencha todos os campos obrigatórios e selecione pelo menos um tipo de consentimento.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const payload = buildPayload();

      const response = await api.post('/api/lgpd-consent/generate-pdf', payload, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const slug = funcionario.name.replace(/\s+/g, '-').toLowerCase();
      a.download = isVigilanciaTerm
        ? `termo-protecao-dados-lgpd-vig-${slug}.pdf`
        : `termo-consentimento-lgpd-${slug}.pdf`;
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
      const payload = buildPayload();

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
                {isVigilanciaTerm ? 'Termo de Proteção de Dados – LGPD (VIG)' : 'Termo de Consentimento LGPD'}
              </CardTitle>
              <CardDescription>
                {isVigilanciaTerm
                  ? 'Termo de confidencialidade e proteção de dados da Promover Vigilância Patrimonial, conforme modelo oficial.'
                  : 'Geração de termo de consentimento para tratamento de dados pessoais (Lei Geral de Proteção de Dados).'}
              </CardDescription>
            </div>
            {isReadyToGenerate && (
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
                  initialDisplayName={funcionario?.name}
                  onChange={(value) => setFormData(prev => ({ ...prev, funcionarioId: value }))}
                  onEmployeeSelect={(emp) => {
                    setSelectedEmployeeData(emp);
                    setFormData(prev => ({
                      ...prev,
                      funcionarioId: emp.id,
                      empresaId: emp.companyId || prev.empresaId,
                      consentDate: employeeAdmissionIsoDateOrToday(emp.hireDate),
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
                  {isVigilanciaTerm && (
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider">Endereço (termo VIG)</Label>
                      <div className="p-2.5 bg-muted rounded-md text-sm font-medium border border-transparent hover:border-border transition-colors">
                        {employeeFullAddress || 'Endereço não cadastrado — complete o cadastro do funcionário.'}
                      </div>
                    </div>
                  )}
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

          {isVigilanciaTerm ? (
            <div className="space-y-4 rounded-xl border bg-muted/20 p-6">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Shield className="h-4 w-4" />
                <span>Modelo Vigilância (VIG)</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                O PDF seguirá o modelo oficial com cláusulas de confidencialidade (objeto, informações confidenciais,
                uso, exceções, quebra e vigência de 5 anos), sem necessidade de marcar tipos de consentimento.
              </p>
              <div className="space-y-2 max-w-xs">
                <Label>Data do Termo (admissão do funcionário)</Label>
                <Input
                  type="date"
                  value={formData.consentDate}
                  readOnly
                  className="bg-muted h-11 cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground">
                  A data do termo é preenchida automaticamente com a data de admissão.
                </p>
              </div>
            </div>
          ) : (
            <>
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
            </>
          )}

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
              disabled={loading || !isReadyToGenerate}
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