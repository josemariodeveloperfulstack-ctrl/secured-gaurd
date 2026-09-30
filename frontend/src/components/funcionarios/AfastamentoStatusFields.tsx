import React, { useState } from 'react';
import { AlertCircle, AlertTriangle, Calendar, FileText, Printer, ShieldAlert, CheckCircle2, Clock } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';

interface AfastamentoStatusFieldsProps {
  status: string;
  inssStartDate?: string;
  inssEndDate?: string;
  absenceStartDate?: string;
  absenceEndDate?: string;
  employeeName?: string;
  employeeCpf?: string;
  employeeRegistration?: string;
  companyName?: string;
  onChange: (updates: {
    inssStartDate?: string;
    inssEndDate?: string;
    absenceStartDate?: string;
    absenceEndDate?: string;
  }) => void;
}

export const AfastamentoStatusFields: React.FC<AfastamentoStatusFieldsProps> = ({
  status,
  inssStartDate = '',
  inssEndDate = '',
  absenceStartDate = '',
  absenceEndDate = '',
  employeeName = '',
  employeeCpf = '',
  employeeRegistration = '',
  companyName = 'Secured Guard',
  onChange,
}) => {
  const [modalNotificacaoOpen, setModalNotificacaoOpen] = useState(false);

  // Calcula a quantidade de dias entre duas datas (ou até a data atual se fim estiver vazio)
  const calculateDays = (startStr: string, endStr?: string) => {
    if (!startStr) return 0;
    const start = new Date(startStr + 'T00:00:00');
    const end = endStr ? new Date(endStr + 'T00:00:00') : new Date();
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(0, diffDays);
  };

  const handlePrintCarta = () => {
    window.print();
  };

  if (status === 'INSS_LEAVE') {
    const inssDays = calculateDays(inssStartDate, inssEndDate);
    const perdeFerias = inssDays > 180;

    return (
      <div className="md:col-span-3 bg-blue-950/20 border border-blue-500/40 rounded-xl p-4 sm:p-5 mt-2 transition-all">
        <div className="flex items-center gap-2 mb-4 text-blue-300 font-semibold text-base sm:text-lg border-b border-blue-500/20 pb-2">
          <ShieldAlert className="h-5 w-5 text-blue-400 flex-shrink-0" />
          <span>Afastamento INSS / Previdência Social</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium text-gray-200 mb-1.5 flex items-center gap-1">
              <span>Data de Início do Afastamento</span>
              <span className="text-red-400">*</span>
            </Label>
            <Input
              type="date"
              value={inssStartDate}
              onChange={(e) => onChange({ inssStartDate: e.target.value })}
              className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray focus:border-blue-400 h-10"
              required
            />
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-200 mb-1.5 flex items-center justify-between">
              <span>Data de Fim / Previsão de Retorno</span>
              <span className="text-xs text-gray-400 font-normal">Opcional se indeterminado</span>
            </Label>
            <Input
              type="date"
              value={inssEndDate}
              min={inssStartDate || undefined}
              onChange={(e) => onChange({ inssEndDate: e.target.value })}
              className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray focus:border-blue-400 h-10"
            />
          </div>
        </div>

        {inssStartDate && (
          <div className="mt-3 flex items-center gap-2 text-sm text-blue-200 bg-blue-900/30 p-2.5 rounded-lg border border-blue-500/30">
            <Clock className="h-4 w-4 text-blue-400" />
            <span>
              Período informado: <strong>{inssDays} dia(s)</strong> de afastamento previdenciário registrado.
            </span>
          </div>
        )}

        <div className={`mt-3 p-3 rounded-lg border text-xs sm:text-sm ${
          perdeFerias 
            ? 'bg-amber-950/40 border-amber-500/50 text-amber-200' 
            : 'bg-blue-950/40 border-blue-500/20 text-blue-300'
        }`}>
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-400" />
            <div>
              <strong className="block mb-1">Regra CLT — Art. 133, IV (Impacto no Período Aquisitivo de Férias):</strong>
              O empregado que tiver percebido da Previdência Social prestações por acidente de trabalho ou auxílio-doença por mais de <strong>6 meses (180 dias)</strong>, embora descontínuos, dentro do mesmo período aquisitivo, <strong>perde o direito às férias vigentes</strong>.
              {perdeFerias && (
                <p className="mt-1.5 font-semibold text-amber-300">
                  ⚠️ Atenção: O afastamento cadastrado supera 180 dias. Conforme a CLT, um novo período aquisitivo deverá ser iniciado na data em que o colaborador reassumir o serviço!
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'UNEXCUSED_ABSENCE') {
    const absenceDays = calculateDays(absenceStartDate, absenceEndDate);
    const isAbandono = absenceDays > 30;

    return (
      <div className="md:col-span-3 bg-red-950/20 border border-red-500/40 rounded-xl p-4 sm:p-5 mt-2 transition-all">
        <div className="flex items-center gap-2 mb-4 text-red-300 font-semibold text-base sm:text-lg border-b border-red-500/20 pb-2">
          <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
          <span>Registro de Abandono / Faltas Injustificadas</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium text-gray-200 mb-1.5 flex items-center gap-1">
              <span>Data de Início das Faltas</span>
              <span className="text-red-400">*</span>
            </Label>
            <Input
              type="date"
              value={absenceStartDate}
              onChange={(e) => onChange({ absenceStartDate: e.target.value })}
              className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray focus:border-red-400 h-10"
              required
            />
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-200 mb-1.5 flex items-center justify-between">
              <span>Data de Fim / Última Falta</span>
              <span className="text-xs text-gray-400 font-normal">Deixe em branco se em curso</span>
            </Label>
            <Input
              type="date"
              value={absenceEndDate}
              min={absenceStartDate || undefined}
              onChange={(e) => onChange({ absenceEndDate: e.target.value })}
              className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray focus:border-red-400 h-10"
            />
          </div>
        </div>

        {absenceStartDate && (
          <div className={`mt-3 flex items-center justify-between p-3 rounded-lg border text-sm ${
            isAbandono 
              ? 'bg-red-900/40 border-red-500 text-red-200 font-semibold animate-pulse' 
              : 'bg-yellow-900/25 border-yellow-500/40 text-yellow-300'
          }`}>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>
                Total de dias consecutivos ausente: <strong>{absenceDays} dias</strong>
                {!absenceEndDate && ' (contados até hoje)'}.
              </span>
            </div>
            {isAbandono && (
              <span className="bg-red-600/80 text-white text-xs px-2.5 py-1 rounded-full uppercase tracking-wider font-bold">
                Mais de 30 dias
              </span>
            )}
          </div>
        )}

        {isAbandono ? (
          <div className="mt-4 p-4 rounded-xl bg-red-900/30 border border-red-500 text-red-100 space-y-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="h-6 w-6 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-bold text-base text-red-300 uppercase tracking-wide">
                  Alerta: O Colaborador Abandonou o Trabalho (Art. 482, 'i', CLT)
                </h4>
                <p className="text-xs sm:text-sm text-red-200 leading-relaxed">
                  O funcionário atingiu <strong>{absenceDays} dias consecutivos de faltas não justificadas</strong>. Conforme a jurisprudência sumulada do TST (Súmula nº 32), a ausência contínua por mais de 30 dias gera presunção jurídica de abandono de emprego.
                </p>
                <p className="text-xs sm:text-sm text-red-200 font-medium pt-1">
                  <strong>Ação Obrigatória do DP/RH:</strong> Notificar o colaborador formalmente para que venha à empresa em até 48 horas / 3 dias para justificar as faltas ou dar início imediato ao processo de rescisão por <strong>Justa Causa</strong>.
                </p>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap gap-3">
              <Button
                type="button"
                onClick={() => setModalNotificacaoOpen(true)}
                className="bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-lg hover:shadow-red-600/30"
              >
                <FileText className="h-4 w-4" />
                Gerar Notificação de Convocação (Processo Demissão)
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-3 p-3 rounded-lg bg-seguranca-graphite border border-gray-600 text-xs text-gray-300 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 text-gray-400 flex-shrink-0" />
            <div>
              <span>
                <strong>Atenção:</strong> Se o colaborador atingir 30 dias consecutivos sem comparecer ou apresentar justificativa válida, o sistema ativará o alerta legal de Abandono de Emprego com a carta de convocação formal.
              </span>
            </div>
          </div>
        )}

        {/* Modal de Visualização e Impressão da Notificação Formal de Abandono de Emprego */}
        <Dialog open={modalNotificacaoOpen} onOpenChange={setModalNotificacaoOpen}>
          <DialogContent className="max-w-2xl bg-white text-gray-900 border-gray-300 p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-center border-b pb-3 uppercase text-gray-900">
                NOTIFICAÇÃO FORMAL DE CONVOCAÇÃO — COMPARECIMENTO AO TRABALHO
              </DialogTitle>
              <DialogDescription className="text-center text-xs text-gray-500 pt-1">
                Fundamentação: Art. 482, alínea "i" da CLT c/c Súmula nº 32 do TST
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 text-sm text-gray-800 leading-relaxed py-2 font-serif" id="print-abandono-letter">
              <p className="text-right text-xs text-gray-600 font-sans">
                Data de Emissão: {new Date().toLocaleDateString('pt-BR')}
              </p>

              <div className="bg-gray-100 p-3 rounded border text-xs font-sans space-y-1">
                <p><strong>À(Ao) Colaborador(a):</strong> {employeeName || 'FUNCIONÁRIO(A)'}</p>
                <p><strong>CPF:</strong> {employeeCpf || '---'} {employeeRegistration ? `| Matrícula: ${employeeRegistration}` : ''}</p>
                <p><strong>Empregador:</strong> {companyName}</p>
              </div>

              <p>
                Prezado(a) Senhor(a),
              </p>

              <p>
                Constatamos em nossos controles de ponto e frequência que V. Sa. encontra-se ausente de suas atividades laborais desde o dia <strong>{absenceStartDate ? new Date(absenceStartDate + 'T00:00:00').toLocaleDateString('pt-BR') : '__/__/____'}</strong>, perfazendo até a presente data mais de <strong>{absenceDays} dias consecutivos de faltas</strong> sem apresentar qualquer justificativa legal ou atestado médico a esta empresa.
              </p>

              <p>
                Diante disso, fica V. Sa. <strong>FORMALMENTE NOTIFICADO(A) E CONVOCADO(A)</strong> a comparecer ao Departamento Pessoal da empresa, situado no endereço de sua lotação, no prazo improrrogável de <strong>48 (quarenta e oito) horas</strong> a contar do recebimento desta, munido(a) de sua Carteira de Trabalho e demais documentos pertinentes.
              </p>

              <p>
                O objetivo do comparecimento é justificar documentalmente as ausências verificadas ou formalizar o retorno imediato ao posto de trabalho, sob pena de caracterização definitiva de <strong>ABANDONO DE EMPREGO</strong>, ensejando a <strong>RESCISÃO DO CONTRATO DE TRABALHO POR JUSTA CAUSA</strong>, nos termos expressos do <strong>Artigo 482, alínea "i" da Consolidação das Leis do Trabalho (CLT)</strong> e da <strong>Súmula nº 32 do Colendo Tribunal Superior do Trabalho (TST)</strong>.
              </p>

              <div className="pt-6 border-t mt-6 flex justify-between items-end text-xs font-sans">
                <div className="w-1/2 text-center">
                  <div className="border-t border-gray-400 pt-1 mx-4">
                    <strong>{companyName}</strong><br />
                    Departamento Pessoal / RH
                  </div>
                </div>
                <div className="w-1/2 text-center">
                  <div className="border-t border-gray-400 pt-1 mx-4">
                    <strong>Ciente do(a) Empregado(a)</strong><br />
                    Data: ___/___/______
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="border-t pt-4 flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setModalNotificacaoOpen(false)}
                className="text-gray-700"
              >
                Fechar
              </Button>
              <Button
                onClick={handlePrintCarta}
                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5"
              >
                <Printer className="h-4 w-4" />
                Imprimir Notificação
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return null;
};
