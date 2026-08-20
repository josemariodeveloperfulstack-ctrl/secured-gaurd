import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Car, 
  Download, 
  CheckCircle2, 
  XCircle, 
  Sun, 
  Moon, 
  Loader2, 
  ShieldCheck, 
  Lightbulb, 
  Wrench, 
  Briefcase 
} from 'lucide-react';
import { VehicleChecklist, vehicleChecklistService } from '@/services/vehicleChecklistService';

interface VehicleChecklistViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  checklist: VehicleChecklist | null;
}

export const VehicleChecklistViewModal: React.FC<VehicleChecklistViewModalProps> = ({
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
      const blob = await vehicleChecklistService.downloadPdf(checklist.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `checklist-viatura-${checklist.plate || 'doc'}-${checklist.checklistDate || 'doc'}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Sucesso',
        description: 'PDF oficial da viatura baixado com sucesso!',
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
                <Car className="w-5 h-5 text-seguranca-yellow" />
                <span>Checklist de Viatura: {checklist.plate}</span>
              </DialogTitle>
              <p className="text-xs text-gray-400 mt-0.5">
                Modelo: <strong className="text-gray-300">{checklist.model || '-'}</strong> | Km: <strong className="text-gray-300">{checklist.currentKm ? `${checklist.currentKm} km` : '-'}</strong>
              </p>
            </div>
            <div>
              {checklist.shift === 'DIA' ? (
                <Badge className="bg-amber-400 text-slate-950 font-bold px-3 py-1 text-xs flex items-center gap-1">
                  <Sun className="w-3 h-3 text-amber-600" /> Turno Dia
                </Badge>
              ) : (
                <Badge className="bg-indigo-600 text-white font-bold px-3 py-1 text-xs flex items-center gap-1">
                  <Moon className="w-3 h-3" /> Turno Noite
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Dados Gerais */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 text-xs">
            <div>
              <span className="text-gray-400 block mb-0.5">Data / Hora</span>
              <span className="font-semibold text-white">
                {checklist.checklistDate} {checklist.checklistTime?.substring(0, 5)}
              </span>
            </div>
            <div>
              <span className="text-gray-400 block mb-0.5">Funcionário / Condutor</span>
              <span className="font-semibold text-white">{checklist.employeeName || '-'}</span>
              {checklist.employeeRegistration && (
                <span className="text-gray-400 block text-[10px]">RE: {checklist.employeeRegistration}</span>
              )}
            </div>
            <div>
              <span className="text-gray-400 block mb-0.5">Supervisor</span>
              <span className="font-semibold text-white">{checklist.supervisorName || '-'}</span>
            </div>
            <div>
              <span className="text-gray-400 block mb-0.5">Placa / Km</span>
              <span className="font-semibold text-white">
                {checklist.plate} {checklist.currentKm ? `(${checklist.currentKm} km)` : ''}
              </span>
            </div>
          </div>

          {/* 1. Inspeção Externa */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-seguranca-yellow flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> 1. Inspeção Externa e Lataria (Visual)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {renderStatusItem('Dianteira', 'Parachoque firme, grade e capô travado', checklist.dianteira)}
              {renderStatusItem('Laterais', 'Sem riscos novos, mossas ou batidas', checklist.laterais)}
              {renderStatusItem('Vidros e Retrovisores', 'Limpos, sem trincas, regulando', checklist.vidrosRetrovisores)}
              {renderStatusItem('Identificação Visual', 'Adesivos e logotipo legíveis', checklist.identificacaoVisual)}
            </div>
          </div>

          {/* 2. Iluminação */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-seguranca-yellow flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5" /> 2. Iluminação e Sinalização Sonora
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {renderStatusItem('Faróis e Lanternas', 'Farol, setas, ré e freio OK', checklist.faroisLanternas)}
              {renderStatusItem('Giroflex / Sirene', 'Luzes táticas e som claro', checklist.giroflexSirene)}
              {renderStatusItem('Buzina', 'Som forte e sem falhas', checklist.buzina)}
            </div>
          </div>

          {/* 3. Mecânica */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-seguranca-yellow flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5" /> 3. Mecânica Básica e Fluídos
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {renderStatusItem('Pneus', 'Calibrados, sulcos OK e estepe cheio', checklist.pneus)}
              {renderStatusItem('Níveis', 'Óleo e água checados a frio', checklist.niveis)}
              {renderStatusItem('Painel', 'Sem luzes de aviso acesas', checklist.painel)}
            </div>
          </div>

          {/* 4. Kit de Bordo */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-seguranca-yellow flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5" /> 4. Kit de Bordo e Equipamentos
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {renderStatusItem('Documentação', 'CRLV no porta-luvas', checklist.documentacao)}
              {renderStatusItem('Ferramentas Emergência', 'Macaco, triângulo e chave roda', checklist.ferramentasEmergencia)}
              {renderStatusItem('Extintor de Incêndio', 'Na validade com ponteiro verde', checklist.extintorIncendio)}
              {renderStatusItem('Kit Prancheta', 'Talão, caneta e mapas', checklist.kitPrancheta)}
            </div>
          </div>

          {/* Observações */}
          {checklist.observations && (
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs">
              <span className="font-semibold text-gray-400 block mb-1">Observações / Avarias:</span>
              <p className="text-white whitespace-pre-wrap">{checklist.observations}</p>
            </div>
          )}

          {/* Assinatura */}
          {checklist.signatureBase64 && (
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-center">
              <span className="text-xs font-semibold text-gray-300 block mb-2">Assinatura Digital</span>
              <img
                src={checklist.signatureBase64}
                alt="Assinatura"
                className="max-h-16 mx-auto bg-white p-1 rounded"
              />
              <p className="text-xs text-gray-400 mt-2">
                {checklist.employeeName || checklist.supervisorName || 'Responsável'}
              </p>
            </div>
          )}
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
