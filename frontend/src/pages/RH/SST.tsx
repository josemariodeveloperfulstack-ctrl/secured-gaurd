import React, { useState } from 'react';
import { StandardLayout } from '@/components/StandardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  Stethoscope, 
  HardHat, 
  AlertTriangle, 
  GraduationCap, 
  FileCheck, 
  Users, 
  BarChart3,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Activity,
  Plus,
  Loader2,
  Eye,
  Edit,
  Trash2,
  Download,
  Filter,
  Search
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SST: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const navigate = useNavigate();

  // Mock data - será substituído por dados reais da API
  const sstStats = {
    totalEmployees: 150,
    asoUpToDate: 142,
    asoExpiring: 8,
    epiValid: 145,
    epiExpiring: 5,
    accidentsThisMonth: 2,
    accidentsLastMonth: 4,
    trainingPending: 12,
    inspectionPending: 3,
    cipaMembers: 8,
    cipaExpiring: 2
  };

  const recentAccidents = [
    {
      id: '1',
      employee: 'João Silva',
      date: '2024-01-15',
      type: 'Quase Acidente',
      severity: 'Baixa',
      status: 'Investigando'
    },
    {
      id: '2',
      employee: 'Maria Santos',
      date: '2024-01-12',
      type: 'Acidente com Afastamento',
      severity: 'Média',
      status: 'Em Tratamento'
    }
  ];

  const expiringItems = [
    {
      id: '1',
      type: 'ASO',
      employee: 'Carlos Lima',
      expiryDate: '2024-01-25',
      daysLeft: 3
    },
    {
      id: '2',
      type: 'EPI',
      employee: 'Ana Costa',
      item: 'Capacete de Segurança',
      expiryDate: '2024-01-28',
      daysLeft: 6
    },
    {
      id: '3',
      type: 'Treinamento',
      employee: 'Pedro Oliveira',
      training: 'NR-35 - Trabalho em Altura',
      expiryDate: '2024-02-01',
      daysLeft: 10
    }
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Baixa':
        return 'bg-green-100 text-green-800';
      case 'Média':
        return 'bg-yellow-100 text-yellow-800';
      case 'Alta':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Investigando':
        return 'bg-blue-100 text-blue-800';
      case 'Em Tratamento':
        return 'bg-orange-100 text-orange-800';
      case 'Concluído':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getExpiryColor = (daysLeft: number) => {
    if (daysLeft <= 7) return 'text-red-600';
    if (daysLeft <= 30) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <StandardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-seguranca-lightgray flex items-center gap-2">
              <Shield className="h-8 w-8 text-seguranca-yellow" />
              Controle SST
            </h1>
            <p className="text-gray-400 mt-1">Saúde e Segurança do Trabalho - Conformidade Legal</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={() => navigate('/rh/sst/relatorios')}
              className="border-gray-600 text-seguranca-lightgray hover:bg-seguranca-black"
            >
              <Download className="h-4 w-4 mr-2" />
              Relatórios
            </Button>
            <Button 
              onClick={() => navigate('/rh/sst/exames')}
              className="bg-seguranca-red hover:bg-seguranca-darkred"
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Exame
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-seguranca-graphite border-gray-600">
            <TabsTrigger value="overview" className="text-seguranca-lightgray data-[state=active]:bg-seguranca-red">
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="compliance" className="text-seguranca-lightgray data-[state=active]:bg-seguranca-red">
              Conformidade
            </TabsTrigger>
            <TabsTrigger value="risks" className="text-seguranca-lightgray data-[state=active]:bg-seguranca-red">
              Riscos
            </TabsTrigger>
            <TabsTrigger value="actions" className="text-seguranca-lightgray data-[state=active]:bg-seguranca-red">
              Ações
            </TabsTrigger>
          </TabsList>

          {/* Visão Geral */}
          <TabsContent value="overview" className="space-y-6">
            {/* Cards de Estatísticas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-seguranca-graphite border-gray-600">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-seguranca-lightgray">ASO em Dia</CardTitle>
                  <Stethoscope className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-seguranca-lightgray">
                    {sstStats.asoUpToDate}/{sstStats.totalEmployees}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {((sstStats.asoUpToDate / sstStats.totalEmployees) * 100).toFixed(1)}% dos funcionários
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-seguranca-graphite border-gray-600">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-seguranca-lightgray">EPIs Válidos</CardTitle>
                  <HardHat className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-seguranca-lightgray">
                    {sstStats.epiValid}/{sstStats.totalEmployees}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {((sstStats.epiValid / sstStats.totalEmployees) * 100).toFixed(1)}% dos funcionários
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-seguranca-graphite border-gray-600">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-seguranca-lightgray">Acidentes (Mês)</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-seguranca-lightgray">{sstStats.accidentsThisMonth}</div>
                  <p className="text-xs text-gray-400 mt-1 flex items-center">
                    {sstStats.accidentsThisMonth < sstStats.accidentsLastMonth ? (
                      <TrendingDown className="h-3 w-3 text-green-500 mr-1" />
                    ) : (
                      <TrendingUp className="h-3 w-3 text-red-500 mr-1" />
                    )}
                    vs {sstStats.accidentsLastMonth} mês anterior
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-seguranca-graphite border-gray-600">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-seguranca-lightgray">Treinamentos Pendentes</CardTitle>
                  <GraduationCap className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-seguranca-lightgray">{sstStats.trainingPending}</div>
                  <p className="text-xs text-gray-400 mt-1">
                    {sstStats.inspectionPending} inspeções pendentes
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Alertas e Notificações */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Itens Vencendo */}
              <Card className="bg-seguranca-graphite border-gray-600">
                <CardHeader>
                  <CardTitle className="text-seguranca-lightgray flex items-center gap-2">
                    <Clock className="h-5 w-5 text-yellow-500" />
                    Vencimentos Próximos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {expiringItems.length > 0 ? (
                    <div className="space-y-3">
                      {expiringItems.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-seguranca-black rounded-lg border border-yellow-500">
                          <div>
                            <p className="font-medium text-seguranca-lightgray">{item.employee}</p>
                            <p className="text-sm text-gray-400">
                              {item.type}: {item.item || item.training}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge className={`${getExpiryColor(item.daysLeft)} bg-transparent border-0`}>
                              {item.daysLeft} dias
                            </Badge>
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(item.expiryDate).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                      <p className="text-seguranca-lightgray">Nenhum vencimento próximo</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Acidentes Recentes */}
              <Card className="bg-seguranca-graphite border-gray-600">
                <CardHeader>
                  <CardTitle className="text-seguranca-lightgray flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    Acidentes Recentes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {recentAccidents.length > 0 ? (
                    <div className="space-y-3">
                      {recentAccidents.map((accident) => (
                        <div key={accident.id} className="flex items-center justify-between p-3 bg-seguranca-black rounded-lg border border-red-500">
                          <div>
                            <p className="font-medium text-seguranca-lightgray">{accident.employee}</p>
                            <p className="text-sm text-gray-400">{accident.type}</p>
                          </div>
                          <div className="text-right">
                            <Badge className={getSeverityColor(accident.severity)}>
                              {accident.severity}
                            </Badge>
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(accident.date).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                      <p className="text-seguranca-lightgray">Nenhum acidente recente</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Ações Rápidas */}
            <Card className="bg-seguranca-graphite border-gray-600">
              <CardHeader>
                <CardTitle className="text-seguranca-lightgray">Ações Rápidas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Button 
                    variant="outline" 
                    onClick={() => navigate('/rh/sst/exames')}
                    className="border-gray-600 text-seguranca-lightgray hover:bg-seguranca-black h-20 flex-col"
                  >
                    <Stethoscope size={20} />
                    <span className="text-sm mt-1">Exames Médicos</span>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={() => navigate('/rh/sst/epis')}
                    className="border-gray-600 text-seguranca-lightgray hover:bg-seguranca-black h-20 flex-col"
                  >
                    <HardHat size={20} />
                    <span className="text-sm mt-1">EPIs</span>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={() => navigate('/rh/sst/acidentes')}
                    className="border-gray-600 text-seguranca-lightgray hover:bg-seguranca-black h-20 flex-col"
                  >
                    <AlertTriangle size={20} />
                    <span className="text-sm mt-1">Acidentes</span>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={() => navigate('/rh/sst/treinamentos')}
                    className="border-gray-600 text-seguranca-lightgray hover:bg-seguranca-black h-20 flex-col"
                  >
                    <GraduationCap size={20} />
                    <span className="text-sm mt-1">Treinamentos</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Conformidade */}
          <TabsContent value="compliance" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="bg-seguranca-graphite border-gray-600 hover:border-gray-500 transition-colors cursor-pointer" onClick={() => navigate('/rh/sst/exames')}>
                <CardHeader>
                  <CardTitle className="text-seguranca-lightgray flex items-center gap-2">
                    <Stethoscope className="h-5 w-5 text-green-500" />
                    Exames Médicos (ASO)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-400 text-sm">
                    Controle de exames admissional, periódico, retorno, mudança de função e demissional
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-seguranca-graphite border-gray-600 hover:border-gray-500 transition-colors cursor-pointer" onClick={() => navigate('/rh/sst/epis')}>
                <CardHeader>
                  <CardTitle className="text-seguranca-lightgray flex items-center gap-2">
                    <HardHat className="h-5 w-5 text-blue-500" />
                    Equipamentos de Proteção
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-400 text-sm">
                    Entrega, controle e vencimento de EPIs por funcionário e cargo
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-seguranca-graphite border-gray-600 hover:border-gray-500 transition-colors cursor-pointer" onClick={() => navigate('/rh/sst/treinamentos')}>
                <CardHeader>
                  <CardTitle className="text-seguranca-lightgray flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-purple-500" />
                    Treinamentos SST
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-400 text-sm">
                    NR-35, CIPA, NR-10, brigada de incêndio e outros treinamentos obrigatórios
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-seguranca-graphite border-gray-600 hover:border-gray-500 transition-colors cursor-pointer" onClick={() => navigate('/rh/sst/inspecoes')}>
                <CardHeader>
                  <CardTitle className="text-seguranca-lightgray flex items-center gap-2">
                    <FileCheck className="h-5 w-5 text-orange-500" />
                    Inspeções e Auditorias
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-400 text-sm">
                    Checklists de segurança, inspeções de EPIs e auditorias de conformidade
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-seguranca-graphite border-gray-600 hover:border-gray-500 transition-colors cursor-pointer" onClick={() => navigate('/rh/sst/cipa')}>
                <CardHeader>
                  <CardTitle className="text-seguranca-lightgray flex items-center gap-2">
                    <Users className="h-5 w-5 text-cyan-500" />
                    CIPA
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-400 text-sm">
                    Gestão da Comissão Interna de Prevenção de Acidentes
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-seguranca-graphite border-gray-600 hover:border-gray-500 transition-colors cursor-pointer" onClick={() => navigate('/rh/sst/relatorios')}>
                <CardHeader>
                  <CardTitle className="text-seguranca-lightgray flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-gray-500" />
                    Relatórios SST
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-400 text-sm">
                    Relatórios de conformidade, estatísticas e indicadores de SST
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Riscos */}
          <TabsContent value="risks" className="space-y-6">
            <Card className="bg-seguranca-graphite border-gray-600">
              <CardHeader>
                <CardTitle className="text-seguranca-lightgray">Matriz de Riscos por Cargo</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-400">Em desenvolvimento - Matriz de riscos ocupacionais por cargo e setor</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Ações */}
          <TabsContent value="actions" className="space-y-6">
            <Card className="bg-seguranca-graphite border-gray-600">
              <CardHeader>
                <CardTitle className="text-seguranca-lightgray">Ações Corretivas Pendentes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-400">Em desenvolvimento - Ações corretivas e planos de ação</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </StandardLayout>
  );
};

export default SST;

