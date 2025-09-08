import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { CalendarDays, DollarSign, FileText, Upload } from 'lucide-react';
import CurrencyInput from 'react-currency-input-field';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { ptBR } from 'date-fns/locale/pt-BR';
import { formatDateForBackend, parseDateFromBackend, DEFAULT_DATE_PICKER_PROPS } from '@/utils/dateUtils';
import { contasAPagarService, Supplier } from '@/services/contasAPagarService';

export interface ContaAPagar {
  id?: string;
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
  categoria?: string;
  centroCusto?: string;
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

  // Carregar fornecedores
  useEffect(() => {
    if (open) {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="text-green-600" size={24} />
            {editMode ? 'Editar Conta a Pagar' : 'Nova Conta a Pagar'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações Básicas */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Data de Vencimento *</label>
              <DatePicker
                selected={formData.vencimento}
                onChange={(date: Date) => handleInputChange('vencimento', date)}
                {...DEFAULT_DATE_PICKER_PROPS}
                required
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Fornecedor *</label>
              <Select 
                value={formData.fornecedorId} 
                onValueChange={(value) => {
                  const fornecedor = fornecedores.find(f => f.id === value);
                  handleInputChange('fornecedorId', value);
                  handleInputChange('fornecedor', fornecedor?.name || '');
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um fornecedor" />
                </SelectTrigger>
                <SelectContent>
                  {fornecedores.map((fornecedor) => (
                    <SelectItem key={fornecedor.id} value={fornecedor.id}>
                      {fornecedor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Descrição e Valor */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Descrição *</label>
              <Input
                value={formData.descricao}
                onChange={(e) => handleInputChange('descricao', e.target.value)}
                placeholder="Descrição da despesa"
                required
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Valor *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">R$</span>
                <CurrencyInput
                  prefix=""
                  decimalSeparator="," 
                  groupSeparator="."
                  value={formData.valor}
                  onValueChange={(value) => handleInputChange('valor', parseFloat(value || '0'))}
                  placeholder="0,00"
                  className="w-full p-2 pl-10 border rounded-md"
                  required
                />
              </div>
            </div>
          </div>

          {/* Tipo e Status */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo *</label>
              <Select value={formData.tipo} onValueChange={(value: 'FIXA' | 'VARIAVEL') => handleInputChange('tipo', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FIXA">Despesa Fixa</SelectItem>
                  <SelectItem value="VARIAVEL">Despesa Variável</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={formData.status} onValueChange={(value: any) => handleInputChange('status', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ABERTA">Aberta</SelectItem>
                  <SelectItem value="PAGA">Paga</SelectItem>
                  <SelectItem value="ATRASADA">Atrasada</SelectItem>
                  <SelectItem value="VENCIDA">Vencida</SelectItem>
                  <SelectItem value="CANCELADA">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Código de Barras */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Código de Barras</label>
            <Input
              value={formData.codigoBarras}
              onChange={(e) => handleInputChange('codigoBarras', e.target.value)}
              placeholder="Código de barras do boleto"
            />
          </div>

          {/* Categoria e Centro de Custo */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Categoria</label>
              <Input
                value={formData.categoria}
                onChange={(e) => handleInputChange('categoria', e.target.value)}
                placeholder="Ex: Manutenção, Material, Serviços"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Centro de Custo</label>
              <Input
                value={formData.centroCusto}
                onChange={(e) => handleInputChange('centroCusto', e.target.value)}
                placeholder="Ex: Operacional, Administrativo"
              />
            </div>
          </div>

          {/* Baixa e Data de Pagamento */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="baixa"
                checked={formData.baixa}
                onCheckedChange={(checked) => handleInputChange('baixa', checked)}
              />
              <label htmlFor="baixa" className="text-sm font-medium">
                Marcar como baixa no sistema
              </label>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Data de Pagamento</label>
              <DatePicker
                selected={formData.dataPagamento}
                onChange={(date: Date) => handleInputChange('dataPagamento', date)}
                {...DEFAULT_DATE_PICKER_PROPS}
                isClearable
              />
            </div>
          </div>

          {/* Upload de Comprovante */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Comprovante de Pagamento</label>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileUpload}
                className="flex-1"
              />
              <Button type="button" variant="outline" size="sm">
                <Upload size={16} className="mr-2" />
                Upload
              </Button>
            </div>
            {formData.comprovante && (
              <p className="text-sm text-green-600">
                Arquivo selecionado: {formData.comprovante.name}
              </p>
            )}
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Observações</label>
            <Textarea
              value={formData.observacoes}
              onChange={(e) => handleInputChange('observacoes', e.target.value)}
              placeholder="Observações sobre a conta"
              rows={3}
            />
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : (editMode ? 'Atualizar' : 'Criar Conta')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};