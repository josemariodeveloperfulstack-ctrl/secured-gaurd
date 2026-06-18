import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { contractService, ContractAmendment, AmendmentTypeType } from '@/services/contractService';
import { isUuid } from '@/utils/uuid';
import { Loader2, Plus, Check, X, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const AMENDMENT_TYPES: { value: AmendmentTypeType; label: string }[] = [
  { value: 'INCLUSAO_POSTO', label: 'Inclusão de Posto' },
  { value: 'ALTERACAO_ESCALA', label: 'Alteração de Escala' },
  { value: 'REAJUSTE_EXTRAORDINARIO', label: 'Reajuste Extraordinário' },
  { value: 'REDUCAO_POSTO', label: 'Redução de Posto' },
  { value: 'MUDANCA_LOCAL', label: 'Mudança de Local' },
];

interface ContractAmendmentsTabProps {
  contractId: string;
  onAmendmentApproved?: () => void;
}

export const ContractAmendmentsTab: React.FC<ContractAmendmentsTabProps> = ({
  contractId,
  onAmendmentApproved
}) => {
  const { toast } = useToast();
  const [amendments, setAmendments] = useState<ContractAmendment[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    type: 'INCLUSAO_POSTO' as AmendmentTypeType,
    description: '',
    effectiveDate: '',
    financialImpact: ''
  });

  const loadAmendments = async () => {
    if (!isUuid(contractId)) return;
    setLoading(true);
    try {
      const data = await contractService.getAmendments(contractId);
      setAmendments(data);
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível carregar os aditivos.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAmendments();
  }, [contractId]);

  const handleCreate = async () => {
    if (!formData.type) {
      toast({ title: 'Campos obrigatórios', description: 'Selecione o tipo do aditivo.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await contractService.createAmendment(contractId, {
        type: formData.type,
        description: formData.description || undefined,
        effectiveDate: formData.effectiveDate || undefined,
        financialImpact: formData.financialImpact ? parseFloat(formData.financialImpact) : undefined
      });
      toast({ title: 'Sucesso', description: 'Aditivo criado com sucesso.' });
      setModalOpen(false);
      setFormData({ type: 'INCLUSAO_POSTO', description: '', effectiveDate: '', financialImpact: '' });
      loadAmendments();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.response?.data?.message || 'Não foi possível criar o aditivo.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (amendmentId: string) => {
    try {
      await contractService.approveAmendment(contractId, amendmentId);
      toast({ title: 'Sucesso', description: 'Aditivo aprovado.' });
      loadAmendments();
      onAmendmentApproved?.();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.response?.data?.message || 'Não foi possível aprovar.', variant: 'destructive' });
    }
  };

  const handleReject = async (amendmentId: string) => {
    try {
      await contractService.rejectAmendment(contractId, amendmentId);
      toast({ title: 'Sucesso', description: 'Aditivo rejeitado.' });
      loadAmendments();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.response?.data?.message || 'Não foi possível rejeitar.', variant: 'destructive' });
    }
  };

  const handleDelete = async (amendmentId: string) => {
    try {
      await contractService.deleteAmendment(contractId, amendmentId);
      toast({ title: 'Sucesso', description: 'Aditivo excluído.' });
      loadAmendments();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.response?.data?.message || 'Não foi possível excluir.', variant: 'destructive' });
    }
  };

  const formatCurrency = (n?: number) => n != null ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n) : '-';
  const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '-';

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-medium text-seguranca-lightgray">Aditivos</h4>
        <Button size="sm" onClick={() => setModalOpen(true)} className="bg-seguranca-red hover:bg-seguranca-darkred">
          <Plus className="h-4 w-4 mr-1" />
          Novo Aditivo
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-seguranca-yellow" />
        </div>
      ) : amendments.length === 0 ? (
        <p className="text-gray-400 text-sm py-4">Nenhum aditivo registrado.</p>
      ) : (
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {amendments.map((a) => (
            <div
              key={a.id}
              className="p-3 bg-seguranca-black border border-gray-600 rounded-lg"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-seguranca-lightgray">
                      {AMENDMENT_TYPES.find(t => t.value === a.type)?.label || a.type}
                    </span>
                    <Badge
                      variant={a.status === 'APPROVED' ? 'default' : a.status === 'REJECTED' ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {a.status === 'PENDING' ? 'Pendente' : a.status === 'APPROVED' ? 'Aprovado' : 'Rejeitado'}
                    </Badge>
                  </div>
                  {a.description && <p className="text-sm text-gray-400 mt-1">{a.description}</p>}
                  <div className="flex gap-4 mt-2 text-xs text-gray-500">
                    {a.effectiveDate && <span>Efetivo: {formatDate(a.effectiveDate)}</span>}
                    {a.financialImpact != null && <span>Impacto: {formatCurrency(a.financialImpact)}</span>}
                    {a.approvedByName && <span>Aprovado por: {a.approvedByName}</span>}
                  </div>
                </div>
                {a.status === 'PENDING' && (
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" className="text-green-500 border-green-500" onClick={() => handleApprove(a.id)}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" className="text-red-500 border-red-500" onClick={() => handleReject(a.id)}>
                      <X className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" className="text-gray-400" onClick={() => handleDelete(a.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-seguranca-graphite border-gray-600">
          <DialogHeader>
            <DialogTitle className="text-seguranca-lightgray">Novo Aditivo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tipo *</Label>
              <Select value={formData.type} onValueChange={(v) => setFormData(prev => ({ ...prev, type: v as AmendmentTypeType }))}>
                <SelectTrigger className="bg-seguranca-black border-gray-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AMENDMENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="bg-seguranca-black border-gray-600"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data Efetiva</Label>
                <Input
                  type="date"
                  value={formData.effectiveDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, effectiveDate: e.target.value }))}
                  className="bg-seguranca-black border-gray-600"
                />
              </div>
              <div>
                <Label>Impacto Financeiro (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.financialImpact}
                  onChange={(e) => setFormData(prev => ({ ...prev, financialImpact: e.target.value }))}
                  className="bg-seguranca-black border-gray-600"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreate} disabled={saving} className="bg-seguranca-red hover:bg-seguranca-darkred">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Criar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
