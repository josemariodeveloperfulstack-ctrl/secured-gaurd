import { useState, useCallback } from 'react';
import api from '@/lib/axios';
import { useToast } from '@/hooks/use-toast';

/**
 * Tipos de documentos disponíveis no sistema
 * Sincronizado com DocumentLayoutFactory.DocumentType no backend
 */
export const DOCUMENT_TYPES = {
    // ✅ Onda 0: Já migrados
    EMPLOYEE_RECORD: 'employee-record',
    ACCOUNTING_FORM: 'accounting-form',
    EPI_DELIVERY: 'epi-delivery',

    // 🔄 Onda 1: Documentos RH
    LGPD_CONSENT: 'lgpd-consent',
    EMPLOYMENT_CONTRACT: 'employment-contract',
    DISCIPLINARY_WARNING: 'disciplinary-warning',
    TRANSPORT_VOUCHER: 'transport-voucher',
    EQUIPMENT_RESPONSIBILITY: 'equipment-responsibility',
    DAMAGE_FINES_RESPONSIBILITY: 'damage-fines-responsibility',
    BODY_CAM_RESPONSIBILITY: 'body-cam-responsibility',
    SERVICE_PROVIDER_AWARENESS: 'service-provider-awareness',
    DECLARATION: 'declaration',

    // 🔄 Onda 2: Ordens de Serviço
    SERVICE_ORDER_STANDARD: 'service-order-standard',
    SERVICE_ORDER_CSN: 'service-order-csn',
    SERVICE_ORDER_ATERPA: 'service-order-aterpa',
    SERVICE_ORDER_TRANSPES: 'service-order-transpes',
    SERVICE_ORDER_ASG_ATERPA: 'service-order-asg-aterpa',
    SERVICE_ORDER_ASG_TRANSPES: 'service-order-asg-transpes',
    SERVICE_ORDER_RECEPTIONIST: 'service-order-receptionist',
    SERVICE_ORDER_CRUD: 'service-order-crud',

    // 🔄 Onda 3: Relatórios
    VISIT_CONTROL_REPORT: 'visit-control-report',
    VEHICLE_MAINTENANCE_REPORT: 'vehicle-maintenance-report',
    TRANSPORT_GUIDE: 'transport-guide',
    SCHEDULE_REPORT: 'schedule-report',
    RELOCATION_REPORT: 'relocation-report',
    OPERATIONAL_OCCURRENCE_REPORT: 'operational-occurrence-report',
    FUEL_RECORD_REPORT: 'fuel-record-report',
    FINE_REPORT: 'fine-report',
    ACTIVITY_REPORT: 'activity-report',
    ADMISSION_REQUEST: 'admission-request',
} as const;

export type DocumentTypeKey = keyof typeof DOCUMENT_TYPES;
export type DocumentTypeSlug = typeof DOCUMENT_TYPES[DocumentTypeKey];

/**
 * Documentos que já foram migrados para o novo layout
 * Atualizar conforme documentos forem migrados
 */
export const MIGRATED_DOCUMENTS = new Set<string>([
    DOCUMENT_TYPES.EMPLOYEE_RECORD,
    DOCUMENT_TYPES.ACCOUNTING_FORM,
    DOCUMENT_TYPES.EPI_DELIVERY,
    DOCUMENT_TYPES.LGPD_CONSENT, // ✅ Migrado na Onda 1
    // Novos documentos serão adicionados aqui conforme migração
]);

/**
 * Nomes de exibição dos documentos
 */
export const DOCUMENT_DISPLAY_NAMES: Record<string, string> = {
    [DOCUMENT_TYPES.EMPLOYEE_RECORD]: 'Ficha de Registro de Funcionário',
    [DOCUMENT_TYPES.ACCOUNTING_FORM]: 'Ficha de Cadastro de Funcionário',
    [DOCUMENT_TYPES.EPI_DELIVERY]: 'Ficha de Entrega de EPI',
    [DOCUMENT_TYPES.LGPD_CONSENT]: 'Termo de Proteção de Dados – LGPD (VIG)',
    [DOCUMENT_TYPES.EMPLOYMENT_CONTRACT]: 'Contrato de Trabalho',
    [DOCUMENT_TYPES.DISCIPLINARY_WARNING]: 'Advertência Disciplinar',
    [DOCUMENT_TYPES.TRANSPORT_VOUCHER]: 'Termo de Compromisso de Vale-Transporte',
    [DOCUMENT_TYPES.EQUIPMENT_RESPONSIBILITY]: 'Termo de Responsabilidade de Equipamento',
    [DOCUMENT_TYPES.DAMAGE_FINES_RESPONSIBILITY]: 'Termo de Responsabilidade por Danos e Multas',
    [DOCUMENT_TYPES.BODY_CAM_RESPONSIBILITY]: 'Termo de Responsabilidade e Uso de Body Cam',
    [DOCUMENT_TYPES.SERVICE_PROVIDER_AWARENESS]: 'Termo de Ciência do Prestador de Serviços',
    [DOCUMENT_TYPES.DECLARATION]: 'Declaração',
    [DOCUMENT_TYPES.SERVICE_ORDER_STANDARD]: 'Ordem de Serviço Padrão',
    [DOCUMENT_TYPES.SERVICE_ORDER_CSN]: 'Ordem de Serviço CSN',
    [DOCUMENT_TYPES.SERVICE_ORDER_ATERPA]: 'Ordem de Serviço ATERPA',
    [DOCUMENT_TYPES.SERVICE_ORDER_TRANSPES]: 'Ordem de Serviço Transpes',
    [DOCUMENT_TYPES.SERVICE_ORDER_ASG_ATERPA]: 'ASG Ordem de Serviço ATERPA',
    [DOCUMENT_TYPES.SERVICE_ORDER_ASG_TRANSPES]: 'ASG Ordem de Serviço TRANSPES',
    [DOCUMENT_TYPES.SERVICE_ORDER_RECEPTIONIST]: 'Ordem de Serviço Recepcionista',
    [DOCUMENT_TYPES.SERVICE_ORDER_CRUD]: 'Ordem de Serviço Completa',
    // ... outros
};

export interface DocumentGenerationOptions {
    documentType: string;
    onSuccess?: () => void;
    onError?: (error: Error) => void;
}

export interface MigrationStatus {
    total: number;
    migrated: number;
    pending: number;
    percentage: number;
    waves: WaveStatus[];
    migratedDocuments: DocumentInfo[];
    pendingDocuments: DocumentInfo[];
}

export interface WaveStatus {
    wave: string;
    description: string;
    total: number;
    migrated: number;
    pending: number;
    percentage: number;
}

export interface DocumentInfo {
    type: string;
    displayName: string;
    slug: string;
    migrated: boolean;
}

/**
 * Hook para geração de documentos com suporte a novos e antigos layouts
 */
export const useDocumentGeneration = ({
    documentType,
    onSuccess,
    onError,
}: DocumentGenerationOptions) => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    // Verifica se o documento usa o novo layout
    const useNewLayout = MIGRATED_DOCUMENTS.has(documentType);

    /**
     * Abre um blob em nova aba
     */
    const openBlobInNewTab = useCallback((blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => window.URL.revokeObjectURL(url), 100);
    }, []);

    /**
     * Faz download de um blob
     */
    const downloadBlob = useCallback((blob: Blob, filename: string) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
    }, []);

    /**
     * Gera um documento PDF
     */
    const generatePDF = useCallback(async (
        data: any,
        options: { mode?: 'download' | 'preview'; filename?: string } = {}
    ) => {
        const { mode = 'download', filename } = options;
        setLoading(true);

        try {
            const response = await api.post(`/${documentType}/generate-pdf`, data, {
                responseType: 'blob',
            });

            const blob = new Blob([response.data], { type: 'application/pdf' });

            if (mode === 'preview') {
                openBlobInNewTab(blob);
            } else {
                const defaultFilename = `${documentType}-${Date.now()}.pdf`;
                downloadBlob(blob, filename || defaultFilename);
            }

            toast({
                title: '✅ PDF gerado com sucesso',
                description: useNewLayout
                    ? 'Documento gerado com novo layout padronizado'
                    : 'Documento gerado',
            });

            onSuccess?.();
            return blob;
        } catch (error) {
            console.error('❌ Erro ao gerar PDF:', error);
            toast({
                title: 'Erro ao gerar PDF',
                description: 'Não foi possível gerar o documento. Tente novamente.',
                variant: 'destructive',
            });
            onError?.(error as Error);
            throw error;
        } finally {
            setLoading(false);
        }
    }, [documentType, useNewLayout, toast, onSuccess, onError, openBlobInNewTab, downloadBlob]);

    /**
     * Gera um documento Excel
     */
    const generateExcel = useCallback(async (
        data: any,
        options: { filename?: string } = {}
    ) => {
        const { filename } = options;
        setLoading(true);

        try {
            const response = await api.post(`/${documentType}/generate-excel`, data, {
                responseType: 'blob',
            });

            const blob = new Blob([response.data], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });

            const defaultFilename = `${documentType}-${Date.now()}.xlsx`;
            downloadBlob(blob, filename || defaultFilename);

            toast({
                title: '✅ Excel gerado com sucesso',
                description: useNewLayout
                    ? 'Documento gerado com novo layout padronizado (cabeçalho/rodapé em todas as páginas)'
                    : 'Documento gerado',
            });

            onSuccess?.();
            return blob;
        } catch (error) {
            console.error('❌ Erro ao gerar Excel:', error);
            toast({
                title: 'Erro ao gerar Excel',
                description: 'Não foi possível gerar o documento. Tente novamente.',
                variant: 'destructive',
            });
            onError?.(error as Error);
            throw error;
        } finally {
            setLoading(false);
        }
    }, [documentType, useNewLayout, toast, onSuccess, onError, downloadBlob]);

    return {
        useNewLayout,
        loading,
        generatePDF,
        generateExcel,
        openBlobInNewTab,
        downloadBlob,
    };
};

/**
 * Hook para buscar status de migração do backend
 */
export const useMigrationStatus = () => {
    const [status, setStatus] = useState<MigrationStatus | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const fetchStatus = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await api.get('/documents/migration-status');
            setStatus(response.data);
        } catch (err) {
            console.error('❌ Erro ao buscar status de migração:', err);
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        status,
        loading,
        error,
        fetchStatus,
        refetch: fetchStatus,
    };
};

export default useDocumentGeneration;
