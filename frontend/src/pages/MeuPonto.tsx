import React, { useState, useEffect } from 'react';
import { StandardLayout } from '@/components/StandardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
    Clock,
    LogIn,
    LogOut,
    Coffee,
    MapPin,
    History,
    Loader2,
    Calendar,
    AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import timeRecordService, { TimeRecord } from '@/services/timeRecordService';

const MeuPonto: React.FC = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [loading, setLoading] = useState(false);
    const [registrosHoje, setRegistrosHoje] = useState<TimeRecord[]>([]);
    const [proximoRegistro, setProximoRegistro] = useState<'ENTRADA' | 'SAIDA_ALMOCO' | 'RETORNO_ALMOCO' | 'SAIDA'>('ENTRADA');
    const [geolocation, setGeolocation] = useState<{ latitude: number; longitude: number } | null>(null);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        loadData();
        requestLocation();
        return () => clearInterval(timer);
    }, [user]);

    const requestLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => setGeolocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
                (err) => console.warn('Localização não permitida', err)
            );
        }
    };

    const loadData = async () => {
        if (!user?.id) return;
        try {
            const [todayRes, nextRes] = await Promise.all([
                timeRecordService.getTodayRecords(user.id),
                timeRecordService.getNextRecordType(user.id)
            ]);
            if (todayRes.success) setRegistrosHoje(todayRes.data);
            if (nextRes.success) setProximoRegistro(nextRes.nextRecordType);
        } catch (error) {
            console.error('Erro ao carregar dados do ponto', error);
        }
    };

    const handleRegister = async () => {
        if (!user?.id) return;
        setLoading(true);
        try {
            const response = await timeRecordService.registerTimeRecord({
                employeeId: user.id,
                recordType: proximoRegistro,
                latitude: geolocation?.latitude,
                longitude: geolocation?.longitude,
                location: geolocation ? `${geolocation.latitude}, ${geolocation.longitude}` : 'Sem localização'
            });

            if (response.success) {
                toast({ title: 'Ponto registrado!', description: `${proximoRegistro} registrado com sucesso.` });
                loadData();
            }
        } catch (error: any) {
            toast({ title: 'Erro ao registrar', description: error.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (type: string) => {
        switch (type) {
            case 'ENTRADA': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
            case 'SAIDA': return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
            default: return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
        }
    };

    return (
        <StandardLayout>
            <div className="max-w-md mx-auto px-4 py-8 pb-24 space-y-6">
                {/* Header com Relógio Digital */}
                <div className="text-center space-y-2">
                    <Badge variant="outline" className="bg-seguranca-black/40 border-gray-800 text-gray-400 px-4 py-1 rounded-full uppercase tracking-widest text-[10px] font-black">
                        {format(currentTime, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                    </Badge>
                    <h1 className="text-6xl font-black text-seguranca-yellow tracking-tighter tabular-nums drop-shadow-[0_0_15px_rgba(255,184,0,0.3)]">
                        {format(currentTime, 'HH:mm:ss')}
                    </h1>
                </div>

                {/* Card Principal de Registro */}
                <Card className="bg-seguranca-black/60 border-2 border-seguranca-yellow/20 rounded-[2.5rem] overflow-hidden shadow-2xl">
                    <CardContent className="p-8 space-y-8">
                        <div className="flex flex-col items-center gap-2 text-center">
                            <div className="p-4 bg-seguranca-yellow/10 rounded-3xl mb-2">
                                <Clock className="w-10 h-10 text-seguranca-yellow" />
                            </div>
                            <h2 className="text-2xl font-black text-white uppercase tracking-tight">Próximo: {proximoRegistro}</h2>
                            <p className="text-sm text-gray-400">Certifique-se de estar no local de trabalho.</p>
                        </div>

                        <Button
                            className={`w-full h-24 rounded-3xl text-2xl font-black transition-all active:scale-95 shadow-xl ${proximoRegistro === 'ENTRADA' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-seguranca-yellow hover:bg-seguranca-yellow/90 text-seguranca-black'
                                }`}
                            onClick={handleRegister}
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="w-8 h-8 animate-spin" /> : 'BATER PONTO'}
                        </Button>

                        <div className="flex items-center justify-center gap-2 text-[10px] text-gray-500 font-bold uppercase tracking-widest border-t border-gray-800 pt-6">
                            <MapPin className="w-3 h-3 text-emerald-500" />
                            {geolocation ? 'Localização Confirmada' : 'Solicitando Localização...'}
                        </div>
                    </CardContent>
                </Card>

                {/* Lista de Registros do Dia */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-xs font-black text-gray-600 uppercase tracking-widest">Hoje</h3>
                        <span className="text-[10px] font-bold text-emerald-500">8h 00m trabalhadas</span>
                    </div>

                    <div className="space-y-3">
                        {registrosHoje.map((reg, idx) => (
                            <div key={idx} className={`p-4 rounded-3xl border flex items-center justify-between bg-seguranca-black/40 ${getStatusColor(reg.recordType)}`}>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-current/10 flex items-center justify-center">
                                        {reg.recordType === 'ENTRADA' ? <LogIn className="w-4 h-4" /> : <LogOut className="w-4 h-4" />}
                                    </div>
                                    <span className="font-bold text-sm tracking-tight">{reg.recordType}</span>
                                </div>
                                <span className="text-lg font-black tabular-nums">{format(new Date(reg.recordedAt), 'HH:mm')}</span>
                            </div>
                        ))}
                        {registrosHoje.length === 0 && (
                            <div className="py-8 text-center text-gray-600 border-2 border-dashed border-gray-800 rounded-3xl">
                                <p className="text-sm font-bold">Nenhum registro hoje.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Footer Action */}
                <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" className="rounded-2xl border-gray-800 text-gray-500 h-14 font-bold text-xs">
                        <History className="w-4 h-4 mr-2" /> HISTÓRICO
                    </Button>
                    <Button variant="outline" className="rounded-2xl border-gray-800 text-gray-500 h-14 font-bold text-xs">
                        <AlertTriangle className="w-4 h-4 mr-2" /> AJUSTE
                    </Button>
                </div>
            </div>
        </StandardLayout>
    );
};

export default MeuPonto;
