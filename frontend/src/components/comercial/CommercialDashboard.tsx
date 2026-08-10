import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { commercialDashboardService, CommercialKpis } from '@/services/commercialDashboardService';
import { salesGoalService, SalesGoal } from '@/services/salesGoalService';
import { userService } from '@/services/userService';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell
} from 'recharts';
import {
  TrendingUp, Users, FileText, DollarSign, Clock, Target,
  BarChart3, Loader2, CheckCircle, ArrowUpRight
} from 'lucide-react';

interface Props {
  className?: string;
}

const FUNIL_COLORS = ['#ffd600', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6'];

export default function CommercialDashboard({ className }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [kpis, setKpis] = useState<CommercialKpis | null>(null);
  const [goals, setGoals] = useState<SalesGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [periodo, setPeriodo] = useState('12'); // meses
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>(undefined);
  const [usersList, setUsersList] = useState<{ id: string; name: string }[]>([]);

  const isGestorOrAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'GESTOR';

  useEffect(() => {
    loadData();
  }, [periodo, selectedUserId]);

  useEffect(() => {
    if (!isGestorOrAdmin) return;
    void loadUsers();
  }, [isGestorOrAdmin]);

  const loadUsers = async () => {
    try {
      const data = await userService.getUsersForSelect();
      setUsersList(data.map((u) => ({ id: u.id, name: u.name || u.username })));
    } catch { /* ignore — filtro de vendedor é opcional */ }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const endDate = new Date().toISOString().split('T')[0];
      const start = new Date();
      start.setMonth(start.getMonth() - parseInt(periodo));
      const startDate = start.toISOString().split('T')[0];

      const userId = isGestorOrAdmin
        ? (selectedUserId || undefined)
        : (user as any)?.id;

      const kpisData = await commercialDashboardService.getKpis({ userId, startDate, endDate }).catch(() => null);
      if (kpisData) {
        setKpis(kpisData);
      } else {
        setKpis({
          leadsRecebidos: 0,
          leadsQualificados: 0,
          propostasEnviadas: 0,
          propostasAprovadas: 0,
          taxaConversao: 0,
          ticketMedio: 0,
          receitaContratada: 0,
          tempoMedioFechamentoDias: 0,
          contratosAtivos: 0,
          leadsPorMes: {},
          receitaPorMes: {},
          conversaoPorMes: {},
          funilVendas: { Leads: 0, Qualificados: 0, Propostas: 0, Aprovadas: 0, Contratos: 0 },
          periodo: `${startDate} a ${endDate}`,
          contratosVencendo: 0,
          propostasEnviadasReal: 0,
          propostasRetornadas: 0,
        });
      }

      const goalsData = await salesGoalService
        .getProgress(new Date().getMonth() + 1, new Date().getFullYear())
        .catch(() => []);
      setGoals(goalsData);
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
      setKpis({
        leadsRecebidos: 0,
        leadsQualificados: 0,
        propostasEnviadas: 0,
        propostasAprovadas: 0,
        taxaConversao: 0,
        ticketMedio: 0,
        receitaContratada: 0,
        tempoMedioFechamentoDias: 0,
        contratosAtivos: 0,
        leadsPorMes: {},
        receitaPorMes: {},
        conversaoPorMes: {},
        funilVendas: { Leads: 0, Qualificados: 0, Propostas: 0, Aprovadas: 0, Contratos: 0 },
        periodo: '',
      });
      setLoadError(null);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-seguranca-yellow" />
        <span className="ml-3 text-gray-400">Carregando dashboard...</span>
      </div>
    );
  }

  if (!kpis) {
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

  // Preparar dados dos gráficos
  const funilData = kpis.funilVendas
    ? Object.entries(kpis.funilVendas).map(([name, value]) => ({ name, value }))
    : [];

  const receitaMesData = kpis.receitaPorMes
    ? Object.entries(kpis.receitaPorMes).map(([mes, valor]) => ({ mes, valor: Number(valor) }))
    : [];

  const conversaoMesData = kpis.conversaoPorMes
    ? Object.entries(kpis.conversaoPorMes).map(([mes, valor]) => ({ mes, valor }))
    : [];

  const leadsMesData = kpis.leadsPorMes
    ? Object.entries(kpis.leadsPorMes).map(([mes, valor]) => ({ mes, valor }))
    : [];

  // Metas x Realizado
  const metasData = goals.map(g => ({
    name: g.userName || (g.type === 'REVENUE' ? 'Receita' : 'Contratos'),
    meta: Number(g.targetValue),
    realizado: Number(g.currentValue),
    progresso: g.progressPercent,
  }));

  return (
    <div className={`space-y-6 ${className || ''}`}>
      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={periodo} onValueChange={setPeriodo}>
          <SelectTrigger className="w-[180px] bg-seguranca-black border-gray-600 text-seguranca-lightgray">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent className="bg-seguranca-graphite border-gray-600">
            <SelectItem value="1" className="text-seguranca-lightgray">Último mês</SelectItem>
            <SelectItem value="3" className="text-seguranca-lightgray">Últimos 3 meses</SelectItem>
            <SelectItem value="6" className="text-seguranca-lightgray">Últimos 6 meses</SelectItem>
            <SelectItem value="12" className="text-seguranca-lightgray">Últimos 12 meses</SelectItem>
          </SelectContent>
        </Select>

        {isGestorOrAdmin && (
          <Select value={selectedUserId || 'all'} onValueChange={(v) => setSelectedUserId(v === 'all' ? undefined : v)}>
            <SelectTrigger className="w-[220px] bg-seguranca-black border-gray-600 text-seguranca-lightgray">
              <SelectValue placeholder="Todos os vendedores" />
            </SelectTrigger>
            <SelectContent className="bg-seguranca-graphite border-gray-600 max-h-[300px]">
              <SelectItem value="all" className="text-seguranca-lightgray">Todos os vendedores</SelectItem>
              {usersList.map(u => (
                <SelectItem key={u.id} value={u.id} className="text-seguranca-lightgray">{u.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Cards de KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <KpiCard icon={<Users className="h-5 w-5" />} label="Leads Recebidos" value={kpis.leadsRecebidos} color="text-blue-400" />
        <KpiCard icon={<CheckCircle className="h-5 w-5" />} label="Leads Qualificados" value={kpis.leadsQualificados} color="text-emerald-400" />
        <KpiCard icon={<FileText className="h-5 w-5" />} label="Propostas Enviadas" value={kpis.propostasEnviadas} color="text-amber-400" />
        <KpiCard icon={<ArrowUpRight className="h-5 w-5" />} label="Propostas Aprovadas" value={kpis.propostasAprovadas} color="text-green-400" />
        <KpiCard icon={<TrendingUp className="h-5 w-5" />} label="Taxa de Conversão" value={`${kpis.taxaConversao}%`} color="text-seguranca-yellow" />
        <KpiCard icon={<DollarSign className="h-5 w-5" />} label="Ticket Médio" value={formatCurrency(kpis.ticketMedio)} color="text-purple-400" />
        <KpiCard icon={<DollarSign className="h-5 w-5" />} label="Receita Contratada" value={formatCurrency(kpis.receitaContratada)} color="text-green-500" />
        <KpiCard icon={<Clock className="h-5 w-5" />} label="Tempo Médio (dias)" value={kpis.tempoMedioFechamentoDias} color="text-orange-400" />
        <KpiCard icon={<Target className="h-5 w-5" />} label="Contratos Ativos" value={kpis.contratosAtivos} color="text-cyan-400" />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Funil de Vendas */}
        <Card className="bg-seguranca-graphite border-gray-600">
          <CardHeader>
            <CardTitle className="text-seguranca-lightgray flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-seguranca-yellow" />
              Funil de Vendas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={funilData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" stroke="#9ca3af" />
                <YAxis type="category" dataKey="name" stroke="#9ca3af" width={100} />
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', color: '#e5e7eb' }} />
                <Bar dataKey="value" name="Quantidade">
                  {funilData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={FUNIL_COLORS[index % FUNIL_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Receita por Mês */}
        <Card className="bg-seguranca-graphite border-gray-600">
          <CardHeader>
            <CardTitle className="text-seguranca-lightgray flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-400" />
              Receita por Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={receitaMesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="mes" stroke="#9ca3af" fontSize={11} />
                <YAxis stroke="#9ca3af" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', color: '#e5e7eb' }}
                  formatter={(value: number) => [formatCurrency(value), 'Receita']}
                />
                <Bar dataKey="valor" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Conversão por Mês */}
        <Card className="bg-seguranca-graphite border-gray-600">
          <CardHeader>
            <CardTitle className="text-seguranca-lightgray flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-seguranca-yellow" />
              Taxa de Conversão (%)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={conversaoMesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="mes" stroke="#9ca3af" fontSize={11} />
                <YAxis stroke="#9ca3af" unit="%" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', color: '#e5e7eb' }}
                  formatter={(value: number) => [`${value}%`, 'Conversão']}
                />
                <Line type="monotone" dataKey="valor" stroke="#ffd600" strokeWidth={2} dot={{ fill: '#ffd600', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Leads por Mês */}
        <Card className="bg-seguranca-graphite border-gray-600">
          <CardHeader>
            <CardTitle className="text-seguranca-lightgray flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-400" />
              Leads por Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={leadsMesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="mes" stroke="#9ca3af" fontSize={11} />
                <YAxis stroke="#9ca3af" />
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', color: '#e5e7eb' }} />
                <Bar dataKey="valor" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Leads" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Metas x Realizado */}
      {metasData.length > 0 && (
        <Card className="bg-seguranca-graphite border-gray-600">
          <CardHeader>
            <CardTitle className="text-seguranca-lightgray flex items-center gap-2">
              <Target className="h-5 w-5 text-purple-400" />
              Metas x Realizado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metasData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', color: '#e5e7eb' }}
                  formatter={(value: number) => [formatCurrency(value)]}
                />
                <Legend />
                <Bar dataKey="meta" fill="#6b7280" name="Meta" radius={[4, 4, 0, 0]} />
                <Bar dataKey="realizado" fill="#10b981" name="Realizado" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
              {metasData.map((m, i) => (
                <div key={i} className="flex items-center gap-3 bg-seguranca-black p-3 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm text-gray-400">{m.name}</p>
                    <div className="w-full bg-gray-700 rounded-full h-2 mt-1">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          width: `${Math.min(m.progresso, 100)}%`,
                          backgroundColor: m.progresso >= 100 ? '#10b981' : m.progresso >= 70 ? '#f59e0b' : '#ef4444',
                        }}
                      />
                    </div>
                  </div>
                  <Badge className={m.progresso >= 100 ? 'bg-green-600' : m.progresso >= 70 ? 'bg-yellow-600' : 'bg-red-600'}>
                    {m.progresso}%
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Componente auxiliar para cards de KPI
function KpiCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  return (
    <Card className="bg-seguranca-graphite border-gray-600">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 mb-1">{label}</p>
            <p className={`text-xl font-bold ${color}`}>{value}</p>
          </div>
          <div className={color}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}
