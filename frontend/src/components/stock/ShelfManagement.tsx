import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, RefreshCw, Layers, MapPin } from 'lucide-react';
import { stockService } from '@/services/stockService';
import { StorageShelf } from '@/types/stock';
import { useToast } from '@/hooks/use-toast';
import ShelfList from './ShelfList';
import ShelfForm from './ShelfForm';

const ShelfManagement: React.FC = () => {
  const [shelves, setShelves] = useState<StorageShelf[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingShelf, setEditingShelf] = useState<StorageShelf | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadShelves();
  }, []);

  const loadShelves = async () => {
    try {
      setLoading(true);
      const data = await stockService.getAllShelves();
      setShelves(data);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao carregar prateleiras.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingShelf(null);
    setIsFormOpen(true);
  };

  const handleEdit = (shelf: StorageShelf) => {
    setEditingShelf(shelf);
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    await loadShelves();
    setIsFormOpen(false);
    setEditingShelf(null);
  };

  const filteredShelves = shelves.filter(s => 
    s.identification.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.block && s.block.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (s.section && s.section.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <Card className="bg-seguranca-graphite border-gray-600">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-seguranca-lightgray flex items-center gap-2">
                <Layers className="h-5 w-5 text-seguranca-yellow" />
                Organização do Almoxarifado
              </CardTitle>
              <CardDescription className="text-gray-400">
                Gerencie as prateleiras, blocos e locais de armazenamento.
              </CardDescription>
            </div>
            <Button 
              onClick={handleCreate}
              className="bg-seguranca-red hover:bg-seguranca-darkred"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Prateleira
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Buscar por identificação, bloco ou seção..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 bg-seguranca-black border-gray-600 text-seguranca-lightgray"
              />
            </div>
            <Button variant="outline" onClick={loadShelves} className="border-gray-600">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          <ShelfList 
            shelves={filteredShelves} 
            loading={loading} 
            onEdit={handleEdit}
            onRefresh={loadShelves}
          />
        </CardContent>
      </Card>

      <ShelfForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        shelf={editingShelf}
        onSave={handleSave}
      />
    </div>
  );
};

export default ShelfManagement;
