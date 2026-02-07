import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { contractService } from '@/services/contractService';
import { Loader2, X } from 'lucide-react';

const TERMINATION_REASONS = [
  { value: 'VIGENCY_END', label: 'Fim da Vigência' },
  { value: 'DEFAULT_INADIMPLENCIA', label: 'Inadimplência' },
  { value: 'CLIENT_REQUEST', label: 'Pedido do Cliente' },
  { value: 'BREACH', label: 'Descumprimento' }
];

interface TerminateContractModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractId: string | null;
  contractNumber?: string;
  onSuccess: () => void;
}

export const TerminateContractModal: React.FC<TerminateContractModalProps> = ({
  open,
  onOpenChange,
  contractId,
  contractNumber,
  onSuccess
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [terminationReason, setTerminationReason] = useState('');
  const [terminationDate, setTerminationDate] = useState(new Date().toISOString().split('T')[0]);
  const [avisoPrevio, setAvisoPrevio] = useState(false);
  const [desmobilizacaoEquipe, setDesmobilizacaoEquipe] = useState(false);
  const [encerramentoFinanceiro, setEncerramentoFinanceiro] = useState(false);
  const [notes, setNotes] = useState('');

  const handleTerminate = async () => {
    if (!contractId || !terminationReason || !terminationDate) {
      toast({ title: 'Campos obrigatórios', description: 'Preencha motivo e data.', variant: 'destructive' });
      return;
    }
    if (!avisoPrevio || !desmobilizacaoEquipe || !encerramentoFinanceiro) {
      toast({ title: 'Checklist obrigatório', description: 'Marque todos os itens do checklist.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      await contractService.terminateContract(contractId, {
        terminationReason,
        terminationDate,
        avisoPrevio,
        desmobilizacaoEquipe,
        encerramentoFinanceiro,
        notes: notes || undefined
      });
      toast({ title: 'Sucesso', description: 'Contrato encerrado.' });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: 'Erro', description: error.response?.data?.message || 'Não foi possível encerrar.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-seguranca-graphite border-gray-600">
        <DialogHeader>
          <DialogTitle className="text-seguranca-lightgray">Encerrar Contrato</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {contractNumber && <p className="text-sm text-gray-400">Contrato: {contractNumber}</p>}
          <div>
            <Label>Motivo de encerramento *</Label>
            <Select value={terminationReason} onValueChange={setTerminationReason}>
              <SelectTrigger className="bg-seguranca-black border-gray-600">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {TERMINATION_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Data de encerramento *</Label>
            <Input
              type="date"
              value={terminationDate}
              onChange={(e) => setTerminationDate(e.target.value)}
              className="bg-seguranca-black border-gray-600"
            />
          </div>
          <div className="space-y-2">
            <Label>Checklist de encerramento *</Label>
            <div className="flex items-center space-x-2">
              <Checkbox id="aviso" checked={avisoPrevio} onCheckedChange={(c) => setAvisoPrevio(!!c)} />
              <Label htmlFor="aviso" className="text-sm font-normal">Aviso prévio</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="desmob" checked={desmobilizacaoEquipe} onCheckedChange={(c) => setDesmobilizacaoEquipe(!!c)} />
              <Label htmlFor="desmob" className="text-sm font-normal">Desmobilização de equipe</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="fin" checked={encerramentoFinanceiro} onCheckedChange={(c) => setEncerramentoFinanceiro(!!c)} />
              <Label htmlFor="fin" className="text-sm font-normal">Encerramento financeiro</Label>
            </div>
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="bg-seguranca-black border-gray-600" rows={3} />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}><X className="h-4 w-4 mr-1" />Cancelar</Button>
            <Button onClick={handleTerminate} disabled={loading} className="bg-red-500 hover:bg-red-600">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Encerrar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
