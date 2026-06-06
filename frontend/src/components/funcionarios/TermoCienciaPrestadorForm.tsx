import React, { useState, useEffect } from 'react';
import api from '@/lib/axios';
import { refreshEmployeeDocuments } from '@/utils/refreshEmployeeDocuments';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { FileText, Download, Eye, User, Calendar, MapPin, Shield, CheckCircle2, Loader2, Building, Info } from 'lucide-react';
import { termoCienciaPrestadorGenerator } from '@/utils/termoCienciaPrestadorGenerator';
import { formatCPF, formatCNPJ } from '@/utils/validation';
import { Company } from '@/types/company';
import { EmployeeCombobox } from '../ui/employee-combobox';
import { SimpleEmployee, employeeService } from '@/services/employeeService';
import { companyService } from '@/services/companyService';
import { employeeAdmissionIsoDateOrToday } from '@/utils/employeeAdmissionDate';


interface TermoCienciaPrestadorFormProps {
  employeeId?: string;
  companyId?: string;
}

const TermoCienciaPrestadorForm: React.FC<TermoCienciaPrestadorFormProps> = ({ employeeId, companyId }) => {
  const [form, setForm] = useState({
    funcionarioId: employeeId || '',
    empresaId: companyId || '',
    cidadeEmissao: 'Contagem/MG',
    dataEmissao: employeeAdmissionIsoDateOrToday(),
    contractNumber: '',
    representativeName: '',
    observacoes: '',
  });

  const [selectedEmployeeData, setSelectedEmployeeData] = useState<SimpleEmployee | null>(null);
  const [companies, setCompanies] = useState<any[]>([]);

  const [loadingData, setLoadingData] = useState(false);
  const [loading, setLoading] = useState(false);

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
          }
        } catch (error) {
          console.error("Erro ao carregar dados iniciais do funcionário:", error);
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

  const handlePreview = async () => {
    if (!funcionario || !empresa) {
      alert('Selecione funcionário e empresa!');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        companyId: empresa.id,
        employeeId: funcionario.id,
        providerName: funcionario.name,
        providerCnpjCpf: funcionario.cpf || funcionario.document || '',
        representativeName: form.representativeName,
        serviceDescription: form.observacoes || 'Prestação de serviços diversos',
        contractNumber: form.contractNumber,
        city: form.cidadeEmissao,
        documentDate: form.dataEmissao
      };

      const response = await api.post('/api/service-provider-awareness/preview-pdf', payload, {
        responseType: 'blob'
      });
      const blob = response.data;
      const url = URL.createObjectURL(blob);
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
      const payload = {
        companyId: empresa.id,
        employeeId: funcionario.id,
        providerName: funcionario.name,
        providerCnpjCpf: funcionario.cpf || funcionario.document || '',
        representativeName: form.representativeName,
        serviceDescription: form.observacoes || 'Prestação de serviços diversos',
        contractNumber: form.contractNumber,
        city: form.cidadeEmissao,
        documentDate: form.dataEmissao
      };

      const response = await api.post('/api/service-provider-awareness/generate-pdf', payload, {
        responseType: 'blob'
      });

      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `termo-ciencia-${funcionario.name.replace(/\s+/g, '-').toLowerCase()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      alert('Termo de ciência gerado com sucesso!');
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
                <Shield className="h-6 w-6 text-blue-500" />
                Termo de Ciência do Prestador de Serviços
              </CardTitle>
              <CardDescription>
                Confirmação de ciência sobre diretrizes e políticas internas.
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
        <CardContent className="space-y-8">

          {/* Identificação */}
          <div className="bg-muted/30 p-6 rounded-xl border space-y-6">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
              <User className="h-4 w-4" />
              <span>Identificação</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-base font-semibold">
                  Prestador de Serviços
                  <span className="block text-[11px] font-normal text-muted-foreground/80">
                    Pessoa física responsável pela prestação de serviços.
                  </span>
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
                      dataEmissao: employeeAdmissionIsoDateOrToday(emp.hireDate),
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
                  {(funcionario.cpf || (funcionario as any).document) && (
                    <span className="text-[11px] text-muted-foreground">
                      · CPF: {formatCPF(funcionario.cpf || (funcionario as any).document || '')}
                    </span>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-base font-semibold">
                  Empresa
                  <span className="block text-[11px] font-normal text-muted-foreground/80">
                    Empresa contratante que registra a ciência.
                  </span>
                </Label>
                <Select
                  value={form.empresaId}
                  onValueChange={(value) => setForm(prev => ({ ...prev, empresaId: value }))}
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
            {/* Informações do Prestador */}
            {funcionario && (
              <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-2 font-medium">
                    <User className="h-4 w-4 text-primary" />
                    Dados do Prestador
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
                        {funcionario.cpf || (funcionario as any).document ? formatCPF(funcionario.cpf || (funcionario as any).document || '') : '-'}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider">Cargo</Label>
                      <div className="p-2.5 bg-muted rounded-md text-sm font-medium border border-transparent hover:border-border transition-colors truncate">
                        {(funcionario as any).position?.name || '-'}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider">Admissão</Label>
                      <div className="p-2.5 bg-muted rounded-md text-sm font-medium border border-transparent hover:border-border transition-colors">
                        {funcionario.hireDate ? formatDateToBrazilian(funcionario.hireDate) : '-'}
                      </div>
                    </div>
                  </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider">Endereço</Label>
                      <div className="p-2.5 bg-muted rounded-md text-sm font-medium border border-transparent hover:border-border transition-colors truncate">
                        {typeof (funcionario.address as any) === 'string'
                          ? (funcionario.address as any)
                          : (funcionario.address as any)?.street
                            ? `${(funcionario.address as any).street}, ${(funcionario.address as any).number || ''}`
                            : '-'}
                      </div>
                    </div>
                </div>
              </div>
            )}

            {/* Informações da Empresa */}
            {empresa && (
              <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300 delay-100">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-2 font-medium">
                    <Building className="h-4 w-4 text-primary" />
                    Dados da Empresa
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

          {/* Detalhes do Documento */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Detalhes da Emissão</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Cidade de Emissão</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                  <Input
                    value={form.cidadeEmissao}
                    onChange={(e) => setForm(prev => ({ ...prev, cidadeEmissao: e.target.value }))}
                    placeholder="Ex: Contagem/MG"
                    className="bg-background h-11 pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Data de Emissão</Label>
                <Input
                  type="date"
                  value={form.dataEmissao}
                  onChange={(e) => setForm(prev => ({ ...prev, dataEmissao: e.target.value }))}
                  className="bg-background h-11"
                />
              </div>

              <div className="space-y-2">
                <Label>Número do Contrato</Label>
                <Input
                  value={form.contractNumber}
                  onChange={(e) => setForm(prev => ({ ...prev, contractNumber: e.target.value }))}
                  placeholder="Ex: 123/2026"
                  className="bg-background h-11"
                />
              </div>

              <div className="space-y-2">
                <Label>Representante Legal (Opcional)</Label>
                <Input
                  value={form.representativeName}
                  onChange={(e) => setForm(prev => ({ ...prev, representativeName: e.target.value }))}
                  placeholder="Nome do representante"
                  className="bg-background h-11"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observações Adicionais</Label>
              <Textarea
                value={form.observacoes}
                onChange={(e) => setForm(prev => ({ ...prev, observacoes: e.target.value }))}
                placeholder="Observações adicionais sobre o termo de ciência..."
                rows={3}
                className="resize-none bg-background"
              />
            </div>
          </div>

          {/* Informações sobre o Documento */}
          <div className="flex gap-4 p-4 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-lg">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300">Sobre este Documento</h4>
              <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
                Este termo de ciência confirma que o prestador de serviços está ciente da Diretriz de Prevenção
                e Controle do Uso Indevido de Álcool e/ou de Outras Drogas, cuja finalidade é a preservação
                da saúde e segurança de todos os colaboradores e prestadores de serviços.
              </p>
            </div>
          </div>

          <Separator />

          {/* Ações */}
          <div className="flex flex-col-reverse sm:flex-row gap-4 justify-end pt-2">
            <Button
              type="button"
              onClick={handlePreview}
              variant="outline"
              className="flex items-center gap-2 w-full sm:w-auto h-11"
              disabled={loading || !funcionario || !empresa}
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
              className="flex items-center gap-2 w-full sm:w-auto h-11 shadow-md hover:shadow-lg transition-all"
              disabled={loading || !funcionario || !empresa}
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

export default TermoCienciaPrestadorForm;