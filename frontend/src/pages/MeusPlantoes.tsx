import React, { useState } from 'react';
import { StandardLayout } from '@/components/StandardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    ArrowLeftRight,
    Calendar,
    CheckCircle,
    Clock,
    MoreHorizontal,
    Plus,
    X
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import shiftChangeService, { ShiftChangeFormDTO } from '@/services/shiftChangeService';
import { format } from 'date-fns';
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

const MeusPlantoes: React.FC = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState<'ativos' | 'historico'>('ativos');
    const [loading, setLoading] = useState(false);
    const [solicitando, setSolicitando] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [minhasTrocas, setMinhasTrocas] = useState<ShiftChangeFormDTO[]>([]);

    // Form State
    const [formData, setFormData] = useState<Partial<ShiftChangeFormDTO>>({
        requesterFullName: user?.name || '',
        requesterSector: '',
        requesterShiftDate: '',
        replacingFullName: '',
        replacingSector: '',
        replacingShiftDate: '',
        shiftTime: 'SHIFT_6H_18H'
    });

    React.useEffect(() => {
        if (user?.name) {
            loadTrocas();
        }
    }, [user?.name]);

    const loadTrocas = async () => {
        setLoading(true);
        try {
            const data = await shiftChangeService.getAllShiftChanges();
            // Filtrar solicitações onde o usuário é o solicitante ou o substituto
            const filtradas = data.filter(item =>
                item.requesterFullName === user?.name ||
                item.replacingFullName === user?.name
            );
            setMinhasTrocas(filtradas);
        } catch (error) {
            console.error('Erro ao carregar trocas:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateSolicitacao = async () => {
        if (!formData.requesterShiftDate || !formData.replacingShiftDate || !formData.replacingFullName) {
            toast({
                title: "Campos obrigatórios",
                description: "Por favor, preencha as datas e o nome do substituto.",
                variant: "destructive"
            });
            return;
        }

        setSubmitting(true);
        try {
            await shiftChangeService.createShiftChange({
                ...formData as ShiftChangeFormDTO,
                dateOfRequest: new Date().toISOString().split('T')[0],
                requesterFullName: user?.name || formData.requesterFullName || '',
                status: 'PENDING'
            });

            setSolicitando(false);
            setFormData({
                requesterFullName: user?.name || '',
                requesterSector: '',
                requesterShiftDate: '',
                replacingFullName: '',
                replacingSector: '',
                replacingShiftDate: '',
                shiftTime: 'SHIFT_6H_18H'
            });
            loadTrocas();
        } catch (error) {
            // Toast já é mostrado pelo serviço
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusInfo = (status: string | undefined) => {
        switch (status) {
            case 'APPROVED': return { label: 'Aprovado', color: 'text-emerald-500', bg: 'bg-emerald-500/10' };
            case 'REJECTED': return { label: 'Rejeitado', color: 'text-rose-500', bg: 'bg-rose-500/10' };
            default: return { label: 'Em Análise', color: 'text-amber-500', bg: 'bg-amber-500/10' };
        }
    };

    const filtradas = minhasTrocas.filter(item => {
        if (activeTab === 'ativos') return item.status === 'PENDING';
        return item.status !== 'PENDING';
    });

    return (
        <StandardLayout>
            <div className="max-w-2xl mx-auto px-4 py-8 space-y-6 pb-24">
                {/* Simple Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400">
                            <ArrowLeftRight className="w-6 h-6" />
                        </div>
                        <h1 className="text-2xl font-black text-white uppercase tracking-tight">Plantões</h1>
                    </div>
                    <Button
                        size="icon"
                        className="rounded-full bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/20"
                        onClick={() => setSolicitando(true)}
                    >
                        <Plus className="w-6 h-6" />
                    </Button>
                </div>

                {/* Tab Switcher - Pill Style */}
                <div className="flex bg-seguranca-black/80 p-1.5 rounded-2xl border border-gray-800">
                    <button
                        className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'ativos' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500'}`}
                        onClick={() => setActiveTab('ativos')}
                    >
                        Ativos
                    </button>
                    <button
                        className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'historico' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500'}`}
                        onClick={() => setActiveTab('historico')}
                    >
                        Histórico
                    </button>
                </div>

                {/* Requests List */}
                <div className="space-y-4">
                    <h3 className="text-xs font-black text-gray-600 uppercase tracking-widest px-1">Trocas de Plantão</h3>

                    <div className="space-y-4">
                        {filtradas.map((item) => {
                            const statusInfo = getStatusInfo(item.status);
                            const isRequester = item.requesterFullName === user?.name;

                            const shiftTimeLabels: Record<string, string> = {
                                'SHIFT_6H_18H': '06:00 - 18:00',
                                'SHIFT_18H_6H': '18:00 - 06:00',
                                'SHIFT_7H_19H': '07:00 - 19:00',
                                'SHIFT_19H_7H': '19:00 - 07:00'
                            };

                            const formatDate = (dateStr: string) => {
                                try {
                                    return format(new Date(dateStr), 'dd/MM/yyyy');
                                } catch {
                                    return dateStr;
                                }
                            };

                            return (
                                <Card key={item.id} className="bg-seguranca-black/60 border-gray-800 rounded-3xl overflow-hidden group">
                                    <CardContent className="p-6 space-y-5">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-gray-500" />
                                                <span className="font-black text-gray-100">{formatDate(item.requesterShiftDate)}</span>
                                            </div>
                                            <Badge variant="outline" className={`border-none ${statusInfo.bg} ${statusInfo.color} uppercase text-[10px] font-black px-3 py-1`}>
                                                {statusInfo.label}
                                            </Badge>
                                        </div>

                                        <div className="flex items-center justify-between gap-4 p-4 bg-white/5 rounded-2xl relative">
                                            <div className="text-center flex-1">
                                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">
                                                    {isRequester ? 'Meu Turno' : 'Turno Original'}
                                                </p>
                                                <p className="text-sm font-bold text-white">
                                                    {isRequester ? item.requesterFullName : item.replacingFullName}
                                                </p>
                                                <p className="text-[10px] text-gray-400 mt-1">{shiftTimeLabels[item.shiftTime]}</p>
                                            </div>

                                            <div className="absolute left-1/2 -translate-x-1/2 bg-seguranca-black p-2 rounded-full border border-gray-800 z-10 shadow-lg shadow-black/50">
                                                <ArrowLeftRight className="w-4 h-4 text-indigo-400" />
                                            </div>

                                            <div className="text-center flex-1">
                                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">
                                                    {isRequester ? 'Substituto' : 'Meu Turno (Subst)'}
                                                </p>
                                                <p className="text-sm font-bold text-indigo-400">
                                                    {isRequester ? item.replacingFullName : item.requesterFullName}
                                                </p>
                                                <p className="text-[10px] text-gray-400 mt-1">{formatDate(item.replacingShiftDate)}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-2">
                                            <div className="flex items-center gap-2">
                                                {item.status === 'PENDING' ? (
                                                    <>
                                                        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Aguardando DP</span>
                                                    </>
                                                ) : item.status === 'APPROVED' ? (
                                                    <>
                                                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Escala Atualizada</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="w-2 h-2 rounded-full bg-rose-500" />
                                                        <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Não Autorizado</span>
                                                    </>
                                                )}
                                            </div>
                                            <Button variant="ghost" size="icon" className="text-gray-600 hover:text-white">
                                                <MoreHorizontal className="w-5 h-5" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>

                {/* Empty State Mock Illustration Area */}
                {filtradas.length === 0 && !loading && (
                    <div className="text-center py-20 space-y-4">
                        <div className="w-20 h-20 bg-gray-800/20 rounded-full flex items-center justify-center mx-auto">
                            <Clock className="w-10 h-10 text-gray-700" />
                        </div>
                        <div>
                            <p className="font-bold text-gray-400">Nenhum plantão encontrado</p>
                            <p className="text-sm text-gray-600">Suas solicitações de troca aparecerão aqui.</p>
                        </div>
                    </div>
                )}

                {loading && (
                    <div className="flex justify-center py-10">
                        <Clock className="w-6 h-6 animate-spin text-indigo-400" />
                    </div>
                )}
            </div>

            {/* Modal de Solicitação de Troca */}
            <Dialog open={solicitando} onOpenChange={setSolicitando}>
                <DialogContent className="max-w-md bg-seguranca-graphite border-gray-700 text-white rounded-[2rem]">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black uppercase tracking-tight text-indigo-400">Trocar Plantão</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto px-1">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Meus Dados</Label>
                            <div className="grid grid-cols-2 gap-2">
                                <Input
                                    placeholder="Meu Setor"
                                    className="bg-seguranca-black border-gray-800 rounded-xl"
                                    value={formData.requesterSector}
                                    onChange={(e) => setFormData({ ...formData, requesterSector: e.target.value })}
                                />
                                <Input
                                    type="date"
                                    className="bg-seguranca-black border-gray-800 rounded-xl"
                                    value={formData.requesterShiftDate}
                                    onChange={(e) => setFormData({ ...formData, requesterShiftDate: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Dados do Substituto</Label>
                            <Input
                                placeholder="Nome Completo do Substituto"
                                className="bg-seguranca-black border-gray-800 rounded-xl mb-2"
                                value={formData.replacingFullName}
                                onChange={(e) => setFormData({ ...formData, replacingFullName: e.target.value })}
                            />
                            <div className="grid grid-cols-2 gap-2">
                                <Input
                                    placeholder="Setor do Substituto"
                                    className="bg-seguranca-black border-gray-800 rounded-xl"
                                    value={formData.replacingSector}
                                    onChange={(e) => setFormData({ ...formData, replacingSector: e.target.value })}
                                />
                                <Input
                                    type="date"
                                    className="bg-seguranca-black border-gray-800 rounded-xl"
                                    value={formData.replacingShiftDate}
                                    onChange={(e) => setFormData({ ...formData, replacingShiftDate: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Horário do Plantão</Label>
                            <Select
                                value={formData.shiftTime}
                                onValueChange={(value: string) => setFormData({ ...formData, shiftTime: value as any })}
                            >
                                <SelectTrigger className="bg-seguranca-black border-gray-800 rounded-xl">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-seguranca-graphite border-gray-700 text-white">
                                    <SelectItem value="SHIFT_6H_18H">06:00 - 18:00</SelectItem>
                                    <SelectItem value="SHIFT_18H_6H">18:00 - 06:00</SelectItem>
                                    <SelectItem value="SHIFT_7H_19H">07:00 - 19:00</SelectItem>
                                    <SelectItem value="SHIFT_19H_7H">19:00 - 07:00</SelectItem>
                                </SelectContent>
                            </Select>
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
                            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl"
                            onClick={handleCreateSolicitacao}
                            disabled={submitting}
                        >
                            {submitting ? 'PROCESSANDO...' : 'SOLICITAR TROCA'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </StandardLayout>
    );
};

export default MeusPlantoes;
