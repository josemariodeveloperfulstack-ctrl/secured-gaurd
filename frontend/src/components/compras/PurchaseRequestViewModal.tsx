import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PurchaseRequest, purchaseRequestService } from '@/services/purchaseRequestService';
import { FileText, User, Building2, Calendar, DollarSign, CheckCircle, X, Download, Printer, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PurchaseRequestViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: PurchaseRequest | undefined;
}

export function PurchaseRequestViewModal({
  isOpen,
  onClose,
  request,
}: PurchaseRequestViewModalProps) {
  const { toast } = useToast();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  if (!request) return null;

  const formatCurrency = (value: number | string) => {
    const numericValue =
      typeof value === 'number'
        ? value
        : typeof value === 'string'
          ? parseFloat(value.replace(/\./g, '').replace(',', '.'))
          : 0;
    const numeric = Number.isFinite(numericValue) ? numericValue : 0;
    const rounded = Math.round(numeric * 100) / 100;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(rounded);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      DRAFT: 'Rascunho',
      SUBMITTED: 'Enviada',
      PENDING: 'Pendente',
      IN_PROCESS: 'Em Processo',
      APPROVED: 'Aprovada',
      REJECTED: 'Rejeitada',
      COMPLETED: 'Completada',
      CANCELLED: 'Cancelada',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-200 text-gray-800';
      case 'SUBMITTED': return 'bg-indigo-100 text-indigo-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'IN_PROCESS': return 'bg-blue-100 text-blue-800';
      case 'APPROVED': return 'bg-green-100 text-green-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      case 'COMPLETED': return 'bg-emerald-100 text-emerald-800';
      case 'CANCELLED': return 'bg-rose-100 text-rose-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityLabel = (priority: string) => {
    const labels: Record<string, string> = {
      URGENT: 'Urgente',
      HIGH: 'Alta',
      MEDIUM: 'Média',
      LOW: 'Baixa',
    };
    return labels[priority] || priority;
  };

  const getUrgencyLabel = (urgency: string) => {
    const labels: Record<string, string> = {
      CRITICAL: 'Crítica',
      URGENT: 'Urgente',
      NORMAL: 'Normal',
      LOW: 'Baixa',
    };
    return labels[urgency] || urgency;
  };

  const handleGeneratePDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const blob = await purchaseRequestService.generateSingleRequestPDF(request.id);
      const fileName = `solicitacao-compra-${request.requestNumber}-${new Date().toISOString().split('T')[0]}.pdf`;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Sucesso",
        description: "PDF gerado com sucesso!",
      });
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast({
        title: "Erro",
        description: "Erro ao gerar PDF. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-seguranca-graphite border-gray-600">
        <DialogHeader className="bg-gradient-to-r from-seguranca-red to-red-600 p-6 -m-6 mb-4 rounded-t-lg">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-white text-2xl font-bold flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <FileText className="h-6 w-6" />
              </div>
              Visualizar Solicitação de Compra
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white/20 h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações Básicas */}
          <Card className="bg-gradient-to-r from-seguranca-graphite to-gray-700 border-gray-600">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-seguranca-lightgray flex items-center gap-2">
                <div className="p-1.5 bg-seguranca-red/20 rounded-lg">
                  <FileText className="h-5 w-5 text-seguranca-red" />
                </div>
                Informações Básicas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400">Número da Requisição</label>
                  <p className="text-seguranca-lightgray font-medium">{request.requestNumber}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Título</label>
                  <p className="text-seguranca-lightgray font-medium">{request.title}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Status</label>
                  <div className="mt-1">
                    <Badge className={getStatusColor(request.status)}>
                      {getStatusLabel(request.status)}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Prioridade</label>
                  <div className="mt-1">
                    <Badge className="bg-yellow-100 text-yellow-800">
                      {getPriorityLabel(request.priority)}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Urgência</label>
                  <p className="text-seguranca-lightgray">{getUrgencyLabel(request.urgency) || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Data Necessária</label>
                  <p className="text-seguranca-lightgray">{formatDate(request.requiredDate)}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Valor Estimado</label>
                  <p className="text-seguranca-lightgray font-semibold">
                    {formatCurrency(request.totalValue || request.estimatedTotal || 0)}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Data da Solicitação</label>
                  <p className="text-seguranca-lightgray">{formatDate(request.requestDate)}</p>
                </div>
                {request.category && (
                  <div>
                    <label className="text-sm text-gray-400">Categoria</label>
                    <p className="text-seguranca-lightgray">{request.category}</p>
                  </div>
                )}
                {request.quantity != null && (
                  <div>
                    <label className="text-sm text-gray-400">Quantidade</label>
                    <p className="text-seguranca-lightgray">{request.quantity}</p>
                  </div>
                )}
                {request.unitOfMeasure && (
                  <div>
                    <label className="text-sm text-gray-400">Unidade de Medida</label>
                    <p className="text-seguranca-lightgray">{request.unitOfMeasure}</p>
                  </div>
                )}
                {request.itemNumber && (
                  <div>
                    <label className="text-sm text-gray-400">Número / Código</label>
                    <p className="text-seguranca-lightgray">{request.itemNumber}</p>
                  </div>
                )}
              </div>
              {request.sizeBreakdown && request.sizeBreakdown.length > 0 && (
                <div>
                  <label className="text-sm text-gray-400">Tamanhos</label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {request.sizeBreakdown.map((entry, index) => (
                      <Badge key={`${entry.size}-${index}`} className="bg-seguranca-black text-seguranca-lightgray border border-gray-600">
                        {entry.size}: {entry.quantity}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {request.description && (
                <div>
                  <label className="text-sm text-gray-400">Descrição</label>
                  <p className="text-seguranca-lightgray mt-1">{request.description}</p>
                </div>
              )}
              {request.justification && (
                <div>
                  <label className="text-sm text-gray-400">Justificativa</label>
                  <p className="text-seguranca-lightgray mt-1">{request.justification}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Solicitante e Departamento */}
          <Card className="bg-gradient-to-r from-seguranca-graphite to-gray-700 border-gray-600">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-seguranca-lightgray flex items-center gap-2">
                <div className="p-1.5 bg-seguranca-red/20 rounded-lg">
                  <User className="h-5 w-5 text-seguranca-red" />
                </div>
                Solicitante e Departamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400">Solicitante</label>
                  <p className="text-seguranca-lightgray font-medium">{request.requesterName || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Departamento</label>
                  <p className="text-seguranca-lightgray">{request.department || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Unidade Organizacional</label>
                  <p className="text-seguranca-lightgray">{request.unitName || '-'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Informações de Aprovação */}
          {(request.status === 'APPROVED' || request.approverName || request.approvedBy) && (
            <Card className="bg-gradient-to-r from-seguranca-graphite to-gray-700 border-gray-600">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-seguranca-lightgray flex items-center gap-2">
                  <div className="p-1.5 bg-seguranca-red/20 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-seguranca-red" />
                  </div>
                  Informações de Aprovação
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-400">Aprovador por</label>
                    <p className="text-seguranca-lightgray font-medium">
                      {request.approverName || request.approvedBy || '-'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">Data de Aprovação</label>
                    <p className="text-seguranca-lightgray">{formatDate(request.approvalDate)}</p>
                  </div>
                  {request.approvalNotes && (
                    <div className="md:col-span-2">
                      <label className="text-sm text-gray-400">Observações da Aprovação</label>
                      <p className="text-seguranca-lightgray mt-1">{request.approvalNotes}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Informações de Fornecedor */}
          {request.supplier && (
            <Card className="bg-gradient-to-r from-seguranca-graphite to-gray-700 border-gray-600">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-seguranca-lightgray flex items-center gap-2">
                  <div className="p-1.5 bg-seguranca-red/20 rounded-lg">
                    <Building2 className="h-5 w-5 text-seguranca-red" />
                  </div>
                  Informações de Fornecedor
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-400">Fornecedor</label>
                    <p className="text-seguranca-lightgray">{request.supplier}</p>
                  </div>
                  {request.paymentMethod && (
                    <div>
                      <label className="text-sm text-gray-400">Método de Pagamento</label>
                      <p className="text-seguranca-lightgray">{request.paymentMethod}</p>
                    </div>
                  )}
                  {request.deliveryMethod && (
                    <div>
                      <label className="text-sm text-gray-400">Método de Entrega</label>
                      <p className="text-seguranca-lightgray">{request.deliveryMethod}</p>
                    </div>
                  )}
                  {request.deliveryAddress && (
                    <div className="md:col-span-2">
                      <label className="text-sm text-gray-400">Endereço de Entrega</label>
                      <p className="text-seguranca-lightgray">{request.deliveryAddress}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Observações */}
          {request.notes && (
            <Card className="bg-gradient-to-r from-seguranca-graphite to-gray-700 border-gray-600">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-seguranca-lightgray flex items-center gap-2">
                  <div className="p-1.5 bg-seguranca-red/20 rounded-lg">
                    <FileText className="h-5 w-5 text-seguranca-red" />
                  </div>
                  Observações Adicionais
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-seguranca-lightgray">{request.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex justify-between items-center pt-4 mt-6 border-t border-gray-600">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleGeneratePDF}
              disabled={isGeneratingPDF}
              className="border-gray-600 text-seguranca-lightgray hover:bg-seguranca-graphite hover:text-white"
            >
              {isGeneratingPDF ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handlePrint}
              className="border-gray-600 text-seguranca-lightgray hover:bg-seguranca-graphite hover:text-white"
            >
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
          </div>
          <Button
            variant="outline"
            onClick={onClose}
            className="border-gray-600 text-seguranca-lightgray hover:bg-seguranca-graphite hover:text-white"
          >
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

