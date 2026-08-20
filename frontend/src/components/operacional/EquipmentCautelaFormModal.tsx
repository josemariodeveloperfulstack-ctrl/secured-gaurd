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
  PackageCheck, 
  User, 
  Radio, 
  BatteryCharging, 
  Flashlight, 
  CheckSquare, 
  Square, 
  PenTool, 
  Eraser, 
  Save, 
  Loader2, 
  FileText, 
  AlertTriangle, 
  ShieldCheck, 
  MapPin, 
  Calendar,
  Download
} from 'lucide-react';
import { EquipmentCautela, equipmentCautelaService } from '@/services/equipmentCautelaService';
import { EmployeeCombobox } from '@/components/ui/employee-combobox';
import { WorkPostCombobox } from '@/components/ui/work-post-combobox';
import api from '@/lib/axios';

interface EquipmentCautelaFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  initialData?: EquipmentCautela | null;
}

export const EquipmentCautelaFormModal: React.FC<EquipmentCautelaFormModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
  initialData,
}) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  // Listas de apoio
  const [funcionarios, setFuncionarios] = useState<any[]>([]);
  const [postos, setPostos] = useState<any[]>([]);

  // 1. Dados do Colaborador
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [employeeName, setEmployeeName] = useState<string>('');
  const [registration, setRegistration] = useState<string>('');
  const [cpf, setCpf] = useState<string>('');
  const [jobTitle, setJobTitle] = useState<string>('Vigilante');
  const [selectedWorkPostId, setSelectedWorkPostId] = useState<string>('');
  const [workPostName, setWorkPostName] = useState<string>('');

  // 2. Especificação dos Materiais / Equipamentos (Os 5 Itens Físicos da Ficha)
  const [item1HtEntregue, setItem1HtEntregue] = useState<boolean>(true);
  const [item1HtMarcaModelo, setItem1HtMarcaModelo] = useState<string>('Motorola EP450 / Baofeng');

  const [item2CarregadorEntregue, setItem2CarregadorEntregue] = useState<boolean>(true);
  const [item2CarregadorMarcaModelo, setItem2CarregadorMarcaModelo] = useState<string>('Base Carregadora Bivolt com Fonte');

  const [item3LanternaEntregue, setItem3LanternaEntregue] = useState<boolean>(true);
  const [item3LanternaMarcaModelo, setItem3LanternaMarcaModelo] = useState<string>('Lanterna Tática LED Recarregável');

  const [item4BastaoEntregue, setItem4BastaoEntregue] = useState<boolean>(false);
  const [item4BastaoMarcaModelo, setItem4BastaoMarcaModelo] = useState<string>('Bastão Vigia Blue - Virdi / Henry');

  const [item5OutrosDescricao, setItem5OutrosDescricao] = useState<string>('');
  const [item5OutrosMarcaModelo, setItem5OutrosMarcaModelo] = useState<string>('');

  // Metadados do Termo
  const [cityUf, setCityUf] = useState<string>('São Paulo - SP');
  const [termDate, setTermDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [observations, setObservations] = useState<string>('');
  const [almoxarifeName, setAlmoxarifeName] = useState<string>('');

  // State para download do PDF
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Canvas de Assinaturas
  const employeeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawingEmployee, setIsDrawingEmployee] = useState(false);
  const [hasEmployeeSignature, setHasEmployeeSignature] = useState(false);

  const almoxarifeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawingAlmoxarife, setIsDrawingAlmoxarife] = useState(false);
  const [hasAlmoxarifeSignature, setHasAlmoxarifeSignature] = useState(false);

  const handleDownloadPdf = async () => {
    // Se já existe um ID (Modo Edição)
    if (initialData?.id) {
      try {
        setDownloadingPdf(true);
        const blob = await equipmentCautelaService.downloadPdf(initialData.id);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `termo-cautela-equipamentos-${initialData.id}-${termDate || 'doc'}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast({
          title: 'Sucesso',
          description: 'Termo em PDF gerado com sucesso!',
        });
      } catch (error) {
        console.error('Erro ao gerar termo PDF:', error);
        toast({
          title: 'Erro',
          description: 'Não foi possível gerar o termo em PDF.',
          variant: 'destructive',
        });
      } finally {
        setDownloadingPdf(false);
      }
      return;
    }

    // Se é um Novo Termo (Modo Cadastro)
    if (!employeeName.trim()) {
      toast({
        title: 'Campo Obrigatório',
        description: 'Informe o nome do colaborador para cadastrar e gerar o termo em PDF.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setDownloadingPdf(true);

      const empSig = employeeCanvasRef.current?.toDataURL('image/png');
      const almSig = almoxarifeCanvasRef.current?.toDataURL('image/png');

      const payload: EquipmentCautela = {
        companyName: 'SECURED GUARD SEGURANÇA PRIVADA',
        employeeName: employeeName.trim(),
        registration: registration.trim() || undefined,
        cpf: cpf.trim() || undefined,
        jobTitle: jobTitle.trim() || undefined,
        workPostName: workPostName.trim() || undefined,

        item1HtEntregue,
        item1HtMarcaModelo: item1HtMarcaModelo.trim() || undefined,

        item2CarregadorEntregue,
        item2CarregadorMarcaModelo: item2CarregadorMarcaModelo.trim() || undefined,

        item3LanternaEntregue,
        item3LanternaMarcaModelo: item3LanternaMarcaModelo.trim() || undefined,

        item4BastaoEntregue,
        item4BastaoMarcaModelo: item4BastaoMarcaModelo.trim() || undefined,

        item5OutrosDescricao: item5OutrosDescricao.trim() || undefined,
        item5OutrosMarcaModelo: item5OutrosMarcaModelo.trim() || undefined,

        cityUf: cityUf.trim() || 'São Paulo - SP',
        termDate,
        observations: observations.trim() || undefined,
        almoxarifeName: almoxarifeName.trim() || undefined,

        employeeSignatureBase64: hasEmployeeSignature ? empSig : undefined,
        almoxarifeSignatureBase64: hasAlmoxarifeSignature ? almSig : undefined,

        employeeId: selectedEmployeeId ? Number(selectedEmployeeId) : undefined,
        workPostId: selectedWorkPostId ? Number(selectedWorkPostId) : undefined,
      };

      const created = await equipmentCautelaService.create(payload);
      if (created.id) {
        const blob = await equipmentCautelaService.downloadPdf(created.id);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `termo-cautela-equipamentos-${created.id}-${termDate || 'doc'}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast({
          title: 'Sucesso',
          description: 'Termo cadastrado e PDF baixado com sucesso!',
        });
        onSuccess();
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Erro ao cadastrar e gerar PDF:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao cadastrar e gerar o PDF do termo.',
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

      // Carregar postos
      api.get('/api/work-posts/active')
        .then((res) => setPostos(Array.isArray(res.data) ? res.data : []))
        .catch(() => {
          api.get('/api/work-posts')
            .then((res) => setPostos(Array.isArray(res.data) ? res.data : []))
            .catch(() => setPostos([]));
        });

      if (initialData) {
        setEmployeeName(initialData.employeeName || '');
        setRegistration(initialData.registration || '');
        setCpf(initialData.cpf || '');
        setJobTitle(initialData.jobTitle || 'Vigilante');
        setWorkPostName(initialData.workPostName || '');

        setItem1HtEntregue(initialData.item1HtEntregue ?? true);
        setItem1HtMarcaModelo(initialData.item1HtMarcaModelo || '');

        setItem2CarregadorEntregue(initialData.item2CarregadorEntregue ?? true);
        setItem2CarregadorMarcaModelo(initialData.item2CarregadorMarcaModelo || '');

        setItem3LanternaEntregue(initialData.item3LanternaEntregue ?? true);
        setItem3LanternaMarcaModelo(initialData.item3LanternaMarcaModelo || '');

        setItem4BastaoEntregue(initialData.item4BastaoEntregue ?? false);
        setItem4BastaoMarcaModelo(initialData.item4BastaoMarcaModelo || '');

        setItem5OutrosDescricao(initialData.item5OutrosDescricao || '');
        setItem5OutrosMarcaModelo(initialData.item5OutrosMarcaModelo || '');

        setCityUf(initialData.cityUf || 'São Paulo - SP');
        setTermDate(initialData.termDate || new Date().toISOString().split('T')[0]);
        setObservations(initialData.observations || '');
        setAlmoxarifeName(initialData.almoxarifeName || '');
      } else {
        setSelectedEmployeeId('');
        setEmployeeName('');
        setRegistration('');
        setCpf('');
        setJobTitle('Vigilante');
        setSelectedWorkPostId('');
        setWorkPostName('');

        setItem1HtEntregue(true);
        setItem1HtMarcaModelo('Motorola EP450 / Baofeng');

        setItem2CarregadorEntregue(true);
        setItem2CarregadorMarcaModelo('Base Carregadora Bivolt');

        setItem3LanternaEntregue(true);
        setItem3LanternaMarcaModelo('Lanterna Tática LED');

        setItem4BastaoEntregue(false);
        setItem4BastaoMarcaModelo('Bastão Vigia Blue - Virdi');

        setItem5OutrosDescricao('');
        setItem5OutrosMarcaModelo('');

        setCityUf('São Paulo - SP');
        setTermDate(new Date().toISOString().split('T')[0]);
        setObservations('');
        setAlmoxarifeName('');
        clearCanvas(employeeCanvasRef, setHasEmployeeSignature);
        clearCanvas(almoxarifeCanvasRef, setHasAlmoxarifeSignature);
      }
    }
  }, [open, initialData]);

  const populateEmployeeData = async (emp: any) => {
    if (!emp) return;
    if (emp.id) setSelectedEmployeeId(String(emp.id));
    if (emp.name) setEmployeeName(emp.name);
    setRegistration(emp.registrationNumber || emp.registration || emp.re || '');
    setCpf(emp.cpf || '');

    let cargo = emp.positionName || emp.position?.name || emp.position || emp.jobTitle || '';
    let setor = emp.workPostName || emp.workPost?.name || emp.departmentName || emp.department?.name || emp.location || emp.unitName || emp.workSector || '';
    let wpId = emp.workPostId || emp.workPost?.id;

    if (cargo) setJobTitle(cargo);
    if (setor) setWorkPostName(setor);
    if (wpId) setSelectedWorkPostId(String(wpId));

    // Busca dados completos se faltar setor, cargo ou ID do posto
    if (emp.id && (!setor || !cargo || !wpId)) {
      try {
        const fullEmp = await employeeService.getEmployeeById(String(emp.id));
        if (fullEmp) {
          if (!cargo) {
            const fullCargo = fullEmp.position?.name || (fullEmp as any).positionName || (fullEmp as any).jobTitle || '';
            if (fullCargo) setJobTitle(fullCargo);
          }
          if (!setor) {
            const fullSetor = fullEmp.workPostName || fullEmp.workPost?.name || fullEmp.departmentName || fullEmp.department?.name || (fullEmp as any).location || fullEmp.unit?.name || '';
            if (fullSetor) setWorkPostName(fullSetor);
          }
          if (!wpId && (fullEmp.workPostId || fullEmp.workPost?.id)) {
            setSelectedWorkPostId(String(fullEmp.workPostId || fullEmp.workPost?.id));
          }
        }
      } catch (err) {
        console.error("Erro ao carregar detalhes completos do funcionário:", err);
      }
    }
  };

  const handleSelectEmployee = (empId: string) => {
    setSelectedEmployeeId(empId);
    const emp = funcionarios.find((f) => String(f.id) === empId);
    if (emp) populateEmployeeData(emp);
  };

  const handleEmployeeSelect = (emp: any) => {
    populateEmployeeData(emp);
  };

  const handleSelectWorkPost = (wpId: string) => {
    setSelectedWorkPostId(wpId);
    const wp = postos.find((p) => String(p.id) === wpId);
    if (wp) setWorkPostName(wp.name);
  };

  const setAllItems = (val: boolean) => {
    setItem1HtEntregue(val);
    setItem2CarregadorEntregue(val);
    setItem3LanternaEntregue(val);
    setItem4BastaoEntregue(val);
  };

  // Canvas Handlers
  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      const touch = e.touches[0];
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
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

  const stopDrawing = (canvasRef: React.RefObject<HTMLCanvasElement>, setIsDrawing: (val: boolean) => void) => {
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

    if (!employeeName.trim()) {
      toast({
        title: 'Campo Obrigatório',
        description: 'Informe o nome do colaborador.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);

      const employeeSig = employeeCanvasRef.current?.toDataURL('image/png') || initialData?.employeeSignatureBase64;
      const almoxarifeSig = almoxarifeCanvasRef.current?.toDataURL('image/png') || initialData?.almoxarifeSignatureBase64;

      const payload: EquipmentCautela = {
        companyName: 'SECURED GUARD SEGURANÇA PRIVADA',
        employeeName: employeeName.trim(),
        registration: registration.trim() || undefined,
        cpf: cpf.trim() || undefined,
        jobTitle: jobTitle.trim() || undefined,
        workPostName: workPostName.trim() || undefined,

        item1HtEntregue,
        item1HtMarcaModelo: item1HtMarcaModelo.trim() || undefined,

        item2CarregadorEntregue,
        item2CarregadorMarcaModelo: item2CarregadorMarcaModelo.trim() || undefined,

        item3LanternaEntregue,
        item3LanternaMarcaModelo: item3LanternaMarcaModelo.trim() || undefined,

        item4BastaoEntregue,
        item4BastaoMarcaModelo: item4BastaoMarcaModelo.trim() || undefined,

        item5OutrosDescricao: item5OutrosDescricao.trim() || undefined,
        item5OutrosMarcaModelo: item5OutrosMarcaModelo.trim() || undefined,

        cityUf: cityUf.trim() || 'São Paulo - SP',
        termDate,
        observations: observations.trim() || undefined,
        almoxarifeName: almoxarifeName.trim() || undefined,

        employeeSignatureBase64: hasEmployeeSignature ? employeeSig : initialData?.employeeSignatureBase64,
        almoxarifeSignatureBase64: hasAlmoxarifeSignature ? almoxarifeSig : initialData?.almoxarifeSignatureBase64,

        employeeId: selectedEmployeeId ? Number(selectedEmployeeId) : undefined,
        workPostId: selectedWorkPostId ? Number(selectedWorkPostId) : undefined,
      };

      if (initialData?.id) {
        await equipmentCautelaService.update(initialData.id, payload);
        toast({
          title: 'Sucesso',
          description: 'Termo de cautela atualizado com sucesso!',
        });
      } else {
        await equipmentCautelaService.create(payload);
        toast({
          title: 'Sucesso',
          description: 'Termo de cautela de equipamentos registrado com sucesso!',
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao salvar termo de cautela:', error);
      toast({
        title: 'Erro ao Salvar',
        description: error?.response?.data?.message || 'Não foi possível salvar o termo.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const renderEquipmentItem = (
    itemNum: string,
    title: string,
    icon: React.ReactNode,
    checked: boolean,
    onToggle: () => void,
    marcaModeloValue: string,
    onMarcaModeloChange: (val: string) => void,
    placeholder: string
  ) => (
    <div
      className={`p-3 sm:p-3.5 rounded-xl border transition-all ${
        checked
          ? 'bg-emerald-950/25 border-emerald-500/50'
          : 'bg-slate-950/40 border-slate-800'
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div
          onClick={onToggle}
          className="flex items-center gap-2 cursor-pointer select-none flex-1"
        >
          <div className={`p-1.5 rounded-lg ${checked ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-gray-400'}`}>
            {icon}
          </div>
          <div>
            <span className="text-xs sm:text-sm font-semibold text-white block">
              Item {itemNum} - {title}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggle}
          className="flex-shrink-0"
        >
          {checked ? (
            <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] py-0.5 px-2.5 flex items-center gap-1 cursor-pointer">
              <CheckSquare className="w-3.5 h-3.5" /> Entregue
            </Badge>
          ) : (
            <Badge className="bg-slate-800 hover:bg-slate-700 text-gray-400 text-[11px] py-0.5 px-2.5 flex items-center gap-1 cursor-pointer">
              <Square className="w-3.5 h-3.5" /> Não Entregue
            </Badge>
          )}
        </button>
      </div>

      <div className="space-y-1 pt-1">
        <Label className="text-[11px] text-gray-400">Marca / Modelo / Nº de Série</Label>
        <Input
          value={marcaModeloValue}
          onChange={(e) => onMarcaModeloChange(e.target.value)}
          placeholder={placeholder}
          className="bg-slate-900 border-slate-700 text-white text-xs h-8"
        />
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
                <PackageCheck className="w-5 h-5 text-seguranca-yellow flex-shrink-0" />
                <span>Termo de Cautela e Responsabilidade de Equipamentos</span>
              </DialogTitle>
              <p className="text-xs text-gray-400 mt-0.5">
                Empréstimo operacional de materiais de apoio, rádio HT, lanternas e bastão de ronda.
              </p>
            </div>
            <Badge className="bg-seguranca-yellow text-slate-950 font-bold px-3 py-1 text-xs self-start sm:self-auto">
              Empréstimo em Serviço
            </Badge>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-3">
          {/* Seção 1: Dados do Colaborador */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 sm:p-4 space-y-4">
            <h3 className="text-xs sm:text-sm font-semibold text-seguranca-yellow uppercase tracking-wider flex items-center gap-2">
              <User className="w-4 h-4" />
              1. Dados do Colaborador
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              {/* Seleção de Funcionário */}
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs text-gray-300 flex items-center gap-1">
                  <User className="w-3 h-3 text-seguranca-yellow" /> Selecionar Colaborador
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <EmployeeCombobox
                    value={selectedEmployeeId}
                    onValueChange={setSelectedEmployeeId}
                    onEmployeeSelect={handleEmployeeSelect}
                    placeholder="Pesquisar colaborador (digite 3 letras)..."
                    minChars={3}
                    className="w-full"
                  />
                  <Input
                    value={employeeName}
                    onChange={(e) => setEmployeeName(e.target.value)}
                    placeholder="Nome completo do colaborador..."
                    className="bg-slate-900 border-slate-700 text-white text-sm h-9"
                    required
                  />
                </div>
              </div>

              {/* Matrícula / RE */}
              <div className="space-y-1">
                <Label className="text-xs text-gray-300">Matrícula (RE)</Label>
                <Input
                  value={registration}
                  onChange={(e) => setRegistration(e.target.value)}
                  placeholder="Ex: 12345"
                  className="bg-slate-900 border-slate-700 text-white text-sm h-9"
                />
              </div>

              {/* CPF */}
              <div className="space-y-1">
                <Label className="text-xs text-gray-300">CPF do Colaborador</Label>
                <Input
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  placeholder="000.000.000-00"
                  className="bg-slate-900 border-slate-700 text-white text-sm h-9"
                />
              </div>

              {/* Cargo / Função */}
              <div className="space-y-1">
                <Label className="text-xs text-gray-300">Cargo / Função</Label>
                <Input
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="Ex: Vigilante, Supervisor, Porteiro"
                  className="bg-slate-900 border-slate-700 text-white text-sm h-9"
                />
              </div>

              {/* Setor de Trabalho */}
              <div className="space-y-1 sm:col-span-3">
                <Label className="text-xs text-gray-300 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-seguranca-yellow" /> Setor de Trabalho
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <WorkPostCombobox
                    value={selectedWorkPostId}
                    onValueChange={setSelectedWorkPostId}
                    onWorkPostSelect={(wp) => {
                      if (wp) {
                        setSelectedWorkPostId(String(wp.id));
                        setWorkPostName(wp.name);
                      }
                    }}
                    placeholder="Pesquisar setor de trabalho..."
                    className="w-full"
                  />
                  <Input
                    value={workPostName}
                    onChange={(e) => setWorkPostName(e.target.value)}
                    placeholder="Ou digite o setor de trabalho (ex: Portaria 24h, Operacional)..."
                    className="bg-slate-900 border-slate-700 text-white text-sm h-9"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Seção 2: Especificação dos Materiais / Equipamentos */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 sm:p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-xs sm:text-sm font-semibold text-seguranca-yellow uppercase tracking-wider flex items-center gap-2">
                <PackageCheck className="w-4 h-4" />
                2. Especificação dos Materiais / Equipamentos
              </h3>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setAllItems(true)}
                  className="text-xs h-7 bg-emerald-950/40 border-emerald-600/40 text-emerald-300 hover:bg-emerald-900"
                >
                  <CheckSquare className="w-3.5 h-3.5 mr-1" /> Marcar Kit Padrão
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setAllItems(false)}
                  className="text-xs h-7 border-slate-700 text-gray-400 hover:bg-slate-800"
                >
                  <Square className="w-3.5 h-3.5 mr-1" /> Desmarcar
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Item 01 */}
              {renderEquipmentItem(
                '01',
                'Rádio Transceptor (HT) com bateria',
                <Radio className="w-4 h-4" />,
                item1HtEntregue,
                () => setItem1HtEntregue(!item1HtEntregue),
                item1HtMarcaModelo,
                setItem1HtMarcaModelo,
                'Ex: Motorola EP450 - Nº Série 88726'
              )}

              {/* Item 02 */}
              {renderEquipmentItem(
                '02',
                'Carregador de Bateria HT',
                <BatteryCharging className="w-4 h-4" />,
                item2CarregadorEntregue,
                () => setItem2CarregadorEntregue(!item2CarregadorEntregue),
                item2CarregadorMarcaModelo,
                setItem2CarregadorMarcaModelo,
                'Ex: Base de Mesa Bivolt'
              )}

              {/* Item 03 */}
              {renderEquipmentItem(
                '03',
                'Lanterna Tática com Bateria',
                <Flashlight className="w-4 h-4" />,
                item3LanternaEntregue,
                () => setItem3LanternaEntregue(!item3LanternaEntregue),
                item3LanternaMarcaModelo,
                setItem3LanternaMarcaModelo,
                'Ex: Lanterna Tática T9 LED'
              )}

              {/* Item 04 */}
              {renderEquipmentItem(
                '04',
                'Bastão de Ronda Eletrônico',
                <ShieldCheck className="w-4 h-4" />,
                item4BastaoEntregue,
                () => setItem4BastaoEntregue(!item4BastaoEntregue),
                item4BastaoMarcaModelo,
                setItem4BastaoMarcaModelo,
                'Ex: Bastão Vigia Blue - Henry'
              )}
            </div>

            {/* Item 05 - Outros */}
            <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/40 space-y-3">
              <Label className="text-xs font-semibold text-gray-300 block">
                Item 05 / 06 - Outros Materiais / Equipamentos Adicionais
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  value={item5OutrosDescricao}
                  onChange={(e) => setItem5OutrosDescricao(e.target.value)}
                  placeholder="Descrição do equipamento extra (ex: Capa de Chuva, Apito)..."
                  className="bg-slate-900 border-slate-700 text-white text-xs h-8"
                />
                <Input
                  value={item5OutrosMarcaModelo}
                  onChange={(e) => setItem5OutrosMarcaModelo(e.target.value)}
                  placeholder="Marca / Modelo / Patrimônio do extra..."
                  className="bg-slate-900 border-slate-700 text-white text-xs h-8"
                />
              </div>
            </div>
          </div>

          {/* Seção 3: Resumo das 5 Cláusulas Regulatórias da CLT */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3.5 space-y-2 text-xs text-gray-300">
            <h4 className="font-semibold text-seguranca-yellow flex items-center gap-1.5 text-xs uppercase">
              <FileText className="w-3.5 h-3.5" /> 3. Compromissos e Responsabilidades do Empregado
            </h4>
            <ol className="list-decimal pl-4 space-y-1 text-[11px] text-gray-400 leading-relaxed">
              <li><strong>Uso Exclusivo:</strong> Utilizar os equipamentos única e exclusivamente para fins profissionais a serviço da empresa.</li>
              <li><strong>Conservação:</strong> Zelar pela manutenção preventiva, limpeza e integridade física dos materiais.</li>
              <li><strong>Extravio e Danos por Negligência:</strong> Autorização expressa de desconto em folha pelo valor de mercado (art. 462, § 1º da CLT).</li>
              <li><strong>Ocorrências Policiais:</strong> Registro de BO imediato em caso de roubo/furto e apresentação à empresa em até 24 horas.</li>
              <li><strong>Devolução:</strong> Devolução em perfeitas condições sempre que solicitado, em trocas de posto ou rescisão contratual.</li>
            </ol>
          </div>

          {/* Local e Data do Termo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
            <div className="space-y-1">
              <Label className="text-xs text-gray-300">Cidade - UF</Label>
              <Input
                value={cityUf}
                onChange={(e) => setCityUf(e.target.value)}
                placeholder="Ex: São Paulo - SP"
                className="bg-slate-900 border-slate-700 text-white text-xs h-8"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-300">Data do Termo</Label>
              <Input
                type="date"
                value={termDate}
                onChange={(e) => setTermDate(e.target.value)}
                className="bg-slate-900 border-slate-700 text-white text-xs h-8"
                required
              />
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-300 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              Observações Adicionais (Opcional)
            </Label>
            <Textarea
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Estado de conservação prévio, avarias existentes ou orientações ao colaborador..."
              className="bg-slate-950 border-slate-700 text-white text-xs min-h-[60px]"
            />
          </div>

          {/* Assinaturas Digitais Touch */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {/* Assinatura do Colaborador */}
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-gray-200 flex items-center gap-1.5">
                  <PenTool className="w-3.5 h-3.5 text-seguranca-yellow" />
                  Assinatura do(a) Funcionário(a)
                </Label>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => clearCanvas(employeeCanvasRef, setHasEmployeeSignature)}
                  className="h-6 px-2 text-[11px] text-gray-400 hover:text-white"
                >
                  <Eraser className="w-3 h-3 mr-1" /> Limpar
                </Button>
              </div>
              <div className="border border-slate-700 rounded-lg overflow-hidden bg-white touch-none">
                <canvas
                  ref={employeeCanvasRef}
                  width={340}
                  height={110}
                  className="w-full h-[100px] cursor-crosshair"
                  onMouseDown={(e) => startDrawing(e, employeeCanvasRef, setIsDrawingEmployee, setHasEmployeeSignature)}
                  onMouseMove={(e) => draw(e, employeeCanvasRef, isDrawingEmployee)}
                  onMouseUp={() => stopDrawing(employeeCanvasRef, setIsDrawingEmployee)}
                  onMouseLeave={() => stopDrawing(employeeCanvasRef, setIsDrawingEmployee)}
                  onTouchStart={(e) => startDrawing(e, employeeCanvasRef, setIsDrawingEmployee, setHasEmployeeSignature)}
                  onTouchMove={(e) => draw(e, employeeCanvasRef, isDrawingEmployee)}
                  onTouchEnd={() => stopDrawing(employeeCanvasRef, setIsDrawingEmployee)}
                />
              </div>
              <p className="text-[11px] text-gray-400 text-center">
                {employeeName || 'Assine acima com o dedo ou mouse'}
              </p>
            </div>

            {/* Assinatura do Almoxarife / Responsável */}
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-gray-200 flex items-center gap-1.5">
                  <PenTool className="w-3.5 h-3.5 text-seguranca-yellow" />
                  Assinatura Almoxarife / Responsável
                </Label>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => clearCanvas(almoxarifeCanvasRef, setHasAlmoxarifeSignature)}
                  className="h-6 px-2 text-[11px] text-gray-400 hover:text-white"
                >
                  <Eraser className="w-3 h-3 mr-1" /> Limpar
                </Button>
              </div>
              <EmployeeCombobox
                onEmployeeSelect={(emp) => {
                  if (emp) setAlmoxarifeName(emp.name);
                }}
                placeholder="Pesquisar Almoxarife / Responsável..."
                minChars={3}
                className="w-full mb-1"
              />
              <Input
                value={almoxarifeName}
                onChange={(e) => setAlmoxarifeName(e.target.value)}
                placeholder="Nome do Almoxarife / Responsável..."
                className="bg-slate-900 border-slate-700 text-white text-xs h-7 mb-1"
              />
              <div className="border border-slate-700 rounded-lg overflow-hidden bg-white touch-none">
                <canvas
                  ref={almoxarifeCanvasRef}
                  width={340}
                  height={110}
                  className="w-full h-[100px] cursor-crosshair"
                  onMouseDown={(e) => startDrawing(e, almoxarifeCanvasRef, setIsDrawingAlmoxarife, setHasAlmoxarifeSignature)}
                  onMouseMove={(e) => draw(e, almoxarifeCanvasRef, isDrawingAlmoxarife)}
                  onMouseUp={() => stopDrawing(almoxarifeCanvasRef, setIsDrawingAlmoxarife)}
                  onMouseLeave={() => stopDrawing(almoxarifeCanvasRef, setIsDrawingAlmoxarife)}
                  onTouchStart={(e) => startDrawing(e, almoxarifeCanvasRef, setIsDrawingAlmoxarife, setHasAlmoxarifeSignature)}
                  onTouchMove={(e) => draw(e, almoxarifeCanvasRef, isDrawingAlmoxarife)}
                  onTouchEnd={() => stopDrawing(almoxarifeCanvasRef, setIsDrawingAlmoxarife)}
                />
              </div>
              <p className="text-[11px] text-gray-400 text-center">
                {almoxarifeName ? `Assinatura: ${almoxarifeName}` : 'Assine acima com o dedo ou mouse'}
              </p>
            </div>
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
                    Gerando PDF...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    {initialData?.id ? 'Baixar Termo em PDF' : 'Salvar e Baixar PDF'}
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
                disabled={saving || downloadingPdf}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saving || downloadingPdf}
                className="bg-seguranca-yellow hover:bg-seguranca-yellow/90 text-slate-950 font-bold h-10 w-full sm:w-auto flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Salvando Termo...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Salvar Termo de Cautela
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
