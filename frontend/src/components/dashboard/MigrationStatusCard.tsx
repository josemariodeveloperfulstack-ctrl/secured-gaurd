import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { FileText, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { useMigrationStatus } from '@/hooks/useDocumentGeneration';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export const MigrationStatusCard: React.FC = () => {
    const { status, loading, fetchStatus } = useMigrationStatus();

    useEffect(() => {
        fetchStatus();
    }, [fetchStatus]);

    if (loading && !status) {
        return (
            <Card className="border-gray-700 bg-seguranca-graphite">
                <CardContent className="h-40 flex items-center justify-center text-seguranca-lightgray">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    Carregando status...
                </CardContent>
            </Card>
        );
    }

    if (!status) return null;

    return (
        <Card className="border-gray-700 bg-seguranca-graphite overflow-hidden">
            <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-white flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-seguranca-yellow" />
                            Padronização de Documentos
                        </CardTitle>
                        <CardDescription className="text-seguranca-lightgray">
                            Progresso da migração para o novo layout
                        </CardDescription>
                    </div>
                    <Badge variant="outline" className="border-seguranca-yellow text-seguranca-yellow bg-seguranca-yellow/10">
                        Fase 1: Infraestrutura
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {/* Barra de Progresso Geral */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-white font-medium">Progresso Geral</span>
                            <span className="text-seguranca-lightgray">
                                {status.migrated} de {status.total} documentos
                            </span>
                        </div>
                        <Progress value={status.percentage} className="h-2 bg-gray-700" indicatorClassName="bg-seguranca-yellow" />
                        <p className="text-xs text-right text-seguranca-lightgray">
                            {status.percentage.toFixed(1)}% concluído
                        </p>
                    </div>

                    {/* Resumo por Ondas */}
                    <div className="grid grid-cols-2 gap-3 mt-4">
                        <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700">
                            <div className="text-xs text-seguranca-lightgray uppercase tracking-wider mb-1">Onda 1: RH</div>
                            <div className="flex items-end gap-2">
                                <span className="text-2xl font-bold text-white">0/7</span>
                                <span className="text-xs text-seguranca-lightgray mb-1">migrados</span>
                            </div>
                        </div>
                        <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700">
                            <div className="text-xs text-seguranca-lightgray uppercase tracking-wider mb-1">Onda 2: Ordens</div>
                            <div className="flex items-end gap-2">
                                <span className="text-2xl font-bold text-white">0/8</span>
                                <span className="text-xs text-seguranca-lightgray mb-1">migrados</span>
                            </div>
                        </div>
                    </div>

                    {/* Botão de Ação */}
                    <Button asChild variant="ghost" className="w-full justify-between text-seguranca-lightgray hover:text-white hover:bg-gray-800 mt-2">
                        <Link to="/documentos">
                            Ver todos os documentos
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

export default MigrationStatusCard;
