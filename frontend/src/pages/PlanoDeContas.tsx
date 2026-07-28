import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { contasAPagarService, CategoriaPai, Subcategoria } from '@/services/contasAPagarService';
import { Plus, Edit, Trash2, FolderTree, Layers, CheckSquare, Square } from 'lucide-react';

export default function PlanoDeContas() {
  const { toast } = useToast();
  const [categorias, setCategorias] = useState<CategoriaPai[]>([]);
  const [subcategorias, setSubcategorias] = useState<Subcategoria[]>([]);
  const [activeTab, setActiveTab] = useState<'categorias' | 'subcategorias'>('categorias');

  // Categoria modal
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [catEditMode, setCatEditMode] = useState(false);
  const [catForm, setCatForm] = useState({ nome: '', codigo: '' });
  const [catEditId, setCatEditId] = useState<string | null>(null);

  // Subcategoria modal
  const [subModalOpen, setSubModalOpen] = useState(false);
  const [subEditMode, setSubEditMode] = useState(false);
  const [subForm, setSubForm] = useState({ categoriaPaiId: '', nome: '', codigo: '', requerVinculoFuncionario: false });
  const [subEditId, setSubEditId] = useState<string | null>(null);

  const loadData = () => {
    contasAPagarService.getCategoriasPai().then(setCategorias).catch(() => setCategorias([]));
    contasAPagarService.getSubcategorias().then(setSubcategorias).catch(() => setSubcategorias([]));
  };

  useEffect(() => { loadData(); }, []);

  // === Categoria Pai CRUD ===
  const openNewCategoria = () => {
    setCatEditMode(false);
    setCatEditId(null);
    setCatForm({ nome: '', codigo: '' });
    setCatModalOpen(true);
  };

  const openEditCategoria = (cat: CategoriaPai) => {
    setCatEditMode(true);
    setCatEditId(cat.id);
    setCatForm({ nome: cat.nome, codigo: cat.codigo });
    setCatModalOpen(true);
  };

  const saveCategoria = async () => {
    if (!catForm.nome || !catForm.codigo) {
      toast({ title: 'Erro', description: 'Preencha nome e código', variant: 'destructive' });
      return;
    }
    try {
      if (catEditMode && catEditId) {
        await contasAPagarService.updateCategoriaPai(catEditId, catForm);
        toast({ title: 'Sucesso', description: 'Categoria atualizada' });
      } else {
        await contasAPagarService.createCategoriaPai(catForm);
        toast({ title: 'Sucesso', description: 'Categoria criada' });
      }
      setCatModalOpen(false);
      loadData();
    } catch {
      toast({ title: 'Erro', description: 'Erro ao salvar categoria', variant: 'destructive' });
    }
  };

  const deleteCategoria = async (id: string) => {
    if (!confirm('Excluir esta categoria? Todas as subcategorias serão removidas.')) return;
    try {
      await contasAPagarService.deleteCategoriaPai(id);
      toast({ title: 'Sucesso', description: 'Categoria excluída' });
      loadData();
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível excluir', variant: 'destructive' });
    }
  };

  // === Subcategoria CRUD ===
  const openNewSubcategoria = () => {
    setSubEditMode(false);
    setSubEditId(null);
    setSubForm({ categoriaPaiId: '', nome: '', codigo: '', requerVinculoFuncionario: false });
    setSubModalOpen(true);
  };

  const openEditSubcategoria = (sub: Subcategoria) => {
    setSubEditMode(true);
    setSubEditId(sub.id);
    setSubForm({ categoriaPaiId: sub.categoriaPaiId, nome: sub.nome, codigo: sub.codigo, requerVinculoFuncionario: sub.requerVinculoFuncionario });
    setSubModalOpen(true);
  };

  const saveSubcategoria = async () => {
    if (!subForm.nome || !subForm.codigo || !subForm.categoriaPaiId) {
      toast({ title: 'Erro', description: 'Preencha todos os campos obrigatórios', variant: 'destructive' });
      return;
    }
    try {
      if (subEditMode && subEditId) {
        await contasAPagarService.updateSubcategoria(subEditId, subForm);
        toast({ title: 'Sucesso', description: 'Subcategoria atualizada' });
      } else {
        await contasAPagarService.createSubcategoria(subForm);
        toast({ title: 'Sucesso', description: 'Subcategoria criada' });
      }
      setSubModalOpen(false);
      loadData();
    } catch {
      toast({ title: 'Erro', description: 'Erro ao salvar subcategoria', variant: 'destructive' });
    }
  };

  const deleteSubcategoria = async (id: string) => {
    if (!confirm('Excluir esta subcategoria?')) return;
    try {
      await contasAPagarService.deleteSubcategoria(id);
      toast({ title: 'Sucesso', description: 'Subcategoria excluída' });
      loadData();
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível excluir', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-seguranca-black text-seguranca-lightgray p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-seguranca-yellow flex items-center gap-2">
            <FolderTree size={24} />
            Plano de Contas
          </h1>
          <Button
            onClick={activeTab === 'categorias' ? openNewCategoria : openNewSubcategoria}
            className="bg-seguranca-red hover:bg-seguranca-darkred"
          >
            <Plus size={16} className="mr-1" />
            Novo
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-seguranca-graphite rounded-lg p-1 w-fit">
          <button
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'categorias' ? 'bg-seguranca-red text-white' : 'text-gray-400 hover:text-white'
            }`}
            onClick={() => setActiveTab('categorias')}
          >
            <Layers size={14} className="inline mr-1" />
            Categorias
          </button>
          <button
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'subcategorias' ? 'bg-seguranca-red text-white' : 'text-gray-400 hover:text-white'
            }`}
            onClick={() => setActiveTab('subcategorias')}
          >
            <Layers size={14} className="inline mr-1" />
            Subcategorias
          </button>
        </div>

        {/* Categorias Table */}
        {activeTab === 'categorias' && (
          <div className="bg-seguranca-graphite rounded-lg border border-gray-600 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-seguranca-black border-b border-gray-600">
                  <th className="text-left p-3 text-xs uppercase text-gray-400">Código</th>
                  <th className="text-left p-3 text-xs uppercase text-gray-400">Nome</th>
                  <th className="text-right p-3 text-xs uppercase text-gray-400">Ações</th>
                </tr>
              </thead>
              <tbody>
                {categorias.map((cat) => (
                  <tr key={cat.id} className="border-b border-gray-700 hover:bg-seguranca-black/50">
                    <td className="p-3 font-mono text-sm text-seguranca-yellow">{cat.codigo}</td>
                    <td className="p-3 text-sm">{cat.nome}</td>
                    <td className="p-3 text-right">
                      <button onClick={() => openEditCategoria(cat)} className="text-blue-400 hover:text-blue-300 mr-2">
                        <Edit size={14} />
                      </button>
                      <button onClick={() => deleteCategoria(cat.id)} className="text-red-400 hover:text-red-300">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
                {categorias.length === 0 && (
                  <tr><td colSpan={3} className="p-6 text-center text-gray-500">Nenhuma categoria cadastrada</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Subcategorias Table */}
        {activeTab === 'subcategorias' && (
          <div className="bg-seguranca-graphite rounded-lg border border-gray-600 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-seguranca-black border-b border-gray-600">
                  <th className="text-left p-3 text-xs uppercase text-gray-400">Código</th>
                  <th className="text-left p-3 text-xs uppercase text-gray-400">Nome</th>
                  <th className="text-left p-3 text-xs uppercase text-gray-400">Categoria Pai</th>
                  <th className="text-center p-3 text-xs uppercase text-gray-400">Vínculo Func.</th>
                  <th className="text-right p-3 text-xs uppercase text-gray-400">Ações</th>
                </tr>
              </thead>
              <tbody>
                {subcategorias.map((sub) => {
                  const catPai = categorias.find(c => c.id === sub.categoriaPaiId);
                  return (
                    <tr key={sub.id} className="border-b border-gray-700 hover:bg-seguranca-black/50">
                      <td className="p-3 font-mono text-sm text-seguranca-yellow">{sub.codigo}</td>
                      <td className="p-3 text-sm">{sub.nome}</td>
                      <td className="p-3 text-sm text-gray-400">{catPai ? `${catPai.codigo} - ${catPai.nome}` : '-'}</td>
                      <td className="p-3 text-center">
                        {sub.requerVinculoFuncionario
                          ? <span className="text-yellow-400 text-xs font-medium">Sim</span>
                          : <span className="text-gray-500 text-xs">Não</span>
                        }
                      </td>
                      <td className="p-3 text-right">
                        <button onClick={() => openEditSubcategoria(sub)} className="text-blue-400 hover:text-blue-300 mr-2">
                          <Edit size={14} />
                        </button>
                        <button onClick={() => deleteSubcategoria(sub.id)} className="text-red-400 hover:text-red-300">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {subcategorias.length === 0 && (
                  <tr><td colSpan={5} className="p-6 text-center text-gray-500">Nenhuma subcategoria cadastrada</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Categoria Pai */}
      <Dialog open={catModalOpen} onOpenChange={setCatModalOpen}>
        <DialogContent className="sm:max-w-[450px] bg-seguranca-graphite border-gray-600 text-white">
          <DialogHeader>
            <DialogTitle className="text-seguranca-yellow">{catEditMode ? 'Editar' : 'Nova'} Categoria</DialogTitle>
            <DialogDescription className="text-gray-300">Categoria principal do Plano de Contas</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Código *</label>
              <Input value={catForm.codigo} onChange={e => setCatForm(p => ({ ...p, codigo: e.target.value }))}
                placeholder="Ex: DESP_OP"
                className="border-gray-600 bg-seguranca-black text-seguranca-lightgray placeholder:text-gray-400" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Nome *</label>
              <Input value={catForm.nome} onChange={e => setCatForm(p => ({ ...p, nome: e.target.value }))}
                placeholder="Ex: Despesas Operacionais"
                className="border-gray-600 bg-seguranca-black text-seguranca-lightgray placeholder:text-gray-400" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setCatModalOpen(false)} className="border-gray-600 text-white">Cancelar</Button>
              <Button onClick={saveCategoria} className="bg-seguranca-red hover:bg-seguranca-darkred">Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Subcategoria */}
      <Dialog open={subModalOpen} onOpenChange={setSubModalOpen}>
        <DialogContent className="sm:max-w-[450px] bg-seguranca-graphite border-gray-600 text-white">
          <DialogHeader>
            <DialogTitle className="text-seguranca-yellow">{subEditMode ? 'Editar' : 'Nova'} Subcategoria</DialogTitle>
            <DialogDescription className="text-gray-300">Subcategoria vinculada a uma categoria principal</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Categoria Pai *</label>
              <Select value={subForm.categoriaPaiId} onValueChange={v => setSubForm(p => ({ ...p, categoriaPaiId: v }))}>
                <SelectTrigger className="border-gray-600 bg-seguranca-black text-seguranca-lightgray">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="bg-seguranca-black border-gray-600">
                  {categorias.map(cat => (
                    <SelectItem key={cat.id} value={cat.id} className="text-seguranca-lightgray">
                      {cat.codigo} - {cat.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Código *</label>
              <Input value={subForm.codigo} onChange={e => setSubForm(p => ({ ...p, codigo: e.target.value }))}
                placeholder="Ex: DESP_OP_ENERGIA"
                className="border-gray-600 bg-seguranca-black text-seguranca-lightgray placeholder:text-gray-400" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Nome *</label>
              <Input value={subForm.nome} onChange={e => setSubForm(p => ({ ...p, nome: e.target.value }))}
                placeholder="Ex: Energia Elétrica"
                className="border-gray-600 bg-seguranca-black text-seguranca-lightgray placeholder:text-gray-400" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={subForm.requerVinculoFuncionario}
                onChange={e => setSubForm(p => ({ ...p, requerVinculoFuncionario: e.target.checked }))}
                className="accent-seguranca-red"
              />
              <span className="text-sm text-seguranca-lightgray">Exige vínculo com funcionário</span>
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setSubModalOpen(false)} className="border-gray-600 text-white">Cancelar</Button>
              <Button onClick={saveSubcategoria} className="bg-seguranca-red hover:bg-seguranca-darkred">Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
