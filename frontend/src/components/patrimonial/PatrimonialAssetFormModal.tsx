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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  PatrimonialAsset,
  PatrimonialAssetCreate,
  PatrimonialCategory,
  PatrimonialLocation,
} from '@/services/patrimonialService';
import { employeeService } from '@/services/employeeService';

const STATUS_OPTIONS = [
  { value: 'EM_USO', label: 'Em uso' },
  { value: 'EM_MANUTENCAO', label: 'Em manutenção' },
  { value: 'BAIXADO', label: 'Baixado' },
  { value: 'EM_DEPRECIACAO_TOTAL', label: 'Em depreciação total' },
];

interface PatrimonialAssetFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: PatrimonialAsset | null;
  categories: PatrimonialCategory[];
  locations: PatrimonialLocation[];
  onSave: (payload: PatrimonialAssetCreate) => Promise<void>;
}

export const PatrimonialAssetFormModal: React.FC<PatrimonialAssetFormModalProps> = ({
  isOpen,
  onClose,
  asset,
  categories,
  locations,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [locationId, setLocationId] = useState<string | null>('');
  const [acquisitionDate, setAcquisitionDate] = useState('');
  const [acquisitionValue, setAcquisitionValue] = useState<number | ''>('');
  const [usefulLifeYears, setUsefulLifeYears] = useState<number | ''>('');
  const [residualValuePct, setResidualValuePct] = useState<number | ''>(0);
  const [status, setStatus] = useState('EM_USO');
  const [serialNumber, setSerialNumber] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [responsibleEmployeeId, setResponsibleEmployeeId] = useState<string | null>('');
  const [notes, setNotes] = useState('');
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      employeeService.getSimpleEmployees().then((list) => {
        setEmployees(list.map((e) => ({ id: e.id, name: e.name || e.id })));
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      if (asset) {
        setName(asset.name ?? '');
        setDescription(asset.description ?? '');
        setCategoryId(asset.categoryId ?? asset.category?.id ?? '');
        setLocationId(asset.locationId ?? asset.location?.id ?? null);
        setAcquisitionDate(asset.acquisitionDate ? asset.acquisitionDate.slice(0, 10) : '');
        setAcquisitionValue(asset.acquisitionValue ?? '');
        setUsefulLifeYears(asset.usefulLifeYears ?? '');
        setResidualValuePct(asset.residualValuePct ?? 0);
        setStatus(asset.status ?? 'EM_USO');
        setSerialNumber(asset.serialNumber ?? '');
        setInvoiceNumber(asset.invoiceNumber ?? '');
        setResponsibleEmployeeId(asset.responsibleEmployeeId ?? asset.responsibleEmployee?.id ?? null);
        setNotes(asset.notes ?? '');
      } else {
        setName('');
        setDescription('');
        setCategoryId('');
        setLocationId('');
        setAcquisitionDate(new Date().toISOString().slice(0, 10));
        setAcquisitionValue('');
        setUsefulLifeYears('');
        setResidualValuePct(0);
        setStatus('EM_USO');
        setSerialNumber('');
        setInvoiceNumber('');
        setResponsibleEmployeeId('');
        setNotes('');
      }
    }
  }, [isOpen, asset]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !categoryId || !acquisitionDate || acquisitionValue === '' || usefulLifeYears === '') return;
    setLoading(true);
    try {
      const payload: PatrimonialAssetCreate = {
        name: name.trim(),
        description: description.trim() || undefined,
        categoryId,
        locationId: locationId && locationId !== '' ? locationId : null,
        acquisitionDate,
        acquisitionValue: Number(acquisitionValue),
        usefulLifeYears: Number(usefulLifeYears),
        residualValuePct: residualValuePct === '' ? 0 : Number(residualValuePct),
        status,
        serialNumber: serialNumber.trim() || undefined,
        invoiceNumber: invoiceNumber.trim() || undefined,
        responsibleEmployeeId: responsibleEmployeeId && responsibleEmployeeId !== '' ? responsibleEmployeeId : null,
        notes: notes.trim() || undefined,
      };
      await onSave(payload);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-seguranca-graphite border-gray-700 text-seguranca-lightgray max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{asset ? `Editar bem ${asset.code}` : 'Novo bem patrimonial'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {asset && (
            <div>
              <Label>Código</Label>
              <Input value={asset.code} readOnly disabled className="mt-1 bg-gray-800 border-gray-600" />
            </div>
          )}
          <div>
            <Label htmlFor="asset-name">Nome *</Label>
            <Input
              id="asset-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do bem"
              className="mt-1 bg-seguranca-black border-gray-600"
              required
            />
          </div>
          <div>
            <Label htmlFor="asset-desc">Descrição</Label>
            <Textarea
              id="asset-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 bg-seguranca-black border-gray-600"
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Categoria *</Label>
              <Select value={categoryId} onValueChange={setCategoryId} required>
                <SelectTrigger className="mt-1 bg-seguranca-black border-gray-600">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Localização</Label>
              <Select value={locationId ?? '__none__'} onValueChange={(v) => setLocationId(v === '__none__' ? null : v)}>
                <SelectTrigger className="mt-1 bg-seguranca-black border-gray-600">
                  <SelectValue placeholder="Nenhuma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhuma</SelectItem>
                    {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.name}{l.code ? ` (${l.code})` : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="asset-date">Data de aquisição *</Label>
              <Input
                id="asset-date"
                type="date"
                value={acquisitionDate}
                onChange={(e) => setAcquisitionDate(e.target.value)}
                className="mt-1 bg-seguranca-black border-gray-600"
                required
              />
            </div>
            <div>
              <Label htmlFor="asset-value">Valor de aquisição *</Label>
              <Input
                id="asset-value"
                type="number"
                min={0}
                step={0.01}
                value={acquisitionValue}
                onChange={(e) => setAcquisitionValue(e.target.value === '' ? '' : Number(e.target.value))}
                className="mt-1 bg-seguranca-black border-gray-600"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="asset-life">Vida útil (anos) *</Label>
              <Input
                id="asset-life"
                type="number"
                min={1}
                value={usefulLifeYears}
                onChange={(e) => setUsefulLifeYears(e.target.value === '' ? '' : Number(e.target.value))}
                className="mt-1 bg-seguranca-black border-gray-600"
                required
              />
            </div>
            <div>
              <Label htmlFor="asset-residual">Valor residual (%)</Label>
              <Input
                id="asset-residual"
                type="number"
                min={0}
                max={100}
                step={0.01}
                value={residualValuePct}
                onChange={(e) => setResidualValuePct(e.target.value === '' ? '' : Number(e.target.value))}
                className="mt-1 bg-seguranca-black border-gray-600"
              />
            </div>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="mt-1 bg-seguranca-black border-gray-600">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="asset-serial">Número de série</Label>
              <Input
                id="asset-serial"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                className="mt-1 bg-seguranca-black border-gray-600"
              />
            </div>
            <div>
              <Label htmlFor="asset-invoice">Nota fiscal</Label>
              <Input
                id="asset-invoice"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="mt-1 bg-seguranca-black border-gray-600"
              />
            </div>
          </div>
          <div>
            <Label>Responsável</Label>
            <Select value={responsibleEmployeeId ?? '__none__'} onValueChange={(v) => setResponsibleEmployeeId(v === '__none__' ? null : v)}>
              <SelectTrigger className="mt-1 bg-seguranca-black border-gray-600">
                <SelectValue placeholder="Nenhum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Nenhum</SelectItem>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="asset-notes">Observações</Label>
            <Textarea
              id="asset-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 bg-seguranca-black border-gray-600"
              rows={2}
            />
          </div>
          <DialogFooter className="gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !name.trim() || !categoryId || !acquisitionDate || acquisitionValue === '' || usefulLifeYears === ''} className="bg-seguranca-red hover:bg-seguranca-darkred">
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
