import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  CalendarDays, 
  DollarSign, 
  FileText, 
  Plus, 
  Users, 
  Building2, 
  Tag, 
  MapPin, 
  FolderTree, 
  Scale, 
  CheckCircle2, 
  Info, 
  Layers,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { DatePicker } from '@/components/ui/date-picker';
import { contasAReceberService, Client } from '@/services/contasAReceberService';
import { contasAPagarService, CategoriaPai, Subcategoria } from '@/services/contasAPagarService';
import { measurementService } from '@/services/measurementService';
import { workPostService } from '@/services/workPostService';
import type { WorkPost } from '@/services/workPostService';
import { ClientSearchCombobox } from '@/components/ui/client-search-combobox';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import type { MeasurementBulletin } from '@/types/measurement';
import { cn } from '@/lib/utils';

export interface ContaAReceber {
  id?: string;
  numeroFatura?: string;
  dataEmissao?: Date;
  vencimento: Date;
  cliente: string;
  clienteId?: string;
  empresa?: string;
  empresaId?: string;
  descricao: string;
  tipo: 'FATURA' | 'MEDICAO' | 'SERVICO' | 'PRODUTO';
  valor: number;
  codigoBarras?: string;
  status: 'ABERTA' | 'RECEBIDA' | 'VENCIDA' | 'CANCELADA';
  baixa: boolean;
  dataPagamento?: Date;
  observacoes?: string;
  comprovante?: File;
  categoria?: string | undefined;
  workPostId?: string | undefined;
  workPostName?: string | undefined;
  paymentMethod?: string; // PaymentMethod enum: PIX, BOLETO, TRANSFER, CASH, CARD
  measurementId?: string; // FK para o Boletim de Medição (opcional)
  measurementNumber?: string; // Texto livre da medição (ex.: número, contrato)
  measurementInfo?: string; // Texto amigável devolvido pelo backend
  subcategoriaId?: string | undefined;
  subcategoriaNome?: string | undefined;
  subcategoriaCodigo?: string | undefined;
  categoriaPaiNome?: string | undefined;
  categoriaPaiCodigo?: string | undefined;
  createdAt?: Date;
}

interface ContasAReceberFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editMode?: boolean;
  initialData?: ContaAReceber | null;
}

export const ContasAReceberFormModal: React.FC<ContasAReceberFormModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
  editMode = false,
  initialData = null
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<Client[]>([]);
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [medicoes, setMedicoes] = useState<MeasurementBulletin[]>([]);
  const [medicoesLoading, setMedicoesLoading] = useState(false);
  
  const [clientWorkPosts, setClientWorkPosts] = useState<WorkPost[]>([]);
  const [workPostsLoading, setWorkPostsLoading] = useState(false);
  const [autoInvoiceNumber, setAutoInvoiceNumber] = useState(false);
  
  const [formData, setFormData] = useState<ContaAReceber>({
    numeroFatura: '',
    dataEmissao: new Date(),
    vencimento: new Date(),
    cliente: '',
    clienteId: '',
    empresa: '',
    empresaId: '',
    descricao: '',
    tipo: 'FATURA',
    valor: 0,
    status: 'ABERTA',
    baixa: false,
    dataPagamento: undefined,
    observacoes: '',
    categoria: 'INVOICE',
    workPostId: undefined,
    workPostName: undefined,
    paymentMethod: 'PIX',
    measurementId: undefined,
    measurementNumber: '',
    subcategoriaId: undefined
  });

  const [categories, setCategories] = useState<string[]>([]);
  const [newCategoryModalOpen, setNewCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Plano de Contas state
  const [categoriasPai, setCategoriasPai] = useState<CategoriaPai[]>([]);
  const [subcategorias, setSubcategorias] = useState<Subcategoria[]>([]);
  const [selectedCategoriaPaiId, setSelectedCategoriaPaiId] = useState<string>('');

  // Modais de Cadastro Rápido de Plano de Contas
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
    if (!cats || cats.length === 0) return '05';
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
    const prefix = (parentCodigo || '').trim() || '05';
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
        description: "Selecione uma categoria de receita antes de cadastrar a subcategoria.",
        variant: "destructive"
      });
      return;
    }
    const parentCat = categoriasPai.find(c => c.id === selectedCategoriaPaiId);
    const nextCode = getNextSubcategoriaCodigo(parentCat?.codigo || '05', subcategorias, selectedCategoriaPaiId);
    setNewPlanoSubcategoriaCodigo(nextCode);
    setNewPlanoSubcategoriaNome('');
    setNewPlanoSubcategoriaRequerFuncionario(false);
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
        description: "Informe o nome da conta de receita.",
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

      toast({
        title: "Conta de receita criada!",
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

  // Limpa termos corporativos e acentos, e gera sigla amigável do cliente (3 a 5 letras em maiúsculas)
  const obterSiglaCliente = (nome: string): string => {
    if (!nome) return '';
    const limpo = nome
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/\b(LTDA|S\.?A\.?|ME|EPP|EIRELI|LIMITADA|SA|INC|CORP|GROUP|GRUPO)\b/gi, '') // Remove termos corporativos
      .replace(/[^A-Z0-9\s]/g, '') // Remove caracteres especiais
      .trim();

    const palavras = limpo.split(/\s+/).filter(p => p.length > 0);
    if (palavras.length >= 3) {
      return palavras.slice(0, 4).map(p => p[0]).join('');
    } else if (palavras.length === 2) {
      return (palavras[0].substring(0, 2) + palavras[1].substring(0, 2)).substring(0, 4);
    } else if (palavras.length === 1) {
      return palavras[0].substring(0, 4);
    }
    return 'FAT';
  };

  // Busca faturas do cliente na API, encontra o maior sequencial no padrão prefixo e soma 1
  const gerarNumeroFaturaAutomatica = async (clientId: string, clientName: string, dataEmissao: Date) => {
    if (!clientId || !clientName) return;
    try {
      const sigla = obterSiglaCliente(clientName);
      const ano = (dataEmissao || new Date()).getFullYear();
      const prefixo = `${sigla}-${ano}`;

      const faturas = await contasAReceberService.getContasAReceber({ clienteId: clientId });
      
      let maxSequencial = 0;
      if (Array.isArray(faturas)) {
        faturas.forEach(f => {
          const num = f.numeroFatura || '';
          if (num.toUpperCase().startsWith(prefixo.toUpperCase())) {
            const partes = num.split('-');
            if (partes.length === 3) {
              const seq = parseInt(partes[2], 10);
              if (!isNaN(seq) && seq > maxSequencial) {
                maxSequencial = seq;
              }
            }
          }
        });
      }

      const novoSequencial = String(maxSequencial + 1).padStart(3, '0');
      const novoNumero = `${prefixo}-${novoSequencial}`;
      
      setFormData(prev => ({
        ...prev,
        numeroFatura: novoNumero
      }));
    } catch (error) {
      console.error('Erro ao gerar número da fatura automática:', error);
    }
  };

  // Carrega os postos de trabalho ativos do cliente selecionado
  const carregarPostosDoCliente = async (clientId: string, selectedPostId?: string) => {
    if (!clientId) {
      setClientWorkPosts([]);
      return;
    }
    setWorkPostsLoading(true);
    try {
      const posts = await workPostService.getWorkPostsByClient(clientId);
      const ativos = (posts || []).filter((post: WorkPost) => {
        const status = post.status ? String(post.status).toUpperCase() : 'ATIVO';
        return status === 'ATIVO' || status === 'ACTIVE';
      });
      
      setClientWorkPosts(ativos);

      // Autopreenchimento: se houver exatamente 1 posto ativo, seleciona-o automaticamente
      if (ativos.length === 1 && !selectedPostId) {
        setFormData(prev => ({
          ...prev,
          workPostId: ativos[0].id,
          workPostName: ativos[0].name
        }));
      } else if (selectedPostId) {
        const post = ativos.find(p => p.id === selectedPostId);
        if (post) {
          setFormData(prev => ({
            ...prev,
            workPostId: post.id,
            workPostName: post.name
          }));
        }
      }
    } catch (error) {
      console.error('Erro ao buscar postos de trabalho do cliente:', error);
      setClientWorkPosts([]);
    } finally {
      setWorkPostsLoading(false);
    }
  };

  // Manipula mudança de cliente
  const handleClienteChange = (clientId: string) => {
    const clienteObj = clientes.find(c => c.id === clientId);
    const nomeCliente = clienteObj?.name || '';

    setFormData(prev => ({
      ...prev,
      clienteId: clientId,
      cliente: nomeCliente,
      workPostId: undefined, // Limpa o posto de trabalho anterior
      workPostName: undefined
    }));

    if (clientId) {
      carregarPostosDoCliente(clientId);
    } else {
      setClientWorkPosts([]);
    }
  };

  // Efeito reativo para gerar a fatura automática
  useEffect(() => {
    if (autoInvoiceNumber && formData.clienteId && formData.cliente) {
      gerarNumeroFaturaAutomatica(formData.clienteId, formData.cliente, formData.dataEmissao || new Date());
    }
  }, [autoInvoiceNumber, formData.clienteId, formData.cliente, formData.dataEmissao]);

  // Efeito reativo para carregar postos de trabalho
  useEffect(() => {
    if (open && formData.clienteId) {
      carregarPostosDoCliente(formData.clienteId, formData.workPostId);
    } else if (open && !formData.clienteId) {
      setClientWorkPosts([]);
    }
  }, [open, formData.clienteId]);

  // Carregar dados quando o modal abrir
  useEffect(() => {
    if (open) {
      // Carregar clientes
      contasAReceberService.getClientes()
        .then(data => {
          const clientesArray = Array.isArray(data) ? data : [];
          setClientes(clientesArray);
        })
        .catch(error => {
          console.error('Erro ao carregar clientes:', error);
          setClientes([
            { id: '1', name: 'Cliente Exemplo 1', isActive: true },
            { id: '2', name: 'Cliente Exemplo 2', isActive: true }
          ]);
        });

      // Carregar empresas
      contasAReceberService.getEmpresas()
        .then(data => {
          const empresasArray = Array.isArray(data) ? data : [];
          setEmpresas(empresasArray);
          // Se houver empresas e não estiver em edição, auto-seleciona a primeira
          if (!editMode && empresasArray.length > 0 && !formData.empresaId) {
            setFormData(prev => ({
              ...prev,
              empresaId: empresasArray[0].id,
              empresa: empresasArray[0].sigla || empresasArray[0].name
            }));
          }
        })
        .catch(error => {
          console.error('Erro ao carregar empresas:', error);
          setEmpresas([]);
        });

      // Carregar boletins de medição
      setMedicoesLoading(true);
      measurementService.getBulletins()
        .then(data => {
          setMedicoes(Array.isArray(data) ? data : []);
        })
        .catch(error => {
          console.error('Erro ao carregar boletins de medição:', error);
          setMedicoes([]);
        })
        .finally(() => setMedicoesLoading(false));

      // Carregar Plano de Contas
      contasAPagarService.getCategoriasPai()
        .then(data => {
          const cats = Array.isArray(data) ? data : [];
          setCategoriasPai(cats);
          // Se não estiver em modo edição e não houver categoria selecionada, auto-seleciona a categoria de Receitas (05)
          if (!editMode && cats.length > 0 && !selectedCategoriaPaiId) {
            const receitaCat = cats.find(c => 
              c.codigo === '05' || 
              c.nome.toLowerCase().includes('receita') || 
              c.nome.toLowerCase().includes('prestação de serviço') ||
              c.nome.toLowerCase().includes('serviço')
            );
            if (receitaCat) {
              setSelectedCategoriaPaiId(receitaCat.id);
            }
          }
        })
        .catch(() => setCategoriasPai([]));

      contasAPagarService.getSubcategorias()
        .then(data => setSubcategorias(Array.isArray(data) ? data : []))
        .catch(() => setSubcategorias([]));
    }
  }, [open]);

  // Atualizar dados do formulário quando initialData mudar
  useEffect(() => {
    if (open) {
      if (editMode && initialData) {
        const valor = initialData.amount || initialData.valor || 0;
        const vencimento = initialData.dueDate || initialData.vencimento || new Date();
        const dataEmissao = initialData.dataEmissao || new Date();
        const numeroFatura = initialData.invoiceNumber || initialData.numeroFatura || '';
        const clienteId = initialData.clienteId || initialData.client?.id || '';
        const cliente = initialData.client?.name || initialData.cliente || '';
        const empresaId = initialData.empresaId || initialData.unitId || '';
        const empresa = initialData.empresa || initialData.unitSigla || initialData.unitName || '';
        
        let categoriaMapeada = undefined;
        if (initialData.categoria) {
          const catStr = String(initialData.categoria).toUpperCase();
          const validCategories = ['INVOICE', 'NOTE', 'ADVANCE', 'SERVICE', 'PRODUCT', 'OTHER'];
          if (validCategories.includes(catStr)) {
            categoriaMapeada = catStr;
          } else {
            categoriaMapeada = initialData.categoria;
          }
        }
        
        setFormData({
          id: initialData.id,
          numeroFatura: numeroFatura,
          dataEmissao: dataEmissao instanceof Date ? dataEmissao : new Date(dataEmissao),
          vencimento: vencimento instanceof Date ? vencimento : new Date(vencimento),
          cliente: cliente,
          clienteId: clienteId,
          empresa: empresa,
          empresaId: empresaId,
          descricao: initialData.descricao || '',
          tipo: initialData.tipo || 'FATURA',
          valor: typeof valor === 'number' ? valor : parseFloat(valor.toString()) || 0,
          codigoBarras: initialData.codigoBarras || '',
          status: initialData.status || 'ABERTA',
          baixa: initialData.baixa || false,
          dataPagamento: initialData.dataPagamento ? (initialData.dataPagamento instanceof Date ? initialData.dataPagamento : new Date(initialData.dataPagamento)) : undefined,
          observacoes: initialData.observacoes || '',
          categoria: categoriaMapeada,
          workPostId: initialData.workPostId || undefined,
          workPostName: initialData.workPostName || undefined,
          paymentMethod: initialData.paymentMethod || 'PIX',
          measurementId: initialData.measurementId || undefined,
          measurementNumber: initialData.measurementNumber || '',
          subcategoriaId: initialData.subcategoriaId || undefined
        });
      } else {
        // Resetar formulário para modo de criação
        setFormData({
          numeroFatura: '',
          dataEmissao: new Date(),
          vencimento: new Date(),
          cliente: '',
          clienteId: '',
          empresa: '',
          empresaId: '',
          descricao: '',
          tipo: 'FATURA',
          valor: 0,
          status: 'ABERTA',
          baixa: false,
          dataPagamento: undefined,
          observacoes: '',
          categoria: 'INVOICE',
          workPostId: undefined,
          workPostName: undefined,
          paymentMethod: 'PIX',
          measurementId: undefined,
          measurementNumber: '',
          subcategoriaId: undefined
        });
        setAutoInvoiceNumber(false);
      }
    }
  }, [editMode, initialData, open]);

  // Restaurar Plano de Contas quando subcategorias carregarem (edição)
  useEffect(() => {
    if (!open || !editMode || !initialData?.subcategoriaId || subcategorias.length === 0) return;
    const sub = subcategorias.find((s) => s.id === initialData.subcategoriaId);
    if (sub) {
      setSelectedCategoriaPaiId(sub.categoriaPaiId);
    }
  }, [open, editMode, initialData?.subcategoriaId, subcategorias]);

  // Subcategorias filtradas da categoria pai selecionada
  const filteredSubcategorias = useMemo(() => {
    if (!selectedCategoriaPaiId) return [];
    return subcategorias.filter((s) => s.categoriaPaiId === selectedCategoriaPaiId);
  }, [selectedCategoriaPaiId, subcategorias]);

  // Categorias de Receitas prioritárias (05, 06, ou que tenham receita/faturamento/serviço no nome)
  const { categoriasReceitas, outrasCategorias } = useMemo(() => {
    const receitas: CategoriaPai[] = [];
    const outras: CategoriaPai[] = [];

    categoriasPai.forEach(cat => {
      const code = (cat.codigo || '').trim();
      const nome = (cat.nome || '').toLowerCase();
      if (code === '05' || code === '06' || nome.includes('receita') || nome.includes('prestação de serviço') || nome.includes('faturamento')) {
        receitas.push(cat);
      } else {
        outras.push(cat);
      }
    });

    return { categoriasReceitas: receitas, outrasCategorias: outras };
  }, [categoriasPai]);

  // Atualizar clienteId e empresaId quando clientes e empresas forem carregados (modo edição)
  useEffect(() => {
    if (open && editMode && initialData) {
      if (clientes.length > 0) {
        if (initialData.clienteId) {
          const clienteEncontrado = clientes.find(c => c.id === initialData.clienteId || c.id === String(initialData.clienteId));
          if (clienteEncontrado) {
            setFormData(prev => ({
              ...prev,
              clienteId: clienteEncontrado.id,
              cliente: clienteEncontrado.name
            }));
          }
        } else if (initialData.cliente || initialData.client?.name) {
          const clienteEncontrado = clientes.find(c => 
            c.name === initialData.cliente || 
            c.name === initialData.client?.name ||
            c.id === initialData.client?.id
          );
          if (clienteEncontrado) {
            setFormData(prev => ({
              ...prev,
              clienteId: clienteEncontrado.id,
              cliente: clienteEncontrado.name
            }));
          }
        }
      }

      if (empresas.length > 0) {
        if (initialData.empresaId || initialData.unitId) {
          const empresaIdToFind = initialData.empresaId || initialData.unitId;
          const empresaEncontrada = empresas.find(e => 
            String(e.id) === String(empresaIdToFind) ||
            e.id === empresaIdToFind
          );
          if (empresaEncontrada) {
            setFormData(prev => ({
              ...prev,
              empresaId: empresaEncontrada.id,
              empresa: empresaEncontrada.sigla || empresaEncontrada.name
            }));
          }
        } else if (initialData.empresa || initialData.unitSigla || initialData.unitName) {
          const empresaToFind = initialData.empresa || initialData.unitSigla || initialData.unitName;
          const empresaEncontrada = empresas.find(e => 
            e.sigla === empresaToFind || 
            e.name === empresaToFind ||
            e.sigla?.toUpperCase() === empresaToFind?.toUpperCase() ||
            e.name?.toUpperCase() === empresaToFind?.toUpperCase()
          );
          if (empresaEncontrada) {
            setFormData(prev => ({
              ...prev,
              empresaId: empresaEncontrada.id,
              empresa: empresaEncontrada.sigla || empresaEncontrada.name
            }));
          }
        }
      }
    }
  }, [open, editMode, initialData, clientes, empresas]);

  const handleInputChange = (field: keyof ContaAReceber, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleMedicaoChange = (medicaoId: string) => {
    if (medicaoId === 'NENHUMA') {
      setFormData(prev => ({ ...prev, measurementId: undefined, measurementNumber: '' }));
      return;
    }
    const m = medicoes.find(x => String(x.id) === medicaoId);
    if (!m) {
      setFormData(prev => ({ ...prev, measurementId: medicaoId }));
      return;
    }
    setFormData(prev => ({
      ...prev,
      measurementId: medicaoId,
      measurementNumber: m.nfNumber || m.contractNumber || prev.measurementNumber || ''
    }));
  };

  const medicoesOrdenadas = useMemo(() => {
    if (!formData.clienteId) return medicoes;
    const clienteIdStr = String(formData.clienteId);
    const doCliente = medicoes.filter(m => String(m.clientId ?? m.client?.id ?? '') === clienteIdStr);
    const outras = medicoes.filter(m => String(m.clientId ?? m.client?.id ?? '') !== clienteIdStr);
    return [...doCliente, ...outras];
  }, [medicoes, formData.clienteId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.cliente || !formData.descricao || !formData.valor || !formData.vencimento) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios (*)",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      if (editMode && initialData?.id) {
        await contasAReceberService.updateContaAReceber(initialData.id, formData);
        toast({
          title: "Sucesso",
          description: "Conta a receber atualizada com sucesso!"
        });
      } else {
        await contasAReceberService.createContaAReceber(formData);
        toast({
          title: "Sucesso",
          description: "Conta a receber criada com sucesso!"
        });
      }
      
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao salvar conta:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar conta a receber. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        onCloseAutoFocus={(e) => e.preventDefault()}
        className="max-w-4xl max-h-[90vh] overflow-y-auto bg-seguranca-graphite border-gray-600 text-white"
      >
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold text-green-400 flex items-center gap-2">
              <Plus size={20} />
              {editMode ? 'Editar Conta a Receber' : 'Nova Conta a Receber (Faturamento / Prestação de Serviços)'}
            </DialogTitle>
          </div>
          <DialogDescription className="text-gray-300 text-xs">
            Registro contábil de receitas auferidas pela prestação de serviços a clientes, com identificação precisa dos Centros de Custo (Origem Pagadora e Destino Recebedor).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-7 pt-2">
          
          {/* Seção 1: Identificação da Fatura e Datas */}
          <div className="space-y-4 rounded-xl border border-gray-700 bg-seguranca-black/40 p-4">
            <h3 className="text-sm font-semibold text-seguranca-yellow flex items-center gap-2 uppercase tracking-wider">
              <FileText size={16} />
              Identificação do Faturamento e Prazos
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Número da Fatura */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-seguranca-lightgray flex items-center gap-1.5">
                    <FileText size={13} />
                    Número da Fatura / Nota Fiscal
                  </label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-gray-400 font-medium">Automática</span>
                    <Switch
                      checked={autoInvoiceNumber}
                      onCheckedChange={setAutoInvoiceNumber}
                      className="data-[state=checked]:bg-seguranca-yellow data-[state=unchecked]:bg-gray-600 scale-90"
                    />
                  </div>
                </div>
                <Input
                  value={formData.numeroFatura}
                  onChange={(e) => handleInputChange('numeroFatura', e.target.value)}
                  placeholder={autoInvoiceNumber ? "Gerando sequencial automático..." : "Ex: FAT-2024-001 ou NF-2049"}
                  disabled={autoInvoiceNumber}
                  className="border-gray-600 bg-white text-black placeholder:text-gray-500 focus:border-seguranca-yellow focus:ring-seguranca-yellow disabled:bg-gray-100 disabled:text-gray-600 disabled:cursor-not-allowed text-sm"
                />
              </div>

              {/* Descrição */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-seguranca-lightgray flex items-center gap-1.5">
                  <FileText size={13} />
                  Descrição do Faturamento / Serviço *
                </label>
                <Input
                  value={formData.descricao}
                  onChange={(e) => handleInputChange('descricao', e.target.value)}
                  placeholder="Ex: Faturamento mensal de vigilância e portaria - Mês Referência"
                  className="border-gray-600 bg-white text-black placeholder:text-gray-500 focus:border-seguranca-yellow focus:ring-seguranca-yellow text-sm"
                  required
                />
              </div>

              {/* Data de Emissão */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-seguranca-lightgray flex items-center gap-1.5">
                  <CalendarDays size={13} />
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
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-seguranca-lightgray flex items-center gap-1.5">
                  <CalendarDays size={13} />
                  Data de Vencimento *
                </label>
                <DatePicker
                  date={formData.vencimento}
                  onDateChange={(date) => handleInputChange('vencimento', date)}
                  placeholder="dd/mm/aaaa"
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Seção 2: Centro de Custo Pagador (Origem / Faturamento de Cliente) */}
          <div className="space-y-4 rounded-xl border border-blue-500/30 bg-blue-950/10 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-blue-400 flex items-center gap-2 uppercase tracking-wider">
                <Users size={16} />
                Centro de Custo Pagador (Origem / Contratante Faturado)
              </h3>
              <span className="text-[11px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-medium border border-blue-500/30">
                Pagador do Serviço
              </span>
            </div>
            <p className="text-xs text-gray-400 -mt-2">
              Identifica a entidade contratante e o Posto de Trabalho / Setor Operacional onde o serviço foi executado.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Cliente */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-seguranca-lightgray flex items-center gap-1.5">
                  <Users size={13} />
                  Cliente Contratante (Pagador) *
                </label>
                <ClientSearchCombobox
                  value={formData.clienteId || ''}
                  onChange={handleClienteChange}
                  initialDisplayName={formData.cliente}
                  className="w-full bg-white text-black border-gray-600 focus:border-seguranca-yellow focus:ring-seguranca-yellow"
                />
              </div>

              {/* Posto de Trabalho / Setor Faturado */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-seguranca-lightgray flex items-center gap-1.5">
                  <MapPin size={13} />
                  Posto de Trabalho / Setor Faturado (Centro de Custo de Origem)
                </label>
                <Select
                  value={formData.workPostId || 'NENHUM'}
                  onValueChange={(value) => {
                    if (value === 'NENHUM') {
                      setFormData(prev => ({ ...prev, workPostId: undefined, workPostName: undefined }));
                    } else {
                      const post = clientWorkPosts.find(p => p.id === value);
                      setFormData(prev => ({
                        ...prev,
                        workPostId: value,
                        workPostName: post?.name || undefined
                      }));
                    }
                  }}
                  disabled={workPostsLoading || !formData.clienteId}
                >
                  <SelectTrigger className="border-gray-600 bg-white text-black focus:border-seguranca-yellow focus:ring-seguranca-yellow text-sm">
                    <SelectValue placeholder={
                      !formData.clienteId 
                        ? "Selecione um cliente primeiro" 
                        : workPostsLoading 
                          ? "Carregando postos..." 
                          : "Selecione o posto de trabalho faturado"
                    }>
                      {formData.workPostName || 'Nenhum posto de trabalho (Geral do Cliente)'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-seguranca-black border-gray-600">
                    <SelectItem value="NENHUM" className="text-seguranca-lightgray hover:bg-seguranca-graphite">
                      Nenhum posto de trabalho (Faturamento Global do Cliente)
                    </SelectItem>
                    {clientWorkPosts.map((post) => (
                      <SelectItem key={post.id} value={post.id} className="text-seguranca-lightgray hover:bg-seguranca-graphite">
                        {post.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Seleção Rápida de Posto */}
                {clientWorkPosts.length > 1 && (
                  <div className="mt-1.5 space-y-1">
                    <span className="text-[11px] font-semibold text-blue-300">Seleção Rápida de Posto:</span>
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {clientWorkPosts.map((post) => {
                        const isSelected = formData.workPostId === post.id;
                        return (
                          <button
                            key={post.id}
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                workPostId: post.id,
                                workPostName: post.name
                              }));
                            }}
                            className={cn(
                              "text-[11px] px-2.5 py-1 rounded-full border transition-all duration-200 shadow-sm",
                              isSelected 
                                ? "bg-blue-600 border-blue-400 text-white font-semibold"
                                : "bg-seguranca-graphite border-gray-600 text-seguranca-lightgray hover:border-blue-400 hover:text-white"
                            )}
                          >
                            {post.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Vínculo de Boletim de Medição */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-seguranca-lightgray flex items-center gap-1.5">
                  <FileText size={13} />
                  Boletim de Medição Contratual (Opcional)
                </label>
                <Select
                  value={formData.measurementId || 'NENHUMA'}
                  onValueChange={handleMedicaoChange}
                  disabled={medicoesLoading}
                >
                  <SelectTrigger className="border-gray-600 bg-white text-black focus:border-seguranca-yellow focus:ring-seguranca-yellow text-sm">
                    <SelectValue placeholder={medicoesLoading ? "Carregando medições..." : "Sem medição vinculada"} />
                  </SelectTrigger>
                  <SelectContent className="bg-seguranca-black border-gray-600 max-h-60">
                    <SelectItem value="NENHUMA" className="text-seguranca-lightgray hover:bg-seguranca-graphite">
                      Nenhum boletim de medição
                    </SelectItem>
                    {medicoesOrdenadas.map((m) => (
                      <SelectItem 
                        key={m.id} 
                        value={String(m.id)} 
                        className="text-seguranca-lightgray hover:bg-seguranca-graphite"
                      >
                        {m.contractNumber ? `${m.contractNumber} — ` : ''}
                        {m.clientName ? `${m.clientName} ` : ''}
                        {m.periodStart && m.periodEnd ? `(${new Date(m.periodStart).toLocaleDateString('pt-BR')} a ${new Date(m.periodEnd).toLocaleDateString('pt-BR')})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Identificação Livre da Medição / Contrato */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-seguranca-lightgray flex items-center gap-1.5">
                  <FileText size={13} />
                  Número do Contrato / Referência da Medição
                </label>
                <Input
                  value={formData.measurementNumber || ''}
                  onChange={(e) => handleInputChange('measurementNumber', e.target.value)}
                  placeholder="Ex: MED-2024/09 ou CTR-089/2024"
                  className="border-gray-600 bg-white text-black placeholder:text-gray-500 focus:border-seguranca-yellow focus:ring-seguranca-yellow text-sm"
                />
              </div>
            </div>
          </div>

          {/* Seção 3: Centro de Custo Recebedor (Destino / Beneficiária & Liquidação) */}
          <div className="space-y-4 rounded-xl border border-green-500/30 bg-green-950/10 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-green-400 flex items-center gap-2 uppercase tracking-wider">
                <Building2 size={16} />
                Centro de Custo Recebedor (Destino / Empresa Beneficiária)
              </h3>
              <span className="text-[11px] px-2 py-0.5 rounded bg-green-500/20 text-green-300 font-medium border border-green-500/30">
                Recebedora da Receita
              </span>
            </div>
            <p className="text-xs text-gray-400 -mt-2">
              Identifica a filial/empresa prestadora que emite a fatura e aufere o crédito contábil e financeiro.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Empresa Prestadora / Beneficiária */}
              <div className="space-y-1.5 md:col-span-1">
                <label className="text-xs font-medium text-seguranca-lightgray flex items-center gap-1.5">
                  <Building2 size={13} />
                  Empresa Beneficiária *
                </label>
                <Select
                  value={formData.empresaId}
                  onValueChange={(value) => {
                    const empresa = empresas.find(e => e.id === value);
                    handleInputChange('empresaId', value);
                    handleInputChange('empresa', empresa?.sigla || empresa?.name || '');
                  }}
                  required
                >
                  <SelectTrigger className="border-gray-600 bg-white text-black focus:border-seguranca-yellow focus:ring-seguranca-yellow text-sm">
                    <SelectValue placeholder="Selecione a empresa prestadora" />
                  </SelectTrigger>
                  <SelectContent className="bg-seguranca-black border-gray-600">
                    {empresas.length === 0 ? (
                      <SelectItem value="no-data" disabled className="text-gray-500">
                        Carregando empresas...
                      </SelectItem>
                    ) : (
                      empresas.map((empresa) => (
                        <SelectItem 
                          key={empresa.id} 
                          value={empresa.id}
                          className="text-seguranca-lightgray hover:bg-seguranca-graphite"
                        >
                          {empresa.sigla || empresa.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Valor da Fatura */}
              <div className="space-y-1.5 md:col-span-1">
                <label className="text-xs font-medium text-green-400 flex items-center gap-1.5">
                  <DollarSign size={13} />
                  Valor Total a Receber (R$) *
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.valor || ''}
                  onChange={(e) => handleInputChange('valor', parseFloat(e.target.value) || 0)}
                  placeholder="0,00"
                  className="border-green-500 bg-white text-black placeholder:text-gray-500 focus:border-green-400 focus:ring-green-400 font-semibold text-sm"
                  required
                />
              </div>

              {/* Tipo de Documento / Faturamento */}
              <div className="space-y-1.5 md:col-span-1">
                <label className="text-xs font-medium text-seguranca-lightgray flex items-center gap-1.5">
                  <Tag size={13} />
                  Tipo de Recebimento *
                </label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value) => handleInputChange('tipo', value)}
                  required
                >
                  <SelectTrigger className="border-gray-600 bg-white text-black focus:border-seguranca-yellow focus:ring-seguranca-yellow text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-seguranca-black border-gray-600">
                    <SelectItem value="FATURA" className="text-seguranca-lightgray hover:bg-seguranca-graphite">
                      Fatura Mensal de Serviços
                    </SelectItem>
                    <SelectItem value="MEDICAO" className="text-seguranca-lightgray hover:bg-seguranca-graphite">
                      Faturamento por Medição
                    </SelectItem>
                    <SelectItem value="SERVICO" className="text-seguranca-lightgray hover:bg-seguranca-graphite">
                      Ordem de Serviço Avulsa
                    </SelectItem>
                    <SelectItem value="PRODUTO" className="text-seguranca-lightgray hover:bg-seguranca-graphite">
                      Venda de Equipamento / Produto
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Forma de Pagamento / Liquidação */}
              <div className="space-y-1.5 md:col-span-1">
                <label className="text-xs font-medium text-seguranca-lightgray flex items-center gap-1.5">
                  <DollarSign size={13} />
                  Forma de Liquidação *
                </label>
                <Select
                  value={formData.paymentMethod || 'PIX'}
                  onValueChange={(value) => handleInputChange('paymentMethod', value)}
                  required
                >
                  <SelectTrigger className="border-gray-600 bg-white text-black focus:border-seguranca-yellow focus:ring-seguranca-yellow text-sm">
                    <SelectValue placeholder="Selecione o meio" />
                  </SelectTrigger>
                  <SelectContent className="bg-seguranca-black border-gray-600">
                    <SelectItem value="PIX" className="text-seguranca-lightgray hover:bg-seguranca-graphite">PIX</SelectItem>
                    <SelectItem value="BOLETO" className="text-seguranca-lightgray hover:bg-seguranca-graphite">Boleto Bancário</SelectItem>
                    <SelectItem value="TRANSFER" className="text-seguranca-lightgray hover:bg-seguranca-graphite">Transferência / TED</SelectItem>
                    <SelectItem value="CASH" className="text-seguranca-lightgray hover:bg-seguranca-graphite">Dinheiro</SelectItem>
                    <SelectItem value="CARD" className="text-seguranca-lightgray hover:bg-seguranca-graphite">Cartão de Crédito/Débito</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status do Faturamento */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-medium text-seguranca-lightgray flex items-center gap-1.5">
                  <Tag size={13} />
                  Status da Conta a Receber *
                </label>
                <Select
                  value={formData.status}
                  onValueChange={(value: any) => handleInputChange('status', value)}
                  required
                >
                  <SelectTrigger className="border-gray-600 bg-white text-black focus:border-seguranca-yellow focus:ring-seguranca-yellow text-sm">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent className="bg-seguranca-black border-gray-600">
                    <SelectItem value="ABERTA" className="text-yellow-400 hover:bg-seguranca-graphite">
                      Pendente / Aberta (Aguardando Liquidação)
                    </SelectItem>
                    <SelectItem value="RECEBIDA" className="text-green-400 hover:bg-seguranca-graphite">
                      Recebida / Liquidada (Crédito Confirmado)
                    </SelectItem>
                    <SelectItem value="VENCIDA" className="text-red-400 hover:bg-seguranca-graphite">
                      Vencida (Em Atraso)
                    </SelectItem>
                    <SelectItem value="CANCELADA" className="text-gray-400 hover:bg-seguranca-graphite">
                      Cancelada
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Seção 4: Classificação Contábil - Plano de Contas (Receitas / Lei 6.404/76 e NBC TG 30) */}
          <div className="space-y-4 rounded-xl border border-seguranca-yellow/40 bg-seguranca-black/50 p-4 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-700 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-seguranca-yellow/20 text-seguranca-yellow border border-seguranca-yellow/30">
                  <FolderTree size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-seguranca-yellow uppercase tracking-wider flex items-center gap-1.5">
                    Plano de Contas Contábil (Receitas de Serviços & Faturamento)
                  </h3>
                  <p className="text-[11px] text-gray-300">
                    Conformidade com a <span className="text-seguranca-yellow font-semibold">Lei 6.404/76 (art. 187)</span> e <span className="text-seguranca-yellow font-semibold">NBC TG 30 (Receita de Contratos com Clientes)</span>
                  </p>
                </div>
              </div>

              <Link
                to="/plano-contas"
                className="text-xs text-seguranca-yellow hover:underline flex items-center gap-1 self-start sm:self-auto"
                target="_blank"
                rel="noreferrer"
              >
                Gerenciar Estrutura Completa
                <ArrowRight size={12} />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* Categoria do Plano de Contas */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-seguranca-yellow flex items-center gap-1">
                    <Layers size={13} />
                    Categoria de Receita (Grupo Contábil) *
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleOpenNewPlanoCategoriaModal}
                    className="h-6 px-2 text-[11px] text-seguranca-yellow hover:bg-seguranca-yellow/20 hover:text-white"
                    title="Cadastrar nova categoria no Plano de Contas"
                  >
                    <Plus size={12} className="mr-1" />
                    Nova Categoria
                  </Button>
                </div>

                <Select
                  value={selectedCategoriaPaiId || 'none'}
                  onValueChange={(value) => {
                    setSelectedCategoriaPaiId(value === 'none' ? '' : value);
                    handleInputChange('subcategoriaId', '');
                  }}
                >
                  <SelectTrigger className="border-seguranca-yellow/40 bg-white text-black font-medium focus:border-seguranca-yellow focus:ring-seguranca-yellow text-sm">
                    <SelectValue placeholder="Selecione a categoria de receita" />
                  </SelectTrigger>
                  <SelectContent className="bg-seguranca-black border-gray-600 max-h-64">
                    <SelectItem value="none" className="text-gray-400 hover:bg-seguranca-graphite">
                      Selecione uma categoria...
                    </SelectItem>
                    
                    {/* Grupo de Categorias de Receita */}
                    {categoriasReceitas.length > 0 && (
                      <div className="px-2 py-1 text-[10px] font-bold text-seguranca-yellow uppercase tracking-wider bg-seguranca-yellow/10 rounded my-1">
                        ★ Receitas Operacionais & Faturamento
                      </div>
                    )}
                    {categoriasReceitas.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id} className="text-seguranca-yellow font-medium hover:bg-seguranca-graphite">
                        {cat.codigo} - {cat.nome}
                      </SelectItem>
                    ))}

                    {/* Outras Categorias */}
                    {outrasCategorias.length > 0 && (
                      <div className="px-2 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-800/40 rounded my-1">
                        Outros Grupos do Plano
                      </div>
                    )}
                    {outrasCategorias.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id} className="text-seguranca-lightgray hover:bg-seguranca-graphite">
                        {cat.codigo} - {cat.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {categoriasPai.length === 0 && (
                  <p className="text-[11px] text-amber-400">
                    Nenhuma categoria cadastrada no Plano de Contas.
                  </p>
                )}
              </div>

              {/* Subcategoria / Conta de Receita */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-seguranca-yellow flex items-center gap-1">
                    <Scale size={13} />
                    Conta / Subcategoria de Prestação de Serviços *
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleOpenNewPlanoSubcategoriaModal}
                    disabled={!selectedCategoriaPaiId}
                    className="h-6 px-2 text-[11px] text-seguranca-yellow hover:bg-seguranca-yellow/20 hover:text-white disabled:opacity-40"
                    title="Cadastrar nova conta/subcategoria nesta categoria"
                  >
                    <Plus size={12} className="mr-1" />
                    Nova Subcategoria
                  </Button>
                </div>

                <Select
                  value={formData.subcategoriaId || 'none'}
                  onValueChange={(value) => {
                    if (value === 'none') {
                      handleInputChange('subcategoriaId', '');
                      return;
                    }
                    handleInputChange('subcategoriaId', value);
                  }}
                  disabled={!selectedCategoriaPaiId}
                >
                  <SelectTrigger className="border-seguranca-yellow/40 bg-white text-black font-medium focus:border-seguranca-yellow focus:ring-seguranca-yellow text-sm">
                    <SelectValue placeholder={!selectedCategoriaPaiId ? "Selecione a categoria primeiro" : "Selecione a conta contábil de receita"} />
                  </SelectTrigger>
                  <SelectContent className="bg-seguranca-black border-gray-600 max-h-64">
                    <SelectItem value="none" className="text-gray-400 hover:bg-seguranca-graphite">
                      Nenhuma subcategoria selecionada
                    </SelectItem>
                    {filteredSubcategorias.map((sub) => (
                      <SelectItem key={sub.id} value={sub.id} className="text-seguranca-lightgray hover:bg-seguranca-graphite">
                        {sub.codigo} - {sub.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!selectedCategoriaPaiId ? (
                  <p className="text-[11px] text-gray-400">Selecione a categoria de receita para listar as contas contábeis correspondentes.</p>
                ) : filteredSubcategorias.length === 0 ? (
                  <p className="text-[11px] text-amber-400">Nenhuma conta cadastrada nesta categoria. Clique em "+ Nova Subcategoria" para cadastrar.</p>
                ) : null}
              </div>
            </div>
          </div>

          {/* Seção 5: Informações Adicionais */}
          <div className="space-y-3 rounded-xl border border-gray-700 bg-seguranca-black/40 p-4">
            <h3 className="text-sm font-semibold text-seguranca-yellow flex items-center gap-2 uppercase tracking-wider">
              <FileText size={16} />
              Observações & Notas Contábeis
            </h3>
            <div className="space-y-1.5">
              <Textarea
                value={formData.observacoes}
                onChange={(e) => handleInputChange('observacoes', e.target.value)}
                placeholder="Observações complementares sobre o contrato, retenções de impostos (ISS, INSS, IRRF, PIS/COFINS) ou condições de pagamento acordadas."
                className="border-gray-600 bg-white text-black placeholder:text-gray-500 focus:border-seguranca-yellow focus:ring-seguranca-yellow text-sm"
                rows={2}
              />
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-600">
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
              className="bg-green-600 hover:bg-green-700 font-semibold"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Salvando Registro...
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} className="mr-2" />
                  {editMode ? 'Atualizar Conta a Receber' : 'Salvar Conta a Receber'}
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Modal Nova Categoria - Plano de Contas */}
        <Dialog open={newPlanoCategoriaModalOpen} onOpenChange={setNewPlanoCategoriaModalOpen}>
          <DialogContent className="sm:max-w-[450px] bg-seguranca-graphite border-gray-600 text-white">
            <DialogHeader>
              <DialogTitle className="text-seguranca-yellow flex items-center gap-2">
                <FolderTree size={18} />
                Nova Categoria (Plano de Contas)
              </DialogTitle>
              <DialogDescription className="text-gray-300">
                Cadastre um novo grupo de contas contábeis no Plano de Contas.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <label className="text-xs font-medium text-seguranca-lightgray">Código Sequencial *</label>
                <Input
                  placeholder="Ex: 05"
                  value={newPlanoCategoriaCodigo}
                  onChange={(e) => setNewPlanoCategoriaCodigo(e.target.value)}
                  className="border-gray-600 bg-white text-black placeholder:text-gray-500 focus:border-seguranca-yellow focus:ring-seguranca-yellow font-medium"
                />
                <p className="text-[11px] text-gray-400">
                  Código sugerido automaticamente na sequência numérica.
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-seguranca-lightgray">Nome da Categoria de Receita *</label>
                <Input
                  placeholder="Ex: Receitas de Locação de Equipamentos"
                  value={newPlanoCategoriaNome}
                  onChange={(e) => setNewPlanoCategoriaNome(e.target.value)}
                  className="border-gray-600 bg-white text-black placeholder:text-gray-500 focus:border-seguranca-yellow focus:ring-seguranca-yellow font-medium"
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
                  className="bg-green-600 hover:bg-green-700 text-white font-medium"
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
                Nova Conta de Receita (Plano de Contas)
              </DialogTitle>
              <DialogDescription className="text-gray-300">
                Cadastre uma nova conta analítica vinculada à categoria de receita selecionada.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="rounded-md border border-seguranca-yellow/30 bg-seguranca-black/40 p-2.5 text-xs text-seguranca-lightgray">
                <span className="text-gray-400">Categoria Pai: </span>
                <span className="font-semibold text-seguranca-yellow">
                  {categoriasPai.find(c => c.id === selectedCategoriaPaiId)?.codigo} - {categoriasPai.find(c => c.id === selectedCategoriaPaiId)?.nome}
                </span>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-seguranca-lightgray">Código Sequencial *</label>
                <Input
                  placeholder="Ex: 05.09"
                  value={newPlanoSubcategoriaCodigo}
                  onChange={(e) => setNewPlanoSubcategoriaCodigo(e.target.value)}
                  className="border-gray-600 bg-white text-black placeholder:text-gray-500 focus:border-seguranca-yellow focus:ring-seguranca-yellow font-medium"
                />
                <p className="text-[11px] text-gray-400">
                  Calculado automaticamente na sequência numérica desta categoria.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-seguranca-lightgray">Nome da Conta / Subcategoria *</label>
                <Input
                  placeholder="Ex: Receita de Monitoramento Eletrônico 24h"
                  value={newPlanoSubcategoriaNome}
                  onChange={(e) => setNewPlanoSubcategoriaNome(e.target.value)}
                  className="border-gray-600 bg-white text-black placeholder:text-gray-500 focus:border-seguranca-yellow focus:ring-seguranca-yellow font-medium"
                  autoFocus
                />
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
                  className="bg-green-600 hover:bg-green-700 text-white font-medium"
                >
                  {savingPlanoSubcategoria ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Salvando...
                    </>
                  ) : (
                    'Salvar Conta'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
};