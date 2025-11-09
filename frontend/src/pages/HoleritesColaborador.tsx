import React, { useEffect, useMemo, useState } from 'react';
import { StandardLayout } from '@/components/StandardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import holeriteService, { Holerite } from '@/services/holeriteService';
import paymentReceiptService, { PaymentReceipt } from '@/services/paymentReceiptService';
import { getApiUrl } from '@/config/environment';
import { unifiedDocumentService } from '@/services/unifiedDocumentService';
import api from '@/lib/axios';
import { User } from '@/types/user';
import {
  Loader2,
  FileText,
  Download,
  Eye,
  Calendar,
  Folder,
  Building2,
  FileDown
} from 'lucide-react';

interface UnifiedDocument {
  employeeName?: string;
  cpf?: string;
  fileName: string;
  month?: number;
  year?: number;
}

interface SectorDocument {
  fileName: string;
  filePath: string;
  employeeName: string;
  cpf: string;
  sector: string;
  month: number;
  year: number;
  period: string;
}

interface SectorGroup {
  name: string;
  documentCount: number;
  documents: SectorDocument[];
}

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

const sanitizeCpf = (value?: string | null) => (value ? value.replace(/\D/g, '') : '');

const normalizeName = (value?: string | null) => {
  if (!value) return '';
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
};

const extractCpfFromString = (value?: string | null) => {
  if (!value) return '';
  const match = value.match(/(\d{11})/);
  return match ? match[1] : '';
};

const buildDownloadUrl = (path: string) => {
  const apiUrl = getApiUrl();
  if (path.startsWith('http')) {
    return path;
  }
  return `${apiUrl}${path.startsWith('/') ? '' : '/'}${path}`;
};

const CollaboratorHolerites: React.FC<{ user: User }> = ({ user }) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'holerites' | 'receipts' | 'unificacao' | 'setores'>('holerites');
  const [loading, setLoading] = useState(true);
  const [holerites, setHolerites] = useState<Holerite[]>([]);
  const [receipts, setReceipts] = useState<PaymentReceipt[]>([]);
  const [unifiedDocuments, setUnifiedDocuments] = useState<UnifiedDocument[]>([]);
  const [sectorGroups, setSectorGroups] = useState<SectorGroup[]>([]);

  const userCpf = sanitizeCpf((user as any)?.cpf ?? user?.username ?? '');
  const userName = normalizeName(user?.name);

  useEffect(() => {
    let mounted = true;

    const matchesUser = (cpf?: string | null, name?: string | null, fallback?: string | null) => {
      const sanitized = sanitizeCpf(cpf);
      if (userCpf) {
        if (sanitized && sanitized === userCpf) {
          return true;
        }
        const fallbackCpf = sanitizeCpf(extractCpfFromString(fallback));
        if (fallbackCpf && fallbackCpf === userCpf) {
          return true;
        }
      }
      if (userName) {
        const normalizedCandidate = normalizeName(name ?? fallback ?? '');
        if (normalizedCandidate && normalizedCandidate === userName) {
          return true;
        }
      }
      return !userCpf && !userName;
    };

    const loadData = async () => {
      setLoading(true);
      try {
        const [holeritesResult, receiptsResult, unifiedResult, sectorsResult] = await Promise.allSettled([
          holeriteService.getAllHolerites(),
          paymentReceiptService.getAllPaymentReceipts(),
          api.get('/api/unified-documents/list', { params: { _t: Date.now() } }),
          api.get('/api/sector-organization/list'),
        ]);

        if (!mounted) {
          return;
        }

        if (holeritesResult.status === 'fulfilled') {
          const filtered = (holeritesResult.value || []).filter((holerite) =>
            matchesUser(holerite.cpf, holerite.employeeName, holerite.fileName)
          );
          setHolerites(filtered);
        } else {
          setHolerites([]);
          console.error('Erro ao carregar holerites:', holeritesResult.reason);
        }

        if (receiptsResult.status === 'fulfilled') {
          const filtered = (receiptsResult.value || []).filter((receipt) =>
            matchesUser(
              (receipt as any)?.cpf ?? receipt.employeeId,
              receipt.employeeName ?? (receipt as any)?.creditedName,
              receipt.fileName
            )
          );
          setReceipts(filtered);
        } else {
          setReceipts([]);
          console.error('Erro ao carregar comprovantes:', receiptsResult.reason);
        }

        if (unifiedResult.status === 'fulfilled') {
          const data = Array.isArray(unifiedResult.value.data?.documents)
            ? unifiedResult.value.data.documents
            : [];
          const filtered = data.filter((doc: UnifiedDocument) =>
            matchesUser(doc.cpf, doc.employeeName, doc.fileName)
          );
          setUnifiedDocuments(filtered);
        } else {
          setUnifiedDocuments([]);
          console.error('Erro ao carregar unificações:', unifiedResult.reason);
        }

        if (sectorsResult.status === 'fulfilled') {
          const sectors = Array.isArray(sectorsResult.value.data?.sectors)
            ? sectorsResult.value.data.sectors
            : [];

          const groups: SectorGroup[] = sectors
            .map((sector: any) => {
              const documents: SectorDocument[] = [];

              (sector.periods || []).forEach((period: any) => {
                (period.documents || []).forEach((doc: any) => {
                  if (
                    matchesUser(
                      doc.cpf,
                      doc.employeeName,
                      doc.fileName ?? doc.path ?? `${sector.name}_${period.period}`
                    )
                  ) {
                    documents.push({
                      fileName: doc.fileName,
                      filePath: doc.filePath ?? doc.path ?? '',
                      employeeName: doc.employeeName,
                      cpf: doc.cpf,
                      sector: sector.name,
                      month: doc.month ?? parseInt((period.period || '').split('_')[0] || '0', 10),
                      year: doc.year ?? parseInt((period.period || '').split('_')[1] || '0', 10),
                      period: period.period,
                    });
                  }
                });
              });

              return {
                name: sector.name,
                documentCount: documents.length,
                documents,
              };
            })
            .filter((group: SectorGroup) => group.documentCount > 0);

          setSectorGroups(groups);
        } else {
          setSectorGroups([]);
          console.error('Erro ao carregar documentos por setor:', sectorsResult.reason);
        }
      } catch (error) {
        console.error('Erro ao carregar dados do colaborador:', error);
        toast({
          title: 'Erro ao carregar documentos',
          description: 'Não foi possível carregar seus documentos. Tente novamente mais tarde.',
          variant: 'destructive',
        });
        setHolerites([]);
        setReceipts([]);
        setUnifiedDocuments([]);
        setSectorGroups([]);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      mounted = false;
    };
  }, [toast, userCpf, userName]);

  const holeritesGrouped = useMemo(() => {
    const grouped: Record<number, Record<number, Holerite[]>> = {};

    holerites.forEach((holerite) => {
      if (!holerite.year || !holerite.month) return;
      if (!grouped[holerite.year]) {
        grouped[holerite.year] = {};
      }
      if (!grouped[holerite.year][holerite.month]) {
        grouped[holerite.year][holerite.month] = [];
      }
      grouped[holerite.year][holerite.month].push(holerite);
    });

    return grouped;
  }, [holerites]);

  const holeriteYears = useMemo(() => {
    return Object.keys(holeritesGrouped)
      .map((year) => Number(year))
      .sort((a, b) => b - a);
  }, [holeritesGrouped]);

  const receiptsGrouped = useMemo(() => {
    const grouped: Record<number, Record<number, PaymentReceipt[]>> = {};

    receipts.forEach((receipt) => {
      const month = receipt.month;
      const year = receipt.year;
      if (!year || !month) return;

      if (!grouped[year]) {
        grouped[year] = {};
      }
      if (!grouped[year][month]) {
        grouped[year][month] = [];
      }
      grouped[year][month].push(receipt);
    });

    return grouped;
  }, [receipts]);

  const receiptYears = useMemo(() => {
    return Object.keys(receiptsGrouped)
      .map((year) => Number(year))
      .sort((a, b) => b - a);
  }, [receiptsGrouped]);

  const unifiedByYear = useMemo(() => {
    const groups: Record<number, UnifiedDocument[]> = {};
    unifiedDocuments.forEach((doc) => {
      const yearMatch = doc.year ?? parseInt(doc.fileName.match(/_(\d{4})\.pdf$/)?.[1] ?? '0', 10);
      if (!yearMatch) return;
      if (!groups[yearMatch]) {
        groups[yearMatch] = [];
      }
      groups[yearMatch].push(doc);
    });
    return groups;
  }, [unifiedDocuments]);

  const handlingDownloadError = (error: unknown, message: string) => {
    console.error(message, error);
    toast({
      title: 'Erro ao baixar documento',
      description: 'Não foi possível iniciar o download. Tente novamente.',
      variant: 'destructive',
    });
  };

  const handleDownloadHolerite = async (fileName: string) => {
    try {
      const blob = await holeriteService.downloadHolerite(fileName);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      handlingDownloadError(error, 'Erro ao baixar holerite');
    }
  };

  const handleViewHolerite = async (fileName: string) => {
    try {
      const blob = await holeriteService.downloadHolerite(fileName);
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      handlingDownloadError(error, 'Erro ao visualizar holerite');
    }
  };

  const handleViewReceipt = async (receipt: PaymentReceipt) => {
    try {
      const blob = await paymentReceiptService.getPaymentReceiptPdf(receipt.id);
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      handlingDownloadError(error, 'Erro ao visualizar comprovante');
    }
  };

  const handleDownloadReceipt = async (receipt: PaymentReceipt) => {
    try {
      await paymentReceiptService.downloadPaymentReceipt(receipt.id, receipt.fileName);
    } catch (error) {
      handlingDownloadError(error, 'Erro ao baixar comprovante');
    }
  };

  const handleViewUnified = async (doc: UnifiedDocument) => {
    try {
      await unifiedDocumentService.viewUnifiedDocument(doc.fileName);
    } catch (error) {
      handlingDownloadError(error, 'Erro ao visualizar documento unificado');
    }
  };

  const handleDownloadUnified = async (doc: UnifiedDocument) => {
    try {
      await unifiedDocumentService.downloadUnifiedDocument(doc.fileName);
    } catch (error) {
      handlingDownloadError(error, 'Erro ao baixar documento unificado');
    }
  };

  const handleDownloadSectorDocument = async (doc: SectorDocument) => {
    try {
      const url = `/api/sector-organization/download/${encodeURIComponent(doc.sector)}/${encodeURIComponent(
        doc.period
      )}/${encodeURIComponent(doc.fileName)}`;
      const response = await api.get(url, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = doc.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      handlingDownloadError(error, 'Erro ao baixar documento por setor');
    }
  };

  return (
    <StandardLayout
      title="Meus Documentos"
      subtitle="Visualize seus holerites, comprovantes e documentos unificados"
    >
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as typeof activeTab)}
        className="space-y-6"
      >
        <TabsList className="flex w-full gap-2 bg-transparent p-1 overflow-x-auto md:grid md:grid-cols-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
          <TabsTrigger
            value="holerites"
            className="flex-1 min-w-[140px] md:min-w-0 justify-center whitespace-nowrap text-seguranca-lightgray data-[state='active']:bg-seguranca-red data-[state='active']:text-white text-xs sm:text-sm border border-gray-700 rounded-lg py-2 sm:py-2.5"
          >
            Holerites
          </TabsTrigger>
          <TabsTrigger
            value="receipts"
            className="flex-1 min-w-[140px] md:min-w-0 justify-center whitespace-nowrap text-seguranca-lightgray data-[state='active']:bg-seguranca-red data-[state='active']:text-white text-xs sm:text-sm border border-gray-700 rounded-lg py-2 sm:py-2.5"
          >
            Comprovantes
          </TabsTrigger>
          <TabsTrigger
            value="unificacao"
            className="flex-1 min-w-[140px] md:min-w-0 justify-center whitespace-nowrap text-seguranca-lightgray data-[state='active']:bg-seguranca-red data-[state='active']:text-white text-xs sm:text-sm border border-gray-700 rounded-lg py-2 sm:py-2.5"
          >
            Unificação
          </TabsTrigger>
          <TabsTrigger
            value="setores"
            className="flex-1 min-w-[140px] md:min-w-0 justify-center whitespace-nowrap text-seguranca-lightgray data-[state='active']:bg-seguranca-red data-[state='active']:text-white text-xs sm:text-sm border border-gray-700 rounded-lg py-2 sm:py-2.5"
          >
            Por Setor
          </TabsTrigger>
        </TabsList>

        <TabsContent value="holerites" className="mt-6 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-300">
              <Loader2 className="w-8 h-8 animate-spin mb-3" />
              <p>Carregando seus holerites...</p>
            </div>
          ) : holerites.length === 0 ? (
            <Card className="bg-seguranca-graphite border-gray-700">
              <CardContent className="py-10 flex flex-col items-center gap-3 text-gray-300">
                <FileText className="w-10 h-10" />
                <p>Nenhum holerite encontrado.</p>
                <span className="text-sm text-gray-500">
                  Assim que novos holerites forem disponibilizados, eles aparecerão aqui.
                </span>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {holeriteYears.map((year) => {
                const months = Object.keys(holeritesGrouped[year])
                  .map((month) => Number(month))
                  .sort((a, b) => b - a);

                return (
                  <div key={year} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-2xl font-semibold text-gray-200">{year}</h2>
                      <Badge className="bg-indigo-500/20 text-indigo-200 border-indigo-500/40">
                        {months.length} mês{months.length > 1 ? 'es' : ''}
                      </Badge>
                    </div>

                    <Separator className="bg-gray-700" />

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {months.map((month) => {
                        const items = holeritesGrouped[year][month];

                        return (
                          <Card
                            key={`${year}-${month}`}
                            className="bg-seguranca-graphite border-gray-700 hover:border-gray-500 transition-colors"
                          >
                            <CardHeader>
                              <CardTitle className="flex items-center justify-between text-gray-100">
                                <span className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4 text-indigo-400" />
                                  {monthNames[month] ?? `Mês ${month}`}
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
                                    <p className="font-medium text-gray-100">{item.employeeName}</p>
                                    <p className="text-xs text-gray-400">CPF: {item.cpf}</p>
                                    <p className="text-xs text-gray-500 truncate">{item.fileName}</p>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="border-gray-600 text-gray-100 hover:bg-gray-800 w-full sm:w-auto text-xs sm:text-sm"
                                      onClick={() => handleViewHolerite(item.fileName)}
                                    >
                                      <Eye className="w-4 h-4 mr-1" />
                                      Visualizar
                                    </Button>
                                    <Button
                                      size="sm"
                                      className="bg-indigo-600 hover:bg-indigo-700 text-white w-full sm:w-auto text-xs sm:text-sm"
                                      onClick={() => handleDownloadHolerite(item.fileName)}
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
        </TabsContent>

        <TabsContent value="receipts" className="mt-6 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-300">
              <Loader2 className="w-8 h-8 animate-spin mb-3" />
              <p>Carregando seus comprovantes...</p>
            </div>
          ) : receipts.length === 0 ? (
            <Card className="bg-seguranca-graphite border-gray-700">
              <CardContent className="py-10 flex flex-col items-center gap-3 text-gray-300">
                <FileText className="w-10 h-10" />
                <p>Nenhum comprovante encontrado.</p>
                <span className="text-sm text-gray-500">
                  Assim que novos comprovantes forem disponibilizados, eles aparecerão aqui.
                </span>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-10">
              {receiptYears.map((year) => {
                const months = Object.keys(receiptsGrouped[year])
                  .map((month) => Number(month))
                  .sort((a, b) => b - a);

                return (
                  <div key={year} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-2xl font-semibold text-gray-200">{year}</h2>
                      <Badge className="bg-blue-500/20 text-blue-200 border-blue-500/40">
                        {months.length} mês{months.length > 1 ? 'es' : ''}
                      </Badge>
                    </div>

                    <Separator className="bg-gray-700" />

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {months.map((month) => {
                        const items = receiptsGrouped[year][month];

                        return (
                          <Card
                            key={`${year}-${month}`}
                            className="bg-seguranca-graphite border-gray-700 hover:border-gray-500 transition-colors"
                          >
                            <CardHeader>
                              <CardTitle className="flex items-center justify-between text-gray-100">
                                <span className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4 text-blue-400" />
                                  {monthNames[month] ?? `Mês ${month}`}
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
                                    <p className="font-medium text-gray-100">
                                      {item.employeeName || (item as any)?.creditedName}
                                    </p>
                                    {((item as any)?.cpf || (item as any)?.creditedDocument) && (
                                      <p className="text-xs text-gray-400">
                                        CPF: {(item as any)?.cpf || (item as any)?.creditedDocument}
                                      </p>
                                    )}
                                    <p className="text-xs text-gray-500 truncate">{item.fileName}</p>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="border-gray-600 text-gray-100 hover:bg-gray-800 w-full sm:w-auto text-xs sm:text-sm"
                                      onClick={() => handleViewReceipt(item)}
                                    >
                                      <Eye className="w-4 h-4 mr-1" />
                                      Visualizar
                                    </Button>
                                    <Button
                                      size="sm"
                                      className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto text-xs sm:text-sm"
                                      onClick={() => handleDownloadReceipt(item)}
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
        </TabsContent>

        <TabsContent value="unificacao" className="mt-6 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-300">
              <Loader2 className="w-8 h-8 animate-spin mb-3" />
              <p>Carregando seus documentos unificados...</p>
            </div>
          ) : unifiedDocuments.length === 0 ? (
            <Card className="bg-seguranca-graphite border-gray-700">
              <CardContent className="py-10 flex flex-col items-center gap-3 text-gray-300">
                <Folder className="w-10 h-10" />
                <p>Nenhum documento unificado encontrado.</p>
                <span className="text-sm text-gray-500">
                  Quando seus documentos forem unificados, eles aparecerão aqui.
                </span>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {Object.keys(unifiedByYear)
                .map((year) => Number(year))
                .sort((a, b) => b - a)
                .map((year) => (
                  <div key={year} className="space-y-3">
                    <h3 className="text-xl font-semibold text-gray-100 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-purple-400" />
                      {year}
                    </h3>
                    <div className="grid gap-3 md:grid-cols-2">
                      {unifiedByYear[year]
                        .sort((a, b) => (b.month ?? 0) - (a.month ?? 0))
                        .map((doc, index) => (
                          <Card key={`${doc.fileName}-${index}`} className="bg-seguranca-graphite border-gray-700">
                            <CardContent className="p-4 space-y-3">
                              <div>
                                <p className="text-sm text-gray-400">Documento</p>
                                <p className="text-base font-medium text-gray-100 truncate">{doc.fileName}</p>
                              </div>
                              <div className="grid grid-cols-2 gap-3 text-sm text-gray-400">
                                <div>
                                  <p className="text-xs uppercase text-gray-500">Funcionário</p>
                                  <p className="text-gray-200">{doc.employeeName}</p>
                                </div>
                                <div>
                                  <p className="text-xs uppercase text-gray-500">Período</p>
                                  <p className="text-gray-200">
                                    {doc.month ? `${monthNames[doc.month]} / ${year}` : year}
                                  </p>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-gray-600 text-gray-100 hover:bg-gray-800 w-full sm:w-auto text-xs sm:text-sm"
                                  onClick={() => handleViewUnified(doc)}
                                >
                                  <Eye className="w-4 h-4 mr-1" />
                                  Visualizar
                                </Button>
                                <Button
                                  size="sm"
                                  className="bg-purple-600 hover:bg-purple-700 text-white w-full sm:w-auto text-xs sm:text-sm"
                                  onClick={() => handleDownloadUnified(doc)}
                                >
                                  <Download className="w-4 h-4 mr-1" />
                                  Baixar
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="setores" className="mt-6 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-300">
              <Loader2 className="w-8 h-8 animate-spin mb-3" />
              <p>Carregando seus documentos organizados por setor...</p>
            </div>
          ) : sectorGroups.length === 0 ? (
            <Card className="bg-seguranca-graphite border-gray-700">
              <CardContent className="py-10 flex flex-col items-center gap-3 text-gray-300">
                <Building2 className="w-10 h-10" />
                <p>Nenhum documento encontrado para seus setores.</p>
                <span className="text-sm text-gray-500 text-center">
                  Quando houver documentos organizados por setor para você, eles aparecerão aqui.
                </span>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {sectorGroups.map((sector) => (
                <Card key={sector.name} className="bg-seguranca-graphite border-gray-700">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-seguranca-black flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-seguranca-yellow" />
                      </div>
                      <div>
                        <CardTitle className="text-gray-100 text-xl">{sector.name}</CardTitle>
                        <p className="text-sm text-gray-400">
                          {sector.documentCount} documento{sector.documentCount > 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {sector.documents
                      .sort((a, b) => {
                        if (a.year === b.year) {
                          return b.month - a.month;
                        }
                        return b.year - a.year;
                      })
                      .map((doc) => (
                        <div
                          key={`${doc.sector}-${doc.period}-${doc.fileName}`}
                          className="border border-gray-700 rounded-lg p-4 bg-seguranca-black/40 space-y-3"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-sm text-gray-400">Período</p>
                              <p className="text-base font-medium text-gray-100">
                                {monthNames[doc.month] ?? doc.month}/{doc.year}
                              </p>
                            </div>
                            <Badge className="bg-gray-800 text-gray-200 border-gray-600">
                              {doc.employeeName}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500 truncate">{doc.fileName}</p>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-gray-600 text-gray-100 hover:bg-gray-800 w-full sm:w-auto text-xs sm:text-sm"
                              onClick={() => handleDownloadSectorDocument(doc)}
                            >
                              <FileDown className="w-4 h-4 mr-1" />
                              Baixar PDF
                            </Button>
                            {doc.filePath && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-gray-400 hover:text-gray-200 w-full sm:w-auto text-xs sm:text-sm"
                                onClick={() => window.open(buildDownloadUrl(doc.filePath), '_blank', 'noopener,noreferrer')}
                              >
                                Abrir caminho
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </StandardLayout>
  );
};

export default CollaboratorHolerites;

