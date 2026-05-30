import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/utils/formatters';
import type { EmailLogRow } from '@/services/emailCampaignService';
import {
  CheckCircle2,
  Clock,
  Eye,
  ExternalLink,
  LayoutGrid,
  Mail,
  MessageSquareText,
  MousePointerClick,
  Send,
  User,
} from 'lucide-react';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  SENT: 'Enviado',
  DELIVERED: 'Entregue',
  OPENED: 'Aberto / lido',
  CLICKED: 'Clicou no link',
  REPLIED: 'Respondeu',
  BOUNCED: 'Devolvido',
  DROPPED: 'Rejeitado',
  DEFERRED: 'Adiado',
};

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function replyBody(row: EmailLogRow): string {
  if (row.replyText?.trim()) return row.replyText.trim();
  if (row.replyHtml?.trim()) return stripHtml(row.replyHtml);
  return '';
}

function formatTs(iso: string | null | undefined): string {
  if (!iso) return '—';
  return formatDate(iso);
}

interface TimelineStep {
  key: string;
  label: string;
  detail: string;
  at: string | null;
  done: boolean;
  icon: React.ReactNode;
  accent: string;
}

function buildTimeline(row: EmailLogRow): TimelineStep[] {
  const read = Boolean(row.readAt);
  const clicked = Boolean(row.clickedAt);
  const replied = Boolean(row.repliedAt || row.status === 'REPLIED');

  return [
    {
      key: 'sent',
      label: 'Enviado',
      detail: 'E-mail aceito pelo servidor de envio',
      at: row.sentAt,
      done: Boolean(row.sentAt),
      icon: <Send className="h-4 w-4" />,
      accent: 'text-blue-400',
    },
    {
      key: 'delivered',
      label: 'Entregue',
      detail: 'Confirmado na caixa do destinatário (quando disponível)',
      at: row.deliveredAt ?? row.sentAt,
      done: Boolean(row.deliveredAt || row.sentAt),
      icon: <CheckCircle2 className="h-4 w-4" />,
      accent: 'text-sky-400',
    },
    {
      key: 'read',
      label: 'Lido / aberto',
      detail: read
        ? 'Pixel de rastreamento ou confirmação de leitura'
        : 'Aguardando abertura (imagens do e-mail precisam carregar)',
      at: row.readAt,
      done: read,
      icon: <Eye className="h-4 w-4" />,
      accent: 'text-amber-400',
    },
    {
      key: 'click',
      label: 'Clicou',
      detail: clicked ? 'Interagiu com um link rastreado' : 'Nenhum clique registrado',
      at: row.clickedAt,
      done: clicked,
      icon: <MousePointerClick className="h-4 w-4" />,
      accent: 'text-orange-400',
    },
    {
      key: 'reply',
      label: 'Respondeu',
      detail: replied
        ? 'Resposta recebida (SendGrid Inbound Parse)'
        : 'Sem resposta registrada no sistema',
      at: row.repliedAt,
      done: replied,
      icon: <MessageSquareText className="h-4 w-4" />,
      accent: 'text-emerald-400',
    },
  ];
}

export interface CampaignRecipientEngagementSheetProps {
  row: EmailLogRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  providerType?: string | null;
}

const CampaignRecipientEngagementSheet: React.FC<CampaignRecipientEngagementSheetProps> = ({
  row,
  open,
  onOpenChange,
  providerType,
}) => {
  const navigate = useNavigate();

  const timeline = useMemo(() => (row ? buildTimeline(row) : []), [row]);
  const body = row ? replyBody(row) : '';
  const isSmtp = providerType === 'SMTP';

  const mailtoHref = row?.recipientEmail
    ? `mailto:${encodeURIComponent(row.recipientEmail)}?subject=${encodeURIComponent(
        row.replySubject ? `Re: ${row.replySubject}` : 'Re: Sua mensagem'
      )}`
    : undefined;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full border-seguranca-graphite bg-seguranca-black text-white sm:max-w-lg overflow-y-auto"
      >
        {row ? (
          <>
            <SheetHeader className="text-left border-b border-seguranca-graphite pb-4">
              <SheetTitle className="text-lg text-white pr-8">
                {row.recipientName || row.recipientEmail || 'Destinatário'}
              </SheetTitle>
              <SheetDescription className="text-seguranca-lightgray">
                {row.recipientEmail}
              </SheetDescription>
              <div className="flex flex-wrap gap-2 pt-2">
                <Badge variant="outline" className="border-seguranca-yellow/50 text-seguranca-yellow">
                  {STATUS_LABELS[row.status] ?? row.status}
                </Badge>
                {isSmtp ? (
                  <Badge variant="secondary" className="bg-seguranca-graphite text-seguranca-lightgray">
                    Envio SMTP
                  </Badge>
                ) : null}
              </div>
            </SheetHeader>

            <section className="mt-6 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-seguranca-lightgray">
                Linha do tempo
              </h3>
              <ol className="relative space-y-0 border-l border-seguranca-graphite/80 ml-2 pl-6">
                {timeline.map((step, idx) => (
                  <li key={step.key} className="relative pb-6 last:pb-0">
                    <span
                      className={`absolute -left-[1.65rem] flex h-7 w-7 items-center justify-center rounded-full border ${
                        step.done
                          ? 'border-seguranca-yellow/60 bg-seguranca-yellow/15'
                          : 'border-seguranca-graphite bg-seguranca-graphite/40'
                      }`}
                    >
                      <span className={step.done ? step.accent : 'text-seguranca-lightgray/50'}>
                        {step.icon}
                      </span>
                    </span>
                    <p className={`text-sm font-medium ${step.done ? 'text-white' : 'text-seguranca-lightgray/70'}`}>
                      {step.label}
                    </p>
                    <p className="text-xs text-seguranca-lightgray mt-0.5">{step.detail}</p>
                    <p className="text-xs font-mono text-seguranca-yellow/90 mt-1 flex items-center gap-1">
                      <Clock className="h-3 w-3 shrink-0" />
                      {formatTs(step.at)}
                    </p>
                    {idx < timeline.length - 1 && step.done && !timeline[idx + 1]?.done ? (
                      <p className="text-[10px] text-amber-400/80 mt-1">Próximo passo pendente</p>
                    ) : null}
                  </li>
                ))}
              </ol>
            </section>

            {(row.status === 'REPLIED' || row.repliedAt) && (
              <section className="mt-6 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-emerald-300/90 mb-2">
                  E-mail de resposta
                </h3>
                {row.replySubject ? (
                  <p className="text-sm font-medium text-white mb-2">
                    Assunto: <span className="font-normal text-seguranca-lightgray">{row.replySubject}</span>
                  </p>
                ) : null}
                {body ? (
                  <div className="max-h-48 overflow-y-auto rounded-md bg-seguranca-black/60 border border-seguranca-graphite p-3">
                    <pre className="whitespace-pre-wrap text-sm text-seguranca-lightgray font-sans">{body}</pre>
                  </div>
                ) : (
                  <p className="text-sm text-seguranca-lightgray">
                    Resposta registrada em {formatTs(row.repliedAt)}, mas o conteúdo não foi armazenado.
                    {isSmtp
                      ? ' Com SMTP, configure SendGrid Inbound Parse para capturar o texto da resposta.'
                      : ' Verifique o webhook Inbound Parse do SendGrid.'}
                  </p>
                )}
                {row.repliedAt ? (
                  <p className="text-xs text-emerald-400/80 mt-2">Recebido em {formatTs(row.repliedAt)}</p>
                ) : null}
              </section>
            )}

            <section className="mt-6 flex flex-col gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-seguranca-lightgray mb-1">
                Ações
              </h3>
              {mailtoHref ? (
                <Button
                  asChild
                  className="w-full bg-seguranca-yellow text-seguranca-black hover:bg-seguranca-yellow/90"
                >
                  <a href={mailtoHref}>
                    <Mail className="h-4 w-4 mr-2" />
                    Responder por e-mail
                  </a>
                </Button>
              ) : null}
              {row.leadId ? (
                <Button
                  variant="outline"
                  className="w-full border-seguranca-graphite text-white hover:bg-seguranca-graphite"
                  onClick={() => {
                    onOpenChange(false);
                    navigate('/leads');
                  }}
                >
                  <User className="h-4 w-4 mr-2" />
                  Ver lead no CRM
                </Button>
              ) : null}
              <Button
                variant="outline"
                className="w-full border-seguranca-graphite text-white hover:bg-seguranca-graphite"
                onClick={() => {
                  onOpenChange(false);
                  navigate('/crm-kanban');
                }}
              >
                <LayoutGrid className="h-4 w-4 mr-2" />
                Abrir Kanban comercial
              </Button>
              {row.recipientEmail ? (
                <Button
                  variant="ghost"
                  className="w-full text-seguranca-lightgray hover:text-white"
                  asChild
                >
                  <a href={mailtoHref} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Abrir no cliente de e-mail
                  </a>
                </Button>
              ) : null}
            </section>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
};

export default CampaignRecipientEngagementSheet;
