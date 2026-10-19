import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Building2, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  QrCode, 
  RefreshCw, 
  Route, 
  ShieldCheck, 
  User, 
  ArrowRight,
  ExternalLink,
  ChevronRight,
  FileCheck,
  AlertCircle
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supervisorVisitService, type SupervisorVisitReportRow } from '@/services/supervisorVisitService';
import { visitScheduleService } from '@/services/visitScheduleService';
import { type VisitSchedule } from '@/types/visit';
import { toast } from 'sonner';

interface SupervisorAreaTabProps {
  standalone?: boolean;
}

export const SupervisorAreaTab: React.FC<SupervisorAreaTabProps> = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [schedules, setSchedules] = useState<VisitSchedule[]>([]);
  const [recentVisits, setRecentVisits] = useState<SupervisorVisitReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'escalas' | 'historico'>('escalas');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      const startDate = format(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd');
      const endDate = format(new Date(now.getFullYear(), now.getMonth() + 1, 0), 'yyyy-MM-dd');

      // Buscar visitas realizadas
      const reportData = await supervisorVisitService.report({
        startDate,
        endDate
      }).catch(() => []);

      setRecentVisits(reportData || []);

      // Buscar escalas atribuídas
      const supervisorId = (user as any)?.employeeId || user?.id;
      if (supervisorId) {
        const scheduleList = await visitScheduleService.getSchedulesBySupervisor(
          supervisorId,
          startDate,
          endDate
        ).catch(() => []);
        setSchedules(scheduleList || []);
      }
    } catch (err) {
      console.error('Erro ao carregar dados de supervisão:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const todayVisits = recentVisits.filter(v => v.visitDate === format(new Date(), 'yyyy-MM-dd'));

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Banner Principal / Ações Rápidas */}
      <div className="bg-gradient-to-r from-seguranca-yellow/15 via-seguranca-graphite/40 to-seguranca-black p-6 sm:p-8 rounded-[2.5rem] border border-seguranca-yellow/30 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-seguranca-yellow text-seguranca-black font-black uppercase text-[10px] px-3 py-1">
                Área de Supervisão
              </Badge>
              <span className="text-xs text-gray-400 font-bold">
                {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase">
              Escala de Visitas e Controle de Postos
            </h2>
            <p className="text-gray-300 text-sm max-w-xl">
              Realize a leitura do QR Code do posto, registre check-in de entrada e saída com fotos, atas e confirmação de entrega de EPI.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Button
              onClick={() => navigate('/supervisao/checkin-posto')}
              className="bg-seguranca-yellow hover:bg-seguranca-yellow/90 text-seguranca-black font-black rounded-2xl h-14 px-6 text-base shadow-xl shadow-seguranca-yellow/20 flex items-center justify-center gap-2"
            >
              <QrCode className="w-6 h-6" />
              Escanear QR do Posto (Check-in)
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/supervisao/rotas')}
              className="border-gray-700 hover:bg-white/5 text-white font-bold rounded-2xl h-14 px-5 flex items-center justify-center gap-2"
            >
              <Route className="w-5 h-5 text-indigo-400" />
              Rotas da Semana
            </Button>
          </div>
        </div>
      </div>

      {/* Métricas Rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-seguranca-graphite/30 border-gray-800 rounded-3xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Visitas Hoje</span>
              <p className="text-3xl font-black text-white mt-1">{todayVisits.length}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-seguranca-yellow/10 flex items-center justify-center text-seguranca-yellow">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-seguranca-graphite/30 border-gray-800 rounded-3xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Escalas Atribuídas</span>
              <p className="text-3xl font-black text-white mt-1">{schedules.length}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <Calendar className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-seguranca-graphite/30 border-gray-800 rounded-3xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Visitas no Mês</span>
              <p className="text-3xl font-black text-white mt-1">{recentVisits.length}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Building2 className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sub-abas: Minhas Escalas vs Histórico de Visitas */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveSubTab('escalas')}
              className={`px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all ${
                activeSubTab === 'escalas'
                  ? 'bg-seguranca-yellow text-seguranca-black shadow-lg shadow-seguranca-yellow/10'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Minhas Escalas da Semana
            </button>
            <button
              onClick={() => setActiveSubTab('historico')}
              className={`px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all ${
                activeSubTab === 'historico'
                  ? 'bg-seguranca-yellow text-seguranca-black shadow-lg shadow-seguranca-yellow/10'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Histórico de Visitas Realizadas ({recentVisits.length})
            </button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="text-xs text-gray-400 hover:text-white rounded-xl"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        {activeSubTab === 'escalas' ? (
          <div className="space-y-3">
            {schedules.length === 0 ? (
              <Card className="bg-seguranca-graphite/20 border-gray-800 rounded-3xl p-8 text-center">
                <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-3 opacity-30" />
                <h4 className="text-base font-bold text-gray-300">Nenhuma escala programada encontrada</h4>
                <p className="text-xs text-gray-500 max-w-md mx-auto mt-1">
                  O Gestor Operacional ainda não atribuiu escalas específicas ou você pode iniciar visitas avulsas pelo botão de Check-in no Posto.
                </p>
                <Button
                  onClick={() => navigate('/supervisao/checkin-posto')}
                  className="mt-4 bg-seguranca-yellow text-seguranca-black font-black text-xs rounded-xl h-10 px-4"
                >
                  <QrCode className="w-4 h-4 mr-2" /> Iniciar Visita no Posto Agora
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {schedules.map((sch) => (
                  <Card key={sch.id} className="bg-seguranca-graphite/30 border-gray-800 rounded-3xl p-5 hover:border-seguranca-yellow/40 transition-all">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-seguranca-yellow">
                          {sch.scheduleDate}
                        </span>
                        <h4 className="text-base font-black text-white mt-0.5">{sch.clientName || 'Cliente'}</h4>
                      </div>
                      <Badge className="bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-[10px]">
                        {sch.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-400 space-y-1 mb-4">
                      <p className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-gray-500" /> Horário: {sch.startTime} - {sch.endTime}
                      </p>
                      <p className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-gray-500" /> Postos a visitar: {sch.totalUnits || 1}
                      </p>
                    </div>
                    <Button
                      onClick={() => navigate('/supervisao/checkin-posto')}
                      className="w-full bg-seguranca-black hover:bg-seguranca-yellow hover:text-seguranca-black border border-gray-700 text-white font-bold rounded-xl text-xs h-10 transition-colors"
                    >
                      Realizar Check-in <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {recentVisits.length === 0 ? (
              <Card className="bg-seguranca-graphite/20 border-gray-800 rounded-3xl p-8 text-center">
                <FileCheck className="w-12 h-12 text-gray-600 mx-auto mb-3 opacity-30" />
                <h4 className="text-base font-bold text-gray-300">Nenhuma visita registrada no período</h4>
                <p className="text-xs text-gray-500 mt-1">
                  Assim que realizar check-in com QR Code nos postos, elas serão listadas aqui com fotos e atas.
                </p>
              </Card>
            ) : (
              <div className="space-y-3">
                {recentVisits.map((v) => (
                  <Card key={v.id} className="bg-seguranca-graphite/30 border-gray-800 rounded-3xl p-5 hover:border-gray-700 transition-all">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-seguranca-yellow" />
                        <h4 className="font-black text-white text-base">{v.workPostName}</h4>
                        {v.visitedAsScheduled && (
                          <Badge className="bg-blue-600 text-white text-[10px]">Conforme Escala</Badge>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 font-mono">
                        {v.visitDate} às {v.visitTime?.slice(0, 5) || '—'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-gray-400 pt-2 border-t border-gray-800/60">
                      <div>
                        <span className="text-gray-500 block text-[10px] uppercase font-bold">Funcionário no Posto</span>
                        <span className="text-gray-200 font-semibold">{v.employeeName || '—'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-[10px] uppercase font-bold">Vínculo</span>
                        <span className="text-gray-200">{v.allocationType || 'EFETIVO'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-[10px] uppercase font-bold">Localização GPS</span>
                        <span className="text-gray-200 truncate block">{v.locationAddress || 'Confirmada'}</span>
                      </div>
                    </div>

                    {(v.description || v.observations) && (
                      <p className="mt-3 text-xs text-gray-300 bg-seguranca-black/40 p-3 rounded-2xl border border-gray-800">
                        {v.description || v.observations}
                      </p>
                    )}

                    {v.epiDelivered && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-amber-400 font-bold">
                        <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px]">
                          EPI Entregue
                        </Badge>
                        <span>{v.epiDescription}</span>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SupervisorAreaTab;
