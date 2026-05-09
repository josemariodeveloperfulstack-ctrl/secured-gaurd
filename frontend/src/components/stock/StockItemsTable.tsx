import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Search, 
  Filter, 
  Edit, 
  TrendingUp, 
  Package,
  RefreshCw,
  Trash2,
  SquareMousePointer
} from 'lucide-react';
import { StockItem, StockCategory, StockCategoryLabels } from '@/types/stock';
import { stockService } from '@/services/stockService';
import { useToast } from '@/hooks/use-toast';

interface StockItemsTableProps {
  items: StockItem[];
  onEdit: (item: StockItem) => void;
  onCreateMovement: (item: StockItem) => void;
  onRefresh: () => void;
}

const StockItemsTable: React.FC<StockItemsTableProps> = ({
  items: initialItems,
  onEdit,
  onCreateMovement,
  onRefresh
}) => {
  const [items, setItems] = useState<StockItem[]>(Array.isArray(initialItems) ? initialItems : []);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [lowStockFilter, setLowStockFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deletingBulk, setDeletingBulk] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmBulkOpen, setConfirmBulkOpen] = useState(false);
  const [confirmOneOpen, setConfirmOneOpen] = useState(false);
  const [itemPendingDelete, setItemPendingDelete] = useState<StockItem | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setItems(Array.isArray(initialItems) ? initialItems : []);
    setSelectedIds([]);
  }, [initialItems]);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const filters: any = {};
      
      if (searchTerm) filters.searchTerm = searchTerm;
      if (categoryFilter !== 'all') filters.category = categoryFilter as StockCategory;
      if (lowStockFilter === 'true') filters.lowStock = true;
      
      const result = await stockService.searchItems(filters);
      setItems(result.content);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao buscar itens.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setCategoryFilter('all');
    setLowStockFilter('all');
    setItems(initialItems);
    setSelectedIds([]);
  };

  const filteredItems = useMemo(() => {
    return (Array.isArray(items) ? items : []).filter((item) => {
      const matchesSearch =
        !searchTerm ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.fullName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
      const matchesLowStock =
        lowStockFilter === 'all' ||
        (lowStockFilter === 'true' && item.isLowStock) ||
        (lowStockFilter === 'false' && !item.isLowStock);

      return matchesSearch && matchesCategory && matchesLowStock;
    });
  }, [items, searchTerm, categoryFilter, lowStockFilter]);

  const filteredIds = useMemo(() => filteredItems.map((i) => i.id), [filteredItems]);

  const headerCheckboxState = useMemo((): boolean | 'indeterminate' => {
    if (filteredIds.length === 0) return false;
    const selectedInView = filteredIds.filter((id) => selectedIds.includes(id));
    if (selectedInView.length === 0) return false;
    if (selectedInView.length === filteredIds.length) return true;
    return 'indeterminate';
  }, [filteredIds, selectedIds]);

  const toggleSelectId = (id: string, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? (prev.includes(id) ? prev : [...prev, id]) : prev.filter((x) => x !== id)
    );
  };

  const selectAllFiltered = () => {
    setSelectedIds((prev) => {
      const set = new Set(prev);
      filteredIds.forEach((id) => set.add(id));
      return Array.from(set);
    });
  };

  const clearSelection = () => setSelectedIds([]);

  const setHeaderSelectAll = (checked: boolean | string) => {
    const on = checked === true;
    if (on) {
      selectAllFiltered();
    } else {
      setSelectedIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    }
  };

  const openDeleteOne = (item: StockItem) => {
    setItemPendingDelete(item);
    setConfirmOneOpen(true);
  };

  const runDeleteOne = async () => {
    const item = itemPendingDelete;
    if (!item) return;
    setDeletingId(item.id);
    try {
      await stockService.deleteItem(item.id);
      toast({ title: 'Item removido', description: `${item.name} foi inativado na lista.` });
      setConfirmOneOpen(false);
      setItemPendingDelete(null);
      setSelectedIds((prev) => prev.filter((id) => id !== item.id));
      await Promise.resolve(onRefresh());
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível excluir o item.', variant: 'destructive' });
    } finally {
      setDeletingId(null);
    }
  };

  const runDeleteBulk = async () => {
    const ids = selectedIds.filter((id) => filteredIds.includes(id));
    if (ids.length === 0) {
      setConfirmBulkOpen(false);
      return;
    }
    setDeletingBulk(true);
    try {
      let ok = 0;
      for (const id of ids) {
        try {
          await stockService.deleteItem(id);
          ok++;
        } catch {
          /* continua com os demais */
        }
      }
      toast({
        title: 'Exclusão em lote',
        description: `${ok} de ${ids.length} item(ns) removido(s) da listagem (inativados).`,
        variant: ok < ids.length ? 'destructive' : 'default',
      });
      setConfirmBulkOpen(false);
      clearSelection();
      await Promise.resolve(onRefresh());
    } finally {
      setDeletingBulk(false);
    }
  };


  const getStockBadge = (item: StockItem) => {
    if (item.currentQuantity === 0) {
      return <Badge variant="destructive">Sem Estoque</Badge>;
    } else if (item.isLowStock) {
      return <Badge variant="secondary" className="border-orange-500 text-orange-600">Baixo Estoque</Badge>;
    } else {
      return <Badge variant="default" className="bg-green-600">Normal</Badge>;
    }
  };

  return (
    <div className="space-y-4">

      {/* Filtros */}
      <Card className="bg-seguranca-graphite border-gray-600">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-seguranca-lightgray">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-seguranca-lightgray">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Nome, código..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-seguranca-lightgray">Categoria</label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="bg-seguranca-black border-gray-600 text-seguranca-lightgray">
                  <SelectValue placeholder="Todas as categorias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  {Object.entries(StockCategoryLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-seguranca-lightgray">Estoque</label>
              <Select value={lowStockFilter} onValueChange={setLowStockFilter}>
                <SelectTrigger className="bg-seguranca-black border-gray-600 text-seguranca-lightgray">
                  <SelectValue placeholder="Todos os itens" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os itens</SelectItem>
                  <SelectItem value="true">Baixo estoque</SelectItem>
                  <SelectItem value="false">Estoque normal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-seguranca-lightgray">Ações</label>
              <div className="flex gap-2">
                <Button onClick={handleSearch} disabled={loading} className="bg-seguranca-red hover:bg-seguranca-darkred">
                  <Search className="h-4 w-4 mr-2" />
                  Buscar
                </Button>
                <Button variant="outline" onClick={clearFilters} className="border-gray-600 text-seguranca-lightgray">
                  Limpar
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mt-4">
            <p className="text-sm text-gray-400">
              {filteredItems.length} item(ns) encontrado(s)
              {selectedIds.length > 0 ? ` · ${selectedIds.length} selecionado(s)` : ''}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={filteredIds.length === 0}
                onClick={selectAllFiltered}
                className="border-gray-600 text-seguranca-lightgray"
              >
                <SquareMousePointer className="h-4 w-4 mr-2" />
                Selecionar todos
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={selectedIds.length === 0}
                onClick={clearSelection}
                className="border-gray-600 text-seguranca-lightgray"
              >
                Limpar seleção
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={selectedIds.length === 0 || deletingBulk}
                onClick={() => setConfirmBulkOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir selecionados
              </Button>
              <Button variant="outline" size="sm" onClick={onRefresh} className="border-gray-600 text-seguranca-lightgray">
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card className="bg-seguranca-graphite border-gray-600">
        <CardContent className="p-0">
          {filteredItems.length === 0 ? (
            <div className="text-center py-8">
              <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-seguranca-lightgray mb-2">
                Nenhum item encontrado
              </h3>
              <p className="text-gray-400 mb-4">
                Não há itens que correspondam aos filtros selecionados.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-gray-600">
                  <TableHead className="w-10 text-seguranca-lightgray">
                    <Checkbox
                      aria-label="Selecionar todos os itens visíveis"
                      checked={headerCheckboxState}
                      onCheckedChange={(v) => setHeaderSelectAll(v)}
                    />
                  </TableHead>
                  <TableHead className="text-seguranca-lightgray">Código</TableHead>
                  <TableHead className="text-seguranca-lightgray">Item</TableHead>
                  <TableHead className="text-seguranca-lightgray">Categoria</TableHead>
                  <TableHead className="text-seguranca-lightgray">Estoque</TableHead>
                  <TableHead className="text-seguranca-lightgray">Status</TableHead>
                  <TableHead className="text-seguranca-lightgray">Valor Unit.</TableHead>
                  <TableHead className="text-seguranca-lightgray">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id} className="border-gray-600 hover:bg-seguranca-black/50">
                    <TableCell className="w-10">
                      <Checkbox
                        aria-label={`Selecionar ${item.name}`}
                        checked={selectedIds.includes(item.id)}
                        onCheckedChange={(v) => toggleSelectId(item.id, v === true)}
                      />
                    </TableCell>
                    <TableCell className="text-seguranca-lightgray font-mono">
                      {item.code}
                    </TableCell>
                    
                    <TableCell className="min-w-0">
                      <div className="min-w-0 max-w-[300px]">
                        <p className="font-medium text-seguranca-lightgray truncate" title={item.name}>{item.name}</p>
                        {item.sizeVariation && (
                          <p className="text-sm text-gray-400 truncate">Tamanho: {item.sizeVariation}</p>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <Badge variant="outline" className="border-gray-600 text-gray-300">
                        {StockCategoryLabels[item.category]}
                      </Badge>
                    </TableCell>
                    
                    <TableCell>
                      <div className="text-center">
                        <p className="font-bold text-seguranca-lightgray">{item.currentQuantity}</p>
                        <p className="text-xs text-gray-400">Mín: {item.minimumQuantity}</p>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      {getStockBadge(item)}
                    </TableCell>
                    
                    <TableCell className="text-seguranca-lightgray">
                      {item.unitCost ? `R$ ${item.unitCost.toFixed(2)}` : '-'}
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(item)}
                          className="text-seguranca-lightgray hover:bg-seguranca-black"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onCreateMovement(item)}
                          className="text-seguranca-yellow hover:bg-seguranca-black"
                        >
                          <TrendingUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={deletingId === item.id}
                          onClick={() => openDeleteOne(item)}
                          className="text-red-400 hover:bg-seguranca-black hover:text-red-300"
                          title="Excluir item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={confirmOneOpen}
        onOpenChange={(open) => {
          setConfirmOneOpen(open);
          if (!open) setItemPendingDelete(null);
        }}
      >
        <AlertDialogContent className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir item?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              {itemPendingDelete
                ? `O item "${itemPendingDelete.name}" (${itemPendingDelete.code}) será removido da listagem ativa. O histórico de movimentações permanece no sistema.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-600">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={(e) => {
                e.preventDefault();
                void runDeleteOne();
              }}
              disabled={!!deletingId}
            >
              {deletingId ? 'Excluindo…' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmBulkOpen} onOpenChange={setConfirmBulkOpen}>
        <AlertDialogContent className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir itens selecionados?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Serão inativados{' '}
              <strong className="text-seguranca-lightgray">
                {selectedIds.filter((id) => filteredIds.includes(id)).length}
              </strong>{' '}
              item(ns) da listagem. Use filtros e &quot;Selecionar todos&quot; para alinhar a lista antes de confirmar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-600">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={(e) => {
                e.preventDefault();
                void runDeleteBulk();
              }}
              disabled={deletingBulk}
            >
              {deletingBulk ? 'Excluindo…' : 'Excluir selecionados'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default StockItemsTable;