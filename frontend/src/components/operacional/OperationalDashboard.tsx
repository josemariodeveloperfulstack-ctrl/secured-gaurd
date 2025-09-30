import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Calendar,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  UserCheck,
  UserX,
  MapPin,
  Activity,
  Plus,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VacationCoverage {
  id: string;
  employeeName: string;
  substituteName: string;
  startDate: string;
  endDate: string;
  status: 'PENDING' | 'CONFIRMED' | 'NO_COVERAGE';
  location: string;
}

interface Absence {
  id: string;
  employeeName: string;
  date: string;
  type: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  isJustified: boolean;
}

interface WorkAssignment {
  id: string;
  employeeName: string;
  location: string;
  shift: string;
  startTime: string;
  endTime: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
}

interface SpecificActivity {
  id: string;
  employeeName: string;
  type: string;
  date: string;
  time: string;
  location: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'OVERDUE';
}

const OperationalDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('vacations');
  const [vacationCoverages, setVacationCoverages] = useState<VacationCoverage[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [workAssignments, setWorkAssignments] = useState<WorkAssignment[]>([]);
  const [specificActivities, setSpecificActivities] = useState<SpecificActivity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const { toast } = useToast();

  // Dados de exemplo baseados nas imagens
  useEffect(() => {
    loadOperationalData();
  }, []);

  const loadOperationalData = () => {
    setIsLoading(true);
    
    // Simular carregamento de dados
    setTimeout(() => {
      setVacationCoverages([
        {
          id: '1',
          employeeName: 'ROGERIO CESAR',
          substituteName: 'FREDIANO',
          startDate: '30/07/2024',
          endDate: '28/08/2024',
          status: 'CONFIRMED',
          location: 'Posto Principal'
        },
        {
          id: '2',
          employeeName: 'FABIO WAGNER',
          substituteName: 'TIAGO',
          startDate: '30/07/2024',
          endDate: '28/08/2024',
          status: 'CONFIRMED',
          location: 'Portaria'
        },
        {
          id: '3',
          employeeName: 'TARCISIO',
          substituteName: 'ALEX E BRUNO (MVC)',
          startDate: '01/08/2024',
          endDate: '31/08/2024',
          status: 'NO_COVERAGE',
          location: 'MVC'
        }
      ]);

      setAbsences([
        {
          id: '1',
          employeeName: 'Paulo',
          date: '23/08/2024',
          type: 'FALTA',
          reason: 'Atestado médico',
          status: 'APPROVED',
          isJustified: true
        },
        {
          id: '2',
          employeeName: 'Viviana',
          date: '17/08/2024',
          type: 'FALTA',
          reason: 'Pessoal',
          status: 'PENDING',
          isJustified: false
        }
      ]);

      setWorkAssignments([
        {
          id: '1',
          employeeName: 'GIDELVAN',
          location: 'NOTURNO',
          shift: 'Noturno',
          startTime: '22:00',
          endTime: '06:00',
          status: 'ACTIVE'
        },
        {
          id: '2',
          employeeName: 'ALEX',
          location: 'ITATIAIA',
          shift: 'Diurno',
          startTime: '06:00',
          endTime: '18:00',
          status: 'ACTIVE'
        }
      ]);

      setSpecificActivities([
        {
          id: '1',
          employeeName: 'Edison',
          type: 'PODA DA GRAMA',
          date: '28/08/2024',
          time: 'Quinta-feira',
          location: 'Trans des MTZ',
          status: 'SCHEDULED'
        },
        {
          id: '2',
          employeeName: 'Equipe Limpeza',
          type: 'LIMPEZA VIDROS',
          date: '30/08/2024',
          time: 'Sábado',
          location: 'Shopping',
          status: 'SCHEDULED'
        }
      ]);

      setIsLoading(false);
    }, 1000);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      PENDING: { variant: 'secondary' as const, text: 'Pendente' },
      CONFIRMED: { variant: 'default' as const, text: 'Confirmado' },
      NO_COVERAGE: { variant: 'destructive' as const, text: 'Sem Cobertura' },
      ACTIVE: { variant: 'default' as const, text: 'Ativo' },
      COMPLETED: { variant: 'default' as const, text: 'Concluído' },
      APPROVED: { variant: 'default' as const, text: 'Aprovado' },
      REJECTED: { variant: 'destructive' as const, text: 'Rejeitado' },
      SCHEDULED: { variant: 'secondary' as const, text: 'Agendado' },
      OVERDUE: { variant: 'destructive' as const, text: 'Atrasado' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING;
    return <Badge variant={config.variant}>{config.text}</Badge>;
  };

  const renderVacationCoverages = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Coberturas de Férias</h3>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Nova Cobertura
        </Button>
      </div>
      
      <div className="grid gap-4">
        {vacationCoverages.map((coverage) => (
          <Card key={coverage.id}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-blue-600" />
                    <span className="font-medium">{coverage.employeeName}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="font-medium text-green-600">{coverage.substituteName}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {coverage.startDate} - {coverage.endDate}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3 inline mr-1" />
                    {coverage.location}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(coverage.status)}
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline">
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Edit className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderAbsences = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Controle de Faltas</h3>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Nova Falta
        </Button>
      </div>
      
      <div className="grid gap-4">
        {absences.map((absence) => (
          <Card key={absence.id}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {absence.isJustified ? (
                      <UserCheck className="h-4 w-4 text-green-600" />
                    ) : (
                      <UserX className="h-4 w-4 text-red-600" />
                    )}
                    <span className="font-medium">{absence.employeeName}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <Calendar className="h-3 w-3 inline mr-1" />
                    {absence.date} - {absence.type}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {absence.reason}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(absence.status)}
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline">
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Edit className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderWorkAssignments = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Atribuições de Posto</h3>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Nova Atribuição
        </Button>
      </div>
      
      <div className="grid gap-4">
        {workAssignments.map((assignment) => (
          <Card key={assignment.id}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-600" />
                    <span className="font-medium">{assignment.employeeName}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3 inline mr-1" />
                    {assignment.location}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <Clock className="h-3 w-3 inline mr-1" />
                    {assignment.startTime} - {assignment.endTime} ({assignment.shift})
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(assignment.status)}
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline">
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Edit className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderSpecificActivities = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Atividades Específicas</h3>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Nova Atividade
        </Button>
      </div>
      
      <div className="grid gap-4">
        {specificActivities.map((activity) => (
          <Card key={activity.id}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-purple-600" />
                    <span className="font-medium">{activity.employeeName}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <Calendar className="h-3 w-3 inline mr-1" />
                    {activity.date} ({activity.time})
                  </div>
                  <div className="text-sm font-medium text-purple-600">
                    {activity.type}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3 inline mr-1" />
                    {activity.location}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(activity.status)}
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline">
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Edit className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gestão Operacional</h2>
          <p className="text-muted-foreground">
            Controle completo das operações baseado nos quadros manuais
          </p>
        </div>
        <Button onClick={loadOperationalData} disabled={isLoading}>
          {isLoading ? 'Carregando...' : 'Atualizar'}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="vacations" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Férias
          </TabsTrigger>
          <TabsTrigger value="absences" className="flex items-center gap-2">
            <UserX className="h-4 w-4" />
            Faltas
          </TabsTrigger>
          <TabsTrigger value="assignments" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Postos
          </TabsTrigger>
          <TabsTrigger value="activities" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Atividades
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vacations" className="mt-6">
          {renderVacationCoverages()}
        </TabsContent>

        <TabsContent value="absences" className="mt-6">
          {renderAbsences()}
        </TabsContent>

        <TabsContent value="assignments" className="mt-6">
          {renderWorkAssignments()}
        </TabsContent>

        <TabsContent value="activities" className="mt-6">
          {renderSpecificActivities()}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OperationalDashboard;
