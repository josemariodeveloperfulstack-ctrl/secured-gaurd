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
  Car, 
  CheckCircle2, 
  XCircle, 
  CheckSquare, 
  Square, 
  PenTool, 
  Eraser, 
  Save, 
  Loader2, 
  User, 
  Calendar, 
  Clock, 
  Sun, 
  Moon, 
  Gauge, 
  ShieldCheck, 
  Lightbulb, 
  Wrench, 
  Briefcase, 
  AlertTriangle,
  Download
} from 'lucide-react';
import { VehicleChecklist, vehicleChecklistService } from '@/services/vehicleChecklistService';
import { EmployeeCombobox } from '@/components/ui/employee-combobox';
import api from '@/lib/axios';

interface VehicleChecklistFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  initialData?: VehicleChecklist | null;
}

export const VehicleChecklistFormModal: React.FC<VehicleChecklistFormModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
  initialData,
}) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  // Listas de apoio
  const [funcionarios, setFuncionarios] = useState<any[]>([]);
  const [veiculos, setVeiculos] = useState<any[]>([]);

  // Estados dos campos
  const [plate, setPlate] = useState<string>('');
  const [model, setModel] = useState<string>('');
  const [currentKm, setCurrentKm] = useState<string>('');
  const [checklistDate, setChecklistDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [checklistTime, setChecklistTime] = useState<string>(
    new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  );
  const [shift, setShift] = useState<'DIA' | 'NOITE'>('DIA');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [selectedSupervisorId, setSelectedSupervisorId] = useState<string>('');
  const [employeeName, setEmployeeName] = useState<string>('');
  const [employeeRegistration, setEmployeeRegistration] = useState<string>('');
  const [supervisorName, setSupervisorName] = useState<string>('');

  // 1. Inspeção Externa e Lataria
  const [dianteira, setDianteira] = useState<boolean>(true);
  const [laterais, setLaterais] = useState<boolean>(true);
  const [vidrosRetrovisores, setVidrosRetrovisores] = useState<boolean>(true);
  const [identificacaoVisual, setIdentificacaoVisual] = useState<boolean>(true);

  // 2. Iluminação e Sinalização Sonora
  const [faroisLanternas, setFaroisLanternas] = useState<boolean>(true);
  const [giroflexSirene, setGiroflexSirene] = useState<boolean>(true);
  const [buzina, setBuzina] = useState<boolean>(true);

  // 3. Mecânica Básica e Fluídos
  const [pneus, setPneus] = useState<boolean>(true);
  const [niveis, setNiveis] = useState<boolean>(true);
  const [painel, setPainel] = useState<boolean>(true);

  // 4. Kit de Bordo e Equipamentos
  const [documentacao, setDocumentacao] = useState<boolean>(true);
  const [ferramentasEmergencia, setFerramentasEmergencia] = useState<boolean>(true);
  const [extintorIncendio, setExtintorIncendio] = useState<boolean>(true);
  const [kitPrancheta, setKitPrancheta] = useState<boolean>(true);

  // Observações
  const [observations, setObservations] = useState<string>('');

  // Opções de Assinatura e Download de Guia
  const [signerRole, setSignerRole] = useState<'CONDUTOR' | 'SUPERVISOR'>('CONDUTOR');
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Assinatura Canvas Touch
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  const handleDownloadPdf = async () => {
    // Se já existe um ID (Modo Edição)
    if (initialData?.id) {
      try {
        setDownloadingPdf(true);
        const blob = await vehicleChecklistService.downloadPdf(initialData.id);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `guia-checklist-viatura-${initialData.id}-${checklistDate || 'doc'}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast({
          title: 'Sucesso',
          description: 'Guia em PDF gerada com sucesso!',
        });
      } catch (error) {
        console.error('Erro ao gerar guia PDF:', error);
        toast({
          title: 'Erro',
          description: 'Não foi possível gerar a guia em PDF.',
          variant: 'destructive',
        });
      } finally {
        setDownloadingPdf(false);
      }
      return;
    }

    // Se é Cadastro (Novo Checklist)
    if (!plate.trim()) {
      toast({
        title: 'Campo Obrigatório',
        description: 'Informe a placa do veículo para salvar e gerar a guia PDF.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setDownloadingPdf(true);
      const signatureSig = canvasRef.current?.toDataURL('image/png');

      const payload: VehicleChecklist = {
        plate: plate.trim().toUpperCase(),
        model: model.trim() || undefined,
        currentKm: currentKm ? Number(currentKm) : undefined,
        checklistDate,
        checklistTime,
        shift,
        supervisorName: supervisorName.trim() || undefined,
        employeeName: employeeName.trim() || undefined,
        employeeRegistration: employeeRegistration.trim() || undefined,

        dianteira,
        laterais,
        vidrosRetrovisores,
        identificacaoVisual,

        faroisLanternas,
        giroflexSirene,
        buzina,

        pneus,
        niveis,
        painel,

        documentacao,
        ferramentasEmergencia,
        extintorIncendio,
        kitPrancheta,

        observations: observations.trim() || undefined,
        signatureBase64: hasSignature ? signatureSig : undefined,

        employeeId: selectedEmployeeId ? Number(selectedEmployeeId) : undefined,
        vehicleId: selectedVehicleId ? Number(selectedVehicleId) : undefined,
      };

      const created = await vehicleChecklistService.create(payload);
      if (created.id) {
        const blob = await vehicleChecklistService.downloadPdf(created.id);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `guia-checklist-viatura-${created.id}-${checklistDate || 'doc'}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast({
          title: 'Sucesso',
          description: 'Checklist cadastrado e Guia PDF baixada com sucesso!',
        });
        onSuccess();
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Erro ao salvar e gerar PDF:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao cadastrar e gerar o PDF do checklist.',
        variant: 'destructive',
      });
    } finally {
      setDownloadingPdf(false);
    }
  };

  useEffect(() => {
    if (open) {
      // Carregar funcionários
      api.get('/api/employees')
        .then((res) => {
          const list = Array.isArray(res.data) ? res.data : (res.data?.content || []);
          setFuncionarios(list);
        })
        .catch(() => setFuncionarios([]));

      // Carregar veículos da frota com suporte a endpoints /api/vehicles e /api/frota/vehicles
      const fetchVeiculos = async () => {
        try {
          const res = await api.get('/api/vehicles');
          let list = Array.isArray(res.data) ? res.data : (res.data?.content || []);
          if (!list || list.length === 0) {
            const res2 = await api.get('/api/frota/vehicles');
            list = Array.isArray(res2.data) ? res2.data : (res2.data?.content || []);
          }
          setVeiculos(list || []);
        } catch {
          try {
            const res2 = await api.get('/api/frota/vehicles');
            const list = Array.isArray(res2.data) ? res2.data : (res2.data?.content || []);
            setVeiculos(list || []);
          } catch {
            setVeiculos([]);
          }
        }
      };
      fetchVeiculos();

      if (initialData) {
        setPlate(initialData.plate || '');
        setModel(initialData.model || '');
        setCurrentKm(initialData.currentKm ? String(initialData.currentKm) : '');
        setChecklistDate(initialData.checklistDate || new Date().toISOString().split('T')[0]);
        setChecklistTime(initialData.checklistTime ? initialData.checklistTime.substring(0, 5) : '');
        setShift(initialData.shift || 'DIA');
        setEmployeeName(initialData.employeeName || '');
        setEmployeeRegistration(initialData.employeeRegistration || '');
        setSupervisorName(initialData.supervisorName || '');

        setDianteira(initialData.dianteira ?? true);
        setLaterais(initialData.laterais ?? true);
        setVidrosRetrovisores(initialData.vidrosRetrovisores ?? true);
        setIdentificacaoVisual(initialData.identificacaoVisual ?? true);

        setFaroisLanternas(initialData.faroisLanternas ?? true);
        setGiroflexSirene(initialData.giroflexSirene ?? true);
        setBuzina(initialData.buzina ?? true);

        setPneus(initialData.pneus ?? true);
        setNiveis(initialData.niveis ?? true);
        setPainel(initialData.painel ?? true);

        setDocumentacao(initialData.documentacao ?? true);
        setFerramentasEmergencia(initialData.ferramentasEmergencia ?? true);
        setExtintorIncendio(initialData.extintorIncendio ?? true);
        setKitPrancheta(initialData.kitPrancheta ?? true);

        setObservations(initialData.observations || '');
      } else {
        setPlate('');
        setModel('');
        setCurrentKm('');
        setChecklistDate(new Date().toISOString().split('T')[0]);
        setChecklistTime(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
        setShift('DIA');
        setSelectedVehicleId('');
        setSelectedEmployeeId('');
        setSelectedSupervisorId('');
        setEmployeeName('');
        setEmployeeRegistration('');
        setSupervisorName('');
        setAllChecklist(true);
        setObservations('');
        clearCanvas();
      }
    }
  }, [open, initialData]);

  const handleSelectVehicle = (vehicleId: string) => {
    setSelectedVehicleId(vehicleId);
    const v = veiculos.find((item) => String(item.id) === vehicleId);
    if (v) {
      const plateVal = v.plate || v.placa || '';
      const modelVal = v.model || v.modelo || `${v.brand || v.marca || ''} ${v.model || v.modelo || ''}`.trim();
      const kmVal = v.currentMileage || v.currentKm || v.km || v.quilometragem || v.odometer || '';
      setPlate(plateVal);
      setModel(modelVal);
      if (kmVal) {
        setCurrentKm(String(kmVal));
      }
    }
  };

  const handleSelectEmployee = (empId: string) => {
    setSelectedEmployeeId(empId);
    const emp = funcionarios.find((f) => String(f.id) === empId);
    if (emp) {
      setEmployeeName(emp.name);
      setEmployeeRegistration(emp.registration || emp.cpf || '');
      if (!supervisorName) {
        setSupervisorName(emp.name);
      }
    }
  };

  const setAllChecklist = (val: boolean) => {
    setDianteira(val);
    setLaterais(val);
    setVidrosRetrovisores(val);
    setIdentificacaoVisual(val);
    setFaroisLanternas(val);
    setGiroflexSirene(val);
    setBuzina(val);
    setPneus(val);
    setNiveis(val);
    setPainel(val);
    setDocumentacao(val);
    setFerramentasEmergencia(val);
    setExtintorIncendio(val);
    setKitPrancheta(val);
  };

  // Canvas de Assinatura Digital Touch
  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
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

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasSignature(true);
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.closePath();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!plate.trim()) {
      toast({
        title: 'Campo Obrigatório',
        description: 'Informe a placa da viatura.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);

      const sigBase64 = canvasRef.current?.toDataURL('image/png') || initialData?.signatureBase64;

      const payload: VehicleChecklist = {
        plate: plate.toUpperCase().trim(),
        model: model.trim() || undefined,
        currentKm: currentKm ? Number(currentKm) : undefined,
        checklistDate,
        checklistTime: checklistTime ? `${checklistTime}:00` : undefined,
        shift,
        employeeName: employeeName.trim() || undefined,
        employeeRegistration: employeeRegistration.trim() || undefined,
        supervisorName: supervisorName.trim() || undefined,

        dianteira,
        laterais,
        vidrosRetrovisores,
        identificacaoVisual,
        faroisLanternas,
        giroflexSirene,
        buzina,
        pneus,
        niveis,
        painel,
        documentacao,
        ferramentasEmergencia,
        extintorIncendio,
        kitPrancheta,

        observations: observations.trim() || undefined,
        signatureBase64: hasSignature ? sigBase64 : initialData?.signatureBase64,

        employeeId: selectedEmployeeId ? Number(selectedEmployeeId) : undefined,
        vehicleId: selectedVehicleId ? Number(selectedVehicleId) : undefined,
      };

      if (initialData?.id) {
        await vehicleChecklistService.update(initialData.id, payload);
        toast({
          title: 'Sucesso',
          description: 'Checklist de viatura atualizado com sucesso!',
        });
      } else {
        await vehicleChecklistService.create(payload);
        toast({
          title: 'Sucesso',
          description: 'Checklist diário de viatura registrado com sucesso!',
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao salvar checklist de viatura:', error);
      toast({
        title: 'Erro ao Salvar',
        description: error?.response?.data?.message || 'Não foi possível salvar o checklist da viatura.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

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
        <span className="text-sm font-semibold text-white block">{title}</span>
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
                <Car className="w-5 h-5 text-seguranca-yellow flex-shrink-0" />
                <span>Checklist Diário de Viatura Operacional</span>
              </DialogTitle>
              <p className="text-xs text-gray-400 mt-0.5">
                Inspeção diária preventiva de frota, lataria, fluídos e equipamentos de bordo.
              </p>
            </div>

            {/* Alternância de Turno: Dia / Noite */}
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setShift('DIA')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  shift === 'DIA'
                    ? 'bg-amber-400 text-slate-950 shadow font-bold'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Sun className="w-3.5 h-3.5 text-amber-500" /> Turno Dia
              </button>
              <button
                type="button"
                onClick={() => setShift('NOITE')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  shift === 'NOITE'
                    ? 'bg-indigo-600 text-white shadow font-bold'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Moon className="w-3.5 h-3.5 text-indigo-300" /> Turno Noite
              </button>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-3">
          {/* Seção 1: Dados da Viatura & Condutor */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 sm:p-4 space-y-4">
            <h3 className="text-xs sm:text-sm font-semibold text-seguranca-yellow uppercase tracking-wider flex items-center gap-2">
              <Car className="w-4 h-4" />
              Identificação da Viatura e Condutor
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              {/* Seleção de Viatura da Frota */}
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs text-gray-300 flex items-center gap-1">
                  <Car className="w-3 h-3 text-seguranca-yellow" /> Viatura (Frota / Placa)
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Select value={selectedVehicleId} onValueChange={handleSelectVehicle}>
                    <SelectTrigger className="bg-slate-900 border-slate-700 text-white text-sm h-9">
                      <SelectValue placeholder={veiculos.length > 0 ? "Selecione da frota..." : "Frota de veículos..."} />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700 text-white max-h-60">
                      {veiculos.length > 0 ? (
                        veiculos.map((v) => {
                          const plateStr = v.plate || v.placa || 'Sem placa';
                          const modelStr = v.model || v.modelo || v.brand || v.marca || 'Veículo';
                          return (
                            <SelectItem key={v.id} value={String(v.id)}>
                              🚗 {plateStr} — {modelStr}
                            </SelectItem>
                          );
                        })
                      ) : (
                        <SelectItem value="empty" disabled>
                          Nenhum veículo encontrado no cadastro
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <Input
                    value={plate}
                    onChange={(e) => setPlate(e.target.value.toUpperCase())}
                    placeholder="Placa (ex: ABC-1234)..."
                    className="bg-slate-900 border-slate-700 text-white text-sm h-9 font-mono uppercase"
                    required
                  />
                </div>
              </div>

              {/* Modelo */}
              <div className="space-y-1">
                <Label className="text-xs text-gray-300">Modelo do Veículo</Label>
                <Input
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="Ex: Duster, Gol, Hilux"
                  className="bg-slate-900 border-slate-700 text-white text-sm h-9"
                />
              </div>

              {/* Km Atual */}
              <div className="space-y-1">
                <Label className="text-xs text-gray-300 flex items-center gap-1">
                  <Gauge className="w-3 h-3 text-seguranca-yellow" /> Km Atual
                </Label>
                <Input
                  type="number"
                  value={currentKm}
                  onChange={(e) => setCurrentKm(e.target.value)}
                  placeholder="Ex: 85200"
                  className="bg-slate-900 border-slate-700 text-white text-sm h-9"
                />
              </div>

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

              {/* Escolha do Funcionário / Condutor */}
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs text-gray-300 flex items-center gap-1">
                  <User className="w-3 h-3 text-seguranca-yellow" /> Funcionário / Condutor
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <EmployeeCombobox
                    value={selectedEmployeeId}
                    onChange={setSelectedEmployeeId}
                    onEmployeeSelect={(emp) => {
                      setEmployeeName(emp.name);
                      setEmployeeRegistration(emp.registrationNumber || (emp as any).registration || emp.cpf || '');
                    }}
                    placeholder="Pesquisar funcionário / condutor (3+ letras)..."
                    searchPlaceholder="Digite os 3 primeiros caracteres..."
                    initialDisplayName={employeeName}
                    minChars={3}
                    className="h-9 bg-slate-900 border-slate-700 text-white text-sm"
                  />
                  <Input
                    value={employeeName}
                    onChange={(e) => setEmployeeName(e.target.value)}
                    placeholder="Ou digite o nome do funcionário / condutor..."
                    className="bg-slate-900 border-slate-700 text-white text-sm h-9"
                  />
                </div>
              </div>

              {/* Supervisor Responsável */}
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs text-gray-300 flex items-center gap-1">
                  <User className="w-3 h-3 text-seguranca-yellow" /> Supervisor Responsável
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <EmployeeCombobox
                    value={selectedSupervisorId}
                    onChange={setSelectedSupervisorId}
                    onEmployeeSelect={(emp) => {
                      setSupervisorName(emp.name);
                    }}
                    positionFilter={['SUPERVISOR', 'SUPERVISORA', 'GESTOR', 'COORDENADOR', 'LÍDER', 'LIDER']}
                    placeholder="Pesquisar supervisor responsável (3+ letras)..."
                    searchPlaceholder="Digite os 3 primeiros caracteres para buscar supervisores..."
                    emptyPlaceholder="Nenhum supervisor encontrado."
                    initialDisplayName={supervisorName}
                    minChars={3}
                    className="h-9 bg-slate-900 border-slate-700 text-white text-sm"
                  />
                  <Input
                    value={supervisorName}
                    onChange={(e) => setSupervisorName(e.target.value)}
                    placeholder="Ou digite o nome do supervisor..."
                    className="bg-slate-900 border-slate-700 text-white text-sm h-9"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Barra de Ações Rápidas */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
            <span className="text-xs font-semibold text-gray-300">
              Ações Rápidas:
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

          {/* 1. Inspeção Externa e Lataria (Visual) */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3.5 sm:p-4 space-y-3">
            <h4 className="text-xs sm:text-sm font-semibold text-seguranca-yellow flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-seguranca-yellow" />
              1. Inspeção Externa e Lataria (Visual)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {renderTouchItem(
                'Dianteira',
                'Parachoque firme, grade sem quebras e capô travado.',
                dianteira,
                () => setDianteira(!dianteira)
              )}
              {renderTouchItem(
                'Laterais',
                'Ausência de novos riscos, mossas ou batidas nas portas.',
                laterais,
                () => setLaterais(!laterais)
              )}
              {renderTouchItem(
                'Vidros e Retrovisores',
                'Limpos, sem trincas e espelhos regulando perfeitamente.',
                vidrosRetrovisores,
                () => setVidrosRetrovisores(!vidrosRetrovisores)
              )}
              {renderTouchItem(
                'Identificação Visual',
                'Adesivos com logotipo da empresa e número da viatura legíveis.',
                identificacaoVisual,
                () => setIdentificacaoVisual(!identificacaoVisual)
              )}
            </div>
          </div>

          {/* 2. Iluminação e Sinalização Sonora (Segurança) */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3.5 sm:p-4 space-y-3">
            <h4 className="text-xs sm:text-sm font-semibold text-seguranca-yellow flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-seguranca-yellow" />
              2. Iluminação e Sinalização Sonora (Segurança)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {renderTouchItem(
                'Faróis e Lanternas',
                'Farol alto/baixo, setas, luz de freio e ré funcionando.',
                faroisLanternas,
                () => setFaroisLanternas(!faroisLanternas)
              )}
              {renderTouchItem(
                'Giroflex / Sirene',
                'Luzes táticas acendendo e sirene com som claro.',
                giroflexSirene,
                () => setGiroflexSirene(!giroflexSirene)
              )}
              {renderTouchItem(
                'Buzina',
                'Emitindo som forte e sem falhas.',
                buzina,
                () => setBuzina(!buzina)
              )}
            </div>
          </div>

          {/* 3. Mecânica Básica e Fluídos */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3.5 sm:p-4 space-y-3">
            <h4 className="text-xs sm:text-sm font-semibold text-seguranca-yellow flex items-center gap-2">
              <Wrench className="w-4 h-4 text-seguranca-yellow" />
              3. Mecânica Básica e Fluídos
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {renderTouchItem(
                'Pneus',
                'Calibrados, sulcos visíveis (acima do TWI) e estepe cheio.',
                pneus,
                () => setPneus(!pneus)
              )}
              {renderTouchItem(
                'Níveis',
                'Óleo do motor e água do radiador checados com motor frio.',
                niveis,
                () => setNiveis(!niveis)
              )}
              {renderTouchItem(
                'Painel',
                'Sem luzes de advertência acesas após dar a partida.',
                painel,
                () => setPainel(!painel)
              )}
            </div>
          </div>

          {/* 4. Kit de Bordo e Equipamentos Operacionais */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3.5 sm:p-4 space-y-3">
            <h4 className="text-xs sm:text-sm font-semibold text-seguranca-yellow flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-seguranca-yellow" />
              4. Kit de Bordo e Equipamentos Operacionais
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {renderTouchItem(
                'Documentação',
                'CRLV do veículo presente no porta-luvas.',
                documentacao,
                () => setDocumentacao(!documentacao)
              )}
              {renderTouchItem(
                'Ferramentas de Emergência',
                'Macaco, triângulo e chave de roda a bordo.',
                ferramentasEmergencia,
                () => setFerramentasEmergencia(!ferramentasEmergencia)
              )}
              {renderTouchItem(
                'Extintor de Incêndio',
                'Dentro da validade e ponteiro no verde.',
                extintorIncendio,
                () => setExtintorIncendio(!extintorIncendio)
              )}
              {renderTouchItem(
                'Kit Prancheta',
                'Contendo talão de ocorrências, caneta e mapas.',
                kitPrancheta,
                () => setKitPrancheta(!kitPrancheta)
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
              placeholder="Descreva se identificou alguma anomalia, risco novo na lataria ou luz de advertência..."
              className="bg-slate-950 border-slate-700 text-white text-xs sm:text-sm min-h-[70px]"
            />
          </div>

          {/* Assinatura Digital Touch */}
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <Label className="text-xs font-semibold text-gray-200 flex items-center gap-1.5">
                <PenTool className="w-3.5 h-3.5 text-seguranca-yellow" />
                Assinatura Digital da Guia
              </Label>
              
              {/* Seletor de quem está assinando (Supervisor ou Funcionário/Condutor) */}
              <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setSignerRole('CONDUTOR')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                    signerRole === 'CONDUTOR'
                      ? 'bg-seguranca-yellow text-slate-950 shadow'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  🧑‍✈️ Condutor / Funcionário
                </button>
                <button
                  type="button"
                  onClick={() => setSignerRole('SUPERVISOR')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                    signerRole === 'SUPERVISOR'
                      ? 'bg-seguranca-yellow text-slate-950 shadow'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  👔 Supervisor Responsável
                </button>
              </div>

              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={clearCanvas}
                className="h-6 px-2 text-[11px] text-gray-400 hover:text-white"
              >
                <Eraser className="w-3 h-3 mr-1" /> Limpar
              </Button>
            </div>

            <div className="border border-slate-700 rounded-lg overflow-hidden bg-white touch-none">
              <canvas
                ref={canvasRef}
                width={450}
                height={120}
                className="w-full h-[110px] cursor-crosshair"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
            </div>
            <p className="text-[11px] text-gray-400 text-center">
              {signerRole === 'CONDUTOR' 
                ? (employeeName ? `Assinatura do Condutor: ${employeeName}` : 'Assinatura do Condutor / Funcionário (desenhe acima)')
                : (supervisorName ? `Assinatura do Supervisor: ${supervisorName}` : 'Assinatura do Supervisor Responsável (desenhe acima)')
              }
            </p>
          </div>

          <DialogFooter className="pt-4 mt-6 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-2">
            <div>
              <Button
                type="button"
                variant="outline"
                onClick={handleDownloadPdf}
                disabled={downloadingPdf || saving}
                className="border-emerald-600/50 text-emerald-400 hover:bg-emerald-950/40 h-10 w-full sm:w-auto flex items-center justify-center gap-2 font-medium"
              >
                {downloadingPdf ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Gerando Guia PDF...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    {initialData?.id ? 'Gerar Guia PDF' : 'Salvar e Gerar PDF'}
                  </>
                )}
              </Button>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
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
                    Salvar Checklist Viatura
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
