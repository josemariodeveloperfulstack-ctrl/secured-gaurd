import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import { useToast } from '@/hooks/use-toast';
import emailTemplateService, {
  SUGGESTED_VARIABLES,
  type EmailTemplate,
} from '@/services/emailTemplateService';
import { Loader2, Eye, Pencil } from 'lucide-react';

interface Props {
  open: boolean;
  template: EmailTemplate | null;
  onOpenChange: (open: boolean) => void;
}

const PREVIEW_SAMPLE: Record<string, string> = {
  nomeContato: 'Maria Silva',
  email: 'maria@empresa.com',
  nomeEmpresa: 'Empresa Exemplo Ltda.',
  cargo: 'Gerente de Compras',
  telefone: '(11) 4002-8922',
  celular: '(11) 99999-0000',
  ctaUrl: 'https://exemplo.com/oferta',
  unsubscribeUrl: 'https://exemplo.com/descadastrar',
};

function renderPreview(template: string, sample: Record<string, string>): string {
  return template.replace(/\{\{\s*([A-Za-z0-9_.]+)\s*\}\}/g, (_m, key: string) =>
    sample[key] ?? `[${key}]`
  );
}

export const EmailTemplateFormModal: React.FC<Props> = ({ open, template, onOpenChange }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [subject, setSubject] = useState('');
  const [htmlBody, setHtmlBody] = useState('');
  const [description, setDescription] = useState('');
  const [activeView, setActiveView] = useState<'edit' | 'preview'>('edit');

  useEffect(() => {
    if (open) {
      setName(template?.name ?? '');
      setCode(template?.code ?? '');
      setSubject(template?.subject ?? '');
      setHtmlBody(template?.htmlBody ?? '');
      setDescription(template?.description ?? '');
      setActiveView('edit');
    }
  }, [open, template]);

  const previewSubject = useMemo(() => renderPreview(subject, PREVIEW_SAMPLE), [subject]);
  const previewHtml = useMemo(() => renderPreview(htmlBody, PREVIEW_SAMPLE), [htmlBody]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        code: code.trim() || null,
        name: name.trim(),
        subject: subject.trim(),
        htmlBody,
        description: description.trim() || null,
      };
      return template
        ? emailTemplateService.update(template.id, payload)
        : emailTemplateService.create(payload);
    },
    onSuccess: async () => {
      toast({ title: template ? 'Template atualizado' : 'Template criado' });
      await queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar.';
      toast({ title: 'Erro', description: msg, variant: 'destructive' });
    },
  });

  const handleSubmit = () => {
    if (!name.trim()) {
      toast({ title: 'Nome obrigatório', variant: 'destructive' });
      return;
    }
    if (!subject.trim()) {
      toast({ title: 'Assunto obrigatório', variant: 'destructive' });
      return;
    }
    if (!htmlBody.trim()) {
      toast({ title: 'Corpo HTML obrigatório', variant: 'destructive' });
      return;
    }
    saveMutation.mutate();
  };

  const insertVariable = (key: string) => {
    setHtmlBody((prev) => `${prev}{{${key}}}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto border-seguranca-graphite bg-seguranca-graphite text-white">
        <DialogHeader>
          <DialogTitle>{template ? 'Editar template' : 'Novo template'}</DialogTitle>
          <DialogDescription className="text-seguranca-lightgray">
            Use variáveis como <code className="text-seguranca-yellow">{'{{nomeContato}}'}</code>{' '}
            que serão substituídas no envio para cada destinatário.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="flex gap-2 rounded-md bg-seguranca-black p-1">
              <button
                type="button"
                className={`flex flex-1 items-center justify-center gap-1.5 rounded px-3 py-1.5 text-sm transition ${
                  activeView === 'edit'
                    ? 'bg-seguranca-yellow text-seguranca-black font-semibold'
                    : 'text-seguranca-lightgray hover:text-white'
                }`}
                onClick={() => setActiveView('edit')}
              >
                <Pencil className="h-3.5 w-3.5" /> Editar
              </button>
              <button
                type="button"
                className={`flex flex-1 items-center justify-center gap-1.5 rounded px-3 py-1.5 text-sm transition ${
                  activeView === 'preview'
                    ? 'bg-seguranca-yellow text-seguranca-black font-semibold'
                    : 'text-seguranca-lightgray hover:text-white'
                }`}
                onClick={() => setActiveView('preview')}
              >
                <Eye className="h-3.5 w-3.5" /> Visualizar
              </button>
            </div>

            {activeView === 'edit' ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="tpl-name">Nome</Label>
                    <Input
                      id="tpl-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="border-seguranca-graphite bg-seguranca-black text-white"
                      placeholder="Ex.: Boas-vindas"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="tpl-code">Código (opcional)</Label>
                    <Input
                      id="tpl-code"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className="border-seguranca-graphite bg-seguranca-black text-white"
                      placeholder="welcome"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="tpl-subject">Assunto</Label>
                  <Input
                    id="tpl-subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="border-seguranca-graphite bg-seguranca-black text-white"
                    placeholder="Olá {{nomeContato}}, ..."
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="tpl-html">Corpo (HTML)</Label>
                  <Textarea
                    id="tpl-html"
                    rows={14}
                    value={htmlBody}
                    onChange={(e) => setHtmlBody(e.target.value)}
                    className="border-seguranca-graphite bg-seguranca-black font-mono text-xs text-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="tpl-desc">Descrição interna (opcional)</Label>
                  <Textarea
                    id="tpl-desc"
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="border-seguranca-graphite bg-seguranca-black text-sm text-white"
                  />
                </div>
              </>
            ) : (
              <div className="rounded-lg border border-seguranca-graphite bg-white text-black">
                <div className="border-b border-gray-200 bg-gray-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Assunto</p>
                  <p className="text-sm font-semibold">{previewSubject || '—'}</p>
                </div>
                <iframe
                  title="preview"
                  className="h-[420px] w-full rounded-b-lg"
                  srcDoc={`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:16px;background:#fff;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#111">${previewHtml}</body></html>`}
                  sandbox=""
                />
              </div>
            )}
          </div>

          <aside className="space-y-3">
            <div>
              <p className="mb-2 text-sm font-semibold text-white">Variáveis disponíveis</p>
              <p className="text-xs text-seguranca-lightgray">
                Clique para inserir no final do corpo. No envio, cada e-mail terá os valores
                preenchidos a partir dos metadados do destinatário.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_VARIABLES.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  title={v.description}
                  onClick={() => insertVariable(v.key)}
                  className="rounded-full border border-seguranca-yellow/30 bg-seguranca-yellow/10 px-2.5 py-1 text-xs text-seguranca-yellow hover:bg-seguranca-yellow/20"
                >
                  {'{{' + v.key + '}}'}
                </button>
              ))}
            </div>

            <div className="mt-4 rounded-md border border-seguranca-graphite bg-seguranca-black/60 p-3">
              <p className="mb-1 text-xs font-semibold text-seguranca-yellow">
                Valores de amostra usados no preview
              </p>
              <ul className="space-y-0.5 text-[11px] text-seguranca-lightgray">
                {Object.entries(PREVIEW_SAMPLE).map(([k, val]) => (
                  <li key={k}>
                    <code className="text-seguranca-yellow">{k}</code>: {val}
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            className="bg-seguranca-yellow text-seguranca-black"
            disabled={saveMutation.isPending}
            onClick={handleSubmit}
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : template ? (
              'Salvar alterações'
            ) : (
              'Criar template'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EmailTemplateFormModal;
