import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Scale,
  Gavel,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  ArrowRight,
  FileText,
  Clock,
  ExternalLink,
  RotateCcw,
  UserCheck,
  UserX
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface HistoricoProcessoJudicialCardProps {
  startDate?: string;
  endDate?: string;
  notes?: string;
  status?: string;
  dataRescisao?: string;
  onChangeStartDate: (date: string) => void;
  onChangeEndDate: (date: string) => void;
  onChangeNotes: (notes: string) => void;
  onApplyJudicialResolution: (params: {
    endDate: string;
    isTermination: boolean;
  }) => void;
  onClearJudicialProcess?: () => void;
  readOnly?: boolean;
}

export const HistoricoProcessoJudicialCard: React.FC<HistoricoProcessoJudicialCardProps> = ({
  startDate,
  endDate,
  notes,
  status,
  dataRescisao,
  onChangeStartDate,
  onChangeEndDate,
  onChangeNotes,
  onApplyJudicialResolution,
  onClearJudicialProcess,
  readOnly = false,
}) => {
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingEndDate, setPendingEndDate] = useState<string>('');
  const [decision, setDecision] = useState<'SIM' | 'NAO'>('SIM');

  // Helpers de parsing de data
  const parseDate = (d?: string): Date | undefined => {
    if (!d) return undefined;
    const parts = d.split('-');
    if (parts.length === 3) {
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 12, 0, 0);
    }
    const parsed = new Date(d);
    return isNaN(parsed.getTime()) ? undefined : parsed;
  };

  const formatDate = (date?: Date): string => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDateBR = (isoDate?: string): string => {
    if (!isoDate) return '-';
    const parts = isoDate.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return isoDate;
  };

  const getNextDayFormatted = (isoDate?: string): string => {
    if (!isoDate) return '-';
    const d = parseDate(isoDate);
    if (!d) return '-';
    d.setDate(d.getDate() + 1);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Triggers confirmation modal when end date is chosen
  const handleEndDateSelected = (date?: Date) => {
    if (!date) {
      onChangeEndDate('');
      return;
    }
    const formatted = formatDate(date);
    setPendingEndDate(formatted);
    setDecision('SIM');
    setModalOpen(true);
  };

  const handleConfirmDecision = () => {
    if (!pendingEndDate) return;
    onApplyJudicialResolution({
      endDate: pendingEndDate,
      isTermination: decision === 'SIM',
    });
    setModalOpen(false);
  };

  const isProcessActive = Boolean(startDate && !endDate);
  const isProcessEnded = Boolean(startDate && endDate);
  const isTerminated = status === 'TERMINATED' || Boolean(dataRescisao);

  return (
    <>
      <Card className="bg-gradient-to-r from-seguranca-graphite to-gray-700 border-gray-600 shadow-lg overflow-hidden">
        <div className="p-4 sm:p-6 space-y-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-700/60">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30">
                <Gavel className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg sm:text-xl font-semibold text-white tracking-wide">
                    Histórico de Processo Judicial
                  </h3>
                  <Badge className="bg-amber-500/10 text-amber-300 border-amber-500/30 text-xs">
                    RF07
                  </Badge>
                </div>
                <p className="text-xs text-gray-400">
                  Gestão de afastamento por disputa jurídica e transições de status (Sub Júdice)
                </p>
              </div>
            </div>

            {/* Status Pills */}
            <div className="flex items-center gap-2">
              {isProcessActive && (
                <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 px-2.5 py-1 text-xs flex items-center gap-1.5 animate-pulse">
                  <span className="h-2 w-2 rounded-full bg-amber-400 inline-block"></span>
                  Sub Júdice (Em Andamento)
                </Badge>
              )}
              {isProcessEnded && isTerminated && (
                <Badge className="bg-red-500/20 text-red-300 border-red-500/40 px-2.5 py-1 text-xs flex items-center gap-1.5">
                  <UserX className="h-3.5 w-3.5" />
                  Encerrado (Demissão)
                </Badge>
              )}
              {isProcessEnded && !isTerminated && (
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 px-2.5 py-1 text-xs flex items-center gap-1.5">
                  <UserCheck className="h-3.5 w-3.5" />
                  Encerrado (Reintegrado / Ativo)
                </Badge>
              )}
              {!startDate && !endDate && (
                <Badge className="bg-gray-700/50 text-gray-300 border-gray-600 px-2.5 py-1 text-xs">
                  Sem Processo Judicial
                </Badge>
              )}
            </div>
          </div>

          {/* Context Banner */}
          {isProcessActive && (
            <div className="bg-amber-950/30 border border-amber-500/30 rounded-lg p-3 text-xs sm:text-sm text-amber-200/90 flex items-start gap-2.5">
              <Scale className="h-4 w-4 sm:h-5 sm:w-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-300">Colaborador em período de afastamento jurídico</p>
                <p className="text-gray-300 text-xs mt-0.5">
                  O colaborador não está exercendo atividades devido à disputa legal. Ao receber sentença ou acordo, preencha a Data de Fim para resolver o vínculo.
                </p>
              </div>
            </div>
          )}

          {isProcessEnded && isTerminated && (
            <div className="bg-red-950/20 border border-red-500/30 rounded-lg p-3 text-xs sm:text-sm text-red-200/90 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0" />
                <span>
                  Processo concluído com <strong>Demissão Definitiva</strong> em {formatDateBR(endDate)}.
                </span>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => navigate('/rh/admissao-demissao')}
                className="bg-red-900/30 hover:bg-red-900/50 border-red-500/50 text-red-200 text-xs flex items-center gap-1 h-8"
              >
                <FileText className="h-3.5 w-3.5" />
                Módulo de Rescisão
                <ExternalLink className="h-3 w-3 ml-0.5" />
              </Button>
            </div>
          )}

          {isProcessEnded && !isTerminated && (
            <div className="bg-emerald-950/25 border border-emerald-500/30 rounded-lg p-3 text-xs sm:text-sm text-emerald-200/90 flex items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
              <span>
                Processo encerrado com <strong>continuidade do contrato</strong>. Marcações do ponto eletrônico voltam a ser exigidas a partir de{' '}
                <strong>{getNextDayFormatted(endDate)}</strong>.
              </span>
            </div>
          )}

          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {/* Data de Início */}
            <div>
              <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                <Calendar className="h-3.5 w-3.5 text-amber-400" />
                <span>Data de Início do Processo</span>
                <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs ml-auto">
                  Obrigatório ao afastar
                </Badge>
              </Label>
              <DatePicker
                date={parseDate(startDate)}
                onDateChange={(d) => {
                  const val = formatDate(d);
                  onChangeStartDate(val);
                }}
                disabled={readOnly}
                className="h-10 sm:h-11 w-full bg-seguranca-graphite border-gray-600 text-seguranca-lightgray focus:border-amber-400"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Momento em que o funcionário deixa de trabalhar e entra em status Sub Júdice.
              </p>
            </div>

            {/* Data de Fim */}
            <div>
              <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                <Clock className="h-3.5 w-3.5 text-amber-400" />
                <span>Data de Fim do Processo</span>
                <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs ml-auto">
                  {endDate ? 'Definida' : 'Em aberto'}
                </Badge>
              </Label>
              <DatePicker
                date={parseDate(endDate)}
                onDateChange={handleEndDateSelected}
                disabled={readOnly || !startDate}
                className="h-10 sm:h-11 w-full bg-seguranca-graphite border-gray-600 text-seguranca-lightgray focus:border-amber-400"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                {startDate
                  ? 'Ao preencher, o sistema abrirá a confirmação para definir demissão ou retorno.'
                  : 'Preencha a Data de Início primeiro.'}
              </p>
            </div>

            {/* Observações / Vara / Número do Processo */}
            <div className="md:col-span-2">
              <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                <FileText className="h-3.5 w-3.5 text-gray-400" />
                <span>Observações do Processo Judicial / Vara / Decisão</span>
                <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs ml-auto">
                  Opcional
                </Badge>
              </Label>
              <Textarea
                value={notes || ''}
                onChange={(e) => onChangeNotes(e.target.value)}
                placeholder="Ex: Processo nº 0001234-56.2026.5.02.0001 - 2ª Vara do Trabalho. Aguardando sentença / Audiência realizada em..."
                disabled={readOnly}
                rows={2}
                className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray placeholder:text-gray-500 focus:border-amber-400 text-sm"
              />
            </div>
          </div>

          {/* Reset Action */}
          {!readOnly && (startDate || endDate) && onClearJudicialProcess && (
            <div className="flex justify-end pt-2 border-t border-gray-700/50">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClearJudicialProcess}
                className="text-gray-400 hover:text-gray-200 hover:bg-gray-700/40 text-xs flex items-center gap-1"
              >
                <RotateCcw className="h-3 w-3" />
                Limpar dados do processo judicial
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Confirmation Modal when filling Data de Fim (PRD Specification) */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-gradient-to-b from-[#1E2530] to-[#161B22] border-amber-500/40 text-white max-w-lg shadow-2xl p-6">
          <DialogHeader>
            <div className="flex items-center gap-2.5 text-amber-400 mb-1">
              <div className="p-2 bg-amber-500/20 rounded-lg border border-amber-500/40">
                <Gavel className="h-5 w-5" />
              </div>
              <DialogTitle className="text-xl font-bold text-white">
                Encerramento do Processo Judicial
              </DialogTitle>
            </div>
            <DialogDescription className="text-gray-300 text-sm pt-1">
              Data de término informada: <strong className="text-white">{formatDateBR(pendingEndDate)}</strong>.
              Defina o desfecho contratual com base na sentença ou acordo homologado:
            </DialogDescription>
          </DialogHeader>

          {/* Main Question & Radio Options */}
          <div className="py-4 space-y-4">
            <div className="bg-seguranca-black/60 border border-gray-700 rounded-lg p-3.5">
              <p className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <Scale className="h-4 w-4 text-amber-400" />
                O fim do processo judicial resulta na demissão definitiva do funcionário?
              </p>

              <RadioGroup
                value={decision}
                onValueChange={(val: 'SIM' | 'NAO') => setDecision(val)}
                className="space-y-3"
              >
                {/* Opção A: Sim */}
                <div
                  onClick={() => setDecision('SIM')}
                  className={`flex items-start gap-3 p-3.5 rounded-lg border transition-all cursor-pointer ${
                    decision === 'SIM'
                      ? 'bg-red-950/30 border-red-500/60 ring-1 ring-red-500/30'
                      : 'bg-gray-800/40 border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <RadioGroupItem value="SIM" id="radio-sim" className="mt-1 border-red-400 text-red-500" />
                  <div className="space-y-1">
                    <Label htmlFor="radio-sim" className="text-sm font-bold text-red-300 cursor-pointer flex items-center gap-1.5">
                      Opção A: Sim (A Data Fim é a Data de Demissão)
                    </Label>
                    <ul className="text-xs text-gray-300 space-y-1 list-disc pl-4 mt-1">
                      <li>
                        <strong>Ação do Sistema:</strong> A data de desligamento será preenchida automaticamente com{' '}
                        <span className="text-red-300">{formatDateBR(pendingEndDate)}</span>.
                      </li>
                      <li>
                        <strong>Transição de Status:</strong> O status mudará de <em>Sub Júdice</em> para <strong>Demitido (TERMINATED)</strong>.
                      </li>
                      <li>
                        <strong>Próximo Passo:</strong> Habilita o acesso ao módulo de rescisão para o cálculo das verbas devidas conforme a sentença.
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Opção B: Não */}
                <div
                  onClick={() => setDecision('NAO')}
                  className={`flex items-start gap-3 p-3.5 rounded-lg border transition-all cursor-pointer ${
                    decision === 'NAO'
                      ? 'bg-emerald-950/30 border-emerald-500/60 ring-1 ring-emerald-500/30'
                      : 'bg-gray-800/40 border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <RadioGroupItem value="NAO" id="radio-nao" className="mt-1 border-emerald-400 text-emerald-500" />
                  <div className="space-y-1">
                    <Label htmlFor="radio-nao" className="text-sm font-bold text-emerald-300 cursor-pointer flex items-center gap-1.5">
                      Opção B: Não (A Data Fim NÃO é a Data de Demissão)
                    </Label>
                    <ul className="text-xs text-gray-300 space-y-1 list-disc pl-4 mt-1">
                      <li>
                        <strong>Ação do Sistema:</strong> Encerra o período de afastamento judicial, mantendo o contrato formalmente ativo.
                      </li>
                      <li>
                        <strong>Transição de Status:</strong> O status mudará de <em>Sub Júdice</em> de volta para <strong>Ativo (ACTIVE)</strong> (reintegração ou acordo).
                      </li>
                      <li>
                        <strong>Próximo Passo:</strong> O ponto eletrônico volta a exigir as marcações de horário a partir de{' '}
                        <span className="text-emerald-300 font-semibold">{getNextDayFormatted(pendingEndDate)}</span>.
                      </li>
                    </ul>
                  </div>
                </div>
              </RadioGroup>
            </div>
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-2 border-t border-gray-700/60">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setModalOpen(false);
                setPendingEndDate('');
              }}
              className="bg-transparent border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleConfirmDecision}
              className={`font-semibold text-white flex items-center gap-2 ${
                decision === 'SIM'
                  ? 'bg-red-600 hover:bg-red-700 shadow-md shadow-red-900/30'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-900/30'
              }`}
            >
              Confirmar Decisão
              <ArrowRight className="h-4 w-4" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default HistoricoProcessoJudicialCard;
