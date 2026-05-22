import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, FileText, Bell, Download, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
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

interface ContratosTableProps {
  contratos: Contrato[];
  onEdit: (contrato: Contrato) => void;
  onDelete: () => void;
  onStatusChange?: (contractId: string, newStatus: string) => void;
  onGenerateContract?: (contrato: Contrato) => void;
}

export const ContratosTable: React.FC<ContratosTableProps> = ({
  contratos,
  onEdit,
  onDelete,
  onStatusChange,
  onGenerateContract
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
      const { error } = await supabase
        .from('contratos')
        .delete()
        .eq('id', contratoToDelete.id);

      if (error) throw error;

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
        description: "Erro ao excluir contrato. Tente novamente.",
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

  return (
    <>
      <div className="border-2 border-zinc-800 bg-[#121212] rounded-none overflow-hidden w-full font-mono">
        <div className="overflow-x-auto w-full">
          <Table className="w-full min-w-[800px]">
            <TableHeader>
              <TableRow className="border-b-2 border-zinc-800 bg-black hover:bg-black">
                <TableHead className="text-zinc-400 font-bold uppercase tracking-wider text-xs min-w-[120px]">Cliente</TableHead>
                <TableHead className="text-zinc-400 font-bold uppercase tracking-wider text-xs hidden sm:table-cell min-w-[100px]">Nº Contrato</TableHead>
                <TableHead className="text-zinc-400 font-bold uppercase tracking-wider text-xs hidden lg:table-cell min-w-[150px]">Descrição</TableHead>
                <TableHead className="text-zinc-400 font-bold uppercase tracking-wider text-xs min-w-[100px]">Valor</TableHead>
                <TableHead className="text-zinc-400 font-bold uppercase tracking-wider text-xs hidden md:table-cell min-w-[80px]">Início</TableHead>
                <TableHead className="text-zinc-400 font-bold uppercase tracking-wider text-xs hidden md:table-cell min-w-[80px]">Término</TableHead>
                <TableHead className="text-zinc-400 font-bold uppercase tracking-wider text-xs min-w-[80px]">Status</TableHead>
                <TableHead className="text-zinc-400 font-bold uppercase tracking-wider text-xs text-right min-w-[140px] sticky right-0 bg-black z-10">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contratos.map((contrato) => (
                <TableRow key={contrato.id} className="border-b border-zinc-800 hover:bg-zinc-900/40 transition-colors">
                  <TableCell className="text-zinc-300">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="bg-yellow-500 p-1.5 rounded-none flex-shrink-0">
                        <FileText size={12} className="text-black sm:w-4 sm:h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-white text-xs sm:text-sm truncate uppercase tracking-wider">{contrato.clientName}</div>
                        {contrato.clientCnpj && (
                          <div className="text-[10px] text-zinc-500 font-bold tracking-wider mt-0.5 truncate hidden sm:block">CNPJ: {contrato.clientCnpj}</div>
                        )}
                        {/* Mostrar número do contrato em mobile */}
                        <div className="text-xs text-zinc-500 sm:hidden mt-0.5 font-mono">
                          {contrato.contractNumber}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-zinc-300 hidden sm:table-cell">
                    <div className="flex items-center gap-1.5">
                      <Bell size={12} className="text-yellow-500 flex-shrink-0" />
                      <span className="text-xs sm:text-sm font-mono text-zinc-300">{contrato.contractNumber}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-zinc-400 hidden lg:table-cell">
                    <div className="max-w-xs truncate text-xs sm:text-sm" title={contrato.description}>
                      {contrato.description}
                    </div>
                  </TableCell>
                  <TableCell className="text-white font-bold">
                    <span className="text-xs sm:text-sm">{formatCurrency(contrato.value)}</span>
                  </TableCell>
                  <TableCell className="text-zinc-400 hidden md:table-cell">
                    <div className="text-xs sm:text-sm">
                      {formatDate(contrato.startDate)}
                    </div>
                  </TableCell>
                  <TableCell className="text-zinc-400 hidden md:table-cell">
                    <div className="text-xs sm:text-sm">
                      {contrato.endDate ? (
                        <div className="flex items-center gap-1 sm:gap-2">
                          <span className={`${isExpiringThisMonth(contrato.endDate) ? 'text-red-500 font-bold' : ''} truncate`}>
                            {formatDate(contrato.endDate)}
                          </span>
                          {isExpiringThisMonth(contrato.endDate) && (
                            <div className="flex items-center gap-1 flex-shrink-0 bg-red-500/10 px-1 border border-red-500">
                              <AlertTriangle size={10} className="text-red-500 sm:w-3 sm:h-3" />
                              <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider">
                                {getDaysUntilExpiry(contrato.endDate)}d
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-zinc-600 font-bold uppercase tracking-wider text-[10px]">Indefinido</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(contrato.status)}
                  </TableCell>
                  <TableCell className="text-right sticky right-0 bg-[#121212] border-l border-zinc-800 z-10">
                    <div className="flex justify-end gap-1.5">
                      {onGenerateContract && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onGenerateContract(contrato)}
                          className="border-2 border-green-500 text-green-500 bg-transparent hover:bg-green-500 hover:text-black rounded-none h-7 px-1.5 py-0 font-bold uppercase tracking-wider text-[9px] flex items-center gap-1"
                          title="Gerar contrato personalizado"
                        >
                          <Download size={10} />
                          <span className="hidden sm:inline">Baixar</span>
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(contrato)}
                        className="border-2 border-yellow-500 text-yellow-500 bg-transparent hover:bg-yellow-500 hover:text-black rounded-none h-7 w-7 p-0 flex items-center justify-center"
                        title="Editar contrato"
                      >
                        <Edit size={12} />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteClick(contrato)}
                        className="border-2 border-red-500 text-red-500 bg-transparent hover:bg-red-500 hover:text-black rounded-none h-7 w-7 p-0 flex items-center justify-center"
                        title="Excluir contrato"
                      >
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
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
