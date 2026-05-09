import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { FileText, Download, Eye, User, Building, Calendar, MapPin, Phone, Mail, Shield, Settings, Monitor, Smartphone, Radio, Car, Loader2, CheckCircle2 } from 'lucide-react';

import { employeeService, SimpleEmployee } from '@/services/employeeService';
import { companyService } from '@/services/companyService';
import { useToast } from '@/hooks/use-toast';
import { EmployeeCombobox } from '../ui/employee-combobox';
import api from '@/lib/axios';

import { Employee } from '@/types/employee';
import { Company } from '@/types/company';
import { formatCPF, formatCNPJ } from '@/utils/validation';

const equipamentosOptions = [
  'Notebook',
  'Desktop',
  'Tablet',
  'Smartphone',
  'Rádio Comunicador',
  'Rádio Motorola',
  'Viatura',
  'Motocicleta',
  'Uniforme',
  'Equipamento de Segurança',
  'Ferramentas',
  'Equipamento de Comunicação',
  'GPS',
  'Câmera',
  'Detector de Metais',
  'Outros',
  'Vale-Transporte',
];

interface TermoResponsabilidadeEquipamentoFormProps {
  employeeId?: string;
  companyId?: string;
}

const TermoResponsabilidadeEquipamentoForm: React.FC<TermoResponsabilidadeEquipamentoFormProps> = ({ employeeId, companyId }) => {
  const { toast } = useToast();

  // 1. All State and Ref declarations first
  const [form, setForm] = useState({
    funcionarioId: employeeId || '',
    empresaId: companyId || '',
    equipamento: '',
    marca: '',
    modelo: '',
    numeroSerie: '',
    patrimonio: '',
    dataEntrega: '',
    dataDevolucao: '',
    responsavelEntregaId: '', // ID do funcionário responsável
    condicoes: '',
    observacoes: '',
    estadoEquipamento: '',
  });

  const [loading, setLoading] = useState(false);
  const [selectedEmployeeData, setSelectedEmployeeData] = useState<SimpleEmployee | null>(null);
  const [selectedResponsibleData, setSelectedResponsibleData] = useState<SimpleEmployee | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingData, setLoadingData] = useState(false);


  // 2. Memoized values (computed from state)
  const funcionario = selectedEmployeeData;
  const empresa = companies.find(e => e.id === form.empresaId);
  const responsavel = selectedResponsibleData;


  const estadosEquipamento = [
    'Novo',
    'Excelente',
    'Bom',
    'Regular',
    'Precisa Manutenção',
    'Defeituoso',
  ];

  // 3. Effects
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
              address: emp.address,
              companyId: emp.company?.id,
              companySigla: emp.company?.sigla
            } as SimpleEmployee);
            
            // Auto-selecionar empresa se o funcionário tiver uma
            if (emp.company?.id && !form.empresaId) {
              setForm(prev => ({ ...prev, empresaId: emp.company.id }));
            }
          }
        } catch (error) {
          console.error("Erro ao carregar dados iniciais do funcionário:", error);
        }
      };
      fetchEmployee();
    }
  }, [form.funcionarioId, selectedEmployeeData, form.empresaId]);

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

  // 4. Handlers
  const handlePreview = async () => {
    if (!funcionario || !empresa || !form.equipamento) {
      toast({
        title: 'Atenção',
        description: 'Selecione funcionário, empresa e pelo menos um equipamento!',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        companyId: empresa.id,
        employeeName: funcionario.name,
        employeeCpf: funcionario.cpf || funcionario.document || '',
        employeePosition: (funcionario as any).position?.name || '',
        equipments: [
          {
            name: form.equipamento,
            description: `${form.marca} ${form.modelo}`.trim(),
            identifier: form.numeroSerie || form.patrimonio,
            state: form.estadoEquipamento,
            value: 0.0
          }
        ],
        city: empresa.city || '',
        documentDate: form.dataEntrega
      };

      const response = await api.post('/api/equipment-responsibility/generate-pdf', payload, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => window.URL.revokeObjectURL(url), 100);
    } catch (err: any) {
      console.error('Erro ao gerar preview:', err);
      toast({
        title: 'Erro',
        description: err.response?.data?.message || 'Erro ao gerar preview. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGerarPDF = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!funcionario || !empresa || !form.equipamento || !form.numeroSerie || !form.dataEntrega) {
      toast({
        title: 'Atenção',
        description: 'Preencha todos os campos obrigatórios!',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        companyId: empresa.id,
        employeeName: funcionario.name,
        employeeCpf: funcionario.cpf || funcionario.document || '',
        employeePosition: (funcionario as any).position?.name || '',
        equipments: [
          {
            name: form.equipamento,
            description: `${form.marca} ${form.modelo}`.trim(),
            identifier: form.numeroSerie || form.patrimonio,
            state: form.estadoEquipamento,
            value: 0.0
          }
        ],
        city: empresa.city || '',
        documentDate: form.dataEntrega
      };

      const response = await api.post('/api/equipment-responsibility/generate-pdf', payload, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `termo-responsabilidade-${funcionario.name.replace(/\s+/g, '-').toLowerCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
      toast({
        title: 'Sucesso',
        description: 'Termo de responsabilidade gerado com sucesso!',
      });
    } catch (err: any) {
      console.error('Erro ao gerar PDF:', err);
      toast({
        title: 'Erro',
        description: err.response?.data?.message || 'Erro ao gerar PDF. Tente novamente.',
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
                <Shield className="h-6 w-6 text-primary" />
                Termo de Responsabilidade de Equipamento
              </CardTitle>
              <CardDescription>
                Emissão de termo de responsabilidade para entrega ou devolução de equipamentos.
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
                  Funcionário
                  <span className="block text-[11px] font-normal text-muted-foreground/80">
                    Colaborador responsável pelo equipamento.
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
                  Empresa
                  <span className="block text-[11px] font-normal text-muted-foreground/80">
                    Empresa proprietária do equipamento.
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
            {/* Informações do Funcionário */}
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
                        {funcionario.cpf || (funcionario as any).document ? formatCPF(funcionario.cpf || (funcionario as any).document || '') : '-'}
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

                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider">Setor (Posto de Trabalho)</Label>
                      <div className="p-2.5 bg-muted rounded-md text-sm font-medium border border-transparent hover:border-border transition-colors truncate">
                        {funcionario.unitName || (funcionario as any).unit?.name || '-'}
                      </div>
                    </div>
                  </div>


                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Endereço</Label>
                    <div className="p-2.5 bg-muted rounded-md text-sm font-medium border border-transparent hover:border-border transition-colors truncate">
                      {typeof funcionario.address === 'string' 
                        ? (funcionario.address || '-') 
                        : (funcionario.address && typeof funcionario.address === 'object'
                            ? [
                                (funcionario.address as any).street, 
                                (funcionario.address as any).number, 
                                (funcionario.address as any).neighborhood, 
                                (funcionario.address as any).city
                              ].filter(Boolean).join(', ')
                            : '-')}
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

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Endereço</Label>
                    <div className="p-2.5 bg-muted rounded-md text-sm font-medium border border-transparent hover:border-border transition-colors truncate">
                      {empresa.address && typeof empresa.address !== 'string' && (empresa.address as any).street
                        ? [(empresa.address as any).street, (empresa.address as any).number, (empresa.address as any).neighborhood, (empresa.address as any).city]
                          .filter(Boolean)
                          .join(', ')
                        : typeof empresa.address === 'string' ? empresa.address : '-'}
                    </div>
                  </div>

                </div>
              </div>
            )}
          </div>

          {(funcionario || empresa) && <Separator />}

          {/* Informações do Equipamento */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Settings className="h-4 w-4" />
              <span>Informações do Equipamento</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label>Tipo de Equipamento</Label>
                <Select value={form.equipamento} onValueChange={(value) => setForm(prev => ({ ...prev, equipamento: value }))}>
                  <SelectTrigger className="bg-background h-11">
                    <SelectValue placeholder="Selecione o equipamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {equipamentosOptions.map(equip => (
                      <SelectItem key={equip} value={equip}>{equip}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Marca</Label>
                <Input
                  value={form.marca}
                  onChange={(e) => setForm(prev => ({ ...prev, marca: e.target.value }))}
                  placeholder="Ex: Dell, Motorola, Toyota"
                  className="bg-background h-11"
                />
              </div>

              <div className="space-y-2">
                <Label>Modelo</Label>
                <Input
                  value={form.modelo}
                  onChange={(e) => setForm(prev => ({ ...prev, modelo: e.target.value }))}
                  placeholder="Ex: Latitude 5520"
                  className="bg-background h-11"
                />
              </div>

              <div className="space-y-2">
                <Label>Número de Série</Label>
                <Input
                  value={form.numeroSerie}
                  onChange={(e) => setForm(prev => ({ ...prev, numeroSerie: e.target.value }))}
                  placeholder="Ex: SN123456789"
                  className="bg-background h-11"
                />
              </div>

              <div className="space-y-2">
                <Label>Patrimônio</Label>
                <Input
                  value={form.patrimonio}
                  onChange={(e) => setForm(prev => ({ ...prev, patrimonio: e.target.value }))}
                  placeholder="Ex: PAT001234"
                  className="bg-background h-11"
                />
              </div>

              <div className="space-y-2">
                <Label>Estado do Equipamento</Label>
                <Select value={form.estadoEquipamento} onValueChange={(value) => setForm(prev => ({ ...prev, estadoEquipamento: value }))}>
                  <SelectTrigger className="bg-background h-11">
                    <SelectValue placeholder="Selecione o estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {estadosEquipamento.map(estado => (
                      <SelectItem key={estado} value={estado}>{estado}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Datas e Responsável */}
          <div className="bg-muted/30 p-6 rounded-xl border space-y-6">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
              <Calendar className="h-4 w-4" />
              <span>Datas e Responsável</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label className="text-base font-semibold">Data de Entrega</Label>
                <Input
                  type="date"
                  value={form.dataEntrega}
                  onChange={(e) => setForm(prev => ({ ...prev, dataEntrega: e.target.value }))}
                  className="bg-background h-11"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-base font-semibold">Data de Devolução</Label>
                <Input
                  type="date"
                  value={form.dataDevolucao}
                  onChange={(e) => setForm(prev => ({ ...prev, dataDevolucao: e.target.value }))}
                  className="bg-background h-11"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-base font-semibold">Responsável pela Entrega</Label>
                <EmployeeCombobox
                  value={form.responsavelEntregaId}
                  onChange={(value) => setForm(prev => ({ ...prev, responsavelEntregaId: value }))}
                  onEmployeeSelect={(emp) => setSelectedResponsibleData(emp)}
                  placeholder="Selecione o responsável"
                />
              </div>
            </div>

            {/* Exibir dados do responsável quando selecionado */}
            {responsavel && (
              <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300 pt-2">
                <div className="flex items-center justify-between border-t pt-4">
                  <div className="flex items-center gap-2 font-medium text-sm">
                    <User className="h-4 w-4 text-primary" />
                    Dados do Responsável pela Entrega
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

          {/* Condições e Observações */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Condições de Uso</Label>
              <Textarea
                value={form.condicoes}
                onChange={(e) => setForm(prev => ({ ...prev, condicoes: e.target.value }))}
                placeholder="Descreva as condições de uso e responsabilidades..."
                rows={4}
                className="bg-background resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={form.observacoes}
                onChange={(e) => setForm(prev => ({ ...prev, observacoes: e.target.value }))}
                placeholder="Observações adicionais sobre o equipamento..."
                rows={4}
                className="bg-background resize-none"
              />
            </div>
          </div>

          <Separator />

          {/* Ações */}
          <div className="flex flex-col-reverse sm:flex-row gap-4 justify-end pt-2">
            <Button
              onClick={handlePreview}
              variant="outline"
              className="flex items-center gap-2 w-full sm:w-auto h-11"
            >
              <Eye className="h-4 w-4" />
              Visualizar Termo
            </Button>
            <Button
              onClick={handleGerarPDF}
              className="flex items-center gap-2 w-full sm:w-auto h-11 shadow-md hover:shadow-lg transition-all"
              disabled={loading}
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

export default TermoResponsabilidadeEquipamentoForm;