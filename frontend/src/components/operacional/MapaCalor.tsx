import React, { useState, useEffect, useMemo } from 'react';
import { 
  format, 
  addDays, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  subMonths, 
  isSameDay, 
  parseISO,
  getDate,
  getMonth,
  getYear
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { 
  Calendar as CalendarIcon, 
  Download, 
  ChevronLeft, 
  ChevronRight,
  Search,
  User,
  Building,
  RefreshCw,
  MapPin,
  Loader2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { scheduleService, Schedule } from '@/services/scheduleService';
import { clientService, Client } from '@/services/clientService';
import { workPostService, WorkPost } from '@/services/workPostService';
import { useToast } from '@/hooks/use-toast';

interface MapaCalorProps {
  onEditEscala?: (escala: Schedule) => void;
}

const MapaCalor: React.FC<MapaCalorProps> = ({ onEditEscala }) => {
  const { toast } = useToast();
  
  // Estados de Filtro e Período
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [workPosts, setWorkPosts] = useState<WorkPost[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('all');
  const [selectedWorkPostId, setSelectedWorkPostId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Lógica de Ciclo: 26 do mês anterior ao 25 do mês atual
  const period = useMemo(() => {
    let start: Date;
    let end: Date;

    const day = getDate(currentDate);
    const month = getMonth(currentDate);
    const year = getYear(currentDate);

    if (day >= 26) {
      // Ciclo atual começou no dia 26 deste mês
      start = new Date(year, month, 26);
      end = new Date(year, month + 1, 25);
    } else {
      // Ciclo atual começou no dia 26 do mês passado
      start = new Date(year, month - 1, 26);
      end = new Date(year, month, 25);
    }

    return {
      start,
      end,
      days: eachDayOfInterval({ start, end })
    };
  }, [currentDate]);

  useEffect(() => {
    loadFilters();
    loadSchedules();
  }, [period, selectedClientId, selectedWorkPostId]);

  const loadFilters = async () => {
    try {
      const [clientsData, allWorkPosts] = await Promise.all([
        clientService.getAllClients(),
        workPostService.getAllWorkPosts()
      ]);
      setClients(clientsData);
      
      if (selectedClientId !== 'all') {
        setWorkPosts(allWorkPosts.filter(wp => wp.clientId === selectedClientId));
      } else {
        setWorkPosts(allWorkPosts);
      }
    } catch (error) {
      console.error('Erro ao carregar filtros:', error);
    }
  };

  const loadSchedules = async () => {
    try {
      setLoading(true);
      const data = await scheduleService.getSchedules({
        startDate: format(period.start, 'yyyy-MM-dd'),
        endDate: format(period.end, 'yyyy-MM-dd'),
        clientId: selectedClientId !== 'all' ? selectedClientId : undefined,
        workPostId: selectedWorkPostId !== 'all' ? selectedWorkPostId : undefined
      });
      setSchedules(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erro ao carregar escalas:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar o mapa de calor.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Agrupamento por Funcionário
  const heatmapData = useMemo(() => {
    const grouped: Record<string, { employee: any, dates: Record<string, Schedule> }> = {};

    schedules.forEach(schedule => {
      const employeeId = schedule.employee?.id;
      if (!employeeId) return;

      if (!grouped[employeeId]) {
        grouped[employeeId] = {
          employee: schedule.employee,
          dates: {}
        };
      }

      grouped[employeeId].dates[schedule.scheduleDate] = schedule;
    });

    return Object.values(grouped).filter(item => 
      item.employee.name.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => a.employee.name.localeCompare(b.employee.name));
  }, [schedules, searchTerm]);

  const getSiglaColor = (sigla: string | undefined) => {
    if (!sigla) return 'bg-slate-800 text-slate-400';
    
    switch (sigla.toUpperCase()) {
      case 'PL': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50';
      case 'FE': return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      case 'AT': return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
      case 'FT': return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'HE': return 'bg-purple-500/20 text-purple-400 border-purple-500/50';
      case 'MT': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50';
      case 'RM': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50';
      default: return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

  const getSiglaName = (sigla: string | undefined) => {
    if (!sigla) return '-';
    const names: Record<string, string> = {
      'PL': 'Plantão',
      'FE': 'Férias',
      'AT': 'Atestado',
      'FT': 'Falta',
      'HE': 'Hora Extra',
      'MT': 'Monitoria',
      'RM': 'Remanejamento'
    };
    return names[sigla.toUpperCase()] || sigla;
  };

  const handlePrevMonth = () => {
    setCurrentDate(prev => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => addDays(prev, 30));
  };

  const handleExportClosing = async () => {
    try {
      setLoading(true);
      const startStr = format(period.start, 'yyyy-MM-dd');
      const endStr = format(period.end, 'yyyy-MM-dd');
      const companyId = selectedClientId !== 'all' ? selectedClientId : (clients.length > 0 ? clients[0].id : undefined);

      if (!companyId) {
        toast({
          title: 'Aviso',
          description: 'Selecione um cliente para exportar o fechamento.',
          variant: 'warning',
        });
        return;
      }

      const blob = await scheduleService.exportPayroll(startStr, endStr, companyId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `fechamento_operacional_${startStr}_a_${endStr}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Sucesso',
        description: 'Fechamento operacional exportado com sucesso.',
      });
    } catch (error) {
      console.error('Erro ao exportar fechamento:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível exportar o fechamento.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-slate-900 border-slate-800 shadow-xl overflow-hidden text-white">
      <CardHeader className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl font-bold flex items-center gap-2 text-white">
              <CalendarIcon className="h-5 w-5 text-seguranca-red" />
              Matriz de Escala Operacional (Heatmap)
            </CardTitle>
            <CardDescription className="text-slate-400">
              Período: {format(period.start, 'dd/MM/yyyy')} a {format(period.end, 'dd/MM/yyyy')}
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handlePrevMonth} className="border-slate-700 hover:bg-slate-800 text-white">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="px-4 py-2 bg-slate-800 rounded-md text-sm font-medium text-white min-w-[150px] text-center">
              {format(period.end, 'MMMM yyyy', { locale: ptBR }).toUpperCase()}
            </div>
            <Button variant="outline" size="icon" onClick={handleNextMonth} className="border-slate-700 hover:bg-slate-800 text-white">
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={loadSchedules} className="border-slate-700 hover:bg-slate-800 text-white">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input 
              placeholder="Buscar vigilante..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-950 border-slate-700 pl-9 text-white placeholder:text-slate-600 focus-visible:ring-red-500/50"
            />
          </div>
          
          <Select value={selectedClientId} onValueChange={setSelectedClientId}>
            <SelectTrigger className="bg-slate-950 border-slate-700 text-white focus:ring-red-500/50">
              <Building className="h-4 w-4 mr-2 text-slate-500" />
              <SelectValue placeholder="Filtrar por Cliente" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-700 text-white">
              <SelectItem value="all">Todos os Clientes</SelectItem>
              {clients.map(client => (
                <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedWorkPostId} onValueChange={setSelectedWorkPostId}>
            <SelectTrigger className="bg-slate-950 border-slate-700 text-white focus:ring-red-500/50">
              <MapPin className="h-4 w-4 mr-2 text-slate-500" />
              <SelectValue placeholder="Filtrar por Posto" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-700 text-white">
              <SelectItem value="all">Todos os Postos</SelectItem>
              {workPosts.map(post => (
                <SelectItem key={post.id} value={post.id}>{post.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button 
            variant="outline" 
            className="border-slate-700 hover:bg-slate-800 text-white"
            onClick={handleExportClosing}
            disabled={loading}
          >
            <Download className="h-4 w-4 mr-2" />
            {loading ? 'Processando...' : 'Exportar Fechamento'}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto overflow-y-auto max-h-[600px] scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-900">
              <tr className="border-b border-slate-800">
                <th className="p-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider sticky left-0 bg-slate-900 z-20 min-w-[250px] border-r border-slate-800">
                  Funcionário / Vigilante
                </th>
                {period.days.map(day => (
                  <th key={day.toISOString()} className={`p-2 text-center min-w-[40px] border-r border-slate-800/30 ${[0, 6].includes(day.getDay()) ? 'bg-slate-800/30' : ''}`}>
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-slate-500 uppercase">{format(day, 'EEE', { locale: ptBR })}</span>
                      <span className={`text-xs font-bold mt-1 ${isSameDay(day, new Date()) ? 'text-red-500' : 'text-slate-300'}`}>
                        {format(day, 'dd')}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={period.days.length + 1} className="p-12 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-8 w-8 animate-spin text-red-500" />
                      <span>Carregando dados da matriz...</span>
                    </div>
                  </td>
                </tr>
              ) : heatmapData.length === 0 ? (
                <tr>
                  <td colSpan={period.days.length + 1} className="p-12 text-center text-slate-500">
                    Nenhum registro encontrado para este período e filtros.
                  </td>
                </tr>
              ) : heatmapData.map(({ employee, dates }) => (
                <tr key={employee.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 group transition-colors">
                  <td className="p-3 sticky left-0 bg-slate-900 group-hover:bg-slate-800/40 z-10 border-r border-slate-800 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 border border-slate-700">
                        <User className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-200 truncate max-w-[180px]">{employee.name}</span>
                        <span className="text-[10px] text-slate-500">{employee.registrationNumber || 'Sem RE'}</span>
                      </div>
                    </div>
                  </td>
                  {period.days.map(day => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const schedule = dates[dateStr];
                    
                    return (
                      <td 
                        key={dateStr} 
                        className={`p-1 border-r border-slate-800/30 text-center ${[0, 6].includes(day.getDay()) ? 'bg-slate-800/10' : ''}`}
                      >
                        {schedule ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge 
                                  className={`h-8 w-8 flex items-center justify-center rounded-md cursor-pointer transition-transform hover:scale-110 p-0 border ${getSiglaColor(schedule.sigla)}`}
                                  onClick={() => onEditEscala?.(schedule)}
                                >
                                  {schedule.sigla || 'PL'}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent className="bg-slate-950 border-slate-700 text-white">
                                <p className="font-bold">{getSiglaName(schedule.sigla)}</p>
                                <p className="text-xs text-slate-400">{schedule.workPost?.name || 'Sem Posto'}</p>
                                <p className="text-xs text-slate-400">{schedule.shift === 'DAY' ? 'Diurno' : 'Noturno'}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <div className="h-8 w-8" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legenda */}
        <div className="p-4 bg-slate-950/50 border-t border-slate-800 flex flex-wrap gap-4 items-center justify-center">
            <div className="text-xs font-semibold text-slate-500 uppercase mr-2">Legenda:</div>
            {[
              { s: 'PL', l: 'Plantão', c: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' },
              { s: 'FE', l: 'Férias', c: 'bg-blue-500/20 text-blue-400 border-blue-500/50' },
              { s: 'AT', l: 'Atestado', c: 'bg-orange-500/20 text-orange-400 border-orange-500/50' },
              { s: 'FT', l: 'Falta', c: 'bg-red-500/20 text-red-400 border-red-500/50' },
              { s: 'HE', l: 'Hora Extra', c: 'bg-purple-500/20 text-purple-400 border-purple-500/50' },
              { s: 'MT', l: 'Monitoria', c: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50' },
              { s: 'RM', l: 'Remanejamento', c: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50' }
            ].map(item => (
              <div key={item.s} className="flex items-center gap-1.5">
                <Badge className={`h-6 w-8 flex items-center justify-center p-0 border ${item.c}`}>{item.s}</Badge>
                <span className="text-[11px] text-slate-400">{item.l}</span>
              </div>
            ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default MapaCalor;
