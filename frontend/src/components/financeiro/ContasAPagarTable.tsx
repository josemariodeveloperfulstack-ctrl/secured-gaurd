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
  onMarkAsPaid: (id: string, dataPagamento: Date) => void;
  loading?: boolean;
}

export const ContasAPagarTable: React.FC<ContasAPagarTableProps> = ({
  contas,
  onEdit,
  onDelete,
  onView,
  onMarkAsPaid,
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
      return <Badge variant="destructive" className="flex items-center gap-1">
        <AlertTriangle size={12} />
        Vencida
      </Badge>;
    }

    switch (status) {
      case 'PAGA':
        return <Badge variant="default" className="bg-green-600 flex items-center gap-1">
          <CheckCircle size={12} />
          Paga
        </Badge>;
      case 'ABERTA':
        return <Badge variant="secondary" className="flex items-center gap-1">
          <Clock size={12} />
          Aberta
        </Badge>;
      case 'ATRASADA':
        return <Badge variant="destructive" className="flex items-center gap-1">
          <AlertTriangle size={12} />
          Atrasada
        </Badge>;
      case 'CANCELADA':
        return <Badge variant="outline" className="flex items-center gap-1">
          <XCircle size={12} />
          Cancelada
        </Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getTipoBadge = (tipo: string) => {
    return tipo === 'FIXA' 
      ? <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Fixa</Badge>
      : <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Variável</Badge>;
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter size={20} />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <Input
                placeholder="Buscar por descrição, fornecedor ou código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="ABERTA">Aberta</SelectItem>
                <SelectItem value="PAGA">Paga</SelectItem>
                <SelectItem value="ATRASADA">Atrasada</SelectItem>
                <SelectItem value="VENCIDA">Vencida</SelectItem>
                <SelectItem value="CANCELADA">Cancelada</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="FIXA">Despesa Fixa</SelectItem>
                <SelectItem value="VARIAVEL">Despesa Variável</SelectItem>
              </SelectContent>
            </Select>
            
            <Input
              placeholder="Filtrar por fornecedor"
              value={fornecedorFilter}
              onChange={(e) => setFornecedorFilter(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Contas a Pagar ({contasFiltradas.length})</CardTitle>
            <Button variant="outline" size="sm">
              <Download size={16} className="mr-2" />
              Exportar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Baixa</TableHead>
                  <TableHead>Dt. Pagamento</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contasFiltradas.map((conta) => (
                  <TableRow 
                    key={conta.id} 
                    className={`
                      ${isVencendoEmBreve(conta.vencimento) && conta.status === 'ABERTA' ? 'bg-yellow-50' : ''}
                      ${isBefore(conta.vencimento, new Date()) && conta.status === 'ABERTA' ? 'bg-red-50' : ''}
                    `}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {isVencendoEmBreve(conta.vencimento) && conta.status === 'ABERTA' && (
                          <AlertTriangle size={16} className="text-yellow-600" />
                        )}
                        {isBefore(conta.vencimento, new Date()) && conta.status === 'ABERTA' && (
                          <AlertTriangle size={16} className="text-red-600" />
                        )}
                        <span className={`
                          ${isBefore(conta.vencimento, new Date()) && conta.status === 'ABERTA' ? 'text-red-600 font-medium' : ''}
                          ${isVencendoEmBreve(conta.vencimento) && conta.status === 'ABERTA' ? 'text-yellow-600' : ''}
                        `}>
                          {format(conta.vencimento, 'dd/MM/yyyy', { locale: ptBR })}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{conta.fornecedor}</TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate" title={conta.descricao}>
                        {conta.descricao}
                      </div>
                    </TableCell>
                    <TableCell>{getTipoBadge(conta.tipo)}</TableCell>
                    <TableCell className="font-semibold">{formatCurrency(conta.valor)}</TableCell>
                    <TableCell>{getStatusBadge(conta.status, conta.vencimento)}</TableCell>
                    <TableCell>
                      {conta.baixa ? (
                        <CheckCircle size={16} className="text-green-600" />
                      ) : (
                        <XCircle size={16} className="text-gray-400" />
                      )}
                    </TableCell>
                    <TableCell>
                      {conta.dataPagamento ? format(conta.dataPagamento, 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => onView(conta)}>
                          <Eye size={16} />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => onEdit(conta)}>
                          <Edit size={16} />
                        </Button>
                        {conta.status === 'ABERTA' && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => onMarkAsPaid(conta.id!, new Date())}
                            className="text-green-600 hover:text-green-700"
                          >
                            <CheckCircle size={16} />
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => onDelete(conta.id!)}
                          className="text-red-600 hover:text-red-700"
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
                <p className="text-gray-500">Nenhuma conta encontrada com os filtros aplicados.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};