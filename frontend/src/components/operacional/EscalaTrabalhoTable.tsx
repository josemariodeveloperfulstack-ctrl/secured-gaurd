import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Edit, Trash2, Search, Plus, RefreshCw, Clock, User, Building, Sun, Moon, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Schedule, scheduleService } from '@/services/scheduleService';

interface EscalaTrabalhoTableProps {
  escalas: Schedule[];
  isLoading: boolean;
  onRefresh: () => void;
  onEdit: (escala: Schedule) => void;
  onDelete: (escala: Schedule) => void;
  onCreate: () => void;
}

const EscalaTrabalhoTable: React.FC<EscalaTrabalhoTableProps> = ({
  escalas,
  isLoading,
  onRefresh,
  onEdit,
  onDelete,
  onCreate
}) => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<Schedule['status'] | 'all'>('all');

  // Log para verificar se os handlers estão sendo passados
  useEffect(() => {
    console.log('🔍 EscalaTrabalhoTable - Handlers recebidos:', {
      onEdit: typeof onEdit,
      onDelete: typeof onDelete,
      onCreate: typeof onCreate
    });
  }, [onEdit, onDelete, onCreate]);

  const getStatusProps = (status: Schedule['status']) => {
    switch (status) {
      case 'PENDING':
        return { color: 'bg-yellow-500/20 text-yellow-400', text: 'Pendente' };
      case 'CONFIRMED':
        return { color: 'bg-blue-500/20 text-blue-400', text: 'Confirmada' };
      case 'COMPLETED':
        return { color: 'bg-green-500/20 text-green-400', text: 'Concluída' };
      case 'CANCELLED':
        return { color: 'bg-red-500/20 text-red-400', text: 'Cancelada' };
      default:
        return { color: 'bg-gray-500/20 text-gray-400', text: 'Desconhecido' };
    }
  };

  const getShiftProps = (shift: Schedule['shift']) => {
    switch (shift) {
      case 'DAY':
        return { icon: <Sun className="h-4 w-4 text-yellow-400" />, text: 'Diurno' };
      case 'NIGHT':
        return { icon: <Moon className="h-4 w-4 text-blue-400" />, text: 'Noturno' };
      case 'MIXED':
        return { icon: <Clock className="h-4 w-4 text-gray-400" />, text: 'Misto' };
      default:
        return { icon: null, text: shift };
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '-';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

  const handleGeneratePDF = async () => {
    try {
      toast({
        title: 'Gerando relatório...',
        description: 'Por favor, aguarde enquanto o PDF é gerado.',
      });

      // Preparar filtros baseados nos filtros atuais
      const filters: any = {};
      
      // Se houver filtro de status, incluir
      if (statusFilter && statusFilter !== 'all') {
        filters.status = statusFilter;
      }

      const blob = await scheduleService.generatePDFReport(filters);
      
      // Criar URL do blob e fazer download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `relatorio-escalas-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Relatório gerado!',
        description: 'O PDF foi baixado com sucesso.',
      });
    } catch (error: any) {
      console.error('Erro ao gerar relatório PDF:', error);
      toast({
        title: 'Erro ao gerar relatório',
        description: error.message || 'Não foi possível gerar o relatório PDF.',
        variant: 'destructive',
      });
    }
  };

  // Verificar se escalas é um array válido
  const safeEscalas = Array.isArray(escalas) ? escalas : [];
  
  console.log('📊 EscalaTrabalhoTable - escalas recebidas:', escalas);
  console.log('📊 EscalaTrabalhoTable - safeEscalas:', safeEscalas);
  console.log('📊 EscalaTrabalhoTable - quantidade:', safeEscalas.length);
  
  const filteredEscalas = safeEscalas.filter(escala => {
    const matchesSearch = 
      (escala.employee?.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (escala.location?.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (escala.workPost?.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (escala.workPost?.postCode?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || escala.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleRefresh = async () => {
    try {
      await onRefresh();
      toast({
        title: 'Sucesso!',
        description: 'Lista de escalas atualizada.',
      });
    } catch (error) {
      toast({
        title: 'Erro!',
        description: 'Erro ao atualizar lista de escalas.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
      return (
          <div className="text-center py-12">
              <RefreshCw className="mx-auto h-12 w-12 text-gray-400 animate-spin mb-4" />
              <p className="text-seguranca-lightgray">Carregando escalas...</p>
          </div>
      );
  }

  if (safeEscalas.length === 0 && !isLoading) {
    return (
      <Card className="bg-seguranca-graphite border-gray-700">
        <CardContent className="p-6">
          <div className="text-center py-12">
            <Clock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-seguranca-lightgray mb-2">
              Nenhuma escala encontrada
            </h3>
            <p className="text-sm text-gray-400">
              Ainda não há escalas de trabalho para exibir.
            </p>
            <Button 
              onClick={onCreate}
              className="mt-6 bg-seguranca-red hover:bg-seguranca-darkred"
            >
              <Plus className="h-4 w-4 mr-2" />
              Criar Nova Escala
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtros em Card */}
      <Card className="bg-seguranca-graphite border-gray-700">
        <CardContent className="py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <Input
                placeholder="Buscar por funcionário, local ou posto de trabalho..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full bg-seguranca-black border-gray-600 text-seguranca-lightgray focus:ring-seguranca-red"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as Schedule['status'] | 'all')}
              className="bg-seguranca-black border border-gray-600 rounded-md px-3 py-2 text-seguranca-lightgray focus:ring-seguranca-red w-full"
            >
              <option value="all">Todos os Status</option>
              <option value="PENDING">Pendente</option>
              <option value="CONFIRMED">Confirmada</option>
              <option value="COMPLETED">Concluída</option>
              <option value="CANCELLED">Cancelada</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={handleGeneratePDF}
              className="bg-seguranca-yellow hover:bg-yellow-600 text-seguranca-black"
            >
              <FileText className="h-4 w-4 mr-2" />
              Gerar Relatório PDF
            </Button>
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={isLoading}
              className="border-gray-600 text-seguranca-lightgray hover:bg-seguranca-black"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button 
              onClick={onCreate}
              className="bg-seguranca-red hover:bg-seguranca-darkred"
            >
              <Plus size={18} className="mr-2" /> 
              Nova Escala
            </Button>
          </div>
        </CardContent>
      </Card>
      {/* Tabela de Escalas */}
      <div className="rounded-md border border-gray-700 bg-seguranca-graphite">
        <Table>
          <TableHeader>
            <TableRow className="border-b-gray-700">
              <TableHead className="text-gray-400">Funcionário</TableHead>
              <TableHead className="text-gray-400">Localização</TableHead>
              <TableHead className="text-gray-400">Posto de Trabalho</TableHead>
              <TableHead className="text-gray-400">Data</TableHead>
              <TableHead className="text-gray-400">Turno</TableHead>
              <TableHead className="text-gray-400">Status</TableHead>
              <TableHead className="text-gray-400 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEscalas.map((escala) => {
              const status = getStatusProps(escala.status);
              const shift = getShiftProps(escala.shift);
              return (
                <TableRow 
                  key={escala.id} 
                  className="border-b-gray-700 hover:bg-seguranca-black/50"
                >
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 bg-seguranca-red/20 rounded-full flex items-center justify-center">
                        <User className="text-seguranca-red" size={18} />
                      </div>
                      <span className="font-medium text-seguranca-lightgray">{escala.employee?.name || '-'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                       <div className="w-9 h-9 bg-blue-500/20 rounded-full flex items-center justify-center">
                        <Building className="text-blue-400" size={18} />
                      </div>
                      <span className="text-gray-300">{escala.location?.name || '-'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 bg-green-500/20 rounded-full flex items-center justify-center">
                        <Building className="text-green-400" size={18} />
                      </div>
                      <div>
                        <div className="text-gray-300 font-medium">{escala.workPost?.name || '-'}</div>
                        {escala.workPost?.postCode && (
                          <div className="text-xs text-gray-400">{escala.workPost.postCode}</div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-300">{formatDate(escala.scheduleDate)}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {shift.icon}
                      <span className="text-gray-300">{shift.text}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={`${status.color} border border-current`}>{status.text}</Badge>
                  </TableCell>
                  <TableCell 
                    className="text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div 
                      className="flex items-center justify-end space-x-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('✏️ Botão Editar clicado para escala:', escala.id);
                          console.log('✏️ onEdit disponível?', typeof onEdit);
                          if (onEdit && typeof onEdit === 'function') {
                            console.log('✅ Chamando onEdit com escala:', escala);
                            onEdit(escala);
                            console.log('✅ onEdit chamado com sucesso');
                          } else {
                            console.error('❌ onEdit não está definido ou não é uma função!', onEdit);
                            toast({
                              title: 'Erro',
                              description: 'Função de edição não disponível.',
                              variant: 'destructive',
                            });
                          }
                        }}
                        title="Editar"
                        className="h-8 w-8 p-0 border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-white cursor-pointer"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('🗑️ Botão Excluir clicado para escala:', escala.id);
                          console.log('🗑️ Escala completa:', escala);
                          console.log('🗑️ onDelete disponível?', typeof onDelete);
                          console.log('🗑️ onDelete:', onDelete);
                          if (onDelete && typeof onDelete === 'function') {
                            console.log('✅ Chamando onDelete com escala:', escala);
                            try {
                              onDelete(escala);
                              console.log('✅ onDelete chamado com sucesso');
                            } catch (error) {
                              console.error('❌ Erro ao chamar onDelete:', error);
                              toast({
                                title: 'Erro',
                                description: 'Erro ao chamar função de exclusão.',
                                variant: 'destructive',
                              });
                            }
                          } else {
                            console.error('❌ onDelete não está definido ou não é uma função!', onDelete);
                            toast({
                              title: 'Erro',
                              description: 'Função de exclusão não disponível.',
                              variant: 'destructive',
                            });
                          }
                        }}
                        title="Excluir"
                        className="h-8 w-8 p-0 border-red-500 text-red-500 hover:bg-red-500 hover:text-white cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default EscalaTrabalhoTable;