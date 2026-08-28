import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { StockItem, CreateStockItemDTO, StockCategory, StockCategoryLabels, StorageShelf } from '@/types/stock';
import { stockService } from '@/services/stockService';
import { contasAPagarService, Supplier } from '@/services/contasAPagarService';
import { SupplierFormModal } from '@/components/estoque/SupplierFormModal';
import { useToast } from '@/hooks/use-toast';
import { 
  Package, 
  Hash, 
  Tag, 
  Ruler, 
  FileText, 
  Box, 
  DollarSign, 
  Building2, 
  Barcode, 
  Sparkles,
  Plus,
  Search,
  Check,
  ChevronsUpDown,
  MapPin
} from 'lucide-react';

interface StockItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: StockItem | null;
  onSave: () => void;
}

const StockItemModal: React.FC<StockItemModalProps> = ({
  open,
  onOpenChange,
  item,
  onSave
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [supplierSearchTerm, setSupplierSearchTerm] = useState('');
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [supplierComboboxOpen, setSupplierComboboxOpen] = useState(false);
  const [unitCostDisplay, setUnitCostDisplay] = useState('');
  const [previousUnitCost, setPreviousUnitCost] = useState<number | null>(null);
  const [savedUnitCost, setSavedUnitCost] = useState<number | null>(null);
  const [shelves, setShelves] = useState<StorageShelf[]>([]);
  const [loadingShelves, setLoadingShelves] = useState(false);
  const [formData, setFormData] = useState<CreateStockItemDTO>({
    code: '',
    name: '',
    category: StockCategory.UNIFORME_VIGILANCIA,
    sizeVariation: '',
    description: '',
    currentQuantity: 0,
    minimumQuantity: 0,
    unitCost: 0,
    supplier: '',
    barcode: '',
    notes: ''
  });

  const formatCurrency = (value: string): string => {
    // Remove tudo que não é dígito
    const digits = value.replace(/\D/g, '');
    
    if (!digits) return '';
    
    // Converte para número e divide por 100 para ter centavos
    const number = parseInt(digits, 10) / 100;
    
    // Formata no padrão brasileiro: 1.255,45
    return number.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const parseCurrency = (value: string): number => {
    // Remove pontos e substitui vírgula por ponto
    const cleaned = value.replace(/\./g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  };

  const formatCurrencyFromNumber = (value: number): string => {
    if (!value || value === 0) return '';
    return value.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    const load = async () => {
      try {
        setLoadingSuppliers(true);
        const data = await contasAPagarService.getFornecedores();
        if (cancelled) return;

        const list = Array.isArray(data) ? data : [];
        const filtered = list.filter((s) => {
          if (!s) return false;
          const id = s.id != null ? String(s.id) : '';
          const name = (s.name || (s as { nome?: string }).nome || '').trim();
          if (!id || !name) return false;
          if (s.isActive === false) return false;
          // Normalizar name se veio como nome
          if (!s.name && (s as { nome?: string }).nome) {
            (s as Supplier).name = (s as { nome?: string }).nome as string;
          }
          return true;
        });
        setSuppliers(filtered);
      } catch (error) {
        if (!cancelled) {
          console.error('Erro ao carregar fornecedores:', error);
          setSuppliers([]);
        }
      } finally {
        if (!cancelled) setLoadingSuppliers(false);
      }

      try {
        setLoadingShelves(true);
        const shelvesData = await stockService.getAllShelves();
        if (!cancelled) setShelves(shelvesData || []);
      } catch (error) {
        if (!cancelled) {
          console.error('Erro ao carregar prateleiras:', error);
          setShelves([]);
        }
      } finally {
        if (!cancelled) setLoadingShelves(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Removido loadShelves/loadSuppliers duplicados do effect antigo
  const loadSuppliers = async () => {
    try {
      setLoadingSuppliers(true);
      const data = await contasAPagarService.getFornecedores();
      const list = Array.isArray(data) ? data : [];
      const filtered = list.filter((s) => {
        if (!s?.id) return false;
        const name = (s.name || (s as { nome?: string }).nome || '').trim();
        if (!name) return false;
        if (!s.name) (s as Supplier).name = name;
        return s.isActive !== false;
      });
      setSuppliers(filtered);
    } catch (error) {
      console.error('Erro ao carregar fornecedores:', error);
      setSuppliers([]);
    } finally {
      setLoadingSuppliers(false);
    }
  };

  const loadShelves = async () => {
    try {
      setLoadingShelves(true);
      const data = await stockService.getAllShelves();
      setShelves(data || []);
    } catch (error) {
      console.error('Erro ao carregar prateleiras:', error);
    } finally {
      setLoadingShelves(false);
    }
  };

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    const applyItemToForm = (source: StockItem) => {
      setFormData({
        code: source.code,
        name: source.name,
        category: source.category,
        sizeVariation: source.sizeVariation || '',
        description: source.description || '',
        currentQuantity: source.currentQuantity,
        minimumQuantity: source.minimumQuantity,
        unitCost: source.unitCost || 0,
        supplier: source.supplier || '',
        barcode: source.barcode || '',
        caNumber: source.caNumber || '',
        requiresCa: source.requiresCa ?? (source.category === StockCategory.EPI),
        notes: source.notes || ''
      });
      if (source.unitCost) {
        setUnitCostDisplay(formatCurrencyFromNumber(source.unitCost));
      } else {
        setUnitCostDisplay('');
      }
      const prev =
        source.previousUnitCost != null && Number(source.previousUnitCost) > 0
          ? Number(source.previousUnitCost)
          : null;
      const saved =
        source.unitCost != null && Number(source.unitCost) > 0
          ? Number(source.unitCost)
          : null;
      setPreviousUnitCost(prev);
      setSavedUnitCost(saved);
    };

    if (item?.id) {
      applyItemToForm(item);
      // Recarrega do backend para garantir previousUnitCost atualizado
      (async () => {
        try {
          const fresh = await stockService.getItemById(item.id);
          if (!cancelled && fresh) {
            applyItemToForm(fresh);
          }
        } catch (err) {
          console.warn('Não foi possível recarregar item para valor unitário anterior:', err);
        }
      })();
    } else {
      setFormData({
        code: '',
        name: '',
        category: StockCategory.UNIFORME_VIGILANCIA,
        sizeVariation: '',
        description: '',
        currentQuantity: 0,
        minimumQuantity: 0,
        unitCost: 0,
        supplier: '',
        barcode: '',
        caNumber: '',
        requiresCa: false,
        notes: '',
        initialShelfId: '',
        initialFloor: ''
      });
      setUnitCostDisplay('');
      setPreviousUnitCost(null);
      setSavedUnitCost(null);
    }

    return () => {
      cancelled = true;
    };
  }, [item, open]);

  const filteredSuppliers = useMemo(() => {
    if (!supplierSearchTerm) return suppliers;
    const term = supplierSearchTerm.toLowerCase();
    return suppliers.filter((s) => {
      const nameMatch = s?.name?.toLowerCase().includes(term);
      const cnpjMatch = s?.cnpj?.toLowerCase().includes(term);
      return nameMatch || cnpjMatch;
    });
  }, [suppliers, supplierSearchTerm]);

  const selectedSupplier = suppliers.find(s => s.name === formData.supplier);

  const handleInputChange = (field: keyof CreateStockItemDTO, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCurrencyChange = (value: string) => {
    const formatted = formatCurrency(value);
    setUnitCostDisplay(formatted);
    // Se o campo estiver vazio, definir como 0, senão converter para número
    const numericValue = formatted ? parseCurrency(formatted) : 0;
    handleInputChange('unitCost', numericValue);
  };

  const handleSupplierSave = async (payload: any) => {
    try {
      const newSupplier = await contasAPagarService.createFornecedor(payload);
      toast({
        title: 'Sucesso',
        description: 'Fornecedor criado com sucesso!',
      });
      await loadSuppliers();
      // Selecionar automaticamente o fornecedor recém-criado
      handleInputChange('supplier', newSupplier.name);
      setIsSupplierModalOpen(false);
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Não foi possível salvar o fornecedor.';
      toast({
        title: 'Erro',
        description: msg,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.code || !formData.name) {
      toast({
        title: 'Erro',
        description: 'Código e nome são obrigatórios.',
        variant: 'destructive'
      });
      return;
    }

    const nameUpper = (formData.name || '').toUpperCase();
    const isEpiNameMatch = nameUpper.includes('COLETE BALÍSTICO') || nameUpper.includes('COLETE BALISTICO') ||
      nameUpper.includes('CALÇADO') || nameUpper.includes('CALCADO') || nameUpper.includes('SAPATO') || nameUpper.includes('BOTA') ||
      nameUpper.includes('CAPA DE CHUVA') || nameUpper.includes('ÓCULOS') || nameUpper.includes('OCULOS') ||
      nameUpper.includes('PROTETOR AURICULAR') || nameUpper.includes('CAPACETE') || nameUpper.includes('LUVA');

    const isGroup1Epi = formData.category === StockCategory.EPI || formData.requiresCa || isEpiNameMatch;
    const isNewItem = !item || !item.id;
    const hasExistingCa = item && item.caNumber && item.caNumber.trim().length > 0;

    // Obrigatoriedade de CA apenas no CADASTRO de novos EPIs (Grupo 1) ou se o item nunca teve CA cadastrado
    if (isNewItem && isGroup1Epi && (!formData.caNumber || !formData.caNumber.trim())) {
      toast({
        title: 'CA Obrigatório (NR-6 Grupo 1)',
        description: 'No cadastro de novos itens de EPI (Grupo 1: Colete, Calçado, Capa de Chuva, Óculos, Protetor, Capacete, Luva), é obrigatório informar o número do CA válido.',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      // Preparar dados para envio, garantindo que todos os campos obrigatórios estejam presentes
      const dataToSend: CreateStockItemDTO = {
        code: formData.code.trim(),
        name: formData.name.trim(),
        category: formData.category,
        sizeVariation: formData.sizeVariation?.trim() || undefined,
        description: formData.description?.trim() || undefined,
        currentQuantity: formData.currentQuantity ?? 0,
        minimumQuantity: formData.minimumQuantity ?? 0,
        // Garantir que unitCost seja um número válido ou undefined
        unitCost: (formData.unitCost && formData.unitCost > 0) ? 
                  (typeof formData.unitCost === 'number' ? formData.unitCost : parseFloat(String(formData.unitCost))) : 
                  undefined,
        supplier: formData.supplier?.trim() || undefined,
        barcode: formData.barcode?.trim() || undefined,
        caNumber: formData.caNumber?.trim() || undefined,
        requiresCa: isGroup1Epi,
        notes: formData.notes?.trim() || undefined
      };

      // Validar que unitCost não seja NaN
      if (dataToSend.unitCost !== undefined && isNaN(dataToSend.unitCost)) {
        dataToSend.unitCost = undefined;
      }

      console.log('📦 Dados sendo enviados:', JSON.stringify(dataToSend, null, 2));

      if (item) {
        await stockService.updateItem(item.id, dataToSend);
        toast({
          title: 'Sucesso!',
          description: 'Item atualizado com sucesso.',
        });
      } else {
        await stockService.createItem(dataToSend);
        toast({
          title: 'Sucesso!',
          description: 'Item criado com sucesso.',
        });
      }
      
      onSave();
      onOpenChange(false);
    } catch (error: any) {
      console.error('❌ Erro ao salvar item:', error);
      console.error('❌ Response data:', error?.response?.data);
      const errorMessage = error?.response?.data?.message || 
                          error?.response?.data?.error || 
                          error?.message || 
                          'Erro ao salvar item. Verifique os dados e tente novamente.';
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[95vw] max-w-[800px] max-h-[90vh] overflow-y-auto bg-gradient-to-br from-seguranca-graphite/95 to-seguranca-black/95 border-gray-600/50 shadow-2xl backdrop-blur-sm">
          <DialogHeader className="space-y-3 sm:space-y-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-seguranca-red/20 to-seguranca-red/10 border border-seguranca-red/30 shadow-lg shadow-seguranca-red/10">
                <Package className="h-5 w-5 sm:h-6 sm:w-6 text-seguranca-red" />
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-lg sm:text-xl lg:text-2xl font-bold text-white truncate">
                  {item ? 'Editar Item de Estoque' : 'Novo Item de Estoque'}
                </DialogTitle>
                <DialogDescription className="text-gray-400 text-sm sm:text-base mt-1">
                  Preencha os dados do item de estoque
                </DialogDescription>
              </div>
            </div>
            
            <Card className="bg-gradient-to-r from-seguranca-red/10 to-seguranca-darkred/10 border-seguranca-red/20 p-3 sm:p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-seguranca-red">
                <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="font-medium">Campos obrigatórios:</span>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="destructive" className="text-xs px-2 py-1">Código</Badge>
                  <Badge variant="destructive" className="text-xs px-2 py-1">Nome</Badge>
                  <Badge variant="destructive" className="text-xs px-2 py-1">Categoria</Badge>
                </div>
              </div>
            </Card>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 mt-4">
            {/* Informações Básicas */}
            <div className="space-y-3 sm:space-y-4">
              <h3 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
                <Tag className="h-4 w-4 sm:h-5 sm:w-5 text-seguranca-red flex-shrink-0" />
                <span className="truncate">Informações Básicas</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code" className="text-gray-300 flex items-center gap-2 text-sm sm:text-base">
                    <Hash className="h-3 w-3 sm:h-4 sm:w-4 text-seguranca-red flex-shrink-0" />
                    Código *
                  </Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => handleInputChange('code', e.target.value)}
                    placeholder="Ex: UNI-VIG-CAM-M"
                    required
                    className="bg-seguranca-black/50 border-gray-600/30 text-white placeholder-gray-400 focus:border-seguranca-red/50 focus:ring-seguranca-red/20 h-10 sm:h-11 text-sm sm:text-base"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name" className="text-gray-300 flex items-center gap-2 text-sm sm:text-base">
                    <Package className="h-3 w-3 sm:h-4 sm:w-4 text-seguranca-red flex-shrink-0" />
                    Nome *
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Ex: Camisa Vigilância"
                    required
                    className="bg-seguranca-black/50 border-gray-600/30 text-white placeholder-gray-400 focus:border-seguranca-red/50 focus:ring-seguranca-red/20 h-10 sm:h-11 text-sm sm:text-base"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-gray-300 flex items-center gap-2 text-sm sm:text-base">
                    <Tag className="h-3 w-3 sm:h-4 sm:w-4 text-seguranca-red flex-shrink-0" />
                    Categoria *
                  </Label>
                  <Select 
                    value={formData.category} 
                    onValueChange={(value) => handleInputChange('category', value as StockCategory)}
                  >
                    <SelectTrigger className="bg-seguranca-black/50 border-gray-600/30 text-white focus:border-seguranca-red/50 focus:ring-seguranca-red/20 h-10 sm:h-11 text-sm sm:text-base">
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent className="bg-seguranca-graphite border-gray-600">
                      {Object.entries(StockCategoryLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key} className="text-white hover:bg-seguranca-black focus:bg-seguranca-black">
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sizeVariation" className="text-gray-300 flex items-center gap-2 text-sm sm:text-base">
                    <Ruler className="h-3 w-3 sm:h-4 sm:w-4 text-seguranca-red flex-shrink-0" />
                    Tamanho/Numeração
                  </Label>
                  <Input
                    id="sizeVariation"
                    value={formData.sizeVariation}
                    onChange={(e) => handleInputChange('sizeVariation', e.target.value)}
                    placeholder="Ex: M, G, 42, 44..."
                    className="bg-seguranca-black/50 border-gray-600/30 text-white placeholder-gray-400 focus:border-seguranca-red/50 focus:ring-seguranca-red/20 h-10 sm:h-11 text-sm sm:text-base"
                  />
                </div>
              </div>

              {/* Seção NR-6: Grupo 1 (EPI - Exige CA) vs Grupo 2 (Uniformes / Acessórios - Sem CA) */}
              {(() => {
                const nameUpper = (formData.name || '').toUpperCase();
                const isNameEpi = nameUpper.includes('COLETE BALÍSTICO') || nameUpper.includes('COLETE BALISTICO') ||
                  nameUpper.includes('CALÇADO') || nameUpper.includes('CALCADO') || nameUpper.includes('SAPATO') || nameUpper.includes('BOTA') ||
                  nameUpper.includes('CAPA DE CHUVA') || nameUpper.includes('ÓCULOS') || nameUpper.includes('OCULOS') ||
                  nameUpper.includes('PROTETOR AURICULAR') || nameUpper.includes('CAPACETE') || nameUpper.includes('LUVA');
                const isGroup1 = formData.category === StockCategory.EPI || formData.requiresCa || isNameEpi;

                return (
                  <div className="space-y-3 bg-seguranca-black/30 border border-gray-700/50 p-3.5 rounded-lg">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Tag className={`h-4 w-4 ${isGroup1 ? 'text-yellow-400' : 'text-blue-400'}`} />
                        <span className="text-sm font-semibold text-white">Classificação NR-6:</span>
                        <Badge className={`${isGroup1 ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40' : 'bg-blue-500/20 text-blue-400 border-blue-500/40'}`}>
                          {isGroup1 ? 'Grupo 1: EPI (Exige CA = SIM)' : 'Grupo 2: Uniforme / Acessório (Exige CA = NÃO)'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label htmlFor="toggleRequiresCa" className="text-xs text-gray-400 cursor-pointer">
                          Exige CA?
                        </Label>
                        <input
                          id="toggleRequiresCa"
                          type="checkbox"
                          checked={Boolean(formData.requiresCa || isGroup1)}
                          onChange={(e) => handleInputChange('requiresCa', e.target.checked)}
                          className="w-4 h-4 rounded border-gray-600 bg-seguranca-black text-seguranca-yellow focus:ring-yellow-400"
                        />
                      </div>
                    </div>

                    {isGroup1 ? (
                      <div className="space-y-2 pt-1">
                        <Label htmlFor="caNumber" className="text-yellow-400 flex items-center gap-2 text-sm font-semibold">
                          Número do CA (Certificado de Aprovação - NR-6) *
                        </Label>
                        <Input
                          id="caNumber"
                          value={formData.caNumber || ''}
                          onChange={(e) => handleInputChange('caNumber', e.target.value)}
                          placeholder="Digite o número do CA válido (Ex: 12345)"
                          className="bg-seguranca-black/50 border-yellow-500/50 text-white placeholder-gray-400 focus:border-yellow-400 focus:ring-yellow-400/20 h-10 text-sm font-mono"
                        />
                        <p className="text-[11px] text-yellow-300/80">
                          ⚠️ <strong>Trava de Segurança:</strong> O sistema exige o número do CA para salvar o cadastro e dar entrada na nota fiscal. Este CA virá preenchido automaticamente ao gerar a Ficha de EPI do funcionário.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2 pt-1">
                        <Label htmlFor="caNumber" className="text-gray-300 flex items-center gap-2 text-xs">
                          Número do CA (Opcional para Uniformes e Acessórios)
                        </Label>
                        <Input
                          id="caNumber"
                          value={formData.caNumber || ''}
                          onChange={(e) => handleInputChange('caNumber', e.target.value)}
                          placeholder="Opcional"
                          className="bg-seguranca-black/50 border-gray-600/30 text-white placeholder-gray-400 h-9 text-xs font-mono"
                        />
                        <p className="text-[11px] text-gray-400">
                          Uniformes (camisa, calça, gôndola), coletes refletivos e acessórios não exigem CA, mas seu estoque e entregas por funcionário são controlados normalmente.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="space-y-2">
                <Label htmlFor="description" className="text-gray-300 flex items-center gap-2 text-sm sm:text-base">
                  <FileText className="h-3 w-3 sm:h-4 sm:w-4 text-seguranca-red flex-shrink-0" />
                  Descrição
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Descrição detalhada do item..."
                  rows={3}
                  className="bg-seguranca-black/50 border-gray-600/30 text-white placeholder-gray-400 focus:border-seguranca-red/50 focus:ring-seguranca-red/20 text-sm sm:text-base resize-none"
                />
              </div>
            </div>

            {/* Estoque */}
            <div className="space-y-3 sm:space-y-4">
              <h3 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
                <Box className="h-4 w-4 sm:h-5 sm:w-5 text-seguranca-red flex-shrink-0" />
                <span className="truncate">Controle de Estoque</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label htmlFor="currentQuantity" className="text-gray-300 text-sm sm:text-base">
                    Quantidade Atual
                  </Label>
                  <Input
                    id="currentQuantity"
                    type="number"
                    min="0"
                    value={formData.currentQuantity}
                    onChange={(e) => handleInputChange('currentQuantity', parseInt(e.target.value) || 0)}
                    className="bg-seguranca-black/50 border-gray-600/30 text-white placeholder-gray-400 focus:border-seguranca-red/50 focus:ring-seguranca-red/20 h-10 sm:h-11 text-sm sm:text-base"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="minimumQuantity" className="text-gray-300 text-sm sm:text-base">
                    Quantidade Mínima
                  </Label>
                  <Input
                    id="minimumQuantity"
                    type="number"
                    min="0"
                    value={formData.minimumQuantity}
                    onChange={(e) => handleInputChange('minimumQuantity', parseInt(e.target.value) || 0)}
                    className="bg-seguranca-black/50 border-gray-600/30 text-white placeholder-gray-400 focus:border-seguranca-red/50 focus:ring-seguranca-red/20 h-10 sm:h-11 text-sm sm:text-base"
                  />
                </div>
              </div>
            </div>
            {/* Localização Inicial (Para Novos Itens) */}
            {!item && (
              <div className="space-y-3 sm:space-y-4">
                <h3 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
                  <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-seguranca-yellow flex-shrink-0" />
                  <span className="truncate">Localização Inicial</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="initialShelfId" className="text-gray-300 text-sm sm:text-base">
                      Prateleira
                    </Label>
                    <Select
                      value={formData.initialShelfId || ''}
                      onValueChange={(value) => handleInputChange('initialShelfId', value)}
                    >
                      <SelectTrigger className="bg-seguranca-black/50 border-gray-600/30 text-white h-10 sm:h-11">
                        <SelectValue placeholder={loadingShelves ? "Carregando..." : "Selecione a prateleira"} />
                      </SelectTrigger>
                      <SelectContent className="bg-seguranca-graphite border-gray-600 max-h-60">
                        {shelves.length === 0 && !loadingShelves ? (
                          <div className="p-2 text-sm text-gray-400">Nenhuma prateleira cadastrada</div>
                        ) : (
                          shelves.map((shelf) => (
                            <SelectItem key={shelf.id} value={shelf.id} className="text-white hover:bg-seguranca-black focus:bg-seguranca-black">
                              {shelf.identification} {shelf.room ? `(${shelf.room})` : ''}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="initialFloor" className="text-gray-300 text-sm sm:text-base">
                      Andar/Compartimento
                    </Label>
                    <Input
                      id="initialFloor"
                      type="text"
                      value={formData.initialFloor || ''}
                      onChange={(e) => handleInputChange('initialFloor', e.target.value)}
                      placeholder="Ex: Andar 2, Gaveta A..."
                      className="bg-seguranca-black/50 border-gray-600/30 text-white placeholder-gray-400 focus:border-seguranca-red/50 focus:ring-seguranca-red/20 h-10 sm:h-11 text-sm sm:text-base"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Localizações no Almoxarifado (Para Itens Existentes) */}
            {item && item.locations && item.locations.length > 0 && (
              <div className="space-y-3 sm:space-y-4">
                <h3 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
                  <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-seguranca-yellow flex-shrink-0" />
                  <span className="truncate">Localizações no Almoxarifado</span>
                </h3>
                <div className="grid grid-cols-1 gap-2">
                  {item.locations.map((loc, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-seguranca-black/30 border border-gray-600/30 rounded-lg">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-seguranca-lightgray">
                          {loc.shelfIdentification}
                        </span>
                        <span className="text-xs text-gray-500">
                          {loc.floor ? `Andar/Compartimento: ${loc.floor}` : 'Sem andar especificado'}
                        </span>
                      </div>
                      <Badge variant="outline" className="border-seguranca-yellow text-seguranca-yellow bg-seguranca-yellow/5">
                        {loc.quantity} {loc.quantity === 1 ? 'unidade' : 'unidades'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Informações Comerciais */}
            <div className="space-y-3 sm:space-y-4">
              <h3 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
                <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-seguranca-red flex-shrink-0" />
                <span className="truncate">Informações Comerciais</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {item && (previousUnitCost != null || savedUnitCost != null) && (() => {
                  // Anterior = último preço salvo antes do atual (histórico real no banco)
                  // Atual (salvo) = preço vigente
                  // Variação ao digitar: compara o digitado com o atual salvo (prévia da próxima troca)
                  const anteriorLabel = previousUnitCost != null
                    ? `R$ ${formatCurrencyFromNumber(previousUnitCost)}`
                    : '—';
                  const atualSalvoLabel = savedUnitCost != null
                    ? `R$ ${formatCurrencyFromNumber(savedUnitCost)}`
                    : '—';
                  const baseline = savedUnitCost;
                  const curr = formData.unitCost || 0;
                  let variationNode: React.ReactNode = <p className="text-gray-400 mt-1">—</p>;
                  if (baseline != null && baseline > 0 && curr) {
                    const diff = curr - baseline;
                    const pct = (diff / baseline) * 100;
                    const up = diff > 0;
                    const same = Math.abs(diff) < 0.005;
                    let variationText = 'Sem variação';
                    let variationClass = 'text-gray-300';
                    if (!same) {
                      variationText = `${up ? '+' : ''}R$ ${formatCurrencyFromNumber(Math.abs(diff))} (${up ? '+' : ''}${pct.toFixed(1)}%)`;
                      variationClass = up ? 'text-red-400' : 'text-green-400';
                    }
                    variationNode = <p className={`font-medium mt-1 ${variationClass}`}>{variationText}</p>;
                  }
                  return (
                  <div className="space-y-2 sm:col-span-2 rounded-lg border border-gray-600/40 bg-seguranca-black/40 p-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                      <div>
                        <Label className="text-gray-400 text-xs">Valor Unitário Anterior</Label>
                        <p className="text-white font-medium mt-1">{anteriorLabel}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">
                          {previousUnitCost != null
                            ? 'Último valor antes da alteração salva'
                            : 'Aparece após a 1ª troca de preço salva'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-gray-400 text-xs">Valor Unitário Atual (salvo)</Label>
                        <p className="text-seguranca-yellow font-medium mt-1">{atualSalvoLabel}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">Valor vigente até salvar a alteração</p>
                      </div>
                      <div>
                        <Label className="text-gray-400 text-xs">Variação</Label>
                        {variationNode}
                        <p className="text-[10px] text-gray-500 mt-0.5">Compara atual salvo × valor digitado</p>
                      </div>
                    </div>
                  </div>
                  );
                })()}

                <div className="space-y-2">
                  <Label htmlFor="unitCost" className="text-gray-300 text-sm sm:text-base">
                    Valor Unitário Atual (R$)
                  </Label>
                  <Input
                    id="unitCost"
                    type="text"
                    value={unitCostDisplay}
                    onChange={(e) => handleCurrencyChange(e.target.value)}
                    placeholder="0,00"
                    className="bg-seguranca-black/50 border-gray-600/30 text-white placeholder-gray-400 focus:border-seguranca-red/50 focus:ring-seguranca-red/20 h-10 sm:h-11 text-sm sm:text-base"
                  />
                  <p className="text-[10px] text-gray-500">
                    {item
                      ? 'Ao salvar um valor diferente, o atual passa a ser o anterior automaticamente.'
                      : 'Informe o valor unitário deste cadastro.'}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="supplier" className="text-gray-300 flex items-center gap-2 text-sm sm:text-base">
                    <Building2 className="h-3 w-3 sm:h-4 sm:w-4 text-seguranca-red flex-shrink-0" />
                    Fornecedor
                  </Label>
                  {loadingSuppliers ? (
                    <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                      <p className="text-xs sm:text-sm text-blue-400 text-center">
                        Carregando fornecedores...
                      </p>
                    </div>
                  ) : suppliers.length === 0 ? (
                    <div className="space-y-2">
                      <Input
                        id="supplier"
                        value={formData.supplier || ''}
                        onChange={(e) => handleInputChange('supplier', e.target.value)}
                        placeholder="Digite o nome do fornecedor"
                        className="bg-seguranca-black/50 border-gray-600/30 text-white placeholder-gray-400 focus:border-seguranca-red/50 h-10 sm:h-11 text-sm sm:text-base"
                      />
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => loadSuppliers()}
                          className="border-gray-600 text-gray-300 hover:bg-gray-700 text-xs h-8"
                          size="sm"
                        >
                          Recarregar lista
                        </Button>
                        <Button
                          type="button"
                          onClick={() => setIsSupplierModalOpen(true)}
                          className="bg-seguranca-red hover:bg-seguranca-darkred text-white text-xs h-8"
                          size="sm"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Cadastrar Fornecedor
                        </Button>
                      </div>
                      <p className="text-[10px] text-gray-500">
                        Nenhum fornecedor na lista. Digite o nome ou cadastre um novo.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Popover open={supplierComboboxOpen} onOpenChange={setSupplierComboboxOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            role="combobox"
                            aria-expanded={supplierComboboxOpen}
                            className="w-full justify-between bg-seguranca-black/50 border-gray-600/30 text-white hover:bg-seguranca-graphite hover:border-seguranca-red/50 focus:border-seguranca-red/50 h-10 sm:h-11 text-sm sm:text-base"
                          >
                            {selectedSupplier || formData.supplier ? (
                              <div className="flex items-center gap-2 truncate">
                                <Building2 className="h-4 w-4 flex-shrink-0 text-seguranca-red" />
                                <span className="truncate">{selectedSupplier?.name || formData.supplier}</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 flex-shrink-0 text-gray-400" />
                                <span className="text-gray-400">Selecione o fornecedor</span>
                              </div>
                            )}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent 
                          className="w-[var(--radix-popover-trigger-width)] p-0 bg-seguranca-graphite border-gray-600 z-[10020] !z-[10020]" 
                          align="start"
                          style={{ zIndex: 10020 }}
                        >
                          <Command className="bg-seguranca-graphite text-white">
                            <CommandInput 
                              placeholder="Buscar fornecedor..." 
                              className="text-white"
                              value={supplierSearchTerm}
                              onValueChange={setSupplierSearchTerm}
                            />
                            <CommandList>
                              <CommandEmpty className="text-gray-400 py-4 text-center text-sm">
                                {supplierSearchTerm 
                                  ? 'Nenhum fornecedor encontrado com o termo buscado.'
                                  : 'Nenhum fornecedor disponível.'}
                              </CommandEmpty>
                              <CommandGroup>
                                {filteredSuppliers.length > 0 ? (
                                  filteredSuppliers.map((supplier) => (
                                    <CommandItem
                                      key={supplier.id}
                                      value={supplier.name}
                                      onSelect={() => {
                                        handleInputChange('supplier', supplier.name);
                                        setSupplierComboboxOpen(false);
                                        setSupplierSearchTerm('');
                                      }}
                                      className="text-white hover:bg-seguranca-black focus:bg-seguranca-black cursor-pointer"
                                    >
                                      <Check
                                        className={`mr-2 h-4 w-4 ${
                                          formData.supplier === supplier.name ? 'opacity-100' : 'opacity-0'
                                        }`}
                                      />
                                      <div className="flex flex-col">
                                        <span>{supplier.name}</span>
                                        {supplier.cnpj && (
                                          <span className="text-xs text-gray-400">{supplier.cnpj}</span>
                                        )}
                                      </div>
                                    </CommandItem>
                                  ))
                                ) : (
                                  <div className="p-4 text-center text-sm text-gray-400">
                                    Nenhum fornecedor disponível
                                  </div>
                                )}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setIsSupplierModalOpen(true);
                          setSupplierComboboxOpen(false);
                        }}
                        className="w-full text-xs sm:text-sm text-seguranca-red hover:text-seguranca-darkred hover:bg-seguranca-red/10 h-8 sm:h-9"
                        size="sm"
                      >
                        <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        Cadastrar Novo Fornecedor
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="barcode" className="text-gray-300 flex items-center gap-2 text-sm sm:text-base">
                  <Barcode className="h-3 w-3 sm:h-4 sm:w-4 text-seguranca-red flex-shrink-0" />
                  Código de Barras
                </Label>
                <Input
                  id="barcode"
                  value={formData.barcode}
                  onChange={(e) => handleInputChange('barcode', e.target.value)}
                  placeholder="Código de barras do produto"
                  className="bg-seguranca-black/50 border-gray-600/30 text-white placeholder-gray-400 focus:border-seguranca-red/50 focus:ring-seguranca-red/20 h-10 sm:h-11 text-sm sm:text-base"
                />
              </div>
            </div>

            {/* Observações */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-gray-300 flex items-center gap-2 text-sm sm:text-base">
                <FileText className="h-3 w-3 sm:h-4 sm:w-4 text-seguranca-red flex-shrink-0" />
                Observações
              </Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Observações adicionais..."
                rows={2}
                className="bg-seguranca-black/50 border-gray-600/30 text-white placeholder-gray-400 focus:border-seguranca-red/50 focus:ring-seguranca-red/20 text-sm sm:text-base resize-none"
              />
            </div>

            {/* Botões */}
            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 sm:pt-6 border-t border-gray-600/30">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={loading}
                className="border-gray-600 text-seguranca-lightgray hover:bg-seguranca-graphite hover:border-seguranca-red/50 px-4 sm:px-6 h-10 sm:h-11 text-sm sm:text-base order-2 sm:order-1"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={loading}
                className="bg-gradient-to-r from-seguranca-red to-seguranca-darkred hover:from-seguranca-darkred hover:to-seguranca-red shadow-lg shadow-seguranca-red/20 px-4 sm:px-6 h-10 sm:h-11 text-sm sm:text-base order-1 sm:order-2"
              >
                {loading ? 'Salvando...' : (item ? 'Atualizar' : 'Criar Item')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Fornecedor */}
      <SupplierFormModal
        isOpen={isSupplierModalOpen}
        onClose={() => setIsSupplierModalOpen(false)}
        supplier={null}
        onSave={handleSupplierSave}
      />
    </>
  );
};

export default StockItemModal;
