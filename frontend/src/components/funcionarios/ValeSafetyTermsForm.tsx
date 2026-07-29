import React, { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import {
  Building,
  Calendar,
  CheckCircle2,
  Download,
  Eye,
  FileCheck,
  Loader2,
  MapPin,
  Shield,
  User,
} from 'lucide-react';
import { employeeService, SimpleEmployee } from '@/services/employeeService';
import { companyService } from '@/services/companyService';
import { Company } from '@/types/company';
import { EmployeeCombobox } from '../ui/employee-combobox';
import api from '@/lib/axios';
import { refreshEmployeeDocuments } from '@/utils/refreshEmployeeDocuments';
import { formatCNPJ, formatCPF } from '@/utils/validation';
import { employeeAdmissionIsoDateOrToday } from '@/utils/employeeAdmissionDate';
import { resolveCompanySigningCity } from '@/utils/resolveCompanySigningCity';
import { isVigilanciaCompany } from '@/utils/formatEmployeeAddress';

export type ValeSafetyDocKind = 'golden-rules' | 'toxicological';

interface ValeSafetyTermsFormProps {
  employeeId?: string;
  companyId?: string;
  documentKind: ValeSafetyDocKind;
}

const DOC_META: Record<
  ValeSafetyDocKind,
  { title: string; description: string; previewPath: string; generatePath: string; filePrefix: string }
> = {
  'golden-rules': {
    title: 'Regras de Ouro da Vale',
    description: 'Termo de ciência e compromisso com as 10 Regras de Ouro (funcionários VIG).',
    previewPath: '/api/vale-safety-terms/golden-rules/preview-pdf',
    generatePath: '/api/vale-safety-terms/golden-rules/generate-pdf',
    filePrefix: 'regras-ouro-vale',
  },
  toxicological: {
    title: 'Autorização para teste toxicológico',
    description: 'Termo de Conhecimento com nome, RG, empresa e data preenchidos automaticamente.',
    previewPath: '/api/vale-safety-terms/toxicological/preview-pdf',
    generatePath: '/api/vale-safety-terms/toxicological/generate-pdf',
    filePrefix: 'autorizacao-toxicologico',
  },
};

const ValeSafetyTermsForm: React.FC<ValeSafetyTermsFormProps> = ({
  employeeId,
  companyId,
  documentKind,
}) => {
  const meta = DOC_META[documentKind];
  const [form, setForm] = useState({
    funcionarioId: employeeId || '',
    empresaId: companyId || '',
    cidadeEmissao: 'Contagem',
    local: 'Contagem',
    dataEmissao: employeeAdmissionIsoDateOrToday(),
  });
  const [selectedEmployeeData, setSelectedEmployeeData] = useState<SimpleEmployee | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      funcionarioId: employeeId || prev.funcionarioId,
      empresaId: companyId || prev.empresaId,
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
        rg: emp.rg,
        email: emp.email,
        phone: emp.phone,
        registrationNumber: emp.registrationNumber,
        hireDate: emp.hireDate,
        positionName: emp.position?.name,
        companyId: emp.company?.id,
        companySigla: emp.company?.sigla,
        address: emp.address,
      } as SimpleEmployee);

      setForm((prev) => ({
        ...prev,
        funcionarioId: emp.id,
        empresaId: companyId || emp.company?.id || prev.empresaId,
        dataEmissao: employeeAdmissionIsoDateOrToday(emp.hireDate),
      }));
    } catch (error) {
      console.error('Erro ao carregar funcionário:', error);
    }
  };

  useEffect(() => {
    if (form.funcionarioId) {
      void loadEmployee(form.funcionarioId);
    }
  }, [form.funcionarioId]);

  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true);
      try {
        const companiesData = await companyService.getAllCompanies();
        setCompanies(companiesData);
      } catch (error) {
        console.error('Erro ao buscar empresas:', error);
      } finally {
        setLoadingData(false);
      }
    };
    void fetchData();
  }, []);

  const funcionario = selectedEmployeeData;
  const empresa = companies.find((e) => e.id === form.empresaId);

  useEffect(() => {
    if (!empresa) return;
    const city = resolveCompanySigningCity(empresa) || 'Contagem';
    setForm((prev) => ({
      ...prev,
      cidadeEmissao: city,
      local: prev.local || city,
    }));
  }, [empresa?.id]);

  const buildPayload = () => ({
    companyId: empresa!.id,
    employeeId: funcionario!.id,
    employeeName: funcionario!.name,
    employeeRg: funcionario!.rg || '',
    employeeCpf: funcionario!.cpf || (funcionario as any).document || '',
    registrationNumber: funcionario!.registrationNumber || '',
    companyName: empresa!.name,
    city: form.cidadeEmissao || resolveCompanySigningCity(empresa) || 'Contagem',
    location: form.local || form.cidadeEmissao || 'Contagem',
    documentDate: form.dataEmissao,
  });

  const isReady = Boolean(funcionario && empresa);

  const handlePreview = async () => {
    if (!isReady) {
      alert('Selecione funcionário e empresa!');
      return;
    }
    setLoading(true);
    try {
      const response = await api.post(meta.previewPath, buildPayload(), { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (err) {
      console.error('Erro ao gerar preview:', err);
      alert('Erro ao gerar preview. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleGerarPDF = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isReady) {
      alert('Selecione funcionário e empresa!');
      return;
    }
    setLoading(true);
    try {
      const response = await api.post(meta.generatePath, buildPayload(), { responseType: 'blob' });
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${meta.filePrefix}-${funcionario!.name.replace(/\s+/g, '-').toLowerCase()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      void refreshEmployeeDocuments(funcionario!.id);
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      alert('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const formatDateBr = (dateString?: string) => {
    if (!dateString) return '-';
    const parts = dateString.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateString;
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="border-t-4 border-t-emerald-600 shadow-md">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-2xl">
                {documentKind === 'golden-rules' ? (
                  <Shield className="h-6 w-6 text-emerald-600" />
                ) : (
                  <FileCheck className="h-6 w-6 text-emerald-600" />
                )}
                {meta.title}
              </CardTitle>
              <CardDescription>{meta.description}</CardDescription>
            </div>
            {isReady && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1 px-3 py-1">
                <CheckCircle2 className="h-3 w-3" />
                Pronto para gerar
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          {!isVigilanciaCompany(empresa) && empresa && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              Este documento é destinado a funcionários da empresa VIG. A empresa selecionada não parece ser de Vigilância.
            </div>
          )}

          <div className="bg-muted/30 p-6 rounded-xl border space-y-6">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
              <User className="h-4 w-4" />
              <span>Identificação</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-base font-semibold">
                  Funcionário <span className="text-seguranca-red">*</span>
                </Label>
                <EmployeeCombobox
                  value={form.funcionarioId}
                  onChange={(value) => setForm((prev) => ({ ...prev, funcionarioId: value }))}
                  onEmployeeSelect={(emp) => {
                    setSelectedEmployeeData(emp);
                    setForm((prev) => ({
                      ...prev,
                      funcionarioId: emp.id,
                      empresaId: emp.companyId || prev.empresaId,
                      dataEmissao: employeeAdmissionIsoDateOrToday(emp.hireDate),
                    }));
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-base font-semibold">
                  Empresa <span className="text-seguranca-red">*</span>
                </Label>
                <Select
                  value={form.empresaId}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, empresaId: value }))}
                  disabled={loadingData}
                >
                  <SelectTrigger className="h-11 rounded-lg bg-black text-white border border-border/60">
                    <SelectValue placeholder={loadingData ? 'Carregando...' : 'Selecione a empresa'} />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.sigla ? `${e.sigla} - ${e.name}` : e.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {funcionario && empresa && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 font-medium border-b pb-2">
                  <User className="h-4 w-4 text-primary" />
                  Dados preenchidos automaticamente
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase">Nome</Label>
                    <div className="p-2.5 bg-muted rounded-md text-sm font-medium">{funcionario.name}</div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase">RG</Label>
                    <div className="p-2.5 bg-muted rounded-md text-sm font-medium">
                      {funcionario.rg || '-'}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase">CPF</Label>
                    <div className="p-2.5 bg-muted rounded-md text-sm font-medium">
                      {funcionario.cpf || (funcionario as any).document
                        ? formatCPF(funcionario.cpf || (funcionario as any).document || '')
                        : '-'}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase">Matrícula</Label>
                    <div className="p-2.5 bg-muted rounded-md text-sm font-medium">
                      {funcionario.registrationNumber || '-'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 font-medium border-b pb-2">
                  <Building className="h-4 w-4 text-primary" />
                  Empresa
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase">Razão Social</Label>
                  <div className="p-2.5 bg-muted rounded-md text-sm font-medium">{empresa.name}</div>
                </div>
                {empresa.cnpj && (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase">CNPJ</Label>
                    <div className="p-2.5 bg-muted rounded-md text-sm font-medium">
                      {formatCNPJ(empresa.cnpj)}
                    </div>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase">Data (admissão)</Label>
                  <div className="p-2.5 bg-muted rounded-md text-sm font-medium">
                    {formatDateBr(form.dataEmissao)}
                  </div>
                </div>
              </div>
            </div>
          )}

          <Separator />

          <div className="space-y-6">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Local e data do termo</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label>Cidade</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                  <Input
                    value={form.cidadeEmissao}
                    onChange={(e) => setForm((prev) => ({ ...prev, cidadeEmissao: e.target.value }))}
                    className="bg-background h-11 pl-10"
                  />
                </div>
              </div>
              {documentKind === 'golden-rules' && (
                <div className="space-y-2">
                  <Label>Local</Label>
                  <Input
                    value={form.local}
                    onChange={(e) => setForm((prev) => ({ ...prev, local: e.target.value }))}
                    className="bg-background h-11"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label>Data</Label>
                <Input
                  type="date"
                  value={form.dataEmissao}
                  onChange={(e) => setForm((prev) => ({ ...prev, dataEmissao: e.target.value }))}
                  className="bg-background h-11"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button type="button" variant="outline" onClick={handlePreview} disabled={!isReady || loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Eye className="h-4 w-4 mr-2" />}
              Visualizar
            </Button>
            <Button
              type="button"
              onClick={handleGerarPDF}
              disabled={!isReady || loading}
              className="bg-seguranca-red hover:bg-seguranca-red/90"
            >
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              Gerar PDF
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ValeSafetyTermsForm;
