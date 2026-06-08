import React, { useState, useEffect } from 'react';
import api from '@/lib/axios';
import { refreshEmployeeDocuments } from '@/utils/refreshEmployeeDocuments';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { FileText, Download, Eye, User, Calendar, MapPin, CheckCircle2, Loader2, Building, Info, Video } from 'lucide-react';
import { formatCPF, formatCNPJ } from '@/utils/validation';
import { Company } from '@/types/company';
import { EmployeeCombobox } from '../ui/employee-combobox';
import { SimpleEmployee, employeeService } from '@/services/employeeService';
import { companyService } from '@/services/companyService';
import { employeeAdmissionIsoDateOrToday } from '@/utils/employeeAdmissionDate';
import { resolveCompanySigningCity } from '@/utils/resolveCompanySigningCity';

interface TermoBodyCamFormProps {
  employeeId?: string;
  companyId?: string;
}

const TermoBodyCamForm: React.FC<TermoBodyCamFormProps> = ({ employeeId, companyId }) => {
  const [form, setForm] = useState({
    funcionarioId: employeeId || '',
    empresaId: companyId || '',
    localTrabalho: '',
    cidadeEmissao: 'Contagem, MG',
    dataAdmissao: employeeAdmissionIsoDateOrToday(),
  });

  const [selectedEmployeeData, setSelectedEmployeeData] = useState<SimpleEmployee | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setForm(prev => ({
      ...prev,
      funcionarioId: employeeId || prev.funcionarioId,
      empresaId: companyId || prev.empresaId,
    }));
  }, [employeeId, companyId]);

  const loadEmployee = async (id: string) => {
    try {
      const emp = await employeeService.getEmployeeById(id);
      if (!emp) return;

      const workPostName =
        (emp as any).workPostName ||
        emp.workPost?.name ||
        (emp as any).unitName ||
        emp.unit?.name ||
        '';

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
        workPostName,
        companyId: emp.company?.id,
        address: emp.address,
      } as SimpleEmployee);

      setForm(prev => ({
        ...prev,
        empresaId: emp.company?.id || prev.empresaId,
        localTrabalho: workPostName || prev.localTrabalho,
        dataAdmissao: employeeAdmissionIsoDateOrToday(emp.hireDate),
      }));
    } catch (error) {
      console.error('Erro ao carregar dados do funcionário:', error);
    }
  };

  useEffect(() => {
    if (form.funcionarioId) {
      loadEmployee(form.funcionarioId);
    }
  }, [form.funcionarioId]);

  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true);
      try {
        const companiesData = await companyService.getAllCompanies();
        setCompanies(companiesData);
      } catch (error) {
        console.error('Erro ao buscar dados:', error);
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, []);

  const funcionario = selectedEmployeeData;
  const empresa = companies.find(e => e.id === form.empresaId);
  const isReady = Boolean(funcionario && empresa && form.localTrabalho);

  const formatDateToBrazilian = (dateString?: string) => {
    if (!dateString) return '';
    const parts = dateString.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const buildPayload = () => ({
    companyId: empresa!.id,
    employeeId: funcionario!.id,
    employeeName: funcionario!.name,
    workLocation: form.localTrabalho,
    city: form.cidadeEmissao || resolveCompanySigningCity(empresa as { city?: string; state?: string }),
    documentDate: form.dataAdmissao,
  });

  const handlePreview = async () => {
    if (!funcionario || !empresa || !form.localTrabalho) {
      alert('Selecione funcionário, empresa e informe o local de trabalho!');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/api/body-cam-responsibility/preview-pdf', buildPayload(), {
        responseType: 'blob',
      });
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
    if (!funcionario || !empresa || !form.localTrabalho) {
      alert('Selecione funcionário, empresa e informe o local de trabalho!');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/api/body-cam-responsibility/generate-pdf', buildPayload(), {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `termo-body-cam-${funcionario.name.replace(/\s+/g, '-').toLowerCase()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      void refreshEmployeeDocuments(funcionario.id);
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      alert('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="border-t-4 border-t-blue-500 shadow-md">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Video className="h-6 w-6 text-blue-500" />
                Termo de Responsabilidade e Uso de Câmera Corporal – Body Cam
              </CardTitle>
              <CardDescription>
                Diretrizes para o uso correto, contínuo e responsável das câmeras corporais (Body Cam).
              </CardDescription>
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
                  onChange={(value) => setForm(prev => ({ ...prev, funcionarioId: value }))}
                  onEmployeeSelect={(emp) => {
                    setSelectedEmployeeData(emp);
                    setForm(prev => ({
                      ...prev,
                      funcionarioId: emp.id,
                      empresaId: emp.companyId || prev.empresaId,
                      localTrabalho: emp.workPostName || prev.localTrabalho,
                      dataAdmissao: employeeAdmissionIsoDateOrToday(emp.hireDate),
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
                  onValueChange={(value) => setForm(prev => ({ ...prev, empresaId: value }))}
                  disabled={loadingData}
                >
                  <SelectTrigger className="h-11 rounded-lg bg-black text-white border border-border/60">
                    <SelectValue placeholder={loadingData ? 'Carregando...' : 'Selecione a empresa'} />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map(e => (
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
                  Dados do Funcionário
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase">Nome</Label>
                    <div className="p-2.5 bg-muted rounded-md text-sm font-medium">{funcionario.name}</div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase">Data de Admissão</Label>
                    <div className="p-2.5 bg-muted rounded-md text-sm font-medium">
                      {funcionario.hireDate ? formatDateToBrazilian(funcionario.hireDate) : '-'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 font-medium border-b pb-2">
                  <Building className="h-4 w-4 text-primary" />
                  Dados da Empresa
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase">Razão Social</Label>
                  <div className="p-2.5 bg-muted rounded-md text-sm font-medium">{empresa.name}</div>
                </div>
                {empresa.cnpj && (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase">CNPJ</Label>
                    <div className="p-2.5 bg-muted rounded-md text-sm font-medium">{formatCNPJ(empresa.cnpj)}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          <Separator />

          <div className="space-y-6">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>Detalhes do Documento</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>
                  Local de Trabalho <span className="text-seguranca-red">*</span>
                </Label>
                <Input
                  value={form.localTrabalho}
                  onChange={(e) => setForm(prev => ({ ...prev, localTrabalho: e.target.value }))}
                  placeholder="Ex: Via Shopping Barreiro"
                  className="bg-background h-11"
                />
                <p className="text-xs text-muted-foreground">
                  Pré-preenchido com o posto cadastrado do funcionário. Edite se necessário.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Cidade</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                  <Input
                    value={form.cidadeEmissao}
                    onChange={(e) => setForm(prev => ({ ...prev, cidadeEmissao: e.target.value }))}
                    placeholder="Ex: Contagem, MG"
                    className="bg-background h-11 pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Data (admissão do funcionário)</Label>
                <Input
                  type="date"
                  value={form.dataAdmissao}
                  readOnly
                  className="bg-muted h-11 cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground">
                  A data do termo é preenchida automaticamente com a data de admissão.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-4 p-4 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-lg">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300">Sobre este Documento</h4>
              <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
                Este termo estabelece as diretrizes para uso obrigatório da Body Cam durante o turno de trabalho,
                incluindo posicionamento, confidencialidade das gravações e responsabilidade pelo equipamento.
              </p>
            </div>
          </div>

          <Separator />

          <div className="flex flex-col-reverse sm:flex-row gap-4 justify-end pt-2">
            <Button
              type="button"
              onClick={handlePreview}
              variant="outline"
              className="flex items-center gap-2 w-full sm:w-auto h-11"
              disabled={loading || !isReady}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Gerando Preview...
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4" />
                  Visualizar Termo
                </>
              )}
            </Button>
            <Button
              type="button"
              onClick={handleGerarPDF}
              className="flex items-center gap-2 w-full sm:w-auto h-11 shadow-md hover:shadow-lg transition-all bg-blue-600 hover:bg-blue-700"
              disabled={loading || !isReady}
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

export default TermoBodyCamForm;
