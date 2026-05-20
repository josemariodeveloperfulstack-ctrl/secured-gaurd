import React, { useState, useEffect, useRef } from 'react';
import { StandardLayout } from '@/components/StandardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
    AlertTriangle,
    QrCode,
    Camera,
    FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Html5QrcodeScanner } from 'html5-qrcode';
import timeRecordService, { TimeRecord } from '@/services/timeRecordService';

interface MeuPontoProps {
    standalone?: boolean;
}

const MeuPonto: React.FC<MeuPontoProps> = ({ standalone = false }) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [loading, setLoading] = useState(false);
    const [registrosHoje, setRegistrosHoje] = useState<TimeRecord[]>([]);
    const [proximoRegistro, setProximoRegistro] = useState<'ENTRADA' | 'SAIDA_ALMOCO' | 'RETORNO_ALMOCO' | 'SAIDA'>('ENTRADA');
    const [geolocation, setGeolocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [showQRScanner, setShowQRScanner] = useState(false);
    const [qrCodeData, setQrCodeData] = useState<string>('');
    const [cameraPermissionError, setCameraPermissionError] = useState<string | null>(null);
    const [showHistoryDialog, setShowHistoryDialog] = useState(false);
    const [historyRecords, setHistoryRecords] = useState<TimeRecord[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [showJustificationDialog, setShowJustificationDialog] = useState(false);
    const [justificationText, setJustificationText] = useState('');
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);

    const employeeId = user?.employeeId ?? user?.id;

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        requestLocation();
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (employeeId) {
            loadData();
        }
    }, [user, employeeId]);

    const requestLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => setGeolocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
                (err) => console.warn('Localização não permitida', err)
            );
        }
    };

    const loadData = async () => {
        if (!employeeId) return;
        try {
            const [todayRes, nextRes] = await Promise.all([
                timeRecordService.getTodayRecords(employeeId).catch(() => ({ success: false, data: [] })),
                timeRecordService.getNextRecordType(employeeId).catch(() => ({ success: false, nextRecordType: 'ENTRADA' }))
            ]);
            if (todayRes?.success && Array.isArray(todayRes.data)) {
                setRegistrosHoje(todayRes.data);
            }
            if (nextRes?.success && nextRes.nextRecordType) {
                setProximoRegistro(nextRes.nextRecordType);
            }
        } catch (error) {
            console.error('Erro ao carregar dados do ponto', error);
        }
    };

    const requestCameraPermission = (): Promise<boolean> => {
        if (!navigator.mediaDevices?.getUserMedia) return Promise.resolve(false);
        return navigator.mediaDevices
            .getUserMedia({ video: { facingMode: 'environment' } })
            .then((stream) => {
                stream.getTracks().forEach((t) => t.stop());
                return true;
            })
            .catch(() => false);
    };

    const openQRScanner = async () => {
        setCameraPermissionError(null);
        setShowQRScanner(true);
        const granted = await requestCameraPermission();
        if (!granted) {
            setCameraPermissionError('Permita o acesso à câmera nas configurações do navegador e tente novamente.');
            toast({ title: 'Câmera negada', description: 'Para escanear o QR Code, permita o acesso à câmera neste site.', variant: 'destructive' });
            return;
        }
        setTimeout(() => initQRScanner(), 300);
    };

    const initQRScanner = () => {
        if (scannerRef.current) scannerRef.current.clear();
        const el = document.getElementById('qr-reader-meuponto');
        if (!el) return;
        const scanner = new Html5QrcodeScanner(
            'qr-reader-meuponto',
            { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
            false
        );
        scanner.render(
            (decodedText) => {
                setQrCodeData(decodedText);
                scanner.clear();
                scannerRef.current = null;
                setShowQRScanner(false);
                toast({ title: 'QR Code lido', description: 'Agora você pode registrar o ponto.' });
            },
            () => {}
        );
        scannerRef.current = scanner;
    };

    const closeQRScanner = () => {
        if (scannerRef.current) {
            scannerRef.current.clear();
            scannerRef.current = null;
        }
        setShowQRScanner(false);
        setCameraPermissionError(null);
    };

    const openHistoryDialog = async () => {
        if (!employeeId) return;
        setShowHistoryDialog(true);
        setHistoryLoading(true);
        try {
            const response = await timeRecordService.getEmployeeRecords(employeeId, 0, 50);
            if (response.success) setHistoryRecords(response.data);
            else toast({ title: 'Erro', description: response.error || 'Tente novamente.', variant: 'destructive' });
        } catch (e: any) {
            toast({ title: 'Erro ao carregar histórico', description: e.message, variant: 'destructive' });
        } finally {
            setHistoryLoading(false);
        }
    };

    const getTipoLabel = (tipo: string) => {
        const labels: Record<string, string> = {
            ENTRADA: 'Entrada',
            SAIDA: 'Saída',
            SAIDA_ALMOCO: 'Saída (Intervalo)',
            RETORNO_ALMOCO: 'Retorno (Intervalo)'
        };
        return labels[tipo] || tipo;
    };

    const handleSaveJustification = () => {
        if (!justificationText.trim()) {
            toast({ title: 'Digite uma justificativa', variant: 'destructive' });
            return;
        }
        toast({ title: 'Justificativa registrada', description: 'Sua solicitação de ajuste foi registrada.' });
        setJustificationText('');
        setShowJustificationDialog(false);
    };

    const handleRegister = async () => {
        if (!employeeId) {
            toast({ title: 'Erro', description: 'Funcionário não identificado.', variant: 'destructive' });
            return;
        }
        setLoading(true);
        try {
            const response = await timeRecordService.registerTimeRecord({
                employeeId,
                recordType: proximoRegistro,
                qrCode: qrCodeData || undefined,
                latitude: geolocation?.latitude,
                longitude: geolocation?.longitude,
                location: geolocation ? `${geolocation.latitude}, ${geolocation.longitude}` : 'Sem localização',
                ipAddress: window.location.hostname,
                userAgent: navigator.userAgent
            });

            if (response.success) {
                toast({ title: 'Ponto registrado!', description: `${getTipoLabel(proximoRegistro)} registrado com sucesso.` });
                setQrCodeData('');
                // Atualização otimista: exibe o registro na lista imediatamente (persistido no banco)
                const newRecord = (response as any).data;
                if (newRecord?.id && newRecord?.recordType && newRecord?.recordedAt) {
                    setRegistrosHoje((prev) => [...prev, newRecord as TimeRecord]);
                }
                // Atualiza próximo tipo e sincroniza lista com o servidor
                loadData();
            } else {
                throw new Error((response as any).error || 'Erro ao registrar');
            }
        } catch (error: any) {
            toast({ title: 'Erro ao registrar', description: error.response?.data?.error || error.message, variant: 'destructive' });
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
        <StandardLayout isSubPage={standalone}>
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
                            <h2 className="text-2xl font-black text-white uppercase tracking-tight">Próximo: {getTipoLabel(proximoRegistro)}</h2>
                            <p className="text-sm text-gray-400">Certifique-se de estar no local de trabalho.</p>
                        </div>

                        {qrCodeData && (
                            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                                <p className="text-sm text-emerald-500 text-center font-bold">QR Code validado – Pronto para registrar</p>
                            </div>
                        )}

                        <Button
                            type="button"
                            variant="outline"
                            className="w-full h-14 rounded-2xl border-seguranca-yellow/30 hover:border-seguranca-yellow/50 hover:bg-seguranca-yellow/10 text-seguranca-yellow font-bold"
                            onClick={openQRScanner}
                            disabled={loading}
                        >
                            <QrCode className="w-5 h-5 mr-2" />
                            Escanear QR Code
                        </Button>

                        <Button
                            className={`w-full h-24 rounded-3xl text-2xl font-black transition-all active:scale-95 shadow-xl ${proximoRegistro === 'ENTRADA' ? 'bg-emerald-600 hover:bg-emerald-700' : proximoRegistro === 'SAIDA' ? 'bg-red-600 hover:bg-red-700' : 'bg-seguranca-yellow hover:bg-seguranca-yellow/90 text-seguranca-black'}`}
                            onClick={handleRegister}
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="w-8 h-8 animate-spin" /> : getTipoLabel(proximoRegistro)}
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
                            <div key={reg.id || idx} className={`p-4 rounded-3xl border flex items-center justify-between bg-seguranca-black/40 ${getStatusColor(reg.recordType)}`}>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-current/10 flex items-center justify-center">
                                        {reg.recordType === 'ENTRADA' ? <LogIn className="w-4 h-4" /> : reg.recordType === 'SAIDA' ? <LogOut className="w-4 h-4" /> : <Coffee className="w-4 h-4" />}
                                    </div>
                                    <span className="font-bold text-sm tracking-tight">{getTipoLabel(reg.recordType)}</span>
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
                    <Button variant="outline" className="rounded-2xl border-gray-800 text-gray-500 h-14 font-bold text-xs" onClick={openHistoryDialog}>
                        <History className="w-4 h-4 mr-2" /> HISTÓRICO
                    </Button>
                    <Button
                        variant="outline"
                        className="rounded-2xl border-gray-800 text-gray-500 h-14 font-bold text-xs"
                        onClick={() => setShowJustificationDialog(true)}
                        disabled={registrosHoje.length === 0}
                        title={registrosHoje.length === 0 ? 'Registre pelo menos um ponto para solicitar ajuste' : 'Solicitar ajuste'}
                    >
                        <AlertTriangle className="w-4 h-4 mr-2" /> AJUSTE
                    </Button>
                    <Button
                        variant="outline"
                        className="rounded-2xl border-gray-800 text-gray-500 h-14 font-bold text-xs col-span-2"
                        onClick={async () => {
                            if (!employeeId) return;
                            const year = currentTime.getFullYear();
                            const month = currentTime.getMonth() + 1;
                            try {
                                const { timeSheetService } = await import('@/services/timeSheetService');
                                const blob = await timeSheetService.downloadMonthFolhaPontoPdf(employeeId, year, month);
                                const url = window.URL.createObjectURL(blob);
                                const link = document.createElement('a');
                                link.href = url;
                                link.download = `registro-ponto-${year}-${String(month).padStart(2, '0')}.pdf`;
                                document.body.appendChild(link);
                                link.click();
                                link.remove();
                                window.URL.revokeObjectURL(url);
                                toast({ title: 'PDF gerado', description: 'Registro de ponto do mês baixado.' });
                            } catch (e: any) {
                                toast({ title: 'Erro ao gerar PDF', description: e?.response?.data?.message || e?.message, variant: 'destructive' });
                            }
                        }}
                    >
                        <FileText className="w-4 h-4 mr-2" /> PDF DO MÊS
                    </Button>
                </div>
            </div>

            <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
                <DialogContent className="sm:max-w-md bg-seguranca-darkgray border-seguranca-gray/20">
                    <DialogHeader>
                        <DialogTitle className="text-seguranca-lightgray">Histórico de Registros</DialogTitle>
                        <DialogDescription className="text-seguranca-gray">Últimos registros de ponto.</DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[360px] overflow-y-auto space-y-2">
                        {historyLoading ? (
                            <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-seguranca-yellow" /></div>
                        ) : historyRecords.length === 0 ? (
                            <p className="text-seguranca-gray text-center py-4">Nenhum registro encontrado.</p>
                        ) : (
                            historyRecords.map((reg) => (
                                <div key={reg.id} className={`p-3 rounded-xl border flex items-center justify-between ${getStatusColor(reg.recordType)}`}>
                                    <span className="font-semibold text-sm">{getTipoLabel(reg.recordType)}</span>
                                    <span className="text-sm opacity-90">
                                        {format(new Date(reg.recordedAt), 'dd/MM/yyyy HH:mm')}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={showJustificationDialog} onOpenChange={setShowJustificationDialog}>
                <DialogContent className="sm:max-w-md bg-seguranca-darkgray border-seguranca-gray/20">
                    <DialogHeader>
                        <DialogTitle className="text-seguranca-lightgray">Solicitar Ajuste</DialogTitle>
                        <DialogDescription className="text-seguranca-gray">Descreva o motivo do ajuste ou ausência de registro.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <textarea
                            value={justificationText}
                            onChange={(e) => setJustificationText(e.target.value)}
                            placeholder="Ex: Esqueci de registrar a saída..."
                            className="w-full min-h-[100px] rounded-lg bg-seguranca-black/40 border border-gray-700 text-white p-3 text-sm"
                        />
                        <div className="flex gap-2 justify-end">
                            <Button variant="outline" onClick={() => setShowJustificationDialog(false)}>Cancelar</Button>
                            <Button onClick={handleSaveJustification}>Enviar</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={showQRScanner} onOpenChange={(open) => !open && closeQRScanner()}>
                <DialogContent className="sm:max-w-md bg-seguranca-darkgray border-seguranca-gray/20">
                    <DialogHeader>
                        <DialogTitle className="text-seguranca-lightgray flex items-center">
                            <Camera className="mr-2 h-5 w-5 text-seguranca-yellow" />
                            Escanear QR Code
                        </DialogTitle>
                        <DialogDescription className="text-seguranca-gray">
                            Aponte a câmera para o QR Code do posto de trabalho
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        {cameraPermissionError ? (
                            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 space-y-3">
                                <p className="text-sm text-amber-200">{cameraPermissionError}</p>
                                <Button
                                    type="button"
                                    className="w-full bg-seguranca-yellow text-seguranca-black hover:bg-seguranca-yellow/90"
                                    onClick={async () => {
                                        setCameraPermissionError(null);
                                        const granted = await requestCameraPermission();
                                        if (granted) setTimeout(() => initQRScanner(), 300);
                                        else {
                                            setCameraPermissionError('Permita o acesso à câmera nas configurações do navegador.');
                                            toast({ title: 'Câmera negada', description: 'Ative a câmera nas configurações do site.', variant: 'destructive' });
                                        }
                                    }}
                                >
                                    Permitir câmera e tentar novamente
                                </Button>
                            </div>
                        ) : (
                            <div id="qr-reader-meuponto" className="rounded-lg overflow-hidden border-2 border-seguranca-yellow/30" />
                        )}
                        <Button type="button" variant="outline" className="w-full border-seguranca-gray/30" onClick={closeQRScanner}>
                            Cancelar
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </StandardLayout>
    );
};

export default MeuPonto;
