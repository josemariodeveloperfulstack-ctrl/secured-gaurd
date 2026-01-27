import React, { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, FileText, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { useMigrationStatus } from '@/hooks/useDocumentGeneration';

/**
 * Componente que exibe o status de migração de documentos
 * Mostra progresso geral e por onda
 */
export const MigrationStatusCard: React.FC = () => {
    const { status, loading, error, fetchStatus } = useMigrationStatus();

    useEffect(() => {
        fetchStatus();
    }, [fetchStatus]);

    if (loading && !status) {
        return (
            <Card className="border-gray-700 bg-seguranca-graphite">
                <CardContent className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-seguranca-yellow" />
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="border-gray-700 bg-seguranca-graphite">
                <CardContent className="py-6 text-center">
                    <p className="text-red-400 mb-4">Erro ao carregar status de migração</p>
                    <Button variant="outline" onClick={fetchStatus}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Tentar novamente
                    </Button>
                </CardContent>
            </Card>
        );
    }

    if (!status) {
        return null;
    }

    return (
        <Card className="border-gray-700 bg-seguranca-graphite">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-white flex items-center gap-2">
                            <FileText className="h-5 w-5 text-seguranca-yellow" />
                            Status de Migração de Documentos
                        </CardTitle>
                        <CardDescription className="text-seguranca-lightgray/70">
                            Progresso da padronização de layouts
                        </CardDescription>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={fetchStatus}
                        disabled={loading}
                        className="text-seguranca-lightgray hover:text-white"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="space-y-6">
                {/* Progresso Geral */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-seguranca-lightgray">Progresso Geral</span>
                        <span className="text-white font-medium">
                            {status.migrated}/{status.total} ({status.percentage.toFixed(1)}%)
                        </span>
                    </div>
                    <Progress
                        value={status.percentage}
                        className="h-3 bg-gray-700"
                    />
                </div>

                {/* Status por Onda */}
                <div className="space-y-3">
                    <h4 className="text-sm font-medium text-white">Por Categoria</h4>

                    {status.waves.map((wave, index) => (
                        <div
                            key={wave.wave}
                            className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50 border border-gray-700"
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${wave.percentage === 100
                                        ? 'bg-green-900/30 text-green-400'
                                        : wave.percentage > 0
                                            ? 'bg-yellow-900/30 text-yellow-400'
                                            : 'bg-gray-700 text-gray-400'
                                    }`}>
                                    {wave.percentage === 100 ? (
                                        <CheckCircle2 className="h-4 w-4" />
                                    ) : (
                                        <Clock className="h-4 w-4" />
                                    )}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-white">
                                        Onda {index}: {wave.description}
                                    </p>
                                    <p className="text-xs text-seguranca-lightgray/70">
                                        {wave.migrated}/{wave.total} documentos
                                    </p>
                                </div>
                            </div>

                            <Badge
                                variant="outline"
                                className={
                                    wave.percentage === 100
                                        ? 'bg-green-900/20 text-green-400 border-green-700'
                                        : wave.percentage > 0
                                            ? 'bg-yellow-900/20 text-yellow-400 border-yellow-700'
                                            : 'bg-gray-700 text-gray-400 border-gray-600'
                                }
                            >
                                {wave.percentage.toFixed(0)}%
                            </Badge>
                        </div>
                    ))}
                </div>

                {/* Resumo */}
                <div className="grid grid-cols-3 gap-3 pt-2 border-t border-gray-700">
                    <div className="text-center">
                        <p className="text-2xl font-bold text-green-400">{status.migrated}</p>
                        <p className="text-xs text-seguranca-lightgray/70">Migrados</p>
                    </div>
                    <div className="text-center">
                        <p className="text-2xl font-bold text-yellow-400">{status.pending}</p>
                        <p className="text-xs text-seguranca-lightgray/70">Pendentes</p>
                    </div>
                    <div className="text-center">
                        <p className="text-2xl font-bold text-white">{status.total}</p>
                        <p className="text-xs text-seguranca-lightgray/70">Total</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default MigrationStatusCard;
