import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  PackageCheck, 
  Download, 
  CheckCircle2, 
  XCircle, 
  Radio, 
  BatteryCharging, 
  Flashlight, 
  ShieldCheck, 
  Loader2 
} from 'lucide-react';
import { EquipmentCautela, equipmentCautelaService } from '@/services/equipmentCautelaService';

interface EquipmentCautelaViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  termo: EquipmentCautela | null;
}

export const EquipmentCautelaViewModal: React.FC<EquipmentCautelaViewModalProps> = ({
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
      const blob = await equipmentCautelaService.downloadPdf(termo.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `termo-cautela-equipamentos-${termo.employeeName || termo.id}.pdf`;
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

  const renderItemStatus = (title: string, marcaModelo: string | undefined, entregue: boolean | undefined, icon: React.ReactNode) => (
    <div className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${
      entregue ? 'bg-emerald-950/20 border-emerald-500/40 text-gray-200' : 'bg-slate-950/40 border-slate-800 text-gray-400'
    }`}>
      <div className="flex items-center gap-2.5">
        <div className={`p-1.5 rounded-lg ${entregue ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-gray-500'}`}>
          {icon}
        </div>
        <div>
          <p className="text-xs font-semibold text-white">{title}</p>
          <p className="text-[11px] text-gray-400">{marcaModelo || (entregue ? 'Padrão' : 'Não entregue')}</p>
        </div>
      </div>
      {entregue ? (
        <Badge className="bg-emerald-600 text-white text-[10px] py-0.5 px-2 flex items-center gap-1 flex-shrink-0">
          <CheckCircle2 className="w-3 h-3" /> Entregue
        </Badge>
      ) : (
        <Badge className="bg-slate-800 text-gray-400 text-[10px] py-0.5 px-2 flex items-center gap-1 flex-shrink-0">
          <XCircle className="w-3 h-3" /> Não
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
                <PackageCheck className="w-5 h-5 text-seguranca-yellow" />
                <span>Termo de Cautela: {termo.employeeName}</span>
              </DialogTitle>
              <p className="text-xs text-gray-400 mt-0.5">
                Cargo: <strong className="text-gray-300">{termo.jobTitle || 'Vigilante'}</strong> | Setor: <strong className="text-gray-300">{termo.workPostName || '-'}</strong>
              </p>
            </div>
            <Badge className="bg-emerald-600 text-white font-bold px-3 py-1 text-xs">
              {termo.status || 'ATIVO'}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Dados do Colaborador */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 text-xs">
            <div>
              <span className="text-gray-400 block mb-0.5">Colaborador</span>
              <span className="font-semibold text-white">{termo.employeeName}</span>
              {termo.registration && <span className="text-gray-400 block text-[10px]">RE: {termo.registration}</span>}
            </div>
            <div>
              <span className="text-gray-400 block mb-0.5">CPF</span>
              <span className="font-semibold text-white">{termo.cpf || '-'}</span>
            </div>
            <div>
              <span className="text-gray-400 block mb-0.5">Cargo / Setor</span>
              <span className="font-semibold text-white">{termo.jobTitle || 'Vigilante'}</span>
              <span className="text-gray-400 block text-[10px]">{termo.workPostName || '-'}</span>
            </div>
            <div>
              <span className="text-gray-400 block mb-0.5">Data do Termo</span>
              <span className="font-semibold text-white">{termo.termDate}</span>
            </div>
          </div>

          {/* Itens Acautelados */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-seguranca-yellow flex items-center gap-1.5">
              <PackageCheck className="w-3.5 h-3.5" /> Materiais e Equipamentos Entregues
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {renderItemStatus('01. Rádio Transceptor (HT)', termo.item1HtMarcaModelo, termo.item1HtEntregue, <Radio className="w-4 h-4" />)}
              {renderItemStatus('02. Carregador de Bateria HT', termo.item2CarregadorMarcaModelo, termo.item2CarregadorEntregue, <BatteryCharging className="w-4 h-4" />)}
              {renderItemStatus('03. Lanterna Tática', termo.item3LanternaMarcaModelo, termo.item3LanternaEntregue, <Flashlight className="w-4 h-4" />)}
              {renderItemStatus('04. Bastão de Ronda Eletrônico', termo.item4BastaoMarcaModelo, termo.item4BastaoEntregue, <ShieldCheck className="w-4 h-4" />)}
            </div>

            {termo.item5OutrosDescricao && (
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                <span className="text-gray-400 block font-semibold mb-0.5">05. Outros Materiais:</span>
                <p className="text-white">
                  {termo.item5OutrosDescricao} {termo.item5OutrosMarcaModelo ? `(${termo.item5OutrosMarcaModelo})` : ''}
                </p>
              </div>
            )}
          </div>

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
              <span className="text-xs font-semibold text-gray-300 block mb-2">Assinatura do Funcionário</span>
              {termo.employeeSignatureBase64 ? (
                <img
                  src={termo.employeeSignatureBase64}
                  alt="Assinatura Funcionário"
                  className="max-h-16 mx-auto bg-white p-1 rounded"
                />
              ) : (
                <span className="text-xs text-gray-500 italic">Assinatura física</span>
              )}
              <p className="text-xs text-gray-400 mt-2">{termo.employeeName}</p>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-center">
              <span className="text-xs font-semibold text-gray-300 block mb-2">Assinatura do Almoxarife</span>
              {termo.almoxarifeSignatureBase64 ? (
                <img
                  src={termo.almoxarifeSignatureBase64}
                  alt="Assinatura Almoxarife"
                  className="max-h-16 mx-auto bg-white p-1 rounded"
                />
              ) : (
                <span className="text-xs text-gray-500 italic">Assinatura física</span>
              )}
              <p className="text-xs text-gray-400 mt-2">{termo.almoxarifeName || 'Almoxarife Responsável'}</p>
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
