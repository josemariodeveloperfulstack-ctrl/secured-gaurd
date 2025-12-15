import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { FileText, Download, Eye, User, Building, Calendar, Shield, Plus, X, HardHat, Loader2, CheckCircle2 } from 'lucide-react';
import { employeeService, Employee } from '@/services/employeeService';
import { companyService } from '@/services/companyService';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/axios';

const epiOptions = [
  'Capacete de Segurança',
  'Óculos de Proteção',
  'Protetor Auditivo',
  'Máscara Respiratória',
  'Luvas de Segurança',
  'Calçado de Segurança',
  'Cinto de Segurança',
  'Avental de Proteção',
  'Protetor Facial',
  'Uniforme de Trabalho',
  'Colete Refletivo',
  'Luminária de Cabeça',
  'Detector de Gás',
  'Protetor Solar',
  'Outros',
];

const FichaEntregaEPIForm = () => {
  const { toast } = useToast();
  const [form, setForm] = useState({
    funcionarioId: '',
    empresaId: '',
    dataEntrega: '',
    responsavelEntrega: '',
    observacoes: '',
  });

  const [epis, setEpis] = useState([
    { 
      nome: '', 
      quantidade: '1', 
      ca: '', // Certificado de Aprovação
      validade: '',
      observacoes: ''
    }
  ]);

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);

  const funcionario = employees.find(f => f.id === form.funcionarioId);
  const empresa = companies.find(e => e.id === form.empresaId);
  const responsavel = employees.find(f => f.id === form.responsavelEntregaId);

  // Carregar dados do backend
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

  const handleEpiChange = (idx: number, field: string, value: string) => {
    setEpis(epis.map((epi, i) => 
      i === idx ? { ...epi, [field]: value } : epi
    ));
  };

  const addEpi = () => {
    setEpis([...epis, { 
      nome: '', 
      quantidade: '1', 
      ca: '', 
      validade: '', 
      observacoes: '' 
    }]);
  };

  const removeEpi = (idx: number) => {
    if (epis.length > 1) {
      setEpis(epis.filter((_, i) => i !== idx));
    }
  };

  const handlePreview = async () => {
    if (!form.funcionarioId || !form.empresaId || !form.dataEntrega) {
      toast({
        title: 'Atenção',
        description: 'Preencha todos os campos obrigatórios para visualizar a ficha!',
        variant: 'destructive'
      });
      return;
    }

    if (epis.some(epi => !epi.nome)) {
      toast({
        title: 'Atenção',
        description: 'Preencha o nome de todos os EPIs para visualizar a ficha!',
        variant: 'destructive'
      });
      return;
    }

    if (!funcionario || !empresa) {
      toast({
        title: 'Atenção',
        description: 'Selecione funcionário e empresa para visualizar a ficha!',
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

      const payload = {
        templateName: 'ficha-entrega-epi.html',
        funcionario: fullEmployee.name,
        cpf: fullEmployee.cpf || fullEmployee.document || '',
        cargo: (fullEmployee as any).position?.name || '',
        setor: (fullEmployee as any).unit?.name || '',
        empresa: empresa.name,
        cnpj: empresa.cnpj || '',
        dataEntrega: form.dataEntrega,
        responsavelEntrega: responsavel?.name || '',
        epis: epis.map(epi => ({
          nome: epi.nome,
          quantidade: epi.quantidade,
          ca: epi.ca || '',
          validade: epi.validade || '',
          observacoes: epi.observacoes || ''
        })),
        observacoes: form.observacoes || '',
        dataAtual: new Date().toLocaleDateString('pt-BR')
      };

      // Gerar PDF para visualização
      const response = await api.post('/api/documents/generate-pdf', payload, {
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
        description: err.response?.data?.message || 'Erro ao gerar preview da ficha. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGerarPDF = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.funcionarioId || !form.empresaId || !form.dataEntrega) {
      toast({
        title: 'Atenção',
        description: 'Preencha todos os campos obrigatórios!',
        variant: 'destructive'
      });
      return;
    }

    if (epis.some(epi => !epi.nome)) {
      toast({
        title: 'Atenção',
        description: 'Preencha o nome de todos os EPIs!',
        variant: 'destructive'
      });
      return;
    }

    if (!funcionario || !empresa) {
      toast({
        title: 'Atenção',
        description: 'Selecione funcionário e empresa!',
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

      const payload = {
        templateName: 'ficha-entrega-epi.html',
        funcionario: fullEmployee.name,
        cpf: fullEmployee.cpf || fullEmployee.document || '',
        cargo: (fullEmployee as any).position?.name || '',
        setor: (fullEmployee as any).unit?.name || '',
        empresa: empresa.name,
        cnpj: empresa.cnpj || '',
        dataEntrega: form.dataEntrega,
        responsavelEntrega: responsavel?.name || '',
        epis: epis.map(epi => ({
          nome: epi.nome,
          quantidade: epi.quantidade,
          ca: epi.ca || '',
          validade: epi.validade || '',
          observacoes: epi.observacoes || ''
        })),
        observacoes: form.observacoes || '',
        dataAtual: new Date().toLocaleDateString('pt-BR')
      };

      // Gerar PDF
      const response = await api.post('/api/documents/generate-pdf', payload, {
        responseType: 'blob'
      });

      // Fazer download do PDF
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ficha-entrega-epi-${fullEmployee.name.replace(/\s+/g, '-').toLowerCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
      toast({
        title: 'Sucesso',
        description: 'Ficha de Entrega de EPI gerada com sucesso!',
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
                <HardHat className="h-6 w-6 text-primary" />
                Ficha de Entrega de EPI
              </CardTitle>
              <CardDescription>
                Registre a entrega de Equipamentos de Proteção Individual.
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
                <Label className="text-base font-semibold">Funcionário</Label>
                <Select 
                  value={form.funcionarioId} 
                  onValueChange={(value) => setForm(prev => ({ ...prev, funcionarioId: value }))}
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
            {/* Detalhes do Funcionário */}
            {funcionario && (
              <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-2 font-medium">
                    <User className="h-4 w-4 text-primary" />
                    Dados do Funcionário
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
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider">Cargo</Label>
                      <div className="p-2.5 bg-muted rounded-md text-sm font-medium border border-transparent hover:border-border transition-colors truncate">
                        {(funcionario as any).position?.name || '-'}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider">Setor</Label>
                      <div className="p-2.5 bg-muted rounded-md text-sm font-medium border border-transparent hover:border-border transition-colors truncate">
                         {(funcionario as any).unit?.name || '-'}
                      </div>
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

          {/* Dados da Entrega */}
          <div className="bg-muted/30 p-6 rounded-xl border space-y-6">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
              <Calendar className="h-4 w-4" />
              <span>Dados da Entrega</span>
            </div>
            
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
                <Label className="text-base font-semibold">Data de Entrega</Label>
              <Input 
                type="date" 
                value={form.dataEntrega} 
                onChange={(e) => setForm(prev => ({ ...prev, dataEntrega: e.target.value }))}
                className="h-11 bg-background"
              />
            </div>
            
            <div className="space-y-2">
                <Label className="text-base font-semibold">Responsável pela Entrega</Label>
                <Select 
                  value={form.responsavelEntregaId} 
                  onValueChange={(value) => setForm(prev => ({ ...prev, responsavelEntregaId: value }))}
                  disabled={loadingData}
                >
                  <SelectTrigger className="h-11 bg-background">
                    <SelectValue placeholder={loadingData ? "Carregando..." : "Selecione o responsável"} />
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

          <Separator />

          {/* Lista de EPIs */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Shield className="h-4 w-4" />
                <span>EPIs Entregues</span>
              </div>
              <Button type="button" size="sm" onClick={addEpi} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Adicionar EPI
              </Button>
            </div>
            
            <div className="space-y-4">
              {epis.map((epi, idx) => (
                <Card key={idx} className="relative overflow-hidden border-l-4 border-l-primary/50">
                  <div className="absolute top-0 right-0 p-2">
                    <Button 
                      type="button" 
                      size="icon" 
                      variant="ghost" 
                      onClick={() => removeEpi(idx)}
                      disabled={epis.length === 1}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <CardContent className="p-6 pt-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Badge variant="secondary" className="font-mono">#{idx + 1}</Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="space-y-2 lg:col-span-2">
                        <Label>Nome do EPI</Label>
                        <Select value={epi.nome} onValueChange={(value) => handleEpiChange(idx, 'nome', value)}>
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Selecione o EPI" />
                          </SelectTrigger>
                          <SelectContent>
                            {epiOptions.map(option => (
                              <SelectItem key={option} value={option}>{option}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Quantidade</Label>
                        <Input 
                          type="number" 
                          min="1"
                          value={epi.quantidade} 
                          onChange={(e) => handleEpiChange(idx, 'quantidade', e.target.value)}
                          className="bg-background"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>CA</Label>
                        <Input 
                          value={epi.ca} 
                          onChange={(e) => handleEpiChange(idx, 'ca', e.target.value)}
                          placeholder="Certificado de Aprovação"
                          className="bg-background"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Validade</Label>
                        <Input 
                          type="date" 
                          value={epi.validade} 
                          onChange={(e) => handleEpiChange(idx, 'validade', e.target.value)}
                          className="bg-background"
                        />
                      </div>
                      
                      <div className="space-y-2 lg:col-span-3">
                        <Label>Observações do Item</Label>
                        <Input 
                          value={epi.observacoes} 
                          onChange={(e) => handleEpiChange(idx, 'observacoes', e.target.value)}
                          placeholder="Observações específicas..."
                          className="bg-background"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Observações Gerais</Label>
            <Textarea 
              value={form.observacoes} 
              onChange={(e) => setForm(prev => ({ ...prev, observacoes: e.target.value }))}
              placeholder="Observações adicionais sobre a entrega dos EPIs..."
              rows={3}
              className="resize-none bg-background"
            />
          </div>

          <Separator />

          {/* Ações */}
          <div className="flex flex-col-reverse sm:flex-row gap-4 justify-end pt-2">
            <Button 
              onClick={handlePreview} 
              variant="outline" 
              className="flex items-center gap-2 w-full sm:w-auto h-11"
              disabled={loading || loadingData || !funcionario || !empresa || !form.dataEntrega || epis.some(epi => !epi.nome)}
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
              onClick={handleGerarPDF} 
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

export default FichaEntregaEPIForm;