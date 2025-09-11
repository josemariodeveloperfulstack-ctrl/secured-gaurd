import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Edit, 
  Trash2, 
  Eye, 
  Search, 
  Filter, 
  Download, 
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  Calendar
} from 'lucide-react';
import { ContaAPagar } from './ContasAPagarFormModal';
import { format, isAfter, isBefore, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';

interface ContasAPagarTableProps {
  contas: ContaAPagar[];
  onEdit: (conta: ContaAPagar) => void;
  onDelete: (id: string) => void;
  onView: (conta: ContaAPagar) => void;
  onRefresh: () => void;
  loading?: boolean;
}

export const ContasAPagarTable: React.FC<ContasAPagarTableProps> = ({
  contas,
  onEdit,
  onDelete,
  onView,
  onRefresh,
  loading = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [tipoFilter, setTipoFilter] = useState('');
  const [fornecedorFilter, setFornecedorFilter] = useState('');

  // Filtrar contas
  const contasFiltradas = contas.filter(conta => {
    const matchesSearch = 
      conta.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conta.fornecedor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conta.codigoBarras?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !statusFilter || conta.status === statusFilter;
    const matchesTipo = !tipoFilter || conta.tipo === tipoFilter;
    const matchesFornecedor = !fornecedorFilter || conta.fornecedor.toLowerCase().includes(fornecedorFilter.toLowerCase());

    return matchesSearch && matchesStatus && matchesTipo && matchesFornecedor;
  });

  // Calcular estatísticas
  const stats = {
    total: contas.length,
    abertas: contas.filter(c => c.status === 'ABERTA').length,
    vencidas: contas.filter(c => c.status === 'VENCIDA' || (c.status === 'ABERTA' && isBefore(c.vencimento, new Date()))).length,
    pagas: contas.filter(c => c.status === 'PAGA').length,
    totalValor: contas.reduce((sum, c) => sum + c.valor, 0),
    totalVencidas: contas.filter(c => c.status === 'VENCIDA' || (c.status === 'ABERTA' && isBefore(c.vencimento, new Date()))).reduce((sum, c) => sum + c.valor, 0),
    vencendoEm7Dias: contas.filter(c => c.status === 'ABERTA' && isAfter(c.vencimento, new Date()) && isBefore(c.vencimento, addDays(new Date(), 7))).length
  };

  const getStatusBadge = (status: string, vencimento: Date) => {
    // Verificar se está vencida
    if ((status === 'ABERTA' || status === 'ATRASADA') && isBefore(vencimento, new Date())) {
      return <Badge className="bg-seguranca-red text-white flex items-center gap-1">
        <AlertTriangle size={12} />
        Vencida
      </Badge>;
    }

    switch (status) {
      case 'PAGA':
        return <Badge className="bg-green-600 text-white flex items-center gap-1">
          <CheckCircle size={12} />
          Paga
        </Badge>;
      case 'ABERTA':
        return <Badge className="bg-seguranca-lightgray text-seguranca-black flex items-center gap-1">
          <Clock size={12} />
          Aberta
        </Badge>;
      case 'ATRASADA':
        return <Badge className="bg-seguranca-yellow text-seguranca-black flex items-center gap-1">
          <AlertTriangle size={12} />
          Atrasada
        </Badge>;
      case 'CANCELADA':
        return <Badge className="bg-seguranca-graphite text-seguranca-lightgray border border-gray-600 flex items-center gap-1">
          <XCircle size={12} />
          Cancelada
        </Badge>;
      default:
        return <Badge className="bg-seguranca-lightgray text-seguranca-black">{status}</Badge>;
    }
  };

  const getTipoBadge = (tipo: string) => {
    return tipo === 'FIXA' 
      ? <Badge className="bg-seguranca-yellow text-seguranca-black">Fixa</Badge>
      : <Badge className="bg-seguranca-graphite text-seguranca-lightgray">Variável</Badge>;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const isVencendoEmBreve = (vencimento: Date) => {
    const hoje = new Date();
    const em7Dias = addDays(hoje, 7);
    return isAfter(vencimento, hoje) && isBefore(vencimento, em7Dias);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">Carregando contas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card className="bg-seguranca-graphite border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-seguranca-lightgray">
            <Filter size={20} />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-seguranca-lightgray" size={16} />
              <Input
                placeholder="Buscar por descrição, fornecedor ou código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-gray-600 bg-seguranca-black text-seguranca-lightgray placeholder:text-gray-400 focus:border-seguranca-yellow focus:ring-seguranca-yellow"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="border-gray-600 bg-seguranca-black text-seguranca-lightgray focus:border-seguranca-yellow focus:ring-seguranca-yellow">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent className="bg-seguranca-black border-gray-600">
                <SelectItem value="all" className="text-seguranca-lightgray hover:bg-seguranca-graphite">Todos os status</SelectItem>
                <SelectItem value="ABERTA" className="text-seguranca-lightgray hover:bg-seguranca-graphite">Aberta</SelectItem>
                <SelectItem value="PAGA" className="text-seguranca-lightgray hover:bg-seguranca-graphite">Paga</SelectItem>
                <SelectItem value="ATRASADA" className="text-seguranca-lightgray hover:bg-seguranca-graphite">Atrasada</SelectItem>
                <SelectItem value="VENCIDA" className="text-seguranca-lightgray hover:bg-seguranca-graphite">Vencida</SelectItem>
                <SelectItem value="CANCELADA" className="text-seguranca-lightgray hover:bg-seguranca-graphite">Cancelada</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger className="border-gray-600 bg-seguranca-black text-seguranca-lightgray focus:border-seguranca-yellow focus:ring-seguranca-yellow">
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent className="bg-seguranca-black border-gray-600">
                <SelectItem value="all" className="text-seguranca-lightgray hover:bg-seguranca-graphite">Todos os tipos</SelectItem>
                <SelectItem value="FIXA" className="text-seguranca-lightgray hover:bg-seguranca-graphite">Despesa Fixa</SelectItem>
                <SelectItem value="VARIAVEL" className="text-seguranca-lightgray hover:bg-seguranca-graphite">Despesa Variável</SelectItem>
              </SelectContent>
            </Select>
            
            <Input
              placeholder="Filtrar por fornecedor"
              value={fornecedorFilter}
              onChange={(e) => setFornecedorFilter(e.target.value)}
              className="border-gray-600 bg-seguranca-black text-seguranca-lightgray placeholder:text-gray-400 focus:border-seguranca-yellow focus:ring-seguranca-yellow"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card className="bg-seguranca-graphite border-gray-700">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-seguranca-lightgray">Listagem de Contas a Pagar</CardTitle>
            <Button variant="outline" size="sm" className="border-gray-600 text-seguranca-lightgray hover:bg-seguranca-black hover:text-seguranca-yellow">
              <Download size={16} className="mr-2" />
              Exportar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700">
                  <TableHead className="text-seguranca-lightgray">Vencimento</TableHead>
                  <TableHead className="text-seguranca-lightgray">Fornecedor</TableHead>
                  <TableHead className="text-seguranca-lightgray">Descrição</TableHead>
                  <TableHead className="text-seguranca-lightgray">Tipo</TableHead>
                  <TableHead className="text-seguranca-lightgray">Valor</TableHead>
                  <TableHead className="text-seguranca-lightgray">Status</TableHead>
                  <TableHead className="text-seguranca-lightgray">Baixa</TableHead>
                  <TableHead className="text-seguranca-lightgray">Dt. Pagamento</TableHead>
                  <TableHead className="text-seguranca-lightgray">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contasFiltradas.map((conta) => (
                  <TableRow 
                    key={conta.id} 
                    className={`
                      ${isVencendoEmBreve(conta.vencimento) && conta.status === 'ABERTA' ? 'bg-seguranca-yellow/20' : ''}
                      ${isBefore(conta.vencimento, new Date()) && conta.status === 'ABERTA' ? 'bg-seguranca-red/20' : ''}
                    `}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {isVencendoEmBreve(conta.vencimento) && conta.status === 'ABERTA' && (
                          <AlertTriangle size={16} className="text-seguranca-yellow" />
                        )}
                        {isBefore(conta.vencimento, new Date()) && conta.status === 'ABERTA' && (
                          <AlertTriangle size={16} className="text-seguranca-red" />
                        )}
                        <span className={`
                          ${isBefore(conta.vencimento, new Date()) && conta.status === 'ABERTA' ? 'text-seguranca-red font-medium' : ''}
                          ${isVencendoEmBreve(conta.vencimento) && conta.status === 'ABERTA' ? 'text-seguranca-yellow' : ''}
                        `}>
                          {format(conta.vencimento, 'dd/MM/yyyy', { locale: ptBR })}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-seguranca-lightgray">{conta.fornecedor}</TableCell>
                    <TableCell className="text-seguranca-lightgray">
                      <div className="max-w-xs truncate" title={conta.descricao}>
                        {conta.descricao}
                      </div>
                    </TableCell>
                    <TableCell>{getTipoBadge(conta.tipo)}</TableCell>
                    <TableCell className="font-semibold text-seguranca-lightgray">{formatCurrency(conta.valor)}</TableCell>
                    <TableCell>{getStatusBadge(conta.status, conta.vencimento)}</TableCell>
                    <TableCell>
                      {conta.baixa ? (
                        <CheckCircle size={16} className="text-green-600" />
                      ) : (
                        <XCircle size={16} className="text-seguranca-lightgray" />
                      )}
                    </TableCell>
                    <TableCell className="text-seguranca-lightgray">
                      {conta.dataPagamento ? format(conta.dataPagamento, 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => {
                            console.log('Botão de visualização clicado para conta:', conta);
                            onView(conta);
                          }} 
                          className="text-seguranca-lightgray hover:text-seguranca-yellow"
                        >
                          <Eye size={16} />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => onEdit(conta)} className="text-seguranca-lightgray hover:text-seguranca-yellow">
                          <Edit size={16} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => onDelete(conta.id!)}
                          className="text-seguranca-red hover:text-red-700"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {contasFiltradas.length === 0 && (
              <div className="text-center py-8">
                <p className="text-seguranca-lightgray">Nenhuma conta encontrada com os filtros aplicados.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};