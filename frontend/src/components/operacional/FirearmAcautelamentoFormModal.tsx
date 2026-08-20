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
  ShieldAlert, 
  ShieldCheck, 
  Crosshair, 
  User, 
  Calendar, 
  MapPin, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  PenTool, 
  Eraser, 
  Save, 
  Loader2, 
  Hash, 
  Layers, 
  AlertTriangle,
  Download,
  Camera,
  Trash2
} from 'lucide-react';
import { FirearmAcautelamento, firearmAcautelamentoService } from '@/services/firearmAcautelamentoService';
import { EmployeeCombobox } from '@/components/ui/employee-combobox';
import { WorkPostCombobox } from '@/components/ui/work-post-combobox';
import api from '@/lib/axios';

interface FirearmAcautelamentoFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  initialData?: FirearmAcautelamento | null;
}

export const FirearmAcautelamentoFormModal: React.FC<FirearmAcautelamentoFormModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
  initialData,
}) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  // Listas de apoio
  const [funcionarios, setFuncionarios] = useState<any[]>([]);
  const [armas, setArmas] = useState<any[]>([]);
  const [postos, setPostos] = useState<any[]>([]);

  // 1. Dados do Vigilante
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [vigilanteName, setVigilanteName] = useState<string>('');
  const [registration, setRegistration] = useState<string>('');
  const [cnvNumber, setCnvNumber] = useState<string>('');
  const [cpf, setCpf] = useState<string>('');
  const [selectedWorkPostId, setSelectedWorkPostId] = useState<string>('');
  const [workPostName, setWorkPostName] = useState<string>('');
  const [recyclingExpirationDate, setRecyclingExpirationDate] = useState<string>('');

  // 2. Especificação do Armamento
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string>('');
  const [weaponType, setWeaponType] = useState<string>('Revólver');
  const [brand, setBrand] = useState<string>('Taurus');
  const [caliber, setCaliber] = useState<string>('.38 SPL');
  const [shotCapacity, setShotCapacity] = useState<string>('6');
  const [serialNumber, setSerialNumber] = useState<string>('');
  const [crafNumber, setCrafNumber] = useState<string>('');
  const [ammoQuantity, setAmmoQuantity] = useState<string>('12');
  const [ammoType, setAmmoType] = useState<string>('Intactas / Novas');
  const [ammoLot, setAmmoLot] = useState<string>('');
  const [accessories, setAccessories] = useState<string>('Coldre tático e Porta-munição');

  // 3. Inspeção Visual e Funcional
  const [mecanismoDisparoOk, setMecanismoDisparoOk] = useState<boolean>(true);
  const [canoDesobstruidoOk, setCanoDesobstruidoOk] = useState<boolean>(true);
  const [conservationState, setConservationState] = useState<string>('Excelente');

  // Metadados do Termo
  const [cityUf, setCityUf] = useState<string>('São Paulo - SP');
  const [termDate, setTermDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [observations, setObservations] = useState<string>('');
  const [armeiroName, setArmeiroName] = useState<string>('');

  // Campo Foto (Opcional)
  const [photoBase64, setPhotoBase64] = useState<string>('');

  // State para download do PDF
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Canvas de Assinaturas
  const vigilanteCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawingVigilante, setIsDrawingVigilante] = useState(false);
  const [hasVigilanteSignature, setHasVigilanteSignature] = useState(false);

  const armeiroCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawingArmeiro, setIsDrawingArmeiro] = useState(false);
  const [hasArmeiroSignature, setHasArmeiroSignature] = useState(false);

  const handleDownloadPdf = async () => {
    // Se já existe um ID (Modo Edição)
    if (initialData?.id) {
      try {
        setDownloadingPdf(true);
        const blob = await firearmAcautelamentoService.downloadPdf(initialData.id);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `termo-acautelamento-arma-${initialData.id}-${termDate || 'doc'}.pdf`;
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
    if (!vigilanteName.trim()) {
      toast({
        title: 'Campo Obrigatório',
        description: 'Informe o nome do vigilante para cadastrar e gerar o termo em PDF.',
        variant: 'destructive',
      });
      return;
    }

    if (!serialNumber.trim()) {
      toast({
        title: 'Campo Obrigatório',
        description: 'Informe o número de série do armamento para cadastrar e gerar o termo em PDF.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setDownloadingPdf(true);

      const vigilanteSig = vigilanteCanvasRef.current?.toDataURL('image/png');
      const armeiroSig = armeiroCanvasRef.current?.toDataURL('image/png');

      const payload: FirearmAcautelamento = {
        companyName: 'SECURED GUARD SEGURANÇA PRIVADA',
        vigilanteName: vigilanteName.trim(),
        registration: registration.trim() || undefined,
        cnvNumber: cnvNumber.trim() || undefined,
        cpf: cpf.trim() || undefined,
        workPostName: workPostName.trim() || undefined,
        recyclingExpirationDate: recyclingExpirationDate || undefined,

        weaponType,
        brand: brand.trim() || undefined,
        caliber: caliber.trim() || undefined,
        shotCapacity: shotCapacity ? Number(shotCapacity) : undefined,
        serialNumber: serialNumber.trim(),
        crafNumber: crafNumber.trim() || undefined,
        ammoQuantity: ammoQuantity ? Number(ammoQuantity) : undefined,
        ammoType,
        ammoLot: ammoLot.trim() || undefined,
        accessories: accessories.trim() || undefined,

        mecanismoDisparoOk,
        canoDesobstruidoOk,
        conservationState,

        cityUf: cityUf.trim() || 'São Paulo - SP',
        termDate,
        observations: observations.trim() || undefined,
        armeiroName: armeiroName.trim() || undefined,
        photoBase64: photoBase64 || undefined,

        vigilanteSignatureBase64: hasVigilanteSignature ? vigilanteSig : undefined,
        armeiroSignatureBase64: hasArmeiroSignature ? armeiroSig : undefined,

        employeeId: selectedEmployeeId ? Number(selectedEmployeeId) : undefined,
        equipmentId: selectedEquipmentId ? Number(selectedEquipmentId) : undefined,
        workPostId: selectedWorkPostId ? Number(selectedWorkPostId) : undefined,
      };

      const created = await firearmAcautelamentoService.create(payload);
      if (created.id) {
        const blob = await firearmAcautelamentoService.downloadPdf(created.id);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `termo-acautelamento-arma-${created.id}-${termDate || 'doc'}.pdf`;
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

      // Carregar armas cadastradas
      api.get('/api/equipments')
        .then((res) => {
          const list = Array.isArray(res.data) ? res.data : (res.data?.content || []);
          // Filtrar equipamentos do tipo ARMA ou armas de fogo
          const firearms = list.filter((eq: any) => 
            eq.type === 'ARMA' || eq.type === 'WEAPON' || (eq.name && eq.name.toLowerCase().includes('rev')) || (eq.name && eq.name.toLowerCase().includes('pist'))
          );
          setArmas(firearms.length > 0 ? firearms : list);
        })
        .catch(() => setArmas([]));

      // Carregar postos
      api.get('/api/work-posts/active')
        .then((res) => setPostos(Array.isArray(res.data) ? res.data : []))
        .catch(() => {
          api.get('/api/work-posts')
            .then((res) => setPostos(Array.isArray(res.data) ? res.data : []))
            .catch(() => setPostos([]));
        });

      if (initialData) {
        setVigilanteName(initialData.vigilanteName || '');
        setRegistration(initialData.registration || '');
        setCnvNumber(initialData.cnvNumber || '');
        setCpf(initialData.cpf || '');
        setWorkPostName(initialData.workPostName || '');
        setRecyclingExpirationDate(initialData.recyclingExpirationDate || '');

        setWeaponType(initialData.weaponType || 'Revólver');
        setBrand(initialData.brand || '');
        setCaliber(initialData.caliber || '');
        setShotCapacity(initialData.shotCapacity ? String(initialData.shotCapacity) : '6');
        setSerialNumber(initialData.serialNumber || '');
        setCrafNumber(initialData.crafNumber || '');
        setAmmoQuantity(initialData.ammoQuantity ? String(initialData.ammoQuantity) : '12');
        setAmmoType(initialData.ammoType || 'Intactas / Novas');
        setAmmoLot(initialData.ammoLot || '');
        setAccessories(initialData.accessories || 'Coldre tático e Porta-munição');

        setMecanismoDisparoOk(initialData.mecanismoDisparoOk ?? true);
        setCanoDesobstruidoOk(initialData.canoDesobstruidoOk ?? true);
        setConservationState(initialData.conservationState || 'Excelente');

        setCityUf(initialData.cityUf || 'São Paulo - SP');
        setTermDate(initialData.termDate || new Date().toISOString().split('T')[0]);
        setObservations(initialData.observations || '');
        setArmeiroName(initialData.armeiroName || '');
        setPhotoBase64(initialData.photoBase64 || '');
      } else {
        setSelectedEmployeeId('');
        setVigilanteName('');
        setRegistration('');
        setCnvNumber('');
        setCpf('');
        setSelectedWorkPostId('');
        setWorkPostName('');
        setRecyclingExpirationDate('');

        setSelectedEquipmentId('');
        setWeaponType('Revólver');
        setBrand('Taurus');
        setCaliber('.38 SPL');
        setShotCapacity('6');
        setSerialNumber('');
        setCrafNumber('');
        setAmmoQuantity('12');
        setAmmoType('Intactas / Novas');
        setAmmoLot('');
        setAccessories('Coldre tático e Porta-munição');

        setMecanismoDisparoOk(true);
        setCanoDesobstruidoOk(true);
        setConservationState('Excelente');

        setCityUf('São Paulo - SP');
        setTermDate(new Date().toISOString().split('T')[0]);
        setObservations('');
        setArmeiroName('');
        setPhotoBase64('');
        clearCanvas(vigilanteCanvasRef, setHasVigilanteSignature);
        clearCanvas(armeiroCanvasRef, setHasArmeiroSignature);
      }
    }
  }, [open, initialData]);

  const handleSelectEmployee = (empId: string) => {
    setSelectedEmployeeId(empId);
    const emp = funcionarios.find((f) => String(f.id) === empId);
    if (emp) {
      setVigilanteName(emp.name);
      setRegistration(emp.registration || '');
      setCpf(emp.cpf || '');
      if (emp.cnv || emp.cnvNumber) setCnvNumber(emp.cnv || emp.cnvNumber);
      if (emp.recyclingExpirationDate || emp.dataReciclagem) {
        setRecyclingExpirationDate(emp.recyclingExpirationDate || emp.dataReciclagem);
      }
      if (emp.workPostName || emp.location) {
        setWorkPostName(emp.workPostName || emp.location);
      }
    }
  };

  const handleSelectArma = (armId: string) => {
    setSelectedEquipmentId(armId);
    const arm = armas.find((a) => String(a.id) === armId);
    if (arm) {
      setSerialNumber(arm.serialNumber || arm.code || '');
      if (arm.brand) setBrand(arm.brand);
      if (arm.caliber) setCaliber(arm.caliber);
      if (arm.crafNumber || arm.craf) setCrafNumber(arm.crafNumber || arm.craf);
      if (arm.name?.toLowerCase().includes('pist')) setWeaponType('Pistola');
      else if (arm.name?.toLowerCase().includes('esping')) setWeaponType('Espingarda');
      else setWeaponType('Revólver');
    }
  };

  const handleSelectWorkPost = (wpId: string) => {
    setSelectedWorkPostId(wpId);
    const wp = postos.find((p) => String(p.id) === wpId);
    if (wp) setWorkPostName(wp.name);
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

    if (!vigilanteName.trim()) {
      toast({
        title: 'Campo Obrigatório',
        description: 'Informe o nome do vigilante.',
        variant: 'destructive',
      });
      return;
    }

    if (!serialNumber.trim()) {
      toast({
        title: 'Campo Obrigatório',
        description: 'Informe o número de série do armamento.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);

      const vigilanteSig = vigilanteCanvasRef.current?.toDataURL('image/png') || initialData?.vigilanteSignatureBase64;
      const armeiroSig = armeiroCanvasRef.current?.toDataURL('image/png') || initialData?.armeiroSignatureBase64;

      const payload: FirearmAcautelamento = {
        companyName: 'SECURED GUARD SEGURANÇA PRIVADA',
        vigilanteName: vigilanteName.trim(),
        registration: registration.trim() || undefined,
        cnvNumber: cnvNumber.trim() || undefined,
        cpf: cpf.trim() || undefined,
        workPostName: workPostName.trim() || undefined,
        recyclingExpirationDate: recyclingExpirationDate || undefined,

        weaponType,
        brand: brand.trim() || undefined,
        caliber: caliber.trim() || undefined,
        shotCapacity: shotCapacity ? Number(shotCapacity) : undefined,
        serialNumber: serialNumber.trim(),
        crafNumber: crafNumber.trim() || undefined,
        ammoQuantity: ammoQuantity ? Number(ammoQuantity) : undefined,
        ammoType,
        ammoLot: ammoLot.trim() || undefined,
        accessories: accessories.trim() || undefined,

        mecanismoDisparoOk,
        canoDesobstruidoOk,
        conservationState,

        cityUf: cityUf.trim() || 'São Paulo - SP',
        termDate,
        observations: observations.trim() || undefined,
        armeiroName: armeiroName.trim() || undefined,
        photoBase64: photoBase64 || undefined,

        vigilanteSignatureBase64: hasVigilanteSignature ? vigilanteSig : initialData?.vigilanteSignatureBase64,
        armeiroSignatureBase64: hasArmeiroSignature ? armeiroSig : initialData?.armeiroSignatureBase64,

        employeeId: selectedEmployeeId ? Number(selectedEmployeeId) : undefined,
        equipmentId: selectedEquipmentId ? Number(selectedEquipmentId) : undefined,
        workPostId: selectedWorkPostId ? Number(selectedWorkPostId) : undefined,
      };

      if (initialData?.id) {
        await firearmAcautelamentoService.update(initialData.id, payload);
        toast({
          title: 'Sucesso',
          description: 'Termo de acautelamento atualizado com sucesso!',
        });
      } else {
        await firearmAcautelamentoService.create(payload);
        toast({
          title: 'Sucesso',
          description: 'Termo de acautelamento registrado com sucesso!',
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao salvar termo de acautelamento:', error);
      toast({
        title: 'Erro ao Salvar',
        description: error?.response?.data?.message || 'Não foi possível salvar o termo.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[96vw] max-h-[92vh] overflow-y-auto bg-slate-900 border-slate-700 text-white p-4 sm:p-6 rounded-xl">
        <DialogHeader className="border-b border-slate-800 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <DialogTitle className="text-lg sm:text-xl font-bold text-seguranca-yellow flex items-center gap-2">
                <Crosshair className="w-5 h-5 text-seguranca-yellow flex-shrink-0" />
                <span>Termo de Acautelamento de Arma de Fogo e Munição</span>
              </DialogTitle>
              <p className="text-xs text-gray-400 mt-0.5">
                Acautelamento operacional oficial conforme normas da Polícia Federal e CLT.
              </p>
            </div>
            <Badge className="bg-seguranca-yellow text-slate-950 font-bold px-3 py-1 text-xs self-start sm:self-auto">
              Porte em Serviço
            </Badge>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-3">
          {/* Seção 1: Dados do Vigilante */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 sm:p-4 space-y-4">
            <h3 className="text-xs sm:text-sm font-semibold text-seguranca-yellow uppercase tracking-wider flex items-center gap-2">
              <User className="w-4 h-4" />
              1. Dados do Vigilante
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              {/* Seleção de Funcionário */}
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs text-gray-300 flex items-center gap-1">
                  <User className="w-3 h-3 text-seguranca-yellow" /> Selecionar Funcionário (Vigilante)
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <EmployeeCombobox
                    value={selectedEmployeeId}
                    onChange={setSelectedEmployeeId}
                    onEmployeeSelect={async (emp) => {
                      setVigilanteName(emp.name);
                      setRegistration(emp.registrationNumber || (emp as any).registration || emp.cpf || '');
                      setCpf(emp.cpf || '');
                      if ((emp as any).cnv || (emp as any).cnvNumber) setCnvNumber((emp as any).cnv || (emp as any).cnvNumber);
                      if ((emp as any).recyclingExpirationDate || (emp as any).dataReciclagem) {
                        setRecyclingExpirationDate((emp as any).recyclingExpirationDate || (emp as any).dataReciclagem);
                      }
                      
                      let setor = emp.workPostName || (emp as any).workPost?.name || emp.departmentName || (emp as any).department?.name || (emp as any).location || emp.unitName || '';
                      let wpId = emp.workPostId || (emp as any).workPost?.id;
                      if (setor) setWorkPostName(setor);
                      if (wpId) setSelectedWorkPostId(String(wpId));

                      if (emp.id && (!setor || !wpId)) {
                        try {
                          const full = await employeeService.getEmployeeById(String(emp.id));
                          if (full) {
                            const fullSetor = full.workPostName || full.workPost?.name || full.departmentName || full.department?.name || (full as any).location || full.unit?.name || '';
                            if (fullSetor) setWorkPostName(fullSetor);
                            if (full.workPostId || full.workPost?.id) setSelectedWorkPostId(String(full.workPostId || full.workPost?.id));
                          }
                        } catch {}
                      }
                    }}
                    placeholder="Pesquisar vigilante (3+ letras)..."
                    searchPlaceholder="Digite os 3 primeiros caracteres..."
                    initialDisplayName={vigilanteName}
                    minChars={3}
                    className="h-9 bg-slate-900 border-slate-700 text-white text-sm"
                  />
                  <Input
                    value={vigilanteName}
                    onChange={(e) => setVigilanteName(e.target.value)}
                    placeholder="Nome completo do vigilante..."
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

              {/* CNV Nº */}
              <div className="space-y-1">
                <Label className="text-xs text-gray-300">CNV Nº (Carteira Nac. Vigilante)</Label>
                <Input
                  value={cnvNumber}
                  onChange={(e) => setCnvNumber(e.target.value)}
                  placeholder="Ex: 987654321"
                  className="bg-slate-900 border-slate-700 text-white text-sm h-9"
                />
              </div>

              {/* CPF */}
              <div className="space-y-1">
                <Label className="text-xs text-gray-300">CPF do Vigilante</Label>
                <Input
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  placeholder="000.000.000-00"
                  className="bg-slate-900 border-slate-700 text-white text-sm h-9"
                />
              </div>

              {/* Vencimento da Reciclagem */}
              <div className="space-y-1">
                <Label className="text-xs text-gray-300 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-seguranca-yellow" /> Venc. da Última Reciclagem
                </Label>
                <Input
                  type="date"
                  value={recyclingExpirationDate}
                  onChange={(e) => setRecyclingExpirationDate(e.target.value)}
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
                    onChange={setSelectedWorkPostId}
                    onWorkPostSelect={(post) => {
                      setWorkPostName(post.name || '');
                    }}
                    placeholder="Pesquisar setor / posto de trabalho..."
                    searchPlaceholder="Digite para buscar pelo nome ou código..."
                    className="h-9 bg-slate-900 border-slate-700 text-white text-sm"
                  />
                  <Input
                    value={workPostName}
                    onChange={(e) => setWorkPostName(e.target.value)}
                    placeholder="Setor de trabalho (ex: Portaria 24h, Operacional...)"
                    className="bg-slate-900 border-slate-700 text-white text-sm h-9"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Seção 2: Especificação do Armamento, Munição e Acessórios */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 sm:p-4 space-y-4">
            <h3 className="text-xs sm:text-sm font-semibold text-seguranca-yellow uppercase tracking-wider flex items-center gap-2">
              <Crosshair className="w-4 h-4" />
              2. Especificação do Armamento, Munição e Acessórios
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              {/* Seleção de Arma do Estoque */}
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs text-gray-300 flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3 text-seguranca-yellow" /> Armamento Cadastrado
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {armas.length > 0 ? (
                    <Select value={selectedEquipmentId} onValueChange={handleSelectArma}>
                      <SelectTrigger className="bg-slate-900 border-slate-700 text-white text-sm h-9">
                        <SelectValue placeholder="Selecione da armaria..." />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-700 text-white">
                        {armas.map((a) => (
                          <SelectItem key={a.id} value={String(a.id)}>
                            {a.serialNumber || a.code} - {a.brand || a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : null}
                  <Input
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    placeholder="Nº de Série da Arma..."
                    className="bg-slate-900 border-slate-700 text-white text-sm h-9 font-mono"
                    required
                  />
                </div>
              </div>

              {/* Espécie da Arma */}
              <div className="space-y-1">
                <Label className="text-xs text-gray-300">Espécie da Arma</Label>
                <Select value={weaponType} onValueChange={setWeaponType}>
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white text-sm h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700 text-white">
                    <SelectItem value="Revólver">Revólver</SelectItem>
                    <SelectItem value="Pistola">Pistola</SelectItem>
                    <SelectItem value="Espingarda">Espingarda</SelectItem>
                    <SelectItem value="Outra">Outra</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Marca */}
              <div className="space-y-1">
                <Label className="text-xs text-gray-300">Marca</Label>
                <Input
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="Ex: Taurus, Rossi, Imbel"
                  className="bg-slate-900 border-slate-700 text-white text-sm h-9"
                />
              </div>

              {/* Calibre */}
              <div className="space-y-1">
                <Label className="text-xs text-gray-300">Calibre</Label>
                <Input
                  value={caliber}
                  onChange={(e) => setCaliber(e.target.value)}
                  placeholder="Ex: .38 SPL, .380, 12 GA"
                  className="bg-slate-900 border-slate-700 text-white text-sm h-9"
                />
              </div>

              {/* Capacidade de Tiros */}
              <div className="space-y-1">
                <Label className="text-xs text-gray-300">Capacidade de Tiros</Label>
                <Input
                  type="number"
                  value={shotCapacity}
                  onChange={(e) => setShotCapacity(e.target.value)}
                  placeholder="Ex: 6"
                  className="bg-slate-900 border-slate-700 text-white text-sm h-9"
                />
              </div>

              {/* Número do CRAF (PF) */}
              <div className="space-y-1">
                <Label className="text-xs text-gray-300">Número do CRAF (PF)</Label>
                <Input
                  value={crafNumber}
                  onChange={(e) => setCrafNumber(e.target.value)}
                  placeholder="Ex: CRAF-123456"
                  className="bg-slate-900 border-slate-700 text-white text-sm h-9"
                />
              </div>

              {/* Quantidade de Munições */}
              <div className="space-y-1">
                <Label className="text-xs text-gray-300">Quantidade de Munições</Label>
                <Input
                  type="number"
                  value={ammoQuantity}
                  onChange={(e) => setAmmoQuantity(e.target.value)}
                  placeholder="Ex: 12"
                  className="bg-slate-900 border-slate-700 text-white text-sm h-9"
                />
              </div>

              {/* Tipo de Munição */}
              <div className="space-y-1">
                <Label className="text-xs text-gray-300">Tipo de Munição</Label>
                <Select value={ammoType} onValueChange={setAmmoType}>
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white text-sm h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700 text-white">
                    <SelectItem value="Intactas / Novas">Intactas / Novas</SelectItem>
                    <SelectItem value="De manejo/treino">De manejo / Treino</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Lote da Munição */}
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs text-gray-300">Lote da Munição (Opcional)</Label>
                <Input
                  value={ammoLot}
                  onChange={(e) => setAmmoLot(e.target.value)}
                  placeholder="Ex: CBC-LOT-987"
                  className="bg-slate-900 border-slate-700 text-white text-sm h-9"
                />
              </div>

              {/* Acessórios */}
              <div className="space-y-1">
                <Label className="text-xs text-gray-300">Acessórios Acautelados</Label>
                <Input
                  value={accessories}
                  onChange={(e) => setAccessories(e.target.value)}
                  placeholder="Ex: Coldre tático, Porta-carregador"
                  className="bg-slate-900 border-slate-700 text-white text-sm h-9"
                />
              </div>
            </div>
          </div>

          {/* Seção 3: Declaração de Inspeção Visual e Funcional */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3.5 sm:p-4 space-y-3">
            <h4 className="text-xs sm:text-sm font-semibold text-seguranca-yellow flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-seguranca-yellow" />
              3. Declaração de Inspeção Visual e Funcional
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Mecanismo */}
              <div
                onClick={() => setMecanismoDisparoOk(!mecanismoDisparoOk)}
                className={`p-3 rounded-lg border cursor-pointer select-none flex items-center justify-between ${
                  mecanismoDisparoOk ? 'bg-emerald-950/30 border-emerald-500/50' : 'bg-rose-950/30 border-rose-500/50'
                }`}
              >
                <div>
                  <span className="text-xs font-semibold block text-white">Mecanismo & Travas</span>
                  <span className="text-[11px] text-gray-400">Operando perfeitamente</span>
                </div>
                {mecanismoDisparoOk ? (
                  <Badge className="bg-emerald-600 text-white text-[10px]">Sim (OK)</Badge>
                ) : (
                  <Badge className="bg-rose-600 text-white text-[10px]">Não</Badge>
                )}
              </div>

              {/* Cano */}
              <div
                onClick={() => setCanoDesobstruidoOk(!canoDesobstruidoOk)}
                className={`p-3 rounded-lg border cursor-pointer select-none flex items-center justify-between ${
                  canoDesobstruidoOk ? 'bg-emerald-950/30 border-emerald-500/50' : 'bg-rose-950/30 border-rose-500/50'
                }`}
              >
                <div>
                  <span className="text-xs font-semibold block text-white">Cano da Arma</span>
                  <span className="text-[11px] text-gray-400">Desobstruído e limpo</span>
                </div>
                {canoDesobstruidoOk ? (
                  <Badge className="bg-emerald-600 text-white text-[10px]">Sim (OK)</Badge>
                ) : (
                  <Badge className="bg-rose-600 text-white text-[10px]">Não</Badge>
                )}
              </div>

              {/* Estado Geral */}
              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                <Label className="text-[11px] text-gray-300">Estado de Conservação</Label>
                <Select value={conservationState} onValueChange={setConservationState}>
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white text-xs h-7">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700 text-white">
                    <SelectItem value="Excelente">Excelente</SelectItem>
                    <SelectItem value="Bom">Bom</SelectItem>
                    <SelectItem value="Regular">Regular</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Seção 4: Resumo das 5 Cláusulas da Polícia Federal e CLT */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3.5 space-y-2 text-xs text-gray-300">
            <h4 className="font-semibold text-seguranca-yellow flex items-center gap-1.5 text-xs uppercase">
              <FileText className="w-3.5 h-3.5" /> 4. Obrigações, Regras da Polícia Federal e Responsabilidades
            </h4>
            <ol className="list-decimal pl-4 space-y-1 text-[11px] text-gray-400 leading-relaxed">
              <li><strong>Uso Restrito e Localizado:</strong> Armamento destinado exclusivamente ao uso em serviço no posto designado.</li>
              <li><strong>Guarda Seguro e Devolução:</strong> Devolução imediata ao término do turno à armaria ou cofre homologado pela PF.</li>
              <li><strong>Disparo de Arma de Fogo:</strong> Comunicação imediata ao plantão com confecção de relatório e BO.</li>
              <li><strong>Ocorrências (Furto/Roubo/Extravio):</strong> Boletim de ocorrência e comunicação à Polícia Federal em até 24h.</li>
              <li><strong>Indenização por Culpa/Dolo:</strong> Ressarcimento de danos por negligência nos termos do art. 462 da CLT e Lei 10.826/03.</li>
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

          {/* Registro Fotográfico (Foto Opcional) */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 sm:p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs sm:text-sm font-semibold text-seguranca-yellow flex items-center gap-2">
                <Camera className="w-4 h-4 text-seguranca-yellow" />
                Foto do Armamento / Inspeção (Opcional)
              </Label>
              <Badge variant="outline" className="text-[10px] border-slate-700 text-gray-400">
                Opcional
              </Badge>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              {photoBase64 ? (
                <div className="relative group w-full sm:w-48 h-36 rounded-lg overflow-hidden border border-slate-700 bg-black">
                  <img src={photoBase64} alt="Foto do Armamento" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setPhotoBase64('')}
                    className="absolute top-2 right-2 bg-rose-600 hover:bg-rose-700 text-white p-1.5 rounded-full shadow transition-all"
                    title="Remover Foto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <label className="w-full sm:w-48 h-28 sm:h-32 border-2 border-dashed border-slate-700 hover:border-seguranca-yellow rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all bg-slate-900/50 hover:bg-slate-900 text-gray-400 hover:text-white group">
                  <Camera className="w-6 h-6 mb-1 text-gray-400 group-hover:text-seguranca-yellow transition-colors" />
                  <span className="text-xs font-medium text-center px-2">Anexar ou Tirar Foto</span>
                  <span className="text-[10px] text-gray-500 text-center">JPG, PNG ou WEBP</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (evt) => {
                          if (evt.target?.result) {
                            setPhotoBase64(String(evt.target.result));
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
              )}
              
              <div className="text-xs text-gray-400 space-y-1 text-center sm:text-left flex-1">
                <p className="font-semibold text-gray-300">Registro visual do equipamento ou avaria:</p>
                <p>• Você pode tirar uma foto pela câmera do celular/tablet ou escolher da galeria.</p>
                <p>• A imagem será anexada ao relatório e incluída na guia em PDF se fornecida.</p>
              </div>
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
              placeholder="Anotações do armeiro, avarias pré-existentes ou detalhes operacionais..."
              className="bg-slate-950 border-slate-700 text-white text-xs min-h-[60px]"
            />
          </div>

          {/* Assinaturas Digitais Touch */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {/* Assinatura do Vigilante */}
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-gray-200 flex items-center gap-1.5">
                  <PenTool className="w-3.5 h-3.5 text-seguranca-yellow" />
                  Assinatura do(a) Vigilante
                </Label>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => clearCanvas(vigilanteCanvasRef, setHasVigilanteSignature)}
                  className="h-6 px-2 text-[11px] text-gray-400 hover:text-white"
                >
                  <Eraser className="w-3 h-3 mr-1" /> Limpar
                </Button>
              </div>
              <div className="border border-slate-700 rounded-lg overflow-hidden bg-white touch-none">
                <canvas
                  ref={vigilanteCanvasRef}
                  width={340}
                  height={110}
                  className="w-full h-[100px] cursor-crosshair"
                  onMouseDown={(e) => startDrawing(e, vigilanteCanvasRef, setIsDrawingVigilante, setHasVigilanteSignature)}
                  onMouseMove={(e) => draw(e, vigilanteCanvasRef, isDrawingVigilante)}
                  onMouseUp={() => stopDrawing(vigilanteCanvasRef, setIsDrawingVigilante)}
                  onMouseLeave={() => stopDrawing(vigilanteCanvasRef, setIsDrawingVigilante)}
                  onTouchStart={(e) => startDrawing(e, vigilanteCanvasRef, setIsDrawingVigilante, setHasVigilanteSignature)}
                  onTouchMove={(e) => draw(e, vigilanteCanvasRef, isDrawingVigilante)}
                  onTouchEnd={() => stopDrawing(vigilanteCanvasRef, setIsDrawingVigilante)}
                />
              </div>
              <p className="text-[11px] text-gray-400 text-center">
                {vigilanteName || 'Assine acima com o dedo ou mouse'}
              </p>
            </div>

            {/* Assinatura do Armeiro */}
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-gray-200 flex items-center gap-1.5">
                  <PenTool className="w-3.5 h-3.5 text-seguranca-yellow" />
                  Assinatura Armeiro / Responsável
                </Label>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => clearCanvas(armeiroCanvasRef, setHasArmeiroSignature)}
                  className="h-6 px-2 text-[11px] text-gray-400 hover:text-white"
                >
                  <Eraser className="w-3 h-3 mr-1" /> Limpar
                </Button>
              </div>
              <Input
                value={armeiroName}
                onChange={(e) => setArmeiroName(e.target.value)}
                placeholder="Nome do Armeiro / Responsável..."
                className="bg-slate-900 border-slate-700 text-white text-xs h-7 mb-1"
              />
              <div className="border border-slate-700 rounded-lg overflow-hidden bg-white touch-none">
                <canvas
                  ref={armeiroCanvasRef}
                  width={340}
                  height={110}
                  className="w-full h-[100px] cursor-crosshair"
                  onMouseDown={(e) => startDrawing(e, armeiroCanvasRef, setIsDrawingArmeiro, setHasArmeiroSignature)}
                  onMouseMove={(e) => draw(e, armeiroCanvasRef, isDrawingArmeiro)}
                  onMouseUp={() => stopDrawing(armeiroCanvasRef, setIsDrawingArmeiro)}
                  onMouseLeave={() => stopDrawing(armeiroCanvasRef, setIsDrawingArmeiro)}
                  onTouchStart={(e) => startDrawing(e, armeiroCanvasRef, setIsDrawingArmeiro, setHasArmeiroSignature)}
                  onTouchMove={(e) => draw(e, armeiroCanvasRef, isDrawingArmeiro)}
                  onTouchEnd={() => stopDrawing(armeiroCanvasRef, setIsDrawingArmeiro)}
                />
              </div>
              <p className="text-[11px] text-gray-400 text-center">
                {armeiroName || 'Assine acima'}
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
                    Salvando Termo...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Salvar Termo de Acautelamento
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
