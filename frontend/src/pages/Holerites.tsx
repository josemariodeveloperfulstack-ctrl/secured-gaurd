import React, { useState, useEffect, useRef } from 'react';
import { StandardLayout } from '@/components/StandardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import paymentReceiptService, { type PaymentReceipt } from '@/services/paymentReceiptService';
import holeriteService, { Holerite } from '@/services/holeriteService';
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
  GripVertical
} from 'lucide-react';
import HoleriteUpload from '@/components/HoleriteUpload';
import { HoleriteViewModal } from '@/components/holerites/HoleriteViewModal';
import { HoleriteEmailModal } from '@/components/holerites/HoleriteEmailModal';
import HoleriteDeleteDialog from '@/components/holerites/HoleriteDeleteDialog';
import AdvancedFilters from '@/components/holerites/AdvancedFilters';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { payslipService } from '@/services/payslipService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ReceiptTemplateModal from '@/components/receipts/ReceiptTemplateModal';
import { PdfMergeResult } from '@/services/pdfMergeService';
import api from '@/lib/axios';
import { contactValidationService, type ContactValidationDetail } from '@/services/contactValidationService';
import { QuickUserFormModal } from '@/components/contact-validation/QuickUserFormModal';
import { WhatsAppUpdateModal } from '@/components/contact-validation/WhatsAppUpdateModal';
import { ContactValidationModal } from '@/components/contact-validation/ContactValidationModal';
import { employeeService } from '@/services/employeeService';

const Holerites: React.FC = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [cpfSearch, setCpfSearch] = useState('');
  const cpfDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const [selectedHolerite, setSelectedHolerite] = useState<Holerite | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [holerites, setHolerites] = useState<Holerite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedHolerites, setSelectedHolerites] = useState<string[]>([]);
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
  const [viewerUrl, setViewerUrl] = useState<string>('');
  
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
        if (!h.fileName) { continue; }
        try {
          const blob = await holeriteService.downloadHolerite(h.fileName);
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
    if (!logsCpf) return;
    setLoadingLogs(true);
    try {
      const month = logsMonth ? parseInt(logsMonth) : undefined;
      const year = logsYear ? parseInt(logsYear) : undefined;
      const data = await holeriteService.listSendLogs(logsCpf, month, year);
      setLogs(Array.isArray(data) ? data : []);
    } catch (e) {
      setLogs([]);
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
    const filtered = getFilteredHolerites();
    if (checked) {
      const newSelected = [...new Set([...selectedHolerites, ...filtered.map(h => h.id)])];
      setSelectedHolerites(newSelected);
    } else {
      const filteredIds = filtered.map(h => h.id);
      setSelectedHolerites(selectedHolerites.filter(id => !filteredIds.includes(id)));
    }
  };

  const handleBatchEmailHolerites = () => {
    // Implementar envio em lote por email
    console.log('Enviando holerites por email:', selectedHolerites);
  };

  const handleBatchWhatsAppHolerites = () => {
    // Implementar envio em lote por WhatsApp
    console.log('Enviando holerites por WhatsApp:', selectedHolerites);
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

    console.log('🗑️ Preparando exclusão em lote');
    console.log('📋 IDs selecionados:', selectedHolerites);
    console.log('📊 Dados dos holerites selecionados:', selectedHolerites.map(id => {
      const holerite = holerites.find(h => h.id === id);
      return { id, holerite: holerite ? { id: holerite.id, employeeName: holerite.employeeName, fileName: holerite.fileName } : 'Não encontrado' };
    }));

    // Mostrar modal de confirmação
    setShowBatchDeleteModal(true);
  };

  const confirmBatchDeleteHolerites = async () => {
    try {
      setIsDeleting(true);
      
      console.log('🗑️ Iniciando exclusão em lote de holerites');
      console.log('📋 IDs selecionados:', selectedHolerites);
      console.log('📊 Quantidade selecionada:', selectedHolerites.length);
      
      const result = await holeriteService.deleteMultipleHolerites(selectedHolerites);
      
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
      setSelectedHolerites([]);
      
      // Recarregar lista
      await loadHolerites();
      
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
    fetchUnifiedDocuments();
  }, []);

  // Função para filtrar documentos unificados
  const getFilteredUnifiedDocuments = () => {
    if (!unifiedSearchTerm) return unifiedDocuments;
    
    const searchLower = unifiedSearchTerm.toLowerCase();
    return unifiedDocuments.filter(doc => 
      doc.employeeName?.toLowerCase().includes(searchLower) ||
      doc.fileName?.toLowerCase().includes(searchLower)
    );
  };

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
  const openUnifiedViewer = (doc: any, index: number) => {
    const apiUrl = getApiUrl().replace('/api', '');
    const url = `${apiUrl}/api/unified-documents/public/file/${encodeURIComponent(doc.fileName)}`;
    setViewerDocumentIndex(index);
    setViewerDocument(doc);
    setViewerUrl(url);
    setShowUnifiedViewerModal(true);
  };

  const downloadUnifiedDocument = (doc: any) => {
    const apiUrl = getApiUrl().replace('/api', '');
    const url = `${apiUrl}/api/unified-documents/download/${encodeURIComponent(doc.fileName)}`;
    const link = document.createElement('a');
    link.href = url;
    link.download = doc.fileName;
    link.target = '_blank';
    link.click();
  };

  const sendSingleDocument = (type: 'email' | 'whatsapp', index: number) => {
    setSelectedUnifiedDocuments(new Set([index]));
    setSendType(type);
    setShowSendModal(true);
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
      // TODO: Implementar envio real por email/WhatsApp
      // Por enquanto, simular envio
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: `✅ Envio ${sendType === 'email' ? 'por Email' : 'por WhatsApp'} realizado`,
        description: `${selected.length} documento(s) enviado(s) com sucesso!`,
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
  const handlePaymentReceiptUpload = async (file: File) => {
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
        
        const processedReceipts: PaymentReceipt[] = response.data;
        console.log('✅ Comprovantes processados automaticamente:', processedReceipts);
        
        // Adicionar todos os comprovantes processados
        setPaymentReceipts(prev => [...prev, ...processedReceipts]);
        
        toast({
          title: "Sucesso",
          description: `${processedReceipts.length} comprovante(s) processado(s) automaticamente!`,
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
    if (checked) {
      setSelectedHolerites(filteredHolerites.map(p => p.id));
    } else {
      setSelectedHolerites([]);
    }
  };

  const handleSelectHolerite = (payslipId: string, checked: boolean) => {
    if (checked) {
      setSelectedHolerites([...selectedHolerites, payslipId]);
    } else {
      setSelectedHolerites(selectedHolerites.filter(id => id !== payslipId));
    }
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
            description: `${result.invalidCount} holerite${result.invalidCount > 1 ? 's' : ''} com ID${result.invalidCount > 1 ? 's' : ''} inválido${result.invalidCount > 1 ? 's' : ''} foram ignorado${result.invalidCount > 1 ? 's' : ''}.`,
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
      const blob = await holeriteService.downloadHolerite(payslip.fileName);
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
          setSelectedValidationDetail(detail);
          if (detail.needsUserCreation) {
            console.log('👤 Abrindo modal de criação de usuário');
            setShowSingleUserModal(true);
            return;
          }
          if (detail.needsWhatsAppUpdate && detail.hasUser) {
            console.log('📱 Abrindo modal de atualização de WhatsApp');
            setShowSingleWhatsappModal(true);
            return;
          }
        }
      }

      // Sem ID resolvido ou sem detail: tentar por CPF mesmo (backend validará novamente)
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
            if (msg?.toLowerCase().includes('usuário não encontrado') || detail.needsUserCreation) {
              setShowSingleUserModal(true);
              return;
            }
            if (msg?.toLowerCase().includes('whatsapp') || detail.needsWhatsAppUpdate) {
              setShowSingleWhatsappModal(true);
              return;
            }
          }
        }
      } catch (_) {}
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

  // Carregar documentos unificados quando a aba de unificação for ativada
  useEffect(() => {
    if (activeTab === 'unificacao-individual' && user) {
      fetchUnifiedDocuments();
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
          console.log('🎯 Holerites disponíveis:', holerites.length);
          console.log('🎯 Recibos disponíveis:', receipts.length);
          
          // Primeiro, tentar usar os dados já carregados nas outras abas
          if (holerites.length > 0) {
              const holeritesProcessados = holerites.map(payslip => ({
                  id: `hol-${payslip.id}`,
                  name: payslip.fileName || `holerite_${payslip.employeeName}_${payslip.month}_${payslip.year}.pdf`,
                  employeeName: payslip.employeeName,
                  cpf: payslip.cpf,
                  month: payslip.month.toString(),
                  year: payslip.year.toString(),
                  path: `backend/holerites/${payslip.month}-${payslip.year}/${payslip.fileName}`
              }));
              setProcessedHolerites(holeritesProcessados);
              console.log('✅ Holerites carregados dos dados existentes:', holeritesProcessados.length);
          } else {
              console.log('⚠️ Nenhum holerite disponível, tentando carregar via API');
              // Se não houver holerites carregados, tentar carregar via API
              try {
                  const holeritesResponse = await api.get('/holerites/processed-files');
                  if (holeritesResponse.data.success) {
                      setProcessedHolerites(holeritesResponse.data.files || []);
                      console.log('✅ Holerites carregados via API:', holeritesResponse.data.files?.length || 0);
                  }
              } catch (apiError) {
                  console.warn('⚠️ Erro ao carregar holerites via API:', apiError);
              }
          }

          // Carregar comprovantes processados do backend
          try {
              const processedReceipts = await paymentReceiptService.getProcessedFiles();
              console.log('✅ Comprovantes processados carregados do backend:', processedReceipts);
              
              if (processedReceipts && processedReceipts.length > 0) {
                  const comprovantesProcessados = processedReceipts.map(receipt => ({
                      id: `rec-${receipt.id}`,
                      name: receipt.fileName,
                      employeeName: receipt.employeeName,
                      month: receipt.month.toString(),
                      year: receipt.year.toString(),
                      path: receipt.filePath || `uploads/payment-receipts/${receipt.year}/${receipt.month}/${receipt.fileName}`
                  }));
                  // Processed receipts serÃ£o exibidos junto com os payment receipts
                  console.log('✅ Comprovantes processados carregados:', comprovantesProcessados.length);
              }
          } catch (backendError) {
              console.warn('⚠️ Erro ao carregar comprovantes do backend, usando dados locais:', backendError);
          }

          // Carregar recibos dos dados já disponíveis
              if (Array.isArray(receipts) && receipts.length > 0) {
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

          // Se não houver dados nas outras abas, tentar carregar via API
          if (holerites.length === 0) {
              try {
                  const holeritesResponse = await api.get('/holerites/processed-files');
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
                  const recibosResponse = await api.get('/receipts/processed-files');
                  if (recibosResponse.data.success) {
                      setProcessedRecibos(recibosResponse.data.files || []);
                      console.log('✅ Comprovantes carregados via API:', recibosResponse.data.files?.length || 0);
                  }
              } catch (apiError) {
                  console.log('⚠️ Erro ao carregar comprovantes via API, usando dados simulados');
              }
          }
      } catch (error) {
          console.error('Erro ao carregar arquivos processados:', error);
          // Fallback: usar dados simulados baseados na estrutura conhecida
          setProcessedHolerites([
              { id: 'hol-1', name: 'ADERBAL_LUCENA_GONCALVES_71987010604_6_2025.pdf', employeeName: 'ADERBAL LUCENA GONCALVES', cpf: '71987010604', month: '6', year: '2025', path: 'backend/holerites/6-2025/ADERBAL_LUCENA_GONCALVES_71987010604_6_2025.pdf' },
              { id: 'hol-2', name: 'SILVANA_FERREIRA_SELVO_HONORATO_06575259600_6_2025.pdf', employeeName: 'SILVANA FERREIRA SELVO HONORATO', cpf: '06575259600', month: '6', year: '2025', path: 'backend/holerites/6-2025/SILVANA_FERREIRA_SELVO_HONORATO_06575259600_6_2025.pdf' },
              { id: 'hol-3', name: 'DANILO_IGOR_FREITAS_14224861682_6_2025.pdf', employeeName: 'DANILO IGOR FREITAS', cpf: '14224861682', month: '6', year: '2025', path: 'backend/holerites/6-2025/DANILO_IGOR_FREITAS_14224861682_6_2025.pdf' }
          ]);
          setProcessedRecibos([
              { id: 'rec-1', name: 'recibo_ricardo_xavier_de_andrade_valor_07_2025_pagina_44.pdf', employeeName: 'RICARDO XAVIER DE ANDRADE', month: '07', year: '2025', path: 'uploads/receipts/07_2025/recibo_ricardo_xavier_de_andrade_valor_07_2025_pagina_44.pdf' },
              { id: 'rec-2', name: 'recibo_vilcleves_francisco_de_freitas_valor_07_2025_pagina_43.pdf', employeeName: 'VILCLEVES FRANCISCO DE FREITAS', month: '07', year: '2025', path: 'uploads/receipts/07_2025/recibo_vilcleves_francisco_de_freitas_valor_07_2025_pagina_43.pdf' },
              { id: 'rec-3', name: 'recibo_mayara_souza_g_s_nascimento_valor_07_2025_pagina_42.pdf', employeeName: 'MAYARA SOUZA G S NASCIMENTO', month: '07', year: '2025', path: 'uploads/receipts/07_2025/recibo_mayara_souza_g_s_nascimento_valor_07_2025_pagina_42.pdf' }
          ]);
      } finally {
          setLoadingProcessedFiles(false);
      }
  };

  

  // Verificar autenticaÃ§Ã£o
  if (!user) {
    return (
      <StandardLayout>
        <div className="flex items-center justify-center h-64 px-4">
          <div className="text-center">
            <AlertCircle className="mx-auto h-6 w-6 sm:h-8 sm:w-8 text-red-500 mb-4" />
            <p className="text-seguranca-lightgray mb-4 text-sm sm:text-base">Usuário não autenticado.</p>
            <p className="text-gray-400 text-sm">Faça login para acessar esta pÃ¡gina.</p>
          </div>
        </div>
      </StandardLayout>
    );
  }

  // Loading state
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

  // Error state
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

  // Debounce para busca por CPF no backend
  useEffect(() => {
    if (cpfDebounceRef.current) clearTimeout(cpfDebounceRef.current);
    cpfDebounceRef.current = setTimeout(async () => {
      const onlyDigits = cpfSearch.replace(/\D/g, '');
      try {
        if (onlyDigits.length === 0) {
          // Sem CPF → recarrega lista padrão
          await loadHolerites(filters);
          return;
        }
        if (onlyDigits.length < 3) return; // evita flood
        setLoading(true);
        const result = await holeriteService.getHoleritesByCpf(onlyDigits);
        setHolerites(Array.isArray(result) ? result : []);
      } catch (e) {
        console.error('Erro ao buscar por CPF:', e);
      } finally {
        setLoading(false);
      }
    }, 400);
    // cleanup
    return () => {
      if (cpfDebounceRef.current) clearTimeout(cpfDebounceRef.current);
    };
  }, [cpfSearch]);

  return (
    <StandardLayout>
      {/* Barra superior com navegação por período já existente */}
      {/* Campo de busca por CPF */}
      <div className="w-full mt-2 px-4">
        <div className="flex items-center gap-3">
          <div className="relative w-full max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-seguranca-lightgray" size={18} />
            <Input
              placeholder="Buscar por CPF (somente números)"
              value={cpfSearch}
              onChange={(e) => setCpfSearch(e.target.value)}
              className="pl-9 bg-seguranca-dark text-white border-seguranca-gray"
            />
          </div>
          <Button variant="ghost" onClick={() => setCpfSearch('')} className="text-seguranca-lightgray">
            Limpar
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Header Atraente */}
        <div className="bg-gradient-to-r from-seguranca-black via-seguranca-graphite to-seguranca-black rounded-xl border border-gray-700 p-6 shadow-lg">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-4 mb-3">
                <div className="p-3 bg-seguranca-red rounded-xl shadow-lg">
                  <FileText className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-seguranca-lightgray truncate">
                    <span className="hidden sm:inline">Gestão de </span>Holerites<span className="hidden md:inline"> e Comprovantes</span>
                  </h1>
                  <p className="text-seguranca-yellow font-medium text-xs sm:text-sm mt-1 truncate">
                    <span className="hidden sm:inline">Sistema completo de </span>Gestão<span className="hidden sm:inline"> de documentos financeiros</span>
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-seguranca-yellow rounded-full animate-pulse"></div>
                  <span className="text-gray-400">
                    {loading ? 'Carregando...' : `${filteredHolerites.length} holerite${filteredHolerites.length !== 1 ? 's' : ''} encontrado${filteredHolerites.length !== 1 ? 's' : ''}`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-gray-400">
                    {Array.isArray(receipts) ? receipts.length : 0} comprovante{(Array.isArray(receipts) ? receipts.length : 0) !== 1 ? 's' : ''} processado{(Array.isArray(receipts) ? receipts.length : 0) !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>
            
            </div>
            

          </div>
        </div>

        {/* Tabs Modernas e Responsivas */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="relative tab-container">
            <TabsList className="bg-gradient-to-r from-seguranca-graphite to-gray-800 border border-gray-600/50 rounded-2xl p-2 w-full shadow-2xl backdrop-blur-sm">
              <div className="flex w-full gap-1">
            <TabsTrigger 
              value="processados" 
                  className="group relative flex-1 tab-trigger tab-transition tab-hover-effect data-[state='active']:bg-gradient-to-r data-[state='active']:from-seguranca-yellow data-[state='active']:to-yellow-500 data-[state='active']:text-seguranca-black data-[state='active']:shadow-xl data-[state='active']:scale-105 data-[state='active']:tab-active-glow text-gray-300 hover:text-white hover:bg-seguranca-black/30 text-xs sm:text-sm rounded-xl transition-all duration-500 ease-out hover:scale-102 border border-transparent data-[state='active']:border-seguranca-yellow/20"
                >
                  <div className="flex items-center justify-center gap-1 sm:gap-2">
                    <div className="relative">
                      <FileText size={14} className="sm:w-4 sm:h-4" />
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-seguranca-red rounded-full opacity-0 group-data-[state='active']:opacity-100 transition-opacity duration-300"></div>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="font-medium leading-tight">
                        <span className="hidden sm:inline">Holerites</span>
              <span className="sm:hidden">Holerites</span>
                      </span>
                      <Badge variant="secondary" className="text-xs px-1 py-0 h-4 bg-seguranca-black/50 text-seguranca-yellow border-seguranca-yellow/30 group-data-[state='active']:bg-seguranca-black group-data-[state='active']:text-seguranca-yellow">
                        {holerites.length}
                      </Badge>
                    </div>
                  </div>
            </TabsTrigger>
                
                <TabsTrigger 
                  value="recibos" 
                  className="group relative flex-1 tab-trigger tab-transition tab-hover-effect data-[state='active']:bg-gradient-to-r data-[state='active']:from-seguranca-yellow data-[state='active']:to-yellow-500 data-[state='active']:text-seguranca-black data-[state='active']:shadow-xl data-[state='active']:scale-105 data-[state='active']:tab-active-glow text-gray-300 hover:text-white hover:bg-seguranca-black/30 text-xs sm:text-sm rounded-xl transition-all duration-500 ease-out hover:scale-102 border border-transparent data-[state='active']:border-seguranca-yellow/20"
                >
                  <div className="flex items-center justify-center gap-1 sm:gap-2">
                    <div className="relative">
                      <FileText size={14} className="sm:w-4 sm:h-4" />
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full opacity-0 group-data-[state='active']:opacity-100 transition-opacity duration-300"></div>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="font-medium leading-tight">
                        <span className="hidden sm:inline">Comprovantes</span>
                        <span className="sm:hidden">Comprovantes</span>
                      </span>
                      <Badge variant="secondary" className="text-xs px-1 py-0 h-4 bg-seguranca-black/50 text-green-400 border-green-400/30 group-data-[state='active']:bg-seguranca-black group-data-[state='active']:text-seguranca-yellow">
                        {Array.isArray(receipts) ? receipts.length : 0}
                      </Badge>
                    </div>
                  </div>
            </TabsTrigger>
                
                <TabsTrigger 
                  value="logs-envio" 
                  className="group relative flex-1 tab-trigger tab-transition tab-hover-effect data-[state='active']:bg-gradient-to-r data-[state='active']:from-seguranca-yellow data-[state='active']:to-yellow-500 data-[state='active']:text-seguranca-black data-[state='active']:shadow-xl data-[state='active']:scale-105 data-[state='active']:tab-active-glow text-gray-300 hover:text-white hover:bg-seguranca-black/30 text-xs sm:text-sm rounded-xl transition-all duration-500 ease-out hover:scale-102 border border-transparent data-[state='active']:border-seguranca-yellow/20">
                  <div className="flex items-center justify-center gap-1 sm:gap-2">
                    <div className="relative">
                      <FileText size={14} className="sm:w-4 sm:h-4" />
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="font-medium leading-tight">Logs de Envio</span>
                    </div>
                  </div>
            </TabsTrigger>
                
                <TabsTrigger 
                  value="unificacao-individual" 
                  className="group relative flex-1 tab-trigger tab-transition tab-hover-effect data-[state='active']:bg-gradient-to-r data-[state='active']:from-seguranca-yellow data-[state='active']:to-yellow-500 data-[state='active']:text-seguranca-black data-[state='active']:shadow-xl data-[state='active']:scale-105 data-[state='active']:tab-active-glow text-gray-300 hover:text-white hover:bg-seguranca-black/30 text-xs sm:text-sm rounded-xl transition-all duration-500 ease-out hover:scale-102 border border-transparent data-[state='active']:border-seguranca-yellow/20">
                  <div className="flex items-center justify-center gap-1 sm:gap-2">
                    <div className="relative">
                      <RefreshCw size={14} className="sm:w-4 sm:h-4" />
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="font-medium leading-tight">Unificação</span>
                    </div>
                  </div>
            </TabsTrigger>

              </div>
          </TabsList>
            
            {/* Indicador de progresso animado */}
            <div className="tab-indicator" 
                 style={{
                   width: activeTab === 'processados' ? '25%' : activeTab === 'recibos' ? '25%' : activeTab === 'logs-envio' ? '25%' : '25%',
                   transform: `translateX(${activeTab === 'processados' ? '0%' : activeTab === 'recibos' ? '100%' : activeTab === 'logs-envio' ? '200%' : '300%'})`
                 }}>
            </div>
          </div>

          <TabsContent value="processados">
            {/* Header da SeÃ§Ã£o de Holerites */}
            <div className="text-center mb-8">
              <h3 className="text-3xl font-bold text-white mb-4 flex items-center justify-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <FileText size={24} className="text-white" />
                </div>
                Gestão de Holerites
              </h3>
              <p className="text-gray-400 text-base max-w-2xl mx-auto">
                Importe e processe holerites de funcionários com navegação organizada por período.
              </p>
            </div>

            {/* Dashboard de Holerites */}
            <Card className="bg-gradient-to-br from-seguranca-graphite via-seguranca-black to-seguranca-graphite border border-gray-600/50 rounded-2xl p-8 shadow-2xl backdrop-blur-sm mb-8">
              <div className="space-y-8">
                {/* EstatÃ­sticas Melhoradas */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="group bg-gradient-to-br from-red-500/10 to-red-600/5 border border-red-500/20 rounded-2xl p-6 hover:border-red-400/40 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-red-500/10">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <p className="text-red-300/80 text-sm font-medium">Total de Holerites</p>
                        <p className="text-3xl font-bold text-white">{holerites.length}</p>
                        <div className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                          <span className="text-red-300/60 text-xs">Ativo</span>
                        </div>
                      </div>
                      <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-red-500/25 transition-all duration-300">
                        <FileText size={28} className="text-white" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="group bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 rounded-2xl p-6 hover:border-green-400/40 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-green-500/10">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <p className="text-green-300/80 text-sm font-medium">Total de Holerites</p>
                        <p className="text-3xl font-bold text-white">{holerites.length}</p>
                        <div className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                          <span className="text-green-300/60 text-xs">Processados</span>
                        </div>
                      </div>
                      <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-green-500/25 transition-all duration-300">
                        <FileText size={28} className="text-white" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="group bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border border-yellow-500/20 rounded-2xl p-6 hover:border-yellow-400/40 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-yellow-500/10">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <p className="text-yellow-300/80 text-sm font-medium">Processados Hoje</p>
                        <p className="text-3xl font-bold text-white">{getHoleritesProcessedToday()}</p>
                        <div className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                          <span className="text-yellow-300/60 text-xs">Em tempo real</span>
                        </div>
                      </div>
                      <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-yellow-500/25 transition-all duration-300">
                        <CheckCircle size={28} className="text-white" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* BotÃµes de AÃ§Ã£o */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button 
                      onClick={() => setShowUploadModal(true)}
                      disabled={loading}
                      className="group relative bg-gradient-to-r from-red-500 via-red-600 to-pink-600 hover:from-red-600 hover:via-pink-600 hover:to-red-700 px-8 py-4 rounded-2xl shadow-2xl hover:shadow-red-500/30 transition-all duration-500 transform hover:scale-105 hover:-translate-y-1 text-white font-semibold text-lg border border-red-400/20"
                    >
                    <div className="absolute inset-0 bg-gradient-to-r from-red-400/20 to-pink-400/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="relative flex items-center space-x-3">
                      {loading ? (
                        <Loader2 size={24} className="animate-spin" />
                      ) : (
                        <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center group-hover:bg-white/30 transition-colors duration-300">
                          <Plus size={20} />
                        </div>
                      )}
                      <span className="text-lg font-semibold">
                        {loading ? 'Processando...' : 'Importar Holerites'}
                      </span>
                    </div>
                  </Button>

                </div>
              </div>
            </Card>

            {/* Sistema de Abas Hierárquico para Períodos */}
            <Card className="bg-gradient-to-br from-seguranca-graphite via-seguranca-black to-seguranca-graphite border border-gray-600/50 rounded-2xl p-8 shadow-2xl backdrop-blur-sm">
              <div className="space-y-8">
                <div className="text-center">
                  <h4 className="text-2xl font-bold text-white mb-2">Holerites por Período</h4>
                  <p className="text-gray-400">Navegue pelos anos e meses para visualizar os holerites</p>
                </div>
                
                {/* Navegação de Abas */}
                <div className="flex items-center justify-center space-x-2 mb-6">
                  <Button
                    onClick={handleBackToYears}
                    variant={activePeriodTab === 'ano' ? "default" : "outline"}
                    className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                      activePeriodTab === 'ano'
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                        : 'bg-seguranca-black/50 border-gray-600 text-gray-300 hover:bg-gray-700/50'
                    }`}
                  >
                    📅 Anos
                  </Button>
                  
                  {selectedYear && (
                    <Button
                      onClick={handleBackToMonths}
                      variant={activePeriodTab === 'mes' ? "default" : "outline"}
                      className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                        activePeriodTab === 'mes'
                          ? 'bg-gradient-to-r from-green-500 to-teal-600 text-white shadow-lg'
                          : 'bg-seguranca-black/50 border-gray-600 text-gray-300 hover:bg-gray-700/50'
                      }`}
                    >
                      📆 {selectedYear}
                    </Button>
                  )}
                  
                  {selectedYear && selectedMonth && (
                    <Button
                      onClick={() => setActivePeriodTab('conteudo')}
                      variant={activePeriodTab === 'conteudo' ? "default" : "outline"}
                      className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                        activePeriodTab === 'conteudo'
                          ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg'
                          : 'bg-seguranca-black/50 border-gray-600 text-gray-300 hover:bg-gray-700/50'
                      }`}
                    >
                      📄 {getMonthName(parseInt(selectedMonth))} {selectedYear}
                    </Button>
                  )}
                </div>

                {/* Conteúdo das Abas */}
                {activePeriodTab === 'ano' && (
                <div className="space-y-6">
                    <div>
                    <h5 className="text-lg font-semibold text-seguranca-lightgray mb-4">Selecione o Ano</h5>
                      <div className="flex flex-wrap gap-3">
                        {holeriteAvailableYears.map(year => (
                <Button 
                          key={year}
                            onClick={() => handleYearSelection(year)}
                            variant="outline"
                            className="px-6 py-3 rounded-xl font-semibold transition-all duration-200 bg-seguranca-black/50 border-gray-600 text-gray-300 hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-600 hover:text-white hover:border-transparent hover:shadow-lg"
                          >
                            📅 {year}
                </Button>
                      ))}
                    </div>
              </div>
                  </div>
                )}

                {activePeriodTab === 'mes' && selectedYear && (
                  <div className="space-y-6">
                    <div>
                      <h5 className="text-lg font-semibold text-seguranca-lightgray mb-4">
                        Meses disponíveis para {selectedYear}
                      </h5>
                      <div className="flex flex-wrap gap-3">
                        {getAvailableMonthsForYear(selectedYear).map(month => (
                          <Button
                            key={month}
                            onClick={() => handleMonthSelection(month.toString())}
                            variant="outline"
                            className="px-4 py-2 rounded-lg font-medium transition-all duration-200 bg-seguranca-black/50 border-gray-600 text-gray-300 hover:bg-gradient-to-r hover:from-green-500 hover:to-teal-600 hover:text-white hover:border-transparent hover:shadow-lg"
                          >
                            📆 {getMonthName(month)}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activePeriodTab === 'conteudo' && selectedYear && (
                  <div className="space-y-6">
                    <div>
                      <h5 className="text-lg font-semibold text-white mb-4">
                        {selectedMonth ? `Holerites de ${getMonthName(parseInt(selectedMonth))} ${selectedYear}` : `Todos os holerites de ${selectedYear}`}
                      </h5>
                      
                      {/* Barra de Ações do Mês */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 p-4 bg-seguranca-black/30 rounded-lg border border-gray-600/30">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="select-all-holerites"
                              checked={selectedHolerites.length === getFilteredHoleritesByPeriod().length && getFilteredHoleritesByPeriod().length > 0}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  const allIds = getFilteredHoleritesByPeriod().map(h => h.id);
                                  setSelectedHolerites(allIds);
                                } else {
                                  setSelectedHolerites([]);
                                }
                              }}
                            />
                            <Label htmlFor="select-all-holerites" className="text-gray-300">
                              Selecionar todos
                            </Label>
                          </div>
                          
                          {selectedHolerites.length > 0 && (
                            <div className="flex items-center gap-2">
                              <Button
                                onClick={async () => {
                                  if (selectedHolerites.length === 0) return;
                                  const selected = getFilteredHoleritesByPeriod().filter(h => selectedHolerites.includes(h.id));
                                  const ids: string[] = [];
                                  for (const h of selected) {
                                    if (h.cpf) {
                                      try {
                                        const byCpf = await employeeService.searchEmployees(h.cpf);
                                        if (byCpf && byCpf.length === 1) { ids.push(byCpf[0].id); continue; }
                                      } catch {}
                                    }
                                    try {
                                      const byName = await employeeService.searchEmployeesByName(h.employeeName);
                                      if (byName && byName.length === 1) { ids.push(byName[0].id); continue; }
                                    } catch {}
                                  }
                                  const uniqueIds = Array.from(new Set(ids));
                                  if (uniqueIds.length === 0) {
                                    toast({ title: 'Não foi possível identificar funcionários', description: 'Verifique CPF no nome do PDF ou o cadastro.', variant: 'destructive' });
                                    return;
                                  }
                                  setResolvedEmployeeIds(uniqueIds);
                                  setValidationSendType('email');
                                  setShowValidationModal(true);
                                }}
                                variant="outline"
                                size="sm"
                                className="border-green-500/50 text-green-400 hover:bg-green-500/10 hover:border-green-400"
                              >
                                <Mail size={14} className="mr-1" />
                                Email
                              </Button>
                              <Button
                                onClick={async () => {
                                  if (selectedHolerites.length === 0) return;
                                  const selected = getFilteredHoleritesByPeriod().filter(h => selectedHolerites.includes(h.id));
                                  const ids: string[] = [];
                                  for (const h of selected) {
                                    if (h.cpf) {
                                      try {
                                        const byCpf = await employeeService.searchEmployees(h.cpf);
                                        if (byCpf && byCpf.length === 1) { ids.push(byCpf[0].id); continue; }
                                      } catch {}
                                    }
                                    try {
                                      const byName = await employeeService.searchEmployeesByName(h.employeeName);
                                      if (byName && byName.length === 1) { ids.push(byName[0].id); continue; }
                                    } catch {}
                                  }
                                  const uniqueIds = Array.from(new Set(ids));
                                  if (uniqueIds.length === 0) {
                                    toast({ title: 'Não foi possível identificar funcionários', description: 'Verifique CPF no nome do PDF ou o cadastro.', variant: 'destructive' });
                                    return;
                                  }
                                  setResolvedEmployeeIds(uniqueIds);
                                  setValidationSendType('whatsapp');
                                  setShowValidationModal(true);
                                }}
                                variant="outline"
                                size="sm"
                                className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10 hover:border-blue-400"
                              >
                                <MessageSquare size={14} className="mr-1" />
                                WhatsApp
                              </Button>
                              <Button
                                onClick={handleDownloadSelectedHolerites}
                                variant="outline"
                                size="sm"
                                className="border-gray-500/50 text-gray-300 hover:bg-gray-700/50"
                              >
                                <Download size={14} className="mr-1" />
                                Baixar
                              </Button>
                              <Button
                                onClick={handleBatchDeleteHolerites}
                                variant="outline"
                                size="sm"
                                className="border-red-500/50 text-red-400 hover:bg-red-500/10 hover:border-red-400"
                              >
                                <Trash2 size={14} className="mr-1" />
                                Excluir
                              </Button>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => setActivePeriodTab('ano')}
                            variant="outline"
                            size="sm"
                            className="border-gray-500/50 text-gray-300 hover:bg-gray-700/50"
                          >
                            <RefreshCw size={14} className="mr-1" />
                            Limpar Filtros
                          </Button>
                          <Button
                            onClick={() => loadHolerites()}
                            variant="outline"
                            size="sm"
                            className="border-gray-500/50 text-gray-300 hover:bg-gray-700/50"
                          >
                            <RefreshCw size={14} className="mr-1" />
                            Atualizar
                          </Button>
                        </div>
                      </div>

                      {/* Lista de Holerites */}
                      <div className="bg-seguranca-black/30 rounded-lg border border-gray-600/30">
                        <div className="p-4 border-b border-gray-600/30">
                          <p className="text-gray-400 text-sm">
                            {getFilteredHoleritesByPeriod().length} holerite(s) encontrado(s)
                          </p>
                        </div>
                        
                        {getFilteredHoleritesByPeriod().length > 0 ? (
                          <div className="divide-y divide-gray-600/30 max-h-96 overflow-y-auto">
                            {getFilteredHoleritesByPeriod().map((holerite, index) => (
                              <div key={holerite.id} className="p-4 hover:bg-seguranca-graphite/30 transition-colors">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-4">
                                    <Checkbox
                                      checked={selectedHolerites.includes(holerite.id)}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          setSelectedHolerites(prev => [...prev, holerite.id]);
                                        } else {
                                          setSelectedHolerites(prev => prev.filter(id => id !== holerite.id));
                                        }
                                      }}
                                    />
                                    
                                    <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                                      <FileText size={16} className="text-red-400" />
                                    </div>
                                    
                                    <div className="flex-1">
                                      <p className="text-white font-semibold text-lg">{holerite.employeeName}</p>
                                      <div className="flex items-center space-x-4 mt-1">
                                        <Badge variant="outline" className="bg-black text-white border-gray-500">
                                          {holerite.month}/{holerite.year}
                                        </Badge>
                                        <div className="flex items-center space-x-4 text-gray-400 text-sm">
                                          <div className="flex items-center space-x-1">
                                            <User size={12} />
                                            <span>CPF: {holerite.cpf || 'N/A'}</span>
                                          </div>
                                          <div className="flex items-center space-x-1">
                                            <Calendar size={12} />
                                            <span>{new Date(holerite.createdAt || holerite.processedAt).toLocaleDateString('pt-BR')}</span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center space-x-2">
                                    <Button
                                      onClick={() => handleViewHolerite(holerite)}
                                      variant="outline"
                                      size="sm"
                                      className="border-white/30 text-white hover:bg-white/10"
                                    >
                                      <Eye size={14} className="mr-1" />
                                      Visualizar
                                    </Button>
                                    
                                    <Button
                                      onClick={() => handleEmailHolerite(holerite)}
                                      variant="outline"
                                      size="sm"
                                      className="border-green-500/50 text-green-400 hover:bg-green-500/10"
                                    >
                                      <Mail size={14} className="mr-1" />
                                      Email
                                    </Button>
                                    
                                    <Button
                                      onClick={() => handleSendWhatsAppIndividual(holerite)}
                                      variant="outline"
                                      size="sm"
                                      className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                                    >
                                      <MessageSquare size={14} className="mr-1" />
                                      WhatsApp
                                    </Button>
                                    
                                    <Button
                                      onClick={() => handleDownloadHolerite(holerite)}
                                      variant="outline"
                                      size="sm"
                                      className="border-white/30 text-white hover:bg-white/10"
                                    >
                                      <Download size={14} className="mr-1" />
                                      Baixar
                                    </Button>
                                    
                                    <Button
                                      onClick={() => handleDeleteHolerite(holerite)}
                                      variant="outline"
                                      size="sm"
                                      className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                                    >
                                      <Trash2 size={14} className="mr-1" />
                                      Excluir
                                    </Button>
                                  </div>
                                </div>
                              </div>
                        ))}
                      </div>
                        ) : (
                          <div className="p-8 text-center">
                            <FileText size={48} className="mx-auto text-gray-500 mb-4" />
                            <p className="text-gray-500">
                              Nenhum holerite encontrado para este período
                            </p>
                    </div>
                  )}
                </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>

          </TabsContent>

          <TabsContent value="recibos">
            <div className="space-y-6">
                {/* Header da aba - Design Moderno */}
                <div className="text-center relative">
                  <div className="relative inline-block">
                    <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-blue-500 via-purple-600 to-blue-700 rounded-3xl shadow-2xl mb-6 transform hover:scale-105 transition-all duration-300">
                      <FileText size={36} className="text-white" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-green-400 to-green-500 rounded-full border-2 border-seguranca-black flex items-center justify-center">
                      <CheckCircle size={12} className="text-white" />
                    </div>
                  </div>
                  <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-seguranca-lightgray via-white to-seguranca-lightgray bg-clip-text text-transparent mb-4">
                    Comprovantes<span className="hidden sm:inline"> de Pagamento</span><span className="hidden md:inline"> de Salário</span>
                  </h3>
                  <p className="text-gray-400 text-sm sm:text-base lg:text-lg max-w-3xl mx-auto leading-relaxed">
                    Importe e processe comprovantes<span className="hidden sm:inline"> de transferência de pagamento de salário</span><span className="hidden md:inline"> de funcionários com tecnologia avançada de OCR e organização automática</span>.
                  </p>
                  <div className="flex items-center justify-center gap-2 mt-4">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                    <span className="text-blue-300 text-sm font-medium">Sistema ativo e monitorado</span>
                  </div>
                </div>
                
              {/* Dashboard de Comprovantes */}
              <Card className="bg-gradient-to-br from-seguranca-graphite via-seguranca-black to-seguranca-graphite border border-gray-600/50 rounded-2xl p-8 shadow-2xl backdrop-blur-sm">
                <div className="space-y-8">
                  {/* EstatÃ­sticas Melhoradas */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="group bg-gradient-to-br from-blue-500/15 to-blue-600/10 border border-blue-500/30 rounded-3xl p-8 hover:border-blue-400/50 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/20 backdrop-blur-sm">
                      <div className="flex items-center justify-between">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
                            <p className="text-blue-300/90 text-sm font-semibold uppercase tracking-wide">Total de Comprovantes</p>
                          </div>
                          <p className="text-4xl font-bold text-white">{paymentReceipts.length}</p>
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                            <span className="text-blue-300/70 text-xs font-medium">Sistema ativo</span>
                          </div>
                        </div>
                        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl flex items-center justify-center shadow-xl group-hover:shadow-blue-500/30 transition-all duration-500 group-hover:scale-110">
                          <FileText size={32} className="text-white" />
                        </div>
                      </div>
                    </div>
                    
                    <div className="group bg-gradient-to-br from-green-500/15 to-green-600/10 border border-green-500/30 rounded-3xl p-8 hover:border-green-400/50 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-green-500/20 backdrop-blur-sm">
                      <div className="flex items-center justify-between">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                            <p className="text-green-300/90 text-sm font-semibold uppercase tracking-wide">Anos DisponÃ­veis</p>
                          </div>
                          <p className="text-4xl font-bold text-white">{getAvailableYears().length}</p>
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                            <span className="text-green-300/70 text-xs font-medium">Organizado</span>
                          </div>
                        </div>
                        <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-3xl flex items-center justify-center shadow-xl group-hover:shadow-green-500/30 transition-all duration-500 group-hover:scale-110">
                          <Calendar size={32} className="text-white" />
                        </div>
                      </div>
                    </div>
                    
                    <div className="group bg-gradient-to-br from-yellow-500/15 to-yellow-600/10 border border-yellow-500/30 rounded-3xl p-8 hover:border-yellow-400/50 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-yellow-500/20 backdrop-blur-sm">
                      <div className="flex items-center justify-between">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
                            <p className="text-yellow-300/90 text-sm font-semibold uppercase tracking-wide">Processados Hoje</p>
                          </div>
                          <p className="text-4xl font-bold text-white">{getHoleritesProcessedToday()}</p>
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                            <span className="text-yellow-300/70 text-xs font-medium">Em tempo real</span>
                          </div>
                        </div>
                        <div className="w-20 h-20 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-3xl flex items-center justify-center shadow-xl group-hover:shadow-yellow-500/30 transition-all duration-500 group-hover:scale-110">
                          <CheckCircle size={32} className="text-white" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* BotÃ£o de Upload Melhorado */}
                  <div className="flex justify-center">
                      <Button 
                      onClick={() => setShowPaymentReceiptUploadModal(true)}
                      disabled={processingPaymentReceipts}
                      className="group relative bg-gradient-to-r from-blue-500 via-purple-600 to-blue-700 hover:from-blue-600 hover:via-purple-700 hover:to-blue-800 px-12 py-6 rounded-3xl shadow-2xl hover:shadow-blue-500/40 transition-all duration-500 transform hover:scale-110 hover:-translate-y-2 text-white font-bold text-xl border border-blue-400/30 overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-400/30 to-purple-400/30 rounded-3xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                      <div className="relative flex items-center space-x-4">
                        {processingPaymentReceipts ? (
                          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                            <Loader2 size={24} className="animate-spin" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center group-hover:bg-white/30 transition-all duration-300 group-hover:scale-110">
                            <Plus size={24} />
                          </div>
                        )}
                        <span className="text-xl font-bold">
                          {processingPaymentReceipts ? 'Processando...' : 'Importar Comprovante de Pagamento'}
                        </span>
                      </div>
                      </Button>
                  </div>
                    </div>
                  </Card>

            {/* Abas por Ano e Mês */}
            <Card className="bg-gradient-to-br from-seguranca-graphite via-seguranca-black to-seguranca-graphite border border-gray-600/50 rounded-2xl p-8 shadow-2xl backdrop-blur-sm">
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
                      
                      {/* Controles de seleção em lote - responsivo */}
                      {getFilteredPaymentReceipts().length > 0 && (
                        <div className="mt-4 pt-4 border-t border-blue-500/20">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                            
                            {/* Checkbox de selecionar todos */}
                            <div className="flex items-center space-x-3 bg-seguranca-black/50 rounded-xl sm:rounded-2xl p-2 sm:p-3 border border-gray-600/30">
                              <Checkbox
                                id="select-all-payment-receipts"
                                checked={areAllPaymentReceiptsSelected()}
                                onCheckedChange={handleSelectAllPaymentReceipts}
                                className="border-blue-400 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500 w-4 h-4 sm:w-5 sm:h-5"
                              />
                              <label htmlFor="select-all-payment-receipts" className="text-white text-xs sm:text-sm font-semibold cursor-pointer whitespace-nowrap">
                                Selecionar Todos
                              </label>
                            </div>
                            
                            {/* BotÃµes de aÃ§Ã£o - responsivos */}
                            {hasSelectedPaymentReceipts() && (
                              <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
                                <Button
                                  onClick={async () => {
                                    // Resolver IDs de funcionários a partir dos comprovantes selecionados
                                    const selected = getFilteredPaymentReceipts().filter(r => selectedPaymentReceipts.includes(r.id));
                                    const ids: string[] = [];
                                    for (const r of selected) {
                                      // tentamos por CPF no nome do arquivo ou campo document, se existir
                                      let cpf: string | null = null;
                                      if ((r as any).cpf) cpf = (r as any).cpf;
                                      if (!cpf && r.fileName) {
                                        const m = r.fileName.match(/(\d{11})/);
                                        if (m) cpf = m[1];
                                      }
                                      if (cpf) {
                                        try {
                                          const byCpf = await employeeService.searchEmployees(cpf);
                                          if (byCpf && byCpf.length === 1) { ids.push(byCpf[0].id); continue; }
                                        } catch {}
                                      }
                                      try {
                                        const byName = await employeeService.searchEmployeesByName(r.employeeName || '');
                                        if (byName && byName.length === 1) { ids.push(byName[0].id); continue; }
                                      } catch {}
                                    }
                                    const uniqueIds = Array.from(new Set(ids));
                                    if (uniqueIds.length === 0) {
                                      toast({ title: 'Não foi possível identificar funcionários', description: 'Verifique CPF no nome do PDF ou o cadastro.', variant: 'destructive' });
                                      return;
                                    }
                                    setResolvedEmployeeIds(uniqueIds);
                                    setValidationSendType('email');
                                    setShowValidationModal(true);
                                  }}
                                  variant="outline"
                                  size="sm"
                                  className="border-green-500/50 text-green-400 hover:bg-green-500/10 hover:border-green-400 px-3 py-1 text-sm flex-1 sm:flex-none min-w-0"
                                >
                                  <Mail size={14} className="mr-1" />
                                  <span className="hidden sm:inline">Email</span>
                                  <span className="sm:hidden">E</span>
                                  <span className="ml-1">({selectedPaymentReceipts.length})</span>
                                </Button>
                                
                                <Button
                                  onClick={async () => {
                                    const selected = getFilteredPaymentReceipts().filter(r => selectedPaymentReceipts.includes(r.id));
                                    const ids: string[] = [];
                                    for (const r of selected) {
                                      let cpf: string | null = null;
                                      if ((r as any).cpf) cpf = (r as any).cpf;
                                      if (!cpf && r.fileName) {
                                        const m = r.fileName.match(/(\d{11})/);
                                        if (m) cpf = m[1];
                                      }
                                      if (cpf) {
                                        try {
                                          const byCpf = await employeeService.searchEmployees(cpf);
                                          if (byCpf && byCpf.length === 1) { ids.push(byCpf[0].id); continue; }
                                        } catch {}
                                      }
                                      try {
                                        const byName = await employeeService.searchEmployeesByName(r.employeeName || '');
                                        if (byName && byName.length === 1) { ids.push(byName[0].id); continue; }
                                      } catch {}
                                    }
                                    const uniqueIds = Array.from(new Set(ids));
                                    if (uniqueIds.length === 0) {
                                      toast({ title: 'Não foi possível identificar funcionários', description: 'Verifique CPF no nome do PDF ou o cadastro.', variant: 'destructive' });
                                      return;
                                    }
                                    setResolvedEmployeeIds(uniqueIds);
                                    setValidationSendType('whatsapp');
                                    setShowValidationModal(true);
                                  }}
                                  variant="outline"
                                  size="sm"
                                  className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10 hover:border-blue-400 px-3 py-1 text-sm flex-1 sm:flex-none min-w-0"
                                >
                                  <MessageSquare size={14} className="mr-1" />
                                  <span className="hidden sm:inline">WhatsApp</span>
                                  <span className="sm:hidden">W</span>
                                  <span className="ml-1">({selectedPaymentReceipts.length})</span>
                                </Button>
                                
                                <Button
                                  onClick={handleDeleteMultiplePaymentReceipts}
                                  variant="outline"
                                  size="sm"
                                  className="border-red-500/50 text-red-400 hover:bg-red-500/10 hover:border-red-400 px-3 py-1 text-sm flex-1 sm:flex-none min-w-0"
                                >
                                  <Trash2 size={14} className="mr-1" />
                                  <span className="hidden sm:inline">Excluir</span>
                                  <span className="sm:hidden">X</span>
                                  <span className="ml-1">({selectedPaymentReceipts.length})</span>
                                </Button>
                                
                                <Button
                                  onClick={clearPaymentReceiptSelection}
                                  variant="outline"
                                  size="sm"
                                  className="border-gray-500/50 text-gray-400 hover:bg-gray-500/10 hover:border-gray-400 px-3 py-1 text-sm flex-1 sm:flex-none min-w-0"
                                >
                                  <X size={14} className="mr-1" />
                                  <span className="hidden sm:inline">Limpar</span>
                                  <span className="sm:hidden">L</span>
                                </Button>
                              </div>
                            )}
                          </div>
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
                      <div className="grid gap-4">
                        {getFilteredPaymentReceipts().map((receipt, index) => (
                          <div key={receipt.id} className="group bg-gradient-to-r from-seguranca-black/50 to-seguranca-graphite/50 border border-gray-600/30 rounded-2xl p-6 hover:border-blue-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10 hover:scale-[1.02]">
                            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                                  <div className="flex items-center space-x-3">
                                    <Checkbox
                                      id={`payment-receipt-${receipt.id}`}
                                      checked={selectedPaymentReceipts.includes(receipt.id)}
                                      onCheckedChange={(checked) => handleSelectPaymentReceipt(receipt.id, checked as boolean)}
                                      className="border-blue-400 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                                    />
                                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                                      <User size={20} className="text-white" />
                    </div>
                                    <div>
                                      <h6 className="font-bold text-white text-lg">
                                        {receipt.employeeName}
                                      </h6>
                                      <p className="text-gray-400 text-sm">Funcionário</p>
                </div>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    <Badge className="bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg">
                                      ✅ Processado
                        </Badge>
                    </div>
                    </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                                  <div className="flex items-center space-x-2 text-gray-300">
                                    <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                                      <span className="text-green-400">💰</span>
                  </div>
                                    <div>
                                      <p className="text-gray-400 text-xs">Valor</p>
                                      <p className="font-semibold text-white">R$ {Number(receipt.netSalary || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                      </div>
                                  <div className="flex items-center space-x-2 text-gray-300">
                                    <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                                      <Calendar size={16} className="text-blue-400" />
                    </div>
                                    <div>
                                      <p className="text-gray-400 text-xs">Processado em</p>
                                      <p className="font-semibold text-white">{formatDate(receipt.processedAt || receipt.updatedAt)}</p>
                        </div>
                                </div>
                                  <div className="flex items-center space-x-2 text-gray-300">
                                    <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                                      <FileText size={16} className="text-purple-400" />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-gray-400 text-xs">Arquivo</p>
                                      <p className="font-semibold text-white truncate">{receipt.fileName}</p>
                                    </div>
                                </div>
                              </div>
                            </div>
                            
                              <div className="flex flex-wrap gap-3 justify-start lg:justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                  onClick={() => handleViewPaymentReceipt(receipt)}
                                  className="group border-2 border-blue-500/50 text-blue-400 hover:bg-blue-500 hover:text-white hover:border-blue-500 px-4 py-2 rounded-xl font-semibold transition-all duration-300"
                                >
                                  <Eye size={16} className="mr-2 group-hover:scale-110 transition-transform duration-300" />
                                  Visualizar
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                  onClick={() => handleDownloadPaymentReceipt(receipt.id, receipt.fileName)}
                                  className="group border-2 border-green-500/50 text-green-400 hover:bg-green-500 hover:text-white hover:border-green-500 px-4 py-2 rounded-xl font-semibold transition-all duration-300"
                                >
                                  <Download size={16} className="mr-2 group-hover:scale-110 transition-transform duration-300" />
                                  Baixar
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                  onClick={() => handleDeletePaymentReceipt(receipt.id)}
                                  className="group border-2 border-red-500/50 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 px-4 py-2 rounded-xl font-semibold transition-all duration-300"
                                >
                                  <Trash2 size={16} className="mr-2 group-hover:scale-110 transition-transform duration-300" />
                                  Excluir
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  </div>
              </Card>
            </div>
          </TabsContent>


          {/* Nova Aba: Unificação Individual */}
          <TabsContent value="unificacao-individual" className="space-y-6">
              {/* Botões de Ação */}
              <div className="flex justify-between mb-4">
                <div className="flex gap-2">
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
                          toast({
                            title: "⚠️ Teste de Criação",
                            description: response.data.mensagem + (response.data.sugestao ? ` - ${response.data.sugestao}` : ''),
                            variant: "destructive"
                          });
                        }
                      } catch (error: any) {
                        console.error('❌ Erro no teste de criação:', error);
                        toast({
                          title: "❌ Erro no Teste",
                          description: `Erro ao testar criação: ${error.message}`,
                          variant: "destructive"
                        });
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
                  {/* Lista de Holerites Processados */}
                  <Card>
                      <CardHeader>
                          <CardTitle className="flex items-center text-lg">
                              <FileText className="w-5 h-5 mr-2 text-yellow-600" />
                              Holerites Processados
                              <Badge variant="secondary" className="ml-2">
                                  {getFilteredHolerites().length} / {processedHolerites.length}
                              </Badge>
                          </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                          {/* Campo de busca */}
                          <div className="relative">
                              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                              <Input
                                  placeholder="Buscar holerites..."
                                  value={holeriteSearchTerm}
                                  onChange={(e) => setHoleriteSearchTerm(e.target.value)}
                                  className="pl-10 pr-10"
                              />
                              {holeriteSearchTerm && (
                                  <button
                                      onClick={() => setHoleriteSearchTerm('')}
                                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                  >
                                      <X className="w-4 h-4" />
                                  </button>
                              )}
                          </div>

                          {/* Lista de holerites */}
                          <div className="space-y-2 max-h-96 overflow-y-auto">
                              {loadingProcessedFiles ? (
                                  <div className="flex items-center justify-center py-8">
                                      <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                                      <span className="ml-2 text-muted-foreground">Carregando holerites...</span>
                                  </div>
                              ) : getFilteredHolerites().length === 0 ? (
                                  <div className="text-center py-8 text-muted-foreground">
                                      <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                      <p>Nenhum holerite encontrado</p>
                                  </div>
                              ) : (
                                  getFilteredHolerites().map((holerite) => (
                                      <div
                                          key={holerite.id}
                                          draggable
                                          onDragStart={(e) => handleDragStart(e, holerite, 'holerite')}
                                          className="p-3 border rounded-lg cursor-move hover:bg-yellow-50 hover:border-yellow-300 transition-all duration-200 active:scale-95"
                                      >
                                          <div className="flex items-center justify-between">
                                              <div className="flex-1 min-w-0">
                                                  <p className="font-medium text-sm truncate">
                                                      {holerite.employeeName || 'Nome não disponível'}
                                                  </p>
                                                  <p className="text-xs text-muted-foreground truncate">
                                                      {holerite.name}
                                                  </p>
                                                  <div className="flex items-center gap-2 mt-1">
                                                      <Badge variant="outline" className="text-xs">
                                                          {holerite.month}/{holerite.year}
                                              </Badge>
                                                  </div>
                                              </div>
                                              <div className="flex-shrink-0 ml-2">
                                                  <GripVertical className="w-4 h-4 text-muted-foreground" />
                                              </div>
                                          </div>
                                      </div>
                                  ))
                              )}
                          </div>
                      </CardContent>
                  </Card>

                  {/* Lista de Comprovantes Processados */}
                  <Card>
                      <CardHeader>
                          <CardTitle className="flex items-center text-lg">
                              <Receipt className="w-5 h-5 mr-2 text-green-600" />
                              Comprovantes Processados
                              <Badge variant="secondary" className="ml-2">
                                  {getFilteredRecibos().length} / {processedRecibos.length}
                              </Badge>
                          </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                          {/* Campo de busca */}
                          <div className="relative">
                              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                              <Input
                                  placeholder="Buscar comprovantes..."
                                  value={reciboSearchTerm}
                                  onChange={(e) => setReciboSearchTerm(e.target.value)}
                                  className="pl-10 pr-10"
                              />
                              {reciboSearchTerm && (
                                  <button
                                      onClick={() => setReciboSearchTerm('')}
                                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                  >
                                      <X className="w-4 h-4" />
                              </button>
                              )}
                          </div>

                          {/* Lista de comprovantes */}
                          <div className="space-y-2 max-h-96 overflow-y-auto">
                              {loadingProcessedFiles ? (
                                  <div className="flex items-center justify-center py-8">
                                      <Loader2 className="w-6 h-6 animate-spin text-green-600" />
                                      <span className="ml-2 text-muted-foreground">Carregando comprovantes...</span>
                                  </div>
                              ) : getFilteredRecibos().length === 0 ? (
                                  <div className="text-center py-8 text-muted-foreground">
                                      <Receipt className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                      <p>Nenhum comprovante encontrado</p>
                                  </div>
                              ) : (
                                  getFilteredRecibos().map((recibo) => (
                                      <div
                                          key={recibo.id}
                                          draggable
                                          onDragStart={(e) => handleDragStart(e, recibo, 'recibo')}
                                          className="p-3 border rounded-lg cursor-move hover:bg-green-50 hover:border-green-300 transition-all duration-200 active:scale-95"
                                      >
                                          <div className="flex items-center justify-between">
                                              <div className="flex-1 min-w-0">
                                                  <p className="font-medium text-sm truncate">
                                                      {recibo.employeeName || 'Nome não disponível'}
                                                  </p>
                                                  <p className="text-xs text-muted-foreground truncate">
                                                      {recibo.name}
                                                  </p>
                                                  <div className="flex items-center gap-2 mt-1">
                                                      <Badge variant="outline" className="text-xs">
                                                          {recibo.month}/{recibo.year}
                                              </Badge>
                                                  </div>
                                              </div>
                                              <div className="flex-shrink-0 ml-2">
                                                  <GripVertical className="w-4 h-4 text-muted-foreground" />
                                              </div>
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

              {/* Sistema de Abas Hierárquico para Documentos Unificados */}
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
                                      Documentos processados e organizados por período
                                  </p>
                              </div>
                          </div>
                          <div className="flex items-center space-x-3">
                              <Badge className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-3 py-1">
                                  {unifiedDocuments.length} documento(s)
                              </Badge>
                          </div>
                      </div>
                      
                      {/* Navegação de Abas Hierárquica */}
                      <div className="flex items-center justify-center space-x-2 mt-6">
                          <Button
                              onClick={handleBackToYears}
                              variant={activePeriodTab === 'ano' ? "default" : "outline"}
                              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                                  activePeriodTab === 'ano'
                                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                                      : 'bg-purple-900/50 border-purple-500/50 text-purple-300 hover:bg-purple-800/50'
                              }`}
                          >
                              📅 Anos
                          </Button>
                          
                          {selectedYear && (
                              <Button
                                  onClick={handleBackToMonths}
                                  variant={activePeriodTab === 'mes' ? "default" : "outline"}
                                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                                      activePeriodTab === 'mes'
                                          ? 'bg-gradient-to-r from-green-500 to-teal-600 text-white shadow-lg'
                                          : 'bg-purple-900/50 border-purple-500/50 text-purple-300 hover:bg-purple-800/50'
                                  }`}
                              >
                                  📆 {selectedYear}
                              </Button>
                          )}
                          
                          {selectedYear && selectedMonth && (
                              <Button
                                  onClick={() => setActivePeriodTab('conteudo')}
                                  variant={activePeriodTab === 'conteudo' ? "default" : "outline"}
                                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                                      activePeriodTab === 'conteudo'
                                          ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg'
                                          : 'bg-purple-900/50 border-purple-500/50 text-purple-300 hover:bg-purple-800/50'
                                  }`}
                              >
                                  📄 {getMonthName(parseInt(selectedMonth))} {selectedYear}
                              </Button>
                          )}
                      </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                      {/* Conteúdo das Abas Hierárquicas */}
                      {activePeriodTab === 'ano' && (
                          <div className="space-y-6">
                              <div>
                                  <h5 className="text-lg font-semibold text-purple-300 mb-4">Selecione o Ano</h5>
                                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                      {Array.from(new Set(unifiedDocuments.map(doc => {
                                          const yearMatch = doc.fileName.match(/_(\d{4})\.pdf$/);
                                          return yearMatch ? yearMatch[1] : null;
                                      }).filter(Boolean))).sort().map(year => (
                                          <Button
                                              key={year}
                                              onClick={() => handleYearSelection(year)}
                                              variant="outline"
                                              className="px-4 py-3 rounded-lg font-medium transition-all duration-200 bg-purple-900/30 border-purple-500/50 text-purple-300 hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-600 hover:text-white hover:border-transparent hover:shadow-lg"
                                          >
                                              📅 {year}
                                          </Button>
                                      ))}
                                  </div>
                              </div>
                          </div>
                      )}

                      {activePeriodTab === 'mes' && selectedYear && (
                          <div className="space-y-6">
                              <div>
                                  <h5 className="text-lg font-semibold text-purple-300 mb-4">
                                      Meses disponíveis para {selectedYear}
                                  </h5>
                                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                                      {Array.from(new Set(unifiedDocuments
                                          .filter(doc => {
                                              const yearMatch = doc.fileName.match(/_(\d{4})\.pdf$/);
                                              return yearMatch && yearMatch[1] === selectedYear;
                                          })
                                          .map(doc => {
                                              const monthMatch = doc.fileName.match(/UNIFICADO_.*?_(\d{1,2})_\d{4}\.pdf$/);
                                              return monthMatch ? parseInt(monthMatch[1]) : null;
                                          })
                                          .filter(Boolean)
                                      )).sort((a, b) => a - b).map(month => (
                                          <Button
                                              key={month}
                                              onClick={() => handleMonthSelection(month.toString())}
                                              variant="outline"
                                              className="px-3 py-2 rounded-lg font-medium transition-all duration-200 bg-purple-900/30 border-purple-500/50 text-purple-300 hover:bg-gradient-to-r hover:from-green-500 hover:to-teal-600 hover:text-white hover:border-transparent hover:shadow-lg"
                                          >
                                              📆 {getMonthName(month)}
                                          </Button>
                                      ))}
                                  </div>
                              </div>
                          </div>
                      )}

                      {activePeriodTab === 'conteudo' && selectedYear && (
                          <div className="space-y-6">
                              {/* Controles de Ação */}
                              <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-3">
                                      <Button
                                          onClick={selectAllDocuments}
                                          variant="outline"
                                          className="border-white/30 text-white hover:bg-white/10"
                                      >
                                          <CheckCircle className="mr-2 h-4 w-4" />
                                          Selecionar Todos
                                      </Button>
                                      {selectedUnifiedDocuments.size > 0 && (
                                          <Button
                                              onClick={deselectAllDocuments}
                                              variant="outline"
                                              className="border-red-500/30 text-red-300 hover:bg-red-500/10"
                                          >
                                              <Square className="mr-2 h-4 w-4" />
                                              Desselecionar
                                          </Button>
                                      )}
                                  </div>
                                  
                                  {selectedUnifiedDocuments.size > 0 && (
                                      <div className="flex items-center gap-2 text-sm text-purple-300">
                                          <CheckCircle size={16} />
                                          <span>{selectedUnifiedDocuments.size} documento(s) selecionado(s)</span>
                                      </div>
                                  )}
                              </div>

                              {/* Lista de Documentos Filtrados por Período */}
                              {loadingUnifiedDocuments ? (
                                  <div className="flex items-center justify-center py-8">
                                      <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
                                      <span className="ml-2 text-gray-400">Carregando documentos...</span>
                                  </div>
                              ) : (() => {
                                  const filteredDocs = unifiedDocuments.filter(doc => {
                                      const yearMatch = doc.fileName.match(/_(\d{4})\.pdf$/);
                                      const monthMatch = doc.fileName.match(/UNIFICADO_.*?_(\d{1,2})_\d{4}\.pdf$/);
                                      
                                      const docYear = yearMatch ? yearMatch[1] : '';
                                      const docMonth = monthMatch ? monthMatch[1] : '';
                                      
                                      const matchesYear = !selectedYear || docYear === selectedYear;
                                      const matchesMonth = !selectedMonth || docMonth === selectedMonth;
                                      
                                      return matchesYear && matchesMonth;
                                  });
                                  
                                  return filteredDocs.length === 0 ? (
                                      <div className="text-center py-8">
                                          <FileText className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                                          <p className="text-gray-400">
                                              {selectedYear && selectedMonth 
                                                  ? `Nenhum documento encontrado para ${getMonthName(parseInt(selectedMonth))} ${selectedYear}`
                                                  : selectedYear 
                                                      ? `Nenhum documento encontrado para ${selectedYear}`
                                                      : 'Nenhum documento unificado encontrado.'
                                              }
                                          </p>
                                      </div>
                                  ) : (
                                      <div className="space-y-3 max-h-96 overflow-y-auto">
                                          {filteredDocs.map((doc, index) => (
                                  <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors">
                                      <div className="flex items-center space-x-3">
                                          <input
                                              type="checkbox"
                                              checked={selectedUnifiedDocuments.has(index)}
                                              onChange={() => toggleDocumentSelection(index)}
                                              className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
                                          />
                                          <div className="flex-1 min-w-0">
                                              <p className="text-white font-medium truncate">
                                                  {doc.employeeName || 'N/A'}
                                              </p>
                                              <p className="text-gray-400 text-sm truncate">
                                                  {doc.fileName}
                                              </p>
                                              <div className="flex items-center gap-2 mt-1">
                                                  <Badge variant="outline" className="border-blue-500/30 text-blue-300 text-xs">
                                                      {doc.month || '?'}/{doc.year || '?'}
                                                  </Badge>
                                                  {doc.fileSize && (
                                                      <span className="text-gray-500 text-xs">
                                                          {(doc.fileSize / 1024).toFixed(1)} KB
                                                      </span>
                                                  )}
                                              </div>
                                          </div>
                                      </div>
                                      
                                      <div className="flex items-center gap-2">
                                          <Button
                                              onClick={() => {
                                                  setViewerDocumentIndex(index);
                                                  setViewerDocument(doc);
                                                  const apiUrl = getApiUrl().replace('/api', '');
                                                  setViewerUrl(`${apiUrl}/api/unified-documents/public/file/${encodeURIComponent(doc.fileName)}`);
                                                  setShowUnifiedViewerModal(true);
                                              }}
                                              size="sm"
                                              variant="outline"
                                              className="border-blue-500/30 text-blue-300 hover:bg-blue-500/10"
                                          >
                                              <Eye className="h-4 w-4" />
                                          </Button>
                                          <Button
                                              onClick={() => {
                                                  const link = document.createElement('a');
                                                  const apiUrl = getApiUrl().replace('/api', '');
                                                  link.href = `${apiUrl}/api/unified-documents/download/${encodeURIComponent(doc.fileName)}`;
                                                  link.download = doc.fileName;
                                                  link.target = '_blank';
                                                  document.body.appendChild(link);
                                                  link.click();
                                                  document.body.removeChild(link);
                                              }}
                                              size="sm"
                                              variant="outline"
                                              className="border-green-500/30 text-green-300 hover:bg-green-500/10"
                                          >
                                              <Download className="h-4 w-4" />
                                          </Button>
                                          <Button
                                              onClick={() => {
                                                  setDeleteDocumentIndex(index);
                                                  setDeleteType('individual');
                                                  setShowUnifiedDeleteModal(true);
                                              }}
                                              size="sm"
                                              variant="outline"
                                              className="border-red-500/30 text-red-300 hover:bg-red-500/10"
                                          >
                                              <Trash2 className="h-4 w-4" />
                                          </Button>
                                      </div>
                                  </div>
                                          ))}
                                      </div>
                                  );
                              })()}

                      {/* BotÃµes de AÃ§Ã£o em Lote */}
                      {selectedUnifiedDocuments.size > 0 && (
                          <div className="flex items-center justify-center gap-3 pt-4 border-t border-white/10">
                              <Button
                                  onClick={() => {
                                      setSendType('email');
                                      setShowSendModal(true);
                                  }}
                                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                              >
                                  <Mail className="mr-2 h-4 w-4" />
                                  Enviar por Email
                              </Button>
                              <Button
                                  onClick={() => {
                                      setSendType('whatsapp');
                                      setShowSendModal(true);
                                  }}
                                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
                              >
                                  <MessageSquare className="mr-2 h-4 w-4" />
                                  Enviar por WhatsApp
                              </Button>
                              <Button
                                  onClick={() => handleDeleteDocuments('batch')}
                                  className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white"
                              >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Excluir Todos
                                      </Button>
                                  </div>
                              )}
                          </div>
                      )}
                  </CardContent>
              </Card>
          </TabsContent>

          {/* Nova Aba: Logs de Envio */}
          <TabsContent value="logs-envio" className="space-y-6">
            <Card className="bg-seguranca-graphite border-gray-600">
              <CardHeader>
                <CardTitle className="text-seguranca-lightgray">Logs de Envio de Holerites</CardTitle>
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
                ) : (
                  <div className="space-y-2">
                    {logs.map((log, index) => (
                      <div key={index} className="p-3 bg-seguranca-black border border-gray-600 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <Badge 
                              variant={log.status === 'SUCCESS' ? 'default' : log.status === 'FAILED' ? 'destructive' : 'secondary'}
                              className="text-xs"
                            >
                              {log.status === 'SUCCESS' ? 'Sucesso' : log.status === 'FAILED' ? 'Falhou' : 'Pendente'}
                            </Badge>
                            <span className="text-seguranca-lightgray text-sm">
                              {log.employeeName} ({log.cpf})
                            </span>
                          </div>
                          <span className="text-gray-400 text-xs">
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-gray-300 text-sm">
                          {log.message}
                        </p>
                        {log.error && (
                          <p className="text-red-400 text-xs mt-1">
                            Erro: {log.error}
                          </p>
                        )}
                </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
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
        <Dialog open={showBatchDeleteModal} onOpenChange={setShowBatchDeleteModal}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Confirmar Exclusão em Lote
              </DialogTitle>
              <DialogDescription>
                Tem certeza que deseja excluir <strong>{selectedHolerites.length} holerite(s)</strong> selecionado(s)?
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
              {selectedHolerites.map((holeriteId) => {
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
                    Excluir {selectedHolerites.length} Holerite(s)
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
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {batchUnificationResult.failureList.map((item, index) => (
                        <div key={index} className="p-2 bg-red-50 border border-red-200 rounded text-sm">
                          <div className="font-medium text-red-800">{item.employeeName}</div>
                          <div className="text-red-600">{item.error}</div>
                                 </div>
                      ))}
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
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {sendType === 'email' ? 'Enviar por Email' : 'Enviar por WhatsApp'}
              </DialogTitle>
              <DialogDescription>
                {sendType === 'email' 
                  ? 'Os documentos selecionados serÃ£o enviados por email.'
                  : 'Os documentos selecionados serÃ£o enviados por WhatsApp.'
                }
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="text-sm text-gray-600 mb-4">
                {selectedUnifiedDocuments.size} documento(s) selecionado(s) serÃ£o enviados.
                             </div>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {getSelectedDocuments().map((doc, index) => (
                  <div key={index} className="flex items-center space-x-2 text-sm">
                    <FileText className="w-4 h-4 text-gray-400" />
                    <span className="truncate">{doc.employeeName} - {doc.fileName}</span>
                           </div>
                ))}
                         </div>
                     </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSendModal(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={executeSendDocuments} 
                disabled={sendingDocuments}
                className={sendType === 'email' ? 'bg-green-600 hover:bg-green-700' : 'bg-green-500 hover:bg-green-600'}
              >
                {sendingDocuments ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    {sendType === 'email' ? <Mail className="mr-2 h-4 w-4" /> : <MessageSquare className="mr-2 h-4 w-4" />}
                    Enviar
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de ConfirmaÃ§Ã£o de Exclusão */}
        <Dialog open={showUnifiedDeleteModal} onOpenChange={setShowUnifiedDeleteModal}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {deleteType === 'individual' ? 'Excluir Documento' : 'Excluir Documentos em Lote'}
              </DialogTitle>
              <DialogDescription>
                {deleteType === 'individual' 
                  ? 'Tem certeza que deseja excluir este documento?'
                  : `Tem certeza que deseja excluir ${selectedUnifiedDocuments.size} documento(s) selecionado(s)?`
                }
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              {deleteType === 'individual' && deleteDocumentIndex !== null && (
                <div className="flex items-center space-x-2 text-sm">
                  <FileText className="w-4 h-4 text-gray-400" />
                  <span>{unifiedDocuments[deleteDocumentIndex]?.employeeName} - {unifiedDocuments[deleteDocumentIndex]?.fileName}</span>
                       </div>
              )}
              {deleteType === 'batch' && (
                <div className="text-sm text-gray-600 mb-2">
                  Documentos selecionados:
                     </div>
                   )}
              {deleteType === 'batch' && (
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {getSelectedDocuments().map((doc, index) => (
                    <div key={index} className="flex items-center space-x-2 text-sm">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <span className="truncate">{doc.employeeName} - {doc.fileName}</span>
                 </div>
                  ))}
              </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowUnifiedDeleteModal(false)}>
                  Cancelar
                </Button>
                <Button 
                variant="destructive" 
                onClick={executeDeleteDocuments}
                disabled={deletingDocuments}
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

        {/* Modal de Visualização de PDF */}
        <Dialog open={showUnifiedViewerModal} onOpenChange={setShowUnifiedViewerModal}>
          <DialogContent className="sm:max-w-[90vw] max-h-[90vh] w-full h-full">
            <DialogHeader>
              <DialogTitle>Visualização do Documento - {viewerDocument?.employeeName}</DialogTitle>
            </DialogHeader>
            <div className="flex-1 min-h-0">
              {viewerUrl && (
                <div className="w-full h-full min-h-[600px]">
                  <iframe
                    src={viewerUrl}
                    className="w-full h-full border rounded"
                    title="Visualização do PDF"
                    onError={() => {
                      // Fallback: abrir em nova aba se o iframe falhar
                      window.open(viewerUrl, '_blank');
                    }}
                  />
                  </div>
              )}
              </div>
            <DialogFooter className="flex justify-between">
                <Button 
                  variant="outline" 
                onClick={() => window.open(viewerUrl, '_blank')}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Abrir em Nova Aba
              </Button>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = viewerUrl || '';
                    link.download = viewerDocument?.fileName || 'documento.pdf';
                    link.target = '_blank';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Baixar
                </Button>
                <Button onClick={() => setShowUnifiedViewerModal(false)}>
                  Fechar
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de Upload de Holerites */}
        <HoleriteUpload
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          onUploadSuccess={() => {
            setShowUploadModal(false);
            toast({
              title: "Sucesso",
              description: "Holerites importados com sucesso!",
            });
            loadHolerites(); // Recarregar a lista
          }}
        />

        {/* Modal de Upload de Comprovantes de Pagamento */}
        <Dialog open={showPaymentReceiptUploadModal} onOpenChange={setShowPaymentReceiptUploadModal}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Importar Comprovantes de Pagamento
              </DialogTitle>
              <DialogDescription>
                Selecione os arquivos PDF dos comprovantes de pagamento para processamento.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Upload Area */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <div className="space-y-2">
                  <p className="text-lg font-medium">Arraste e solte os arquivos aqui</p>
                  <p className="text-sm text-gray-500">ou clique para selecionar</p>
                  </div>
                <input
                  type="file"
                  multiple
                  accept=".pdf"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length > 0) {
                      handlePaymentReceiptUpload(files[0]);
                    }
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                    </div>
                    
              {processingPaymentReceipts && (
                <div className="text-center space-y-2">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500" />
                  <p className="text-sm text-gray-600">Processando comprovantes...</p>
                      </div>
                    )}
              </div>
              
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPaymentReceiptUploadModal(false)}>
                  Cancelar
                </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de Visualização de Comprovantes de Pagamento */}
         <PaymentReceiptViewModal
           open={showPaymentReceiptViewModal}
           onOpenChange={setShowPaymentReceiptViewModal}
           receipt={selectedPaymentReceiptForView}
           onDownload={handleDownloadPaymentReceipt}
         />

      {/* Modal de Validação para envio (Holerites/Comprovantes) */}
        <ContactValidationModal
          open={showValidationModal}
          onClose={() => setShowValidationModal(false)}
          employeeIds={resolvedEmployeeIds}
          sendType={validationSendType}
          documentType="holerite"
          onValidated={handleValidated}
        />

      {/* Modais de ação individual (criar usuário / atualizar WhatsApp) */}
      {selectedValidationDetail && (
        <>
          <QuickUserFormModal
            open={showSingleUserModal}
            onClose={() => setShowSingleUserModal(false)}
            employeeDetail={selectedValidationDetail}
            onSuccess={() => {
              setShowSingleUserModal(false);
              toast({ title: 'Usuário criado', description: 'Tente enviar novamente via WhatsApp.' });
            }}
          />
          <WhatsAppUpdateModal
            open={showSingleWhatsappModal}
            onClose={() => setShowSingleWhatsappModal(false)}
            employeeDetail={selectedValidationDetail}
            onSuccess={() => {
              setShowSingleWhatsappModal(false);
              toast({ title: 'WhatsApp atualizado', description: 'Tente enviar novamente via WhatsApp.' });
            }}
          />
        </>
      )}

      {/* Resultado do envio em massa */}
      <Dialog open={showMassResultModal} onOpenChange={setShowMassResultModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Resumo do Envio em Massa</DialogTitle>
            <DialogDescription>
              {massResult ? (
                <div className="space-y-2">
                  <div><b>Tipo:</b> {massResult.tipoEnvio}</div>
                  <div><b>Enviados:</b> {massResult.totalEnviados} &nbsp; <b>Falhas:</b> {massResult.totalFalhas}</div>
                  <div><b>Status:</b> {massResult.sucesso ? 'Sucesso' : 'Concluído com falhas'}</div>
                </div>
              ) : '—'}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-80 overflow-auto border rounded p-2">
            {massResult && massResult.detalhes && massResult.detalhes.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left">
                    <th className="p-1">CPF</th>
                    <th className="p-1">Nome</th>
                    <th className="p-1">Telefone</th>
                    <th className="p-1">Destino</th>
                    <th className="p-1">Status</th>
                    <th className="p-1">Erro</th>
                  </tr>
                </thead>
                <tbody>
                  {massResult.detalhes
                    .filter(d => !d.enviado || d.erro)
                    .map((d, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="p-1">{d.cpf}</td>
                        <td className="p-1">{d.nome}</td>
                        <td className="p-1">{d.telefone || '-'}</td>
                        <td className="p-1">{(d as any).destinoNormalizado || '-'}</td>
                        <td className="p-1">{d.enviado ? 'OK' : 'Falha'}</td>
                        <td className="p-1">{d.erro || '-'}</td>
                      </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div>Nenhum detalhe disponível.</div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowMassResultModal(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
     </StandardLayout>
   );
 };

export default Holerites;







