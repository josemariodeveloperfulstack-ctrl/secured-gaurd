import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Shield,
  FileText,
  Lock,
  CheckCircle2,
  XCircle,
  Loader2,
  Info,
  UserCircle2,
} from 'lucide-react';

interface SupervisorConsentModalProps {
  open: boolean;
  supervisorName?: string;
  supervisorCpf?: string;
  loading?: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

const TERMS_VERSION = '1.0';
const TERMS_UPDATED_AT = '14/05/2026';

const formatCpf = (cpf?: string): string => {
  if (!cpf) return '';
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return cpf;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

export const SupervisorConsentModal: React.FC<SupervisorConsentModalProps> = ({
  open,
  supervisorName,
  supervisorCpf,
  loading = false,
  onAccept,
  onDecline,
}) => {
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (!open) {
      setAccepted(false);
    }
  }, [open]);

  const handleAccept = () => {
    if (!accepted || loading) return;
    onAccept();
  };

  return (
    <Dialog open={open} onOpenChange={(value) => !value && !loading && onDecline()}>
      <DialogContent
        className="max-w-2xl bg-seguranca-graphite border-gray-700 text-seguranca-lightgray p-0 overflow-hidden gap-0"
        hideCloseButton
      >
        <DialogHeader className="px-6 pt-6 pb-5 bg-gradient-to-br from-seguranca-graphite via-seguranca-graphite to-black border-b border-gray-700">
          <div className="flex items-center justify-center mb-3">
            <div className="w-14 h-14 rounded-full bg-seguranca-yellow/15 border border-seguranca-yellow/40 flex items-center justify-center">
              <Shield className="w-7 h-7 text-seguranca-yellow" />
            </div>
          </div>
          <DialogTitle className="text-xl font-bold text-center text-white tracking-tight">
            Consentimento LGPD
          </DialogTitle>
          <DialogDescription className="text-center text-gray-400 mt-1">
            Antes de prosseguir, leia e aceite os termos de uso
          </DialogDescription>

          {(supervisorName || supervisorCpf) && (
            <div className="mt-4 flex items-center gap-3 p-3 rounded-lg bg-black/30 border border-gray-700">
              <div className="w-10 h-10 rounded-full bg-seguranca-yellow/10 flex items-center justify-center flex-shrink-0">
                <UserCircle2 className="w-6 h-6 text-seguranca-yellow" />
              </div>
              <div className="flex-1 min-w-0">
                {supervisorName && (
                  <p className="text-sm font-semibold text-white truncate">
                    {supervisorName}
                  </p>
                )}
                {supervisorCpf && (
                  <p className="text-xs text-gray-400 font-mono">
                    CPF: {formatCpf(supervisorCpf)}
                  </p>
                )}
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-seguranca-yellow/15 text-seguranca-yellow border border-seguranca-yellow/30 whitespace-nowrap">
                Supervisor
              </span>
            </div>
          )}
        </DialogHeader>

        <ScrollArea className="max-h-[45vh] px-6 py-5">
          <div className="space-y-5 text-sm pr-2">
            <section>
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-seguranca-yellow" />
                <h4 className="font-semibold text-seguranca-yellow">
                  Termos de Uso
                </h4>
              </div>
              <p className="text-gray-300 leading-relaxed">
                Ao utilizar este sistema, você concorda com os seguintes termos:
              </p>
              <ul className="mt-2 space-y-1.5 text-gray-300">
                {[
                  'Uso responsável do sistema de vigilância',
                  'Cumprimento das normas de segurança estabelecidas',
                  'Confidencialidade das informações acessadas',
                  'Respeito à privacidade dos funcionários e visitantes',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-400 mt-1 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            <div className="border-t border-gray-700/60"></div>

            <section>
              <div className="flex items-center gap-2 mb-2">
                <Lock className="w-4 h-4 text-seguranca-yellow" />
                <h4 className="font-semibold text-seguranca-yellow">
                  Política de Privacidade
                </h4>
              </div>
              <p className="text-gray-300 leading-relaxed">
                Seus dados pessoais são tratados de acordo com a{' '}
                <strong className="text-white">Lei Geral de Proteção de Dados (LGPD)</strong>:
              </p>
              <ul className="mt-2 space-y-1.5 text-gray-300">
                {[
                  'Coleta e processamento de dados com finalidade específica',
                  'Armazenamento seguro e criptografado',
                  'Compartilhamento apenas quando necessário',
                  'Direito de acesso, correção e exclusão dos dados',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-400 mt-1 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            <div className="flex items-start gap-2 p-3 rounded-md bg-blue-900/20 border border-blue-800/60">
              <Info className="w-4 h-4 text-blue-300 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-200 leading-relaxed">
                <strong>Registro de auditoria:</strong> ao aceitar, registramos
                seu IP, data/hora e versão dos termos ({TERMS_VERSION} —{' '}
                {TERMS_UPDATED_AT}) em conformidade com a LGPD. Você pode
                revogar este consentimento a qualquer momento.
              </p>
            </div>
          </div>
        </ScrollArea>

        <div className="px-6 py-4 border-t border-gray-700 bg-black/30 space-y-4">
          <button
            type="button"
            className="flex items-start gap-3 w-full text-left p-3 rounded-lg border border-gray-700 hover:border-seguranca-yellow/60 hover:bg-seguranca-yellow/5 transition-colors cursor-pointer"
            onClick={() => setAccepted(!accepted)}
          >
            <Checkbox
              id="lgpd-accept"
              checked={accepted}
              onCheckedChange={(checked) => setAccepted(checked === true)}
              className="mt-0.5 border-gray-500 data-[state=checked]:bg-seguranca-yellow data-[state=checked]:border-seguranca-yellow data-[state=checked]:text-black"
            />
            <span className="text-sm text-white leading-relaxed select-none">
              Li e concordo com os{' '}
              <strong className="text-seguranca-yellow">Termos de Uso</strong> e a{' '}
              <strong className="text-seguranca-yellow">Política de Privacidade</strong>.
            </span>
          </button>

          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onDecline}
              disabled={loading}
              className="sm:flex-1 border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Recusar
            </Button>
            <Button
              type="button"
              onClick={handleAccept}
              disabled={!accepted || loading}
              className="sm:flex-[2] bg-seguranca-red hover:bg-seguranca-red/90 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Aceito os Termos
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SupervisorConsentModal;
