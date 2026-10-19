import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import '@/styles/mobile-tabs-sst.css';
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
  Loader2,
  PlayCircle,
  ArrowRightLeft,
  FileText,
  Truck,
  FileSpreadsheet,
  Download
} from 'lucide-react';
import OccurrenceMap from './OccurrenceMap';

import { useToast } from '@/hooks/use-toast';
import { operationalService, VacationCoverage, Absence, WorkPostAssignment, SpecificActivity, CreateAbsenceDTO, CreateWorkPostAssignmentDTO, CreateSpecificActivityDTO, CreateVacationCoverageDTO } from '@/services/operationalService';
import { remanejamentoService, Remanejamento, CreateRemanejamentoDTO } from '@/services/remanejamentoService';
import { feriasService, FeriasPeriodo } from '@/services/feriasService';
import { medicalDocumentService, MedicalDocument, MEDICAL_TYPE_LABELS } from '@/services/medicalDocumentService';
import FeriasReportModal from '@/components/ferias/FeriasReportModal';
import FeriasFormModal from '@/components/ferias/FeriasFormModal';
import FeriasDetailsModal from '@/components/ferias/FeriasDetailsModal';
import AfastamentoFormModal from '@/components/ferias/AfastamentoFormModal';
import { generateAvisoFeriasPDF, viewAvisoFeriasPDF } from '@/utils/feriasAvisoPdfGenerator';
import { Stethoscope, ShieldAlert, Building2, ExternalLink } from 'lucide-react';
import api from '@/lib/axios';
import axios from 'axios';
import operationalReportGenerator from '@/utils/operationalReportGenerator';
import OperationalStatsCards from './OperationalStatsCards';
import AbsenceFormModal from './AbsenceFormModal';
import WorkPostAssignmentFormModal from './WorkPostAssignmentFormModal';
import SpecificActivityFormModal from './SpecificActivityFormModal';
import RemanejamentoFormModal from './RemanejamentoFormModal';
import RemanejamentoReportModal from './RemanejamentoReportModal';
import VacationCoverageFormModal from './VacationCoverageFormModal';
import VacationCoverageStatusModal from './VacationCoverageStatusModal';
import ChangeStatusModal from './ChangeStatusModal';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import { OperationalEmployeesTab } from './OperationalEmployeesTab';
import LancamentoManualFolhaPonto from '@/pages/RH/LancamentoManualFolhaPonto';
import { formatWorkPostDisplayName } from '@/utils/formatters';
import MapaCalor from './MapaCalor';
import SupervisorVisitReport from './SupervisorVisitReport';
import { Schedule } from '@/services/scheduleService';
import CreateWarehouseRequisitionButton from '@/components/stock/CreateWarehouseRequisitionButton';

interface OperationalDashboardProps {
  onEditEscala?: (escala: Schedule) => void;
}

const Frota = lazy(() => import('@/pages/Frota'));

const OperationalDashboard: React.FC<OperationalDashboardProps> = ({ onEditEscala }) => {
  const [vacationCoverages, setVacationCoverages] = useState<VacationCoverage[]>([]);
  const [feriasList, setFeriasList] = useState<FeriasPeriodo[]>([]);
  const [medicalDocs, setMedicalDocs] = useState<MedicalDocument[]>([]);
  const [vacationSubTab, setVacationSubTab] = useState<'scheduled' | 'coverage'>('scheduled');
  const [absenceSubTab, setAbsenceSubTab] = useState<'medical' | 'manual'>('medical');
  const [showFeriasReportModal, setShowFeriasReportModal] = useState(false);
  const [showFeriasModal, setShowFeriasModal] = useState(false);
  const [editingFeriasId, setEditingFeriasId] = useState<string | undefined>(undefined);
  const [editingFeriasData, setEditingFeriasData] = useState<any>(undefined);
  const [showDeleteFeriasModal, setShowDeleteFeriasModal] = useState(false);
  const [feriasToDelete, setFeriasToDelete] = useState<FeriasPeriodo | null>(null);
  const [showFeriasDetailsModal, setShowFeriasDetailsModal] = useState(false);
  const [selectedFeriasForDetails, setSelectedFeriasForDetails] = useState<FeriasPeriodo | null>(null);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [workPostAssignments, setWorkPostAssignments] = useState<WorkPostAssignment[]>([]);
  const [specificActivities, setSpecificActivities] = useState<SpecificActivity[]>([]);
  const [remanejamentos, setRemanejamentos] = useState<Remanejamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Array<{ id: string; name: string }>>([]);

  // Estados para modais
  const [showVacationCoverageModal, setShowVacationCoverageModal] = useState(false);
  const [selectedVacationCoverage, setSelectedVacationCoverage] = useState<VacationCoverage | null>(null);
  const [showAbsenceModal, setShowAbsenceModal] = useState(false);
  const [selectedAbsence, setSelectedAbsence] = useState<Absence | null>(null);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<WorkPostAssignment | null>(null);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<SpecificActivity | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [assignmentToChangeStatus, setAssignmentToChangeStatus] = useState<WorkPostAssignment | null>(null);
  const [showDeleteVacationCoverageModal, setShowDeleteVacationCoverageModal] = useState(false);
  const [vacationCoverageToDelete, setVacationCoverageToDelete] = useState<VacationCoverage | null>(null);
  const [showVacationStatusModal, setShowVacationStatusModal] = useState(false);
  const [vacationCoverageToChangeStatus, setVacationCoverageToChangeStatus] = useState<VacationCoverage | null>(null);
  const [showDeleteAbsenceModal, setShowDeleteAbsenceModal] = useState(false);
  const [absenceToDelete, setAbsenceToDelete] = useState<Absence | null>(null);
  const [showDeleteAssignmentModal, setShowDeleteAssignmentModal] = useState(false);
  const [assignmentToDelete, setAssignmentToDelete] = useState<WorkPostAssignment | null>(null);
  const [showDeleteActivityModal, setShowDeleteActivityModal] = useState(false);
  const [activityToDelete, setActivityToDelete] = useState<SpecificActivity | null>(null);
  const [showRemanejamentoModal, setShowRemanejamentoModal] = useState(false);
  const [selectedRemanejamento, setSelectedRemanejamento] = useState<Remanejamento | null>(null);
  const [showDeleteRemanejamentoModal, setShowDeleteRemanejamentoModal] = useState(false);
  const [remanejamentoToDelete, setRemanejamentoToDelete] = useState<Remanejamento | null>(null);
  const [showRemanejamentoReportModal, setShowRemanejamentoReportModal] = useState(false);

  const { toast } = useToast();

  const [searchParams, setSearchParams] = useSearchParams();
  const subtabParam = searchParams.get('subtab');
  const [activeTab, setActiveTab] = useState<string>(subtabParam || 'vacations');

  useEffect(() => {
    if (subtabParam) {
      setActiveTab(subtabParam);
    }
  }, [subtabParam]);

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('subtab', val);
      return next;
    }, { replace: true });
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [coverages, absenceList, assignments, activities, remanejamentosList, employeesData, feriasData, medicalDocsData] = await Promise.all([
        operationalService.getAllVacationCoverages().catch(() => []),
        operationalService.getAllAbsences().catch(() => []),
        operationalService.getAllWorkPostAssignments().catch(() => []),
        operationalService.getAllSpecificActivities().catch(() => []),
        remanejamentoService.getAllRemanejamentos().catch(() => []),
        loadEmployees().catch(() => []),
        feriasService.getFerias().catch(() => []),
        medicalDocumentService.getAll().catch(() => []),
      ]);

      setVacationCoverages(coverages);
      setAbsences(absenceList);
      setWorkPostAssignments(assignments);
      setSpecificActivities(activities);
      setRemanejamentos(remanejamentosList);
      setEmployees(employeesData);
      setFeriasList(feriasData || []);
      setMedicalDocs(medicalDocsData || []);
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

  const loadEmployees = async (): Promise<Array<{ id: string; name: string }>> => {
    try {
      const response = await api.get('/employees/basic');
      const data = response.data;
      const employees = data?.employees ?? data?.content ?? (Array.isArray(data) ? data : []);
      return Array.isArray(employees) ? employees.map((e: any) => ({ id: String(e.id), name: e.name || '' })) : [];
    } catch (error) {
      console.error('Erro ao carregar funcionários:', error);
      return [];
    }
  };

  // Handlers para Absences
  const handleCreateAbsence = () => {
    setSelectedAbsence(null);
    setShowAbsenceModal(true);
  };

  const handleEditAbsence = (absence: Absence) => {
    setSelectedAbsence(absence);
    setShowAbsenceModal(true);
  };

  // Handlers para Gestão de Férias Operacional
  const handleCreateFerias = () => {
    setEditingFeriasId(undefined);
    setEditingFeriasData(undefined);
    setShowFeriasModal(true);
  };

  const handleEditFerias = (ferias: FeriasPeriodo) => {
    setEditingFeriasId(ferias.id);
    setEditingFeriasData({
      employeeId: ferias.employeeId,
      periodoAquisitivo: ferias.periodoAquisitivo,
      dataInicio: ferias.dataInicio,
      dataFim: ferias.dataFim,
      tipo: ferias.tipo,
      observacoes: ferias.observacoes || ''
    });
    setShowFeriasModal(true);
  };

  const handleViewFeriasDetails = (ferias: FeriasPeriodo) => {
    setSelectedFeriasForDetails(ferias);
    setShowFeriasDetailsModal(true);
  };

  const handleDeleteFerias = (ferias: FeriasPeriodo) => {
    setFeriasToDelete(ferias);
    setShowDeleteFeriasModal(true);
  };

  const confirmDeleteFerias = async () => {
    if (!feriasToDelete) return;
    try {
      await feriasService.cancelarFerias(feriasToDelete.id);
      setFeriasList(prev => prev.filter(f => f.id !== feriasToDelete.id));
      toast({
        title: 'Sucesso',
        description: 'Solicitação de férias cancelada com sucesso.',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível cancelar a solicitação de férias.',
        variant: 'destructive',
      });
    } finally {
      setShowDeleteFeriasModal(false);
      setFeriasToDelete(null);
    }
  };

  const handleFeriasSuccess = async () => {
    setShowFeriasModal(false);
    setEditingFeriasId(undefined);
    setEditingFeriasData(undefined);
    try {
      const [updatedFerias, updatedCoverages] = await Promise.all([
        feriasService.getFerias().catch(() => []),
        operationalService.getAllVacationCoverages().catch(() => [])
      ]);
      setFeriasList(updatedFerias);
      setVacationCoverages(updatedCoverages);
      toast({
        title: 'Sucesso',
        description: 'Gestão de férias atualizada com sucesso!',
      });
    } catch (error) {
      console.error('Erro ao atualizar lista de férias:', error);
    }
  };

  // Handlers para Vacation Coverage
  const handleCreateVacationCoverage = () => {
    setSelectedVacationCoverage(null);
    setShowVacationCoverageModal(true);
  };

  const handleEditVacationCoverage = (coverage: VacationCoverage) => {
    setSelectedVacationCoverage(coverage);
    setShowVacationCoverageModal(true);
  };

  const handleDeleteVacationCoverage = (coverage: VacationCoverage) => {
    setVacationCoverageToDelete(coverage);
    setShowDeleteVacationCoverageModal(true);
  };

  const confirmDeleteVacationCoverage = async () => {
    if (!vacationCoverageToDelete) return;

    try {
      await operationalService.deleteVacationCoverage(vacationCoverageToDelete.id);
      setVacationCoverages(prev => prev.filter(v => v.id !== vacationCoverageToDelete.id));
      toast({
        title: 'Sucesso',
        description: 'Cobertura de férias excluída com sucesso.',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao excluir cobertura.',
        variant: 'destructive',
      });
    }
  };

  const handleSubmitVacationCoverage = async (data: CreateVacationCoverageDTO) => {
    try {
      if (selectedVacationCoverage) {
        // Atualizar
        const updated = await operationalService.updateVacationCoverage(selectedVacationCoverage.id, data);
        setVacationCoverages(prev => prev.map(v => v.id === selectedVacationCoverage.id ? updated : v));
        toast({
          title: 'Sucesso',
          description: 'Cobertura de férias atualizada com sucesso.',
        });
      } else {
        // Criar
        const created = await operationalService.createVacationCoverage(data);
        setVacationCoverages(prev => [created, ...prev]);
        toast({
          title: 'Sucesso',
          description: 'Cobertura de férias criada com sucesso.',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao salvar cobertura de férias.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const handleChangeVacationCoverageStatus = (coverage: VacationCoverage) => {
    setVacationCoverageToChangeStatus(coverage);
    setShowVacationStatusModal(true);
  };

  const handleConfirmVacationStatusChange = async (newStatus: string) => {
    if (!vacationCoverageToChangeStatus) return;

    try {
      // Mapear status do frontend para o backend
      const statusMap: Record<string, string> = {
        'PENDING': 'PENDING',
        'CONFIRMED': 'CONFIRMED',
        'NO_COVERAGE': 'NO_COVERAGE',
        'COMPLETED': 'COMPLETED',
        'CANCELLED': 'CANCELLED'
      };

      const backendStatus = statusMap[newStatus] || newStatus;
      await operationalService.updateVacationCoverageStatus(vacationCoverageToChangeStatus.id, backendStatus);

      // Atualizar lista
      const updatedCoverages = await operationalService.getAllVacationCoverages();
      setVacationCoverages(updatedCoverages);

      // Mapear label do status para exibição
      const statusLabels: Record<string, string> = {
        'PENDING': 'Pendente',
        'CONFIRMED': 'Confirmado',
        'NO_COVERAGE': 'Sem Cobertura',
        'COMPLETED': 'Concluído',
        'CANCELLED': 'Cancelado'
      };

      toast({
        title: 'Sucesso',
        description: `Status alterado para "${statusLabels[newStatus] || newStatus}" com sucesso.`,
      });
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar status da cobertura.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteAbsence = (absence: Absence) => {
    setAbsenceToDelete(absence);
    setShowDeleteAbsenceModal(true);
  };

  const confirmDeleteAbsence = async () => {
    if (!absenceToDelete) return;

    try {
      await operationalService.deleteAbsence(absenceToDelete.id);
      setAbsences(prev => prev.filter(a => a.id !== absenceToDelete.id));
      toast({
        title: 'Sucesso',
        description: 'Falta excluída com sucesso.',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao excluir falta.',
        variant: 'destructive',
      });
    }
  };

  const handleSubmitAbsence = async (data: CreateAbsenceDTO) => {
    try {
      console.log('📤 Enviando dados da falta:', data);

      if (selectedAbsence) {
        // Atualizar
        console.log('🔄 Atualizando falta:', selectedAbsence.id);
        const updated = await operationalService.updateAbsence(selectedAbsence.id, data);
        setAbsences(prev => prev.map(a => a.id === selectedAbsence.id ? updated : a));
        setSelectedAbsence(null);
      } else {
        // Criar
        console.log('➕ Criando nova falta');
        const created = await operationalService.createAbsence(data);
        console.log('✅ Falta criada:', created);
        setAbsences(prev => [created, ...prev]);
      }
    } catch (error: any) {
      console.error('❌ Erro ao salvar falta:', error);
      const errorMessage = error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        'Erro ao salvar falta. Verifique os dados e tente novamente.';

      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      });
      throw error; // Re-throw para que o modal possa tratar também
    }
  };

  // Handlers para Work Post Assignments
  const handleCreateAssignment = () => {
    setSelectedAssignment(null);
    setShowAssignmentModal(true);
  };

  const handleEditAssignment = (assignment: WorkPostAssignment) => {
    setSelectedAssignment(assignment);
    setShowAssignmentModal(true);
  };

  const handleDeleteAssignment = (assignment: WorkPostAssignment) => {
    setAssignmentToDelete(assignment);
    setShowDeleteAssignmentModal(true);
  };

  const confirmDeleteAssignment = async () => {
    if (!assignmentToDelete) return;

    try {
      await operationalService.deleteWorkPostAssignment(assignmentToDelete.id);
      // Atualizar apenas a lista de atribuições sem mudar de aba
      setWorkPostAssignments(prev => prev.filter(a => a.id !== assignmentToDelete.id));
      toast({
        title: 'Sucesso',
        description: 'Atribuição excluída com sucesso.',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao excluir atribuição.',
        variant: 'destructive',
      });
    }
  };

  // Handlers para Specific Activities
  const handleCreateActivity = () => {
    setSelectedActivity(null);
    setShowActivityModal(true);
  };

  const handleEditActivity = (activity: SpecificActivity) => {
    setSelectedActivity(activity);
    setShowActivityModal(true);
  };

  const handleDeleteActivity = (activity: SpecificActivity) => {
    setActivityToDelete(activity);
    setShowDeleteActivityModal(true);
  };

  const confirmDeleteActivity = async () => {
    if (!activityToDelete) return;

    try {
      await operationalService.deleteSpecificActivity(activityToDelete.id);
      setSpecificActivities(prev => prev.filter(a => a.id !== activityToDelete.id));
      toast({
        title: 'Sucesso',
        description: 'Atividade excluída com sucesso.',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao excluir atividade.',
        variant: 'destructive',
      });
    }
  };

  const handleSubmitActivity = async (data: CreateSpecificActivityDTO) => {
    try {
      if (selectedActivity) {
        // Atualizar
        const updated = await operationalService.updateSpecificActivity(selectedActivity.id, data);
        setSpecificActivities(prev => prev.map(a => a.id === selectedActivity.id ? updated : a));
        toast({
          title: 'Sucesso',
          description: 'Atividade atualizada com sucesso.',
        });
      } else {
        // Criar
        const created = await operationalService.createSpecificActivity(data);
        setSpecificActivities(prev => [created, ...prev]);
        toast({
          title: 'Sucesso',
          description: 'Atividade criada com sucesso.',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao salvar atividade.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  // Handlers para Remanejamentos
  const handleCreateRemanejamento = () => {
    setSelectedRemanejamento(null);
    setShowRemanejamentoModal(true);
  };

  const handleEditRemanejamento = (remanejamento: Remanejamento) => {
    setSelectedRemanejamento(remanejamento);
    setShowRemanejamentoModal(true);
  };

  const handleDeleteRemanejamento = (remanejamento: Remanejamento) => {
    setRemanejamentoToDelete(remanejamento);
    setShowDeleteRemanejamentoModal(true);
  };

  const confirmDeleteRemanejamento = async () => {
    if (!remanejamentoToDelete) return;

    try {
      await remanejamentoService.deleteRemanejamento(remanejamentoToDelete.id);
      setRemanejamentos(prev => prev.filter(r => r.id !== remanejamentoToDelete.id));
      toast({
        title: 'Sucesso',
        description: 'Remanejamento excluído com sucesso.',
      });
    } catch (error) {
      const apiMessage =
        axios.isAxiosError(error) &&
        error.response?.data &&
        typeof error.response.data === 'object' &&
        'message' in error.response.data &&
        typeof (error.response.data as { message?: string }).message === 'string'
          ? (error.response.data as { message: string }).message
          : null;
      toast({
        title: 'Erro ao excluir',
        description:
          apiMessage ??
          (axios.isAxiosError(error) && error.response?.status === 409
            ? 'Conflito ao excluir: verifique vínculos (escalas/histórico) ou atualize o banco de dados.'
            : 'Não foi possível excluir o remanejamento.'),
        variant: 'destructive',
      });
    }
  };

  const handleSubmitRemanejamento = async (data: CreateRemanejamentoDTO) => {
    try {
      if (selectedRemanejamento) {
        // Atualizar
        const updated = await remanejamentoService.updateRemanejamento(selectedRemanejamento.id, data);
        setRemanejamentos(prev => prev.map(r => r.id === selectedRemanejamento.id ? updated : r));
        toast({
          title: 'Sucesso',
          description: 'Remanejamento atualizado com sucesso.',
        });
      } else {
        // Criar
        const created = await remanejamentoService.createRemanejamento(data);
        setRemanejamentos(prev => [created, ...prev]);
        toast({
          title: 'Sucesso',
          description: 'Remanejamento criado com sucesso.',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao salvar remanejamento.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  // Funções para gerar relatórios em PDF
  const downloadBlob = (blob: Blob, fileName: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleGenerateVacationCoverageReport = async () => {
    try {
      toast({ title: 'Aguarde', description: 'Gerando relatório PDF...' });
      const blob = await operationalService.generateVacationCoveragePDF({});
      downloadBlob(blob, `relatorio-cobertura-ferias-${new Date().toISOString().split('T')[0]}.pdf`);

      toast({
        title: 'Sucesso',
        description: 'Relatório de Cobertura de Férias gerado com sucesso.',
      });
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao gerar relatório PDF. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const handleGenerateAbsenceReport = async () => {
    try {
      toast({ title: 'Aguarde', description: 'Gerando relatório PDF...' });
      const blob = await operationalService.generateAbsencePDF({});
      downloadBlob(blob, `relatorio-controle-faltas-${new Date().toISOString().split('T')[0]}.pdf`);

      toast({
        title: 'Sucesso',
        description: 'Relatório de Controle de Faltas gerado com sucesso.',
      });
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao gerar relatório PDF. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const handleGenerateWorkPostAssignmentReport = async () => {
    try {
      toast({ title: 'Aguarde', description: 'Gerando relatório PDF...' });
      const blob = await operationalService.generateWorkPostAssignmentPDF({});
      downloadBlob(blob, `relatorio-atribuicoes-posto-${new Date().toISOString().split('T')[0]}.pdf`);

      toast({
        title: 'Sucesso',
        description: 'Relatório de Atribuições de Posto gerado com sucesso.',
      });
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao gerar relatório PDF. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const handleGenerateSpecificActivityReport = async () => {
    try {
      toast({ title: 'Aguarde', description: 'Gerando relatório PDF...' });
      const blob = await operationalService.generateSpecificActivityPDF({});
      downloadBlob(blob, `relatorio-atividades-especificas-${new Date().toISOString().split('T')[0]}.pdf`);

      toast({
        title: 'Sucesso',
        description: 'Relatório de Atividades Específicas gerado com sucesso.',
      });
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao gerar relatório PDF. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const handleOpenRemanejamentoReportModal = () => {
    setShowRemanejamentoReportModal(true);
  };

  const handleSubmitAssignment = async (data: CreateWorkPostAssignmentDTO) => {
    try {
      if (selectedAssignment) {
        // Atualizar
        const updated = await operationalService.updateWorkPostAssignment(selectedAssignment.id, data);
        // Atualizar apenas a lista de atribuições sem mudar de aba
        setWorkPostAssignments(prev => prev.map(a => a.id === selectedAssignment.id ? updated : a));
        toast({
          title: 'Sucesso',
          description: 'Atribuição atualizada com sucesso.',
        });
      } else {
        // Criar
        const created = await operationalService.createWorkPostAssignment(data);
        // Adicionar nova atribuição ao topo da lista sem mudar de aba
        setWorkPostAssignments(prev => [created, ...prev]);
        toast({
          title: 'Sucesso',
          description: 'Atribuição criada com sucesso.',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao salvar atribuição.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const getStatusBadge = (status: string) => {
    // Mapeamento de status para exibição com ícones
    const statusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
      // Status de Atribuições de Posto
      'SCHEDULED': {
        label: 'Pendente',
        className: 'bg-yellow-500 hover:bg-yellow-600 text-white font-medium shadow-md',
        icon: <Clock className="h-3.5 w-3.5" />
      },
      'CONFIRMED': {
        label: 'Confirmado',
        className: 'bg-green-500 hover:bg-green-600 text-white font-medium shadow-md',
        icon: <CheckCircle className="h-3.5 w-3.5" />
      },
      'ACTIVE': {
        label: 'Ativo',
        className: 'bg-blue-500 hover:bg-blue-600 text-white font-medium shadow-md',
        icon: <PlayCircle className="h-3.5 w-3.5" />
      },
      'COMPLETED': {
        label: 'Concluído',
        className: 'bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-md',
        icon: <CheckCircle className="h-3.5 w-3.5" />
      },
      'CANCELLED': {
        label: 'Cancelado',
        className: 'bg-red-500 hover:bg-red-600 text-white font-medium shadow-md',
        icon: <XCircle className="h-3.5 w-3.5" />
      },

      // Status de Cobertura de Férias e outros
      'PENDING': {
        label: 'Pendente',
        className: 'bg-yellow-500 hover:bg-yellow-600 text-white font-medium shadow-md',
        icon: <Clock className="h-3.5 w-3.5" />
      },
      'NO_COVERAGE': {
        label: 'Sem Cobertura',
        className: 'bg-red-500 hover:bg-red-600 text-white font-medium shadow-md',
        icon: <AlertTriangle className="h-3.5 w-3.5" />
      },
      'APPROVED': {
        label: 'Aprovado',
        className: 'bg-green-500 hover:bg-green-600 text-white font-medium shadow-md',
        icon: <CheckCircle className="h-3.5 w-3.5" />
      },
      'REJECTED': {
        label: 'Rejeitado',
        className: 'bg-red-500 hover:bg-red-600 text-white font-medium shadow-md',
        icon: <XCircle className="h-3.5 w-3.5" />
      },
      'IN_PROGRESS': {
        label: 'Em Andamento',
        className: 'bg-blue-500 hover:bg-blue-600 text-white font-medium shadow-md',
        icon: <PlayCircle className="h-3.5 w-3.5" />
      },
    };

    const config = statusConfig[status] || {
      label: status,
      className: 'bg-gray-500 hover:bg-gray-600 text-white font-medium shadow-md',
      icon: <AlertTriangle className="h-3.5 w-3.5" />
    };

    return (
      <Badge
        variant="default"
        className={`${config.className} transition-colors cursor-pointer px-3 py-1.5 flex items-center gap-1.5`}
      >
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return '';
    return timeString.substring(0, 5); // HH:MM
  };

  const formatShift = (shift: string) => {
    const shiftLabels: Record<string, string> = {
      'DAY': 'Diurno',
      'NIGHT': 'Noturno',
      'MIXED': 'Misto',
      'NOTURNO': 'Noturno',
      'MORNING': 'Matutino',
      'AFTERNOON': 'Vespertino',
      'EXTENDED': 'Estendido'
    };
    return shiftLabels[shift] || shift;
  };

  const formatActivityType = (type: string) => {
    const typeLabels: Record<string, string> = {
      'CLEANING': 'Limpeza',
      'GLASS_CLEANING': 'Limpeza de Vidros',
      'LAWN_MOWING': 'Poda de Grama',
      'RECYCLING': 'Reciclagem',
      'MAINTENANCE': 'Manutenção',
      'SECURITY_PATROL': 'Ronda de Segurança',
      'EQUIPMENT_CHECK': 'Verificação de Equipamentos',
      'SPECIAL_EVENT': 'Evento Especial',
      'TRAINING': 'Treinamento',
      'MEETING': 'Reunião',
      'OTHER': 'Outros'
    };
    return typeLabels[type] || type;
  };

  const formatRemanejamentoType = (type: string) => {
    const typeLabels: Record<string, string> = {
      'TRANSFERENCIA_UNIDADE': 'Transferência de Unidade',
      'TRANSFERENCIA_POSTO_TRABALHO': 'Transferência de Posto',
      'TROCA_FUNCAO': 'Troca de Função',
      'PROMOCAO': 'Promoção',
      'COBRIR_FERIAS': 'Cobertura de Férias',
      'COBRIR_FALTA': 'Cobertura de Falta',
      'PLANTAO': 'Plantão Extra',
      'OUTROS': 'Outros'
    };
    return typeLabels[type] || type;
  };

  const handleChangeAssignmentStatus = (assignment: WorkPostAssignment) => {
    setAssignmentToChangeStatus(assignment);
    setShowStatusModal(true);
  };

  const handleConfirmStatusChange = async (newStatus: string) => {
    if (!assignmentToChangeStatus) return;

    try {
      // Usar o endpoint genérico que aceita todos os status
      await operationalService.updateAssignmentStatus(assignmentToChangeStatus.id, newStatus);

      // Atualizar apenas as atribuições ao invés de recarregar tudo
      const updatedAssignments = await operationalService.getAllWorkPostAssignments();
      setWorkPostAssignments(updatedAssignments);

      // Mapear label do status para exibição
      const statusLabels: Record<string, string> = {
        'SCHEDULED': 'Pendente',
        'CONFIRMED': 'Confirmado',
        'ACTIVE': 'Ativo',
        'COMPLETED': 'Concluído',
        'CANCELLED': 'Cancelado'
      };

      toast({
        title: 'Sucesso',
        description: `Status alterado para "${statusLabels[newStatus] || newStatus}" com sucesso.`,
      });
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar status da atribuição.',
        variant: 'destructive',
      });
    }
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
      {/* Estatísticas Operacionais */}
      <OperationalStatsCards />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold">Gestão Operacional Detalhada</h2>
        <div className="flex flex-wrap items-center gap-2">
          <CreateWarehouseRequisitionButton
            variant="outline"
            size="sm"
            className="border-amber-500/50 text-amber-200 hover:bg-amber-500/10"
            label="Criar Requisição para o Almoxarifado"
          />
          <Button onClick={loadAllData} variant="outline" size="sm">
            <Clock className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        {/* Tabs com Padrão SST Mobile */}
        <TooltipProvider>
          <div className="relative overflow-hidden rounded-lg glass-card border-slate-700/50 shadow-xl">
            <TabsList className="
              w-full
              flex overflow-x-auto
              glass-card border-0
              p-2.5 gap-2.5
              min-h-[85px]
              items-center justify-start
              scrollbar-thin scrollbar-thumb-slate-700/60 scrollbar-track-transparent
            ">

              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger
                    value="heatmap"
                    className="modern-tab flex flex-col items-center justify-center gap-1.5 px-3 py-2.5 text-slate-300 data-[state='active']:bg-gradient-to-br data-[state='active']:from-orange-500 data-[state='active']:to-orange-600 data-[state='active']:text-white data-[state='active']:shadow-lg data-[state='active']:shadow-orange-500/50 hover:bg-slate-800/60 hover:text-white transition-all duration-300 rounded-lg min-w-[100px] max-w-[125px] min-h-[72px] flex-shrink-0 cursor-pointer"
                  >
                    <Activity className="h-5 w-5 flex-shrink-0" />
                    <span className="text-[10px] sm:text-[11px] font-medium leading-tight text-center max-w-full break-words">Matriz</span>
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-seguranca-graphite text-white border-orange-500">
                  <p className="font-semibold">Matriz de Escala</p>
                  <p className="text-xs text-gray-400">Visão geral em heatmap (26 a 25)</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger
                    value="mapa-ocorrencias"
                    className="modern-tab flex flex-col items-center justify-center gap-1.5 px-3 py-2.5 text-slate-300 data-[state='active']:bg-gradient-to-br data-[state='active']:from-red-600 data-[state='active']:to-red-700 data-[state='active']:text-white data-[state='active']:shadow-lg data-[state='active']:shadow-red-500/50 hover:bg-slate-800/60 hover:text-white transition-all duration-300 rounded-lg min-w-[100px] max-w-[125px] min-h-[72px] flex-shrink-0 cursor-pointer"
                  >
                    <FileSpreadsheet className="h-5 w-5 flex-shrink-0" />
                    <span className="text-[10px] sm:text-[11px] font-medium leading-tight text-center max-w-full break-words">Mapa Ocorr.</span>
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-seguranca-graphite text-white border-seguranca-red">
                  <p className="font-semibold">Mapa de Ocorrências</p>
                  <p className="text-xs text-gray-400">Controle 26-25 e Relatório Excel</p>
                </TooltipContent>
              </Tooltip>


              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger
                    value="vacations"
                    className="modern-tab flex flex-col items-center justify-center gap-1.5 px-3 py-2.5 text-slate-300 data-[state='active']:bg-gradient-to-br data-[state='active']:from-red-600 data-[state='active']:to-red-700 data-[state='active']:text-white data-[state='active']:shadow-lg data-[state='active']:shadow-red-500/50 hover:bg-slate-800/60 hover:text-white transition-all duration-300 rounded-lg min-w-[100px] max-w-[125px] min-h-[72px] flex-shrink-0 cursor-pointer"
                  >
                    <Calendar className="h-5 w-5 flex-shrink-0" />
                    <span className="text-[10px] sm:text-[11px] font-medium leading-tight text-center max-w-full break-words">Férias</span>
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-seguranca-graphite text-white border-seguranca-red">
                  <p className="font-semibold">Férias, Período de Experiência & Coberturas</p>
                  <p className="text-xs text-gray-400">Gestão de férias, experiência e substituições</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger
                    value="absences"
                    className="modern-tab flex flex-col items-center justify-center gap-1.5 px-3 py-2.5 text-slate-300 data-[state='active']:bg-gradient-to-br data-[state='active']:from-red-600 data-[state='active']:to-red-700 data-[state='active']:text-white data-[state='active']:shadow-lg data-[state='active']:shadow-red-500/50 hover:bg-slate-800/60 hover:text-white transition-all duration-300 rounded-lg min-w-[100px] max-w-[125px] min-h-[72px] flex-shrink-0 cursor-pointer"
                  >
                    <UserX className="h-5 w-5 flex-shrink-0" />
                    <span className="text-[10px] sm:text-[11px] font-medium leading-tight text-center max-w-full break-words">Faltas</span>
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-seguranca-graphite text-white border-seguranca-red">
                  <p className="font-semibold">Faltas & Atestados Médicos</p>
                  <p className="text-xs text-gray-400">Atestados entregues e faltas</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger
                    value="assignments"
                    className="modern-tab flex flex-col items-center justify-center gap-1.5 px-3 py-2.5 text-slate-300 data-[state='active']:bg-gradient-to-br data-[state='active']:from-red-600 data-[state='active']:to-red-700 data-[state='active']:text-white data-[state='active']:shadow-lg data-[state='active']:shadow-red-500/50 hover:bg-slate-800/60 hover:text-white transition-all duration-300 rounded-lg min-w-[100px] max-w-[125px] min-h-[72px] flex-shrink-0 cursor-pointer"
                  >
                    <MapPin className="h-5 w-5 flex-shrink-0" />
                    <span className="text-[10px] sm:text-[11px] font-medium leading-tight text-center max-w-full break-words">Setor</span>
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-seguranca-graphite text-white border-seguranca-red">
                  <p className="font-semibold">Setor de Trabalho</p>
                  <p className="text-xs text-gray-400">Alocação e atribuições de postos/setores</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger
                    value="activities"
                    className="modern-tab flex flex-col items-center justify-center gap-1.5 px-3 py-2.5 text-slate-300 data-[state='active']:bg-gradient-to-br data-[state='active']:from-red-600 data-[state='active']:to-red-700 data-[state='active']:text-white data-[state='active']:shadow-lg data-[state='active']:shadow-red-500/50 hover:bg-slate-800/60 hover:text-white transition-all duration-300 rounded-lg min-w-[100px] max-w-[125px] min-h-[72px] flex-shrink-0 cursor-pointer"
                  >
                    <Activity className="h-5 w-5 flex-shrink-0" />
                    <span className="text-[10px] sm:text-[11px] font-medium leading-tight text-center max-w-full break-words">Atividades</span>
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-seguranca-graphite text-white border-seguranca-red">
                  <p className="font-semibold">Atividades Específicas</p>
                  <p className="text-xs text-gray-400">Tarefas e eventos especiais</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger
                    value="remanejamentos"
                    className="modern-tab flex flex-col items-center justify-center gap-1.5 px-3 py-2.5 text-slate-300 data-[state='active']:bg-gradient-to-br data-[state='active']:from-red-600 data-[state='active']:to-red-700 data-[state='active']:text-white data-[state='active']:shadow-lg data-[state='active']:shadow-red-500/50 hover:bg-slate-800/60 hover:text-white transition-all duration-300 rounded-lg min-w-[100px] max-w-[125px] min-h-[72px] flex-shrink-0 cursor-pointer"
                  >
                    <ArrowRightLeft className="h-5 w-5 flex-shrink-0" />
                    <span className="text-[10px] sm:text-[11px] font-medium leading-tight text-center max-w-full break-words">Remanejamento</span>
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-seguranca-graphite text-white border-seguranca-red">
                  <p className="font-semibold">Remanejamentos</p>
                  <p className="text-xs text-gray-400">Transferências e mudanças de função</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger
                    value="funcionarios"
                    className="modern-tab flex flex-col items-center justify-center gap-1.5 px-3 py-2.5 text-slate-300 data-[state='active']:bg-gradient-to-br data-[state='active']:from-red-600 data-[state='active']:to-red-700 data-[state='active']:text-white data-[state='active']:shadow-lg data-[state='active']:shadow-red-500/50 hover:bg-slate-800/60 hover:text-white transition-all duration-300 rounded-lg min-w-[100px] max-w-[125px] min-h-[72px] flex-shrink-0 cursor-pointer"
                  >
                    <Users className="h-5 w-5 flex-shrink-0" />
                    <span className="text-[10px] sm:text-[11px] font-medium leading-tight text-center max-w-full break-words">Funcionários</span>
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-seguranca-graphite text-white border-seguranca-red">
                  <p className="font-semibold">Lista de Funcionários</p>
                  <p className="text-xs text-gray-400">Posto atual, histórico e relatórios</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger
                    value="lancamento-manual"
                    className="modern-tab flex flex-col items-center justify-center gap-1.5 px-3 py-2.5 text-slate-300 data-[state='active']:bg-gradient-to-br data-[state='active']:from-red-600 data-[state='active']:to-red-700 data-[state='active']:text-white data-[state='active']:shadow-lg data-[state='active']:shadow-red-500/50 hover:bg-slate-800/60 hover:text-white transition-all duration-300 rounded-lg min-w-[100px] max-w-[125px] min-h-[72px] flex-shrink-0 cursor-pointer"
                  >
                    <FileText className="h-5 w-5 flex-shrink-0" />
                    <span className="text-[10px] sm:text-[11px] font-medium leading-tight text-center max-w-full break-words">Folha Ponto</span>
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-seguranca-graphite text-white border-seguranca-red">
                  <p className="font-semibold">Lançamento Manual de Folha de Ponto</p>
                  <p className="text-xs text-gray-400">Preencha horários de entrada, intervalo e saída por dia</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger
                    value="frota"
                    className="modern-tab flex flex-col items-center justify-center gap-1.5 px-3 py-2.5 text-slate-300 data-[state='active']:bg-gradient-to-br data-[state='active']:from-red-600 data-[state='active']:to-red-700 data-[state='active']:text-white data-[state='active']:shadow-lg data-[state='active']:shadow-red-500/50 hover:bg-slate-800/60 hover:text-white transition-all duration-300 rounded-lg min-w-[100px] max-w-[125px] min-h-[72px] flex-shrink-0 cursor-pointer"
                  >
                    <Truck className="h-5 w-5 flex-shrink-0" />
                    <span className="text-[10px] sm:text-[11px] font-medium leading-tight text-center max-w-full break-words">Frota</span>
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-seguranca-graphite text-white border-seguranca-red">
                  <p className="font-semibold">Gestão de Frota</p>
                  <p className="text-xs text-gray-400">Veículos, abastecimentos, manutenções, multas e motoristas</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger
                    value="visitas-supervisor"
                    className="modern-tab flex flex-col items-center justify-center gap-1.5 px-3 py-2.5 text-slate-300 data-[state='active']:bg-gradient-to-br data-[state='active']:from-blue-600 data-[state='active']:to-blue-700 data-[state='active']:text-white data-[state='active']:shadow-lg data-[state='active']:shadow-blue-500/50 hover:bg-slate-800/60 hover:text-white transition-all duration-300 rounded-lg min-w-[100px] max-w-[125px] min-h-[72px] flex-shrink-0 cursor-pointer"
                  >
                    <MapPin className="h-5 w-5 flex-shrink-0" />
                    <span className="text-[10px] sm:text-[11px] font-medium leading-tight text-center max-w-full break-words">Visitas</span>
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-seguranca-graphite text-white border-seguranca-red">
                  <p className="font-semibold">Relatório de Visitas</p>
                  <p className="text-xs text-gray-400">Check-ins dos supervisores nos postos</p>
                </TooltipContent>
              </Tooltip>

            </TabsList>
          </div>
        </TooltipProvider>

        {/* Aba de Cobertura e Férias Agendadas */}
        <TabsContent value="vacations" className="space-y-4">
          <Card className="border-slate-700/50 bg-seguranca-graphite/40">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Calendar className="h-5 w-5 text-amber-400" />
                    Gestão de Férias Período de Experiência & Coberturas de Férias
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Consulte férias agendadas, período de experiência e coberturas operacionais.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button onClick={() => setShowFeriasReportModal(true)} size="sm" variant="outline" className="border-amber-500/40 text-amber-300 hover:bg-amber-500/10">
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Relatório Completo (PDF / Excel)
                  </Button>
                  <Button onClick={handleCreateFerias} size="sm" className="bg-seguranca-yellow hover:bg-yellow-500 text-seguranca-black font-semibold">
                    <Plus className="h-4 w-4 mr-1.5" />
                    Nova Solicitação de Férias
                  </Button>
                </div>
              </div>

              {/* Sub-abas: Férias Agendadas vs Coberturas */}
              <div className="flex items-center gap-2 pt-3 border-t border-gray-700/40">
                <Button
                  size="sm"
                  variant={vacationSubTab === 'scheduled' ? 'default' : 'outline'}
                  onClick={() => setVacationSubTab('scheduled')}
                  className={vacationSubTab === 'scheduled' ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'border-gray-700 text-gray-300'}
                >
                  <Calendar className="h-4 w-4 mr-1.5" />
                  Férias Agendadas ({feriasList.length})
                </Button>
                <Button
                  size="sm"
                  variant={vacationSubTab === 'coverage' ? 'default' : 'outline'}
                  onClick={() => setVacationSubTab('coverage')}
                  className={vacationSubTab === 'coverage' ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'border-gray-700 text-gray-300'}
                >
                  <Users className="h-4 w-4 mr-1.5" />
                  Coberturas de Férias ({vacationCoverages.length})
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {vacationSubTab === 'scheduled' ? (
                <div className="space-y-3">
                  {feriasList.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                      <Calendar className="h-8 w-8 mx-auto mb-2 text-gray-600" />
                      <p className="text-sm">Nenhuma férias agendada encontrada.</p>
                    </div>
                  ) : (
                    feriasList.map((ferias) => {
                      const days = Math.max(1, Math.ceil((new Date(ferias.dataFim).getTime() - new Date(ferias.dataInicio).getTime()) / (1000 * 60 * 60 * 24)) + 1);
                      return (
                        <div key={ferias.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-gray-700/50 bg-seguranca-black/30 rounded-xl hover:border-gray-600 transition-colors gap-3">
                          <div className="flex-1 space-y-1.5">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-white text-base">
                                {ferias.employeeName || 'Funcionário não definido'}
                              </p>
                              {ferias.empresa && (
                                <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-300 border-blue-500/30">
                                  {ferias.empresa}
                                </Badge>
                              )}
                              {ferias.setor && (
                                <span className="text-xs text-gray-400">· {ferias.setor}</span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-3 text-xs text-gray-300">
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/[0.04] border border-gray-700/40 font-medium">
                                <Calendar className="h-3.5 w-3.5 text-amber-400" />
                                {formatDate(ferias.dataInicio)} → {formatDate(ferias.dataFim)} ({days} dias)
                              </span>
                              {ferias.periodoAquisitivo && (
                                <span className="inline-flex items-center gap-1 text-gray-400">
                                  Aquisição: <strong>{ferias.periodoAquisitivo}</strong>
                                </span>
                              )}
                              <span className="text-gray-400">
                                Tipo: <strong>{ferias.tipo === 'FERIAS_VENDIDAS' ? 'Vendidas' : ferias.tipo === 'ABONO_PECUNIARIO' ? 'Abono Pecuniário' : 'Férias Regulares'}</strong>
                              </span>
                            </div>
                            {ferias.observacoes && (
                              <p className="text-xs text-muted-foreground italic">💬 {ferias.observacoes}</p>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-center">
                            <Badge className={
                              ferias.status === 'APROVADO' ? 'bg-emerald-600 text-white font-medium' :
                              ferias.status === 'PENDENTE' ? 'bg-amber-600 text-white font-medium' :
                              'bg-gray-600 text-white font-medium'
                            }>
                              {ferias.status}
                            </Badge>

                            {/* Botão Ver Detalhes */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewFeriasDetails(ferias)}
                              title="Visualizar todos os detalhes da solicitação"
                              className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 p-1.5 h-8 w-8"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>

                            {/* Botão Visualizar PDF - Ativo somente se Aprovado */}
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={ferias.status !== 'APROVADO'}
                              onClick={() => {
                                if (ferias.status === 'APROVADO') {
                                  viewAvisoFeriasPDF(ferias);
                                }
                              }}
                              title={
                                ferias.status === 'APROVADO' 
                                  ? 'Visualizar PDF do Aviso de Férias' 
                                  : 'Visualização de PDF disponível apenas após aprovação'
                              }
                              className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-400/10 p-1.5 h-8 w-8 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <FileText className="h-4 w-4" />
                            </Button>

                            {/* Botão Baixar PDF - Ativo somente se Aprovado */}
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={ferias.status !== 'APROVADO'}
                              onClick={() => {
                                if (ferias.status === 'APROVADO') {
                                  generateAvisoFeriasPDF(ferias);
                                }
                              }}
                              title={
                                ferias.status === 'APROVADO' 
                                  ? 'Baixar PDF do Aviso de Férias' 
                                  : 'Download de PDF disponível apenas após aprovação'
                              }
                              className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10 p-1.5 h-8 w-8 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <Download className="h-4 w-4" />
                            </Button>

                            {/* Botão Editar */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditFerias(ferias)}
                              title="Editar período de férias"
                              className="text-gray-300 hover:text-white hover:bg-gray-700/50 p-1.5 h-8 w-8"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>

                            {/* Botão Excluir */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteFerias(ferias)}
                              title="Excluir ou cancelar solicitação"
                              className="text-red-400 hover:text-red-300 hover:bg-red-400/10 p-1.5 h-8 w-8"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {vacationCoverages.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                      <Users className="h-8 w-8 mx-auto mb-2 text-gray-600" />
                      <p className="text-sm">Nenhuma cobertura de férias encontrada.</p>
                    </div>
                  ) : (
                    vacationCoverages.map(coverage => (
                      <div key={coverage.id} className="flex items-center justify-between p-4 border border-gray-700/50 bg-seguranca-black/30 rounded-xl hover:border-gray-600 transition-colors">
                        <div className="flex-1">
                          <p className="font-semibold text-base text-white">
                            {coverage.employee?.name || 'Funcionário não definido'}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Users className="h-4 w-4 text-blue-400" />
                            <p className="text-sm text-muted-foreground">
                              Substituto: <strong className="text-white">{coverage.substituteEmployee?.name || 'Sem substituto'}</strong>
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5 text-amber-400" />
                              {formatDate(coverage.startDate)} - {formatDate(coverage.endDate)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              Turno: <strong>{formatShift(coverage.shift)}</strong>
                            </span>
                            {coverage.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5 text-seguranca-red" />
                                {coverage.location.name}
                              </span>
                            )}
                          </div>
                          {coverage.observations && (
                            <p className="text-xs text-muted-foreground mt-2 italic">
                              💬 {coverage.observations}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <div
                            className="cursor-pointer"
                            onClick={() => handleChangeVacationCoverageStatus(coverage)}
                            title="Clique para alterar o status"
                          >
                            {getStatusBadge(coverage.status)}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditVacationCoverage(coverage)}
                            title="Editar cobertura"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteVacationCoverage(coverage)}
                            title="Excluir cobertura"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba de Controle de Faltas e Atestados */}
        <TabsContent value="absences" className="space-y-4">
          <Card className="border-slate-700/50 bg-seguranca-graphite/40">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <UserX className="h-5 w-5 text-red-400" />
                    Controle de Faltas & Atestados Médicos
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Lista de colaboradores com atestados médicos entregues e faltas operacionais.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button onClick={() => setShowFeriasReportModal(true)} size="sm" variant="outline" className="border-red-500/40 text-red-300 hover:bg-red-500/10">
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Relatório de Atestados / Faltas
                  </Button>
                  <Button onClick={handleCreateAbsence} size="sm" className="bg-seguranca-red hover:bg-red-700 text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Falta
                  </Button>
                </div>
              </div>

              {/* Sub-abas: Atestados Médicos vs Faltas Manuais */}
              <div className="flex items-center gap-2 pt-3 border-t border-gray-700/40">
                <Button
                  size="sm"
                  variant={absenceSubTab === 'medical' ? 'default' : 'outline'}
                  onClick={() => setAbsenceSubTab('medical')}
                  className={absenceSubTab === 'medical' ? 'bg-red-600 hover:bg-red-700 text-white' : 'border-gray-700 text-gray-300'}
                >
                  <Stethoscope className="h-4 w-4 mr-1.5" />
                  Funcionários com Atestados ({medicalDocs.length})
                </Button>
                <Button
                  size="sm"
                  variant={absenceSubTab === 'manual' ? 'default' : 'outline'}
                  onClick={() => setAbsenceSubTab('manual')}
                  className={absenceSubTab === 'manual' ? 'bg-red-600 hover:bg-red-700 text-white' : 'border-gray-700 text-gray-300'}
                >
                  <UserX className="h-4 w-4 mr-1.5" />
                  Faltas Registradas ({absences.length})
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {absenceSubTab === 'medical' ? (
                <div className="space-y-3">
                  {medicalDocs.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                      <Stethoscope className="h-8 w-8 mx-auto mb-2 text-gray-600" />
                      <p className="text-sm">Nenhum atestado médico registrado.</p>
                    </div>
                  ) : (
                    medicalDocs.map((doc) => (
                      <div key={doc.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-gray-700/50 bg-seguranca-black/30 rounded-xl hover:border-gray-600 transition-colors gap-3">
                        <div className="flex-1 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-white text-base">
                              {doc.employeeName || 'Funcionário não informado'}
                            </p>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-500/15 text-purple-300 border border-purple-500/30">
                              {MEDICAL_TYPE_LABELS[doc.documentType] || doc.documentType}
                            </span>
                            {doc.companyName && (
                              <span className="text-xs text-gray-400 flex items-center gap-1">
                                <Building2 className="h-3 w-3" /> {doc.companyName}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-3 text-xs text-gray-300">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/[0.04] border border-gray-700/40">
                              <Calendar className="h-3.5 w-3.5 text-amber-400" />
                              {formatDate(doc.startDate)} {doc.endDate ? `→ ${formatDate(doc.endDate)}` : ''}
                            </span>
                            <span className="font-mono text-amber-300 font-bold">
                              {doc.days != null ? `${doc.days} dia(s)` : ''} {doc.hours != null ? `/ ${doc.hours}h` : ''}
                            </span>
                            {doc.cidCode && (
                              <span className="inline-flex items-center gap-1 font-mono text-amber-300">
                                CID: <strong>{doc.cidCode}</strong> {doc.cidDescription ? `(${doc.cidDescription})` : ''}
                              </span>
                            )}
                          </div>
                          {doc.observations && (
                            <p className="text-xs text-muted-foreground italic">💬 {doc.observations}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 self-start sm:self-center">
                          {(doc.days ?? 0) >= 15 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse">
                              <ShieldAlert className="h-3.5 w-3.5 text-red-400" /> 15+ dias (INSS)
                            </span>
                          ) : (doc.days ?? 0) >= 12 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              <AlertTriangle className="h-3.5 w-3.5 text-amber-400" /> Alerta ({(doc.days ?? 0)}d)
                            </span>
                          ) : null}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {absences.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                      <UserX className="h-8 w-8 mx-auto mb-2 text-gray-600" />
                      <p className="text-sm">Nenhuma falta registrada.</p>
                    </div>
                  ) : (
                    absences.map(absence => (
                      <div key={absence.id} className="flex items-center justify-between p-3 border border-gray-700/50 bg-seguranca-black/30 rounded-xl hover:border-gray-600 transition-colors">
                        <div className="flex-1">
                          <p className="font-medium text-white">
                            {absence.employee?.name || 'Funcionário não definido'} ({formatDate(absence.absenceDate)})
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
                              Coberto por: {absence.coverageEmployee?.name || 'Não definido'}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(absence.status)}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditAbsence(absence)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteAbsence(absence)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba de Atribuições de Setor de Trabalho */}
        <TabsContent value="assignments" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Atribuições de Setor de Trabalho ({workPostAssignments.length})
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button onClick={handleGenerateWorkPostAssignmentReport} size="sm" variant="outline">
                    <FileText className="h-4 w-4 mr-2" />
                    Gerar Relatório
                  </Button>
                  <Button onClick={handleCreateAssignment} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Atribuição
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {workPostAssignments.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Nenhuma atribuição de posto encontrada.
                  </p>
                ) : (
                  workPostAssignments.map(assignment => (
                    <div key={assignment.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex-1">
                        <p className="font-semibold text-base">
                          {assignment.employee?.name || 'Funcionário não definido'}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <MapPin className="h-4 w-4 text-seguranca-red" />
                          <p className="text-sm text-muted-foreground font-medium">
                            {assignment.workPost?.name || 'Posto não definido'}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(assignment.assignmentDate)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            Turno: <strong>{formatShift(assignment.shift)}</strong>
                          </span>
                          {assignment.startTime && assignment.endTime && (
                            <span>
                              Horário: {formatTime(assignment.startTime)} - {formatTime(assignment.endTime)}
                            </span>
                          )}
                        </div>
                        {assignment.observations && (
                          <p className="text-xs text-muted-foreground mt-2 italic">
                            💬 {assignment.observations}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className="cursor-pointer"
                          onClick={() => handleChangeAssignmentStatus(assignment)}
                          title="Clique para alterar o status"
                        >
                          {getStatusBadge(assignment.status)}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditAssignment(assignment)}
                          title="Editar atribuição"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteAssignment(assignment)}
                          title="Excluir atribuição"
                        >
                          <Trash2 className="h-4 w-4" />
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
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Atividades Específicas ({specificActivities.length})
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button onClick={handleGenerateSpecificActivityReport} size="sm" variant="outline">
                    <FileText className="h-4 w-4 mr-2" />
                    Gerar Relatório
                  </Button>
                  <Button onClick={handleCreateActivity} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Atividade
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {specificActivities.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Nenhuma atividade específica encontrada.
                  </p>
                ) : (
                  specificActivities.map(activity => (
                    <div key={activity.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="bg-seguranca-red/20 text-seguranca-red px-2 py-1 rounded text-xs font-semibold">
                            {formatActivityType(activity.activityType)}
                          </span>
                        </div>
                        <p className="font-semibold text-base">
                          {activity.employee?.name || 'Funcionário não definido'}
                        </p>
                        <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(activity.activityDate)}
                          </span>
                          {activity.startTime && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {formatTime(activity.startTime)}
                              {activity.endTime && ` - ${formatTime(activity.endTime)}`}
                            </span>
                          )}
                          {activity.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" />
                              {activity.location.name}
                            </span>
                          )}
                        </div>
                        {activity.description && (
                          <p className="text-sm text-muted-foreground mt-2">
                            📝 {activity.description}
                          </p>
                        )}
                        {activity.observations && (
                          <p className="text-xs text-muted-foreground mt-1 italic">
                            💬 {activity.observations}
                          </p>
                        )}
                        {activity.completionNotes && (
                          <p className="text-xs text-green-600 mt-1">
                            ✅ {activity.completionNotes}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(activity.status)}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditActivity(activity)}
                          title="Editar atividade"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteActivity(activity)}
                          title="Excluir atividade"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba de Remanejamentos */}
        <TabsContent value="remanejamentos" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <ArrowRightLeft className="h-5 w-5" />
                  Remanejamentos ({remanejamentos.length})
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button onClick={handleOpenRemanejamentoReportModal} size="sm" variant="outline">
                    <FileText className="h-4 w-4 mr-2" />
                    Gerar Relatório
                  </Button>
                  <Button onClick={handleCreateRemanejamento} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Remanejamento
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {remanejamentos.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Nenhum remanejamento encontrado.
                  </p>
                ) : (
                  remanejamentos.map(remanejamento => (
                    <div key={remanejamento.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded text-xs font-semibold">
                            {formatRemanejamentoType(remanejamento.tipo)}
                          </span>
                        </div>
                        <p className="font-semibold text-base">
                          {remanejamento.employeeName || 'Funcionário não definido'}
                        </p>
                        <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(remanejamento.dataRemanejamento)}
                          </span>
                          <span className="flex items-center gap-1">
                            <ArrowRightLeft className="h-3.5 w-3.5" />
                            De: <strong>{formatWorkPostDisplayName(remanejamento.origem)}</strong> → Para: <strong>{formatWorkPostDisplayName(remanejamento.destino)}</strong>
                          </span>
                        </div>
                        {remanejamento.observacao && (
                          <p className="text-xs text-muted-foreground mt-2 italic">
                            💬 {remanejamento.observacao}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditRemanejamento(remanejamento)}
                          title="Editar remanejamento"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteRemanejamento(remanejamento)}
                          title="Excluir remanejamento"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba de Funcionários */}
        <TabsContent value="funcionarios" className="space-y-4">
          <OperationalEmployeesTab />
        </TabsContent>

        <TabsContent value="lancamento-manual" className="space-y-4">
          <LancamentoManualFolhaPonto />
        </TabsContent>

        <TabsContent value="frota" className="space-y-4">
          <Suspense fallback={
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-seguranca-yellow" />
              <span className="ml-2">Carregando Gestão de Frota...</span>
            </div>
          }>
            <Frota embedded />
          </Suspense>
        </TabsContent>

        <TabsContent value="mapa-ocorrencias" className="mt-6">
          <OccurrenceMap />
        </TabsContent>

        <TabsContent value="visitas-supervisor" className="space-y-4">
          <SupervisorVisitReport />
        </TabsContent>

        <TabsContent value="heatmap" className="space-y-4">
          <MapaCalor onEditEscala={onEditEscala} />
        </TabsContent>
      </Tabs>


      {/* Modal de Cobertura de Férias */}
      <VacationCoverageFormModal
        open={showVacationCoverageModal}
        onOpenChange={setShowVacationCoverageModal}
        coverage={selectedVacationCoverage}
        onSubmit={handleSubmitVacationCoverage}
        employees={employees}
      />

      {/* Modal de Falta */}
      <AbsenceFormModal
        open={showAbsenceModal}
        onOpenChange={setShowAbsenceModal}
        absence={selectedAbsence}
        onSubmit={handleSubmitAbsence}
        employees={employees}
      />

      {/* Modal de Atribuição de Posto */}
      <WorkPostAssignmentFormModal
        open={showAssignmentModal}
        onOpenChange={setShowAssignmentModal}
        assignment={selectedAssignment}
        onSubmit={handleSubmitAssignment}
        employees={employees}
      />

      {/* Modal de Alteração de Status - Atribuição */}
      <ChangeStatusModal
        open={showStatusModal}
        onOpenChange={setShowStatusModal}
        currentStatus={assignmentToChangeStatus?.status || ''}
        onConfirm={handleConfirmStatusChange}
        title="Alterar Status da Atribuição"
      />

      {/* Modal de Alteração de Status - Cobertura de Férias */}
      <VacationCoverageStatusModal
        open={showVacationStatusModal}
        onOpenChange={setShowVacationStatusModal}
        currentStatus={vacationCoverageToChangeStatus?.status || ''}
        onConfirm={handleConfirmVacationStatusChange}
      />

      {/* Modal de Confirmação de Exclusão - Cobertura de Férias */}
      <ConfirmDeleteModal
        open={showDeleteVacationCoverageModal}
        onOpenChange={setShowDeleteVacationCoverageModal}
        onConfirm={confirmDeleteVacationCoverage}
        title="Excluir Cobertura de Férias"
        description="Tem certeza que deseja excluir esta cobertura de férias?"
        itemName={vacationCoverageToDelete ? `${vacationCoverageToDelete.employee?.name} (${formatDate(vacationCoverageToDelete.startDate)} - ${formatDate(vacationCoverageToDelete.endDate)})` : ''}
      />

      {/* Modal de Confirmação de Exclusão - Falta */}
      <ConfirmDeleteModal
        open={showDeleteAbsenceModal}
        onOpenChange={setShowDeleteAbsenceModal}
        onConfirm={confirmDeleteAbsence}
        title="Excluir Falta"
        description="Tem certeza que deseja excluir esta falta?"
        itemName={absenceToDelete ? `${absenceToDelete.employee?.name} - ${formatDate(absenceToDelete.absenceDate)}` : ''}
      />

      {/* Modal de Confirmação de Exclusão - Atribuição */}
      <ConfirmDeleteModal
        open={showDeleteAssignmentModal}
        onOpenChange={setShowDeleteAssignmentModal}
        onConfirm={confirmDeleteAssignment}
        title="Excluir Atribuição"
        description="Tem certeza que deseja excluir esta atribuição de posto?"
        itemName={assignmentToDelete ? `${assignmentToDelete.employee?.name} - ${assignmentToDelete.workPost?.name}` : ''}
      />

      {/* Modal de Atividade Específica */}
      <SpecificActivityFormModal
        open={showActivityModal}
        onOpenChange={setShowActivityModal}
        activity={selectedActivity}
        onSubmit={handleSubmitActivity}
        employees={employees}
      />

      {/* Modal de Confirmação de Exclusão - Atividade */}
      <ConfirmDeleteModal
        open={showDeleteActivityModal}
        onOpenChange={setShowDeleteActivityModal}
        onConfirm={confirmDeleteActivity}
        title="Excluir Atividade"
        description="Tem certeza que deseja excluir esta atividade específica?"
        itemName={activityToDelete ? `${formatActivityType(activityToDelete.activityType)} - ${activityToDelete.employee?.name}` : ''}
      />

      {/* Modal de Remanejamento */}
      <RemanejamentoFormModal
        open={showRemanejamentoModal}
        onOpenChange={setShowRemanejamentoModal}
        remanejamento={selectedRemanejamento}
        onSubmit={handleSubmitRemanejamento}
        employees={employees}
      />

      {/* Modal de Relatório de Remanejamentos */}
      <RemanejamentoReportModal
        open={showRemanejamentoReportModal}
        onOpenChange={setShowRemanejamentoReportModal}
      />

      {/* Modal de Confirmação de Exclusão - Remanejamento */}
      <ConfirmDeleteModal
        open={showDeleteRemanejamentoModal}
        onOpenChange={setShowDeleteRemanejamentoModal}
        onConfirm={confirmDeleteRemanejamento}
        title="Excluir Remanejamento"
        description="Tem certeza que deseja excluir este remanejamento?"
        itemName={remanejamentoToDelete ? `${formatRemanejamentoType(remanejamentoToDelete.tipo)} - ${remanejamentoToDelete.employeeName}` : ''}
      />

      {/* Modal de Relatório Completo de Férias */}
      <FeriasReportModal
        isOpen={showFeriasReportModal}
        onClose={() => setShowFeriasReportModal(false)}
      />

      {/* Modal de Nova / Edição de Solicitação de Férias */}
      {showFeriasModal && (
        <FeriasFormModal
          onSuccess={handleFeriasSuccess}
          onClose={() => {
            setShowFeriasModal(false);
            setEditingFeriasId(undefined);
            setEditingFeriasData(undefined);
          }}
          editingId={editingFeriasId}
          initialData={editingFeriasData}
        />
      )}

      {/* Modal de Detalhes Completos da Solicitação de Férias */}
      {showFeriasDetailsModal && selectedFeriasForDetails && (
        <FeriasDetailsModal
          isOpen={showFeriasDetailsModal}
          onClose={() => {
            setShowFeriasDetailsModal(false);
            setSelectedFeriasForDetails(null);
          }}
          ferias={selectedFeriasForDetails}
          onEdit={(ferias) => {
            handleEditFerias(ferias);
          }}
          onDelete={(ferias) => {
            setShowFeriasDetailsModal(false);
            handleDeleteFerias(ferias);
          }}
        />
      )}

      {/* Modal de Confirmação de Exclusão/Cancelamento de Férias */}
      <ConfirmDeleteModal
        open={showDeleteFeriasModal}
        onOpenChange={setShowDeleteFeriasModal}
        onConfirm={confirmDeleteFerias}
        title="Cancelar Solicitação de Férias"
        description="Tem certeza que deseja cancelar esta solicitação de férias?"
        itemName={feriasToDelete ? `${feriasToDelete.employeeName} (${formatDate(feriasToDelete.dataInicio)} a ${formatDate(feriasToDelete.dataFim)})` : ''}
      />
    </div>
  );
};

export default OperationalDashboard;