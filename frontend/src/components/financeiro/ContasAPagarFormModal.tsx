import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { CalendarDays, DollarSign, FileText, Upload, Plus, Users, Building2, Tag, CheckCircle, FolderTree } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import { formatDateForBackend, parseDateFromBackend } from '@/utils/dateUtils';
import { contasAPagarService, Supplier, CategoriaPai, Subcategoria } from '@/services/contasAPagarService';
import SupplierFormModal from '@/components/estoque/SupplierFormModal';
import { EmployeeCombobox } from '@/components/ui/employee-combobox';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/axios';
import departmentService, { filterCompanyDepartments, isValidSectorName } from '@/services/departmentService';

export interface ContaAPagar {
  id?: string;
  dataEmissao?: Date;
  vencimento: Date;
  companySigla?: string;
  fornecedor: string;
  fornecedorId?: string;
  empresa?: string;
  empresaId?: string;
  descricao: string;
  tipo: 'FIXA' | 'VARIAVEL';
  valor: number;
  codigoBarras?: string;
  status: 'ABERTA' | 'PAGA' | 'ATRASADA' | 'CANCELADA' | 'VENCIDA';
  baixa: boolean;
  dataPagamento?: Date;
  observacoes?: string;
  comprovante?: File;
  categoria?: string | undefined;
  subcategoriaId?: string | undefined;
  subcategoriaNome?: string | undefined;
  subcategoriaCodigo?: string | undefined;
  categoriaPaiNome?: string | undefined;
  categoriaPaiCodigo?: string | undefined;
  employeeId?: string | undefined;
  employeeName?: string | undefined;
  centroCusto?: string | undefined;
  unitId?: string | undefined;
  unitName?: string | undefined;
  workSector?: string | undefined;
  createdAt?: Date;
  createdById?: string;
  createdByName?: string;
}

interface ContasAPagarFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editMode?: boolean;
  initialData?: ContaAPagar | null;
}

export const ContasAPagarFormModal: React.FC<ContasAPagarFormModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
  editMode = false,
  initialData = null
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fornecedores, setFornecedores] = useState<Supplier[]>([]);
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [siglas, setSiglas] = useState<string[]>([]);
  const [unidades, setUnidades] = useState<any[]>([]);
  const [setoresSugeridos, setSetoresSugeridos] = useState<string[]>([]);
  const [workSectorAutoFilled, setWorkSectorAutoFilled] = useState(false);
  
  const [formData, setFormData] = useState<ContaAPagar>({
    dataEmissao: new Date(),
    vencimento: new Date(),
    fornecedor: '',
    fornecedorId: '',
    empresa: '',
    empresaId: '',
    unitId: '',
    unitName: '',
    workSector: '',
    descricao: '',
    tipo: 'VARIAVEL',
    valor: 0,
    codigoBarras: '',
    status: 'ABERTA',
    baixa: false,
    dataPagamento: undefined,
    observacoes: '',
    categoria: undefined,
    centroCusto: undefined
  });

  const [categories, setCategories] = useState<string[]>([]);
  const [costCenters, setCostCenters] = useState<string[]>([]);
  const [valorDisplay, setValorDisplay] = useState<string>('R$ 0,00');
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [newCategoryModalOpen, setNewCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [paymentConfirmDate, setPaymentConfirmDate] = useState<Date | null>(new Date());

  // Plano de Contas state
  const [categoriasPai, setCategoriasPai] = useState<CategoriaPai[]>([]);
  const [subcategorias, setSubcategorias] = useState<Subcategoria[]>([]);
  const [selectedCategoriaPaiId, setSelectedCategoriaPaiId] = useState<string>('');
  const [selectedSubcategoria, setSelectedSubcategoria] = useState<Subcategoria | null>(null);

  // Helpers para moeda BRL com 2 casas decimais
  const formatToBRL = (raw: string | number): string => {
    if (typeof raw === 'number') {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(raw);
    }
    const onlyDigits = (raw || '').replace(/\D/g, '');
    const number = Number(onlyDigits) / 100;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(number);
  };

  const parseCurrencyBRL = (formatted: string): number => {
    const onlyDigits = (formatted || '').replace(/\D/g, '');
    if (!onlyDigits) return 0;
    return Number(onlyDigits) / 100;
  };

  // Carregar dados quando o modal abrir
  useEffect(() => {
    if (open) {
      // Carregar fornecedores
      contasAPagarService.getFornecedores()
        .then(data => {
          const fornecedoresArray = Array.isArray(data) ? data : [];
          setFornecedores(fornecedoresArray);
          // Pré-selecionar fornecedor em modo edição - fazer depois que os fornecedores são carregados
          if (editMode && initialData) {
            // Tentar encontrar o fornecedor por ID primeiro
            const fornecedorIdToMatch = initialData.fornecedorId 
              ? (typeof initialData.fornecedorId === 'string' ? initialData.fornecedorId : String(initialData.fornecedorId))
              : null;
            
            let chosen = null;
            if (fornecedorIdToMatch) {
              chosen = fornecedoresArray.find((f: any) => String(f.id) === fornecedorIdToMatch);
            }
            
            // Se não encontrou por ID, tentar por nome
            if (!chosen && initialData.fornecedor) {
              chosen = fornecedoresArray.find((f: any) => 
                (f.name || '').toLowerCase() === (initialData.fornecedor || '').toLowerCase()
              );
            }
            
            if (chosen) {
              console.log('✅ Fornecedor encontrado para pré-seleção:', chosen);
              // Atualizar formData com o fornecedor encontrado
              setFormData(prev => ({
                ...prev,
                fornecedorId: String(chosen.id), // Garantir que seja string
                fornecedor: chosen.name
              }));
            } else if (fornecedorIdToMatch || initialData.fornecedor) {
              console.warn('⚠️ Fornecedor não encontrado na lista. ID:', fornecedorIdToMatch, 'Nome:', initialData.fornecedor);
              // Manter o ID e nome mesmo que não esteja na lista (pode ter sido removido)
              if (fornecedorIdToMatch) {
                setFormData(prev => ({
                  ...prev,
                  fornecedorId: fornecedorIdToMatch,
                  fornecedor: initialData.fornecedor || 'Fornecedor não encontrado'
                }));
              }
            }
          }
        })
        .catch(error => {
          console.error('Erro ao carregar fornecedores:', error);
          setFornecedores([
            { id: '1', name: 'Fornecedor Exemplo 1', isActive: true },
            { id: '2', name: 'Fornecedor Exemplo 2', isActive: true }
          ]);
        });

      // Carregar empresas
      contasAPagarService.getEmpresas()
        .then(data => {
          const empresasArray = Array.isArray(data) ? data : [];
          setEmpresas(empresasArray);
          const siglasList = empresasArray.map((e: any) => e.sigla || e.name || '').filter((s: string) => !!s);
          setSiglas(siglasList.length ? siglasList : ['ADM','TERC','VIG']);
          // Se estiver editando e já existir companySigla, selecionar empresa correspondente
          if (editMode && initialData) {
            const match = empresasArray.find((e: any) => {
              const sigla = e.sigla || e.name;
              return sigla === ((initialData as any).companySigla || '') || e.id === (initialData as any).empresaId || (e.name || '').toLowerCase() === (initialData as any).empresa?.toLowerCase();
            });
            if (match) {
              setFormData(prev => ({
                ...prev,
                empresaId: match.id,
                empresa: match.name,
                companySigla: match.sigla || match.name
              }));
            }
          }
        })
        .catch(error => {
          console.error('Erro ao carregar empresas:', error);
          setEmpresas([]);
          setSiglas(['ADM','TERC','VIG']);
        });

      // Carregar categorias
      contasAPagarService.getCategories()
        .then(data => {
          const categoriasArray = (Array.isArray(data) ? data : []).map(v => (v ?? '').toString().trim()).filter(v => v.length > 0);
          setCategories(categoriasArray);
          if (editMode && initialData?.categoria) {
            setFormData(prev => ({ ...prev, categoria: initialData!.categoria }));
          }
        })
        .catch(error => {
          console.error('Erro ao carregar categorias:', error);
          setCategories([
            'Aluguel',
            'Energia Elétrica',
            'Telefone/Internet',
            'Material de Escritório',
            'Manutenção',
            'Outros'
          ]);
        });

      // Carregar centros de custo
      contasAPagarService.getCostCenters()
        .then(data => {
          const centrosArray = (Array.isArray(data) ? data : []).map(v => (v ?? '').toString().trim()).filter(v => v.length > 0);
          setCostCenters(centrosArray);
          if (editMode && initialData?.centroCusto) {
            setFormData(prev => ({ ...prev, centroCusto: initialData!.centroCusto }));
          }
        })
        .catch(error => {
          console.error('Erro ao carregar centros de custo:', error);
          setCostCenters([
            'Administrativo',
            'Operacional',
            'Comercial',
            'Financeiro',
            'Recursos Humanos',
            'Tecnologia da Informação',
            'Marketing',
            'Vendas',
            'Produção',
            'Logística'
          ]);
        });

      // Carregar Plano de Contas
      contasAPagarService.getCategoriasPai()
        .then(data => setCategoriasPai(Array.isArray(data) ? data : []))
        .catch(() => setCategoriasPai([]));

      contasAPagarService.getSubcategorias()
        .then(data => setSubcategorias(Array.isArray(data) ? data : []))
        .catch(() => setSubcategorias([]));

      // Carregar Unidades
      api.get('/units')
        .then(res => {
          const list = Array.isArray(res.data) ? res.data : [];
          setUnidades(list);
        })
        .catch(err => {
          console.warn('Erro ao carregar unidades:', err);
          setUnidades([]);
        });

      // Carregar Setores de Trabalho do banco de dados (apenas Postos de Trabalho e Departamentos válidos)
      Promise.allSettled([
        departmentService.listActive(),
        api.get('/work-posts/all').catch(() => api.get('/work-posts'))
      ]).then(([deptResult, postsResult]) => {
        // Departamentos: aplicar filtro para remover dados inválidos (estado civil, etc.)
        const rawDepts = deptResult.status === 'fulfilled' && Array.isArray(deptResult.value)
          ? deptResult.value
          : [];
        const deptNames: string[] = filterCompanyDepartments(rawDepts)
          .map((d: any) => d.name?.trim())
          .filter(Boolean);

        // Postos de Trabalho: usar apenas o campo "name" do posto, filtrar inválidos
        const postNames: string[] = [];
        if (postsResult.status === 'fulfilled') {
          const raw = postsResult.value?.data;
          const list = Array.isArray(raw) ? raw : (raw?.content || []);
          list.forEach((p: any) => {
            const n = p?.name?.trim();
            if (n && typeof n === 'string' && isValidSectorName(n)) {
              postNames.push(n);
            }
          });
        }

        const combined = Array.from(new Set([...deptNames, ...postNames]))
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b, 'pt-BR'));
        setSetoresSugeridos(combined);
      }).catch(err => {
        console.warn('Erro ao carregar setores de trabalho:', err);
        setSetoresSugeridos([]);
      });
    }
  }, [open]);

  // Atualizar dados do formulário quando initialData mudar
  useEffect(() => {
    if (open) {
      if (editMode && initialData) {
        // Converter fornecedorId para string se necessário
        const fornecedorIdStr = initialData.fornecedorId 
          ? (typeof initialData.fornecedorId === 'string' ? initialData.fornecedorId : String(initialData.fornecedorId))
          : '';
        
        console.log('📝 Carregando dados iniciais para edição:', {
          fornecedorId: initialData.fornecedorId,
          fornecedorIdStr,
          fornecedor: initialData.fornecedor
        });
        
        setFormData({
          dataEmissao: (typeof initialData.dataEmissao === 'string' ? parseDateFromBackend(initialData.dataEmissao) : initialData.dataEmissao) || new Date(),
          vencimento: (typeof initialData.vencimento === 'string' ? parseDateFromBackend(initialData.vencimento) : initialData.vencimento) || new Date(),
          fornecedor: initialData.fornecedor || '',
          fornecedorId: fornecedorIdStr,
          empresa: initialData.empresa || '',
          empresaId: initialData.empresaId ? (typeof initialData.empresaId === 'string' ? initialData.empresaId : String(initialData.empresaId)) : '',
          companySigla: initialData.companySigla || '',
          descricao: initialData.descricao || '',
          tipo: initialData.tipo || 'VARIAVEL',
          valor: initialData.valor ?? 0,
          codigoBarras: initialData.codigoBarras || '',
          status: initialData.status || 'ABERTA',
          baixa: initialData.baixa || false,
          dataPagamento: (typeof initialData.dataPagamento === 'string' ? parseDateFromBackend(initialData.dataPagamento) : initialData.dataPagamento) || undefined,
          observacoes: initialData.observacoes || '',
          categoria: initialData.categoria || '',
          subcategoriaId: initialData.subcategoriaId || '',
          employeeId: initialData.employeeId || '',
          centroCusto: initialData.centroCusto || '',
          unitId: initialData.unitId ? String(initialData.unitId) : '',
          unitName: initialData.unitName || '',
          workSector: initialData.workSector || ''
        });
        setValorDisplay(formatToBRL(initialData.valor ?? 0));
        setPaymentConfirmDate((typeof initialData.dataPagamento === 'string' ? parseDateFromBackend(initialData.dataPagamento) : initialData.dataPagamento) || new Date());
        // Restaurar subcategoria selecionada
        if (initialData.subcategoriaId) {
          const sub = subcategorias.find(s => s.id === initialData.subcategoriaId);
          if (sub) {
            setSelectedSubcategoria(sub);
            setSelectedCategoriaPaiId(sub.categoriaPaiId);
          }
        }
      } else {
        // Resetar formulário para modo de criação
        setFormData({
          dataEmissao: new Date(),
          vencimento: new Date(),
          fornecedor: '',
          fornecedorId: '',
          empresa: '',
          empresaId: '',
          unitId: '',
          unitName: '',
          workSector: '',
          descricao: '',
          tipo: 'VARIAVEL',
          valor: 0,
          codigoBarras: '',
          status: 'ABERTA',
          baixa: false,
          dataPagamento: undefined,
          observacoes: '',
          categoria: undefined,
          subcategoriaId: '',
          employeeId: '',
          centroCusto: undefined
        });
        setSelectedCategoriaPaiId('');
        setSelectedSubcategoria(null);
        setValorDisplay('R$ 0,00');
        setPaymentConfirmDate(new Date());
        setWorkSectorAutoFilled(false);
      }
    }
  }, [editMode, initialData, open]);

  // Sincronizar fornecedor quando fornecedores e formData.fornecedorId estiverem disponíveis
  useEffect(() => {
    if (open && editMode && initialData && fornecedores.length > 0 && formData.fornecedorId) {
      // Verificar se o fornecedorId no formData corresponde a um fornecedor na lista
      const fornecedorAtual = fornecedores.find((f: any) => String(f.id) === String(formData.fornecedorId));
      if (!fornecedorAtual && formData.fornecedorId) {
        // Se não encontrou, tentar novamente buscar pelo initialData
        const fornecedorIdToMatch = initialData.fornecedorId 
          ? (typeof initialData.fornecedorId === 'string' ? initialData.fornecedorId : String(initialData.fornecedorId))
          : null;
        
        if (fornecedorIdToMatch) {
          const fornecedorEncontrado = fornecedores.find((f: any) => String(f.id) === fornecedorIdToMatch);
          if (fornecedorEncontrado) {
            console.log('✅ Sincronizando fornecedor encontrado:', fornecedorEncontrado);
            setFormData(prev => ({
              ...prev,
              fornecedorId: String(fornecedorEncontrado.id),
              fornecedor: fornecedorEncontrado.name
            }));
          }
        }
      }
    }
  }, [open, editMode, initialData, fornecedores, formData.fornecedorId]);

  const handleInputChange = (field: keyof ContaAPagar, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Restaurar Plano de Contas quando subcategorias carregarem (edição)
  useEffect(() => {
    if (!open || !editMode || !initialData?.subcategoriaId || subcategorias.length === 0) return;
    const sub = subcategorias.find((s) => s.id === initialData.subcategoriaId);
    if (sub) {
      setSelectedSubcategoria(sub);
      setSelectedCategoriaPaiId(sub.categoriaPaiId);
    }
  }, [open, editMode, initialData?.subcategoriaId, subcategorias]);

  const filteredSubcategorias = selectedCategoriaPaiId
    ? subcategorias.filter((s) => s.categoriaPaiId === selectedCategoriaPaiId)
    : [];

  const requiresEmployee = Boolean(selectedSubcategoria?.requerVinculoFuncionario);
  const requiresSupplier = !requiresEmployee;
  const loggedInUserLabel = user?.name || user?.username || 'Usuário logado';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.descricao || !formData.valor || !formData.vencimento) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    if (requiresSupplier && !formData.fornecedor && !formData.fornecedorId) {
      toast({
        title: "Erro",
        description: "Selecione o fornecedor da conta a pagar",
        variant: "destructive"
      });
      return;
    }

    if (!formData.companySigla && !formData.empresaId) {
      toast({
        title: "Erro",
        description: "Selecione a empresa (SIGLA) da conta a pagar",
        variant: "destructive"
      });
      return;
    }

    if (selectedSubcategoria?.requerVinculoFuncionario && !formData.employeeId) {
      toast({
        title: "Erro",
        description: "Esta conta do Plano de Contas exige informar o funcionário beneficiário",
        variant: "destructive"
      });
      return;
    }

    if (formData.employeeId && !formData.companySigla && !formData.empresaId) {
      toast({
        title: "Erro",
        description: "Informe a empresa do funcionário vinculado ao pagamento",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      if (editMode && initialData?.id) {
        await contasAPagarService.updateContaAPagar(initialData.id, formData);
        toast({
          title: "Sucesso",
          description: "Conta a pagar atualizada com sucesso!"
        });
      } else {
        await contasAPagarService.createContaAPagar({
          ...formData,
          companySigla: formData.companySigla || siglas[0] || undefined
        });
        toast({
          title: "Sucesso",
          description: "Conta a pagar criada com sucesso!"
        });
      }
      
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao salvar conta:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar conta a pagar. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-seguranca-graphite border-gray-600 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-seguranca-yellow flex items-center gap-2">
            <Plus size={20} />
            {editMode ? 'Editar Conta a Pagar' : 'Nova Conta a Pagar'}
          </DialogTitle>
          <DialogDescription className="text-gray-300">
            {editMode ? 'Atualize as informações da conta a pagar' : 'Preencha os dados da nova conta a pagar'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {/* Data de Emissão */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-seguranca-yellow flex items-center gap-2">
                <CalendarDays size={14} />
                Data de Emissão *
              </label>
               <DatePicker
                date={formData.dataEmissao}
                onDateChange={(date) => handleInputChange('dataEmissao', date)}
                placeholder="dd/mm/aaaa"
                className="w-full"
              />
            </div>

            {/* Data de Vencimento */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-seguranca-yellow flex items-center gap-2">
                <CalendarDays size={14} />
                Data de Vencimento *
              </label>
               <DatePicker
                date={formData.vencimento}
                onDateChange={(date) => handleInputChange('vencimento', date)}
                placeholder="dd/mm/aaaa"
                className="w-full"
              />
            </div>

            {/* Descrição */}
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-seguranca-lightgray">Descrição *</label>
              <Input
                value={formData.descricao}
                onChange={(e) => handleInputChange('descricao', e.target.value)}
                placeholder="Descrição da despesa"
                className="border-gray-600 bg-seguranca-black text-seguranca-lightgray placeholder:text-gray-400 focus:border-seguranca-yellow focus:ring-seguranca-yellow"
                required
              />
            </div>

            {/* Fornecedor */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-seguranca-lightgray">
                Fornecedor {requiresSupplier ? '*' : '(opcional para Pessoal / RH)'}
              </label>
              <Select
                value={formData.fornecedorId}
                onValueChange={(value) => {
                  const fornecedor = fornecedores.find(f => f.id === value);
                  handleInputChange('fornecedorId', value);
                  handleInputChange('fornecedor', fornecedor?.name || '');
                }}
                required={requiresSupplier}
              >
                <SelectTrigger className="border-gray-600 bg-seguranca-black text-seguranca-lightgray focus:border-seguranca-yellow focus:ring-seguranca-yellow">
                  <SelectValue placeholder="Selecione um fornecedor" />
                </SelectTrigger>
                <SelectContent className="bg-seguranca-black border-gray-600">
                  <div className="px-3 py-2 text-xs text-gray-400">Ações rápidas</div>
                  <SelectItem value="__novo_fornecedor__" className="text-seguranca-yellow hover:bg-seguranca-graphite" onClick={(e) => { e.preventDefault(); setSupplierModalOpen(true); }}>
                    + Novo Fornecedor
                  </SelectItem>
                  <Separator className="my-1 bg-gray-700" />
                  {fornecedores.filter(f => !!f && !!f.id).map((fornecedor) => (
                    <SelectItem 
                      key={fornecedor.id} 
                      value={fornecedor.id}
                      className="text-seguranca-lightgray hover:bg-seguranca-graphite"
                    >
                      {fornecedor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-xs text-gray-400 mt-1">
                Não encontrou?{' '}
                <button type="button" className="text-seguranca-yellow underline" onClick={() => setSupplierModalOpen(true)}>
                  Cadastrar fornecedor
                </button>
              </div>
              {(!Array.isArray(fornecedores) || fornecedores.length === 0) && (
                <div className="text-xs text-gray-400 mt-1">
                  Nenhum fornecedor encontrado.{' '}
                  <button
                    type="button"
                    className="text-seguranca-yellow underline"
                    onClick={() => setSupplierModalOpen(true)}
                  >
                    Cadastrar fornecedor
                  </button>
                </div>
              )}
            </div>

            {/* Empresa */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-seguranca-lightgray">Empresa (SIGLA) *</label>
              <p className="text-xs text-gray-400 -mt-1">Obrigatória; define de qual empresa é o pagamento (e filtra funcionários).</p>
              <Select
                value={formData.empresaId}
                onValueChange={(value) => {
                  const empresa = empresas.find(e => e.id === value);
                  handleInputChange('empresaId', value);
                  handleInputChange('empresa', empresa?.name || '');
                  handleInputChange('companySigla', empresa?.sigla || empresa?.name || '');
                }}
                required
              >
                <SelectTrigger className="border-gray-600 bg-seguranca-black text-seguranca-lightgray focus:border-seguranca-yellow focus:ring-seguranca-yellow">
                  <SelectValue placeholder="Selecione uma empresa" />
                </SelectTrigger>
                <SelectContent className="bg-seguranca-black border-gray-600">
                  {empresas.map((empresa) => (
                    <SelectItem 
                      key={empresa.id} 
                      value={empresa.id}
                      className="text-seguranca-lightgray hover:bg-seguranca-graphite"
                    >
                      {empresa.sigla ? `${empresa.sigla} - ${empresa.name}` : empresa.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Unidade */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-seguranca-lightgray flex items-center gap-2">
                <Building2 size={14} />
                Unidade
              </label>
              <Select
                value={formData.unitId || 'none'}
                onValueChange={(value) => {
                  if (value === 'none') {
                    handleInputChange('unitId', '');
                    handleInputChange('unitName', '');
                  } else {
                    const un = unidades.find(u => u.id === value);
                    handleInputChange('unitId', value);
                    handleInputChange('unitName', un?.name || '');
                  }
                }}
              >
                <SelectTrigger className="border-gray-600 bg-seguranca-black text-seguranca-lightgray focus:border-seguranca-yellow focus:ring-seguranca-yellow">
                  <SelectValue placeholder="Selecione a Unidade" />
                </SelectTrigger>
                <SelectContent className="bg-seguranca-black border-gray-600">
                  <SelectItem value="none" className="text-gray-400 hover:bg-seguranca-graphite">
                    Selecione ou padrão
                  </SelectItem>
                  {unidades.map((u) => (
                    <SelectItem key={u.id} value={u.id} className="text-seguranca-lightgray hover:bg-seguranca-graphite">
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Setor de Trabalho */}
            <div className="space-y-2">
              <label className={`text-sm font-medium flex items-center gap-2 ${workSectorAutoFilled ? 'text-emerald-400' : 'text-seguranca-lightgray'}`}>
                <Tag size={14} />
                Setor de Trabalho
                {workSectorAutoFilled && formData.workSector && (
                  <span className="text-xs bg-emerald-400/10 border border-emerald-400/30 text-emerald-400 px-2 py-0.5 rounded-full font-normal">
                    Auto-preenchido
                  </span>
                )}
              </label>
              <Select
                value={formData.workSector || 'none'}
                onValueChange={(value) => {
                  handleInputChange('workSector', value === 'none' ? '' : value);
                  setWorkSectorAutoFilled(false); // usuário alterou manualmente
                }}
              >
                <SelectTrigger className={`border-gray-600 bg-seguranca-black text-seguranca-lightgray focus:border-seguranca-yellow focus:ring-seguranca-yellow ${workSectorAutoFilled ? 'border-emerald-400/40' : ''}`}>
                  <SelectValue placeholder="Selecione o setor de trabalho" />
                </SelectTrigger>
                <SelectContent className="bg-seguranca-black border-gray-600 max-h-60">
                  <SelectItem value="none" className="text-gray-400 hover:bg-seguranca-graphite">
                    Selecione o setor de trabalho
                  </SelectItem>
                  {formData.workSector && !setoresSugeridos.includes(formData.workSector) && (
                    <SelectItem value={formData.workSector} className="text-seguranca-lightgray hover:bg-seguranca-graphite">
                      {formData.workSector}
                    </SelectItem>
                  )}
                  {setoresSugeridos.map((setor, idx) => (
                    <SelectItem key={idx} value={setor} className="text-seguranca-lightgray hover:bg-seguranca-graphite">
                      {setor}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>


            {/* Tipo */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-seguranca-lightgray">Tipo *</label>
              <Select
                value={formData.tipo}
                onValueChange={(value) => handleInputChange('tipo', value)}
                required
              >
                <SelectTrigger className="border-gray-600 bg-seguranca-black text-seguranca-lightgray focus:border-seguranca-yellow focus:ring-seguranca-yellow">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-seguranca-black border-gray-600">
                  <SelectItem value="FIXA" className="text-seguranca-lightgray hover:bg-seguranca-graphite">
                    Fixa
                  </SelectItem>
                  <SelectItem value="VARIAVEL" className="text-seguranca-lightgray hover:bg-seguranca-graphite">
                    Variável
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-seguranca-lightgray">Status *</label>
              <Select
                value={formData.status || 'ABERTA'}
                onValueChange={(value) => handleInputChange('status', value as any)}
                required
              >
                <SelectTrigger className="border-gray-600 bg-seguranca-black text-seguranca-lightgray focus:border-seguranca-yellow focus:ring-seguranca-yellow">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-seguranca-black border-gray-600">
                  <SelectItem value="ABERTA" className="text-seguranca-lightgray hover:bg-seguranca-graphite">Aberta</SelectItem>
                  <SelectItem value="PAGA" className="text-seguranca-lightgray hover:bg-seguranca-graphite">Paga</SelectItem>
                  <SelectItem value="VENCIDA" className="text-seguranca-lightgray hover:bg-seguranca-graphite">Vencida</SelectItem>
                  <SelectItem value="CANCELADA" className="text-seguranca-lightgray hover:bg-seguranca-graphite">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Valor (BRL com 2 casas decimais) */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-red-400 flex items-center gap-2">
                <DollarSign size={14} />
                Valor *
              </label>
              <Input
                type="text"
                inputMode="numeric"
                value={valorDisplay}
                onChange={(e) => {
                  const formatted = formatToBRL(e.target.value);
                  setValorDisplay(formatted);
                  handleInputChange('valor', parseCurrencyBRL(formatted));
                }}
                placeholder="R$ 0,00"
                className="border-red-500 bg-seguranca-black text-red-300 placeholder:text-red-400/60 focus:border-red-400 focus:ring-red-400 font-medium"
                required
              />
            </div>

            {/* Plano de Contas */}
            <div className="space-y-2 md:col-span-2 rounded-lg border border-seguranca-yellow/30 bg-black/20 p-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <label className="text-sm font-medium text-seguranca-yellow flex items-center gap-2">
                  <FolderTree size={14} />
                  Plano de Contas
                </label>
                <Link
                  to="/plano-contas"
                  className="text-xs text-seguranca-yellow underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  Gerenciar plano de contas
                </Link>
              </div>
              <p className="text-xs text-gray-400 mb-3">
                Use a conta contábil correta (ex.: rescisão, vale, ajuda de custo). Contas de RH pedem o funcionário e a empresa.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-seguranca-lightgray">Categoria *</label>
                  <Select
                    value={selectedCategoriaPaiId || 'none'}
                    onValueChange={(value) => {
                      setSelectedCategoriaPaiId(value === 'none' ? '' : value);
                      setSelectedSubcategoria(null);
                      handleInputChange('subcategoriaId', '');
                      handleInputChange('employeeId', '');
                    }}
                  >
                    <SelectTrigger className="border-gray-600 bg-seguranca-black text-seguranca-lightgray focus:border-seguranca-yellow focus:ring-seguranca-yellow">
                      <SelectValue placeholder="Selecione a categoria do plano" />
                    </SelectTrigger>
                    <SelectContent className="bg-seguranca-black border-gray-600">
                      <SelectItem value="none" className="text-gray-400 hover:bg-seguranca-graphite">
                        Nenhuma
                      </SelectItem>
                      {categoriasPai.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id} className="text-seguranca-lightgray hover:bg-seguranca-graphite">
                          {cat.codigo} - {cat.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {categoriasPai.length === 0 && (
                    <p className="text-xs text-amber-400">
                      Nenhuma categoria cadastrada. Cadastre em Plano de Contas ou reinicie o backend para carregar o seed.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-seguranca-lightgray">Conta / Subcategoria *</label>
                  <Select
                    value={formData.subcategoriaId || 'none'}
                    onValueChange={(value) => {
                      if (value === 'none') {
                        handleInputChange('subcategoriaId', '');
                        setSelectedSubcategoria(null);
                        handleInputChange('employeeId', '');
                        return;
                      }
                      handleInputChange('subcategoriaId', value);
                      const sub = filteredSubcategorias.find((s) => s.id === value) || subcategorias.find((s) => s.id === value);
                      setSelectedSubcategoria(sub || null);
                      if (sub?.requerVinculoFuncionario) {
                        handleInputChange('fornecedorId', '');
                        handleInputChange('fornecedor', '');
                      } else {
                        handleInputChange('employeeId', '');
                      }
                    }}
                    disabled={!selectedCategoriaPaiId}
                  >
                    <SelectTrigger className="border-gray-600 bg-seguranca-black text-seguranca-lightgray focus:border-seguranca-yellow focus:ring-seguranca-yellow">
                      <SelectValue placeholder={selectedCategoriaPaiId ? 'Selecione a conta' : 'Selecione a categoria primeiro'} />
                    </SelectTrigger>
                    <SelectContent className="bg-seguranca-black border-gray-600">
                      <SelectItem value="none" className="text-gray-400 hover:bg-seguranca-graphite">
                        Nenhuma
                      </SelectItem>
                      {filteredSubcategorias.map((sub) => (
                        <SelectItem key={sub.id} value={sub.id} className="text-seguranca-lightgray hover:bg-seguranca-graphite">
                          {sub.codigo} - {sub.nome}
                          {sub.requerVinculoFuncionario ? ' (funcionário)' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {(requiresEmployee || formData.employeeId) && (
                <div className="mt-4 space-y-3 rounded-md border border-yellow-500/40 bg-yellow-500/5 p-3">
                  <label className="text-sm font-medium text-yellow-400 flex items-center gap-2">
                    <Users size={14} />
                    Funcionário beneficiário {requiresEmployee ? '*' : ''}
                  </label>
                  <p className="text-xs text-yellow-500/80">
                    Pagamentos de rescisão, vale, ajuda de custo ou documentos fiscais de RH devem indicar o funcionário e a empresa (SIGLA) acima.
                  </p>
                  {!formData.empresaId && (
                    <p className="text-xs text-amber-400">
                      Selecione a Empresa (SIGLA) para filtrar os funcionários da empresa correta.
                    </p>
                  )}
                  <EmployeeCombobox
                    value={formData.employeeId || ''}
                    onChange={(value) => {
                      handleInputChange('employeeId', value);
                      // Se limpar o funcionário, remove o setor auto-preenchido
                      if (!value) {
                        setWorkSectorAutoFilled(false);
                      }
                    }}
                    companyId={formData.empresaId || undefined}
                    placeholder="Busque o funcionário pelo nome"
                    onEmployeeSelect={(emp) => {
                      handleInputChange('employeeId', emp.id);
                      // Preencher empresa automaticamente se não estiver definida
                      if (emp.companyId && !formData.empresaId) {
                        const match = empresas.find((e: any) => String(e.id) === String(emp.companyId));
                        if (match) {
                          handleInputChange('empresaId', match.id);
                          handleInputChange('empresa', match.name);
                          handleInputChange('companySigla', match.sigla || match.name);
                        }
                      }
                      // SEMPRE sobrescreve o setor de trabalho com o do funcionário selecionado
                      const suggestedSector = (emp as any).workPostName
                        || (emp as any).workPost?.name
                        || (emp as any).departmentName
                        || (emp as any).department?.name;
                      if (suggestedSector) {
                        handleInputChange('workSector', suggestedSector);
                        setWorkSectorAutoFilled(true);
                      } else {
                        setWorkSectorAutoFilled(false);
                      }
                    }}
                  />
                  {workSectorAutoFilled && formData.workSector && (
                    <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                      <CheckCircle size={12} />
                      Setor de trabalho preenchido automaticamente do cadastro do funcionário.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Categoria antiga (fallback) */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400">Categoria (texto livre — legado)</label>
              <Select
                value={(formData.categoria && formData.categoria !== '') ? formData.categoria : 'NENHUMA'}
                onValueChange={(value) => handleInputChange('categoria', value)}
              >
                <SelectTrigger className="border-gray-600 bg-seguranca-black text-seguranca-lightgray focus:border-seguranca-yellow focus:ring-seguranca-yellow">
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent className="bg-seguranca-black border-gray-600">
                  <SelectItem 
                    value="NENHUMA"
                    className="text-seguranca-lightgray hover:bg-seguranca-graphite"
                  >
                    Nenhuma categoria
                  </SelectItem>
                  {categories.filter(c => !!c && c.trim().length > 0).map((category) => (
                    <SelectItem 
                      key={category} 
                      value={category}
                      className="text-seguranca-lightgray hover:bg-seguranca-graphite"
                    >
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-xs text-gray-400 mt-1">
                Precisa de uma nova?{' '}
                <button type="button" className="text-seguranca-yellow underline" onClick={() => setNewCategoryModalOpen(true)}>
                  Cadastrar categoria
                </button>
              </div>
            </div>

            {/* Centro de Custo */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-seguranca-lightgray">Centro de Custo</label>
              <Select
                value={(formData.centroCusto && formData.centroCusto !== '') ? formData.centroCusto : 'NENHUM'}
                onValueChange={(value) => handleInputChange('centroCusto', value)}
              >
                <SelectTrigger className="border-gray-600 bg-seguranca-black text-seguranca-lightgray focus:border-seguranca-yellow focus:ring-seguranca-yellow">
                  <SelectValue placeholder="Selecione um centro de custo" />
                </SelectTrigger>
                <SelectContent className="bg-seguranca-black border-gray-600">
                  <SelectItem 
                    value="NENHUM"
                    className="text-seguranca-lightgray hover:bg-seguranca-graphite"
                  >
                    Nenhum centro de custo
                  </SelectItem>
                  {costCenters.map((center) => (
                    <SelectItem 
                      key={center} 
                      value={center}
                      className="text-seguranca-lightgray hover:bg-seguranca-graphite"
                    >
                      {center}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Código de Barras */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-seguranca-lightgray">Código de Barras</label>
              <Input
                value={formData.codigoBarras}
                onChange={(e) => handleInputChange('codigoBarras', e.target.value)}
                placeholder="Código de barras (opcional)"
                className="border-gray-600 bg-seguranca-black text-seguranca-lightgray placeholder:text-gray-400 focus:border-seguranca-yellow focus:ring-seguranca-yellow"
              />
            </div>

            {/* Observações */}
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-seguranca-lightgray">Observações</label>
              <Textarea
                value={formData.observacoes}
                onChange={(e) => handleInputChange('observacoes', e.target.value)}
                placeholder="Observações adicionais (opcional)"
                className="border-gray-600 bg-seguranca-black text-seguranca-lightgray placeholder:text-gray-400 focus:border-seguranca-yellow focus:ring-seguranca-yellow"
                rows={3}
              />
            </div>
          </div>

          {/* Pagamento */}
          {editMode && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-seguranca-yellow flex items-center gap-2">
                  <CalendarDays size={14} />
                  Data do Pagamento
                </label>
                 <DatePicker
                  date={paymentConfirmDate || undefined}
                  onDateChange={(date) => setPaymentConfirmDate(date || null)}
                  placeholder="dd/mm/aaaa"
                  className="w-full"
                />
                <p className="text-xs text-gray-400">Defina a data e confirme para marcar como paga.</p>
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={async () => {
                    if (!initialData?.id) return;
                    try {
                      const dateToSend = paymentConfirmDate || new Date();
                      await contasAPagarService.marcarComoPaga(initialData.id, dateToSend);
                      toast({ title: 'Sucesso', description: 'Conta marcada como Paga.' });
                      onSuccess();
                      onOpenChange(false);
                    } catch (error) {
                      console.error('Erro ao marcar como paga:', error);
                      toast({ title: 'Erro', description: 'Não foi possível marcar como paga.', variant: 'destructive' });
                    }
                  }}
                >
                  <CheckCircle className="mr-2 h-4 w-4" /> Confirmar Pagamento
                </Button>
              </div>
            </div>
          )}

          <div className="rounded-md border border-gray-600 bg-seguranca-black/40 p-3">
            <label className="text-sm font-medium text-seguranca-lightgray">Lançado por</label>
            <p className="mt-1 text-sm text-white">
              {editMode
                ? (initialData?.createdByName || formData.createdByName || 'Não registrado')
                : loggedInUserLabel}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {editMode
                ? 'Usuário que registrou este lançamento no sistema.'
                : 'Será registrado automaticamente com o usuário logado ao salvar.'}
            </p>
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-600">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-gray-600 text-white hover:bg-seguranca-black"
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-seguranca-red hover:bg-seguranca-darkred"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Salvando...
                </>
              ) : (
                <>
                  <Plus size={16} className="mr-2" />
                  {editMode ? 'Atualizar' : 'Criar'} Conta
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
      {/* Modal Novo Fornecedor */}
      <SupplierFormModal
        isOpen={supplierModalOpen}
        onClose={() => setSupplierModalOpen(false)}
        onSave={async (payload) => {
          await contasAPagarService.createFornecedor(payload);
          const data = await contasAPagarService.getFornecedores();
          setFornecedores(Array.isArray(data) ? data : []);
          setSupplierModalOpen(false);
        }}
      />

      {/* Modal Nova Categoria (simples) */}
      <Dialog open={newCategoryModalOpen} onOpenChange={setNewCategoryModalOpen}>
        <DialogContent className="sm:max-w-[400px] bg-seguranca-graphite border-gray-600 text-white">
          <DialogHeader>
            <DialogTitle className="text-seguranca-yellow">Nova Categoria</DialogTitle>
            <DialogDescription className="text-gray-300">Crie uma categoria para classificar a despesa</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Nome da categoria"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="border-gray-600 bg-seguranca-black text-seguranca-lightgray placeholder:text-gray-400 focus:border-seguranca-yellow focus:ring-seguranca-yellow"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setNewCategoryModalOpen(false)} className="border-gray-600 text-white">Cancelar</Button>
              <Button
                onClick={() => {
                  if (newCategoryName.trim()) {
                    setCategories(prev => Array.from(new Set([newCategoryName.trim(), ...prev])));
                    handleInputChange('categoria', newCategoryName.trim());
                  }
                  setNewCategoryModalOpen(false);
                  setNewCategoryName('');
                }}
                className="bg-seguranca-red hover:bg-seguranca-darkred"
              >
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};