import React, { useState, useEffect } from 'react';
import axios from '../lib/axios';
import { useToast } from '@/hooks/use-toast';
import { ContactValidationModal } from '@/components/contact-validation/ContactValidationModal';
import { employeeService } from '@/services/employeeService';
import { useAuth } from '../contexts/AuthContext';
import { getApiUrl } from '../config/environment';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
    FileText,
    Download,
    Mail,
    MessageCircle,
    Eye,
    Plus,
    CheckCircle,
    XCircle,
    AlertCircle,
    Phone,
    User,
    Calendar,
    RefreshCw,
    Trash2,
    CheckSquare,
    Square,
    FileDown,
    Search,
    AlertTriangle
} from 'lucide-react';

interface UnifiedDocument {
    id: string;
    employeeName: string;
    month: number;
    year: number;
    filePath: string;
    fileName: string;
    createdAt: string;
    createdAtFormatted?: string;
    fileSize: number;
    unificationType?: 'INDIVIDUAL' | 'BATCH' | 'UNKNOWN';
    unificationTypeLabel?: string;
}

interface EmailForm {
    toEmail: string;
    employeeName: string;
    month: number;
    year: number;
    filePath: string;
}

interface WhatsAppForm {
    phoneNumber: string;
    employeeName: string;
    month: number;
    year: number;
}

const DocumentosUnificados: React.FC = () => {
    const { user, isAuthenticated } = useAuth();
    const [documents, setDocuments] = useState<UnifiedDocument[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Estados para criação de documento
    const [createForm, setCreateForm] = useState({
        employeeName: '',
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear()
    });

    // Estados para email
    const [emailForm, setEmailForm] = useState<EmailForm>({
        toEmail: '',
        employeeName: '',
        month: 0,
        year: 0,
        filePath: ''
    });

    // Estados para WhatsApp
    const [whatsappForm, setWhatsappForm] = useState<WhatsAppForm>({
        phoneNumber: '',
        employeeName: '',
        month: 0,
        year: 0
    });

    // Estados de feedback
    const [emailSent, setEmailSent] = useState(false);
    const [whatsappLink, setWhatsappLink] = useState<string | null>(null);
    const [showEmailDialog, setShowEmailDialog] = useState(false);
    const [showWhatsappDialog, setShowWhatsappDialog] = useState(false);

    // Estados para seleção e exclusão em lote
    const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
    const [showBatchDeleteModal, setShowBatchDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Estados para validação de contatos e envio
    const [showValidationModal, setShowValidationModal] = useState(false);
    const [validationSendType, setValidationSendType] = useState<'email' | 'whatsapp' | 'both'>('whatsapp');
    const [resolvedEmployeeIds, setResolvedEmployeeIds] = useState<string[]>([]);

    const { toast } = useToast();

    // Estados para filtros
    const [unificationTypeFilter, setUnificationTypeFilter] = useState<'all' | 'INDIVIDUAL' | 'BATCH' | 'UNKNOWN'>('all');
    const [yearFilter, setYearFilter] = useState<number | 'all'>('all');
    const [monthFilter, setMonthFilter] = useState<number | 'all'>('all');

    // Estados para análise de falhas
    const [failedUnifications, setFailedUnifications] = useState<any[]>([]);
    const [showFailedAnalysis, setShowFailedAnalysis] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    useEffect(() => {
        if (isAuthenticated) {
            loadDocuments();
        }
    }, [isAuthenticated]);

    // Auto-refresh quando a página ganha foco (usuário volta para a aba)
    useEffect(() => {
        const handleFocus = () => {
            if (isAuthenticated && !loading) {
                console.log('🔄 Página ganhou foco - recarregando documentos...');
                loadDocuments();
            }
        };

        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, [isAuthenticated, loading]);

    const loadDocuments = async () => {
        setLoading(true);
        setError(null);

        try {
            console.log('🔄 Carregando documentos unificados...');

            // Tentar primeiro o endpoint detalhado público
            try {
                const response = await axios.get('/api/unified-documents/public/list-detailed');
                console.log('✅ Resposta do endpoint detalhado público:', response.data);

                if (response.data.sucesso) {
                    const mappedDocuments = response.data.documents.map((doc: any) => ({
                        id: doc.fileName || Math.random().toString(),
                        employeeName: doc.employeeName || 'Nome não identificado',
                        month: extractMonthFromFileName(doc.fileName),
                        year: extractYearFromFileName(doc.fileName),
                        filePath: doc.filePath,
                        fileName: doc.fileName,
                        createdAt: doc.createdAt || new Date().toISOString(),
                        createdAtFormatted: doc.createdAtFormatted,
                        fileSize: doc.fileSize || 0,
                        unificationType: doc.unificationType || 'UNKNOWN',
                        unificationTypeLabel: doc.unificationTypeLabel || 'Tipo Não Identificado'
                    }));

                    console.log('📄 Documentos mapeados (detalhado):', mappedDocuments);
                    console.log(`📊 Estatísticas: Total: ${response.data.total}, Individuais: ${response.data.individualCount}, Em lote: ${response.data.batchCount}`);
                    setDocuments(mappedDocuments);
                    return;
                } else {
                    console.warn('⚠️ Endpoint detalhado público retornou erro:', response.data.mensagem);
                }
            } catch (detailedErr: unknown) {
                console.warn('⚠️ Erro no endpoint detalhado público:', detailedErr.message);
            }

            // Fallback para endpoint público
            console.log('🔄 Tentando endpoint público...');
            const publicResponse = await axios.get('/api/unified-documents/public/list');
            console.log('✅ Resposta do endpoint público:', publicResponse.data);

            if (publicResponse.data.sucesso) {
                const mappedDocuments = publicResponse.data.documents.map((doc: any) => ({
                    id: doc.fileName || Math.random().toString(),
                    employeeName: doc.employeeName || 'Nome não identificado',
                    month: extractMonthFromFileName(doc.fileName),
                    year: extractYearFromFileName(doc.fileName),
                    filePath: doc.filePath,
                    fileName: doc.fileName,
                    createdAt: doc.createdAt || new Date().toISOString(),
                    createdAtFormatted: doc.createdAtFormatted,
                    fileSize: doc.fileSize || 0,
                    unificationType: doc.fileName?.includes('UNIFICADO_') ? 'INDIVIDUAL' : 
                                   doc.fileName?.includes('BATCH_') ? 'BATCH' : 'UNKNOWN',
                    unificationTypeLabel: doc.fileName?.includes('UNIFICADO_') ? 'Unificação Individual' : 
                                        doc.fileName?.includes('BATCH_') ? 'Unificação em Lote' : 'Tipo Não Identificado'
                }));

                console.log('📄 Documentos mapeados (público):', mappedDocuments);
                setDocuments(mappedDocuments);
            } else {
                setError(publicResponse.data.mensagem || 'Erro ao carregar documentos');
            }

        } catch (err: unknown) {
            console.error('❌ Erro ao carregar documentos:', err);
            setError('Erro ao carregar documentos: ' + (err.response?.data?.mensagem || err.message));
        } finally {
            setLoading(false);
        }
    };

    // Função para extrair mês do nome do arquivo
    const extractMonthFromFileName = (fileName: string): number => {
        try {
            const match = fileName.match(/_(\d{2})_(\d{4})/);
            return match ? parseInt(match[1]) : new Date().getMonth() + 1;
        } catch {
            return new Date().getMonth() + 1;
        }
    };

    // Função para extrair ano do nome do arquivo
    const extractYearFromFileName = (fileName: string): number => {
        try {
            const match = fileName.match(/_(\d{2})_(\d{4})/);
            return match ? parseInt(match[2]) : new Date().getFullYear();
        } catch {
            return new Date().getFullYear();
        }
    };

    const createUnifiedDocument = async () => {
        if (!createForm.employeeName.trim()) {
            setError('Nome do funcionário é obrigatório');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await axios.post('/api/unified-documents/create', null, {
                params: {
                    employeeName: createForm.employeeName,
                    month: createForm.month,
                    year: createForm.year
                }
            });

            if (response.data.sucesso) {
                // Recarregar documentos
                await loadDocuments();

                // Resetar formulário
                setCreateForm({
                    employeeName: '',
                    month: new Date().getMonth() + 1,
                    year: new Date().getFullYear()
                });

                setError(null);
            } else {
                setError(response.data.mensagem || 'Erro ao criar documento');
            }

        } catch (err: unknown) {
            setError('Erro ao criar documento: ' + (err.response?.data?.mensagem || err.message));
        } finally {
            setLoading(false);
        }
    };

    const handleViewDocument = (document: UnifiedDocument) => {
        // Abrir PDF em nova aba
        const baseUrl = import.meta.env.VITE_API_URL || getApiUrl();
        window.open(`${baseUrl.replace('/api', '')}/${document.filePath}`, '_blank');
    };

    const handleDownloadDocument = (document: UnifiedDocument) => {
        // Download do arquivo
        const baseUrl = import.meta.env.VITE_API_URL || getApiUrl();
        const link = document.createElement('a');
        link.href = `${baseUrl.replace('/api', '')}/${document.filePath}`;
        link.download = document.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleSendEmail = async (document: UnifiedDocument) => {
        setEmailForm({
            toEmail: '',
            employeeName: document.employeeName,
            month: document.month,
            year: document.year,
            filePath: document.filePath
        });
        setShowEmailDialog(true);
    };

    const sendEmail = async () => {
        if (!emailForm.toEmail.trim()) {
            setError('Email é obrigatório');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await axios.post('/api/unified-documents/send-email', null, {
                params: emailForm
            });

            if (response.data.sucesso) {
                setEmailSent(true);
                setShowEmailDialog(false);
                setTimeout(() => setEmailSent(false), 3000);
            } else {
                setError(response.data.mensagem || 'Erro ao enviar email');
            }

        } catch (err: unknown) {
            setError('Erro ao enviar email: ' + (err.response?.data?.mensagem || err.message));
        } finally {
            setLoading(false);
        }
    };

    const handleSendWhatsApp = async (document: UnifiedDocument) => {
        setWhatsappForm({
            phoneNumber: '',
            employeeName: document.employeeName,
            month: document.month,
            year: document.year
        });
        setShowWhatsappDialog(true);
    };

    const generateWhatsAppLink = async () => {
        if (!whatsappForm.phoneNumber.trim()) {
            setError('Número de telefone é obrigatório');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await axios.post('/api/unified-documents/whatsapp-link', null, {
                params: whatsappForm
            });

            if (response.data.sucesso) {
                setWhatsappLink(response.data.whatsappLink);
            } else {
                setError(response.data.mensagem || 'Erro ao gerar link do WhatsApp');
            }

        } catch (err: unknown) {
            setError('Erro ao gerar link do WhatsApp: ' + (err.response?.data?.mensagem || err.message));
        } finally {
            setLoading(false);
        }
    };

    const openWhatsApp = () => {
        if (whatsappLink) {
            window.open(whatsappLink, '_blank');
        }
    };

    // Callback após a validação: enviar para IDs prontos
    const handleValidated = async (validatedIds: string[]) => {
        if (validatedIds.length === 0) {
            toast({ title: 'Sem destinatários prontos', description: 'Nenhum funcionário pronto para envio.', variant: 'destructive' });
            return;
        }
        try {
            if (validationSendType === 'both') {
                await axios.post('/api/envio/massa', { tipo: 'email', funcionarioIds: validatedIds });
                await axios.post('/api/envio/massa', { tipo: 'whatsapp', funcionarioIds: validatedIds });
                toast({ title: 'Envio iniciado', description: `Email e WhatsApp para ${validatedIds.length} funcionário(s).` });
            } else {
                await axios.post('/api/envio/massa', { tipo: validationSendType, funcionarioIds: validatedIds });
                const label = validationSendType === 'email' ? 'Email' : 'WhatsApp';
                toast({ title: 'Envio iniciado', description: `${label} para ${validatedIds.length} funcionário(s).` });
            }
        } catch (e: any) {
            console.error('Erro ao iniciar envio em massa:', e);
            toast({ title: 'Erro no envio', description: e?.response?.data?.mensagem || 'Falha ao iniciar envio.', variant: 'destructive' });
        }
    };

    // Funções para seleção e exclusão em lote
    const handleSelectDocument = (documentId: string) => {
        setSelectedDocuments(prev =>
            prev.includes(documentId)
                ? prev.filter(id => id !== documentId)
                : [...prev, documentId]
        );
    };

    const handleSelectAll = () => {
        if (selectedDocuments.length === documents.length) {
            setSelectedDocuments([]);
        } else {
            setSelectedDocuments(documents.map(doc => doc.id));
        }
    };

    // Resolver IDs de funcionários para os documentos selecionados
    const resolveEmployeeIdsForSelected = async (): Promise<string[]> => {
        const selected = documents.filter(doc => selectedDocuments.includes(doc.id));
        const ids: string[] = [];

        for (const doc of selected) {
            // 1) Tentar por CPF no fileName
            let cpfMatch: string | null = null;
            try {
                const match = doc.fileName?.match(/(\d{11})/);
                cpfMatch = match ? match[1] : null;
            } catch {}

            if (cpfMatch) {
                try {
                    const byCpf = await employeeService.searchEmployees(cpfMatch);
                    if (byCpf && byCpf.length === 1) {
                        ids.push(byCpf[0].id);
                        continue;
                    }
                } catch {}
            }

            // 2) Fallback: buscar por nome
            try {
                const byName = await employeeService.searchEmployeesByName(doc.employeeName);
                if (byName && byName.length === 1) {
                    ids.push(byName[0].id);
                    continue;
                }
            } catch {}
        }

        return Array.from(new Set(ids));
    };

    const handleSendSelected = async (type: 'email' | 'whatsapp' | 'both') => {
        if (selectedDocuments.length === 0) {
            toast({ title: 'Selecione documentos', description: 'Nenhum documento selecionado.', variant: 'destructive' });
            return;
        }

        const ids = await resolveEmployeeIdsForSelected();
        if (ids.length === 0) {
            toast({ title: 'Não foi possível identificar funcionários', description: 'Tente selecionar por CPF no nome do arquivo ou ajuste os nomes.', variant: 'destructive' });
            return;
        }

        const totalSelected = selectedDocuments.length;
        const msg = ids.length < totalSelected
            ? `Identificados ${ids.length} de ${totalSelected} funcionário(s) a partir dos documentos selecionados.`
            : `Identificados ${ids.length} funcionário(s) a partir dos documentos selecionados.`;

        toast({ title: 'Validação de contatos', description: msg });

        setResolvedEmployeeIds(ids);
        setValidationSendType(type);
        setShowValidationModal(true);
    };

    const handleBatchDelete = () => {
        if (selectedDocuments.length === 0) return;
        setShowBatchDeleteModal(true);
    };

    const confirmBatchDelete = async () => {
        if (selectedDocuments.length === 0) return;

        setIsDeleting(true);
        setError(null);

        try {
            console.log('🗑️ Excluindo documentos:', selectedDocuments);

            // Chamar API para exclusão em lote
            const response = await axios.post('/api/unified-documents/delete-multiple', {
                documentIds: selectedDocuments
            });

            if (response.data.sucesso) {
                console.log('✅ Documentos excluídos com sucesso');

                // Recarregar lista
                await loadDocuments();

                // Limpar seleção
                setSelectedDocuments([]);
                setShowBatchDeleteModal(false);

                setError(null);
            } else {
                setError(response.data.mensagem || 'Erro ao excluir documentos');
            }

        } catch (err: unknown) {
            console.error('❌ Erro ao excluir documentos:', err);
            setError('Erro ao excluir documentos: ' + (err.response?.data?.mensagem || err.message));
        } finally {
            setIsDeleting(false);
        }
    };

    // Funções para análise de falhas na unificação
    const analyzeFailedUnifications = async () => {
        setIsAnalyzing(true);
        setError(null);

        try {
            console.log('🔍 Analisando falhas na unificação...');

            // Chamar API para análise de falhas
            const response = await axios.get('/api/unified-documents/analyze-failures');

            if (response.data.sucesso) {
                console.log('✅ Análise de falhas concluída:', response.data);
                setFailedUnifications(response.data.failedUnifications || []);
                setShowFailedAnalysis(true);
            } else {
                setError(response.data.mensagem || 'Erro ao analisar falhas');
            }

        } catch (err: unknown) {
            console.error('❌ Erro ao analisar falhas:', err);
            setError('Erro ao analisar falhas: ' + (err.response?.data?.mensagem || err.message));
        } finally {
            setIsAnalyzing(false);
        }
    };

    const downloadFailedNamesTxt = () => {
        if (failedUnifications.length === 0) return;

        // Criar conteúdo do arquivo TXT
        const content = [
            'LISTA DE NOMES COM FALHA NA UNIFICAÇÃO',
            '=========================================',
            `Data da análise: ${new Date().toLocaleString('pt-BR')}`,
            `Total de falhas: ${failedUnifications.length}`,
            '',
            'DETALHES DAS FALHAS:',
            '===================',
            ''
        ];

        failedUnifications.forEach((failure, index) => {
            content.push(`${index + 1}. FUNCIONÁRIO: ${failure.employeeName || 'N/A'}`);
            content.push(`   MÊS/ANO: ${failure.month || 'N/A'}/${failure.year || 'N/A'}`);
            content.push(`   MOTIVO: ${failure.reason || 'Motivo não especificado'}`);
            content.push(`   STATUS: ${failure.status || 'N/A'}`);
            if (failure.holeriteFound) {
                content.push(`   HOLERITE: Encontrado (${failure.holeriteFileName || 'N/A'})`);
            } else {
                content.push(`   HOLERITE: Não encontrado`);
            }
            if (failure.receiptFound) {
                content.push(`   COMPROVANTE: Encontrado (${failure.receiptFileName || 'N/A'})`);
            } else {
                content.push(`   COMPROVANTE: Não encontrado`);
            }
            content.push('');
        });

        // Criar e baixar arquivo
        const blob = new Blob([content.join('\n')], { type: 'text/plain;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `falhas-unificacao-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        console.log('📄 Arquivo TXT baixado com sucesso');
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatDate = (dateString: string): string => {
        return new Date(dateString).toLocaleDateString('pt-BR');
    };

    // Função para filtrar documentos
    const getFilteredDocuments = (): UnifiedDocument[] => {
        return documents.filter(doc => {
            // Filtro por tipo de unificação
            if (unificationTypeFilter !== 'all' && doc.unificationType !== unificationTypeFilter) {
                return false;
            }
            
            // Filtro por ano
            if (yearFilter !== 'all' && doc.year !== yearFilter) {
                return false;
            }
            
            // Filtro por mês
            if (monthFilter !== 'all' && doc.month !== monthFilter) {
                return false;
            }
            
            return true;
        });
    };

    // Obter anos únicos dos documentos
    const getUniqueYears = (): number[] => {
        const years = documents.map(doc => doc.year).filter((year, index, arr) => arr.indexOf(year) === index);
        return years.sort((a, b) => b - a); // Ordem decrescente
    };

    // Obter meses únicos dos documentos
    const getUniqueMonths = (): number[] => {
        const months = documents.map(doc => doc.month).filter((month, index, arr) => arr.indexOf(month) === index);
        return months.sort((a, b) => a - b); // Ordem crescente
    };

    // Obter estatísticas dos documentos
    const getDocumentStats = () => {
        const total = documents.length;
        const individual = documents.filter(doc => doc.unificationType === 'INDIVIDUAL').length;
        const batch = documents.filter(doc => doc.unificationType === 'BATCH').length;
        const unknown = documents.filter(doc => doc.unificationType === 'UNKNOWN').length;
        
        return { total, individual, batch, unknown };
    };

    if (!isAuthenticated) {
        return (
            <div className="container mx-auto p-6">
                <Card>
                    <CardContent className="p-6 text-center">
                        <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold mb-2">Acesso Restrito</h2>
                        <p className="text-gray-600">Faça login para acessar os documentos unificados.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6">
            <div className="mb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">📄 Documentos Unificados</h1>
                        <p className="text-gray-600">
                            Gerencie documentos que combinam holerite e recibo de pagamento em um único arquivo.
                        </p>
                        
                        {/* Estatísticas */}
                        {documents.length > 0 && (
                            <div className="flex flex-wrap gap-4 mt-3">
                                {(() => {
                                    const stats = getDocumentStats();
                                    return (
                                        <>
                                            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                                                📊 Total: {stats.total}
                                            </Badge>
                                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                                                👤 Individuais: {stats.individual}
                                            </Badge>
                                            <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                                                📦 Em Lote: {stats.batch}
                                            </Badge>
                                            {stats.unknown > 0 && (
                                                <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                                                    ❓ Desconhecidos: {stats.unknown}
                                                </Badge>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>
                        )}
                    </div>
                    <Button
                        onClick={loadDocuments}
                        variant="outline"
                        className="flex items-center gap-2"
                        disabled={loading}
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Atualizar Lista
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="documents" className="space-y-6">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="documents">📋 Documentos</TabsTrigger>
                    <TabsTrigger value="create">➕ Criar Novo</TabsTrigger>
                    <TabsTrigger value="tools">🛠️ Ferramentas</TabsTrigger>
                </TabsList>

                {/* TAB: Documentos */}
                <TabsContent value="documents" className="space-y-4">
                    {/* Filtros */}
                    {documents.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Search className="h-5 w-5" />
                                    Filtros
                                </CardTitle>
                                <CardDescription>
                                    Filtre os documentos por tipo de unificação, ano e mês
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {/* Filtro por tipo de unificação */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Tipo de Unificação
                                        </label>
                                        <select
                                            value={unificationTypeFilter}
                                            onChange={(e) => setUnificationTypeFilter(e.target.value as any)}
                                            className="w-full h-10 bg-white border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-blue-500/20 outline-none"
                                        >
                                            <option value="all">🔍 Todos os tipos</option>
                                            <option value="INDIVIDUAL">👤 Unificação Individual</option>
                                            <option value="BATCH">📦 Unificação em Lote</option>
                                            <option value="UNKNOWN">❓ Tipo Desconhecido</option>
                                        </select>
                                    </div>

                                    {/* Filtro por ano */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Ano
                                        </label>
                                        <select
                                            value={yearFilter}
                                            onChange={(e) => setYearFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                                            className="w-full h-10 bg-white border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-blue-500/20 outline-none"
                                        >
                                            <option value="all">📅 Todos os anos</option>
                                            {getUniqueYears().map(year => (
                                                <option key={year} value={year}>{year}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Filtro por mês */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Mês
                                        </label>
                                        <select
                                            value={monthFilter}
                                            onChange={(e) => setMonthFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                                            className="w-full h-10 bg-white border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-blue-500/20 outline-none"
                                        >
                                            <option value="all">📆 Todos os meses</option>
                                            {getUniqueMonths().map(month => (
                                                <option key={month} value={month}>
                                                    {month.toString().padStart(2, '0')}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Resultados do filtro */}
                                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                                    <p className="text-sm text-gray-600">
                                        📊 Mostrando <strong>{getFilteredDocuments().length}</strong> de <strong>{documents.length}</strong> documentos
                                        {unificationTypeFilter !== 'all' && ` • Tipo: ${unificationTypeFilter}`}
                                        {yearFilter !== 'all' && ` • Ano: ${yearFilter}`}
                                        {monthFilter !== 'all' && ` • Mês: ${monthFilter.toString().padStart(2, '0')}`}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                Lista de Documentos Unificados
                            </CardTitle>
                            <CardDescription>
                                Visualize, baixe e compartilhe seus documentos unificados
                            </CardDescription>

                            {/* Controles de seleção */}
                            {getFilteredDocuments().length > 0 && (
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t">
                                    <div className="flex items-center gap-3">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleSelectAll}
                                            className="flex items-center gap-2"
                                        >
                                            {selectedDocuments.length === getFilteredDocuments().length ? (
                                                <CheckSquare className="h-4 w-4" />
                                            ) : (
                                                <Square className="h-4 w-4" />
                                            )}
                                            {selectedDocuments.length === getFilteredDocuments().length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                                        </Button>

                                        {selectedDocuments.length > 0 && (
                                            <div className="flex items-center gap-2">
                                                <Badge variant="secondary" className="text-sm">
                                                    {selectedDocuments.length} documento(s) selecionado(s)
                                                </Badge>
                                                {/* Envio Rápido com Validação */}
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleSendSelected('whatsapp')}
                                                    className="flex items-center gap-2"
                                                >
                                                    <MessageCircle className="h-4 w-4" />
                                                    Enviar WhatsApp
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleSendSelected('email')}
                                                    className="flex items-center gap-2"
                                                >
                                                    <Mail className="h-4 w-4" />
                                                    Enviar Email
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleSendSelected('both')}
                                                    className="flex items-center gap-2"
                                                >
                                                    <Mail className="h-4 w-4" />
                                                    +
                                                    <MessageCircle className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={handleBatchDelete}
                                                    className="flex items-center gap-2"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                    Excluir Selecionados
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="text-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                                    <p className="mt-2 text-gray-600">Carregando documentos...</p>
                                </div>
                            ) : error ? (
                                <div className="text-center py-8">
                                    <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                                    <p className="text-red-600">{error}</p>
                                    <Button onClick={loadDocuments} className="mt-4">Tentar Novamente</Button>
                                </div>
                            ) : getFilteredDocuments().length === 0 ? (
                                <div className="text-center py-8">
                                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                    <p className="text-gray-600">
                                        {documents.length === 0 
                                            ? "Nenhum documento unificado encontrado" 
                                            : "Nenhum documento corresponde aos filtros aplicados"
                                        }
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        {documents.length === 0 
                                            ? "Crie seu primeiro documento na aba \"Criar Novo\"" 
                                            : "Tente ajustar os filtros para ver mais documentos"
                                        }
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {getFilteredDocuments().map((doc) => (
                                        <Card key={doc.id} className={`border-l-4 border-l-blue-500 ${selectedDocuments.includes(doc.id) ? 'ring-2 ring-blue-200 bg-blue-50' : ''}`}>
                                            <CardContent className="p-4">
                                                <div className="flex items-start gap-3">
                                                    {/* Checkbox */}
                                                    <button
                                                        onClick={() => handleSelectDocument(doc.id)}
                                                        className="mt-1 flex-shrink-0"
                                                    >
                                                        {selectedDocuments.includes(doc.id) ? (
                                                            <CheckSquare className="h-5 w-5 text-blue-600" />
                                                        ) : (
                                                            <Square className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                                                        )}
                                                    </button>

                                                    {/* Conteúdo do documento */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-3 mb-2">
                                                                    <h3 className="font-semibold text-lg">{doc.employeeName}</h3>
                                                                    <Badge variant="secondary">
                                                                        {doc.month}/{doc.year}
                                                                    </Badge>
                                                                    {/* Badge do tipo de unificação */}
                                                                    <Badge 
                                                                        variant="outline" 
                                                                        className={
                                                                            doc.unificationType === 'INDIVIDUAL' ? 'bg-green-100 text-green-800 border-green-300' :
                                                                            doc.unificationType === 'BATCH' ? 'bg-purple-100 text-purple-800 border-purple-300' :
                                                                            'bg-orange-100 text-orange-800 border-orange-300'
                                                                        }
                                                                    >
                                                                        {doc.unificationType === 'INDIVIDUAL' ? '👤 Individual' :
                                                                         doc.unificationType === 'BATCH' ? '📦 Em Lote' :
                                                                         '❓ Desconhecido'}
                                                                    </Badge>
                                                                </div>
                                                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                                                    <span className="flex items-center gap-1">
                                                                        <FileText className="h-4 w-4" />
                                                                        {doc.fileName}
                                                                    </span>
                                                                    <span className="flex items-center gap-1">
                                                                        <Calendar className="h-4 w-4" />
                                                                        {doc.createdAtFormatted || formatDate(doc.createdAt)}
                                                                    </span>
                                                                    <span className="flex items-center gap-1">
                                                                        <Download className="h-4 w-4" />
                                                                        {formatFileSize(doc.fileSize)}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-2">
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => handleViewDocument(doc)}
                                                                    className="flex items-center gap-1"
                                                                >
                                                                    <Eye className="h-4 w-4" />
                                                                    Visualizar
                                                                </Button>

                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => handleDownloadDocument(doc)}
                                                                    className="flex items-center gap-1"
                                                                >
                                                                    <Download className="h-4 w-4" />
                                                                    Baixar
                                                                </Button>

                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => handleSendEmail(doc)}
                                                                    className="flex items-center gap-1"
                                                                >
                                                                    <Mail className="h-4 w-4" />
                                                                    Email
                                                                </Button>

                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => handleSendWhatsApp(doc)}
                                                                    className="flex items-center gap-1"
                                                                >
                                                                    <MessageCircle className="h-4 w-4" />
                                                                    WhatsApp
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB: Criar Novo */}
                <TabsContent value="create" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Plus className="h-5 w-5" />
                                Criar Novo Documento Unificado
                            </CardTitle>
                            <CardDescription>
                                Combine holerite e recibo de pagamento em um único arquivo
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        <User className="h-4 w-4 inline mr-2" />
                                        Nome do Funcionário
                                    </label>
                                    <Input
                                        type="text"
                                        placeholder="Ex: RICARDO XAVIER DE ANDRADE"
                                        value={createForm.employeeName}
                                        onChange={(e) => setCreateForm({ ...createForm, employeeName: e.target.value })}
                                        className="w-full"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            <Calendar className="h-4 w-4 inline mr-2" />
                                            Mês
                                        </label>
                                        <Input
                                            type="number"
                                            min="1"
                                            max="12"
                                            value={createForm.month}
                                            onChange={(e) => setCreateForm({ ...createForm, month: parseInt(e.target.value) })}
                                            className="w-full"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            <Calendar className="h-4 w-4 inline mr-2" />
                                            Ano
                                        </label>
                                        <Input
                                            type="number"
                                            min="2020"
                                            max="2030"
                                            value={createForm.year}
                                            onChange={(e) => setCreateForm({ ...createForm, year: parseInt(e.target.value) })}
                                            className="w-full"
                                        />
                                    </div>
                                </div>

                                <Button
                                    onClick={createUnifiedDocument}
                                    disabled={loading || !createForm.employeeName.trim()}
                                    className="w-full"
                                >
                                    {loading ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            Criando Documento...
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="h-4 w-4 mr-2" />
                                            Criar Documento Unificado
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB: Ferramentas */}
                <TabsContent value="tools" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Mail className="h-5 w-5" />
                                    Teste de Email
                                </CardTitle>
                                <CardDescription>
                                    Verifique se a configuração de email está funcionando
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button
                                    onClick={async () => {
                                        try {
                                            const response = await axios.get('/api/unified-documents/test-email');
                                            if (response.data.sucesso) {
                                                alert('✅ Configuração de email funcionando!');
                                            } else {
                                                alert('❌ Erro na configuração de email');
                                            }
                                        } catch (err: unknown) {
                                            alert('❌ Erro ao testar email: ' + err.message);
                                        }
                                    }}
                                    className="w-full"
                                >
                                    Testar Configuração de Email
                                </Button>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <MessageCircle className="h-5 w-5" />
                                    Teste do WhatsApp
                                </CardTitle>
                                <CardDescription>
                                    Verifique se a configuração do WhatsApp está funcionando
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button
                                    onClick={async () => {
                                        try {
                                            const response = await axios.get('/api/unified-documents/test-whatsapp');
                                            if (response.data.sucesso) {
                                                alert('✅ Configuração do WhatsApp funcionando!');
                                            } else {
                                                alert('❌ Erro na configuração do WhatsApp');
                                            }
                                        } catch (err: unknown) {
                                            alert('❌ Erro ao testar WhatsApp: ' + err.message);
                                        }
                                    }}
                                    className="w-full"
                                >
                                    Testar Configuração do WhatsApp
                                </Button>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Análise de Falhas na Unificação */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-orange-500" />
                                Análise de Falhas na Unificação
                            </CardTitle>
                            <CardDescription>
                                Analise e baixe relatório dos nomes que falharam na unificação
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex flex-col sm:flex-row gap-3">
                                <Button
                                    onClick={analyzeFailedUnifications}
                                    disabled={isAnalyzing}
                                    className="flex items-center gap-2"
                                >
                                    {isAnalyzing ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            Analisando...
                                        </>
                                    ) : (
                                        <>
                                            <Search className="h-4 w-4" />
                                            Analisar Falhas
                                        </>
                                    )}
                                </Button>

                                {failedUnifications.length > 0 && (
                                    <Button
                                        onClick={downloadFailedNamesTxt}
                                        variant="outline"
                                        className="flex items-center gap-2"
                                    >
                                        <FileDown className="h-4 w-4" />
                                        Baixar Lista TXT
                                    </Button>
                                )}
                            </div>

                            {failedUnifications.length > 0 && (
                                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                                    <h4 className="font-semibold text-orange-800 mb-2">
                                        📊 Resultado da Análise
                                    </h4>
                                    <p className="text-orange-700 text-sm">
                                        Encontradas <strong>{failedUnifications.length} falhas</strong> na unificação.
                                        Clique em "Baixar Lista TXT" para obter o relatório detalhado.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* DIALOG: Enviar Email */}
            <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>📧 Enviar Documento por Email</DialogTitle>
                        <DialogDescription>
                            Envie o documento unificado por email com anexo
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Email do Destinatário
                            </label>
                            <Input
                                type="email"
                                placeholder="exemplo@email.com"
                                value={emailForm.toEmail}
                                onChange={(e) => setEmailForm({ ...emailForm, toEmail: e.target.value })}
                            />
                        </div>

                        <div className="bg-gray-50 p-3 rounded-lg">
                            <p className="text-sm text-gray-600">
                                <strong>Documento:</strong> {emailForm.employeeName} - {emailForm.month}/{emailForm.year}
                            </p>
                        </div>

                        <div className="flex gap-2">
                            <Button
                                onClick={sendEmail}
                                disabled={loading || !emailForm.toEmail.trim()}
                                className="flex-1"
                            >
                                {loading ? 'Enviando...' : 'Enviar Email'}
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => setShowEmailDialog(false)}
                            >
                                Cancelar
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* DIALOG: Enviar WhatsApp */}
            <Dialog open={showWhatsappDialog} onOpenChange={setShowWhatsappDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>📱 Compartilhar via WhatsApp</DialogTitle>
                        <DialogDescription>
                            Gere um link para compartilhar o documento via WhatsApp
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <Phone className="h-4 w-4 inline mr-2" />
                                Número de Telefone
                            </label>
                            <Input
                                type="tel"
                                placeholder="(11) 99999-9999"
                                value={whatsappForm.phoneNumber}
                                onChange={(e) => setWhatsappForm({ ...whatsappForm, phoneNumber: e.target.value })}
                            />
                        </div>

                        <div className="bg-gray-50 p-3 rounded-lg">
                            <p className="text-sm text-gray-600">
                                <strong>Documento:</strong> {whatsappForm.employeeName} - {whatsappForm.month}/{whatsappForm.year}
                            </p>
                        </div>

                        {!whatsappLink ? (
                            <div className="flex gap-2">
                                <Button
                                    onClick={generateWhatsAppLink}
                                    disabled={loading || !whatsappForm.phoneNumber.trim()}
                                    className="flex-1"
                                >
                                    {loading ? 'Gerando...' : 'Gerar Link do WhatsApp'}
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => setShowWhatsappDialog(false)}
                                >
                                    Cancelar
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                                    <p className="text-sm text-green-800">
                                        ✅ Link do WhatsApp gerado com sucesso!
                                    </p>
                                </div>

                                <div className="flex gap-2">
                                    <Button
                                        onClick={openWhatsApp}
                                        className="flex-1 bg-green-600 hover:bg-green-700"
                                    >
                                        <MessageCircle className="h-4 w-4 mr-2" />
                                        Abrir WhatsApp
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setWhatsappLink(null);
                                            setShowWhatsappDialog(false);
                                        }}
                                    >
                                        Fechar
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* MODAL: Validação de Contatos para envio */}
            <ContactValidationModal
                open={showValidationModal}
                onClose={() => setShowValidationModal(false)}
                employeeIds={resolvedEmployeeIds}
                sendType={validationSendType}
                documentType="unificado"
                onValidated={handleValidated}
            />

            {/* MODAL CUSTOMIZADO: Exclusão em Lote */}
            {showBatchDeleteModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
                    onClick={() => setShowBatchDeleteModal(false)}
                >
                    <div
                        className="bg-seguranca-graphite rounded-lg shadow-2xl w-[90vw] max-w-4xl max-h-[85vh] flex flex-col border border-gray-600"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex-shrink-0 bg-red-900/30 p-4 border-b border-red-700 rounded-t-lg">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Trash2 className="h-6 w-6 text-red-500 flex-shrink-0" />
                                    <h2 className="text-lg font-semibold text-red-400">Excluir Documentos em Lote</h2>
                                </div>
                                <button
                                    onClick={() => setShowBatchDeleteModal(false)}
                                    className="text-gray-400 hover:text-white transition-colors"
                                >
                                    <XCircle className="h-6 w-6" />
                                </button>
                            </div>
                            <p className="text-red-400 mt-2 text-sm">
                                ⚠️ Tem certeza que deseja excluir <strong>{selectedDocuments.length} documento(s)</strong> selecionado(s)?
                                <br />
                                <span className="text-xs text-red-500">Esta ação não pode ser desfeita.</span>
                            </p>
                        </div>

                        {/* Body - Lista de documentos */}
                        <div className="flex-1 overflow-y-auto p-4">
                            <div className="space-y-2">
                                {selectedDocuments.map((docId) => {
                                    const doc = documents.find(d => d.id === docId);
                                    return doc ? (
                                        <div
                                            key={docId}
                                            className="bg-seguranca-black p-3 rounded-lg border border-gray-600 hover:border-gray-500 transition-colors"
                                        >
                                            <div className="flex items-start gap-2">
                                                <FileText className="h-4 w-4 text-seguranca-yellow flex-shrink-0 mt-1" />
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-medium text-seguranca-lightgray mb-1">
                                                        {doc.employeeName}
                                                    </div>
                                                    <div className="text-xs text-gray-400 font-mono break-all">
                                                        {doc.fileName}
                                                    </div>

                                                    <div className="flex items-center gap-2 mt-2">
                                                        <span className="bg-seguranca-graphite text-gray-300 px-2 py-0.5 rounded text-xs border border-gray-600">
                                                            {doc.month}/{doc.year}
                                                        </span>
                                                        <span className="bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded text-xs border border-blue-700">
                                                            {formatFileSize(doc.fileSize)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : null;
                                })}
                            </div>
                        </div>

                        {/* Footer - Botões de ação */}
                        <div className="flex-shrink-0 flex justify-end gap-3 p-4 bg-seguranca-black border-t border-gray-600 rounded-b-lg">
                            <Button
                                variant="outline"
                                onClick={() => setShowBatchDeleteModal(false)}
                                disabled={isDeleting}
                                className="border-gray-600 hover:bg-seguranca-graphite text-seguranca-lightgray"
                            >
                                <XCircle className="h-4 w-4 mr-2" />
                                Cancelar
                            </Button>
                            <Button
                                onClick={confirmBatchDelete}
                                disabled={isDeleting}
                                className="bg-red-600 hover:bg-red-700 text-white font-semibold"
                            >
                                {isDeleting ? (
                                    <div className="flex items-center gap-2">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        Excluindo...
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <Trash2 className="h-4 w-4" />
                                        Excluir {selectedDocuments.length} Documentos
                                    </div>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* FEEDBACK: Email Enviado */}
            {
                emailSent && (
                    <div className="fixed bottom-4 right-4 bg-green-500 text-white p-4 rounded-lg shadow-lg flex items-center gap-2">
                        <CheckCircle className="h-5 w-5" />
                        <span>Email enviado com sucesso!</span>
                    </div>
                )
            }
        </div >
    );
};

export default DocumentosUnificados;
