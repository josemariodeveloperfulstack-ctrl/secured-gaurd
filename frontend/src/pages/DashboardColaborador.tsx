import React, { useState, useEffect } from 'react';
import { StandardLayout } from '@/components/StandardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  MessageSquare,
  User,
  Calendar,
  File,
  CheckCircle,
  Clock,
  Eye,
  Mail,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { payslipService } from '@/services/payslipService';
import { receiptService } from '@/services/receiptService';
import { unifiedDocumentService } from '@/services/unifiedDocumentService';
import { useNavigate } from 'react-router-dom';
import { DocumentPreviewModal } from '@/components/DocumentPreviewModal';
import holeriteService from '@/services/holeriteService';
import api from '@/lib/axios';
import { useMeusDocumentos } from '@/hooks/queries/useDocumentosGerados';
import { SystemGeneratedDocumentsSection } from '@/components/funcionarios/SystemGeneratedDocumentsSection';

interface Payslip {
  id: string; // Mantendo string por compatibilidade com o estado local, mas o serviço suporta number
  employeeName: string;
  cpf: string;
  month: number;
  year: number;
  fileName: string;
  filePath?: string;
  createdAt: string;
}

const DashboardColaborador: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [payslips, setPayslips] = useState<Payslip[]>([]);
  // Reservado para futuras integrações (comprovantes / docs unificados)
  const [loading, setLoading] = useState(true);

  // Documentos gerados pelo RH para este colaborador (Contrato, Termos, OS,
  // NPPS, EPI, Advertências, etc.).
  const {
    data: meusDocumentos,
    isLoading: isLoadingMeusDocumentos,
  } = useMeusDocumentos();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const payslipsData = await payslipService.getAllPayslips();
      setPayslips(payslipsData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar seus documentos',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Preview State
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<any>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [previewLoading, setPreviewLoading] = useState(false);

  const handleOpenPreview = async (item: any, type: 'holerite' | 'receipt' | 'unified') => {
    try {
      setPreviewLoading(true);
      setPreviewDoc({ ...item, docType: type });
      setPreviewOpen(true);

      let blob: Blob;
      if (type === 'holerite') {
        // Usar downloadByID se disponível para maior precisão
        blob = await holeriteService.downloadHoleriteById(item.id);
      } else if (type === 'receipt') {
        blob = await receiptService.downloadReceiptBlob(item.id);
      } else {
        blob = await unifiedDocumentService.downloadUnifiedDocumentBlob(item.fileName || item.unifiedFileName);
      }

      const url = globalThis.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      setPreviewUrl(url);
    } catch (err: any) {
      console.error('Erro ao visualizar documento', err);
      toast({
        title: 'Erro ao visualizar',
        description: 'Não foi possível carregar a pré-visualização.',
        variant: 'destructive',
      });
      setPreviewOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleClosePreview = () => {
    if (previewUrl) {
      globalThis.URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl('');
    setPreviewOpen(false);
    setPreviewDoc(null);
  };

  const handleDownloadFile = async (item: any, type: 'holerite' | 'receipt' | 'unified') => {
    try {
      let blob: Blob;
      if (type === 'holerite') {
        blob = await holeriteService.downloadHoleriteById(item.id);
      } else if (type === 'receipt') {
        blob = await receiptService.downloadReceiptBlob(item.id);
      } else {
        blob = await unifiedDocumentService.downloadUnifiedDocumentBlob(item.fileName || item.unifiedFileName);
      }

      const url = globalThis.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', item.fileName || item.unifiedFileName || `documento_${item.id}.pdf`);
      link.setAttribute('target', '_blank');

      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        link.remove();
        globalThis.URL.revokeObjectURL(url);
      }, 100);

      toast({
        title: 'Sucesso',
        description: 'Documento baixado com sucesso!',
      });
    } catch (err: any) {
      console.error('Erro ao baixar documento', err);
      toast({
        title: 'Erro ao baixar',
        description: 'Não foi possível baixar o arquivo.',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <StandardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-seguranca-yellow mx-auto mb-4"></div>
            <p className="text-seguranca-lightgray">Carregando seus dados...</p>
          </div>
        </div>
      </StandardLayout>
    );
  }

  return (
    <StandardLayout>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8 pb-24 md:pb-8">
        {/* Cabeçalho Minimalista */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-seguranca-yellow rounded-full flex items-center justify-center text-seguranca-black text-2xl font-bold border-4 border-seguranca-graphite shadow-lg">
              {user?.name?.charAt(0)}
            </div>
            <div>
              <h1 className="text-xl font-bold text-seguranca-lightgray leading-tight">Olá, {user?.name?.split(' ')[0]}</h1>
              <p className="text-sm text-gray-500">Unidade: {user?.unidadeName || 'Geral'}</p>
            </div>
          </div>
          <div
            role="button"
            tabIndex={0}
            className="relative cursor-pointer bg-transparent border-0 p-0 inline-flex"
            onClick={() => navigate('/mensagens')}
            onKeyDown={(e) => e.key === 'Enter' && navigate('/mensagens')}
          >
            <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 bg-seguranca-red flex items-center justify-center border-2 border-seguranca-black">
              2
            </Badge>
            <Button size="icon" variant="ghost" className="rounded-full bg-seguranca-black/40 border border-gray-800 text-gray-400">
              <Mail className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Quick Action Grid - Brutalist Theme */}
        <div className="grid grid-cols-2 gap-4">
          <Button
            className="h-28 flex flex-col items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white border-2 border-white/10 rounded-3xl shadow-lg transition-transform active:scale-95"
            onClick={() => navigate('/meu-ponto')}
          >
            <Clock className="w-8 h-8" />
            <span className="font-bold text-lg">PONTO</span>
          </Button>
          <Button
            className="h-28 flex flex-col items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white border-2 border-white/10 rounded-3xl shadow-lg transition-transform active:scale-95"
            onClick={() => navigate('/meus-holerites')}
          >
            <FileText className="w-8 h-8" />
            <span className="font-bold text-lg">DOCS</span>
          </Button>
          <Button
            variant="outline"
            className="h-20 flex flex-col items-center justify-center gap-1 bg-seguranca-black/40 border-gray-800 text-gray-400 rounded-2xl transition-transform active:scale-95"
            onClick={() => navigate('/minhas-ferias')}
          >
            <Calendar className="w-5 h-5 text-indigo-400" />
            <span className="text-xs font-semibold">FÉRIAS</span>
          </Button>
          <Button
            variant="outline"
            className="h-20 flex flex-col items-center justify-center gap-1 bg-seguranca-black/40 border-gray-800 text-gray-400 rounded-2xl transition-transform active:scale-95"
            onClick={() => navigate('/meus-plantoes')}
          >
            <CheckCircle className="w-5 h-5 text-amber-400" />
            <span className="text-xs font-semibold">PLANTÕES</span>
          </Button>
          <Button
            variant="outline"
            className="h-20 flex flex-col items-center justify-center gap-1 bg-seguranca-black/40 border-gray-800 text-gray-400 rounded-2xl transition-transform active:scale-95"
            onClick={async () => {
              try {
                const response = await api.post('/api/npps/generate-pdf', {}, { responseType: 'blob' });
                const blob = new Blob([response.data], { type: 'application/pdf' });
                const url = globalThis.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute(
                  'download',
                  'NPPS-Norma-e-Procedimento-do-Posto-de-Servico.pdf',
                );
                document.body.appendChild(link);
                link.click();
                setTimeout(() => {
                  link.remove();
                  globalThis.URL.revokeObjectURL(url);
                }, 100);
                toast({
                  title: 'NPPS baixado',
                  description: 'Manual de normas do posto gerado com sucesso.',
                });
              } catch (err) {
                console.error('Erro ao gerar NPPS para colaborador:', err);
                toast({
                  title: 'Erro ao gerar NPPS',
                  description: 'Não foi possível gerar o documento. Tente novamente mais tarde.',
                  variant: 'destructive',
                });
              }
            }}
          >
            <FileText className="w-5 h-5 text-seguranca-yellow" />
            <span className="text-xs font-semibold">NPPS</span>
          </Button>
        </div>

        {/* Action Stream - Section Title */}
        <div className="space-y-4">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-600 pl-1">Próximas Ações</h2>

          <div className="space-y-4">
            {/* Action Card: LGPD - pendente ou já assinado */}
            <Card className={user?.lgpdAccepted
              ? 'bg-emerald-500/10 border-emerald-500/30 rounded-3xl overflow-hidden group'
              : 'bg-seguranca-red/10 border-seguranca-red/30 rounded-3xl overflow-hidden group'
            }>
              <CardContent className="p-5 flex items-start gap-4">
                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 ${user?.lgpdAccepted ? 'bg-emerald-500' : 'bg-seguranca-red'}`}>
                  <User className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      {user?.lgpdAccepted ? 'Termos LGPD' : 'LGPD Obrigatória'}
                    </h3>
                    <p className="text-sm text-gray-400">
                      {user?.lgpdAccepted
                        ? 'Você já assinou os termos de privacidade.'
                        : 'Temos novos termos de privacidade para você assinar.'}
                    </p>
                  </div>
                  {user?.lgpdAccepted ? (
                    <Button
                      className="w-full bg-emerald-600 text-white font-bold rounded-2xl cursor-default"
                      disabled
                    >
                      Assinado
                    </Button>
                  ) : (
                    <Button
                      className="w-full bg-white text-seguranca-red hover:bg-gray-100 font-bold rounded-2xl"
                      onClick={() => navigate('/lgpd-consent')}
                    >
                      Assinar Termos AGORA
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Action Card: Documents */}
            <Card className="bg-seguranca-black/60 border-gray-800 rounded-3xl border-l-4 border-l-blue-500 overflow-hidden">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-blue-400" />
                    <h3 className="font-bold text-gray-200">Holerite mais recente</h3>
                  </div>
                  <Badge variant="outline" className="text-[10px] border-gray-700">Out/25</Badge>
                </div>
                {payslips.length > 0 ? (
                  <div className="flex items-center justify-between bg-white/5 p-3 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                        <File className="w-5 h-5 text-blue-400" />
                      </div>
                      <div className="text-sm">
                        <p className="font-medium text-gray-100">Holerite Mensal</p>
                        <p className="text-xs text-gray-500">{payslips[0].fileName}</p>
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-white hover:bg-white/10"
                      onClick={() => handleOpenPreview(payslips[0], 'holerite')}
                    >
                      <Eye className="w-5 h-5" />
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 text-center py-2 italic font-medium">Nenhum documento novo liberado hoje.</p>
                )}
              </CardContent>
            </Card>

            {/* Action Card: Meus Documentos do RH (gerados pelo sistema) */}
            <Card className="bg-seguranca-black/60 border-gray-800 rounded-3xl border-l-4 border-l-seguranca-red overflow-hidden">
              <CardContent className="p-5">
                <SystemGeneratedDocumentsSection
                  documents={meusDocumentos}
                  isLoading={isLoadingMeusDocumentos}
                  variant="colaborador"
                  allowDelete={false}
                  title="Meus Documentos do RH"
                  subtitle="Contratos, termos, OS, advertências e demais documentos disponibilizados pelo RH."
                />
              </CardContent>
            </Card>

            {/* Action Card: Messages (Simplified) */}
            <Card className="bg-seguranca-black/40 border-gray-800 rounded-3xl border-l-4 border-l-seguranca-yellow overflow-hidden">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-5 h-5 text-seguranca-yellow" />
                    <h3 className="font-bold text-gray-200">Mensagens Internas</h3>
                  </div>
                  <Button variant="link" className="text-xs text-seguranca-yellow p-0 h-auto" onClick={() => navigate('/mensagens')}>Ver todas</Button>
                </div>
                <div className="space-y-2">
                  <button
                    type="button"
                    className="w-full text-left p-3 bg-white/5 rounded-2xl flex items-center gap-3 border border-transparent hover:border-gray-700 transition-colors cursor-pointer"
                    onClick={() => navigate('/mensagens')}
                  >
                    <div className="w-2 h-2 rounded-full bg-seguranca-yellow shrink-0" />
                    <p className="text-sm text-gray-300 truncate font-medium">Lembrete: Entrega de EPI amanhã na sede...</p>
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Modal de Pré-visualização */}
      <DocumentPreviewModal
        isOpen={previewOpen}
        onClose={handleClosePreview}
        title={previewDoc?.docType === 'holerite' ? 'Holerite' : 'Comprovante'}
        fileName={previewDoc?.fileName || ''}
        fileUrl={previewUrl}
        onDownload={() => handleDownloadFile(previewDoc, previewDoc?.docType)}
        loading={previewLoading}
      />
    </StandardLayout>
  );
};

export default DashboardColaborador;

