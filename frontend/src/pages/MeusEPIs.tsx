import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { StandardLayout } from '@/components/StandardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { epiDeliveryFormService, EPIDeliveryForm } from '@/services/epiDeliveryFormService';
import { Loader2, Calendar, Download, Eye, HardHat, FileText, MapPin, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DocumentPreviewModal } from '@/components/DocumentPreviewModal';

interface MeusEPIsContentProps {
  standalone?: boolean;
}

function needsConfirmation(ficha: EPIDeliveryForm): boolean {
  return ficha.status !== 'COMPLETED';
}

const MeusEPIsContent: React.FC<MeusEPIsContentProps> = ({ standalone = false }) => {
  const { toast } = useToast();
  const [fichas, setFichas] = useState<EPIDeliveryForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewFicha, setPreviewFicha] = useState<EPIDeliveryForm | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [previewLoading, setPreviewLoading] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmFicha, setConfirmFicha] = useState<EPIDeliveryForm | null>(null);
  const [confirmCode, setConfirmCode] = useState('');
  const [confirming, setConfirming] = useState(false);

  const loadFichas = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await epiDeliveryFormService.getMine();
      setFichas(data || []);
    } catch (err: any) {
      console.error('Erro ao carregar fichas de EPI do colaborador', err);
      setError(err?.response?.data?.message || 'Não foi possível carregar suas fichas de EPI.');
      toast({
        title: 'Erro ao carregar fichas',
        description: err?.response?.data?.message || 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFichas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDownload = async (ficha: EPIDeliveryForm) => {
    try {
      const blob = await epiDeliveryFormService.generatePdfById(ficha.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ficha-epi-${ficha.deliveryDate || 'documento'}.pdf`);
      link.setAttribute('target', '_blank');
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);

      toast({
        title: 'Sucesso',
        description: 'Ficha de EPI baixada com sucesso!',
      });
    } catch (err: any) {
      console.error('Erro ao baixar ficha de EPI', err);
      toast({
        title: 'Erro ao baixar',
        description: err?.response?.data?.message || 'Não foi possível baixar o arquivo.',
        variant: 'destructive',
      });
    }
  };

  const handleView = async (ficha: EPIDeliveryForm) => {
    try {
      setPreviewLoading(true);
      setPreviewFicha(ficha);
      setPreviewOpen(true);

      const blob = await epiDeliveryFormService.generatePdfById(ficha.id);
      const url = window.URL.createObjectURL(blob);
      setPreviewUrl(url);
    } catch (err: any) {
      console.error('Erro ao visualizar ficha de EPI', err);
      toast({
        title: 'Erro ao visualizar',
        description: err?.response?.data?.message || 'Não foi possível carregar a pré-visualização.',
        variant: 'destructive',
      });
      setPreviewOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleClosePreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl('');
    setPreviewOpen(false);
    setPreviewFicha(null);
  };

  const openConfirm = (ficha: EPIDeliveryForm) => {
    setConfirmFicha(ficha);
    setConfirmCode('');
    setConfirmOpen(true);
  };

  const handleConfirmReceipt = async () => {
    if (!confirmFicha) return;
    try {
      setConfirming(true);
      const needsCode = Boolean(confirmFicha.confirmationPending);
      if (needsCode && (!confirmCode || confirmCode.trim().length < 4)) {
        toast({
          title: 'Código obrigatório',
          description: 'Informe o código de 6 dígitos enviado por WhatsApp.',
          variant: 'destructive',
        });
        return;
      }
      await epiDeliveryFormService.confirmOwnReceipt(
        confirmFicha.id,
        needsCode ? confirmCode.trim() : undefined
      );
      toast({
        title: 'Recebimento confirmado',
        description: 'Sua confirmação de recebimento de EPI foi registrada.',
      });
      setConfirmOpen(false);
      setConfirmFicha(null);
      await loadFichas();
    } catch (err: any) {
      toast({
        title: 'Não foi possível confirmar',
        description: err?.response?.data?.message || err?.message || 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setConfirming(false);
    }
  };

  return (
    <StandardLayout
      isSubPage={standalone}
      title={standalone ? undefined : 'Meus EPIs'}
      subtitle={standalone ? undefined : 'Visualize, baixe o PDF e confirme o recebimento das suas fichas de EPI'}
    >
      <div className="space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-300">
            <Loader2 className="w-8 h-8 animate-spin mb-3" />
            <p>Carregando suas fichas de EPI...</p>
          </div>
        ) : error ? (
          <Card className="bg-red-500/10 border-red-500/40">
            <CardContent className="py-6 text-red-200">{error}</CardContent>
          </Card>
        ) : fichas.length === 0 ? (
          <Card className="bg-seguranca-graphite border-gray-700">
            <CardContent className="py-10 flex flex-col items-center gap-3 text-gray-300">
              <HardHat className="w-10 h-10" />
              <p>Você não possui fichas de EPI registradas.</p>
              <span className="text-sm text-gray-500 text-center max-w-md">
                Suas fichas aparecerão aqui assim que forem registradas pelo almoxarifado. Se você já recebeu EPIs e a
                lista continua vazia, peça ao RH para vincular seu usuário ao cadastro de funcionário.
              </span>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {fichas.map((ficha) => {
              const confirmed = ficha.status === 'COMPLETED';
              const pending = needsConfirmation(ficha);
              return (
                <Card
                  key={ficha.id}
                  className="bg-seguranca-graphite border-gray-700 hover:border-seguranca-yellow/30 transition-all group"
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between text-gray-100 gap-2">
                      <span className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-seguranca-yellow" />
                        {ficha.deliveryDate
                          ? format(new Date(ficha.deliveryDate), 'dd/MM/yyyy', { locale: ptBR })
                          : 'Data não informada'}
                      </span>
                      <Badge
                        className={
                          confirmed
                            ? 'bg-green-500/15 text-green-400 border-green-500/30'
                            : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                        }
                      >
                        {confirmed ? 'Confirmada' : 'Pendente'}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2 text-sm text-gray-300">
                      <div className="flex items-center gap-2">
                        <HardHat className="w-4 h-4 text-gray-500" />
                        <span className="font-medium text-gray-100">
                          {ficha.items?.length || 0} item(s) de EPI
                        </span>
                      </div>
                      {ficha.employeeWorkSector && (
                        <div className="flex items-center gap-2 text-xs">
                          <MapPin className="w-3 h-3 text-gray-500" />
                          <span>Setor: {ficha.employeeWorkSector}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-xs">
                        <FileText className="w-3 h-3 text-gray-500" />
                        <span>Responsável: {ficha.responsibleEmployeeName || 'N/A'}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 border-gray-600 text-gray-100 hover:bg-gray-800"
                        onClick={() => handleView(ficha)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Ver
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 bg-seguranca-yellow hover:bg-seguranca-yellow/90 text-seguranca-black font-bold"
                        onClick={() => handleDownload(ficha)}
                      >
                        <Download className="w-4 h-4 mr-1" />
                        PDF
                      </Button>
                    </div>

                    {pending && (
                      <Button
                        size="sm"
                        className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold"
                        onClick={() => openConfirm(ficha)}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        Confirmar recebimento
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <DocumentPreviewModal
        isOpen={previewOpen}
        onClose={handleClosePreview}
        title="Ficha de Entrega de EPI"
        fileName={`ficha-epi-${previewFicha?.deliveryDate || ''}.pdf`}
        fileUrl={previewUrl}
        onDownload={() => previewFicha && handleDownload(previewFicha)}
        loading={previewLoading}
      />

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="bg-seguranca-graphite border-gray-700 text-gray-100">
          <DialogHeader>
            <DialogTitle>Confirmar recebimento de EPI</DialogTitle>
            <DialogDescription className="text-gray-400">
              {confirmFicha?.confirmationPending
                ? 'Informe o código de 6 dígitos enviado por WhatsApp para confirmar o recebimento.'
                : 'Confirme que você recebeu os EPIs desta ficha. Você também pode gerar o PDF antes de confirmar.'}
            </DialogDescription>
          </DialogHeader>

          {confirmFicha?.confirmationPending && (
            <div className="space-y-2">
              <label className="text-sm text-gray-300">Código de confirmação</label>
              <Input
                value={confirmCode}
                onChange={(e) => setConfirmCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="bg-seguranca-black border-gray-600 text-white tracking-widest text-center text-lg"
                inputMode="numeric"
                maxLength={6}
              />
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            {confirmFicha && (
              <Button
                variant="outline"
                className="border-gray-600 text-gray-100"
                onClick={() => handleDownload(confirmFicha)}
              >
                <Download className="w-4 h-4 mr-1" />
                Gerar PDF
              </Button>
            )}
            <Button
              className="bg-green-600 hover:bg-green-500 text-white"
              onClick={handleConfirmReceipt}
              disabled={confirming}
            >
              {confirming ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </StandardLayout>
  );
};

const MeusEPIs: React.FC = ({ standalone = false }: { standalone?: boolean }) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <MeusEPIsContent standalone={standalone} />;
};

export default MeusEPIs;
