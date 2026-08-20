import React, { useEffect, useMemo, useState } from 'react';
import { StandardLayout } from '@/components/StandardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  RefreshCw, 
  Search, 
  Edit2, 
  Trash2, 
  ToggleLeft, 
  ToggleRight, 
  ArrowUpDown, 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  ShieldCheck, 
  ShieldAlert,
  Users,
  Filter
} from 'lucide-react';
import { contasAPagarService, Supplier, CreateSupplierRequest, UpdateSupplierRequest } from '@/services/contasAPagarService';
import { useToast } from '@/hooks/use-toast';
import { SupplierFormModal } from '@/components/estoque/SupplierFormModal';
import { formatCPF, formatPhone } from '@/utils/formatters';

type SortKey = 'name' | 'cnpj' | 'email' | 'phone' | 'location' | 'status';

export default function Fornecedores() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);

  // Ordenação pelos cabeçalhos da tabela
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Alternar ordenação pela coluna
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  // Filtragem e Ordenação Local
  const sortedAndFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    
    // 1. Filtragem
    let result = suppliers;
    if (q) {
      result = suppliers.filter(s => (
        (s.name || '').toLowerCase().includes(q) ||
        (s.cnpj || '').toLowerCase().includes(q) ||
        (s.cpf || '').toLowerCase().includes(q) ||
        (s.email || '').toLowerCase().includes(q) ||
        (s.phone || '').toLowerCase().includes(q) ||
        (s.city || '').toLowerCase().includes(q) ||
        (s.state || '').toLowerCase().includes(q)
      ));
    }

    // 2. Ordenação Alfabética / Numérica / Status
    return [...result].sort((a, b) => {
      let valA = '';
      let valB = '';

      switch (sortKey) {
        case 'name':
          valA = a.name || '';
          valB = b.name || '';
          break;
        case 'cnpj':
          valA = a.cnpj || a.cpf || '';
          valB = b.cnpj || b.cpf || '';
          break;
        case 'email':
          valA = a.email || '';
          valB = b.email || '';
          break;
        case 'phone':
          valA = a.phone || '';
          valB = b.phone || '';
          break;
        case 'location':
          valA = `${a.city || ''} ${a.state || ''}`.trim();
          valB = `${b.city || ''} ${b.state || ''}`.trim();
          break;
        case 'status':
          valA = a.isActive !== false ? 'Ativo' : 'Inativo';
          valB = b.isActive !== false ? 'Ativo' : 'Inativo';
          break;
      }

      const cmp = valA.localeCompare(valB, 'pt-BR', { sensitivity: 'base', numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [suppliers, search, sortKey, sortDir]);

  const activeCount = useMemo(() => {
    return suppliers.filter(s => s.isActive !== false).length;
  }, [suppliers]);

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
      if (e?.response?.status === 409 && data.cnpj) {
        try {
          const existing = await contasAPagarService.getFornecedorByCnpj(data.cnpj);

          if (existing && existing.isActive === false) {
            if (confirm(`Já existe um fornecedor inativo com o CNPJ ${data.cnpj} (${existing.name}). Deseja reativá-lo?`)) {
              await contasAPagarService.toggleFornecedorStatus(existing.id);
              toast({ title: 'Sucesso', description: 'Fornecedor reativado com sucesso.' });
              load();
              setShowModal(false);
              return;
            }
          }
        } catch (checkErr) {
          console.error("Failed to check for existing supplier", checkErr);
        }
      }

      const msg = e?.response?.data?.message || 'Não foi possível salvar.';
      toast({ title: 'Erro', description: msg, variant: 'destructive' });
      throw e;
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
    <StandardLayout title="Gestão de Fornecedores">
      <div className="space-y-4">
        {/* Cards Informativos */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-seguranca-graphite border-gray-700">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-400">Total Cadastrados</p>
                <p className="text-2xl font-bold text-white">{suppliers.length}</p>
              </div>
              <div className="p-3 bg-seguranca-black rounded-lg border border-gray-700 text-seguranca-yellow">
                <Building2 className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-seguranca-graphite border-gray-700">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-400">Fornecedores Ativos</p>
                <p className="text-2xl font-bold text-emerald-400">{activeCount}</p>
              </div>
              <div className="p-3 bg-seguranca-black rounded-lg border border-gray-700 text-emerald-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-seguranca-graphite border-gray-700">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-400">Exibindo / Filtrados</p>
                <p className="text-2xl font-bold text-seguranca-yellow">{sortedAndFiltered.length}</p>
              </div>
              <div className="p-3 bg-seguranca-black rounded-lg border border-gray-700 text-seguranca-yellow">
                <Filter className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros e Barra de Ações */}
        <Card className="p-4 bg-seguranca-graphite border-gray-700">
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            {/* Campo de Busca */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                placeholder="Buscar fornecedor por nome, CNPJ, e-mail, telefone ou cidade..." 
                className="pl-9 bg-seguranca-black border-gray-600 text-seguranca-lightgray placeholder:text-gray-500" 
              />
            </div>

            {/* Select de Ordenação Rápida + Botões */}
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={`${sortKey}-${sortDir}`}
                onValueChange={(val) => {
                  const [k, d] = val.split('-') as [SortKey, 'asc' | 'desc'];
                  setSortKey(k);
                  setSortDir(d);
                }}
              >
                <SelectTrigger className="w-56 bg-seguranca-black border-gray-600 text-seguranca-lightgray text-xs">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray">
                  <SelectItem value="name-asc">Nome / Razão Social (A-Z)</SelectItem>
                  <SelectItem value="name-desc">Nome / Razão Social (Z-A)</SelectItem>
                  <SelectItem value="cnpj-asc">CNPJ / CPF (Crescente)</SelectItem>
                  <SelectItem value="email-asc">E-mail (A-Z)</SelectItem>
                  <SelectItem value="location-asc">Cidade / Estado (A-Z)</SelectItem>
                  <SelectItem value="status-asc">Status (Ativos Primeiro)</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={load} disabled={loading} title="Atualizar lista" className="border-gray-600">
                <RefreshCw size={16} className={loading ? 'animate-spin text-seguranca-yellow' : ''} />
              </Button>
              
              <Button onClick={openCreate} className="bg-seguranca-red hover:bg-seguranca-darkred font-semibold">
                <Plus size={16} className="mr-1" /> Novo Fornecedor
              </Button>
            </div>
          </div>
        </Card>

        {/* Tabela Interativa com Ordenação nos Headers */}
        <Card className="bg-seguranca-graphite border-gray-700 overflow-hidden">
          {sortedAndFiltered.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <Building2 className="h-10 w-10 mx-auto mb-2 opacity-40 text-seguranca-yellow" />
              <p className="font-semibold text-seguranca-lightgray">Nenhum fornecedor encontrado</p>
              <p className="text-xs mt-1">Tente ajustar a busca ou cadastrar um novo fornecedor.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-seguranca-black/60">
                  <TableRow className="border-gray-700">
                    {/* Header Nome */}
                    <TableHead className="text-gray-300 font-semibold py-3">
                      <button
                        type="button"
                        onClick={() => handleSort('name')}
                        className="flex items-center gap-1.5 hover:text-white transition-colors focus:outline-none"
                        title="Clique para ordenar por Nome / Razão Social (A-Z / Z-A)"
                      >
                        <span>Nome / Razão Social</span>
                        <ArrowUpDown className={`h-3.5 w-3.5 ${sortKey === 'name' ? 'text-seguranca-yellow font-bold' : 'text-gray-500 opacity-60'}`} />
                        {sortKey === 'name' && (
                          <span className="text-[10px] text-seguranca-yellow font-mono">
                            {sortDir === 'asc' ? '▲' : '▼'}
                          </span>
                        )}
                      </button>
                    </TableHead>

                    {/* Header CNPJ */}
                    <TableHead className="text-gray-300 font-semibold py-3">
                      <button
                        type="button"
                        onClick={() => handleSort('cnpj')}
                        className="flex items-center gap-1.5 hover:text-white transition-colors focus:outline-none"
                        title="Clique para ordenar por CNPJ / CPF"
                      >
                        <span>CNPJ / CPF</span>
                        <ArrowUpDown className={`h-3.5 w-3.5 ${sortKey === 'cnpj' ? 'text-seguranca-yellow font-bold' : 'text-gray-500 opacity-60'}`} />
                        {sortKey === 'cnpj' && (
                          <span className="text-[10px] text-seguranca-yellow font-mono">
                            {sortDir === 'asc' ? '▲' : '▼'}
                          </span>
                        )}
                      </button>
                    </TableHead>

                    {/* Header E-mail */}
                    <TableHead className="text-gray-300 font-semibold py-3">
                      <button
                        type="button"
                        onClick={() => handleSort('email')}
                        className="flex items-center gap-1.5 hover:text-white transition-colors focus:outline-none"
                        title="Clique para ordenar por E-mail (A-Z)"
                      >
                        <span>E-mail</span>
                        <ArrowUpDown className={`h-3.5 w-3.5 ${sortKey === 'email' ? 'text-seguranca-yellow font-bold' : 'text-gray-500 opacity-60'}`} />
                        {sortKey === 'email' && (
                          <span className="text-[10px] text-seguranca-yellow font-mono">
                            {sortDir === 'asc' ? '▲' : '▼'}
                          </span>
                        )}
                      </button>
                    </TableHead>

                    {/* Header Telefone */}
                    <TableHead className="text-gray-300 font-semibold py-3">
                      <button
                        type="button"
                        onClick={() => handleSort('phone')}
                        className="flex items-center gap-1.5 hover:text-white transition-colors focus:outline-none"
                        title="Clique para ordenar por Telefone"
                      >
                        <span>Telefone</span>
                        <ArrowUpDown className={`h-3.5 w-3.5 ${sortKey === 'phone' ? 'text-seguranca-yellow font-bold' : 'text-gray-500 opacity-60'}`} />
                        {sortKey === 'phone' && (
                          <span className="text-[10px] text-seguranca-yellow font-mono">
                            {sortDir === 'asc' ? '▲' : '▼'}
                          </span>
                        )}
                      </button>
                    </TableHead>

                    {/* Header Cidade / Estado */}
                    <TableHead className="text-gray-300 font-semibold py-3">
                      <button
                        type="button"
                        onClick={() => handleSort('location')}
                        className="flex items-center gap-1.5 hover:text-white transition-colors focus:outline-none"
                        title="Clique para ordenar por Cidade e Estado (A-Z)"
                      >
                        <span>Cidade / Estado</span>
                        <ArrowUpDown className={`h-3.5 w-3.5 ${sortKey === 'location' ? 'text-seguranca-yellow font-bold' : 'text-gray-500 opacity-60'}`} />
                        {sortKey === 'location' && (
                          <span className="text-[10px] text-seguranca-yellow font-mono">
                            {sortDir === 'asc' ? '▲' : '▼'}
                          </span>
                        )}
                      </button>
                    </TableHead>

                    {/* Header Status */}
                    <TableHead className="text-gray-300 font-semibold py-3">
                      <button
                        type="button"
                        onClick={() => handleSort('status')}
                        className="flex items-center gap-1.5 hover:text-white transition-colors focus:outline-none"
                        title="Clique para ordenar por Status (Ativo / Inativo)"
                      >
                        <span>Status</span>
                        <ArrowUpDown className={`h-3.5 w-3.5 ${sortKey === 'status' ? 'text-seguranca-yellow font-bold' : 'text-gray-500 opacity-60'}`} />
                        {sortKey === 'status' && (
                          <span className="text-[10px] text-seguranca-yellow font-mono">
                            {sortDir === 'asc' ? '▲' : '▼'}
                          </span>
                        )}
                      </button>
                    </TableHead>

                    {/* Header Ações */}
                    <TableHead className="text-gray-300 font-semibold text-right py-3">Ações</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {sortedAndFiltered.map(s => {
                    const docNumber = s.cnpj || s.cpf;
                    const formattedDoc = docNumber ? (docNumber.length > 11 ? docNumber : formatCPF(docNumber)) : '—';
                    const isInactive = s.isActive === false;

                    return (
                      <TableRow key={s.id} className="border-gray-700/50 hover:bg-seguranca-black/30 transition-colors">
                        {/* Nome */}
                        <TableCell className="font-semibold text-seguranca-lightgray py-3">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-seguranca-yellow shrink-0" />
                            <span>{s.name}</span>
                          </div>
                        </TableCell>

                        {/* CNPJ / CPF */}
                        <TableCell className="text-gray-300 text-xs font-mono py-3">
                          {formattedDoc}
                        </TableCell>

                        {/* E-mail */}
                        <TableCell className="text-gray-300 text-xs py-3">
                          {s.email ? (
                            <div className="flex items-center gap-1.5">
                              <Mail className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                              <a href={`mailto:${s.email}`} className="hover:text-seguranca-yellow underline decoration-gray-600 transition-colors">
                                {s.email}
                              </a>
                            </div>
                          ) : (
                            <span className="text-gray-500">—</span>
                          )}
                        </TableCell>

                        {/* Telefone */}
                        <TableCell className="text-gray-300 text-xs py-3">
                          {s.phone ? (
                            <div className="flex items-center gap-1.5">
                              <Phone className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                              <span>{formatPhone(s.phone)}</span>
                            </div>
                          ) : (
                            <span className="text-gray-500">—</span>
                          )}
                        </TableCell>

                        {/* Cidade / Estado */}
                        <TableCell className="text-gray-300 text-xs py-3">
                          {s.city || s.state ? (
                            <div className="flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                              <span>
                                {s.city || ''}{s.city && s.state ? ' - ' : ''}{s.state || ''}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-500">—</span>
                          )}
                        </TableCell>

                        {/* Status */}
                        <TableCell className="py-3">
                          <Badge 
                            variant="outline" 
                            className={isInactive 
                              ? "bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs" 
                              : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs font-semibold"
                            }
                          >
                            {isInactive ? 'Inativo' : 'Ativo'}
                          </Badge>
                        </TableCell>

                        {/* Ações */}
                        <TableCell className="text-right py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => openEdit(s)}
                              title="Editar dados do fornecedor"
                              className="h-8 w-8 p-0 text-gray-300 hover:text-seguranca-yellow hover:bg-seguranca-black"
                            >
                              <Edit2 size={14} />
                            </Button>

                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => toggle(s)}
                              title={isInactive ? 'Reativar fornecedor' : 'Desativar fornecedor'}
                              className={isInactive 
                                ? "h-8 w-8 p-0 text-gray-400 hover:text-emerald-400 hover:bg-seguranca-black"
                                : "h-8 w-8 p-0 text-gray-400 hover:text-amber-400 hover:bg-seguranca-black"
                              }
                            >
                              {isInactive ? <ToggleLeft size={16} /> : <ToggleRight size={16} className="text-emerald-400" />}
                            </Button>

                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => remove(s)}
                              title="Excluir fornecedor"
                              className="h-8 w-8 p-0 text-gray-400 hover:text-red-500 hover:bg-red-500/10"
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>

        {/* Modal de Cadastro/Edição */}
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



