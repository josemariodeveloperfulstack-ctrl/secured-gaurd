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
  PatrimonialLocation,
  PatrimonialLocationCreate,
} from '@/services/patrimonialService';

interface PatrimonialLocationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  location: PatrimonialLocation | null;
  onSave: (payload: PatrimonialLocationCreate) => Promise<void>;
}

export const PatrimonialLocationFormModal: React.FC<PatrimonialLocationFormModalProps> = ({
  isOpen,
  onClose,
  location,
  onSave,
}) => {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [addressOrRoom, setAddressOrRoom] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (location) {
        setCode(location.code ?? '');
        setName(location.name ?? '');
        setAddressOrRoom(location.addressOrRoom ?? '');
        setNotes(location.notes ?? '');
      } else {
        setCode('');
        setName('');
        setAddressOrRoom('');
        setNotes('');
      }
    }
  }, [isOpen, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await onSave({
        code: code.trim() || undefined,
        name: name.trim(),
        addressOrRoom: addressOrRoom.trim() || undefined,
        notes: notes.trim() || undefined,
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
          <DialogTitle>{location ? 'Editar localização' : 'Nova localização'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="loc-code">Código</Label>
              <Input
                id="loc-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Ex: SALA-01"
                className="mt-1 bg-seguranca-black border-gray-600"
              />
            </div>
            <div>
              <Label htmlFor="loc-name">Nome *</Label>
              <Input
                id="loc-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Sala de Servidores"
                className="mt-1 bg-seguranca-black border-gray-600"
                required
              />
            </div>
          </div>
          <div>
            <Label htmlFor="loc-address">Endereço / Sala</Label>
            <Input
              id="loc-address"
              value={addressOrRoom}
              onChange={(e) => setAddressOrRoom(e.target.value)}
              placeholder="Endereço ou número da sala"
              className="mt-1 bg-seguranca-black border-gray-600"
            />
          </div>
          <div>
            <Label htmlFor="loc-notes">Observações</Label>
            <Textarea
              id="loc-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações opcionais"
              className="mt-1 bg-seguranca-black border-gray-600"
              rows={2}
            />
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
