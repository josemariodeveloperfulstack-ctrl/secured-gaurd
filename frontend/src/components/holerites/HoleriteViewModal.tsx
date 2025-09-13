import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, Mail, Download, Calendar, User, MessageSquare, X, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { payslipService } from '@/services/payslipService';

interface Payslip {
  id: string;
  employeeName: string;
  cpf: string;
  month: number;
  year: number;
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
      <DialogContent className="w-[98vw] max-w-[95vw] h-[98vh] max-h-[98vh] overflow-hidden p-0 bg-gradient-to-br from-seguranca-graphite via-gray-800 to-seguranca-black border border-gray-600/50 mx-2 sm:mx-auto shadow-2xl">
        {/* Header Moderno com Gradiente */}
        <DialogHeader className="relative p-4 sm:p-6 pb-0 bg-gradient-to-r from-seguranca-black via-seguranca-graphite to-gray-800 border-b border-gray-600/50">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4">
            <DialogTitle className="text-seguranca-lightgray flex items-center gap-3 sm:gap-4 text-lg sm:text-xl lg:text-2xl">
              <div className="relative">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-seguranca-yellow to-yellow-500 rounded-xl flex items-center justify-center shadow-lg">
                  <FileText className="text-seguranca-black" size={20} />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-seguranca-red rounded-full border-2 border-seguranca-graphite"></div>
              </div>
              <div className="flex flex-col leading-tight">
                <span className="break-words font-bold bg-gradient-to-r from-seguranca-lightgray to-white bg-clip-text text-transparent text-sm sm:text-base lg:text-lg">
                  Visualização do Holerite
                </span>
                <div className="text-xs sm:text-sm text-gray-400 font-normal flex items-center gap-2 mt-0">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-seguranca-yellow rounded-full"></div>
                  <span className="truncate">{payslip.employeeName} - {payslip.month}/{payslip.year}</span>
                </div>
              </div>
            </DialogTitle>
            
            {/* Controles de visualização modernos - Responsivos */}
            <div className="flex flex-wrap items-center gap-1 sm:gap-2 bg-seguranca-black/50 rounded-xl p-1.5 sm:p-2 border border-gray-600/30">
              <Button
                size="sm"
                variant="outline"
                onClick={() => pdfUrl && window.open(pdfUrl, '_blank')}
                disabled={!pdfUrl}
                className="border-green-500/50 text-green-400 hover:bg-green-500 hover:text-white hover:scale-105 transition-all duration-200 h-7 w-7 sm:h-8 sm:w-8 p-0"
                title="Abrir em nova aba"
              >
                <FileText size={12} className="sm:w-4 sm:h-4" />
              </Button>
              
              <div className="flex items-center gap-0.5 sm:gap-1 bg-seguranca-graphite rounded-lg px-1 sm:px-2 py-0.5 sm:py-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleZoomOut}
                  disabled={zoom <= 0.5}
                  className="h-6 w-6 sm:h-8 sm:w-8 p-0 text-gray-400 hover:text-white hover:bg-seguranca-yellow/20"
                >
                  <ZoomOut size={10} className="sm:w-3.5 sm:h-3.5" />
                </Button>
                
                <span className="text-xs text-seguranca-yellow font-mono min-w-[40px] sm:min-w-[50px] text-center bg-seguranca-black/50 px-1 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs">
                  {Math.round(zoom * 100)}%
                </span>
                
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleZoomIn}
                  disabled={zoom >= 3}
                  className="h-6 w-6 sm:h-8 sm:w-8 p-0 text-gray-400 hover:text-white hover:bg-seguranca-yellow/20"
                >
                  <ZoomIn size={10} className="sm:w-3.5 sm:h-3.5" />
                </Button>
              </div>
              
              <Button
                size="sm"
                variant="outline"
                onClick={handleRotate}
                className="border-blue-500/50 text-blue-400 hover:bg-blue-500 hover:text-white hover:scale-105 transition-all duration-200 h-7 w-7 sm:h-8 sm:w-8 p-0"
                title="Rotacionar"
              >
                <RotateCw size={12} className="sm:w-4 sm:h-4" />
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={handleReset}
                className="border-gray-500/50 text-gray-400 hover:bg-gray-600 hover:text-white hover:scale-105 transition-all duration-200 h-7 w-7 sm:h-8 sm:w-8 p-0 text-[10px] sm:text-xs"
                title="Resetar visualização"
              >
                <span className="hidden sm:inline">Reset</span>
                <span className="sm:hidden">R</span>
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex flex-col h-full">
          {/* Informações do Funcionário - Design Moderno e Responsivo */}
          <div className="px-4 sm:px-6 pt-2 sm:pt-4 pb-3 sm:pb-4 bg-gradient-to-r from-seguranca-black via-seguranca-graphite to-seguranca-black border-b border-gray-600/50">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <div className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-seguranca-graphite/50 rounded-lg border border-gray-600/30 hover:border-seguranca-yellow/30 transition-colors duration-200">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-seguranca-yellow to-yellow-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <User size={14} className="text-seguranca-black sm:w-[18px] sm:h-[18px]" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wide">Funcionário</span>
                  <span className="text-seguranca-lightgray font-semibold truncate text-sm sm:text-base">{payslip.employeeName}</span>
                </div>
              </div>
              
              {payslip.cpf && (
                <div className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-seguranca-graphite/50 rounded-lg border border-gray-600/30 hover:border-green-500/30 transition-colors duration-200">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-xs sm:text-sm">ID</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wide">CPF</span>
                    <span className="text-seguranca-lightgray font-mono text-xs sm:text-sm">{payslip.cpf}</span>
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-seguranca-graphite/50 rounded-lg border border-gray-600/30 hover:border-blue-500/30 transition-colors duration-200 sm:col-span-2 lg:col-span-1">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Calendar size={14} className="text-white sm:w-[18px] sm:h-[18px]" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wide">Período</span>
                  <span className="text-seguranca-lightgray font-semibold text-sm sm:text-base">{payslip.month}/{payslip.year}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Área do PDF - Design Moderno e Responsivo */}
          <div className="flex-1 bg-gradient-to-br from-seguranca-black via-gray-900 to-seguranca-black p-2 sm:p-4 overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-seguranca-yellow/20 mx-auto mb-6"></div>
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-transparent border-t-seguranca-yellow absolute top-0 left-1/2 transform -translate-x-1/2"></div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-seguranca-lightgray text-lg font-semibold">Carregando PDF...</p>
                    <p className="text-gray-400 text-sm">Preparando visualização do holerite</p>
                  </div>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center max-w-md">
                  <div className="relative mb-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-red-500/20 to-red-600/20 rounded-2xl flex items-center justify-center mx-auto border border-red-500/30">
                      <X size={40} className="text-red-500" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">!</span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-red-400 text-lg font-semibold mb-2">Erro ao carregar PDF</p>
                      <p className="text-gray-400 text-sm">{error}</p>
                    </div>
                    <Button 
                      onClick={loadPdf} 
                      variant="outline" 
                      className="border-red-500/50 text-red-400 hover:bg-red-500 hover:text-white hover:scale-105 transition-all duration-200"
                    >
                      <RotateCw size={16} className="mr-2" />
                      Tentar Novamente
                    </Button>
                  </div>
                </div>
              </div>
            ) : pdfUrl ? (
              <div className="h-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-seguranca-black rounded-xl overflow-hidden border border-gray-600/30 shadow-2xl">
                <div className="relative w-full h-full">
                  <iframe
                    src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                    className="w-full h-full border-0 rounded-xl"
                    style={{
                      transform: `scale(${zoom}) rotate(${rotation}deg)`,
                      transformOrigin: 'center center',
                      transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                  />
                  {/* Overlay de zoom para melhor UX */}
                  {zoom !== 1 && (
                    <div className="absolute top-4 right-4 bg-seguranca-black/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-gray-600/50">
                      <span className="text-seguranca-yellow text-sm font-mono">
                        {Math.round(zoom * 100)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-gray-600/20 to-gray-700/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-gray-600/30">
                    <FileText size={32} className="text-gray-500" />
                  </div>
                  <p className="text-gray-400">Nenhum PDF disponível</p>
                </div>
              </div>
            )}
          </div>

          {/* Botões de Ação - Design Moderno e Responsivo */}
          <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-seguranca-black via-seguranca-graphite to-seguranca-black border-t border-gray-600/50">
            <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 justify-between items-center">
              {/* Botão Fechar */}
              <Button 
                variant="outline" 
                onClick={handleClose}
                className="border-gray-500/50 text-gray-400 hover:bg-gray-600 hover:text-white hover:scale-105 transition-all duration-200 order-1 lg:order-none w-full sm:w-auto"
              >
                <X size={14} className="mr-1 sm:mr-2 sm:w-4 sm:h-4" />
                <span className="text-sm sm:text-base">Fechar</span>
              </Button>
              
              {/* Botões de Ação */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 order-2 lg:order-none w-full sm:w-auto">
                <Button 
                  variant="outline" 
                  onClick={onSendEmail}
                  className="border-green-500/50 text-green-400 hover:bg-green-500 hover:text-white hover:scale-105 transition-all duration-200 shadow-lg shadow-green-500/10 w-full sm:w-auto"
                >
                  <Mail size={14} className="mr-1 sm:mr-2 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline text-sm">Enviar Email</span>
                  <span className="sm:hidden text-sm">Email</span>
                </Button>
                
                {onSendWhatsApp && (
                  <Button 
                    variant="outline" 
                    onClick={onSendWhatsApp}
                    className="border-blue-500/50 text-blue-400 hover:bg-blue-500 hover:text-white hover:scale-105 transition-all duration-200 shadow-lg shadow-blue-500/10 w-full sm:w-auto"
                  >
                    <MessageSquare size={14} className="mr-1 sm:mr-2 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline text-sm">Enviar WhatsApp</span>
                    <span className="sm:hidden text-sm">WhatsApp</span>
                  </Button>
                )}
                
                <Button 
                  onClick={onDownload}
                  className="bg-gradient-to-r from-seguranca-red to-red-600 hover:from-seguranca-darkred hover:to-red-700 hover:scale-105 transition-all duration-200 shadow-lg shadow-seguranca-red/20 w-full sm:w-auto"
                >
                  <Download size={14} className="mr-1 sm:mr-2 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline text-sm">Download PDF</span>
                  <span className="sm:hidden text-sm">Download</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
