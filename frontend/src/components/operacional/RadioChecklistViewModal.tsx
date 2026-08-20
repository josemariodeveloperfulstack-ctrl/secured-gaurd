import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Radio, 
  Download, 
  CheckCircle2, 
  XCircle, 
  User, 
  MapPin, 
  Calendar, 
  Clock, 
  Hash, 
  FileText, 
  Loader2, 
  ShieldCheck, 
  Zap, 
  Volume2, 
  Headphones 
} from 'lucide-react';
import { RadioChecklist, radioChecklistService } from '@/services/radioChecklistService';

interface RadioChecklistViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  checklist: RadioChecklist | null;
}

export const RadioChecklistViewModal: React.FC<RadioChecklistViewModalProps> = ({
  open,
  onOpenChange,
  checklist,
}) => {
  const { toast } = useToast();
  const [downloading, setDownloading] = useState(false);

  if (!checklist) return null;

  const handleDownloadPdf = async () => {
    if (!checklist.id) return;
    try {
      setDownloading(true);
      const blob = await radioChecklistService.downloadPdf(checklist.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `checklist-radio-ht-${checklist.id}-${checklist.checklistDate || 'doc'}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Sucesso',
        description: 'PDF oficial baixado com sucesso!',
      });
    } catch (error) {
      console.error('Erro ao baixar PDF:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível baixar o PDF do checklist.',
        variant: 'destructive',
      });
    } finally {
      setDownloading(false);
    }
  };

  const renderStatusItem = (title: string, description: string, checked: boolean) => (
    <div className={`p-2.5 rounded-lg border flex items-start justify-between gap-2 ${
      checked ? 'bg-emerald-950/20 border-emerald-500/40 text-gray-200' : 'bg-rose-950/20 border-rose-500/40 text-gray-300'
    }`}>
      <div>
        <p className="text-xs font-semibold">{title}</p>
        <p className="text-[11px] text-gray-400 leading-tight">{description}</p>
      </div>
      {checked ? (
        <Badge className="bg-emerald-600 text-white text-[10px] py-0.5 px-2 flex items-center gap-1 flex-shrink-0">
          <CheckCircle2 className="w-3 h-3" /> OK
        </Badge>
      ) : (
        <Badge className="bg-rose-600 text-white text-[10px] py-0.5 px-2 flex items-center gap-1 flex-shrink-0">
          <XCircle className="w-3 h-3" /> Avaria
        </Badge>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[96vw] max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700 text-white p-4 sm:p-6 rounded-xl">
        <DialogHeader className="border-b border-slate-800 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <DialogTitle className="text-lg sm:text-xl font-bold text-seguranca-yellow flex items-center gap-2">
                <Radio className="w-5 h-5 text-seguranca-yellow" />
                <span>Checklist de Radiocomunicação (HT) #{checklist.id}</span>
              </DialogTitle>
              <p className="text-xs text-gray-400 mt-0.5">
                Código: <strong className="text-gray-300">{checklist.documentCode || 'CK-ALMOX-HT'}</strong> | Versão: <strong className="text-gray-300">{checklist.documentVersion || '02'}</strong>
              </p>
            </div>
            <div>
              {checklist.movementType === 'RETIRADA' ? (
                <Badge className="bg-seguranca-yellow text-slate-950 font-bold px-3 py-1 text-xs">
                  📥 Retirada (Início Turno)
                </Badge>
              ) : (
                <Badge className="bg-sky-500 text-white font-bold px-3 py-1 text-xs">
                  📤 Devolução (Fim Turno)
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Dados Principais */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 text-xs">
            <div>
              <span className="text-gray-400 block mb-0.5">Data / Hora</span>
              <span className="font-semibold text-white">
                {checklist.checklistDate} {checklist.checklistTime?.substring(0, 5)}
              </span>
            </div>
            <div>
              <span className="text-gray-400 block mb-0.5">Vigilante</span>
              <span className="font-semibold text-white">{checklist.vigilanteName}</span>
              {checklist.vigilanteRegistration && (
                <span className="text-gray-400 block text-[10px]">RE: {checklist.vigilanteRegistration}</span>
              )}
            </div>
            <div>
              <span className="text-gray-400 block mb-0.5">Setor / Posto de Trabalho</span>
              <span className="font-semibold text-white">{checklist.workPostName || '-'}</span>
            </div>
            <div>
              <span className="text-gray-400 block mb-0.5">Rádio / S/N</span>
              <span className="font-semibold text-white">
                {checklist.radioAssetId || '-'} {checklist.radioSerialNumber ? `(S/N: ${checklist.radioSerialNumber})` : ''}
              </span>
            </div>
          </div>

          {/* 1. Física */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-seguranca-yellow flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> 1. Inspeção Física e Estrutural
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {renderStatusItem('Carcaça Externa', 'Sem trincas ou marcas de queda', checklist.carcacaExterna)}
              {renderStatusItem('Antena', 'Rosqueada até o fim e reta', checklist.antena)}
              {renderStatusItem('Clip de Cinto', 'Firme na parte traseira', checklist.clipCinto)}
              {renderStatusItem('Conector de Acessórios', 'Tampa protetora presente', checklist.conectorAcessorios)}
            </div>
          </div>

          {/* 2. Bateria */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-seguranca-yellow flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" /> 2. Alimentação e Bateria
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {renderStatusItem('Encaixe da Bateria', 'Trava funcionando sem folga', checklist.encaixeBateria)}
              {renderStatusItem('Nível de Carga', 'Liga normalmente com 100%', checklist.nivelCarga)}
              {renderStatusItem('Contatos de Carga', 'Pinos dourados limpos', checklist.contatosCarga)}
            </div>
          </div>

          {/* 3. Operacional */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-seguranca-yellow flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5" /> 3. Teste de Funcionamento Operacional
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {renderStatusItem('Botão Volume/Liga-Desliga', 'Gira suavemente sem chiados', checklist.botaoVolume)}
              {renderStatusItem('Seletor de Canais', 'Alterna perfeitamente com bipe', checklist.seletorCanais)}
              {renderStatusItem('Botão PTT (Transmissão)', 'Aciona LED vermelho instantâneo', checklist.botaoPtt)}
              {renderStatusItem('Teste de Comunicação Prática', 'Áudio claro sem cortes', checklist.testeComunicacaoPratica)}
            </div>
          </div>

          {/* 4. Acessórios */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-seguranca-yellow flex items-center gap-1.5">
              <Headphones className="w-3.5 h-3.5" /> 4. Acessórios Adicionais
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {renderStatusItem('Fone de Ouvido / Lapela', 'Microfone e áudio OK', checklist.foneOuvidoLapela)}
              {renderStatusItem('Carregador de Mesa / Fonte', 'Sem pinos tortos, LED acende', checklist.carregadorMesaFonte)}
            </div>
          </div>

          {/* Observações */}
          {checklist.observations && (
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs">
              <span className="font-semibold text-gray-400 block mb-1">Observações / Avarias:</span>
              <p className="text-white whitespace-pre-wrap">{checklist.observations}</p>
            </div>
          )}

          {/* Assinatura do Supervisor ou Gestor Operacional */}
          <div className="pt-2">
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-center max-w-md mx-auto">
              <span className="text-xs font-semibold text-seguranca-yellow block mb-2">Assinatura do Supervisor / Gestor Operacional</span>
              {checklist.almoxarifeSignatureBase64 || checklist.vigilanteSignatureBase64 ? (
                <img
                  src={checklist.almoxarifeSignatureBase64 || checklist.vigilanteSignatureBase64}
                  alt="Assinatura Supervisor"
                  className="max-h-20 mx-auto bg-white p-1 rounded"
                />
              ) : (
                <span className="text-xs text-gray-500 italic">Assinatura no documento físico</span>
              )}
              <p className="text-xs font-medium text-gray-300 mt-2">
                {checklist.almoxarifeName || 'Supervisor / Gestor Operacional'}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 border-t border-slate-800 pt-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-slate-700 text-gray-300 hover:bg-slate-800 w-full sm:w-auto"
          >
            Fechar
          </Button>
          <Button
            type="button"
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="bg-seguranca-yellow hover:bg-seguranca-yellow/90 text-slate-950 font-bold w-full sm:w-auto flex items-center justify-center gap-2"
          >
            {downloading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Baixando PDF...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Baixar PDF Oficial
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
