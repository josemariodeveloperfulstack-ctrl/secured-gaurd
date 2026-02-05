import React, { useEffect, useMemo, useState } from 'react';
import { StandardLayout } from '@/components/StandardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, RefreshCw, Search, Edit2, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { contasAPagarService, Supplier, CreateSupplierRequest, UpdateSupplierRequest } from '@/services/contasAPagarService';
import { useToast } from '@/hooks/use-toast';
import { SupplierFormModal } from '@/components/estoque/SupplierFormModal';

export default function Fornecedores() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return suppliers;
    return suppliers.filter(s => (
      (s.name || '').toLowerCase().includes(q) ||
      (s.cnpj || '').toLowerCase().includes(q) ||
      (s.city || '').toLowerCase().includes(q) ||
      (s.state || '').toLowerCase().includes(q)
    ));
  }, [suppliers, search]);

  const load = async () => {
    try {
      setLoading(true);
      const data = await contasAPagarService.getFornecedores();
      setSuppliers(Array.isArray(data) ? data : []);
    } catch (e) {
      toast({ title: 'Erro', description: 'Falha ao carregar fornecedores', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setShowModal(true); };

  const openEdit = (s: Supplier) => {
    setEditing(s);
    setShowModal(true);
  };

  const handleSave = async (data: CreateSupplierRequest) => {
    try {
      if (editing) {
        const payload: UpdateSupplierRequest = { ...data };
        const updated = await contasAPagarService.updateFornecedor(String((editing as any).id || editing.id), payload);
        setSuppliers(prev => prev.map(s => s.id === updated.id ? updated : s));
        toast({ title: 'Sucesso', description: 'Fornecedor atualizado.' });
      } else {
        const created = await contasAPagarService.createFornecedor(data);
        setSuppliers(prev => [created, ...prev]);
        toast({ title: 'Sucesso', description: 'Fornecedor criado.' });
      }
      setShowModal(false);
    } catch (e: any) {
      // Handle 409 Conflict (Duplicate CNPJ)
      if (e?.response?.status === 409 && data.cnpj) {
        try {
          // Check if the conflict is with an inactive supplier
          const existing = await contasAPagarService.getFornecedorByCnpj(data.cnpj);

          if (existing && existing.isActive === false) {
            if (confirm(`Já existe um fornecedor inativo com o CNPJ ${data.cnpj} (${existing.name}). Deseja reativá-lo?`)) {
              await contasAPagarService.toggleFornecedorStatus(existing.id);
              toast({ title: 'Sucesso', description: 'Fornecedor reativado com sucesso.' });
              load(); // Reload the list to show the reactivated supplier
              setShowModal(false);
              return;
            }
          }
        } catch (checkErr) {
          // If check fails, fall through to generic error
          console.error("Failed to check for existing supplier", checkErr);
        }
      }

      const msg = e?.response?.data?.message || 'Não foi possível salvar.';
      toast({ title: 'Erro', description: msg, variant: 'destructive' });
      throw e; // Re-throw to let modal handle loading state if needed
    }
  };

  const remove = async (s: Supplier) => {
    if (!confirm(`Excluir fornecedor ${s.name}?`)) return;
    try {
      await contasAPagarService.deleteFornecedor(String((s as any).id || s.id));
      setSuppliers(prev => prev.filter(x => x.id !== s.id));
      toast({ title: 'Sucesso', description: 'Fornecedor excluído.' });
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível excluir.', variant: 'destructive' });
    }
  };

  const toggle = async (s: Supplier) => {
    try {
      const updated = await contasAPagarService.toggleFornecedorStatus(String((s as any).id || s.id));
      setSuppliers(prev => prev.map(x => x.id === updated.id ? updated : x));
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível alterar status.', variant: 'destructive' });
    }
  };

  return (
    <StandardLayout title="Fornecedores">
      <div className="space-y-4">
        <Card className="p-4 bg-seguranca-graphite border-gray-700">
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <div className="flex items-center gap-2 text-seguranca-lightgray">
              <Search size={16} />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome, CNPJ, cidade ou UF" className="form-input w-72" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={load} disabled={loading}>
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              </Button>
              <Button onClick={openCreate} className="bg-seguranca-red hover:bg-seguranca-darkred">
                <Plus size={16} className="mr-1" /> Novo
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-seguranca-graphite border-gray-700">
          {filtered.length === 0 ? (
            <div className="text-sm text-gray-400">Nenhum fornecedor encontrado.</div>
          ) : (
            <div className="divide-y divide-gray-700">
              {filtered.map(s => (
                <div key={s.id} className="py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="text-seguranca-lightgray">
                    <div className="font-medium">{s.name} {s.isActive === false && <Badge variant="secondary" className="ml-2">Inativo</Badge>}</div>
                    <div className="text-xs text-gray-400">{s.cnpj || '—'} • {s.city || '—'} {s.state ? `- ${s.state}` : ''}</div>
                    {s.email && <div className="text-xs text-gray-400">{s.email}</div>}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(s)}>
                      <Edit2 size={14} />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => toggle(s)}>
                      {s.isActive ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => remove(s)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <SupplierFormModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          supplier={editing}
          onSave={handleSave}
        />
      </div>
    </StandardLayout>
  );
}


