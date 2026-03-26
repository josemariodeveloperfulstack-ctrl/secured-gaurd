import React, { useState, useEffect } from 'react';
import { 
  FileSignature, 
  Plus, 
  Search, 
  FileText, 
  CheckCircle, 
  XCircle, 
  MoreVertical,
  Calendar,
  Building2,
  Trash2,
  Download,
  AlertTriangle,
  ArrowLeft
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { acordoRecolhimentoService, AcordoRecolhimento as AcordoType } from '@/services/acordoRecolhimentoService';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import AcordoRecolhimentoModal from '@/components/compras/AcordoRecolhimentoModal';

const AcordoRecolhimentoPage: React.FC = () => {
  const [acordos, setAcordos] = useState<AcordoType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDENTE' | 'APROVADO' | 'REJEITADO'>('ALL');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAcordo, setSelectedAcordo] = useState<AcordoType | undefined>(undefined);
  
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const fetchAcordos = async () => {
    try {
      setLoading(true);
      const data = await acordoRecolhimentoService.getAll();
      setAcordos(data);
    } catch (error) {
      console.error('Erro ao buscar acordos:', error);
      toast({
        title: 'Erro!',
        description: 'Não foi possível carregar a lista de acordos.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAcordos();
  }, []);

  const handleApprove = async (id: string) => {
    if (!user?.id) return;
    try {
      await acordoRecolhimentoService.approve(id, user.id);
      toast({
        title: 'Sucesso!',
        description: 'Acordo de recolhimento aprovado.',
      });
      fetchAcordos();
    } catch (error) {
      toast({
        title: 'Erro!',
        description: 'Não foi possível aprovar o acordo.',
        variant: 'destructive',
      });
    }
  };

  const handleReject = async (id: string) => {
    if (!user?.id) return;
    try {
      await acordoRecolhimentoService.reject(id, user.id);
      toast({
        title: 'Sucesso!',
        description: 'Acordo de recolhimento rejeitado.',
      });
      fetchAcordos();
    } catch (error) {
      toast({
        title: 'Erro!',
        description: 'Não foi possível rejeitar o acordo.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este acordo?')) return;
    try {
      await acordoRecolhimentoService.delete(id);
      toast({
        title: 'Sucesso!',
        description: 'Acordo de recolhimento excluído.',
      });
      fetchAcordos();
    } catch (error) {
      toast({
        title: 'Erro!',
        description: 'Não foi possível excluir o acordo.',
        variant: 'destructive',
      });
    }
  };

  const filteredAcordos = acordos.filter(acordo => {
    const matchesSearch = 
      acordo.numeroAcordo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acordo.fornecedorNome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acordo.motivo.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'ALL' || acordo.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APROVADO':
        return <Badge className="bg-green-600 text-white hover:bg-green-700">Aprovado</Badge>;
      case 'REJEITADO':
        return <Badge variant="destructive">Rejeitado</Badge>;
      default:
        return <Badge className="bg-yellow-600 text-white hover:bg-yellow-700">Pendente</Badge>;
    }
  };

  if (loading && acordos.length === 0) {
    return (
      <div className="flex items-center justify-center p-20">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/compras')}
            className="text-seguranca-lightgray hover:text-seguranca-yellow"
          >
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileSignature className="text-seguranca-yellow" />
              Acordo de Recolhimento
            </h1>
            <p className="text-seguranca-lightgray">Gerencie acordos de devolução e recolhimento de materiais com fornecedores.</p>
          </div>
        </div>

        <Button 
          className="bg-seguranca-yellow text-black hover:bg-seguranca-yellow/90"
          onClick={() => {
            setSelectedAcordo(undefined);
            setIsModalOpen(true);
          }}
        >
          <Plus size={20} className="mr-2" />
          Novo Acordo
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-seguranca-graphite border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total de Acordos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{acordos.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-seguranca-graphite border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">
              {acordos.filter(a => a.status === 'PENDENTE').length}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-seguranca-graphite border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Aprovados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {acordos.filter(a => a.status === 'APROVADO').length}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-seguranca-graphite border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Rejeitados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {acordos.filter(a => a.status === 'REJEITADO').length}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <Input
            placeholder="Buscar por número, fornecedor ou motivo..."
            className="pl-10 bg-seguranca-graphite border-gray-700 text-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={statusFilter === 'ALL' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('ALL')}
            className={statusFilter === 'ALL' ? 'bg-seguranca-yellow text-black' : 'border-gray-700 text-gray-400'}
          >
            Todos
          </Button>
          <Button
            variant={statusFilter === 'PENDENTE' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('PENDENTE')}
            className={statusFilter === 'PENDENTE' ? 'bg-yellow-600 text-white' : 'border-gray-700 text-gray-400'}
          >
            Pendentes
          </Button>
          <Button
            variant={statusFilter === 'APROVADO' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('APROVADO')}
            className={statusFilter === 'APROVADO' ? 'bg-green-600 text-white' : 'border-gray-700 text-gray-400'}
          >
            Aprovados
          </Button>
        </div>
      </div>

      <div className="bg-seguranca-graphite rounded-lg border border-gray-700 overflow-hidden">
        <Table>
          <TableHeader className="bg-seguranca-black/50">
            <TableRow className="border-gray-700 hover:bg-transparent">
              <TableHead className="text-gray-300">Número</TableHead>
              <TableHead className="text-gray-300">Fornecedor</TableHead>
              <TableHead className="text-gray-300">Data</TableHead>
              <TableHead className="text-gray-300">Motivo</TableHead>
              <TableHead className="text-gray-300">Itens</TableHead>
              <TableHead className="text-gray-300">Status</TableHead>
              <TableHead className="text-right text-gray-300">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAcordos.length === 0 ? (
              <TableRow className="border-gray-700">
                <TableCell colSpan={7} className="text-center py-10 text-gray-400">
                  Nenhum acordo de recolhimento encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filteredAcordos.map((acordo) => (
                <TableRow key={acordo.id} className="border-gray-700 hover:bg-white/5 transition-colors">
                  <TableCell className="font-medium">{acordo.numeroAcordo}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{acordo.fornecedorNome}</span>
                      <span className="text-xs text-gray-500">{acordo.fornecedorCnpj}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-300">
                    {format(new Date(acordo.dataAcordo), 'dd/MM/yyyy', { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-gray-300 max-w-[200px] truncate">{acordo.motivo}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-seguranca-yellow border-seguranca-yellow/30">
                      {acordo.itens?.length || 0} itens
                    </Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(acordo.status || 'PENDENTE')}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-gray-700">
                          <MoreVertical size={16} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-seguranca-graphite border-gray-700 text-white">
                        <DropdownMenuItem 
                          className="hover:bg-gray-700 cursor-pointer"
                          onClick={() => {
                            setSelectedAcordo(acordo);
                            setIsModalOpen(true);
                          }}
                        >
                          <FileText className="mr-2 h-4 w-4" /> Detalhes / Editar
                        </DropdownMenuItem>
                        {acordo.status === 'PENDENTE' && (
                          <>
                            <DropdownMenuItem 
                              className="hover:bg-green-900/30 text-green-500 cursor-pointer"
                              onClick={() => handleApprove(acordo.id!)}
                            >
                              <CheckCircle className="mr-2 h-4 w-4" /> Aprovar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="hover:bg-red-900/30 text-red-500 cursor-pointer"
                              onClick={() => handleReject(acordo.id!)}
                            >
                              <XCircle className="mr-2 h-4 w-4" /> Rejeitar
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuItem className="hover:bg-gray-700 cursor-pointer">
                          <Download className="mr-2 h-4 w-4" /> Download PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="hover:bg-red-900/30 text-red-500 cursor-pointer"
                          onClick={() => handleDelete(acordo.id!)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AcordoRecolhimentoModal 
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedAcordo(undefined);
        }}
        onSuccess={fetchAcordos}
        acordo={selectedAcordo}
      />
    </div>
  );
};

export default AcordoRecolhimentoPage;
