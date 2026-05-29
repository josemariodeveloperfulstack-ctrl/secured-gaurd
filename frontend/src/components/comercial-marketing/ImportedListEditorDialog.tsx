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
import { Loader2 } from 'lucide-react';
import { RecipientPicker } from '@/components/comercial-marketing/RecipientPicker';
import emailCampaignService, {
  type EmailCampaignRecipientInput,
  type EmailMarketingImportedListDetail,
  type ImportedListSourceType,
} from '@/services/emailCampaignService';
import { isValidEmail } from '@/components/comercial-marketing/utils/recipientParser';
import { sanitizeRecipientsForCampaign } from '@/components/comercial-marketing/utils/sanitizeMarketingPayload';

export interface ImportedListEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Quando definido, modo edição. */
  listId?: string | null;
  onSaved: () => void;
}

function inferSourceType(recipients: EmailCampaignRecipientInput[]): ImportedListSourceType {
  const hasManual = recipients.some((r) => r.sourceType === 'MANUAL');
  const hasImport = recipients.some((r) => r.sourceType === 'IMPORT' || r.sourceType === 'LEAD');
  if (hasManual && hasImport) return 'MIXED';
  if (hasManual) return 'PASTE';
  return 'IMPORT';
}

const ImportedListEditorDialog: React.FC<ImportedListEditorDialogProps> = ({
  open,
  onOpenChange,
  listId,
  onSaved,
}) => {
  const isEdit = !!listId;
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [recipients, setRecipients] = useState<EmailCampaignRecipientInput[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (!listId) {
      setName('');
      setDescription('');
      setRecipients([]);
      return;
    }
    setLoadingDetail(true);
    emailCampaignService
      .getImportedList(listId)
      .then((detail: EmailMarketingImportedListDetail) => {
        setName(detail.name);
        setDescription(detail.description ?? '');
        setRecipients(detail.recipients ?? []);
      })
      .catch(() => setError('Não foi possível carregar a lista.'))
      .finally(() => setLoadingDetail(false));
  }, [open, listId]);

  const handleRecipientsChange = (next: EmailCampaignRecipientInput[]) => {
    setRecipients(next.filter((r) => isValidEmail(r.email)));
  };

  const handleSave = async () => {
    setError(null);
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Informe um nome para a lista.');
      return;
    }
    const sanitized = sanitizeRecipientsForCampaign(recipients);
    if (sanitized.length === 0) {
      setError('Adicione ao menos um destinatário com e-mail válido.');
      return;
    }
    const payload = {
      name: trimmedName,
      description: description.trim() || null,
      sourceType: inferSourceType(sanitized),
      recipients: sanitized,
    };
    setSaving(true);
    try {
      if (isEdit && listId) {
        await emailCampaignService.updateImportedList(listId, payload);
      } else {
        await emailCampaignService.createImportedList(payload);
      }
      onSaved();
      onOpenChange(false);
    } catch (e: unknown) {
      const axiosErr = e as {
        response?: { data?: { message?: string; fieldErrors?: Record<string, string> } };
      };
      const data = axiosErr.response?.data;
      const fieldErrors = data?.fieldErrors;
      const fieldMsg =
        fieldErrors && Object.keys(fieldErrors).length > 0
          ? Object.entries(fieldErrors)
              .map(([field, msg]) => `${field}: ${msg}`)
              .join(' · ')
          : null;
      setError(fieldMsg ?? data?.message ?? (e instanceof Error ? e.message : 'Falha ao gravar lista.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto border-seguranca-graphite bg-seguranca-graphite text-white">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar lista importada' : 'Nova lista importada'}</DialogTitle>
          <DialogDescription className="text-seguranca-lightgray">
            Importe uma planilha ou cole os e-mails. A lista fica guardada para reutilizar em campanhas.
          </DialogDescription>
        </DialogHeader>

        {loadingDetail ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-seguranca-yellow" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-200">Nome da lista</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Leads SP — varejo"
                className="border-white/10 bg-seguranca-black/30 text-slate-100"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-200">Descrição (opcional)</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="border-white/10 bg-seguranca-black/30 text-slate-100"
              />
            </div>
            <div className="rounded-lg border border-white/10 bg-seguranca-black/25 p-3">
              <RecipientPicker
                value={recipients}
                onChange={handleRecipientsChange}
                darkTabs
                columnMappingImport
                modes={['import', 'manual']}
                defaultMode="import"
              />
              {recipients.length > 0 && (
                <p className="mt-3 text-xs text-slate-400">
                  {recipients.length.toLocaleString('pt-BR')} destinatário(s) na lista
                </p>
              )}
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" className="border-white/20" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            className="bg-seguranca-yellow text-seguranca-black hover:bg-seguranca-yellow/90"
            disabled={saving || loadingDetail}
            onClick={() => void handleSave()}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> A gravar…
              </>
            ) : (
              'Salvar lista'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportedListEditorDialog;
