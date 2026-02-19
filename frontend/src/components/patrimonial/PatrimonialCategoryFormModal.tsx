import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  PatrimonialCategory,
  PatrimonialCategoryCreate,
} from '@/services/patrimonialService';

interface PatrimonialCategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: PatrimonialCategory | null;
  onSave: (payload: PatrimonialCategoryCreate) => Promise<void>;
}

export const PatrimonialCategoryFormModal: React.FC<PatrimonialCategoryFormModalProps> = ({
  isOpen,
  onClose,
  category,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [defaultUsefulLifeYears, setDefaultUsefulLifeYears] = useState<number | ''>('');
  const [defaultDepreciationRatePct, setDefaultDepreciationRatePct] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (category) {
        setName(category.name ?? '');
        setDescription(category.description ?? '');
        setDefaultUsefulLifeYears(category.defaultUsefulLifeYears ?? '');
        setDefaultDepreciationRatePct(category.defaultDepreciationRatePct ?? '');
      } else {
        setName('');
        setDescription('');
        setDefaultUsefulLifeYears('');
        setDefaultDepreciationRatePct('');
      }
    }
  }, [isOpen, category]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || undefined,
        defaultUsefulLifeYears: defaultUsefulLifeYears === '' ? undefined : Number(defaultUsefulLifeYears),
        defaultDepreciationRatePct: defaultDepreciationRatePct === '' ? undefined : Number(defaultDepreciationRatePct),
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-seguranca-graphite border-gray-700 text-seguranca-lightgray">
        <DialogHeader>
          <DialogTitle>{category ? 'Editar categoria' : 'Nova categoria'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="cat-name">Nome *</Label>
            <Input
              id="cat-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Equipamentos de TI"
              className="mt-1 bg-seguranca-black border-gray-600"
              required
            />
          </div>
          <div>
            <Label htmlFor="cat-desc">Descrição</Label>
            <Textarea
              id="cat-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição opcional"
              className="mt-1 bg-seguranca-black border-gray-600"
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cat-life">Vida útil padrão (anos)</Label>
              <Input
                id="cat-life"
                type="number"
                min={1}
                value={defaultUsefulLifeYears}
                onChange={(e) => setDefaultUsefulLifeYears(e.target.value === '' ? '' : Number(e.target.value))}
                className="mt-1 bg-seguranca-black border-gray-600"
              />
            </div>
            <div>
              <Label htmlFor="cat-rate">Taxa depreciação padrão (%)</Label>
              <Input
                id="cat-rate"
                type="number"
                min={0}
                step={0.01}
                value={defaultDepreciationRatePct}
                onChange={(e) => setDefaultDepreciationRatePct(e.target.value === '' ? '' : Number(e.target.value))}
                className="mt-1 bg-seguranca-black border-gray-600"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !name.trim()} className="bg-seguranca-red hover:bg-seguranca-darkred">
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
