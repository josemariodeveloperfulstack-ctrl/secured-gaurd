import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { CalendarDays, DollarSign, FileText, Upload, Plus, Users, Building2, Tag, CheckCircle, FolderTree } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import { formatDateForBackend, parseDateFromBackend } from '@/utils/dateUtils';
import { contasAPagarService, Supplier, CategoriaPai, Subcategoria } from '@/services/contasAPagarService';
import SupplierFormModal from '@/components/estoque/SupplierFormModal';
import { SupplierCombobox } from '@/components/ui/supplier-combobox';
import { EmployeeCombobox } from '@/components/ui/employee-combobox';
import { WorkSectorCombobox } from '@/components/ui/work-sector-combobox';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/axios';
import departmentService, { filterCompanyDepartments, isValidSectorName } from '@/services/departmentService';
import { employeeService } from '@/services/employeeService';

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

  // Modais de Cadastro de Categoria e Subcategoria no Plano de Contas
  const [newPlanoCategoriaModalOpen, setNewPlanoCategoriaModalOpen] = useState(false);
  const [newPlanoCategoriaNome, setNewPlanoCategoriaNome] = useState('');
  const [newPlanoCategoriaCodigo, setNewPlanoCategoriaCodigo] = useState('');
  const [savingPlanoCategoria, setSavingPlanoCategoria] = useState(false);

  const [newPlanoSubcategoriaModalOpen, setNewPlanoSubcategoriaModalOpen] = useState(false);
  const [newPlanoSubcategoriaNome, setNewPlanoSubcategoriaNome] = useState('');
  const [newPlanoSubcategoriaCodigo, setNewPlanoSubcategoriaCodigo] = useState('');
  const [newPlanoSubcategoriaRequerFuncionario, setNewPlanoSubcategoriaRequerFuncionario] = useState(false);
  const [savingPlanoSubcategoria, setSavingPlanoSubcategoria] = useState(false);

  // Helpers para cálculo automático do próximo código numérico sequencial
  const getNextCategoriaPaiCodigo = (cats: CategoriaPai[]): string => {
    if (!cats || cats.length === 0) return '01';
    const nums = cats
      .map(c => {
        const match = (c.codigo || '').trim().match(/^(\d+)/);
        return match ? parseInt(match[1], 10) : NaN;
      })
      .filter(n => !isNaN(n));
    const max = nums.length > 0 ? Math.max(...nums) : 0;
    return String(max + 1).padStart(2, '0');
  };

  const getNextSubcategoriaCodigo = (parentCodigo: string, subs: Subcategoria[], parentId: string): string => {
    const prefix = (parentCodigo || '').trim() || '01';
    const currentSubs = subs.filter(s => s.categoriaPaiId === parentId);
    if (currentSubs.length === 0) {
      return `${prefix}.01`;
    }
    const subNums = currentSubs
      .map(s => {
        const code = (s.codigo || '').trim();
        if (code.includes('.')) {
          const parts = code.split('.');
          const last = parts[parts.length - 1];
          const match = last.match(/(\d+)/);
          return match ? parseInt(match[1], 10) : NaN;
        }
        const match = code.match(/(\d+)$/);
        return match ? parseInt(match[1], 10) : NaN;
      })
      .filter(n => !isNaN(n));
    const max = subNums.length > 0 ? Math.max(...subNums) : 0;
    return `${prefix}.${String(max + 1).padStart(2, '0')}`;
  };

  const handleOpenNewPlanoCategoriaModal = () => {
    const nextCode = getNextCategoriaPaiCodigo(categoriasPai);
    setNewPlanoCategoriaCodigo(nextCode);
    setNewPlanoCategoriaNome('');
    setNewPlanoCategoriaModalOpen(true);
  };

  const handleSaveNewPlanoCategoria = async () => {
    if (!newPlanoCategoriaNome.trim()) {
      toast({
        title: "Erro",
        description: "Informe o nome da categoria.",
        variant: "destructive"
      });
      return;
    }
    if (!newPlanoCategoriaCodigo.trim()) {
      toast({
        title: "Erro",
        description: "Informe o código da categoria.",
        variant: "destructive"
      });
      return;
    }

    setSavingPlanoCategoria(true);
    try {
      const created = await contasAPagarService.createCategoriaPai({
        nome: newPlanoCategoriaNome.trim(),
        codigo: newPlanoCategoriaCodigo.trim()
      });

      const updatedCats = await contasAPagarService.getCategoriasPai();
      setCategoriasPai(Array.isArray(updatedCats) ? updatedCats : []);

      // Auto-selecionar a nova categoria criada
      setSelectedCategoriaPaiId(created.id);
      setSelectedSubcategoria(null);
      handleInputChange('subcategoriaId', '');

      toast({
        title: "Categoria criada!",
        description: `Categoria "${created.codigo} - ${created.nome}" cadastrada e selecionada com sucesso.`
      });
      setNewPlanoCategoriaModalOpen(false);
    } catch (error: any) {
      console.error('Erro ao criar categoria pai:', error);
      toast({
        title: "Erro",
        description: error?.response?.data?.message || "Erro ao cadastrar categoria. Verifique se o código já existe.",
        variant: "destructive"
      });
    } finally {
      setSavingPlanoCategoria(false);
    }
  };

  const handleOpenNewPlanoSubcategoriaModal = () => {
    if (!selectedCategoriaPaiId) {
      toast({
        title: "Atenção",
        description: "Selecione uma categoria pai antes de cadastrar a subcategoria.",
        variant: "destructive"
      });
      return;
    }
    const parentCat = categoriasPai.find(c => c.id === selectedCategoriaPaiId);
    const nextCode = getNextSubcategoriaCodigo(parentCat?.codigo || '01', subcategorias, selectedCategoriaPaiId);
    setNewPlanoSubcategoriaCodigo(nextCode);
    setNewPlanoSubcategoriaNome('');
    const isRH = (parentCat?.nome || '').toLowerCase().includes('rh') || (parentCat?.nome || '').toLowerCase().includes('pessoal') || parentCat?.codigo === '01';
    setNewPlanoSubcategoriaRequerFuncionario(isRH);
    setNewPlanoSubcategoriaModalOpen(true);
  };

  const handleSaveNewPlanoSubcategoria = async () => {
    if (!selectedCategoriaPaiId) {
      toast({
        title: "Erro",
        description: "Categoria pai não selecionada.",
        variant: "destructive"
      });
      return;
    }
    if (!newPlanoSubcategoriaNome.trim()) {
      toast({
        title: "Erro",
        description: "Informe o nome da subcategoria / conta.",
        variant: "destructive"
      });
      return;
    }
    if (!newPlanoSubcategoriaCodigo.trim()) {
      toast({
        title: "Erro",
        description: "Informe o código da subcategoria.",
        variant: "destructive"
      });
      return;
    }

    setSavingPlanoSubcategoria(true);
    try {
      const created = await contasAPagarService.createSubcategoria({
        categoriaPaiId: selectedCategoriaPaiId,
        nome: newPlanoSubcategoriaNome.trim(),
        codigo: newPlanoSubcategoriaCodigo.trim(),
        requerVinculoFuncionario: newPlanoSubcategoriaRequerFuncionario
      });

      const updatedSubs = await contasAPagarService.getSubcategorias();
      setSubcategorias(Array.isArray(updatedSubs) ? updatedSubs : []);

      // Auto-selecionar a nova subcategoria criada
      handleInputChange('subcategoriaId', created.id);
      setSelectedSubcategoria(created);
      if (created.requerVinculoFuncionario) {
        handleInputChange('fornecedorId', '');
        handleInputChange('fornecedor', '');
      } else {
        handleInputChange('employeeId', '');
      }

      toast({
        title: "Subcategoria criada!",
        description: `Conta "${created.codigo} - ${created.nome}" cadastrada e selecionada com sucesso.`
      });
      setNewPlanoSubcategoriaModalOpen(false);
    } catch (error: any) {
      console.error('Erro ao criar subcategoria:', error);
      toast({
        title: "Erro",
        description: error?.response?.data?.message || "Erro ao cadastrar subcategoria. Verifique se o código já existe.",
        variant: "destructive"
      });
    } finally {
      setSavingPlanoSubcategoria(false);
    }
  };

  const loggedInUserLabel = useMemo(() => {
    if (!user) return 'Usuário Logado';
    const name = user.name || user.username || 'Usuário Logado';
    const role = user.role ? ` (${user.role.replace(/_/g, ' ')})` : '';
    return `${name}${role}`;
  }, [user]);

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
          const centrosArray = (Array.isArray(data) ? data : [])
            .map(v => (v ?? '').toString().trim())
            .filter(v => v.length > 0 && v.length <= 100);
          const uniqueCentros = Array.from(new Set(centrosArray));
          setCostCenters(uniqueCentros);
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
          workSector: initialData.workSector || '',
          createdById: initialData.createdById || '',
          createdByName: initialData.createdByName || ''
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

  // Combina setores sugeridos (Postos/Departamentos) e Centros de Custo em uma única lista sem repetições (sem duplicados no VPS/Local)
  const sectoresEOptionLista = React.useMemo(() => {
    const rawList: string[] = [];

    if (Array.isArray(setoresSugeridos)) {
      setoresSugeridos.forEach((s) => {
        if (s && typeof s === 'string' && s.trim()) {
          rawList.push(s.trim());
        }
      });
    }

    if (Array.isArray(costCenters)) {
      costCenters.forEach((cc) => {
        if (cc && typeof cc === 'string' && cc.trim()) {
          rawList.push(cc.trim());
        }
      });
    }

    if (formData.workSector && typeof formData.workSector === 'string' && formData.workSector.trim()) {
      rawList.push(formData.workSector.trim());
    }

    const seenLower = new Set<string>();
    const result: string[] = [];

    for (const item of rawList) {
      const lower = item.toLowerCase();
      if (!seenLower.has(lower)) {
        seenLower.add(lower);
        result.push(item);
      }
    }

    return result.sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [setoresSugeridos, costCenters, formData.workSector]);

  const requiresEmployee = Boolean(selectedSubcategoria?.requerVinculoFuncionario);
  const requiresSupplier = !requiresEmployee;

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
    } catch (error: any) {
      console.error('Erro ao salvar conta:', error);
      const apiMessage = error?.response?.data?.message 
        || (error?.response?.data?.fieldErrors ? Object.values(error.response.data.fieldErrors).join('; ') : null)
        || error?.response?.data?.error
        || error?.message
        || "Erro ao salvar conta a pagar. Tente novamente.";
      toast({
        title: "Erro ao salvar conta",
        description: apiMessage,
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
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-seguranca-lightgray">Categoria *</label>
                    <button
                      type="button"
                      onClick={handleOpenNewPlanoCategoriaModal}
                      className="text-xs text-seguranca-yellow hover:underline flex items-center gap-1 font-medium transition-colors"
                      title="Cadastrar nova categoria no Plano de Contas"
                    >
                      <Plus size={13} />
                      <span>Cadastrar categoria</span>
                    </button>
                  </div>
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
                      Nenhuma categoria cadastrada. Cadastre clicando em "+ Cadastrar categoria" acima.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-seguranca-lightgray">Conta / Subcategoria *</label>
                    <button
                      type="button"
                      onClick={handleOpenNewPlanoSubcategoriaModal}
                      disabled={!selectedCategoriaPaiId}
                      className="text-xs text-seguranca-yellow hover:underline flex items-center gap-1 font-medium disabled:opacity-40 disabled:hover:no-underline disabled:cursor-not-allowed transition-colors"
                      title={!selectedCategoriaPaiId ? 'Selecione uma categoria primeiro' : 'Cadastrar nova subcategoria no Plano de Contas'}
                    >
                      <Plus size={13} />
                      <span>Cadastrar subcategoria</span>
                    </button>
                  </div>
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
                    placeholder="Busque o funcionário pelo nome (ex: Gabriel)"
                    onEmployeeSelect={async (emp) => {
                      const applyEmployeeData = (employeeData: any) => {
                        const updates: Partial<ContaAPagar> = {
                          employeeId: employeeData.id || emp.id
                        };

                        // 1. Preencher Empresa a partir do cadastro do funcionário
                        const targetCompanyId = employeeData.companyId || employeeData.company?.id;
                        const targetCompanySigla = employeeData.companySigla || employeeData.company?.sigla || '';
                        const targetCompanyName = employeeData.companyName || employeeData.company?.name || '';

                        const matchEmpresa = empresas.find((e: any) => {
                          if (targetCompanyId && String(e.id) === String(targetCompanyId)) return true;
                          if (targetCompanySigla && e.sigla && e.sigla.trim().toLowerCase() === targetCompanySigla.trim().toLowerCase()) return true;
                          if (targetCompanyName && e.name && e.name.trim().toLowerCase() === targetCompanyName.trim().toLowerCase()) return true;
                          return false;
                        });

                        if (matchEmpresa) {
                          updates.empresaId = matchEmpresa.id;
                          updates.empresa = matchEmpresa.name;
                          updates.companySigla = matchEmpresa.sigla || matchEmpresa.name;
                        } else if (targetCompanySigla || targetCompanyName || targetCompanyId) {
                          updates.empresaId = targetCompanyId ? String(targetCompanyId) : '';
                          updates.empresa = targetCompanyName;
                          updates.companySigla = targetCompanySigla || targetCompanyName;
                        }

                        // 2. Preencher Unidade a partir do cadastro do funcionário
                        const targetUnitName = employeeData.unitName || employeeData.unit?.name;
                        const targetUnitId = employeeData.unitId || employeeData.unit?.id;
                        if (targetUnitId || targetUnitName) {
                          const matchUnit = unidades.find((u: any) =>
                            (targetUnitId && String(u.id) === String(targetUnitId)) ||
                            (targetUnitName && (u.name || '').toLowerCase() === targetUnitName.toLowerCase())
                          );
                          if (matchUnit) {
                            updates.unitId = matchUnit.id;
                            updates.unitName = matchUnit.name;
                          } else if (targetUnitName) {
                            updates.unitName = targetUnitName;
                            if (targetUnitId) updates.unitId = String(targetUnitId);
                          }
                        }

                        // 3. Preencher Setor de Trabalho a partir do cadastro do funcionário (workPost > department)
                        const suggestedSector = employeeData.workPostName
                          || employeeData.workPost?.name
                          || employeeData.departmentName
                          || employeeData.department?.name;

                        if (suggestedSector) {
                          updates.workSector = suggestedSector;
                          setWorkSectorAutoFilled(true);
                        } else {
                          setWorkSectorAutoFilled(false);
                        }

                        setFormData(prev => ({
                          ...prev,
                          ...updates
                        }));

                        return {
                          hasCompany: !!(matchEmpresa || targetCompanySigla || targetCompanyName),
                          hasSector: !!suggestedSector
                        };
                      };

                      // Aplica imediatamente com os dados disponíveis
                      const initialResult = applyEmployeeData(emp);

                      // Se faltou empresa ou setor de trabalho, busca o cadastro completo do funcionário
                      if ((!initialResult.hasCompany || !initialResult.hasSector) && emp.id) {
                        try {
                          const fullEmployee = await employeeService.getEmployeeById(emp.id);
                          if (fullEmployee) {
                            applyEmployeeData(fullEmployee);
                          }
                        } catch (err) {
                          console.warn('Não foi possível obter dados detalhados do funcionário:', err);
                        }
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

            {/* Fornecedor */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-seguranca-lightgray">
                Fornecedor {requiresSupplier ? '*' : '(opcional para Pessoal / RH)'}
              </label>
              <SupplierCombobox
                suppliers={fornecedores}
                value={formData.fornecedorId}
                fallbackDisplayName={formData.fornecedor}
                onValueChange={(id, supplier) => {
                  handleInputChange('fornecedorId', id);
                  handleInputChange('fornecedor', supplier?.name || '');
                }}
                onAddNewSupplier={() => setSupplierModalOpen(true)}
                placeholder="Selecione um fornecedor"
                required={requiresSupplier}
              />
              <div className="flex items-center justify-between text-xs text-gray-400 mt-1">
                <span>Não encontrou na lista?</span>
                <button
                  type="button"
                  className="text-seguranca-yellow hover:underline font-medium cursor-pointer"
                  onClick={() => setSupplierModalOpen(true)}
                >
                  + Cadastrar fornecedor
                </button>
              </div>
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
              <WorkSectorCombobox
                sectors={sectoresEOptionLista}
                value={formData.workSector || ''}
                onValueChange={(value) => {
                  handleInputChange('workSector', value);
                  setWorkSectorAutoFilled(false); // usuário alterou manualmente
                }}
                minSearchChars={3}
                placeholder="Selecione o setor de trabalho"
                searchPlaceholder="Digite pelo menos 3 caracteres para buscar..."
                autoFilled={workSectorAutoFilled}
              />
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

          <div className="rounded-md border border-gray-700 bg-gray-900/70 p-3">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Lançado por</label>
            <p className="mt-1 text-sm font-bold text-seguranca-yellow flex items-center gap-1.5">
              <span>{editMode ? (initialData?.createdByName || formData.createdByName || loggedInUserLabel) : loggedInUserLabel}</span>
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {editMode && (initialData?.createdByName || formData.createdByName)
                ? 'Usuário que registrou este lançamento no sistema.'
                : 'Este lançamento será registrado automaticamente no nome do usuário logado ao salvar.'}
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

      {/* Modal Nova Categoria - Plano de Contas */}
      <Dialog open={newPlanoCategoriaModalOpen} onOpenChange={setNewPlanoCategoriaModalOpen}>
        <DialogContent className="sm:max-w-[450px] bg-seguranca-graphite border-gray-600 text-white">
          <DialogHeader>
            <DialogTitle className="text-seguranca-yellow flex items-center gap-2">
              <FolderTree size={18} />
              Nova Categoria (Plano de Contas)
            </DialogTitle>
            <DialogDescription className="text-gray-300">
              Cadastre uma nova categoria principal no Plano de Contas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-xs font-medium text-seguranca-lightgray">Código Sequencial *</label>
              <Input
                placeholder="Ex: 07"
                value={newPlanoCategoriaCodigo}
                onChange={(e) => setNewPlanoCategoriaCodigo(e.target.value)}
                className="border-gray-600 bg-seguranca-black text-seguranca-lightgray placeholder:text-gray-500 focus:border-seguranca-yellow focus:ring-seguranca-yellow"
              />
              <p className="text-[11px] text-gray-400">
                Calculado automaticamente na ordem numérica sequencial.
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-seguranca-lightgray">Nome da Categoria *</label>
              <Input
                placeholder="Ex: Impostos e Taxas"
                value={newPlanoCategoriaNome}
                onChange={(e) => setNewPlanoCategoriaNome(e.target.value)}
                className="border-gray-600 bg-seguranca-black text-seguranca-lightgray placeholder:text-gray-500 focus:border-seguranca-yellow focus:ring-seguranca-yellow"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setNewPlanoCategoriaModalOpen(false)}
                className="border-gray-600 text-white hover:bg-seguranca-black"
                disabled={savingPlanoCategoria}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleSaveNewPlanoCategoria}
                disabled={savingPlanoCategoria}
                className="bg-seguranca-red hover:bg-seguranca-darkred"
              >
                {savingPlanoCategoria ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Salvando...
                  </>
                ) : (
                  'Salvar Categoria'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Nova Subcategoria - Plano de Contas */}
      <Dialog open={newPlanoSubcategoriaModalOpen} onOpenChange={setNewPlanoSubcategoriaModalOpen}>
        <DialogContent className="sm:max-w-[480px] bg-seguranca-graphite border-gray-600 text-white">
          <DialogHeader>
            <DialogTitle className="text-seguranca-yellow flex items-center gap-2">
              <Plus size={18} />
              Nova Subcategoria (Plano de Contas)
            </DialogTitle>
            <DialogDescription className="text-gray-300">
              Cadastre uma nova conta vinculada à categoria selecionada.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Categoria Pai selecionada */}
            <div className="rounded-md border border-seguranca-yellow/30 bg-seguranca-black/40 p-2.5 text-xs text-seguranca-lightgray">
              <span className="text-gray-400">Categoria Pai: </span>
              <span className="font-semibold text-seguranca-yellow">
                {categoriasPai.find(c => c.id === selectedCategoriaPaiId)?.codigo} - {categoriasPai.find(c => c.id === selectedCategoriaPaiId)?.nome}
              </span>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-seguranca-lightgray">Código Sequencial *</label>
              <Input
                placeholder="Ex: 01.05"
                value={newPlanoSubcategoriaCodigo}
                onChange={(e) => setNewPlanoSubcategoriaCodigo(e.target.value)}
                className="border-gray-600 bg-seguranca-black text-seguranca-lightgray placeholder:text-gray-500 focus:border-seguranca-yellow focus:ring-seguranca-yellow"
              />
              <p className="text-[11px] text-gray-400">
                Calculado automaticamente na sequência numérica desta categoria.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-seguranca-lightgray">Nome da Subcategoria / Conta *</label>
              <Input
                placeholder="Ex: Gratificação / Premiação"
                value={newPlanoSubcategoriaNome}
                onChange={(e) => setNewPlanoSubcategoriaNome(e.target.value)}
                className="border-gray-600 bg-seguranca-black text-seguranca-lightgray placeholder:text-gray-500 focus:border-seguranca-yellow focus:ring-seguranca-yellow"
                autoFocus
              />
            </div>

            <div className="flex items-start space-x-3 rounded-md border border-gray-700 bg-seguranca-black/60 p-3">
              <Checkbox
                id="reqFuncPlano"
                checked={newPlanoSubcategoriaRequerFuncionario}
                onCheckedChange={(checked) => setNewPlanoSubcategoriaRequerFuncionario(!!checked)}
                className="mt-0.5 border-gray-500 data-[state=checked]:bg-seguranca-yellow data-[state=checked]:text-black"
              />
              <div className="space-y-1 leading-none">
                <label htmlFor="reqFuncPlano" className="text-xs font-medium text-seguranca-lightgray cursor-pointer">
                  Requer vínculo com funcionário
                </label>
                <p className="text-[11px] text-gray-400">
                  Marque se esta conta exige selecionar o funcionário beneficiário (ex.: rescisão, vale, adiantamento, folha de pagamento).
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setNewPlanoSubcategoriaModalOpen(false)}
                className="border-gray-600 text-white hover:bg-seguranca-black"
                disabled={savingPlanoSubcategoria}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleSaveNewPlanoSubcategoria}
                disabled={savingPlanoSubcategoria}
                className="bg-seguranca-red hover:bg-seguranca-darkred"
              >
                {savingPlanoSubcategoria ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Salvando...
                  </>
                ) : (
                  'Salvar Subcategoria'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};