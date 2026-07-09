import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { FileText, Download, Eye, User, Building, Calendar, MapPin, Phone, Mail, IdCard, FileSignature, Loader2, CheckCircle2 } from 'lucide-react';
import { employeeService, SimpleEmployee } from '@/services/employeeService';
import { companyService } from '@/services/companyService';
import { EmployeeCombobox } from '../ui/employee-combobox';
import { useToast } from '@/hooks/use-toast';

import api from '@/lib/axios';
import { StandardReportTemplate } from '../reporting/StandardReportTemplate';
import { formatCNPJ } from '@/utils/validation';
import { reportLayoutService } from '@/services/reportLayoutService';
import { formatDate as formatSystemDate } from '@/utils/formatters';

interface FichaRegistroFuncionarioFormProps {
  employeeId?: string;
  companyId?: string;
}

const FichaRegistroFuncionarioForm: React.FC<FichaRegistroFuncionarioFormProps> = ({ employeeId, companyId }) => {
  const { toast } = useToast();

  // 1. All State and Ref declarations first
  const [form, setForm] = useState({
    funcionarioId: employeeId || '',
    empresaId: companyId || '',
    dataRegistro: '',
    responsavelRegistroId: '', // ID do funcionário responsável
    observacoes: '',
    documentosEntregues: [] as string[],
  });

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [loadingEmployee, setLoadingEmployee] = useState(false);
  const [selectedEmployeeData, setSelectedEmployeeData] = useState<SimpleEmployee | null>(null);
  const [selectedResponsibleData, setSelectedResponsibleData] = useState<SimpleEmployee | null>(null);
  const [companies, setCompanies] = useState<any[]>([]);
  const [fullEmployee, setFullEmployee] = useState<any | null>(null);


  // 2. Memoized values
  const funcionario = selectedEmployeeData;
  const empresa = companies.find(e => e.id === form.empresaId);
  const responsavel = selectedResponsibleData;


  // 3. Helper functions
  const loadFullEmployee = async (employeeId: string) => {
    setLoadingEmployee(true);
    try {
      const employee = await employeeService.getEmployeeById(employeeId);
      setFullEmployee(employee);
    } catch (error) {
      console.error('Erro ao carregar dados do funcionário:', error);
      setFullEmployee(null);
    } finally {
      setLoadingEmployee(false);
    }
  };

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

  const formatDateToBR = (isoDate: string | null | undefined): string => {
    if (!isoDate) return '';
    try {
      return formatSystemDate(isoDate);
    } catch {
      return isoDate;
    }
  };

  // 4. All Effects
  
  // Atualizar funcionarioId e empresaId quando props mudarem
  useEffect(() => {
    setForm(prev => ({
      ...prev,
      funcionarioId: employeeId || prev.funcionarioId,
      empresaId: companyId || prev.empresaId
    }));
  }, [employeeId, companyId]);

  // Carregar dados completos do funcionário quando selecionado
  useEffect(() => {
    if (form.funcionarioId) {
      loadFullEmployee(form.funcionarioId);
    } else {
      setFullEmployee(null);
    }
  }, [form.funcionarioId]);

  // Carregar dados do backend (uma única vez ao montar)
  useEffect(() => {
    loadData();
  }, []);

  const documentosOptions = [
    'Carteira de Identidade (RG)',
    'CPF',
    'Carteira de Trabalho (CTPS)',
    'PIS/PASEP',
    'Título de Eleitor',
    'Certificado de Reservista',
    'Certidão de Nascimento',
    'Certidão de Casamento',
    'Comprovante de Residência',
    'Foto 3x4',
    'Exame Médico Admissional',
    'Exame Toxicológico',
    'Certificado de Treinamento',
    'Outros',
  ];

  const handleDocumentoToggle = (documento: string) => {
    setForm(prev => ({
      ...prev,
      documentosEntregues: prev.documentosEntregues.includes(documento)
        ? prev.documentosEntregues.filter(d => d !== documento)
        : [...prev.documentosEntregues, documento]
    }));
  };

  const handlePreview = async () => {
    if (!funcionario || !empresa) {
      toast({
        title: 'Atenção',
        description: 'Selecione funcionário e empresa para visualizar a ficha!',
        variant: 'destructive'
      });
      return;
    }

    if (!form.dataRegistro) {
      toast({
        title: 'Atenção',
        description: 'Preencha a data de registro para visualizar a ficha!',
        variant: 'destructive'
      });
      return;
    }

    if (!fullEmployee) {
      toast({
        title: 'Atenção',
        description: 'Aguarde o carregamento dos dados do funcionário!',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);

      // We will render the content to a temporary div or use a hidden one
      const printElement = document.getElementById('ficha-registro-printable');
      if (!printElement) {
        throw new Error('Elemento de impressão não encontrado');
      }

      await reportLayoutService.generatePremiumPDF(printElement, {
        title: 'Ficha de Registro do Funcionário',
        filename: `ficha-registro-${fullEmployee.name.replace(/\s+/g, '-').toLowerCase()}.pdf`,
        company: empresa,
        elementHasFullLayout: true
      });

      toast({
        title: 'Sucesso',
        description: 'Prévia gerada com sucesso!',
      });
    } catch (err: any) {
      console.error('Erro ao gerar preview:', err);
      toast({
        title: 'Erro',
        description: err.message || 'Erro ao gerar preview da ficha.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGerarPDF = async (e: React.FormEvent) => {
    e.preventDefault();
    handlePreview(); // reusing the same client-side logic
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="border-t-4 border-t-primary shadow-md">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-2xl">
                <FileSignature className="h-6 w-6 text-primary" />
                Ficha de Registro do Funcionário
              </CardTitle>
              <CardDescription>
                Emissão da ficha completa de registro do funcionário.
              </CardDescription>
            </div>
            {(funcionario && empresa && fullEmployee) && (
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
                <Label className="text-base font-semibold">Funcionário</Label>
                <EmployeeCombobox
                  value={form.funcionarioId}
                  onChange={(value) => setForm(prev => ({ ...prev, funcionarioId: value }))}
                  onEmployeeSelect={(emp) => {
                    setSelectedEmployeeData(emp);
                    setForm(prev => ({
                      ...prev,
                      funcionarioId: emp.id,
                      empresaId: emp.companyId || prev.empresaId
                    }));
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-base font-semibold">Empresa</Label>
                <Select
                  value={form.empresaId}
                  onValueChange={(value) => setForm(prev => ({ ...prev, empresaId: value }))}
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
            {/* Informações Pessoais do Funcionário */}
            {funcionario && (
              <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-2 font-medium">
                    <User className="h-4 w-4 text-primary" />
                    Informações Pessoais
                    {loadingEmployee && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                  </div>
                </div>

                {fullEmployee ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Nome Completo</Label>
                        <div className="p-2.5 bg-muted rounded-md text-sm font-medium border border-transparent hover:border-border transition-colors truncate">
                          {fullEmployee.name}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">CPF</Label>
                        <div className="p-2.5 bg-muted rounded-md text-sm font-medium border border-transparent hover:border-border transition-colors">
                          {fullEmployee.cpf || fullEmployee.document || '-'}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">RG</Label>
                        <div className="p-2.5 bg-muted rounded-md text-sm font-medium border border-transparent hover:border-border transition-colors">
                          {fullEmployee.rg || '-'}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Nascimento</Label>
                        <div className="p-2.5 bg-muted rounded-md text-sm font-medium border border-transparent hover:border-border transition-colors">
                          {formatDateToBR(fullEmployee.birthDate) || '-'}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Telefone</Label>
                        <div className="p-2.5 bg-muted rounded-md text-sm font-medium border border-transparent hover:border-border transition-colors">
                          {fullEmployee.phone || '-'}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">E-mail</Label>
                        <div className="p-2.5 bg-muted rounded-md text-sm font-medium border border-transparent hover:border-border transition-colors truncate">
                          {fullEmployee.email || '-'}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider">Endereço</Label>
                      <div className="p-2.5 bg-muted rounded-md text-sm font-medium border border-transparent hover:border-border transition-colors truncate">
                        {typeof fullEmployee.address === 'string' ? fullEmployee.address : fullEmployee.address?.street || '-'}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-sm text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                    {loadingEmployee ? 'Carregando dados...' : 'Aguardando seleção...'}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-6">
              {/* Informações Profissionais */}
              {funcionario && fullEmployee && (
                <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300 delay-75">
                  <div className="flex items-center justify-between border-b pb-2">
                    <div className="flex items-center gap-2 font-medium">
                      <Building className="h-4 w-4 text-primary" />
                      Dados Profissionais
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Cargo</Label>
                        <div className="p-2.5 bg-muted rounded-md text-sm font-medium border border-transparent hover:border-border transition-colors truncate">
                          {(fullEmployee as any).position?.name || '-'}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Admissão</Label>
                        <div className="p-2.5 bg-muted rounded-md text-sm font-medium border border-transparent hover:border-border transition-colors">
                          {formatDateToBR(fullEmployee.hireDate) || '-'}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">PIS/PASEP</Label>
                        <div className="p-2.5 bg-muted rounded-md text-sm font-medium border border-transparent hover:border-border transition-colors">
                          {fullEmployee.pis || '-'}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">CTPS</Label>
                        <div className="p-2.5 bg-muted rounded-md text-sm font-medium border border-transparent hover:border-border transition-colors">
                          {fullEmployee.ctps || '-'}
                        </div>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>

          {(funcionario || empresa) && <Separator />}

          {/* Dados do Registro */}
          <div className="bg-muted/30 p-6 rounded-xl border space-y-6">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
              <Calendar className="h-4 w-4" />
              <span>Dados do Registro</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-base font-semibold">Data do Registro</Label>
                <Input
                  type="date"
                  value={form.dataRegistro}
                  onChange={(e) => setForm(prev => ({ ...prev, dataRegistro: e.target.value }))}
                  className="bg-background h-11"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-base font-semibold">Responsável pelo Registro</Label>
                <EmployeeCombobox
                  value={form.responsavelRegistroId}
                  onChange={(value) => setForm(prev => ({ ...prev, responsavelRegistroId: value }))}
                  onEmployeeSelect={(emp) => setSelectedResponsibleData(emp)}
                />
              </div>
            </div>

            {/* Exibir dados do responsável quando selecionado */}
            {responsavel && (
              <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300 pt-2">
                <div className="flex items-center justify-between border-t pt-4">
                  <div className="flex items-center gap-2 font-medium text-sm">
                    <User className="h-4 w-4 text-primary" />
                    Dados do Responsável
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Nome Completo</Label>
                    <div className="p-2.5 bg-muted rounded-md text-sm font-medium border border-transparent hover:border-border transition-colors truncate">
                      {responsavel.name}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">CPF</Label>
                    <div className="p-2.5 bg-muted rounded-md text-sm font-medium border border-transparent hover:border-border transition-colors">
                      {responsavel.cpf || responsavel.document || '-'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Documentos Entregues */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
              <IdCard className="h-4 w-4" />
              <span>Checklist de Documentos Entregues</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {documentosOptions.map(documento => (
                <Button
                  key={documento}
                  type="button"
                  variant={form.documentosEntregues.includes(documento) ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleDocumentoToggle(documento)}
                  className={`justify-start h-10 transition-all ${form.documentosEntregues.includes(documento)
                    ? 'border-primary'
                    : 'hover:border-primary/50 text-muted-foreground'
                    }`}
                >
                  <div className={`mr-2 h-4 w-4 rounded-full border flex items-center justify-center ${form.documentosEntregues.includes(documento) ? 'border-primary-foreground bg-primary-foreground text-primary' : 'border-muted-foreground'
                    }`}>
                    {form.documentosEntregues.includes(documento) && <CheckCircle2 className="h-3 w-3" />}
                  </div>
                  <span className="truncate">{documento}</span>
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Observações Gerais</Label>
            <Textarea
              value={form.observacoes}
              onChange={(e) => setForm(prev => ({ ...prev, observacoes: e.target.value }))}
              placeholder="Observações adicionais sobre o registro do funcionário..."
              rows={3}
              className="resize-none bg-background"
            />
          </div>

          <Separator />

          {/* Ações */}
          <div className="flex flex-col-reverse sm:flex-row gap-4 justify-end pt-2">
            <Button
              type="button"
              onClick={handlePreview}
              variant="outline"
              className="flex items-center gap-2 w-full sm:w-auto h-11"
              disabled={loading || loadingData || !funcionario || !empresa || !fullEmployee || !form.dataRegistro}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Gerando Preview...
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4" />
                  Visualizar Ficha
                </>
              )}
            </Button>
            <Button
              type="button"
              onClick={handleGerarPDF}
              className="flex items-center gap-2 w-full sm:w-auto h-11 shadow-md hover:shadow-lg transition-all"
              disabled={loading || loadingData || !funcionario || !empresa || !fullEmployee}
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
      {/* Printable Area (Hidden) */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <div id="ficha-registro-printable">
          <StandardReportTemplate title="Ficha de Registro do Funcionário" company={empresa}>
            <div className="space-y-3 text-black">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <h3 className="font-bold border-b pb-1 text-sm uppercase">Dados Pessoais</h3>
                  <p className="text-sm"><strong>Nome:</strong> {fullEmployee?.name}</p>
                  <p className="text-sm"><strong>CPF:</strong> {fullEmployee?.cpf || fullEmployee?.document}</p>
                  <p className="text-sm"><strong>RG:</strong> {fullEmployee?.rg || '-'}</p>
                  <p className="text-sm"><strong>Data de Nascimento:</strong> {formatDateToBR(fullEmployee?.birthDate)}</p>
                  <p className="text-sm"><strong>Telefone:</strong> {fullEmployee?.phone || '-'}</p>
                  <p className="text-sm"><strong>E-mail:</strong> {fullEmployee?.email || '-'}</p>
                  <p className="text-sm"><strong>Endereço:</strong> {typeof fullEmployee?.address === 'string' ? fullEmployee?.address : fullEmployee?.address?.street || '-'}</p>
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold border-b pb-1 text-sm uppercase">Dados Profissionais</h3>
                  <p className="text-sm"><strong>Cargo:</strong> {(fullEmployee as any)?.position?.name || '-'}</p>
                  <p className="text-sm"><strong>Setor:</strong> {(fullEmployee as any)?.unit?.name || '-'}</p>
                  <p className="text-sm"><strong>Data de Admissão:</strong> {formatDateToBR(fullEmployee?.hireDate)}</p>
                  <p className="text-sm"><strong>PIS/PASEP:</strong> {fullEmployee?.pis || '-'}</p>
                  <p className="text-sm"><strong>CTPS:</strong> {fullEmployee?.ctps || '-'}</p>
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="font-bold border-b pb-1 text-sm uppercase">Dados do Registro</h3>
                <p className="text-sm"><strong>Data do Registro:</strong> {formatDateToBR(form.dataRegistro)}</p>
                <p className="text-sm"><strong>Responsável pelo Registro:</strong> {responsavel?.name || '-'}</p>
              </div>

              <div className="space-y-1">
                <h3 className="font-bold border-b pb-1 text-sm uppercase">Documentos Entregues</h3>
                <div className="grid grid-cols-2 gap-1 mt-1">
                  {documentosOptions.map(doc => (
                    <div key={doc} className="flex items-center gap-2 text-xs">
                      <div className={`w-3 h-3 border ${form.documentosEntregues.includes(doc) ? 'bg-black' : ''}`}></div>
                      <span>{doc}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="font-bold border-b pb-1 text-sm uppercase">Observações</h3>
                <p className="text-sm border p-1 rounded bg-gray-50 min-h-[40px]">{form.observacoes || 'Nenhuma observação informada.'}</p>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-10 pt-4">
                <div className="text-center border-t pt-2">
                  <p className="text-xs font-bold">{fullEmployee?.name}</p>
                  <p className="text-[10px]">Assinatura do Funcionário</p>
                </div>
                <div className="text-center border-t pt-2">
                  <p className="text-xs font-bold">{responsavel?.name || 'Responsável'}</p>
                  <p className="text-[10px]">Assinatura da Empresa</p>
                </div>
              </div>
            </div>
          </StandardReportTemplate>
        </div>
      </div>
    </div>
  );
};

export default FichaRegistroFuncionarioForm;
