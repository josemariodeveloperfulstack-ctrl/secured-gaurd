import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Printer, RefreshCw, ShieldCheck } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  employeeQrCodeService,
  type EmployeeIdentification,
} from '@/services/employeeQrCodeService';

interface EmployeeQrCodeBadgeModalProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly employeeId: string | null;
  /** Nome para exibir enquanto o backend não responde. */
  readonly employeeName?: string;
}

/**
 * Modal do crachá do funcionário com QR Code.
 *
 * Fluxo:
 *  1. Ao abrir: chama POST /qr-code (gera token se necessário, idempotente) e exibe cartão.
 *  2. Botão "Imprimir": abre janela própria com o cartão limpo para impressão A4 / etiqueta.
 *  3. Botão "Regenerar": invalida o token atual e gera um novo (após confirmação).
 *
 * O QR Code conté JSON `{t, n, cpf, c, p, m}` mas o backend só confia em `t`.
 */
export function EmployeeQrCodeBadgeModal({
  open,
  onOpenChange,
  employeeId,
  employeeName,
}: EmployeeQrCodeBadgeModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [employee, setEmployee] = useState<EmployeeIdentification | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [imageVersion, setImageVersion] = useState<number>(() => Date.now());

  const loadCard = useCallback(async () => {
    if (!employeeId) return;
    setLoading(true);
    try {
      const { token: t, employee: emp } = await employeeQrCodeService.ensure(employeeId);
      setToken(t);
      setEmployee(emp);
      setImageVersion(Date.now());
    } catch (err: any) {
      toast({
        title: 'Erro ao gerar QR Code',
        description: err?.response?.data?.error ?? err?.message ?? 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [employeeId, toast]);

  useEffect(() => {
    if (open && employeeId) {
      void loadCard();
    } else if (!open) {
      // Reseta o estado ao fechar para evitar piscar dados de outro funcionário.
      setEmployee(null);
      setToken(null);
    }
  }, [open, employeeId, loadCard]);

  const imageUrl = useMemo(
    () => (employeeId ? employeeQrCodeService.getImageUrl(employeeId, imageVersion) : ''),
    [employeeId, imageVersion],
  );

  const handleRegenerate = useCallback(async () => {
    if (!employeeId) return;
    setLoading(true);
    try {
      const { token: t, employee: emp, warning } = await employeeQrCodeService.regenerate(
        employeeId,
      );
      setToken(t);
      setEmployee(emp);
      setImageVersion(Date.now());
      toast({
        title: 'QR Code regenerado',
        description: warning ?? 'Imprima o novo crachá. O anterior foi invalidado.',
      });
    } catch (err: any) {
      toast({
        title: 'Erro ao regenerar',
        description: err?.response?.data?.error ?? err?.message ?? 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [employeeId, toast]);

  const handlePrint = useCallback(() => {
    if (!employee || !imageUrl) return;
    // Abre janela isolada com o cartão limpo para impressão.
    // Evita poluir o iframe principal com print-styles globais.
    const w = globalThis.window?.open('', '_blank', 'width=520,height=720');
    if (!w) {
      toast({
        title: 'Pop-up bloqueado',
        description: 'Permita pop-ups para imprimir o crachá.',
        variant: 'destructive',
      });
      return;
    }
    const html = renderPrintHtml(employee, imageUrl);
    w.document.open();
    w.document.write(html);
    w.document.close();
    // Imprime quando a imagem terminar de carregar.
    w.onload = () => {
      w.focus();
      w.print();
    };
  }, [employee, imageUrl, toast]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Crachá com QR Code</DialogTitle>
          <DialogDescription>
            QR Code do funcionário para identificação durante visita do supervisor.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">
          {loading && !employee ? (
            <div className="flex items-center gap-2 text-muted-foreground py-12">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Gerando crachá…</span>
            </div>
          ) : (
            <BadgeCard employee={employee ?? fallbackEmployee(employeeName)} imageUrl={imageUrl} />
          )}

          {token && (
            <p className="text-[10px] text-muted-foreground font-mono break-all max-w-full text-center">
              token: {token.slice(0, 8)}…{token.slice(-4)}
            </p>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-between">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={loading || !employee}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" /> Regenerar
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Regenerar QR Code?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação invalida o crachá atual do funcionário. Qualquer leitura do crachá
                  antigo será rejeitada e um novo crachá precisa ser impresso. Use quando o
                  crachá foi perdido, danificado ou comprometido.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleRegenerate}>Sim, regenerar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
            <Button
              size="sm"
              onClick={handlePrint}
              disabled={loading || !employee}
              className="gap-2"
            >
              <Printer className="h-4 w-4" /> Imprimir
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/* Cartão visual (reaproveitado pela tela e pela versão imprimível)            */
/* -------------------------------------------------------------------------- */

function BadgeCard({
  employee,
  imageUrl,
}: {
  readonly employee: EmployeeIdentification;
  readonly imageUrl: string;
}) {
  return (
    <div className="w-full border-2 border-dashed border-muted-foreground/30 rounded-xl p-5 bg-card">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
        <ShieldCheck className="h-3.5 w-3.5" />
        <span>Identificação do Colaborador</span>
      </div>

      <div className="grid grid-cols-[140px_1fr] gap-4 items-center">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={`QR Code de ${employee.name}`}
            className="w-[140px] h-[140px] rounded border bg-white"
          />
        ) : (
          <div className="w-[140px] h-[140px] rounded border bg-muted" />
        )}

        <dl className="text-sm space-y-1.5 min-w-0">
          <div>
            <dt className="text-[10px] uppercase text-muted-foreground">Nome</dt>
            <dd className="font-semibold truncate">{employee.name || '—'}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase text-muted-foreground">CPF</dt>
            <dd className="font-mono text-xs">{formatCpf(employee.cpf)}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase text-muted-foreground">Cargo</dt>
            <dd className="truncate">{employee.positionName || '—'}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase text-muted-foreground">Posto Alocado</dt>
            <dd className="truncate">{employee.workPostName || '—'}</dd>
          </div>
          {employee.registrationNumber && (
            <div>
              <dt className="text-[10px] uppercase text-muted-foreground">Matrícula</dt>
              <dd className="font-mono text-xs">{employee.registrationNumber}</dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function formatCpf(raw?: string): string {
  if (!raw) return '—';
  const digits = raw.replace(/\D+/g, '');
  if (digits.length !== 11) return raw;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function fallbackEmployee(name?: string): EmployeeIdentification {
  return { id: '', name: name ?? '—' };
}

/** HTML standalone da janela de impressão. Layout compacto tipo crachá vertical. */
function renderPrintHtml(employee: EmployeeIdentification, imageUrl: string): string {
  const cpf = formatCpf(employee.cpf);
  const safe = (s?: string) => (s ? escapeHtml(s) : '—');
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Crachá - ${escapeHtml(employee.name)}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; color: #0f172a; padding: 24px; }
    .card { width: 320px; margin: 24px auto; border: 2px solid #0f172a; border-radius: 12px; padding: 20px; }
    .title { font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: #475569; margin-bottom: 12px; text-align: center; }
    .qr { display: block; width: 220px; height: 220px; margin: 0 auto 14px; }
    dl { margin: 0; }
    dt { font-size: 9px; letter-spacing: 0.08em; text-transform: uppercase; color: #64748b; margin-top: 8px; }
    dd { margin: 2px 0 0; font-size: 14px; font-weight: 600; word-break: break-word; }
    .mono { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 12px; font-weight: 500; }
    .footer { font-size: 9px; color: #94a3b8; text-align: center; margin-top: 14px; }
    @page { size: A6; margin: 8mm; }
    @media print {
      body { padding: 0; }
      .card { box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="title">Identificação do Colaborador</div>
    <img class="qr" src="${escapeHtml(imageUrl)}" alt="QR Code" />
    <dl>
      <dt>Nome</dt><dd>${safe(employee.name)}</dd>
      <dt>CPF</dt><dd class="mono">${safe(cpf)}</dd>
      <dt>Cargo</dt><dd>${safe(employee.positionName)}</dd>
      <dt>Posto Alocado</dt><dd>${safe(employee.workPostName)}</dd>
      ${employee.registrationNumber ? `<dt>Matrícula</dt><dd class="mono">${safe(employee.registrationNumber)}</dd>` : ''}
    </dl>
    <div class="footer">Apresente este crachá ao supervisor durante a visita ao posto.</div>
  </div>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export default EmployeeQrCodeBadgeModal;
