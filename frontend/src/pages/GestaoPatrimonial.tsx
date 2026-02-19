import React, { useCallback, useEffect, useState } from 'react';
import { StandardLayout } from '@/components/StandardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  RefreshCw,
  Search,
  Edit2,
  Trash2,
  TrendingDown,
  Package,
  FolderTree,
  MapPin,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  patrimonialService,
  PatrimonialCategory,
  PatrimonialLocation,
  PatrimonialAsset,
  PatrimonialAssetFilters,
  PatrimonialAssetCreate,
} from '@/services/patrimonialService';
import { PatrimonialCategoryFormModal } from '@/components/patrimonial/PatrimonialCategoryFormModal';
import { PatrimonialLocationFormModal } from '@/components/patrimonial/PatrimonialLocationFormModal';
import { PatrimonialAssetFormModal } from '@/components/patrimonial/PatrimonialAssetFormModal';
import { PatrimonialDepreciationModal } from '@/components/patrimonial/PatrimonialDepreciationModal';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

function computeBookValue(asset: PatrimonialAsset, asOfDate?: Date): number {
  const d = asOfDate || new Date();
  const acq = new Date(asset.acquisitionDate);
  const years = asset.usefulLifeYears || 1;
  const monthsTotal = years * 12;
  let monthsDepreciated = (d.getFullYear() - acq.getFullYear()) * 12 + (d.getMonth() - acq.getMonth());
  if (monthsDepreciated < 0) return Number(asset.acquisitionValue);
  if (monthsDepreciated > monthsTotal) monthsDepreciated = monthsTotal;
  const residualPct = (asset.residualValuePct ?? 0) / 100;
  const depreciable = Number(asset.acquisitionValue) * (1 - residualPct);
  const accumulated = depreciable * (monthsDepreciated / monthsTotal);
  return Number(asset.acquisitionValue) - accumulated;
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const formatDate = (s: string) => (s ? new Date(s).toLocaleDateString('pt-BR') : '—');

const STATUS_LABELS: Record<string, string> = {
  EM_USO: 'Em uso',
  EM_MANUTENCAO: 'Em manutenção',
  BAIXADO: 'Baixado',
  EM_DEPRECIACAO_TOTAL: 'Depreciação total',
};

export default function GestaoPatrimonial() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('bens');

  // Categories
  const [categories, setCategories] = useState<PatrimonialCategory[]>([]);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<PatrimonialCategory | null>(null);

  // Locations
  const [locations, setLocations] = useState<PatrimonialLocation[]>([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<PatrimonialLocation | null>(null);

  // Assets
  const [assetPage, setAssetPage] = useState<PatrimonialAsset[]>([]);
  const [assetTotal, setAssetTotal] = useState(0);
  const [assetPageNumber, setAssetPageNumber] = useState(0);
  const [assetLoading, setAssetLoading] = useState(false);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<PatrimonialAsset | null>(null);
  const [editingAssetFull, setEditingAssetFull] = useState<PatrimonialAsset | null>(null);
  const [showDepreciationModal, setShowDepreciationModal] = useState(false);
  const [depreciationAsset, setDepreciationAsset] = useState<PatrimonialAsset | null>(null);
  const [filters, setFilters] = useState<PatrimonialAssetFilters>({ page: 0, size: 10 });
  const [filterCodeOrName, setFilterCodeOrName] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState<string>('__all__');
  const [filterLocationId, setFilterLocationId] = useState<string>('__all__');
  const [filterStatus, setFilterStatus] = useState<string>('__all__');

  const loadCategories = useCallback(async () => {
    setCategoryLoading(true);
    try {
      const list = await patrimonialService.listCategories();
      setCategories(list);
    } catch {
      toast({ title: 'Erro', description: 'Falha ao carregar categorias', variant: 'destructive' });
    } finally {
      setCategoryLoading(false);
    }
  }, [toast]);

  const loadLocations = useCallback(async () => {
    setLocationLoading(true);
    try {
      const list = await patrimonialService.listLocations();
      setLocations(list);
    } catch {
      toast({ title: 'Erro', description: 'Falha ao carregar localizações', variant: 'destructive' });
    } finally {
      setLocationLoading(false);
    }
  }, [toast]);

  const loadAssets = useCallback(async () => {
    setAssetLoading(true);
    try {
      const next: PatrimonialAssetFilters = {
        ...filters,
        codeOrName: filterCodeOrName.trim() || undefined,
        categoryId: filterCategoryId === '__all__' ? undefined : filterCategoryId,
        locationId: filterLocationId === '__all__' ? undefined : filterLocationId,
        status: filterStatus === '__all__' ? undefined : filterStatus,
      };
      const result = await patrimonialService.listAssets(next);
      setAssetPage(result.content);
      setAssetTotal(result.totalElements);
      setAssetPageNumber(result.number);
    } catch {
      toast({ title: 'Erro', description: 'Falha ao carregar bens', variant: 'destructive' });
    } finally {
      setAssetLoading(false);
    }
  }, [filters, filterCodeOrName, filterCategoryId, filterLocationId, filterStatus, toast]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  useEffect(() => {
    if (activeTab === 'bens') loadAssets();
  }, [activeTab, loadAssets]);

  const applyAssetFilters = () => {
    setFilters((prev) => ({ ...prev, page: 0 }));
    setAssetPageNumber(0);
    setTimeout(() => loadAssets(), 0);
  };

  const handleSaveCategory = async (payload: Parameters<typeof patrimonialService.createCategory>[0]) => {
    if (editingCategory) {
      await patrimonialService.updateCategory(editingCategory.id, payload);
      toast({ title: 'Sucesso', description: 'Categoria atualizada.' });
    } else {
      await patrimonialService.createCategory(payload);
      toast({ title: 'Sucesso', description: 'Categoria criada.' });
    }
    loadCategories();
  };

  const handleSaveLocation = async (payload: Parameters<typeof patrimonialService.createLocation>[0]) => {
    if (editingLocation) {
      await patrimonialService.updateLocation(editingLocation.id, payload);
      toast({ title: 'Sucesso', description: 'Localização atualizada.' });
    } else {
      await patrimonialService.createLocation(payload);
      toast({ title: 'Sucesso', description: 'Localização criada.' });
    }
    loadLocations();
  };

  const handleSaveAsset = async (payload: PatrimonialAssetCreate) => {
    try {
      if (editingAsset) {
        await patrimonialService.updateAsset(editingAsset.id, payload);
        toast({ title: 'Sucesso', description: 'Bem atualizado.' });
      } else {
        await patrimonialService.createAsset(payload);
        toast({ title: 'Sucesso', description: 'Bem criado.' });
      }
      loadAssets();
    } catch (e: any) {
      toast({
        title: 'Erro',
        description: e?.response?.data?.message || 'Não foi possível salvar.',
        variant: 'destructive',
      });
      throw e;
    }
  };

  const deleteCategory = async (c: PatrimonialCategory) => {
    if (!confirm(`Excluir categoria "${c.name}"?`)) return;
    try {
      await patrimonialService.deleteCategory(c.id);
      setCategories((prev) => prev.filter((x) => x.id !== c.id));
      toast({ title: 'Sucesso', description: 'Categoria excluída.' });
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível excluir (pode haver bens vinculados).', variant: 'destructive' });
    }
  };

  const deleteLocation = async (l: PatrimonialLocation) => {
    if (!confirm(`Excluir localização "${l.name}"?`)) return;
    try {
      await patrimonialService.deleteLocation(l.id);
      setLocations((prev) => prev.filter((x) => x.id !== l.id));
      toast({ title: 'Sucesso', description: 'Localização excluída.' });
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível excluir (pode haver bens vinculados).', variant: 'destructive' });
    }
  };

  const deleteAsset = async (a: PatrimonialAsset) => {
    if (!confirm(`Excluir bem ${a.code} — ${a.name}?`)) return;
    try {
      await patrimonialService.deleteAsset(a.id);
      loadAssets();
      toast({ title: 'Sucesso', description: 'Bem excluído.' });
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível excluir.', variant: 'destructive' });
    }
  };

  const openDepreciation = (a: PatrimonialAsset) => {
    setDepreciationAsset(a);
    setShowDepreciationModal(true);
  };

  const totalPages = Math.max(1, Math.ceil(assetTotal / (filters.size ?? 10)));

  return (
    <StandardLayout title="Gestão Patrimonial">
      <div className="space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-seguranca-graphite border border-gray-700">
            <TabsTrigger value="bens" className="data-[state=active]:bg-seguranca-red data-[state=active]:text-white">
              <Package className="w-4 h-4 mr-2" /> Bens patrimoniais
            </TabsTrigger>
            <TabsTrigger value="categorias" className="data-[state=active]:bg-seguranca-red data-[state=active]:text-white">
              <FolderTree className="w-4 h-4 mr-2" /> Categorias
            </TabsTrigger>
            <TabsTrigger value="localizacoes" className="data-[state=active]:bg-seguranca-red data-[state=active]:text-white">
              <MapPin className="w-4 h-4 mr-2" /> Localizações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bens" className="mt-4">
            <Card className="p-4 bg-seguranca-graphite border-gray-700">
              <div className="flex flex-col gap-3 mb-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Search size={16} className="text-gray-400" />
                  <Input
                    placeholder="Código ou nome"
                    value={filterCodeOrName}
                    onChange={(e) => setFilterCodeOrName(e.target.value)}
                    className="w-48 bg-seguranca-black border-gray-600"
                  />
                  <Select value={filterCategoryId} onValueChange={setFilterCategoryId}>
                    <SelectTrigger className="w-48 bg-seguranca-black border-gray-600">
                      <SelectValue placeholder="Categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Todas</SelectItem>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterLocationId} onValueChange={setFilterLocationId}>
                    <SelectTrigger className="w-48 bg-seguranca-black border-gray-600">
                      <SelectValue placeholder="Localização" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Todas</SelectItem>
                      {locations.map((l) => (
                        <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-40 bg-seguranca-black border-gray-600">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Todos</SelectItem>
                      {Object.entries(STATUS_LABELS).map(([v, l]) => (
                        <SelectItem key={v} value={v}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={applyAssetFilters}>
                    Filtrar
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => loadAssets()} disabled={assetLoading}>
                    <RefreshCw size={14} className={assetLoading ? 'animate-spin' : ''} />
                  </Button>
                  <Button size="sm" className="bg-seguranca-red hover:bg-seguranca-darkred" onClick={() => { setEditingAsset(null); setShowAssetModal(true); }}>
                    <Plus size={14} className="mr-1" /> Novo
                  </Button>
                </div>
              </div>
              <div className="overflow-x-auto">
                {assetPage.length === 0 ? (
                  <div className="text-sm text-gray-400 py-8">Nenhum bem encontrado.</div>
                ) : (
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="text-gray-400 border-b border-gray-700">
                        <th className="py-2 pr-2">Código</th>
                        <th className="py-2 pr-2">Nome</th>
                        <th className="py-2 pr-2">Categoria</th>
                        <th className="py-2 pr-2">Localização</th>
                        <th className="py-2 pr-2">Data aquisição</th>
                        <th className="py-2 pr-2">Valor aquisição</th>
                        <th className="py-2 pr-2">Valor contábil</th>
                        <th className="py-2 pr-2">Status</th>
                        <th className="py-2 pr-2">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assetPage.map((a) => (
                        <tr key={a.id} className="border-b border-gray-700/50">
                          <td className="py-2 pr-2 font-mono">{a.code}</td>
                          <td className="py-2 pr-2">{a.name}</td>
                          <td className="py-2 pr-2">{a.category?.name ?? '—'}</td>
                          <td className="py-2 pr-2">{a.location?.name ?? '—'}</td>
                          <td className="py-2 pr-2">{formatDate(a.acquisitionDate)}</td>
                          <td className="py-2 pr-2">{formatCurrency(Number(a.acquisitionValue))}</td>
                          <td className="py-2 pr-2">{formatCurrency(computeBookValue(a))}</td>
                          <td className="py-2 pr-2">
                            <Badge variant="secondary">{STATUS_LABELS[a.status] ?? a.status}</Badge>
                          </td>
                          <td className="py-2 pr-2">
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => openDepreciation(a)} title="Ver depreciação">
                                <TrendingDown size={14} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={async () => {
                                  setEditingAsset(a);
                                  setEditingAssetFull(null);
                                  setShowAssetModal(true);
                                  try {
                                    const full = await patrimonialService.getAssetById(a.id);
                                    setEditingAssetFull(full);
                                  } catch {
                                    setEditingAssetFull(a);
                                  }
                                }}
                              >
                                <Edit2 size={14} />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => deleteAsset(a)} className="text-red-400">
                                <Trash2 size={14} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-700">
                  <span className="text-xs text-gray-400">
                    {assetTotal} registro(s) • Página {assetPageNumber + 1} de {totalPages}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={assetPageNumber === 0}
                      onClick={() => setFilters((p) => ({ ...p, page: assetPageNumber - 1 }))}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={assetPageNumber >= totalPages - 1}
                      onClick={() => setFilters((p) => ({ ...p, page: assetPageNumber + 1 }))}
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="categorias" className="mt-4">
            <Card className="p-4 bg-seguranca-graphite border-gray-700">
              <div className="flex justify-end mb-3">
                <Button size="sm" className="bg-seguranca-red hover:bg-seguranca-darkred" onClick={() => { setEditingCategory(null); setShowCategoryModal(true); }}>
                  <Plus size={14} className="mr-1" /> Nova categoria
                </Button>
              </div>
              {categoryLoading && <div className="text-sm text-gray-400">Carregando...</div>}
              {!categoryLoading && categories.length === 0 && <div className="text-sm text-gray-400">Nenhuma categoria cadastrada.</div>}
              {!categoryLoading && categories.length > 0 && (
                <div className="divide-y divide-gray-700">
                  {categories.map((c) => (
                    <div key={c.id} className="py-3 flex items-center justify-between">
                      <div>
                        <span className="font-medium">{c.name}</span>
                        {c.defaultUsefulLifeYears != null && (
                          <span className="text-xs text-gray-400 ml-2">Vida útil padrão: {c.defaultUsefulLifeYears} anos</span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => { setEditingCategory(c); setShowCategoryModal(true); }}>
                          <Edit2 size={14} />
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => deleteCategory(c)}>
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="localizacoes" className="mt-4">
            <Card className="p-4 bg-seguranca-graphite border-gray-700">
              <div className="flex justify-end mb-3">
                <Button size="sm" className="bg-seguranca-red hover:bg-seguranca-darkred" onClick={() => { setEditingLocation(null); setShowLocationModal(true); }}>
                  <Plus size={14} className="mr-1" /> Nova localização
                </Button>
              </div>
              {locationLoading && <div className="text-sm text-gray-400">Carregando...</div>}
              {!locationLoading && locations.length === 0 && <div className="text-sm text-gray-400">Nenhuma localização cadastrada.</div>}
              {!locationLoading && locations.length > 0 && (
                <div className="divide-y divide-gray-700">
                  {locations.map((l) => (
                    <div key={l.id} className="py-3 flex items-center justify-between">
                      <div>
                        <span className="font-medium">{l.name}</span>
                        <span className="text-xs text-gray-400 ml-2">{l.code}</span>
                        {l.addressOrRoom && <span className="text-xs text-gray-400 ml-2"> • {l.addressOrRoom}</span>}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => { setEditingLocation(l); setShowLocationModal(true); }}>
                          <Edit2 size={14} />
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => deleteLocation(l)}>
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>

        <PatrimonialCategoryFormModal
          isOpen={showCategoryModal}
          onClose={() => setShowCategoryModal(false)}
          category={editingCategory}
          onSave={handleSaveCategory}
        />
        <PatrimonialLocationFormModal
          isOpen={showLocationModal}
          onClose={() => setShowLocationModal(false)}
          location={editingLocation}
          onSave={handleSaveLocation}
        />
        <PatrimonialAssetFormModal
          isOpen={showAssetModal}
          onClose={() => { setShowAssetModal(false); setEditingAsset(null); setEditingAssetFull(null); }}
          asset={editingAssetFull ?? editingAsset}
          categories={categories}
          locations={locations}
          onSave={handleSaveAsset}
        />
        <PatrimonialDepreciationModal
          isOpen={showDepreciationModal}
          onClose={() => { setShowDepreciationModal(false); setDepreciationAsset(null); }}
          asset={depreciationAsset}
        />
      </div>
    </StandardLayout>
  );
}
