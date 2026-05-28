import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/utils/formatters';
import smtpSettingsService, {
  type SmtpSettings,
  type SmtpSettingsPayload,
} from '@/services/smtpSettingsService';
import { Loader2, Server, Send, CheckCircle2, XCircle, AlertTriangle, KeyRound } from 'lucide-react';

interface SmtpSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FormState {
  host: string;
  port: string;
  username: string;
  password: string;
  useTls: boolean;
  fromEmail: string;
  fromName: string;
  isActive: boolean;
}

const EMPTY_FORM: FormState = {
  host: '',
  port: '587',
  username: '',
  password: '',
  useTls: true,
  fromEmail: '',
  fromName: '',
  isActive: true,
};

function toForm(s: SmtpSettings | null): FormState {
  if (!s) return EMPTY_FORM;
  return {
    host: s.host ?? '',
    port: s.port != null ? String(s.port) : '587',
    username: s.username ?? '',
    password: '',
    useTls: s.useTls ?? true,
    fromEmail: s.fromEmail ?? '',
    fromName: s.fromName ?? '',
    isActive: s.isActive ?? true,
  };
}

const SmtpSettingsModal: React.FC<SmtpSettingsModalProps> = ({ open, onOpenChange }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [testEmail, setTestEmail] = useState('');

  const query = useQuery({
    queryKey: ['smtp-settings'],
    queryFn: () => smtpSettingsService.getCurrent(),
    enabled: open,
  });

  useEffect(() => {
    if (open) {
      setForm(toForm(query.data ?? null));
      setTestEmail(query.data?.fromEmail ?? '');
    }
  }, [open, query.data]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: SmtpSettingsPayload = {
        host: form.host.trim(),
        port: Number(form.port) || 587,
        username: form.username.trim() || null,
        password: form.password ? form.password : null,
        useTls: form.useTls,
        fromEmail: form.fromEmail.trim(),
        fromName: form.fromName.trim() || null,
        isActive: form.isActive,
      };
      return smtpSettingsService.upsert(payload);
    },
    onSuccess: (saved) => {
      toast({ title: 'Configuração SMTP salva', description: `Servidor ${saved.host}:${saved.port} pronto.` });
      void queryClient.invalidateQueries({ queryKey: ['smtp-settings'] });
      setForm((f) => ({ ...f, password: '' }));
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Não foi possível salvar.';
      toast({ title: 'Erro ao salvar SMTP', description: msg, variant: 'destructive' });
    },
  });

  const testMutation = useMutation({
    mutationFn: () => {
      if (!testEmail.trim()) {
        return Promise.reject(new Error('Informe um e-mail destinatário para o teste.'));
      }
      return smtpSettingsService.test({ to: testEmail.trim() });
    },
    onSuccess: (data) => {
      if (data.lastTestOk) {
        toast({
          title: 'Teste enviado',
          description: 'O e-mail saiu do servidor SMTP. Confira a caixa de entrada do destinatário.',
        });
      } else {
        toast({
          title: 'Teste falhou',
          description: data.lastTestError ?? 'O servidor SMTP recusou o envio.',
          variant: 'destructive',
        });
      }
      void queryClient.invalidateQueries({ queryKey: ['smtp-settings'] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Não foi possível testar a configuração.';
      toast({ title: 'Erro no teste', description: msg, variant: 'destructive' });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.host.trim() || !form.fromEmail.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Informe ao menos o servidor (host) e o e-mail remetente (from).',
        variant: 'destructive',
      });
      return;
    }
    saveMutation.mutate();
  };

  const status = query.data;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94vh] overflow-y-auto border-seguranca-graphite bg-seguranca-graphite text-white sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Server className="h-5 w-5 text-seguranca-yellow" />
            Configuração SMTP
          </DialogTitle>
          <DialogDescription className="text-seguranca-lightgray">
            Use seu próprio servidor de e-mail (Gmail, Office 365, AWS SES, etc.) como alternativa ao
            SendGrid. As campanhas com provedor <strong>SMTP</strong> usarão essas configurações.
          </DialogDescription>
        </DialogHeader>

        {query.isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-seguranca-yellow" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 py-2 pb-2">
            {/* Status atual */}
            {status && (
              <div className="rounded-lg border border-seguranca-graphite bg-seguranca-black/40 p-3 text-sm">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant={status.isActive ? 'default' : 'outline'}>
                    {status.isActive ? 'Ativa' : 'Inativa'}
                  </Badge>
                  {status.lastTestAt && (
                    <span className="flex items-center gap-1 text-seguranca-lightgray">
                      {status.lastTestOk ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-400" />
                      )}
                      Último teste: {formatDate(status.lastTestAt)}
                    </span>
                  )}
                  {status.passwordSet && (
                    <span className="flex items-center gap-1 text-seguranca-lightgray">
                      <KeyRound className="h-4 w-4 text-seguranca-yellow" />
                      Senha já cadastrada (deixe em branco para manter)
                    </span>
                  )}
                </div>
                {status.lastTestError && (
                  <div className="mt-2 flex items-start gap-2 rounded border border-red-500/30 bg-red-500/5 p-2 text-xs text-red-300">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span className="break-all">{status.lastTestError}</span>
                  </div>
                )}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="smtp-host">Servidor (host) *</Label>
                <Input
                  id="smtp-host"
                  value={form.host}
                  onChange={(e) => setForm((f) => ({ ...f, host: e.target.value }))}
                  placeholder="smtp.gmail.com"
                  className="border-seguranca-graphite bg-seguranca-black text-white"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtp-port">Porta *</Label>
                <Input
                  id="smtp-port"
                  type="number"
                  min={1}
                  max={65535}
                  value={form.port}
                  onChange={(e) => setForm((f) => ({ ...f, port: e.target.value }))}
                  placeholder="587"
                  className="border-seguranca-graphite bg-seguranca-black text-white"
                />
              </div>
              <div className="flex items-center justify-between rounded-md border border-seguranca-graphite bg-seguranca-black/50 px-3 py-2">
                <div>
                  <Label htmlFor="smtp-tls" className="cursor-pointer text-sm">
                    STARTTLS
                  </Label>
                  <p className="text-xs text-seguranca-lightgray">Recomendado para portas 587/25.</p>
                </div>
                <Switch
                  id="smtp-tls"
                  checked={form.useTls}
                  onCheckedChange={(checked) => setForm((f) => ({ ...f, useTls: checked }))}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="smtp-user">Usuário</Label>
                <Input
                  id="smtp-user"
                  value={form.username}
                  onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                  placeholder="usuario@empresa.com"
                  className="border-seguranca-graphite bg-seguranca-black text-white"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtp-pass">
                  Senha {status?.passwordSet && <span className="text-xs text-seguranca-lightgray">(opcional)</span>}
                </Label>
                <Input
                  id="smtp-pass"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder={status?.passwordSet ? '••••••••  (manter atual)' : 'Sua senha SMTP'}
                  className="border-seguranca-graphite bg-seguranca-black text-white"
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="smtp-from-email">E-mail remetente (From) *</Label>
                <Input
                  id="smtp-from-email"
                  type="email"
                  value={form.fromEmail}
                  onChange={(e) => setForm((f) => ({ ...f, fromEmail: e.target.value }))}
                  placeholder="marketing@empresa.com"
                  className="border-seguranca-graphite bg-seguranca-black text-white"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtp-from-name">Nome remetente</Label>
                <Input
                  id="smtp-from-name"
                  value={form.fromName}
                  onChange={(e) => setForm((f) => ({ ...f, fromName: e.target.value }))}
                  placeholder="Promover"
                  className="border-seguranca-graphite bg-seguranca-black text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-md border border-seguranca-graphite bg-seguranca-black/50 px-3 py-2">
              <div>
                <Label htmlFor="smtp-active" className="cursor-pointer text-sm">
                  Configuração ativa
                </Label>
                <p className="text-xs text-seguranca-lightgray">
                  Ao desligar, campanhas SMTP não conseguirão enviar.
                </p>
              </div>
              <Switch
                id="smtp-active"
                checked={form.isActive}
                onCheckedChange={(checked) => setForm((f) => ({ ...f, isActive: checked }))}
              />
            </div>

            {/* Bloco de teste */}
            <div className="rounded-lg border border-seguranca-graphite bg-seguranca-black/40 p-4">
              <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
                <Send className="h-4 w-4 text-seguranca-yellow" />
                Enviar e-mail de teste
              </h4>
              <p className="mb-3 text-xs text-seguranca-lightgray">
                Após salvar, use esta caixa para validar o envio. O resultado fica registrado no
                status acima.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="destinatario@exemplo.com"
                  className="border-seguranca-graphite bg-seguranca-black text-white"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="border-seguranca-yellow text-seguranca-yellow hover:bg-seguranca-yellow/10"
                  disabled={testMutation.isPending || !status}
                  onClick={() => testMutation.mutate()}
                >
                  {testMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  <span className="ml-2">Enviar teste</span>
                </Button>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
              <Button
                type="submit"
                className="bg-seguranca-yellow text-seguranca-black hover:bg-seguranca-yellow/90"
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Salvar configuração'
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SmtpSettingsModal;
