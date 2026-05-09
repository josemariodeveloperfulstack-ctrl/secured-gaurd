import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { StandardLayout } from '@/components/StandardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  Calendar, 
  FileText, 
  Award, 
  MapPin, 
  CheckCircle2, 
  AlertCircle,
  PlayCircle,
  ArrowRight,
  History,
  Timer,
  Wifi,
  WifiOff,
  ChevronRight,
  User,
  Home,
  LogOut,
  Bell,
  Palmtree,
  GraduationCap,
  FileSignature,
  Headphones,
  Settings,
  Search,
  Filter,
  Loader2,
  Lock,
  Shield,
  MessageCircle,
  QrCode
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { timeRecordService } from '@/services/timeRecordService';
import { feriasService } from '@/services/feriasService';
import { trainingService } from '@/services/trainingService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import supportService, { TicketCategory, TicketPriority } from '@/services/supportService';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

// Importando componentes das abas
import MeuPerfil from './MeuPerfil';
import MeuPonto from './MeuPonto';
import MeusHolerites from './MeusHolerites';
import MinhasFerias from './MinhasFerias';
import MeusEPIs from './MeusEPIs';

type TabType = 'dashboard' | 'perfil' | 'ponto' | 'holerites' | 'documentos' | 'treinamentos' | 'ferias' | 'notificacoes' | 'epis';

const EmployeePortal: React.FC = () => {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // States para o Dashboard
  const [todayRecords, setTodayRecords] = useState<any[]>([]);
  const [nextRecordType, setNextRecordType] = useState<string>('ENTRADA');
  const [vacationInfo, setVacationInfo] = useState<any>(null);
  const [certifications, setCertifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Support Ticket State
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [ticketLoading, setTicketLoading] = useState(false);
  const [ticketForm, setTicketForm] = useState({
    title: '',
    description: '',
    category: 'GENERAL_INQUIRY' as TicketCategory,
    priority: 'NORMAL' as TicketPriority
  });

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const employeeId = user.id;
      
      const [recordsRes, nextRes, feriasRes, certsRes] = await Promise.all([
        timeRecordService.getTodayRecords(employeeId),
        timeRecordService.getNextRecordType(employeeId),
        feriasService.getFeriasByEmployee(employeeId).catch(() => []),
        trainingService.getEmployeeCertifications({ employeeId }).catch(() => [])
      ]);

      if (recordsRes.success) setTodayRecords(recordsRes.data || []);
      if (nextRes.success) setNextRecordType(nextRes.nextRecordType || 'ENTRADA');
      
      if (feriasRes && feriasRes.length > 0) {
        setVacationInfo(feriasRes[0]);
      }
      
      setCertifications(certsRes || []);
    } catch (error) {
      console.error('Erro ao buscar dados do portal:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [fetchData]);

  const handleCreateTicket = async () => {
    if (!ticketForm.title || !ticketForm.description) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha o assunto e a descrição.",
        variant: "destructive"
      });
      return;
    }

    setTicketLoading(true);
    try {
      await supportService.createTicket({
        title: ticketForm.title,
        description: ticketForm.description,
        category: ticketForm.category,
        priority: ticketForm.priority,
        userId: user?.id || '',
        userName: user?.name || '',
        userEmail: user?.email || ''
      });

      toast({
        title: "Chamado aberto!",
        description: "Sua solicitação foi enviada ao RH com sucesso.",
      });
      setShowSupportModal(false);
      setTicketForm({
        title: '',
        description: '',
        category: 'GENERAL_INQUIRY',
        priority: 'NORMAL'
      });
    } catch (error: any) {
      toast({
        title: "Erro ao abrir chamado",
        description: error.response?.data?.message || "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    } finally {
      setTicketLoading(false);
    }
  };

  const menuItems = [
    { id: 'dashboard', label: 'Início', icon: Home },
    { id: 'perfil', label: 'Meu Perfil', icon: User },
    { id: 'ponto', label: 'Ponto Eletrônico', icon: Clock },
    { id: 'holerites', label: 'Holerites', icon: FileText },
    { id: 'documentos', label: 'Documentos', icon: FileSignature },
    { id: 'treinamentos', label: 'Treinamentos', icon: GraduationCap },
    { id: 'ferias', label: 'Férias', icon: Palmtree },
    { id: 'epis', label: 'Meus EPIs', icon: HardHat },
    { id: 'notificacoes', label: 'Notificações', icon: Bell },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Boas vindas */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-seguranca-black/40 p-8 rounded-[2rem] border border-gray-800">
              <div>
                <h1 className="text-3xl font-black text-white tracking-tight">
                  Bem-vindo, {user?.name?.split(' ')[0]}!
                </h1>
                <div className="text-seguranca-lightgray font-medium flex items-center gap-2">
                  <Badge variant="outline" className="bg-seguranca-yellow/10 border-seguranca-yellow/20 text-seguranca-yellow font-bold px-2 py-0 h-5 text-[10px]">
                    {user?.role?.replace('ROLE_', '')}
                  </Badge>
                  {user?.position || 'Colaborador'} • {user?.department || 'Operacional'}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                    {format(currentTime, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                  </p>
                  <p className="text-2xl font-black text-white tabular-nums tracking-tighter">
                    {format(currentTime, 'HH:mm:ss')}
                  </p>
                </div>
                <Button 
                  onClick={() => setActiveTab('ponto')}
                  className="bg-seguranca-yellow hover:bg-seguranca-yellow/90 text-seguranca-black font-black rounded-xl h-12 px-6 shadow-lg shadow-seguranca-yellow/20"
                >
                  <Clock className="w-5 h-5 mr-2" /> Bater ponto
                </Button>
              </div>
            </div>

            {/* Grid de Stats Rápidas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-seguranca-graphite/40 border-gray-800 rounded-3xl hover:border-seguranca-yellow/30 transition-all group">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Saldo de Horas</span>
                    <Clock className="w-4 h-4 text-seguranca-yellow group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="text-3xl font-black text-white">+00:00</div>
                  <p className="text-[10px] text-gray-600 font-bold mt-1 uppercase">Mês de {format(new Date(), 'MMMM', { locale: ptBR })}</p>
                </CardContent>
              </Card>

              <Card className="bg-seguranca-graphite/40 border-gray-800 rounded-3xl hover:border-emerald-500/30 transition-all group">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Dias de Férias</span>
                    <Palmtree className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="text-3xl font-black text-white">
                    {vacationInfo ? '30' : '0'}
                  </div>
                  <p className="text-[10px] text-gray-600 font-bold mt-1 uppercase">Período Aquisitivo OK</p>
                </CardContent>
              </Card>

              <Card className="bg-seguranca-graphite/40 border-gray-800 rounded-3xl hover:border-indigo-500/30 transition-all group">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Certificações</span>
                    <GraduationCap className="w-4 h-4 text-indigo-500 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="text-3xl font-black text-white">{certifications.length}</div>
                  <p className="text-[10px] text-gray-600 font-bold mt-1 uppercase">Válidas e Atualizadas</p>
                </CardContent>
              </Card>

              <Card className="bg-seguranca-graphite/40 border-gray-800 rounded-3xl hover:border-rose-500/30 transition-all group">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Notificações</span>
                    <Bell className="w-4 h-4 text-rose-500 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="text-3xl font-black text-white">0</div>
                  <p className="text-[10px] text-gray-600 font-bold mt-1 uppercase">Não lidas</p>
                </CardContent>
              </Card>
            </div>

            {/* Alerta de Suporte */}
            <Card className="bg-gradient-to-r from-seguranca-darkred/20 to-seguranca-black border-seguranca-red/20 rounded-[2.5rem] p-6 sm:p-8">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="w-16 h-16 rounded-3xl bg-seguranca-red/10 flex items-center justify-center shrink-0">
                  <Headphones className="w-8 h-8 text-seguranca-red" />
                </div>
                <div className="flex-1 text-center md:text-left space-y-1">
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">Precisa de ajuda com o RH?</h3>
                  <p className="text-seguranca-lightgray text-sm">Abra um chamado diretamente com nosso time para dúvidas sobre holerites, férias ou documentos.</p>
                </div>
                <Button 
                  onClick={() => setShowSupportModal(true)}
                  className="bg-seguranca-red hover:bg-seguranca-darkred text-white font-black px-8 h-14 rounded-2xl shadow-xl shadow-seguranca-red/10 uppercase tracking-widest text-xs"
                >
                  Abrir Chamado RH
                </Button>
              </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Holerites Recentes */}
              <Card className="bg-seguranca-graphite/20 border-gray-800 rounded-3xl overflow-hidden">
                <CardHeader className="border-b border-gray-800/50 flex flex-row items-center justify-between">
                  <CardTitle className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-400" /> Holerites Recentes
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab('holerites')} className="text-[10px] font-black uppercase text-seguranca-yellow hover:bg-seguranca-yellow/10">
                    Ver todos <ChevronRight className="w-3 h-3 ml-1" />
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="p-8 text-center text-gray-600">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-10" />
                    <p className="text-sm font-bold uppercase tracking-tight">Nenhum holerite encontrado</p>
                    <p className="text-xs mt-1">Seus documentos aparecerão aqui assim que forem emitidos.</p>
                  </div>
                </CardContent>
              </Card>

              {/* Notificações Recentes */}
              <Card className="bg-seguranca-graphite/20 border-gray-800 rounded-3xl overflow-hidden">
                <CardHeader className="border-b border-gray-800/50 flex flex-row items-center justify-between">
                  <CardTitle className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <Bell className="w-4 h-4 text-rose-400" /> Notificações Recentes
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="p-8 text-center text-gray-600">
                    <Bell className="w-12 h-12 mx-auto mb-4 opacity-10" />
                    <p className="text-sm font-bold uppercase tracking-tight">Tudo em dia!</p>
                    <p className="text-xs mt-1">Você não tem novas notificações no momento.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );
      case 'perfil': return <div className="animate-in fade-in duration-500"><MeuPerfil standalone={true} /></div>;
      case 'ponto': return <div className="animate-in fade-in duration-500"><MeuPonto standalone={true} /></div>;
      case 'holerites': return <div className="animate-in fade-in duration-500"><MeusHolerites standalone={true} /></div>;
      case 'ferias': return <div className="animate-in fade-in duration-500"><MinhasFerias standalone={true} /></div>;
      case 'treinamentos': return <div className="animate-in fade-in duration-500"><Certificacoes standalone={true} /></div>;
      case 'epis': return <div className="animate-in fade-in duration-500"><MeusEPIs standalone={true} /></div>;
      case 'documentos':
        return (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in duration-500">
            <div className="w-16 h-16 bg-seguranca-graphite rounded-full flex items-center justify-center mb-4">
              <FileSignature className="h-8 w-8 text-gray-500" />
            </div>
            <h3 className="text-xl font-medium text-white mb-2">Seus Documentos</h3>
            <p className="text-gray-400 max-w-xs mx-auto">
              Contratos, termos e outros documentos assinados aparecerão aqui em breve.
            </p>
          </div>
        );
      case 'notificacoes':
        return (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in duration-500">
            <div className="w-16 h-16 bg-seguranca-graphite rounded-full flex items-center justify-center mb-4">
              <Bell className="h-8 w-8 text-gray-500" />
            </div>
            <h3 className="text-xl font-medium text-white mb-2">Tudo em dia!</h3>
            <p className="text-gray-400 max-w-xs mx-auto">
              Você não possui notificações pendentes ou alertas no momento.
            </p>
          </div>
        );
      default:
        return (
          <div className="flex flex-col items-center justify-center py-20 text-gray-600">
            <Settings className="w-16 h-16 mb-4 animate-spin-slow opacity-20" />
            <h2 className="text-xl font-black uppercase tracking-widest">Em Desenvolvimento</h2>
            <p className="text-sm">Esta funcionalidade estará disponível em breve.</p>
          </div>
        );
    }
  };

  return (
    <StandardLayout title="Portal do Funcionário">
      <div className="flex min-h-[calc(100vh-12rem)] gap-8">
        {/* Sidebar Interna */}
        <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-seguranca-black/40 border border-gray-800 rounded-[2.5rem] p-6 shadow-2xl">
          <nav className="flex-1 space-y-2">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as TabType)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 group",
                  activeTab === item.id 
                    ? "bg-seguranca-yellow text-seguranca-black font-black shadow-lg shadow-seguranca-yellow/10" 
                    : "text-gray-500 hover:text-seguranca-lightgray hover:bg-white/5"
                )}
              >
                <item.icon className={cn(
                  "w-5 h-5 transition-transform group-hover:scale-110",
                  activeTab === item.id ? "text-seguranca-black" : "text-gray-600 group-hover:text-seguranca-yellow"
                )} />
                <span className="text-sm tracking-tight">{item.label}</span>
                {activeTab === item.id && (
                  <ChevronRight className="w-4 h-4 ml-auto" />
                )}
              </button>
            ))}
          </nav>

          <div className="mt-8 pt-8 border-t border-gray-800/50">
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-rose-500 hover:bg-rose-500/10 transition-all font-bold group"
            >
              <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <span className="text-sm">Sair do Portal</span>
            </button>
          </div>
        </aside>

        {/* Área de Conteúdo */}
        <main className="flex-1 min-w-0">
          {renderContent()}
        </main>
      </div>

      {/* Modal de Suporte */}
      <Dialog open={showSupportModal} onOpenChange={setShowSupportModal}>
        <DialogContent className="max-w-md bg-seguranca-graphite border-gray-700 text-white rounded-[2.5rem]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-tight text-seguranca-yellow flex items-center gap-3">
              <Headphones className="w-6 h-6" /> Abrir Chamado RH
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Descreva sua solicitação e nossa equipe responderá em breve.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-6">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Assunto</Label>
              <Input
                id="title"
                placeholder="Ex: Dúvida sobre holerite de Março"
                className="bg-seguranca-black border-gray-800 rounded-2xl h-12 px-4 focus:ring-seguranca-yellow/20"
                value={ticketForm.title}
                onChange={(e) => setTicketForm({ ...ticketForm, title: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Categoria</Label>
                <Select
                  value={ticketForm.category}
                  onValueChange={(v: any) => setTicketForm({ ...ticketForm, category: v })}
                >
                  <SelectTrigger className="bg-seguranca-black border-gray-800 rounded-2xl h-12">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="bg-seguranca-graphite border-gray-700 text-white rounded-xl">
                    <SelectItem value="PAYROLL">Holerite / Pagamento</SelectItem>
                    <SelectItem value="VACATION">Férias</SelectItem>
                    <SelectItem value="BENEFITS">Benefícios</SelectItem>
                    <SelectItem value="DOCUMENTATION">Documentação</SelectItem>
                    <SelectItem value="GENERAL_INQUIRY">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Prioridade</Label>
                <Select
                  value={ticketForm.priority}
                  onValueChange={(v: any) => setTicketForm({ ...ticketForm, priority: v })}
                >
                  <SelectTrigger className="bg-seguranca-black border-gray-800 rounded-2xl h-12">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="bg-seguranca-graphite border-gray-700 text-white rounded-xl">
                    <SelectItem value="LOW">Baixa</SelectItem>
                    <SelectItem value="NORMAL">Normal</SelectItem>
                    <SelectItem value="HIGH">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Descrição detalhada</Label>
              <Textarea
                id="description"
                placeholder="Explique o que você precisa..."
                className="bg-seguranca-black border-gray-800 rounded-2xl min-h-[120px] p-4 focus:ring-seguranca-yellow/20"
                value={ticketForm.description}
                onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              className="w-full bg-seguranca-yellow hover:bg-seguranca-yellow/90 text-seguranca-black font-black h-14 rounded-2xl shadow-xl shadow-seguranca-yellow/10 uppercase tracking-widest text-xs"
              onClick={handleCreateTicket}
              disabled={ticketLoading}
            >
              {ticketLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> ENVIANDO...
                </>
              ) : (
                'ENVIAR SOLICITAÇÃO'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </StandardLayout>
  );
};

export default EmployeePortal;
