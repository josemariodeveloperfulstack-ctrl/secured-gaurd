import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Crosshair, 
  Download, 
  CheckCircle2, 
  XCircle, 
  ShieldCheck, 
  FileText, 
  Loader2,
  Camera
} from 'lucide-react';
import { FirearmAcautelamento, firearmAcautelamentoService } from '@/services/firearmAcautelamentoService';

interface FirearmAcautelamentoViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  termo: FirearmAcautelamento | null;
}

export const FirearmAcautelamentoViewModal: React.FC<FirearmAcautelamentoViewModalProps> = ({
  open,
  onOpenChange,
  termo,
}) => {
  const { toast } = useToast();
  const [downloading, setDownloading] = useState(false);

  if (!termo) return null;

  const handleDownloadPdf = async () => {
    if (!termo.id) return;
    try {
      setDownloading(true);
      const blob = await firearmAcautelamentoService.downloadPdf(termo.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `termo-acautelamento-arma-${termo.serialNumber || termo.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Sucesso',
        description: 'PDF oficial do termo baixado com sucesso!',
      });
    } catch (error) {
      console.error('Erro ao baixar PDF:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível baixar o PDF do termo.',
        variant: 'destructive',
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[96vw] max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700 text-white p-4 sm:p-6 rounded-xl">
        <DialogHeader className="border-b border-slate-800 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <DialogTitle className="text-lg sm:text-xl font-bold text-seguranca-yellow flex items-center gap-2">
                <Crosshair className="w-5 h-5 text-seguranca-yellow" />
                <span>Termo de Acautelamento: {termo.serialNumber}</span>
              </DialogTitle>
              <p className="text-xs text-gray-400 mt-0.5">
                Arma: <strong className="text-gray-300">{termo.weaponType} {termo.brand} {termo.caliber}</strong>
              </p>
            </div>
            <Badge className="bg-emerald-600 text-white font-bold px-3 py-1 text-xs">
              {termo.status || 'ATIVO'}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Dados do Vigilante */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 text-xs">
            <div>
              <span className="text-gray-400 block mb-0.5">Vigilante</span>
              <span className="font-semibold text-white">{termo.vigilanteName}</span>
              {termo.registration && <span className="text-gray-400 block text-[10px]">RE: {termo.registration}</span>}
            </div>
            <div>
              <span className="text-gray-400 block mb-0.5">CPF / CNV</span>
              <span className="font-semibold text-white">{termo.cpf || '-'}</span>
              {termo.cnvNumber && <span className="text-gray-400 block text-[10px]">CNV: {termo.cnvNumber}</span>}
            </div>
            <div>
              <span className="text-gray-400 block mb-0.5">Setor de Trabalho</span>
              <span className="font-semibold text-white">{termo.workPostName || '-'}</span>
            </div>
            <div>
              <span className="text-gray-400 block mb-0.5">Data Reciclagem</span>
              <span className="font-semibold text-white">{termo.recyclingExpirationDate || '-'}</span>
            </div>
          </div>

          {/* Dados do Armamento */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 text-xs">
            <div>
              <span className="text-gray-400 block mb-0.5">Espécie / Marca</span>
              <span className="font-semibold text-white">{termo.weaponType} {termo.brand}</span>
            </div>
            <div>
              <span className="text-gray-400 block mb-0.5">Calibre / Tiros</span>
              <span className="font-semibold text-white">{termo.caliber || '-'} ({termo.shotCapacity || 6} tiros)</span>
            </div>
            <div>
              <span className="text-gray-400 block mb-0.5">Nº de Série</span>
              <span className="font-semibold font-mono text-seguranca-yellow">{termo.serialNumber}</span>
            </div>
            <div>
              <span className="text-gray-400 block mb-0.5">CRAF (PF)</span>
              <span className="font-semibold text-white">{termo.crafNumber || '-'}</span>
            </div>
          </div>

          {/* Munições e Acessórios */}
          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1">
            <span className="text-gray-400 block font-semibold mb-1">Munições e Acessórios:</span>
            <p className="text-white">
              Quantidade: <strong>{termo.ammoQuantity || 0} un</strong> ({termo.ammoType || 'Novas'}) | Lote: <strong>{termo.ammoLot || '-'}</strong>
            </p>
            <p className="text-gray-300">
              Acessórios: <strong>{termo.accessories || 'Coldre tático e Porta-munição'}</strong>
            </p>
          </div>

          {/* Inspeção */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-seguranca-yellow flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> Inspeção Visual e Funcional
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between">
                <span>Mecanismo & Travas</span>
                {termo.mecanismoDisparoOk ? (
                  <Badge className="bg-emerald-600 text-white text-[10px]">OK</Badge>
                ) : (
                  <Badge className="bg-rose-600 text-white text-[10px]">Não</Badge>
                )}
              </div>
              <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between">
                <span>Cano Desobstruído</span>
                {termo.canoDesobstruidoOk ? (
                  <Badge className="bg-emerald-600 text-white text-[10px]">OK</Badge>
                ) : (
                  <Badge className="bg-rose-600 text-white text-[10px]">Não</Badge>
                )}
              </div>
              <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between">
                <span>Conservação</span>
                <Badge className="bg-slate-800 text-seguranca-yellow border border-seguranca-yellow/40 text-[10px]">
                  {termo.conservationState || 'Excelente'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Foto Opcional */}
          {termo.photoBase64 && (
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
              <span className="text-xs text-gray-400 font-semibold flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-seguranca-yellow" /> Registro Fotográfico Anexado:
              </span>
              <div className="max-w-xs rounded-lg overflow-hidden border border-slate-700 bg-black">
                <img src={termo.photoBase64} alt="Foto do Armamento" className="w-full h-auto max-h-48 object-contain" />
              </div>
            </div>
          )}

          {/* Observações */}
          {termo.observations && (
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs">
              <span className="font-semibold text-gray-400 block mb-1">Observações:</span>
              <p className="text-white whitespace-pre-wrap">{termo.observations}</p>
            </div>
          )}

          {/* Assinaturas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-center">
              <span className="text-xs font-semibold text-gray-300 block mb-2">Assinatura do Vigilante</span>
              {termo.vigilanteSignatureBase64 ? (
                <img
                  src={termo.vigilanteSignatureBase64}
                  alt="Assinatura Vigilante"
                  className="max-h-16 mx-auto bg-white p-1 rounded"
                />
              ) : (
                <span className="text-xs text-gray-500 italic">Assinatura física</span>
              )}
              <p className="text-xs text-gray-400 mt-2">{termo.vigilanteName}</p>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-center">
              <span className="text-xs font-semibold text-gray-300 block mb-2">Assinatura do Armeiro</span>
              {termo.armeiroSignatureBase64 ? (
                <img
                  src={termo.armeiroSignatureBase64}
                  alt="Assinatura Armeiro"
                  className="max-h-16 mx-auto bg-white p-1 rounded"
                />
              ) : (
                <span className="text-xs text-gray-500 italic">Assinatura física</span>
              )}
              <p className="text-xs text-gray-400 mt-2">{termo.armeiroName || 'Armeiro Responsável'}</p>
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
