import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { orderOfServiceService } from '@/services/orderOfServiceService';
import { OrderOfService } from '@/types/orderOfService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, FileText, Eye, Filter, RefreshCw, Download, Search, Edit, Trash2 } from 'lucide-react';
import EmitirOrdemServicoModal from '@/components/ordemServico/EmitirOrdemServicoModal';
import OrdemServicoViewModal from '@/components/ordemServico/OrdemServicoViewModal';
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
import { StandardLayout } from '@/components/StandardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const OrdemServicoPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [employeeId, setEmployeeId] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderOfService | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<OrderOfService | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const shouldOpenModal = params.get('emitir') === '1';

  useEffect(() => {
    if (shouldOpenModal) setModalOpen(true);
  }, [shouldOpenModal]);

  const handleOpenModal = () => {
    setModalOpen(true);
    navigate('/rh/ordens-servico?emitir=1', { replace: true });
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    if (shouldOpenModal) navigate('/rh/ordens-servico', { replace: true });
  };

  const handleViewOrder = (order: OrderOfService) => {
    setSelectedOrder(order);
    setViewModalOpen(true);
  };

  const handleCloseViewModal = () => {
    setViewModalOpen(false);
    setSelectedOrder(null);
  };

  const handleEditOrder = (order: OrderOfService) => {
    setSelectedOrder(order);
    setEditModalOpen(true);
  };

  const handleDeleteOrder = (order: OrderOfService) => {
    setOrderToDelete(order);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!orderToDelete) return;
    
    setIsDeleting(true);
    try {
      await orderOfServiceService.deleteOrder(orderToDelete.id);
      toast({
        title: 'Sucesso',
        description: 'Ordem de serviço excluída com sucesso.',
      });
      queryClient.invalidateQueries({ queryKey: ['orders-of-service'] });
      await refetch();
      setDeleteDialogOpen(false);
      setOrderToDelete(null);
    } catch (error) {
      console.error('Erro ao excluir ordem:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao excluir ordem de serviço.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownloadPDF = async (order: OrderOfService) => {
    try {
      if (order.documentUrl) {
        // Se já existe um PDF, fazer download
        window.open(order.documentUrl, '_blank');
      } else {
        // Gerar PDF se não existir
        toast({
          title: 'Gerando PDF',
          description: 'O PDF será gerado em breve...',
        });
        // Aqui você pode chamar uma função para gerar o PDF
      }
    } catch (error) {
      console.error('Erro ao fazer download do PDF:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao fazer download do PDF.',
        variant: 'destructive',
      });
    }
  };

  const { data, isLoading, refetch } = useQuery<OrderOfService[]>({
    queryKey: ['orders-of-service', employeeId],
    queryFn: async () => {
      console.log('🔍 Buscando ordens de serviço...', { employeeId });
      try {
        let result;
        if (employeeId) {
          // Se houver filtro por funcionário, buscar apenas as ordens desse funcionário
          result = await orderOfServiceService.getOrders({ employeeId });
        } else {
          // Buscar todas as ordens quando não há filtro
          result = await orderOfServiceService.getOrders();
        }
        console.log('✅ Ordens retornadas:', result?.length || 0, result);
        return result || [];
      } catch (error) {
        console.error('❌ Erro ao buscar ordens:', error);
        return [];
      }
    },
    enabled: true, // Sempre habilitado para buscar todas as ordens
    refetchOnWindowFocus: true, // Recarregar quando a janela receber foco
    refetchOnMount: true, // Recarregar quando o componente montar
  });

  const clearFilters = () => {
    setEmployeeId('');
  };

  const handleRefresh = async () => {
    console.log('🔄 Atualizando lista manualmente...');
    try {
      await refetch();
      console.log('✅ Lista atualizada');
    } catch (error) {
      console.error('❌ Erro ao atualizar lista:', error);
    }
  };

  return (
    <StandardLayout title="Ordens de Serviço (SST)">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-seguranca-lightgray">Ordens de Serviço (SST)</h1>
            <p className="text-gray-400 mt-1">Gestão e emissão de ordens de serviço de segurança e saúde do trabalho</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="border-gray-600 text-seguranca-lightgray hover:bg-gray-600"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button variant="outline" className="border-gray-600 text-seguranca-lightgray">
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
            <Button onClick={handleOpenModal} className="bg-seguranca-red hover:bg-seguranca-darkred">
              <Plus className="mr-2 h-4 w-4" /> Emitir Nova OS
            </Button>
          </div>
        </div>

        {/* Filtros Avançados */}
        <Card className="bg-seguranca-graphite border-gray-600">
          <CardHeader className="pb-3">
            <CardTitle className="text-seguranca-lightgray flex items-center gap-2 text-lg">
              <Filter className="h-5 w-5 text-seguranca-yellow" />
              Filtros Avançados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-seguranca-lightgray mb-2 text-sm font-medium">ID do Funcionário</label>
                <Input
                  placeholder="Digite o ID do funcionário"
                  value={employeeId}
                  onChange={e => setEmployeeId(e.target.value)}
                  className="bg-seguranca-black border-gray-600 text-seguranca-lightgray focus:border-seguranca-yellow focus:outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t border-gray-600">
              <Button 
                variant="outline" 
                onClick={clearFilters}
                className="border-gray-600 text-seguranca-lightgray hover:bg-gray-600"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Limpar
              </Button>
              <Button 
                variant="outline" 
                onClick={handleRefresh}
                className="border-seguranca-yellow text-seguranca-yellow hover:bg-seguranca-yellow hover:text-black"
              >
                <Filter className="mr-2 h-4 w-4" />
                Aplicar Filtro
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Resultados */}
        <Card className="bg-seguranca-graphite border-gray-600">
          <CardHeader>
            <CardTitle className="text-seguranca-lightgray flex items-center justify-between">
              <span>Resultados ({data?.length || 0} ordens)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="animate-spin mr-2" /> Carregando...
              </div>
            ) : (
              <div className="overflow-x-auto">
                {console.log('📊 Renderizando tabela. Dados:', data, 'Tamanho:', data?.length)}
                <table className="w-full">
                  <thead>
                    <tr className="text-seguranca-yellow text-left border-b border-gray-700">
                      <th className="p-3 text-sm font-medium">Funcionário</th>
                      <th className="p-3 text-sm font-medium">Função</th>
                      <th className="p-3 text-sm font-medium">Empresa</th>
                      <th className="p-3 text-sm font-medium">Cliente/Posto</th>
                      <th className="p-3 text-sm font-medium">Salário</th>
                      <th className="p-3 text-sm font-medium">Período</th>
                      <th className="p-3 text-sm font-medium">Assinada</th>
                      <th className="p-3 text-sm font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data && Array.isArray(data) && data.length > 0 ? data.map(os => (
                      <tr 
                        key={os.id} 
                        className="border-b border-gray-700 text-seguranca-lightgray hover:bg-seguranca-black transition-colors cursor-pointer"
                        onClick={() => handleViewOrder(os)}
                      >
                        <td className="p-3 text-sm font-medium">{os.employeeName}</td>
                        <td className="p-3 text-sm">{os.role}</td>
                        <td className="p-3 text-sm">{os.company}</td>
                        <td className="p-3 text-sm">{os.workplace}</td>
                        <td className="p-3 text-sm">
                          {typeof os.salary === 'number' 
                            ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(os.salary)
                            : `R$ ${parseFloat(String(os.salary || 0)).toFixed(2)}`}
                        </td>
                        <td className="p-3 text-sm">
                          {os.startDate ? new Date(os.startDate).toLocaleDateString('pt-BR') : 'N/A'} 
                          {os.endDate ? ` até ${new Date(os.endDate).toLocaleDateString('pt-BR')}` : ''}
                        </td>
                        <td className="p-3 text-sm">
                          <span className={`px-2 py-1 rounded text-xs ${os.signed ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                            {os.signed ? 'Sim' : 'Não'}
                          </span>
                        </td>
                        <td className="p-3 text-sm">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-blue-400 border-blue-400 hover:bg-blue-400 hover:text-white"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewOrder(os);
                              }}
                              title="Visualizar"
                            >
                              <Eye size={16} />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-seguranca-yellow border-seguranca-yellow hover:bg-seguranca-yellow hover:text-seguranca-black"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditOrder(os);
                              }}
                              title="Editar"
                            >
                              <Edit size={16} />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-400 border-green-400 hover:bg-green-400 hover:text-white"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadPDF(os);
                              }}
                              title="Download PDF"
                            >
                              <Download size={16} />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-400 border-red-400 hover:bg-red-400 hover:text-white"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteOrder(os);
                              }}
                              title="Excluir"
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={8} className="text-center text-seguranca-lightgray py-8">
                          <div className="flex flex-col items-center gap-2">
                            <p className="text-lg">Nenhuma ordem encontrada</p>
                            <p className="text-sm text-gray-400">Tente ajustar os filtros ou emitir uma nova OS</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal para emitir nova OS */}
      <EmitirOrdemServicoModal 
        open={modalOpen} 
        onClose={handleCloseModal} 
        onCreated={async () => {
          console.log('🔄 Recarregando lista após criar ordem...');
          handleCloseModal();
          // Aguardar um pouco para garantir que o backend processou
          await new Promise(resolve => setTimeout(resolve, 500));
          // Invalidar cache e recarregar
          queryClient.invalidateQueries({ queryKey: ['orders-of-service'] });
          await refetch();
          console.log('✅ Lista atualizada após criar ordem');
        }} 
      />
      {/* Modal para visualizar OS */}
      <OrdemServicoViewModal 
        open={viewModalOpen} 
        onClose={handleCloseViewModal} 
        orderOfService={selectedOrder} 
      />
      
      {/* Modal para editar OS */}
      <EmitirOrdemServicoModal 
        open={editModalOpen} 
        onClose={() => {
          setEditModalOpen(false);
          setSelectedOrder(null);
        }} 
        onCreated={async () => {
          console.log('🔄 Recarregando lista após editar ordem...');
          setEditModalOpen(false);
          setSelectedOrder(null);
          await new Promise(resolve => setTimeout(resolve, 500));
          queryClient.invalidateQueries({ queryKey: ['orders-of-service'] });
          await refetch();
          console.log('✅ Lista atualizada após editar ordem');
        }}
        order={selectedOrder}
      />

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-seguranca-graphite border-gray-600">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-seguranca-lightgray">
              Confirmar Exclusão
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Tem certeza que deseja excluir a ordem de serviço de <strong>{orderToDelete?.employeeName}</strong>?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              className="border-gray-600 text-seguranca-lightgray hover:bg-gray-600"
              disabled={isDeleting}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                'Excluir'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </StandardLayout>
  );
};

export default OrdemServicoPage;