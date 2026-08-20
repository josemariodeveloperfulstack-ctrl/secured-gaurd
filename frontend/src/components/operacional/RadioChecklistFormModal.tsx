import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Radio, 
  CheckCircle2, 
  XCircle, 
  CheckSquare, 
  Square, 
  RotateCcw, 
  ShieldCheck, 
  Zap, 
  Volume2, 
  Headphones, 
  PenTool, 
  Eraser, 
  Save, 
  Loader2, 
  User, 
  MapPin, 
  Calendar, 
  Clock, 
  Hash, 
  AlertTriangle 
} from 'lucide-react';
import { RadioChecklist, radioChecklistService } from '@/services/radioChecklistService';
import departmentService, { Department, filterCompanyDepartments } from '@/services/departmentService';
import api from '@/lib/axios';

interface RadioChecklistFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  initialData?: RadioChecklist | null;
}

export const RadioChecklistFormModal: React.FC<RadioChecklistFormModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
  initialData,
}) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  // Listas para autocompletes e sugestões
  const [funcionarios, setFuncionarios] = useState<any[]>([]);
  const [postos, setPostos] = useState<any[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  // Estados dos campos do formulário
  const [movementType, setMovementType] = useState<'RETIRADA' | 'DEVOLUCAO'>('RETIRADA');
  const [checklistDate, setChecklistDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [checklistTime, setChecklistTime] = useState<string>(
    new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  );
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [vigilanteName, setVigilanteName] = useState<string>('');
  const [vigilanteRegistration, setVigilanteRegistration] = useState<string>('');
  const [departmentName, setDepartmentName] = useState<string>(''); // Setor de Trabalho
  const [selectedWorkPostId, setSelectedWorkPostId] = useState<string>('');
  const [workPostName, setWorkPostName] = useState<string>(''); // Posto de Trabalho (Portaria 24h, etc)
  const [radioAssetId, setRadioAssetId] = useState<string>('');
  const [radioSerialNumber, setRadioSerialNumber] = useState<string>('');

  // 1. Inspeção Física
  const [carcacaExterna, setCarcacaExterna] = useState<boolean>(true);
  const [antena, setAntena] = useState<boolean>(true);
  const [clipCinto, setClipCinto] = useState<boolean>(true);
  const [conectorAcessorios, setConectorAcessorios] = useState<boolean>(true);

  // 2. Bateria
  const [encaixeBateria, setEncaixeBateria] = useState<boolean>(true);
  const [nivelCarga, setNivelCarga] = useState<boolean>(true);
  const [contatosCarga, setContatosCarga] = useState<boolean>(true);

  // 3. Teste Operacional
  const [botaoVolume, setBotaoVolume] = useState<boolean>(true);
  const [seletorCanais, setSeletorCanais] = useState<boolean>(true);
  const [botaoPtt, setBotaoPtt] = useState<boolean>(true);
  const [testeComunicacaoPratica, setTesteComunicacaoPratica] = useState<boolean>(true);

  // 4. Acessórios
  const [foneOuvidoLapela, setFoneOuvidoLapela] = useState<boolean>(true);
  const [carregadorMesaFonte, setCarregadorMesaFonte] = useState<boolean>(true);

  // Observações e Supervisor / Gestor Operacional
  const [observations, setObservations] = useState<string>('');
  const [supervisorName, setSupervisorName] = useState<string>('');

  // Assinatura do Supervisor ou Gestor Operacional
  const supervisorCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawingSupervisor, setIsDrawingSupervisor] = useState(false);
  const [hasSupervisorSignature, setHasSupervisorSignature] = useState(false);

  useEffect(() => {
    if (open) {
      // Carregar lista de funcionários ativos
      api.get('/api/employees')
        .then((res) => {
          const list = Array.isArray(res.data) ? res.data : (res.data?.content || []);
          setFuncionarios(list);
        })
        .catch(() => setFuncionarios([]));

      // Carregar postos de trabalho
      api.get('/api/work-posts/active')
        .then((res) => setPostos(Array.isArray(res.data) ? res.data : []))
        .catch(() => {
          api.get('/api/work-posts')
            .then((res) => setPostos(Array.isArray(res.data) ? res.data : []))
            .catch(() => setPostos([]));
        });

      // Carregar setores de trabalho (departamentos) da base de dados
      departmentService.listActive()
        .then((list) => setDepartments(filterCompanyDepartments(list)))
        .catch(() => setDepartments([]));

      if (initialData) {
        setMovementType(initialData.movementType || 'RETIRADA');
        setChecklistDate(initialData.checklistDate || new Date().toISOString().split('T')[0]);
        setChecklistTime(initialData.checklistTime ? initialData.checklistTime.substring(0, 5) : '');
        setVigilanteName(initialData.vigilanteName || '');
        setVigilanteRegistration(initialData.vigilanteRegistration || '');
        
        const rawWp = initialData.workPostName || '';
        if (rawWp.includes(' - ')) {
          const parts = rawWp.split(' - ');
          setDepartmentName(parts[0].trim());
          setWorkPostName(parts.slice(1).join(' - ').trim());
        } else {
          setWorkPostName(rawWp);
        }

        setRadioAssetId(initialData.radioAssetId || '');
        setRadioSerialNumber(initialData.radioSerialNumber || '');

        setCarcacaExterna(initialData.carcacaExterna ?? true);
        setAntena(initialData.antena ?? true);
        setClipCinto(initialData.clipCinto ?? true);
        setConectorAcessorios(initialData.conectorAcessorios ?? true);

        setEncaixeBateria(initialData.encaixeBateria ?? true);
        setNivelCarga(initialData.nivelCarga ?? true);
        setContatosCarga(initialData.contatosCarga ?? true);

        setBotaoVolume(initialData.botaoVolume ?? true);
        setSeletorCanais(initialData.seletorCanais ?? true);
        setBotaoPtt(initialData.botaoPtt ?? true);
        setTesteComunicacaoPratica(initialData.testeComunicacaoPratica ?? true);

        setFoneOuvidoLapela(initialData.foneOuvidoLapela ?? true);
        setCarregadorMesaFonte(initialData.carregadorMesaFonte ?? true);

        setObservations(initialData.observations || '');
        setSupervisorName(initialData.almoxarifeName || '');
      } else {
        // Reset padrão
        setMovementType('RETIRADA');
        setChecklistDate(new Date().toISOString().split('T')[0]);
        setChecklistTime(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
        setSelectedEmployeeId('');
        setVigilanteName('');
        setVigilanteRegistration('');
        setDepartmentName('');
        setSelectedWorkPostId('');
        setWorkPostName('');
        setRadioAssetId('');
        setRadioSerialNumber('');
        setAllChecklist(true);
        setObservations('');
        setSupervisorName('');
        clearCanvas(supervisorCanvasRef, setHasSupervisorSignature);
      }
    }
  }, [open, initialData]);

  const handleSelectEmployee = async (empId: string) => {
    setSelectedEmployeeId(empId);
    const emp = funcionarios.find((f) => String(f.id) === empId);
    if (emp) {
      setVigilanteName(emp.name);
      setVigilanteRegistration(emp.registrationNumber || (emp as any).registration || emp.cpf || '');

      let depName = emp.departmentName || (typeof (emp as any).department === 'string' ? (emp as any).department : (emp as any).department?.name) || emp.unitName || '';
      let postName = emp.workPostName || (typeof (emp as any).workPost === 'string' ? (emp as any).workPost : (emp as any).workPost?.name) || '';

      if (depName) setDepartmentName(depName);
      if (postName) setWorkPostName(postName);
      if (emp.workPostId || (emp as any).workPost?.id) {
        setSelectedWorkPostId(String(emp.workPostId || (emp as any).workPost?.id));
      }

      if (!postName || !depName) {
        try {
          const full = await employeeService.getEmployeeById(empId);
          if (full) {
            const fullPost = full.workPostName || full.workPost?.name;
            const fullDep = full.departmentName || full.department?.name || full.unit?.name;
            if (fullPost && !postName) setWorkPostName(fullPost);
            if (fullDep && !depName) setDepartmentName(fullDep);
            if (fullPost && !departmentName) setDepartmentName(fullPost);
            if (full.workPostId || full.workPost?.id) setSelectedWorkPostId(String(full.workPostId || full.workPost?.id));
          }
        } catch {}
      }
    }
  };

  const handleSelectWorkPost = (wpId: string) => {
    setSelectedWorkPostId(wpId);
    const wp = postos.find((p) => String(p.id) === wpId);
    if (wp) {
      setWorkPostName(wp.name);
    }
  };

  const setAllChecklist = (val: boolean) => {
    setCarcacaExterna(val);
    setAntena(val);
    setClipCinto(val);
    setConectorAcessorios(val);
    setEncaixeBateria(val);
    setNivelCarga(val);
    setContatosCarga(val);
    setBotaoVolume(val);
    setSeletorCanais(val);
    setBotaoPtt(val);
    setTesteComunicacaoPratica(val);
    setFoneOuvidoLapela(val);
    setCarregadorMesaFonte(val);
  };

  // Canvas de Assinatura Digital Touch/Mouse
  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    canvasRef: React.RefObject<HTMLCanvasElement>,
    setIsDrawing: (val: boolean) => void,
    setHasSig: (val: boolean) => void
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasSig(true);
    const { x, y } = getCoordinates(e, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    canvasRef: React.RefObject<HTMLCanvasElement>,
    isDrawing: boolean
  ) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e, canvas);
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  const stopDrawing = (
    canvasRef: React.RefObject<HTMLCanvasElement>,
    setIsDrawing: (val: boolean) => void
  ) => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.closePath();
  };

  const clearCanvas = (canvasRef: React.RefObject<HTMLCanvasElement>, setHasSig: (val: boolean) => void) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSig(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!vigilanteName.trim()) {
      toast({
        title: 'Campo Obrigatório',
        description: 'Informe o nome do vigilante.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);

      const supervisorSig = supervisorCanvasRef.current?.toDataURL('image/png') || initialData?.almoxarifeSignatureBase64 || initialData?.vigilanteSignatureBase64;
      const fullLocation = departmentName
        ? (workPostName && !workPostName.toLowerCase().startsWith(departmentName.toLowerCase()) ? `${departmentName} - ${workPostName}` : (workPostName || departmentName))
        : workPostName;

      const payload: RadioChecklist = {
        documentCode: 'CK-ALMOX-HT',
        documentVersion: '02',
        movementType,
        checklistDate,
        checklistTime: checklistTime ? `${checklistTime}:00` : undefined,
        vigilanteName: vigilanteName.trim(),
        vigilanteRegistration: vigilanteRegistration.trim() || undefined,
        workPostName: fullLocation.trim() || undefined,
        radioAssetId: radioAssetId.trim() || undefined,
        radioSerialNumber: radioSerialNumber.trim() || undefined,

        carcacaExterna,
        antena,
        clipCinto,
        conectorAcessorios,
        encaixeBateria,
        nivelCarga,
        contatosCarga,
        botaoVolume,
        seletorCanais,
        botaoPtt,
        testeComunicacaoPratica,
        foneOuvidoLapela,
        carregadorMesaFonte,

        observations: observations.trim() || undefined,
        almoxarifeName: supervisorName.trim() || undefined,
        almoxarifeSignatureBase64: hasSupervisorSignature ? supervisorSig : (initialData?.almoxarifeSignatureBase64 || initialData?.vigilanteSignatureBase64),
        vigilanteSignatureBase64: hasSupervisorSignature ? supervisorSig : (initialData?.vigilanteSignatureBase64 || initialData?.almoxarifeSignatureBase64),

        employeeId: selectedEmployeeId ? Number(selectedEmployeeId) : undefined,
        workPostId: selectedWorkPostId ? Number(selectedWorkPostId) : undefined,
      };

      if (initialData?.id) {
        await radioChecklistService.update(initialData.id, payload);
        toast({
          title: 'Sucesso',
          description: 'Checklist de radiocomunicação atualizado com sucesso!',
        });
      } else {
        await radioChecklistService.create(payload);
        toast({
          title: 'Sucesso',
          description: 'Checklist de radiocomunicação registrado com sucesso!',
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao salvar checklist de rádio:', error);
      toast({
        title: 'Erro ao Salvar',
        description: error?.response?.data?.message || 'Não foi possível salvar o checklist.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Renderizador de Item Touch-Friendly
  const renderTouchItem = (
    title: string,
    description: string,
    checked: boolean,
    onToggle: () => void
  ) => (
    <div
      onClick={onToggle}
      className={`flex items-start justify-between p-3 sm:p-3.5 rounded-lg border transition-all duration-200 cursor-pointer select-none ${
        checked
          ? 'bg-emerald-950/30 border-emerald-500/50 hover:bg-emerald-900/40'
          : 'bg-rose-950/20 border-rose-500/40 hover:bg-rose-900/30'
      }`}
    >
      <div className="space-y-0.5 pr-2">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-white">{title}</span>
        </div>
        <p className="text-xs text-gray-400 leading-snug">{description}</p>
      </div>

      <div className="flex-shrink-0 pt-0.5">
        {checked ? (
          <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 text-[11px] py-1 px-2.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Conforme
          </Badge>
        ) : (
          <Badge className="bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1 text-[11px] py-1 px-2.5">
            <XCircle className="w-3.5 h-3.5" />
            Com Avaria
          </Badge>
        )}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[96vw] max-h-[92vh] overflow-y-auto bg-slate-900 border-slate-700 text-white p-4 sm:p-6 rounded-xl">
        <DialogHeader className="border-b border-slate-800 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <DialogTitle className="text-lg sm:text-xl font-bold text-seguranca-yellow flex items-center gap-2">
                <Radio className="w-5 h-5 text-seguranca-yellow flex-shrink-0" />
                <span>{initialData ? 'Editar Checklist de Radiocomunicação (HT)' : 'Novo Checklist de Radiocomunicação (HT)'}</span>
              </DialogTitle>
              <p className="text-xs text-gray-400 mt-0.5">
                Código: <strong className="text-gray-300">CK-ALMOX-HT</strong> | Versão: <strong className="text-gray-300">02</strong>
              </p>
            </div>

            {/* Seletor Rápido de Tipo de Movimentação */}
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setMovementType('RETIRADA')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  movementType === 'RETIRADA'
                    ? 'bg-seguranca-yellow text-slate-950 shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                📥 Retirada (Início Turno)
              </button>
              <button
                type="button"
                onClick={() => setMovementType('DEVOLUCAO')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  movementType === 'DEVOLUCAO'
                    ? 'bg-sky-500 text-white shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                📤 Devolução (Fim Turno)
              </button>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-3">
          {/* Seção 1: Dados da Retirada / Entrega */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 sm:p-4 space-y-4">
            <h3 className="text-xs sm:text-sm font-semibold text-seguranca-yellow uppercase tracking-wider flex items-center gap-2">
              <User className="w-4 h-4" />
              Dados da Retirada / Entrega
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              {/* Data */}
              <div className="space-y-1">
                <Label className="text-xs text-gray-300 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-seguranca-yellow" /> Data
                </Label>
                <Input
                  type="date"
                  value={checklistDate}
                  onChange={(e) => setChecklistDate(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-white text-sm h-9"
                  required
                />
              </div>

              {/* Hora */}
              <div className="space-y-1">
                <Label className="text-xs text-gray-300 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-seguranca-yellow" /> Hora
                </Label>
                <Input
                  type="time"
                  value={checklistTime}
                  onChange={(e) => setChecklistTime(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-white text-sm h-9"
                />
              </div>

              {/* Vigilante */}
              <div className="space-y-1 sm:col-span-2 md:col-span-1">
                <Label className="text-xs text-gray-300 flex items-center gap-1">
                  <User className="w-3 h-3 text-seguranca-yellow" /> Nome do Vigilante
                </Label>
                <div className="space-y-1">
                  {funcionarios.length > 0 ? (
                    <Select value={selectedEmployeeId} onValueChange={handleSelectEmployee}>
                      <SelectTrigger className="bg-slate-900 border-slate-700 text-white text-sm h-9">
                        <SelectValue placeholder="Selecione o funcionário..." />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-700 text-white">
                        {funcionarios.map((f) => (
                          <SelectItem key={f.id} value={String(f.id)}>
                            {f.name} {f.registration ? `(RE: ${f.registration})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : null}
                  <Input
                    value={vigilanteName}
                    onChange={(e) => setVigilanteName(e.target.value)}
                    placeholder="Ou digite o nome completo do vigilante..."
                    className="bg-slate-900 border-slate-700 text-white text-sm h-9"
                    required
                  />
                </div>
              </div>

              {/* Setor de Trabalho (Trazido da Base de Dados e preenchido do Funcionário) */}
              <div className="space-y-1 sm:col-span-2 md:col-span-1">
                <Label className="text-xs text-gray-300 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-seguranca-yellow" /> Setor de Trabalho
                </Label>
                <div className="space-y-1">
                  {departments.length > 0 ? (
                    <Select value={departmentName} onValueChange={setDepartmentName}>
                      <SelectTrigger className="bg-slate-900 border-slate-700 text-white text-sm h-9">
                        <SelectValue placeholder="Selecione o setor de trabalho..." />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-700 text-white">
                        {departments.map((d) => (
                          <SelectItem key={d.id} value={d.name}>
                            🏢 {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : null}
                  <Input
                    value={departmentName}
                    onChange={(e) => setDepartmentName(e.target.value)}
                    placeholder="Ou digite o setor de trabalho..."
                    className="bg-slate-900 border-slate-700 text-white text-sm h-9"
                  />
                </div>
              </div>

              {/* Posto de Trabalho (Ex: Portaria 24h, Guarita, etc) */}
              <div className="space-y-1 sm:col-span-2 md:col-span-1">
                <Label className="text-xs text-gray-300 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-seguranca-yellow" /> Posto de Trabalho
                </Label>
                <div className="space-y-1">
                  {postos.length > 0 ? (
                    <Select value={selectedWorkPostId} onValueChange={handleSelectWorkPost}>
                      <SelectTrigger className="bg-slate-900 border-slate-700 text-white text-sm h-9">
                        <SelectValue placeholder="Selecione o posto de trabalho..." />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-700 text-white">
                        {postos.map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            📍 {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : null}
                  <Input
                    value={workPostName}
                    onChange={(e) => setWorkPostName(e.target.value)}
                    placeholder="Ex: Portaria 24h, Guarita Central..."
                    className="bg-slate-900 border-slate-700 text-white text-sm h-9"
                  />
                </div>
              </div>

              {/* RE / Matrícula */}
              <div className="space-y-1">
                <Label className="text-xs text-gray-300">RE / Matrícula</Label>
                <Input
                  value={vigilanteRegistration}
                  onChange={(e) => setVigilanteRegistration(e.target.value)}
                  placeholder="Ex: 12345"
                  className="bg-slate-900 border-slate-700 text-white text-sm h-9"
                />
              </div>

              {/* ID / Patrimônio */}
              <div className="space-y-1">
                <Label className="text-xs text-gray-300 flex items-center gap-1">
                  <Hash className="w-3 h-3 text-seguranca-yellow" /> ID / Patrimônio do Rádio
                </Label>
                <Input
                  value={radioAssetId}
                  onChange={(e) => setRadioAssetId(e.target.value)}
                  placeholder="Ex: HT-01, PAT-2045"
                  className="bg-slate-900 border-slate-700 text-white text-sm h-9"
                />
              </div>

              {/* Nº de Série (S/N) */}
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs text-gray-300">Nº de Série (S/N)</Label>
                <Input
                  value={radioSerialNumber}
                  onChange={(e) => setRadioSerialNumber(e.target.value)}
                  placeholder="Ex: 846TXYZ9923"
                  className="bg-slate-900 border-slate-700 text-white text-sm h-9"
                />
              </div>
            </div>
          </div>

          {/* Barra de Ações Rápidas de Inspeção */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
            <span className="text-xs font-semibold text-gray-300">
              Ações Rápidas de Checklist:
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setAllChecklist(true)}
                className="text-xs h-8 bg-emerald-950/50 border-emerald-600/50 text-emerald-300 hover:bg-emerald-900"
              >
                <CheckSquare className="w-3.5 h-3.5 mr-1" />
                Marcar Todos Conformes
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setAllChecklist(false)}
                className="text-xs h-8 border-slate-700 text-gray-300 hover:bg-slate-800"
              >
                <Square className="w-3.5 h-3.5 mr-1" />
                Desmarcar Todos
              </Button>
            </div>
          </div>

          {/* 1. Inspeção Física e Estrutural (Visual) */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3.5 sm:p-4 space-y-3">
            <h4 className="text-xs sm:text-sm font-semibold text-seguranca-yellow flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-seguranca-yellow" />
              1. Inspeção Física e Estrutural (Visual)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {renderTouchItem(
                'Carcaça Externa',
                'Sem trincas, rachaduras ou marcas profundas de queda.',
                carcacaExterna,
                () => setCarcacaExterna(!carcacaExterna)
              )}
              {renderTouchItem(
                'Antena',
                'Rosqueada até o fim, reta e sem borracha protetora rasgada ou exposta.',
                antena,
                () => setAntena(!antena)
              )}
              {renderTouchItem(
                'Clip de Cinto',
                'Fixado firmemente na parte traseira, sem folgas e com mola com pressão.',
                clipCinto,
                () => setClipCinto(!clipCinto)
              )}
              {renderTouchItem(
                'Conector de Acessórios',
                'Tampa protetora lateral presente (proteção contra poeira/chuva).',
                conectorAcessorios,
                () => setConectorAcessorios(!conectorAcessorios)
              )}
            </div>
          </div>

          {/* 2. Alimentação e Bateria */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3.5 sm:p-4 space-y-3">
            <h4 className="text-xs sm:text-sm font-semibold text-seguranca-yellow flex items-center gap-2">
              <Zap className="w-4 h-4 text-seguranca-yellow" />
              2. Alimentação e Bateria
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {renderTouchItem(
                'Encaixe da Bateria',
                'Trava inferior/lateral funcionando, sem folga com o rádio.',
                encaixeBateria,
                () => setEncaixeBateria(!encaixeBateria)
              )}
              {renderTouchItem(
                'Nível de Carga',
                'Rádio liga normalmente e indica carga total (100%).',
                nivelCarga,
                () => setNivelCarga(!nivelCarga)
              )}
              {renderTouchItem(
                'Contatos de Carga',
                'Pinos dourados limpos, sem oxidação ou azedamento.',
                contatosCarga,
                () => setContatosCarga(!contatosCarga)
              )}
            </div>
          </div>

          {/* 3. Teste de Funcionamento Operacional (Áudio e Sinal) */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3.5 sm:p-4 space-y-3">
            <h4 className="text-xs sm:text-sm font-semibold text-seguranca-yellow flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-seguranca-yellow" />
              3. Teste de Funcionamento Operacional (Áudio e Sinal)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {renderTouchItem(
                'Botão de Volume / Liga-Desliga',
                'Gira suavemente, liga o aparelho e ajusta o som sem chiados.',
                botaoVolume,
                () => setBotaoVolume(!botaoVolume)
              )}
              {renderTouchItem(
                'Seletor de Canais',
                'Alterna os canais perfeitamente e emite o bipe/aviso de canal correto.',
                seletorCanais,
                () => setSeletorCanais(!seletorCanais)
              )}
              {renderTouchItem(
                'Botão PTT (Transmissão)',
                'Botão emborrachado macio; aciona LED vermelho instantaneamente ao pressionar.',
                botaoPtt,
                () => setBotaoPtt(!botaoPtt)
              )}
              {renderTouchItem(
                'Teste de Comunicação Prática',
                'Transmissão limpa para a base e recepção de áudio sem cortes ou abafado.',
                testeComunicacaoPratica,
                () => setTesteComunicacaoPratica(!testeComunicacaoPratica)
              )}
            </div>
          </div>

          {/* 4. Acessórios Adicionais */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3.5 sm:p-4 space-y-3">
            <h4 className="text-xs sm:text-sm font-semibold text-seguranca-yellow flex items-center gap-2">
              <Headphones className="w-4 h-4 text-seguranca-yellow" />
              4. Acessórios Adicionais (Se houver no posto)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {renderTouchItem(
                'Fone de Ouvido / Lapela',
                'Fios sem cortes, microfone transmitindo e áudio saindo com clareza.',
                foneOuvidoLapela,
                () => setFoneOuvidoLapela(!foneOuvidoLapela)
              )}
              {renderTouchItem(
                'Carregador de Mesa / Fonte',
                'Tomada sem pinos tortos e LED da base acende ao plugar.',
                carregadorMesaFonte,
                () => setCarregadorMesaFonte(!carregadorMesaFonte)
              )}
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-300 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              Observações / Avarias Detectadas (Opcional)
            </Label>
            <Textarea
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Descreva aqui se houve alguma avaria, arranhão ou problema identificado..."
              className="bg-slate-950 border-slate-700 text-white text-xs sm:text-sm min-h-[70px]"
            />
          </div>

          {/* Declaração de Conformidade */}
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200/90 text-xs leading-relaxed italic">
            "Declaro que o equipamento acima foi testado na minha presença e entregue em perfeitas condições de uso e conservação para o cumprimento do meu turno de trabalho."
          </div>

          {/* Assinatura Digital Touch (Somente Supervisor ou Gestor Operacional) */}
          <div className="pt-2">
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3 max-w-xl mx-auto">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-seguranca-yellow flex items-center gap-1.5">
                  <PenTool className="w-4 h-4 text-seguranca-yellow" />
                  Assinatura do Supervisor ou Gestor Operacional
                </Label>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => clearCanvas(supervisorCanvasRef, setHasSupervisorSignature)}
                  className="h-6 px-2 text-[11px] text-gray-400 hover:text-white"
                >
                  <Eraser className="w-3 h-3 mr-1" /> Limpar Assinatura
                </Button>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-gray-400">Nome do Supervisor / Gestor Operacional</Label>
                <Input
                  value={supervisorName}
                  onChange={(e) => setSupervisorName(e.target.value)}
                  placeholder="Nome do Supervisor ou Gestor Operacional..."
                  className="bg-slate-900 border-slate-700 text-white text-xs h-8"
                />
              </div>

              <div className="border border-slate-700 rounded-lg overflow-hidden bg-white touch-none">
                <canvas
                  ref={supervisorCanvasRef}
                  width={500}
                  height={120}
                  className="w-full h-[110px] cursor-crosshair"
                  onMouseDown={(e) => startDrawing(e, supervisorCanvasRef, setIsDrawingSupervisor, setHasSupervisorSignature)}
                  onMouseMove={(e) => draw(e, supervisorCanvasRef, isDrawingSupervisor)}
                  onMouseUp={() => stopDrawing(supervisorCanvasRef, setIsDrawingSupervisor)}
                  onMouseLeave={() => stopDrawing(supervisorCanvasRef, setIsDrawingSupervisor)}
                  onTouchStart={(e) => startDrawing(e, supervisorCanvasRef, setIsDrawingSupervisor, setHasSupervisorSignature)}
                  onTouchMove={(e) => draw(e, supervisorCanvasRef, isDrawingSupervisor)}
                  onTouchEnd={() => stopDrawing(supervisorCanvasRef, setIsDrawingSupervisor)}
                />
              </div>
              <p className="text-[11px] text-gray-400 text-center">
                {supervisorName ? `Assinatura de: ${supervisorName}` : 'Desenhe a assinatura acima com o dedo ou mouse'}
              </p>
            </div>
          </div>

          <DialogFooter className="pt-4 mt-6 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-slate-700 text-gray-300 hover:bg-slate-800 h-10 w-full sm:w-auto"
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-seguranca-yellow hover:bg-seguranca-yellow/90 text-slate-950 font-bold h-10 w-full sm:w-auto flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Salvando Checklist...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Salvar Checklist HT
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
