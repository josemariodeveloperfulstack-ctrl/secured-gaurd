import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { stockService } from '@/services/stockService';
import { employeeService, type Employee, type SimpleEmployee } from '@/services/employeeService';
import type { User } from '@/types/user';
import {
  MovementReason,
  MovementReasonLabels,
  StockItem,
  StockRequisitionDTO,
  StockRequisitionStatus,
  SignatureType,
} from '@/types/stock';
import SignaturePad from '@/components/SignaturePad';
import {
  ClipboardList,
  Download,
  FileSignature,
  Plus,
  Trash2,
  User as UserIcon,
  Package,
  Loader2,
  Building2,
  UserCheck,
  Edit,
} from 'lucide-react';

function formatRequesterContext(u: User | null): string {
  if (!u) return '—';
  const chunks: string[] = [];
  if (u.role) chunks.push(String(u.role).replace(/_/g, ' '));
  if (Array.isArray(u.roles) && u.roles.length > 0) {
    const names = u.roles
      .map((r) => (typeof r === 'string' ? r : (r as { name?: string }).name))
      .filter(Boolean) as string[];
    if (names.length) chunks.push(names.join(', '));
  }
  if (u.position) chunks.push(`Cargo (cadastro usuário): ${u.position}`);
  return chunks.length ? [...new Set(chunks)].join(' · ') : '—';
}

function workSectorFromSimpleEmployee(emp: SimpleEmployee): string {
  return [emp.departmentName, emp.workPostName, emp.positionName].filter(Boolean).join(' · ');
}

function workSectorFromEmployee(emp: Employee | null): string {
  if (!emp) return '';
  return [emp.department?.name, emp.workPost?.name, emp.position?.name].filter(Boolean).join(' · ');
}

const OUT_MOVEMENT_REASONS: MovementReason[] = [
  MovementReason.ENTREGA_INICIAL,
  MovementReason.REPOSICAO,
  MovementReason.TROCA,
  MovementReason.DESCARTE,
  MovementReason.PERDA,
  MovementReason.AJUSTE_SAIDA,
];

export interface StockRequisitionPrefill {
  employeeId?: string;
  lines: { stockItemId: string; quantity: number }[];
}

interface StockRequisitionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefill: StockRequisitionPrefill | null;
  /** Abre direto no detalhe (ex.: a partir da lista no Estoque) */
  initialRequisitionId?: string | null;
  /** Com `initialRequisitionId`: `edit` abre o formulário de alteração quando a requisição estiver pendente */
  initialOpenMode?: 'view' | 'edit';
  /** Chamado após criar, aprovar ou entregar (atualizar listagens) */
  onRecorded?: () => void;
}

type LineRow = { key: string; stockItemId: string; quantity: number };

const statusBadge = (s: StockRequisitionStatus) => {
  switch (s) {
    case StockRequisitionStatus.PENDING:
      return <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40">Pendente</Badge>;
    case StockRequisitionStatus.APPROVED:
      return <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40">Aprovada</Badge>;
    case StockRequisitionStatus.DELIVERED:
      return <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/40">Entregue</Badge>;
    default:
      return <Badge variant="outline">{s}</Badge>;
  }
};

const StockRequisitionModal: React.FC<StockRequisitionModalProps> = ({
  open,
  onOpenChange,
  prefill,
  initialRequisitionId = null,
  initialOpenMode = 'view',
  onRecorded,
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [employeeQuery, setEmployeeQuery] = useState('');
  const [workSectorDisplay, setWorkSectorDisplay] = useState('');
  const [employeeSuggestions, setEmployeeSuggestions] = useState<SimpleEmployee[]>([]);
  const [employeeSearchLoading, setEmployeeSearchLoading] = useState(false);
  const [employeeDropdownOpen, setEmployeeDropdownOpen] = useState(false);
  const [lastPickedEmployeeName, setLastPickedEmployeeName] = useState('');
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [items, setItems] = useState<StockItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [lines, setLines] = useState<LineRow[]>([{ key: '0', stockItemId: '', quantity: 1 }]);
  const [employeeId, setEmployeeId] = useState('');
  const [movementReason, setMovementReason] = useState<MovementReason>(MovementReason.ENTREGA_INICIAL);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState<StockRequisitionDTO | null>(null);
  const [deliverSigType, setDeliverSigType] = useState<SignatureType>(SignatureType.DIGITAL);
  const [digitalCaptured, setDigitalCaptured] = useState<string | null>(null);
  const [physicalAck, setPhysicalAck] = useState('');
  const [deliverLoading, setDeliverLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  /** Edição de requisição pendente (formulário igual ao de criação) */
  const [editMode, setEditMode] = useState(false);
  const [editingRequisitionId, setEditingRequisitionId] = useState<string | null>(null);

  const hydrateFromDetail = useCallback((d: StockRequisitionDTO) => {
    setEmployeeId(d.employeeId);
    setEmployeeQuery(d.employeeName || '');
    setWorkSectorDisplay(d.employeeWorkSector || '—');
    setLastPickedEmployeeName(d.employeeName || '');
    setMovementReason(d.movementReason);
    setNotes(d.notes || '');
    setLines(
      (d.lines || []).map((l, i) => ({
        key: l.id || `ln-${i}`,
        stockItemId: l.stockItemId,
        quantity: Math.max(1, l.quantity || 1),
      }))
    );
    if ((d.lines || []).length === 0) {
      setLines([{ key: '0', stockItemId: '', quantity: 1 }]);
    }
  }, []);

  const loadItems = useCallback(async () => {
    try {
      setItemsLoading(true);
      const data = await stockService.getAllItems();
      setItems(data || []);
    } catch (e: unknown) {
      console.error('Erro ao carregar itens de estoque:', e);
      setItems([]);
      toast({
        title: 'Itens de estoque',
        description: 'Não foi possível carregar a lista de itens do almoxarifado. Verifique a conexão ou tente fechar e abrir o formulário.',
        variant: 'destructive',
      });
    } finally {
      setItemsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!open) {
      setEditMode(false);
      setEditingRequisitionId(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    void loadItems();
    setDigitalCaptured(null);
    setPhysicalAck('');
    setDeliverSigType(SignatureType.DIGITAL);

    if (initialRequisitionId) {
      setDetail(null);
      setEditMode(false);
      setEditingRequisitionId(null);
      setEmployeeQuery('');
      setWorkSectorDisplay('');
      setLastPickedEmployeeName('');
      setEmployeeSuggestions([]);
      (async () => {
        try {
          setDetailLoading(true);
          const d = await stockService.getStockRequisition(initialRequisitionId);
          if (initialOpenMode === 'edit' && d.status === StockRequisitionStatus.PENDING) {
            hydrateFromDetail(d);
            setEditingRequisitionId(d.id);
            setEditMode(true);
            setDetail(null);
          } else {
            setDetail(d);
          }
        } catch (e: any) {
          toast({
            title: 'Erro ao carregar requisição',
            description: e?.response?.data?.error || e?.message,
            variant: 'destructive',
          });
          setDetail(null);
        } finally {
          setDetailLoading(false);
        }
      })();
      return;
    }

    setDetail(null);
    const p = prefill;
    setEmployeeSuggestions([]);
    setEmployeeDropdownOpen(false);
    setLastPickedEmployeeName('');
    if (p) {
      setEmployeeId(p.employeeId ?? '');
      if (p.employeeId) {
        void employeeService.getEmployeeById(p.employeeId).then((emp) => {
          if (emp) {
            setEmployeeQuery(emp.name || '');
            setWorkSectorDisplay(workSectorFromEmployee(emp));
            setLastPickedEmployeeName(emp.name || '');
          }
        });
      } else {
        setEmployeeQuery('');
        setWorkSectorDisplay('');
      }
      if (p.lines.length > 0) {
        setLines(
          p.lines.map((l, i) => ({
            key: String(i),
            stockItemId: l.stockItemId,
            quantity: Math.max(1, l.quantity),
          }))
        );
      } else {
        setLines([{ key: '0', stockItemId: '', quantity: 1 }]);
      }
    } else {
      setEmployeeId('');
      setEmployeeQuery('');
      setWorkSectorDisplay('');
      setLines([{ key: '0', stockItemId: '', quantity: 1 }]);
    }
    setMovementReason(MovementReason.ENTREGA_INICIAL);
    setNotes('');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- toast estável; evitar reexecuções desnecessárias
  }, [open, initialRequisitionId, initialOpenMode, prefill, loadItems, hydrateFromDetail]);

  useEffect(() => {
    if (!open) return;
    const blockingDetailView = Boolean(initialRequisitionId && detail && !editMode);
    if (blockingDetailView || detailLoading) return;
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    const q = employeeQuery.trim();
    if (q.length < 3) {
      setEmployeeSuggestions([]);
      setEmployeeSearchLoading(false);
      return;
    }
    searchDebounceRef.current = setTimeout(() => {
      void (async () => {
        try {
          setEmployeeSearchLoading(true);
          const list = await employeeService.searchSimpleEmployees(q);
          setEmployeeSuggestions(Array.isArray(list) ? list : []);
          setEmployeeDropdownOpen(true);
        } catch {
          setEmployeeSuggestions([]);
        } finally {
          setEmployeeSearchLoading(false);
        }
      })();
    }, 320);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [employeeQuery, open, initialRequisitionId, detail, editMode, detailLoading]);

  const onEmployeeInputChange = (v: string) => {
    setEmployeeQuery(v);
    if (lastPickedEmployeeName && v.trim() !== lastPickedEmployeeName.trim()) {
      setEmployeeId('');
      setWorkSectorDisplay('');
      setLastPickedEmployeeName('');
    }
  };

  const pickEmployee = (emp: SimpleEmployee) => {
    setEmployeeId(emp.id);
    setEmployeeQuery(emp.name);
    setWorkSectorDisplay(workSectorFromSimpleEmployee(emp) || '—');
    setLastPickedEmployeeName(emp.name);
    setEmployeeSuggestions([]);
    setEmployeeDropdownOpen(false);
  };

  const addLine = () => {
    setLines((prev) => [...prev, { key: `${Date.now()}`, stockItemId: '', quantity: 1 }]);
  };

  const removeLine = (key: string) => {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.key !== key)));
  };

  const updateLine = (key: string, patch: Partial<LineRow>) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  };

  const handleSaveRequisition = async () => {
    if (!employeeId) {
      toast({ title: 'Funcionário obrigatório', variant: 'destructive' });
      return;
    }
    const validLines = lines.filter((l) => l.stockItemId && l.quantity >= 1);
    if (validLines.length === 0) {
      toast({ title: 'Inclua ao menos um item', variant: 'destructive' });
      return;
    }
    const payload = {
      employeeId,
      movementReason,
      notes: notes || undefined,
      lines: validLines.map((l) => ({ stockItemId: l.stockItemId, quantity: l.quantity })),
    };
    const updateId = editingRequisitionId ?? (editMode && detail?.status === StockRequisitionStatus.PENDING ? detail.id : null);
    try {
      setSaving(true);
      if (updateId) {
        const dto = await stockService.updateStockRequisition(updateId, payload);
        setDetail(dto);
        setEditMode(false);
        setEditingRequisitionId(null);
        onRecorded?.();
        toast({ title: 'Requisição atualizada', description: `Nº ${dto.requisitionNumber}` });
      } else {
        const dto = await stockService.createStockRequisition(payload);
        setDetail(dto);
        onRecorded?.();
        toast({ title: 'Requisição criada', description: `Nº ${dto.requisitionNumber}` });
      }
    } catch (e: any) {
      toast({
        title: updateId ? 'Erro ao atualizar requisição' : 'Erro ao criar requisição',
        description: e?.response?.data?.error || e?.message || 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!detail) return;
    try {
      setSaving(true);
      const d = await stockService.approveStockRequisition(detail.id);
      setDetail(d);
      onRecorded?.();
      toast({ title: 'Requisição aprovada' });
    } catch (e: any) {
      toast({
        title: 'Não foi possível aprovar',
        description: e?.response?.data?.error || e?.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePdf = async () => {
    if (!detail) return;
    try {
      await stockService.downloadStockRequisitionPdf(detail.id, detail.requisitionNumber);
    } catch (e: any) {
      toast({
        title: 'Erro ao gerar PDF',
        description: e?.response?.data?.error || e?.message,
        variant: 'destructive',
      });
    }
  };

  const handleDeliver = async () => {
    if (!detail) return;
    if (deliverSigType === SignatureType.DIGITAL && (!digitalCaptured || digitalCaptured.length < 20)) {
      toast({ title: 'Assinatura digital', description: 'Capture a assinatura no quadro abaixo.', variant: 'destructive' });
      return;
    }
    try {
      setDeliverLoading(true);
      const d = await stockService.deliverStockRequisition(detail.id, {
        signatureType: deliverSigType,
        digitalSignature:
          deliverSigType === SignatureType.DIGITAL && digitalCaptured ? digitalCaptured : undefined,
        physicalAcknowledgment: deliverSigType === SignatureType.PHYSICAL ? physicalAck || undefined : undefined,
      });
      setDetail(d);
      onRecorded?.();
      toast({
        title: 'Assinatura registrada',
        description: `Recebimento confirmado. A assinatura do funcionário foi gravada na requisição e nas movimentações (${user?.name || 'usuário logado'}).`,
      });
    } catch (e: any) {
      toast({
        title: 'Erro ao registrar assinatura',
        description: e?.response?.data?.error || e?.message,
        variant: 'destructive',
      });
    } finally {
      setDeliverLoading(false);
    }
  };

  const showCreateLikeForm =
    !detailLoading &&
    ((!initialRequisitionId && !detail) ||
      (editMode &&
        (Boolean(editingRequisitionId) || detail?.status === StockRequisitionStatus.PENDING)));

  const showDetail = Boolean(detail) && !detailLoading && !editMode;
  const showLoadError = Boolean(initialRequisitionId) && !detailLoading && !detail && !editMode;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-seguranca-graphite border-gray-600 text-white sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-seguranca-red/20 border border-seguranca-red/30">
              <ClipboardList className="h-5 w-5 text-seguranca-red" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-white">
                {editMode ? 'Editar requisição' : 'Gerar requisição'}
              </DialogTitle>
              <DialogDescription className="text-gray-400 text-sm">
                Itens, motivo, aprovação, PDF e entrega com assinatura (digital ou física).
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {detailLoading && (
          <div className="flex items-center justify-center gap-2 py-12 text-gray-400">
            <Loader2 className="h-6 w-6 animate-spin" />
            Carregando requisição...
          </div>
        )}

        {showLoadError && (
          <p className="text-center text-red-400 py-8 text-sm">
            Não foi possível carregar esta requisição.
          </p>
        )}

        {showCreateLikeForm ? (
          <div className="space-y-4 pt-2">
            <div className="rounded-lg border border-gray-600/40 bg-seguranca-black/25 p-3 space-y-2 text-sm">
              <div className="flex items-start gap-2 text-gray-300">
                <UserCheck className="h-4 w-4 text-seguranca-yellow shrink-0 mt-0.5" />
                <div>
                  <p className="text-gray-400 text-xs uppercase tracking-wide">Solicitante (usuário logado)</p>
                  <p className="text-white font-medium">{user?.name || user?.username || '—'}</p>
                  <p className="text-gray-400 mt-1">
                    <span className="text-gray-500">Função / perfis: </span>
                    {formatRequesterContext(user)}
                  </p>
                </div>
              </div>
              <div className="border-t border-gray-600/30 pt-2 flex items-start gap-2 text-gray-300">
                <UserIcon className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-gray-400 text-xs uppercase tracking-wide">Aprovador da requisição</p>
                  <p className="text-gray-300">
                    Após o envio, um usuário com perfil de <strong className="text-white">Gestor, Administrador, RH, Departamento Pessoal, Financeiro, Estoque ou Almoxarifado</strong> pode aprovar. Na aprovação o estoque é baixado automaticamente.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2 relative">
              <Label className="text-gray-300 flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-seguranca-red" />
                Funcionário solicitante *
              </Label>
              <p className="text-xs text-gray-500">Digite pelo menos 3 caracteres do nome, matrícula ou documento para buscar.</p>
              <Input
                autoComplete="off"
                value={employeeQuery}
                onChange={(e) => onEmployeeInputChange(e.target.value)}
                onFocus={() => {
                  if (employeeQuery.trim().length >= 3 && employeeSuggestions.length > 0) {
                    setEmployeeDropdownOpen(true);
                  }
                }}
                onBlur={() => {
                  setTimeout(() => setEmployeeDropdownOpen(false), 180);
                }}
                placeholder="Ex.: José, 12345, CPF..."
                className="bg-seguranca-black/50 border-gray-600/30 text-white"
              />
              {employeeSearchLoading && (
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Buscando...
                </p>
              )}
              {employeeDropdownOpen && employeeSuggestions.length > 0 && (
                <ul className="absolute z-50 mt-1 max-h-52 w-full overflow-auto rounded-md border border-gray-600 bg-seguranca-graphite shadow-lg">
                  {employeeSuggestions.map((emp) => (
                    <li key={emp.id}>
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm text-white hover:bg-seguranca-black/80 border-b border-gray-700/50 last:border-0"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => pickEmployee(emp)}
                      >
                        <span className="font-medium">{emp.name}</span>
                        {emp.document ? (
                          <span className="text-gray-400"> — {emp.document}</span>
                        ) : null}
                        {emp.registrationNumber ? (
                          <span className="text-gray-500 text-xs block">Mat.: {emp.registrationNumber}</span>
                        ) : null}
                        {(emp.departmentName || emp.workPostName) && (
                          <span className="text-gray-500 text-xs block">
                            {[emp.departmentName, emp.workPostName].filter(Boolean).join(' · ')}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {employeeQuery.trim().length >= 3 &&
                !employeeSearchLoading &&
                employeeSuggestions.length === 0 &&
                !(
                  employeeId &&
                  lastPickedEmployeeName &&
                  employeeQuery.trim() === lastPickedEmployeeName.trim()
                ) && (
                <p className="text-xs text-amber-200/80">Nenhum funcionário encontrado para este termo.</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-seguranca-red" />
                Setor de trabalho (do funcionário)
              </Label>
              <div className="rounded-md border border-gray-600/40 bg-seguranca-black/30 px-3 py-2 text-sm text-gray-300 min-h-[40px]">
                {employeeId
                  ? workSectorDisplay && workSectorDisplay !== '—'
                    ? workSectorDisplay
                    : 'Sem setor/posto/cargo cadastrado no momento.'
                  : 'Selecione o funcionário acima para carregar o setor.'}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Motivo (saída) *</Label>
              <Select value={movementReason} onValueChange={(v) => setMovementReason(v as MovementReason)}>
                <SelectTrigger className="bg-seguranca-black/50 border-gray-600/30 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-seguranca-graphite border-gray-600">
                  {OUT_MOVEMENT_REASONS.map((r) => (
                    <SelectItem key={r} value={r} className="text-white">
                      {MovementReasonLabels[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-gray-300 flex items-center gap-2">
                  <Package className="h-4 w-4 text-seguranca-red" />
                  Itens solicitados
                </Label>
                <Button type="button" size="sm" variant="outline" className="border-gray-600" onClick={addLine}>
                  <Plus className="h-4 w-4 mr-1" />
                  Linha
                </Button>
              </div>
              {itemsLoading && <p className="text-sm text-gray-400">Carregando itens...</p>}
              <div className="space-y-2">
                {lines.map((row) => (
                  <div key={row.key} className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end">
                    <div className="flex-1 space-y-1">
                      <Select
                        value={row.stockItemId || undefined}
                        onValueChange={(v) => updateLine(row.key, { stockItemId: v })}
                      >
                        <SelectTrigger className="bg-seguranca-black/50 border-gray-600/30 text-white">
                          <SelectValue placeholder="Item" />
                        </SelectTrigger>
                        <SelectContent className="bg-seguranca-graphite border-gray-600 max-h-60">
                          {items.map((it) => (
                            <SelectItem key={it.id} value={it.id} className="text-white text-xs sm:text-sm">
                              {it.code} — {it.fullName} (est: {it.currentQuantity})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Input
                      type="number"
                      min={1}
                      className="w-full sm:w-24 bg-seguranca-black/50 border-gray-600/30 text-white"
                      value={row.quantity}
                      onChange={(e) =>
                        updateLine(row.key, { quantity: Math.max(1, Number.parseInt(e.target.value, 10) || 1) })
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-gray-400 hover:text-red-400 shrink-0"
                      onClick={() => removeLine(row.key)}
                      disabled={lines.length <= 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Observações</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observações da requisição..."
                rows={2}
                className="bg-seguranca-black/50 border-gray-600/30 text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" className="border-gray-600" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
              {editMode && (
                <Button
                  type="button"
                  variant="outline"
                  className="border-gray-600"
                  onClick={() => {
                    setEditMode(false);
                    setEditingRequisitionId(null);
                    if (initialRequisitionId) {
                      void (async () => {
                        try {
                          setDetailLoading(true);
                          const d = await stockService.getStockRequisition(initialRequisitionId);
                          setDetail(d);
                        } catch {
                          setDetail(null);
                        } finally {
                          setDetailLoading(false);
                        }
                      })();
                    }
                  }}
                >
                  Cancelar edição
                </Button>
              )}
              <Button
                className="bg-seguranca-red hover:bg-seguranca-darkred"
                onClick={handleSaveRequisition}
                disabled={saving}
              >
                {saving ? 'Salvando...' : editMode ? 'Salvar alterações' : 'Salvar requisição'}
              </Button>
            </div>
          </div>
        ) : showDetail ? (
          <div className="space-y-4 pt-2">
            <div className="flex flex-wrap items-center gap-2 justify-between">
              <div>
                <p className="text-sm text-gray-400">Número</p>
                <p className="font-mono text-seguranca-yellow">{detail!.requisitionNumber}</p>
              </div>
              {statusBadge(detail!.status)}
            </div>

            <div className="rounded-lg border border-gray-600/40 bg-seguranca-black/30 p-3 text-sm space-y-1">
              <p>
                <span className="text-gray-400">Funcionário: </span>
                {detail!.employeeName}
                {detail!.employeeDocument ? ` — ${detail!.employeeDocument}` : ''}
              </p>
              <p>
                <span className="text-gray-400">Motivo: </span>
                {detail!.movementReasonLabel || MovementReasonLabels[detail!.movementReason]}
              </p>
              {detail!.requestedByName && (
                <p>
                  <span className="text-gray-400">Solicitado por: </span>
                  {detail!.requestedByName}
                </p>
              )}
              {detail!.employeeWorkSector && (
                <p>
                  <span className="text-gray-400">Setor de trabalho (snapshot): </span>
                  {detail!.employeeWorkSector}
                </p>
              )}
              {detail!.createdAt && (
                <p>
                  <span className="text-gray-400">Data da requisição: </span>
                  {new Date(detail!.createdAt).toLocaleString('pt-BR')}
                </p>
              )}
              {detail!.status === StockRequisitionStatus.PENDING && !detail!.approvedByName && (
                <p className="text-amber-200/90">
                  <span className="text-gray-400">Aprovador: </span>
                  Pendente — aguardando aprovação (perfis autorizados: Gestor, Admin, RH, DP, Financeiro, Estoque, Almoxarifado).
                </p>
              )}
              {detail!.approvedByName && (
                <p>
                  <span className="text-gray-400">Aprovado por: </span>
                  {detail!.approvedByName}
                  {detail!.approvedAt ? ` em ${new Date(detail!.approvedAt).toLocaleString('pt-BR')}` : ''}
                </p>
              )}
              {detail!.status !== StockRequisitionStatus.PENDING && detail!.approvedAt && (
                <p className="text-emerald-200/90 text-xs">
                  Itens <strong>baixados do estoque</strong> no momento da aprovação
                  {detail!.approvedAt ? ` (${new Date(detail!.approvedAt).toLocaleString('pt-BR')})` : ''}.
                </p>
              )}
              {detail!.status === StockRequisitionStatus.DELIVERED && (
                <>
                  <p>
                    <span className="text-gray-400">Assinatura do funcionário registrada em: </span>
                    {detail!.deliveredAt ? new Date(detail.deliveredAt).toLocaleString('pt-BR') : '—'}
                  </p>
                  <p>
                    <span className="text-gray-400">Registrado por (usuário): </span>
                    {detail!.deliveredByName || '—'}
                  </p>
                  <p className="text-gray-500 text-xs pt-1">
                    A assinatura fica nesta requisição e é replicada nas <strong className="text-gray-400">movimentações de saída</strong> vinculadas ao número{' '}
                    <span className="font-mono text-seguranca-yellow/90">{detail!.requisitionNumber}</span> (consulte a aba Movimentações no Estoque).
                  </p>
                  {detail!.signatureType === SignatureType.DIGITAL && detail!.hasDigitalSignature && (
                    <p className="text-gray-400 text-xs">Tipo: assinatura digital capturada no sistema.</p>
                  )}
                  {detail!.signatureType === SignatureType.PHYSICAL && (
                    <p className="text-gray-400 text-xs">
                      Tipo: assinatura física
                      {detail!.physicalSignatureAck ? ` — ${detail!.physicalSignatureAck}` : ''}.
                    </p>
                  )}
                </>
              )}
            </div>

            <div>
              <p className="text-sm text-gray-400 mb-2">Itens</p>
              <ul className="text-sm space-y-1 border border-gray-600/30 rounded-md p-2 max-h-40 overflow-y-auto">
                {detail!.lines.map((l) => (
                  <li key={l.id || l.stockItemId} className="flex justify-between gap-2 min-w-0">
                    <span className="truncate min-w-0 flex-1">{l.stockItemFullName || l.stockItemCode}</span>
                    <span className="text-seguranca-yellow shrink-0">×{l.quantity}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-wrap gap-2">
              {detail!.status === StockRequisitionStatus.PENDING && (
                <Button
                  type="button"
                  variant="outline"
                  className="border-seguranca-yellow/50 text-seguranca-yellow gap-2"
                  onClick={() => {
                    hydrateFromDetail(detail!);
                    setEditingRequisitionId(detail!.id);
                    setEditMode(true);
                  }}
                >
                  <Edit className="h-4 w-4" />
                  Editar
                </Button>
              )}
              {detail!.status === StockRequisitionStatus.PENDING && (
                <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleApprove} disabled={saving}>
                  Aprovar requisição
                </Button>
              )}
              {(detail!.status === StockRequisitionStatus.APPROVED ||
                detail!.status === StockRequisitionStatus.DELIVERED) && (
                <Button variant="outline" className="border-gray-600 gap-2" onClick={handlePdf}>
                  <Download className="h-4 w-4" />
                  Gerar PDF (assinatura)
                </Button>
              )}
            </div>

            {detail!.status === StockRequisitionStatus.APPROVED && (
              <div className="border-t border-gray-600/40 pt-4 space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <FileSignature className="h-4 w-4 text-seguranca-red" />
                  <span>
                    <strong className="text-white">Assinatura do funcionário solicitante</strong> — o estoque já foi baixado na aprovação. Capture abaixo a assinatura de quem retirou o material (digital no quadro ou registro de assinatura física). Quem opera o sistema:{' '}
                    <strong className="text-white">{user?.name || user?.username || '—'}</strong>
                  </span>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">Tipo de assinatura na entrega</Label>
                  <Select
                    value={deliverSigType}
                    onValueChange={(v) => {
                      setDeliverSigType(v as SignatureType);
                      setDigitalCaptured(null);
                    }}
                  >
                    <SelectTrigger className="bg-seguranca-black/50 border-gray-600/30 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-seguranca-graphite border-gray-600">
                      <SelectItem value={SignatureType.DIGITAL} className="text-white">
                        Digital (no sistema)
                      </SelectItem>
                      <SelectItem value={SignatureType.PHYSICAL} className="text-white">
                        Física (PDF impresso / registro)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {deliverSigType === SignatureType.DIGITAL && (
                  <div className="bg-white/95 rounded-lg p-2">
                    <SignaturePad onSave={(b64) => setDigitalCaptured(b64)} />
                  </div>
                )}
                {deliverSigType === SignatureType.PHYSICAL && (
                  <div className="space-y-2">
                    <Label className="text-gray-300">Registro da conferência (opcional)</Label>
                    <Textarea
                      value={physicalAck}
                      onChange={(e) => setPhysicalAck(e.target.value)}
                      placeholder="Ex.: Termo assinado em papel arquivado sob nº..."
                      rows={2}
                      className="bg-seguranca-black/50 border-gray-600/30 text-white"
                    />
                  </div>
                )}
                <Button
                  className="w-full bg-seguranca-red hover:bg-seguranca-darkred"
                  onClick={handleDeliver}
                  disabled={deliverLoading}
                >
                  {deliverLoading ? 'Processando...' : 'Confirmar recebimento e salvar assinatura'}
                </Button>
              </div>
            )}

            <Button type="button" variant="ghost" className="w-full text-gray-400" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

export default StockRequisitionModal;
