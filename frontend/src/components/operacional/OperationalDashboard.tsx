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
  Trash2,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { operationalService, VacationCoverage, Absence, WorkPostAssignment, SpecificActivity } from '@/services/operationalService';

const OperationalDashboard: React.FC = () => {
  const [vacationCoverages, setVacationCoverages] = useState<VacationCoverage[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [workPostAssignments, setWorkPostAssignments] = useState<WorkPostAssignment[]>([]);
  const [specificActivities, setSpecificActivities] = useState<SpecificActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [coverages, absenceList, assignments, activities] = await Promise.all([
        operationalService.getAllVacationCoverages(),
        operationalService.getAllAbsences(),
        operationalService.getAllWorkPostAssignments(),
        operationalService.getAllSpecificActivities()
      ]);

      setVacationCoverages(coverages);
      setAbsences(absenceList);
      setWorkPostAssignments(assignments);
      setSpecificActivities(activities);
    } catch (error) {
      console.error('Erro ao carregar dados operacionais:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados operacionais.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
      case 'APPROVED':
      case 'COMPLETED':
        return <Badge variant="default" className="bg-green-500 text-white">Confirmado</Badge>;
      case 'PENDING':
      case 'SCHEDULED':
        return <Badge variant="default" className="bg-yellow-500 text-white">Pendente</Badge>;
      case 'NO_COVERAGE':
      case 'REJECTED':
      case 'CANCELLED':
        return <Badge variant="destructive" className="bg-red-500 text-white">Problema</Badge>;
      case 'IN_PROGRESS':
        return <Badge variant="default" className="bg-blue-500 text-white">Em Andamento</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return '';
    return timeString.substring(0, 5); // HH:MM
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Carregando dados operacionais...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Gestão Operacional Detalhada</h2>
        <Button onClick={loadAllData} variant="outline" size="sm">
          <Clock className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      <Tabs defaultValue="vacations" className="space-y-4">
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
            <MapPin className="h-4 w-4" />
            Postos
          </TabsTrigger>
          <TabsTrigger value="activities" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Atividades
          </TabsTrigger>
        </TabsList>

        {/* Aba de Cobertura de Férias */}
        <TabsContent value="vacations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Cobertura de Férias ({vacationCoverages.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {vacationCoverages.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Nenhuma cobertura de férias encontrada.
                  </p>
                ) : (
                  vacationCoverages.map(coverage => (
                    <div key={coverage.id} className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50">
                      <div className="flex-1">
                        <p className="font-medium">
                          {coverage.employee.name} ({formatDate(coverage.startDate)} - {formatDate(coverage.endDate)})
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Substituto: {coverage.substituteEmployee?.name || 'Não definido'} | 
                          Local: {coverage.location?.name || 'Não definido'} | 
                          Turno: {coverage.shift}
                        </p>
                        {coverage.observations && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Obs: {coverage.observations}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(coverage.status)}
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba de Controle de Faltas */}
        <TabsContent value="absences" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserX className="h-5 w-5" />
                Controle de Faltas ({absences.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {absences.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Nenhuma falta registrada.
                  </p>
                ) : (
                  absences.map(absence => (
                    <div key={absence.id} className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50">
                      <div className="flex-1">
                        <p className="font-medium">
                          {absence.employee.name} ({formatDate(absence.absenceDate)})
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Tipo: {absence.absenceType.replace('_', ' ')} | 
                          Motivo: {absence.reason}
                          {absence.medicalCertificateDays && ` | Dias: ${absence.medicalCertificateDays}`}
                        </p>
                        {absence.coverageNotes && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Observações: {absence.coverageNotes}
                          </p>
                        )}
                        {absence.coverageEmployee && (
                          <p className="text-xs text-muted-foreground">
                            Coberto por: {absence.coverageEmployee.name}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(absence.status)}
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba de Atribuições de Posto */}
        <TabsContent value="assignments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Atribuições de Posto ({workPostAssignments.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {workPostAssignments.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Nenhuma atribuição de posto encontrada.
                  </p>
                ) : (
                  workPostAssignments.map(assignment => (
                    <div key={assignment.id} className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50">
                      <div className="flex-1">
                        <p className="font-medium">
                          {assignment.employee.name} em {assignment.workPost.name} ({formatDate(assignment.assignmentDate)})
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Turno: {assignment.shift} | 
                          {assignment.startTime && assignment.endTime && (
                            <>Horário: {formatTime(assignment.startTime)} - {formatTime(assignment.endTime)}</>
                          )}
                        </p>
                        {assignment.observations && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Obs: {assignment.observations}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(assignment.status)}
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba de Atividades Específicas */}
        <TabsContent value="activities" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Atividades Específicas ({specificActivities.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {specificActivities.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Nenhuma atividade específica encontrada.
                  </p>
                ) : (
                  specificActivities.map(activity => (
                    <div key={activity.id} className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50">
                      <div className="flex-1">
                        <p className="font-medium">
                          {activity.description || activity.activityType.replace('_', ' ')} ({formatDate(activity.activityDate)} {activity.startTime && formatTime(activity.startTime)})
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Funcionário: {activity.employee.name} | 
                          Local: {activity.location?.name || 'Não definido'}
                          {activity.endTime && ` | Até: ${formatTime(activity.endTime)}`}
                        </p>
                        {activity.observations && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Obs: {activity.observations}
                          </p>
                        )}
                        {activity.completionNotes && (
                          <p className="text-xs text-muted-foreground">
                            Conclusão: {activity.completionNotes}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(activity.status)}
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OperationalDashboard;