import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';

interface CancelDismissalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeName?: string;
  terminationDateLabel?: string;
  loading?: boolean;
  onConfirm: (justification: string) => Promise<void> | void;
}

/**
 * Confirma cancelamento de demissão indevida (sem gerar Readmissão).
 */
export const CancelDismissalDialog: React.FC<CancelDismissalDialogProps> = ({
  open,
  onOpenChange,
  employeeName,
  terminationDateLabel,
  loading = false,
  onConfirm,
}) => {
  const [justification, setJustification] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setJustification('');
      setError(null);
    }
    onOpenChange(next);
  };

  const handleConfirm = async () => {
    const trimmed = justification.trim();
    if (trimmed.length < 5) {
      setError('Informe a justificativa com pelo menos 5 caracteres.');
      return;
    }
    setError(null);
    await onConfirm(trimmed);
    setJustification('');
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-seguranca-graphite border-gray-600 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Cancelar Demissão</DialogTitle>
          <DialogDescription className="text-gray-400">
            Reverte o status para <strong className="text-green-400">Ativo</strong> sem gerar Readmissão.
            {employeeName ? (
              <>
                {' '}Funcionário: <span className="text-gray-200">{employeeName}</span>.
              </>
            ) : null}
            {terminationDateLabel ? (
              <> Demissão registrada em {terminationDateLabel}.</>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="cancel-dismissal-justification" className="text-gray-200">
            Justificativa da reversão *
          </Label>
          <Textarea
            id="cancel-dismissal-justification"
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            placeholder="Ex.: Demissão lançada por engano no sistema"
            className="bg-gray-800 border-gray-600 text-white min-h-[100px]"
            disabled={loading}
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <p className="text-xs text-gray-500">
            A ação fica registrada no histórico de auditoria (usuário, data/hora e justificativa).
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={loading}
            className="border-gray-600 text-gray-300"
          >
            Voltar
          </Button>
          <Button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={loading}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Confirmar cancelamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CancelDismissalDialog;
