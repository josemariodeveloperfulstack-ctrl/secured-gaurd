import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import emailTemplateService, { type EmailTemplate } from '@/services/emailTemplateService';
import EmailTemplateFormModal from './EmailTemplateFormModal';
import { Plus, Pencil, Trash2, Eye, Loader2, FileCode2, ShieldCheck } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getEmailTemplatePreviewSample } from '@/utils/emailTemplatePreviewSample';

function renderPreview(template: string, sample: Record<string, string>): string {
  return template.replace(/\{\{\s*([A-Za-z0-9_.]+)\s*\}\}/g, (_m, key: string) =>
    sample[key] ?? `[${key}]`
  );
}

const EmailTemplatesTab: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorTemplate, setEditorTemplate] = useState<EmailTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<EmailTemplate | null>(null);

  const templatesQuery = useQuery({
    queryKey: ['email-templates'],
    queryFn: () => emailTemplateService.list(false),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => emailTemplateService.remove(id),
    onSuccess: async () => {
      toast({ title: 'Template removido' });
      await queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      setConfirmDelete(null);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Erro ao remover.';
      toast({ title: 'Erro', description: msg, variant: 'destructive' });
    },
  });

  const templates = templatesQuery.data ?? [];
  const previewSample = getEmailTemplatePreviewSample();
  const previewHtml = previewTemplate ? renderPreview(previewTemplate.htmlBody, previewSample) : '';
  const previewSubject = previewTemplate
    ? renderPreview(previewTemplate.subject, previewSample)
    : '';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Templates de e-mail</h2>
          <p className="text-sm text-seguranca-lightgray">
            Modelos reutilizáveis com variáveis dinâmicas ({'{{nomeContato}}'},{' '}
            {'{{nomeEmpresa}}'}, etc.).
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          className="bg-seguranca-yellow text-seguranca-black hover:bg-seguranca-yellow/90"
          onClick={() => {
            setEditorTemplate(null);
            setEditorOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Novo template
        </Button>
      </div>

      {templatesQuery.isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-seguranca-yellow" />
        </div>
      ) : templates.length === 0 ? (
        <Card className="border-seguranca-graphite bg-seguranca-graphite/30">
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <FileCode2 className="h-10 w-10 text-seguranca-lightgray" />
            <div>
              <p className="text-base font-medium text-white">Nenhum template criado</p>
              <p className="mt-1 text-sm text-seguranca-lightgray">
                Crie um modelo para reaproveitar em várias campanhas.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              className="bg-seguranca-yellow text-seguranca-black hover:bg-seguranca-yellow/90"
              onClick={() => {
                setEditorTemplate(null);
                setEditorOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> Criar primeiro template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((t) => (
            <Card
              key={t.id}
              className="group flex flex-col border-seguranca-graphite bg-seguranca-graphite/40 transition-colors hover:border-seguranca-yellow/40"
            >
              <CardContent className="flex flex-1 flex-col gap-3 pt-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-semibold text-white">{t.name}</h3>
                    {t.code && (
                      <p className="font-mono text-[11px] uppercase tracking-wide text-seguranca-lightgray">
                        {t.code}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {t.isDefault && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-seguranca-yellow/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-seguranca-yellow">
                        <ShieldCheck className="h-3 w-3" /> Padrão
                      </span>
                    )}
                    {!t.isActive && (
                      <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-red-300">
                        Inativo
                      </span>
                    )}
                  </div>
                </div>

                <p className="line-clamp-2 text-xs text-seguranca-lightgray">
                  <span className="font-semibold text-white">Assunto: </span>
                  {t.subject}
                </p>

                {t.description && (
                  <p className="line-clamp-2 text-xs text-seguranca-lightgray">{t.description}</p>
                )}

                {t.variables && t.variables.length > 0 && (
                  <div className="mt-auto flex flex-wrap gap-1 pt-1">
                    {t.variables.slice(0, 4).map((v) => (
                      <span
                        key={v}
                        className="rounded-full border border-seguranca-yellow/20 bg-seguranca-yellow/5 px-2 py-0.5 text-[10px] text-seguranca-yellow"
                      >
                        {'{{' + v + '}}'}
                      </span>
                    ))}
                    {t.variables.length > 4 && (
                      <span className="rounded-full bg-seguranca-black/60 px-2 py-0.5 text-[10px] text-seguranca-lightgray">
                        +{t.variables.length - 4}
                      </span>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap gap-2 border-t border-white/5 pt-3">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-seguranca-graphite text-seguranca-lightgray hover:text-seguranca-yellow"
                    onClick={() => setPreviewTemplate(t)}
                  >
                    <Eye className="mr-1.5 h-3.5 w-3.5" /> Visualizar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-seguranca-graphite text-seguranca-lightgray hover:text-seguranca-yellow"
                    onClick={() => {
                      setEditorTemplate(t);
                      setEditorOpen(true);
                    }}
                  >
                    <Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-red-900/40 text-red-300 hover:bg-red-500/10 hover:text-red-200"
                    onClick={() => setConfirmDelete(t)}
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    {t.isDefault ? 'Desativar' : 'Excluir'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <EmailTemplateFormModal
        open={editorOpen}
        template={editorTemplate}
        onOpenChange={setEditorOpen}
      />

      <Dialog open={!!previewTemplate} onOpenChange={(o) => !o && setPreviewTemplate(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto border-seguranca-graphite bg-seguranca-graphite text-white">
          <DialogHeader>
            <DialogTitle>Pré-visualização: {previewTemplate?.name}</DialogTitle>
            <DialogDescription className="text-seguranca-lightgray">
              Variáveis preenchidas com valores de amostra para visualização.
            </DialogDescription>
          </DialogHeader>
          {previewTemplate && (
            <div className="rounded-lg border border-seguranca-graphite bg-white text-black">
              <div className="border-b border-gray-200 bg-gray-50 p-3">
                <p className="text-xs uppercase tracking-wide text-gray-500">Assunto</p>
                <p className="text-sm font-semibold">{previewSubject || '—'}</p>
              </div>
              <iframe
                title="template-preview"
                className="h-[520px] w-full rounded-b-lg"
                srcDoc={`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:16px;background:#fff;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#111">${previewHtml}</body></html>`}
                sandbox=""
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent className="border-seguranca-graphite bg-seguranca-graphite text-white sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {confirmDelete?.isDefault ? 'Desativar template' : 'Excluir template'}
            </DialogTitle>
            <DialogDescription className="text-seguranca-lightgray">
              {confirmDelete?.isDefault
                ? `O template padrão "${confirmDelete?.name}" será desativado, mas não removido permanentemente.`
                : `O template "${confirmDelete?.name}" será removido permanentemente. Esta ação não pode ser desfeita.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmDelete(null)}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => confirmDelete && deleteMutation.mutate(confirmDelete.id)}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : confirmDelete?.isDefault ? (
                'Desativar'
              ) : (
                'Excluir'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmailTemplatesTab;
