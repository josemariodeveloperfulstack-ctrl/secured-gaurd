import React, { useState, useEffect, useRef } from 'react';
import { StandardLayout } from '@/components/StandardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Clock, 
  LogIn, 
  LogOut, 
  Coffee,
  Calendar,
  MapPin,
  User,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  History,
  QrCode,
  Camera,
  Loader2,
  FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Html5QrcodeScanner } from 'html5-qrcode';
import timeRecordService, { TimeRecord } from '@/services/timeRecordService';

const PontoEletronico: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  /** ID do funcionário: preferência employeeId; fallback user.id (backend resolve por CPF do usuário autenticado). */
  const effectiveEmployeeId = user?.employeeId ?? user?.id;
  const [currentTime, setCurrentTime] = useState(new Date());
  const [registrosHoje, setRegistrosHoje] = useState<TimeRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [proximoRegistro, setProximoRegistro] = useState<'ENTRADA' | 'SAIDA_ALMOCO' | 'RETORNO_ALMOCO' | 'SAIDA'>('ENTRADA');
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string>('');
  const [cameraPermissionGranted, setCameraPermissionGranted] = useState(false);
  const [cameraPermissionError, setCameraPermissionError] = useState<string | null>(null);
  const [geolocation, setGeolocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  // Confirmação de registro via QRCode
  const [showQrConfirmDialog, setShowQrConfirmDialog] = useState(false);
  const [qrWorkPostName, setQrWorkPostName] = useState<string | null>(null);
  const [qrWorkPostDescription, setQrWorkPostDescription] = useState<string | null>(null);
  const [qrOfflineMode, setQrOfflineMode] = useState(false);

  // Modais de ações rápidas
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [showJustificationDialog, setShowJustificationDialog] = useState(false);
  const [justificationText, setJustificationText] = useState('');
  const [historyRecords, setHistoryRecords] = useState<TimeRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');
  // Período para Espelho e PDF do mês (mês/ano selecionável)
  const now = new Date();
  const [reportMonth, setReportMonth] = useState(now.getMonth() + 1);
  const [reportYear, setReportYear] = useState(now.getFullYear());

  // Fila offline de registros de ponto
  type OfflineRecordPayload = {
    employeeId: string;
    recordType: 'ENTRADA' | 'SAIDA_ALMOCO' | 'RETORNO_ALMOCO' | 'SAIDA';
    qrCode?: string;
    location?: string;
    latitude?: number;
    longitude?: number;
    ipAddress: string;
    userAgent: string;
  };

  type OfflineQueuedRecord = {
    id: string;
    payload: OfflineRecordPayload;
    createdAt: string;
  };

  const OFFLINE_QUEUE_KEY = 'sg_offline_time_records';

  // Sempre que o mês/ano do relatório mudarem, ajustar automaticamente
  // as datas inicial e final usadas pelo botão "Relatório"
  useEffect(() => {
    const start = new Date(reportYear, reportMonth - 1, 1);
    const end = new Date(reportYear, reportMonth, 0); // último dia do mês
    setReportStartDate(format(start, 'yyyy-MM-dd'));
    setReportEndDate(format(end, 'yyyy-MM-dd'));
  }, [reportMonth, reportYear]);

  // Helpers da fila offline
  const loadOfflineQueue = (): OfflineQueuedRecord[] => {
    try {
      const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const saveOfflineQueue = (items: OfflineQueuedRecord[]) => {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(items));
  };

  const enqueueOfflineRecord = (payload: OfflineRecordPayload) => {
    if (typeof window === 'undefined') return;
    const id =
      (window.crypto && 'randomUUID' in window.crypto
        ? (window.crypto as any).randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`) as string;

    const queue = loadOfflineQueue();
    queue.push({
      id,
      payload,
      createdAt: new Date().toISOString(),
    });
    saveOfflineQueue(queue);
  };

  const syncOfflineRecords = async () => {
    if (!navigator.onLine || !effectiveEmployeeId) return;

    const queue = loadOfflineQueue();
    if (queue.length === 0) return;

    const remaining: OfflineQueuedRecord[] = [];

    for (const item of queue) {
      try {
        const response = await timeRecordService.registerTimeRecord(item.payload);
        if (!response?.success) {
          const status = (response as any)?.status;
          if (status && status >= 500) {
            remaining.push(item);
            break;
          }
        }
      } catch (error: any) {
        if (!error?.response) {
          remaining.push(item);
          break;
        }
        // Erros 4xx: descarta (provavelmente QR inválido/expirado ou sequência inválida)
      }
    }

    saveOfflineQueue(remaining);
  };

  // Sincronizar registros offline ao voltar a ficar online
  useEffect(() => {
    const handleOnline = () => {
      syncOfflineRecords();
    };

    window.addEventListener('online', handleOnline);
    // tentativa inicial ao montar
    syncOfflineRecords();

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [effectiveEmployeeId]);

  // Buscar geolocalização ao montar
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGeolocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.warn('Geolocalização não disponível:', error);
        }
      );
    }
  }, []);

  // Buscar registros do dia ao montar (usa effectiveEmployeeId para SUPER_ADMIN sem employeeId no login)
  useEffect(() => {
    if (effectiveEmployeeId) {
      loadTodayRecords();
      loadNextRecordType();
    }
  }, [user, effectiveEmployeeId]);

  // Atualizar relógio a cada segundo
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const loadTodayRecords = async () => {
    if (!effectiveEmployeeId) return;
    
    try {
      setLoadingRecords(true);
      const response = await timeRecordService.getTodayRecords(effectiveEmployeeId);
      if (response?.success && Array.isArray(response.data)) {
        setRegistrosHoje(response.data);
      }
    } catch (error: any) {
      console.error('Erro ao carregar registros:', error);
    } finally {
      setLoadingRecords(false);
    }
  };

  const loadNextRecordType = async () => {
    if (!effectiveEmployeeId) return;
    
    try {
      const response = await timeRecordService.getNextRecordType(effectiveEmployeeId);
      if (response.success && response.nextRecordType) {
        setProximoRegistro(response.nextRecordType);
      }
    } catch (error: any) {
      console.error('Erro ao buscar próximo tipo:', error);
    }
  };

  const registrarPonto = async (tipo?: 'ENTRADA' | 'SAIDA_ALMOCO' | 'RETORNO_ALMOCO' | 'SAIDA') => {
    if (!effectiveEmployeeId) {
      toast({
        title: "❌ Erro",
        description: "Funcionário não identificado",
        variant: "destructive",
      });
      return;
    }

    const tipoRegistro = tipo || proximoRegistro;

    // Obter IP do cliente
    const ipAddress = window.location.hostname;
    const userAgent = navigator.userAgent;

    const payload: OfflineRecordPayload = {
      employeeId: effectiveEmployeeId,
      recordType: tipoRegistro,
      qrCode: qrCodeData || undefined,
      location: geolocation ? 'Localização capturada' : 'Sem localização',
      latitude: geolocation?.latitude,
      longitude: geolocation?.longitude,
      ipAddress,
      userAgent,
    };

    // Se estiver offline, enfileira direto
    if (!navigator.onLine) {
      enqueueOfflineRecord(payload);
      toast({
        title: '📴 Ponto salvo offline',
        description: `${getTipoLabel(tipoRegistro)} será sincronizado quando a conexão voltar.`,
      });
      setQrCodeData('');
      setShowQrConfirmDialog(false);
      return;
    }

    try {
      setLoading(true);

      const response = await timeRecordService.registerTimeRecord(payload);

      if (response.success) {
        toast({
          title: '✅ Ponto Registrado',
          description: `${getTipoLabel(tipoRegistro)} registrado às ${format(new Date(), 'HH:mm:ss')}`,
        });

        const newRecord = (response as any).data;
        if (newRecord?.id && newRecord?.recordType && newRecord?.recordedAt) {
          setRegistrosHoje((prev) => [...prev, newRecord as TimeRecord]);
        }

        await loadTodayRecords();
        await loadNextRecordType();
        setQrCodeData('');
        setShowQrConfirmDialog(false);
      } else {
        throw new Error(response.error || 'Erro ao registrar ponto');
      }
    } catch (error: any) {
      console.error('Erro ao registrar ponto:', error);

      // Erro de rede: salva offline
      if (!error?.response) {
        enqueueOfflineRecord(payload);
        toast({
          title: '📴 Ponto salvo offline',
          description: `${getTipoLabel(tipoRegistro)} será sincronizado quando a conexão voltar.`,
        });
        setQrCodeData('');
        setShowQrConfirmDialog(false);
        return;
      }

      toast({
        title: '❌ Erro',
        description: error.response?.data?.error || error.message || 'Não foi possível registrar o ponto',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const requestCameraPermission = (): Promise<boolean> => {
    if (!navigator.mediaDevices?.getUserMedia) {
      return Promise.resolve(false);
    }
    return navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then((stream) => {
        stream.getTracks().forEach((t) => t.stop());
        return true;
      })
      .catch((err) => {
        console.warn('Permissão de câmera:', err);
        return false;
      });
  };

  const openQRScanner = async () => {
    setCameraPermissionError(null);
    setCameraPermissionGranted(false);
    setShowQRScanner(true);
    const granted = await requestCameraPermission();
    setCameraPermissionGranted(granted);
    if (!granted) {
      setCameraPermissionError('Permita o acesso à câmera nas configurações do navegador e tente novamente.');
      toast({
        title: 'Câmera negada',
        description: 'Para escanear o QR Code, permita o acesso à câmera neste site.',
        variant: 'destructive',
      });
      return;
    }
    setTimeout(() => initQRScanner(), 300);
  };

  const initQRScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear();
    }
    const el = document.getElementById('qr-reader');
    if (!el) return;

    const scanner = new Html5QrcodeScanner(
      'qr-reader',
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      },
      false
    );

    scanner.render(
      (decodedText) => {
        setQrCodeData(decodedText);
        scanner.clear();
        scannerRef.current = null;
        setShowQRScanner(false);

        const processQr = async () => {
          if (navigator.onLine) {
            try {
              const { default: api } = await import('@/lib/axios');
              const res = await api.post('/api/qrcode-work-posts/validate', { qrCode: decodedText });

              if (res.data?.success && res.data?.valid) {
                const workPost = res.data.workPost;
                setQrWorkPostName(workPost?.name ?? null);
                setQrWorkPostDescription(workPost?.description ?? null);
                setQrOfflineMode(false);
              } else {
                setQrWorkPostName(null);
                setQrWorkPostDescription(res.data?.error ?? 'QR Code inválido ou expirado.');
                setQrOfflineMode(false);
              }
            } catch (error) {
              console.error('Erro ao validar QR Code:', error);
              setQrWorkPostName(null);
              setQrWorkPostDescription('Não foi possível validar o QR Code agora.');
              setQrOfflineMode(false);
            }
          } else {
            // Modo offline: não conseguimos validar agora, deixamos para sincronização
            setQrWorkPostName(null);
            setQrWorkPostDescription('Modo offline: o QR Code será validado quando a conexão voltar.');
            setQrOfflineMode(true);
          }

          setShowQrConfirmDialog(true);
        };

        processQr();
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
    setCameraPermissionGranted(false);
  };

  const getTipoLabel = (tipo: 'ENTRADA' | 'SAIDA_ALMOCO' | 'RETORNO_ALMOCO' | 'SAIDA') => {
    const labels = {
      ENTRADA: 'Entrada',
      SAIDA: 'Saída',
      SAIDA_ALMOCO: 'Saída (Intervalo)',
      RETORNO_ALMOCO: 'Retorno (Intervalo)'
    };
    return labels[tipo];
  };

  const getTipoIcon = (tipo: 'ENTRADA' | 'SAIDA_ALMOCO' | 'RETORNO_ALMOCO' | 'SAIDA') => {
    const icons = {
      ENTRADA: LogIn,
      SAIDA: LogOut,
      SAIDA_ALMOCO: Coffee,
      RETORNO_ALMOCO: Coffee
    };
    return icons[tipo];
  };

  const getTipoColor = (tipo: 'ENTRADA' | 'SAIDA_ALMOCO' | 'RETORNO_ALMOCO' | 'SAIDA') => {
    const colors = {
      ENTRADA: 'bg-green-500/10 text-green-500 border-green-500/20',
      SAIDA: 'bg-red-500/10 text-red-500 border-red-500/20',
      SAIDA_ALMOCO: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
      RETORNO_ALMOCO: 'bg-blue-500/10 text-blue-500 border-blue-500/20'
    };
    return colors[tipo];
  };

  const calcularHorasTrabalhadas = () => {
    if (registrosHoje.length < 2) return '0h 0min';

    const entrada = registrosHoje.find(r => r.recordType === 'ENTRADA');
    const saida = registrosHoje.find(r => r.recordType === 'SAIDA');

    if (!entrada) return '0h 0min';

    const entradaTime = new Date(entrada.recordedAt);
    const fim = saida ? new Date(saida.recordedAt) : currentTime;
    const diff = fim.getTime() - entradaTime.getTime();
    
    // Subtrair tempo de almoço (1h)
    const almocoSaida = registrosHoje.find(r => r.recordType === 'SAIDA_ALMOCO');
    const almocoEntrada = registrosHoje.find(r => r.recordType === 'RETORNO_ALMOCO');
    let tempoAlmoco = 0;
    
    if (almocoSaida && almocoEntrada) {
      const almocoSaidaTime = new Date(almocoSaida.recordedAt);
      const almocoEntradaTime = new Date(almocoEntrada.recordedAt);
      tempoAlmoco = almocoEntradaTime.getTime() - almocoSaidaTime.getTime();
    }

    const totalTrabalhado = diff - tempoAlmoco;
    const horas = Math.floor(totalTrabalhado / (1000 * 60 * 60));
    const minutos = Math.floor((totalTrabalhado % (1000 * 60 * 60)) / (1000 * 60));

    return `${horas}h ${minutos}min`;
  };

  const openHistoryDialog = async () => {
    if (!effectiveEmployeeId) return;
    try {
      setHistoryLoading(true);
      setShowHistoryDialog(true);
      const response = await timeRecordService.getEmployeeRecords(effectiveEmployeeId, 0, 50);
      if (response.success) {
        setHistoryRecords(response.data);
      } else {
        toast({
          title: 'Erro ao carregar histórico',
          description: response.error || 'Tente novamente mais tarde',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Erro ao carregar histórico:', error);
      toast({
        title: 'Erro ao carregar histórico',
        description: error.response?.data?.error || error.message,
        variant: 'destructive',
      });
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!effectiveEmployeeId) {
      toast({
        title: 'Erro',
        description: 'Funcionário não identificado',
        variant: 'destructive',
      });
      return;
    }

    const year = reportYear;
    const month = reportMonth;

    try {
      const { timeSheetService } = await import('@/services/timeSheetService');
      const blob = await timeSheetService.downloadMonthFolhaPontoPdf(
        effectiveEmployeeId,
        year,
        month
      );

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `relatorio-ponto-${year}-${String(month).padStart(2, '0')}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Relatório em PDF gerado',
        description: `Relatório de ponto (${String(month).padStart(2, '0')}/${year}) baixado.`,
      });
    } catch (error: any) {
      console.error('Erro ao gerar relatório em PDF:', error);
      toast({
        title: 'Erro ao gerar relatório em PDF',
        description: error?.response?.data?.message || error.message,
        variant: 'destructive',
      });
    }
  };

  const handleSaveJustification = () => {
    if (!justificationText.trim()) {
      toast({
        title: 'Justificativa vazia',
        description: 'Digite uma justificativa antes de salvar.',
        variant: 'destructive',
      });
      return;
    }

    // Por enquanto apenas exibe um feedback; integração com backend pode ser adicionada depois
    toast({
      title: 'Justificativa registrada',
      description: 'Sua justificativa foi registrada localmente. Integração completa será adicionada em breve.',
    });
    setJustificationText('');
    setShowJustificationDialog(false);
  };

  const getProximoRegistroButton = () => {
    const config = {
      ENTRADA: {
        label: 'Registrar Entrada',
        icon: LogIn,
        color: 'bg-green-600 hover:bg-green-700'
      },
      SAIDA: {
        label: 'Registrar Saída',
        icon: LogOut,
        color: 'bg-red-600 hover:bg-red-700'
      },
      SAIDA_ALMOCO: {
        label: 'Registrar Saída (Intervalo)',
        icon: Coffee,
        color: 'bg-orange-600 hover:bg-orange-700'
      },
      RETORNO_ALMOCO: {
        label: 'Registrar Retorno (Intervalo)',
        icon: Coffee,
        color: 'bg-blue-600 hover:bg-blue-700'
      }
    };

    const { label, icon: Icon, color } = config[proximoRegistro];

    return (
      <div className="space-y-3">
        {qrCodeData && (
          <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <p className="text-sm text-green-500 text-center">
              ✅ QR Code validado - Pronto para registrar
            </p>
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={openQRScanner}
            variant="outline"
            className="h-16 border-seguranca-yellow/30 hover:border-seguranca-yellow/50 hover:bg-seguranca-yellow/10"
            disabled={loading}
          >
            <QrCode className="mr-2 h-6 w-6" />
            Escanear QR Code
          </Button>
          
          <Button
            onClick={() => registrarPonto()}
            disabled={loading}
            className={`h-16 ${color} text-white text-lg font-bold`}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                Registrando...
              </>
            ) : (
              <>
                <Icon className="mr-2 h-6 w-6" />
                {label}
              </>
            )}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <StandardLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-seguranca-lightgray">Ponto Eletrônico</h1>
            <p className="text-seguranca-gray mt-1">
              Registre sua jornada de trabalho
            </p>
          </div>
          <Badge variant="outline" className="text-lg px-4 py-2">
            <Calendar className="mr-2 h-5 w-5" />
            {format(currentTime, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </Badge>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Relógio Principal */}
          <Card className="md:col-span-2 lg:col-span-1 bg-gradient-to-br from-seguranca-yellow/10 to-seguranca-yellow/5 border-seguranca-yellow/20">
            <CardHeader className="text-center">
              <CardTitle className="text-seguranca-lightgray">Horário Atual</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="flex items-center justify-center mb-4">
                <Clock className="h-16 w-16 text-seguranca-yellow animate-pulse" />
              </div>
              <div className="text-6xl font-bold text-seguranca-yellow mb-2">
                {format(currentTime, 'HH:mm:ss')}
              </div>
              <div className="text-lg text-seguranca-gray">
                {format(currentTime, "EEEE", { locale: ptBR })}
              </div>
            </CardContent>
          </Card>

          {/* Resumo do Dia */}
          <Card className="bg-seguranca-darkgray/50 border-seguranca-gray/20">
            <CardHeader>
              <CardTitle className="text-seguranca-lightgray flex items-center">
                <TrendingUp className="mr-2 h-5 w-5 text-seguranca-yellow" />
                Resumo do Dia
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-seguranca-gray">Registros:</span>
                <Badge variant="secondary" className="text-lg">
                  {registrosHoje.length}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-seguranca-gray">Horas Trabalhadas:</span>
                <Badge className="text-lg bg-seguranca-yellow/20 text-seguranca-yellow border-seguranca-yellow/30">
                  {calcularHorasTrabalhadas()}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-seguranca-gray">Status:</span>
                <Badge 
                  variant={registrosHoje.length > 0 ? "default" : "outline"}
                  className={registrosHoje.length > 0 ? "bg-green-600" : ""}
                >
                  {registrosHoje.length > 0 ? 'Trabalhando' : 'Fora do Expediente'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Informações do Usuário */}
          <Card className="bg-seguranca-darkgray/50 border-seguranca-gray/20">
            <CardHeader>
              <CardTitle className="text-seguranca-lightgray flex items-center">
                <User className="mr-2 h-5 w-5 text-seguranca-yellow" />
                Informações
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start">
                <MapPin className="mr-2 h-5 w-5 text-seguranca-gray mt-0.5" />
                <div>
                  <div className="text-sm text-seguranca-gray">Localização</div>
                  <div className="text-seguranca-lightgray">Escritório - São Paulo</div>
                </div>
              </div>
              <div className="flex items-start">
                <AlertCircle className="mr-2 h-5 w-5 text-seguranca-gray mt-0.5" />
                <div>
                  <div className="text-sm text-seguranca-gray">IP</div>
                  <div className="text-seguranca-lightgray">192.168.1.1</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Botão de Registro Principal */}
        <Card className="bg-seguranca-darkgray/50 border-seguranca-yellow/20">
          <CardContent className="p-6">
            {getProximoRegistroButton()}
          </CardContent>
        </Card>

        {/* Histórico de Registros do Dia */}
        <Card className="bg-seguranca-darkgray/50 border-seguranca-gray/20">
          <CardHeader>
            <CardTitle className="text-seguranca-lightgray flex items-center">
              <History className="mr-2 h-5 w-5 text-seguranca-yellow" />
              Registros de Hoje
            </CardTitle>
            <CardDescription>
              {registrosHoje.length === 0 
                ? 'Nenhum registro ainda'
                : `${registrosHoje.length} registro(s) realizado(s)`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingRecords ? (
              <div className="text-center py-12">
                <Loader2 className="h-12 w-12 animate-spin mx-auto text-seguranca-yellow" />
                <p className="text-seguranca-gray mt-4">Carregando registros...</p>
              </div>
            ) : registrosHoje.length === 0 ? (
              <div className="text-center py-12 text-seguranca-gray">
                <Clock className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>Nenhum ponto registrado hoje</p>
                <p className="text-sm mt-2">Clique no botão acima para registrar seu primeiro ponto</p>
              </div>
            ) : (
              <div className="space-y-3">
                {registrosHoje.map((registro) => {
                  const Icon = getTipoIcon(registro.recordType);
                  return (
                    <div
                      key={registro.id}
                      className={`flex items-center justify-between p-4 rounded-lg border ${getTipoColor(registro.recordType)}`}
                    >
                      <div className="flex items-center space-x-4">
                        <div className="p-2 rounded-full bg-current/10">
                          <Icon className="h-6 w-6" />
                        </div>
                        <div>
                          <div className="font-semibold">
                            {getTipoLabel(registro.recordType)}
                          </div>
                          <div className="text-sm opacity-75">
                            {registro.location || 'Sem localização'}
                            {registro.qrCodeUsed && ' • QR Code'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">
                          {format(new Date(registro.recordedAt), 'HH:mm:ss')}
                        </div>
                        <div className="text-sm opacity-75">
                          {registro.ipAddress || 'N/A'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ações Rápidas */}
        <Card className="bg-seguranca-darkgray/50 border-seguranca-gray/20">
          <CardHeader>
            <CardTitle className="text-seguranca-lightgray">Ações Rápidas</CardTitle>
            <CardDescription className="text-seguranca-gray">
              Período para Espelho e PDF do mês:
            </CardDescription>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-seguranca-gray">Mês</span>
                <Select value={String(reportMonth)} onValueChange={(v) => setReportMonth(Number(v))}>
                  <SelectTrigger className="w-[140px] bg-seguranca-darkgray border-seguranca-gray/30 text-seguranca-lightgray">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map((m) => (
                      <SelectItem key={m} value={String(m)}>
                        {format(new Date(2000, m - 1, 1), 'MMMM', { locale: ptBR })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-seguranca-gray">Ano</span>
                <Select value={String(reportYear)} onValueChange={(v) => setReportYear(Number(v))}>
                  <SelectTrigger className="w-[100px] bg-seguranca-darkgray border-seguranca-gray/30 text-seguranca-lightgray">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i).map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button
                variant="outline"
                className="h-20 flex flex-col items-center justify-center border-seguranca-gray/30 hover:border-seguranca-yellow/50 hover:bg-seguranca-yellow/10"
                onClick={openHistoryDialog}
              >
                <History className="h-6 w-6 mb-2" />
                <span className="text-sm">Histórico</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex flex-col items-center justify-center border-seguranca-gray/30 hover:border-seguranca-yellow/50 hover:bg-seguranca-yellow/10"
                onClick={handleGenerateReport}
              >
                <CheckCircle className="h-6 w-6 mb-2" />
                <span className="text-sm">Relatório</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex flex-col items-center justify-center border-seguranca-gray/30 hover:border-seguranca-yellow/50 hover:bg-seguranca-yellow/10"
                onClick={() => setShowJustificationDialog(true)}
                disabled={registrosHoje.length === 0}
                title={registrosHoje.length === 0 ? 'Registre pelo menos um ponto para solicitar ajuste' : 'Solicitar ajuste ou justificativa'}
              >
                <AlertCircle className="h-6 w-6 mb-2" />
                <span className="text-sm">Ajuste</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex flex-col items-center justify-center border-seguranca-gray/30 hover:border-seguranca-yellow/50 hover:bg-seguranca-yellow/10"
                onClick={async () => {
                  if (!effectiveEmployeeId) {
                    toast({
                      title: 'Erro',
                      description: 'Funcionário não identificado',
                      variant: 'destructive',
                    });
                    return;
                  }
                  const year = reportYear;
                  const month = reportMonth;
                  try {
                    const { timeSheetService } = await import('@/services/timeSheetService');
                    const blob = await timeSheetService.downloadMonthFolhaPontoPdf(effectiveEmployeeId, year, month);
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `espelho-ponto-${year}-${String(month).padStart(2, '0')}.pdf`;
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                    window.URL.revokeObjectURL(url);
                    toast({ title: 'Espelho gerado', description: `PDF do espelho de ponto (${String(month).padStart(2, '0')}/${year}) baixado.` });
                  } catch (error: any) {
                    console.error('Erro ao gerar espelho de ponto:', error);
                    toast({
                      title: 'Erro ao gerar espelho',
                      description: error?.response?.data?.message || 'Não foi possível gerar o espelho de ponto.',
                      variant: 'destructive',
                    });
                  }
                }}
              >
                <Calendar className="h-6 w-6 mb-2" />
                <span className="text-sm">Espelho</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex flex-col items-center justify-center border-seguranca-gray/30 hover:border-seguranca-yellow/50 hover:bg-seguranca-yellow/10"
                onClick={async () => {
                  if (!effectiveEmployeeId) {
                    toast({ title: 'Erro', description: 'Funcionário não identificado', variant: 'destructive' });
                    return;
                  }
                  const year = reportYear;
                  const month = reportMonth;
                  try {
                    const { timeSheetService } = await import('@/services/timeSheetService');
                    const blob = await timeSheetService.downloadMonthFolhaPontoPdf(effectiveEmployeeId, year, month);
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `registro-ponto-${year}-${String(month).padStart(2, '0')}.pdf`;
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                    window.URL.revokeObjectURL(url);
                    toast({ title: 'PDF gerado', description: `Registro de ponto (${String(month).padStart(2, '0')}/${year}) com seus registros baixado.` });
                  } catch (error: any) {
                    console.error('Erro ao gerar PDF:', error);
                    toast({
                      title: 'Erro ao gerar PDF',
                      description: error?.response?.data?.message || 'Não foi possível gerar o PDF.',
                      variant: 'destructive',
                    });
                  }
                }}
              >
                <FileText className="h-6 w-6 mb-2" />
                <span className="text-sm">PDF do mês</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Informações de Geolocalização */}
        {geolocation && (
          <Card className="bg-seguranca-darkgray/50 border-seguranca-gray/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-seguranca-gray flex items-center">
                  <MapPin className="h-4 w-4 mr-2" />
                  Geolocalização ativa
                </span>
                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                  Lat: {geolocation.latitude.toFixed(6)} | Lng: {geolocation.longitude.toFixed(6)}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal de Histórico */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="sm:max-w-2xl bg-seguranca-darkgray border-seguranca-gray/20">
          <DialogHeader>
            <DialogTitle className="text-seguranca-lightgray flex items-center">
              <History className="mr-2 h-5 w-5 text-seguranca-yellow" />
              Histórico de Registros
            </DialogTitle>
            <DialogDescription className="text-seguranca-gray">
              Últimos registros de ponto realizados por você.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto space-y-3">
            {historyLoading ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-seguranca-yellow" />
                <p className="text-seguranca-gray mt-2">Carregando histórico...</p>
              </div>
            ) : historyRecords.length === 0 ? (
              <p className="text-seguranca-gray text-center py-4">
                Nenhum registro encontrado.
              </p>
            ) : (
              historyRecords.map((registro) => {
                const Icon = getTipoIcon(registro.recordType);
                return (
                  <div
                    key={registro.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${getTipoColor(registro.recordType)}`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-full bg-current/10">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-semibold">
                          {getTipoLabel(registro.recordType)}
                        </div>
                        <div className="text-xs opacity-75">
                          {new Date(registro.recordedAt).toLocaleDateString('pt-BR')} •{' '}
                          {new Date(registro.recordedAt).toLocaleTimeString('pt-BR')}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs opacity-75 text-right max-w-[180px] truncate">
                      {registro.location || 'Sem localização'}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Justificativas */}
      <Dialog open={showJustificationDialog} onOpenChange={setShowJustificationDialog}>
        <DialogContent className="sm:max-w-md bg-seguranca-darkgray border-seguranca-gray/20">
          <DialogHeader>
            <DialogTitle className="text-seguranca-lightgray flex items-center">
              <AlertCircle className="mr-2 h-5 w-5 text-seguranca-yellow" />
              Justificativa de Ponto
            </DialogTitle>
            <DialogDescription className="text-seguranca-gray">
              Descreva o motivo para ajuste ou ausência de registro.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              value={justificationText}
              onChange={(e) => setJustificationText(e.target.value)}
              placeholder="Ex: Esqueci de registrar a saída no dia 10/05 às 18h..."
              className="min-h-[120px] bg-seguranca-darkgray border-seguranca-gray/40 text-seguranca-lightgray"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                className="border-seguranca-gray/40"
                onClick={() => setShowJustificationDialog(false)}
              >
                Cancelar
              </Button>
              <Button onClick={handleSaveJustification}>
                Salvar Justificativa
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Scanner de QR Code */}
      <Dialog open={showQRScanner} onOpenChange={(open) => !open && closeQRScanner()}>
        <DialogContent className="sm:max-w-md bg-seguranca-darkgray border-seguranca-gray/20">
          <DialogHeader>
            <DialogTitle className="text-seguranca-lightgray flex items-center">
              <Camera className="mr-2 h-5 w-5 text-seguranca-yellow" />
              Escanear QR Code
            </DialogTitle>
            <DialogDescription className="text-seguranca-gray">
              {cameraPermissionError
                ? 'Permita o acesso à câmera para escanear o QR Code.'
                : 'Aponte a câmera para o QR Code do posto de trabalho'}
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
                    setCameraPermissionGranted(granted);
                    if (granted) setTimeout(() => initQRScanner(), 300);
                    else {
                      setCameraPermissionError('Permita o acesso à câmera nas configurações do navegador.');
                      toast({ title: 'Câmera negada', description: 'Ative a câmera nas configurações do site e tente novamente.', variant: 'destructive' });
                    }
                  }}
                >
                  Permitir câmera e tentar novamente
                </Button>
              </div>
            ) : (
              <div id="qr-reader" className="rounded-lg overflow-hidden border-2 border-seguranca-yellow/30" />
            )}
            <Button variant="outline" className="w-full border-seguranca-gray/30" onClick={closeQRScanner}>
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmação de ponto via QRCode */}
      <Dialog open={showQrConfirmDialog} onOpenChange={setShowQrConfirmDialog}>
        <DialogContent className="sm:max-w-md bg-seguranca-darkgray border-seguranca-gray/20">
          <DialogHeader>
            <DialogTitle className="text-seguranca-lightgray">
              Confirmar registro de ponto
            </DialogTitle>
            <DialogDescription className="text-seguranca-gray">
              Confira as informações antes de confirmar o registro.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm text-seguranca-lightgray">
            <p>
              <span className="font-semibold">Funcionário: </span>
              {user?.name}
            </p>
            {user?.employeeCode && (
              <p>
                <span className="font-semibold">Matrícula: </span>
                {user.employeeCode}
              </p>
            )}
            <p>
              <span className="font-semibold">Tipo de registro: </span>
              {getTipoLabel(proximoRegistro)}
            </p>
            {qrWorkPostName && (
              <>
                <p>
                  <span className="font-semibold">Posto de Trabalho: </span>
                  {qrWorkPostName}
                </p>
                {qrWorkPostDescription && (
                  <p className="text-xs text-seguranca-gray">{qrWorkPostDescription}</p>
                )}
              </>
            )}
            {!qrWorkPostName && qrWorkPostDescription && (
              <p className="text-xs text-seguranca-gray">{qrWorkPostDescription}</p>
            )}
            {qrOfflineMode && (
              <p className="text-xs text-yellow-400">
                Modo offline: o QR Code será validado e o ponto será registrado quando a conexão voltar.
              </p>
            )}
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button
              variant="outline"
              className="border-seguranca-gray/40"
              onClick={() => {
                setShowQrConfirmDialog(false);
                setQrCodeData('');
              }}
            >
              Cancelar
            </Button>
            <Button onClick={() => registrarPonto()}>
              Confirmar registro
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </StandardLayout>
  );
};

export default PontoEletronico;

