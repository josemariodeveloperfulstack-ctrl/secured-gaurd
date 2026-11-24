import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
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
  Eye,
  Search,
  CheckCircle2,
  AlertTriangle,
  Shield,
  Check,
  X,
  FileText,
  Printer,
  ChevronRight,
  ShieldAlert,
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
  if (u.position) chunks.push(`Cargo: ${u.position}`);
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
  MovementReason.AJUSTE_SAIDA,
  MovementReason.DESCARTE,
  MovementReason.PERDA,
];

const REASON_DETAILED_LABELS: Record<MovementReason, string> = {
  [MovementReason.ENTREGA_INICIAL]: '🛡️ Entrega de EPI / Inicial (Baixa no Estoque)',
  [MovementReason.REPOSICAO]: '🔄 Reposição de EPI (Baixa no Estoque)',
  [MovementReason.TROCA]: '🔁 Troca de EPI (Baixa no Estoque)',
  [MovementReason.AJUSTE_SAIDA]: '📦 Ajuste de Estoque - Saída',
  [MovementReason.DESCARTE]: '⚠️ Descarte / Avaria',
  [MovementReason.PERDA]: '❌ Perda / Extravio',
  [MovementReason.COMPRA]: 'Compra/Fornecimento',
  [MovementReason.DEVOLUCAO]: 'Devolução',
  [MovementReason.AJUSTE_ENTRADA]: 'Ajuste de Estoque - Entrada',
};

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

type LineRow = {
  key: string;
  stockItemId: string;
  quantity: number;
  itemData?: StockItem;
};

const statusBadge = (s: StockRequisitionStatus) => {
  switch (s) {
    case StockRequisitionStatus.PENDING:
      return <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 font-medium">Pendente</Badge>;
    case StockRequisitionStatus.APPROVED:
      return <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-medium">Aprovada (Estoque Baixado)</Badge>;
    case StockRequisitionStatus.DELIVERED:
      return <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/40 font-medium">Entregue e Assinada</Badge>;
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

  // Funcionário
  const [employeeQuery, setEmployeeQuery] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<SimpleEmployee | null>(null);
  const [employeeId, setEmployeeId] = useState('');
  const [workSectorDisplay, setWorkSectorDisplay] = useState('');
  const [employeeSuggestions, setEmployeeSuggestions] = useState<SimpleEmployee[]>([]);
  const [employeeSearchLoading, setEmployeeSearchLoading] = useState(false);
  const [employeeDropdownOpen, setEmployeeDropdownOpen] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Itens de estoque
  const [items, setItems] = useState<StockItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemSearchTerm, setItemSearchTerm] = useState('');
  const [selectedStockItemId, setSelectedStockItemId] = useState('');
  const [selectedItemQuantity, setSelectedItemQuantity] = useState(1);
  const [lines, setLines] = useState<LineRow[]>([]);

  // Motivo e opções
  const [movementReason, setMovementReason] = useState<MovementReason>(MovementReason.ENTREGA_INICIAL);
  const [notes, setNotes] = useState('');
  const [sendToEpiForm, setSendToEpiForm] = useState(true);
  const [signedOnManualSheet, setSignedOnManualSheet] = useState(true);
  const [autoApprove, setAutoApprove] = useState(true);

  // Estados de controle e detalhe
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState<StockRequisitionDTO | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deliverSigType, setDeliverSigType] = useState<SignatureType>(SignatureType.PHYSICAL);
  const [digitalCaptured, setDigitalCaptured] = useState<string | null>(null);
  const [physicalAck, setPhysicalAck] = useState('Item assinado na ficha manual impressa');
  const [deliverLoading, setDeliverLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  // Edição
  const [editMode, setEditMode] = useState(false);
  const [editingRequisitionId, setEditingRequisitionId] = useState<string | null>(null);

  const itemsRef = useRef<StockItem[]>([]);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const loadItems = useCallback(async (force = false) => {
    if (!force && itemsRef.current.length > 0) {
      return;
    }
    try {
      setItemsLoading(true);
      const data = await stockService.getAllItems();
      const list = Array.isArray(data) ? data : [];
      setItems(list);
      itemsRef.current = list;
    } catch (e: unknown) {
      console.error('Erro ao carregar itens de estoque:', e);
      setItems([]);
    } finally {
      setItemsLoading(false);
    }
  }, []);

  const hydrateFromDetail = useCallback(
    (d: StockRequisitionDTO) => {
      setEmployeeId(d.employeeId);
      setEmployeeQuery(d.employeeName || '');
      setWorkSectorDisplay(d.employeeWorkSector || '—');
      setMovementReason(d.movementReason);
      setNotes(d.notes || '');
      const rehydratedLines: LineRow[] = (d.lines || []).map((l, i) => {
        const matchingItem = itemsRef.current.find((it) => it.id === l.stockItemId);
        return {
          key: l.id || `ln-${i}-${Date.now()}`,
          stockItemId: l.stockItemId,
          quantity: Math.max(1, l.quantity || 1),
          itemData: matchingItem,
        };
      });
      setLines(rehydratedLines);
    },
    []
  );

  useEffect(() => {
    if (!open) {
      setEditMode(false);
      setEditingRequisitionId(null);
      setDetail(null);
    }
  }, [open]);

  // Carregar itens do almoxarifado apenas uma vez ao abrir o modal
  useEffect(() => {
    if (open) {
      void loadItems();
    }
  }, [open, loadItems]);

  // Inicialização e preenchimento do formulário ao abrir
  useEffect(() => {
    if (!open) return;

    setDigitalCaptured(null);
    setPhysicalAck('Item assinado na ficha manual impressa');
    setDeliverSigType(SignatureType.PHYSICAL);

    if (initialRequisitionId) {
      setDetail(null);
      setEditMode(false);
      setEditingRequisitionId(null);
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
    setEmployeeSuggestions([]);
    setEmployeeDropdownOpen(false);

    if (prefill) {
      setEmployeeId(prefill.employeeId ?? '');
      if (prefill.employeeId) {
        void employeeService.getEmployeeById(prefill.employeeId).then((emp) => {
          if (emp) {
            setSelectedEmployee(emp as unknown as SimpleEmployee);
            setEmployeeQuery(emp.name || '');
            setWorkSectorDisplay(workSectorFromEmployee(emp));
          }
        });
      } else {
        setSelectedEmployee(null);
        setEmployeeQuery('');
        setWorkSectorDisplay('');
      }
      if (prefill.lines && prefill.lines.length > 0) {
        const validPrefillLines = prefill.lines.filter((l) => l.stockItemId);
        if (validPrefillLines.length > 0) {
          setLines(
            validPrefillLines.map((l, i) => ({
              key: `prefill-${i}-${Date.now()}`,
              stockItemId: l.stockItemId,
              quantity: Math.max(1, l.quantity),
            }))
          );
        } else {
          setLines([]);
        }
      } else {
        setLines([]);
      }
    } else {
      setSelectedEmployee(null);
      setEmployeeId('');
      setEmployeeQuery('');
      setWorkSectorDisplay('');
      setLines([]);
    }
    setMovementReason(MovementReason.ENTREGA_INICIAL);
    setNotes('');
    setSendToEpiForm(true);
    setSignedOnManualSheet(true);
    setAutoApprove(true);
  }, [open, initialRequisitionId, initialOpenMode]);

  // Busca rápida de funcionário com debounce
  useEffect(() => {
    if (!open) return;
    if (employeeId) return;
    if (initialRequisitionId && detail && !editMode) return;
    if (detailLoading) return;

    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    const q = employeeQuery.trim();
    if (q.length < 1) {
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
    }, 250);

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [employeeQuery, open, initialRequisitionId, detail, editMode, detailLoading]);

  const pickEmployee = (emp: SimpleEmployee) => {
    setSelectedEmployee(emp);
    setEmployeeId(emp.id);
    setEmployeeQuery(emp.name);
    setWorkSectorDisplay(workSectorFromSimpleEmployee(emp) || 'Sem setor/posto cadastrado.');
    setEmployeeSuggestions([]);
    setEmployeeDropdownOpen(false);
  };

  const clearEmployee = () => {
    setSelectedEmployee(null);
    setEmployeeId('');
    setEmployeeQuery('');
    setWorkSectorDisplay('');
    setEmployeeSuggestions([]);
    setEmployeeDropdownOpen(false);
  };

  // Filtragem de itens do estoque para o campo de busca/seleção
  const filteredStockItems = useMemo(() => {
    if (!itemSearchTerm.trim()) return items;
    const term = itemSearchTerm.toLowerCase().trim();
    return items.filter(
      (it) =>
        (it.fullName && it.fullName.toLowerCase().includes(term)) ||
        (it.code && it.code.toLowerCase().includes(term)) ||
        (it.ca && it.ca.toLowerCase().includes(term))
    );
  }, [items, itemSearchTerm]);

  // Adicionar item selecionado à lista de itens solicitados
  const handleAddItemToRequisition = () => {
    if (!selectedStockItemId) {
      toast({ title: 'Selecione um item', description: 'Escolha um item do estoque para adicionar.', variant: 'destructive' });
      return;
    }
    const foundItem = items.find((it) => it.id === selectedStockItemId);
    if (!foundItem) return;

    const existingIndex = lines.findIndex((l) => l.stockItemId === selectedStockItemId);
    if (existingIndex >= 0) {
      setLines((prev) =>
        prev.map((l, i) =>
          i === existingIndex
            ? { ...l, quantity: l.quantity + selectedItemQuantity, itemData: foundItem }
            : l
        )
      );
      toast({
        title: 'Quantidade atualizada',
        description: `Adicionado +${selectedItemQuantity} ao item ${foundItem.fullName}.`,
      });
    } else {
      setLines((prev) => [
        ...prev,
        {
          key: `item-${Date.now()}-${Math.random()}`,
          stockItemId: selectedStockItemId,
          quantity: Math.max(1, selectedItemQuantity),
          itemData: foundItem,
        },
      ]);
    }

    // Reset seleção
    setSelectedStockItemId('');
    setSelectedItemQuantity(1);
    setItemSearchTerm('');
  };

  const removeLine = (key: string) => {
    setLines((prev) => prev.filter((l) => l.key !== key));
  };

  const updateLineQuantity = (key: string, qty: number) => {
    setLines((prev) =>
      prev.map((l) => (l.key === key ? { ...l, quantity: Math.max(1, qty) } : l))
    );
  };

  // Salvar requisição (com opção de download ou visualização imediata do PDF)
  const handleSaveRequisition = async (action: 'save' | 'pdf' | 'preview' = 'save') => {
    if (!employeeId) {
      toast({ title: 'Funcionário obrigatório', description: 'Pesquise e selecione o funcionário solicitante.', variant: 'destructive' });
      return;
    }
    const validLines = lines.filter((l) => l.stockItemId && l.quantity >= 1);
    if (validLines.length === 0) {
      toast({ title: 'Inclua ao menos um item', description: 'Selecione e adicione ao menos um item de estoque.', variant: 'destructive' });
      return;
    }

    const payload = {
      employeeId,
      movementReason,
      notes: notes
        ? `${notes}${signedOnManualSheet ? ' (Item entregue e assinado na ficha manual impressa)' : ''}`
        : signedOnManualSheet
        ? 'Item entregue e assinado na ficha manual impressa'
        : undefined,
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
        toast({ title: 'Requisição atualizada com sucesso', description: `Nº ${dto.requisitionNumber}` });

        if (action === 'pdf') {
          await stockService.downloadStockRequisitionPdf(dto.id, dto.requisitionNumber);
        } else if (action === 'preview') {
          await stockService.previewStockRequisitionPdf(dto.id);
        }
      } else {
        // Criação de requisição
        let dto = await stockService.createStockRequisition(payload);

        // Se a opção de aprovação imediata estiver ativa:
        if (autoApprove) {
          try {
            dto = await stockService.approveStockRequisition(dto.id);

            // Se também estiver marcado como assinado na ficha manual impressa:
            if (sendToEpiForm && signedOnManualSheet) {
              try {
                dto = await stockService.deliverStockRequisition(dto.id, {
                  signatureType: SignatureType.PHYSICAL,
                  physicalAcknowledgment: 'Item recebido e assinado na ficha manual impressa de EPI',
                });
              } catch (deliverErr) {
                console.warn('Entrega automática pós-aprovação:', deliverErr);
              }
            }
          } catch (apprErr: any) {
            console.error('Erro na aprovação automática:', apprErr);
            toast({
              title: 'Requisição criada, porém pendente de aprovação',
              description: apprErr?.response?.data?.error || 'A aprovação pode ser feita manualmente.',
              variant: 'default',
            });
          }
        }

        setDetail(dto);
        onRecorded?.();

        if (action === 'pdf') {
          try {
            await stockService.downloadStockRequisitionPdf(dto.id, dto.requisitionNumber);
            toast({
              title: 'Requisição criada e PDF gerado!',
              description: `Nº ${dto.requisitionNumber} — Download do PDF iniciado para impressão.`,
            });
          } catch (pdfErr) {
            console.error('Erro ao baixar PDF:', pdfErr);
            toast({
              title: 'Requisição salva com sucesso!',
              description: `Nº ${dto.requisitionNumber}. Utilize o botão de PDF abaixo para baixar.`,
            });
          }
        } else if (action === 'preview') {
          try {
            await stockService.previewStockRequisitionPdf(dto.id);
          } catch (previewErr) {
            console.error('Erro ao visualizar PDF:', previewErr);
          }
        } else {
          toast({
            title: autoApprove ? 'Requisição criada e aprovada!' : 'Requisição criada com sucesso!',
            description: `Nº ${dto.requisitionNumber} — Estoque atualizado no almoxarifado.`,
          });
        }
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
      toast({ title: 'Requisição aprovada!', description: 'Estoque baixado no almoxarifado e ficha de EPI atualizada.' });
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

  const handleDownloadPdf = async () => {
    if (!detail) return;
    try {
      setPdfLoading(true);
      await stockService.downloadStockRequisitionPdf(detail.id, detail.requisitionNumber);
      toast({ title: 'PDF gerado com sucesso', description: 'O download foi iniciado.' });
    } catch (e: any) {
      toast({
        title: 'Erro ao gerar PDF',
        description: e?.response?.data?.error || e?.message || 'Verifique a conexão.',
        variant: 'destructive',
      });
    } finally {
      setPdfLoading(false);
    }
  };

  const handlePreviewPdf = async () => {
    if (!detail) return;
    try {
      setPdfLoading(true);
      await stockService.previewStockRequisitionPdf(detail.id);
    } catch (e: any) {
      toast({
        title: 'Erro ao visualizar PDF',
        description: e?.response?.data?.error || e?.message || 'Não foi possível abrir a visualização.',
        variant: 'destructive',
      });
    } finally {
      setPdfLoading(false);
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
        physicalAcknowledgment:
          deliverSigType === SignatureType.PHYSICAL ? physicalAck || 'Assinado na ficha manual impressa' : undefined,
      });
      setDetail(d);
      onRecorded?.();
      toast({
        title: 'Assinatura registrada',
        description: `Recebimento confirmado. Registrado na requisição e na ficha de EPI.`,
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
      (editMode && (Boolean(editingRequisitionId) || detail?.status === StockRequisitionStatus.PENDING)));

  const showDetail = Boolean(detail) && !detailLoading && !editMode;
  const showLoadError = Boolean(initialRequisitionId) && !detailLoading && !detail && !editMode;

  const totalUnits = useMemo(() => lines.reduce((acc, l) => acc + (l.quantity || 1), 0), [lines]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-full sm:max-w-2xl lg:max-w-3xl max-h-[92vh] overflow-y-auto bg-seguranca-graphite border-zinc-700 text-white p-4 sm:p-6 shadow-2xl rounded-2xl">
        {/* Cabeçalho */}
        <DialogHeader className="pb-3 border-b border-zinc-700/60">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-seguranca-red/20 border border-seguranca-red/40 text-seguranca-red shadow-inner">
                <ClipboardList className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                  {editMode ? 'Editar Requisição' : showDetail ? 'Detalhes da Requisição' : 'Gerar Requisição de Estoque / EPI'}
                </DialogTitle>
                <DialogDescription className="text-zinc-400 text-xs sm:text-sm mt-0.5">
                  Saída de estoque, ficha de EPI, assinatura física ou digital e geração de PDF para impressão.
                </DialogDescription>
              </div>
            </div>
            {showDetail && detail && (
              <div className="hidden sm:block">
                {statusBadge(detail.status)}
              </div>
            )}
          </div>
        </DialogHeader>

        {/* Loading geral do detalhe */}
        {detailLoading && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-zinc-400">
            <Loader2 className="h-8 w-8 animate-spin text-seguranca-yellow" />
            <p className="text-sm">Carregando dados da requisição...</p>
          </div>
        )}

        {showLoadError && (
          <div className="text-center py-10 space-y-3">
            <AlertTriangle className="h-10 w-10 text-red-400 mx-auto" />
            <p className="text-red-300 font-medium text-sm">Não foi possível carregar as informações desta requisição.</p>
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="border-zinc-700">
              Fechar
            </Button>
          </div>
        )}

        {/* ======================================================== */}
        {/* FORMULÁRIO DE CRIAÇÃO / EDIÇÃO                           */}
        {/* ======================================================== */}
        {showCreateLikeForm ? (
          <div className="space-y-5 pt-3">
            {/* Contexto do Solicitante */}
            <div className="rounded-xl border border-zinc-700/60 bg-seguranca-black/40 p-3 sm:p-4 text-xs sm:text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 text-zinc-300">
                <UserCheck className="h-4 w-4 text-seguranca-yellow shrink-0" />
                <div>
                  <span className="text-zinc-400 text-xs uppercase tracking-wider block">Solicitante (Usuário Logado)</span>
                  <span className="text-white font-medium">{user?.name || user?.username || '—'}</span>
                  <span className="text-zinc-400 ml-2 hidden sm:inline">({formatRequesterContext(user)})</span>
                </div>
              </div>
              <Badge variant="outline" className="border-zinc-700 text-zinc-300 self-start sm:self-auto text-xs">
                {formatRequesterContext(user)}
              </Badge>
            </div>

            {/* SEÇÃO 1: FUNCIONÁRIO & SETOR DE TRABALHO */}
            <div className="rounded-xl border border-zinc-700/70 bg-zinc-900/60 p-4 space-y-4">
              <div className="flex items-center gap-2 text-white font-semibold text-sm sm:text-base border-b border-zinc-800 pb-2">
                <UserIcon className="h-4 w-4 text-seguranca-red" />
                <span>1. Funcionário Solicitante & Setor</span>
              </div>

              {/* Se funcionário já selecionado, exibe card elegante com opção de trocar */}
              {employeeId && selectedEmployee ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 text-white">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center font-bold text-emerald-300 shrink-0">
                      {selectedEmployee.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-white flex items-center gap-2">
                        {selectedEmployee.name}
                        <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px] py-0">
                          Selecionado
                        </Badge>
                      </div>
                      <div className="text-xs text-zinc-400 flex flex-wrap gap-2 mt-0.5">
                        {selectedEmployee.document && <span>CPF: {selectedEmployee.document}</span>}
                        {selectedEmployee.registrationNumber && (
                          <span>Matrícula: {selectedEmployee.registrationNumber}</span>
                        )}
                        {selectedEmployee.companyName && <span>Empresa: {selectedEmployee.companyName}</span>}
                      </div>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearEmployee}
                    className="text-zinc-400 hover:text-red-400 hover:bg-red-950/30 self-end sm:self-center text-xs"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Trocar Funcionário
                  </Button>
                </div>
              ) : (
                /* Campo de busca rápida de funcionário com autocomplete */
                <div className="space-y-2 relative">
                  <Label className="text-zinc-300 font-medium flex items-center justify-between text-xs sm:text-sm">
                    <span>Buscar Funcionário *</span>
                    <span className="text-[11px] text-zinc-400">Digite nome, CPF ou matrícula</span>
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                    <Input
                      autoComplete="off"
                      value={employeeQuery}
                      onChange={(e) => setEmployeeQuery(e.target.value)}
                      onFocus={() => {
                        if (employeeSuggestions.length > 0) setEmployeeDropdownOpen(true);
                      }}
                      placeholder="Ex.: José, João Silva, 12345, CPF..."
                      className="pl-9 bg-seguranca-black/60 border-zinc-700 text-white placeholder:text-zinc-500 min-h-[42px]"
                    />
                    {employeeSearchLoading && (
                      <div className="absolute right-3 top-3">
                        <Loader2 className="h-4 w-4 animate-spin text-seguranca-yellow" />
                      </div>
                    )}
                  </div>

                  {/* Dropdown com os resultados da pesquisa */}
                  {employeeDropdownOpen && employeeSuggestions.length > 0 && (
                    <div className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl divide-y divide-zinc-800">
                      {employeeSuggestions.map((emp) => (
                        <button
                          key={emp.id}
                          type="button"
                          className="w-full text-left p-3 hover:bg-zinc-800/80 transition-colors flex items-center justify-between gap-3 text-white"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => pickEmployee(emp)}
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-sm text-white truncate">{emp.name}</p>
                            <div className="flex flex-wrap gap-2 text-xs text-zinc-400 mt-0.5">
                              {emp.document && <span>CPF: {emp.document}</span>}
                              {emp.registrationNumber && <span>Mat.: {emp.registrationNumber}</span>}
                              {(emp.departmentName || emp.workPostName) && (
                                <span className="text-zinc-500">
                                  {[emp.departmentName, emp.workPostName].filter(Boolean).join(' · ')}
                                </span>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-zinc-500 shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}

                  {employeeQuery.trim().length >= 2 && !employeeSearchLoading && employeeSuggestions.length === 0 && !employeeId && (
                    <p className="text-xs text-amber-300/90 flex items-center gap-1.5 pt-1">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Nenhum funcionário encontrado para "{employeeQuery}".
                    </p>
                  )}
                </div>
              )}

              {/* Setor de trabalho - preenchido automaticamente */}
              <div className="space-y-1.5">
                <Label className="text-zinc-300 font-medium flex items-center gap-2 text-xs sm:text-sm">
                  <Building2 className="h-4 w-4 text-seguranca-yellow" />
                  Setor de Trabalho (Preenchimento Automático)
                </Label>
                <div className="rounded-xl border border-zinc-700/60 bg-seguranca-black/40 px-3.5 py-2.5 text-xs sm:text-sm text-zinc-300 min-h-[42px] flex items-center">
                  {employeeId ? (
                    workSectorDisplay && workSectorDisplay !== '—' ? (
                      <span className="font-medium text-white">{workSectorDisplay}</span>
                    ) : (
                      <span className="text-amber-300/80">Sem setor/posto cadastrado no perfil do colaborador.</span>
                    )
                  ) : (
                    <span className="text-zinc-500 italic">Selecione o funcionário acima para carregar o setor de trabalho.</span>
                  )}
                </div>
              </div>
            </div>

            {/* SEÇÃO 2: MOTIVO DA SAÍDA */}
            <div className="rounded-xl border border-zinc-700/70 bg-zinc-900/60 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-zinc-200 font-semibold text-sm flex items-center gap-2">
                  <Package className="h-4 w-4 text-seguranca-red" />
                  Motivo da Saída do Almoxarifado *
                </Label>
                <Badge variant="outline" className="border-emerald-500/40 text-emerald-300 text-[11px]">
                  Baixa Automática no Estoque
                </Badge>
              </div>

              <Select value={movementReason} onValueChange={(v) => setMovementReason(v as MovementReason)}>
                <SelectTrigger className="bg-seguranca-black/60 border-zinc-700 text-white min-h-[42px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700 text-white">
                  {OUT_MOVEMENT_REASONS.map((r) => (
                    <SelectItem key={r} value={r} className="text-white hover:bg-zinc-800">
                      {REASON_DETAILED_LABELS[r] || MovementReasonLabels[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* SEÇÃO 3: BUSCA E ADIÇÃO DINÂMICA DE ITENS DO ESTOQUE */}
            <div className="rounded-xl border border-zinc-700/70 bg-zinc-900/60 p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <div className="flex items-center gap-2 text-white font-semibold text-sm sm:text-base">
                  <Package className="h-4 w-4 text-seguranca-red" />
                  <span>2. Itens Solicitados do Estoque</span>
                </div>
                <Badge variant="outline" className="border-zinc-700 text-zinc-300 text-xs">
                  {lines.length} item(ns) · {totalUnits} unid.
                </Badge>
              </div>

              {/* Seletor & Adicionador de Itens */}
              <div className="bg-seguranca-black/50 p-3 sm:p-4 rounded-xl border border-zinc-700/60 space-y-3">
                <Label className="text-xs sm:text-sm font-medium text-zinc-300">
                  Buscar Item no Almoxarifado para Adicionar:
                </Label>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  {/* Select do Item */}
                  <div className="sm:col-span-8 space-y-1">
                    <Select
                      value={selectedStockItemId}
                      onValueChange={(v) => setSelectedStockItemId(v)}
                    >
                      <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white min-h-[42px] truncate">
                        <SelectValue placeholder={itemsLoading ? 'Carregando almoxarifado...' : 'Selecione o item de estoque / EPI'} />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-700 text-white max-h-72 max-w-[95vw] sm:max-w-md">
                        {/* Campo de filtro rápido interno */}
                        <div className="p-2 border-b border-zinc-800 sticky top-0 bg-zinc-900 z-10">
                          <Input
                            placeholder="Filtrar por nome, código ou CA..."
                            value={itemSearchTerm}
                            onChange={(e) => setItemSearchTerm(e.target.value)}
                            className="bg-black/40 border-zinc-700 text-xs text-white h-8"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        {filteredStockItems.length === 0 ? (
                          <div className="p-4 text-xs text-zinc-400 text-center">Nenhum item encontrado.</div>
                        ) : (
                          filteredStockItems.map((it) => (
                            <SelectItem key={it.id} value={it.id} className="text-white hover:bg-zinc-800 text-xs py-2">
                              <div className="flex flex-col">
                                <span className="font-semibold text-white">{it.code} — {it.fullName}</span>
                                <span className="text-[11px] text-zinc-400">
                                  Saldo: <strong className={it.currentQuantity > 0 ? 'text-emerald-400' : 'text-red-400'}>{it.currentQuantity}</strong>
                                  {it.ca ? ` · CA: ${it.ca}` : ''}
                                  {it.category ? ` · ${it.category}` : ''}
                                </span>
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Quantidade */}
                  <div className="sm:col-span-2 space-y-1">
                    <Label className="text-xs text-zinc-400">Qtd</Label>
                    <Input
                      type="number"
                      min={1}
                      value={selectedItemQuantity}
                      onChange={(e) => setSelectedItemQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="bg-zinc-900 border-zinc-700 text-white min-h-[42px] text-center font-bold"
                    />
                  </div>

                  {/* Botão Adicionar */}
                  <div className="sm:col-span-2">
                    <Button
                      type="button"
                      className="w-full bg-seguranca-red hover:bg-seguranca-darkred text-white min-h-[42px] font-semibold text-xs sm:text-sm"
                      onClick={handleAddItemToRequisition}
                      disabled={!selectedStockItemId}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar
                    </Button>
                  </div>
                </div>
              </div>

              {/* Lista dos Itens Selecionados */}
              <div className="space-y-2">
                <Label className="text-xs text-zinc-400 uppercase tracking-wider block">
                  Itens Selecionados para Esta Requisição ({lines.length}):
                </Label>

                {lines.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-zinc-700/80 rounded-xl p-4 text-zinc-500 text-xs sm:text-sm space-y-1">
                    <Package className="h-8 w-8 mx-auto opacity-40 text-zinc-400" />
                    <p className="font-medium text-zinc-400">Nenhum item adicionado ainda.</p>
                    <p className="text-xs text-zinc-500">Selecione um item no campo acima e clique em "Adicionar".</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {lines.map((row, idx) => {
                      const itemData = row.itemData || items.find((it) => it.id === row.stockItemId);
                      const isLowStock = itemData && itemData.currentQuantity < row.quantity;

                      return (
                        <div
                          key={row.key || idx}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-zinc-700/60 bg-seguranca-black/40 hover:border-zinc-600 transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="border-zinc-700 text-zinc-300 font-mono text-xs">
                                {itemData?.code || 'ITEM'}
                              </Badge>
                              <span className="font-semibold text-white text-sm truncate">
                                {itemData?.fullName || 'Item de Estoque'}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2 text-xs text-zinc-400 mt-1">
                              {itemData?.ca && <span>CA: {itemData.ca}</span>}
                              {itemData && (
                                <span>
                                  Saldo Almoxarifado:{' '}
                                  <strong className={itemData.currentQuantity >= row.quantity ? 'text-emerald-400' : 'text-red-400'}>
                                    {itemData.currentQuantity}
                                  </strong>
                                </span>
                              )}
                              {isLowStock && (
                                <Badge className="bg-red-500/20 text-red-300 border-red-500/30 text-[10px] py-0">
                                  Saldo insuficiente
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Controles de quantidade e remoção */}
                          <div className="flex items-center gap-2 self-end sm:self-center">
                            <div className="flex items-center border border-zinc-700 rounded-lg overflow-hidden bg-zinc-900">
                              <button
                                type="button"
                                className="px-2.5 py-1 text-zinc-400 hover:text-white hover:bg-zinc-800 text-sm font-bold"
                                onClick={() => updateLineQuantity(row.key, row.quantity - 1)}
                              >
                                -
                              </button>
                              <span className="px-3 py-1 text-white font-mono font-bold text-sm">
                                {row.quantity}
                              </span>
                              <button
                                type="button"
                                className="px-2.5 py-1 text-zinc-400 hover:text-white hover:bg-zinc-800 text-sm font-bold"
                                onClick={() => updateLineQuantity(row.key, row.quantity + 1)}
                              >
                                +
                              </button>
                            </div>

                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-zinc-400 hover:text-red-400 hover:bg-red-950/30 h-8 w-8"
                              onClick={() => removeLine(row.key)}
                              title="Remover item"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* SEÇÃO 4: FICHA DE EPI & ASSINATURA MANUAL IMPRESSA */}
            <div className="rounded-xl border border-seguranca-yellow/40 bg-zinc-900/60 p-4 space-y-3.5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <Label className="text-white font-semibold flex items-center gap-2 text-sm sm:text-base">
                    <Shield className="h-4 w-4 text-seguranca-yellow" />
                    Enviar para a Ficha de EPI do Funcionário
                  </Label>
                  <p className="text-xs text-zinc-400">
                    Cria ou atualiza automaticamente o histórico na Ficha Oficial de EPI do colaborador.
                  </p>
                </div>
                <Switch checked={sendToEpiForm} onCheckedChange={setSendToEpiForm} />
              </div>

              {sendToEpiForm && (
                <div className="pt-3 border-t border-zinc-800 space-y-2">
                  <div className="flex items-start gap-3 bg-seguranca-black/40 p-3 rounded-lg border border-zinc-700/50">
                    <Checkbox
                      id="manual-sig-sheet"
                      checked={signedOnManualSheet}
                      onCheckedChange={(c) => setSignedOnManualSheet(Boolean(c))}
                      className="mt-0.5"
                    />
                    <div className="grid gap-1 leading-normal">
                      <label htmlFor="manual-sig-sheet" className="text-xs sm:text-sm font-medium text-white cursor-pointer">
                        Item assinado na Ficha Manual Impressa (papel)
                      </label>
                      <p className="text-xs text-zinc-400">
                        Ao marcar esta opção, você informa que o funcionário recebeu o item e assinou a ficha física impressa.
                        A coluna de assinatura registrará: <span className="text-emerald-400 font-semibold">"Assinado na ficha manual impressa"</span>.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* SEÇÃO 5: APROVAÇÃO OPCIONAL & BAIXA IMEDIATA */}
            <div className="rounded-xl border border-zinc-700/70 bg-zinc-900/60 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <Label className="text-white font-semibold flex items-center gap-2 text-sm sm:text-base">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  Aprovação da Requisição (Opcional)
                </Label>
                <p className="text-xs text-zinc-400">
                  {autoApprove
                    ? 'Aprovação direta: Baixa o estoque do almoxarifado de imediato e libera o PDF pronto para anexar.'
                    : 'Ficará como Pendente para validação e aprovação posterior do gestor.'}
                </p>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <span className="text-xs text-zinc-400 font-medium">{autoApprove ? 'Aprovar Já' : 'Pendente'}</span>
                <Switch checked={autoApprove} onCheckedChange={setAutoApprove} />
              </div>
            </div>

            {/* SEÇÃO 6: OBSERVAÇÕES */}
            <div className="space-y-1.5">
              <Label className="text-zinc-300 font-medium text-xs sm:text-sm">Observações da Requisição</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex.: Entrega extraordinária, substituição por desgaste, anotações de turno..."
                rows={2}
                className="bg-seguranca-black/60 border-zinc-700 text-white placeholder:text-zinc-500 text-xs sm:text-sm"
              />
            </div>

            {/* BOTÕES DE AÇÃO */}
            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2.5 pt-3 border-t border-zinc-800">
              <Button
                type="button"
                variant="outline"
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 min-h-[42px] px-4"
                onClick={() => onOpenChange(false)}
              >
                Fechar
              </Button>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                {editMode && (
                  <Button
                    type="button"
                    variant="outline"
                    className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 min-h-[42px]"
                    onClick={() => {
                      setEditMode(false);
                      setEditingRequisitionId(null);
                    }}
                  >
                    Cancelar Edição
                  </Button>
                )}

                {/* Botão de Visualizar Requisição (PDF) */}
                <Button
                  type="button"
                  variant="outline"
                  className="border-seguranca-yellow/50 text-seguranca-yellow hover:bg-seguranca-yellow/10 min-h-[42px] font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5"
                  onClick={() => handleSaveRequisition('preview')}
                  disabled={saving}
                  title="Visualizar a requisição em PDF"
                >
                  <Eye className="h-4 w-4 shrink-0 text-seguranca-yellow" />
                  <span>Visualizar Requisição (PDF)</span>
                </Button>

                {/* Botão de Gerar Requisição em PDF */}
                <Button
                  type="button"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white min-h-[42px] font-semibold text-xs sm:text-sm px-4 shadow-md flex items-center justify-center gap-1.5"
                  onClick={() => handleSaveRequisition('pdf')}
                  disabled={saving}
                  title="Gerar e baixar o PDF da requisição para anexar à ficha física"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 shrink-0" />
                  )}
                  <span>Gerar Requisição em PDF</span>
                </Button>

                {/* Botão Salvar Requisição */}
                <Button
                  type="button"
                  className="bg-seguranca-red hover:bg-seguranca-darkred text-white min-h-[42px] font-semibold text-xs sm:text-sm px-5 shadow-lg flex items-center justify-center gap-1.5"
                  onClick={() => handleSaveRequisition('save')}
                  disabled={saving}
                  title="Salvar requisição no sistema"
                >
                  {saving ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processando...
                    </span>
                  ) : editMode ? (
                    'Salvar Alterações'
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span>Salvar Requisição</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        ) : showDetail && detail ? (
          /* ======================================================== */
          /* TELA DE DETALHES DA REQUISIÇÃO (VISUALIZAÇÃO / PDF)     */
          /* ======================================================== */
          <div className="space-y-5 pt-3">
            {/* Cabeçalho do Detalhe com Status e Ações de PDF */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-zinc-700/80 bg-zinc-900/80">
              <div>
                <span className="text-xs text-zinc-400 uppercase tracking-wider block">Número da Requisição</span>
                <span className="font-mono text-lg sm:text-xl font-bold text-seguranca-yellow">
                  {detail.requisitionNumber}
                </span>
                <div className="text-xs text-zinc-400 mt-0.5">
                  Registrada em: {new Date(detail.createdAt).toLocaleString('pt-BR')}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {statusBadge(detail.status)}
              </div>
            </div>

            {/* Card com Detalhes do Funcionário e Setor */}
            <div className="rounded-xl border border-zinc-700/60 bg-seguranca-black/40 p-4 space-y-2.5 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-zinc-400 text-xs block">Funcionário:</span>
                  <span className="font-semibold text-white text-sm sm:text-base">{detail.employeeName}</span>
                  {detail.employeeDocument && (
                    <span className="text-zinc-400 text-xs block">CPF: {detail.employeeDocument}</span>
                  )}
                </div>

                <div>
                  <span className="text-zinc-400 text-xs block">Motivo da Saída:</span>
                  <span className="font-medium text-emerald-300">
                    {detail.movementReasonLabel || MovementReasonLabels[detail.movementReason]}
                  </span>
                </div>

                <div className="sm:col-span-2">
                  <span className="text-zinc-400 text-xs block">Setor de Trabalho Registrado:</span>
                  <span className="font-medium text-zinc-200">
                    {detail.employeeWorkSector || '—'}
                  </span>
                </div>

                {detail.requestedByName && (
                  <div>
                    <span className="text-zinc-400 text-xs block">Solicitado por (Usuário):</span>
                    <span className="text-zinc-300">{detail.requestedByName}</span>
                  </div>
                )}

                {detail.approvedByName && (
                  <div>
                    <span className="text-zinc-400 text-xs block">Aprovado por:</span>
                    <span className="text-emerald-400 font-medium">
                      {detail.approvedByName}
                      {detail.approvedAt ? ` em ${new Date(detail.approvedAt).toLocaleString('pt-BR')}` : ''}
                    </span>
                  </div>
                )}
              </div>

              {detail.notes && (
                <div className="pt-2 border-t border-zinc-800">
                  <span className="text-zinc-400 text-xs block">Observações:</span>
                  <p className="text-zinc-300 italic">{detail.notes}</p>
                </div>
              )}
            </div>

            {/* Lista dos Itens da Requisição */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-semibold text-zinc-300 flex items-center gap-1.5">
                  <Package className="h-4 w-4 text-seguranca-red" />
                  Itens Requisitados ({detail.lines?.length || 0})
                </span>
                <span className="text-xs text-zinc-400">
                  Total: {detail.lines?.reduce((sum, l) => sum + (l.quantity || 1), 0)} unidades
                </span>
              </div>

              <div className="rounded-xl border border-zinc-700/60 bg-seguranca-black/30 overflow-hidden divide-y divide-zinc-800">
                {detail.lines?.map((line, idx) => (
                  <div key={line.id || idx} className="p-3 flex items-center justify-between text-xs sm:text-sm gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-white truncate">
                        {line.stockItemFullName || line.stockItemCode}
                      </div>
                      <div className="text-xs text-zinc-400 font-mono">
                        Código: {line.stockItemCode}
                      </div>
                    </div>
                    <Badge variant="outline" className="border-seguranca-yellow/50 text-seguranca-yellow font-bold text-sm shrink-0">
                      ×{line.quantity}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* SEÇÃO DE AÇÕES RÁPIDAS: PDF & VISUALIZAÇÃO */}
            <div className="rounded-xl border border-zinc-700/70 bg-zinc-900/60 p-4 space-y-3">
              <span className="text-xs sm:text-sm font-semibold text-white flex items-center gap-2">
                <FileText className="h-4 w-4 text-seguranca-yellow" />
                Documento & Impressão da Requisição
              </span>
              <p className="text-xs text-zinc-400">
                Gere o documento oficial em PDF para anexar à ficha manual impressa ou guardar no prontuário do colaborador.
              </p>

              <div className="flex flex-wrap gap-2.5 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  className="border-zinc-700 text-white hover:bg-zinc-800 gap-2 min-h-[40px] text-xs sm:text-sm"
                  onClick={handlePreviewPdf}
                  disabled={pdfLoading}
                >
                  <Eye className="h-4 w-4 text-seguranca-yellow" />
                  Visualizar Requisição (PDF)
                </Button>

                <Button
                  type="button"
                  className="bg-seguranca-red hover:bg-seguranca-darkred text-white gap-2 min-h-[40px] text-xs sm:text-sm"
                  onClick={handleDownloadPdf}
                  disabled={pdfLoading}
                >
                  <Download className="h-4 w-4" />
                  Gerar Requisição em PDF
                </Button>

                {detail.status === StockRequisitionStatus.PENDING && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-amber-500/50 text-amber-300 hover:bg-amber-950/30 gap-2 min-h-[40px] text-xs sm:text-sm"
                      onClick={() => {
                        hydrateFromDetail(detail);
                        setEditingRequisitionId(detail.id);
                        setEditMode(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                      Editar
                    </Button>

                    <Button
                      type="button"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 min-h-[40px] text-xs sm:text-sm"
                      onClick={handleApprove}
                      disabled={saving}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Aprovar Requisição
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Se Aprovada mas não entregue: Seção de assinatura */}
            {detail.status === StockRequisitionStatus.APPROVED && (
              <div className="rounded-xl border border-zinc-700/80 bg-zinc-900/60 p-4 space-y-3.5">
                <div className="flex items-center gap-2 text-white font-semibold text-sm">
                  <FileSignature className="h-4 w-4 text-seguranca-red" />
                  <span>Confirmação de Recebimento / Assinatura</span>
                </div>
                <p className="text-xs text-zinc-400">
                  O estoque já foi baixado no almoxarifado. Confirme o recebimento pelo funcionário (digital ou registro de assinatura física).
                </p>

                <div className="space-y-2">
                  <Label className="text-xs text-zinc-300">Tipo de Assinatura</Label>
                  <Select
                    value={deliverSigType}
                    onValueChange={(v) => {
                      setDeliverSigType(v as SignatureType);
                      setDigitalCaptured(null);
                    }}
                  >
                    <SelectTrigger className="bg-seguranca-black/60 border-zinc-700 text-white min-h-[40px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-700 text-white">
                      <SelectItem value={SignatureType.PHYSICAL} className="text-white hover:bg-zinc-800">
                        Física (Assinado na Ficha Manual Impressa em Papel)
                      </SelectItem>
                      <SelectItem value={SignatureType.DIGITAL} className="text-white hover:bg-zinc-800">
                        Digital (Assinar na Tela)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {deliverSigType === SignatureType.DIGITAL && (
                  <div className="bg-white rounded-xl p-2">
                    <SignaturePad onSave={(b64) => setDigitalCaptured(b64)} />
                  </div>
                )}

                {deliverSigType === SignatureType.PHYSICAL && (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-zinc-300">Registro da Conferência / Ficha Manual</Label>
                    <Input
                      value={physicalAck}
                      onChange={(e) => setPhysicalAck(e.target.value)}
                      placeholder="Ex.: Item assinado na ficha manual impressa nº..."
                      className="bg-seguranca-black/60 border-zinc-700 text-white min-h-[40px] text-xs sm:text-sm"
                    />
                  </div>
                )}

                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white min-h-[42px] font-semibold text-xs sm:text-sm"
                  onClick={handleDeliver}
                  disabled={deliverLoading}
                >
                  {deliverLoading ? 'Registrando...' : 'Confirmar Recebimento e Gravar Assinatura'}
                </Button>
              </div>
            )}

            {/* Se Entregue */}
            {detail.status === StockRequisitionStatus.DELIVERED && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 text-xs sm:text-sm text-emerald-200 space-y-1">
                <div className="font-semibold flex items-center gap-1.5 text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" />
                  Entrega Concluída e Assinada
                </div>
                <p className="text-zinc-400">
                  Assinatura registrada em {detail.deliveredAt ? new Date(detail.deliveredAt).toLocaleString('pt-BR') : '—'} por {detail.deliveredByName || '—'}.
                  {detail.physicalSignatureAck && ` (${detail.physicalSignatureAck})`}
                </p>
              </div>
            )}

            {/* Botão de Fechar */}
            <div className="flex justify-end pt-2 border-t border-zinc-800">
              <Button
                type="button"
                variant="outline"
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 min-h-[40px] px-6"
                onClick={() => onOpenChange(false)}
              >
                Fechar
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

export default StockRequisitionModal;
