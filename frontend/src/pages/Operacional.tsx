import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Users, 
  MapPin, 
  Clock, 
  AlertTriangle, 
  BarChart3,
  FileText,
  Settings,
  Eye,
  Plus,
  Activity
} from 'lucide-react';
import { StandardLayout } from '@/components/StandardLayout';
import Equipamentos from './Equipamentos';
import EscalaTrabalhoTable from '@/components/operacional/EscalaTrabalhoTable';
import NotificacoesList from '@/components/operacional/NotificacoesList';
import OcorrenciasTable from '@/components/operacional/OcorrenciasTable';
import OcorrenciaFormModal from '@/components/operacional/OcorrenciaFormModal';
import EscalaFormModal from '@/components/EscalaFormModal';
import TransportGuideTab from '@/components/operacional/TransportGuideTab';
import VisitWidget from '@/components/operacional/VisitWidget';
import { scheduleService, Schedule, CreateScheduleDTO, UpdateScheduleDTO } from '@/services/scheduleService';

// Interface para o formulário de escala
interface EscalaFormData {
  employeeId: string;
  locationId: string;
  scheduleDate: Date;
  shift: string;
  startTime: string;
  endTime: string;
  observations: string;
}
import { notificationService, NotificationData } from '@/services/notificationService';
import { occurrenceService, Occurrence } from '@/services/occurrenceService';
import { activityReportService } from '@/services/activityReportService';
import { ActivityReport, CreateActivityReportDTO, ActivityReportFilters } from '@/types/activityReport';
import ActivityReportsTable from '@/components/operacional/ActivityReportsTable';
import ActivityReportModal from '@/components/operacional/ActivityReportModal';
import ShiftChangeTable from '@/components/operacional/ShiftChangeTable';
import { useToast } from '@/hooks/use-toast';

const Operacional: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'dashboard';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [escalas, setEscalas] = useState<Schedule[]>([]);
  const [isLoadingEscalas, setIsLoadingEscalas] = useState(false);
  const [notificacoes, setNotificacoes] = useState<NotificationData[]>([]);
  const [isLoadingNotificacoes, setIsLoadingNotificacoes] = useState(false);
  const [ocorrencias, setOcorrencias] = useState<Occurrence[]>([]);
  const [isLoadingOcorrencias, setIsLoadingOcorrencias] = useState(false);
  const [showOcorrenciaModal, setShowOcorrenciaModal] = useState(false);
  const [activityReports, setActivityReports] = useState<ActivityReport[]>([]);
  const [isLoadingActivityReports, setIsLoadingActivityReports] = useState(false);
  const [showActivityReportModal, setShowActivityReportModal] = useState(false);
  const [selectedActivityReport, setSelectedActivityReport] = useState<ActivityReport | null>(null);
  const [selectedOcorrencia, setSelectedOcorrencia] = useState<Occurrence | null>(null);
  const [showEscalaModal, setShowEscalaModal] = useState(false);
  const [selectedEscala, setSelectedEscala] = useState<Schedule | null>(null);
  const { toast } = useToast();







  // Reage a mudanças no parâmetro de URL
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    if (activeTab === 'escalas') {
      loadEscalas();
    } else if (activeTab === 'notificacoes') {
      loadNotificacoes();
    } else if (activeTab === 'ocorrencias') {
      loadOcorrencias();
    } else if (activeTab === 'atividades') {
      loadActivityReports();
    }
  }, [activeTab]);

  const loadEscalas = async () => {
    setIsLoadingEscalas(true);
    try {
      const data = await scheduleService.findAll();
      setEscalas(data);
      console.log('✅ Escalas carregadas:', data.length);
    } catch (error) {
      console.warn('⚠️ Erro ao carregar escalas, usando dados vazios:', error);
      setEscalas([]);
      toast({
        title: 'Aviso',
        description: 'Não foi possível carregar as escalas do servidor. Mostrando dados locais.',
        variant: 'default',
      });
    } finally {
      setIsLoadingEscalas(false);
    }
  };

  const loadNotificacoes = async () => {
    setIsLoadingNotificacoes(true);
    try {
      const data = await notificationService.getAllNotifications();
      setNotificacoes(data);
      console.log('✅ Notificações carregadas:', data.length);
    } catch (error) {
      console.warn('⚠️ Erro ao carregar notificações, usando dados vazios:', error);
      setNotificacoes([]);
      toast({
        title: 'Aviso',
        description: 'Não foi possível carregar as notificações do servidor. Mostrando dados locais.',
        variant: 'default',
      });
    } finally {
      setIsLoadingNotificacoes(false);
    }
  };

  const loadOcorrencias = async () => {
    setIsLoadingOcorrencias(true);
    try {
      const data = await occurrenceService.getOccurrences();
      setOcorrencias(data);
      console.log('✅ Ocorrências carregadas:', data.length);
    } catch (error) {
      console.warn('⚠️ Erro ao carregar ocorrências, usando dados de fallback:', error);
      // O occurrenceService já tem fallback interno, então não precisamos fazer nada aqui
      setOcorrencias([]);
      toast({
        title: 'Aviso',
        description: 'Conectado em modo offline. Algumas funcionalidades podem estar limitadas.',
        variant: 'default',
      });
    } finally {
      setIsLoadingOcorrencias(false);
    }
  };

  const handleRefreshEscalas = () => {
    loadEscalas();
  };

  const handleRefreshNotificacoes = () => {
    loadNotificacoes();
  };

  const handleRefreshOcorrencias = () => {
    loadOcorrencias();
  };

  const loadActivityReports = async () => {
    setIsLoadingActivityReports(true);
    try {
      const data = await activityReportService.getActivityReports();
      setActivityReports(data);
      console.log('✅ Relatórios de atividade carregados:', data.length);
    } catch (error) {
      console.warn('⚠️ Erro ao carregar relatórios de atividade:', error);
      setActivityReports([]);
      toast({
        title: 'Aviso',
        description: 'Não foi possível carregar os relatórios do servidor. Mostrando dados locais.',
        variant: 'default',
      });
    } finally {
      setIsLoadingActivityReports(false);
    }
  };

  const handleRefreshActivityReports = () => {
    loadActivityReports();
  };

  const handleCreateActivityReport = () => {
    setSelectedActivityReport(null);
    setShowActivityReportModal(true);
  };

  const handleEditActivityReport = (report: ActivityReport) => {
    setSelectedActivityReport(report);
    setShowActivityReportModal(true);
  };

  const handleViewActivityReport = (report: ActivityReport) => {
    toast({
      title: 'Visualizar Relatório',
      description: `Visualizando relatório de ${report.employeeName}`,
    });
    // TODO: Implementar modal de visualização detalhada
  };

  const handleDeleteActivityReport = async (report: ActivityReport) => {
    try {
      await activityReportService.deleteActivityReport(report.id);
      setActivityReports(prev => prev.filter(r => r.id !== report.id));
      toast({
        title: 'Sucesso',
        description: 'Relatório excluído com sucesso.',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao excluir relatório.',
        variant: 'destructive',
      });
    }
  };

  const handleApproveActivityReport = async (report: ActivityReport) => {
    try {
      const updatedReport = await activityReportService.approveReport(report.id);
      setActivityReports(prev => prev.map(r => r.id === report.id ? updatedReport : r));
      toast({
        title: 'Sucesso',
        description: 'Relatório aprovado com sucesso.',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao aprovar relatório.',
        variant: 'destructive',
      });
    }
  };

  const handleRejectActivityReport = async (report: ActivityReport) => {
    try {
      const reason = prompt('Motivo da rejeição:');
      if (!reason) return;
      
      const updatedReport = await activityReportService.rejectReport(report.id, reason);
      setActivityReports(prev => prev.map(r => r.id === report.id ? updatedReport : r));
      toast({
        title: 'Relatório rejeitado',
        description: 'Relatório rejeitado com sucesso.',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao rejeitar relatório.',
        variant: 'destructive',
      });
    }
  };

  const handleSaveActivityReport = async (reportData: CreateActivityReportDTO) => {
    try {
      if (selectedActivityReport) {
        // Atualizar relatório existente
        const updatedReport = await activityReportService.updateActivityReport(selectedActivityReport.id, reportData);
        setActivityReports(prev => prev.map(r => r.id === selectedActivityReport.id ? updatedReport : r));
        toast({
          title: 'Sucesso!',
          description: 'Relatório atualizado com sucesso.',
        });
      } else {
        // Criar novo relatório
        const newReport = await activityReportService.createActivityReport(reportData);
        setActivityReports(prev => [newReport, ...prev]);
        toast({
          title: 'Sucesso!',
          description: 'Relatório criado com sucesso.',
        });
      }
      setShowActivityReportModal(false);
      setSelectedActivityReport(null);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao salvar relatório.',
        variant: 'destructive',
      });
    }
  };

  const handleGenerateActivityReportPDF = async (filters: ActivityReportFilters) => {
    try {
      const blob = await activityReportService.generatePDFReport(filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio-atividades-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: 'Sucesso',
        description: 'Relatório PDF gerado com sucesso.',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao gerar relatório PDF.',
        variant: 'destructive',
      });
    }
  };

  const handleEditEscala = (escala: Schedule) => {
    setSelectedEscala(escala);
    setShowEscalaModal(true);
  };

  const handleDeleteEscala = (escala: Schedule) => {
    toast({
      title: 'Excluir Escala',
      description: `Excluindo escala de ${escala.employee.name}`,
      variant: 'destructive',
    });
    // TODO: Implementar confirmação e exclusão
  };

  const handleViewEscala = (escala: Schedule) => {
    toast({
      title: 'Visualizar Escala',
      description: `Visualizando escala de ${escala.employee.name}`,
    });
    // TODO: Implementar modal de visualização
  };

  const handleCreateEscala = () => {
    setSelectedEscala(null);
    setShowEscalaModal(true);
  };

  const handleMarkNotificationAsRead = (id: string) => {
    setNotificacoes(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, lida: true } : notif
      )
    );
    toast({
      title: 'Notificação marcada como lida',
      description: 'A notificação foi marcada como lida.',
    });
  };

  const handleMarkAllNotificationsAsRead = () => {
    setNotificacoes(prev => 
      prev.map(notif => ({ ...notif, lida: true }))
    );
    toast({
      title: 'Todas as notificações marcadas como lidas',
      description: 'Todas as notificações foram marcadas como lidas.',
    });
  };

  const handleDeleteNotification = (id: string) => {
    setNotificacoes(prev => prev.filter(notif => notif.id !== id));
    toast({
      title: 'Notificação excluída',
      description: 'A notificação foi excluída com sucesso.',
    });
  };

  const handleEditOcorrencia = (ocorrencia: Occurrence) => {
    setSelectedOcorrencia(ocorrencia);
    setShowOcorrenciaModal(true);
  };

  const handleDeleteOcorrencia = (ocorrencia: Occurrence) => {
    toast({
      title: 'Excluir Ocorrência',
      description: `Excluindo ocorrência: ${ocorrencia.title}`,
      variant: 'destructive',
    });
    // TODO: Implementar confirmação e exclusão
  };

  const handleViewOcorrencia = (ocorrencia: Occurrence) => {
    toast({
      title: 'Visualizar Ocorrência',
      description: `Visualizando ocorrência: ${ocorrencia.title}`,
    });
    // TODO: Implementar modal de visualização
  };

  const handleCreateOcorrencia = () => {
    setSelectedOcorrencia(null);
    setShowOcorrenciaModal(true);
  };

  const handleSaveOcorrencia = async (ocorrencia: Occurrence) => {
    try {
      if (selectedOcorrencia) {
        // Atualizar ocorrência existente
        await occurrenceService.updateOccurrence(ocorrencia.id, ocorrencia);
        setOcorrencias(prev => prev.map(o => o.id === ocorrencia.id ? ocorrencia : o));
        toast({
          title: 'Sucesso!',
          description: 'Ocorrência atualizada com sucesso.',
        });
      } else {
        // Criar nova ocorrência
        const newOcorrencia = await occurrenceService.createOccurrence(ocorrencia);
        setOcorrencias(prev => [newOcorrencia, ...prev]);
        toast({
          title: 'Sucesso!',
          description: 'Ocorrência criada com sucesso.',
        });
      }
      setShowOcorrenciaModal(false);
      setSelectedOcorrencia(null);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao salvar ocorrência.',
        variant: 'destructive',
      });
    }
  };

  const handleSaveEscala = async (escalaData: EscalaFormData) => {
    try {
      // Converter dados do formulário para o formato da API
      const scheduleData: CreateScheduleDTO = {
        employeeId: escalaData.employeeId,
        locationId: escalaData.locationId,
        scheduleDate: escalaData.scheduleDate.toISOString().split('T')[0], // Converter Date para string YYYY-MM-DD
        shift: escalaData.shift as 'DAY' | 'NIGHT' | 'MIXED', // Converter string para Shift
        status: 'PENDING', // Status padrão para novas escalas
        observations: escalaData.observations
      };

      if (selectedEscala) {
        // Atualizar escala existente
        const updateData: UpdateScheduleDTO = scheduleData;
        await scheduleService.update(selectedEscala.id, updateData);
        setEscalas(prev => prev.map(e => e.id === selectedEscala.id ? { ...e, ...scheduleData } : e));
        toast({
          title: 'Sucesso!',
          description: 'Escala atualizada com sucesso.',
        });
      } else {
        // Criar nova escala
        const newEscala = await scheduleService.create(scheduleData);
        setEscalas(prev => [newEscala, ...prev]);
        toast({
          title: 'Sucesso!',
          description: 'Escala criada com sucesso.',
        });
      }
      setShowEscalaModal(false);
      setSelectedEscala(null);
    } catch (error) {
      console.error('Erro ao salvar escala:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao salvar escala.',
        variant: 'destructive',
      });
    }
  };

  const renderDashboard = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Equipamentos Ativos</CardTitle>
          <Shield className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">24</div>
          <p className="text-xs text-muted-foreground">
            +2 desde o último mês
          </p>
        </CardContent>
      </Card>

      <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Funcionários em Serviço</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
          <div className="text-2xl font-bold">18</div>
          <p className="text-xs text-muted-foreground">
            +1 desde ontem
              </p>
            </CardContent>
          </Card>

      <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Postos Ativos</CardTitle>
          <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
          <div className="text-2xl font-bold">12</div>
          <p className="text-xs text-muted-foreground">
            Todos operacionais
              </p>
            </CardContent>
          </Card>

      <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Alertas Pendentes</CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">3</div>
          <p className="text-xs text-muted-foreground">
            2 equipamentos vencendo
          </p>
        </CardContent>
      </Card>
    </div>
  );

  const renderEquipamentosTab = () => (
    <div className="space-y-4">
      {/* Componente Equipamentos */}
      <Equipamentos />
    </div>
  );







  return (
    <StandardLayout>
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Módulo Operacional</h1>
          <p className="text-muted-foreground">
            Gestão completa das operações de segurança
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="equipamentos" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Equipamentos
            </TabsTrigger>
            <TabsTrigger value="escalas" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Escalas
            </TabsTrigger>
            <TabsTrigger value="notificacoes" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Notificações
            </TabsTrigger>
            <TabsTrigger value="ocorrencias" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Ocorrências
            </TabsTrigger>
            <TabsTrigger value="atividades" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Registro de Atividade
            </TabsTrigger>
            <TabsTrigger value="troca-plantao" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Troca de Plantão
            </TabsTrigger>
            <TabsTrigger value="guia-transporte" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Guia de Transporte
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-6">
            {renderDashboard()}
            
            {/* Widget de Controle de Visitas */}
            <div className="mb-6">
              <VisitWidget />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Atividade Recente</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm">Equipamento EQ-001 atribuído a João Silva</span>
                      <span className="text-xs text-muted-foreground ml-auto">2h atrás</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <span className="text-sm">Alerta: Arma AR-002 vencendo em 15 dias</span>
                      <span className="text-xs text-muted-foreground ml-auto">4h atrás</span>
                        </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-sm">Nova escala criada para Portaria Principal</span>
                      <span className="text-xs text-muted-foreground ml-auto">6h atrás</span>
                      </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Próximas Ações</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Renovar registro AR-003</p>
                        <p className="text-sm text-muted-foreground">Vence em 5 dias</p>
                      </div>
                      <Button size="sm">Ver Detalhes</Button>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Manutenção EQ-005</p>
                        <p className="text-sm text-muted-foreground">Agendada para amanhã</p>
                        </div>
                      <Button size="sm">Ver Detalhes</Button>
                        </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Relatório mensal</p>
                        <p className="text-sm text-muted-foreground">Vencimento em 2 dias</p>
                      </div>
                      <Button size="sm">Gerar</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="equipamentos" className="mt-6">
            {renderEquipamentosTab()}
          </TabsContent>

          <TabsContent value="escalas" className="mt-6">
            <EscalaTrabalhoTable
              escalas={escalas}
              isLoading={isLoadingEscalas}
              onRefresh={handleRefreshEscalas}
              onEdit={handleEditEscala}
              onDelete={handleDeleteEscala}
              onView={handleViewEscala}
              onCreate={handleCreateEscala}
            />
          </TabsContent>

          <TabsContent value="notificacoes" className="mt-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold">Notificações</h2>
                    <p className="text-muted-foreground">
                      Sistema de notificações e alertas operacionais
                    </p>
                  </div>
                  <Button variant="outline">
                    <Settings className="h-4 w-4 mr-2" />
                    Configurações
                  </Button>
                </div>
                
                <NotificacoesList
                  notificacoes={notificacoes}
                  onRefresh={handleRefreshNotificacoes}
                  onMarkAsRead={handleMarkNotificationAsRead}
                  onMarkAllAsRead={handleMarkAllNotificationsAsRead}
                  onDelete={handleDeleteNotification}
                />
              </div>
          </TabsContent>

          <TabsContent value="ocorrencias" className="mt-6">
            <OcorrenciasTable
              ocorrencias={ocorrencias}
              onRefresh={handleRefreshOcorrencias}
              onEdit={handleEditOcorrencia}
              onDelete={handleDeleteOcorrencia}
              onView={handleViewOcorrencia}
              onCreate={handleCreateOcorrencia}
            />
          </TabsContent>

          <TabsContent value="atividades" className="mt-6">
            <ActivityReportsTable
              reports={activityReports}
              isLoading={isLoadingActivityReports}
              onRefresh={handleRefreshActivityReports}
              onCreate={handleCreateActivityReport}
              onEdit={handleEditActivityReport}
              onView={handleViewActivityReport}
              onDelete={handleDeleteActivityReport}
              onApprove={handleApproveActivityReport}
              onReject={handleRejectActivityReport}
              onGeneratePDF={handleGenerateActivityReportPDF}
            />
          </TabsContent>

          <TabsContent value="troca-plantao" className="mt-6">
            <ShiftChangeTable onRefresh={() => {}} />
          </TabsContent>

          <TabsContent value="guia-transporte" className="mt-6">
            <TransportGuideTab />
          </TabsContent>
        </Tabs>

        {/* Modal de Ocorrência */}
        <OcorrenciaFormModal
          ocorrencia={selectedOcorrencia}
          open={showOcorrenciaModal}
          onOpenChange={setShowOcorrenciaModal}
          onSave={handleSaveOcorrencia}
        />

        {/* Modal de Escala */}
        <EscalaFormModal
          open={showEscalaModal}
          onOpenChange={setShowEscalaModal}
          onSave={handleSaveEscala}
          initialData={selectedEscala}
        />

        {/* Modal de Relatório de Atividade */}
        <ActivityReportModal
          open={showActivityReportModal}
          onOpenChange={setShowActivityReportModal}
          report={selectedActivityReport}
          onSave={handleSaveActivityReport}
        />
      </div>
    </StandardLayout>
  );
};

export default Operacional;
