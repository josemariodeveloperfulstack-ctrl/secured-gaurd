import React, { useState, useEffect } from 'react';
import { StandardLayout } from '@/components/StandardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Calendar,
    Palmtree,
    Send,
    Clock,
    CheckCircle,
    AlertCircle,
    X
} from 'lucide-react';

import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { feriasService } from '@/services/feriasService';
import { FeriasPeriodo, FeriasTipo } from '@/types/ferias';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const MinhasFerias: React.FC = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [solicitando, setSolicitando] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [minhasFerias, setMinhasFerias] = useState<FeriasPeriodo[]>([]);

    // Form State
    const [formData, setFormData] = useState({
        dataInicio: '',
        dataFim: '',
        tipo: 'FERIAS_NORMAIS' as FeriasTipo,
        observacoes: ''
    });

    const saldoDias = 30; // Idealmente viria do backend/perfil
    const diasVencendo = 0;

    useEffect(() => {
        if (user?.id) {
            loadFerias();
        }
    }, [user?.id]);

    const loadFerias = async () => {
        if (!user?.id) return;
        setLoading(true);
        try {
            const data = await feriasService.getFeriasByEmployee(user.id);
            setMinhasFerias(data);
        } catch (error) {
            console.error('Erro ao carregar férias:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateSolicitacao = async () => {
        if (!user?.id) return;
        if (!formData.dataInicio || !formData.dataFim) {
            toast({
                title: "Campos obrigatórios",
                description: "Por favor, preencha as datas de início e fim.",
                variant: "destructive"
            });
            return;
        }

        setSubmitting(true);
        try {
            await feriasService.createFerias({
                employeeId: user.id,
                dataInicio: formData.dataInicio,
                dataFim: formData.dataFim,
                tipo: formData.tipo,
                observacoes: formData.observacoes,
                periodoAquisitivo: `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`
            });

            toast({
                title: "Solicitação enviada!",
                description: "Sua solicitação de férias foi enviada para análise.",
            });
            setSolicitando(false);
            setFormData({ dataInicio: '', dataFim: '', tipo: 'FERIAS_NORMAIS', observacoes: '' });
            loadFerias();
        } catch (error: any) {
            toast({
                title: "Erro ao solicitar",
                description: error.response?.data?.message || "Não foi possível enviar sua solicitação.",
                variant: "destructive"
            });
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'APROVADO': return { label: 'Aprovado', color: 'text-emerald-500', bg: 'bg-emerald-500/10' };
            case 'REJEITADO': return { label: 'Rejeitado', color: 'text-rose-500', bg: 'bg-rose-500/10' };
            case 'CANCELADO': return { label: 'Cancelado', color: 'text-gray-500', bg: 'bg-gray-500/10' };
            default: return { label: 'Em Análise', color: 'text-amber-500', bg: 'bg-amber-500/10' };
        }
    };

    return (
        <StandardLayout>
            <div className="max-w-2xl mx-auto px-4 py-8 space-y-6 pb-24">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-500">
                        <Palmtree className="w-6 h-6" />
                    </div>
                    <h1 className="text-2xl font-black text-white uppercase tracking-tight">Gerenciar Férias</h1>
                </div>

                {/* Balance Card */}
                <div className="grid grid-cols-2 gap-4">
                    <Card className="bg-seguranca-black/60 border-gray-800 rounded-3xl overflow-hidden shadow-lg border-t-4 border-t-emerald-500">
                        <CardContent className="p-6 text-center">
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Saldo Atual</span>
                            <div className="text-4xl font-black text-emerald-500 mt-1">{saldoDias}</div>
                            <span className="text-xs font-bold text-gray-500 uppercase">Dias Disponíveis</span>
                        </CardContent>
                    </Card>

                    <Card className="bg-seguranca-black/60 border-gray-800 rounded-3xl overflow-hidden shadow-lg border-t-4 border-t-rose-500">
                        <CardContent className="p-6 text-center">
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">A Vencer</span>
                            <div className="text-4xl font-black text-rose-500 mt-1">{diasVencendo}</div>
                            <span className="text-xs font-bold text-gray-500 uppercase">Dias Críticos</span>
                        </CardContent>
                    </Card>
                </div>

                {/* Action Call */}
                <Card className="bg-gradient-to-br from-indigo-900/40 to-seguranca-black border-gray-800 rounded-3xl p-6">
                    <div className="flex flex-col gap-4">
                        <div className="space-y-1">
                            <h3 className="font-bold text-white text-lg">Planejar Descanso</h3>
                            <p className="text-sm text-gray-400">Solicite seu próximo período de férias com antecedência mínima de 45 dias.</p>
                        </div>
                        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl h-14" onClick={() => setSolicitando(true)}>
                            <Send className="w-4 h-4 mr-2" /> SOLICITAR NOVO PERÍODO
                        </Button>
                    </div>
                </Card>

                {/* History Stream */}
                <div className="space-y-4">
                    <h3 className="text-xs font-black text-gray-600 uppercase tracking-widest px-1">Histórico de Períodos</h3>
                    <div className="space-y-3">
                        {minhasFerias.map((item) => {
                            const info = getStatusInfo(item.status);
                            const diffDays = Math.ceil((new Date(item.dataFim).getTime() - new Date(item.dataInicio).getTime()) / (1000 * 60 * 60 * 24)) + 1;

                            return (
                                <Card key={item.id} className="bg-seguranca-black/60 border border-gray-800 rounded-3xl overflow-hidden group hover:border-emerald-500/30 transition-all">
                                    <CardContent className="p-5 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 rounded-[1.25rem] bg-gray-800/50 flex items-center justify-center text-gray-400 group-hover:text-emerald-500 transition-colors">
                                                <Calendar className="w-7 h-7" />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="font-black text-white text-base tracking-tight">
                                                    {format(new Date(item.dataInicio), 'dd/MM/yyyy')} - {format(new Date(item.dataFim), 'dd/MM/yyyy')}
                                                </p>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{diffDays} DIAS</span>
                                                    <span className="text-gray-700">•</span>
                                                    <span className={`text-[10px] font-black uppercase tracking-widest ${info.color}`}>{info.label}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center pr-2">
                                            {item.status === 'APROVADO' ? (
                                                <CheckCircle className="w-6 h-6 text-emerald-500 opacity-20 group-hover:opacity-100 transition-all" />
                                            ) : item.status === 'REJEITADO' ? (
                                                <X className="w-6 h-6 text-rose-500 opacity-20" />
                                            ) : (
                                                <Clock className="w-6 h-6 text-amber-500 opacity-20 animate-pulse" />
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                        {minhasFerias.length === 0 && !loading && (
                            <div className="py-8 text-center text-gray-600 border-2 border-dashed border-gray-800 rounded-3xl">
                                <p className="text-sm font-bold">Nenhuma solicitação encontrada.</p>
                            </div>
                        )}
                        {loading && (
                            <div className="py-8 flex justify-center">
                                <Clock className="w-6 h-6 animate-spin text-seguranca-yellow" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Information Bottom Shell */}
                <div className="flex items-start gap-3 p-4 bg-amber-500/5 rounded-2xl border border-amber-500/20">
                    <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-amber-500/70 font-bold uppercase leading-relaxed">
                        As solicitações de férias dependem de aprovação do gestor e conformidade com as escalas operacionais da unidade.
                    </p>
                </div>
            </div>

            {/* Modal de Solicitação */}
            <Dialog open={solicitando} onOpenChange={setSolicitando}>
                <DialogContent className="max-w-md bg-seguranca-graphite border-gray-700 text-white rounded-[2rem]">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black uppercase tracking-tight text-seguranca-yellow">Solicitar Férias</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="dataInicio" className="text-[10px] font-black uppercase tracking-widest text-gray-400">Data de Início</Label>
                                <Input
                                    id="dataInicio"
                                    type="date"
                                    className="bg-seguranca-black border-gray-800 rounded-xl"
                                    value={formData.dataInicio}
                                    onChange={(e) => setFormData({ ...formData, dataInicio: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="dataFim" className="text-[10px] font-black uppercase tracking-widest text-gray-400">Data de Fim</Label>
                                <Input
                                    id="dataFim"
                                    type="date"
                                    className="bg-seguranca-black border-gray-800 rounded-xl"
                                    value={formData.dataFim}
                                    onChange={(e) => setFormData({ ...formData, dataFim: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="tipo" className="text-[10px] font-black uppercase tracking-widest text-gray-400">Tipo de Férias</Label>
                            <Select
                                value={formData.tipo}
                                onValueChange={(value: FeriasTipo) => setFormData({ ...formData, tipo: value })}
                            >
                                <SelectTrigger className="bg-seguranca-black border-gray-800 rounded-xl">
                                    <SelectValue placeholder="Selecione o tipo" />
                                </SelectTrigger>
                                <SelectContent className="bg-seguranca-graphite border-gray-700 text-white">
                                    <SelectItem value="FERIAS_NORMAIS">Férias Normais</SelectItem>
                                    <SelectItem value="FERIAS_VENDIDAS">Venda (10 dias)</SelectItem>
                                    <SelectItem value="ABONO_PECUNIARIO">Abono Pecuniário</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="observacoes" className="text-[10px] font-black uppercase tracking-widest text-gray-400">Observações</Label>
                            <Textarea
                                id="observacoes"
                                placeholder="Alguma informação adicional?"
                                className="bg-seguranca-black border-gray-800 rounded-xl min-h-[100px]"
                                value={formData.observacoes}
                                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                            />
                        </div>
                    </div>

                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button
                            variant="ghost"
                            className="flex-1 rounded-xl font-bold text-gray-400"
                            onClick={() => setSolicitando(false)}
                            disabled={submitting}
                        >
                            CANCELAR
                        </Button>
                        <Button
                            className="flex-1 bg-seguranca-yellow hover:bg-seguranca-yellow/90 text-seguranca-black font-black rounded-xl"
                            onClick={handleCreateSolicitacao}
                            disabled={submitting}
                        >
                            {submitting ? 'ENVIANDO...' : 'SOLICITAR'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </StandardLayout>
    );
};

export default MinhasFerias;
