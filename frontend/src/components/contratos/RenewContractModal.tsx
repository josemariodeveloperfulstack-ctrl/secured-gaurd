import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { contractService } from '@/services/contractService';
import { Loader2, X } from 'lucide-react';

interface RenewContractModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractId: string | null;
  contractNumber?: string;
  currentValue?: number;
  onSuccess: () => void;
}

export const RenewContractModal: React.FC<RenewContractModalProps> = ({
  open,
  onOpenChange,
  contractId,
  contractNumber,
  currentValue = 0,
  onSuccess
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [newValue, setNewValue] = useState<string>(currentValue ? String(currentValue) : '');

  const handleRenew = async () => {
    if (!contractId) return;
    setLoading(true);
    try {
      const valueToUse = newValue ? Number.parseFloat(newValue) : undefined;
      const renewed = await contractService.renewContract(contractId, valueToUse);
      toast({ title: 'Sucesso', description: `Contrato ${renewed.contractNumber} criado. Aguardando ativação.` });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: 'Erro', description: error.response?.data?.message || 'Não foi possível renovar.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-seguranca-graphite border-gray-600">
        <DialogHeader>
          <DialogTitle className="text-seguranca-lightgray">Renovar Contrato</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-gray-400">
            Será criado um novo contrato em rascunho com vigência de 1 ano a partir do término do contrato atual.
            {contractNumber && <span className="block mt-1">Contrato atual: {contractNumber}</span>}
          </p>
          <div>
            <Label>Novo valor (opcional - Reajuste)</Label>
            <Input
              type="number"
              step="0.01"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              className="bg-seguranca-black border-gray-600"
              placeholder={currentValue ? `Atual: R$ ${currentValue.toLocaleString('pt-BR')}` : ''}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4 mr-1" />
              Cancelar
            </Button>
            <Button onClick={handleRenew} disabled={loading} className="bg-seguranca-red hover:bg-seguranca-darkred">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Renovar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
