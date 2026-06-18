import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { salesGoalService, SalesGoal, CreateSalesGoalRequest } from '@/services/salesGoalService';
import { userService } from '@/services/userService';
import { Plus, Edit, Trash2, Target, Loader2 } from 'lucide-react';

export default function SalesGoalManager() {
  const { toast } = useToast();
  const [goals, setGoals] = useState<SalesGoal[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SalesGoal | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());

  const [formData, setFormData] = useState<CreateSalesGoalRequest>({
    userId: undefined,
    type: 'REVENUE',
    targetValue: 0,
    period: 'MONTHLY',
    referenceMonth: new Date().getMonth() + 1,
    referenceYear: new Date().getFullYear(),
    description: '',
  });

  useEffect(() => {
    loadData();
  }, [filterYear]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [goalsData, usersData] = await Promise.all([
        salesGoalService.getAll(parseInt(filterYear)),
        userService.getUsersForSelect(),
      ]);
      setGoals(goalsData);
      setUsers(usersData.map((u: any) => ({ id: u.id, name: u.name || u.username })));
    } catch (error) {
      console.error('Erro ao carregar metas:', error);
      toast({ title: 'Erro', description: 'Falha ao carregar metas.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingGoal(null);
    setFormData({
      userId: undefined,
      type: 'REVENUE',
      targetValue: 0,
      period: 'MONTHLY',
      referenceMonth: new Date().getMonth() + 1,
      referenceYear: new Date().getFullYear(),
      description: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (goal: SalesGoal) => {
    setEditingGoal(goal);
    setFormData({
      userId: goal.userId || undefined,
      type: goal.type,
      targetValue: goal.targetValue,
      period: goal.period,
      referenceMonth: goal.referenceMonth,
      referenceYear: goal.referenceYear,
      description: goal.description || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.targetValue || formData.targetValue <= 0) {
      toast({ title: 'Erro', description: 'Valor da meta deve ser maior que zero.', variant: 'destructive' });
      return;
    }
    try {
      setSubmitting(true);
      if (editingGoal) {
        await salesGoalService.update(editingGoal.id, formData);
        toast({ title: 'Sucesso', description: 'Meta atualizada com sucesso.' });
      } else {
        await salesGoalService.create(formData);
        toast({ title: 'Sucesso', description: 'Meta criada com sucesso.' });
      }
      setIsModalOpen(false);
      await loadData();
    } catch (error) {
      console.error('Erro ao salvar meta:', error);
      toast({ title: 'Erro', description: 'Falha ao salvar meta.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta meta?')) return;
    try {
      await salesGoalService.delete(id);
      toast({ title: 'Sucesso', description: 'Meta excluida com sucesso.' });
      await loadData();
    } catch (error) {
      toast({ title: 'Erro', description: 'Falha ao excluir meta.', variant: 'destructive' });
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case 'MONTHLY': return 'Mensal';
      case 'QUARTERLY': return 'Trimestral';
      case 'YEARLY': return 'Anual';
      default: return period;
    }
  };

  const getTypeLabel = (type: string) => type === 'REVENUE' ? 'Receita' : 'Contratos';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-seguranca-yellow" />
        <span className="ml-3 text-gray-400">Carregando metas...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Select value={filterYear} onValueChange={setFilterYear}>
            <SelectTrigger className="w-[120px] bg-seguranca-black border-gray-600 text-seguranca-lightgray">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-seguranca-graphite border-gray-600">
              {[2024, 2025, 2026, 2027].map(y => (
                <SelectItem key={y} value={y.toString()} className="text-seguranca-lightgray">{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button className="bg-seguranca-red hover:bg-seguranca-darkred" onClick={openCreateModal}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Meta
        </Button>
      </div>

      {/* Tabela de Metas */}
      <Card className="bg-seguranca-graphite border-gray-600">
        <CardHeader>
          <CardTitle className="text-seguranca-lightgray flex items-center gap-2">
            <Target className="h-5 w-5 text-purple-400" />
            Metas Comerciais - {filterYear}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {goals.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-600">
                    <TableHead className="text-gray-400">Usuario</TableHead>
                    <TableHead className="text-gray-400">Tipo</TableHead>
                    <TableHead className="text-gray-400">Periodo</TableHead>
                    <TableHead className="text-gray-400">Ref.</TableHead>
                    <TableHead className="text-gray-400 text-right">Meta</TableHead>
                    <TableHead className="text-gray-400 text-right">Realizado</TableHead>
                    <TableHead className="text-gray-400">Progresso</TableHead>
                    <TableHead className="text-gray-400 text-right">Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {goals.map((goal) => (
                    <TableRow key={goal.id} className="border-gray-700">
                      <TableCell className="text-seguranca-lightgray">
                        {goal.userName || 'Equipe'}
                      </TableCell>
                      <TableCell>
                        <Badge className={goal.type === 'REVENUE' ? 'bg-green-600' : 'bg-blue-600'}>
                          {getTypeLabel(goal.type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-400">{getPeriodLabel(goal.period)}</TableCell>
                      <TableCell className="text-gray-400">
                        {String(goal.referenceMonth).padStart(2, '0')}/{goal.referenceYear}
                      </TableCell>
                      <TableCell className="text-seguranca-lightgray text-right">
                        {goal.type === 'REVENUE' ? formatCurrency(goal.targetValue) : goal.targetValue}
                      </TableCell>
                      <TableCell className="text-green-400 text-right">
                        {goal.type === 'REVENUE' ? formatCurrency(goal.currentValue) : goal.currentValue}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-700 rounded-full h-2">
                            <div
                              className="h-2 rounded-full transition-all"
                              style={{
                                width: `${Math.min(goal.progressPercent, 100)}%`,
                                backgroundColor: goal.progressPercent >= 100 ? '#10b981' : goal.progressPercent >= 70 ? '#f59e0b' : '#ef4444',
                              }}
                            />
                          </div>
                          <span className="text-xs text-gray-400 min-w-[40px]">{goal.progressPercent}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEditModal(goal)}>
                            <Edit className="h-4 w-4 text-blue-400" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(goal.id)}>
                            <Trash2 className="h-4 w-4 text-red-400" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-gray-400 text-center py-10">Nenhuma meta cadastrada para {filterYear}.</p>
          )}
        </CardContent>
      </Card>

      {/* Modal Criar/Editar Meta */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-seguranca-graphite border-gray-600 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-seguranca-lightgray">
              {editingGoal ? 'Editar Meta' : 'Nova Meta Comercial'}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {editingGoal ? 'Atualize os dados da meta' : 'Defina uma meta para um vendedor ou para a equipe'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-seguranca-lightgray">Usuario (vazio = meta de equipe)</Label>
              <Select
                value={formData.userId || '__TEAM__'}
                onValueChange={(v) => setFormData({ ...formData, userId: v === '__TEAM__' ? undefined : v })}
              >
                <SelectTrigger className="bg-seguranca-black border-gray-600 text-seguranca-lightgray">
                  <SelectValue placeholder="Meta de equipe" />
                </SelectTrigger>
                <SelectContent className="bg-seguranca-graphite border-gray-600 max-h-[300px]">
                  <SelectItem value="__TEAM__" className="text-seguranca-lightgray">Meta de Equipe</SelectItem>
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.id} className="text-seguranca-lightgray">{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-seguranca-lightgray">Tipo</Label>
                <Select value={formData.type} onValueChange={(v: any) => setFormData({ ...formData, type: v })}>
                  <SelectTrigger className="bg-seguranca-black border-gray-600 text-seguranca-lightgray">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-seguranca-graphite border-gray-600">
                    <SelectItem value="REVENUE" className="text-seguranca-lightgray">Receita (R$)</SelectItem>
                    <SelectItem value="CONTRACTS" className="text-seguranca-lightgray">Contratos (qtd)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-seguranca-lightgray">Periodo</Label>
                <Select value={formData.period} onValueChange={(v: any) => setFormData({ ...formData, period: v })}>
                  <SelectTrigger className="bg-seguranca-black border-gray-600 text-seguranca-lightgray">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-seguranca-graphite border-gray-600">
                    <SelectItem value="MONTHLY" className="text-seguranca-lightgray">Mensal</SelectItem>
                    <SelectItem value="QUARTERLY" className="text-seguranca-lightgray">Trimestral</SelectItem>
                    <SelectItem value="YEARLY" className="text-seguranca-lightgray">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-seguranca-lightgray">Mes de referencia</Label>
                <Select
                  value={formData.referenceMonth.toString()}
                  onValueChange={(v) => setFormData({ ...formData, referenceMonth: parseInt(v) })}
                >
                  <SelectTrigger className="bg-seguranca-black border-gray-600 text-seguranca-lightgray">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-seguranca-graphite border-gray-600">
                    {Array.from({ length: 12 }, (_, i) => (
                      <SelectItem key={i + 1} value={(i + 1).toString()} className="text-seguranca-lightgray">
                        {new Date(2024, i).toLocaleString('pt-BR', { month: 'long' })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-seguranca-lightgray">Ano</Label>
                <Select
                  value={formData.referenceYear.toString()}
                  onValueChange={(v) => setFormData({ ...formData, referenceYear: parseInt(v) })}
                >
                  <SelectTrigger className="bg-seguranca-black border-gray-600 text-seguranca-lightgray">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-seguranca-graphite border-gray-600">
                    {[2024, 2025, 2026, 2027].map(y => (
                      <SelectItem key={y} value={y.toString()} className="text-seguranca-lightgray">{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-seguranca-lightgray">
                Valor da Meta {formData.type === 'REVENUE' ? '(R$)' : '(quantidade)'}
              </Label>
              <Input
                type="number"
                step={formData.type === 'REVENUE' ? '0.01' : '1'}
                value={formData.targetValue || ''}
                onChange={(e) => setFormData({ ...formData, targetValue: parseFloat(e.target.value) || 0 })}
                className="bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                placeholder={formData.type === 'REVENUE' ? '0,00' : '0'}
              />
            </div>

            <div>
              <Label className="text-seguranca-lightgray">Descricao (opcional)</Label>
              <Textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                placeholder="Descreva a meta..."
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" className="bg-seguranca-black border-gray-600 text-seguranca-lightgray" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button className="bg-seguranca-red hover:bg-seguranca-darkred" onClick={handleSubmit} disabled={submitting}>
                {submitting ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</>
                ) : (
                  editingGoal ? 'Atualizar Meta' : 'Criar Meta'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
