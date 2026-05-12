import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import emailCampaignService, {
  type EmailCampaignDetail,
  type EmailProviderType,
} from '@/services/emailCampaignService';
import emailTemplateService from '@/services/emailTemplateService';
import { Loader2 } from 'lucide-react';

function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function numOrNull(s: string): number | null {
  const t = s.trim();
  if (t === '') return null;
  const n = Number(t);
  return Number.isNaN(n) ? null : n;
}

function getApiErrorMessage(err: unknown): string {
  if (!err || typeof err !== 'object') return 'Erro ao salvar.';
  if ('response' in err) {
    const data = (err as { response?: { data?: unknown; statusText?: string } }).response?.data;
    if (data && typeof data === 'object') {
      const o = data as { detail?: string; message?: string; error?: string };
      if (typeof o.detail === 'string' && o.detail) return o.detail;
      if (typeof o.message === 'string' && o.message) return o.message;
      if (typeof o.error === 'string' && o.error) return o.error;
    }
    const st = (err as { response?: { statusText?: string } }).response?.statusText;
    if (st) return st;
  }
  if (err instanceof Error && err.message) return err.message;
  return 'Erro ao salvar.';
}

interface EditCampaignModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string | null;
  onSaved?: () => void;
}

const EditCampaignModal: React.FC<EditCampaignModalProps> = ({
  open,
  onOpenChange,
  campaignId,
  onSaved,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [providerType, setProviderType] = useState<EmailProviderType>('SENDGRID');
  const [defaultTemplateId, setDefaultTemplateId] = useState<string>('');
  const [totalLimit, setTotalLimit] = useState('');
  const [dailyLimit, setDailyLimit] = useState('');
  const [hourlyLimit, setHourlyLimit] = useState('');
  const [minIntervalSeconds, setMinIntervalSeconds] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');

  const campaignQuery = useQuery({
    queryKey: ['email-campaign', campaignId],
    queryFn: () => emailCampaignService.getById(campaignId!),
    enabled: open && Boolean(campaignId),
  });

  const templatesQuery = useQuery({
    queryKey: ['email-templates', 'active', 'edit-campaign'],
    queryFn: () => emailTemplateService.list(true),
    enabled: open,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!open || !campaignId) return;
    const d = campaignQuery.data;
    if (!d) return;
    setTitle(d.title ?? '');
    setDescription(d.description ?? '');
    const pt = (d.providerType as EmailProviderType | undefined) ?? 'SENDGRID';
    setProviderType(pt === 'SMTP' ? 'SMTP' : 'SENDGRID');
    setDefaultTemplateId(d.defaultTemplate?.id ? String(d.defaultTemplate.id) : '');
    setTotalLimit(d.totalLimit != null ? String(d.totalLimit) : '');
    setDailyLimit(d.dailyLimit != null ? String(d.dailyLimit) : '');
    setHourlyLimit(d.hourlyLimit != null ? String(d.hourlyLimit) : '');
    setMinIntervalSeconds(d.minIntervalSeconds != null ? String(d.minIntervalSeconds) : '');
    setScheduledAt(toDatetimeLocalValue(d.scheduledAt));
  }, [open, campaignId, campaignQuery.data]);

  const updateMutation = useMutation({
    mutationFn: () =>
      emailCampaignService.update(campaignId!, {
        title: title.trim(),
        description: description.trim() || null,
        defaultTemplateId: defaultTemplateId || null,
        providerType,
        totalLimit: numOrNull(totalLimit),
        dailyLimit: numOrNull(dailyLimit),
        hourlyLimit: numOrNull(hourlyLimit),
        minIntervalSeconds: numOrNull(minIntervalSeconds),
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      }),
    onSuccess: async () => {
      toast({ title: 'Campanha atualizada' });
      await queryClient.invalidateQueries({ queryKey: ['email-campaigns'] });
      if (campaignId) {
        await queryClient.invalidateQueries({ queryKey: ['email-campaign', campaignId] });
        await queryClient.invalidateQueries({ queryKey: ['email-campaign-metrics', campaignId] });
      }
      onSaved?.();
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      toast({
        title: 'Não foi possível salvar',
        description: getApiErrorMessage(err),
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = () => {
    if (!campaignId) return;
    if (title.trim().length < 3) {
      toast({ title: 'Título inválido', description: 'Informe pelo menos 3 caracteres.', variant: 'destructive' });
      return;
    }
    updateMutation.mutate();
  };

  const detail: EmailCampaignDetail | undefined = campaignQuery.data;
  const status = detail?.status != null ? String(detail.status) : '';
  const isTerminalStatus = status === 'COMPLETED' || status === 'CANCELED';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-seguranca-graphite bg-seguranca-graphite text-white sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar campanha</DialogTitle>
          <DialogDescription className="text-seguranca-lightgray">
            {isTerminalStatus ? (
              <>
                Campanha finalizada: só é possível alterar <strong className="text-white">título</strong> e{' '}
                <strong className="text-white">descrição</strong> (registo interno).
              </>
            ) : (
              <>Ajuste título, limites, provedor e template padrão. Destinatários não são alterados aqui.</>
            )}
            {status ? (
              <>
                {' '}
                Status: <strong className="text-seguranca-yellow">{status}</strong>
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        {campaignQuery.isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-seguranca-yellow" />
          </div>
        ) : campaignQuery.isError ? (
          <p className="py-6 text-center text-sm text-red-400">Não foi possível carregar a campanha.</p>
        ) : (
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="ec-title">Título</Label>
              <Input
                id="ec-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="border-seguranca-graphite bg-seguranca-black text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ec-desc">Descrição</Label>
              <Textarea
                id="ec-desc"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="border-seguranca-graphite bg-seguranca-black text-white"
              />
            </div>
            {!isTerminalStatus && (
              <>
                <div className="space-y-2">
                  <Label>Provedor</Label>
                  <Select value={providerType} onValueChange={(v) => setProviderType(v as EmailProviderType)}>
                    <SelectTrigger className="border-seguranca-graphite bg-seguranca-black text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SENDGRID">SendGrid</SelectItem>
                      <SelectItem value="SMTP">SMTP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Template padrão (opcional)</Label>
                  <Select
                    value={defaultTemplateId || '__none__'}
                    onValueChange={(v) => setDefaultTemplateId(v === '__none__' ? '' : v)}
                  >
                    <SelectTrigger className="border-seguranca-graphite bg-seguranca-black text-white">
                      <SelectValue placeholder="Nenhum" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Nenhum</SelectItem>
                      {(templatesQuery.data ?? []).map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="ec-total">Limite total</Label>
                    <Input
                      id="ec-total"
                      type="number"
                      min={0}
                      value={totalLimit}
                      onChange={(e) => setTotalLimit(e.target.value)}
                      className="border-seguranca-graphite bg-seguranca-black text-white"
                      placeholder="Vazio = sem limite"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ec-daily">Limite diário</Label>
                    <Input
                      id="ec-daily"
                      type="number"
                      min={0}
                      value={dailyLimit}
                      onChange={(e) => setDailyLimit(e.target.value)}
                      className="border-seguranca-graphite bg-seguranca-black text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ec-hourly">Limite por hora</Label>
                    <Input
                      id="ec-hourly"
                      type="number"
                      min={0}
                      value={hourlyLimit}
                      onChange={(e) => setHourlyLimit(e.target.value)}
                      className="border-seguranca-graphite bg-seguranca-black text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ec-interval">Intervalo mínimo (s)</Label>
                    <Input
                      id="ec-interval"
                      type="number"
                      min={0}
                      value={minIntervalSeconds}
                      onChange={(e) => setMinIntervalSeconds(e.target.value)}
                      className="border-seguranca-graphite bg-seguranca-black text-white"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ec-sched">Agendar início (opcional)</Label>
                  <Input
                    id="ec-sched"
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="border-seguranca-graphite bg-seguranca-black text-white"
                  />
                  <p className="text-xs text-seguranca-lightgray">
                    Deixe vazio para disparo manual / imediato ao iniciar envio.
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button
            type="button"
            className="bg-seguranca-yellow text-seguranca-black"
            disabled={updateMutation.isPending || campaignQuery.isLoading || !campaignId}
            onClick={handleSubmit}
          >
            {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar alterações'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditCampaignModal;
