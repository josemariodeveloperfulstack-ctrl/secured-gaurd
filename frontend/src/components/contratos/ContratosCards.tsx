import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, FileText, Bell, Download, Calendar, DollarSign, AlertTriangle, XCircle, ExternalLink } from 'lucide-react';
import { contractService } from '@/services/contractService';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Contrato {
  id: string;
  contractNumber: string;
  description: string;
  startDate: string;
  endDate?: string;
  value: number;
  status: 'ACTIVE' | 'INACTIVE' | 'TERMINATED' | 'PENDING' | 'CANCELLED' | 'EXPIRED' | 'DRAFT' | 'SUSPENDED';
  notes?: string;
  clientId: string;
  clientName: string;
  clientCnpj?: string;
  contractOrigin?: string;
  proposalId?: string;
  createdAt: string;
  updatedAt: string;
}

interface ContratosCardsProps {
  contratos: Contrato[];
  onEdit: (contrato: Contrato) => void;
  onDelete: () => void;
  onStatusChange?: (contractId: string, newStatus: string) => void;
  onGenerateContract?: (contrato: Contrato) => void;
  onTerminate?: (contrato: Contrato) => void;
}

export const ContratosCards: React.FC<ContratosCardsProps> = ({
  contratos,
  onEdit,
  onDelete,
  onStatusChange,
  onGenerateContract,
  onTerminate
}) => {
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contratoToDelete, setContratoToDelete] = useState<Contrato | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteClick = (contrato: Contrato) => {
    setContratoToDelete(contrato);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!contratoToDelete) return;

    setDeleting(true);
    try {
      await contractService.deleteContract(contratoToDelete.id);

      toast({
        title: "Sucesso",
        description: "Contrato excluído com sucesso!",
      });

      onDelete();
      setDeleteDialogOpen(false);
      setContratoToDelete(null);
    } catch (error: any) {
      console.error('Erro ao excluir contrato:', error);
      toast({
        title: "Erro",
        description: error?.response?.data?.message || "Erro ao excluir contrato. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const labels = {
      ACTIVE: 'Ativo',
      INACTIVE: 'Inativo',
      TERMINATED: 'Terminado',
      PENDING: 'Pendente',
      DRAFT: 'Em elaboração',
      CANCELLED: 'Cancelado',
      EXPIRED: 'Expirado',
      SUSPENDED: 'Suspenso'
    };

    let style = "";
    switch (status) {
      case 'ACTIVE':
        style = "border-2 border-green-500/50 text-green-500 bg-green-500/10";
        break;
      case 'PENDING':
        style = "border-2 border-yellow-500/50 text-yellow-500 bg-yellow-500/10";
        break;
      case 'TERMINATED':
      case 'CANCELLED':
      case 'EXPIRED':
        style = "border-2 border-red-500/50 text-red-500 bg-red-500/10";
        break;
      case 'SUSPENDED':
        style = "border-2 border-orange-500/50 text-orange-500 bg-orange-500/10";
        break;
      default:
        style = "border-2 border-zinc-700 text-zinc-400 bg-zinc-800/30";
    }

    return (
      <Badge className={`${style} rounded-none font-mono uppercase tracking-wider text-[10px] px-2 py-0.5 hover:bg-transparent`}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const isExpiringThisMonth = (endDate: string | undefined) => {
    if (!endDate) return false;
    const end = new Date(endDate);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry >= 0;
  };

  const getDaysUntilExpiry = (endDate: string | undefined) => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry;
  };

  if (contratos.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed border-zinc-800 rounded-none bg-[#121212] font-mono">
        <div className="mx-auto h-12 w-12 text-zinc-500 mb-4 flex items-center justify-center">
          <FileText className="h-10 w-10 text-yellow-500 animate-pulse" />
        </div>
        <h3 className="text-lg font-bold text-white uppercase tracking-wider mb-2">Nenhum contrato encontrado</h3>
        <p className="text-sm text-zinc-500 uppercase tracking-wide">Tente ajustar os filtros de busca ou criar um novo contrato.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 w-full min-w-0 font-mono">
        {contratos.map((contrato) => (
          <Card key={contrato.id} className="bg-[#121212] border-2 border-zinc-800 rounded-none hover:border-yellow-500/50 transition-colors flex flex-col justify-between min-h-[360px]">
            <div>
              <CardHeader className="pb-3 border-b border-zinc-800 px-4 pt-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="bg-yellow-500 p-2 rounded-none flex-shrink-0">
                      <FileText className="h-5 w-5 text-black" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-white text-sm sm:text-base truncate uppercase tracking-wider">
                        {contrato.clientName}
                      </h3>
                      {contrato.clientCnpj && (
                        <p className="text-[10px] text-zinc-400 truncate mt-0.5 tracking-widest font-bold">
                          CNPJ: {contrato.clientCnpj}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0 ml-2">
                    {getStatusBadge(contrato.status)}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4 px-4 py-4">
                {/* Número do Contrato */}
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Nº Contrato</p>
                    <p className="text-sm font-mono text-zinc-300 truncate">
                      {contrato.contractNumber}
                    </p>
                  </div>
                </div>

                {/* Descrição */}
                {contrato.description && (
                  <div className="bg-black border border-zinc-800 p-2 rounded-none">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">Descrição</p>
                    <p className="text-xs text-zinc-400 line-clamp-2">
                      {contrato.description}
                    </p>
                  </div>
                )}

                {/* Link para proposta quando origem é PROPOSAL */}
                {contrato.proposalId && contrato.contractOrigin === 'PROPOSAL' && (
                  <Link
                    to={`/propostas`}
                    className="inline-flex items-center gap-1.5 text-xs text-yellow-500 hover:underline uppercase tracking-wider font-bold"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Ver proposta associada
                  </Link>
                )}

                {/* Valor */}
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Valor</p>
                    <p className="text-lg font-black text-white">
                      {formatCurrency(contrato.value)}
                    </p>
                  </div>
                </div>

                {/* Datas */}
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-zinc-800">
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">Início</p>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-zinc-600 flex-shrink-0" />
                      <p className="text-xs text-zinc-300">
                        {formatDate(contrato.startDate)}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">Término</p>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-zinc-600 flex-shrink-0" />
                      {contrato.endDate ? (
                        <div className="flex items-center gap-1 min-w-0">
                          <p className={`text-xs truncate ${isExpiringThisMonth(contrato.endDate) ? 'text-red-500 font-bold' : 'text-zinc-300'}`}>
                            {formatDate(contrato.endDate)}
                          </p>
                          {isExpiringThisMonth(contrato.endDate) && (
                            <AlertTriangle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Indefinido</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Aviso de vencimento */}
                {contrato.endDate && isExpiringThisMonth(contrato.endDate) && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-none p-2 animate-pulse">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                      <p className="text-[10px] font-black uppercase tracking-wider text-red-500">
                        Vence em {getDaysUntilExpiry(contrato.endDate)} dias (REQUER_ATENCAO)
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </div>

            {/* Ações */}
            <div className="flex items-center justify-end gap-2 p-4 border-t border-zinc-800 bg-[#0a0a0a]">
              {onGenerateContract && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onGenerateContract(contrato)}
                  className="border-2 border-green-500 text-green-500 bg-transparent hover:bg-green-500 hover:text-black rounded-none h-8 px-2 py-0 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5"
                  title="Gerar contrato personalizado"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Baixar</span>
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(contrato)}
                className="border-2 border-yellow-500 text-yellow-500 bg-transparent hover:bg-yellow-500 hover:text-black rounded-none h-8 w-8 p-0"
                title="Editar contrato"
              >
                <Edit className="h-4 w-4" />
              </Button>
              {onTerminate && (contrato.status === 'ACTIVE' || contrato.status === 'PENDING') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onTerminate(contrato)}
                  className="border-2 border-red-500 text-red-500 bg-transparent hover:bg-red-500 hover:text-black rounded-none h-8 w-8 p-0"
                  title="Encerrar contrato"
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDeleteClick(contrato)}
                className="border-2 border-red-500 text-red-500 bg-transparent hover:bg-red-500 hover:text-black rounded-none h-8 w-8 p-0"
                title="Excluir contrato"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-[#121212] border-2 border-zinc-800 rounded-none font-mono max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white text-base font-black uppercase tracking-wider flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-red-500" />
              CONFIRMAR_EXCLUSÃO_SISTEMA
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400 text-sm">
              Tem certeza que deseja excluir o contrato "{contratoToDelete?.contractNumber}" do cliente "{contratoToDelete?.clientName}"? 
              Esta ação não pode ser desfeita e removerá o registro permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel className="bg-transparent text-zinc-400 border-2 border-zinc-800 hover:bg-zinc-800 hover:text-white rounded-none uppercase text-xs font-bold px-4 py-2">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white rounded-none border-none uppercase text-xs font-bold px-4 py-2"
            >
              {deleting ? 'Excluindo...' : 'Confirmar Exclusão'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
