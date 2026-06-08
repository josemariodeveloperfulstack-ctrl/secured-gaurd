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
import { FileText, Download, Eye, User, Calendar, MapPin, CheckCircle2, Loader2, Building, Info } from 'lucide-react';
import { formatCPF, formatCNPJ } from '@/utils/validation';
import { Company } from '@/types/company';
import { EmployeeCombobox } from '../ui/employee-combobox';
import { SimpleEmployee, employeeService } from '@/services/employeeService';
import { companyService } from '@/services/companyService';
import { employeeAdmissionIsoDateOrToday } from '@/utils/employeeAdmissionDate';

interface TermoResponsabilidadeDanosMultasFormProps {
  employeeId?: string;
  companyId?: string;
}

const TermoResponsabilidadeDanosMultasForm: React.FC<TermoResponsabilidadeDanosMultasFormProps> = ({
  employeeId,
  companyId,
}) => {
  const [form, setForm] = useState({
    funcionarioId: employeeId || '',
    empresaId: companyId || '',
    cidadeEmissao: 'Contagem',
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
              companyId: emp.company?.id,
              address: emp.address,
            } as SimpleEmployee);
            setForm(prev => ({
              ...prev,
              empresaId: emp.company?.id || prev.empresaId,
              dataAdmissao: employeeAdmissionIsoDateOrToday(emp.hireDate),
            }));
          }
        } catch (error) {
          console.error('Erro ao carregar dados iniciais do funcionário:', error);
        }
      };
      fetchEmployee();
    }
  }, [form.funcionarioId, selectedEmployeeData]);

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
  const isReady = Boolean(funcionario && empresa);

  const formatDateToBrazilian = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const parts = dateString.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR');
    } catch {
      return dateString;
    }
  };

  const buildPayload = () => ({
    companyId: empresa!.id,
    employeeId: funcionario!.id,
    employeeName: funcionario!.name,
    employeeCpf: funcionario!.cpf || (funcionario as any).document || '',
    city: form.cidadeEmissao,
    documentDate: form.dataAdmissao,
  });

  const handlePreview = async () => {
    if (!funcionario || !empresa) {
      alert('Selecione funcionário e empresa!');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/api/damage-fines-responsibility/preview-pdf', buildPayload(), {
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
    if (!funcionario || !empresa) {
      alert('Selecione funcionário e empresa!');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/api/damage-fines-responsibility/generate-pdf', buildPayload(), {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `termo-danos-multas-${funcionario.name.replace(/\s+/g, '-').toLowerCase()}.pdf`;
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
      <Card className="border-t-4 border-t-seguranca-red shadow-md">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-2xl">
                <FileText className="h-6 w-6 text-seguranca-red" />
                Termo de Responsabilidade por Danos e Multas
              </CardTitle>
              <CardDescription>
                Termo de responsabilidade pelo uso de veículos da empresa, com desconto de danos e multas conforme CLT.
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
                    <Label className="text-xs text-muted-foreground uppercase">CPF</Label>
                    <div className="p-2.5 bg-muted rounded-md text-sm font-medium">
                      {funcionario.cpf || (funcionario as any).document
                        ? formatCPF(funcionario.cpf || (funcionario as any).document || '')
                        : '-'}
                    </div>
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
              <Calendar className="h-4 w-4" />
              <span>Data do Documento</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Cidade</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                  <Input
                    value={form.cidadeEmissao}
                    onChange={(e) => setForm(prev => ({ ...prev, cidadeEmissao: e.target.value }))}
                    placeholder="Ex: Contagem"
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
                  A data do termo é preenchida automaticamente com a data de admissão do funcionário.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-4 p-4 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-lg">
            <Info className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-amber-800 dark:text-amber-300">Sobre este Documento</h4>
              <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                Este termo formaliza a responsabilidade do funcionário pelo uso de veículos da empresa,
                incluindo a possibilidade de desconto salarial por danos materiais ou multas de trânsito,
                conforme o artigo 462 da CLT.
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
              className="flex items-center gap-2 w-full sm:w-auto h-11 shadow-md hover:shadow-lg transition-all bg-seguranca-red hover:bg-seguranca-red/90"
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

export default TermoResponsabilidadeDanosMultasForm;
