import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Download,
  Loader2,
  FileSearch,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Trash2,
  RefreshCw,
  Eye,
} from 'lucide-react';
import {
  documentoGeradoService,
  type DocumentoGerado,
  StatusDocumento,
  TipoDocumentoGerado,
  getTipoDocumentoGeradoLabel,
} from '@/services/documentoGeradoService';
import { useToast } from '@/hooks/use-toast';
import { useInvalidateDocumentosGerados } from '@/hooks/queries/useDocumentosGerados';

interface SystemGeneratedDocumentsSectionProps {
  /**
   * Documentos a serem exibidos. Quando undefined, exibe estado de loading
   * controlado por `isLoading`.
   */
  documents: DocumentoGerado[] | undefined;
  isLoading: boolean;
  isError?: boolean;
  onRetry?: () => void;
  /** ID do funcionário — usado para atualizar a lista após excluir. */
  employeeId?: string;
  /**
   * Variante visual. "rh" usa o tema escuro do form do RH; "colaborador"
   * usa um tema mais leve para o dashboard.
   */
  variant?: 'rh' | 'colaborador';
  /** Título exibido no cabeçalho da seção. */
  title?: string;
  /** Texto secundário do cabeçalho. */
  subtitle?: string;
  /** Exibe botão de excluir (RH). Colaborador vê apenas download. */
  allowDelete?: boolean;
}

function getStatusBadge(status: StatusDocumento) {
  switch (status) {
    case StatusDocumento.ASSINADO:
      return (
        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 text-[10px]">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Assinado
        </Badge>
      );
    case StatusDocumento.PENDENTE:
      return (
        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/40 text-[10px]">
          <Clock className="h-3 w-3 mr-1" />
          Pendente Assinatura
        </Badge>
      );
    case StatusDocumento.CANCELADO:
      return (
        <Badge className="bg-red-500/20 text-red-400 border-red-500/40 text-[10px]">
          <XCircle className="h-3 w-3 mr-1" />
          Cancelado
        </Badge>
      );
    case StatusDocumento.VENCIDO:
      return (
        <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/40 text-[10px]">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Vencido
        </Badge>
      );
    default:
      return null;
  }
}

function getTipoLabel(doc: DocumentoGerado): string {
  if (doc.tipo) {
    return getTipoDocumentoGeradoLabel(doc.tipo);
  }
  if (doc.modeloId) return 'Documento (Modelo Dinâmico)';
  return getTipoDocumentoGeradoLabel(TipoDocumentoGerado.OTHER);
}

export const SystemGeneratedDocumentsSection: React.FC<
  SystemGeneratedDocumentsSectionProps
> = ({
  documents,
  isLoading,
  isError,
  onRetry,
  employeeId,
  variant = 'rh',
  title = 'Documentos Gerados pelo Sistema',
  subtitle = 'Contratos, termos, ordens de serviço e demais documentos gerados pelo RH.',
  allowDelete = true,
}) => {
  const { toast } = useToast();
  const invalidateDocumentos = useInvalidateDocumentosGerados();
  const [viewingId, setViewingId] = React.useState<string | null>(null);

  const handleView = async (doc: DocumentoGerado) => {
    try {
      setViewingId(doc.id);
      const blob = await documentoGeradoService.downloadArquivo(doc.id);
      const fileBlob = new Blob([blob], { type: 'application/pdf' });
      const url = globalThis.URL.createObjectURL(fileBlob);
      const newWin = globalThis.window.open(url, '_blank');
      if (!newWin) {
        toast({
          title: 'Aviso',
          description: 'O navegador bloqueou a abertura em nova aba. Verifique os pop-ups.',
          variant: 'destructive',
        });
      }
      setTimeout(() => globalThis.URL.revokeObjectURL(url), 60000);
    } catch (error) {
      console.error('Erro ao visualizar documento:', error);
      toast({
        title: 'Erro ao visualizar',
        description: 'Não foi possível visualizar o documento.',
        variant: 'destructive',
      });
    } finally {
      setViewingId(null);
    }
  };

  const handleDownload = async (doc: DocumentoGerado) => {
    try {
      setDownloadingId(doc.id);
      const blob = await documentoGeradoService.downloadArquivo(doc.id);
      const url = globalThis.URL.createObjectURL(blob);
      const link = globalThis.document.createElement('a');
      link.href = url;
      link.download = doc.nomeArquivoGerado || `documento-${doc.id}.pdf`;
      globalThis.document.body.appendChild(link);
      link.click();
      link.remove();
      globalThis.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao baixar documento:', error);
      toast({
        title: 'Erro ao baixar',
        description: 'Não foi possível baixar o documento. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (doc: DocumentoGerado) => {
    const label = getTipoLabel(doc);
    if (
      !globalThis.confirm(
        `Excluir permanentemente o documento "${label}"?\n\nEsta ação não pode ser desfeita.`,
      )
    ) {
      return;
    }

    try {
      setDeletingId(doc.id);
      await documentoGeradoService.excluirDocumento(doc.id);
      toast({
        title: 'Documento excluído',
        description: 'O arquivo foi removido da lista.',
      });
      invalidateDocumentos(employeeId ?? doc.funcionarioId);
    } catch (error) {
      console.error('Erro ao excluir documento:', error);
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir o documento.',
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const isRh = variant === 'rh';
  const headerColor = isRh ? 'text-gray-400' : 'text-gray-700';
  const cardBg = isRh ? 'bg-seguranca-black border-gray-700' : 'bg-white border-gray-200';
  const titleColor = isRh ? 'text-white' : 'text-gray-900';
  const subTextColor = isRh ? 'text-gray-500' : 'text-gray-600';
  const emptyBg = isRh
    ? 'bg-seguranca-black/20 border-gray-700'
    : 'bg-gray-50 border-gray-200';

  const docCount = documents?.length ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4
            className={`text-sm font-semibold uppercase tracking-wider ${headerColor}`}
          >
            {title}
          </h4>
          <p className={`text-xs mt-1 ${subTextColor}`}>{subtitle}</p>
        </div>
        {onRetry && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={isRh ? 'border-gray-600 text-gray-300' : ''}
            onClick={onRetry}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar lista
          </Button>
        )}
      </div>

      {isLoading && (
        <div
          className={`flex flex-col items-center justify-center py-12 rounded-xl border border-dashed ${emptyBg}`}
        >
          <Loader2
            className={`h-7 w-7 animate-spin mb-3 ${
              isRh ? 'text-seguranca-yellow' : 'text-seguranca-red'
            }`}
          />
          <p className={`text-sm ${subTextColor}`}>Carregando documentos...</p>
        </div>
      )}

      {!isLoading && isError && (
        <div
          className={`flex flex-col items-center justify-center py-10 rounded-xl border border-dashed text-center px-6 ${emptyBg}`}
        >
          <AlertTriangle className="h-8 w-8 text-amber-500 mb-3" />
          <h5 className={`text-sm font-medium mb-1 ${titleColor}`}>
            Não foi possível carregar a lista
          </h5>
          <p className={`text-xs max-w-sm mb-4 ${subTextColor}`}>
            Verifique a conexão ou tente atualizar. Os documentos gerados continuam
            salvos no servidor.
          </p>
          {onRetry && (
            <Button type="button" size="sm" variant="outline" onClick={onRetry}>
              <RefreshCw className="h-4 w-4 mr-1.5" />
              Tentar novamente
            </Button>
          )}
        </div>
      )}

      {!isLoading && !isError && (!documents || documents.length === 0) && (
        <div
          className={`flex flex-col items-center justify-center py-12 rounded-xl border border-dashed text-center px-6 ${emptyBg}`}
        >
          <div
            className={`p-4 rounded-full mb-3 ${
              isRh ? 'bg-gray-800/50' : 'bg-gray-100'
            }`}
          >
            <FileSearch className={`h-8 w-8 ${subTextColor}`} />
          </div>
          <h5 className={`text-sm font-medium mb-1 ${titleColor}`}>
            Nenhum documento gerado ainda
          </h5>
          <p className={`text-xs max-w-xs ${subTextColor}`}>
            Quando o RH gerar contratos, termos ou relatórios na aba Relatórios,
            eles aparecerão aqui com opções de baixar e excluir.
          </p>
        </div>
      )}

      {!isLoading && !isError && documents && documents.length > 0 && (
        <div className="space-y-3">
          <p className={`text-xs ${subTextColor}`}>
            {docCount} documento(s) disponível(is) para download
          </p>
          <div className="grid grid-cols-1 gap-3">
            {documents.map((doc) => (
              <Card
                key={doc.id}
                className={`hover:border-gray-500 transition-all group overflow-hidden ${cardBg}`}
              >
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`p-2 rounded-lg flex-shrink-0 ${
                          isRh
                            ? 'bg-seguranca-red/10 group-hover:bg-seguranca-red/20'
                            : 'bg-seguranca-red/10'
                        } transition-colors`}
                      >
                        <FileText className="h-5 w-5 text-seguranca-red" />
                      </div>
                      <div className="min-w-0">
                        <h5
                          className={`text-sm font-bold truncate ${titleColor}`}
                          title={getTipoLabel(doc)}
                        >
                          {getTipoLabel(doc)}
                        </h5>
                        <p
                          className={`text-xs truncate ${subTextColor}`}
                          title={doc.nomeArquivoGerado}
                        >
                          {doc.nomeArquivoGerado || 'documento.pdf'}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(doc.status)}
                  </div>

                  <div
                    className={`flex items-center justify-between pt-2 border-t ${
                      isRh ? 'border-gray-700' : 'border-gray-100'
                    }`}
                  >
                    <span className={`text-[10px] ${subTextColor}`}>
                      Gerado em{' '}
                      {new Date(doc.dataCriacao).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-8 gap-1.5 ${
                          isRh
                            ? 'text-blue-400 hover:text-blue-300 hover:bg-gray-700'
                            : 'text-blue-600 hover:text-blue-900 hover:bg-gray-100'
                        }`}
                        onClick={() => handleView(doc)}
                        disabled={viewingId === doc.id || downloadingId === doc.id || deletingId === doc.id}
                        title="Visualizar"
                      >
                        {viewingId === doc.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                        Visualizar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-8 gap-1.5 ${
                          isRh
                            ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }`}
                        onClick={() => handleDownload(doc)}
                        disabled={downloadingId === doc.id || deletingId === doc.id || viewingId === doc.id}
                        title="Baixar"
                      >
                        {downloadingId === doc.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                        Baixar
                      </Button>
                      {allowDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                          onClick={() => handleDelete(doc)}
                          disabled={deletingId === doc.id || downloadingId === doc.id}
                          title="Excluir"
                        >
                          {deletingId === doc.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
