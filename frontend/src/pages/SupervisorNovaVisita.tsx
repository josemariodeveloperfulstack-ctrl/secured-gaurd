import { useEffect, useMemo, useRef, useState } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ClipboardList,
  FileText,
  Loader2,
  MapPin,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Truck,
  User as UserIcon,
  X,
} from 'lucide-react';

import { workPostService, type WorkPost } from '@/services/workPostService';
import {
  employeeQrCodeService,
  type EmployeeIdentification,
} from '@/services/employeeQrCodeService';
import { visitControlService } from '@/services/visitControlService';
import {
  visitControlEnrichmentService,
  type VisitFull,
  type VisitIssueCategory,
  type VisitIssueSeverity,
  type VisitAssetType,
  type VisitAssetStatus,
  type VisitPhotoType,
} from '@/services/visitControlEnrichmentService';
import {
  remanejamentoApprovalService,
  type RemanejamentoMotivo,
} from '@/services/remanejamentoApprovalService';

type ManualMode = 'CPF' | 'MATRICULA';

const PHOTO_TYPE_LABEL: Record<VisitPhotoType, string> = {
  GENERAL: 'Geral',
  POST: 'Posto',
  EQUIPMENT: 'Equipamento',
  EPI: 'EPI',
  INCIDENT: 'Incidente',
  REPORT_SHEET: 'Ficha/Relatório',
};

const ISSUE_CATEGORY_LABEL: Record<VisitIssueCategory, string> = {
  SAFETY: 'Segurança',
  INFRA: 'Infraestrutura',
  EQUIPMENT: 'Equipamento',
  BEHAVIOR: 'Comportamento',
  OTHER: 'Outro',
};

const ISSUE_SEVERITY_LABEL: Record<VisitIssueSeverity, string> = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
  CRITICAL: 'Crítica',
};

const ASSET_TYPE_LABEL: Record<VisitAssetType, string> = {
  EQUIPMENT: 'Equipamento',
  VEHICLE: 'Veículo',
  OTHER: 'Outro',
};

const ASSET_STATUS_LABEL: Record<VisitAssetStatus, string> = {
  PRESENT: 'Presente',
  MISSING: 'Faltando',
  DAMAGED: 'Danificado',
  NEEDS_MAINTENANCE: 'Manutenção',
};

const MOTIVO_LABEL: Record<RemanejamentoMotivo, string> = {
  TRAINING_PENDING: 'Treinamento pendente',
  UNCOVERED_ABSENCE: 'Cobertura de ausência',
  HEALTH_ISSUE: 'Questão de saúde',
  DISCIPLINARY: 'Disciplinar',
  OTHER: 'Outro motivo',
};

const SupervisorNovaVisita = () => {
  const navigate = useNavigate();

  // --- Setup ---
  const [workPosts, setWorkPosts] = useState<WorkPost[]>([]);
  const [workPostId, setWorkPostId] = useState<string>('');
  const [loadingPosts, setLoadingPosts] = useState(false);

  // --- Identificação ---
  const [employee, setEmployee] = useState<EmployeeIdentification | null>(null);
  const [identifying, setIdentifying] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [manualMode, setManualMode] = useState<ManualMode>('CPF');
  const [manualValue, setManualValue] = useState('');
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  // --- Visita ---
  const [visitId, setVisitId] = useState<string | null>(null);
  const [creatingVisit, setCreatingVisit] = useState(false);
  const [finalizingVisit, setFinalizingVisit] = useState(false);
  const [findings, setFindings] = useState('');
  const [observations, setObservations] = useState('');
  const [bundle, setBundle] = useState<VisitFull | null>(null);
  const [loadingBundle, setLoadingBundle] = useState(false);

  // --- Form states ---
  const [photoType, setPhotoType] = useState<VisitPhotoType>('POST');
  const [photoCaption, setPhotoCaption] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [issueDraft, setIssueDraft] = useState<{
    category: VisitIssueCategory;
    severity: VisitIssueSeverity;
    description: string;
  }>({ category: 'INFRA', severity: 'MEDIUM', description: '' });
  const [savingIssue, setSavingIssue] = useState(false);

  const [assetDraft, setAssetDraft] = useState<{
    assetType: VisitAssetType;
    description: string;
    status: VisitAssetStatus;
    notes: string;
  }>({ assetType: 'EQUIPMENT', description: '', status: 'PRESENT', notes: '' });
  const [savingAsset, setSavingAsset] = useState(false);

  const [epiDraft, setEpiDraft] = useState<{
    epiItemDescription: string;
    quantity: number;
    employeeConfirmed: boolean;
    notes: string;
  }>({ epiItemDescription: '', quantity: 1, employeeConfirmed: true, notes: '' });
  const [savingEpi, setSavingEpi] = useState(false);

  // --- Remanejamento ---
  const [remanejamentoOpen, setRemanejamentoOpen] = useState(false);
  const [remanejamentoForm, setRemanejamentoForm] = useState<{
    motivo: RemanejamentoMotivo;
    destinationWorkstationId: string;
    coverageEmployeeId: string;
    observacao: string;
  }>({
    motivo: 'TRAINING_PENDING',
    destinationWorkstationId: '',
    coverageEmployeeId: '',
    observacao: '',
  });
  const [savingRemanejamento, setSavingRemanejamento] = useState(false);

  /* ---------------- Loaders ---------------- */
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

  /* ---------------- Identificação ---------------- */
  const openScanner = () => {
    setScannerOpen(true);
    setTimeout(() => initScanner(), 200);
  };

  const initScanner = () => {
    if (scannerRef.current) scannerRef.current.clear();
    const el = document.getElementById('qr-supervisor-visit');
    if (!el) return;
    const scanner = new Html5QrcodeScanner(
      'qr-supervisor-visit',
      { fps: 10, qrbox: { width: 240, height: 240 }, aspectRatio: 1 },
      false,
    );
    void Promise.resolve(
      scanner.render(
        (decoded) => {
          scanner.clear().catch(() => undefined);
          scannerRef.current = null;
          setScannerOpen(false);
          identifyEmployee(decoded);
        },
        () => {
          // ignore frame failures
        },
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

  const identifyEmployee = async (value: string) => {
    const trimmed = value?.trim();
    if (!trimmed) {
      toast.error('Informe um valor para identificação.');
      return;
    }
    setIdentifying(true);
    try {
      const res = await employeeQrCodeService.identify(trimmed);
      if (res.success && res.employee) {
        setEmployee(res.employee);
        toast.success(`Funcionário identificado: ${res.employee.name}`);
      } else {
        toast.error(res.error || 'Funcionário não encontrado.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Falha ao identificar funcionário.');
    } finally {
      setIdentifying(false);
    }
  };

  const handleManualSubmit = () => {
    if (!manualValue.trim()) {
      toast.error(`Informe o ${manualMode === 'CPF' ? 'CPF' : 'matrícula'}.`);
      return;
    }
    identifyEmployee(manualValue);
  };

  /* ---------------- Visita ---------------- */
  const selectedPost = useMemo(
    () => workPosts.find((p) => p.id === workPostId) ?? null,
    [workPosts, workPostId],
  );

  const startVisit = async () => {
    if (!workPostId) {
      toast.error('Selecione um posto de trabalho.');
      return;
    }
    if (!employee) {
      toast.error('Identifique o funcionário antes de iniciar a visita.');
      return;
    }
    setCreatingVisit(true);
    try {
      const now = new Date().toISOString();
      const created = await visitControlService.createVisitControl({
        location: selectedPost?.name || 'Visita do supervisor',
        workPostId,
        workPostName: selectedPost?.name,
        assignedTo: employee.id,
        visitDate: now,
        scheduledAt: now,
        startedAt: now,
        status: 'IN_PROGRESS',
        observations: '',
      });
      setVisitId(created.id);
      toast.success('Visita iniciada. Você pode registrar fotos, ata e mais.');
      await loadBundle(created.id);
    } catch (err) {
      console.error(err);
      toast.error('Não foi possível iniciar a visita.');
    } finally {
      setCreatingVisit(false);
    }
  };

  const loadBundle = async (id: string) => {
    setLoadingBundle(true);
    try {
      const data = await visitControlEnrichmentService.getFull(id);
      setBundle(data);
    } catch (err) {
      console.error(err);
      toast.error('Falha ao carregar dados da visita.');
    } finally {
      setLoadingBundle(false);
    }
  };

  const finalizeVisit = async () => {
    if (!visitId) return;
    if (!findings.trim()) {
      toast.error('Preencha a ata da visita antes de finalizar.');
      return;
    }
    setFinalizingVisit(true);
    try {
      await visitControlService.updateVisitControl(visitId, {
        status: 'COMPLETED',
        completedAt: new Date().toISOString(),
        findings,
        observations,
        isSuccessful: true,
      });
      toast.success('Visita finalizada com sucesso.');
      navigate('/supervisao/visitas');
    } catch (err) {
      console.error(err);
      toast.error('Falha ao finalizar a visita.');
    } finally {
      setFinalizingVisit(false);
    }
  };

  /* ---------------- Fotos ---------------- */
  const onPickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !visitId) return;
    setUploadingPhoto(true);
    try {
      await visitControlEnrichmentService.addPhoto(visitId, file, {
        photoType,
        caption: photoCaption || undefined,
      });
      setPhotoCaption('');
      toast.success('Foto enviada.');
      await loadBundle(visitId);
    } catch (err) {
      console.error(err);
      toast.error('Falha ao enviar foto.');
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  /* ---------------- Problemas ---------------- */
  const addIssue = async () => {
    if (!visitId) return;
    if (!issueDraft.description.trim()) {
      toast.error('Descreva o problema.');
      return;
    }
    setSavingIssue(true);
    try {
      await visitControlEnrichmentService.addIssue(visitId, issueDraft);
      setIssueDraft({ category: 'INFRA', severity: 'MEDIUM', description: '' });
      toast.success('Problema registrado.');
      await loadBundle(visitId);
    } catch (err) {
      console.error(err);
      toast.error('Falha ao registrar problema.');
    } finally {
      setSavingIssue(false);
    }
  };

  /* ---------------- Equipamentos / Veículos ---------------- */
  const addAsset = async () => {
    if (!visitId) return;
    if (!assetDraft.description.trim()) {
      toast.error('Descreva o equipamento ou veículo.');
      return;
    }
    setSavingAsset(true);
    try {
      await visitControlEnrichmentService.addPostAsset(visitId, {
        assetType: assetDraft.assetType,
        description: assetDraft.description,
        status: assetDraft.status,
        notes: assetDraft.notes || undefined,
      });
      setAssetDraft({ assetType: 'EQUIPMENT', description: '', status: 'PRESENT', notes: '' });
      toast.success('Inventário atualizado.');
      await loadBundle(visitId);
    } catch (err) {
      console.error(err);
      toast.error('Falha ao salvar inventário.');
    } finally {
      setSavingAsset(false);
    }
  };

  /* ---------------- EPI ---------------- */
  const onPickEpiPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    submitEpi(file);
    e.target.value = '';
  };

  const submitEpi = async (photo?: File) => {
    if (!visitId) return;
    if (!epiDraft.epiItemDescription.trim()) {
      toast.error('Informe o item de EPI entregue.');
      return;
    }
    setSavingEpi(true);
    try {
      await visitControlEnrichmentService.addEpiDelivery(
        visitId,
        {
          employeeId: employee?.id,
          epiItemDescription: epiDraft.epiItemDescription,
          quantity: epiDraft.quantity || 1,
          employeeConfirmed: epiDraft.employeeConfirmed,
          notes: epiDraft.notes || undefined,
        },
        photo,
      );
      setEpiDraft({ epiItemDescription: '', quantity: 1, employeeConfirmed: true, notes: '' });
      toast.success('Entrega de EPI registrada.');
      await loadBundle(visitId);
    } catch (err) {
      console.error(err);
      toast.error('Falha ao registrar entrega de EPI.');
    } finally {
      setSavingEpi(false);
    }
  };

  /* ---------------- Remanejamento ---------------- */
  const openRemanejamento = () => {
    if (!employee) return;
    setRemanejamentoForm({
      motivo: 'TRAINING_PENDING',
      destinationWorkstationId: '',
      coverageEmployeeId: '',
      observacao: '',
    });
    setRemanejamentoOpen(true);
  };

  const submitRemanejamento = async () => {
    if (!employee) return;
    setSavingRemanejamento(true);
    try {
      await remanejamentoApprovalService.request({
        employeeId: employee.id,
        tipo: 'TRANSFERENCIA_POSTO_TRABALHO',
        motivo: remanejamentoForm.motivo,
        dataRemanejamento: format(new Date(), 'yyyy-MM-dd'),
        originWorkstationId: employee.workPostId ?? workPostId ?? null,
        destinationWorkstationId: remanejamentoForm.destinationWorkstationId || null,
        coverageEmployeeId: remanejamentoForm.coverageEmployeeId || null,
        observacao: remanejamentoForm.observacao || null,
        visitControlId: visitId,
      });
      toast.success(
        'Solicitação enviada ao Gestor Operacional. Você será notificado da decisão.',
      );
      setRemanejamentoOpen(false);
    } catch (err: any) {
      console.error(err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Falha ao solicitar remanejamento.';
      toast.error(msg);
    } finally {
      setSavingRemanejamento(false);
    }
  };

  /* ---------------- Render helpers ---------------- */
  const severityVariant = (s: VisitIssueSeverity) => {
    switch (s) {
      case 'CRITICAL':
        return 'destructive';
      case 'HIGH':
        return 'destructive';
      case 'MEDIUM':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const assetStatusVariant = (s: VisitAssetStatus) => {
    switch (s) {
      case 'MISSING':
        return 'destructive';
      case 'DAMAGED':
        return 'destructive';
      case 'NEEDS_MAINTENANCE':
        return 'default';
      default:
        return 'secondary';
    }
  };

  /* ---------------- Render ---------------- */
  return (
    <div className="min-h-screen bg-muted/30 px-3 py-4 sm:px-6">
      <div className="mx-auto w-full max-w-2xl space-y-4">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Nova Visita</h1>
            <p className="text-xs text-muted-foreground">
              {format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <X className="mr-1 h-4 w-4" /> Sair
          </Button>
        </header>

        {/* Setup */}
        {!visitId && (
          <>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin className="h-4 w-4" />
                  Posto de Trabalho
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={workPostId} onValueChange={setWorkPostId}>
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        loadingPosts ? 'Carregando...' : 'Selecione o posto sendo visitado'
                      }
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <UserIcon className="h-4 w-4" />
                  Funcionário no Posto
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  className="w-full"
                  size="lg"
                  onClick={openScanner}
                  disabled={identifying}
                >
                  <QrCode className="mr-2 h-5 w-5" />
                  Escanear QR Code do Crachá
                </Button>

                <Separator />

                <div className="space-y-2">
                  <Label className="text-sm">Identificação manual</Label>
                  <div className="flex gap-2">
                    <Select
                      value={manualMode}
                      onValueChange={(v) => setManualMode(v as ManualMode)}
                    >
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
                      onChange={(e) => setManualValue(e.target.value)}
                      placeholder={manualMode === 'CPF' ? '000.000.000-00' : 'Matrícula'}
                      inputMode={manualMode === 'CPF' ? 'numeric' : 'text'}
                    />
                  </div>
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={handleManualSubmit}
                    disabled={identifying}
                  >
                    {identifying ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Identificando...
                      </>
                    ) : (
                      'Identificar manualmente'
                    )}
                  </Button>
                </div>

                {employee && (
                  <div className="mt-3 rounded-lg border bg-card p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold">{employee.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {employee.positionName || '—'} ·{' '}
                          {employee.workPostName || 'Sem posto alocado'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          CPF: {employee.cpf || '—'} · Mat.: {employee.registrationNumber || '—'}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {employee.matchedBy === 'QR_TOKEN' && 'via QR'}
                        {employee.matchedBy === 'CPF' && 'via CPF'}
                        {employee.matchedBy === 'MATRICULA' && 'via Matrícula'}
                      </Badge>
                    </div>
                    {employee.hasPendingTraining && (
                      <div className="mt-2 flex items-center gap-1 rounded bg-amber-50 px-2 py-1 text-xs text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                        <AlertTriangle className="h-3 w-3" />
                        Funcionário possui treinamento pendente. Considere solicitar
                        remanejamento.
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Button
              className="w-full"
              size="lg"
              onClick={startVisit}
              disabled={!workPostId || !employee || creatingVisit}
            >
              {creatingVisit ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Iniciando...
                </>
              ) : (
                <>
                  <ClipboardList className="mr-2 h-4 w-4" />
                  Iniciar visita
                </>
              )}
            </Button>
          </>
        )}

        {/* Visita em andamento */}
        {visitId && (
          <>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                  <span className="flex items-center gap-2">
                    <ClipboardList className="h-4 w-4" />
                    Visita em andamento
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => loadBundle(visitId)}
                    disabled={loadingBundle}
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${loadingBundle ? 'animate-spin' : ''}`}
                    />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Posto: </span>
                  <span className="font-medium">{selectedPost?.name || '—'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Funcionário: </span>
                  <span className="font-medium">{employee?.name || '—'}</span>
                </div>
                {employee?.hasPendingTraining && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={openRemanejamento}
                  >
                    <ShieldCheck className="mr-1 h-4 w-4" />
                    Solicitar remanejamento ao Gestor
                  </Button>
                )}
              </CardContent>
            </Card>

            <Tabs defaultValue="ata" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="ata" className="text-xs">
                  Ata
                </TabsTrigger>
                <TabsTrigger value="fotos" className="text-xs">
                  Fotos
                </TabsTrigger>
                <TabsTrigger value="problemas" className="text-xs">
                  Problemas
                </TabsTrigger>
                <TabsTrigger value="ativos" className="text-xs">
                  Ativos
                </TabsTrigger>
                <TabsTrigger value="epi" className="text-xs">
                  EPI
                </TabsTrigger>
              </TabsList>

              {/* ATA */}
              <TabsContent value="ata">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <FileText className="h-4 w-4" /> Ata da visita
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-xs">Constatações *</Label>
                      <Textarea
                        rows={6}
                        value={findings}
                        onChange={(e) => setFindings(e.target.value)}
                        placeholder="Descreva tudo o que foi encontrado: condições do posto, comportamento da equipe, eventos relevantes..."
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Observações adicionais</Label>
                      <Textarea
                        rows={3}
                        value={observations}
                        onChange={(e) => setObservations(e.target.value)}
                        placeholder="Detalhes complementares..."
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* FOTOS */}
              <TabsContent value="fotos">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Camera className="h-4 w-4" /> Fotos da visita
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <Select
                        value={photoType}
                        onValueChange={(v) => setPhotoType(v as VisitPhotoType)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(PHOTO_TYPE_LABEL) as VisitPhotoType[]).map((t) => (
                            <SelectItem key={t} value={t}>
                              {PHOTO_TYPE_LABEL[t]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        value={photoCaption}
                        onChange={(e) => setPhotoCaption(e.target.value)}
                        placeholder="Legenda (opcional)"
                      />
                    </div>
                    <label className="block">
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={onPickPhoto}
                        disabled={uploadingPhoto}
                      />
                      <Button
                        type="button"
                        className="w-full"
                        size="lg"
                        disabled={uploadingPhoto}
                        asChild
                      >
                        <span>
                          {uploadingPhoto ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Enviando...
                            </>
                          ) : (
                            <>
                              <Camera className="mr-2 h-4 w-4" />
                              Tirar / Escolher foto
                            </>
                          )}
                        </span>
                      </Button>
                    </label>

                    <div className="grid grid-cols-3 gap-2">
                      {(bundle?.photos ?? []).map((p) => (
                        <div key={p.id} className="overflow-hidden rounded border bg-card">
                          <img
                            src={p.fileUrl}
                            alt={p.caption || PHOTO_TYPE_LABEL[p.photoType]}
                            className="aspect-square w-full object-cover"
                          />
                          <div className="px-1 py-0.5 text-[10px] text-muted-foreground">
                            {PHOTO_TYPE_LABEL[p.photoType]}
                          </div>
                        </div>
                      ))}
                      {(bundle?.photos ?? []).length === 0 && (
                        <p className="col-span-3 text-center text-xs text-muted-foreground">
                          Nenhuma foto registrada ainda.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* PROBLEMAS */}
              <TabsContent value="problemas">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <AlertTriangle className="h-4 w-4" /> Problemas reportados
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <Select
                        value={issueDraft.category}
                        onValueChange={(v) =>
                          setIssueDraft({ ...issueDraft, category: v as VisitIssueCategory })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(ISSUE_CATEGORY_LABEL) as VisitIssueCategory[]).map(
                            (c) => (
                              <SelectItem key={c} value={c}>
                                {ISSUE_CATEGORY_LABEL[c]}
                              </SelectItem>
                            ),
                          )}
                        </SelectContent>
                      </Select>
                      <Select
                        value={issueDraft.severity}
                        onValueChange={(v) =>
                          setIssueDraft({ ...issueDraft, severity: v as VisitIssueSeverity })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(ISSUE_SEVERITY_LABEL) as VisitIssueSeverity[]).map(
                            (s) => (
                              <SelectItem key={s} value={s}>
                                {ISSUE_SEVERITY_LABEL[s]}
                              </SelectItem>
                            ),
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <Textarea
                      rows={3}
                      value={issueDraft.description}
                      onChange={(e) =>
                        setIssueDraft({ ...issueDraft, description: e.target.value })
                      }
                      placeholder="O que o funcionário relatou? Que dificuldade foi constatada?"
                    />
                    <Button onClick={addIssue} disabled={savingIssue} className="w-full">
                      {savingIssue ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        'Registrar problema'
                      )}
                    </Button>

                    <div className="space-y-2">
                      {(bundle?.issues ?? []).map((i) => (
                        <div key={i.id} className="rounded border bg-card p-2 text-sm">
                          <div className="mb-1 flex items-center justify-between">
                            <span className="font-medium">
                              {ISSUE_CATEGORY_LABEL[i.category]}
                            </span>
                            <Badge variant={severityVariant(i.severity)} className="text-[10px]">
                              {ISSUE_SEVERITY_LABEL[i.severity]}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground">{i.description}</p>
                        </div>
                      ))}
                      {(bundle?.issues ?? []).length === 0 && (
                        <p className="text-center text-xs text-muted-foreground">
                          Nenhum problema reportado.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ATIVOS */}
              <TabsContent value="ativos">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Truck className="h-4 w-4" /> Equipamentos / Veículos no posto
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <Select
                        value={assetDraft.assetType}
                        onValueChange={(v) =>
                          setAssetDraft({ ...assetDraft, assetType: v as VisitAssetType })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(ASSET_TYPE_LABEL) as VisitAssetType[]).map((t) => (
                            <SelectItem key={t} value={t}>
                              {ASSET_TYPE_LABEL[t]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={assetDraft.status}
                        onValueChange={(v) =>
                          setAssetDraft({ ...assetDraft, status: v as VisitAssetStatus })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(ASSET_STATUS_LABEL) as VisitAssetStatus[]).map((s) => (
                            <SelectItem key={s} value={s}>
                              {ASSET_STATUS_LABEL[s]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Input
                      value={assetDraft.description}
                      onChange={(e) =>
                        setAssetDraft({ ...assetDraft, description: e.target.value })
                      }
                      placeholder="Descrição (ex: Rádio HT, Viatura Placa ABC-1234)"
                    />
                    <Input
                      value={assetDraft.notes}
                      onChange={(e) => setAssetDraft({ ...assetDraft, notes: e.target.value })}
                      placeholder="Observações (opcional)"
                    />
                    <Button onClick={addAsset} disabled={savingAsset} className="w-full">
                      {savingAsset ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        'Registrar no inventário'
                      )}
                    </Button>

                    <div className="space-y-2">
                      {(bundle?.postAssets ?? []).map((a) => (
                        <div key={a.id} className="rounded border bg-card p-2 text-sm">
                          <div className="mb-1 flex items-center justify-between">
                            <span className="font-medium">{a.description}</span>
                            <Badge variant={assetStatusVariant(a.status)} className="text-[10px]">
                              {ASSET_STATUS_LABEL[a.status]}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {ASSET_TYPE_LABEL[a.assetType]}
                            {a.notes ? ` · ${a.notes}` : ''}
                          </p>
                        </div>
                      ))}
                      {(bundle?.postAssets ?? []).length === 0 && (
                        <p className="text-center text-xs text-muted-foreground">
                          Nenhum item registrado.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* EPI */}
              <TabsContent value="epi">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <ShieldCheck className="h-4 w-4" /> Entrega de EPI
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Input
                      value={epiDraft.epiItemDescription}
                      onChange={(e) =>
                        setEpiDraft({ ...epiDraft, epiItemDescription: e.target.value })
                      }
                      placeholder="Item entregue (ex: Capacete, Luva, Bota)"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Quantidade</Label>
                        <Input
                          type="number"
                          min={1}
                          value={epiDraft.quantity}
                          onChange={(e) =>
                            setEpiDraft({
                              ...epiDraft,
                              quantity: Number(e.target.value) || 1,
                            })
                          }
                        />
                      </div>
                      <div className="flex items-end">
                        <label className="flex w-full items-center gap-2 rounded border p-2 text-sm">
                          <input
                            type="checkbox"
                            checked={epiDraft.employeeConfirmed}
                            onChange={(e) =>
                              setEpiDraft({
                                ...epiDraft,
                                employeeConfirmed: e.target.checked,
                              })
                            }
                          />
                          <span>Confirmada pelo funcionário</span>
                        </label>
                      </div>
                    </div>
                    <Input
                      value={epiDraft.notes}
                      onChange={(e) => setEpiDraft({ ...epiDraft, notes: e.target.value })}
                      placeholder="Observações (opcional)"
                    />

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => submitEpi()}
                        disabled={savingEpi}
                      >
                        Registrar sem foto
                      </Button>
                      <label className="block">
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={onPickEpiPhoto}
                          disabled={savingEpi}
                        />
                        <Button type="button" disabled={savingEpi} className="w-full" asChild>
                          <span>
                            <Camera className="mr-2 h-4 w-4" />
                            Registrar com foto
                          </span>
                        </Button>
                      </label>
                    </div>

                    <div className="space-y-2">
                      {(bundle?.epiDeliveries ?? []).map((d) => (
                        <div
                          key={d.id}
                          className="flex items-center gap-3 rounded border bg-card p-2 text-sm"
                        >
                          {d.photoUrl ? (
                            <img
                              src={d.photoUrl}
                              alt={d.epiItemDescription}
                              className="h-12 w-12 rounded object-cover"
                            />
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded bg-muted text-muted-foreground">
                              <ShieldCheck className="h-5 w-5" />
                            </div>
                          )}
                          <div className="flex-1">
                            <p className="font-medium">
                              {d.epiItemDescription}{' '}
                              <span className="text-xs text-muted-foreground">
                                ×{d.quantity}
                              </span>
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {d.employeeName || 'Funcionário'} ·{' '}
                              {d.employeeConfirmed ? 'Confirmado' : 'Pendente confirmação'}
                            </p>
                          </div>
                        </div>
                      ))}
                      {(bundle?.epiDeliveries ?? []).length === 0 && (
                        <p className="text-center text-xs text-muted-foreground">
                          Nenhuma entrega registrada.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <Button
              size="lg"
              className="w-full"
              onClick={finalizeVisit}
              disabled={finalizingVisit}
            >
              {finalizingVisit ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Finalizando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Finalizar visita
                </>
              )}
            </Button>
          </>
        )}
      </div>

      {/* Scanner Modal */}
      <Dialog
        open={scannerOpen}
        onOpenChange={(o) => {
          if (o === false) closeScanner();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Escanear QR Code</DialogTitle>
          </DialogHeader>
          <div id="qr-supervisor-visit" className="w-full" />
          <DialogFooter>
            <Button variant="outline" onClick={closeScanner}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remanejamento Modal */}
      <Dialog open={remanejamentoOpen} onOpenChange={setRemanejamentoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar Remanejamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Motivo</Label>
              <Select
                value={remanejamentoForm.motivo}
                onValueChange={(v) =>
                  setRemanejamentoForm({
                    ...remanejamentoForm,
                    motivo: v as RemanejamentoMotivo,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(MOTIVO_LABEL) as RemanejamentoMotivo[]).map((m) => (
                    <SelectItem key={m} value={m}>
                      {MOTIVO_LABEL[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Posto de destino (opcional)</Label>
              <Select
                value={remanejamentoForm.destinationWorkstationId}
                onValueChange={(v) =>
                  setRemanejamentoForm({ ...remanejamentoForm, destinationWorkstationId: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione (opcional)" />
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
            <div>
              <Label className="text-xs">Observação</Label>
              <Textarea
                rows={3}
                value={remanejamentoForm.observacao}
                onChange={(e) =>
                  setRemanejamentoForm({ ...remanejamentoForm, observacao: e.target.value })
                }
                placeholder="Justificativa para o Gestor Operacional"
              />
            </div>
          </div>
          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setRemanejamentoOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={submitRemanejamento} disabled={savingRemanejamento}>
              {savingRemanejamento ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Enviar para aprovação'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SupervisorNovaVisita;
