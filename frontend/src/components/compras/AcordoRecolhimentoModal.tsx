import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableHead, 
  TableRow, 
  TableCell 
} from '@/components/ui/table';
import { 
  Plus, 
  Trash2, 
  Search, 
  Building2, 
  Calendar,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { 
  acordoRecolhimentoService, 
  AcordoRecolhimento, 
  AcordoRecolhimentoItem 
} from '@/services/acordoRecolhimentoService';
import api from '@/services/api';

interface AcordoRecolhimentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  acordo?: AcordoRecolhimento;
}

const AcordoRecolhimentoModal: React.FC<AcordoRecolhimentoModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  acordo
}) => {
  const [formData, setFormData] = useState<Partial<AcordoRecolhimento>>({
    fornecedorId: '',
    fornecedorNome: '',
    fornecedorCnpj: '',
    dataAcordo: new Date().toISOString().split('T')[0],
    motivo: '',
    observacoes: '',
    itens: []
  });
  
  const [loading, setLoading] = useState(false);
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [searchFornecedor, setSearchFornecedor] = useState('');
  const [showFornecedorList, setShowFornecedorList] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    if (acordo) {
      setFormData({
        ...acordo,
        dataAcordo: new Date(acordo.dataAcordo).toISOString().split('T')[0]
      });
    } else {
      setFormData({
        fornecedorId: '',
        fornecedorNome: '',
        fornecedorCnpj: '',
        dataAcordo: new Date().toISOString().split('T')[0],
        motivo: '',
        observacoes: '',
        itens: []
      });
    }
  }, [acordo, isOpen]);

  const fetchFornecedores = async (search: string) => {
    if (search.length < 2) return;
    try {
      const response = await api.get(`/providers/search?query=${search}`);
      setFornecedores(response.data || []);
      setShowFornecedorList(true);
    } catch (error) {
      console.error('Erro ao buscar fornecedores:', error);
    }
  };

  const handleSelectFornecedor = (f: any) => {
    setFormData(prev => ({
      ...prev,
      fornecedorId: f.id,
      fornecedorNome: f.name || f.razaoSocial,
      fornecedorCnpj: f.cnpj
    }));
    setSearchFornecedor(f.name || f.razaoSocial);
    setShowFornecedorList(false);
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      itens: [
        ...(prev.itens || []),
        { descricao: '', quantidade: 1, unidade: 'UNID' }
      ]
    }));
  };

  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      itens: prev.itens?.filter((_, i) => i !== index)
    }));
  };

  const updateItem = (index: number, field: keyof AcordoRecolhimentoItem, value: any) => {
    const newItems = [...(formData.itens || [])];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData(prev => ({ ...prev, itens: newItems }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.fornecedorId) {
      toast({ title: 'Atenção', description: 'Selecione um fornecedor.', variant: 'destructive' });
      return;
    }

    if (!formData.itens || formData.itens.length === 0) {
      toast({ title: 'Atenção', description: 'Adicione pelo menos um item.', variant: 'destructive' });
      return;
    }

    try {
      setLoading(true);
      if (acordo?.id) {
        await acordoRecolhimentoService.update(acordo.id, formData as AcordoRecolhimento);
        toast({ title: 'Sucesso!', description: 'Acordo atualizado com sucesso.' });
      } else {
        await acordoRecolhimentoService.create(formData as AcordoRecolhimento);
        toast({ title: 'Sucesso!', description: 'Acordo criado com sucesso.' });
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao salvar acordo:', error);
      toast({ title: 'Erro!', description: 'Falha ao salvar o acordo.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-seguranca-graphite text-white border-gray-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Plus className="text-seguranca-yellow" />
            {acordo ? 'Editar Acordo' : 'Novo Acordo de Recolhimento'}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Preencha os dados abaixo para registrar o acordo com o fornecedor.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 relative">
              <Label htmlFor="fornecedor" className="text-gray-300">Fornecedor</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <Input
                  id="fornecedor"
                  placeholder="Buscar fornecedor..."
                  className="pl-10 bg-seguranca-black border-gray-700 text-white"
                  value={formData.fornecedorNome ? formData.fornecedorNome : searchFornecedor}
                  disabled={!!acordo}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSearchFornecedor(val);
                    setFormData(prev => ({ ...prev, fornecedorId: '', fornecedorNome: '' }));
                    if (val.length >= 2) fetchFornecedores(val);
                  }}
                />
              </div>
              
              {showFornecedorList && fornecedores.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {fornecedores.map(f => (
                    <div 
                      key={f.id}
                      className="p-3 hover:bg-gray-700 cursor-pointer border-b border-gray-700 last:border-0"
                      onClick={() => handleSelectFornecedor(f)}
                    >
                      <div className="font-medium">{f.name || f.razaoSocial}</div>
                      <div className="text-xs text-gray-400">{f.cnpj}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="data" className="text-gray-300">Data do Acordo</Label>
              <Input
                id="data"
                type="date"
                className="bg-seguranca-black border-gray-700 text-white"
                value={formData.dataAcordo}
                onChange={(e) => setFormData(prev => ({ ...prev, dataAcordo: e.target.value }))}
              />
            </div>

            <div className="col-span-full space-y-2">
              <Label htmlFor="motivo" className="text-gray-300">Motivo do Recolhimento</Label>
              <Input
                id="motivo"
                placeholder="Ex: Devolução por avaria, Fim de comodato..."
                className="bg-seguranca-black border-gray-700 text-white"
                value={formData.motivo}
                onChange={(e) => setFormData(prev => ({ ...prev, motivo: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-seguranca-yellow flex items-center gap-2">
                Itens para Recolhimento
              </h3>
              <Button type="button" size="sm" onClick={addItem} className="bg-blue-600 hover:bg-blue-700">
                <Plus size={16} className="mr-1" /> Add Item
              </Button>
            </div>

            <div className="bg-seguranca-black rounded-lg p-2 border border-gray-700">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700">
                    <TableHead className="text-gray-400">Descrição</TableHead>
                    <TableHead className="text-gray-400 w-32">Quantidade</TableHead>
                    <TableHead className="text-gray-400 w-32">Unidade</TableHead>
                    <TableHead className="text-right text-gray-400 w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {formData.itens?.length === 0 ? (
                    <TableRow className="border-gray-700">
                      <TableCell colSpan={4} className="text-center py-6 text-gray-500 italic">
                        Nenhum item adicionado
                      </TableCell>
                    </TableRow>
                  ) : (
                    formData.itens?.map((item, index) => (
                      <TableRow key={index} className="border-gray-700">
                        <TableCell>
                          <Input
                            placeholder="Descrição do item..."
                            className="bg-transparent border-gray-700"
                            value={item.descricao}
                            onChange={(e) => updateItem(index, 'descricao', e.target.value)}
                            required
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            className="bg-transparent border-gray-700"
                            value={item.quantidade}
                            onChange={(e) => updateItem(index, 'quantidade', Number(e.target.value))}
                            required
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            placeholder="Ex: UNID, KG..."
                            className="bg-transparent border-gray-700"
                            value={item.unidade}
                            onChange={(e) => updateItem(index, 'unidade', e.target.value)}
                            required
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => removeItem(index)}
                            className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="obs" className="text-gray-300">Observações Adicionais</Label>
            <Textarea
              id="obs"
              placeholder="Informações complementares..."
              className="bg-seguranca-black border-gray-700 text-white min-h-[100px]"
              value={formData.observacoes}
              onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="border-gray-700 text-gray-300">
              Cancelar
            </Button>
            <Button 
              type="submit" 
              className="bg-seguranca-yellow text-black hover:bg-seguranca-yellow/90 px-8"
              disabled={loading}
            >
              {loading ? 'Salvando...' : (acordo ? 'Atualizar' : 'Salvar')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AcordoRecolhimentoModal;
