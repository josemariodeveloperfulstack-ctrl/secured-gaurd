import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Building2,
  Camera,
  CheckCircle2,
  Clock,
  FileCheck,
  HardHat,
  Loader2,
  MapPin,
  PenTool,
  QrCode,
  ScanLine,
  Trash2,
  User as UserIcon,
  X,
} from 'lucide-react';

import { workPostService, type WorkPost } from '@/services/workPostService';
import {
  supervisorVisitService,
  ALLOCATION_BADGE_CLASS,
  ALLOCATION_LABEL,
  type SupervisorVisitResult,
} from '@/services/supervisorVisitService';
import SignaturePad from '@/components/SignaturePad';

type ManualMode = 'CPF' | 'MATRICULA';
type ScanTarget = 'POST' | 'EMPLOYEE';
type SignatureTarget = 'SUPERVISOR' | 'EPI';

const SupervisorCheckinPosto = () => {
  const navigate = useNavigate();

  // Posto
  const [workPosts, setWorkPosts] = useState<WorkPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [postQrCode, setPostQrCode] = useState<string>('');
  const [workPostId, setWorkPostId] = useState<string>('');

  // Funcionário
  const [employeeValue, setEmployeeValue] = useState<string>('');
  const [manualMode, setManualMode] = useState<ManualMode>('CPF');
  const [manualValue, setManualValue] = useState('');

  // Scanner
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanTarget, setScanTarget] = useState<ScanTarget>('POST');
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  // Preview / check-in
  const [preview, setPreview] = useState<SupervisorVisitResult | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [observations, setObservations] = useState('');
  const [description, setDescription] = useState('');
  const [checkinTime, setCheckinTime] = useState<string>('');

  // Fotos da visita (capturadas pela câmera do smartphone)
  const [photos, setPhotos] = useState<string[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Assinaturas digitais
  const [signatureModalOpen, setSignatureModalOpen] = useState(false);
  const [signatureTarget, setSignatureTarget] = useState<SignatureTarget>('SUPERVISOR');
  const [signatureData, setSignatureData] = useState<string>('');
  const [epiSignatureData, setEpiSignatureData] = useState<string>('');

  // Entrega de EPI
  const [epiDelivered, setEpiDelivered] = useState(false);
  const [epiDescription, setEpiDescription] = useState('');

  // Finalização
  const [done, setDone] = useState<SupervisorVisitResult | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoadingPosts(true);
      try {
        const list = await workPostService.getAllWorkPosts();
        setWorkPosts(list || []);
      } catch (err) {
        console.error(err);
        toast.error('Não foi possível carregar os postos de trabalho.');
      } finally {
        setLoadingPosts(false);
      }
    };
    load();
  }, []);

  /* ---------------- Scanner ---------------- */
  const openScanner = (target: ScanTarget) => {
    setScanTarget(target);
    setScannerOpen(true);
    setTimeout(() => initScanner(target), 200);
  };

  const initScanner = (target: ScanTarget) => {
    if (scannerRef.current) scannerRef.current.clear().catch(() => undefined);
    const el = document.getElementById('qr-checkin-scanner');
    if (!el) return;
    const scanner = new Html5QrcodeScanner(
      'qr-checkin-scanner',
      { fps: 10, qrbox: { width: 240, height: 240 }, aspectRatio: 1 },
      false,
    );
    void Promise.resolve(
      scanner.render(
        (decoded) => {
          scanner.clear().catch(() => undefined);
          scannerRef.current = null;
          setScannerOpen(false);
          if (target === 'POST') {
            setPostQrCode(decoded);
            setWorkPostId('');
            toast.success('QR Code do posto lido com sucesso.');
          } else {
            setEmployeeValue(decoded);
            toast.success('QR Code do crachá lido com sucesso.');
          }
        },
        () => undefined,
      ),
    ).catch((err) => console.warn('Falha ao iniciar scanner:', err));
    scannerRef.current = scanner;
  };

  const closeScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(() => undefined);
      scannerRef.current = null;
    }
    setScannerOpen(false);
  };

  /* ---------------- Preview ---------------- */
  const resolvedEmployeeValue = employeeValue || manualValue;

  const runPreview = async () => {
    if (!postQrCode && !workPostId) {
      toast.error('Escaneie o QR Code do posto ou selecione um posto.');
      return;
    }
    if (!resolvedEmployeeValue.trim()) {
      toast.error('Escaneie o crachá ou informe CPF / matrícula do funcionário.');
      return;
    }
    setLoadingPreview(true);
    setPreview(null);
    try {
      const result = await supervisorVisitService.preview({
        qrCode: postQrCode || undefined,
        workPostId: postQrCode ? undefined : workPostId,
        employeeValue: resolvedEmployeeValue.trim(),
      });
      setPreview(result);
      const nowStr = format(new Date(), 'HH:mm:ss');
      setCheckinTime(nowStr);
      toast.success('Posto e funcionário validados com sucesso!');
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.error || err?.message || 'Falha ao confirmar a visita.');
    } finally {
      setLoadingPreview(false);
    }
  };

  /* ---------------- Fotos ---------------- */
  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      toast.error('A foto deve ter no máximo 8MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setPhotos((prev) => [...prev, base64]);
      toast.success('Foto anexada à visita!');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  /* ---------------- Assinatura ---------------- */
  const openSignatureModal = (target: SignatureTarget) => {
    setSignatureTarget(target);
    setSignatureModalOpen(true);
  };

  const handleSaveSignature = (base64: string) => {
    if (signatureTarget === 'SUPERVISOR') {
      setSignatureData(base64);
      toast.success('Assinatura da ata registrada!');
    } else {
      setEpiSignatureData(base64);
      toast.success('Assinatura de recebimento de EPI registrada!');
    }
    setSignatureModalOpen(false);
  };

  /* ---------------- Check-out e Conclusão ---------------- */
  const submitCheckin = async () => {
    if (!preview) return;

    if (epiDelivered && !epiDescription.trim()) {
      toast.error('Informe quais itens de EPI foram entregues.');
      return;
    }

    if (epiDelivered && !epiSignatureData) {
      toast.error('Colete a assinatura do funcionário para confirmar a entrega do EPI.');
      return;
    }

    setSubmitting(true);
    try {
      let latitude: number | undefined;
      let longitude: number | undefined;
      let locationAddress: string | undefined;
      try {
        const loc = await supervisorVisitService.getCurrentLocation();
        latitude = loc.latitude;
        longitude = loc.longitude;
        locationAddress = await supervisorVisitService.reverseGeocode(
          loc.latitude,
          loc.longitude,
        );
      } catch (geoErr) {
        console.warn('Geolocalização indisponível:', geoErr);
        toast.warning('Não foi possível obter a localização. O check-in será gravado sem GPS.');
      }

      const checkoutTimeStr = format(new Date(), 'HH:mm:ss');

      // Calcular tempo de permanência em minutos
      let durationMinutes = 0;
      if (checkinTime) {
        const [inH, inM] = checkinTime.split(':').map(Number);
        const [outH, outM] = checkoutTimeStr.split(':').map(Number);
        durationMinutes = Math.max(1, (outH * 60 + outM) - (inH * 60 + inM));
      }

      const result = await supervisorVisitService.checkin({
        qrCode: postQrCode || undefined,
        workPostId: postQrCode ? undefined : workPostId,
        employeeValue: resolvedEmployeeValue.trim(),
        latitude,
        longitude,
        locationAddress,
        description: description || undefined,
        observations: observations || undefined,
        checkoutTime: checkoutTimeStr,
        durationMinutes,
        photos: photos.length > 0 ? photos : undefined,
        signatureData: signatureData || undefined,
        epiDelivered,
        epiDescription: epiDelivered ? epiDescription : undefined,
        epiSignatureData: epiDelivered ? epiSignatureData : undefined,
      });

      setDone(result);
      toast.success('Visita de supervisão concluída com sucesso!');
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.error || err?.message || 'Falha ao registrar a visita.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetFlow = () => {
    setDone(null);
    setPreview(null);
    setPostQrCode('');
    setWorkPostId('');
    setEmployeeValue('');
    setManualValue('');
    setObservations('');
    setDescription('');
    setPhotos([]);
    setSignatureData('');
    setEpiDelivered(false);
    setEpiDescription('');
    setEpiSignatureData('');
    setCheckinTime('');
  };

  /* ---------------- Resumo Finalizado ---------------- */
  if (done) {
    return (
      <div className="min-h-screen bg-seguranca-black px-3 py-6 sm:px-6 text-white">
        <div className="mx-auto w-full max-w-lg space-y-4">
          <Card className="border-emerald-500/40 bg-seguranca-graphite/40 rounded-3xl">
            <CardHeader className="items-center text-center pb-2">
              <CheckCircle2 className="h-14 w-14 text-emerald-500 mb-2" />
              <CardTitle className="text-xl font-black uppercase text-emerald-400">
                Visita de Supervisão Concluída
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row label="Posto de Trabalho" value={done.workPostName} />
              <Row label="Funcionário no Posto" value={done.employee?.name} />
              {done.allocation && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 font-bold">Vínculo com Posto</span>
                  <Badge className={ALLOCATION_BADGE_CLASS[done.allocation.type]}>
                    {ALLOCATION_LABEL[done.allocation.type]}
                  </Badge>
                </div>
              )}
              <Row
                label="Horário Check-in / Check-out"
                value={`${done.visitTime?.slice(0, 5) || checkinTime} às ${done.checkoutTime?.slice(0, 5) || format(new Date(), 'HH:mm')}`}
              />
              <Row
                label="Permanência no Local"
                value={`${done.durationMinutes || 1} minuto(s)`}
              />
              <Row label="Endereço GPS" value={done.locationAddress || 'Localização confirmada'} />
              {done.latitude != null && done.longitude != null && (
                <Row
                  label="Coordenadas GPS"
                  value={`${done.latitude.toFixed(5)}, ${done.longitude.toFixed(5)}`}
                />
              )}
              {photos.length > 0 && (
                <Row label="Fotos Anexadas" value={`${photos.length} foto(s)`} />
              )}
              {signatureData && (
                <div className="pt-2 border-t border-gray-800">
                  <span className="text-xs text-gray-400 font-bold block mb-1">Assinatura da Ata</span>
                  <img src={signatureData} alt="Assinatura da Ata" className="h-16 max-w-full bg-white rounded-lg p-1" />
                </div>
              )}
              {done.epiDelivered && (
                <div className="pt-2 border-t border-gray-800">
                  <Badge className="bg-amber-500 text-seguranca-black font-black mb-1">
                    EPI Entregue no Posto
                  </Badge>
                  <p className="text-xs text-gray-300">{done.epiDescription}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={() => navigate('/area-funcionario')}
              className="border-gray-700 hover:bg-white/5 rounded-2xl h-12"
            >
              Voltar ao Portal
            </Button>
            <Button
              onClick={resetFlow}
              className="bg-seguranca-yellow hover:bg-seguranca-yellow/90 text-seguranca-black font-black rounded-2xl h-12"
            >
              Nova Visita
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-seguranca-black px-3 py-6 sm:px-6 text-white">
      <div className="mx-auto w-full max-w-2xl space-y-5">
        {/* Header */}
        <header className="flex items-center justify-between bg-seguranca-graphite/40 border border-gray-800 p-4 rounded-3xl">
          <div>
            <h1 className="text-xl font-black uppercase text-seguranca-yellow flex items-center gap-2">
              <QrCode className="w-6 h-6" /> Supervisão: Check-in no Posto
            </h1>
            <p className="text-xs text-gray-400">
              {format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="text-gray-400 hover:text-white hover:bg-white/5 rounded-xl"
          >
            <X className="mr-1 h-4 w-4" /> Fechar
          </Button>
        </header>

        {/* 1. Posto de Trabalho */}
        <Card className="bg-seguranca-graphite/30 border-gray-800 rounded-3xl">
          <CardHeader className="pb-3 border-b border-gray-800/50">
            <CardTitle className="flex items-center gap-2 text-base font-black text-seguranca-lightgray">
              <Building2 className="h-5 w-5 text-seguranca-yellow" /> 1. Posto de Trabalho
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            <Button
              className="w-full h-14 bg-seguranca-yellow hover:bg-seguranca-yellow/90 text-seguranca-black font-black text-base rounded-2xl shadow-lg shadow-seguranca-yellow/10"
              size="lg"
              onClick={() => openScanner('POST')}
            >
              <QrCode className="mr-2 h-6 w-6" /> Escanear QR Code do Posto
            </Button>
            {postQrCode && (
              <p className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 text-xs text-emerald-400 font-bold">
                ✓ QR Code do posto lido: {postQrCode.slice(0, 24)}...
              </p>
            )}
            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-gray-800"></div>
              <span className="flex-shrink mx-4 text-xs font-black uppercase text-gray-500">ou selecione</span>
              <div className="flex-grow border-t border-gray-800"></div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-400 font-bold">Selecione o posto na lista</Label>
              <Select
                value={workPostId}
                onValueChange={(v) => {
                  setWorkPostId(v);
                  setPostQrCode('');
                }}
              >
                <SelectTrigger className="bg-seguranca-black border-gray-800 rounded-2xl h-12 text-white">
                  <SelectValue placeholder={loadingPosts ? 'Carregando postos...' : 'Selecione o posto'} />
                </SelectTrigger>
                <SelectContent className="bg-seguranca-graphite border-gray-700 text-white rounded-2xl max-h-60">
                  {workPosts.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* 2. Funcionário no Posto */}
        <Card className="bg-seguranca-graphite/30 border-gray-800 rounded-3xl">
          <CardHeader className="pb-3 border-b border-gray-800/50">
            <CardTitle className="flex items-center gap-2 text-base font-black text-seguranca-lightgray">
              <UserIcon className="h-5 w-5 text-indigo-400" /> 2. Funcionário no Posto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            <Button
              className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-base rounded-2xl shadow-lg shadow-indigo-600/10"
              size="lg"
              onClick={() => openScanner('EMPLOYEE')}
            >
              <QrCode className="mr-2 h-6 w-6" /> Escanear QR Code do Crachá
            </Button>
            {employeeValue && (
              <p className="rounded-xl bg-indigo-500/10 border border-indigo-500/30 px-3 py-2 text-xs text-indigo-300 font-bold">
                ✓ Crachá lido com sucesso.
              </p>
            )}
            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-gray-800"></div>
              <span className="flex-shrink mx-4 text-xs font-black uppercase text-gray-500">ou digite</span>
              <div className="flex-grow border-t border-gray-800"></div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-gray-400 font-bold">Informe CPF ou matrícula do colaborador</Label>
              <div className="flex gap-2">
                <Select value={manualMode} onValueChange={(v) => setManualMode(v as ManualMode)}>
                  <SelectTrigger className="w-32 bg-seguranca-black border-gray-800 rounded-2xl h-12 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-seguranca-graphite border-gray-700 text-white rounded-xl">
                    <SelectItem value="CPF">CPF</SelectItem>
                    <SelectItem value="MATRICULA">Matrícula</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  value={manualValue}
                  onChange={(e) => {
                    setManualValue(e.target.value);
                    setEmployeeValue('');
                  }}
                  placeholder={manualMode === 'CPF' ? '000.000.000-00' : 'Matrícula'}
                  inputMode={manualMode === 'CPF' ? 'numeric' : 'text'}
                  className="bg-seguranca-black border-gray-800 rounded-2xl h-12 text-white"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Botão de Validação Preliminar */}
        {!preview && (
          <Button
            className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-base rounded-2xl shadow-xl shadow-emerald-600/20"
            size="lg"
            onClick={runPreview}
            disabled={loadingPreview}
          >
            {loadingPreview ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Verificando posto e escala...
              </>
            ) : (
              <>
                <ScanLine className="mr-2 h-5 w-5" /> Validar Posto e Iniciar Entrada
              </>
            )}
          </Button>
        )}

        {/* 3. Área de Execução da Visita (Ata, Fotos, EPI e Assinatura) */}
        {preview && (
          <div className="space-y-5 animate-in fade-in duration-300">
            {/* Informações Validadas */}
            <Card className="border-emerald-500/30 bg-seguranca-graphite/40 rounded-3xl overflow-hidden">
              <CardHeader className="bg-emerald-500/10 border-b border-emerald-500/20 py-3">
                <CardTitle className="text-sm font-black uppercase text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Check-in de Entrada Realizado às {checkinTime}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-white text-base">{preview.workPostName}</h3>
                    <p className="text-xs text-gray-400">{preview.workPostAddress || 'Endereço validado'}</p>
                    {preview.clientName && (
                      <p className="text-xs text-gray-400">Cliente: {preview.clientName}</p>
                    )}
                  </div>
                  {preview.qrCodeVerified && (
                    <Badge variant="outline" className="border-emerald-500 text-emerald-400 text-[10px]">
                      QR Code Validado
                    </Badge>
                  )}
                </div>

                <div className="p-3 bg-seguranca-black/60 rounded-2xl border border-gray-800 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm text-white">{preview.employee?.name}</p>
                    <p className="text-xs text-gray-400">
                      {preview.employee?.positionName || 'Colaborador'} · Mat.: {preview.employee?.registrationNumber || '—'}
                    </p>
                  </div>
                  {preview.allocation && (
                    <Badge className={ALLOCATION_BADGE_CLASS[preview.allocation.type]}>
                      {ALLOCATION_LABEL[preview.allocation.type]}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Captura de Fotos */}
            <Card className="bg-seguranca-graphite/30 border-gray-800 rounded-3xl">
              <CardHeader className="pb-3 border-b border-gray-800/50">
                <CardTitle className="flex items-center gap-2 text-base font-black text-seguranca-lightgray">
                  <Camera className="h-5 w-5 text-seguranca-yellow" /> Fotos do Local / Posto
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  ref={photoInputRef}
                  onChange={handlePhotoCapture}
                  className="hidden"
                />
                <Button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="w-full h-12 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-2xl flex items-center justify-center gap-2"
                >
                  <Camera className="w-5 h-5 text-seguranca-yellow" /> Tirar Foto com a Câmera
                </Button>

                {photos.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {photos.map((p, idx) => (
                      <div key={idx} className="relative rounded-2xl overflow-hidden border border-gray-700 group">
                        <img src={p} alt={`Foto ${idx + 1}`} className="w-full h-28 object-cover" />
                        <button
                          type="button"
                          onClick={() => removePhoto(idx)}
                          className="absolute top-1 right-1 bg-rose-600 text-white rounded-full p-1 opacity-90 hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Ata da Visita */}
            <Card className="bg-seguranca-graphite/30 border-gray-800 rounded-3xl">
              <CardHeader className="pb-3 border-b border-gray-800/50">
                <CardTitle className="flex items-center gap-2 text-base font-black text-seguranca-lightgray">
                  <FileCheck className="h-5 w-5 text-indigo-400" /> Ata da Visita
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label className="text-xs text-gray-400 font-bold">Relato da Atividade / Ata</Label>
                  <Textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descreva as verificações realizadas no posto, condições gerais, ocorrências..."
                    className="bg-seguranca-black border-gray-800 rounded-2xl text-white resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-gray-400 font-bold">Observações Adicionais (Opcional)</Label>
                  <Input
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                    placeholder="Ex: uniforme impecável, livro de ocorrências assinado..."
                    className="bg-seguranca-black border-gray-800 rounded-2xl h-11 text-white"
                  />
                </div>

                {/* Assinatura da Ata */}
                <div className="pt-2">
                  <Label className="text-xs text-gray-400 font-bold block mb-2">Assinatura Digital do Supervisor</Label>
                  {signatureData ? (
                    <div className="space-y-2">
                      <div className="p-3 bg-white rounded-2xl inline-block">
                        <img src={signatureData} alt="Assinatura da Ata" className="h-16 max-w-full" />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => openSignatureModal('SUPERVISOR')}
                        className="text-xs text-seguranca-yellow block"
                      >
                        Assinar Novamente
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      onClick={() => openSignatureModal('SUPERVISOR')}
                      className="w-full h-12 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-2xl flex items-center justify-center gap-2"
                    >
                      <PenTool className="w-4 h-4 text-seguranca-yellow" /> Coletar Assinatura na Tela
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Entrega de EPI (Opcional) */}
            <Card className="bg-seguranca-graphite/30 border-gray-800 rounded-3xl">
              <CardHeader className="pb-3 border-b border-gray-800/50">
                <CardTitle className="flex items-center gap-2 text-base font-black text-seguranca-lightgray">
                  <HardHat className="h-5 w-5 text-amber-400" /> Entrega de EPI
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="flex items-center space-x-3 bg-seguranca-black/40 p-3 rounded-2xl border border-gray-800">
                  <Checkbox
                    id="epiDelivered"
                    checked={epiDelivered}
                    onCheckedChange={(checked) => setEpiDelivered(Boolean(checked))}
                  />
                  <label
                    htmlFor="epiDelivered"
                    className="text-sm font-bold text-white cursor-pointer select-none"
                  >
                    Houve entrega ou reposição de EPI nesta visita?
                  </label>
                </div>

                {epiDelivered && (
                  <div className="space-y-3 animate-in fade-in duration-200">
                    <div className="space-y-2">
                      <Label className="text-xs text-gray-400 font-bold">Descrição dos EPIs Entregues</Label>
                      <Textarea
                        rows={2}
                        value={epiDescription}
                        onChange={(e) => setEpiDescription(e.target.value)}
                        placeholder="Ex: 01 Coturno Tam 41, 01 Colete Balístico Nível II, 02 Camisas..."
                        className="bg-seguranca-black border-gray-800 rounded-2xl text-white resize-none"
                      />
                    </div>

                    <div>
                      <Label className="text-xs text-gray-400 font-bold block mb-2">
                        Assinatura do Funcionário (Ficha de EPI)
                      </Label>
                      {epiSignatureData ? (
                        <div className="space-y-2">
                          <div className="p-3 bg-white rounded-2xl inline-block">
                            <img src={epiSignatureData} alt="Assinatura EPI" className="h-16 max-w-full" />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => openSignatureModal('EPI')}
                            className="text-xs text-amber-400 block"
                          >
                            Assinar Novamente
                          </Button>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          onClick={() => openSignatureModal('EPI')}
                          className="w-full h-12 bg-amber-600 hover:bg-amber-700 text-seguranca-black font-black rounded-2xl flex items-center justify-center gap-2"
                        >
                          <PenTool className="w-4 h-4 text-seguranca-black" /> Assinatura do Funcionário para EPI
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Check-out / Conclusão */}
            <Button
              className="w-full h-16 bg-seguranca-yellow hover:bg-seguranca-yellow/90 text-seguranca-black font-black text-lg rounded-2xl shadow-xl shadow-seguranca-yellow/20"
              size="lg"
              onClick={submitCheckin}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-6 w-6 animate-spin" /> Concluindo visita e gravando...
                </>
              ) : (
                <>
                  <Clock className="mr-2 h-6 w-6" /> Concluir Visita / Fazer Check-out
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Modal de Leitura de QR Code */}
      <Dialog open={scannerOpen} onOpenChange={(o) => !o && closeScanner()}>
        <DialogContent className="sm:max-w-md bg-seguranca-graphite border-gray-700 text-white rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-black text-seguranca-yellow">
              {scanTarget === 'POST' ? 'Escanear QR Code do Posto' : 'Escanear QR Code do Crachá'}
            </DialogTitle>
          </DialogHeader>
          <div id="qr-checkin-scanner" className="w-full bg-black rounded-2xl overflow-hidden" />
          <DialogFooter>
            <Button variant="outline" onClick={closeScanner} className="border-gray-700 rounded-xl">
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Assinatura Digital */}
      <Dialog open={signatureModalOpen} onOpenChange={setSignatureModalOpen}>
        <DialogContent className="sm:max-w-md bg-seguranca-graphite border-gray-700 text-white rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-black text-seguranca-yellow flex items-center gap-2">
              <PenTool className="w-5 h-5" />
              {signatureTarget === 'SUPERVISOR'
                ? 'Assinatura da Ata pelo Supervisor'
                : 'Assinatura do Funcionário (Recebimento de EPI)'}
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p className="text-xs text-gray-400 mb-2">Assine com o dedo ou caneta stylus no quadro branco abaixo:</p>
            <div className="border border-gray-700 rounded-2xl overflow-hidden bg-white">
              <SignaturePad onSave={handleSaveSignature} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSignatureModalOpen(false)} className="rounded-xl">
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Row = ({ label, value }: { label: string; value?: string | null }) => (
  <div className="flex items-center justify-between gap-2 py-1 border-b border-gray-800/40">
    <span className="text-gray-400 text-xs font-bold">{label}</span>
    <span className="text-right font-medium text-white text-xs">{value || '—'}</span>
  </div>
);

export default SupervisorCheckinPosto;
