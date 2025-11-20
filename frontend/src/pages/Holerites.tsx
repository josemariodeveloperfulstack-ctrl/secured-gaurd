import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StandardLayout } from '@/components/StandardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import paymentReceiptService, { type PaymentReceipt, type ReceiptProcessingResponse } from '@/services/paymentReceiptService';
import holeriteService, { Holerite, HoleriteOrganizationResponse, HoleriteOrganizedEntry, HoleriteCompanyGroup, HoleriteSectorGroup, HoleritePeriodGroup, CompanyTypeOrganizationResponse, CompanyTypeGroup } from '@/services/holeriteService';
import { getApiUrl } from '@/config/environment';
import { PaymentReceiptViewModal } from '@/components/paymentReceipts/PaymentReceiptViewModal';
import { 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  FileText, 
  Mail, 
  Download, 
  RefreshCw, 
  Loader2, 
  AlertCircle,
  Trash2,
  MoreHorizontal,
  Calendar,
  User,
  CheckSquare,
  Square,
  CheckCircle,
  MessageSquare,
  X,
  Upload,
  AlertTriangle,
  ExternalLink,
  Receipt,
  GripVertical,
  ChevronDown,
  ChevronRight,
  Building2
} from 'lucide-react';
import HoleriteUpload from '@/components/HoleriteUpload';
import { HoleriteViewModal } from '@/components/holerites/HoleriteViewModal';
import { HoleriteEmailModal } from '@/components/holerites/HoleriteEmailModal';
import HoleriteDeleteDialog from '@/components/holerites/HoleriteDeleteDialog';
import AdvancedFilters from '@/components/holerites/AdvancedFilters';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import UnificadosPorSetor from './UnificadosPorSetor';
import CollaboratorHolerites from './HoleritesColaborador';
import { payslipService } from '@/services/payslipService';
import { unifiedDocumentService } from '@/services/unifiedDocumentService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ReceiptTemplateModal from '@/components/receipts/ReceiptTemplateModal';
import { PdfMergeResult } from '@/services/pdfMergeService';
import api from '@/lib/axios';
import { contactValidationService, type ContactValidationDetail } from '@/services/contactValidationService';
import { QuickUserFormModal } from '@/components/contact-validation/QuickUserFormModal';
import { WhatsAppUpdateModal } from '@/components/contact-validation/WhatsAppUpdateModal';
import { WhatsAppConsentConfirmationModal } from '@/components/contact-validation/WhatsAppConsentConfirmationModal';
import { ContactValidationModal } from '@/components/contact-validation/ContactValidationModal';
import { employeeService } from '@/services/employeeService';
import { userValidationService, type UserValidationResult } from '@/services/userValidationService';

const Holerites: React.FC = () => {
  const { user } = useAuth();
  const normalizedRole = (user?.role ?? '').replace(/^ROLE_/, '').toUpperCase();
  const isCollaborator = normalizedRole === 'COLABORADOR' && !!user;
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedHolerite, setSelectedHolerite] = useState<Holerite | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [holerites, setHolerites] = useState<Holerite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedHolerites, setSelectedHolerites] = useState<string[]>([]);
  const [organizationEntryMap, setOrganizationEntryMap] = useState<Record<string, HoleriteOrganizedEntry>>({});
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filters, setFilters] = useState<any>({});
  const { toast } = useToast();
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [whatsAppMessage, setWhatsAppMessage] = useState('Olá! Seu holerite está disponível para download. Acesse o sistema SecuredGuard para visualizar. Em caso de dúvidas, entre em contato com o RH.');
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const [activeTab, setActiveTab] = useState('processados');
  const [showReceiptUploadModal, setShowReceiptUploadModal] = useState(false);
  const [processingReceipts, setProcessingReceipts] = useState(false);
  const [showMassResultModal, setShowMassResultModal] = useState(false);
  const [massResult, setMassResult] = useState<EnvioResponse | null>(null);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loadingReceipts, setLoadingReceipts] = useState(false);
  const [selectedReceipts, setSelectedReceipts] = useState<string[]>([]);
  const [deletingReceipts, setDeletingReceipts] = useState(false);
  const [showReceiptDeleteModal, setShowReceiptDeleteModal] = useState(false);
  const [receiptToDelete, setReceiptToDelete] = useState<any>(null);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[] | null>(null);


  // Estados para template de recibo
  const [showReceiptTemplateModal, setShowReceiptTemplateModal] = useState(false);
  const [selectedReceiptForTemplate, setSelectedReceiptForTemplate] = useState<any>(null);

  // Estados para união de documentos

  // Função para lidar com sucesso da união de documentos
  const handleMergeSuccess = (result: PdfMergeResult) => {
    toast({
      title: "Sucesso",
      description: `Documentos unidos com sucesso! Arquivo: ${result.fileName}`,
    });
    
    // Opcionalmente, adicionar o resultado à lista de documentos unificados
    // ou atualizar alguma lista existente
  };

  // Estados para unificação individual
  const [individualUnifications, setIndividualUnifications] = useState<any[]>([]);
  const [draggedHolerite, setDraggedHolerite] = useState<any>(null);
  const [draggedRecibo, setDraggedRecibo] = useState<any>(null);
  const [showIndividualUnificationModal, setShowIndividualUnificationModal] = useState(false);
  const [processingIndividualUnification, setProcessingIndividualUnification] = useState(false);
  const [holeriteSearchTerm, setHoleriteSearchTerm] = useState('');
  const [reciboSearchTerm, setReciboSearchTerm] = useState('');
  const [selectedUnifiedDocument, setSelectedUnifiedDocument] = useState<any>(null);
  const [showIndividualUnifiedViewModal, setShowIndividualUnifiedViewModal] = useState(false);

  // Estados para arquivos processados
  const [processedHolerites, setProcessedHolerites] = useState<any[]>([]);

  // Estados para documentos unificados
  const [unifiedDocuments, setUnifiedDocuments] = useState<any[]>([]);
  const [loadingUnifiedDocuments, setLoadingUnifiedDocuments] = useState(false);
  const [unifiedSearchTerm, setUnifiedSearchTerm] = useState('');
  const [unifiedMonthFilter, setUnifiedMonthFilter] = useState<string>('');
  const [unifiedYearFilter, setUnifiedYearFilter] = useState<string>('');
  
  // Estados para organização de documentos unificados por empresa/setor
  const [unifiedOrganizationData, setUnifiedOrganizationData] = useState<HoleriteOrganizationResponse | null>(null);
  const [loadingUnifiedOrganization, setLoadingUnifiedOrganization] = useState(false);
  const [unifiedOrganizationError, setUnifiedOrganizationError] = useState<string | null>(null);
  const [expandedUnifiedCompanies, setExpandedUnifiedCompanies] = useState<Record<string, boolean>>({});
  const [expandedUnifiedSectors, setExpandedUnifiedSectors] = useState<Record<string, boolean>>({});
  const [expandedUnifiedPeriods, setExpandedUnifiedPeriods] = useState<Record<string, boolean>>({});
  
  // Estados para seleção de documentos
  const [selectedUnifiedDocuments, setSelectedUnifiedDocuments] = useState<Set<number>>(new Set());
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendType, setSendType] = useState<'email' | 'whatsapp'>('email');
  const [sendingDocuments, setSendingDocuments] = useState(false);

  // Validação de contatos para envio em lote (holerites)
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationSendType, setValidationSendType] = useState<'email' | 'whatsapp' | 'both'>('whatsapp');
  const [resolvedEmployeeIds, setResolvedEmployeeIds] = useState<string[]>([]);

  // Visualização de PDF unificado
  const [showUnifiedViewerModal, setShowUnifiedViewerModal] = useState(false);
  const [viewerDocumentIndex, setViewerDocumentIndex] = useState<number | null>(null);
  const [viewerDocument, setViewerDocument] = useState<any>(null);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const viewerUrlRef = useRef<string | null>(null);
  
  // Estados para exclusão de documentos unificados
  const [showUnifiedDeleteModal, setShowUnifiedDeleteModal] = useState(false);
  const [deleteType, setDeleteType] = useState<'individual' | 'batch'>('individual');
  const [deleteDocumentIndex, setDeleteDocumentIndex] = useState<number | null>(null);
  const [deletingDocuments, setDeletingDocuments] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState<{
    total: number;
    completed: number;
    failed: number;
    current: string;
  }>({ total: 0, completed: 0, failed: 0, current: '' });

  // Modais de ação individual (criar usuário / atualizar WhatsApp)
  const [selectedValidationDetail, setSelectedValidationDetail] = useState<ContactValidationDetail | null>(null);
  const [showSingleConsentModal, setShowSingleConsentModal] = useState(false);
  const [pendingConsentContext, setPendingConsentContext] = useState<{ payslip: Holerite; employeeId?: string } | null>(null);
  const [pendingWhatsappContext, setPendingWhatsappContext] = useState<{ payslip: Holerite; employeeId?: string } | null>(null);
  const [showSingleUserModal, setShowSingleUserModal] = useState(false);
  const [showSingleWhatsappModal, setShowSingleWhatsappModal] = useState(false);
  
  // Logs de envio
  const [logs, setLogs] = useState<any[]>([]);
  const [logsCpf, setLogsCpf] = useState('');
  const [logsName, setLogsName] = useState('');
  const [logsStatus, setLogsStatus] = useState('');
  const [logsMonth, setLogsMonth] = useState<string>('');
  const [logsYear, setLogsYear] = useState<string>('');
  const [loadingLogs, setLoadingLogs] = useState(false);

  useEffect(() => {
    return () => {
      if (viewerUrlRef.current) {
        URL.revokeObjectURL(viewerUrlRef.current);
        viewerUrlRef.current = null;
      }
    };
  }, []);

  // Callback após validação: aqui chamaremos envio real na Fase 3
  const handleValidated = async (validatedIds: string[]) => {
    if (!validatedIds || validatedIds.length === 0) {
      toast({ title: 'Sem destinatários prontos', description: 'Nenhum funcionário pronto para envio.', variant: 'destructive' });
      return;
    }
    try {
      // Dispara envio via backend. Se 'both', faz duas chamadas sequenciais
      if (validationSendType === 'both') {
        const emailRes = await api.post('/api/envio/massa', { tipo: 'email', funcionarioIds: validatedIds });
        const waRes = await api.post('/api/envio/massa', { tipo: 'whatsapp', funcionarioIds: validatedIds, mensagem: whatsAppMessage });
        // combinar resultados simples
        const combined: EnvioResponse = {
          sucesso: emailRes.data?.sucesso && waRes.data?.sucesso,
          mensagem: 'Envio em massa concluído (Email + WhatsApp)'.trim(),
          dataEnvio: waRes.data?.dataEnvio || emailRes.data?.dataEnvio,
          tipoEnvio: 'both',
          totalEnviados: (emailRes.data?.totalEnviados || 0) + (waRes.data?.totalEnviados || 0),
          totalFalhas: (emailRes.data?.totalFalhas || 0) + (waRes.data?.totalFalhas || 0),
          detalhes: [ ...(emailRes.data?.detalhes || []), ...(waRes.data?.detalhes || []) ],
        } as EnvioResponse;
        setMassResult(combined);
        setShowMassResultModal(true);
      } else {
        const { data } = await api.post('/api/envio/massa', { tipo: validationSendType, funcionarioIds: validatedIds, mensagem: validationSendType === 'whatsapp' ? whatsAppMessage : undefined });
        setMassResult(data);
        setShowMassResultModal(true);
      }
    } catch (e: any) {
      console.error('Erro ao iniciar envio em massa:', e);
      toast({ title: 'Erro no envio', description: e?.response?.data?.mensagem || 'Falha ao iniciar envio.', variant: 'destructive' });
    }
  };

  // Download em massa dos holerites selecionados
  const handleDownloadSelectedHolerites = async () => {
    if (selectedHolerites.length === 0) {
      toast({ title: 'Nenhum selecionado', description: 'Selecione ao menos um holerite.', variant: 'destructive' });
      return;
    }
    try {
      const selected = filteredHolerites.filter(h => selectedHolerites.includes(h.id));
      for (const h of selected) {
        if (!h.id) { continue; }
        try {
          // Usar ID em vez de fileName para garantir que o holerite correto seja baixado
          const blob = await holeriteService.downloadHoleriteById(h.id);
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = h.fileName;
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(url);
        } catch (e) {
          console.error('Falha ao baixar holerite:', h.fileName, e);
        }
      }
      toast({ title: 'Downloads iniciados', description: `${selected.length} arquivo(s) solicitado(s).` });
    } catch (e) {
      console.error('Erro no download em massa:', e);
      toast({ title: 'Erro', description: 'Falha ao iniciar downloads.', variant: 'destructive' });
    }
  };

  const loadLogs = async () => {
    setLoadingLogs(true);
    try {
      const month = logsMonth ? parseInt(logsMonth) : undefined;
      const year = logsYear ? parseInt(logsYear) : undefined;
      
      // Permitir busca sem CPF para listar todos os logs
      const cpfFilter = logsCpf || undefined;
      
      const data = await holeriteService.listSendLogs(cpfFilter, month, year);
      setLogs(Array.isArray(data) ? data : []);
      
      if (!Array.isArray(data) || data.length === 0) {
        toast({
          title: "Nenhum log encontrado",
          description: "Não há registros de envio com os filtros informados.",
        });
      }
    } catch (e: any) {
      console.error('Erro ao carregar logs:', e);
      setLogs([]);
      toast({
        title: "Erro ao carregar logs",
        description: e.message || "Erro desconhecido ao buscar logs de envio.",
        variant: "destructive"
      });
    } finally {
      setLoadingLogs(false);
    }
  };

  // Atalho: abrir aba de logs a partir de outros componentes
  React.useEffect(() => {
    const handler = (e: any) => {
      if (e?.detail?.cpf) {
        setActiveTab('logs-envio');
        setLogsCpf(e.detail.cpf);
        setTimeout(() => loadLogs(), 0);
      }
    };
    window.addEventListener('open-logs-tab', handler as any);
    return () => window.removeEventListener('open-logs-tab', handler as any);
  }, []);

  // Carregar logs automaticamente quando a aba for ativada
  React.useEffect(() => {
    if (activeTab === 'logs-envio' && logs.length === 0 && !loadingLogs) {
      console.log('📊 Carregando logs automaticamente ao abrir a aba...');
      loadLogs();
    }
  }, [activeTab]);
  const [processedRecibos, setProcessedRecibos] = useState<any[]>([]);
  const [loadingProcessedFiles, setLoadingProcessedFiles] = useState(false);

  // Estados para modais de exclusão
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showBatchDeleteModal, setShowBatchDeleteModal] = useState(false);
  const [holeritesToDelete, setHoleritesToDelete] = useState<Holerite[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  // Estados para comprovantes de pagamento
  const [paymentReceipts, setPaymentReceipts] = useState<PaymentReceipt[]>([]);
  const [loadingPaymentReceipts, setLoadingPaymentReceipts] = useState(false);
  const [showPaymentReceiptUploadModal, setShowPaymentReceiptUploadModal] = useState(false);
  const [processingPaymentReceipts, setProcessingPaymentReceipts] = useState(false);
  const [activeYear, setActiveYear] = useState('2025');
  const [activeMonth, setActiveMonth] = useState('1');
  const [selectedPaymentReceipts, setSelectedPaymentReceipts] = useState<string[]>([]);
  const [selectedPaymentReceiptForView, setSelectedPaymentReceiptForView] = useState<PaymentReceipt | null>(null);
  const [showPaymentReceiptViewModal, setShowPaymentReceiptViewModal] = useState(false);

  // Estados para organização por empresas
  const [organizationData, setOrganizationData] = useState<HoleriteOrganizationResponse | null>(null);
  const [loadingOrganization, setLoadingOrganization] = useState(false);
  const [organizationError, setOrganizationError] = useState<string | null>(null);
  const [expandedCompanies, setExpandedCompanies] = useState<Record<string, boolean>>({});
  
  // Estados para organização por tipo de empresa (TASK 04)
  const [companyTypeOrganizationData, setCompanyTypeOrganizationData] = useState<CompanyTypeOrganizationResponse | null>(null);
  const [loadingCompanyTypeOrganization, setLoadingCompanyTypeOrganization] = useState(false);
  const [companyTypeOrganizationError, setCompanyTypeOrganizationError] = useState<string | null>(null);
  const [expandedCompanyTypeCompanies, setExpandedCompanyTypeCompanies] = useState<Record<string, boolean>>({});
  const [activeCompanyTypeTab, setActiveCompanyTypeTab] = useState<'terceirizacao' | 'vigilancia' | 'administrativo'>('terceirizacao');
  const [expandedSectors, setExpandedSectors] = useState<Record<string, boolean>>({});
  const [expandedPeriods, setExpandedPeriods] = useState<Record<string, boolean>>({});

  // Estados para modal de aviso de período duplicado
  const [showDuplicatePeriodModal, setShowDuplicatePeriodModal] = useState(false);
  const [duplicatePeriodInfo, setDuplicatePeriodInfo] = useState<{
    type: 'holerite' | 'comprovante';
    periods: string[];
    count: number;
  } | null>(null);
  const [pendingUploadFile, setPendingUploadFile] = useState<File | null>(null);
  const [overwritingPeriod, setOverwritingPeriod] = useState(false);

  // Estados para unificação em lote
  const [showBatchUnificationModal, setShowBatchUnificationModal] = useState(false);
  const [batchUnificationMonth, setBatchUnificationMonth] = useState<string>('');
  const [batchUnificationYear, setBatchUnificationYear] = useState<string>('');
  const [batchUnificationForce, setBatchUnificationForce] = useState(false);
  const [processingBatchUnification, setProcessingBatchUnification] = useState(false);
  const [batchUnificationResult, setBatchUnificationResult] = useState<any>(null);
  const [showBatchResultModal, setShowBatchResultModal] = useState(false);

  // Estados para navegação de holerites por ano/mês
  const [holeriteActiveYear, setHoleriteActiveYear] = useState<string>('2025');
  const [holeriteActiveMonth, setHoleriteActiveMonth] = useState<string>('6');
  const [holeriteAvailableYears, setHoleriteAvailableYears] = useState<string[]>(['2025']);
  const [holeriteAvailableMonths, setHoleriteAvailableMonths] = useState<number[]>([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  
  // Estados para sistema de abas hierárquico
  const [activePeriodTab, setActivePeriodTab] = useState<'ano' | 'mes' | 'conteudo'>('ano');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  // Função para obter ID único do documento
  const getDocumentId = (document: any): string => {
    return document.id || document.fileName || `doc_${document.filePath || Math.random()}`;
  };

  // Funções para navegação hierárquica por períodos
  const handleYearSelection = (year: string) => {
    setSelectedYear(year);
    setHoleriteActiveYear(year);
    setActivePeriodTab('mes');
    // Limpar seleção de mês ao mudar ano
    setSelectedMonth('');
    setHoleriteActiveMonth('1');
  };

  const handleMonthSelection = (month: string) => {
    setSelectedMonth(month);
    setHoleriteActiveMonth(month);
    setActivePeriodTab('conteudo');
  };

  const handleBackToYears = () => {
    setActivePeriodTab('ano');
    setSelectedYear('');
    setSelectedMonth('');
  };

  const handleBackToMonths = () => {
    setActivePeriodTab('mes');
    setSelectedMonth('');
  };

  const filterRecordByPrefix = useCallback((record: Record<string, boolean>, prefix: string) => {
    return Object.fromEntries(
      Object.entries(record).filter(([key]) => !key.startsWith(prefix))
    );
  }, []);

  const getCompanyKey = (company: { companySigla?: string; companyCnpj?: string; companyName?: string }) => {
    const sigla = (company?.companySigla || 'OUTROS').toUpperCase();
    const identifier = company?.companyCnpj || company?.companyName || 'SEM_IDENTIFICACAO';
    return `${sigla}|${identifier}`;
  };

  const getSectorKey = (companyKey: string, sector: { normalizedSectorName?: string; sectorName?: string }) => {
    const normalized = (sector?.normalizedSectorName || sector?.sectorName || 'SETOR_NAO_INFORMADO').toUpperCase();
    return `${companyKey}|${normalized}`;
  };

  const getPeriodKey = (sectorKey: string, period: { year?: number; month?: number }) => {
    const yearValue = period?.year ?? 0;
    const monthValue = period?.month ?? 0;
    return `${sectorKey}|${yearValue}-${monthValue}`;
  };

  const collectPeriodEntryIds = (period?: HoleritePeriodGroup): string[] => {
    if (!period?.payslips) {
      return [];
    }
    return period.payslips
      .map(p => p.id)
      .filter((id): id is string => Boolean(id));
  };

  const collectSectorEntryIds = (sector?: HoleriteSectorGroup): string[] => {
    if (!sector?.periods) {
      return [];
    }
    return Array.from(new Set(sector.periods.flatMap(collectPeriodEntryIds)));
  };

  const collectCompanyEntryIds = (company?: HoleriteCompanyGroup): string[] => {
    if (!company?.sectors) {
      return [];
    }
    return Array.from(new Set(company.sectors.flatMap(collectSectorEntryIds)));
  };

  const getSelectedSubset = useCallback(
    (ids: string[]) => ids.filter(id => selectedHolerites.includes(id)),
    [selectedHolerites]
  );

  const areIdsFullySelected = useCallback(
    (ids: string[]) => ids.length > 0 && getSelectedSubset(ids).length === ids.length,
    [getSelectedSubset]
  );

  const hasIdsSelected = useCallback(
    (ids: string[]) => getSelectedSubset(ids).length > 0,
    [getSelectedSubset]
  );

  const handleSelectMultipleHolerites = useCallback((ids: string[], select: boolean) => {
    setSelectedHolerites(prev => {
      const set = new Set(prev);
      ids.forEach(id => {
        if (!id) {
          return;
        }
        if (select) {
          set.add(id);
        } else {
          set.delete(id);
        }
      });
      return Array.from(set);
    });
  }, []);

  const resolveHoleriteFromEntry = useCallback((entry: HoleriteOrganizedEntry): Holerite => {
    const existing = holerites.find(h => h.id === entry.id);
    if (existing) {
      return existing;
    }
    return {
      id: entry.id,
      employeeName: entry.employeeName,
      cpf: entry.cpf,
      month: entry.month ?? 0,
      year: entry.year ?? 0,
      fileName: entry.fileName,
      status: 'PROCESSED',
      processedAt: entry.processedAt || '',
      companyName: entry.companyName,
      companyCnpj: entry.companyCnpj,
      companySigla: entry.companySigla,
      workPostName: entry.workPostName || entry.sectorName,
    } as Holerite;
  }, [holerites]);

  // Função para filtrar holerites por CPF, nome e período
  const matchesSearchTerm = useCallback((entry: HoleriteOrganizedEntry, searchTerm: string): boolean => {
    if (!searchTerm.trim()) {
      return true; // Se não houver termo de busca, mostra todos
    }

    const normalizedSearch = searchTerm.toLowerCase().trim();
    
    // Buscar por CPF (remove formatação para comparação)
    const cpfNormalized = entry.cpf?.replace(/\D/g, '').toLowerCase() || '';
    if (cpfNormalized.includes(normalizedSearch.replace(/\D/g, ''))) {
      return true;
    }

    // Buscar por nome do funcionário
    const employeeName = entry.employeeName?.toLowerCase() || '';
    if (employeeName.includes(normalizedSearch)) {
      return true;
    }

    // Buscar por período (formato: MM/YYYY ou M/YYYY)
    const periodFormatted = `${String(entry.month).padStart(2, '0')}/${entry.year}`;
    if (periodFormatted.includes(normalizedSearch)) {
      return true;
    }

    // Buscar por mês (ex: "01", "1", "janeiro", etc.)
    const monthNames = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 
                        'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    const monthNumber = entry.month;
    if (String(monthNumber).includes(normalizedSearch) || 
        monthNames[monthNumber - 1]?.includes(normalizedSearch)) {
      return true;
    }

    // Buscar por ano
    if (String(entry.year).includes(normalizedSearch)) {
      return true;
    }

    return false;
  }, []);

  const formatCpf = (cpf?: string) => {
    if (!cpf) return 'CPF não informado';
    const digits = cpf.replace(/\D/g, '');
    if (digits.length !== 11) {
      return cpf;
    }
    return `${digits.substring(0, 3)}.${digits.substring(3, 6)}.${digits.substring(6, 9)}-${digits.substring(9)}`;
  };

  const formatDateTime = (value?: string) => {
    if (!value) return '';
    try {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        return value;
      }
      return date.toLocaleString('pt-BR');
    } catch {
      return value;
    }
  };

  const toggleCompanyExpansion = useCallback((companyKey: string) => {
    setExpandedCompanies(prev => {
      const isExpanded = !!prev[companyKey];
      const next = { ...prev, [companyKey]: !isExpanded };
      if (isExpanded) {
        setExpandedSectors(prevSectors => filterRecordByPrefix(prevSectors, `${companyKey}|`));
        setExpandedPeriods(prevPeriods => filterRecordByPrefix(prevPeriods, `${companyKey}|`));
      }
      return next;
    });
  }, [filterRecordByPrefix]);

  const toggleSectorExpansion = useCallback((sectorKey: string) => {
    setExpandedSectors(prev => {
      const isExpanded = !!prev[sectorKey];
      const next = { ...prev, [sectorKey]: !isExpanded };
      if (isExpanded) {
        setExpandedPeriods(prevPeriods => filterRecordByPrefix(prevPeriods, `${sectorKey}|`));
      }
      return next;
    });
  }, [filterRecordByPrefix]);

  const togglePeriodExpansion = useCallback((periodKey: string) => {
    setExpandedPeriods(prev => ({
      ...prev,
      [periodKey]: !prev[periodKey]
    }));
  }, []);

  const fetchOrganizationData = useCallback(async (forceReload = false) => {
    if (loadingOrganization) {
      return;
    }
    if (!forceReload && organizationData) {
      return;
    }

    setLoadingOrganization(true);
    setOrganizationError(null);
    setExpandedCompanies({});
    setExpandedSectors({});
    setExpandedPeriods({});

    try {
      const data = await holeriteService.getOrganizationByCompany();
      setOrganizationData(data);

      const map: Record<string, HoleriteOrganizedEntry> = {};
      data?.companies?.forEach(company => {
        company?.sectors?.forEach(sector => {
          sector?.periods?.forEach(period => {
            period?.payslips?.forEach(entry => {
              if (entry?.id) {
                map[entry.id] = entry;
              }
            });
          });
        });
      });
      setOrganizationEntryMap(map);
    } catch (error: any) {
      console.error('Erro ao carregar organização de holerites:', error);
      const message = error?.response?.data?.message || error?.message || 'Erro ao carregar organização de holerites.';
      setOrganizationError(message);
      setOrganizationEntryMap({});
      toast({
        title: 'Erro ao carregar organização',
        description: message,
        variant: 'destructive'
      });
    } finally {
      setLoadingOrganization(false);
    }
  }, [loadingOrganization, organizationData, toast]);

  const handleRefreshOrganization = useCallback(() => {
    fetchOrganizationData(true);
  }, [fetchOrganizationData]);

  useEffect(() => {
    if (activeTab === 'processados') {
      fetchOrganizationData();
    }
  }, [activeTab, fetchOrganizationData]);

  // Buscar organização por tipo de empresa (TASK 04)
  const fetchCompanyTypeOrganizationData = useCallback(async (forceReload = false) => {
    if (loadingCompanyTypeOrganization) {
      return;
    }

    if (!forceReload && companyTypeOrganizationData) {
      return;
    }

    setLoadingCompanyTypeOrganization(true);
    setCompanyTypeOrganizationError(null);

    try {
      const data = await holeriteService.getOrganizationByCompanyType();
      setCompanyTypeOrganizationData(data);
      console.log('📊 Organização por tipo carregada:', data);
    } catch (error: any) {
      console.error('❌ Erro ao carregar organização por tipo:', error);
      setCompanyTypeOrganizationError(error.message || 'Erro ao carregar organização por tipo');
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar a organização por tipo de empresa.',
        variant: 'destructive',
      });
    } finally {
      setLoadingCompanyTypeOrganization(false);
    }
  }, [loadingCompanyTypeOrganization, companyTypeOrganizationData, toast]);

  useEffect(() => {
    if (activeTab === 'empresas' && user) {
      fetchCompanyTypeOrganizationData();
    }
  }, [activeTab, user, fetchCompanyTypeOrganizationData]);

  // Função para obter holerites filtrados pelo período selecionado
  const getFilteredHoleritesByPeriod = () => {
    if (!selectedYear) return [];
    
    return holerites.filter(holerite => {
      const matchesYear = holerite.year.toString() === selectedYear;
      const matchesMonth = !selectedMonth || holerite.month.toString() === selectedMonth;
      return matchesYear && matchesMonth;
    });
  };

  // Função para obter meses disponíveis para o ano selecionado
  const getAvailableMonthsForYear = (year: string) => {
    if (!year) return [];
    
    const monthsInYear = holerites
      .filter(holerite => holerite.year.toString() === year)
      .map(holerite => holerite.month)
      .filter((month, index, array) => array.indexOf(month) === index)
      .sort((a, b) => a - b);
    
    return monthsInYear;
  };

  // Função para processar unificação em lote
  const handleBatchUnification = async () => {
    setProcessingBatchUnification(true);
    setBatchUnificationResult(null);
    
    try {
      console.log('🎯 Iniciando unificação em lote');
      console.log('🔧 Configuração da API:', {
        baseURL: api.defaults.baseURL,
        timeout: 120000
      });
      console.log('📋 Filtros aplicados:', { 
        month: batchUnificationMonth || 'todos', 
        year: batchUnificationYear || 'todos',
        force: batchUnificationForce 
      });
      
      const params: any = {
        forceUnification: batchUnificationForce
      };
      
      if (batchUnificationMonth) {
        params.month = parseInt(batchUnificationMonth);
      }
      
      if (batchUnificationYear) {
        params.year = parseInt(batchUnificationYear);
      }
      
      console.log('🌐 Enviando requisição para:', '/api/unified-documents/create-batch');
      console.log('📤 Parâmetros:', params);
      
      const response = await api.post('/api/unified-documents/create-batch', null, { 
        params,
        timeout: 120000 // 2 minutos de timeout para processamento em lote
      });
      
      console.log('✅ Resposta do servidor:', response.data);
      
      if (response.data.sucesso || response.data.totalSuccess > 0) {
        setBatchUnificationResult(response.data);
        setShowBatchUnificationModal(false);
        setShowBatchResultModal(true);
        
        // ✅ RECARREGAR lista de documentos unificados
        console.log('🔄 Recarregando lista de documentos unificados após unificação em massa...');
        await fetchUnifiedDocuments(true);
        await loadUnifiedOrganization();
        
        toast({
          title: "✅ Unificação concluída",
          description: `${response.data.totalSuccess} documentos unificados com sucesso`,
        });
      } else {
        toast({
          title: "⚠️ Nenhum documento unificado",
          description: response.data.mensagem || "Verifique os filtros e tente novamente",
          variant: "destructive"
        });
      }
      
    } catch (error: any) {
      console.error('💥 Erro na unificação em lote:', error);
      console.error('💥 Detalhes do erro:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        code: error.code,
        url: error.config?.url,
        method: error.config?.method
      });
      
      // Tratamento mais específico de erros
      let errorMessage = "Erro desconhecido";
      
      if (error.code === 'ECONNABORTED') {
        errorMessage = "Timeout: O processamento demorou muito. Tente com um período menor.";
      } else if (error.response?.data?.mensagem) {
        errorMessage = error.response.data.mensagem;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "âŒ Erro na unificação",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setProcessingBatchUnification(false);
    }
  };

  // Funções para filtrar documentos nas listas de unificação individual
  const getFilteredHolerites = () => {
    if (!holeriteSearchTerm) return processedHolerites;
    return processedHolerites.filter(holerite => 
        holerite.employeeName.toLowerCase().includes(holeriteSearchTerm.toLowerCase()) ||
        holerite.cpf.includes(holeriteSearchTerm) ||
        holerite.name.toLowerCase().includes(holeriteSearchTerm.toLowerCase())
    );
  };

  const getFilteredRecibos = () => {
    if (!reciboSearchTerm) return processedRecibos;
    return processedRecibos.filter(recibo => 
        recibo.employeeName.toLowerCase().includes(reciboSearchTerm.toLowerCase()) ||
        recibo.name.toLowerCase().includes(reciboSearchTerm.toLowerCase())
    );
  };


  // Função para carregar comprovantes de pagamento
  const loadPaymentReceipts = async () => {
    try {
      setLoadingPaymentReceipts(true);
      console.log('📊 Carregando comprovantes de pagamento...');
      
      // Carregar dados reais do backend
      const receipts = await paymentReceiptService.getAllPaymentReceipts();
      console.log('✅ Comprovantes carregados do backend:', receipts);
      
      if (receipts && Array.isArray(receipts)) {
        setPaymentReceipts(receipts);
      } else {
        console.log('📊 Nenhum comprovante encontrado no backend');
        setPaymentReceipts([]);
      }
    } catch (error) {
      console.error('âŒ Erro ao carregar comprovantes de pagamento:', error);
      setPaymentReceipts([]);
    } finally {
      setLoadingPaymentReceipts(false);
    }
  };

  // Utilitário: obter mês/ano a partir da data de transferência (MM/AAAA ou DD/MM/AAAA ou DD.MM.AAAA)
  const getReceiptPeriod = (receipt: any): { month: number; year: number } => {
    let month = receipt.month;
    let year = receipt.year;
    const t = (receipt.transferDate || '').trim();
    if (t) {
      let m: RegExpMatchArray | null;
      if ((m = t.match(/^(\d{2})\/(\d{4})$/))) {
        month = parseInt(m[1]);
        year = parseInt(m[2]);
      } else if ((m = t.match(/^(\d{2})\/(\d{2})\/(\d{4})$/))) {
        month = parseInt(m[2]);
        year = parseInt(m[3]);
      } else if ((m = t.match(/^(\d{2})\.(\d{2})\.(\d{4})$/))) {
        month = parseInt(m[2]);
        year = parseInt(m[3]);
      }
    }
    return { month, year };
  };

  // Função para filtrar comprovantes por ano e mês (com base na data de transferência)
  const getFilteredPaymentReceipts = () => {
    return paymentReceipts.filter(r => {
      const p = getReceiptPeriod(r);
      return p.year.toString() === activeYear && p.month.toString() === activeMonth;
    });
  };

  // Função para obter anos disponíveis
  const getAvailableYears = () => {
    const years = [...new Set(paymentReceipts.map(receipt => receipt.year))];
    return years.sort();
  };

  // Função para obter meses disponíveis para um ano (com base na data de transferência)
  const getAvailableMonths = (year: string) => {
    const months = [...new Set(paymentReceipts
      .map(r => getReceiptPeriod(r))
      .filter(p => p.year.toString() === year)
      .map(p => p.month)
    )];
    return months.sort((a, b) => a - b);
  };

  // Função para carregar anos do backend
  const loadAvailableYears = async () => {
    try {
      const years = await paymentReceiptService.getDistinctYears();
      console.log('📊 Anos disponíveis:', years);
      return years;
    } catch (error) {
      console.error('âŒ Erro ao carregar anos:', error);
      return getAvailableYears();
    }
  };

  // Função para carregar meses do backend
  const loadAvailableMonths = async (year: number) => {
    try {
      const months = await paymentReceiptService.getDistinctMonthsByYear(year);
      console.log(`📊 Meses disponíveis para ${year}:`, months);
      return months;
    } catch (error) {
      console.error('âŒ Erro ao carregar meses:', error);
      return getAvailableMonths(year.toString());
    }
  };

  // Função para converter número do mês para nome em português
  const getMonthName = (monthNumber: number): string => {
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return monthNames[monthNumber - 1] || `Mês ${monthNumber}`;
  };

  // Funções para holerites
  const getHoleriteAvailableYears = (): string[] => {
    const years = [...new Set(holerites.map(h => h.year.toString()))].sort((a, b) => b.localeCompare(a));
    return years;
  };

  const getHoleriteAvailableMonths = (year: string): number[] => {
    const yearNumber = parseInt(year);
    const holeritesInYear = holerites.filter(h => h.year === yearNumber);
    const months = [...new Set(holeritesInYear.map(h => h.month))].sort((a, b) => a - b);
    return months.length > 0 ? months : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  };

  const getHoleritesProcessedToday = (): number => {
    const today = new Date();
    const todayString = today.toISOString().split('T')[0]; // YYYY-MM-DD
    
    return holerites.filter(holerite => {
      if (!holerite.processedAt) return false;
      const processedDate = new Date(holerite.processedAt);
      const processedDateString = processedDate.toISOString().split('T')[0];
      return processedDateString === todayString;
    }).length;
  };


  const areAllHoleritesSelected = (): boolean => {
    const filtered = getFilteredHolerites();
    return filtered.length > 0 && filtered.every(h => selectedHolerites.includes(h.id));
  };

  const hasSelectedHolerites = (): boolean => {
    return selectedHolerites.length > 0;
  };

  const handleSelectAllHolerites = (checked: boolean) => {
    const filteredIds = getFilteredHolerites().map(h => h.id);
    handleSelectMultipleHolerites(filteredIds, checked);
  };

  const handleSelectHolerite = (payslipId: string, checked: boolean | 'indeterminate') => {
    handleSelectMultipleHolerites([payslipId], checked === true);
  };

  const handleBatchEmailHolerites = () => {
    handleBatchSendHoleritesForIds(selectedHolerites, 'email');
  };

  const handleBatchWhatsAppHolerites = () => {
    handleBatchSendHoleritesForIds(selectedHolerites, 'whatsapp');
  };

  const handleBatchDeleteHolerites = () => {
    if (selectedHolerites.length === 0) {
      toast({
        title: "Aviso",
        description: "Selecione pelo menos um holerite para excluir.",
        variant: "destructive"
      });
      return;
    }

    setPendingDeleteIds(null);
    setShowBatchDeleteModal(true);
  };

  const confirmBatchDeleteHolerites = async () => {
    try {
      setIsDeleting(true);
      
      const idsToDelete = pendingDeleteIds ?? selectedHolerites;

      if (idsToDelete.length === 0) {
        toast({ title: 'Nenhum holerite selecionado', description: 'Selecione pelo menos um holerite para excluir.', variant: 'destructive' });
        setIsDeleting(false);
        return;
      }

      console.log('🗑️ Iniciando exclusão em lote de holerites');
      console.log('📋 IDs selecionados:', idsToDelete);
      console.log('📊 Quantidade selecionada:', idsToDelete.length);
      
      const result = await holeriteService.deleteMultipleHolerites(idsToDelete);
      
      console.log('✅ Resultado da exclusão:', result);
      
      if (result.deleted > 0) {
        toast({
          title: "Sucesso",
          description: `${result.deleted} holerite(s) excluído(s) com sucesso!`,
        });
      }
      
      if (result.failed > 0) {
        toast({
          title: "Atenção",
          description: `${result.failed} holerite(s) não puderam ser excluídos.`,
          variant: "destructive"
        });
      }
      
      // Limpar seleção
      setSelectedHolerites(prev => prev.filter(id => !idsToDelete.includes(id)));
      setPendingDeleteIds(null);
      
      // Recarregar lista e organização
      await loadHolerites();
      await fetchOrganizationData(true);
      
      // Fechar modal
      setShowBatchDeleteModal(false);
      
    } catch (error) {
      console.error('❌ Erro ao excluir holerites em lote:', error);
      console.error('❌ Detalhes do erro:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      toast({
        title: "Erro",
        description: `Erro ao excluir holerites: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Função para buscar documentos unificados
  const fetchUnifiedDocuments = async (forceRefresh = false) => {
    try {
      setLoadingUnifiedDocuments(true);
      console.log('📊‹ Buscando documentos unificados...', forceRefresh ? '(forÃ§ando refresh)' : '');
      
      let endpoint = '/api/unified-documents/list';
      const params: any = {};
      
      // Se houver filtros de período, usar endpoint específico
      if (unifiedMonthFilter || unifiedYearFilter) {
        endpoint = '/api/unified-documents/list-by-period';
        if (unifiedMonthFilter) params.month = parseInt(unifiedMonthFilter);
        if (unifiedYearFilter) params.year = parseInt(unifiedYearFilter);
      }
      
      // Adicionar timestamp para forÃ§ar refresh quando necessário
      if (forceRefresh) {
        params._t = Date.now();
      }
      
      const response = await api.get(endpoint, { params });
      
      if (response.data.sucesso) {
        const documents = response.data.documents || [];
        setUnifiedDocuments(documents);
        console.log('✅ Documentos unificados carregados:', documents.length);
        
        // Limpar seleções se não há documentos ou se a lista mudou significativamente
        if (documents.length === 0) {
          setSelectedUnifiedDocuments(new Set());
          console.log('🧹 Lista vazia - seleções limpas');
        } else {
          // Verificar se os índices selecionados ainda são válidos
          const filteredDocs = documents;
          const validSelections = new Set<number>();
          
          selectedUnifiedDocuments.forEach(index => {
            if (index < filteredDocs.length) {
              validSelections.add(index);
            }
          });
          
          if (validSelections.size !== selectedUnifiedDocuments.size) {
            setSelectedUnifiedDocuments(validSelections);
            console.log(`🧹 SeleÃ§Ãµes ajustadas: ${selectedUnifiedDocuments.size} → ${validSelections.size}`);
          }
        }
      } else {
        throw new Error(response.data.mensagem || 'Erro ao buscar documentos');
      }
    } catch (error: any) {
      console.error('âŒ Erro ao buscar documentos unificados:', error);
      toast({
        title: "Erro ao carregar documentos",
        description: error.response?.data?.mensagem || error.message || 'Erro desconhecido',
        variant: "destructive"
      });
      setUnifiedDocuments([]);
    } finally {
      setLoadingUnifiedDocuments(false);
    }
  };

  // useEffect para carregar documentos unificados ao montar o componente
  useEffect(() => {
    if (user) {
      console.log('🔄 Carregando documentos unificados na inicialização...');
      fetchUnifiedDocuments();
      // Carregar organização se a aba de unificação estiver ativa
      if (activeTab === 'unificacao-individual') {
        setTimeout(() => {
          loadUnifiedOrganization();
        }, 300);
      }
    }
  }, [user]);

  // Função para filtrar documentos unificados
  const getFilteredUnifiedDocuments = useCallback(() => {
    let docs = [...unifiedDocuments];

    // Filtrar por ano/mês selecionados (caso existam)
    if (selectedYear || selectedMonth) {
      docs = docs.filter(doc => {
        const docYear = (doc.year ?? '').toString();
        const docMonth = (doc.month ?? '').toString();

        const fallbackYearMatch = doc.fileName?.match(/_(\d{4})\.pdf$/);
        const fallbackMonthMatch = doc.fileName?.match(/UNIFICADO_.*?_(\d{1,2})_\d{4}\.pdf$/);

        const resolvedYear = docYear || (fallbackYearMatch ? fallbackYearMatch[1] : '');
        const resolvedMonth = docMonth || (fallbackMonthMatch ? fallbackMonthMatch[1] : '');

        const matchesYear = !selectedYear || resolvedYear === selectedYear;
        const matchesMonth = !selectedMonth || resolvedMonth === selectedMonth;

        return matchesYear && matchesMonth;
      });
    }

    // Filtrar por termo de busca (caso preenchido)
    if (unifiedSearchTerm) {
      const searchLower = unifiedSearchTerm.toLowerCase();
      docs = docs.filter(doc =>
        doc.employeeName?.toLowerCase().includes(searchLower) ||
        doc.fileName?.toLowerCase().includes(searchLower)
      );
    }

    return docs;
  }, [unifiedDocuments, unifiedSearchTerm, selectedYear, selectedMonth]);

  // Funções para gerenciar seleção de documentos
  const toggleDocumentSelection = (index: number) => {
    const newSelected = new Set(selectedUnifiedDocuments);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedUnifiedDocuments(newSelected);
  };

  const selectAllDocuments = () => {
    const filteredDocs = getFilteredUnifiedDocuments();
    setSelectedUnifiedDocuments(new Set(filteredDocs.map((_, index) => index)));
  };

  const deselectAllDocuments = () => {
    setSelectedUnifiedDocuments(new Set());
  };

  const getSelectedDocuments = () => {
    const filteredDocs = getFilteredUnifiedDocuments();
    return filteredDocs.filter((_, index) => selectedUnifiedDocuments.has(index));
  };

  // AÃ§Ãµes de visualizaÃ§Ã£o/baixa/envio por item
  const openUnifiedViewer = async (doc: any, index: number) => {
    try {
      const blob = await unifiedDocumentService.fetchUnifiedDocumentBlob(doc.fileName);
      const objectUrl = URL.createObjectURL(blob);

      if (viewerUrlRef.current) {
        URL.revokeObjectURL(viewerUrlRef.current);
      }

      viewerUrlRef.current = objectUrl;
      setViewerUrl(objectUrl);
      setViewerDocumentIndex(index);
      setViewerDocument(doc);
      setShowUnifiedViewerModal(true);
    } catch (error) {
      console.error('Erro ao carregar documento unificado:', error);
      toast({
        title: 'Erro ao abrir documento',
        description: 'Não foi possível carregar o PDF unificado. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const downloadUnifiedDocument = async (doc: any) => {
    try {
      await unifiedDocumentService.downloadUnifiedDocument(doc.fileName);
    } catch (error) {
      console.error('Erro ao baixar documento unificado:', error);
      toast({
        title: 'Erro ao baixar documento',
        description: 'Não foi possível iniciar o download. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const handleUnifiedViewerOpenChange = (open: boolean) => {
    setShowUnifiedViewerModal(open);
    if (!open) {
      setViewerDocumentIndex(null);
      setViewerDocument(null);
      setViewerUrl(null);
      if (viewerUrlRef.current) {
        URL.revokeObjectURL(viewerUrlRef.current);
        viewerUrlRef.current = null;
      }
    }
  };

  // Função para validar documento unificado antes de enviar
  const validateUnifiedDocumentForSending = async (doc: any): Promise<{ valid: boolean; employeeId?: string; reason?: string }> => {
    // 1. Verificar se tem CPF
    if (!doc.cpf) {
      return { valid: false, reason: 'Documento sem CPF - não é possível identificar o destinatário' };
    }

    const cpf = doc.cpf.replace(/\D/g, '');
    
    // 2. Buscar funcionário pelo CPF
    try {
      const employees = await employeeService.searchEmployees(cpf);
      const employee = employees?.find((e: any) => (e.document || e.cpf || '').replace(/\D/g, '') === cpf);
      
      if (!employee) {
        return { valid: false, reason: 'CPF não encontrado na tabela de funcionários' };
      }

      // 3. Validar se o funcionário tem usuário e WhatsApp
      const validation = await contactValidationService.validateContacts({
        employeeIds: [employee.id],
        type: 'whatsapp'
      });

      const detail = validation?.details?.[0];
      
      if (!detail) {
        return { valid: false, reason: 'Erro ao validar contatos do funcionário' };
      }

      // 4. Verificar se está pronto para envio
      if (detail.status !== 'ready') {
        if (detail.needsUserCreation) {
          return { valid: false, reason: 'Funcionário não possui usuário no sistema' };
        }
        if (detail.needsWhatsAppUpdate) {
          return { valid: false, reason: 'Funcionário não possui WhatsApp cadastrado' };
        }
        return { valid: false, reason: 'Contatos do funcionário não estão prontos para envio' };
      }

      return { valid: true, employeeId: employee.id };
      
    } catch (error) {
      console.error('Erro ao validar documento unificado:', error);
      return { valid: false, reason: 'Erro ao buscar informações do funcionário' };
    }
  };

  // Envio individual de documento unificado
  const sendSingleDocument = async (type: 'email' | 'whatsapp', index: number) => {
    const filteredDocs = getFilteredUnifiedDocuments();
    const doc = filteredDocs[index];
    
    if (!doc) return;

    try {
      // Validar rigorosamente antes de enviar
      const validation = await validateUnifiedDocumentForSending(doc);
      
      if (!validation.valid) {
        toast({
          title: "⚠️ Não é possível enviar",
          description: validation.reason || 'Documento não possui informações válidas para envio',
          variant: "destructive"
        });
        return;
      }

      // Enviar via API
      const payload = {
        tipo: type,
        funcionarioId: validation.employeeId,
        mensagem: type === 'whatsapp' 
          ? 'Olá! Seu documento unificado (holerite + comprovante) está disponível para download. Acesse o sistema SecuredGuard para visualizar.'
          : undefined
      };

      const response = await api.post('/api/envio/individual', payload);
      
      if (response.data.sucesso) {
        toast({
          title: '✅ Sucesso',
          description: `Documento enviado ${type === 'email' ? 'por email' : 'por WhatsApp'} para ${doc.employeeName}`,
        });
      } else {
        toast({
          title: 'Erro no envio',
          description: response.data.mensagem,
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      console.error('Erro ao enviar documento unificado:', error);
      toast({
        title: "Erro",
        description: `Erro ao enviar documento ${type === 'email' ? 'por email' : 'por WhatsApp'}`,
        variant: "destructive"
      });
    }
  };

  // Função auxiliar para validação em lote
  const validateDocumentsForBatch = async (documents: any[]) => {
    const validations = await Promise.all(
      documents.map(doc => validateUnifiedDocumentForSending(doc))
    );
    return validations;
  };

  // Funções para envio de documentos
  const handleSendDocuments = async (type: 'email' | 'whatsapp') => {
    const selected = getSelectedDocuments();
    if (selected.length === 0) {
      toast({
        title: "⚠️ Nenhum documento selecionado",
        description: "Selecione pelo menos um documento para enviar.",
        variant: "destructive",
      });
      return;
    }

    setSendType(type);
    setShowSendModal(true);
  };

  const executeSendDocuments = async () => {
    const selected = getSelectedDocuments();
    setSendingDocuments(true);

    try {
      // Validar e enviar todos os documentos com validação rigorosa por CPF
      const validations = await Promise.all(
        selected.map(doc => validateUnifiedDocumentForSending(doc))
      );

      const validDocs = selected.filter((_, idx) => validations[idx].valid);
      
      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < validDocs.length; i++) {
        const doc = validDocs[i];
        const globalIdx = selected.indexOf(doc);
        const employeeId = validations[globalIdx].employeeId;

        try {
          const payload = {
            tipo: sendType,
            funcionarioId: employeeId,
            mensagem: sendType === 'whatsapp' 
              ? 'Olá! Seu documento unificado (holerite + comprovante) está disponível para download. Acesse o sistema SecuredGuard para visualizar.'
              : undefined
          };

          const response = await api.post('/api/envio/individual', payload);
          
          if (response.data.sucesso) {
            successCount++;
          } else {
            failCount++;
          }
        } catch (error) {
          console.error(`Erro ao enviar documento para ${doc.employeeName}:`, error);
          failCount++;
        }
      }

      const invalidCount = selected.length - validDocs.length;
      
      toast({
        title: '✅ Envio concluído',
        description: `${successCount} enviado(s)${failCount > 0 ? `, ${failCount} falharam` : ''}${invalidCount > 0 ? `, ${invalidCount} inválido(s)` : ''}`,
      });
      
      setShowSendModal(false);
      setSelectedUnifiedDocuments(new Set());
    } catch (error) {
      toast({
        title: "âŒ Erro no envio",
        description: `Erro ao enviar documentos ${sendType === 'email' ? 'por email' : 'por WhatsApp'}.`,
        variant: "destructive",
      });
    } finally {
      setSendingDocuments(false);
    }
  };

  // Funções para exclusão de documentos
  const handleDeleteDocuments = (type: 'individual' | 'batch', index?: number) => {
    if (type === 'individual' && index !== undefined) {
      setDeleteType('individual');
      setDeleteDocumentIndex(index);
      setShowUnifiedDeleteModal(true);
    } else if (type === 'batch') {
      const selected = getSelectedDocuments();
      
      // ValidaÃ§Ãµes mais robustas
      if (selected.length === 0) {
        toast({
          title: "⚠️ Nenhum documento selecionado",
          description: "Selecione pelo menos um documento para excluir.",
          variant: "destructive",
        });
        return;
      }
      
      // Removido limite de 50 documentos - agora permite qualquer quantidade
      
      // Mostrar preview dos documentos selecionados
      const preview = selected.slice(0, 3).map(doc => doc.employeeName || 'N/A').join(', ');
      const remaining = selected.length > 3 ? ` e mais ${selected.length - 3} documento(s)` : '';
      
      // Calcular tamanho total estimado
      const totalSize = selected.reduce((sum, doc) => sum + (doc.fileSize || 0), 0);
      const sizeText = totalSize > 0 ? ` (~${(totalSize / 1024).toFixed(1)} KB)` : '';
      
      toast({
        title: `🗑️ Confirmar exclusão de ${selected.length} documento(s)`,
        description: `${preview}${remaining}${sizeText}`,
        duration: 4000,
      });
      
      setDeleteType('batch');
      setShowUnifiedDeleteModal(true);
    }
  };

  const executeDeleteDocuments = async () => {
    setDeletingDocuments(true);
    setDeleteProgress({ total: 0, completed: 0, failed: 0, current: '' });

    try {
      if (deleteType === 'individual' && deleteDocumentIndex !== null) {
        const doc = getFilteredUnifiedDocuments()[deleteDocumentIndex];
        
        setDeleteProgress({ 
          total: 1, 
          completed: 0, 
          failed: 0, 
          current: `Excluindo ${doc.fileName}...` 
        });
        
        // Exclusão real via API
        console.log(`🗑️ Excluindo documento individual: ${doc.fileName}`);
        const deleteResponse = await api.delete(`/api/unified-documents/delete/${encodeURIComponent(doc.fileName)}`);
        
        if (deleteResponse.data.sucesso) {
          console.log('✅ Documento excluído com sucesso no backend');
          
          // Remover da lista local
          setUnifiedDocuments(prev => {
            const updatedList = prev.filter(d => d.fileName !== doc.fileName);
            console.log(`📊‹ Lista local atualizada: ${prev.length} → ${updatedList.length} documentos`);
            return updatedList;
          });
        } else {
          throw new Error(deleteResponse.data.mensagem || 'Erro ao excluir documento');
        }
        
        setDeleteProgress({ 
          total: 1, 
          completed: 1, 
          failed: 0, 
          current: 'Concluído!' 
        });
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        toast({
          title: "✅ Documento excluído",
          description: `Documento "${doc.fileName}" excluído com sucesso!`,
        });
        
        // Recarregar a lista de documentos unificados para garantir sincronização
        await fetchUnifiedDocuments(true);
        await loadUnifiedOrganization();
        
      } else if (deleteType === 'batch') {
        const selected = getSelectedDocuments();
        setDeleteProgress({ 
          total: selected.length, 
          completed: 0, 
          failed: 0, 
          current: 'Iniciando exclusão em lote...' 
        });
        
        const selectedFileNames = selected.map(doc => doc.fileName);
        let completed = 0;
        let failed = 0;
        
        // Exclusão em lote real via API
        console.log(`🗑️ Excluindo ${selected.length} documentos em lote`);
        const fileNames = selected.map(doc => doc.fileName);
        
        const deleteResponse = await api.delete('/api/unified-documents/delete-multiple', { 
          data: fileNames 
        });
        
        if (deleteResponse.data.sucesso) {
          completed = deleteResponse.data.deletedCount || selected.length;
          failed = deleteResponse.data.failedCount || 0;
          
          console.log(`✅ Exclusão em lote concluída: ${completed} sucessos, ${failed} falhas`);
          
          // Remover da lista local apenas os sucessos
          const successfulDeletions = deleteResponse.data.deletedFiles || fileNames.slice(0, completed);
          
          setUnifiedDocuments(prev => {
            const updatedList = prev.filter(d => !successfulDeletions.includes(d.fileName));
            console.log(`📊‹ Lista local atualizada: ${prev.length} → ${updatedList.length} documentos`);
            return updatedList;
          });
          
          // Atualizar progresso final
          setDeleteProgress({ 
            total: selected.length, 
            completed, 
            failed, 
            current: 'Exclusão em lote concluída!' 
          });
        } else {
          throw new Error(deleteResponse.data.mensagem || 'Erro ao excluir documentos em lote');
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (failed === 0) {
          toast({
            title: "✅ Exclusão em lote concluída",
            description: `${completed} documento(s) excluído(s) com sucesso!`,
          });
        } else {
          toast({
            title: "⚠️ Exclusão parcial",
            description: `${completed} documento(s) excluído(s), ${failed} falharam.`,
            variant: "destructive",
          });
        }
        
        setSelectedUnifiedDocuments(new Set());
      }
      
      // Recarregar a lista de documentos unificados para garantir sincronização
      await fetchUnifiedDocuments(true);
      await loadUnifiedOrganization();
      
      setShowUnifiedDeleteModal(false);
      
    } catch (error) {
      toast({
        title: "âŒ Erro na exclusão",
        description: `Erro ao excluir documento(s). Tente novamente.`,
        variant: "destructive",
      });
    } finally {
      setDeletingDocuments(false);
      setDeleteProgress({ total: 0, completed: 0, failed: 0, current: '' });
    }
  };

  // Função para processar upload de comprovantes - USANDO PROCESSAMENTO AUTOMÃTICO
  // Função para validar se já existem documentos do período antes de importar
  // ✅ ATUALIZADA: Não bloqueia mais o upload - o backend gerencia duplicidade automaticamente
  // Regra backend: Mesmo CNPJ + Mesmo CPF + Mesmo Período = Sobrescreve automaticamente
  // Diferente CNPJ OU Diferente CPF = Importa como novo registro
  const validatePeriodBeforeUpload = (type: 'holerite' | 'comprovante', file?: File): boolean => {
    // Sempre permite o upload - backend decide se sobrescreve ou cria novo
    return true;
  };

  const handlePaymentReceiptUpload = async (file: File, options?: { overwriteExisting?: boolean }) => {
    try {
      setProcessingPaymentReceipts(true);
      console.log('📊¤ Iniciando processamento automático do comprovante:', file.name);
      
      // Usar o novo endpoint de processamento automático
      try {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await api.post('/api/receipts/process-automatic', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 60000, // 60 segundos para processamento
        });
        
        const responseData: ReceiptProcessingResponse = response.data;
        
        // Garantir que receipts seja sempre um array válido
        let processedReceipts: PaymentReceipt[] = [];
        if (responseData && responseData.receipts) {
          if (Array.isArray(responseData.receipts)) {
            processedReceipts = responseData.receipts;
          } else {
            console.warn('⚠️ Receipts não é um array:', responseData.receipts);
            processedReceipts = [];
          }
        }
        
        const summary = responseData?.summary;
        
        console.log('✅ Comprovantes processados automaticamente:', responseData);
        console.log('📋 Processed receipts (array):', processedReceipts);
        console.log('📊 Total de comprovantes:', processedReceipts.length);
        
        // Se for sobrescrita, remover do estado (e do backend) os existentes que
        // colidirem com os novos por (empresa quando disponível) + funcionário + período
        if (options?.overwriteExisting && Array.isArray(processedReceipts) && processedReceipts.length > 0) {
          try {
            for (const newRec of processedReceipts) {
              // Localizar recebimentos existentes que batem com funcionário + período
              const samePeriod = (r: PaymentReceipt) => {
                const m = r.month || (r.paymentDate ? new Date(r.paymentDate).getMonth() + 1 : undefined);
                const y = r.year || (r.paymentDate ? new Date(r.paymentDate).getFullYear() : undefined);
                const nm = newRec.month || (newRec.paymentDate ? new Date(newRec.paymentDate).getMonth() + 1 : undefined);
                const ny = newRec.year || (newRec.paymentDate ? new Date(newRec.paymentDate).getFullYear() : undefined);
                return m === nm && y === ny;
              };
              const toDelete = paymentReceipts.filter(r => samePeriod(r) && (r.employeeName || '').trim().toLowerCase() === (newRec.employeeName || '').trim().toLowerCase());
              for (const old of toDelete) {
                try {
                  await paymentReceiptService.deletePaymentReceipt(old.id);
                } catch (err) {
                  console.warn('Erro ao excluir duplicado existente:', err);
                }
              }
            }
          } catch (err) {
            console.warn('Erro na rotina de sobrescrita seletiva:', err);
          }
        }

        // Adicionar todos os comprovantes processados ao estado
        if (Array.isArray(processedReceipts) && processedReceipts.length > 0) {
          setPaymentReceipts(prev => {
            // Garantir que prev seja sempre um array válido
            const prevArray = Array.isArray(prev) ? prev : [];
            return [...prevArray, ...processedReceipts];
          });
        }
        
        // Mensagem de sucesso com informações do resumo
        const successMessage = summary?.validationOk 
          ? `${processedReceipts.length} comprovante(s) processado(s) automaticamente! ${summary.validationMessage || ''}`
          : `${processedReceipts.length} comprovante(s) processado(s) automaticamente. ${summary?.validationMessage || ''}`;
        
        toast({
          title: "Sucesso",
          description: successMessage,
        });
        
      } catch (backendError) {
        console.error('âŒ Erro no processamento automático:', backendError);
        
        toast({
          title: "Erro",
          description: "Erro ao processar comprovante automaticamente. Verifique se o arquivo está no formato correto.",
          variant: "destructive"
        });
        
        // Não usar fallback - deixar o usuário tentar novamente
        return;
      }
      
      setShowPaymentReceiptUploadModal(false);
    } catch (error) {
      console.error('Erro ao processar comprovante:', error);
      toast({
        title: "Erro",
        description: "Erro ao processar comprovante de pagamento.",
        variant: "destructive"
      });
    } finally {
      setProcessingPaymentReceipts(false);
    }
  };

  // Funções para seleção em lote de comprovantes
  const handleSelectAllPaymentReceipts = (checked: boolean) => {
    if (checked) {
      const allIds = getFilteredPaymentReceipts().map(receipt => receipt.id);
      console.log('✅ Selecionando todos os comprovantes:', allIds);
      setSelectedPaymentReceipts(allIds);
    } else {
      console.log('❌ Desselecionando todos os comprovantes');
      setSelectedPaymentReceipts([]);
    }
  };

  const handleSelectPaymentReceipt = (receiptId: string, checked: boolean) => {
    if (checked) {
      setSelectedPaymentReceipts(prev => [...prev, receiptId]);
    } else {
      setSelectedPaymentReceipts(prev => prev.filter(id => id !== receiptId));
    }
  };

  const handleBatchEmailPaymentReceipts = async () => {
    if (selectedPaymentReceipts.length === 0) {
      toast({
        title: "Aviso",
        description: "Selecione pelo menos um comprovante para envio por email.",
        variant: "destructive"
      });
      return;
    }

    try {
      const selectedReceipts = getFilteredPaymentReceipts().filter(receipt => 
        selectedPaymentReceipts.includes(receipt.id)
      );

      toast({
        title: "Enviando emails",
        description: `Enviando ${selectedReceipts.length} comprovante(s) por email...`,
      });

      // Simular envio de emails em lote
      for (const receipt of selectedReceipts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log(`Enviando email para: ${receipt.employeeName}`);
      }
      
      toast({
        title: "Sucesso",
        description: `${selectedReceipts.length} email(s) enviado(s) com sucesso!`,
      });
      
      // Limpar seleção após envio
      setSelectedPaymentReceipts([]);
    } catch (error) {
      console.error('Erro ao enviar emails em lote:', error);
      toast({
        title: "Erro",
        description: "Erro ao enviar emails em lote.",
        variant: "destructive"
      });
    }
  };

  const handleBatchWhatsAppPaymentReceipts = async () => {
    if (selectedPaymentReceipts.length === 0) {
      toast({
        title: "Aviso",
        description: "Selecione pelo menos um comprovante para envio por WhatsApp.",
        variant: "destructive"
      });
      return;
    }

    try {
      const selectedReceipts = getFilteredPaymentReceipts().filter(receipt => 
        selectedPaymentReceipts.includes(receipt.id)
      );

      toast({
        title: "Enviando WhatsApp",
        description: `Enviando ${selectedReceipts.length} comprovante(s) por WhatsApp...`,
      });

      // Simular envio de WhatsApp em lote
      for (const receipt of selectedReceipts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log(`Enviando WhatsApp para: ${receipt.employeeName}`);
      }

        toast({
        title: "Sucesso",
        description: `${selectedReceipts.length} mensagem(ns) WhatsApp enviada(s) com sucesso!`,
      });

      // Limpar seleção após envio
      setSelectedPaymentReceipts([]);
    } catch (error) {
      console.error('Erro ao enviar WhatsApp em lote:', error);
      toast({
        title: "Erro",
        description: "Erro ao enviar mensagens WhatsApp em lote.",
        variant: "destructive"
      });
    }
  };

  const clearPaymentReceiptSelection = () => {
    setSelectedPaymentReceipts([]);
  };

  // Excluir comprovante individual
  const handleDeletePaymentReceipt = async (receiptId: string) => {
    try {
      await paymentReceiptService.deletePaymentReceipt(receiptId);
      
      // Remover da seleção se estiver selecionado
      setSelectedPaymentReceipts(selectedPaymentReceipts.filter(id => id !== receiptId));
      
      // Recarregar lista de comprovantes de pagamento
      await loadPaymentReceipts();
      
      toast({
        title: "Comprovante excluído",
        description: "Comprovante excluído com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao excluir comprovante:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir comprovante. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  // Visualizar comprovante
  const handleViewPaymentReceipt = (receipt: PaymentReceipt) => {
    setSelectedPaymentReceiptForView(receipt);
    setShowPaymentReceiptViewModal(true);
  };

  // Baixar comprovante
  const handleDownloadPaymentReceipt = async (receiptId: string, fileName: string) => {
    try {
      await paymentReceiptService.downloadPaymentReceipt(receiptId, fileName);
      toast({
        title: "Download iniciado",
        description: "O download do comprovante foi iniciado.",
      });
    } catch (error) {
      console.error('Erro ao baixar comprovante:', error);
      toast({
        title: "Erro",
        description: "Erro ao baixar comprovante. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  // Excluir múltiplos comprovantes
  const handleDeleteMultiplePaymentReceipts = async () => {
    if (selectedPaymentReceipts.length === 0) {
      toast({
        title: "Nenhum comprovante selecionado",
        description: "Selecione pelo menos um comprovante para excluir.",
        variant: "destructive"
      });
      return;
    }

    console.log('🗑️ Iniciando exclusão em lote de comprovantes');
    console.log('📋 IDs selecionados:', selectedPaymentReceipts);
    console.log('📊 Quantidade selecionada:', selectedPaymentReceipts.length);
    console.log('📋 Dados dos comprovantes selecionados:', selectedPaymentReceipts.map(id => {
      const receipt = paymentReceipts.find(r => r.id === id);
      return { id, receipt: receipt ? { id: receipt.id, employeeName: receipt.employeeName, fileName: receipt.fileName } : 'Não encontrado' };
    }));

    try {
      const result = await paymentReceiptService.deleteMultiplePaymentReceipts(selectedPaymentReceipts);
      
      console.log('✅ Resultado da exclusão:', result);
      
      if (result.deleted > 0) {
        toast({
          title: "Comprovantes excluídos",
          description: `${result.deleted} comprovante${result.deleted > 1 ? 's' : ''} excluído${result.deleted > 1 ? 's' : ''} com sucesso.`,
        });
      }
      
      if (result.failed > 0) {
        toast({
          title: "Alguns comprovantes não foram excluídos",
          description: `${result.failed} comprovante${result.failed > 1 ? 's' : ''} não puderam ser excluído${result.failed > 1 ? 's' : ''}.`,
          variant: "destructive"
        });
      }
      
      setSelectedPaymentReceipts([]);
      await loadPaymentReceipts();
    } catch (error: any) {
      console.error('❌ Erro ao excluir comprovantes em lote:', error);
      console.error('❌ Detalhes do erro:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      toast({
        title: "Erro",
        description: `Erro ao excluir comprovantes: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const areAllPaymentReceiptsSelected = () => {
    const filteredReceipts = getFilteredPaymentReceipts();
    return filteredReceipts.length > 0 && 
           selectedPaymentReceipts.length === filteredReceipts.length;
  };

  const hasSelectedPaymentReceipts = () => {
    return selectedPaymentReceipts.length > 0;
  };

  // Carregar holerites
  const loadHolerites = async (filters: any = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📊 Iniciando carregamento de holerites...');
      console.log('📊 Usuário atual:', user);
      console.log('📊 Permissões do usuÃ¡rio:', user?.permissions);
      console.log('📊 Token no localStorage:', localStorage.getItem('token'));
      
      try {
        console.log('📊 Filtros aplicados:', filters);
        const data = await holeriteService.getAllHolerites();
        console.log('✅ Holerites carregados do backend:', data);
        console.log('📊 Tipo dos dados:', typeof data);
        console.log('📊 É array?', Array.isArray(data));
        console.log('📊 Tamanho do array:', data?.length);
        
        if (data && Array.isArray(data)) {
          console.log('✅ Usando dados do backend:', data.length, 'holerites');
          console.log('📋 Estrutura dos primeiros holerites:', data.slice(0, 3).map(h => ({
            id: h.id,
            idType: typeof h.id,
            employeeName: h.employeeName,
            fileName: h.fileName
          })));
          setHolerites(data);
          
          // Atualizar anos disponíveis baseado nos dados reais
          const availableYears = [...new Set(data.map(h => h.year.toString()))].sort((a, b) => b.localeCompare(a));
          console.log('📊… Anos disponíveis baseado nos holerites:', availableYears);
          setHoleriteAvailableYears(availableYears);
          
          // Se o ano ativo não estiver mais disponível, mudar para o primeiro disponível
          if (availableYears.length > 0 && !availableYears.includes(holeriteActiveYear)) {
            setHoleriteActiveYear(availableYears[0]);
            console.log('📊„ Mudando ano ativo para:', availableYears[0]);
          }
        } else {
          console.log('📊 Nenhum holerite encontrado no backend');
          setHolerites([]);
          setHoleriteAvailableYears(['2025']); // Manter 2025 como padrÃ£o
        }
      } catch (backendError) {
        console.error('âŒ Erro no backend:', backendError);
        setHolerites([]);
        setHoleriteAvailableYears(['2025']); // Manter 2025 como padrÃ£o em caso de erro
        setError('Erro ao carregar holerites do servidor. Verifique sua conexão.');
      }
    } catch (err) {
      console.error('âŒ Erro ao carregar holerites:', err);
      console.error('📊 Detalhes do erro:', err.response?.data, err.response?.status);
      setError('Erro ao carregar holerites. Tente novamente.');
        toast({
          title: "Erro",
        description: "Não foi possível carregar os holerites.",
          variant: "destructive"
        });
    } finally {
      setLoading(false);
    }
  };

  // Carregar holerites com filtros
  const loadHoleritesWithFilters = async () => {
    const newFilters: any = { ...filters };
    
    if (searchTerm) {
      newFilters.employeeName = searchTerm;
    }
    
    await loadHolerites(newFilters);
  };

  // Aplicar filtros quando mudarem
  useEffect(() => {
    if (!loading) {
      loadHoleritesWithFilters();
    }
  }, [searchTerm, filters]);

  // Limpar filtros
  const clearFilters = () => {
    setSearchTerm('');
    setFilters({});
    setSelectedHolerites([]);
    loadHolerites();
  };

  // Atualizar holerites
  const refreshHolerites = async () => {
    setRefreshing(true);
    try {
      await loadHolerites();
      setSelectedHolerites([]);
      toast({
        title: "Sucesso",
        description: "Lista de holerites atualizada.",
      });
    } catch (error) {
      console.error('Erro ao atualizar holerites:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a lista de holerites.",
        variant: "destructive"
      });
    } finally {
      setRefreshing(false);
    }
  };

  // Filtrar holerites localmente
  const filteredHolerites = holerites.filter(payslip =>
    payslip.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payslip.cpf.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payslip.month.toString().includes(searchTerm) ||
    payslip.year.toString().includes(searchTerm)
  );

  // Seleção mÃºltipla
  const handleSelectAll = (checked: boolean) => {
    handleSelectMultipleHolerites(getFilteredHoleritesByPeriod().map(h => h.id), checked);
  };

  const isAllSelected = filteredHolerites.length > 0 && selectedHolerites.length === filteredHolerites.length;
  const isIndeterminate = selectedHolerites.length > 0 && selectedHolerites.length < filteredHolerites.length;





  // Funções para unificação individual
  const handleDragStart = (e: React.DragEvent, item: any, type: 'holerite' | 'recibo') => {
            console.log('🚀 Iniciando drag:', { type, item: item.employeeName || 'N/A' });
    
    // Definir dados para transferência
    e.dataTransfer.setData('application/json', JSON.stringify({ item, type }));
    e.dataTransfer.effectAllowed = 'copy';
    
    // Não definir o estado aqui, apenas quando soltar
    console.log('📋 Dados de transferência definidos');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add('border-seguranca-yellow', 'bg-seguranca-yellow/10');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('border-seguranca-yellow', 'bg-seguranca-yellow/50');
  };

    const handleDrop = (e: React.DragEvent, targetType: 'unificacao') => {
    e.preventDefault();
    e.currentTarget.classList.remove('border-seguranca-yellow', 'bg-seguranca-yellow/10');
    
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      const { item, type } = data;
      
      console.log('📊„ Item solto:', { type, item: item.employeeName || 'N/A' });
      
      // Função auxiliar para normalizar nomes (case-insensitive)
      const normalizeName = (name: string) => {
        if (!name) return '';
        return name.trim().toLowerCase()
          .replace(/\s+/g, ' ') // MÃºltiplos espaÃ§os para um sÃ³
          .replace(/valor/g, '')
          .replace(/funcionario/g, '')
          .replace(/empregado/g, '')
          .replace(/colaborador/g, '');
      };
      
      // Adicionar item ao estado correspondente
      if (type === 'holerite') {
        setDraggedHolerite(item);
        console.log('✅ Holerite definido:', item.employeeName || 'N/A');
      } else if (type === 'recibo') {
        setDraggedRecibo(item);
        console.log('✅ Recibo definido:', item.employeeName || 'N/A');
      }
      
      // Verificar se jÃ¡ temos ambos os itens para validação (case-insensitive)
      if (draggedHolerite && type === 'recibo') {
        const holeriteName = normalizeName(draggedHolerite.employeeName || '');
        const reciboName = normalizeName(item.employeeName || '');
        
        if (holeriteName !== reciboName) {
          toast({
            title: "âŒ Nomes diferentes",
            description: `Holerite: ${draggedHolerite.employeeName} | Recibo: ${item.employeeName}`,
            variant: "destructive"
          });
          // Limpar o recibo incorreto
          setDraggedRecibo(null);
          return;
        }
      } else if (draggedRecibo && type === 'holerite') {
        const holeriteName = normalizeName(item.employeeName || '');
        const reciboName = normalizeName(draggedRecibo.employeeName || '');
        
        if (holeriteName !== reciboName) {
          toast({
            title: "âŒ Nomes diferentes",
            description: `Holerite: ${item.employeeName} | Recibo: ${draggedRecibo.employeeName}`,
            variant: "destructive"
          });
          // Limpar o holerite incorreto
          setDraggedHolerite(null);
          return;
        }
      }
      
      // Mostrar toast de confirmação
      toast({
        title: `${type === 'holerite' ? 'Holerite' : 'Recibo'} adicionado`,
        description: `${item.employeeName || 'Nome não disponível'} foi adicionado à área de unificação.`,
      });
      
                    // Se temos ambos os itens com nomes iguais, mostrar confirmação (case-insensitive)
      if (draggedHolerite && draggedRecibo && 
          draggedHolerite.employeeName && draggedRecibo.employeeName) {
        const holeriteName = normalizeName(draggedHolerite.employeeName);
        const reciboName = normalizeName(draggedRecibo.employeeName);
        
        if (holeriteName === reciboName) {
          toast({
            title: "✅ Nomes compatíveis",
            description: `Funcionário: ${draggedHolerite.employeeName} - Unificação permitida!`,
          });
        }
      }
      
    } catch (error) {
      console.error('âŒ Erro ao processar drop:', error);
      toast({
        title: "Erro",
        description: "Não foi possível processar o item arrastado.",
        variant: "destructive"
      });
    }
  };

  const createUnification = (holerite: any, recibo: any) => {
    // Verificar se os objetos são válidos
    if (!holerite || !recibo) {
      console.error('âŒ Objetos inválidos para unificação:', { holerite, recibo });
      toast({
        title: "âŒ Erro de validação",
        description: "Dados inválidos para unificação.",
        variant: "destructive"
      });
      return;
    }

    // Função auxiliar para normalizar e comparar nomes
    const normalizeName = (name: string) => {
      if (!name) return '';
      return name.trim().toLowerCase()
        .replace(/\s+/g, ' ') // MÃºltiplos espaÃ§os para um sÃ³
        .replace(/valor/g, '')
        .replace(/funcionario/g, '')
        .replace(/empregado/g, '')
        .replace(/colaborador/g, '');
    };

    const normalizedHoleriteName = normalizeName(holerite.employeeName || '');
    const normalizedReciboName = normalizeName(recibo.employeeName || '');

    console.log('📊 Comparando nomes para unificação:');
    console.log('  Holerite original:', holerite.employeeName || 'N/A');
    console.log('  Recibo original:', recibo.employeeName || 'N/A');
    console.log('  Holerite normalizado:', normalizedHoleriteName);
    console.log('  Recibo normalizado:', normalizedReciboName);

    // ValidaÃ§Ã£o flexÃ­vel: verificar se os nomes normalizados são iguais
    if (normalizedHoleriteName !== normalizedReciboName) {
      // Tentar verificaÃ§Ã£o adicional por contenção
      const containsMatch = normalizedHoleriteName.includes(normalizedReciboName) || 
                           normalizedReciboName.includes(normalizedHoleriteName);
      
      if (!containsMatch) {
        toast({
          title: "âŒ ValidaÃ§Ã£o falhou",
          description: `Nomes diferentes: Holerite (${holerite.employeeName || 'N/A'}) â‰  Recibo (${recibo.employeeName || 'N/A'})`,
          variant: "destructive"
        });
        return;
      } else {
        console.log('✅ Match por contenção encontrado - aceitando unificação');
      }
    }

    // ValidaÃ§Ã£o adicional: verificar se são do mesmo funcionÃ¡rio
    if (holerite.cpf && recibo.cpf && holerite.cpf !== recibo.cpf) {
      toast({
        title: "âŒ CPF diferente",
        description: `CPFs diferentes: Holerite (${holerite.cpf}) â‰  Recibo (${recibo.cpf})`,
        variant: "destructive"
      });
      return;
    }

    console.log('✅ ValidaÃ§Ã£o aprovada - Criando unificação para:', holerite.employeeName || 'N/A');
    
    // Criar nova unificação individual
    const newUnification = {
      id: `unif_${Date.now()}_${Math.random()}`,
      holerite: holerite,
      recibo: recibo,
      employeeName: holerite.employeeName, // Nome validado
      status: 'pending' as const,
      progress: 0
    };
    
    setIndividualUnifications(prev => [...prev, newUnification]);
    
    // Limpar estados de drag
    setDraggedHolerite(null);
    setDraggedRecibo(null);
    
            toast({
          title: "✅ Unificação criada",
          description: `Documento unificado criado para ${holerite.employeeName || 'N/A'}!`,
        });

    // Iniciar processamento automaticamente
    setTimeout(() => {
      processIndividualUnification(newUnification);
    }, 500);
  };

  const processIndividualUnification = async (unification: any) => {
    setProcessingIndividualUnification(true);
    
    try {
        // Simular progresso inicial
        const progressInterval = setInterval(() => {
            setIndividualUnifications(prev => prev.map(u => 
                u.id === unification.id 
                    ? { ...u, progress: Math.min(u.progress + 10, 30) }
                    : u
            ));
        }, 200);

        // Simular chamada para o backend para unificar documentos
        const unifiedPdfUrl = await generateUnifiedPdf(unification);
        
        clearInterval(progressInterval);

        // Simular progresso final
        const finalProgressInterval = setInterval(() => {
            setIndividualUnifications(prev => prev.map(u => 
                u.id === unification.id 
                    ? { ...u, progress: Math.min(u.progress + 15, 100) }
                    : u
            ));
        }, 150);

        setTimeout(() => {
            clearInterval(finalProgressInterval);
            
            // Atualizar unificação com URL do PDF e status completo
            setIndividualUnifications(prev => prev.map(u => 
                u.id === unification.id 
                    ? { ...u, status: 'completed', progress: 100, unifiedPdfUrl }
                    : u
            ));
            
            setProcessingIndividualUnification(false);
        }, 2000);

    } catch (error) {
        console.error('Erro ao processar unificação:', error);
        setIndividualUnifications(prev => prev.map(u => 
            u.id === unification.id 
                ? { ...u, status: 'error', error: 'Erro ao gerar PDF unificado' }
                : u
        ));
        setProcessingIndividualUnification(false);
    }
  };

  const removeIndividualUnification = (unificationId: string) => {
    setIndividualUnifications(prev => prev.filter(u => u.id !== unificationId));
    toast({
      title: "Sucesso",
      description: "Unificação removida da fila!",
    });
  };

  // Funções para aÃ§Ãµes com documentos unificados individuais
  const handleDownloadIndividualUnified = async (unification: any) => {
    try {
      // Verificar se o PDF unificado jÃ¡ foi gerado
      if (!unification.unifiedPdfUrl) {
        toast({
          title: "PDF não disponível",
          description: "O PDF unificado ainda não foi gerado. Aguarde o processamento.",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Download iniciado",
        description: "Documento unificado sendo baixado...",
      });
      
      // Criar um link temporÃ¡rio para download
      const link = document.createElement('a');
      link.href = unification.unifiedPdfUrl;
      link.download = `unificado_${unification.holerite.employeeName.replace(/\s+/g, '_')}_${unification.holerite.month}_${unification.holerite.year}.pdf`;
      link.target = '_blank';
      
      // Adicionar o link ao DOM e clicar nele
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Sucesso",
        description: "Documento unificado baixado com sucesso!",
      });
    } catch (error) {
      console.error('Erro ao baixar documento unificado:', error);
      toast({
        title: "Erro",
        description: "Não foi possível baixar o documento unificado.",
        variant: "destructive"
      });
    }
  };

  const handleEmailIndividualUnified = async (unification: any) => {
    try {
      // Simular envio por email
      toast({
        title: "Enviando email",
        description: "Documento unificado sendo enviado por email...",
      });
      
      // Aqui vocÃª pode implementar a lÃ³gica real de envio por email
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: "Sucesso",
        description: "Documento unificado enviado por email com sucesso!",
      });
    } catch (error) {
      console.error('Erro ao enviar documento unificado por email:', error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar o documento unificado por email.",
        variant: "destructive"
      });
    }
  };

  const handleWhatsAppIndividualUnified = async (unification: any) => {
    try {
      // Simular envio por WhatsApp
      toast({
        title: "Enviando WhatsApp",
        description: "Documento unificado sendo enviado por WhatsApp...",
      });
      
      // Aqui vocÃª pode implementar a lÃ³gica real de envio por WhatsApp
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: "Sucesso",
        description: "Documento unificado enviado por WhatsApp com sucesso!",
      });
    } catch (error) {
      console.error('Erro ao enviar documento unificado por WhatsApp:', error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar o documento unificado por WhatsApp.",
        variant: "destructive"
      });
    }
  };

  // Função para visualizar documento unificado individual
  const handleViewIndividualUnified = async (unification: any) => {
    setSelectedUnifiedDocument(unification);
    setShowIndividualUnifiedViewModal(true);
    
    // Gerar PDF automaticamente se ainda não foi gerado
    if (!unification.unifiedPdfUrl) {
      console.log('📊„ Gerando PDF automaticamente para visualizaÃ§Ã£o...');
      try {
        const url = await generateUnifiedPdf(unification);
        if (url) {
          // Atualizar o estado para mostrar o PDF unificado
          setSelectedUnifiedDocument(prev => ({ ...prev, unifiedPdfUrl: url }));
          
          // Atualizar tambÃ©m na lista de unificaÃ§Ãµes
          setIndividualUnifications(prev => prev.map(u => 
            u.id === unification.id 
              ? { ...u, unifiedPdfUrl: url, status: 'completed' }
              : u
          ));
          
          toast({
            title: "PDF Gerado",
            description: "PDF unificado foi gerado automaticamente para visualizaÃ§Ã£o.",
          });
        }
      } catch (error) {
        console.error('âŒ Erro ao gerar PDF automaticamente:', error);
        toast({
          title: "Erro",
          description: "Não foi possível gerar o PDF automaticamente.",
          variant: "destructive"
        });
      }
    }
  };

  // Função para gerar URL do PDF unificado
  const getUnifiedPdfUrl = (unification: any) => {
    if (unification?.holerite?.fileName && unification?.recibo?.fileName) {
      // Aqui vocÃª pode implementar a lÃ³gica real para gerar o PDF unificado
      // Por enquanto, vamos tentar carregar os PDFs individuais para demonstraÃ§Ã£o
      
      // Tentar carregar o holerite primeiro
      const apiUrl = getApiUrl().replace('/api', '');
      const holeriteUrl = `${apiUrl}/api/files/holerites/${encodeURIComponent(unification.holerite.fileName)}`;
      const reciboUrl = `${apiUrl}/api/files/receipts/${encodeURIComponent(unification.recibo.fileName)}`;
      
      // Retorna a URL do holerite como exemplo (primeira pÃ¡gina)
      return holeriteUrl;
    }
    return null;
  };

  // Função para gerar PDF unificado real (chamando backend)
  const generateUnifiedPdf = async (unification: any) => {
    try {
      console.log('📊„ Iniciando geraÃ§Ã£o de PDF unificado:', unification);
      
      toast({
        title: "Gerando PDF",
        description: "Criando documento unificado com holerite e recibo...",
      });
      
      // Chamar backend para criar documento unificado a partir de nome/mês/ano
      const employeeName = unification?.holerite?.employeeName || unification?.recibo?.employeeName;
      const month = unification?.holerite?.month || unification?.recibo?.month;
      const year = unification?.holerite?.year || unification?.recibo?.year;

      console.log('📊‹ Dados extraídos:', { employeeName, month, year });

      if (!employeeName || !month || !year) {
        throw new Error('Dados insuficientes para unificação (nome/mês/ano)');
      }

      console.log('🌐 Enviando requisição para backend...');
      const response = await api.post('/api/unified-documents/create', null, {
        params: {
          employeeName,
          month,
          year
        },
        timeout: 60000 // 1 minuto de timeout
      });

      console.log('✅ Resposta do backend:', response.data);

      if (!response?.data || response.data.sucesso !== true || !response.data.filePath) {
        throw new Error(response?.data?.mensagem || 'Resposta inválida do servidor ao criar documento unificado');
      }

      // Extrair fileName do caminho retornado
      const filePath: string = response.data.filePath as string;
      const fileName = filePath.split('\\').pop()?.split('/').pop();
      if (!fileName) {
        throw new Error('Não foi possível determinar o nome do arquivo unificado');
      }

      // Construir URL pÃºblica para visualizaÃ§Ã£o
      const baseURL = (api && (api as any).defaults && (api as any).defaults.baseURL) ? (api as any).defaults.baseURL : '';
      const unifiedPdfUrl = `${baseURL}/unified-documents/public/file/${encodeURIComponent(fileName)}`;

      console.log('✅ PDF unificado criado:', { filePath, fileName, unifiedPdfUrl });
      
      toast({
        title: "✅ PDF Criado",
        description: `Documento unificado criado com sucesso!`,
      });
      
      // Atualizar lista de documentos unificados
      await fetchUnifiedDocuments(true);
      await loadUnifiedOrganization();
      
      return unifiedPdfUrl;
    } catch (error: any) {
      console.error('âŒ Erro ao gerar PDF unificado (backend):', error);
      
      let errorMessage = 'Erro ao unificar documentos';
      
      if (error?.response?.status === 500) {
        errorMessage = 'Erro interno do servidor. Verifique se os arquivos PDF existem no sistema.';
      } else if (error?.response?.data?.mensagem) {
        errorMessage = error.response.data.mensagem;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      console.error('💥 Detalhes do erro:', {
        status: error?.response?.status,
        data: error?.response?.data,
        message: error?.message
      });
      
      toast({
        title: "âŒ Erro na Unificação",
        description: errorMessage,
        variant: "destructive"
      });
      return null;
    }
  };



  // Exclusão mÃºltipla
  const handleDeleteSelected = async () => {
    if (selectedHolerites.length === 0) {
      toast({
        title: "Aviso",
        description: "Selecione pelo menos um holerite para excluir.",
        variant: "destructive"
      });
      return;
    }

    // Preparar holerites para exclusão
    const holeritesToDelete = holerites.filter(p => selectedHolerites.includes(p.id));
    setHoleritesToDelete(holeritesToDelete);
    setShowUnifiedDeleteModal(true);
  };

  // Confirmar exclusão mÃºltipla
  const confirmDeleteSelected = async () => {
    if (selectedHolerites.length === 0) {
      toast({
        title: "Aviso",
        description: "Nenhum holerite selecionado para exclusão.",
        variant: "destructive"
      });
      setShowUnifiedDeleteModal(false);
      return;
    }

    setIsDeleting(true);
      try {
        const result = await holeriteService.deleteMultipleHolerites(selectedHolerites);
        
        // Verificar se há IDs inválidos
        if (result.invalidCount && result.invalidCount > 0) {
          toast({
            title: "Aviso",
            description: `${result.invalidCount} holerite${result.invalidCount > 1 ? 's' : ''} com ID${result.invalidCount > 1 ? 's' : ''} inválido${result.invalidCount > 1 ? 's' : ''}.`,
            variant: "destructive"
          });
        }
        
        if (result.deleted === 0 && result.failed === 0) {
          toast({
            title: "Informação",
            description: "Nenhum holerite foi excluído. Verifique se os holerites ainda existem.",
            variant: "default"
          });
        } else if (result.failed > 0) {
          toast({
            title: "Aviso",
          description: `${result.deleted} holerite${result.deleted > 1 ? 's' : ''} excluído${result.deleted > 1 ? 's' : ''} com sucesso. ${result.failed} falha${result.failed > 1 ? 's' : ''}.`,
            variant: "destructive"
          });
        } else {
          toast({
            title: "Sucesso",
          description: `${result.deleted} holerite${result.deleted > 1 ? 's' : ''} excluído${result.deleted > 1 ? 's' : ''} com sucesso.`,
          });
        }
        
        setSelectedHolerites([]);
        await loadHolerites();
      setShowUnifiedDeleteModal(false);
      } catch (error: any) {
      console.error('Erro ao excluir holerites:', error);
      
      // Melhorar mensagem de erro baseada no tipo de erro
      let errorMessage = "Erro ao excluir holerites. Tente novamente.";
      
      if (error.response?.status === 400 && error.response?.data?.errors) {
        const errors = error.response.data.errors;
        if (errors.length > 0) {
          errorMessage = errors[0]; // Usar a primeira mensagem de erro do backend
        }
      }
      
        toast({
          title: "Erro",
          description: errorMessage,
          variant: "destructive"
        });
      } finally {
        setIsDeleting(false);
      }
  };

  const handleViewHolerite = (payslip: Holerite) => {
    setSelectedHolerite(payslip);
    setShowViewModal(true);
  };

  const handleEmailHolerite = (payslip: Holerite) => {
    setSelectedHolerite(payslip);
    setShowEmailModal(true);
  };

  const handleDownloadHolerite = async (payslip: Holerite) => {
    try {
      // Usar ID em vez de fileName para garantir que o holerite correto seja baixado
      const blob = await holeriteService.downloadHoleriteById(payslip.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = payslip.fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Download iniciado",
        description: `Holerite de ${payslip.employeeName} baixado com sucesso.`,
      });
    } catch (error) {
      console.error('Erro ao baixar holerite:', error);
      toast({
        title: "Erro",
        description: "Erro ao baixar holerite. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  // Excluir holerite individual
  const handleDeleteHolerite = async (payslip: Holerite) => {
    setSelectedHolerite(payslip);
    setShowDeleteModal(true);
  };

  // Confirmar exclusão individual de holerite
  const confirmDeleteHolerite = async () => {
    if (!selectedHolerite) return;
    
    setIsDeleting(true);
    
      try {
      await holeriteService.deleteHolerite(selectedHolerite.id);
        
        toast({
          title: "Sucesso",
        description: `Holerite de ${selectedHolerite.employeeName} excluído com sucesso.`,
        });
        
        // Remover da seleção se estiver selecionado
      setSelectedHolerites(selectedHolerites.filter(id => id !== selectedHolerite.id));
        
        // Recarregar lista
        await loadHolerites();
      
      // Fechar modal
      setShowDeleteModal(false);
      setSelectedHolerite(null);
      } catch (error) {
      console.error('Erro ao excluir holerite:', error);
        toast({
          title: "Erro",
        description: "Erro ao excluir holerite. Tente novamente.",
          variant: "destructive"
        });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUploadSuccess = () => {
    loadHolerites(); // Recarrega a lista após upload
    toast({
      title: "Upload Concluído",
      description: "Holerites processados com sucesso.",
    });
  };

  const formatDate = (dateString: string) => {
    if (!dateString) {
      return 'Data não disponível';
    }
    
    try {
      const date = new Date(dateString);
      
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        return 'Data inválida';
      }
      
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (error) {
      console.error('Erro ao formatar data:', dateString, error);
      return 'Data inválida';
    }
  };

  // Função para lidar com filtros avançados
  const handleAdvancedFiltersChange = (filterState: any) => {
    // Converter FilterState para filtros
    const newFilters: any = {};
    if (filterState.search) newFilters.employeeName = filterState.search;
    setFilters(newFilters);
  };

  // Envio em massa via WhatsApp
  const handleSendWhatsApp = async () => {
    setSendingWhatsApp(true);
    try {
      const response = await api.post('/envio/massa', {
        tipo: 'whatsapp',
        funcionarioIds: selectedHolerites,
        mensagem: whatsAppMessage
      });
      const data = response.data;
      if (data.sucesso) {
        toast({ title: 'Sucesso', description: data.mensagem });
        setShowWhatsAppModal(false);
        setSelectedHolerites([]);
      } else {
        toast({ title: 'Erro no envio', description: data.mensagem, variant: 'destructive' });
      }
    } catch (error) {
      console.error('Erro ao enviar WhatsApp:', error);
      toast({ title: 'Erro', description: 'Erro ao enviar via WhatsApp.', variant: 'destructive' });
    } finally {
      setSendingWhatsApp(false);
    }
  };

  const consentKeywords = ['consentimento', 'não autorizou', 'nao autorizou', 'autorizar whatsapp', 'whatsapp consent'];
  const shouldTriggerConsentModal = (message?: string) => {
    if (!message) return false;
    const normalized = message.toLowerCase();
    return consentKeywords.some(keyword => normalized.includes(keyword));
  };

const detailNeedsWhatsAppConsent = (detail?: ContactValidationDetail | null) => {
  if (!detail) return false;
  const whatsappError = (detail.whatsappError || '').toLowerCase();
  return (
    detail.needsWhatsAppConsent === true ||
    (!detail.canSendWhatsApp && whatsappError.includes('consent'))
  );
};

  const buildConsentDetailFromUserValidation = (
    validation: UserValidationResult | null,
    cpf: string,
    employeeName?: string
  ): ContactValidationDetail | null => {
    if (!validation) {
      return null;
    }

    const normalizedCpf = validation.cpf ? validation.cpf.replace(/\D/g, '') : cpf;

    const detail: ContactValidationDetail = {
      employeeId: validation.userId || normalizedCpf,
      employeeName: validation.name || employeeName || 'Funcionário',
      employeeCpf: normalizedCpf,
      employeeEmail: validation.email,
      employeePhone: undefined,
      hasUser: Boolean(validation.exists && validation.userId),
      userId: validation.userId,
      userEmail: validation.email,
      userWhatsapp: validation.whatsapp,
      hasWhatsAppConsent: Boolean(validation.whatsappConsent),
      needsWhatsAppConsent: Boolean(
        validation.needsWhatsAppConsent ||
        (!validation.whatsappConsent && validation.hasWhatsApp)
      ),
      whatsappConsentDate: undefined,
      canSendEmail: Boolean(validation.canSendEmail),
      canSendWhatsApp: Boolean(
        validation.canSendWhatsApp ??
        ((validation.hasWhatsApp || !!validation.whatsapp) && (validation.whatsappConsent ?? false))
      ),
      needsUserCreation: !validation.exists,
      needsWhatsAppUpdate: !validation.hasWhatsApp,
      needsEmailUpdate: !validation.hasEmail,
      emailError: validation.hasEmail ? undefined : 'Email não cadastrado',
      whatsappError: validation.whatsappConsent ? undefined : 'Consentimento WhatsApp não registrado',
      generalError: validation.message,
      status: validation.isReady ? 'ready' : 'needs_action',
      statusMessage: validation.message || '',
    };

    if (!detailNeedsWhatsAppConsent(detail) && detail.canSendWhatsApp) {
      detail.status = 'ready';
      detail.statusMessage = 'Pronto para envio';
    }

    return detail;
  };

  const openConsentModalForDetail = (detail: ContactValidationDetail, payslip: Holerite, employeeId?: string) => {
    setSelectedValidationDetail(detail);
    setPendingConsentContext({ payslip, employeeId });
    setShowSingleConsentModal(true);
  };

  const openWhatsappUpdateModal = (detail: ContactValidationDetail, payslip: Holerite, employeeId?: string) => {
    setSelectedValidationDetail(detail);
    setPendingWhatsappContext({ payslip, employeeId });
    setShowSingleWhatsappModal(true);
  };

  const tryOpenConsentModalFromCpf = async (cpf: string, payslip: Holerite, employeeIdHint?: string) => {
    try {
      const normalizedCpf = cpf.replace(/\D/g, '');
      const validation = await userValidationService.validateByCpf(normalizedCpf);
      const detail = buildConsentDetailFromUserValidation(validation, normalizedCpf, payslip.employeeName);
      if (detail && detail.userId && detailNeedsWhatsAppConsent(detail)) {
        openConsentModalForDetail(detail, payslip, employeeIdHint || detail.userId);
        return true;
      }
    } catch (cpfValidationError) {
      console.error('Erro ao buscar validação por CPF para consentimento:', cpfValidationError);
    }
    return false;
  };

  // Envio individual via WhatsApp
  const handleSendWhatsAppIndividual = async (payslip: Holerite) => {
    try {
      console.log('🚀 Iniciando envio WhatsApp individual para:', payslip);
      
      // Normaliza CPF e tenta resolver employeeId antes de enviar
      const rawCpf = (payslip.cpf || '').toString();
      const cpf = rawCpf.replace(/\D/g, '');
      
      console.log('📋 CPF normalizado:', cpf);

      let funcionarioId: string | undefined;
      try {
        const matches = await employeeService.searchEmployees(cpf);
        console.log('🔍 Busca por CPF retornou:', matches);
        const exact = matches?.find((e: any) => (e.document || e.cpf || '').replace(/\D/g, '') === cpf);
        if (exact) {
          funcionarioId = exact.id;
          console.log('✅ Funcionário encontrado, ID:', funcionarioId);
        } else {
          console.log('⚠️ Nenhum funcionário encontrado com CPF exato');
        }
      } catch (err) {
        console.error('❌ Erro ao buscar funcionário:', err);
      }

      // Pré-validação de contatos (se tiver ID)
      if (funcionarioId) {
        console.log('🔍 Validando contatos para funcionário ID:', funcionarioId);
        const validation = await contactValidationService.validateContacts({
          employeeIds: [funcionarioId],
          type: 'whatsapp'
        });
        console.log('📊 Resultado da validação:', validation);
        
        const detail = validation?.details?.[0];
        if (detail) {
          console.log('📋 Detalhe da validação:', detail);
          setSelectedValidationDetail(detail);

          const pendingConsent = detailNeedsWhatsAppConsent(detail);
          if (pendingConsent && detail.hasUser && detail.userId) {
            console.log('🛑 Consentimento WhatsApp pendente - abrindo modal de confirmação.');
            openConsentModalForDetail(detail, payslip, funcionarioId);
            return;
          }
          
          if (detail.status === 'ready') {
            // Pode enviar agora
            console.log('✅ Status READY - Enviando para backend...');
            const payload = {
              tipo: 'whatsapp',
              funcionarioId,
              mensagem: 'Olá! Seu holerite está disponível para download. Acesse o sistema SecuredGuard para visualizar. Em caso de dúvidas, entre em contato com o RH.'
            };
            console.log('📤 Payload:', payload);
            
            const response = await api.post('/api/envio/individual', payload);
            const data = response.data;
            console.log('📥 Resposta do backend:', data);
            
            if (data.sucesso) {
              toast({ title: 'Sucesso', description: data.mensagem });
              return;
            } else {
              toast({ title: 'Erro no envio', description: data.mensagem, variant: 'destructive' });
              return;
            }
          }
          // Necessita ação: abrir modal adequado
          console.log('⚠️ Status não é READY, abrindo modal apropriado...');
          if (detail.needsUserCreation) {
            console.log('👤 Abrindo modal de criação de usuário');
            setShowSingleUserModal(true);
            return;
          }
          if (detail.needsWhatsAppUpdate && detail.hasUser) {
            console.log('📱 Abrindo modal de atualização de WhatsApp');
            openWhatsappUpdateModal(detail, payslip, funcionarioId);
            return;
          }
        }
      }

      // Sem ID resolvido ou sem detail: tentar por CPF mesmo (backend validará novamente)
      const consentOpenedByCpf = await tryOpenConsentModalFromCpf(cpf, payslip, funcionarioId);
      if (consentOpenedByCpf) {
        return;
      }

      // Se ainda assim precisar, tenta envio por CPF (backend validará novamente)
      console.log('⚠️ Tentando envio por CPF (sem ID ou validação)');
      const payload = {
        tipo: 'whatsapp',
        cpf,
        mensagem: 'Olá! Seu holerite está disponível para download. Acesse o sistema SecuredGuard para visualizar. Em caso de dúvidas, entre em contato com o RH.'
      };
      console.log('📤 Payload (por CPF):', payload);
      
      const response = await api.post('/api/envio/individual', payload);
      const data = response.data;
      console.log('📥 Resposta do backend:', data);
      const detail = Array.isArray(data?.detalhes) && data.detalhes.length > 0 ? data.detalhes[0] : undefined;
      const destino = detail?.destinoNormalizado || detail?.telefone || 'destino não informado';
      
      if (data.sucesso) {
        toast({ title: 'Sucesso', description: `${data.mensagem} (Destino: ${destino})` });
      } else {
        toast({ title: 'Erro no envio', description: `${data.mensagem} (Destino: ${destino})`, variant: 'destructive' });
      }
    } catch (error: any) {
      // Exibe a mensagem detalhada retornada pelo backend, se existir
      const backendMsg = error?.response?.data?.mensagem || error?.response?.data?.message;
      const msg = backendMsg || 'Erro ao enviar via WhatsApp.';
      console.error('Erro ao enviar WhatsApp individual:', error);
      console.error('Mensagem do backend:', backendMsg);
      
      // Exibir toast com a mensagem específica do backend
      toast({ title: 'Validação necessária', description: msg, variant: 'destructive' });

      // Tentar abrir automaticamente o modal correto baseado na mensagem do backend
      try {
        // Reutiliza cpf/funcionarioId calculados acima
        let employeeIdToValidate = funcionarioId;
        if (!employeeIdToValidate) {
          const matches = await employeeService.searchEmployees(cpf);
          const exact = matches?.find((e: any) => (e.document || e.cpf || '').replace(/\D/g, '') === cpf);
          if (exact) employeeIdToValidate = exact.id;
        }
        if (employeeIdToValidate) {
          const validation = await contactValidationService.validateContacts({ employeeIds: [employeeIdToValidate], type: 'whatsapp' });
          const detail = validation?.details?.[0];
          if (detail) {
            setSelectedValidationDetail(detail);
            const lowerMsg = msg?.toLowerCase() || '';
            const requiresConsent = detailNeedsWhatsAppConsent(detail);
            if (requiresConsent && detail.hasUser && detail.userId) {
              console.log('🛑 Consentimento pendente detectado após erro - abrindo modal de confirmação.');
              openConsentModalForDetail(detail, payslip, employeeIdToValidate);
              return;
            }
            if (shouldTriggerConsentModal(msg) && detail.hasUser && detail.userId && detailNeedsWhatsAppConsent(detail)) {
              openConsentModalForDetail(detail, payslip, employeeIdToValidate);
              return;
            }
            if (lowerMsg.includes('usuário não encontrado') || detail.needsUserCreation) {
              setShowSingleUserModal(true);
              return;
            }
            if (lowerMsg.includes('whatsapp') || detail.needsWhatsAppUpdate) {
              openWhatsappUpdateModal(detail, payslip, employeeIdToValidate);
              return;
            }
          }
          if (!detail && shouldTriggerConsentModal(msg)) {
            const opened = await tryOpenConsentModalFromCpf(cpf, payslip, employeeIdToValidate);
            if (opened) return;
          }
        }
        const openedByCpf = shouldTriggerConsentModal(msg)
          ? await tryOpenConsentModalFromCpf(cpf, payslip, employeeIdToValidate)
          : false;
        if (openedByCpf) return;
      } catch (_) {}
    }
  };

  const handleConsentModalClose = () => {
    setShowSingleConsentModal(false);
    setPendingConsentContext(null);
    setSelectedValidationDetail(null);
  };

  const handleConsentGranted = async () => {
    const context = pendingConsentContext;
    setShowSingleConsentModal(false);
    setSelectedValidationDetail(null);

    if (context?.payslip) {
      try {
        await handleSendWhatsAppIndividual(context.payslip);
      } finally {
        setPendingConsentContext(null);
      }
    } else {
      setPendingConsentContext(null);
    }
  };

  // Função para carregar recibos
  const loadReceipts = async () => {
    try {
      console.log('📊 Iniciando carregamento de recibos...');
      console.log('📊 Usuário atual:', user);
      console.log('📊 Permissões do usuÃ¡rio:', user?.permissions);
      console.log('📊 Token no localStorage:', localStorage.getItem('token'));
      
      const response = await api.get('/api/receipts');
      console.log('📊 Resposta da API de recibos:', response);
      
      let receipts = [];
      if (response.data && Array.isArray(response.data)) {
        receipts = response.data;
      } else if (response.data && response.data.content && Array.isArray(response.data.content)) {
        receipts = response.data.content;
      } else if (response.data && response.data.receipts && Array.isArray(response.data.receipts)) {
        receipts = response.data.receipts;
      }
      
      console.log('✅ Comprovantes carregados com sucesso:', receipts);
      setReceipts(receipts);
    } catch (error) {
      console.error('📊 Erro ao carregar comprovantes:', error);
      console.error('📊 Detalhes do erro:', error.response?.data, error.response?.status);
      setReceipts([]);
    }
  };

  // Carregar dados iniciais quando usuÃ¡rio estiver autenticado
  useEffect(() => {
    if (user) {
      loadHolerites();
      loadReceipts();
    }
  }, [user]);

  // Atualizar anos disponíveis quando holerites mudarem
  useEffect(() => {
    if (holerites.length > 0) {
      const availableYears = [...new Set(holerites.map(h => h.year.toString()))].sort((a, b) => b.localeCompare(a));
      console.log('📊„ Atualizando anos disponíveis:', availableYears);
      setHoleriteAvailableYears(availableYears);
    }
  }, [holerites]);

  // Carregar recibos quando a aba de recibos for ativa
  useEffect(() => {
    if (activeTab === 'recibos' && user) {
      loadReceipts();
    }
  }, [activeTab, user]);


  // Carregar arquivos processados quando a aba "Unificação Individual" for ativada
  useEffect(() => {
    if (activeTab === 'unificacao-individual' && user) {
      console.log('🎯 Carregando arquivos processados para unificação individual');
      // Aguardar um pouco para garantir que os holerites e recibos foram carregados
      setTimeout(() => {
      loadProcessedFiles();
      }, 100);
    }
  }, [activeTab, user, holerites.length, receipts.length]);

  // Carregar comprovantes de pagamento quando a aba "Comprovantes" for ativada
  useEffect(() => {
    if (activeTab === 'recibos' && user) {
      loadPaymentReceipts();
    }
  }, [activeTab, user]);

  // Função para carregar organização de documentos unificados
  const loadUnifiedOrganization = async () => {
    try {
      setLoadingUnifiedOrganization(true);
      setUnifiedOrganizationError(null);
      console.log('🔄 Carregando organização de documentos unificados...');
      const data = await unifiedDocumentService.getOrganization();
      console.log('✅ Dados de organização recebidos:', data);
      console.log('📊 Total de documentos:', data?.totalPayslips || 0);
      console.log('📊 Empresas:', data?.companies?.length || 0);
      setUnifiedOrganizationData(data);
      
      if (!data || !data.companies || data.companies.length === 0) {
        console.warn('⚠️ Nenhum documento unificado encontrado na organização');
      }
    } catch (error: any) {
      console.error('❌ Erro ao carregar organização de documentos unificados:', error);
      console.error('❌ Detalhes do erro:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      setUnifiedOrganizationError(error.message || 'Erro ao carregar organização');
      setUnifiedOrganizationData(null);
      toast({
        title: "Erro ao carregar organização",
        description: error.response?.data?.message || error.message || 'Erro desconhecido',
        variant: "destructive"
      });
    } finally {
      setLoadingUnifiedOrganization(false);
    }
  };

  // Funções auxiliares para chaves de organização
  const getUnifiedCompanyKey = (company: HoleriteCompanyGroup): string => {
    return `${company.companyCnpj || company.companyName || ''}`;
  };

  const getUnifiedSectorKey = (companyKey: string, sector: HoleriteSectorGroup): string => {
    return `${companyKey}|${sector.sectorName || ''}`;
  };

  const getUnifiedPeriodKey = (sectorKey: string, period: HoleritePeriodGroup): string => {
    return `${sectorKey}|${period.year || ''}|${period.month || ''}`;
  };

  // Funções para expandir/colapsar
  const toggleUnifiedCompanyExpansion = (companyKey: string) => {
    setExpandedUnifiedCompanies(prev => {
      const next = { ...prev, [companyKey]: !prev[companyKey] };
      if (next[companyKey]) {
        setExpandedUnifiedSectors(prevSectors => {
          const filtered: Record<string, boolean> = {};
          Object.keys(prevSectors).forEach(key => {
            if (!key.startsWith(`${companyKey}|`)) {
              filtered[key] = prevSectors[key];
            }
          });
          return filtered;
        });
      }
      return next;
    });
  };

  const toggleUnifiedSectorExpansion = (sectorKey: string) => {
    setExpandedUnifiedSectors(prev => {
      const next = { ...prev, [sectorKey]: !prev[sectorKey] };
      if (next[sectorKey]) {
        setExpandedUnifiedPeriods(prevPeriods => {
          const filtered: Record<string, boolean> = {};
          Object.keys(prevPeriods).forEach(key => {
            if (!key.startsWith(`${sectorKey}|`)) {
              filtered[key] = prevPeriods[key];
            }
          });
          return filtered;
        });
      }
      return next;
    });
  };

  const toggleUnifiedPeriodExpansion = (periodKey: string) => {
    setExpandedUnifiedPeriods(prev => ({
      ...prev,
      [periodKey]: !prev[periodKey]
    }));
  };

  // Funções auxiliares para seleção de documentos unificados
  const collectUnifiedCompanyDocumentIndices = (company: HoleriteCompanyGroup): number[] => {
    const indices: number[] = [];
    company.sectors.forEach(sector => {
      sector.periods?.forEach(period => {
        period.payslips.forEach(entry => {
          const docIndex = unifiedDocuments.findIndex(d => d.fileName === entry.fileName);
          if (docIndex !== -1) {
            indices.push(docIndex);
          }
        });
      });
    });
    return indices;
  };

  const collectUnifiedSectorDocumentIndices = (sector: HoleriteSectorGroup): number[] => {
    const indices: number[] = [];
    sector.periods?.forEach(period => {
      period.payslips.forEach(entry => {
        const docIndex = unifiedDocuments.findIndex(d => d.fileName === entry.fileName);
        if (docIndex !== -1) {
          indices.push(docIndex);
        }
      });
    });
    return indices;
  };

  const collectUnifiedPeriodDocumentIndices = (period: HoleritePeriodGroup): number[] => {
    const indices: number[] = [];
    period.payslips.forEach(entry => {
      const docIndex = unifiedDocuments.findIndex(d => d.fileName === entry.fileName);
      if (docIndex !== -1) {
        indices.push(docIndex);
      }
    });
    return indices;
  };

  const areUnifiedIndicesFullySelected = (indices: number[]): boolean => {
    return indices.length > 0 && indices.every(idx => selectedUnifiedDocuments.has(idx));
  };

  const getSelectedUnifiedIndices = (indices: number[]): number[] => {
    return indices.filter(idx => selectedUnifiedDocuments.has(idx));
  };

  const handleSelectUnifiedDocuments = (indices: number[], checked: boolean) => {
    const newSelected = new Set(selectedUnifiedDocuments);
    if (checked) {
      indices.forEach(idx => newSelected.add(idx));
    } else {
      indices.forEach(idx => newSelected.delete(idx));
    }
    setSelectedUnifiedDocuments(newSelected);
  };

  // Carregar documentos unificados quando a aba de unificação for ativada
  useEffect(() => {
    if (activeTab === 'unificacao-individual' && user) {
      console.log('🎯 Aba de unificação individual ativada - carregando dados...');
      fetchUnifiedDocuments();
      // Aguardar um pouco antes de carregar a organização para garantir que os documentos foram carregados
      setTimeout(() => {
        loadUnifiedOrganization();
      }, 200);
    }
  }, [activeTab, user, unifiedMonthFilter, unifiedYearFilter]);

  // Atualizar mês ativo quando os dados dos comprovantes mudarem
  useEffect(() => {
    if (paymentReceipts.length > 0) {
      const availableMonths = getAvailableMonths(activeYear);
      if (availableMonths.length > 0) {
        // Se o mês atual não está disponível, mudar para o primeiro disponível
        if (!availableMonths.includes(parseInt(activeMonth))) {
          setActiveMonth(availableMonths[0].toString());
          console.log('📅 Mês ativo atualizado para:', availableMonths[0]);
        }
      }
    }
  }, [paymentReceipts, activeYear]);

  // Função para upload de recibos
  const handleReceiptUpload = async (file: File) => {
    console.log('📊 Iniciando upload de recibos:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    });

    try {
      setProcessingReceipts(true);
      
      // ValidaÃ§Ãµes bÃ¡sicas
      if (!file) {
        throw new Error('Nenhum arquivo selecionado');
      }
      
      if (file.type !== 'application/pdf') {
        throw new Error('Apenas arquivos PDF são aceitos');
      }
      
      if (file.size === 0) {
        throw new Error('Arquivo está vazio');
      }
      
      if (file.size > 50 * 1024 * 1024) { // 50MB
        throw new Error('Arquivo muito grande (mÃ¡ximo 50MB)');
      }

      const formData = new FormData();
      formData.append('file', file);

      console.log('📊¤ Enviando requisição para /api/receipts/upload...');

      const response = await api.post('/receipts/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 300000, // 5 minutos
      });

      console.log('✅ Resposta recebida:', {
        status: response.status,
        data: response.data
      });

      if (response.status === 200) {
        const receiptsCount = response.data.receipts?.length || response.data.count || 0;
        
        toast({
          title: "Sucesso",
          description: `Comprovantes processados com sucesso! ${receiptsCount} comprovantes extraídos.`,
        });
        
        setShowReceiptUploadModal(false);
        
        // Recarregar a lista de comprovantes de pagamento após o upload
        console.log('📊„ Recarregando lista de comprovantes de pagamento...');
        await loadPaymentReceipts();
      } else {
        throw new Error(`Resposta inesperada do servidor: ${response.status}`);
      }
    } catch (error: any) {
      console.error('âŒ Erro ao processar recibos:', error);
      
      let errorMessage = 'Erro desconhecido ao processar recibos';
      
      if (error.response) {
        // Erro de resposta HTTP
        console.error('Erro HTTP:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
        
        if (error.response.status === 400) {
          errorMessage = error.response.data?.message || 'Arquivo inválido ou dados incorretos';
        } else if (error.response.status === 401) {
          errorMessage = 'Não autorizado. Faça login novamente.';
        } else if (error.response.status === 403) {
          errorMessage = 'Acesso negado. VocÃª não tem permissão para esta operação.';
        } else if (error.response.status === 404) {
          errorMessage = 'Endpoint não encontrado. Verifique se o backend está rodando.';
        } else if (error.response.status === 500) {
          errorMessage = error.response.data?.message || 'Erro interno do servidor';
        } else {
          errorMessage = `Erro HTTP ${error.response.status}: ${error.response.data?.message || error.response.statusText}`;
        }
      } else if (error.request) {
        // Erro de rede
        console.error('Erro de rede:', error.request);
        errorMessage = 'Erro de conexão. Verifique se o backend está rodando na porta 8081.';
      } else if (error.message) {
        // Erro de validação ou outro
        errorMessage = error.message;
      }

      toast({
        title: "Erro no Upload de Comprovantes",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setProcessingReceipts(false);
    }
  };


  // Função para deletar recibo individual
  const handleDeleteReceipt = async (receiptId: string) => {
    try {
      setDeletingReceipts(true);
      
      const response = await api.delete(`/receipts/${receiptId}`);
      
      if (response.status === 200) {
        toast({
          title: "Sucesso",
          description: "Recibo excluído com sucesso!",
        });
        await loadReceipts(); // Recarregar lista
      }
    } catch (error) {
      console.error('Erro ao deletar recibo:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o recibo.",
        variant: "destructive"
      });
    } finally {
      setDeletingReceipts(false);
      setShowReceiptDeleteModal(false);
      setReceiptToDelete(null);
    }
  };

  // Função para confirmar exclusão de recibo
  const confirmDeleteReceipt = (receipt: any) => {
    setReceiptToDelete(receipt);
    setShowReceiptDeleteModal(true);
  };

  // Função para deletar recibos em lote
  const handleDeleteReceiptsBatch = async () => {
    if (selectedReceipts.length === 0) {
      toast({
        title: "Aviso",
        description: "Selecione pelo menos um recibo para excluir.",
        variant: "destructive"
      });
      return;
    }

    try {
      setDeletingReceipts(true);
      
      const response = await api.delete('/receipts/batch', {
        data: selectedReceipts
      });
      
      if (response.status === 200) {
        toast({
          title: "Sucesso",
          description: `${response.data.deletedCount} recibos excluídos com sucesso!`,
        });
        setSelectedReceipts([]); // Limpar seleção
        await loadReceipts(); // Recarregar lista
      }
    } catch (error) {
      console.error('Erro ao deletar recibos:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir os recibos.",
        variant: "destructive"
      });
    } finally {
      setDeletingReceipts(false);
    }
  };

  // Função para selecionar/desselecionar recibo
  const handleSelectReceipt = (receiptId: string, checked: boolean) => {
    if (checked) {
      setSelectedReceipts(prev => [...prev, receiptId]);
    } else {
      setSelectedReceipts(prev => prev.filter(id => id !== receiptId));
    }
  };

  // Função para selecionar todos os recibos
  const handleSelectAllReceipts = (checked: boolean) => {
    if (checked) {
      setSelectedReceipts(Array.isArray(receipts) ? receipts.map(receipt => receipt.id) : []);
    } else {
      setSelectedReceipts([]);
    }
  };

  // Função para visualizar recibo com template
  const handleViewReceipt = async (receiptId: string) => {
    console.log('📊 handleViewReceipt chamado com ID:', receiptId);
    
    if (!receiptId) {
      console.error('📊 ID do recibo Ã© undefined ou null');
      toast({
        title: "Erro",
        description: "ID do recibo inválido.",
        variant: "destructive"
      });
      return;
    }
    
    // Verificar se o recibo existe na lista local
    const receipt = Array.isArray(receipts) ? receipts.find(r => r.id === receiptId) : undefined;
    if (!receipt) {
      console.error('📊 Recibo não encontrado na lista local:', receiptId);
      toast({
        title: "Erro",
        description: "Recibo não encontrado.",
        variant: "destructive"
      });
      return;
    }
    
    console.log('📊 Dados do recibo encontrado:', receipt);
    
    // Abrir modal do template de recibo
    setSelectedReceiptForTemplate(receipt);
    setShowReceiptTemplateModal(true);
  };

  // Função para baixar recibo
  const handleDownloadReceipt = async (receiptId: string, fileName: string) => {
    console.log('📊 handleDownloadReceipt chamado com ID:', receiptId, 'e fileName:', fileName);
    
    if (!receiptId) {
      console.error('📊 ID do recibo Ã© undefined ou null');
      toast({
        title: "Erro",
        description: "ID do recibo inválido.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Tentar fazer download via service
      const blob = await paymentReceiptService.downloadReceipt(receiptId);
      
      // Criar link de download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName || `comprovante_${receiptId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Sucesso",
        description: "Download iniciado com sucesso!",
      });
    } catch (error) {
      console.error('âŒ Erro ao fazer download:', error);
        toast({
          title: "Erro",
        description: "Erro ao fazer download do comprovante.",
          variant: "destructive"
        });
    }
  };

  // Carregar arquivos processados do sistema
  const loadProcessedFiles = async () => {
      setLoadingProcessedFiles(true);
      try {
          console.log('🎯 Iniciando carregamento de arquivos processados');
          
          // Limpar estados primeiro para garantir que não há dados antigos
          setProcessedHolerites([]);
          setProcessedRecibos([]);
          
          // Carregar holerites processados via API (sempre buscar do backend, não usar cache)
          try {
              const holeritesResponse = await api.get('/api/payslips/processed-files');
              if (holeritesResponse.data && holeritesResponse.data.success) {
                  const files = holeritesResponse.data.files || [];
                  const holeritesProcessados = files.map((file: any) => ({
                      id: `hol-${file.id || Math.random()}`,
                      name: file.fileName || file.name || '',
                      employeeName: file.employeeName || '',
                      cpf: file.cpf || '',
                      month: file.month?.toString() || '',
                      year: file.year?.toString() || '',
                      path: file.filePath || file.path || ''
                  }));
                  setProcessedHolerites(holeritesProcessados);
                  console.log('✅ Holerites carregados via API:', holeritesProcessados.length);
              } else {
                  console.log('⚠️ Nenhum holerite encontrado na resposta da API');
                  setProcessedHolerites([]);
              }
          } catch (apiError: any) {
              console.warn('⚠️ Erro ao carregar holerites via API:', apiError?.response?.status, apiError?.message);
              setProcessedHolerites([]);
          }

          // Carregar comprovantes processados do backend
          try {
              const processedReceipts = await paymentReceiptService.getProcessedFiles();
              console.log('✅ Comprovantes processados carregados do backend:', processedReceipts);
              
              if (processedReceipts && Array.isArray(processedReceipts) && processedReceipts.length > 0) {
                  const comprovantesProcessados = processedReceipts.map((receipt: any) => ({
                      id: `rec-${receipt.id || Math.random()}`,
                      name: receipt.fileName || '',
                      employeeName: receipt.employeeName || '',
                      month: receipt.month?.toString() || '',
                      year: receipt.year?.toString() || '',
                      path: receipt.filePath || `uploads/payment-receipts/${receipt.year}/${receipt.month}/${receipt.fileName}`
                  }));
                  setProcessedRecibos(comprovantesProcessados);
                  console.log('✅ Comprovantes processados carregados:', comprovantesProcessados.length);
              } else {
                  console.log('⚠️ Nenhum comprovante encontrado');
                  setProcessedRecibos([]);
              }
          } catch (backendError) {
              console.warn('⚠️ Erro ao carregar comprovantes do backend, usando dados locais:', backendError);
          }

          // Carregar recibos dos dados já disponíveis
              // REMOVIDO: Código que usava dados em cache - sempre buscar do backend
              if (false && Array.isArray(receipts) && receipts.length > 0) {
      const recibosProcessados = receipts.map(receipt => ({
                  id: `rec-${receipt.id || Math.random()}`,
                  name: receipt.fileName || `recibo_${receipt.employeeName}_${receipt.month}_${receipt.year}.pdf`,
                  employeeName: receipt.employeeName,
                  month: receipt.month.toString(),
                  year: receipt.year.toString(),
                  path: `uploads/receipts/${receipt.month}_${receipt.year}/${receipt.fileName}`
              }));
              setProcessedRecibos(recibosProcessados);
              console.log('✅ Comprovantes carregados dos dados existentes:', recibosProcessados.length);
          } else {
              console.log('⚠️ Nenhum recibo disponível nos dados existentes');
          }

          // REMOVIDO: Código duplicado - já carregamos via API acima
          if (false && holerites.length === 0) {
              try {
                  const holeritesResponse = await api.get('/api/payslips/processed-files');
                  if (holeritesResponse.data.success) {
                      setProcessedHolerites(holeritesResponse.data.files || []);
                      console.log('✅ Holerites carregados via API:', holeritesResponse.data.files?.length || 0);
                  }
              } catch (apiError) {
                  console.log('⚠️ Erro ao carregar holerites via API, usando dados simulados');
              }
          }

          if (!Array.isArray(receipts) || receipts.length === 0) {
              try {
                  const recibosResponse = await api.get('/api/payment-receipts/processed-files');
                  if (recibosResponse.data.success) {
                      setProcessedRecibos(recibosResponse.data.files || []);
                      console.log('✅ Comprovantes carregados via API:', recibosResponse.data.files?.length || 0);
                  }
              } catch (apiError) {
                  console.log('⚠️ Erro ao carregar comprovantes via API, usando dados simulados');
              }
          }
      } catch (error) {
          console.error('❌ Erro ao carregar arquivos processados:', error);
          // Garantir que as listas ficam vazias em caso de erro
          setProcessedHolerites([]);
          setProcessedRecibos([]);
      } finally {
          setLoadingProcessedFiles(false);
      }
  };



  // Função para excluir unificação individual
  const handleDeleteIndividualUnified = async (unification: any) => {
    try {
      const confirmed = window.confirm(
        `Tem certeza que deseja excluir a unificação de ${unification.holerite.employeeName}?\n\n` +
        `Esta aÃ§Ã£o não pode ser desfeita.`
      );

      if (!confirmed) return;

      toast({
        title: "Excluindo unificação",
        description: "Excluindo documento unificado...",
      });

      // Simular exclusão
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Remover da lista
      setIndividualUnifications(prev => prev.filter(u => u.id !== unification.id));
      

      toast({
        title: "Sucesso",
        description: "Unificação excluída com sucesso!",
      });
    } catch (error) {
      console.error('Erro ao excluir unificação:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir unificação.",
        variant: "destructive"
      });
    }
  };

  const getHoleriteById = useCallback((id: string): Holerite | null => {
    const fromList = holerites.find(h => h.id === id);
    if (fromList) {
      return fromList;
    }
    const entry = organizationEntryMap[id];
    if (entry) {
      return resolveHoleriteFromEntry(entry);
    }
    return null;
  }, [holerites, organizationEntryMap, resolveHoleriteFromEntry]);

  const getHoleritesByIds = useCallback((ids: string[]): Holerite[] => {
    const uniqueIds = Array.from(new Set(ids));
    return uniqueIds
      .map(getHoleriteById)
      .filter((item): item is Holerite => Boolean(item));
  }, [getHoleriteById]);

  const resolveEmployeeIdsForHolerites = useCallback(async (items: Holerite[]) => {
    console.log('🔍 Iniciando resolução de funcionários para holerites:', items.length);
    const ids: string[] = [];

    for (const holerite of items) {
      console.log('📋 Processando holerite:', {
        id: holerite.id,
        cpf: holerite.cpf,
        employeeName: holerite.employeeName,
        fileName: holerite.fileName
      });
      
      const cpf = holerite.cpf?.replace(/\D/g, '');
      let found = false;
      
      // PASSO 1: Buscar por CPF exato (normalizado) usando endpoint específico
      if (cpf && cpf.length >= 11) {
        console.log(`🔍 Buscando funcionário por CPF: ${cpf}`);
        try {
          // Primeiro tentar busca exata por CPF
          const exactMatch = await employeeService.searchEmployeeByCpf(cpf);
          if (exactMatch) {
            ids.push(exactMatch.id);
            console.log(`✅ Funcionário encontrado por CPF exato: ${exactMatch.name} (CPF: ${cpf}, ID: ${exactMatch.id})`);
            found = true;
            continue;
          }
          
          console.log(`⚠️ Busca exata por CPF não retornou resultado, tentando busca parcial...`);
          // Se não encontrou, tentar busca parcial como fallback
          const byCpf = await employeeService.searchEmployees(cpf);
          console.log(`📊 Resultados da busca parcial por CPF:`, byCpf?.length || 0);
          
          if (byCpf && byCpf.length > 0) {
            // Filtrar para encontrar correspondência exata do CPF normalizado
            const exactMatchPartial = byCpf.find((emp: any) => {
              const empCpf = (emp.document || emp.cpf || '').replace(/\D/g, '');
              return empCpf === cpf;
            });
            
            if (exactMatchPartial) {
              ids.push(exactMatchPartial.id);
              console.log(`✅ Funcionário encontrado por CPF exato (busca parcial): ${exactMatchPartial.name} (CPF: ${cpf}, ID: ${exactMatchPartial.id})`);
              found = true;
              continue;
            }
            
            // Se houver apenas 1 resultado e o CPF corresponder parcialmente, aceitar
            if (byCpf.length === 1) {
              const empCpf = (byCpf[0].document || byCpf[0].cpf || '').replace(/\D/g, '');
              if (empCpf.includes(cpf) || cpf.includes(empCpf)) {
                ids.push(byCpf[0].id);
                console.log(`✅ Funcionário encontrado por CPF parcial: ${byCpf[0].name} (CPF: ${cpf}, ID: ${byCpf[0].id})`);
                found = true;
                continue;
              }
            }
            
            // Log dos resultados encontrados para debug
            console.log('📊 Resultados encontrados (mas sem match exato):', byCpf.map((emp: any) => ({
              name: emp.name,
              cpf: emp.cpf,
              document: emp.document,
              id: emp.id
            })));
          }
        } catch (error) {
          console.error('❌ Erro ao buscar funcionário pelo CPF', cpf, error);
        }
      } else {
        console.warn(`⚠️ CPF inválido ou ausente: "${holerite.cpf}" (normalizado: "${cpf}")`);
      }

      // PASSO 2: Se não encontrou por CPF, tentar por nome (apenas se não encontrou)
      if (!found && holerite.employeeName) {
        console.log(`🔍 Buscando funcionário por nome: "${holerite.employeeName}"`);
        try {
          const byName = await employeeService.searchEmployeesByName(holerite.employeeName);
          console.log(`📊 Resultados da busca por nome:`, byName?.length || 0);
          
          if (byName && byName.length > 0) {
            // Filtrar para encontrar correspondência exata do nome
            const exactNameMatch = byName.find((emp: any) => {
              const empName = (emp.name || '').trim().toLowerCase();
              const holeriteName = holerite.employeeName?.trim().toLowerCase() || '';
              return empName === holeriteName;
            });
            
            if (exactNameMatch) {
              ids.push(exactNameMatch.id);
              console.log(`✅ Funcionário encontrado por nome exato: ${exactNameMatch.name} (ID: ${exactNameMatch.id})`);
              found = true;
              continue;
            }
            
            // Se houver apenas 1 resultado, aceitar
            if (byName.length === 1) {
              ids.push(byName[0].id);
              console.log(`✅ Funcionário encontrado por nome (único resultado): ${byName[0].name} (ID: ${byName[0].id})`);
              found = true;
              continue;
            }
            
            // Log dos resultados encontrados para debug
            console.log('📊 Resultados encontrados por nome (mas sem match exato):', byName.map((emp: any) => ({
              name: emp.name,
              cpf: emp.cpf,
              document: emp.document,
              id: emp.id
            })));
          }
        } catch (error) {
          console.error('❌ Erro ao buscar funcionário pelo nome', holerite.employeeName, error);
        }
      } else if (!found) {
        console.warn(`⚠️ Nome do funcionário ausente no holerite`);
      }
      
      if (!found) {
        console.error(`❌ Funcionário NÃO encontrado para holerite:`, {
          id: holerite.id,
          cpf: cpf || 'AUSENTE',
          employeeName: holerite.employeeName || 'AUSENTE',
          fileName: holerite.fileName
        });
      }
    }

    console.log(`✅ Resolução concluída: ${ids.length} funcionário(s) encontrado(s) de ${items.length} holerite(s)`);
    return Array.from(new Set(ids));
  }, []);

  const handleBatchSendHoleritesForIds = useCallback(async (ids: string[], type: 'email' | 'whatsapp') => {
    console.log('🚀 Iniciando envio em lote:', { ids, type, count: ids.length });
    
    if (!ids.length) {
      toast({ title: 'Nenhum holerite selecionado', description: 'Selecione pelo menos um holerite para enviar.', variant: 'destructive' });
      return;
    }

    const holeritesToSend = getHoleritesByIds(ids);
    console.log('📋 Holerites encontrados:', holeritesToSend.length, 'de', ids.length);
    console.log('📋 Detalhes dos holerites:', holeritesToSend.map(h => ({
      id: h.id,
      cpf: h.cpf,
      employeeName: h.employeeName,
      fileName: h.fileName
    })));
    
    if (holeritesToSend.length === 0) {
      toast({ title: 'Holerites não encontrados', description: 'Não foi possível localizar os holerites selecionados.', variant: 'destructive' });
      return;
    }

    const employeeIds = await resolveEmployeeIdsForHolerites(holeritesToSend);
    console.log('👥 Funcionários resolvidos:', employeeIds.length, 'de', holeritesToSend.length);
    
    if (employeeIds.length === 0) {
      const missingDetails = holeritesToSend.map(h => `- ${h.employeeName || 'Sem nome'} (CPF: ${h.cpf || 'Sem CPF'})`).join('\n');
      toast({ 
        title: 'Funcionários não encontrados', 
        description: `Não foi possível identificar funcionários para os holerites selecionados.\n\nDetalhes:\n${missingDetails}\n\nVerifique se os funcionários estão cadastrados no sistema. Abra o console do navegador (F12) para mais detalhes.`, 
        variant: 'destructive',
        duration: 10000
      });
      return;
    }

    setResolvedEmployeeIds(employeeIds);
    setValidationSendType(type);
    setShowValidationModal(true);
  }, [getHoleritesByIds, resolveEmployeeIdsForHolerites, toast]);

  const handleBatchDeleteHoleritesByIds = useCallback((ids: string[]) => {
    if (!ids.length) {
      toast({ title: 'Nenhum holerite selecionado', description: 'Selecione pelo menos um holerite para excluir.', variant: 'destructive' });
      return;
    }
    setPendingDeleteIds(ids);
    setShowBatchDeleteModal(true);
  }, [toast]);

  const idsPendingDeletion = pendingDeleteIds ?? selectedHolerites;

  const renderOrganizationCompanies = () => {
    if (!organizationData?.companies?.length) {
  return (
        <div className="rounded-2xl border border-gray-700/60 bg-gray-900/40 p-8 text-center text-gray-300 shadow-inner">
          Nenhum dado organizado encontrado. Importe holerites para visualizar as empresas.
                </div>
      );
    }

    return organizationData.companies.map(company => {
                        const companyKey = getCompanyKey(company);
                        const companyExpanded = !!expandedCompanies[companyKey];
                        const companyIds = collectCompanyEntryIds(company);
                        const companySelectedIds = getSelectedSubset(companyIds);
                        const companySelectedCount = companySelectedIds.length;
                        const companyCheckboxState: boolean | 'indeterminate' = companyIds.length === 0
                          ? false
                          : areIdsFullySelected(companyIds)
                            ? true
                            : companySelectedCount > 0
                              ? 'indeterminate'
                              : false;

                         return (
        <div
          key={companyKey}
          className="rounded-2xl border border-gray-700/60 bg-gray-900/60 backdrop-blur-sm overflow-hidden shadow-[0_30px_60px_-50px_rgba(0,0,0,0.9)]"
        >
          <div className="flex flex-col gap-4 px-5 py-5 sm:px-6 sm:py-6">
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge className="bg-seguranca-black/60 text-seguranca-yellow border border-yellow-500/40 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
                                     {company.companySigla}
                                   </Badge>
                  <p className="text-lg font-semibold text-white leading-tight">
                                     {company.companyName}
                                   </p>
                                 </div>
                <p className="text-xs sm:text-sm text-gray-400 flex flex-wrap items-center gap-2">
                  <Building2 className="h-4 w-4 text-seguranca-yellow" />
                                   CNPJ: {company.companyCnpj || 'Não informado'} · {company.totalPayslips} holerite(s) · {company.sectors.length} setor(es)
                                 </p>
                               </div>
              <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4">
                {/* Checkbox "Selecionar empresa" - só aparece se a empresa NÃO estiver expandida (sem setores visíveis) */}
                {!companyExpanded && (
                  <div className="flex items-center gap-2 bg-gray-800/60 rounded-xl px-3 py-2">
                    <Checkbox
                      checked={companyCheckboxState}
                      onCheckedChange={(checked) => handleSelectMultipleHolerites(companyIds, checked === true)}
                      className="border-blue-400"
                    />
                    <span className="text-xs sm:text-sm text-gray-300">Selecionar empresa</span>
                  </div>
                )}
                <div className="flex flex-wrap gap-2 justify-end">
                  {/* Botões de ação em massa - só aparecem quando "Selecionar empresa" está marcado E a empresa NÃO está expandida */}
                  {companySelectedCount > 0 && !companyExpanded && (
                    <>
                      <Button
                        size="sm"
                        className="bg-green-600/90 text-white hover:bg-green-600"
                        onClick={() => handleBatchSendHoleritesForIds(companySelectedIds, 'email')}
                      >
                        <Mail className="h-4 w-4 mr-1" />
                        Email ({companySelectedCount})
                      </Button>
                      <Button
                        size="sm"
                        className="bg-blue-600/90 text-white hover:bg-blue-600"
                        onClick={() => handleBatchSendHoleritesForIds(companySelectedIds, 'whatsapp')}
                      >
                        <MessageSquare className="h-4 w-4 mr-1" />
                        WhatsApp ({companySelectedCount})
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="bg-red-600/90 hover:bg-red-700 border-red-700"
                        onClick={() => handleBatchDeleteHoleritesByIds(companySelectedIds)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Excluir ({companySelectedCount})
                      </Button>
                    </>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleCompanyExpansion(companyKey)}
                    className="w-full sm:w-auto text-seguranca-lightgray hover:text-white"
                  >
                    {companyExpanded ? <ChevronDown className="h-4 w-4 mr-2" /> : <ChevronRight className="h-4 w-4 mr-2" />}
                    {companyExpanded ? 'Ocultar setores' : 'Ver setores'}
                  </Button>
                </div>
              </div>
                             </div>
                             {companyExpanded && (
              <div className="space-y-4">
                                 {company.sectors && company.sectors.length > 0 ? (
                                   company.sectors.map(sector => {
                                     const sectorKey = getSectorKey(companyKey, sector);
                                     const sectorExpanded = !!expandedSectors[sectorKey];
                                     const sectorIds = collectSectorEntryIds(sector);
                                     const sectorSelectedIds = getSelectedSubset(sectorIds);
                                     const sectorSelectedCount = sectorSelectedIds.length;
                                     const sectorCheckboxState: boolean | 'indeterminate' = sectorIds.length === 0
                                       ? false
                                       : areIdsFullySelected(sectorIds)
                                         ? true
                                         : sectorSelectedCount > 0
                                           ? 'indeterminate'
                                           : false;

                                     return (
                      <div key={sectorKey} className="rounded-xl border border-gray-800/60 bg-gray-900/50 overflow-hidden">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-4 py-3">
                                           <div>
                                             <p className="text-sm font-semibold text-white">{sector.sectorName}</p>
                                             <p className="text-xs text-gray-400">
                                               {sector.totalPayslips} holerite(s) · {sector.periods?.length ?? 0} período(s)
                                             </p>
                                           </div>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            {/* Checkbox "Selecionar setor" - só aparece se o setor NÃO estiver expandido (sem botões individuais visíveis) */}
                            {!sectorExpanded && (
                              <div className="flex items-center gap-2 bg-gray-800/70 rounded-lg px-3 py-2">
                                <Checkbox
                                  checked={sectorCheckboxState}
                                  onCheckedChange={(checked) => handleSelectMultipleHolerites(sectorIds, checked === true)}
                                  className="border-blue-400"
                                />
                                <span className="text-xs text-gray-300">Selecionar setor</span>
                              </div>
                            )}
                            {/* Botões de ação em massa - só aparecem quando "Selecionar setor" está marcado E o setor NÃO está expandido */}
                            {sectorSelectedCount > 0 && !sectorExpanded && (
                              <div className="flex flex-wrap gap-2 justify-end">
                                <Button
                                  size="sm"
                                  className="bg-green-600/90 text-white hover:bg-green-600"
                                  onClick={() => handleBatchSendHoleritesForIds(sectorSelectedIds, 'email')}
                                >
                                  <Mail className="h-4 w-4 mr-1" />
                                  Email ({sectorSelectedCount})
                                </Button>
                                <Button
                                  size="sm"
                                  className="bg-blue-600/90 text-white hover:bg-blue-600"
                                  onClick={() => handleBatchSendHoleritesForIds(sectorSelectedIds, 'whatsapp')}
                                >
                                  <MessageSquare className="h-4 w-4 mr-1" />
                                  WhatsApp ({sectorSelectedCount})
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="bg-red-600/90 hover:bg-red-700 border-red-700"
                                  onClick={() => handleBatchDeleteHoleritesByIds(sectorSelectedIds)}
                                >
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Excluir ({sectorSelectedCount})
                                </Button>
                              </div>
                            )}
                                             <Button
                                               variant="ghost"
                                               size="sm"
                                               onClick={() => toggleSectorExpansion(sectorKey)}
                                               className="text-seguranca-lightgray hover:text-white"
                                             >
                                               {sectorExpanded ? <ChevronDown className="h-4 w-4 mr-2" /> : <ChevronRight className="h-4 w-4 mr-2" />}
                                               {sectorExpanded ? 'Ocultar períodos' : 'Ver períodos'}
                                             </Button>
                                           </div>
                                         </div>
                                         {sectorExpanded && (
                          <div className="space-y-3 px-4 py-4 bg-gray-900/70">
                                             {sector.periods && sector.periods.length > 0 ? (
                                               sector.periods.map(period => {
                                                 const periodKey = getPeriodKey(sectorKey, period);
                                                 const periodExpanded = !!expandedPeriods[periodKey];

                                                 return (
                                  <div key={periodKey} className="rounded-xl border border-gray-800/60 bg-gray-900/60 overflow-hidden">
                                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-4 py-3">
                                                       <div>
                                                         <p className="text-sm font-semibold text-white">{period.formattedPeriod}</p>
                                                         <p className="text-xs text-gray-400">
                                                           {searchTerm 
                                                             ? `${period.payslips.filter(entry => matchesSearchTerm(entry, searchTerm)).length} de ${period.totalPayslips} holerite(s)`
                                                             : `${period.totalPayslips} holerite(s)`
                                                           }
                                                         </p>
                                                       </div>
                                                       <Button
                                                         variant="ghost"
                                                         size="sm"
                                                         onClick={() => togglePeriodExpansion(periodKey)}
                                                         className="text-seguranca-lightgray hover:text-white"
                                                       >
                                                         {periodExpanded ? <ChevronDown className="h-4 w-4 mr-2" /> : <ChevronRight className="h-4 w-4 mr-2" />}
                                                         {periodExpanded ? 'Ocultar holerites' : 'Ver holerites'}
                                                       </Button>
                                                     </div>
                                                     {periodExpanded && (
                                      <div className="divide-y divide-gray-800 bg-gray-950/60">
                                                         {(() => {
                                                           const filteredPayslips = period.payslips.filter(entry => matchesSearchTerm(entry, searchTerm));
                                                           
                                                           if (filteredPayslips.length === 0 && searchTerm) {
                                                             return (
                                                               <div className="px-4 py-6 text-center text-gray-400">
                                                                 <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                                                 <p className="text-sm">Nenhum holerite encontrado para "{searchTerm}" neste período.</p>
                                                               </div>
                                                             );
                                                           }
                                                           
                                                           return filteredPayslips.map(entry => {
                                                           const holeriteData = resolveHoleriteFromEntry(entry);

                                                           return (
                                            <div
                                              key={entry.id}
                                              className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-4 py-4"
                                            >
                                                               <div className="flex items-start gap-3 flex-1 min-w-0">
                                                                 <Checkbox
                                                                   checked={selectedHolerites.includes(entry.id)}
                                                                   onCheckedChange={(checked) => handleSelectHolerite(entry.id, checked)}
                                                                   className="border-blue-400 mt-1"
                                                                 />
                                                                 <div className="flex-1 min-w-0">
                                                                   <p className="text-sm font-semibold text-white">{entry.employeeName}</p>
                                                                   <p className="text-xs text-gray-400">
                                                                     CPF: {formatCpf(entry.cpf)} · Arquivo: {entry.fileName}
                                                                   </p>
                                                                 </div>
                                                               </div>
                                                               {/* Botões individuais - só aparecem se NÃO houver seleção em massa ativa (setor/empresa não selecionados) */}
                                                               {!areIdsFullySelected(sectorIds) && !areIdsFullySelected(companyIds) && (
                                                                 <div className="flex flex-wrap gap-2">
                                                                   <Button
                                                                     size="sm"
                                                                     variant="outline"
                                                                     className="border-gray-600 text-seguranca-lightgray hover:bg-seguranca-black"
                                                                     onClick={() => handleViewHolerite(holeriteData)}
                                                                   >
                                                                     <Eye className="h-4 w-4 mr-1" />
                                                                     Visualizar
                                                                   </Button>
                                                                   <Button
                                                                     size="sm"
                                                                     variant="outline"
                                                                     className="border-gray-600 text-seguranca-lightgray hover:bg-seguranca-black"
                                                                     onClick={() => handleEmailHolerite(holeriteData)}
                                                                   >
                                                                     <Mail className="h-4 w-4 mr-1" />
                                                                     E-mail
                                                                   </Button>
                                                                   <Button
                                                                     size="sm"
                                                                     variant="outline"
                                                                     className="border-gray-600 text-seguranca-lightgray hover:bg-seguranca-black"
                                                                     onClick={() => handleSendWhatsAppIndividual(holeriteData)}
                                                                   >
                                                                     <MessageSquare className="h-4 w-4 mr-1" />
                                                                     WhatsApp
                                                                   </Button>
                                                                   <Button
                                                                     size="sm"
                                                                     variant="destructive"
                                                                     className="bg-red-600/90 hover:bg-red-700 border-red-700"
                                                                     onClick={() => handleDeleteHolerite(holeriteData)}
                                                                   >
                                                                     <Trash2 className="h-4 w-4 mr-1" />
                                                                     Excluir
                                                                   </Button>
                                                                 </div>
                                                               )}
                                                             </div>
                                                           );
                                                           });
                                                         })()}
                                                       </div>
                                                     )}
                                                   </div>
                                                 );
                                               })
                                             ) : (
                              <div className="rounded-xl border border-dashed border-gray-700 p-4 text-sm text-gray-400 text-center">
                                                 Nenhum período encontrado para este setor.
                                               </div>
                                             )}
                                           </div>
                                         )}
                                       </div>
                                     );
                                   })
                                 ) : (
                  <div className="rounded-xl border border-dashed border-gray-700 p-4 text-sm text-gray-400 text-center">
                                     Nenhum setor encontrado para esta empresa.
                                   </div>
                                 )}
                               </div>
                             )}
          </div>
                           </div>
                        );
    });
  };

  // Renderizar organizações por tipo de empresa (TASK 04)
  const renderCompanyTypeOrganizations = (typeGroup: CompanyTypeGroup | undefined, typePrefix: string) => {
    if (!typeGroup || !typeGroup.companies || typeGroup.companies.length === 0) {
      return (
        <div className="rounded-2xl border border-gray-700/60 bg-gray-900/40 p-8 text-center text-gray-300 shadow-inner">
          Nenhuma empresa encontrada para este tipo. Importe holerites para visualizar as empresas.
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Estatísticas do tipo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-blue-500/20 via-blue-500/5 to-transparent border-blue-500/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-200/80">Empresas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{typeGroup.totalCompanies}</div>
              <p className="text-xs text-gray-400 mt-1">Empresas deste tipo</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500/20 via-purple-500/5 to-transparent border-purple-500/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-purple-200/80">Setores</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{typeGroup.totalSectors}</div>
              <p className="text-xs text-gray-400 mt-1">Setores únicos</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500/20 via-green-500/5 to-transparent border-green-500/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-200/80">Holerites</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{typeGroup.totalPayslips}</div>
              <p className="text-xs text-gray-400 mt-1">Total de holerites</p>
            </CardContent>
          </Card>
        </div>

        {/* Lista de empresas */}
        {typeGroup.companies.map(company => {
          const companyKey = `${typePrefix}-${getCompanyKey(company)}`;
          const companyExpanded = !!expandedCompanyTypeCompanies[companyKey];

          return (
            <div
              key={companyKey}
              className="rounded-2xl border border-gray-700/60 bg-gray-900/60 backdrop-blur-sm overflow-hidden shadow-[0_30px_60px_-50px_rgba(0,0,0,0.9)]"
            >
              <div className="flex flex-col gap-4 px-5 py-5 sm:px-6 sm:py-6">
                <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <Badge className="bg-seguranca-black/60 text-seguranca-yellow border border-yellow-500/40 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
                        {company.companySigla}
                      </Badge>
                      <p className="text-lg font-semibold text-white leading-tight">
                        {company.companyName}
                      </p>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-400 flex flex-wrap items-center gap-2">
                      <Building2 className="h-4 w-4 text-seguranca-yellow" />
                      CNPJ: {company.companyCnpj || 'Não informado'} · {company.totalPayslips} holerite(s) · {company.totalSectors} setor(es)
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setExpandedCompanyTypeCompanies(prev => ({
                          ...prev,
                          [companyKey]: !prev[companyKey]
                        }));
                      }}
                      className="w-full sm:w-auto text-seguranca-lightgray hover:text-white"
                    >
                      {companyExpanded ? <ChevronDown className="h-4 w-4 mr-2" /> : <ChevronRight className="h-4 w-4 mr-2" />}
                      {companyExpanded ? 'Ocultar setores' : 'Ver setores'}
                    </Button>
                  </div>
                </div>
                {companyExpanded && (
                  <div className="space-y-4">
                    {company.sectors && company.sectors.length > 0 ? (
                      company.sectors.map(sector => {
                        const sectorKey = `${companyKey}-${getSectorKey(companyKey, sector)}`;
                        const sectorExpanded = !!expandedSectors[sectorKey];

                        return (
                          <div key={sectorKey} className="rounded-xl border border-gray-800/60 bg-gray-900/50 overflow-hidden">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-4 py-3">
                              <div>
                                <p className="text-sm font-semibold text-white">{sector.sectorName}</p>
                                <p className="text-xs text-gray-400">
                                  {sector.totalPayslips} holerite(s) · {sector.periods?.length ?? 0} período(s)
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleSectorExpansion(sectorKey)}
                                className="text-seguranca-lightgray hover:text-white"
                              >
                                {sectorExpanded ? <ChevronDown className="h-4 w-4 mr-2" /> : <ChevronRight className="h-4 w-4 mr-2" />}
                                {sectorExpanded ? 'Ocultar períodos' : 'Ver períodos'}
                              </Button>
                            </div>
                            {sectorExpanded && (
                              <div className="space-y-3 px-4 py-4 bg-gray-900/70">
                                {sector.periods && sector.periods.length > 0 ? (
                                  sector.periods.map(period => {
                                    const periodKey = `${sectorKey}-${getPeriodKey(sectorKey, period)}`;
                                    const periodExpanded = !!expandedPeriods[periodKey];

                                    return (
                                      <div key={periodKey} className="rounded-xl border border-gray-800/60 bg-gray-900/60 overflow-hidden">
                                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-4 py-3">
                                          <div>
                                            <p className="text-sm font-semibold text-white">{period.formattedPeriod}</p>
                                            <p className="text-xs text-gray-400">{period.totalPayslips} holerite(s)</p>
                                          </div>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => togglePeriodExpansion(periodKey)}
                                            className="text-seguranca-lightgray hover:text-white"
                                          >
                                            {periodExpanded ? <ChevronDown className="h-4 w-4 mr-2" /> : <ChevronRight className="h-4 w-4 mr-2" />}
                                            {periodExpanded ? 'Ocultar holerites' : 'Ver holerites'}
                                          </Button>
                                        </div>
                                        {periodExpanded && (
                                          <div className="divide-y divide-gray-800 bg-gray-950/60">
                                            {period.payslips.map(entry => {
                                              const holeriteData = resolveHoleriteFromEntry(entry);

                                              return (
                                                <div
                                                  key={entry.id}
                                                  className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-4 py-4"
                                                >
                                                  <div className="flex items-start gap-3 flex-1 min-w-0">
                                                    <Checkbox
                                                      checked={selectedHolerites.includes(entry.id)}
                                                      onCheckedChange={(checked) => handleSelectHolerite(entry.id, checked)}
                                                      className="border-blue-400 mt-1"
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                      <p className="text-sm font-semibold text-white">{entry.employeeName}</p>
                                                      <p className="text-xs text-gray-400">
                                                        CPF: {formatCpf(entry.cpf)} · Arquivo: {entry.fileName}
                                                      </p>
                                                    </div>
                                                  </div>
                                                  <div className="flex flex-wrap gap-2">
                                                    <Button
                                                      size="sm"
                                                      variant="outline"
                                                      className="border-gray-600 text-seguranca-lightgray hover:bg-seguranca-black"
                                                      onClick={() => handleViewHolerite(holeriteData)}
                                                    >
                                                      <Eye className="h-4 w-4 mr-1" />
                                                      Visualizar
                                                    </Button>
                                                    <Button
                                                      size="sm"
                                                      variant="outline"
                                                      className="border-gray-600 text-seguranca-lightgray hover:bg-seguranca-black"
                                                      onClick={() => handleEmailHolerite(holeriteData)}
                                                    >
                                                      <Mail className="h-4 w-4 mr-1" />
                                                      E-mail
                                                    </Button>
                                                    <Button
                                                      size="sm"
                                                      variant="outline"
                                                      className="border-gray-600 text-seguranca-lightgray hover:bg-seguranca-black"
                                                      onClick={() => handleSendWhatsAppIndividual(holeriteData)}
                                                    >
                                                      <MessageSquare className="h-4 w-4 mr-1" />
                                                      WhatsApp
                                                    </Button>
                                                    <Button
                                                      size="sm"
                                                      variant="destructive"
                                                      className="bg-red-600/90 hover:bg-red-700 border-red-700"
                                                      onClick={() => handleDeleteHolerite(holeriteData)}
                                                    >
                                                      <Trash2 className="h-4 w-4 mr-1" />
                                                      Excluir
                                                    </Button>
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })
                                ) : (
                                  <div className="rounded-xl border border-dashed border-gray-700 p-4 text-sm text-gray-400 text-center">
                                    Nenhum período encontrado para este setor.
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="rounded-xl border border-dashed border-gray-700 p-4 text-sm text-gray-400 text-center">
                        Nenhum setor encontrado para esta empresa.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (!user) {
    return (
      <StandardLayout>
        <div className="flex items-center justify-center h-64 px-4">
          <div className="text-center">
            <AlertCircle className="mx-auto h-6 w-6 sm:h-8 sm:w-8 text-red-500 mb-4" />
            <p className="text-seguranca-lightgray mb-4 text-sm sm:text-base">Usuário não autenticado.</p>
            <p className="text-gray-400 text-sm">Faça login para acessar esta página.</p>
          </div>
        </div>
      </StandardLayout>
    );
  }

  if (isCollaborator && user) {
    return <CollaboratorHolerites user={user} />;
  }

  if (loading && holerites.length === 0) {
    return (
      <StandardLayout>
        <div className="flex items-center justify-center h-64 px-4">
          <div className="text-center">
            <Loader2 className="mx-auto h-6 w-6 sm:h-8 sm:w-8 animate-spin text-seguranca-red mb-4" />
            <p className="text-seguranca-lightgray text-sm sm:text-base">Carregando holerites...</p>
          </div>
        </div>
      </StandardLayout>
    );
  }

  if (error && holerites.length === 0) {
    return (
      <StandardLayout>
        <div className="flex items-center justify-center h-64 px-4">
          <div className="text-center">
            <AlertCircle className="mx-auto h-6 w-6 sm:h-8 sm:w-8 text-red-500 mb-4" />
            <p className="text-seguranca-lightgray mb-4 text-sm sm:text-base">{error}</p>
            <Button
              onClick={() => loadHolerites()}
              className="bg-seguranca-red hover:bg-seguranca-darkred text-sm"
            >
              Tentar Novamente
            </Button>
          </div>
        </div>
      </StandardLayout>
    );
  }

  return (
    <StandardLayout>
      {/* Barra superior com navegação por período já existente */}

      <div className="space-y-6">
        {/* Header - PADRÃO SST */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-seguranca-lightgray flex items-center gap-2">
              <FileText className="h-8 w-8 text-seguranca-yellow" />
              Gestão de Holerites
                  </h1>
            <p className="text-gray-400 mt-1">Sistema de gerenciamento de documentos financeiros</p>
                </div>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="border-gray-600 text-seguranca-lightgray hover:bg-seguranca-black"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtros
            </Button>
            <Button 
              onClick={() => setShowUploadModal(true)}
              className="bg-seguranca-red hover:bg-seguranca-darkred"
            >
              <Plus className="h-4 w-4 mr-2" />
              Importar
            </Button>
          </div>
        </div>

        {/* Tabs - COPIADO DO PADRÃO SST (que funciona bem!) */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-6 bg-seguranca-graphite border-gray-600">
            <TabsTrigger value="processados" className="text-seguranca-lightgray data-[state='active']:bg-seguranca-red text-xs sm:text-sm">
              Holerites
            </TabsTrigger>
            <TabsTrigger value="recibos" className="text-seguranca-lightgray data-[state='active']:bg-seguranca-red text-xs sm:text-sm">
              Comprovantes
            </TabsTrigger>
            <TabsTrigger value="empresas" className="text-seguranca-lightgray data-[state='active']:bg-seguranca-red text-xs sm:text-sm">
              Empresas
            </TabsTrigger>
            <TabsTrigger value="logs-envio" className="text-seguranca-lightgray data-[state='active']:bg-seguranca-red text-xs sm:text-sm">
              Logs
            </TabsTrigger>
            <TabsTrigger value="unificacao-individual" className="text-seguranca-lightgray data-[state='active']:bg-seguranca-red text-xs sm:text-sm">
              Unificação
            </TabsTrigger>
            <TabsTrigger value="unificados-por-setor" className="text-seguranca-lightgray data-[state='active']:bg-seguranca-red text-xs sm:text-sm">
              Por Setor
            </TabsTrigger>
          </TabsList>
            
          <TabsContent value="processados" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
              <div className="group relative overflow-hidden rounded-2xl border border-yellow-500/30 bg-gradient-to-br from-seguranca-yellow/20 via-yellow-500/5 to-transparent p-5 shadow-[0_20px_45px_-35px_rgba(251,191,36,0.75)] transition-all duration-300 hover:border-yellow-400/60 hover:shadow-[0_25px_60px_-30px_rgba(251,191,36,0.65)]">
                <div className="absolute inset-0 bg-gradient-to-br from-seguranca-yellow/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-yellow-200/80">Total de Holerites</p>
                    <p className="mt-2 text-3xl font-bold text-white">{holerites.length}</p>
                    <p className="text-xs text-gray-300 mt-1">Documentos processados</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-500/20 text-seguranca-yellow">
                    <FileText className="h-6 w-6" />
                  </div>
                </div>
              </div>

              <div className="group relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/20 via-emerald-500/5 to-transparent p-5 shadow-[0_20px_45px_-35px_rgba(16,185,129,0.55)] transition-all duration-300 hover:border-emerald-400/60 hover:shadow-[0_25px_60px_-30px_rgba(16,185,129,0.5)]">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-200/80">Comprovantes</p>
                    <p className="mt-2 text-3xl font-bold text-white">{Array.isArray(receipts) ? receipts.length : 0}</p>
                    <p className="text-xs text-gray-300 mt-1">Recibos de pagamento vinculados</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300">
                    <Receipt className="h-6 w-6" />
                  </div>
                </div>
              </div>

              <div className="group relative overflow-hidden rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-500/20 via-blue-500/5 to-transparent p-5 shadow-[0_20px_45px_-35px_rgba(59,130,246,0.55)] transition-all duration-300 hover:border-blue-400/60 hover:shadow-[0_25px_60px_-30px_rgba(59,130,246,0.5)]">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-200/80">Processados Hoje</p>
                    <p className="mt-2 text-3xl font-bold text-white">{getHoleritesProcessedToday()}</p>
                    <p className="text-xs text-gray-300 mt-1">Holerites organizados nas últimas horas</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/20 text-blue-300">
                    <CheckCircle className="h-6 w-6" />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-seguranca-red/15 via-red-500/10 to-transparent border border-red-600/40 rounded-3xl p-4 sm:p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 shadow-[0_25px_60px_-45px_rgba(220,38,38,0.75)]">
              <div className="flex items-start gap-3">
                <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/20 text-seguranca-red">
                  <Upload className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-white">Importar novos holerites</h3>
                  <p className="text-sm text-red-100/80 max-w-xl">
                    Faça upload de arquivos em lote e mantenha a base sempre atualizada para todos os setores.
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <Button
                  onClick={() => setShowUploadModal(true)}
                  disabled={loading}
                  className="w-full sm:w-auto bg-seguranca-red hover:bg-seguranca-darkred shadow-lg shadow-red-900/40"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Importar Holerites
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={refreshHolerites}
                  disabled={refreshing}
                  className="w-full sm:w-auto border-red-500/40 text-red-200 hover:bg-red-500/10"
                >
                  {refreshing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Atualizando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Atualizar lista
                    </>
                  )}
                </Button>
                      </div>
            </div>

            <div className="bg-gradient-to-br from-black/70 via-gray-900/80 to-gray-900/60 border border-gray-700/60 rounded-3xl p-4 sm:p-6 lg:p-8 space-y-6 shadow-[0_30px_65px_-50px_rgba(15,23,42,0.9)]">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-2xl bg-seguranca-yellow/20 text-seguranca-yellow">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-lg sm:text-xl font-semibold text-white">Holerites por Empresa/Setor/Período</h4>
                    <p className="text-sm text-gray-400 max-w-2xl">
                      Navegue pela estrutura organizada de empresas, setores e períodos para localizar e gerenciar rapidamente os holerites.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  {organizationError && (
                    <Badge className="bg-red-600/20 text-red-200 border border-red-500/40 px-3 py-1 rounded-xl">
                      Problemas na última atualização
                    </Badge>
                  )}
                  <Button
                    variant="outline"
                    onClick={handleRefreshOrganization}
                    disabled={loadingOrganization}
                    className="border-gray-600/60 text-seguranca-lightgray hover:bg-seguranca-black"
                  >
                    {loadingOrganization ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Atualizando
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Recarregar dados
                  </>
                )}
                  </Button>
              </div>
              </div>

              {organizationError && (
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 border border-red-500/30 bg-red-500/10 text-red-100 px-4 py-4 rounded-2xl">
                  <div className="flex items-center gap-2 text-red-200">
                    <AlertCircle className="h-5 w-5" />
                    <p className="text-sm font-semibold">Não foi possível carregar a organização</p>
                  </div>
                  <p className="text-sm">{organizationError}</p>
                </div>
              )}

              {/* Barra de Pesquisa */}
              {!loadingOrganization && organizationData?.companies?.length > 0 && (
                <div className="bg-gradient-to-r from-seguranca-yellow/10 via-yellow-500/5 to-transparent border border-yellow-500/30 rounded-2xl p-4">
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <div className="flex items-center gap-2 flex-1 w-full">
                      <Search className="h-5 w-5 text-seguranca-yellow flex-shrink-0" />
                      <Input
                        placeholder="Buscar por CPF, nome do funcionário ou período (ex: 01841134589, João Silva, 01/2024)"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-seguranca-black border-gray-600 text-seguranca-lightgray placeholder:text-gray-500 focus:border-seguranca-yellow focus:ring-seguranca-yellow"
                      />
                    </div>
                    {searchTerm && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSearchTerm('')}
                        className="text-gray-400 hover:text-white"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Limpar
                      </Button>
                    )}
                  </div>
                  {searchTerm && (
                    <p className="text-xs text-gray-400 mt-2 ml-7">
                      Pesquisando por: <span className="text-seguranca-yellow font-semibold">{searchTerm}</span>
                    </p>
                  )}
                </div>
              )}

              {loadingOrganization ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-10 w-10 animate-spin text-seguranca-yellow" />
                </div>
              ) : (
                renderOrganizationCompanies()
              )}
            </div>

          </TabsContent>

          <TabsContent value="recibos" className="space-y-6 mt-6">
            {/* Cards de Estatísticas - PADRÃO SST */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="bg-seguranca-graphite border-gray-600">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-seguranca-lightgray">Total de Comprovantes</CardTitle>
                  <Receipt className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-seguranca-lightgray">{paymentReceipts.length}</div>
                  <p className="text-xs text-gray-400 mt-1">Recibos processados</p>
                </CardContent>
              </Card>

              <Card className="bg-seguranca-graphite border-gray-600">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-seguranca-lightgray">Anos Disponíveis</CardTitle>
                  <Calendar className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-seguranca-lightgray">{getAvailableYears().length}</div>
                  <p className="text-xs text-gray-400 mt-1">Períodos organizados</p>
                </CardContent>
              </Card>

              <Card className="bg-seguranca-graphite border-gray-600">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-seguranca-lightgray">Processados Hoje</CardTitle>
                  <CheckCircle className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-seguranca-lightgray">{getHoleritesProcessedToday()}</div>
                  <p className="text-xs text-gray-400 mt-1">Neste dia</p>
                </CardContent>
              </Card>
                    </div>
                    
            {/* Botão de Upload - PADRÃO SST */}
            <div className="mt-6">
                      <Button 
                      onClick={() => setShowPaymentReceiptUploadModal(true)}
                      disabled={processingPaymentReceipts}
                className="bg-seguranca-red hover:bg-seguranca-darkred w-full sm:w-auto"
                    >
                        {processingPaymentReceipts ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Importar Comprovante
                  </>
                )}
                      </Button>
                  </div>

            {/* Abas por Ano e Mês */}
            <Card className="bg-seguranca-graphite border-gray-600 rounded-lg p-6">
                <div className="space-y-8">
                  <div className="text-center">
                    <h4 className="text-2xl font-bold text-white mb-2">Comprovantes por Período</h4>
                    <p className="text-gray-400">Navegue pelos anos e meses para visualizar os comprovantes</p>
                </div>

                  {/* Abas de Ano Melhoradas */}
                  <div className="space-y-6">
                    <div className="text-center">
                      <h5 className="text-lg font-semibold text-seguranca-lightgray mb-4">Selecione o Ano</h5>
                      <div className="flex flex-wrap justify-center gap-3">
                        {getAvailableYears().map((year) => (
                        <Button
                            key={year}
                            variant={activeYear === year.toString() ? "default" : "outline"}
                            onClick={() => {
                              setActiveYear(year.toString());
                              const months = getAvailableMonths(year.toString());
                              if (months.length > 0) {
                                setActiveMonth(months[0].toString());
                              }
                            }}
                            className={`group relative px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                              activeYear === year.toString() 
                                ? 'bg-gradient-to-r from-seguranca-yellow to-yellow-500 text-seguranca-black shadow-lg shadow-yellow-500/25 hover:shadow-yellow-500/40 transform hover:scale-105' 
                                : 'border-2 border-gray-600/50 text-seguranca-lightgray hover:border-seguranca-yellow/50 hover:bg-seguranca-yellow/10 hover:text-seguranca-yellow'
                            }`}
                          >
                            {activeYear === year.toString() && (
                              <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 to-yellow-500/20 rounded-xl blur opacity-50"></div>
                            )}
                            <span className="relative text-lg font-bold">{year}</span>
                        </Button>
                        ))}
                      </div>
                    </div>

                    {/* Abas de MÃªs Melhoradas */}
                    {activeYear && (
                      <div className="text-center">
                        <h5 className="text-lg font-semibold text-seguranca-lightgray mb-4">Selecione o Mês</h5>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                          {getAvailableMonths(activeYear).map((month) => (
                      <Button
                              key={month}
                              variant={activeMonth === month.toString() ? "default" : "outline"}
                              onClick={() => setActiveMonth(month.toString())}
                              className={`group relative px-4 py-3 rounded-xl font-medium transition-all duration-300 ${
                                activeMonth === month.toString() 
                                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transform hover:scale-105' 
                                  : 'border-2 border-gray-600/50 text-seguranca-lightgray hover:border-blue-500/50 hover:bg-blue-500/10 hover:text-blue-400'
                              }`}
                            >
                              {activeMonth === month.toString() && (
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-blue-500/20 rounded-xl blur opacity-50"></div>
                              )}
                              <span className="relative text-sm font-semibold">
                                {getMonthName(month)}
                              </span>
                      </Button>
                          ))}
                    </div>
                      </div>
                    )}
                  </div>

                  {/* Lista de Comprovantes do Período Selecionado */}
                  <div className="space-y-6">
                    {/* Header responsivo melhorado */}
                    <div className="bg-gradient-to-r from-blue-500/15 to-purple-500/15 border border-blue-500/30 rounded-2xl sm:rounded-3xl p-4 sm:p-6 backdrop-blur-sm">
                      
                      {/* Layout principal: empilhado em mobile, lado a lado em desktop */}
                      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 xl:gap-6">
                        
                        {/* SeÃ§Ã£o de informaÃ§Ãµes - sempre visÃ­vel */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
                            <FileText size={20} className="sm:w-6 sm:h-6 text-white" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h5 className="text-lg sm:text-xl xl:text-2xl font-bold text-white leading-tight">
                              Comprovantes de {getMonthName(parseInt(activeMonth))} de {activeYear}
                            </h5>
                            <p className="text-blue-300/90 text-xs sm:text-sm font-medium mt-1">
                              Documentos processados e organizados
                            </p>
                          </div>
                        </div>
                        
                        {/* Badge de contagem - responsivo */}
                        <div className="flex justify-center xl:justify-end">
                          <Badge className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-lg font-bold shadow-xl rounded-xl sm:rounded-2xl">
                            {getFilteredPaymentReceipts().length} comprovante{getFilteredPaymentReceipts().length !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                      </div>
                      
                      {/* Botões de Ação - PADRÃO SST SIMPLIFICADO */}
                      {getFilteredPaymentReceipts().length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-600">
                          {/* Checkbox Selecionar Todos */}
                          <div className="mb-3 flex items-center gap-2 bg-gray-700 p-3 rounded">
                            <Checkbox
                              id="select-all-payment-receipts"
                              checked={areAllPaymentReceiptsSelected()}
                              onCheckedChange={handleSelectAllPaymentReceipts}
                              className="border-blue-400"
                            />
                            <label htmlFor="select-all-payment-receipts" className="text-white text-sm font-medium cursor-pointer">
                              Selecionar Todos
                            </label>
                          </div>
                          
                          {/* Botão de ação em massa - Excluir - só aparece quando "Selecionar todos" está marcado */}
                          {areAllPaymentReceiptsSelected() && (
                          <div className="flex flex-col sm:flex-row gap-2">
                            <Button
                              onClick={handleDeleteMultiplePaymentReceipts}
                              className="w-full sm:w-auto bg-red-600 text-white hover:bg-red-700"
                            >
                              <Trash2 size={16} className="mr-2" />
                              Excluir ({selectedPaymentReceipts.length})
                            </Button>
                          </div>
                          )}
                        </div>
                      )}
                    </div>
                </div>
                
                    {loadingPaymentReceipts ? (
                      <div className="text-center py-12">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl mb-4">
                          <Loader2 className="h-8 w-8 animate-spin text-white" />
                      </div>
                        <p className="text-white text-lg font-medium">Carregando comprovantes...</p>
                        <p className="text-gray-400 text-sm">Aguarde um momento</p>
                      </div>
                    ) : getFilteredPaymentReceipts().length === 0 ? (
                      <div className="text-center py-16 px-4">
                        <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-3xl mb-6">
                          <FileText size={40} className="text-blue-400" />
                    </div>
                        <h3 className="text-xl font-bold text-white mb-3">
                          Nenhum comprovante encontrado
                        </h3>
                        <p className="text-gray-400 text-base mb-6">
                          Não há comprovantes para {getMonthName(parseInt(activeMonth))} de {activeYear}.
                      </p>
                      <Button
                          onClick={() => setShowPaymentReceiptUploadModal(true)}
                          className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-semibold"
                        >
                          <Plus size={20} className="mr-2" />
                          Importar Primeiro Comprovante
                      </Button>
                    </div>
                    ) : (
                      <div className="space-y-2">
                        {getFilteredPaymentReceipts().map((receipt, index) => (
                          <div key={receipt.id} className="bg-gray-700 p-3 rounded">
                            <div className="flex items-start gap-3">
                              <Checkbox
                                id={`payment-receipt-${receipt.id}`}
                                checked={selectedPaymentReceipts.includes(receipt.id)}
                                onCheckedChange={(checked) => handleSelectPaymentReceipt(receipt.id, checked as boolean)}
                                className="border-blue-400 mt-1"
                              />
                              <div className="flex-1">
                                <p className="text-white font-medium">{receipt.employeeName}</p>
                                <p className="text-gray-400 text-sm">CPF: {(receipt as any).cpf || 'Não informado'}</p>
                                <p className="text-gray-400 text-sm">Período: {receipt.month}/{receipt.year}</p>
                                <p className="text-green-400 text-sm">Transferência: {formatDate(receipt.processedAt || receipt.updatedAt)}</p>
                              </div>
                            </div>
                            
                            {/* Botões de ação individual */}
                            <div className="mt-3 pt-3 border-t border-gray-600 flex flex-col sm:flex-row gap-2">
                              {/* Botão Ver - sempre disponível */}
                              <Button
                                size="sm"
                                onClick={() => handleViewPaymentReceipt(receipt)}
                                className="w-full sm:flex-1 bg-blue-600 text-white hover:bg-blue-700"
                              >
                                <Eye size={14} className="mr-1" />
                                Ver
                              </Button>
                              
                              {/* Botão Excluir */}
                              <Button
                                size="sm"
                                onClick={() => handleDeletePaymentReceipt(receipt.id)}
                                className="w-full sm:flex-1 bg-red-600 text-white hover:bg-red-700"
                              >
                                <Trash2 size={14} className="mr-1" />
                                Excluir
                              </Button>
                            </div>
                          </div>
                      ))}
                    </div>
                  )}
                  </div>
              </Card>
          </TabsContent>


          {/* Nova Aba: Unificação Individual */}
          <TabsContent value="unificacao-individual" className="space-y-6 mt-6">
              {/* Botões de Ação - SIMPLIFICADO */}
              <div className="flex flex-col sm:flex-row justify-between gap-2 mb-4">
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => loadProcessedFiles()}
                    variant="outline"
                    className="border-blue-500 text-blue-500 hover:bg-blue-50"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Atualizar Listas
                  </Button>
                  <Button
                    onClick={async () => {
                      try {
                        console.log('🧪 Testando conexão com o backend...');
                        const response = await api.get('/unified-documents/test');
                        console.log('✅ Backend respondendo:', response.data);
                        toast({
                          title: "✅ Backend OK",
                          description: response.data.mensagem || "Conexão com o backend funcionando corretamente",
                        });
                      } catch (error: any) {
                        console.error('❌ Erro de conexão:', error);
                        toast({
                          title: "❌ Erro de Conexão",
                          description: `Não foi possível conectar ao backend: ${error.message}`,
                          variant: "destructive"
                        });
                      }
                    }}
                    variant="outline"
                    className="border-green-500 text-green-500 hover:bg-green-50"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Testar Backend
                  </Button>
                  <Button
                    onClick={async () => {
                      try {
                        console.log('🔍 Analisando dados para debug...');
                        const response = await api.get('/unified-documents/debug-data', {
                          params: {
                            month: batchUnificationMonth ? parseInt(batchUnificationMonth) : null,
                            year: batchUnificationYear ? parseInt(batchUnificationYear) : null
                          }
                        });
                        console.log('📊 Dados de debug:', response.data);
                        
                        const data = response.data;
                        toast({
                          title: "📊 Análise de Dados",
                          description: `Holerites: ${data.totalHolerites}, Comprovantes: ${data.totalReceipts}, Nomes em comum: ${data.commonNamesCount}`,
                        });
                        
                        // Mostrar detalhes no console
                        console.log('📋 Nomes únicos em holerites:', data.payslipNames);
                        console.log('📋 Nomes únicos em comprovantes:', data.receiptNames);
                        console.log('📋 Nomes em comum:', data.commonNames);
                        
                      } catch (error: any) {
                        console.error('❌ Erro na análise:', error);
                        toast({
                          title: "❌ Erro na Análise",
                          description: `Erro ao analisar dados: ${error.message}`,
                          variant: "destructive"
                        });
                      }
                    }}
                    variant="outline"
                    className="border-purple-500 text-purple-500 hover:bg-purple-50"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Analisar Dados
                  </Button>
                  <Button
                    onClick={async () => {
                      try {
                        console.log('🧪 Testando criação de documento unificado com dados existentes...');
                        const response = await api.post('/unified-documents/test-create');
                        console.log('✅ Resposta do teste:', response.data);
                        
                        if (response.data.sucesso) {
                          toast({
                            title: "✅ Teste de Criação",
                            description: `${response.data.mensagem} - Funcionário: ${response.data.employeeName} (${response.data.month}/${response.data.year})`,
                          });
                        } else {
                          // Verificar se é erro de comprovante não encontrado
                          if (response.data.tipoErro === 'COMPROVANTE_NAO_ENCONTRADO') {
                            toast({
                              title: "📄 Comprovante Não Encontrado",
                              description: (
                                <div className="space-y-2">
                                  <div className="font-semibold">Funcionário: {response.data.funcionario}</div>
                                  <div className="text-sm space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-green-400">✓</span>
                                      <span>Holerite: {response.data.periodoHolerite} (já importado)</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-red-400">✗</span>
                                      <span>Comprovante: {response.data.periodoComprovante} (não encontrado)</span>
                                    </div>
                                  </div>
                                  <div className="pt-2 border-t border-gray-600">
                                    <div className="font-medium text-yellow-400 mb-1">📥 Ação Necessária:</div>
                                    <div className="text-sm">
                                      Importe apenas o comprovante de pagamento para o funcionário <strong>{response.data.funcionario}</strong> referente ao período <strong>{response.data.periodoComprovante}</strong>.
                                    </div>
                                  </div>
                                </div>
                              ),
                              variant: "destructive",
                              duration: 12000
                            });
                          } else {
                            toast({
                              title: "⚠️ Teste de Criação",
                              description: response.data.mensagem + (response.data.sugestao ? ` - ${response.data.sugestao}` : ''),
                              variant: "destructive"
                            });
                          }
                        }
                      } catch (error: any) {
                        console.error('❌ Erro no teste de criação:', error);
                        
                        // Verificar se é erro de comprovante não encontrado
                        const errorData = error?.response?.data;
                        if (errorData?.tipoErro === 'COMPROVANTE_NAO_ENCONTRADO') {
                          toast({
                            title: "📄 Comprovante Não Encontrado",
                            description: (
                              <div className="space-y-2">
                                <div className="font-semibold">Funcionário: {errorData.funcionario}</div>
                                <div className="text-sm">
                                  <div>📋 Holerite: {errorData.periodoHolerite} ✓</div>
                                  <div className="text-red-400">❌ Comprovante: {errorData.periodoComprovante} (faltando)</div>
                                </div>
                                <div className="pt-2 border-t border-gray-600">
                                  <div className="font-medium text-yellow-400">Ação Necessária:</div>
                                  <div className="text-sm mt-1">
                                    Por favor, importe apenas o comprovante de pagamento para o período {errorData.periodoComprovante}.
                                  </div>
                                </div>
                              </div>
                            ),
                            variant: "destructive",
                            duration: 10000
                          });
                        } else {
                          toast({
                            title: "❌ Erro no Teste",
                            description: errorData?.mensagem || error?.message || "Erro ao testar criação",
                            variant: "destructive"
                          });
                        }
                      }
                    }}
                    variant="outline"
                    className="border-orange-500 text-orange-500 hover:bg-orange-50"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Testar Criação
                  </Button>
                </div>
                <Button
                  onClick={() => setShowBatchUnificationModal(true)}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  🎯 Unificação em Lote/Massa
                </Button>
              </div>

              {/* Informações de Debug */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <h4 className="text-sm font-semibold text-blue-800 mb-2">Informações de Debug:</h4>
                  <div className="grid grid-cols-2 gap-4 text-xs text-blue-700">
                      <div>
                          <strong>Holerites:</strong> {holerites.length} carregados, {processedHolerites.length} processados
                      </div>
                      <div>
                          <strong>Recibos:</strong> {receipts.length} carregados, {processedRecibos.length} processados
                      </div>
                  </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Lista de Holerites Processados - PADRÃO SST */}
                  <Card className="bg-seguranca-graphite border-gray-600">
                      <CardHeader>
                          <CardTitle className="flex items-center justify-between text-seguranca-lightgray">
                              <div className="flex items-center gap-2">
                                  <FileText className="h-5 w-5 text-seguranca-yellow" />
                                  <span className="text-base md:text-lg">Holerites</span>
                              </div>
                              <Badge variant="secondary" className="bg-seguranca-black text-seguranca-yellow">
                                  {getFilteredHolerites().length}
                              </Badge>
                          </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                          {/* Busca */}
                              <Input
                              placeholder="Buscar..."
                                  value={holeriteSearchTerm}
                                  onChange={(e) => setHoleriteSearchTerm(e.target.value)}
                              className="bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                          />

                          {/* Lista */}
                          <div className="space-y-2 max-h-96 overflow-y-auto">
                              {loadingProcessedFiles ? (
                                  <div className="flex items-center justify-center py-6">
                                      <Loader2 className="h-5 w-5 animate-spin text-seguranca-yellow" />
                                  </div>
                              ) : getFilteredHolerites().length === 0 ? (
                                  <div className="text-center py-6 text-gray-400">
                                      <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
                                      <p className="text-sm">Nenhum holerite</p>
                                  </div>
                              ) : (
                                  getFilteredHolerites().map((holerite) => (
                                      <div
                                          key={holerite.id}
                                          draggable
                                          onDragStart={(e) => handleDragStart(e, holerite, 'holerite')}
                                          className="p-3 bg-seguranca-black border border-gray-600 rounded-lg cursor-move hover:border-seguranca-yellow transition-colors"
                                      >
                                          <div className="flex items-center gap-2">
                                              <GripVertical className="h-4 w-4 text-gray-500 flex-shrink-0" />
                                              <div className="flex-1 min-w-0">
                                                  <p className="text-white text-sm font-medium truncate">
                                                      {holerite.employeeName || 'Nome não disponível'}
                                                  </p>
                                                  <div className="flex items-center gap-2 mt-1">
                                                      <Badge variant="outline" className="text-xs bg-seguranca-graphite border-gray-600 text-gray-300">
                                                          {holerite.month}/{holerite.year}
                                                      </Badge>
                                                  </div>
                                              </div>
                                              <Button
                                                  size="sm"
                                                  variant="ghost"
                                                  onClick={(e) => {
                                                      e.stopPropagation();
                                                      // Converter para o formato esperado pelo modal
                                                      const holeriteId = holerite.id.replace('hol-', '') || holerite.name || String(Math.random());
                                                      const holeriteFormatted: Holerite = {
                                                          id: holeriteId,
                                                          employeeName: holerite.employeeName || '',
                                                          cpf: holerite.cpf || '',
                                                          month: parseInt(holerite.month) || 0,
                                                          year: parseInt(holerite.year) || 0,
                                                          fileName: holerite.name || '',
                                                          status: 'PROCESSED',
                                                          processedAt: new Date().toISOString(),
                                                          companyName: '',
                                                          workPostName: ''
                                                      };
                                                      setSelectedHolerite(holeriteFormatted);
                                                      setShowViewModal(true);
                                                  }}
                                                  className="h-8 w-8 p-0 text-seguranca-yellow hover:text-seguranca-yellow hover:bg-seguranca-yellow/10 flex-shrink-0"
                                                  title="Visualizar Holerite"
                                              >
                                                  <FileText size={16} />
                                              </Button>
                                          </div>
                                      </div>
                                  ))
                              )}
                          </div>
                      </CardContent>
                  </Card>

                  {/* Lista de Comprovantes Processados - PADRÃO SST */}
                  <Card className="bg-seguranca-graphite border-gray-600">
                      <CardHeader>
                          <CardTitle className="flex items-center justify-between text-seguranca-lightgray">
                              <div className="flex items-center gap-2">
                                  <Receipt className="h-5 w-5 text-green-500" />
                                  <span className="text-base md:text-lg">Comprovantes</span>
                              </div>
                              <Badge variant="secondary" className="bg-seguranca-black text-green-400">
                                  {getFilteredRecibos().length}
                              </Badge>
                          </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                          {/* Busca */}
                              <Input
                              placeholder="Buscar..."
                                  value={reciboSearchTerm}
                                  onChange={(e) => setReciboSearchTerm(e.target.value)}
                              className="bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                          />

                          {/* Lista */}
                          <div className="space-y-2 max-h-96 overflow-y-auto">
                              {loadingProcessedFiles ? (
                                  <div className="flex items-center justify-center py-6">
                                      <Loader2 className="h-5 w-5 animate-spin text-green-500" />
                                  </div>
                              ) : getFilteredRecibos().length === 0 ? (
                                  <div className="text-center py-6 text-gray-400">
                                      <Receipt className="h-10 w-10 mx-auto mb-2 opacity-50" />
                                      <p className="text-sm">Nenhum comprovante</p>
                                  </div>
                              ) : (
                                  getFilteredRecibos().map((recibo) => (
                                      <div
                                          key={recibo.id}
                                          draggable
                                          onDragStart={(e) => handleDragStart(e, recibo, 'recibo')}
                                          className="p-3 bg-seguranca-black border border-gray-600 rounded-lg cursor-move hover:border-green-500 transition-colors"
                                      >
                                          <div className="flex items-center gap-2">
                                              <GripVertical className="h-4 w-4 text-gray-500 flex-shrink-0" />
                                              <div className="flex-1 min-w-0">
                                                  <p className="text-white text-sm font-medium truncate">
                                                      {recibo.employeeName || 'Nome não disponível'}
                                                  </p>
                                                  <div className="flex items-center gap-2 mt-1">
                                                      <Badge variant="outline" className="text-xs bg-seguranca-graphite border-gray-600 text-gray-300">
                                                          {recibo.month}/{recibo.year}
                                                      </Badge>
                                                  </div>
                                              </div>
                                              <Button
                                                  size="sm"
                                                  variant="ghost"
                                                  onClick={(e) => {
                                                      e.stopPropagation();
                                                      // Converter para o formato esperado pelo modal
                                                      const receiptId = recibo.id.replace('rec-', '') || recibo.name || String(Math.random());
                                                      const now = new Date().toISOString();
                                                      const receiptFormatted: PaymentReceipt = {
                                                          id: receiptId,
                                                          employeeName: recibo.employeeName || '',
                                                          month: parseInt(recibo.month) || 0,
                                                          year: parseInt(recibo.year) || 0,
                                                          fileName: recibo.name || '',
                                                          processedAt: now,
                                                          updatedAt: now,
                                                          createdAt: now,
                                                          status: 'PROCESSED'
                                                      };
                                                      handleViewPaymentReceipt(receiptFormatted);
                                                  }}
                                                  className="h-8 w-8 p-0 text-green-400 hover:text-green-400 hover:bg-green-500/10 flex-shrink-0"
                                                  title="Visualizar Comprovante"
                                              >
                                                  <Receipt size={16} />
                                              </Button>
                                          </div>
                                      </div>
                                  ))
                              )}
                          </div>
                      </CardContent>
                  </Card>
              </div>

              {/* Ãrea de Unificação */}
              <Card 
                  className="border-2 border-dashed border-yellow-300 bg-yellow-50/30 transition-all duration-200 hover:border-yellow-400 hover:bg-yellow-50/50"
                  onDrop={(e) => handleDrop(e, 'unificacao')}
                  onDragOver={handleDragOver}
              >
                  <CardHeader>
                      <CardTitle className="flex items-center text-lg text-yellow-800">
                          <FileText className="w-5 h-5 mr-2" />
                          Ãrea de Unificação Individual
                      </CardTitle>
                  </CardHeader>
                  <CardContent>
                      {!draggedHolerite && !draggedRecibo ? (
                          <div className="text-center py-12">
                              <div className="w-16 h-16 mx-auto mb-4 bg-yellow-100 rounded-full flex items-center justify-center">
                                  <FileText className="w-8 h-8 text-yellow-600" />
                              </div>
                              <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                                  Arraste um Holerite e um Recibo
                              </h3>
                              <p className="text-yellow-700">
                                  Arraste um holerite da lista esquerda e um recibo da lista direita para criar um documento unificado
                              </p>
                          </div>
                      ) : (
                          <div className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {/* Holerite selecionado */}
                                  {draggedHolerite && (
                                      <div className="p-4 bg-yellow-100 border border-yellow-300 rounded-lg">
                                          <div className="flex items-center justify-between mb-2">
                                              <h4 className="font-semibold text-yellow-800">Holerite Selecionado</h4>
                                                  <Button
                                                      size="sm"
                                                  variant="outline"
                                                      onClick={() => setDraggedHolerite(null)}
                                                  className="border-yellow-400 text-yellow-700 hover:bg-yellow-200"
                                                  >
                                                      <X className="w-4 h-4" />
                                                  </Button>
                                              </div>
                                          <p className="text-sm text-yellow-700 truncate">
                                              {draggedHolerite.employeeName || 'Nome não disponível'}
                                          </p>
                                          <p className="text-xs text-yellow-600 truncate">
                                              {draggedHolerite.name}
                                          </p>
                                          <Badge variant="outline" className="mt-2 text-xs border-yellow-400 text-yellow-700">
                                              {draggedHolerite.month}/{draggedHolerite.year}
                                          </Badge>
                                      </div>
                                  )}

                                  {/* Recibo selecionado */}
                                  {draggedRecibo && (
                                      <div className="p-4 bg-green-100 border border-green-300 rounded-lg">
                                          <div className="flex items-center justify-between mb-2">
                                                      <h4 className="font-semibold text-green-800">Recibo Selecionado</h4>
                                                  <Button
                                                      size="sm"
                                                  variant="outline"
                                                      onClick={() => setDraggedRecibo(null)}
                                                  className="border-green-400 text-green-700 hover:bg-green-200"
                                                  >
                                                      <X className="w-4 h-4" />
                                                  </Button>
                                              </div>
                                          <p className="text-sm text-green-700 truncate">
                                              {draggedRecibo.employeeName || 'Nome não disponível'}
                                          </p>
                                          <p className="text-xs text-green-600 truncate">
                                              {draggedRecibo.name}
                                          </p>
                                          <Badge variant="outline" className="mt-2 text-xs border-green-400 text-green-700">
                                              {draggedRecibo.month}/{draggedRecibo.year}
                                          </Badge>
                                      </div>
                                  )}
                              </div>

                              {/* BotÃ£o de unificação */}
                              {draggedHolerite && draggedRecibo && (
                                  <div className="text-center">
                                      <Button
                                          onClick={() => createUnification(draggedHolerite, draggedRecibo)}
                                          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                                      >
                                          <FileText className="mr-2 h-4 w-4" />
                                          Unificar Documentos
                                      </Button>
                                  </div>
                              )}
                          </div>
                      )}
                  </CardContent>
              </Card>

              {/* Documentos Unificados Organizados por Empresa/Setor/Período */}
              <Card className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 border-purple-500/30">
                  <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                                  <FileText className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                  <CardTitle className="text-white text-xl">
                                      Documentos Unificados
                                  </CardTitle>
                                  <p className="text-gray-400 text-sm mt-1">
                                      Documentos organizados por Empresa/Setor/Período
                                  </p>
                              </div>
                          </div>
                          <div className="flex items-center space-x-3">
                              <Button
                                  variant="outline"
                                  onClick={loadUnifiedOrganization}
                                  disabled={loadingUnifiedOrganization}
                                  className="border-purple-500/50 text-purple-300 hover:bg-purple-800/50"
                              >
                                  {loadingUnifiedOrganization ? (
                                      <>
                                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                          Atualizando
                                      </>
                                  ) : (
                                      <>
                                          <RefreshCw className="h-4 w-4 mr-2" />
                                          Recarregar
                                      </>
                                  )}
                              </Button>
                              <Badge className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-3 py-1">
                                  {unifiedOrganizationData?.totalPayslips || 0} documento(s)
                              </Badge>
                          </div>
                      </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                      {unifiedOrganizationError && (
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 border border-red-500/30 bg-red-500/10 text-red-100 px-4 py-4 rounded-2xl">
                              <div className="flex items-center gap-2 text-red-200">
                                  <AlertTriangle className="h-5 w-5" />
                                  <p className="text-sm font-semibold">Não foi possível carregar a organização</p>
                              </div>
                              <p className="text-sm">{unifiedOrganizationError}</p>
                          </div>
                      )}

                      {loadingUnifiedOrganization ? (
                          <div className="flex items-center justify-center py-16">
                              <Loader2 className="h-10 w-10 animate-spin text-purple-400" />
                          </div>
                      ) : !unifiedOrganizationData?.companies?.length ? (
                          <div className="rounded-2xl border border-gray-700/60 bg-gray-900/40 p-8 text-center text-gray-300 shadow-inner">
                              Nenhum documento unificado encontrado. Crie documentos unificados para visualizar a organização.
                          </div>
                      ) : (
                          <div className="space-y-4">
                              {unifiedOrganizationData.companies.map(company => {
                                  const companyKey = getUnifiedCompanyKey(company);
                                  const companyExpanded = !!expandedUnifiedCompanies[companyKey];
                                  const companyIndices = collectUnifiedCompanyDocumentIndices(company);
                                  const companySelectedIndices = getSelectedUnifiedIndices(companyIndices);
                                  const companySelectedCount = companySelectedIndices.length;
                                  const companyCheckboxState: boolean | 'indeterminate' = companyIndices.length === 0
                                    ? false
                                    : areUnifiedIndicesFullySelected(companyIndices)
                                      ? true
                                      : companySelectedCount > 0
                                        ? 'indeterminate'
                                        : false;

                                  return (
                                      <div
                                          key={companyKey}
                                          className="rounded-2xl border border-gray-700/60 bg-gray-900/60 backdrop-blur-sm overflow-hidden shadow-[0_30px_60px_-50px_rgba(0,0,0,0.9)]"
                                      >
                                          <div className="flex flex-col gap-4 px-5 py-5 sm:px-6 sm:py-6">
                                              <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                                                  <div className="space-y-2">
                                                      <div className="flex flex-wrap items-center gap-3">
                                                          <Badge className="bg-seguranca-black/60 text-seguranca-yellow border border-yellow-500/40 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
                                                              {company.companySigla}
                                                          </Badge>
                                                          <p className="text-lg font-semibold text-white leading-tight">
                                                              {company.companyName}
                                                          </p>
                                                      </div>
                                                      <p className="text-xs sm:text-sm text-gray-400 flex flex-wrap items-center gap-2">
                                                          <Building2 className="h-4 w-4 text-seguranca-yellow" />
                                                          CNPJ: {company.companyCnpj || 'Não informado'} · {company.totalPayslips} documento(s) · {company.sectors.length} setor(es)
                                                      </p>
                                                  </div>
                                                  <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4">
                                                      {/* Checkbox "Selecionar empresa" - só aparece se a empresa NÃO estiver expandida */}
                                                      {!companyExpanded && (
                                                          <div className="flex items-center gap-2 bg-gray-800/60 rounded-xl px-3 py-2">
                                                              <Checkbox
                                                                  checked={companyCheckboxState}
                                                                  onCheckedChange={(checked) => handleSelectUnifiedDocuments(companyIndices, checked === true)}
                                                                  className="border-blue-400"
                                                              />
                                                              <span className="text-xs sm:text-sm text-gray-300">Selecionar empresa</span>
                                                          </div>
                                                      )}
                                                      <div className="flex flex-wrap gap-2 justify-end">
                                                          {/* Botões de ação em massa - só aparecem quando "Selecionar empresa" está marcado E a empresa NÃO está expandida */}
                                                          {companySelectedCount > 0 && !companyExpanded && (
                                                              <>
                                                                  <Button
                                                                      size="sm"
                                                                      className="bg-green-600/90 text-white hover:bg-green-600"
                                                                      onClick={() => {
                                                                          const selected = companySelectedIndices.map(idx => unifiedDocuments[idx]).filter(Boolean);
                                                                          setSelectedUnifiedDocuments(new Set(companySelectedIndices));
                                                                          handleSendDocuments('email');
                                                                      }}
                                                                  >
                                                                      <Mail className="h-4 w-4 mr-1" />
                                                                      Email ({companySelectedCount})
                                                                  </Button>
                                                                  <Button
                                                                      size="sm"
                                                                      className="bg-blue-600/90 text-white hover:bg-blue-600"
                                                                      onClick={() => {
                                                                          const selected = companySelectedIndices.map(idx => unifiedDocuments[idx]).filter(Boolean);
                                                                          setSelectedUnifiedDocuments(new Set(companySelectedIndices));
                                                                          handleSendDocuments('whatsapp');
                                                                      }}
                                                                  >
                                                                      <MessageSquare className="h-4 w-4 mr-1" />
                                                                      WhatsApp ({companySelectedCount})
                                                                  </Button>
                                                                  <Button
                                                                      size="sm"
                                                                      variant="destructive"
                                                                      className="bg-red-600/90 hover:bg-red-700 border-red-700"
                                                                      onClick={() => {
                                                                          setSelectedUnifiedDocuments(new Set(companySelectedIndices));
                                                                          handleDeleteDocuments('batch');
                                                                      }}
                                                                  >
                                                                      <Trash2 className="h-4 w-4 mr-1" />
                                                                      Excluir ({companySelectedCount})
                                                                  </Button>
                                                              </>
                                                          )}
                                                          <Button
                                                              variant="ghost"
                                                              size="sm"
                                                              onClick={() => toggleUnifiedCompanyExpansion(companyKey)}
                                                              className="w-full sm:w-auto text-seguranca-lightgray hover:text-white"
                                                          >
                                                              {companyExpanded ? <ChevronDown className="h-4 w-4 mr-2" /> : <ChevronRight className="h-4 w-4 mr-2" />}
                                                              {companyExpanded ? 'Ocultar setores' : 'Ver setores'}
                                                          </Button>
                                                      </div>
                                                  </div>
                                              </div>
                                              {companyExpanded && (
                                                  <div className="space-y-4">
                                                      {company.sectors && company.sectors.length > 0 ? (
                                                          company.sectors.map(sector => {
                                                              const sectorKey = getUnifiedSectorKey(companyKey, sector);
                                                              const sectorExpanded = !!expandedUnifiedSectors[sectorKey];
                                                              const sectorIndices = collectUnifiedSectorDocumentIndices(sector);
                                                              const sectorSelectedIndices = getSelectedUnifiedIndices(sectorIndices);
                                                              const sectorSelectedCount = sectorSelectedIndices.length;
                                                              const sectorCheckboxState: boolean | 'indeterminate' = sectorIndices.length === 0
                                                                ? false
                                                                : areUnifiedIndicesFullySelected(sectorIndices)
                                                                  ? true
                                                                  : sectorSelectedCount > 0
                                                                    ? 'indeterminate'
                                                                    : false;

                                                              return (
                                                                  <div key={sectorKey} className="rounded-xl border border-gray-800/60 bg-gray-900/50 overflow-hidden">
                                                                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-4 py-3">
                                                                          <div>
                                                                              <p className="text-sm font-semibold text-white">{sector.sectorName}</p>
                                                                              <p className="text-xs text-gray-400">
                                                                                  {sector.totalPayslips} documento(s) · {sector.periods?.length ?? 0} período(s)
                                                                              </p>
                                                                          </div>
                                                                          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                                                              {/* Checkbox "Selecionar setor" - só aparece se o setor NÃO estiver expandido */}
                                                                              {!sectorExpanded && (
                                                                                  <div className="flex items-center gap-2 bg-gray-800/70 rounded-lg px-3 py-2">
                                                                                      <Checkbox
                                                                                          checked={sectorCheckboxState}
                                                                                          onCheckedChange={(checked) => handleSelectUnifiedDocuments(sectorIndices, checked === true)}
                                                                                          className="border-blue-400"
                                                                                      />
                                                                                      <span className="text-xs text-gray-300">Selecionar setor</span>
                                                                                  </div>
                                                                              )}
                                                                              {/* Botões de ação em massa - só aparecem quando "Selecionar setor" está marcado E o setor NÃO está expandido */}
                                                                              {sectorSelectedCount > 0 && !sectorExpanded && (
                                                                                  <div className="flex flex-wrap gap-2 justify-end">
                                                                                      <Button
                                                                                          size="sm"
                                                                                          className="bg-green-600/90 text-white hover:bg-green-600"
                                                                                          onClick={() => {
                                                                                              setSelectedUnifiedDocuments(new Set(sectorSelectedIndices));
                                                                                              handleSendDocuments('email');
                                                                                          }}
                                                                                      >
                                                                                          <Mail className="h-4 w-4 mr-1" />
                                                                                          Email ({sectorSelectedCount})
                                                                                      </Button>
                                                                                      <Button
                                                                                          size="sm"
                                                                                          className="bg-blue-600/90 text-white hover:bg-blue-600"
                                                                                          onClick={() => {
                                                                                              setSelectedUnifiedDocuments(new Set(sectorSelectedIndices));
                                                                                              handleSendDocuments('whatsapp');
                                                                                          }}
                                                                                      >
                                                                                          <MessageSquare className="h-4 w-4 mr-1" />
                                                                                          WhatsApp ({sectorSelectedCount})
                                                                                      </Button>
                                                                                      <Button
                                                                                          size="sm"
                                                                                          variant="destructive"
                                                                                          className="bg-red-600/90 hover:bg-red-700 border-red-700"
                                                                                          onClick={() => {
                                                                                              setSelectedUnifiedDocuments(new Set(sectorSelectedIndices));
                                                                                              handleDeleteDocuments('batch');
                                                                                          }}
                                                                                      >
                                                                                          <Trash2 className="h-4 w-4 mr-1" />
                                                                                          Excluir ({sectorSelectedCount})
                                                                                      </Button>
                                                                                  </div>
                                                                              )}
                                                                              <Button
                                                                                  variant="ghost"
                                                                                  size="sm"
                                                                                  onClick={() => toggleUnifiedSectorExpansion(sectorKey)}
                                                                                  className="text-seguranca-lightgray hover:text-white"
                                                                              >
                                                                                  {sectorExpanded ? <ChevronDown className="h-4 w-4 mr-2" /> : <ChevronRight className="h-4 w-4 mr-2" />}
                                                                                  {sectorExpanded ? 'Ocultar períodos' : 'Ver períodos'}
                                                                              </Button>
                                                                          </div>
                                                                      </div>
                                                                      {sectorExpanded && (
                                                                          <div className="space-y-3 px-4 py-4 bg-gray-900/70">
                                                                              {sector.periods && sector.periods.length > 0 ? (
                                                                                  sector.periods.map(period => {
                                                                                      const periodKey = getUnifiedPeriodKey(sectorKey, period);
                                                                                      const periodExpanded = !!expandedUnifiedPeriods[periodKey];
                                                                                      const periodIndices = collectUnifiedPeriodDocumentIndices(period);
                                                                                      const periodSelectedIndices = getSelectedUnifiedIndices(periodIndices);
                                                                                      const periodSelectedCount = periodSelectedIndices.length;
                                                                                      const periodCheckboxState: boolean | 'indeterminate' = periodIndices.length === 0
                                                                                        ? false
                                                                                        : areUnifiedIndicesFullySelected(periodIndices)
                                                                                          ? true
                                                                                          : periodSelectedCount > 0
                                                                                            ? 'indeterminate'
                                                                                            : false;

                                                                                      return (
                                                                                          <div key={periodKey} className="rounded-xl border border-gray-800/60 bg-gray-900/60 overflow-hidden">
                                                                                              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-4 py-3">
                                                                                                  <div>
                                                                                                      <p className="text-sm font-semibold text-white">{period.formattedPeriod}</p>
                                                                                                      <p className="text-xs text-gray-400">{period.totalPayslips} documento(s)</p>
                                                                                                  </div>
                                                                                                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                                                                                      {/* Checkbox "Selecionar período" - só aparece se o período NÃO estiver expandido */}
                                                                                                      {!periodExpanded && (
                                                                                                          <div className="flex items-center gap-2 bg-gray-800/70 rounded-lg px-3 py-2">
                                                                                                              <Checkbox
                                                                                                                  checked={periodCheckboxState}
                                                                                                                  onCheckedChange={(checked) => handleSelectUnifiedDocuments(periodIndices, checked === true)}
                                                                                                                  className="border-blue-400"
                                                                                                              />
                                                                                                              <span className="text-xs text-gray-300">Selecionar período</span>
                                                                                                          </div>
                                                                                                      )}
                                                                                                      {/* Botões de ação em massa - só aparecem quando "Selecionar período" está marcado E o período NÃO está expandido */}
                                                                                                      {periodSelectedCount > 0 && !periodExpanded && (
                                                                                                          <div className="flex flex-wrap gap-2 justify-end">
                                                                                                              <Button
                                                                                                                  size="sm"
                                                                                                                  className="bg-green-600/90 text-white hover:bg-green-600"
                                                                                                                  onClick={() => {
                                                                                                                      setSelectedUnifiedDocuments(new Set(periodSelectedIndices));
                                                                                                                      handleSendDocuments('email');
                                                                                                                  }}
                                                                                                              >
                                                                                                                  <Mail className="h-4 w-4 mr-1" />
                                                                                                                  Email ({periodSelectedCount})
                                                                                                              </Button>
                                                                                                              <Button
                                                                                                                  size="sm"
                                                                                                                  className="bg-blue-600/90 text-white hover:bg-blue-600"
                                                                                                                  onClick={() => {
                                                                                                                      setSelectedUnifiedDocuments(new Set(periodSelectedIndices));
                                                                                                                      handleSendDocuments('whatsapp');
                                                                                                                  }}
                                                                                                              >
                                                                                                                  <MessageSquare className="h-4 w-4 mr-1" />
                                                                                                                  WhatsApp ({periodSelectedCount})
                                                                                                              </Button>
                                                                                                              <Button
                                                                                                                  size="sm"
                                                                                                                  variant="destructive"
                                                                                                                  className="bg-red-600/90 hover:bg-red-700 border-red-700"
                                                                                                                  onClick={() => {
                                                                                                                      setSelectedUnifiedDocuments(new Set(periodSelectedIndices));
                                                                                                                      handleDeleteDocuments('batch');
                                                                                                                  }}
                                                                                                              >
                                                                                                                  <Trash2 className="h-4 w-4 mr-1" />
                                                                                                                  Excluir ({periodSelectedCount})
                                                                                                              </Button>
                                                                                                          </div>
                                                                                                      )}
                                                                                                      <Button
                                                                                                          variant="ghost"
                                                                                                          size="sm"
                                                                                                          onClick={() => toggleUnifiedPeriodExpansion(periodKey)}
                                                                                                          className="text-seguranca-lightgray hover:text-white"
                                                                                                      >
                                                                                                          {periodExpanded ? <ChevronDown className="h-4 w-4 mr-2" /> : <ChevronRight className="h-4 w-4 mr-2" />}
                                                                                                          {periodExpanded ? 'Ocultar documentos' : 'Ver documentos'}
                                                                                                      </Button>
                                                                                                  </div>
                                                                                              </div>
                                                                                              {periodExpanded && (
                                                                                                  <div className="divide-y divide-gray-800 bg-gray-950/60">
                                                                                                      {period.payslips.map(entry => {
                                                                                                          const docIndex = unifiedDocuments.findIndex(d => d.fileName === entry.fileName);
                                                                                                          const isSelected = docIndex !== -1 && selectedUnifiedDocuments.has(docIndex);
                                                                                                          const doc = docIndex !== -1 ? unifiedDocuments[docIndex] : null;

                                                                                                          return (
                                                                                                              <div
                                                                                                                  key={entry.id}
                                                                                                                  className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-4 py-4"
                                                                                                              >
                                                                                                                  <div className="flex items-start gap-3 flex-1 min-w-0">
                                                                                                                      <Checkbox
                                                                                                                          checked={isSelected}
                                                                                                                          onCheckedChange={(checked) => {
                                                                                                                              if (docIndex !== -1) {
                                                                                                                                  handleSelectUnifiedDocuments([docIndex], checked === true);
                                                                                                                              }
                                                                                                                          }}
                                                                                                                          className="border-blue-400 mt-1"
                                                                                                                      />
                                                                                                                      <div className="flex-1 min-w-0">
                                                                                                                          <p className="text-sm font-semibold text-white">{entry.employeeName}</p>
                                                                                                                          <p className="text-xs text-gray-400">
                                                                                                                              CPF: {entry.cpf ? entry.cpf.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : 'Não informado'} · Arquivo: {entry.fileName}
                                                                                                                          </p>
                                                                                                                      </div>
                                                                                                                  </div>
                                                                                                                  <div className="flex flex-wrap gap-2">
                                                                                                                      {doc && (
                                                                                                                          <>
                                                                                                                              <Button
                                                                                                                                  size="sm"
                                                                                                                                  variant="outline"
                                                                                                                                  className="border-gray-600 text-seguranca-lightgray hover:bg-seguranca-black"
                                                                                                                                  onClick={() => openUnifiedViewer(doc, docIndex)}
                                                                                                                              >
                                                                                                                                  <Eye className="h-4 w-4 mr-1" />
                                                                                                                                  Visualizar
                                                                                                                              </Button>
                                                                                                                              <Button
                                                                                                                                  size="sm"
                                                                                                                                  variant="outline"
                                                                                                                                  className="border-gray-600 text-seguranca-lightgray hover:bg-seguranca-black"
                                                                                                                                  onClick={() => downloadUnifiedDocument(doc)}
                                                                                                                              >
                                                                                                                                  <Download className="h-4 w-4 mr-1" />
                                                                                                                                  Download
                                                                                                                              </Button>
                                                                                                                              {isSelected && (
                                                                                                                                  <>
                                                                                                                                      <Button
                                                                                                                                          size="sm"
                                                                                                                                          variant="outline"
                                                                                                                                          className="border-green-600 text-green-300 hover:bg-green-600/20"
                                                                                                                                          onClick={() => {
                                                                                                                                              setSelectedUnifiedDocuments(new Set([docIndex]));
                                                                                                                                              handleSendDocuments('email');
                                                                                                                                          }}
                                                                                                                                      >
                                                                                                                                          <Mail className="h-4 w-4 mr-1" />
                                                                                                                                          Email
                                                                                                                                      </Button>
                                                                                                                                      <Button
                                                                                                                                          size="sm"
                                                                                                                                          variant="outline"
                                                                                                                                          className="border-blue-600 text-blue-300 hover:bg-blue-600/20"
                                                                                                                                          onClick={() => {
                                                                                                                                              setSelectedUnifiedDocuments(new Set([docIndex]));
                                                                                                                                              handleSendDocuments('whatsapp');
                                                                                                                                          }}
                                                                                                                                      >
                                                                                                                                          <MessageSquare className="h-4 w-4 mr-1" />
                                                                                                                                          WhatsApp
                                                                                                                                      </Button>
                                                                                                                                  </>
                                                                                                                              )}
                                                                                                                              <Button
                                                                                                                                  size="sm"
                                                                                                                                  variant="outline"
                                                                                                                                  className="border-red-600 text-red-300 hover:bg-red-600/20"
                                                                                                                                  onClick={() => {
                                                                                                                                      if (docIndex !== -1) {
                                                                                                                                          handleDeleteDocuments('individual', docIndex);
                                                                                                                                      }
                                                                                                                                  }}
                                                                                                                              >
                                                                                                                                  <Trash2 className="h-4 w-4 mr-1" />
                                                                                                                                  Excluir
                                                                                                                              </Button>
                                                                                                                          </>
                                                                                                                      )}
                                                                                                                  </div>
                                                                                                              </div>
                                                                                                          );
                                                                                                      })}
                                                                                                  </div>
                                                                                              )}
                                                                                          </div>
                                                                                      );
                                                                                  })
                                                                              ) : (
                                                                                  <div className="rounded-xl border border-dashed border-gray-700 p-4 text-sm text-gray-400 text-center">
                                                                                      Nenhum período encontrado para este setor.
                                                                                  </div>
                                                                              )}
                                                                          </div>
                                                                      )}
                                                                  </div>
                                                              );
                                                          })
                                                      ) : (
                                                          <div className="rounded-xl border border-dashed border-gray-700 p-4 text-sm text-gray-400 text-center">
                                                              Nenhum setor encontrado para esta empresa.
                                                          </div>
                                                      )}
                                                  </div>
                                              )}
                                          </div>
                                      </div>
                                  );
                              })}
                          </div>
                      )}
                  </CardContent>
              </Card>
          </TabsContent>

          {/* Nova Aba: Logs de Envio */}
          <TabsContent value="logs-envio" className="space-y-6">
            <Card className="bg-seguranca-graphite border-gray-600">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-seguranca-lightgray flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Logs de Envio de Holerites e Documentos
                  </CardTitle>
                  {logs.length > 0 && (
                    <Badge className="bg-blue-500 text-white">
                      {logs.length} registro(s)
                    </Badge>
                  )}
                </div>
                <p className="text-gray-400 text-sm mt-2">
                  Histórico completo de envios por Email e WhatsApp
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <Input
                      placeholder="CPF"
                      value={logsCpf}
                      onChange={(e) => setLogsCpf(e.target.value)}
                      className="bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                    />
                  </div>
                  <div>
                    <Input
                      placeholder="Nome"
                      value={logsName}
                      onChange={(e) => setLogsName(e.target.value)}
                      className="bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                    />
                  </div>
                  <div>
                    <Select value={logsStatus} onValueChange={setLogsStatus}>
                      <SelectTrigger className="bg-seguranca-black border-gray-600 text-seguranca-lightgray">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="SUCCESS">Sucesso</SelectItem>
                        <SelectItem value="FAILED">Falhou</SelectItem>
                        <SelectItem value="PENDING">Pendente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Button
                      onClick={loadLogs}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      <Search className="w-4 h-4 mr-2" />
                      Buscar
                    </Button>
                  </div>
                </div>

                      {loadingLogs ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                    <span className="ml-2 text-muted-foreground">Carregando logs...</span>
                  </div>
                ) : logs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 bg-gray-700/50 rounded-2xl flex items-center justify-center mb-4">
                      <FileText className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-300 mb-2">
                      Nenhum log de envio encontrado
                    </h3>
                    <p className="text-gray-400 text-sm max-w-md mb-4">
                      {logsCpf || logsName || logsStatus !== 'todos' 
                        ? 'Não há registros com os filtros informados. Tente ajustar os critérios de busca.'
                        : 'Ainda não há registros de envio. Os logs aparecerão aqui após enviar holerites ou documentos unificados.'
                      }
                    </p>
                    <Button
                      onClick={() => {
                        setLogsCpf('');
                        setLogsName('');
                        setLogsStatus('todos');
                        setLogsMonth('');
                        setLogsYear('');
                        loadLogs();
                      }}
                      variant="outline"
                      className="border-gray-600 text-gray-300"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Limpar Filtros e Recarregar
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {logs.map((log, index) => (
                      <div key={index} className="p-4 bg-seguranca-black border border-gray-600 rounded-xl hover:border-gray-500 transition-colors">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3">
                            {/* Status Badge */}
                            <Badge 
                              className={
                                log.success 
                                  ? 'bg-green-500/20 text-green-400 border-green-500/40'
                                  : 'bg-red-500/20 text-red-400 border-red-500/40'
                              }
                            >
                              {log.success ? '✅ Enviado' : '❌ Falhou'}
                            </Badge>
                            
                            {/* Canal Badge */}
                            <Badge 
                              className={
                                log.channel === 'EMAIL' 
                                  ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                                  : 'bg-green-500/20 text-green-400 border-green-500/40'
                              }
                            >
                              {log.channel === 'EMAIL' ? '📧 Email' : '💬 WhatsApp'}
                            </Badge>
                          </div>
                          
                          {/* Data e Hora */}
                          <div className="flex items-center gap-2 text-gray-400 text-xs">
                            <Calendar size={14} />
                            <span>{new Date(log.createdAt || log.updatedAt).toLocaleString('pt-BR')}</span>
                          </div>
                        </div>
                        
                        {/* Informações do Funcionário */}
                        <div className="flex items-center gap-2 mb-2">
                          <User size={16} className="text-gray-400" />
                          <span className="text-white font-medium">{log.cpf}</span>
                          <span className="text-gray-400">•</span>
                          <span className="text-gray-300 text-sm">Período: {log.month}/{log.year}</span>
                        </div>
                        
                        {/* Mensagem de Erro */}
                        {!log.success && log.errorMessage && (
                          <div className="mt-2 p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
                            <p className="text-red-300 text-sm flex items-start gap-2">
                              <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                              <span>{log.errorMessage}</span>
                            </p>
                          </div>
                        )}
                        
                        {/* Tentativas */}
                        {log.attempts > 1 && (
                          <div className="mt-2 flex items-center gap-2 text-gray-400 text-xs">
                            <RefreshCw size={12} />
                            <span>{log.attempts} tentativa(s)</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Nova Aba: Unificados por Setor */}
          <TabsContent value="unificados-por-setor" className="space-y-6 mt-6">
            <UnificadosPorSetor />
          </TabsContent>

          {/* Nova Aba: Empresas (TASK 04) */}
          <TabsContent value="empresas" className="space-y-6 mt-6">
            {loadingCompanyTypeOrganization ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-seguranca-red" />
                <span className="ml-3 text-gray-300">Carregando organização por tipo de empresa...</span>
              </div>
            ) : companyTypeOrganizationError ? (
              <div className="rounded-2xl border border-red-600/60 bg-red-900/20 p-6 text-center">
                <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
                <p className="text-red-300 font-semibold">Erro ao carregar organização</p>
                <p className="text-red-200 text-sm mt-1">{companyTypeOrganizationError}</p>
                <Button
                  variant="outline"
                  className="mt-4 border-red-600 text-red-300 hover:bg-red-900/40"
                  onClick={() => fetchCompanyTypeOrganizationData(true)}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Tentar novamente
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Sub-abas: Terceirização, Vigilância e Administrativo */}
                <Tabs value={activeCompanyTypeTab} onValueChange={(value) => setActiveCompanyTypeTab(value as 'terceirizacao' | 'vigilancia' | 'administrativo')} className="w-full">
                  <TabsList className="grid w-full grid-cols-3 bg-seguranca-graphite border-gray-600">
                    <TabsTrigger value="terceirizacao" className="text-seguranca-lightgray data-[state='active']:bg-seguranca-red text-xs sm:text-sm">
                      Terceirização
                    </TabsTrigger>
                    <TabsTrigger value="vigilancia" className="text-seguranca-lightgray data-[state='active']:bg-seguranca-red text-xs sm:text-sm">
                      Vigilância
                    </TabsTrigger>
                    <TabsTrigger value="administrativo" className="text-seguranca-lightgray data-[state='active']:bg-seguranca-red text-xs sm:text-sm">
                      Administrativo
                    </TabsTrigger>
                  </TabsList>

                  {/* Conteúdo: Terceirização */}
                  <TabsContent value="terceirizacao" className="space-y-6 mt-6">
                    {renderCompanyTypeOrganizations(companyTypeOrganizationData?.terceirizacao, 'terceirizacao')}
                  </TabsContent>

                  {/* Conteúdo: Vigilância */}
                  <TabsContent value="vigilancia" className="space-y-6 mt-6">
                    {renderCompanyTypeOrganizations(companyTypeOrganizationData?.vigilancia, 'vigilancia')}
                  </TabsContent>

                  {/* Conteúdo: Administrativo */}
                  <TabsContent value="administrativo" className="space-y-6 mt-6">
                    {renderCompanyTypeOrganizations(companyTypeOrganizationData?.administrativo, 'administrativo')}
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </TabsContent>

        </Tabs>

        {/* Modais */}
        <HoleriteViewModal
          open={showViewModal}
          onOpenChange={setShowViewModal}
          payslip={selectedHolerite}
          onDownload={() => {
            if (selectedHolerite) {
              window.open(`/api/payslips/${selectedHolerite.id}/download`, '_blank');
            }
          }}
          onSendEmail={() => {
            if (selectedHolerite) {
              // Implementar envio por email
              toast({
                title: "Funcionalidade em desenvolvimento",
                description: "Envio por email será implementado em breve.",
              });
            }
          }}
        />

        <HoleriteDeleteDialog
          open={showDeleteModal}
          onOpenChange={setShowDeleteModal}
          holerites={selectedHolerite ? [selectedHolerite] : []}
          onConfirm={confirmDeleteHolerite}
          isLoading={isDeleting}
        />

        {/* Modal de Confirmação para Exclusão em Lote */}
        <Dialog
          open={showBatchDeleteModal}
          onOpenChange={(open) => {
            if (!open) {
              setPendingDeleteIds(null);
            }
            setShowBatchDeleteModal(open);
          }}
        >
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Confirmar Exclusão em Lote
              </DialogTitle>
              <DialogDescription>
                Tem certeza que deseja excluir <strong>{idsPendingDeletion.length} holerite(s)</strong> selecionado(s)?
                <br /><br />
                Esta ação não pode ser desfeita e todos os holerites selecionados serão permanentemente removidos.
              </DialogDescription>
            </DialogHeader>
            
            {/* Avisos */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-red-800">
                  <p className="font-medium">Atenção:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Esta ação é irreversível</li>
                    <li>Os arquivos serão permanentemente removidos</li>
                    <li>O histórico de envios será perdido</li>
                    <li>Não será possível recuperar os dados excluídos</li>
                  </ul>
                  </div>
                  </div>
                </div>
                
            {/* Lista dos holerites selecionados */}
            <div className="space-y-2 max-h-32 overflow-y-auto">
              <p className="text-sm text-gray-600 mb-2">Holerites selecionados:</p>
              {idsPendingDeletion.map((holeriteId) => {
                const holerite = holerites.find(h => h.id === holeriteId);
                return holerite ? (
                  <div key={holeriteId} className="flex items-center space-x-2 text-sm p-2 bg-gray-50 rounded">
                    <FileText className="w-4 h-4 text-gray-400" />
                    <span className="truncate">{holerite.employeeName} - {holerite.month}/{holerite.year}</span>
                  </div>
                ) : null;
              })}
              </div>

            <DialogFooter>
                    <Button
                      variant="outline"
                onClick={() => setShowBatchDeleteModal(false)}
                disabled={isDeleting}
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar
                    </Button>
                    <Button
                variant="destructive" 
                onClick={confirmBatchDeleteHolerites}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir {idsPendingDeletion.length} Holerite(s)
                  </>
                )}
                    </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de Unificação em Lote */}
        <Dialog open={showBatchUnificationModal} onOpenChange={setShowBatchUnificationModal}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Unificação em Lote</DialogTitle>
              <DialogDescription>
                Configure os parâmetros para unificação em massa dos documentos.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="month" className="text-right">
                  Mês
                </Label>
                <Select value={batchUnificationMonth} onValueChange={setBatchUnificationMonth}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Selecione o mês" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                      <SelectItem key={month} value={month.toString()}>
                        {new Date(2024, month - 1).toLocaleString('pt-BR', { month: 'long' })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                  </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="year" className="text-right">
                  Ano
                </Label>
                <Select value={batchUnificationYear} onValueChange={setBatchUnificationYear}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Selecione o ano" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2025">2025</SelectItem>
                  </SelectContent>
                </Select>
                </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="forceUnification"
                  checked={batchUnificationForce}
                  onCheckedChange={(checked) => setBatchUnificationForce(checked === true)}
                />
                <Label htmlFor="forceUnification" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Forçar unificação mesmo com nomes diferentes
                </Label>
                           </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBatchUnificationModal(false)}>
                Cancelar
              </Button>
              <Button onClick={handleBatchUnification} disabled={processingBatchUnification}>
                {processingBatchUnification ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  'Iniciar Unificação'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de Resultado da Unificação em Lote */}
        <Dialog open={showBatchResultModal} onOpenChange={setShowBatchResultModal}>
          <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Resultado da Unificação em Lote</DialogTitle>
              <DialogDescription>
                Relatório detalhado do processamento em lote.
              </DialogDescription>
            </DialogHeader>
            {batchUnificationResult && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{batchUnificationResult.totalProcessed}</div>
                    <div className="text-sm text-blue-800">Total Processado</div>
                                 </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{batchUnificationResult.totalSuccess}</div>
                    <div className="text-sm text-green-800">Sucessos</div>
                               </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{batchUnificationResult.totalFailed}</div>
                    <div className="text-sm text-red-800">Falhas</div>
                               </div>
                             </div>
                             
                {batchUnificationResult.successList.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-green-800 mb-2">✅ Sucessos ({batchUnificationResult.successList.length})</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {batchUnificationResult.successList.map((item, index) => (
                        <div key={index} className="p-2 bg-green-50 border border-green-200 rounded text-sm">
                          <div className="font-medium text-green-800">{item.employeeName}</div>
                          <div className="text-green-600">{item.fileName}</div>
                                 </div>
                      ))}
                               </div>
                               </div>
                )}

                {batchUnificationResult.failureList.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-red-800 mb-2">âŒ Falhas ({batchUnificationResult.failureList.length})</h4>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {batchUnificationResult.failureList.map((item, index) => {
                        const message = item.message || item.error || 'Erro desconhecido';
                        const isReceiptNotFound = message.includes('Nenhum comprovante encontrado') || 
                                                  (message.includes('comprovante') && message.includes('não encontrado'));
                        
                        return (
                          <div key={index} className="p-4 bg-red-50 border border-red-300 rounded-lg text-sm shadow-sm">
                            {/* Cabeçalho do Item */}
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <div className="font-semibold text-red-900 text-base mb-1">
                                  {item.employeeName}
                                </div>
                                {item.month && item.year && (
                                  <div className="text-xs text-gray-600 mb-2">
                                    📅 Período do Holerite: {item.month}/{item.year}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Status dos Documentos */}
                            <div className="grid grid-cols-2 gap-2 mb-3">
                              <div className={`p-2 rounded ${item.holeriteFound === '✅ Sim' ? 'bg-green-100 border border-green-300' : 'bg-gray-100 border border-gray-300'}`}>
                                <div className="text-xs text-gray-600 mb-1">Holerite</div>
                                <div className={`font-medium ${item.holeriteFound === '✅ Sim' ? 'text-green-700' : 'text-gray-600'}`}>
                                  {item.holeriteFound === '✅ Sim' ? '✓ Encontrado' : '✗ Não encontrado'}
                                </div>
                              </div>
                              <div className={`p-2 rounded ${item.receiptFound === '✅ Sim' ? 'bg-green-100 border border-green-300' : 'bg-red-100 border border-red-300'}`}>
                                <div className="text-xs text-gray-600 mb-1">Comprovante</div>
                                <div className={`font-medium ${item.receiptFound === '✅ Sim' ? 'text-green-700' : 'text-red-700'}`}>
                                  {item.receiptFound === '✅ Sim' ? '✓ Encontrado' : '✗ Não encontrado'}
                                </div>
                              </div>
                            </div>

                            {/* Mensagem de Erro Detalhada */}
                            {isReceiptNotFound && (
                              <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-2">
                                <div className="font-semibold text-yellow-800 mb-2 flex items-center gap-2">
                                  <span>⚠️</span>
                                  <span>Explicação do Problema</span>
                                </div>
                                <div className="text-xs text-yellow-900 whitespace-pre-line space-y-2">
                                  {message.split('\n').map((line, lineIndex) => {
                                    if (line.startsWith('O sistema procurou')) {
                                      return (
                                        <div key={lineIndex} className="font-medium mt-2">
                                          {line}
                                        </div>
                                      );
                                    } else if (line.startsWith('•')) {
                                      return (
                                        <div key={lineIndex} className="ml-4 text-gray-700 font-mono text-xs">
                                          {line}
                                        </div>
                                      );
                                    } else if (line.startsWith('POSSÍVEIS CAUSAS:') || line.startsWith('AÇÃO NECESSÁRIA:')) {
                                      return (
                                        <div key={lineIndex} className="font-semibold mt-2 text-yellow-900">
                                          {line}
                                        </div>
                                      );
                                    } else if (line.match(/^\d+\./)) {
                                      return (
                                        <div key={lineIndex} className="ml-2 text-gray-700">
                                          {line}
                                        </div>
                                      );
                                    } else if (line.trim()) {
                                      return (
                                        <div key={lineIndex} className="text-gray-700">
                                          {line}
                                        </div>
                                      );
                                    }
                                    return null;
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Mensagem de Erro Simples (se não for comprovante não encontrado) */}
                            {!isReceiptNotFound && (
                              <div className="text-red-700 font-medium bg-red-100 p-2 rounded">
                                {message}
                              </div>
                            )}
                          </div>
                        );
                      })}
                               </div>
                             </div>
                )}

                <div className="text-sm text-gray-600">
                  Tempo de processamento: {batchUnificationResult.processingTimeMs}ms
                           </div>
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => setShowBatchResultModal(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de Envio de Documentos */}
        <Dialog open={showSendModal} onOpenChange={setShowSendModal}>
          <DialogContent className="w-[92vw] sm:w-[560px] md:w-[72vw] lg:w-[60vw] xl:w-[50vw] p-0 overflow-hidden">
            <DialogHeader className="px-5 pt-5 pb-2 border-b border-gray-800 bg-seguranca-black/60">
              <DialogTitle className="flex items-center gap-2 text-seguranca-lightgray">
                {sendType === 'email' ? (
                  <>
                    <Mail className="h-4 w-4 text-blue-400" /> Enviar por Email
                  </>
                ) : (
                  <>
                    <MessageSquare className="h-4 w-4 text-green-400" /> Enviar por WhatsApp
                  </>
                )}
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-gray-400">
                {sendType === 'email' 
                  ? 'Os documentos selecionados serão enviados por email.'
                  : 'Os documentos selecionados serão enviados por WhatsApp.'}
              </DialogDescription>
            </DialogHeader>

            <div className="px-5 py-4">
              {/* Resumo */}
              <div className="text-xs sm:text-sm text-gray-300 mb-3">
                <span className="font-medium text-seguranca-yellow">{selectedUnifiedDocuments.size}</span> documento(s) selecionado(s) serão enviados.
              </div>

              {/* Lista scrollável dos itens */}
              <div className="max-h-[45vh] overflow-y-auto rounded-md border border-gray-800 bg-seguranca-black/40 p-3 space-y-3">
                {getSelectedDocuments().map((doc, index) => (
                  <div key={index} className="flex items-start gap-3 text-xs sm:text-sm text-gray-300">
                    <FileText className="min-w-[16px] h-4 w-4 mt-0.5 text-gray-500" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-seguranca-lightgray break-words whitespace-normal" title={`${doc.employeeName} - ${doc.fileName}`}>
                        {doc.employeeName}
                      </div>
                      <div className="text-gray-500 break-words whitespace-normal" title={doc.fileName}>
                        {doc.fileName}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter className="px-5 pb-5 flex-col sm:flex-row gap-2 sm:gap-0 sm:justify-between">
              <Button variant="outline" onClick={() => setShowSendModal(false)} className="w-full sm:w-auto">
                Cancelar
              </Button>
              <Button 
                onClick={executeSendDocuments} 
                disabled={sendingDocuments}
                className={sendType === 'email' ? 'w-full sm:w-auto bg-blue-600 hover:bg-blue-700' : 'w-full sm:w-auto bg-green-600 hover:bg-green-700'}
              >
                {sendingDocuments ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>{sendType === 'email' ? 'Enviar Emails' : 'Enviar WhatsApp'}</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de Upload de Holerites */}
        <HoleriteUpload
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          onUploadSuccess={loadHolerites}
        />

        {/* Modal de Upload de Comprovantes de Pagamento */}
        <Dialog open={showPaymentReceiptUploadModal} onOpenChange={setShowPaymentReceiptUploadModal}>
          <DialogContent className="sm:max-w-[800px] bg-seguranca-graphite border-gray-600">
            <DialogHeader>
              <DialogTitle className="text-seguranca-lightgray">Upload de Comprovantes de Pagamento</DialogTitle>
              <DialogDescription className="text-gray-400">
                Importe comprovantes de pagamento de salário em PDF para processamento automático
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="flex flex-col gap-2">
                <label htmlFor="payment-receipt-file" className="text-seguranca-lightgray">Arquivo PDF de Comprovante</label>
                <div className="flex items-center gap-2">
                  <Input
                    id="payment-receipt-file"
                    type="file"
                    accept=".pdf"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        // Validar se já existem documentos do período antes de processar
                        if (validatePeriodBeforeUpload('comprovante', file)) {
                          await handlePaymentReceiptUpload(file);
                        }
                        // Se houver duplicatas, o arquivo fica pendente e será processado após confirmação
                        // Limpar o input
                        e.target.value = '';
                      }
                    }}
                    disabled={processingPaymentReceipts}
                    className="bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                  />
                </div>
              </div>
              
              <div className="bg-seguranca-black p-4 rounded-lg">
                <h4 className="font-medium mb-2 text-seguranca-lightgray">Como funciona:</h4>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li>• O PDF será processado automaticamente no servidor</li>
                  <li>• Os dados do comprovante serão extraídos usando OCR</li>
                  <li>• Informações como nome, CPF, valor e data serão identificadas</li>
                  <li>• O comprovante será salvo e organizado por período</li>
                </ul>
              </div>

              {processingPaymentReceipts && (
                <div className="flex items-center justify-center gap-3 p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
                  <span className="text-blue-300">Processando comprovante de pagamento...</span>
                </div>
              )}
              
              <div className="flex justify-end gap-2 mt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setShowPaymentReceiptUploadModal(false)} 
                  disabled={processingPaymentReceipts}
                  className="border-gray-600 text-seguranca-lightgray"
                >
                  Fechar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal de Visualização de Holerite */}
        {showViewModal && selectedHolerite && (
          <HoleriteViewModal
            holerite={selectedHolerite}
            onClose={() => {
              setShowViewModal(false);
              setSelectedHolerite(null);
            }}
            onSendEmail={() => {
              if (selectedHolerite) {
                setShowViewModal(false);
                handleEmailHolerite(selectedHolerite);
              }
            }}
            onSendWhatsApp={() => {
              if (selectedHolerite) {
                handleSendWhatsAppIndividual(selectedHolerite);
              }
            }}
          />
        )}

        {/* Modal de Email de Holerite */}
        {showEmailModal && selectedHolerite && (
          <HoleriteEmailModal
            holerite={selectedHolerite}
            onClose={() => {
              setShowEmailModal(false);
              setSelectedHolerite(null);
            }}
            onSuccess={loadHolerites}
          />
        )}

        {/* Modal de Visualização de Comprovante de Pagamento */}
        <PaymentReceiptViewModal
          open={showPaymentReceiptViewModal}
          onOpenChange={(open) => {
            setShowPaymentReceiptViewModal(open);
            if (!open) {
              setSelectedPaymentReceiptForView(null);
            }
          }}
          receipt={selectedPaymentReceiptForView}
          onDownload={handleDownloadPaymentReceipt}
        />

        {/* Modal de Validação de Contatos */}
        {showValidationModal && (
          <ContactValidationModal
            open={showValidationModal}
            onClose={() => setShowValidationModal(false)}
            employeeIds={resolvedEmployeeIds}
            sendType={validationSendType}
            onValidated={handleValidated}
          />
        )}

        {/* Modal de Atualização de WhatsApp */}
        {showSingleWhatsappModal && (
          <WhatsAppUpdateModal
            open={showSingleWhatsappModal}
            onClose={() => {
            setShowSingleWhatsappModal(false);
            setSelectedValidationDetail(null);
            setPendingWhatsappContext(null);
          }}
            employeeDetail={selectedValidationDetail}
            onSuccess={async () => {
              const context = pendingWhatsappContext;
              setShowSingleWhatsappModal(false);
              setSelectedValidationDetail(null);
              if (context?.payslip) {
                setPendingWhatsappContext(null);
                await handleSendWhatsAppIndividual(context.payslip);
              } else {
                setPendingWhatsappContext(null);
              }
            }}
          />
        )}

        {/* Modal de Formulário Rápido */}
        {showSingleUserModal && selectedValidationDetail && (
          <QuickUserFormModal
            isOpen={showSingleUserModal}
            onClose={() => {
              setShowSingleUserModal(false);
              setSelectedValidationDetail(null);
            }}
            employeeId={selectedValidationDetail.employeeId}
            employeeName={selectedValidationDetail.employeeName}
            onSuccess={() => {
              setShowSingleUserModal(false);
              setSelectedValidationDetail(null);
            }}
          />
        )}

        {showSingleConsentModal && selectedValidationDetail && (
          <WhatsAppConsentConfirmationModal
            open={showSingleConsentModal}
            onClose={handleConsentModalClose}
            employeeDetail={selectedValidationDetail}
            onConsentGranted={handleConsentGranted}
          />
        )}

        {/* Modal de Exclusão de Documento Unificado */}
        <Dialog open={showUnifiedDeleteModal} onOpenChange={setShowUnifiedDeleteModal}>
          <DialogContent className="sm:max-w-[425px] bg-seguranca-graphite border-red-600/50">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-400">
                <AlertTriangle size={24} className="text-red-400" />
                Excluir Documento
              </DialogTitle>
              <DialogDescription className="text-gray-300">
                {deleteType === 'individual' 
                  ? 'Tem certeza que deseja excluir este documento unificado?'
                  : `Tem certeza que deseja excluir ${selectedUnifiedDocuments.size} documento(s) unificado(s)?`
                }
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <p className="text-red-300 text-sm flex items-start gap-2">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                  <span>
                    Esta ação não pode ser desfeita. O documento será permanentemente removido do sistema.
                  </span>
                </p>
              </div>

              {deletingDocuments && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Progresso:</span>
                    <span className="text-white font-semibold">
                      {deleteProgress.completed + deleteProgress.failed} / {deleteProgress.total}
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-red-500 to-pink-600 h-2 transition-all duration-300"
                      style={{ 
                        width: `${((deleteProgress.completed + deleteProgress.failed) / deleteProgress.total) * 100}%` 
                      }}
                    />
                  </div>
                  {deleteProgress.current && (
                    <p className="text-xs text-gray-400 truncate">
                      Excluindo: {deleteProgress.current}
                    </p>
                  )}
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setShowUnifiedDeleteModal(false)}
                disabled={deletingDocuments}
                className="border-gray-600 text-seguranca-lightgray"
              >
                Cancelar
              </Button>
              <Button 
                onClick={executeDeleteDocuments}
                disabled={deletingDocuments}
                className="bg-red-600 hover:bg-red-700"
              >
                {deletingDocuments ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de Visualização de Documento Unificado */}
        {showUnifiedViewerModal && viewerDocument && viewerUrl && (
          <Dialog open={showUnifiedViewerModal} onOpenChange={handleUnifiedViewerOpenChange}>
            <DialogContent className="w-[95vw] h-[95vh] sm:w-[90vw] sm:h-[90vh] lg:max-w-6xl lg:max-h-[90vh] bg-gradient-to-br from-seguranca-graphite via-seguranca-black to-seguranca-graphite border border-purple-600/50 rounded-2xl p-0 overflow-hidden">
              <DialogHeader className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-b border-purple-500/20 p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center space-x-3 sm:space-x-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <Eye size={20} className="sm:hidden text-white" />
                      <Eye size={24} className="hidden sm:block text-white" />
                    </div>
                    <div>
                      <DialogTitle className="text-lg sm:text-2xl font-bold text-white leading-tight">
                        Documento Unificado
                      </DialogTitle>
                      <p className="text-purple-300/90 text-xs sm:text-sm font-medium mt-0 truncate max-w-[200px] sm:max-w-none">
                        {viewerDocument.employeeName || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <Badge className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold rounded-xl border bg-purple-500/20 text-purple-300 border-purple-500/40">
                    📄 Unificado
                  </Badge>
                </div>
              </DialogHeader>

              <div className="flex flex-col lg:flex-row h-full overflow-hidden">
                {/* Informações do Documento */}
                <div className="w-full lg:w-1/3 p-4 sm:p-6 border-b lg:border-b-0 lg:border-r border-gray-600/30 bg-seguranca-black/30 max-h-[40vh] lg:max-h-none overflow-y-auto">
                  <div className="space-y-4 sm:space-y-6">
                    <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Informações do Documento</h3>
                    
                    {/* Nome do Funcionário */}
                    {viewerDocument.employeeName && (
                      <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-xl p-3 sm:p-4">
                        <div className="flex items-center space-x-2 sm:space-x-3">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                            <User size={16} className="sm:hidden text-white" />
                            <User size={18} className="hidden sm:block text-white" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-purple-300/80 text-xs sm:text-sm font-medium">Funcionário</p>
                            <p className="text-white font-semibold text-sm sm:text-base truncate">{viewerDocument.employeeName}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Período */}
                    {(viewerDocument.month || viewerDocument.year) && (
                      <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-xl p-3 sm:p-4">
                        <div className="flex items-center space-x-2 sm:space-x-3">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center flex-shrink-0">
                            <Calendar size={16} className="sm:hidden text-white" />
                            <Calendar size={18} className="hidden sm:block text-white" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-yellow-300/80 text-xs sm:text-sm font-medium">Período</p>
                            <p className="text-white font-semibold text-sm sm:text-base">
                              {viewerDocument.month || '?'}/{viewerDocument.year || '?'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Arquivo */}
                    <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-xl p-3 sm:p-4">
                      <div className="flex items-center space-x-2 sm:space-x-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                          <FileText size={16} className="sm:hidden text-white" />
                          <FileText size={18} className="hidden sm:block text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-cyan-300/80 text-xs sm:text-sm font-medium">Arquivo</p>
                          <p className="text-white font-semibold text-sm sm:text-base truncate" title={viewerDocument.fileName}>{viewerDocument.fileName}</p>
                        </div>
                      </div>
                    </div>

                    {/* Tamanho do Arquivo */}
                    {viewerDocument.fileSize && (
                      <div className="bg-gradient-to-r from-gray-500/10 to-slate-500/10 border border-gray-500/20 rounded-xl p-3 sm:p-4">
                        <div className="flex items-center space-x-2 sm:space-x-3">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-gray-500 to-slate-600 rounded-xl flex items-center justify-center flex-shrink-0">
                            <FileText size={16} className="sm:hidden text-white" />
                            <FileText size={18} className="hidden sm:block text-white" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-gray-300/80 text-xs sm:text-sm font-medium">Tamanho</p>
                            <p className="text-white font-semibold text-sm sm:text-base">
                              {(viewerDocument.fileSize / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Botões de Ação */}
                    <div className="space-y-2 sm:space-y-3 pt-2 sm:pt-4">
                      <Button
                        onClick={() => downloadUnifiedDocument(viewerDocument)}
                        className="w-full bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white font-semibold py-2.5 sm:py-3 rounded-xl shadow-lg hover:shadow-purple-500/25 transition-all duration-300 text-sm sm:text-base"
                      >
                        <Download size={16} className="sm:hidden mr-1.5" />
                        <Download size={18} className="hidden sm:block mr-2" />
                        <span className="hidden sm:inline">Baixar Documento</span>
                        <span className="sm:hidden">Baixar</span>
                      </Button>
                      
                      {viewerDocument?.cpf && (
                        <>
                          <Button
                            onClick={async () => {
                              const filteredDocs = getFilteredUnifiedDocuments();
                              const docIndex = filteredDocs.findIndex(d => d.fileName === viewerDocument.fileName);
                              if (docIndex !== -1) {
                                await sendSingleDocument('email', docIndex);
                              }
                            }}
                            className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white font-semibold py-2.5 sm:py-3 rounded-xl shadow-lg hover:shadow-blue-500/25 transition-all duration-300 text-sm sm:text-base"
                          >
                            <Mail size={16} className="sm:hidden mr-1.5" />
                            <Mail size={18} className="hidden sm:block mr-2" />
                            <span className="hidden sm:inline">Enviar Email</span>
                            <span className="sm:hidden">Email</span>
                          </Button>
                          
                          <Button
                            onClick={async () => {
                              const filteredDocs = getFilteredUnifiedDocuments();
                              const docIndex = filteredDocs.findIndex(d => d.fileName === viewerDocument.fileName);
                              if (docIndex !== -1) {
                                await sendSingleDocument('whatsapp', docIndex);
                              }
                            }}
                            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-2.5 sm:py-3 rounded-xl shadow-lg hover:shadow-green-500/25 transition-all duration-300 text-sm sm:text-base"
                          >
                            <MessageSquare size={16} className="sm:hidden mr-1.5" />
                            <MessageSquare size={18} className="hidden sm:block mr-2" />
                            <span className="hidden sm:inline">Enviar WhatsApp</span>
                            <span className="sm:hidden">WhatsApp</span>
                          </Button>
                        </>
                      )}
                      
                      {!viewerDocument?.cpf && (
                        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                          <p className="text-yellow-300 text-xs sm:text-sm flex items-start gap-2">
                            <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                            <span>
                              Documento sem CPF. Envio bloqueado para evitar enviar para a pessoa errada.
                            </span>
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Área do PDF */}
                <div className="w-full lg:w-2/3 p-3 sm:p-6 bg-gradient-to-br from-gray-900/50 to-gray-800/50 flex flex-col h-[60vh] lg:h-full">
                  {/* Visualizador PDF */}
                  <div className="flex-1 rounded-xl overflow-hidden border border-gray-600/30 bg-white min-h-0">
                    <iframe
                      src={viewerUrl}
                      className="w-full h-full border-0 rounded-xl"
                      title={`Documento Unificado - ${viewerDocument.employeeName}`}
                    />
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Modal de Aviso de Sobrescrita de Período */}
        <Dialog open={showDuplicatePeriodModal} onOpenChange={setShowDuplicatePeriodModal}>
          <DialogContent className="sm:max-w-[500px] bg-seguranca-graphite border-orange-600">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-orange-400">
                <AlertTriangle size={24} className="text-orange-400" />
                Sobrescrever Período Existente?
              </DialogTitle>
              <DialogDescription className="text-gray-300">
                Já existem documentos processados para este período
              </DialogDescription>
            </DialogHeader>
            
            {duplicatePeriodInfo && (
              <div className="space-y-4">
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-orange-400 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-orange-300 mb-2">
                        {duplicatePeriodInfo.count} {duplicatePeriodInfo.type === 'holerite' ? 'holerite(s)' : 'comprovante(s)'} já processado(s)
                      </h4>
                      <p className="text-gray-300 text-sm mb-3">
                        {duplicatePeriodInfo.type === 'holerite' 
                          ? 'Foram encontrados holerites já importados para os seguintes períodos:'
                          : `Já existem ${duplicatePeriodInfo.count} comprovante(s) processado(s) para:`
                        }
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {duplicatePeriodInfo.periods.map((period, idx) => (
                          <Badge key={idx} variant="outline" className="border-orange-500/50 text-orange-300 bg-orange-500/10">
                            📅 {period}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                  <h4 className="font-semibold text-red-300 mb-2 flex items-center gap-2">
                    <AlertTriangle size={16} />
                    Atenção: Sobrescrita de Dados
                  </h4>
                  <p className="text-gray-300 text-sm">
                    Se você continuar com a importação, os {duplicatePeriodInfo.count} {duplicatePeriodInfo.type === 'holerite' ? 'holerite(s)' : 'comprovante(s)'} existente(s) 
                    <span className="text-red-300 font-semibold"> serão permanentemente substituídos</span> pelos novos documentos que você está importando.
                  </p>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                  <p className="text-blue-300 text-sm flex items-start gap-2">
                    <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                    <span>
                      <strong>Recomendação:</strong> Verifique se os novos documentos estão corretos antes de continuar. Esta ação não pode ser desfeita.
                    </span>
                  </p>
                </div>
              </div>
            )}
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowDuplicatePeriodModal(false);
                  setDuplicatePeriodInfo(null);
                  setPendingUploadFile(null);
                }}
                disabled={overwritingPeriod}
                className="border-gray-600 text-seguranca-lightgray"
              >
                Cancelar
              </Button>
              <Button 
                onClick={async () => {
                  // Processar o arquivo pendente
                  if (pendingUploadFile && duplicatePeriodInfo) {
                    try {
                      setOverwritingPeriod(true);
                      
                      toast({
                        title: "Processando...",
                        description: "Excluindo documentos existentes e importando novos...",
                      });
                      
                      // Fechar o modal
                      setShowDuplicatePeriodModal(false);
                      
                      // Excluir documentos existentes do período
                      if (duplicatePeriodInfo.type === 'comprovante') {
                        // Excluir todos os comprovantes do período
                        const receiptsToDelete = paymentReceipts.filter(r => 
                          r.year === parseInt(batchUnificationYear) && r.month === parseInt(batchUnificationMonth));
                        for (const receipt of receiptsToDelete) {
                          try {
                            await paymentReceiptService.deletePaymentReceipt(receipt.id);
                          } catch (err) {
                            console.warn('Erro ao excluir duplicado existente:', err);
                          }
                        }
                      }
                      
                      // Adicionar novos comprovantes
                      for (const newReceipt of processedReceipts) {
                        try {
                          await paymentReceiptService.createPaymentReceipt(newReceipt);
                        } catch (err) {
                          console.warn('Erro ao criar novo comprovante:', err);
                        }
                      }
                      
                      // Adicionar novos holerites
                      for (const newHolerite of holerites) {
                        try {
                          await holeriteService.createHolerite(newHolerite);
                        } catch (err) {
                          console.warn('Erro ao criar novo holerite:', err);
                        }
                      }
                      
                      // Adicionar novos recibos
                      for (const newRecibo of recibosProcessados) {
                        try {
                          await holeriteService.createReceipt(newRecibo);
                        } catch (err) {
                          console.warn('Erro ao criar novo recibo:', err);
                        }
                      }
                      
                      // Adicionar novos documentos unificados
                      for (const newUnification of individualUnifications) {
                        try {
                          await unifiedDocumentService.createUnifiedDocument(newUnification);
                        } catch (err) {
                          console.warn('Erro ao criar novo documento unificado:', err);
                        }
                      }
                      
                      // Atualizar lista de documentos unificados
                      await fetchUnifiedDocuments(true);
                      await loadUnifiedOrganization();
                      
                      toast({
                        title: "Sucesso",
                        description: `Novos documentos importados com sucesso!`,
                      });
                    } catch (error) {
                      console.error('Erro ao processar importação:', error);
                      toast({
                        title: "Erro",
                        description: "Erro ao processar importação. Tente novamente.",
                        variant: "destructive"
                      });
                    }
                  }
                }}
                disabled={overwritingPeriod}
                className="bg-green-500 hover:bg-green-600 text-white"
              >
                {overwritingPeriod ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Plus size={20} className="mr-2" />
                    Importar Novos Documentos
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </StandardLayout>
  );
};

export default Holerites;
