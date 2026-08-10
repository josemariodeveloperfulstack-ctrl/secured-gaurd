import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { CalendarDays, DollarSign, FileText, Upload, Plus, Users, Building2, Tag, Ruler, MapPin, FolderTree } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DatePicker } from '@/components/ui/date-picker';
import { formatDateForBackend, parseDateFromBackend } from '@/utils/dateUtils';
import { contasAReceberService, Client } from '@/services/contasAReceberService';
import { contasAPagarService, CategoriaPai, Subcategoria } from '@/services/contasAPagarService';
import { measurementService } from '@/services/measurementService';
import { workPostService } from '@/services/workPostService';
import type { WorkPost } from '@/services/workPostService';
import { ClientSearchCombobox } from '@/components/ui/client-search-combobox';
import { Switch } from '@/components/ui/switch';
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
    categoria: 'INVOICE', // Valor padrão - enum ReceivableCategory
    workPostId: undefined,
    workPostName: undefined,
    paymentMethod: 'PIX', // Valor padrão - enum PaymentMethod
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
      return palabras[0].substring(0, 4);
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

      console.log(` Generating auto invoice number for ${clientName} (${clientId}) with prefix ${prefixo}...`);
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
      
      console.log(`✅ Calculated auto invoice number: ${novoNumero}`);
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
      console.log(`🔍 Postos ativos encontrados para o cliente:`, ativos);

      // Autopreenchimento (Opção A):
      // Se houver exatamente 1 posto ativo, seleciona-o automaticamente no formData
      if (ativos.length === 1 && !selectedPostId) {
        console.log(`🎯 Apenas 1 posto ativo encontrado. Autopreenchendo posto: ${ativos[0].name}`);
        setFormData(prev => ({
          ...prev,
          workPostId: ativos[0].id,
          workPostName: ativos[0].name
        }));
      } else if (selectedPostId) {
        // Se houver um posto específico selecionado (ex: modo edição)
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

  // Efeito reativo para carregar postos de trabalho no carregamento e ao alterar o cliente
  useEffect(() => {
    if (open && formData.clienteId) {
      // Se estiver editando e possuir workPostId inicial, passa para preservá-lo
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
      console.log('🔍 DEBUG: Carregando empresas...');
      contasAReceberService.getEmpresas()
        .then(data => {
          console.log('🔍 DEBUG: Empresas recebidas:', data);
          const empresasArray = Array.isArray(data) ? data : [];
          console.log('🔍 DEBUG: Empresas processadas:', empresasArray);
          setEmpresas(empresasArray);
        })
        .catch(error => {
          console.error('❌ Erro ao carregar empresas:', error);
          setEmpresas([
            { id: '1', name: 'Empresa Exemplo 1' },
            { id: '2', name: 'Empresa Exemplo 2' }
          ]);
        });

      // Carregar boletins de medição (para vincular a Conta a Receber)
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
        .then(data => setCategoriasPai(Array.isArray(data) ? data : []))
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
        console.log('📝 Carregando dados para edição:', initialData);
        
        // Mapear dados corretamente, considerando campos alternativos
        const valor = initialData.amount || initialData.valor || 0;
        const vencimento = initialData.dueDate || initialData.vencimento || new Date();
        const dataEmissao = initialData.dataEmissao || new Date();
        const numeroFatura = initialData.invoiceNumber || initialData.numeroFatura || '';
        const clienteId = initialData.clienteId || initialData.client?.id || '';
        const cliente = initialData.client?.name || initialData.cliente || '';
        const empresaId = initialData.empresaId || initialData.unitId || '';
        const empresa = initialData.empresa || initialData.unitSigla || initialData.unitName || '';
        
        // Mapear categoria corretamente (pode vir como enum do backend: INVOICE, NOTE, etc)
        let categoriaMapeada = undefined;
        if (initialData.categoria) {
          const catStr = String(initialData.categoria).toUpperCase();
          // Se for um enum válido, manter como está
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
        
        console.log('✅ FormData preenchido:', {
          numeroFatura,
          cliente,
          clienteId,
          empresa,
          empresaId,
          descricao: initialData.descricao,
          valor,
          vencimento,
          categoria: categoriaMapeada,
          workPostId: initialData.workPostId,
          workPostName: initialData.workPostName,
          paymentMethod: initialData.paymentMethod
        });
        console.log('📋 initialData completo:', initialData);
        console.log('📋 Campos de empresa e posto de trabalho:', {
          empresaId: initialData.empresaId,
          unitId: initialData.unitId,
          empresa: initialData.empresa,
          unitSigla: initialData.unitSigla,
          unitName: initialData.unitName,
          workPostId: initialData.workPostId,
          workPostName: initialData.workPostName
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
          categoria: undefined,
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

  const filteredSubcategorias = selectedCategoriaPaiId
    ? subcategorias.filter((s) => s.categoriaPaiId === selectedCategoriaPaiId)
    : [];

  // Atualizar clienteId e empresaId quando clientes e empresas forem carregados (modo edição)
  useEffect(() => {
    if (open && editMode && initialData) {
      // Encontrar cliente por ID ou nome
      if (clientes.length > 0) {
        if (initialData.clienteId) {
          const clienteEncontrado = clientes.find(c => c.id === initialData.clienteId || c.id === String(initialData.clienteId));
          if (clienteEncontrado) {
            console.log('✅ Cliente encontrado por ID:', clienteEncontrado);
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
            console.log('✅ Cliente encontrado por nome:', clienteEncontrado);
            setFormData(prev => ({
              ...prev,
              clienteId: clienteEncontrado.id,
              cliente: clienteEncontrado.name
            }));
          }
        }
      }

      // Encontrar empresa por ID ou nome
      if (empresas.length > 0) {
        console.log('🔍 Procurando empresa. initialData.empresaId:', initialData.empresaId, 'initialData.empresa:', initialData.empresa);
        console.log('🔍 Empresas disponíveis:', empresas.map(e => ({ id: e.id, name: e.name, sigla: e.sigla })));
        
        if (initialData.empresaId || initialData.unitId) {
          const empresaIdToFind = initialData.empresaId || initialData.unitId;
          const empresaEncontrada = empresas.find(e => 
            String(e.id) === String(empresaIdToFind) ||
            e.id === empresaIdToFind
          );
          if (empresaEncontrada) {
            console.log('✅ Empresa encontrada por ID:', empresaEncontrada);
            setFormData(prev => ({
              ...prev,
              empresaId: empresaEncontrada.id,
              empresa: empresaEncontrada.sigla || empresaEncontrada.name
            }));
          } else {
            console.log('⚠️ Empresa não encontrada por ID:', empresaIdToFind);
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
            console.log('✅ Empresa encontrada por nome/sigla:', empresaEncontrada);
            setFormData(prev => ({
              ...prev,
              empresaId: empresaEncontrada.id,
              empresa: empresaEncontrada.sigla || empresaEncontrada.name
            }));
          } else {
            console.log('⚠️ Empresa não encontrada. Procurando:', empresaToFind, 'empresas disponíveis:', empresas.map(e => ({ id: e.id, name: e.name, sigla: e.sigla })));
          }
        } else {
          console.log('⚠️ Nenhuma informação de empresa encontrada em initialData');
        }
      } else {
        console.log('⚠️ Lista de empresas vazia');
      }
      
      // Atualizar categoria se necessário
      if (initialData.categoria && initialData.categoria !== 'NENHUMA' && initialData.categoria !== '') {
        const catStr = String(initialData.categoria).toUpperCase();
        const validCategories = ['INVOICE', 'NOTE', 'ADVANCE', 'SERVICE', 'PRODUCT', 'OTHER'];
        if (validCategories.includes(catStr)) {
          setFormData(prev => ({
            ...prev,
            categoria: catStr
          }));
          console.log('✅ Categoria atualizada:', catStr);
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

  // Texto exibido para um boletim no Select (contrato + período + NF)
  const formatMedicaoLabel = (m: MeasurementBulletin): string => {
    const partes: string[] = [];
    if (m.contractNumber) partes.push(m.contractNumber);
    else if (m.nfNumber) partes.push(`NF ${m.nfNumber}`);
    else partes.push(`Medição ${String(m.id).substring(0, 8)}`);

    if (m.periodStart && m.periodEnd) {
      const fmt = (d: string) => {
        try {
          return new Date(d).toLocaleDateString('pt-BR');
        } catch {
          return d;
        }
      };
      partes.push(`${fmt(m.periodStart)} a ${fmt(m.periodEnd)}`);
    }
    if (m.clientName) partes.push(m.clientName);
    return partes.join(' — ');
  };

  // Quando muda a medição, derivamos automaticamente o measurementNumber (texto) caso esteja vazio.
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
      // Preenche o texto sugerido — usuário pode sobrescrever
      measurementNumber: m.nfNumber || m.contractNumber || prev.measurementNumber || ''
    }));
  };

  // Filtra medições do cliente selecionado (se houver) — não esconde as demais, apenas lista as "do cliente" primeiro
  const medicoesOrdenadas = useMemo(() => {
    if (!formData.clienteId) return medicoes;
    const clienteIdStr = String(formData.clienteId);
    const doCliente = medicoes.filter(m => String(m.clientId ?? m.client?.id ?? '') === clienteIdStr);
    const outras = medicoes.filter(m => String(m.clientId ?? m.client?.id ?? '') !== clienteIdStr);
    return [...doCliente, ...outras];
  }, [medicoes, formData.clienteId]);

  const handleCreateCategory = () => {
    const categoryName = newCategoryName.trim();
    if (categoryName) {
      setCategories(prev => {
        const newCategories = Array.from(new Set([categoryName, ...prev]));
        return newCategories;
      });
      handleInputChange('categoria', categoryName);
      setNewCategoryName('');
      setNewCategoryModalOpen(false);
      toast({
        title: "Sucesso",
        description: `Categoria "${categoryName}" criada com sucesso!`
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.cliente || !formData.descricao || !formData.valor || !formData.vencimento) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
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
          <DialogTitle className="text-xl font-bold text-green-500 flex items-center gap-2">
            <Plus size={20} />
            {editMode ? 'Editar Conta a Receber' : 'Nova Conta a Receber'}
          </DialogTitle>
          <DialogDescription className="text-gray-300">
            {editMode ? 'Atualize as informações da conta a receber' : 'Preencha os dados da nova conta a receber'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Seção 1: Informações Básicas */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-seguranca-yellow flex items-center gap-2">
              <FileText size={18} />
              Informações Básicas
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Número da Fatura */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-seguranca-lightgray flex items-center gap-2">
                    <FileText size={14} />
                    Número da Fatura
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-seguranca-lightgray font-semibold">Automática</span>
                    <Switch
                      checked={autoInvoiceNumber}
                      onCheckedChange={setAutoInvoiceNumber}
                      className="data-[state=checked]:bg-seguranca-yellow data-[state=unchecked]:bg-gray-600"
                    />
                  </div>
                </div>
                <Input
                  value={formData.numeroFatura}
                  onChange={(e) => handleInputChange('numeroFatura', e.target.value)}
                  placeholder={autoInvoiceNumber ? "Gerando número automaticamente..." : "Ex: FAT-2024-001"}
                  disabled={autoInvoiceNumber}
                  className="border-gray-600 bg-white text-black placeholder:text-gray-500 focus:border-seguranca-yellow focus:ring-seguranca-yellow disabled:bg-gray-100 disabled:text-gray-600 disabled:cursor-not-allowed"
                />
              </div>

              {/* Descrição */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-seguranca-lightgray flex items-center gap-2">
                  <FileText size={14} />
                  Descrição *
                </label>
                <Input
                  value={formData.descricao}
                  onChange={(e) => handleInputChange('descricao', e.target.value)}
                  placeholder="Descrição do serviço/produto"
                  className="border-gray-600 bg-white text-black placeholder:text-gray-500 focus:border-seguranca-yellow focus:ring-seguranca-yellow"
                  required
                />
              </div>
            </div>
          </div>

          {/* Seção 2: Datas */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-seguranca-yellow flex items-center gap-2">
              <CalendarDays size={18} />
              Datas Importantes
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Data de Emissão */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-seguranca-lightgray flex items-center gap-2">
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
                <label className="text-sm font-medium text-seguranca-lightgray flex items-center gap-2">
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
            </div>
          </div>

          {/* Seção: Medição vinculada (opcional) */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-seguranca-yellow flex items-center gap-2">
              <Ruler size={18} />
              Medição Vinculada
              <span className="text-xs font-normal text-seguranca-lightgray ml-2">(opcional)</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Boletim de Medição */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-seguranca-lightgray flex items-center gap-2">
                  <Ruler size={14} />
                  Boletim de Medição
                </label>
                <Select
                  value={formData.measurementId ? String(formData.measurementId) : 'NENHUMA'}
                  onValueChange={handleMedicaoChange}
                  disabled={medicoesLoading}
                >
                  <SelectTrigger className="border-gray-600 bg-white text-black focus:border-seguranca-yellow focus:ring-seguranca-yellow">
                    <SelectValue
                      placeholder={
                        medicoesLoading
                          ? 'Carregando medições...'
                          : 'Selecione um boletim de medição'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent className="bg-seguranca-black border-gray-600 max-h-72">
                    <SelectItem
                      value="NENHUMA"
                      className="text-seguranca-lightgray hover:bg-seguranca-graphite"
                    >
                      Nenhum (sem vínculo)
                    </SelectItem>
                    {medicoesOrdenadas.length === 0 && !medicoesLoading && (
                      <SelectItem
                        value="__empty__"
                        disabled
                        className="text-gray-500"
                      >
                        Nenhuma medição cadastrada
                      </SelectItem>
                    )}
                    {medicoesOrdenadas.map(m => (
                      <SelectItem
                        key={String(m.id)}
                        value={String(m.id)}
                        className="text-seguranca-lightgray hover:bg-seguranca-graphite"
                      >
                        {formatMedicaoLabel(m)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-seguranca-lightgray">
                  Selecione o boletim de medição que originou esta conta. Aparece na coluna
                  "Medição" da listagem.
                </p>
              </div>

              {/* Número/identificação da medição (texto livre — preenchido automaticamente quando há vínculo) */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-seguranca-lightgray flex items-center gap-2">
                  <FileText size={14} />
                  Número da Medição
                </label>
                <Input
                  value={formData.measurementNumber || ''}
                  onChange={(e) => handleInputChange('measurementNumber', e.target.value)}
                  placeholder="Ex.: NF-27917 ou CTC-CBM 148/295/2025"
                  className="border-gray-600 bg-white text-black placeholder:text-gray-500 focus:border-seguranca-yellow focus:ring-seguranca-yellow"
                />
                <p className="text-xs text-seguranca-lightgray">
                  Texto livre para casos em que não há um boletim cadastrado.
                </p>
              </div>
            </div>
          </div>

          {/* Seção 3: Cliente e Empresa */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-seguranca-yellow flex items-center gap-2">
              <Users size={18} />
              Cliente e Empresa
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Cliente */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-seguranca-lightgray flex items-center gap-2">
                  <Users size={14} />
                  Cliente *
                </label>
                <ClientSearchCombobox
                  value={formData.clienteId || ''}
                  onChange={handleClienteChange}
                  initialDisplayName={formData.cliente}
                  className="w-full bg-white text-black border-gray-600 focus:border-seguranca-yellow focus:ring-seguranca-yellow"
                />
              </div>

              {/* Empresa */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-seguranca-lightgray flex items-center gap-2">
                  <Building2 size={14} />
                  Empresa *
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
                  <SelectTrigger className="border-gray-600 bg-white text-black focus:border-seguranca-yellow focus:ring-seguranca-yellow">
                    <SelectValue placeholder="Selecione uma empresa" />
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

              {/* Posto de Trabalho */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-seguranca-lightgray flex items-center gap-2">
                  <MapPin size={14} />
                  Posto de Trabalho
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
                  <SelectTrigger className="border-gray-600 bg-white text-black focus:border-seguranca-yellow focus:ring-seguranca-yellow">
                    <SelectValue placeholder={
                      !formData.clienteId 
                        ? "Selecione um cliente primeiro" 
                        : workPostsLoading 
                          ? "Carregando postos..." 
                          : "Selecione um posto de trabalho"
                    }>
                      {formData.workPostName || 'Nenhum posto de trabalho'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-seguranca-black border-gray-600">
                    <SelectItem value="NENHUM" className="text-seguranca-lightgray hover:bg-seguranca-graphite">Nenhum posto de trabalho</SelectItem>
                    {clientWorkPosts.map((post) => (
                      <SelectItem key={post.id} value={post.id} className="text-seguranca-lightgray hover:bg-seguranca-graphite">
                        {post.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Quick Tags de clique único */}
                {clientWorkPosts.length > 1 && (
                  <div className="mt-2 space-y-1">
                    <span className="text-xs font-semibold text-seguranca-yellow">Seleção Rápida de Posto:</span>
                    <div className="flex flex-wrap gap-2 pt-1">
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
                              "text-xs px-3 py-1.5 rounded-full border transition-all duration-200 shadow-sm",
                              isSelected 
                                ? "bg-seguranca-yellow border-seguranca-yellow text-seguranca-black font-semibold"
                                : "bg-seguranca-graphite border-gray-600 text-seguranca-lightgray hover:border-seguranca-yellow hover:text-white"
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
            </div>
          </div>

          {/* Seção 4: Informações Financeiras */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-seguranca-yellow flex items-center gap-2">
              <DollarSign size={18} />
              Informações Financeiras
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Tipo */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-seguranca-lightgray flex items-center gap-2">
                  <Tag size={14} />
                  Tipo *
                </label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value) => handleInputChange('tipo', value)}
                  required
                >
                  <SelectTrigger className="border-gray-600 bg-white text-black focus:border-seguranca-yellow focus:ring-seguranca-yellow">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-seguranca-black border-gray-600">
                    <SelectItem value="FATURA" className="text-seguranca-lightgray hover:bg-seguranca-graphite">
                      Fatura
                    </SelectItem>
                    <SelectItem value="MEDICAO" className="text-seguranca-lightgray hover:bg-seguranca-graphite">
                      Medição
                    </SelectItem>
                    <SelectItem value="SERVICO" className="text-seguranca-lightgray hover:bg-seguranca-graphite">
                      Serviço
                    </SelectItem>
                    <SelectItem value="PRODUTO" className="text-seguranca-lightgray hover:bg-seguranca-graphite">
                      Produto
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Valor */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-green-400 flex items-center gap-2">
                  <DollarSign size={14} />
                  Valor *
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.valor}
                  onChange={(e) => handleInputChange('valor', parseFloat(e.target.value) || 0)}
                  placeholder="0,00"
                  className="border-green-500 bg-white text-black placeholder:text-gray-500 focus:border-green-400 focus:ring-green-400 font-medium"
                  required
                />
              </div>
            </div>
          </div>

          {/* Seção 5: Classificação */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-seguranca-yellow flex items-center gap-2">
              <Tag size={18} />
              Classificação
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
              {/* Categoria */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-seguranca-lightgray flex items-center gap-2">
                  <Tag size={14} />
                  Categoria
                </label>
                <div className="flex gap-2">
                  <Select
                    value={formData.categoria && formData.categoria !== 'NENHUMA' ? formData.categoria : 'NENHUMA'}
                    onValueChange={(value) => handleInputChange('categoria', value === 'NENHUMA' ? undefined : value)}
                    className="flex-1"
                  >
                    <SelectTrigger className="border-gray-600 bg-white text-black focus:border-seguranca-yellow focus:ring-seguranca-yellow">
                      <SelectValue placeholder="Selecione uma categoria">
                        {formData.categoria && formData.categoria !== 'NENHUMA' 
                          ? (() => {
                              const categoryMap: { [key: string]: string } = {
                                'INVOICE': 'Fatura',
                                'NOTE': 'Nota Fiscal',
                                'ADVANCE': 'Adiantamento',
                                'SERVICE': 'Serviço',
                                'PRODUCT': 'Produto',
                                'OTHER': 'Outros'
                              };
                              return categoryMap[formData.categoria] || formData.categoria;
                            })()
                          : 'Nenhuma categoria'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-seguranca-black border-gray-600">
                      <SelectItem 
                        value="NENHUMA"
                        className="text-seguranca-lightgray hover:bg-seguranca-graphite"
                      >
                        Nenhuma categoria
                      </SelectItem>
                      {[
                        { value: 'INVOICE', label: 'Fatura' },
                        { value: 'NOTE', label: 'Nota Fiscal' },
                        { value: 'ADVANCE', label: 'Adiantamento' },
                        { value: 'SERVICE', label: 'Serviço' },
                        { value: 'PRODUCT', label: 'Produto' },
                        { value: 'OTHER', label: 'Outros' }
                      ].map((cat) => (
                        <SelectItem 
                          key={cat.value} 
                          value={cat.value}
                          className="text-seguranca-lightgray hover:bg-seguranca-graphite"
                        >
                          {cat.label}
                        </SelectItem>
                      ))}
                      {categories.filter(cat => !['INVOICE', 'NOTE', 'ADVANCE', 'SERVICE', 'PRODUCT', 'OTHER'].includes(cat)).map((category) => (
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
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setNewCategoryModalOpen(true)}
                    className="border-gray-600 bg-white text-black hover:bg-gray-100 shrink-0"
                    title="Cadastrar nova categoria"
                  >
                    <Plus size={16} />
                  </Button>
                </div>
              </div>

              {/* Forma de Pagamento */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-seguranca-lightgray flex items-center gap-2">
                  <DollarSign size={14} />
                  Forma de Pagamento *
                </label>
                <Select
                  value={formData.paymentMethod || 'PIX'}
                  onValueChange={(value) => handleInputChange('paymentMethod', value)}
                  required
                >
                  <SelectTrigger className="border-gray-600 bg-white text-black focus:border-seguranca-yellow focus:ring-seguranca-yellow">
                    <SelectValue placeholder="Selecione a forma de pagamento" />
                  </SelectTrigger>
                  <SelectContent className="bg-seguranca-black border-gray-600">
                    <SelectItem value="PIX" className="text-seguranca-lightgray hover:bg-seguranca-graphite">PIX</SelectItem>
                    <SelectItem value="BOLETO" className="text-seguranca-lightgray hover:bg-seguranca-graphite">Boleto</SelectItem>
                    <SelectItem value="TRANSFER" className="text-seguranca-lightgray hover:bg-seguranca-graphite">Transferência</SelectItem>
                    <SelectItem value="CASH" className="text-seguranca-lightgray hover:bg-seguranca-graphite">Dinheiro</SelectItem>
                    <SelectItem value="CARD" className="text-seguranca-lightgray hover:bg-seguranca-graphite">Cartão</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-seguranca-lightgray flex items-center gap-2">
                  <Tag size={14} />
                  Status *
                </label>
                <Select
                  value={formData.status}
                  onValueChange={(value: any) => handleInputChange('status', value)}
                  required
                >
                  <SelectTrigger className="border-gray-600 bg-white text-black focus:border-seguranca-yellow focus:ring-seguranca-yellow">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent className="bg-seguranca-black border-gray-600">
                    <SelectItem value="ABERTA" className="text-seguranca-lightgray hover:bg-seguranca-graphite">Pendente / Aberta</SelectItem>
                    <SelectItem value="RECEBIDA" className="text-seguranca-lightgray hover:bg-seguranca-graphite">Pago / Recebida</SelectItem>
                    <SelectItem value="VENCIDA" className="text-seguranca-lightgray hover:bg-seguranca-graphite">Vencido</SelectItem>
                    <SelectItem value="CANCELADA" className="text-seguranca-lightgray hover:bg-seguranca-graphite">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
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
                  Opcional. Víncula esta conta a receber a uma conta contábil do Plano de Contas.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-seguranca-lightgray">Categoria *</label>
                    <Select
                      value={selectedCategoriaPaiId || 'none'}
                      onValueChange={(value) => {
                        setSelectedCategoriaPaiId(value === 'none' ? '' : value);
                        handleInputChange('subcategoriaId', '');
                      }}
                    >
                      <SelectTrigger className="border-gray-600 bg-white text-black focus:border-seguranca-yellow focus:ring-seguranca-yellow">
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
                          return;
                        }
                        handleInputChange('subcategoriaId', value);
                      }}
                      disabled={!selectedCategoriaPaiId}
                    >
                      <SelectTrigger className="border-gray-600 bg-white text-black focus:border-seguranca-yellow focus:ring-seguranca-yellow">
                        <SelectValue placeholder="Selecione a conta contábil" />
                      </SelectTrigger>
                      <SelectContent className="bg-seguranca-black border-gray-600">
                        <SelectItem value="none" className="text-gray-400 hover:bg-seguranca-graphite">
                          Nenhuma
                        </SelectItem>
                        {filteredSubcategorias.map((sub) => (
                          <SelectItem key={sub.id} value={sub.id} className="text-seguranca-lightgray hover:bg-seguranca-graphite">
                            {sub.codigo} - {sub.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!selectedCategoriaPaiId && (
                      <p className="text-xs text-gray-400">Selecione a categoria do plano para listar as contas.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Seção 6: Informações Adicionais */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-seguranca-yellow flex items-center gap-2">
              <FileText size={18} />
              Informações Adicionais
            </h3>
            <div className="grid grid-cols-1 gap-6">
              {/* Observações */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-seguranca-lightgray flex items-center gap-2">
                  <FileText size={14} />
                  Observações
                </label>
                <Textarea
                  value={formData.observacoes}
                  onChange={(e) => handleInputChange('observacoes', e.target.value)}
                  placeholder="Observações adicionais (opcional)"
                  className="border-gray-600 bg-white text-black placeholder:text-gray-500 focus:border-seguranca-yellow focus:ring-seguranca-yellow"
                  rows={3}
                />
              </div>
            </div>
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
              className="bg-green-600 hover:bg-green-700"
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

        {/* Modal de Nova Categoria */}
        <Dialog open={newCategoryModalOpen} onOpenChange={setNewCategoryModalOpen}>
          <DialogContent 
            onCloseAutoFocus={(e) => e.preventDefault()}
            className="sm:max-w-[400px] bg-seguranca-graphite border-gray-600 text-white"
          >
            <DialogHeader>
              <DialogTitle className="text-seguranca-yellow">Nova Categoria</DialogTitle>
              <DialogDescription className="text-gray-300">
                Crie uma categoria para classificar a conta a receber
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                placeholder="Nome da categoria"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newCategoryName.trim()) {
                    e.preventDefault();
                    handleCreateCategory();
                  }
                }}
                className="border-gray-600 bg-white text-black placeholder:text-gray-500 focus:border-seguranca-yellow focus:ring-seguranca-yellow"
                autoFocus
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setNewCategoryModalOpen(false);
                    setNewCategoryName('');
                  }}
                  className="border-gray-600 text-white hover:bg-seguranca-black"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={handleCreateCategory}
                  disabled={!newCategoryName.trim()}
                  className="bg-seguranca-yellow hover:bg-seguranca-yellow/90 text-black"
                >
                  <Plus size={16} className="mr-2" />
                  Criar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
};