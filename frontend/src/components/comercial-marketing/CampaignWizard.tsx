import { useMemo, useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Mail,
  Users,
  ListFilter,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import emailCampaignService, {
  type EmailCampaignRecipientInput,
  type EmailProviderType,
} from '@/services/emailCampaignService';
import emailTemplateService from '@/services/emailTemplateService';
import { RecipientPicker } from './RecipientPicker';

interface CampaignWizardProps {
  open: boolean;
  onClose: () => void;
}

interface WizardState {
  title: string;
  description: string;
  recipients: EmailCampaignRecipientInput[];
  defaultTemplateId: string | null;
  manualSubject: string;
  manualHtml: string;
  providerType: EmailProviderType;
  maxEmails: string;
  dailyLimit: string;
  hourlyLimit: string;
  minIntervalSeconds: string;
  scheduledAt: string;
  sendNow: boolean;
}

const initial: WizardState = {
  title: '',
  description: '',
  recipients: [],
  defaultTemplateId: null,
  manualSubject: '',
  manualHtml: '',
  providerType: 'SENDGRID',
  maxEmails: '',
  dailyLimit: '10',
  hourlyLimit: '',
  minIntervalSeconds: '',
  scheduledAt: '',
  sendNow: false,
};

const steps = [
  { id: 1, label: 'Informações', icon: Mail },
  { id: 2, label: 'Destinatários', icon: Users },
  { id: 3, label: 'Conteúdo', icon: Sparkles },
  { id: 4, label: 'Limites', icon: ListFilter },
  { id: 5, label: 'Revisão', icon: Check },
];

export function CampaignWizard({ open, onClose }: CampaignWizardProps) {
  const [step, setStep] = useState(1);
  const [state, setState] = useState<WizardState>(initial);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const set = <K extends keyof WizardState>(key: K, value: WizardState[K]) =>
    setState((s) => ({ ...s, [key]: value }));

  const { data: templates = [] } = useQuery({
    queryKey: ['email-templates'],
    queryFn: () => emailTemplateService.list(),
    enabled: open,
    staleTime: 60_000,
  });

  const canNext = useMemo(() => {
    switch (step) {
      case 1:
        return state.title.trim().length >= 3;
      case 2:
        return state.recipients.length > 0;
      case 3:
        return state.defaultTemplateId !== null
          || (state.manualSubject.trim().length > 0 && state.manualHtml.trim().length > 0);
      case 4:
        return true;
      default:
        return true;
    }
  }, [step, state]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const created = await emailCampaignService.create({
        title: state.title.trim(),
        description: state.description.trim() || null,
        defaultTemplateId: state.defaultTemplateId,
        providerType: state.providerType,
        totalLimit: numberOrNull(state.maxEmails),
        dailyLimit: numberOrNull(state.dailyLimit),
        hourlyLimit: numberOrNull(state.hourlyLimit),
        minIntervalSeconds: numberOrNull(state.minIntervalSeconds),
        scheduledAt: state.scheduledAt ? new Date(state.scheduledAt).toISOString() : null,
        recipients: state.recipients.filter(
          (r) => r.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email.trim())
        ),
      });
      if (state.sendNow) {
        await emailCampaignService.send(created.id, {
          templateId: state.defaultTemplateId,
          subject: state.defaultTemplateId ? undefined : state.manualSubject,
          htmlBody: state.defaultTemplateId ? undefined : state.manualHtml,
        });
      }
      return created;
    },
    onSuccess: () => {
      toast({
        title: state.sendNow ? 'Campanha disparada' : 'Campanha criada',
        description: state.sendNow
          ? 'Os e-mails entraram na fila de envio. Os resultados aparecerão nos logs em instantes.'
          : 'Você pode revisar antes de enviar na lista de campanhas.',
      });
      queryClient.invalidateQueries({ queryKey: ['email-campaigns'] });
      reset();
      onClose();
    },
    onError: (e: unknown) => {
      const data = (e as { response?: { data?: { message?: string; fieldErrors?: Record<string, string> } } })
        ?.response?.data;
      const msg =
        data?.fieldErrors && Object.keys(data.fieldErrors).length > 0
          ? Object.entries(data.fieldErrors)
              .map(([field, message]) => `${field}: ${message}`)
              .join(' · ')
          : data?.message ?? (e instanceof Error ? e.message : 'Falha desconhecida');
      toast({ title: 'Não foi possível salvar', description: msg, variant: 'destructive' });
    },
  });

  const reset = () => {
    setState(initial);
    setStep(1);
  };

  const handleClose = () => {
    if (createMutation.isPending) return;
    reset();
    onClose();
  };

  const selectedTemplate = templates.find((t) => t.id === state.defaultTemplateId);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-3 border-b">
          <DialogTitle className="text-xl">Nova campanha de e-mail</DialogTitle>
          <DialogDescription>
            Em 5 passos: descreva, escolha o público, defina o conteúdo, configure limites e envie.
          </DialogDescription>
        </DialogHeader>

        <Stepper current={step} onJump={(s) => s < step && setStep(s)} />

        <div className="px-6 pb-2 max-h-[60vh] overflow-y-auto">
          {step === 1 && (
            <div className="space-y-4 py-4">
              <div>
                <Label>Título da campanha *</Label>
                <Input
                  placeholder="Ex.: Promoção de outubro - condomínios"
                  value={state.title}
                  onChange={(e) => set('title', e.target.value)}
                />
              </div>
              <div>
                <Label>Descrição interna</Label>
                <Textarea
                  rows={3}
                  placeholder="Observação para a equipe (opcional). Não vai no e-mail."
                  value={state.description}
                  onChange={(e) => set('description', e.target.value)}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="py-4 space-y-3">
              <RecipientPicker
                value={state.recipients}
                onChange={(r) => set('recipients', r)}
              />
              {state.recipients.length > 0 && (
                <div className="rounded-md border p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">
                      {state.recipients.length} destinatário(s) selecionado(s)
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => set('recipients', [])}
                    >
                      Limpar tudo
                    </Button>
                  </div>
                  <ScrollArea className="max-h-32">
                    <div className="flex flex-wrap gap-1.5">
                      {state.recipients.slice(0, 60).map((r) => (
                        <Badge key={r.email} variant="outline" className="text-xs gap-1">
                          {r.email}
                          <button
                            type="button"
                            className="text-slate-400 hover:text-rose-600"
                            onClick={() =>
                              set('recipients', state.recipients.filter((x) => x.email !== r.email))
                            }
                            aria-label="Remover"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                      {state.recipients.length > 60 && (
                        <Badge variant="outline">+{state.recipients.length - 60} mais</Badge>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 py-4">
              <div>
                <Label>Template padrão da campanha</Label>
                <Select
                  value={state.defaultTemplateId ?? 'manual'}
                  onValueChange={(v) => set('defaultTemplateId', v === 'manual' ? null : v)}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Sem template — escrever manualmente</SelectItem>
                    {templates.filter((t) => t.isActive).map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}{t.isDefault ? ' (padrão)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedTemplate && (
                  <p className="text-xs text-slate-500 mt-1">
                    Assunto: <strong>{selectedTemplate.subject}</strong>
                    {selectedTemplate.variables?.length ? ` · Variáveis: ${selectedTemplate.variables.join(', ')}` : ''}
                  </p>
                )}
              </div>
              {!state.defaultTemplateId && (
                <>
                  <div>
                    <Label>Assunto *</Label>
                    <Input
                      value={state.manualSubject}
                      onChange={(e) => set('manualSubject', e.target.value)}
                      placeholder="Use {{nomeContato}} para personalizar"
                    />
                  </div>
                  <div>
                    <Label>Corpo HTML *</Label>
                    <Textarea
                      rows={8}
                      value={state.manualHtml}
                      onChange={(e) => set('manualHtml', e.target.value)}
                      placeholder="<p>Olá {{nomeContato}}...</p>"
                      className="font-mono text-xs"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Provedor</Label>
                  <Select
                    value={state.providerType}
                    onValueChange={(v) => set('providerType', v as EmailProviderType)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SENDGRID">SendGrid (recomendado)</SelectItem>
                      <SelectItem value="SMTP" disabled>SMTP próprio (em breve)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Agendar início (opcional)</Label>
                  <Input
                    type="datetime-local"
                    value={state.scheduledAt}
                    onChange={(e) => set('scheduledAt', e.target.value)}
                  />
                </div>
                <div>
                  <Label>Total máximo de envios</Label>
                  <Input
                    type="number"
                    min={1}
                    placeholder="Ex.: 200"
                    value={state.maxEmails}
                    onChange={(e) => set('maxEmails', e.target.value)}
                  />
                </div>
                <div>
                  <Label>Limite por dia</Label>
                  <Input
                    type="number"
                    min={1}
                    placeholder="10"
                    value={state.dailyLimit}
                    onChange={(e) => set('dailyLimit', e.target.value)}
                  />
                </div>
                <div>
                  <Label>Limite por hora</Label>
                  <Input
                    type="number"
                    min={1}
                    placeholder="Ex.: 5"
                    value={state.hourlyLimit}
                    onChange={(e) => set('hourlyLimit', e.target.value)}
                  />
                </div>
                <div>
                  <Label>Intervalo mínimo entre envios (segundos)</Label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="Ex.: 30"
                    value={state.minIntervalSeconds}
                    onChange={(e) => set('minIntervalSeconds', e.target.value)}
                  />
                </div>
              </div>
              <p className="text-xs text-slate-500">
                Deixe em branco para "sem limite". O sistema sempre respeita o descadastro global.
              </p>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-3 py-4 text-sm">
              <Summary label="Título" value={state.title} />
              {state.description && <Summary label="Descrição" value={state.description} />}
              <Summary
                label="Destinatários"
                value={`${state.recipients.length} total · ${countBySource(state.recipients)}`}
              />
              <Summary
                label="Conteúdo"
                value={
                  state.defaultTemplateId
                    ? `Template: ${selectedTemplate?.name || state.defaultTemplateId}`
                    : `Manual — "${state.manualSubject.slice(0, 60)}${state.manualSubject.length > 60 ? '…' : ''}"`
                }
              />
              <Summary label="Provedor" value={state.providerType} />
              <Summary
                label="Limites"
                value={formatLimits(state.dailyLimit, state.hourlyLimit, state.maxEmails, state.minIntervalSeconds)}
              />
              {state.scheduledAt && (
                <Summary label="Agendamento" value={new Date(state.scheduledAt).toLocaleString('pt-BR')} />
              )}
              <div className="flex items-center gap-2 pt-2 border-t">
                <input
                  id="send-now"
                  type="checkbox"
                  checked={state.sendNow}
                  onChange={(e) => set('sendNow', e.target.checked)}
                />
                <Label htmlFor="send-now" className="cursor-pointer">
                  Disparar imediatamente após criar
                </Label>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-slate-50 flex items-center justify-between sm:justify-between">
          <div>
            {step > 1 && (
              <Button variant="outline" onClick={() => setStep(step - 1)} disabled={createMutation.isPending}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={handleClose} disabled={createMutation.isPending}>
              Cancelar
            </Button>
            {step < steps.length ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={!canNext}
                className="bg-seguranca-yellow text-seguranca-black hover:bg-seguranca-yellow/90"
              >
                Avançar <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
                className="bg-seguranca-yellow text-seguranca-black hover:bg-seguranca-yellow/90"
              >
                {createMutation.isPending ? 'Salvando…' : (
                  <>{state.sendNow ? <><Send className="w-4 h-4 mr-1" /> Criar e enviar</> : <><Check className="w-4 h-4 mr-1" /> Criar campanha</>}</>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Stepper({ current, onJump }: { current: number; onJump: (s: number) => void }) {
  return (
    <ol className="flex items-center px-6 py-3 gap-2 border-b bg-white">
      {steps.map((s, idx) => {
        const Icon = s.icon;
        const state =
          s.id === current ? 'current' : s.id < current ? 'done' : 'upcoming';
        return (
          <li key={s.id} className="flex items-center flex-1">
            <button
              type="button"
              onClick={() => onJump(s.id)}
              className={`flex items-center gap-2 px-2 py-1 rounded-md text-sm transition-colors ${
                state === 'current'
                  ? 'bg-seguranca-yellow text-seguranca-black font-semibold'
                  : state === 'done'
                    ? 'text-emerald-700 hover:bg-emerald-50'
                    : 'text-slate-500 cursor-default'
              }`}
              disabled={state !== 'done'}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{s.id}. {s.label}</span>
            </button>
            {idx < steps.length - 1 && (
              <div className={`flex-1 h-px mx-1 ${state === 'done' ? 'bg-emerald-300' : 'bg-slate-200'}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="text-xs uppercase tracking-wide text-slate-500 w-28 shrink-0">{label}</span>
      <span className="text-slate-900">{value}</span>
    </div>
  );
}

function numberOrNull(s: string): number | null {
  if (!s || !s.trim()) return null;
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function countBySource(recipients: EmailCampaignRecipientInput[]): string {
  const counts = { LEAD: 0, IMPORT: 0, MANUAL: 0 };
  for (const r of recipients) {
    const k = (r.sourceType || 'MANUAL') as keyof typeof counts;
    counts[k] += 1;
  }
  const parts: string[] = [];
  if (counts.LEAD) parts.push(`${counts.LEAD} do CRM`);
  if (counts.IMPORT) parts.push(`${counts.IMPORT} importados`);
  if (counts.MANUAL) parts.push(`${counts.MANUAL} manuais`);
  return parts.join(' · ');
}

function formatLimits(daily: string, hourly: string, total: string, interval: string): string {
  const parts: string[] = [];
  if (daily) parts.push(`${daily}/dia`);
  if (hourly) parts.push(`${hourly}/hora`);
  if (total) parts.push(`máx ${total}`);
  if (interval) parts.push(`${interval}s entre envios`);
  return parts.length ? parts.join(' · ') : 'Sem limites configurados';
}
