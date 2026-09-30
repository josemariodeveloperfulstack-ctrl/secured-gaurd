import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Stethoscope, 
  AlertTriangle, 
  Palmtree, 
  UserCheck, 
  Calendar, 
  ShieldAlert, 
  ChevronRight,
  Clock
} from 'lucide-react';
import { Employee } from '@/types/employee';

interface EmployeeSummaryKpisProps {
  employee: Employee | null;
  totalAtestados: number;
  totalDiasAfastado: number;
  totalAdvertencias: number;
  totalSuspensoes: number;
  onNavigateTab: (tab: string) => void;
}

export const EmployeeSummaryKpis: React.FC<EmployeeSummaryKpisProps> = ({
  employee,
  totalAtestados,
  totalDiasAfastado,
  totalAdvertencias,
  totalSuspensoes,
  onNavigateTab
}) => {
  if (!employee) return null;

  const isAfastadoInss = employee.status === 'INSS_LEAVE' || Boolean(employee.inssStartDate);
  const isAbandonoFalta = employee.status === 'UNEXCUSED_ABSENCE' || Boolean(employee.absenceStartDate);

  // Calcular dias de falta para alerta > 30 dias
  let diasFalta = 0;
  if (isAbandonoFalta && employee.absenceStartDate) {
    const start = new Date(employee.absenceStartDate + 'T00:00:00');
    const end = employee.absenceEndDate ? new Date(employee.absenceEndDate + 'T00:00:00') : new Date();
    diasFalta = Math.max(0, Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 px-4 md:px-6 pt-3 pb-1">
      {/* 1. Card Atestados Entregues */}
      <Card
        onClick={() => onNavigateTab('atestados')}
        className="bg-seguranca-black/40 hover:bg-seguranca-graphite/60 border-gray-700/60 transition-all cursor-pointer p-3 rounded-xl group relative overflow-hidden flex flex-col justify-between"
      >
        <div className="flex items-start justify-between">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 group-hover:scale-105 transition-transform">
            <Stethoscope size={18} />
          </div>
          <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-[10px]">
            {totalAtestados > 0 ? `${totalDiasAfastado}d abonados` : 'Sem atestados'}
          </Badge>
        </div>
        <div className="mt-2">
          <p className="text-[10px] text-gray-400 uppercase font-semibold tracking-wider">Atestados Entregues</p>
          <div className="flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-black text-white">{totalAtestados}</span>
            <span className="text-[11px] text-blue-400 flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
              Ver lista <ChevronRight size={12} />
            </span>
          </div>
        </div>
      </Card>

      {/* 2. Card Advertências & Disciplinar */}
      <Card
        onClick={() => onNavigateTab('disciplinar')}
        className={`bg-seguranca-black/40 hover:bg-seguranca-graphite/60 border-gray-700/60 transition-all cursor-pointer p-3 rounded-xl group relative overflow-hidden flex flex-col justify-between ${
          totalAdvertencias > 0 || totalSuspensoes > 0 ? 'border-l-4 border-l-red-500' : ''
        }`}
      >
        <div className="flex items-start justify-between">
          <div className={`p-2 rounded-lg ${
            totalAdvertencias > 0 || totalSuspensoes > 0 
              ? 'bg-red-500/10 text-red-400' 
              : 'bg-emerald-500/10 text-emerald-400'
          } group-hover:scale-105 transition-transform`}>
            <AlertTriangle size={18} />
          </div>
          <Badge className={
            totalSuspensoes > 0
              ? 'bg-red-500/20 text-red-300 border-red-500/30 text-[10px]'
              : totalAdvertencias > 0
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px]'
                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]'
          }>
            {totalSuspensoes > 0 ? `${totalSuspensoes} suspensão` : totalAdvertencias > 0 ? 'Atenção' : 'Ficha limpa'}
          </Badge>
        </div>
        <div className="mt-2">
          <p className="text-[10px] text-gray-400 uppercase font-semibold tracking-wider">Advertências Aplicadas</p>
          <div className="flex items-baseline justify-between">
            <span className={`text-xl sm:text-2xl font-black ${totalAdvertencias > 0 ? 'text-red-400' : 'text-white'}`}>
              {totalAdvertencias}
            </span>
            <span className="text-[11px] text-gray-400 group-hover:text-red-300 flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
              Disciplinar <ChevronRight size={12} />
            </span>
          </div>
        </div>
      </Card>

      {/* 3. Card Status Operacional / Afastamentos */}
      <Card
        onClick={() => onNavigateTab('dados')}
        className={`bg-seguranca-black/40 hover:bg-seguranca-graphite/60 border-gray-700/60 transition-all cursor-pointer p-3 rounded-xl group relative overflow-hidden flex flex-col justify-between ${
          isAbandonoFalta ? 'border-l-4 border-l-orange-500' : isAfastadoInss ? 'border-l-4 border-l-blue-500' : ''
        }`}
      >
        <div className="flex items-start justify-between">
          <div className={`p-2 rounded-lg ${
            isAbandonoFalta ? 'bg-orange-500/10 text-orange-400' :
            isAfastadoInss ? 'bg-blue-500/10 text-blue-400' :
            employee.status === 'SUB_JUDICE' ? 'bg-amber-500/10 text-amber-400' :
            'bg-emerald-500/10 text-emerald-400'
          } group-hover:scale-105 transition-transform`}>
            {isAbandonoFalta ? <ShieldAlert size={18} /> : isAfastadoInss ? <Clock size={18} /> : <UserCheck size={18} />}
          </div>
          <Badge className={
            isAbandonoFalta && diasFalta > 30 ? 'bg-red-500/30 text-red-300 border-red-500 text-[10px] animate-pulse' :
            isAbandonoFalta ? 'bg-orange-500/20 text-orange-300 border-orange-500/30 text-[10px]' :
            isAfastadoInss ? 'bg-blue-500/20 text-blue-300 border-blue-500/30 text-[10px]' :
            'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]'
          }>
            {isAbandonoFalta && diasFalta > 30 ? '🚨 Abandono > 30d' :
             isAbandonoFalta ? `${diasFalta}d de falta` :
             isAfastadoInss ? 'Afastamento INSS' :
             employee.status === 'SUB_JUDICE' ? 'Sub Júdice' : 'Em atividade'}
          </Badge>
        </div>
        <div className="mt-2">
          <p className="text-[10px] text-gray-400 uppercase font-semibold tracking-wider">Situação Funcional</p>
          <div className="flex items-baseline justify-between">
            <span className="text-sm sm:text-base font-bold text-white truncate max-w-[130px]">
              {isAbandonoFalta ? 'Falta / Abandono' :
               isAfastadoInss ? 'Licença INSS' :
               employee.status === 'SUB_JUDICE' ? 'Processo Judicial' :
               employee.status === 'TERMINATED' ? 'Demitido' : 'Ativo Regular'}
            </span>
            <span className="text-[11px] text-gray-400 flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
              Detalhes <ChevronRight size={12} />
            </span>
          </div>
        </div>
      </Card>

      {/* 4. Card Férias & Elegibilidade */}
      <Card
        onClick={() => onNavigateTab('ferias')}
        className="bg-seguranca-black/40 hover:bg-seguranca-graphite/60 border-gray-700/60 transition-all cursor-pointer p-3 rounded-xl group relative overflow-hidden flex flex-col justify-between"
      >
        <div className="flex items-start justify-between">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 group-hover:scale-105 transition-transform">
            <Palmtree size={18} />
          </div>
          <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px]">
            CLT Art. 130
          </Badge>
        </div>
        <div className="mt-2">
          <p className="text-[10px] text-gray-400 uppercase font-semibold tracking-wider">Gestão de Férias</p>
          <div className="flex items-baseline justify-between">
            <span className="text-sm sm:text-base font-bold text-seguranca-yellow">
              {employee.hireDate ? 'Período Ativo' : 'Não informado'}
            </span>
            <span className="text-[11px] text-amber-400 flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
              Ver <ChevronRight size={12} />
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
};
