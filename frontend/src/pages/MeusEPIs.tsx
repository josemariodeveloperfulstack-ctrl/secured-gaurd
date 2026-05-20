import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { StandardLayout } from '@/components/StandardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { epiDeliveryFormService, EPIDeliveryForm } from '@/services/epiDeliveryFormService';
import { Loader2, Calendar, Download, Eye, HardHat, FileText, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DocumentPreviewModal } from '@/components/DocumentPreviewModal';

interface MeusEPIsContentProps {
  standalone?: boolean;
}

const MeusEPIsContent: React.FC<MeusEPIsContentProps> = ({ standalone = false }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [fichas, setFichas] = useState<EPIDeliveryForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Preview State
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewFicha, setPreviewFicha] = useState<EPIDeliveryForm | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [previewLoading, setPreviewLoading] = useState(false);

  const employeeId = user?.employeeId ?? user?.id ?? null;

  useEffect(() => {
    const load = async () => {
      if (!employeeId) return;
      
      try {
        setLoading(true);
        setError(null);
        const data = await epiDeliveryFormService.getByEmployeeId(employeeId);
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

    load();
  }, [employeeId, toast]);

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

  return (
    <StandardLayout 
      isSubPage={standalone}
      title={standalone ? undefined : "Meus EPIs"}
      subtitle={standalone ? undefined : "Visualize suas fichas de entrega de EPI assinadas"}
    >
      <div className="space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-300">
            <Loader2 className="w-8 h-8 animate-spin mb-3" />
            <p>Carregando suas fichas de EPI...</p>
          </div>
        ) : error ? (
          <Card className="bg-red-500/10 border-red-500/40">
            <CardContent className="py-6 text-red-200">
              {error}
            </CardContent>
          </Card>
        ) : fichas.length === 0 ? (
          <Card className="bg-seguranca-graphite border-gray-700">
            <CardContent className="py-10 flex flex-col items-center gap-3 text-gray-300">
              <HardHat className="w-10 h-10" />
              <p>Você não possui fichas de EPI registradas.</p>
              <span className="text-sm text-gray-500">
                Suas fichas aparecerão aqui assim que forem registradas pelo almoxarifado.
              </span>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {fichas.map((ficha) => (
              <Card key={ficha.id} className="bg-seguranca-graphite border-gray-700 hover:border-seguranca-yellow/30 transition-all group">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-gray-100">
                    <span className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-seguranca-yellow" />
                      {ficha.deliveryDate ? format(new Date(ficha.deliveryDate), 'dd/MM/yyyy', { locale: ptBR }) : 'Data não informada'}
                    </span>
                    <Badge className="bg-seguranca-yellow/10 text-seguranca-yellow border-seguranca-yellow/20">
                      {ficha.items?.length || 0} item(s)
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm text-gray-300">
                    <div className="flex items-center gap-2">
                      <HardHat className="w-4 h-4 text-gray-500" />
                      <span className="font-medium text-gray-100">Ficha de EPI</span>
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

                  <div className="flex gap-2">
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
                </CardContent>
              </Card>
            ))}
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
