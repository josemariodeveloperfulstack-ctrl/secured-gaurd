import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Eye, User, Calendar, FileText, DollarSign, AlertCircle, Loader2 } from 'lucide-react';
import type { PaymentReceipt } from '@/services/paymentReceiptService';
import paymentReceiptService from '@/services/paymentReceiptService';
import { toast } from 'sonner';

interface PaymentReceiptViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receipt: PaymentReceipt | null;
  onDownload: (receiptId: string, fileName: string) => void;
}

export function PaymentReceiptViewModal({
  open,
  onOpenChange,
  receipt,
  onDownload,
}: PaymentReceiptViewModalProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && receipt) {
      loadPdf();
    } else {
      setPdfUrl(null);
      setError(null);
    }
  }, [open, receipt]);

  const loadPdf = async () => {
    if (!receipt) return;

    setLoading(true);
    setError(null);

    try {
      const pdfBlob = await paymentReceiptService.getPaymentReceiptPdf(receipt.id);
      const url = URL.createObjectURL(pdfBlob);
      setPdfUrl(url);
    } catch (err) {
      console.error('Erro ao carregar PDF:', err);
      setError('Erro ao carregar o PDF do comprovante');
      toast.error('Erro ao carregar o PDF do comprovante');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (receipt) {
      onDownload(receipt.id, receipt.fileName);
    }
  };

  const formatCurrency = (value?: number) => {
    if (!value) return 'N/A';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PROCESSED':
        return 'bg-green-500/20 text-green-400 border-green-500/40';
      case 'PENDING':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40';
      case 'ERROR':
        return 'bg-red-500/20 text-red-400 border-red-500/40';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/40';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PROCESSED':
        return 'Processado';
      case 'PENDING':
        return 'Pendente';
      case 'ERROR':
        return 'Erro';
      default:
        return 'Desconhecido';
    }
  };

  if (!receipt) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] bg-gradient-to-br from-seguranca-graphite via-seguranca-black to-seguranca-graphite border border-gray-600/50 rounded-2xl p-0 overflow-hidden">
        <DialogHeader className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-b border-blue-500/20 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Eye size={24} className="text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-white leading-tight">
                  Visualização do Comprovante
                </DialogTitle>
                <p className="text-blue-300/90 text-sm font-medium mt-0">
                  {receipt.employeeName}
                </p>
              </div>
            </div>
            <Badge className={`px-4 py-2 text-sm font-semibold rounded-xl border ${getStatusColor(receipt.status)}`}>
              {getStatusText(receipt.status)}
            </Badge>
          </div>
        </DialogHeader>

        <div className="flex flex-col lg:flex-row h-full">
          {/* Informações do Comprovante */}
          <div className="lg:w-1/3 p-6 border-r border-gray-600/30 bg-seguranca-black/30">
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white mb-4">Informações do Comprovante</h3>
              
              {/* Nome do Funcionário */}
              <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <User size={18} className="text-white" />
                  </div>
                  <div>
                    <p className="text-blue-300/80 text-sm font-medium">Funcionário</p>
                    <p className="text-white font-semibold">{receipt.employeeName}</p>
                  </div>
                </div>
              </div>

              {/* Valor */}
              <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                    <DollarSign size={18} className="text-white" />
                  </div>
                  <div>
                    <p className="text-green-300/80 text-sm font-medium">Valor</p>
                    <p className="text-white font-semibold text-lg">{formatCurrency(receipt.netSalary || receipt.grossSalary)}</p>
                  </div>
                </div>
              </div>

              {/* Data de Processamento */}
              <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-xl p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center">
                    <Calendar size={18} className="text-white" />
                  </div>
                  <div>
                    <p className="text-yellow-300/80 text-sm font-medium">Processado em</p>
                    <p className="text-white font-semibold">{receipt.processedAt ? formatDate(receipt.processedAt) : 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Arquivo */}
              <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                    <FileText size={18} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-purple-300/80 text-sm font-medium">Arquivo</p>
                    <p className="text-white font-semibold truncate">{receipt.fileName}</p>
                  </div>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="space-y-3 pt-4">
                <Button
                  onClick={handleDownload}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-green-500/25 transition-all duration-300"
                >
                  <Download size={18} className="mr-2" />
                  Baixar Comprovante
                </Button>
              </div>
            </div>
          </div>

          {/* Área do PDF */}
          <div className="lg:w-2/3 p-6 bg-gradient-to-br from-gray-900/50 to-gray-800/50">
            <div className="h-full rounded-xl overflow-hidden border border-gray-600/30 bg-white">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
                    <p className="text-gray-600 font-medium">Carregando PDF...</p>
                    <p className="text-gray-500 text-sm">Aguarde um momento</p>
                  </div>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <p className="text-gray-600 font-medium mb-2">Erro ao carregar PDF</p>
                    <p className="text-gray-500 text-sm mb-4">{error}</p>
                    <Button
                      onClick={loadPdf}
                      variant="outline"
                      className="border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white"
                    >
                      Tentar Novamente
                    </Button>
                  </div>
                </div>
              ) : pdfUrl ? (
                <iframe
                  src={pdfUrl}
                  className="w-full h-full border-0"
                  title={`Comprovante - ${receipt.employeeName}`}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 font-medium">PDF não disponível</p>
                    <p className="text-gray-500 text-sm">O arquivo não pôde ser carregado</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
