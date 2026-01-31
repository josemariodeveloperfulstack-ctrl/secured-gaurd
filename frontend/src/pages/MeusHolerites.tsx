import React, { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { StandardLayout } from '@/components/StandardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import holeriteService, { Holerite } from '@/services/holeriteService';
import receiptService, { Receipt } from '@/services/receiptService';
import { Loader2, Calendar, Download, Eye, FileText, CheckCircle, File, AlertCircle } from 'lucide-react';
import { DocumentPreviewModal } from '@/components/DocumentPreviewModal';

const monthNames: Record<number, string> = {
  1: 'Janeiro',
  2: 'Fevereiro',
  3: 'Março',
  4: 'Abril',
  5: 'Maio',
  6: 'Junho',
  7: 'Julho',
  8: 'Agosto',
  9: 'Setembro',
  10: 'Outubro',
  11: 'Novembro',
  12: 'Dezembro',
};

const formatMonth = (month: number) => monthNames[month] ?? `Mês ${month}`;

const MeusHoleritesContent: React.FC = () => {
  const { toast } = useToast();
  const [holerites, setHolerites] = useState<Holerite[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Preview State
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<any>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [holeritesData, receiptsData] = await Promise.all([
          holeriteService.getAllHolerites(),
          receiptService.getAllReceipts()
        ]);
        setHolerites(holeritesData || []);
        setReceipts(receiptsData || []);
      } catch (err: any) {
        console.error('Erro ao carregar documentos do colaborador', err);
        setError(err?.response?.data?.message || 'Não foi possível carregar seus documentos.');
        toast({
          title: 'Erro ao carregar documentos',
          description: err?.response?.data?.message || 'Tente novamente mais tarde.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [toast]);

  const groupedByYearAndMonth = useMemo(() => {
    const grouped: Record<number, Record<number, any[]>> = {};

    const addItems = (items: any[], type: 'holerite' | 'receipt') => {
      items.forEach((item) => {
        if (!item.year || !item.month) return;

        if (!grouped[item.year]) grouped[item.year] = {};
        if (!grouped[item.year][item.month]) grouped[item.year][item.month] = [];

        grouped[item.year][item.month].push({ ...item, docType: type });
      });
    };

    addItems(holerites, 'holerite');
    addItems(receipts, 'receipt');

    return grouped;
  }, [holerites, receipts]);

  const years = useMemo(() => {
    return Object.keys(groupedByYearAndMonth)
      .map((year) => Number(year))
      .sort((a, b) => b - a);
  }, [groupedByYearAndMonth]);

  const handleDownload = async (item: any) => {
    try {
      let blob: Blob;
      if (item.docType === 'holerite') {
        // Usar downloadHoleriteById que é mais preciso
        blob = await holeriteService.downloadHoleriteById(item.id);
      } else {
        blob = await receiptService.downloadReceiptBlob(item.id);
      }

      // Criar link temporário para download compatível com mobile
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', item.fileName || `documento_${item.id}.pdf`);

      // Essencial para downloads em alguns navegadores mobile
      link.setAttribute('target', '_blank');

      document.body.appendChild(link);
      link.click();

      // Pequeno delay para garantir que o download inicie antes de remover o link e revogar a URL
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);

      toast({
        title: 'Sucesso',
        description: `${item.docType === 'holerite' ? 'Holerite' : 'Comprovante'} baixado com sucesso!`,
      });
    } catch (err: any) {
      console.error('Erro ao baixar documento', err);
      toast({
        title: 'Erro ao baixar',
        description: err?.response?.data?.message || 'Não foi possível baixar o arquivo.',
        variant: 'destructive',
      });
    }
  };

  const handleView = async (item: any) => {
    try {
      setPreviewLoading(true);
      setPreviewDoc(item);
      setPreviewOpen(true);

      let blob: Blob;
      if (item.docType === 'holerite') {
        blob = await holeriteService.downloadHolerite(item.fileName);
      } else {
        blob = await receiptService.downloadReceiptBlob(item.id);
      }

      const url = window.URL.createObjectURL(blob);
      setPreviewUrl(url);
    } catch (err: any) {
      console.error('Erro ao visualizar documento', err);
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
    setPreviewDoc(null);
  };

  return (
    <StandardLayout
      title="Meus Documentos"
      subtitle="Visualize e gerencie seus holerites e comprovantes de pagamento organizados por ano e mês"
    >
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-300">
          <Loader2 className="w-8 h-8 animate-spin mb-3" />
          <p>Carregando seus holerites...</p>
        </div>
      ) : error ? (
        <Card className="bg-red-500/10 border-red-500/40">
          <CardContent className="py-6 text-red-200">
            {error}
          </CardContent>
        </Card>
      ) : holerites.length === 0 && receipts.length === 0 ? (
        <Card className="bg-seguranca-graphite border-gray-700">
          <CardContent className="py-10 flex flex-col items-center gap-3 text-gray-300">
            <FileText className="w-10 h-10" />
            <p>Nenhum documento encontrado.</p>
            <span className="text-sm text-gray-500">
              Assim que novos holerites ou comprovantes forem disponibilizados, eles aparecerão aqui.
            </span>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-10">
          {years.map((year) => {
            const months = Object.keys(groupedByYearAndMonth[year])
              .map((month) => Number(month))
              .sort((a, b) => b - a);

            return (
              <div key={year} className="space-y-4" data-animate="fadeUp">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-semibold text-gray-200">
                    {year}
                  </h2>
                  <Badge className="bg-indigo-500/20 text-indigo-200 border-indigo-500/40">
                    {months.length} mês{months.length > 1 ? 'es' : ''}
                  </Badge>
                </div>

                <Separator className="bg-gray-700" />

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {months.map((month) => {
                    const items = groupedByYearAndMonth[year][month];

                    return (
                      <Card key={`${year}-${month}`} className="bg-seguranca-graphite border-gray-700 hover:border-gray-500 transition-colors">
                        <CardHeader>
                          <CardTitle className="flex items-center justify-between text-gray-100">
                            <span className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-indigo-400" />
                              {formatMonth(month)}
                            </span>
                            <Badge className="bg-gray-800 text-gray-200 border-gray-600">
                              {items.length} arquivo{items.length > 1 ? 's' : ''}
                            </Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {items.map((item) => (
                            <div
                              key={item.id}
                              className="rounded-lg border border-gray-700 bg-seguranca-black/40 p-3 space-y-3"
                            >
                              <div className="space-y-1 text-sm text-gray-300">
                                <div className="flex items-center justify-between">
                                  <p className="font-medium text-gray-100">{item.employeeName}</p>
                                  <Badge className={item.docType === 'holerite' ? "bg-blue-500/20 text-blue-200 border-blue-500/40" : "bg-green-500/20 text-green-200 border-green-500/40"}>
                                    {item.docType === 'holerite' ? 'Holerite' : 'Comprovante'}
                                  </Badge>
                                </div>
                                <p className="text-xs text-gray-400">CPF: {item.cpf}</p>
                                <p className="text-xs text-gray-500 truncate">{item.fileName}</p>
                                {item.transferDate && (
                                  <p className="text-[10px] text-gray-500">Pagamento: {new Date(item.transferDate).toLocaleDateString('pt-BR')}</p>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-gray-600 text-gray-100 hover:bg-gray-800"
                                  onClick={() => handleView(item)}
                                >
                                  <Eye className="w-4 h-4 mr-1" />
                                  Visualizar
                                </Button>
                                <Button
                                  size="sm"
                                  className={item.docType === 'holerite' ? "bg-indigo-600 hover:bg-indigo-700 text-white" : "bg-green-600 hover:bg-green-700 text-white"}
                                  onClick={() => handleDownload(item)}
                                >
                                  <Download className="w-4 h-4 mr-1" />
                                  Baixar
                                </Button>
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Pré-visualização */}
      <DocumentPreviewModal
        isOpen={previewOpen}
        onClose={handleClosePreview}
        title={previewDoc?.docType === 'holerite' ? 'Holerite' : 'Comprovante'}
        fileName={previewDoc?.fileName || ''}
        fileUrl={previewUrl}
        onDownload={() => handleDownload(previewDoc)}
        loading={previewLoading}
      />
    </StandardLayout>
  );
};

const MeusHolerites: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const normalizedRole = (user.role ?? '').replace(/^ROLE_/, '').toUpperCase();

  if (normalizedRole !== 'COLABORADOR') {
    return <Navigate to="/holerites" replace />;
  }

  return <MeusHoleritesContent />;
};

export default MeusHolerites;
