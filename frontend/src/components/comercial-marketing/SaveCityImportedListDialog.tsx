import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, MapPin } from 'lucide-react';
import emailCampaignService, { type EmailCampaignRecipientInput } from '@/services/emailCampaignService';
import { sanitizeRecipientsForCampaign } from '@/components/comercial-marketing/utils/sanitizeMarketingPayload';

export interface SaveCityImportedListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cityLabel: string;
  recipients: EmailCampaignRecipientInput[];
  /** Lista-mãe opcional (nome da importação completa). */
  parentListName?: string;
  onSaved: (listId: string) => void;
}

function defaultListName(cityLabel: string): string {
  const date = new Date().toLocaleDateString('pt-BR');
  return `${cityLabel} — ${date}`;
}

const SaveCityImportedListDialog: React.FC<SaveCityImportedListDialogProps> = ({
  open,
  onOpenChange,
  cityLabel,
  recipients,
  parentListName,
  onSaved,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setName(defaultListName(cityLabel));
    const parts = [
      `Lista regional: ${cityLabel}.`,
      `${recipients.length.toLocaleString('pt-BR')} contato(s).`,
    ];
    if (parentListName) parts.push(`Origem: importação «${parentListName}».`);
    setDescription(parts.join(' '));
  }, [open, cityLabel, recipients.length, parentListName]);

  const handleSave = async () => {
    setError(null);
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Informe um nome para a lista.');
      return;
    }
    const sanitized = sanitizeRecipientsForCampaign(recipients);
    if (sanitized.length === 0) {
      setError('Nenhum destinatário válido nesta cidade.');
      return;
    }
    setSaving(true);
    try {
      const created = await emailCampaignService.createImportedList({
        name: trimmedName,
        description: description.trim() || null,
        sourceType: 'IMPORT',
        recipients: sanitized,
      });
      onSaved(created.id);
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível guardar a lista.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-seguranca-graphite bg-seguranca-graphite text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-seguranca-yellow" />
            Guardar lista por cidade
          </DialogTitle>
          <DialogDescription className="text-seguranca-lightgray">
            Cria uma lista reutilizável com {recipients.length.toLocaleString('pt-BR')} contato(s) de{' '}
            <strong className="text-white">{cityLabel}</strong>. Depois pode vinculá-la a uma ou mais campanhas.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="city-list-name">Nome da lista</Label>
            <Input
              id="city-list-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border-white/15 bg-seguranca-black/40"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="city-list-desc">Descrição (opcional)</Label>
            <Textarea
              id="city-list-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="border-white/15 bg-seguranca-black/40 resize-none"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" className="border-white/20" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            className="bg-seguranca-yellow text-seguranca-black hover:bg-seguranca-yellow/90"
            disabled={saving}
            onClick={() => void handleSave()}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> A guardar…
              </>
            ) : (
              'Criar lista'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SaveCityImportedListDialog;
