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
  CheckCircle2,
  Loader2,
  MapPin,
  QrCode,
  ScanLine,
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

type ManualMode = 'CPF' | 'MATRICULA';
type ScanTarget = 'POST' | 'EMPLOYEE';

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
            toast.success('QR Code do posto lido.');
          } else {
            setEmployeeValue(decoded);
            toast.success('QR Code do crachá lido.');
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
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.error || err?.message || 'Falha ao confirmar a visita.');
    } finally {
      setLoadingPreview(false);
    }
  };

  /* ---------------- Check-in ---------------- */
  const submitCheckin = async () => {
    if (!preview) return;
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
        toast.warning('Não foi possível obter a localização. O check-in será gravado sem geo.');
      }

      const result = await supervisorVisitService.checkin({
        qrCode: postQrCode || undefined,
        workPostId: postQrCode ? undefined : workPostId,
        employeeValue: resolvedEmployeeValue.trim(),
        latitude,
        longitude,
        locationAddress,
        observations: observations || undefined,
      });
      setDone(result);
      toast.success('Check-in registrado com sucesso.');
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.error || err?.message || 'Falha ao registrar o check-in.');
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
  };

  /* ---------------- Render ---------------- */
  if (done) {
    return (
      <div className="min-h-screen bg-muted/30 px-3 py-6 sm:px-6">
        <div className="mx-auto w-full max-w-md space-y-4">
          <Card className="border-emerald-500/40">
            <CardHeader className="items-center text-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-600" />
              <CardTitle>Check-in confirmado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row label="Posto" value={done.workPostName} />
              <Row label="Funcionário" value={done.employee?.name} />
              {done.allocation && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Vínculo</span>
                  <Badge className={ALLOCATION_BADGE_CLASS[done.allocation.type]}>
                    {ALLOCATION_LABEL[done.allocation.type]}
                  </Badge>
                </div>
              )}
              <Row
                label="Data/Hora"
                value={
                  done.visitDate
                    ? `${done.visitDate} ${done.visitTime?.slice(0, 5) ?? ''}`
                    : '—'
                }
              />
              <Row label="Endereço" value={done.locationAddress || 'Não capturado'} />
              {done.latitude != null && done.longitude != null && (
                <Row
                  label="Coordenadas"
                  value={`${done.latitude.toFixed(5)}, ${done.longitude.toFixed(5)}`}
                />
              )}
            </CardContent>
          </Card>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => navigate(-1)}>
              Sair
            </Button>
            <Button onClick={resetFlow}>Nova visita</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 px-3 py-4 sm:px-6">
      <div className="mx-auto w-full max-w-2xl space-y-4">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Check-in no Posto</h1>
            <p className="text-xs text-muted-foreground">
              {format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <X className="mr-1 h-4 w-4" /> Sair
          </Button>
        </header>

        {/* Posto */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4" /> Posto de Trabalho
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full" size="lg" onClick={() => openScanner('POST')}>
              <QrCode className="mr-2 h-5 w-5" /> Escanear QR Code do Posto
            </Button>
            {postQrCode && (
              <p className="rounded bg-emerald-50 px-2 py-1 text-xs text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200">
                QR Code do posto lido. Será validado na confirmação.
              </p>
            )}
            <Separator />
            <div className="space-y-1">
              <Label className="text-sm">Ou selecione manualmente</Label>
              <Select
                value={workPostId}
                onValueChange={(v) => {
                  setWorkPostId(v);
                  setPostQrCode('');
                }}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={loadingPosts ? 'Carregando...' : 'Selecione o posto'}
                  />
                </SelectTrigger>
                <SelectContent>
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

        {/* Funcionário */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <UserIcon className="h-4 w-4" /> Funcionário no Posto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full" size="lg" onClick={() => openScanner('EMPLOYEE')}>
              <QrCode className="mr-2 h-5 w-5" /> Escanear QR Code do Crachá
            </Button>
            {employeeValue && (
              <p className="rounded bg-emerald-50 px-2 py-1 text-xs text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200">
                Crachá lido.
              </p>
            )}
            <Separator />
            <div className="space-y-2">
              <Label className="text-sm">Ou informe CPF / matrícula</Label>
              <div className="flex gap-2">
                <Select value={manualMode} onValueChange={(v) => setManualMode(v as ManualMode)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
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
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Button
          className="w-full"
          size="lg"
          onClick={runPreview}
          disabled={loadingPreview}
        >
          {loadingPreview ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Confirmando...
            </>
          ) : (
            <>
              <ScanLine className="mr-2 h-4 w-4" /> Confirmar posto e funcionário
            </>
          )}
        </Button>

        {/* Preview */}
        {preview && (
          <Card className="border-primary/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Confirmação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border bg-card p-3">
                <p className="mb-1 flex items-center gap-2 font-semibold">
                  <Building2 className="h-4 w-4" /> {preview.workPostName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {preview.workPostAddress || 'Endereço não informado'}
                </p>
                {preview.clientName && (
                  <p className="text-xs text-muted-foreground">
                    Cliente: {preview.clientName}
                  </p>
                )}
                {preview.qrCodeVerified && (
                  <Badge variant="outline" className="mt-1 text-[10px]">
                    QR do posto validado
                  </Badge>
                )}
              </div>

              <div className="rounded-lg border bg-card p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{preview.employee?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {preview.employee?.positionName || '—'} · Mat.:{' '}
                      {preview.employee?.registrationNumber || '—'}
                    </p>
                  </div>
                  {preview.allocation && (
                    <Badge className={ALLOCATION_BADGE_CLASS[preview.allocation.type]}>
                      {ALLOCATION_LABEL[preview.allocation.type]}
                    </Badge>
                  )}
                </div>
                {preview.allocation && (
                  <p className="mt-2 rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
                    {preview.allocation.message}
                  </p>
                )}
              </div>

              <div>
                <Label className="text-xs">Observações (opcional)</Label>
                <Textarea
                  rows={2}
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="Anotações da visita..."
                />
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={submitCheckin}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Registrando check-in...
                  </>
                ) : (
                  <>
                    <MapPin className="mr-2 h-4 w-4" /> Registrar check-in com localização
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Scanner Modal */}
      <Dialog open={scannerOpen} onOpenChange={(o) => !o && closeScanner()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {scanTarget === 'POST' ? 'Escanear QR do Posto' : 'Escanear QR do Crachá'}
            </DialogTitle>
          </DialogHeader>
          <div id="qr-checkin-scanner" className="w-full" />
          <DialogFooter>
            <Button variant="outline" onClick={closeScanner}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Row = ({ label, value }: { label: string; value?: string | null }) => (
  <div className="flex items-center justify-between gap-2">
    <span className="text-muted-foreground">{label}</span>
    <span className="text-right font-medium">{value || '—'}</span>
  </div>
);

export default SupervisorCheckinPosto;
