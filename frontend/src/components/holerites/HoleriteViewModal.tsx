import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, Mail, Download, Calendar, User, MessageSquare, X, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { payslipService } from '@/services/payslipService';

interface Payslip {
  id: number;
  employeeName: string;
  cpf: string;
  month: string;
  year: string;
  fileName: string;
  processedAt: string;
}

interface HoleriteViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payslip: Payslip | null;
  onDownload: () => void;
  onSendEmail: () => void;
  onSendWhatsApp?: () => void;
}

export const HoleriteViewModal: React.FC<HoleriteViewModalProps> = ({
  open,
  onOpenChange,
  payslip,
  onDownload,
  onSendEmail,
  onSendWhatsApp
}) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('🔍 HoleriteViewModal - useEffect triggered:', { open, payslip: payslip?.fileName });
    if (open && payslip) {
      loadPdf();
    }
  }, [open, payslip]);

  const loadPdf = async () => {
    if (!payslip) return;
    
    console.log('🔍 HoleriteViewModal - Iniciando carregamento do PDF:', payslip.fileName);
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('📥 HoleriteViewModal - Chamando payslipService.downloadPayslip...');
      const blob = await payslipService.downloadPayslip(payslip.fileName);
      console.log('✅ HoleriteViewModal - PDF baixado com sucesso, tamanho:', blob.size, 'bytes');
      
      const url = window.URL.createObjectURL(blob);
      console.log('🔗 HoleriteViewModal - URL criada:', url);
      setPdfUrl(url);
    } catch (err) {
      console.error('❌ HoleriteViewModal - Erro ao carregar PDF:', err);
      setError('Erro ao carregar o PDF do holerite. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (pdfUrl) {
      window.URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
    setZoom(1);
    setRotation(0);
    setError(null);
    onOpenChange(false);
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.5));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
  };

  if (!payslip) return null;

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(new Date(dateString));
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-[90vw] h-[95vh] max-h-[95vh] overflow-hidden p-0 bg-seguranca-graphite border-gray-600 mx-4 sm:mx-auto">
        <DialogHeader className="p-6 pb-4 border-b border-gray-600">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-seguranca-lightgray flex items-center gap-3 text-lg sm:text-xl">
              <FileText className="text-seguranca-yellow flex-shrink-0" size={24} />
              <div className="flex flex-col">
                <span className="break-words">Visualização do Holerite</span>
                <div className="text-sm text-gray-400 font-normal">
                  {payslip.employeeName} - {payslip.month}/{payslip.year}
                </div>
              </div>
            </DialogTitle>
            
            {/* Controles de visualização */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => pdfUrl && window.open(pdfUrl, '_blank')}
                disabled={!pdfUrl}
                className="border-green-500 text-green-400 hover:bg-green-500 hover:text-white"
                title="Abrir em nova aba"
              >
                <FileText size={16} />
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={handleZoomOut}
                disabled={zoom <= 0.5}
                className="border-gray-500 text-gray-400 hover:bg-gray-600 hover:text-white"
              >
                <ZoomOut size={16} />
              </Button>
              
              <span className="text-sm text-gray-400 min-w-[60px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              
              <Button
                size="sm"
                variant="outline"
                onClick={handleZoomIn}
                disabled={zoom >= 3}
                className="border-gray-500 text-gray-400 hover:bg-gray-600 hover:text-white"
              >
                <ZoomIn size={16} />
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={handleRotate}
                className="border-gray-500 text-gray-400 hover:bg-gray-600 hover:text-white"
              >
                <RotateCw size={16} />
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={handleReset}
                className="border-gray-500 text-gray-400 hover:bg-gray-600 hover:text-white"
              >
                Reset
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex flex-col h-full">
          {/* Informações do Funcionário */}
          <div className="px-6 py-3 bg-seguranca-black border-b border-gray-600">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <User size={16} className="text-seguranca-yellow flex-shrink-0" />
                <span className="text-gray-400">Funcionário:</span>
                <span className="text-seguranca-lightgray font-medium">{payslip.employeeName}</span>
              </div>
              
              {payslip.cpf && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">CPF:</span>
                  <span className="text-seguranca-lightgray font-medium">{payslip.cpf}</span>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-seguranca-yellow flex-shrink-0" />
                <span className="text-gray-400">Período:</span>
                <span className="text-seguranca-lightgray font-medium">{payslip.month}/{payslip.year}</span>
              </div>
            </div>
          </div>

          {/* Área do PDF */}
          <div className="flex-1 bg-seguranca-black p-4 overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-seguranca-yellow mx-auto mb-4"></div>
                  <p className="text-seguranca-lightgray">Carregando PDF...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <X size={32} className="text-red-500" />
                  </div>
                  <p className="text-red-400 mb-4">{error}</p>
                  <Button onClick={loadPdf} variant="outline" className="border-red-500 text-red-400 hover:bg-red-500 hover:text-white">
                    Tentar Novamente
                  </Button>
                </div>
              </div>
            ) : pdfUrl ? (
              <div className="h-full flex items-center justify-center bg-gray-900 rounded-lg overflow-hidden">
                <iframe
                  src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                  className="w-full h-full border-0"
                  style={{
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    transformOrigin: 'center center',
                    transition: 'transform 0.2s ease-in-out'
                  }}
                />
              </div>
            ) : null}
          </div>

          {/* Botões de Ação */}
          <div className="px-6 py-4 bg-seguranca-black border-t border-gray-600">
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
              {/* Botão Fechar */}
              <Button 
                variant="outline" 
                onClick={handleClose}
                className="border-gray-500 text-gray-400 hover:bg-gray-600 hover:text-white order-1 sm:order-none"
              >
                Fechar
              </Button>
              
              {/* Botões de Ação */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 order-2 sm:order-none">
                <Button 
                  variant="outline" 
                  onClick={onSendEmail}
                  className="border-green-500 text-green-400 hover:bg-green-500 hover:text-white"
                >
                  <Mail size={16} className="mr-2" />
                  Enviar Email
                </Button>
                
                {onSendWhatsApp && (
                  <Button 
                    variant="outline" 
                    onClick={onSendWhatsApp}
                    className="border-blue-500 text-blue-400 hover:bg-blue-500 hover:text-white"
                  >
                    <MessageSquare size={16} className="mr-2" />
                    Enviar WhatsApp
                  </Button>
                )}
                
                <Button 
                  onClick={onDownload}
                  className="bg-seguranca-red hover:bg-seguranca-darkred"
                >
                  <Download size={16} className="mr-2" />
                  Download PDF
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
