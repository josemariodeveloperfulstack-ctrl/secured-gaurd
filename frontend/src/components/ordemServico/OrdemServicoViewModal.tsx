import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { OrderOfService } from '@/services/orderOfServiceService';
import { ordemServicoPDFGenerator } from '@/utils/ordemServicoPDFGenerator';
import { companyService } from '@/services/companyService';
import { clientService } from '@/services/clientService';
import { positionService } from '@/services/positionService';
import { FileText, Download, Eye, Calendar, DollarSign, User, Building, MapPin, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface OrdemServicoViewModalProps {
  open: boolean;
  onClose: () => void;
  orderOfService: OrderOfService | null;
}

const OrdemServicoViewModal: React.FC<OrdemServicoViewModalProps> = ({ 
  open, 
  onClose, 
  orderOfService 
}) => {
  const { toast } = useToast();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  if (!orderOfService) return null;

  const formatCurrency = (value: number | string | undefined) => {
    if (value === undefined || value === null) return 'R$ 0,00';
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numValue);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      // Tentar diferentes formatos de data
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        // Se falhar, tentar formato ISO ou outros
        return dateString;
      }
      return date.toLocaleDateString('pt-BR');
    } catch (error) {
      return dateString;
    }
  };

  const handleGeneratePDF = async () => {
    setIsGeneratingPDF(true);
    try {
      // Buscar dados completos para gerar o PDF
      const [companies, clients, positions] = await Promise.all([
        companyService.getAllCompanies(),
        clientService.getAllClients(),
        positionService.getPositions()
      ]);

      const selectedCompany = companies.find(c => c.name === orderOfService.company || c.sigla === orderOfService.company);
      const selectedClient = clients.find(c => c.name === orderOfService.client);
      const selectedPosition = positions.find(p => p.name === orderOfService.role || p.description === orderOfService.role);

      // Preparar dados para o PDF
      const pdfData = {
        ordem: {
          numero: orderOfService.id?.toString() || Date.now().toString(),
          dataInicio: orderOfService.startDate,
          dataFim: orderOfService.endDate || '',
          observacoes: '',
          modelo: 'CSN', // Modelo padrão
          status: orderOfService.signed ? 'ASSINADA' : 'PENDENTE'
        },
        funcionario: {
          name: orderOfService.employeeName,
          document: orderOfService.employeeCpf,
          position: selectedPosition ? { name: selectedPosition.name || selectedPosition.description || orderOfService.role } : undefined,
          unit: undefined
        },
        cliente: {
          name: orderOfService.client,
          document: selectedClient?.cnpj || ''
        },
        empresa: {
          name: orderOfService.company,
          document: selectedCompany?.cnpj || ''
        },
        unidade: {
          name: orderOfService.workplace,
          code: ''
        },
        cargo: {
          name: orderOfService.role
        }
      };

      // Gerar PDF
      await ordemServicoPDFGenerator.generatePDF(pdfData);
      
      toast({
        title: 'Sucesso!',
        description: 'PDF gerado com sucesso.',
      });
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível gerar o PDF. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] sm:max-w-2xl mx-auto p-4 sm:p-6 rounded-md max-h-[90vh] overflow-y-auto overflow-x-hidden bg-seguranca-graphite border-gray-600">
        <DialogHeader>
          <DialogTitle className="text-seguranca-lightgray text-base sm:text-lg md:text-xl">
            Ordem de Serviço - {orderOfService.employeeName}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3 sm:space-y-4 md:space-y-6">
          {/* Função - Destaque no topo */}
          <div className="bg-seguranca-black/50 p-3 sm:p-4 rounded-lg border-l-4 border-seguranca-yellow">
            <span className="text-gray-400 text-xs sm:text-sm block mb-1">Função:</span>
            <p className="font-semibold text-seguranca-yellow text-base sm:text-lg md:text-xl">
              {orderOfService.role}
            </p>
          </div>

          {/* Informações do Funcionário */}
          <div className="bg-seguranca-black/50 p-3 sm:p-4 rounded-lg">
            <h3 className="text-seguranca-yellow font-semibold mb-2 sm:mb-3 flex items-center gap-2 text-xs sm:text-sm md:text-base">
              <User size={16} className="sm:w-5 sm:h-5" />
              Informações do Funcionário
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-seguranca-lightgray">
              <div>
                <span className="text-gray-400 text-xs sm:text-sm block mb-1">Nome:</span>
                <p className="font-medium text-xs sm:text-sm">{orderOfService.employeeName}</p>
              </div>
              <div>
                <span className="text-gray-400 text-xs sm:text-sm block mb-1">CPF:</span>
                <p className="font-medium text-xs sm:text-sm">{orderOfService.employeeCpf}</p>
              </div>
            </div>
          </div>

          {/* Informações da Empresa */}
          <div className="bg-seguranca-black/50 p-3 sm:p-4 rounded-lg">
            <h3 className="text-seguranca-yellow font-semibold mb-2 sm:mb-3 flex items-center gap-2 text-xs sm:text-sm md:text-base">
              <Building size={16} className="sm:w-5 sm:h-5" />
              Informações da Empresa
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-seguranca-lightgray">
              <div>
                <span className="text-gray-400 text-xs sm:text-sm block mb-1">Empresa Contratante:</span>
                <p className="font-medium text-xs sm:text-sm">{orderOfService.company}</p>
              </div>
              <div>
                <span className="text-gray-400 text-xs sm:text-sm block mb-1">Cliente Final:</span>
                <p className="font-medium text-xs sm:text-sm">{orderOfService.client}</p>
              </div>
              <div className="col-span-1 sm:col-span-2">
                <span className="text-gray-400 text-xs sm:text-sm block mb-1">Posto de Trabalho:</span>
                <p className="font-medium text-xs sm:text-sm">{orderOfService.workplace}</p>
              </div>
            </div>
          </div>

          {/* Informações Financeiras */}
          <div className="bg-seguranca-black/50 p-3 sm:p-4 rounded-lg">
            <h3 className="text-seguranca-yellow font-semibold mb-2 sm:mb-3 flex items-center gap-2 text-xs sm:text-sm md:text-base">
              <DollarSign size={16} className="sm:w-5 sm:h-5" />
              Informações Financeiras
            </h3>
            <div className="text-seguranca-lightgray">
              <span className="text-gray-400 text-xs sm:text-sm block mb-1">Salário:</span>
              <p className="font-semibold text-base sm:text-lg md:text-xl text-seguranca-yellow">
                {formatCurrency(orderOfService.salary)}
              </p>
            </div>
          </div>

          {/* Período de Trabalho */}
          <div className="bg-seguranca-black/50 p-3 sm:p-4 rounded-lg">
            <h3 className="text-seguranca-yellow font-semibold mb-2 sm:mb-3 flex items-center gap-2 text-xs sm:text-sm md:text-base">
              <Calendar size={16} className="sm:w-5 sm:h-5" />
              Período de Trabalho
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-seguranca-lightgray">
              <div>
                <span className="text-gray-400 text-xs sm:text-sm block mb-1">Data de Início:</span>
                <p className="font-medium text-xs sm:text-sm">{formatDate(orderOfService.startDate)}</p>
              </div>
              <div>
                <span className="text-gray-400 text-xs sm:text-sm block mb-1">Data de Término:</span>
                <p className="font-medium text-xs sm:text-sm">
                  {orderOfService.endDate ? formatDate(orderOfService.endDate) : 'Indefinido'}
                </p>
              </div>
            </div>
          </div>

          {/* Status e Documento */}
          <div className="bg-seguranca-black/50 p-3 sm:p-4 rounded-lg">
            <h3 className="text-seguranca-yellow font-semibold mb-2 sm:mb-3 flex items-center gap-2 text-xs sm:text-sm md:text-base">
              <FileText size={16} className="sm:w-5 sm:h-5" />
              Status e Documento
            </h3>
            <div className="space-y-3 sm:space-y-4">
              <div>
                <span className="text-gray-400 text-xs sm:text-sm block mb-1">Status:</span>
                <p className={`font-medium text-xs sm:text-sm ${orderOfService.signed ? 'text-green-400' : 'text-red-400'}`}>
                  {orderOfService.signed ? 'Assinada' : 'Não Assinada'}
                </p>
              </div>
              <div>
                <span className="text-gray-400 text-xs sm:text-sm block mb-2">Documento:</span>
                <div className="flex flex-wrap gap-2">
                  {orderOfService.documentUrl ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-seguranca-yellow border-seguranca-yellow hover:bg-seguranca-yellow hover:text-seguranca-black h-9 sm:h-10 text-xs sm:text-sm flex-shrink-0"
                        onClick={() => window.open(orderOfService.documentUrl, '_blank')}
                      >
                        <Eye size={14} className="sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                        Visualizar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-seguranca-yellow border-seguranca-yellow hover:bg-seguranca-yellow hover:text-seguranca-black h-9 sm:h-10 text-xs sm:text-sm flex-shrink-0"
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = orderOfService.documentUrl!;
                          link.download = `OS_${orderOfService.employeeName}_${orderOfService.id}.pdf`;
                          link.click();
                        }}
                      >
                        <Download size={14} className="sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                        Download
                      </Button>
                    </>
                  ) : null}
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-blue-400 border-blue-400 hover:bg-blue-400 hover:text-white h-9 sm:h-10 text-xs sm:text-sm flex-shrink-0"
                    onClick={handleGeneratePDF}
                    disabled={isGeneratingPDF}
                  >
                    {isGeneratingPDF ? (
                      <>
                        <Loader2 size={14} className="sm:w-4 sm:h-4 mr-1 sm:mr-2 animate-spin" />
                        Gerando...
                      </>
                    ) : (
                      <>
                        <FileText size={14} className="sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                        Gerar PDF
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Informações do Sistema */}
          <div className="bg-seguranca-black/30 p-2 sm:p-3 rounded-lg">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm text-gray-400">
              <div>
                <span className="block mb-1">Criada em:</span>
                <p className="text-seguranca-lightgray">{formatDate(orderOfService.createdAt)}</p>
              </div>
              <div>
                <span className="block mb-1">Atualizada em:</span>
                <p className="text-seguranca-lightgray">{formatDate(orderOfService.updatedAt)}</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrdemServicoViewModal; 