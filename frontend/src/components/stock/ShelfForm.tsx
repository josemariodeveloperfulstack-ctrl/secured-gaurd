import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { stockService } from '@/services/stockService';
import { StorageShelf } from '@/types/stock';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface ShelfFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shelf: StorageShelf | null;
  onSave: () => void;
}

const ShelfForm: React.FC<ShelfFormProps> = ({ open, onOpenChange, shelf, onSave }) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  const [formData, setFormData] = useState<Partial<StorageShelf>>({
    identification: '',
    block: '',
    section: '',
    aisle: '',
    room: '',
    compartmentInfo: '',
    active: true,
  });

  useEffect(() => {
    if (shelf) {
      setFormData(shelf);
    } else {
      setFormData({
        identification: '',
        block: '',
        section: '',
        aisle: '',
        room: '',
        compartmentInfo: '',
        active: true,
      });
    }
  }, [shelf, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.identification) {
      toast({
        title: "Erro",
        description: "A identificação da prateleira é obrigatória.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      if (shelf) {
        await stockService.updateShelf(shelf.id, formData);
        toast({
          title: "Sucesso",
          description: "Prateleira atualizada com sucesso."
        });
      } else {
        await stockService.createShelf(formData);
        toast({
          title: "Sucesso",
          description: "Prateleira criada com sucesso."
        });
      }
      onSave();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao salvar prateleira.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray max-w-md">
        <DialogHeader>
          <DialogTitle className="text-seguranca-yellow">
            {shelf ? 'Editar Prateleira' : 'Nova Prateleira'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="identification">Identificação (Ex: PR-A1)*</Label>
            <Input
              id="identification"
              value={formData.identification}
              onChange={(e) => setFormData({ ...formData, identification: e.target.value })}
              className="bg-seguranca-black border-gray-600"
              placeholder="Identificação única da prateleira"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="block">Bloco</Label>
              <Input
                id="block"
                value={formData.block || ''}
                onChange={(e) => setFormData({ ...formData, block: e.target.value })}
                className="bg-seguranca-black border-gray-600"
                placeholder="Ex: A"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="section">Seção</Label>
              <Input
                id="section"
                value={formData.section || ''}
                onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                className="bg-seguranca-black border-gray-600"
                placeholder="Ex: Têxtil"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="aisle">Corredor</Label>
              <Input
                id="aisle"
                value={formData.aisle || ''}
                onChange={(e) => setFormData({ ...formData, aisle: e.target.value })}
                className="bg-seguranca-black border-gray-600"
                placeholder="Ex: 03"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="room">Sala/Cômado</Label>
              <Input
                id="room"
                value={formData.room || ''}
                onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                className="bg-seguranca-black border-gray-600"
                placeholder="Ex: Almox. 1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="compartmentInfo">Informações de Compartimentos (Andares, Gavetas...)</Label>
            <Input
              id="compartmentInfo"
              value={formData.compartmentInfo || ''}
              onChange={(e) => setFormData({ ...formData, compartmentInfo: e.target.value })}
              className="bg-seguranca-black border-gray-600"
              placeholder="Ex: 5 andares, gavetas codificadas"
            />
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <Switch
              id="active"
              checked={formData.active}
              onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
            />
            <Label htmlFor="active">Prateleira Ativa</Label>
          </div>

          <DialogFooter className="pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-gray-600 hover:bg-seguranca-black"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-seguranca-yellow text-seguranca-black hover:bg-seguranca-yellow/80"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {shelf ? 'Atualizar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ShelfForm;
