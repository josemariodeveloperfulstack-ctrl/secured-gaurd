import React, { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  Stethoscope,
  AlertTriangle,
  Palmtree,
  Briefcase,
  History,
  Clock,
  ArrowUpDown,
  Filter,
  CheckCircle2,
  Building,
  Gavel,
  ShieldAlert
} from 'lucide-react';
import { Employee } from '@/types/employee';
import { Occurrence } from '@/services/occurrenceService';
import { EmployeeChangeHistoryItem } from '@/services/employeeChangeHistoryService';
import { EmployeeEmploymentPeriod } from '@/services/employeeEmploymentPeriodService';
import { formatDate as formatSystemDate } from '@/utils/formatters';

interface EmployeeUnifiedTimelineProps {
  employee: Employee | null;
  absences: any[];
  occurrences: Occurrence[];
  vacations: any[];
  historyItems: EmployeeChangeHistoryItem[];
  employmentPeriods: EmployeeEmploymentPeriod[];
}

export type TimelineEventType = 
  | 'ADMISSAO'
  | 'ATESTADO'
  | 'ADVERTENCIA'
  | 'SUSPENSAO'
  | 'AFASTAMENTO_INSS'
  | 'FALTA_ABANDONO'
  | 'SUB_JUDICE'
  | 'FERIAS'
  | 'ALTERACAO_CADASTRAL'
  | 'PERIODO_EMPREGATICIO';

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  date: string;
  title: string;
  description?: string;
  badgeLabel: string;
  badgeColor: string;
  icon: React.ElementType;
  iconColor: string;
  metadata?: Record<string, any>;
}

export const EmployeeUnifiedTimeline: React.FC<EmployeeUnifiedTimelineProps> = ({
  employee,
  absences,
  occurrences,
  vacations,
  historyItems,
  employmentPeriods
}) => {
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [filterType, setFilterType] = useState<string>('ALL');

  const events = useMemo<TimelineEvent[]>(() => {
    const list: TimelineEvent[] = [];

    // 1. Admissão Inicial do Funcionário
    if (employee?.hireDate) {
      list.push({
        id: `admissao-${employee.id}`,
        type: 'ADMISSAO',
        date: employee.hireDate,
        title: 'Admissão na Empresa',
        description: `Contratado como ${employee.position || 'Colaborador'}${employee.company?.sigla ? ` na ${employee.company.sigla}` : ''}. Matrícula: ${employee.registrationNumber || 'N/A'}.`,
        badgeLabel: 'Admissão',
        badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        icon: Briefcase,
        iconColor: 'text-emerald-400 bg-emerald-500/10'
      });
    }

    // 2. Afastamento INSS
    if (employee?.inssStartDate) {
      list.push({
        id: `inss-${employee.id}`,
        type: 'AFASTAMENTO_INSS',
        date: employee.inssStartDate,
        title: 'Início de Afastamento INSS',
        description: `Afastamento previdenciário concedido. Previsão de término: ${employee.inssEndDate ? formatSystemDate(employee.inssEndDate) : 'Em aberto'}.`,
        badgeLabel: 'Afastamento INSS',
        badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
        icon: Clock,
        iconColor: 'text-blue-400 bg-blue-500/10'
      });
    }

    // 3. Falta / Abandono
    if (employee?.absenceStartDate) {
      list.push({
        id: `abandono-${employee.id}`,
        type: 'FALTA_ABANDONO',
        date: employee.absenceStartDate,
        title: 'Registro de Falta / Abandono',
        description: `Ausência injustificada registrada desde ${formatSystemDate(employee.absenceStartDate)}${employee.absenceEndDate ? ` até ${formatSystemDate(employee.absenceEndDate)}` : ''}.`,
        badgeLabel: 'Falta / Abandono',
        badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
        icon: ShieldAlert,
        iconColor: 'text-orange-400 bg-orange-500/10'
      });
    }

    // 4. Processo Judicial / Sub Júdice
    if (employee?.judicialProcessStartDate) {
      list.push({
        id: `judicial-${employee.id}`,
        type: 'SUB_JUDICE',
        date: employee.judicialProcessStartDate,
        title: 'Afastamento por Processo Judicial',
        description: `Colaborador em condição Sub Júdice${employee.judicialProcessEndDate ? ` (Encerrado em ${formatSystemDate(employee.judicialProcessEndDate)})` : ' (Em andamento)'}.`,
        badgeLabel: 'Sub Júdice',
        badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        icon: Gavel,
        iconColor: 'text-amber-400 bg-amber-500/10'
      });
    }

    // 5. Atestados Médicos entregues
    absences.forEach((abs, idx) => {
      if (!abs.dataInicio) return;
      list.push({
        id: `atestado-${abs.id || idx}`,
        type: 'ATESTADO',
        date: abs.dataInicio,
        title: abs.title || 'Atestado Médico Entregue',
        description: `${abs.dias ? `${abs.dias} dia(s) abonado(s). ` : ''}${abs.cidCode ? `CID: ${abs.cidCode}. ` : ''}${abs.doctorName ? `Médico: ${abs.doctorName}. ` : ''}${abs.description || abs.observations || ''}`,
        badgeLabel: `${abs.dias ? `${abs.dias}d ` : ''}Atestado`,
        badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
        icon: Stethoscope,
        iconColor: 'text-blue-400 bg-blue-500/10'
      });
    });

    // 6. Advertências e Suspensões Disciplinares
    occurrences.forEach((occ, idx) => {
      const isSuspensao = occ.type === 'SUSPENSAO' || occ.type?.includes('SUSPENSAO');
      list.push({
        id: `disciplinar-${occ.id || idx}`,
        type: isSuspensao ? 'SUSPENSAO' : 'ADVERTENCIA',
        date: occ.date || '',
        title: occ.title || (isSuspensao ? 'Suspensão Disciplinar' : 'Advertência Disciplinar'),
        description: `${occ.description || 'Medida disciplinar aplicada ao colaborador.'}`,
        badgeLabel: isSuspensao ? 'Suspensão' : 'Advertência',
        badgeColor: isSuspensao 
          ? 'bg-red-500/30 text-red-300 border-red-500/40' 
          : 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        icon: AlertTriangle,
        iconColor: isSuspensao ? 'text-red-400 bg-red-500/10' : 'text-amber-400 bg-amber-500/10'
      });
    });

    // 7. Férias
    vacations.forEach((vac, idx) => {
      if (!vac.dataInicio && !vac.startDate) return;
      const dInicio = vac.dataInicio || vac.startDate;
      const dFim = vac.dataFim || vac.endDate;
      list.push({
        id: `ferias-${vac.id || idx}`,
        type: 'FERIAS',
        date: dInicio,
        title: `Férias Gozadas (${vac.status || 'Registrado'})`,
        description: `Período: ${formatSystemDate(dInicio)} até ${formatSystemDate(dFim)}. Período Aquisitivo: ${vac.periodoAquisitivo || 'N/A'}.`,
        badgeLabel: 'Férias',
        badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        icon: Palmtree,
        iconColor: 'text-amber-400 bg-amber-500/10'
      });
    });

    // 8. Alterações Cadastrais / Histórico
    historyItems.forEach((hist, idx) => {
      if (!hist.changedAt) return;
      const isoDate = hist.changedAt.slice(0, 10);
      list.push({
        id: `hist-${hist.id || idx}`,
        type: 'ALTERACAO_CADASTRAL',
        date: isoDate,
        title: `${hist.categoryLabel || hist.category}: ${hist.fieldLabel || hist.fieldName}`,
        description: `De "${hist.oldValue || '—'}" para "${hist.newValue || '—'}"${hist.changedByName ? ` (Por: ${hist.changedByName})` : ''}.`,
        badgeLabel: 'Alteração',
        badgeColor: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
        icon: History,
        iconColor: 'text-gray-400 bg-gray-500/10'
      });
    });

    // Ordenação cronológica
    list.sort((a, b) => {
      const timeA = new Date(a.date || 0).getTime();
      const timeB = new Date(b.date || 0).getTime();
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });

    return list;
  }, [employee, absences, occurrences, vacations, historyItems, employmentPeriods, sortOrder]);

  const filteredEvents = useMemo(() => {
    if (filterType === 'ALL') return events;
    if (filterType === 'ATESTADOS') return events.filter(e => e.type === 'ATESTADO');
    if (filterType === 'DISCIPLINAR') return events.filter(e => e.type === 'ADVERTENCIA' || e.type === 'SUSPENSAO');
    if (filterType === 'AFASTAMENTOS') return events.filter(e => e.type === 'AFASTAMENTO_INSS' || e.type === 'FALTA_ABANDONO' || e.type === 'SUB_JUDICE');
    return events;
  }, [events, filterType]);

  return (
    <div className="space-y-4">
      {/* Controles de Filtro e Ordenação */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-gray-800">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Filter size={14} className="text-gray-400 mr-1" />
          <Button
            size="sm"
            variant={filterType === 'ALL' ? 'default' : 'outline'}
            onClick={() => setFilterType('ALL')}
            className={`h-7 text-xs px-2.5 rounded-lg ${filterType === 'ALL' ? 'bg-seguranca-red text-white' : 'border-gray-700 text-gray-300'}`}
          >
            Todos ({events.length})
          </Button>
          <Button
            size="sm"
            variant={filterType === 'ATESTADOS' ? 'default' : 'outline'}
            onClick={() => setFilterType('ATESTADOS')}
            className={`h-7 text-xs px-2.5 rounded-lg ${filterType === 'ATESTADOS' ? 'bg-blue-600 text-white' : 'border-gray-700 text-gray-300'}`}
          >
            Atestados ({events.filter(e => e.type === 'ATESTADO').length})
          </Button>
          <Button
            size="sm"
            variant={filterType === 'DISCIPLINAR' ? 'default' : 'outline'}
            onClick={() => setFilterType('DISCIPLINAR')}
            className={`h-7 text-xs px-2.5 rounded-lg ${filterType === 'DISCIPLINAR' ? 'bg-red-600 text-white' : 'border-gray-700 text-gray-300'}`}
          >
            Disciplinar ({events.filter(e => e.type === 'ADVERTENCIA' || e.type === 'SUSPENSAO').length})
          </Button>
          <Button
            size="sm"
            variant={filterType === 'AFASTAMENTOS' ? 'default' : 'outline'}
            onClick={() => setFilterType('AFASTAMENTOS')}
            className={`h-7 text-xs px-2.5 rounded-lg ${filterType === 'AFASTAMENTOS' ? 'bg-amber-600 text-white' : 'border-gray-700 text-gray-300'}`}
          >
            Afastamentos ({events.filter(e => e.type === 'AFASTAMENTO_INSS' || e.type === 'FALTA_ABANDONO' || e.type === 'SUB_JUDICE').length})
          </Button>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
          className="h-7 text-xs px-2.5 rounded-lg border-gray-700 text-gray-300 hover:text-white flex items-center gap-1.5 self-start sm:self-auto"
        >
          <ArrowUpDown size={12} />
          {sortOrder === 'desc' ? 'Mais recentes primeiro' : 'Mais antigos primeiro'}
        </Button>
      </div>

      {/* Linha do Tempo Visual */}
      {filteredEvents.length === 0 ? (
        <div className="text-center py-10 bg-seguranca-black/20 rounded-lg border border-gray-700/30">
          <p className="text-gray-500 italic text-sm">Nenhum evento histórico encontrado para este filtro.</p>
        </div>
      ) : (
        <div className="relative pl-6 sm:pl-8 space-y-4 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-gray-700/60">
          {filteredEvents.map((evt) => {
            const Icon = evt.icon;
            return (
              <div key={evt.id} className="relative group">
                {/* Marcador do Ponto na Linha */}
                <div className={`absolute -left-6 sm:-left-8 top-3 h-6 w-6 sm:h-7 sm:w-7 rounded-full flex items-center justify-center border-2 border-seguranca-graphite ${evt.iconColor} shadow-md group-hover:scale-110 transition-transform`}>
                  <Icon size={13} />
                </div>

                {/* Conteúdo do Card */}
                <Card className="bg-seguranca-black/40 hover:bg-seguranca-black/60 border-gray-700/50 p-3.5 rounded-xl transition-all shadow-md">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={evt.badgeColor}>
                        {evt.badgeLabel}
                      </Badge>
                      <h4 className="font-bold text-white text-sm">
                        {evt.title}
                      </h4>
                    </div>
                    <span className="text-xs text-gray-400 font-mono flex items-center gap-1 shrink-0">
                      <Calendar size={12} className="text-gray-500" />
                      {evt.date ? formatSystemDate(evt.date) : 'Data não informada'}
                    </span>
                  </div>

                  {evt.description && (
                    <p className="text-xs text-gray-300 mt-2 leading-relaxed bg-seguranca-graphite/20 p-2 rounded border border-gray-800/40">
                      {evt.description}
                    </p>
                  )}
                </Card>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
