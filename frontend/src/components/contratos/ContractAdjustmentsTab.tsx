import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { contractService, ContractAdjustment, AdjustmentTypeType } from '@/services/contractService';
import { Loader2, Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const ADJUSTMENT_TYPES: { value: AdjustmentTypeType; label: string }[] = [
  { value: 'INPC', label: 'INPC' },
  { value: 'IPCA', label: 'IPCA' },
  { value: 'MANUAL', label: 'Manual' },
];

interface ContractAdjustmentsTabProps {
  contractId: string;
  currentValue: number;
  onAdjustmentCreated?: () => void;
}

export const ContractAdjustmentsTab: React.FC<ContractAdjustmentsTabProps> = ({
  contractId,
  currentValue,
  onAdjustmentCreated
}) => {
  const { toast } = useToast();
  const [adjustments, setAdjustments] = useState<ContractAdjustment[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    adjustmentType: 'INPC' as AdjustmentTypeType,
    previousValue: currentValue,
    newValue: currentValue,
    adjustmentDate: new Date().toISOString().split('T')[0]
  });

  const loadAdjustments = async () => {
    setLoading(true);
    try {
      const data = await contractService.getAdjustments(contractId);
      setAdjustments(data);
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível carregar o histórico.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdjustments();
  }, [contractId]);

  useEffect(() => {
    setFormData(prev => ({ ...prev, previousValue: currentValue }));
  }, [currentValue]);

  const handleCreate = async () => {
    if (formData.previousValue <= 0 || formData.newValue <= 0) {
      toast({ title: 'Dados inválidos', description: 'Valores devem ser maiores que zero.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await contractService.createAdjustment(contractId, {
        adjustmentType: formData.adjustmentType,
        previousValue: formData.previousValue,
        newValue: formData.newValue,
        adjustmentDate: formData.adjustmentDate
      });
      toast({ title: 'Sucesso', description: 'Reajuste registrado.' });
      setModalOpen(false);
      setFormData(prev => ({ ...prev, previousValue: formData.newValue, newValue: formData.newValue }));
      loadAdjustments();
      onAdjustmentCreated?.();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.response?.data?.message || 'Não foi possível registrar.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (n: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
  const formatDate = (d: string) => new Date(d).toLocaleDateString('pt-BR');

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-medium text-seguranca-lightgray">Histórico de Reajustes</h4>
        <Button size="sm" onClick={() => setModalOpen(true)} className="bg-seguranca-red hover:bg-seguranca-darkred">
          <Plus className="h-4 w-4 mr-1" />
          Registrar Reajuste
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-seguranca-yellow" />
        </div>
      ) : adjustments.length === 0 ? (
        <p className="text-gray-400 text-sm py-4">Nenhum reajuste registrado.</p>
      ) : (
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {adjustments.map((a) => (
            <div
              key={a.id}
              className="p-3 bg-seguranca-black border border-gray-600 rounded-lg"
            >
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-medium text-seguranca-lightgray">{a.adjustmentType}</span>
                  <p className="text-sm text-gray-400 mt-1">
                    {formatCurrency(a.previousValue)} → {formatCurrency(a.newValue)}
                  </p>
                  <span className="text-xs text-gray-500">{formatDate(a.adjustmentDate)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-seguranca-graphite border-gray-600">
          <DialogHeader>
            <DialogTitle className="text-seguranca-lightgray">Registrar Reajuste</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tipo *</Label>
              <Select value={formData.adjustmentType} onValueChange={(v) => setFormData(prev => ({ ...prev, adjustmentType: v as AdjustmentTypeType }))}>
                <SelectTrigger className="bg-seguranca-black border-gray-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ADJUSTMENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Valor Anterior (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.previousValue}
                onChange={(e) => setFormData(prev => ({ ...prev, previousValue: parseFloat(e.target.value) || 0 }))}
                className="bg-seguranca-black border-gray-600"
              />
            </div>
            <div>
              <Label>Novo Valor (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.newValue}
                onChange={(e) => setFormData(prev => ({ ...prev, newValue: parseFloat(e.target.value) || 0 }))}
                className="bg-seguranca-black border-gray-600"
              />
            </div>
            <div>
              <Label>Data do Reajuste</Label>
              <Input
                type="date"
                value={formData.adjustmentDate}
                onChange={(e) => setFormData(prev => ({ ...prev, adjustmentDate: e.target.value }))}
                className="bg-seguranca-black border-gray-600"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreate} disabled={saving} className="bg-seguranca-red hover:bg-seguranca-darkred">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Registrar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
