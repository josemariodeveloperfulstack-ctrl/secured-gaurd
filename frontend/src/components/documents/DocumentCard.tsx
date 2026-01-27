import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { FileText, Download, Eye, Loader2, Sparkles, FileSpreadsheet, Info } from 'lucide-react';
import { MIGRATED_DOCUMENTS, DOCUMENT_DISPLAY_NAMES } from '@/hooks/useDocumentGeneration';
import { cn } from '@/lib/utils';

export interface DocumentCardProps {
    /** Slug do tipo de documento */
    documentType: string;
    /** Título customizado (opcional, usa display name se não fornecido) */
    title?: string;
    /** Descrição do documento */
    description?: string;
    /** Ícone customizado */
    icon?: React.ReactNode;
    /** Se está carregando */
    loading?: boolean;
    /** Status de disponibilidade */
    status?: 'disponivel' | 'indisponivel' | 'em-desenvolvimento';
    /** Callback ao clicar em gerar PDF */
    onGeneratePDF?: () => void;
    /** Callback ao clicar em visualizar */
    onPreview?: () => void;
    /** Callback ao clicar em gerar Excel */
    onGenerateExcel?: () => void;
    /** Se mostra botão de Excel */
    showExcelButton?: boolean;
    /** Classes CSS adicionais */
    className?: string;
    /** Empresa específica (para ordens de serviço) */
    companySpecific?: string;
}

/**
 * Card de documento com suporte a badge de novo layout
 * Usado para exibir opções de geração de documentos na interface
 */
export const DocumentCard: React.FC<DocumentCardProps> = ({
    documentType,
    title,
    description,
    icon,
    loading = false,
    status = 'disponivel',
    onGeneratePDF,
    onPreview,
    onGenerateExcel,
    showExcelButton = true,
    className,
    companySpecific,
}) => {
    // Verifica se usa novo layout
    const usesNewLayout = MIGRATED_DOCUMENTS.has(documentType);

    // Título de exibição
    const displayTitle = title || DOCUMENT_DISPLAY_NAMES[documentType] || documentType;

    // Status badge
    const getStatusBadge = () => {
        switch (status) {
            case 'disponivel':
                return (
                    <Badge variant="outline" className="bg-green-900/20 text-green-400 border-green-700">
                        Disponível
                    </Badge>
                );
            case 'indisponivel':
                return (
                    <Badge variant="outline" className="bg-red-900/20 text-red-400 border-red-700">
                        Indisponível
                    </Badge>
                );
            case 'em-desenvolvimento':
                return (
                    <Badge variant="outline" className="bg-yellow-900/20 text-yellow-400 border-yellow-700">
                        Em Desenvolvimento
                    </Badge>
                );
            default:
                return null;
        }
    };

    return (
        <Card className={cn(
            "relative overflow-hidden transition-all duration-300 hover:shadow-lg",
            "border-gray-700 bg-seguranca-graphite",
            status === 'indisponivel' && "opacity-60",
            className
        )}>
            {/* Badge de Novo Layout */}
            {usesNewLayout && (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="absolute top-2 right-2 z-10">
                                <Badge
                                    className="bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0 gap-1 px-2 py-0.5 text-xs font-medium shadow-md"
                                >
                                    <Sparkles className="h-3 w-3" />
                                    Novo Layout
                                </Badge>
                            </div>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="max-w-xs">
                            <div className="space-y-1">
                                <p className="font-semibold">✨ Layout Padronizado</p>
                                <p className="text-sm text-muted-foreground">
                                    Este documento usa o novo layout com cabeçalho e rodapé
                                    em todas as páginas para impressão profissional.
                                </p>
                            </div>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}

            {/* Status Badge */}
            <div className="absolute top-2 left-2">
                {getStatusBadge()}
            </div>

            <CardHeader className="pt-10 pb-2">
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-seguranca-yellow/10 rounded-lg text-seguranca-yellow">
                        {icon || <FileText className="h-6 w-6" />}
                    </div>
                    <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg text-white truncate">
                            {displayTitle}
                        </CardTitle>
                        {companySpecific && (
                            <p className="text-sm text-seguranca-lightgray mt-0.5">
                                Modelo específico para {companySpecific}
                            </p>
                        )}
                        {description && (
                            <CardDescription className="text-seguranca-lightgray/70 mt-1 line-clamp-2">
                                {description}
                            </CardDescription>
                        )}
                    </div>
                </div>
            </CardHeader>

            <CardContent className="pt-2 pb-4">
                <div className="flex flex-wrap gap-2">
                    {/* Botão Visualizar */}
                    {onPreview && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onPreview}
                            disabled={loading || status !== 'disponivel'}
                            className="border-seguranca-lightgray/30 text-seguranca-lightgray hover:bg-seguranca-lightgray/10 hover:text-white"
                        >
                            {loading ? (
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                                <Eye className="h-4 w-4 mr-1" />
                            )}
                            Ver
                        </Button>
                    )}

                    {/* Botão Gerar PDF */}
                    {onGeneratePDF && (
                        <Button
                            size="sm"
                            onClick={onGeneratePDF}
                            disabled={loading || status !== 'disponivel'}
                            className="bg-seguranca-yellow text-seguranca-black hover:bg-seguranca-yellow/90"
                        >
                            {loading ? (
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                                <Download className="h-4 w-4 mr-1" />
                            )}
                            Gerar
                        </Button>
                    )}

                    {/* Botão Gerar Excel */}
                    {showExcelButton && onGenerateExcel && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onGenerateExcel}
                            disabled={loading || status !== 'disponivel'}
                            className="border-green-700 text-green-400 hover:bg-green-900/20"
                        >
                            {loading ? (
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                                <FileSpreadsheet className="h-4 w-4 mr-1" />
                            )}
                            Excel
                        </Button>
                    )}
                </div>

                {/* Info sobre novo layout */}
                {usesNewLayout && (
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-green-400/80">
                        <Info className="h-3 w-3" />
                        <span>Layout padronizado com cabeçalho/rodapé em todas as páginas</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default DocumentCard;
