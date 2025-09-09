import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  User, 
  CalendarDays, 
  FileText, 
  CreditCard,
  Building,
  Mail,
  Phone,
  MapPin,
  Save,
  X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { ptBR } from 'date-fns/locale/pt-BR';
import { formatDateForBackend, parseDateFromBackend, DEFAULT_DATE_PICKER_PROPS } from '@/utils/dateUtils';

interface Cliente {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  documento: string;
  endereco: string;
  cidade: string;
  estado: string;
  cep: string;
  limitCredito: number;
  diasVencimento: number;
  status: 'ativo' | 'inativo' | 'bloqueado';
}

interface ContaAReceberFormData {
  clienteId: string;
  numeroFatura: string;
  descricao: string;
  valor: number;
  dataEmissao: Date;
  dataVencimento: Date;
  categoria: 'fatura' | 'nota' | 'adiantamento' | 'servico' | 'produto' | 'outros';
  formaPagamento: 'pix' | 'boleto' | 'transferencia' | 'dinheiro' | 'cartao';
  observacoes?: string;
}

interface ContasAReceberFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editMode?: boolean;
  contaData?: any;
}

export const ContasAReceberFormModal: React.FC<ContasAReceberFormModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
  editMode = false,
  contaData
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [invoiceNumbers, setInvoiceNumbers] = useState<string[]>([]);
  const [showInvoiceSuggestions, setShowInvoiceSuggestions] = useState(false);
  
  const [formData, setFormData] = useState<ContaAReceberFormData>({
    clienteId: '',
    numeroFatura: '',
    descricao: '',
    valor: 0,
    dataEmissao: new Date(),
    dataVencimento: new Date(),
    categoria: 'fatura',
    formaPagamento: 'pix',
    observacoes: ''
  });

  // Carregar clientes quando o modal abre
  useEffect(() => {
    if (open) {
      loadClientes();
    }
  }, [open]);

  // Preencher dados quando em modo de edição
  useEffect(() => {
    if (editMode && contaData) {
      setFormData({
        clienteId: contaData.cliente?.id || '',
        numeroFatura: contaData.numeroFatura || '',
        descricao: contaData.descricao || '',
        valor: contaData.valor || 0,
        dataEmissao: contaData.dataEmissao ? new Date(contaData.dataEmissao) : new Date(),
        dataVencimento: contaData.dataVencimento ? new Date(contaData.dataVencimento) : new Date(),
        categoria: contaData.categoria || 'fatura',
        formaPagamento: contaData.formaPagamento || 'pix',
        observacoes: contaData.observacoes || ''
      });
      
      if (contaData.cliente) {
        setSelectedCliente(contaData.cliente);
      }
    } else {
      // Reset form quando não está em modo de edição
      setFormData({
        clienteId: '',
        numeroFatura: '',
        descricao: '',
        valor: 0,
        dataEmissao: new Date(),
        dataVencimento: new Date(),
        categoria: 'fatura',
        formaPagamento: 'pix',
        observacoes: ''
      });
      setSelectedCliente(null);
    }
  }, [editMode, contaData, open]);

  const loadClientes = async () => {
    try {
      // Simular carregamento de clientes - substitua pela chamada real da API
      const mockClientes: Cliente[] = [
        {
          id: '1',
          nome: 'Empresa ABC Ltda',
          email: 'contato@empresaabc.com',
          telefone: '(11) 99999-9999',
          documento: '12.345.678/0001-90',
          endereco: 'Rua das Empresas, 123',
          cidade: 'São Paulo',
          estado: 'SP',
          cep: '01234-567',
          limitCredito: 50000,
          diasVencimento: 30,
          status: 'ativo'
        },
        {
          id: '2',
          nome: 'Comércio XYZ S/A',
          email: 'financeiro@comercioxyz.com',
          telefone: '(11) 88888-8888',
          documento: '98.765.432/0001-10',
          endereco: 'Av. Comercial, 456',
          cidade: 'São Paulo',
          estado: 'SP',
          cep: '04567-890',
          limitCredito: 30000,
          diasVencimento: 15,
          status: 'ativo'
        }
      ];
      setClientes(mockClientes);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar a lista de clientes",
        variant: "destructive"
      });
    }
  };

  const searchInvoiceNumbers = async (term: string) => {
    if (term.length < 2) {
      setInvoiceNumbers([]);
      setShowInvoiceSuggestions(false);
      return;
    }

    try {
      const numbers = await contasAReceberService.searchInvoiceNumbers(term);
      setInvoiceNumbers(numbers);
      setShowInvoiceSuggestions(true);
    } catch (error) {
      console.error('Erro ao buscar números de fatura:', error);
      setInvoiceNumbers([]);
      setShowInvoiceSuggestions(false);
    }
  };

  const handleInputChange = (field: keyof ContaAReceberFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleClienteChange = (clienteId: string) => {
    const cliente = clientes.find(c => c.id === clienteId);
    setSelectedCliente(cliente || null);
    handleInputChange('clienteId', clienteId);
  };

  // Função para formatar valor para exibição (formato brasileiro)
  const formatCurrencyForDisplay = (value: number | null): string => {
    if (value === null || value === undefined) return '0,00';
    
    const formatted = value.toFixed(2).replace('.', ',');
    const parts = formatted.split(',');
    const integerPart = parts[0];
    const decimalPart = parts[1];
    
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    
    return `${formattedInteger},${decimalPart}`;
  };

  // Função para converter string brasileira para número
  const parseBrazilianCurrency = (value: string): number => {
    if (!value || value.trim() === '') return 0;
    
    const cleanValue = value.replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(cleanValue);
    return isNaN(parsed) ? 0 : parsed;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.clienteId) {
      toast({
        title: "Erro",
        description: "Selecione um cliente",
        variant: "destructive"
      });
      return;
    }

    if (!formData.descricao.trim()) {
      toast({
        title: "Erro",
        description: "Descrição é obrigatória",
        variant: "destructive"
      });
      return;
    }

    if (formData.valor <= 0) {
      toast({
        title: "Erro",
        description: "Valor deve ser maior que zero",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      // Simular chamada para API - substitua pela integração real
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Sucesso",
        description: editMode ? "Conta a receber atualizada com sucesso!" : "Conta a receber criada com sucesso!"
      });
      
      onSuccess();
      onOpenChange(false);
      
    } catch (error) {
      console.error('Erro ao salvar conta a receber:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a conta a receber",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'ativo': { color: 'bg-green-500 text-white', label: 'Ativo' },
      'inativo': { color: 'bg-gray-500 text-white', label: 'Inativo' },
      'bloqueado': { color: 'bg-red-500 text-white', label: 'Bloqueado' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig['ativo'];
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto bg-seguranca-graphite border-gray-700 text-seguranca-lightgray">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-seguranca-lightgray">
            <DollarSign className="text-seguranca-yellow" size={24} />
            {editMode ? 'Editar Conta a Receber' : 'Nova Conta a Receber'}
          </DialogTitle>
          <DialogDescription className="text-seguranca-lightgray">
            {editMode ? 'Edite os dados da conta a receber selecionada.' : 'Preencha os dados para criar uma nova conta a receber.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Datas */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-seguranca-lightgray flex items-center gap-2 border-b border-gray-700 pb-2">
              <CalendarDays className="text-seguranca-yellow" size={20} />
              Datas
            </h3>
            
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
                  selected={formData.dataVencimento}
                  onChange={(date: Date) => handleInputChange('dataVencimento', date)}
                  {...DEFAULT_DATE_PICKER_PROPS}
                  className="w-full p-2 border border-gray-600 rounded-md bg-seguranca-black text-seguranca-lightgray focus:border-seguranca-yellow focus:ring-seguranca-yellow"
                  required
                />
              </div>
            </div>
          </div>

          {/* Informações do Cliente */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-seguranca-lightgray flex items-center gap-2 border-b border-gray-700 pb-2">
              <User className="text-seguranca-yellow" size={20} />
              Informações do Cliente
            </h3>
            
            <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-seguranca-lightgray">Cliente *</label>
                <Select value={formData.clienteId} onValueChange={handleClienteChange}>
                  <SelectTrigger className="border-gray-600 bg-seguranca-black text-seguranca-lightgray focus:border-seguranca-yellow focus:ring-seguranca-yellow">
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent className="bg-seguranca-black border-gray-600">
                    {clientes.map((cliente) => (
                      <SelectItem 
                        key={cliente.id} 
                        value={cliente.id}
                        className="text-seguranca-lightgray hover:bg-seguranca-graphite"
                      >
                        <div className="flex items-center justify-between w-full">
                          <span>{cliente.nome}</span>
                          {getStatusBadge(cliente.status)}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedCliente && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-seguranca-lightgray">Informações do Cliente</label>
                  <div className="p-3 bg-seguranca-black/50 rounded-lg border border-gray-600">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Mail className="text-seguranca-yellow" size={14} />
                        <span className="text-seguranca-lightgray">{selectedCliente.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="text-seguranca-yellow" size={14} />
                        <span className="text-seguranca-lightgray">{selectedCliente.telefone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Building className="text-seguranca-yellow" size={14} />
                        <span className="text-seguranca-lightgray">{selectedCliente.documento}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="text-seguranca-yellow" size={14} />
                        <span className="text-seguranca-lightgray">{selectedCliente.cidade}/{selectedCliente.estado}</span>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-600">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Limite de Crédito:</span>
                        <span className="text-seguranca-yellow">R$ {selectedCliente.limitCredito.toLocaleString('pt-BR')}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Dias de Vencimento:</span>
                        <span className="text-seguranca-lightgray">{selectedCliente.diasVencimento} dias</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Informações da Conta */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-seguranca-lightgray flex items-center gap-2 border-b border-gray-700 pb-2">
              <FileText className="text-seguranca-yellow" size={20} />
              Informações da Conta
            </h3>
            
            <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-seguranca-lightgray">Número da Fatura *</label>
                <div className="relative">
                  <Input
                    type="text"
                    value={formData.numeroFatura}
                    onChange={(e) => {
                      const value = e.target.value;
                      handleInputChange('numeroFatura', value);
                      searchInvoiceNumbers(value);
                    }}
                    onFocus={() => {
                      if (invoiceNumbers.length > 0) {
                        setShowInvoiceSuggestions(true);
                      }
                    }}
                    onBlur={() => {
                      // Delay para permitir clique nas sugestões
                      setTimeout(() => setShowInvoiceSuggestions(false), 200);
                    }}
                    placeholder="Ex: FAT-2024-001"
                    className="border-gray-600 bg-seguranca-black text-seguranca-lightgray focus:border-seguranca-yellow focus:ring-seguranca-yellow"
                    required
                  />
                  
                  {/* Sugestões de números de fatura */}
                  {showInvoiceSuggestions && invoiceNumbers.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-seguranca-graphite border border-gray-600 rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {invoiceNumbers.map((number, index) => (
                        <div
                          key={index}
                          className="px-3 py-2 text-seguranca-lightgray hover:bg-seguranca-black cursor-pointer text-sm"
                          onClick={() => {
                            handleInputChange('numeroFatura', number);
                            setShowInvoiceSuggestions(false);
                          }}
                        >
                          {number}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-seguranca-lightgray">Categoria *</label>
                <Select value={formData.categoria} onValueChange={(value: any) => handleInputChange('categoria', value)}>
                  <SelectTrigger className="border-gray-600 bg-seguranca-black text-seguranca-lightgray focus:border-seguranca-yellow focus:ring-seguranca-yellow">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-seguranca-black border-gray-600">
                    <SelectItem value="fatura" className="text-seguranca-lightgray hover:bg-seguranca-graphite">Fatura</SelectItem>
                    <SelectItem value="nota" className="text-seguranca-lightgray hover:bg-seguranca-graphite">Nota Fiscal</SelectItem>
                    <SelectItem value="adiantamento" className="text-seguranca-lightgray hover:bg-seguranca-graphite">Adiantamento</SelectItem>
                    <SelectItem value="servico" className="text-seguranca-lightgray hover:bg-seguranca-graphite">Serviço</SelectItem>
                    <SelectItem value="produto" className="text-seguranca-lightgray hover:bg-seguranca-graphite">Produto</SelectItem>
                    <SelectItem value="outros" className="text-seguranca-lightgray hover:bg-seguranca-graphite">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-seguranca-lightgray">Descrição *</label>
              <Textarea
                value={formData.descricao}
                onChange={(e) => handleInputChange('descricao', e.target.value)}
                placeholder="Descreva os serviços ou produtos fornecidos..."
                className="border-gray-600 bg-seguranca-black text-seguranca-lightgray focus:border-seguranca-yellow focus:ring-seguranca-yellow"
                rows={3}
                required
              />
            </div>
          </div>

          {/* Valores e Pagamento */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-seguranca-lightgray flex items-center gap-2 border-b border-gray-700 pb-2">
              <DollarSign className="text-seguranca-yellow" size={20} />
              Valores e Pagamento
            </h3>
            
            <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-seguranca-lightgray">Valor *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-seguranca-lightgray">R$</span>
                  <Input
                    type="text"
                    value={formatCurrencyForDisplay(formData.valor)}
                    onChange={(e) => {
                      const rawValue = e.target.value;
                      let cleanValue = rawValue.replace(/[^\d,.]/g, '');
                      
                      if (cleanValue.includes('.') && cleanValue.includes(',')) {
                        cleanValue = cleanValue.replace(/\./g, '');
                      }
                      
                      if (cleanValue.includes('.') && !cleanValue.includes(',')) {
                        cleanValue = cleanValue.replace('.', ',');
                      }
                      
                      const parts = cleanValue.split(',');
                      if (parts.length > 2) {
                        cleanValue = parts[0] + ',' + parts.slice(1).join('');
                      }
                      
                      if (parts.length === 2 && parts[1].length > 2) {
                        cleanValue = parts[0] + ',' + parts[1].substring(0, 2);
                      }
                      
                      const numericValue = parseBrazilianCurrency(cleanValue);
                      handleInputChange('valor', numericValue);
                    }}
                    placeholder="0,00"
                    className="w-full p-2 pl-10 border border-gray-600 rounded-md bg-seguranca-black text-seguranca-lightgray focus:border-seguranca-yellow focus:ring-seguranca-yellow"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-seguranca-lightgray">Forma de Pagamento *</label>
                <Select value={formData.formaPagamento} onValueChange={(value: any) => handleInputChange('formaPagamento', value)}>
                  <SelectTrigger className="border-gray-600 bg-seguranca-black text-seguranca-lightgray focus:border-seguranca-yellow focus:ring-seguranca-yellow">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-seguranca-black border-gray-600">
                    <SelectItem value="pix" className="text-seguranca-lightgray hover:bg-seguranca-graphite">PIX</SelectItem>
                    <SelectItem value="boleto" className="text-seguranca-lightgray hover:bg-seguranca-graphite">Boleto</SelectItem>
                    <SelectItem value="transferencia" className="text-seguranca-lightgray hover:bg-seguranca-graphite">Transferência</SelectItem>
                    <SelectItem value="dinheiro" className="text-seguranca-lightgray hover:bg-seguranca-graphite">Dinheiro</SelectItem>
                    <SelectItem value="cartao" className="text-seguranca-lightgray hover:bg-seguranca-graphite">Cartão</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-seguranca-lightgray flex items-center gap-2 border-b border-gray-700 pb-2">
              <FileText className="text-seguranca-yellow" size={20} />
              Observações
            </h3>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-seguranca-lightgray">Observações</label>
              <Textarea
                value={formData.observacoes}
                onChange={(e) => handleInputChange('observacoes', e.target.value)}
                placeholder="Observações adicionais..."
                className="w-full border-gray-600 bg-seguranca-black text-seguranca-lightgray focus:border-seguranca-yellow focus:ring-seguranca-yellow"
                rows={4}
              />
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-700">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 border-gray-600 text-seguranca-lightgray hover:bg-seguranca-black hover:text-seguranca-yellow"
              disabled={loading}
            >
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-seguranca-yellow text-seguranca-black hover:bg-seguranca-yellow/90"
              disabled={loading}
            >
              <Save className="w-4 h-4 mr-2" />
              {loading ? 'Salvando...' : editMode ? 'Atualizar' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
