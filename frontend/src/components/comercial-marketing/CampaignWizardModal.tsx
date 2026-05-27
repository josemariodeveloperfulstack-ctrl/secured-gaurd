import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import emailCampaignService, {
  type CreateEmailCampaignPayload,
  type EmailCampaignRecipientInput,
} from '@/services/emailCampaignService';
import emailTemplateService from '@/services/emailTemplateService';
import leadService, { type Lead } from '@/services/leadService';
import {
  Loader2,
  Mail,
  Users,
  Upload,
  ListChecks,
  Sparkles,
  Timer,
  CheckCircle2,
  CircleDot,
  Search,
  X,
  FileSpreadsheet,
  ClipboardPaste,
} from 'lucide-react';
import { isValidEmail } from '@/components/comercial-marketing/utils/recipientParser';

interface CampaignWizardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (campaignId: string) => void;
}

type StepId = 'info' | 'recipients' | 'template' | 'limits' | 'review';

interface StepDef {
  id: StepId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STEPS: StepDef[] = [
  { id: 'info', label: 'Informações', icon: Mail },
  { id: 'recipients', label: 'Destinatários', icon: Users },
  { id: 'template', label: 'Template', icon: Sparkles },
  { id: 'limits', label: 'Limites & Agendamento', icon: Timer },
  { id: 'review', label: 'Revisão', icon: ListChecks },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function formatCampaignApiError(err: unknown, fallback: string): string {
  const data = (err as { response?: { data?: { message?: string; fieldErrors?: Record<string, string> } } })
    ?.response?.data;
  if (data?.fieldErrors && Object.keys(data.fieldErrors).length > 0) {
    return Object.entries(data.fieldErrors)
      .map(([field, message]) => `${field}: ${message}`)
      .join(' · ');
  }
  if (data?.message) return data.message;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

function parsePastedRecipients(raw: string): EmailCampaignRecipientInput[] {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const out: EmailCampaignRecipientInput[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    const parts = line.split(/[;,\t]/).map((p) => p.trim());
    const email = parts[0]?.toLowerCase();
    if (!email || !EMAIL_RE.test(email) || seen.has(email)) continue;
    seen.add(email);
    const name = parts.length > 1 ? parts.slice(1).join(' ').trim() || undefined : undefined;
    out.push({ email, name, sourceType: 'MANUAL' });
  }
  return out;
}

const CampaignWizardModal: React.FC<CampaignWizardModalProps> = ({ open, onOpenChange, onCreated }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stepIndex, setStepIndex] = useState(0);

  // Etapa 1
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [providerType, setProviderType] = useState<'SENDGRID' | 'SMTP'>('SENDGRID');

  // Etapa 2 — destinatários
  const [crmSelectedIds, setCrmSelectedIds] = useState<Set<string>>(new Set());
  const [crmSearch, setCrmSearch] = useState('');
  const [importedRecipients, setImportedRecipients] = useState<EmailCampaignRecipientInput[]>([]);
  const [importInfo, setImportInfo] = useState<{
    fileName?: string;
    totalRows: number;
    invalidRows: number;
    columns: string[];
  } | null>(null);
  const [pastedText, setPastedText] = useState('');

  // Etapa 3 — template
  const [defaultTemplateId, setDefaultTemplateId] = useState<string>('');
  const [extraVarsText, setExtraVarsText] = useState('');

  // Etapa 4 — limites
  const [totalLimit, setTotalLimit] = useState<string>('');
  const [dailyLimit, setDailyLimit] = useState<string>('10');
  const [hourlyLimit, setHourlyLimit] = useState<string>('');
  const [minIntervalSeconds, setMinIntervalSeconds] = useState<string>('');
  const [scheduledAt, setScheduledAt] = useState<string>('');

  // ------- queries -------
  const leadsQuery = useQuery({
    queryKey: ['leads', 'for-campaign'],
    queryFn: () => leadService.getAllLeads(),
    enabled: open,
    staleTime: 60_000,
  });

  const templatesQuery = useQuery({
    queryKey: ['email-templates', 'active'],
    queryFn: () => emailTemplateService.list(true),
    enabled: open,
    staleTime: 60_000,
  });

  // ------- helpers -------
  const resetState = useCallback(() => {
    setStepIndex(0);
    setTitle('');
    setDescription('');
    setProviderType('SENDGRID');
    setCrmSelectedIds(new Set());
    setCrmSearch('');
    setImportedRecipients([]);
    setImportInfo(null);
    setPastedText('');
    setDefaultTemplateId('');
    setExtraVarsText('');
    setTotalLimit('');
    setDailyLimit('10');
    setHourlyLimit('');
    setMinIntervalSeconds('');
    setScheduledAt('');
  }, []);

  useEffect(() => {
    if (!open) resetState();
  }, [open, resetState]);

  const leadsList: Lead[] = useMemo(() => {
    const all = leadsQuery.data ?? [];
    return all.filter((l) => typeof l.email === 'string' && EMAIL_RE.test(l.email));
  }, [leadsQuery.data]);

  const filteredLeads = useMemo(() => {
    const term = crmSearch.trim().toLowerCase();
    if (!term) return leadsList;
    return leadsList.filter((l) => {
      return (
        l.name?.toLowerCase().includes(term) ||
        l.email?.toLowerCase().includes(term) ||
        l.company?.toLowerCase().includes(term)
      );
    });
  }, [leadsList, crmSearch]);

  const pastedRecipients = useMemo(() => parsePastedRecipients(pastedText), [pastedText]);

  const crmRecipients: EmailCampaignRecipientInput[] = useMemo(() => {
    return leadsList
      .filter((l) => crmSelectedIds.has(String(l.id)))
      .map<EmailCampaignRecipientInput>((l) => ({
        email: l.email.trim().toLowerCase(),
        name: l.name,
        sourceType: 'LEAD',
        leadId: String(l.id),
        metadata: {
          company: l.company,
          position: l.position,
          phone: l.phone,
          mobile: l.mobile,
        },
      }));
  }, [leadsList, crmSelectedIds]);

  // Mescla os 3 modos, removendo duplicados por e-mail (CRM > IMPORT > MANUAL)
  const mergedRecipients: EmailCampaignRecipientInput[] = useMemo(() => {
    const map = new Map<string, EmailCampaignRecipientInput>();
    for (const r of pastedRecipients) map.set(r.email, r);
    for (const r of importedRecipients) map.set(r.email, r);
    for (const r of crmRecipients) map.set(r.email, r);
    return Array.from(map.values()).filter((r) => isValidEmail(r.email));
  }, [crmRecipients, importedRecipients, pastedRecipients]);

  const extraVars = useMemo(() => {
    const map: Record<string, string> = {};
    extraVarsText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .forEach((line) => {
        const eq = line.indexOf('=');
        if (eq <= 0) return;
        const k = line.substring(0, eq).trim();
        const v = line.substring(eq + 1).trim();
        if (k) map[k] = v;
      });
    return map;
  }, [extraVarsText]);

  // ------- mutations -------
  const createMutation = useMutation({
    mutationFn: () => {
      const payload: CreateEmailCampaignPayload = {
        title: title.trim(),
        description: description.trim() || null,
        providerType,
        defaultTemplateId: defaultTemplateId || null,
        totalLimit: totalLimit ? Number(totalLimit) : null,
        dailyLimit: dailyLimit ? Number(dailyLimit) : null,
        hourlyLimit: hourlyLimit ? Number(hourlyLimit) : null,
        minIntervalSeconds: minIntervalSeconds ? Number(minIntervalSeconds) : null,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        recipients: mergedRecipients.map((r) => ({
          ...r,
          metadata: { ...(r.metadata ?? {}), ...extraVars },
        })),
      };
      return emailCampaignService.create(payload);
    },
    onSuccess: async (res) => {
      toast({
        title: 'Campanha criada',
        description:
          mergedRecipients.length > 0
            ? `${mergedRecipients.length} destinatário(s) registrado(s).`
            : 'Campanha em rascunho. Acrescente destinatários na aba Lista de leads.',
      });
      await queryClient.invalidateQueries({ queryKey: ['email-campaigns'] });
      onCreated?.(res.id);
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      toast({
        title: 'Erro ao criar campanha',
        description: formatCampaignApiError(err, 'Verifique título, destinatários e template.'),
        variant: 'destructive',
      });
    },
  });

  // ------- handlers -------
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const resp = await emailCampaignService.importRecipientsFile(file);
      setImportedRecipients(resp.recipients);
      setImportInfo({
        fileName: file.name,
        totalRows: resp.totalRows,
        invalidRows: resp.invalidRows,
        columns: resp.detectedColumns,
      });
      toast({
        title: 'Arquivo importado',
        description: `${resp.recipients.length} destinatário(s) válido(s) de ${resp.totalRows} linha(s).`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao ler arquivo.';
      toast({ title: 'Erro no import', description: msg, variant: 'destructive' });
    } finally {
      e.target.value = '';
    }
  };

  const toggleLead = (id: string) => {
    setCrmSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllFilteredLeads = () => {
    setCrmSelectedIds((prev) => {
      const next = new Set(prev);
      const allSelected = filteredLeads.every((l) => next.has(String(l.id)));
      if (allSelected) {
        filteredLeads.forEach((l) => next.delete(String(l.id)));
      } else {
        filteredLeads.forEach((l) => next.add(String(l.id)));
      }
      return next;
    });
  };

  // ------- validação por etapa -------
  const stepValid = useMemo(() => {
    switch (STEPS[stepIndex].id) {
      case 'info':
        return title.trim().length >= 3;
      case 'recipients':
        return true;
      case 'template':
        return true; // template é opcional (pode enviar manual depois)
      case 'limits':
        return true;
      case 'review':
        return title.trim().length >= 3;
      default:
        return false;
    }
  }, [mergedRecipients.length, stepIndex, title]);

  const canBack = stepIndex > 0;
  const canNext = stepIndex < STEPS.length - 1 && stepValid;

  const selectedTemplate = templatesQuery.data?.find((t) => t.id === defaultTemplateId) ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="border-b border-seguranca-graphite/60 bg-seguranca-graphite/40 px-6 py-4">
          <DialogTitle className="text-white">Nova campanha de e-mail</DialogTitle>
        </DialogHeader>

        {/* Stepper */}
        <div className="border-b border-seguranca-graphite/60 px-6 py-4">
          <ol className="flex flex-wrap items-center gap-2 text-sm">
            {STEPS.map((s, idx) => {
              const Icon = s.icon;
              const done = idx < stepIndex;
              const active = idx === stepIndex;
              return (
                <li key={s.id} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => idx <= stepIndex && setStepIndex(idx)}
                    disabled={idx > stepIndex}
                    className={`flex items-center gap-2 rounded-full px-3 py-1.5 transition ${
                      active
                        ? 'bg-seguranca-yellow text-seguranca-black font-semibold'
                        : done
                        ? 'bg-seguranca-graphite text-seguranca-lightgray hover:text-white'
                        : 'text-seguranca-lightgray/60'
                    }`}
                  >
                    {done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                    <span>{idx + 1}. {s.label}</span>
                  </button>
                  {idx < STEPS.length - 1 && <span className="text-seguranca-lightgray/40">›</span>}
                </li>
              );
            })}
          </ol>
        </div>

        {/* Corpo da etapa */}
        <div className="overflow-y-auto max-h-[60vh] px-6 py-5">
          {STEPS[stepIndex].id === 'info' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="wiz-title">Título *</Label>
                <Input
                  id="wiz-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex.: Promo Outubro — segurança eletrônica"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wiz-desc">Descrição</Label>
                <Textarea
                  id="wiz-desc"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Objetivo, público-alvo, observações…"
                />
              </div>
              <div className="space-y-2">
                <Label>Provedor de envio</Label>
                <Select value={providerType} onValueChange={(v) => setProviderType(v as 'SENDGRID' | 'SMTP')}>
                  <SelectTrigger className="w-full md:w-72">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SENDGRID">SendGrid (recomendado)</SelectItem>
                    <SelectItem value="SMTP">SMTP próprio</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-seguranca-lightgray">
                  Configure seu servidor SMTP em <strong>Campanhas → SMTP</strong> antes de escolher
                  essa opção. Sem configuração ativa, o envio falhará.
                </p>
              </div>
            </div>
          )}

          {STEPS[stepIndex].id === 'recipients' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-3 rounded-lg border border-seguranca-graphite/60 bg-seguranca-graphite/30 px-4 py-3 text-sm">
                <Badge variant="secondary" className="gap-1">
                  <Users className="h-3 w-3" /> CRM: {crmSelectedIds.size}
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  <FileSpreadsheet className="h-3 w-3" /> Importados: {importedRecipients.length}
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  <ClipboardPaste className="h-3 w-3" /> Manuais: {pastedRecipients.length}
                </Badge>
                <Badge className="bg-seguranca-yellow text-seguranca-black gap-1">
                  Total único: {mergedRecipients.length}
                </Badge>
                <p className="ml-auto text-xs text-seguranca-lightgray">
                  Destinatários repetidos são deduplicados (CRM &gt; Import &gt; Manual).
                </p>
              </div>

              {/* Modo CRM */}
              <section className="space-y-3 rounded-lg border border-seguranca-graphite/60 p-4">
                <header className="flex items-center justify-between gap-2">
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-white">
                    <Users className="h-4 w-4 text-seguranca-yellow" /> 1) Leads do CRM
                  </h4>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-seguranca-lightgray" />
                      <Input
                        value={crmSearch}
                        onChange={(e) => setCrmSearch(e.target.value)}
                        placeholder="Buscar nome, e-mail ou empresa…"
                        className="pl-8 w-72"
                      />
                    </div>
                    <Button size="sm" variant="outline" type="button" onClick={toggleAllFilteredLeads}>
                      {filteredLeads.every((l) => crmSelectedIds.has(String(l.id))) && filteredLeads.length > 0
                        ? 'Limpar visíveis'
                        : 'Selecionar visíveis'}
                    </Button>
                  </div>
                </header>
                <div className="max-h-72 overflow-y-auto rounded-md border border-seguranca-graphite/60">
                  {leadsQuery.isLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-seguranca-yellow" />
                    </div>
                  ) : filteredLeads.length === 0 ? (
                    <p className="px-4 py-8 text-center text-sm text-seguranca-lightgray">
                      Nenhum lead com e-mail válido encontrado.
                    </p>
                  ) : (
                    <ul className="divide-y divide-seguranca-graphite/60">
                      {filteredLeads.map((l) => {
                        const id = String(l.id);
                        const checked = crmSelectedIds.has(id);
                        return (
                          <li key={id} className="flex items-center gap-3 px-3 py-2 hover:bg-seguranca-graphite/30">
                            <Checkbox checked={checked} onCheckedChange={() => toggleLead(id)} />
                            <div className="flex-1 min-w-0">
                              <p className="truncate text-sm font-medium text-white">{l.name || l.email}</p>
                              <p className="truncate text-xs text-seguranca-lightgray">
                                {l.email}
                                {l.company ? ` · ${l.company}` : ''}
                                {l.position ? ` · ${l.position}` : ''}
                              </p>
                            </div>
                            {l.status && (
                              <Badge variant="outline" className="text-xs">
                                {l.status}
                              </Badge>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </section>

              {/* Modo Import */}
              <section className="space-y-3 rounded-lg border border-seguranca-graphite/60 p-4">
                <header className="flex items-center justify-between gap-2">
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-white">
                    <FileSpreadsheet className="h-4 w-4 text-seguranca-yellow" /> 2) Importar planilha (CSV/Excel)
                  </h4>
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.tsv,.txt,.xlsx,.xls"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4 mr-1" /> Selecionar arquivo
                    </Button>
                    {importedRecipients.length > 0 && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setImportedRecipients([]);
                          setImportInfo(null);
                        }}
                      >
                        <X className="h-4 w-4 mr-1" /> Remover
                      </Button>
                    )}
                  </div>
                </header>
                {importInfo ? (
                  <div className="rounded-md bg-seguranca-graphite/30 px-3 py-2 text-sm">
                    <p className="text-white">
                      <span className="font-medium">{importInfo.fileName}</span> ·{' '}
                      <span className="text-seguranca-yellow">{importedRecipients.length} válidos</span>
                      {importInfo.invalidRows > 0 && (
                        <span className="text-red-400"> · {importInfo.invalidRows} inválidos</span>
                      )}
                    </p>
                    {importInfo.columns.length > 0 && (
                      <p className="mt-1 text-xs text-seguranca-lightgray">
                        Colunas detectadas: {importInfo.columns.filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-seguranca-lightgray">
                    Suporte a <code>.csv</code>, <code>.xlsx</code>. A 1ª linha é o cabeçalho. Colunas reconhecidas:{' '}
                    <code>email</code>, <code>nome</code>, <code>empresa</code>, <code>cargo</code>,{' '}
                    <code>telefone</code>, <code>celular</code>. Demais colunas viram variáveis no template.
                  </p>
                )}
              </section>

              {/* Modo Manual */}
              <section className="space-y-3 rounded-lg border border-seguranca-graphite/60 p-4">
                <header>
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-white">
                    <ClipboardPaste className="h-4 w-4 text-seguranca-yellow" /> 3) Colar lista manual
                  </h4>
                </header>
                <Textarea
                  rows={6}
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder={'um e-mail por linha. Opcional: separar nome com ";" ou ","\nexemplo@empresa.com\nfulano@x.com;Fulano de Tal'}
                  className="font-mono text-xs"
                />
                <p className="text-xs text-seguranca-lightgray">
                  ⓘ Quando um destinatário manual abrir ou responder o e-mail, um Lead será criado automaticamente
                  no CRM.
                </p>
              </section>
            </div>
          )}

          {STEPS[stepIndex].id === 'template' && (
            <div className="grid gap-4 md:grid-cols-12">
              <div className="md:col-span-7 space-y-3">
                <Label>Escolha um template padrão</Label>
                {templatesQuery.isLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-seguranca-yellow" />
                  </div>
                ) : (templatesQuery.data?.length ?? 0) === 0 ? (
                  <p className="text-sm text-seguranca-lightgray">
                    Nenhum template ativo. Você poderá enviar com HTML manual depois.
                  </p>
                ) : (
                  <div className="grid gap-2 max-h-80 overflow-y-auto pr-1">
                    <button
                      type="button"
                      onClick={() => setDefaultTemplateId('')}
                      className={`text-left rounded-lg border p-3 transition ${
                        !defaultTemplateId
                          ? 'border-seguranca-yellow bg-seguranca-yellow/10'
                          : 'border-seguranca-graphite/60 hover:border-seguranca-graphite'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <CircleDot className="h-4 w-4 text-seguranca-yellow" />
                        <span className="text-sm font-semibold text-white">Sem template padrão</span>
                      </div>
                      <p className="text-xs text-seguranca-lightgray mt-1">
                        Você escolherá o template (ou enviará HTML manual) no momento do disparo.
                      </p>
                    </button>
                    {templatesQuery.data?.map((t) => {
                      const selected = defaultTemplateId === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setDefaultTemplateId(t.id)}
                          className={`text-left rounded-lg border p-3 transition ${
                            selected
                              ? 'border-seguranca-yellow bg-seguranca-yellow/10'
                              : 'border-seguranca-graphite/60 hover:border-seguranca-graphite'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-white">{t.name}</p>
                            {t.isDefault && (
                              <Badge variant="outline" className="text-[10px]">
                                Padrão
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-seguranca-lightgray mt-1 line-clamp-2">{t.subject}</p>
                          {t.variables && t.variables.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {t.variables.slice(0, 6).map((v) => (
                                <Badge key={v} variant="secondary" className="text-[10px]">
                                  {`{{${v}}}`}
                                </Badge>
                              ))}
                              {t.variables.length > 6 && (
                                <Badge variant="secondary" className="text-[10px]">
                                  +{t.variables.length - 6}
                                </Badge>
                              )}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="md:col-span-5 space-y-2">
                <Label>Variáveis extras (uma por linha, formato <code>chave=valor</code>)</Label>
                <Textarea
                  rows={8}
                  value={extraVarsText}
                  onChange={(e) => setExtraVarsText(e.target.value)}
                  placeholder={'urlPromo=https://seguredguard.com.br/oferta\noferta=20% OFF'}
                  className="font-mono text-xs"
                />
                <p className="text-xs text-seguranca-lightgray">
                  Variáveis padrão como <code>{`{{nomeContato}}`}</code> e <code>{`{{nomeEmpresa}}`}</code> são
                  preenchidas automaticamente a partir dos dados de cada destinatário.
                </p>
              </div>
            </div>
          )}

          {STEPS[stepIndex].id === 'limits' && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="lim-daily">Limite por dia</Label>
                <Input
                  id="lim-daily"
                  type="number"
                  min={1}
                  value={dailyLimit}
                  onChange={(e) => setDailyLimit(e.target.value)}
                  placeholder="ex.: 10"
                />
                <p className="text-xs text-seguranca-lightgray">
                  Padrão recomendado para evitar bloqueio do provedor.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lim-hour">Limite por hora</Label>
                <Input
                  id="lim-hour"
                  type="number"
                  min={1}
                  value={hourlyLimit}
                  onChange={(e) => setHourlyLimit(e.target.value)}
                  placeholder="opcional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lim-interval">Intervalo mínimo entre envios (segundos)</Label>
                <Input
                  id="lim-interval"
                  type="number"
                  min={1}
                  value={minIntervalSeconds}
                  onChange={(e) => setMinIntervalSeconds(e.target.value)}
                  placeholder="opcional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lim-total">Limite total da campanha</Label>
                <Input
                  id="lim-total"
                  type="number"
                  min={1}
                  value={totalLimit}
                  onChange={(e) => setTotalLimit(e.target.value)}
                  placeholder="opcional"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="lim-when">Agendar início (opcional)</Label>
                <Input
                  id="lim-when"
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
                <p className="text-xs text-seguranca-lightgray">
                  Vazio = a campanha fica em rascunho e você dispara manualmente.
                </p>
              </div>
            </div>
          )}

          {STEPS[stepIndex].id === 'review' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-seguranca-graphite/60 bg-seguranca-graphite/30 p-4">
                <p className="text-xs uppercase tracking-wide text-seguranca-lightgray">Resumo</p>
                <h3 className="mt-1 text-lg font-semibold text-white">{title || '(sem título)'}</h3>
                {description && (
                  <p className="text-sm text-seguranca-lightgray mt-1">{description}</p>
                )}
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <Card className="border-seguranca-graphite bg-seguranca-graphite/40">
                  <div className="p-4">
                    <p className="text-xs text-seguranca-lightgray">Destinatários únicos</p>
                    <p className="mt-1 text-2xl font-bold text-seguranca-yellow">
                      {mergedRecipients.length}
                    </p>
                    <p className="mt-1 text-xs text-seguranca-lightgray">
                      CRM {crmSelectedIds.size} · Import {importedRecipients.length} · Manual {pastedRecipients.length}
                    </p>
                  </div>
                </Card>
                <Card className="border-seguranca-graphite bg-seguranca-graphite/40">
                  <div className="p-4">
                    <p className="text-xs text-seguranca-lightgray">Template padrão</p>
                    <p className="mt-1 text-sm font-semibold text-white">
                      {selectedTemplate?.name || '— (definir no envio)'}
                    </p>
                  </div>
                </Card>
                <Card className="border-seguranca-graphite bg-seguranca-graphite/40">
                  <div className="p-4">
                    <p className="text-xs text-seguranca-lightgray">Limites</p>
                    <p className="mt-1 text-sm text-white">
                      {dailyLimit && <>Dia: <strong>{dailyLimit}</strong> · </>}
                      {hourlyLimit && <>Hora: <strong>{hourlyLimit}</strong> · </>}
                      {minIntervalSeconds && <>Intervalo: <strong>{minIntervalSeconds}s</strong> · </>}
                      {totalLimit && <>Total: <strong>{totalLimit}</strong></>}
                      {!dailyLimit && !hourlyLimit && !minIntervalSeconds && !totalLimit && (
                        <span className="text-seguranca-lightgray">Sem limites</span>
                      )}
                    </p>
                    {scheduledAt && (
                      <p className="mt-1 text-xs text-seguranca-yellow">
                        Agendado: {new Date(scheduledAt).toLocaleString('pt-BR')}
                      </p>
                    )}
                  </div>
                </Card>
              </div>
              <p className="text-xs text-seguranca-lightgray">
                Após criar, a campanha fica em <strong>Rascunho</strong> (ou <strong>Agendada</strong> se você
                definiu data). O disparo é feito pelo botão <em>Enviar</em> na lista de campanhas.
              </p>
            </div>
          )}
        </div>

        {/* Footer com ações */}
        <div className="flex items-center justify-between border-t border-seguranca-graphite/60 bg-seguranca-graphite/30 px-6 py-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={createMutation.isPending}
          >
            Cancelar
          </Button>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
              disabled={!canBack || createMutation.isPending}
            >
              Voltar
            </Button>
            {stepIndex < STEPS.length - 1 ? (
              <Button
                type="button"
                className="bg-seguranca-yellow text-seguranca-black hover:bg-seguranca-yellow/90"
                onClick={() => setStepIndex((i) => Math.min(STEPS.length - 1, i + 1))}
                disabled={!canNext}
              >
                Próximo
              </Button>
            ) : (
              <Button
                type="button"
                className="bg-seguranca-yellow text-seguranca-black hover:bg-seguranca-yellow/90"
                onClick={() => createMutation.mutate()}
                disabled={!stepValid || createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" /> Criando…
                  </>
                ) : (
                  'Criar campanha'
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Wrapper Card simples só para uso no Resumo (evita importar do barril)
const Card: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ className, children }) => (
  <div className={`rounded-lg border ${className ?? ''}`}>{children}</div>
);

export default CampaignWizardModal;
