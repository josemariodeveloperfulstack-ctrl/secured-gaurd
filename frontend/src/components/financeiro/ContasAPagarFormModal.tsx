import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { CalendarDays, DollarSign, FileText, Upload, Plus } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { ptBR } from 'date-fns/locale/pt-BR';
import { formatDateForBackend, parseDateFromBackend, DEFAULT_DATE_PICKER_PROPS } from '@/utils/dateUtils';
import { contasAPagarService, Supplier } from '@/services/contasAPagarService';

export interface ContaAPagar {
  id?: string;
  numeroFatura?: string;
  dataEmissao?: Date;
  vencimento: Date;
  fornecedor: string;
  fornecedorId?: string;
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
  centroCusto?: string | undefined;
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
  const [loading, setLoading] = useState(false);
  const [fornecedores, setFornecedores] = useState<Supplier[]>([]);
  
  const [formData, setFormData] = useState<ContaAPagar>({
    dataEmissao: new Date(),
    vencimento: new Date(),
    fornecedor: '',
    fornecedorId: '',
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
  const [newCategory, setNewCategory] = useState<string>('');
  const [showNewCategoryInput, setShowNewCategoryInput] = useState<boolean>(false);

  // Carregar fornecedores, categorias e centros de custo
  useEffect(() => {
    if (open) {
      // Carregar fornecedores
      contasAPagarService.getFornecedores()
        .then(setFornecedores)
        .catch(error => {
          console.error('Erro ao carregar fornecedores:', error);
          toast({
            title: "Erro",
            description: "Erro ao carregar fornecedores. Usando dados de exemplo.",
            variant: "destructive"
          });
          // Fallback para dados de exemplo em caso de erro
          setFornecedores([
            { id: '1', name: 'Fornecedor Exemplo 1', isActive: true },
            { id: '2', name: 'Fornecedor Exemplo 2', isActive: true }
          ]);
        });

      // Carregar categorias
      contasAPagarService.getCategories()
        .then(setCategories)
        .catch(error => {
          console.error('Erro ao carregar categorias:', error);
        });

      // Carregar centros de custo
      contasAPagarService.getCostCenters()
        .then(setCostCenters)
        .catch(error => {
          console.error('Erro ao carregar centros de custo:', error);
        });
    }
  }, [open]);

  // Carregar dados para edição
  useEffect(() => {
    if (editMode && initialData) {
      setFormData({
        ...initialData,
        // Garantir que as datas são Date objects válidos
        vencimento: initialData.vencimento instanceof Date ? initialData.vencimento : new Date(),
        dataPagamento: initialData.dataPagamento instanceof Date ? initialData.dataPagamento : undefined
      });
    } else if (!open) {
      setFormData({
        dataEmissao: new Date(),
        vencimento: new Date(),
        fornecedor: '',
        fornecedorId: '',
        descricao: '',
        tipo: 'VARIAVEL',
        valor: 0,
        codigoBarras: '',
        status: 'ABERTA',
        baixa: false,
        dataPagamento: undefined,
        observacoes: '',
        categoria: '',
        centroCusto: ''
      });
    }
  }, [editMode, initialData, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.fornecedor || !formData.descricao || !formData.valor || !formData.vencimento) {
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
        await contasAPagarService.updateContaAPagar(initialData.id, formData);
        toast({
          title: "Sucesso",
          description: "Conta a pagar atualizada com sucesso!"
        });
      } else {
        await contasAPagarService.createContaAPagar(formData);
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

  const handleInputChange = (field: keyof ContaAPagar, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleInputChange('comprovante', file);
      toast({
        title: "Arquivo selecionado",
        description: `${file.name} foi selecionado para upload`
      });
    }
  };

  const handleAddNewCategory = () => {
    if (newCategory.trim() && !categories.includes(newCategory.trim())) {
      setCategories(prev => [...prev, newCategory.trim()]);
      handleInputChange('categoria', newCategory.trim());
      setNewCategory('');
      setShowNewCategoryInput(false);
      toast({
        title: "Categoria adicionada",
        description: `Categoria "${newCategory.trim()}" foi adicionada com sucesso`
      });
    }
  };

  const handleCategoryChange = (value: string) => {
    if (value === 'new') {
      setShowNewCategoryInput(true);
    } else {
      handleInputChange('categoria', value);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-seguranca-graphite border-gray-700 text-seguranca-lightgray" aria-describedby="conta-pagar-description">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-seguranca-lightgray">
            <DollarSign className="text-seguranca-yellow" size={24} />
            {editMode ? 'Editar Conta a Pagar' : 'Nova Conta a Pagar'}
          </DialogTitle>
          <p id="conta-pagar-description" className="text-sm text-seguranca-lightgray">
            {editMode ? 'Edite os dados da conta a pagar selecionada.' : 'Preencha os dados para criar uma nova conta a pagar.'}
          </p>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Data de Emissão e Data de Vencimento */}
          <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-seguranca-lightgray">Data de Emissão *</label>
              <DatePicker
                selected={formData.dataEmissao}
                onChange={(date: Date) => handleInputChange('dataEmissao', date)}
                {...DEFAULT_DATE_PICKER_PROPS}
                className="w-full p-2 border border-gray-600 rounded-md bg-seguranca-black text-seguranca-lightgray focus:border-seguranca-yellow focus:ring-seguranca-yellow"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-seguranca-lightgray">Data de Vencimento *</label>
              <DatePicker
                selected={formData.vencimento}
                onChange={(date: Date) => handleInputChange('vencimento', date)}
                {...DEFAULT_DATE_PICKER_PROPS}
                className="w-full p-2 border border-gray-600 rounded-md bg-seguranca-black text-seguranca-lightgray focus:border-seguranca-yellow focus:ring-seguranca-yellow"
                required
              />
            </div>
          </div>

          {/* Descrição */}
          <div className="space-y-2">
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
            <label className="text-sm font-medium text-seguranca-lightgray">Fornecedor *</label>
            <Select 
              value={formData.fornecedorId} 
              onValueChange={(value) => {
                const fornecedor = fornecedores.find(f => f.id === value);
                handleInputChange('fornecedorId', value);
                handleInputChange('fornecedor', fornecedor?.name || '');
              }}
            >
              <SelectTrigger className="border-gray-600 bg-seguranca-black text-seguranca-lightgray focus:border-seguranca-yellow focus:ring-seguranca-yellow">
                <SelectValue placeholder="Selecione um fornecedor" />
              </SelectTrigger>
              <SelectContent className="bg-seguranca-black border-gray-600">
                {fornecedores.map((fornecedor) => (
                  <SelectItem key={fornecedor.id} value={fornecedor.id} className="text-seguranca-lightgray hover:bg-seguranca-graphite">
                    {fornecedor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Valor, Tipo e Status */}
          <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-seguranca-lightgray">Valor *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-seguranca-lightgray">R$</span>
                <Input
                  type="text"
                  value={formData.valor ? formData.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00'}
                  onChange={(e) => {
                    // Remove tudo exceto números e vírgula
                    let value = e.target.value.replace(/[^\d,]/g, '');
                    
                    // Garante que há apenas uma vírgula
                    const parts = value.split(',');
                    if (parts.length > 2) {
                      value = parts[0] + ',' + parts.slice(1).join('');
                    }
                    
                    // Limita a 2 casas decimais após a vírgula
                    if (parts.length === 2 && parts[1].length > 2) {
                      value = parts[0] + ',' + parts[1].substring(0, 2);
                    }
                    
                    // Converte para número (substitui vírgula por ponto)
                    const numValue = parseFloat(value.replace(',', '.')) || 0;
                    handleInputChange('valor', numValue);
                  }}
                  placeholder="0,00"
                  className="w-full p-2 pl-10 border border-gray-600 rounded-md bg-seguranca-black text-seguranca-lightgray focus:border-seguranca-yellow focus:ring-seguranca-yellow"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-seguranca-lightgray">Tipo *</label>
              <Select value={formData.tipo} onValueChange={(value: 'FIXA' | 'VARIAVEL') => handleInputChange('tipo', value)}>
                <SelectTrigger className="border-gray-600 bg-seguranca-black text-seguranca-lightgray focus:border-seguranca-yellow focus:ring-seguranca-yellow">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-seguranca-black border-gray-600">
                  <SelectItem value="FIXA" className="text-seguranca-lightgray hover:bg-seguranca-graphite">Despesa Fixa</SelectItem>
                  <SelectItem value="VARIAVEL" className="text-seguranca-lightgray hover:bg-seguranca-graphite">Despesa Variável</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-seguranca-lightgray">Status</label>
              <Select value={formData.status} onValueChange={(value: any) => handleInputChange('status', value)}>
                <SelectTrigger className="border-gray-600 bg-seguranca-black text-seguranca-lightgray focus:border-seguranca-yellow focus:ring-seguranca-yellow">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-seguranca-black border-gray-600">
                  <SelectItem value="ABERTA" className="text-seguranca-lightgray hover:bg-seguranca-graphite">Aberta</SelectItem>
                  <SelectItem value="PAGA" className="text-seguranca-lightgray hover:bg-seguranca-graphite">Paga</SelectItem>
                  <SelectItem value="ATRASADA" className="text-seguranca-lightgray hover:bg-seguranca-graphite">Atrasada</SelectItem>
                  <SelectItem value="VENCIDA" className="text-seguranca-lightgray hover:bg-seguranca-graphite">Vencida</SelectItem>
                  <SelectItem value="CANCELADA" className="text-seguranca-lightgray hover:bg-seguranca-graphite">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Código de Barras */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-seguranca-lightgray">Código de Barras</label>
            <Input
              value={formData.codigoBarras}
              onChange={(e) => handleInputChange('codigoBarras', e.target.value)}
              placeholder="Código de barras do boleto"
              className="border-seguranca-graphite bg-seguranca-black text-seguranca-lightgray placeholder:text-gray-400 focus:border-seguranca-yellow focus:ring-seguranca-yellow"
            />
          </div>

          {/* Categoria e Centro de Custo */}
          <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-seguranca-lightgray">Categoria</label>
              {!showNewCategoryInput ? (
                <div className="flex gap-2">
                  <Select value={formData.categoria || undefined} onValueChange={handleCategoryChange}>
                    <SelectTrigger className="flex-1 border-gray-600 bg-seguranca-black text-seguranca-lightgray focus:border-seguranca-yellow focus:ring-seguranca-yellow">
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent className="bg-seguranca-black border-gray-600">
                      {categories.map((category) => (
                        <SelectItem key={category} value={category} className="text-seguranca-lightgray hover:bg-seguranca-graphite">
                          {category}
                        </SelectItem>
                      ))}
                      <SelectItem value="new" className="text-seguranca-yellow hover:bg-seguranca-graphite">
                        + Nova categoria
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="Digite o nome da nova categoria"
                    className="flex-1 border-gray-600 bg-seguranca-black text-seguranca-lightgray placeholder:text-gray-400 focus:border-seguranca-yellow focus:ring-seguranca-yellow"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddNewCategory()}
                  />
                  <Button 
                    type="button" 
                    onClick={handleAddNewCategory}
                    className="bg-seguranca-yellow text-seguranca-black hover:bg-yellow-500"
                    disabled={!newCategory.trim()}
                  >
                    <Plus size={16} />
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => {
                      setShowNewCategoryInput(false);
                      setNewCategory('');
                    }}
                    className="border-gray-600 text-seguranca-lightgray hover:bg-seguranca-graphite"
                  >
                    Cancelar
                  </Button>
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-seguranca-lightgray">Centro de Custo</label>
              <Select value={formData.centroCusto || undefined} onValueChange={(value) => handleInputChange('centroCusto', value)}>
                <SelectTrigger className="border-gray-600 bg-seguranca-black text-seguranca-lightgray focus:border-seguranca-yellow focus:ring-seguranca-yellow">
                  <SelectValue placeholder="Selecione um centro de custo" />
                </SelectTrigger>
                <SelectContent className="bg-seguranca-black border-gray-600">
                  {costCenters.map((costCenter) => (
                    <SelectItem key={costCenter} value={costCenter} className="text-seguranca-lightgray hover:bg-seguranca-graphite">
                      {costCenter}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Baixa e Data de Pagamento */}
          <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="baixa"
                checked={formData.baixa}
                onCheckedChange={(checked) => handleInputChange('baixa', checked)}
                className="border-gray-600 data-[state=checked]:bg-seguranca-yellow data-[state=checked]:border-seguranca-yellow"
              />
              <label htmlFor="baixa" className="text-sm font-medium text-seguranca-lightgray">
                Marcar como baixa no sistema
              </label>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-seguranca-lightgray">Data de Pagamento</label>
              <DatePicker
                selected={formData.dataPagamento}
                onChange={(date: Date) => handleInputChange('dataPagamento', date)}
                {...DEFAULT_DATE_PICKER_PROPS}
                className="w-full p-2 border border-gray-600 rounded-md bg-seguranca-black text-seguranca-lightgray focus:border-seguranca-yellow focus:ring-seguranca-yellow"
                isClearable
              />
            </div>
          </div>

          {/* Upload de Comprovante */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-seguranca-lightgray">Comprovante de Pagamento</label>
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileUpload}
                className="flex-1 border-gray-600 bg-seguranca-black text-seguranca-lightgray file:bg-seguranca-graphite file:text-seguranca-lightgray file:border-0 file:rounded-md file:px-3 file:py-1 file:mr-3"
              />
              <Button type="button" variant="outline" size="sm" className="border-gray-600 text-seguranca-lightgray hover:bg-seguranca-graphite hover:text-seguranca-lightgray">
                <Upload size={16} className="mr-2" />
                Upload
              </Button>
            </div>
            {formData.comprovante && (
              <p className="text-sm text-seguranca-yellow">
                Arquivo selecionado: {formData.comprovante.name}
              </p>
            )}
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-seguranca-lightgray">Observações</label>
            <Textarea
              value={formData.observacoes}
              onChange={(e) => handleInputChange('observacoes', e.target.value)}
              placeholder="Observações sobre a conta"
              rows={3}
              className="border-seguranca-graphite bg-seguranca-black text-seguranca-lightgray placeholder:text-gray-400 focus:border-seguranca-yellow focus:ring-seguranca-yellow"
            />
          </div>

          {/* Botões */}
          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t border-gray-700">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="border-gray-600 text-seguranca-lightgray hover:bg-seguranca-graphite hover:text-seguranca-lightgray"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="bg-seguranca-yellow text-seguranca-black hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Salvando...' : (editMode ? 'Atualizar' : 'Criar Conta')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};