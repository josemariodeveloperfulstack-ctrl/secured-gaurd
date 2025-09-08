import React, { useState } from 'react';
import { StandardLayout } from '@/components/StandardLayout';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Edit, Trash2, Shield, Clock, DollarSign } from 'lucide-react';
import { useAOS } from '@/hooks/use-aos';

interface Servico {
  id: number;
  nome: string;
  descricao: string;
  valor_hora: number | null;
  valor_mensal: number | null;
  status: 'ativo' | 'inativo';
  tipo: 'vigilancia' | 'escolta' | 'eletronico' | 'outro';
}

const mockServicos: Servico[] = [
  { 
    id: 1, 
    nome: "Vigilância 24h", 
    descricao: "Serviço de vigilância 24 horas com plantão completo", 
    valor_hora: 35.00, 
    valor_mensal: 25200.00,
    status: 'ativo',
    tipo: 'vigilancia'
  },
  { 
    id: 2, 
    nome: "Vigilância Diurna", 
    descricao: "Serviço de vigilância diurna (12h) - 6h às 18h", 
    valor_hora: 30.00, 
    valor_mensal: 10800.00,
    status: 'ativo',
    tipo: 'vigilancia'
  },
  { 
    id: 3, 
    nome: "Vigilância Noturna", 
    descricao: "Serviço de vigilância noturna (12h) - 18h às 6h", 
    valor_hora: 40.00, 
    valor_mensal: 14400.00,
    status: 'ativo',
    tipo: 'vigilancia'
  },
  { 
    id: 4, 
    nome: "Escolta Armada", 
    descricao: "Serviço de escolta para transporte de valores e cargas", 
    valor_hora: 60.00, 
    valor_mensal: null,
    status: 'ativo',
    tipo: 'escolta'
  },
  { 
    id: 5, 
    nome: "Vigilância Eletrônica", 
    descricao: "Monitoramento por câmeras, alarmes e sistema de segurança", 
    valor_hora: null, 
    valor_mensal: 2000.00,
    status: 'ativo',
    tipo: 'eletronico'
  },
  { 
    id: 6, 
    nome: "Vigilância Eventos", 
    descricao: "Serviço especializado para eventos e shows", 
    valor_hora: 45.00, 
    valor_mensal: null,
    status: 'inativo',
    tipo: 'outro'
  },
];

const Servicos = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ativo' | 'inativo'>('all');
  const [tipoFilter, setTipoFilter] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const aos = useAOS();

  const filteredServicos = mockServicos.filter(servico => {
    const matchesSearch = servico.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         servico.descricao.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || servico.status === statusFilter;
    const matchesTipo = tipoFilter === 'all' || servico.tipo === tipoFilter;
    
    return matchesSearch && matchesStatus && matchesTipo;
  });

  const formatCurrency = (value: number | null) => {
    if (value === null) return '—';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const getStatusColor = (status: string) => {
    return status === 'ativo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'vigilancia': return <Shield size={16} />;
      case 'escolta': return <Shield size={16} />;
      case 'eletronico': return <Clock size={16} />;
      default: return <Shield size={16} />;
    }
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'vigilancia': return 'bg-blue-100 text-blue-800';
      case 'escolta': return 'bg-purple-100 text-purple-800';
      case 'eletronico': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTipoText = (tipo: string) => {
    switch (tipo) {
      case 'vigilancia': return 'Vigilância';
      case 'escolta': return 'Escolta';
      case 'eletronico': return 'Eletrônico';
      default: return 'Outro';
    }
  };

  const tipos = Array.from(new Set(mockServicos.map(s => s.tipo)));

  return (
    <StandardLayout 
      title="Serviços"
      subtitle={`${filteredServicos.length} serviço${filteredServicos.length !== 1 ? 's' : ''} encontrado${filteredServicos.length !== 1 ? 's' : ''}`}
    >
      <div className="space-y-6">
        {/* Filtros */}
        <Card className="bg-seguranca-graphite border-gray-600" data-aos={aos.fadeUp}>
          <CardHeader>
            <CardTitle className="text-seguranca-lightgray">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <Input
                  placeholder="Buscar serviços..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                />
              </div>
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-seguranca-black border border-gray-600 rounded-md px-3 py-2 text-seguranca-lightgray"
              >
                <option value="all">Todos os status</option>
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
              
              <select
                value={tipoFilter}
                onChange={(e) => setTipoFilter(e.target.value)}
                className="bg-seguranca-black border border-gray-600 rounded-md px-3 py-2 text-seguranca-lightgray"
              >
                <option value="all">Todos os tipos</option>
                {tipos.map(tipo => (
                  <option key={tipo} value={tipo}>{getTipoText(tipo)}</option>
                ))}
              </select>
              
              <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-seguranca-red hover:bg-seguranca-darkred">
                    <Plus size={20} className="mr-2" />
                    Novo Serviço
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px] bg-seguranca-graphite border-gray-600">
                  <DialogHeader>
                    <DialogTitle className="text-seguranca-lightgray">Adicionar Novo Serviço</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="flex flex-col gap-2">
                      <label htmlFor="nome" className="text-seguranca-lightgray">Nome do Serviço</label>
                      <Input 
                        id="nome" 
                        placeholder="Nome do serviço" 
                        className="bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                      />
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <label htmlFor="descricao" className="text-seguranca-lightgray">Descrição</label>
                      <Input 
                        id="descricao" 
                        placeholder="Descrição do serviço" 
                        className="bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                        <label htmlFor="valor_hora" className="text-seguranca-lightgray">Valor por Hora</label>
                        <Input 
                          id="valor_hora" 
                          placeholder="R$ 0,00" 
                          className="bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label htmlFor="valor_mensal" className="text-seguranca-lightgray">Valor Mensal</label>
                        <Input 
                          id="valor_mensal" 
                          placeholder="R$ 0,00" 
                          className="bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-end gap-2 mt-4">
                      <Button 
                        variant="outline" 
                        onClick={() => setModalOpen(false)}
                        className="border-gray-600 text-seguranca-lightgray hover:bg-seguranca-black"
                      >
                        Cancelar
                      </Button>
                      <Button className="bg-seguranca-red hover:bg-seguranca-darkred">
                        Salvar Serviço
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Serviços */}
        <Card className="bg-seguranca-graphite border-gray-600" data-aos={aos.fadeUp} data-aos-delay="100">
          <CardHeader>
            <CardTitle className="text-seguranca-lightgray">Lista de Serviços</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-600">
                  <TableHead className="text-seguranca-lightgray">Nome</TableHead>
                  <TableHead className="text-seguranca-lightgray">Descrição</TableHead>
                  <TableHead className="text-seguranca-lightgray">Tipo</TableHead>
                  <TableHead className="text-seguranca-lightgray">Valor por Hora</TableHead>
                  <TableHead className="text-seguranca-lightgray">Valor Mensal</TableHead>
                  <TableHead className="text-seguranca-lightgray">Status</TableHead>
                  <TableHead className="text-right text-seguranca-lightgray">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredServicos.map((servico, index) => (
                  <TableRow 
                    key={servico.id} 
                    className="border-gray-600 hover:bg-seguranca-black transition-colors"
                    data-aos={aos.fadeUp}
                    data-aos-delay={index * 50}
                  >
                    <TableCell className="font-medium text-seguranca-lightgray">{servico.nome}</TableCell>
                    <TableCell className="text-seguranca-lightgray max-w-xs truncate">{servico.descricao}</TableCell>
                    <TableCell>
                      <Badge className={getTipoColor(servico.tipo)}>
                        <div className="flex items-center space-x-1">
                          {getTipoIcon(servico.tipo)}
                          <span>{getTipoText(servico.tipo)}</span>
                        </div>
                      </Badge>
                    </TableCell>
                    <TableCell className="text-seguranca-lightgray">
                      {servico.valor_hora ? (
                        <div className="flex items-center space-x-1">
                          <DollarSign size={16} className="text-seguranca-yellow" />
                          <span>{formatCurrency(servico.valor_hora)}</span>
                        </div>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-seguranca-lightgray">
                      {servico.valor_mensal ? (
                        <div className="flex items-center space-x-1">
                          <DollarSign size={16} className="text-seguranca-yellow" />
                          <span>{formatCurrency(servico.valor_mensal)}</span>
                        </div>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(servico.status)}>
                        {servico.status === 'ativo' ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="border-gray-600 text-seguranca-lightgray hover:bg-seguranca-black"
                        >
                          <Edit size={16} className="mr-1" />
                          Editar
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="border-red-500 text-red-500 hover:bg-red-50"
                        >
                          <Trash2 size={16} className="mr-1" />
                          Excluir
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {filteredServicos.length === 0 && (
          <Card className="bg-seguranca-graphite border-gray-600" data-aos={aos.fadeUp}>
            <CardContent className="p-8 text-center">
              <Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-seguranca-lightgray mb-2">Nenhum serviço encontrado</h3>
              <p className="text-seguranca-lightgray">Tente ajustar os filtros de busca ou adicionar um novo serviço.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </StandardLayout>
  );
};

export default Servicos;
