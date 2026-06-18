import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import {
  commercialDashboardService, TeamKpis, VendedorRanking, ExpiringContract
} from '@/services/commercialDashboardService';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import {
  Trophy, Users, TrendingUp, DollarSign, FileText,
  Loader2, AlertTriangle, Target
} from 'lucide-react';

const COLORS = ['#ffd600', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6', '#f59e0b', '#06b6d4'];

export default function TeamDashboard() {
  const { toast } = useToast();
  const [teamKpis, setTeamKpis] = useState<TeamKpis | null>(null);
  const [ranking, setRanking] = useState<VendedorRanking[]>([]);
  const [pipeline, setPipeline] = useState<Record<string, number>>({});
  const [revenueBySegment, setRevenueBySegment] = useState<{ segmentos: Record<string, number>; total: number } | null>(null);
  const [expiringContracts, setExpiringContracts] = useState<ExpiringContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [periodo, setPeriodo] = useState('12');
  const [orderBy, setOrderBy] = useState('revenue');
  const [expiringDays, setExpiringDays] = useState('90');

  useEffect(() => {
    loadData();
  }, [periodo, orderBy, expiringDays]);

  const loadData = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const endDate = new Date().toISOString().split('T')[0];
      const start = new Date();
      start.setMonth(start.getMonth() - parseInt(periodo));
      const startDate = start.toISOString().split('T')[0];
      const filters = { startDate, endDate };

      const teamData = await commercialDashboardService.getTeamKpis(filters);
      setTeamKpis(teamData);

      const rankingData = await commercialDashboardService.getRanking({ ...filters, orderBy });
      setRanking(rankingData);

      const pipelineData = await commercialDashboardService.getPipeline();
      setPipeline(pipelineData);

      const segmentData = await commercialDashboardService.getRevenueBySegment(filters).catch(() => null);
      setRevenueBySegment(segmentData);

      const contractsData = await commercialDashboardService.getExpiringContracts(parseInt(expiringDays)).catch(() => []);
      setExpiringContracts(contractsData);
    } catch (error) {
      console.error('Erro ao carregar dashboard de equipe:', error);
      setLoadError('Falha ao carregar dados da equipe. Tente novamente.');
      toast({ title: 'Erro', description: 'Falha ao carregar dados da equipe.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-seguranca-yellow" />
        <span className="ml-3 text-gray-400">Carregando dados da equipe...</span>
      </div>
    );
  }

  if (!teamKpis) {
    return (
      <div className="text-center py-10 space-y-3">
        <p className="text-gray-400">{loadError || 'Nenhum dado disponível.'}</p>
        {loadError && (
          <button
            type="button"
            onClick={() => loadData()}
            className="text-sm text-seguranca-yellow hover:underline"
          >
            Tentar novamente
          </button>
        )}
      </div>
    );
  }

  // Preparar dados de gráficos
  const pipelineData = Object.entries(pipeline).map(([name, value]) => ({ name, value }));

  const segmentData = revenueBySegment?.segmentos
    ? Object.entries(revenueBySegment.segmentos)
        .map(([name, value]) => ({ name, value: Number(value) }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8)
    : [];

  const rankingChartData = ranking.slice(0, 10).map(r => ({
    name: r.userName.split(' ').slice(0, 2).join(' '),
    receita: Number(r.receita),
    conversao: r.taxaConversao,
  }));

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={periodo} onValueChange={setPeriodo}>
          <SelectTrigger className="w-[180px] bg-seguranca-black border-gray-600 text-seguranca-lightgray">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-seguranca-graphite border-gray-600">
            <SelectItem value="1" className="text-seguranca-lightgray">Ultimo mes</SelectItem>
            <SelectItem value="3" className="text-seguranca-lightgray">Ultimos 3 meses</SelectItem>
            <SelectItem value="6" className="text-seguranca-lightgray">Ultimos 6 meses</SelectItem>
            <SelectItem value="12" className="text-seguranca-lightgray">Ultimos 12 meses</SelectItem>
          </SelectContent>
        </Select>

        <Select value={orderBy} onValueChange={setOrderBy}>
          <SelectTrigger className="w-[180px] bg-seguranca-black border-gray-600 text-seguranca-lightgray">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-seguranca-graphite border-gray-600">
            <SelectItem value="revenue" className="text-seguranca-lightgray">Ordenar por Receita</SelectItem>
            <SelectItem value="conversion" className="text-seguranca-lightgray">Ordenar por Conversao</SelectItem>
            <SelectItem value="contracts" className="text-seguranca-lightgray">Ordenar por Contratos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Cards resumo da equipe */}
      {teamKpis && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-seguranca-graphite border-gray-600">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Receita Total</p>
                  <p className="text-xl font-bold text-green-400">{formatCurrency(teamKpis.receitaTotal)}</p>
                </div>
                <DollarSign className="h-6 w-6 text-green-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-seguranca-graphite border-gray-600">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Total de Leads</p>
                  <p className="text-xl font-bold text-blue-400">{teamKpis.totalLeads}</p>
                </div>
                <Users className="h-6 w-6 text-blue-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-seguranca-graphite border-gray-600">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Conversao Geral</p>
                  <p className="text-xl font-bold text-seguranca-yellow">{teamKpis.taxaConversaoGeral}%</p>
                </div>
                <TrendingUp className="h-6 w-6 text-seguranca-yellow" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-seguranca-graphite border-gray-600">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Contratos Ativos</p>
                  <p className="text-xl font-bold text-cyan-400">{teamKpis.contratosAtivos}</p>
                </div>
                <Target className="h-6 w-6 text-cyan-400" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ranking de Vendedores */}
        <Card className="bg-seguranca-graphite border-gray-600">
          <CardHeader>
            <CardTitle className="text-seguranca-lightgray flex items-center gap-2">
              <Trophy className="h-5 w-5 text-seguranca-yellow" />
              Ranking de Vendedores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-600">
                    <TableHead className="text-gray-400">#</TableHead>
                    <TableHead className="text-gray-400">Vendedor</TableHead>
                    <TableHead className="text-gray-400 text-right">Receita</TableHead>
                    <TableHead className="text-gray-400 text-right">Conv.</TableHead>
                    <TableHead className="text-gray-400 text-right">Propostas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ranking.slice(0, 10).map((r) => (
                    <TableRow key={r.userId} className="border-gray-700">
                      <TableCell className="text-seguranca-lightgray font-bold">
                        {r.posicao <= 3 ? (
                          <Badge className={r.posicao === 1 ? 'bg-yellow-500' : r.posicao === 2 ? 'bg-gray-400' : 'bg-amber-700'}>
                            {r.posicao}
                          </Badge>
                        ) : r.posicao}
                      </TableCell>
                      <TableCell className="text-seguranca-lightgray">{r.userName}</TableCell>
                      <TableCell className="text-green-400 text-right">{formatCurrency(r.receita)}</TableCell>
                      <TableCell className="text-seguranca-yellow text-right">{r.taxaConversao}%</TableCell>
                      <TableCell className="text-blue-400 text-right">{r.propostasAprovadas}/{r.propostasEnviadas}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Receita por Vendedor */}
        <Card className="bg-seguranca-graphite border-gray-600">
          <CardHeader>
            <CardTitle className="text-seguranca-lightgray flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-400" />
              Receita por Vendedor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={rankingChartData} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" stroke="#9ca3af" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" stroke="#9ca3af" width={100} fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', color: '#e5e7eb' }}
                  formatter={(value: number) => [formatCurrency(value), 'Receita']}
                />
                <Bar dataKey="receita" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pipeline */}
        <Card className="bg-seguranca-graphite border-gray-600">
          <CardHeader>
            <CardTitle className="text-seguranca-lightgray flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-400" />
              Pipeline Geral
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={pipelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9ca3af" fontSize={10} angle={-20} textAnchor="end" height={60} />
                <YAxis stroke="#9ca3af" />
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', color: '#e5e7eb' }} />
                <Bar dataKey="value" name="Leads" radius={[4, 4, 0, 0]}>
                  {pipelineData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Receita por Segmento */}
        <Card className="bg-seguranca-graphite border-gray-600">
          <CardHeader>
            <CardTitle className="text-seguranca-lightgray flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-400" />
              Receita por Cliente
            </CardTitle>
          </CardHeader>
          <CardContent>
            {segmentData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={segmentData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name.substring(0, 15)}${name.length > 15 ? '...' : ''} (${(percent * 100).toFixed(0)}%)`}>
                    {segmentData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', color: '#e5e7eb' }}
                    formatter={(value: number) => [formatCurrency(value), 'Receita']}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-400 text-center py-10">Nenhum dado de receita por segmento.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Contratos a Vencer */}
      <Card className="bg-seguranca-graphite border-gray-600">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-seguranca-lightgray flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-400" />
              Contratos a Vencer
            </CardTitle>
            <Select value={expiringDays} onValueChange={setExpiringDays}>
              <SelectTrigger className="w-[140px] bg-seguranca-black border-gray-600 text-seguranca-lightgray">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-seguranca-graphite border-gray-600">
                <SelectItem value="30" className="text-seguranca-lightgray">30 dias</SelectItem>
                <SelectItem value="60" className="text-seguranca-lightgray">60 dias</SelectItem>
                <SelectItem value="90" className="text-seguranca-lightgray">90 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {expiringContracts.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-600">
                    <TableHead className="text-gray-400">Contrato</TableHead>
                    <TableHead className="text-gray-400">Cliente</TableHead>
                    <TableHead className="text-gray-400">Vencimento</TableHead>
                    <TableHead className="text-gray-400 text-right">Valor</TableHead>
                    <TableHead className="text-gray-400 text-right">Dias</TableHead>
                    <TableHead className="text-gray-400">Urgencia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expiringContracts.map((c) => (
                    <TableRow key={c.id} className="border-gray-700">
                      <TableCell className="text-seguranca-lightgray">{c.contractNumber}</TableCell>
                      <TableCell className="text-seguranca-lightgray">{c.clientName}</TableCell>
                      <TableCell className="text-gray-400">{c.endDate ? new Date(c.endDate).toLocaleDateString('pt-BR') : '-'}</TableCell>
                      <TableCell className="text-green-400 text-right">{formatCurrency(c.value)}</TableCell>
                      <TableCell className="text-seguranca-yellow text-right">{c.diasRestantes}</TableCell>
                      <TableCell>
                        <Badge className={
                          c.urgencia === 'URGENTE' ? 'bg-red-600' :
                          c.urgencia === 'ATENÇÃO' ? 'bg-yellow-600' : 'bg-green-600'
                        }>
                          {c.urgencia}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-gray-400 text-center py-6">Nenhum contrato a vencer nos proximos {expiringDays} dias.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
