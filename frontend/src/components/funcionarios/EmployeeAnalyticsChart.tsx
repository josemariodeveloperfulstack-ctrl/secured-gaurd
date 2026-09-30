import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Stethoscope, Calendar, AlertTriangle, Activity, TrendingUp, Clock } from 'lucide-react';

export interface AbsenceItem {
  id: string;
  source?: string;
  title?: string;
  dataInicio?: string;
  dataFim?: string;
  dias?: number;
  horas?: number;
  cidCode?: string;
  cidDescription?: string;
  doctorName?: string;
  observations?: string;
}

export interface DisciplinaryItem {
  id: string;
  type?: string;
  title?: string;
  description?: string;
  date?: string;
}

interface EmployeeAnalyticsChartProps {
  absences: AbsenceItem[];
  occurrences: DisciplinaryItem[];
  employeeName?: string;
}

interface MonthData {
  monthKey: string;     // YYYY-MM
  label: string;        // Mês/AA (Ex: Out/25)
  atestados: number;    // Qtd de atestados
  diasAfastado: number; // Soma de dias afastados
  advertencias: number; // Qtd de advertências
}

export const EmployeeAnalyticsChart: React.FC<EmployeeAnalyticsChartProps> = ({
  absences,
  occurrences,
  employeeName = 'Funcionário'
}) => {
  // Construir janela de 12 meses até o mês atual
  const chartData = useMemo<MonthData[]>(() => {
    const result: MonthData[] = [];
    const now = new Date();
    
    // 12 meses anteriores até hoje
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const monthKey = `${year}-${month}`;
      
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const label = `${monthNames[d.getMonth()]}/${String(year).slice(-2)}`;
      
      result.push({
        monthKey,
        label,
        atestados: 0,
        diasAfastado: 0,
        advertencias: 0
      });
    }

    const monthMap = new Map<string, MonthData>();
    result.forEach(item => monthMap.set(item.monthKey, item));

    // Mapear Atestados e Afastamentos
    absences.forEach(item => {
      if (!item.dataInicio) return;
      const key = item.dataInicio.slice(0, 7); // YYYY-MM
      const slot = monthMap.get(key);
      if (slot) {
        slot.atestados += 1;
        slot.diasAfastado += (Number(item.dias) || 1);
      }
    });

    // Mapear Advertências / Suspensões
    occurrences.forEach(item => {
      if (!item.date) return;
      const key = item.date.slice(0, 7);
      const slot = monthMap.get(key);
      if (slot) {
        slot.advertencias += 1;
      }
    });

    return result;
  }, [absences, occurrences]);

  // Totais consolidados
  const totals = useMemo(() => {
    const totalAtestados = absences.length;
    const totalDias = absences.reduce((acc, curr) => acc + (Number(curr.dias) || 1), 0);
    const totalAdvertencias = occurrences.filter(o => 
      o.type === 'ADVERTENCIA' || !o.type || o.type.includes('ADVERTENCIA')
    ).length;
    const totalSuspensoes = occurrences.filter(o => 
      o.type === 'SUSPENSAO' || o.type?.includes('SUSPENSAO')
    ).length;
    const mediaDias = totalAtestados > 0 ? (totalDias / totalAtestados).toFixed(1) : '0';

    return {
      totalAtestados,
      totalDias,
      totalAdvertencias,
      totalSuspensoes,
      mediaDias
    };
  }, [absences, occurrences]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-seguranca-darkgray/95 border border-gray-700 p-3 rounded-lg shadow-xl text-xs space-y-1.5 backdrop-blur-md">
          <p className="font-bold text-white border-b border-gray-700/80 pb-1 flex items-center gap-1.5">
            <Calendar size={13} className="text-seguranca-yellow" />
            {label}
          </p>
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-gray-300">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: entry.color }} />
                {entry.name}:
              </span>
              <span className="font-bold text-white font-mono">{entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="bg-seguranca-black/40 border-gray-700/60 shadow-lg overflow-hidden">
      <CardHeader className="p-4 pb-2 border-b border-gray-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="space-y-0.5">
          <CardTitle className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-400" />
            Análise Visual de Atestados & Afastamentos
          </CardTitle>
          <CardDescription className="text-xs text-gray-400">
            Distribuição mensal dos últimos 12 meses de {employeeName}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/30 text-xs">
            {totals.totalAtestados} atestado(s) entregue(s)
          </Badge>
          <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-xs">
            {totals.totalDias} dia(s) afastado(s)
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Métricas Resumidas em Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="bg-seguranca-graphite/40 border border-gray-700/50 rounded-lg p-2.5 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 shrink-0">
              <Stethoscope size={18} />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase font-semibold">Total Atestados</p>
              <p className="text-lg font-bold text-white leading-tight">{totals.totalAtestados}</p>
            </div>
          </div>

          <div className="bg-seguranca-graphite/40 border border-gray-700/50 rounded-lg p-2.5 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 shrink-0">
              <Calendar size={18} />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase font-semibold">Dias Afastados</p>
              <p className="text-lg font-bold text-amber-400 leading-tight">{totals.totalDias} d</p>
            </div>
          </div>

          <div className="bg-seguranca-graphite/40 border border-gray-700/50 rounded-lg p-2.5 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
              <Clock size={18} />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase font-semibold">Média p/ Atestado</p>
              <p className="text-lg font-bold text-emerald-400 leading-tight">{totals.mediaDias} d</p>
            </div>
          </div>

          <div className="bg-seguranca-graphite/40 border border-gray-700/50 rounded-lg p-2.5 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10 text-red-400 shrink-0">
              <AlertTriangle size={18} />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase font-semibold">Advertências</p>
              <p className="text-lg font-bold text-red-400 leading-tight">{totals.totalAdvertencias}</p>
            </div>
          </div>
        </div>

        {/* Gráfico de Barras com Recharts */}
        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.4} />
              <XAxis
                dataKey="label"
                tick={{ fill: '#9ca3af', fontSize: 11 }}
                axisLine={{ stroke: '#4b5563' }}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: '#9ca3af', fontSize: 11 }}
                axisLine={{ stroke: '#4b5563' }}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: '8px', fontSize: '12px' }}
                formatter={(value) => <span className="text-gray-300 font-medium">{value}</span>}
              />
              <Bar
                dataKey="atestados"
                name="Atestados Entregues"
                fill="#38bdf8"
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
              <Bar
                dataKey="diasAfastado"
                name="Dias Afastados"
                fill="#f59e0b"
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
              <Bar
                dataKey="advertencias"
                name="Advertências"
                fill="#ef4444"
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
