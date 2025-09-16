import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Edit, 
  Trash2,
  Clock,
  User,
  Building,
  MapPin,
  FileText,
  Camera,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw
} from 'lucide-react';
import { ActivityReport, ActivityReportFilters } from '@/types/activityReport';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ActivityReportsTableProps {
  reports: ActivityReport[];
  isLoading?: boolean;
  onRefresh: () => void;
  onCreate: () => void;
  onEdit: (report: ActivityReport) => void;
  onView: (report: ActivityReport) => void;
  onDelete: (report: ActivityReport) => void;
  onApprove?: (report: ActivityReport) => void;
  onReject?: (report: ActivityReport) => void;
  onGeneratePDF: (filters: ActivityReportFilters) => void;
}

const ActivityReportsTable: React.FC<ActivityReportsTableProps> = ({
  reports,
  isLoading = false,
  onRefresh,
  onCreate,
  onEdit,
  onView,
  onDelete,
  onApprove,
  onReject,
  onGeneratePDF
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [employeeFilter, setEmployeeFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return <Badge variant="secondary">Rascunho</Badge>;
      case 'SUBMITTED':
        return <Badge variant="outline">Enviado</Badge>;
      case 'APPROVED':
        return <Badge variant="default" className="bg-green-600">Aprovado</Badge>;
      case 'REJECTED':
        return <Badge variant="destructive">Rejeitado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getAbsenceStatusBadge = (status?: string) => {
    if (!status) return null;
    
    switch (status) {
      case 'PRESENT':
        return <Badge variant="default" className="bg-green-600">Presente</Badge>;
      case 'ABSENT':
        return <Badge variant="destructive">Ausente</Badge>;
      case 'LATE':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600">Atraso</Badge>;
      case 'MEDICAL_LEAVE':
        return <Badge variant="outline" className="border-blue-500 text-blue-600">Atestado</Badge>;
      case 'JUSTIFIED':
        return <Badge variant="outline">Justificado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredReports = reports.filter(report => {
    const matchesSearch = 
      report.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.workPostName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || report.status === statusFilter;
    const matchesEmployee = employeeFilter === 'all' || report.employeeId === employeeFilter;
    const matchesDate = !dateFilter || report.date === dateFilter;

    return matchesSearch && matchesStatus && matchesEmployee && matchesDate;
  });

  const handleGeneratePDF = () => {
    const filters: ActivityReportFilters = {};
    if (statusFilter !== 'all') filters.status = statusFilter;
    if (employeeFilter !== 'all') filters.employeeId = employeeFilter;
    if (dateFilter) filters.startDate = dateFilter;
    
    onGeneratePDF(filters);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Registro de Atividades Diárias</h2>
          <p className="text-muted-foreground">
            Relatórios diários de atividades dos funcionários e supervisores
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleGeneratePDF}>
            <Download className="h-4 w-4 mr-2" />
            Exportar PDF
          </Button>
          <Button onClick={onCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Relatório
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Funcionário, cliente, posto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="DRAFT">Rascunho</SelectItem>
                  <SelectItem value="SUBMITTED">Enviado</SelectItem>
                  <SelectItem value="APPROVED">Aprovado</SelectItem>
                  <SelectItem value="REJECTED">Rejeitado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Funcionário</label>
              <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os funcionários" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os funcionários</SelectItem>
                  {Array.from(new Set(reports.map(r => r.employeeName))).map(name => (
                    <SelectItem key={name} value={reports.find(r => r.employeeName === name)?.employeeId || ''}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Data</label>
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-between items-center mt-4">
            <p className="text-sm text-muted-foreground">
              {filteredReports.length} relatório(s) encontrado(s)
            </p>
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              Carregando relatórios...
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhum relatório encontrado
              </h3>
              <p className="text-gray-500 mb-4">
                Não há relatórios de atividade que correspondam aos filtros selecionados.
              </p>
              <Button onClick={onCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Relatório
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Funcionário</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Posto</TableHead>
                  <TableHead>Presença</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Anexos</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">
                          {format(new Date(report.date), 'dd/MM/yyyy', { locale: ptBR })}
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {report.startTime} - {report.endTime}
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{report.employeeName}</span>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        <span>{report.clientName}</span>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{report.workPostName}</span>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      {getAbsenceStatusBadge(report.absenceStatus)}
                    </TableCell>
                    
                    <TableCell>
                      {getStatusBadge(report.status)}
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {report.photos.length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            <Camera className="h-3 w-3 mr-1" />
                            {report.photos.length}
                          </Badge>
                        )}
                        {report.documents.length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            <FileText className="h-3 w-3 mr-1" />
                            {report.documents.length}
                          </Badge>
                        )}
                        {report.divergences && (
                          <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-600">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Divergência
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => onView(report)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => onEdit(report)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        {onApprove && report.status === 'SUBMITTED' && (
                          <Button variant="ghost" size="sm" onClick={() => onApprove(report)}>
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </Button>
                        )}
                        {onReject && report.status === 'SUBMITTED' && (
                          <Button variant="ghost" size="sm" onClick={() => onReject(report)}>
                            <XCircle className="h-4 w-4 text-red-600" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => onDelete(report)}>
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ActivityReportsTable;