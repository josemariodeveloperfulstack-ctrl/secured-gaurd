import React from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, MapPin, Inbox } from 'lucide-react';
import { StorageShelf } from '@/types/stock';
import { stockService } from '@/services/stockService';
import { useToast } from '@/hooks/use-toast';

interface ShelfListProps {
  shelves: StorageShelf[];
  loading: boolean;
  onEdit: (shelf: StorageShelf) => void;
  onRefresh: () => void;
}

const ShelfList: React.FC<ShelfListProps> = ({ shelves, loading, onEdit, onRefresh }) => {
  const { toast } = useToast();

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta prateleira? Isso pode afetar itens vinculados.')) return;
    
    try {
      await stockService.deleteShelf(id);
      toast({
        title: "Sucesso",
        description: "Prateleira excluída com sucesso."
      });
      onRefresh();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao excluir prateleira.",
        variant: "destructive"
      });
    }
  };

  if (loading && shelves.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-seguranca-yellow"></div>
      </div>
    );
  }

  if (shelves.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed border-gray-700 rounded-lg">
        <Inbox className="h-12 w-12 mx-auto text-gray-600 mb-4" />
        <p className="text-gray-400">Nenhuma prateleira cadastrada.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader className="border-gray-700">
        <TableRow className="hover:bg-transparent border-gray-700">
          <TableHead className="text-seguranca-yellow">Identificação</TableHead>
          <TableHead className="text-seguranca-yellow">Localização</TableHead>
          <TableHead className="text-seguranca-yellow">Status</TableHead>
          <TableHead className="text-right text-seguranca-yellow">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {shelves.map((shelf) => (
          <TableRow key={shelf.id} className="border-gray-700 hover:bg-seguranca-black/50">
            <TableCell className="font-medium text-seguranca-lightgray">
              {shelf.identification}
            </TableCell>
            <TableCell className="text-gray-400">
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                <span>
                  {[
                    shelf.block && `Bloco ${shelf.block}`,
                    shelf.section && `Seção ${shelf.section}`,
                    shelf.aisle && `Corredor ${shelf.aisle}`,
                    shelf.room && `Sala/Cômado ${shelf.room}`
                  ].filter(Boolean).join(' • ') || 'Local não especificado'}
                </span>
              </div>
              {shelf.compartmentInfo && (
                <div className="text-xs mt-1 italic">{shelf.compartmentInfo}</div>
              )}
            </TableCell>
            <TableCell>
              <Badge variant={shelf.active ? "outline" : "secondary"} className={shelf.active ? "border-green-500 text-green-500" : ""}>
                {shelf.active ? 'Ativo' : 'Inativo'}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => onEdit(shelf)}
                  className="hover:bg-seguranca-yellow/20 hover:text-seguranca-yellow"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleDelete(shelf.id)}
                  className="hover:bg-red-500/20 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default ShelfList;
