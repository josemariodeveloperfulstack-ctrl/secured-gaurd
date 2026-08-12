import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StandardLayout } from '@/components/StandardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  Edit,
  Loader2,
  Mail,
  Phone,
  Plus,
  Shield,
  Stamp,
  Star,
  Trash2,
  Upload,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { companyService } from '@/services/companyService';
import {
  SST_PROFESSIONAL_TYPE_LABELS,
  SstProfessional,
  SstProfessionalType,
  sstProfessionalService,
} from '@/services/sstProfessionalService';

const emptyForm = () => ({
  name: '',
  creaNumber: '',
  phone: '',
  email: '',
  professionalType: 'ENGENHEIRO_SEGURANCA' as SstProfessionalType,
  stampImageUrl: '',
  active: true,
  notes: '',
  companyIds: [] as string[],
  companyDefault: true,
});

const ProfissionaisSST: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [items, setItems] = useState<SstProfessional[]>([]);
  const [companies, setCompanies] = useState<Array<{ id: string; name?: string; sigla?: string }>>([]);
  const [companyFilter, setCompanyFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SstProfessional | null>(null);
  const [form, setForm] = useState(emptyForm());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [professionals, comps] = await Promise.all([
        sstProfessionalService.listAll(),
        companyService.getAllCompanies(),
      ]);
      setItems(professionals || []);
      setCompanies(
        (comps || []).map((c: any) => ({
          id: c.id,
          name: c.name || c.tradeName,
          sigla: c.sigla,
        }))
      );
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar',
        description: err.response?.data?.message || 'Falha ao buscar profissionais de SST',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const linkedCompanyIds = (p: SstProfessional): string[] => {
    if (p.companyIds && p.companyIds.length > 0) return p.companyIds;
    if (p.companyId) return [p.companyId];
    return [];
  };

  const companyLabel = (p: SstProfessional) => {
    if (p.companyNames?.length) return p.companyNames.join(', ');
    return p.companyName || '—';
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((p) => {
      if (companyFilter !== 'ALL' && !linkedCompanyIds(p).includes(companyFilter)) return false;
      if (!q) return true;
      return (
        (p.name || '').toLowerCase().includes(q) ||
        (p.creaNumber || '').toLowerCase().includes(q) ||
        (p.email || '').toLowerCase().includes(q) ||
        (p.phone || '').toLowerCase().includes(q) ||
        companyLabel(p).toLowerCase().includes(q)
      );
    });
  }, [items, companyFilter, search]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...emptyForm(),
      companyIds: companies.map((c) => c.id),
    });
    setModalOpen(true);
  };

  const openEdit = (p: SstProfessional) => {
    setEditing(p);
    setForm({
      name: p.name || '',
      creaNumber: p.creaNumber || '',
      phone: p.phone || '',
      email: p.email || '',
      professionalType: p.professionalType || 'ENGENHEIRO_SEGURANCA',
      stampImageUrl: p.stampImageUrl || '',
      active: p.active !== false,
      notes: p.notes || '',
      companyIds: linkedCompanyIds(p),
      companyDefault: Boolean(p.companyDefault),
    });
    setModalOpen(true);
  };

  const toggleCompany = (companyId: string, checked: boolean) => {
    setForm((prev) => {
      const next = checked
        ? [...prev.companyIds, companyId]
        : prev.companyIds.filter((id) => id !== companyId);
      return { ...prev, companyIds: next };
    });
  };

  const handleStampUpload = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const uploaded = await sstProfessionalService.uploadStamp(file);
      setForm((prev) => ({ ...prev, stampImageUrl: uploaded.url }));
      toast({ title: 'Carimbo enviado', description: 'A imagem será usada nas OS e relatórios.' });
    } catch (err: any) {
      toast({
        title: 'Erro no upload',
        description: err.response?.data?.error || err.response?.data?.message || 'Falha ao enviar carimbo',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.creaNumber.trim() || form.companyIds.length === 0) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Informe nome completo, registro e ao menos uma empresa.',
        variant: 'destructive',
      });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        creaNumber: form.creaNumber.trim(),
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        professionalType: form.professionalType,
        stampImageUrl: form.stampImageUrl || undefined,
        active: form.active,
        notes: form.notes.trim() || undefined,
        companyId: form.companyIds[0],
        companyIds: form.companyIds,
        companyDefault: form.companyDefault,
      };
      if (editing) {
        await sstProfessionalService.update(editing.id, payload);
        toast({ title: 'Profissional atualizado' });
      } else {
        await sstProfessionalService.create(payload);
        toast({ title: 'Profissional cadastrado' });
      }
      setModalOpen(false);
      await load();
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar',
        description: err.response?.data?.message || 'Falha ao salvar profissional',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p: SstProfessional) => {
    if (!confirm(`Excluir o profissional "${p.name}"?`)) return;
    try {
      await sstProfessionalService.remove(p.id);
      toast({ title: 'Profissional excluído' });
      await load();
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err.response?.data?.message || 'Falha ao excluir',
        variant: 'destructive',
      });
    }
  };

  const handleSetDefault = async (p: SstProfessional) => {
    try {
      await sstProfessionalService.setAsDefault(p.id);
      toast({
        title: 'Profissional padrão definido',
        description: 'Este carimbo será usado nas Ordens de Serviço e relatórios da empresa.',
      });
      await load();
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err.response?.data?.message || 'Falha ao definir padrão',
        variant: 'destructive',
      });
    }
  };

  const STAMP_BASE_URL = '/api/uploads/safety-engineers/stamps/';

  const stampSrc = (url?: string) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    const clean = url.startsWith('/') ? url.slice(1) : url;
    if (clean.startsWith('api/uploads/safety-engineers/stamps/')) {
      return '/' + clean;
    }
    if (clean.startsWith('uploads/safety-engineers/stamps/')) {
      return '/' + clean;
    }
    if (clean.startsWith('safety-engineers/stamps/')) {
      return STAMP_BASE_URL + clean.replace('safety-engineers/stamps/', '');
    }
    return STAMP_BASE_URL + clean;
  };

  return (
    <StandardLayout title="Profissionais de SST">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/rh/sst')} className="mt-1">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Shield className="h-6 w-6 text-seguranca-red" />
                Profissionais de SST
              </h1>
              <p className="text-sm text-muted-foreground max-w-2xl">
                Cadastro do responsável por orientar a empresa, definir regras de SST e assinar Ordens de
                Serviço / relatórios com o carimbo oficial.
              </p>
            </div>
          </div>
          <Button onClick={openCreate} className="bg-seguranca-red hover:bg-seguranca-red/90">
            <Plus className="h-4 w-4 mr-2" />
            Novo profissional
          </Button>
        </div>

        <Card className="bg-seguranca-graphite/40 border-gray-700">
          <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              placeholder="Buscar por nome, registro, contato..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select value={companyFilter} onValueChange={setCompanyFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Empresa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas as empresas</SelectItem>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.sigla ? `${c.sigla} — ` : ''}
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => void load()} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Atualizar
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-seguranca-graphite/40 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-white flex items-center gap-2">
              <Stamp className="h-4 w-4 text-seguranca-yellow" />
              Responsáveis cadastrados
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-seguranca-yellow" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Profissional</TableHead>
                    <TableHead>Registro</TableHead>
                    <TableHead>Contatos</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Carimbo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        Nenhum profissional cadastrado. Cadastre o responsável de SST da empresa.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <div className="font-medium text-white">{p.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {SST_PROFESSIONAL_TYPE_LABELS[p.professionalType] || p.professionalType}
                          </div>
                          {p.companyDefault && (
                            <Badge className="mt-1 bg-amber-600/80 text-xs">
                              <Star className="h-3 w-3 mr-1" />
                              Padrão da empresa
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{p.creaNumber}</TableCell>
                        <TableCell className="text-sm space-y-1">
                          {p.phone ? (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Phone className="h-3 w-3" /> {p.phone}
                            </div>
                          ) : null}
                          {p.email ? (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Mail className="h-3 w-3" /> {p.email}
                            </div>
                          ) : null}
                          {!p.phone && !p.email ? <span className="text-muted-foreground">—</span> : null}
                        </TableCell>
                        <TableCell className="text-sm max-w-[220px]">
                          <div className="space-y-1">
                            {linkedCompanyIds(p).length > 1 ? (
                              linkedCompanyIds(p).map((id) => {
                                const c = companies.find((x) => x.id === id);
                                return (
                                  <div key={id} className="text-xs text-muted-foreground">
                                    {c?.sigla ? `${c.sigla} — ` : ''}
                                    {c?.name || id}
                                  </div>
                                );
                              })
                            ) : (
                              <span>{companyLabel(p)}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {p.stampImageUrl ? (
                            <img
                              src={stampSrc(p.stampImageUrl) || ''}
                              alt={`Carimbo de ${p.name}`}
                              className="h-12 max-w-[120px] object-contain rounded border border-gray-600 bg-white/5 p-1"
                              onError={(e) => {
                                const target = e.currentTarget;
                                target.onerror = null;
                                target.style.display = 'none';
                                if (target.parentElement && !target.parentElement.querySelector('.stamp-fallback')) {
                                  const fallback = document.createElement('span');
                                  fallback.className = 'stamp-fallback text-xs text-amber-400';
                                  fallback.innerText = 'Sem carimbo (Reenviar)';
                                  target.parentElement.appendChild(fallback);
                                }
                              }}
                            />
                          ) : (
                            <span className="text-xs text-amber-400">Sem carimbo</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {p.active !== false ? (
                            <Badge className="bg-emerald-700/80">Ativo</Badge>
                          ) : (
                            <Badge variant="secondary">Inativo</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          {!p.companyDefault && (
                            <Button
                              size="sm"
                              variant="ghost"
                              title="Definir como padrão da empresa"
                              onClick={() => void handleSetDefault(p)}
                            >
                              <BadgeCheck className="h-4 w-4 text-amber-400" />
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => openEdit(p)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-400"
                            onClick={() => void handleDelete(p)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-seguranca-graphite border-gray-700 text-white">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-seguranca-red" />
                {editing ? 'Editar profissional de SST' : 'Novo profissional de SST'}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Este profissional assina e se responsabiliza pelos documentos de SST (OS, relatórios) e
                orienta as regras que a empresa deve seguir.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
              <div className="md:col-span-2 space-y-2">
                <Label>Nome completo *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Nome completo do profissional"
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select
                  value={form.professionalType}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, professionalType: v as SstProfessionalType }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SST_PROFESSIONAL_TYPE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Registro (CREA / MTE / CRM) *</Label>
                <Input
                  value={form.creaNumber}
                  onChange={(e) => setForm((p) => ({ ...p, creaNumber: e.target.value }))}
                  placeholder="Ex.: CREA/MG 119986 D"
                />
              </div>

              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="contato@empresa.com"
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <Label>Empresas *</Label>
                <p className="text-xs text-muted-foreground">
                  Selecione uma ou mais empresas em que o profissional atua (ex.: as 3).
                </p>
                <div className="rounded border border-gray-600 bg-black/20 p-3 space-y-2">
                  {companies.length === 0 ? (
                    <span className="text-xs text-muted-foreground">Nenhuma empresa carregada.</span>
                  ) : (
                    companies.map((c) => {
                      const checked = form.companyIds.includes(c.id);
                      return (
                        <label
                          key={c.id}
                          className="flex items-center gap-2 text-sm cursor-pointer hover:text-white"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => toggleCompany(c.id, e.target.checked)}
                            className="h-4 w-4"
                          />
                          <span>
                            {c.sigla ? `${c.sigla} — ` : ''}
                            {c.name}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
                {form.companyIds.length > 0 && (
                  <p className="text-xs text-emerald-400">
                    {form.companyIds.length} empresa(s) selecionada(s)
                  </p>
                )}
              </div>

              <div className="md:col-span-2 space-y-2">
                <Label>Carimbo de assinatura (imagem)</Label>
                <p className="text-xs text-muted-foreground">
                  PNG ou JPG do carimbo/assinatura que compõe as Ordens de Serviço e relatórios do
                  funcionário.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 items-start">
                  <Input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    disabled={uploading}
                    onChange={(e) => void handleStampUpload(e.target.files?.[0])}
                  />
                  {uploading && <Loader2 className="h-5 w-5 animate-spin" />}
                </div>
                {form.stampImageUrl ? (
                  <div className="mt-2 rounded border border-gray-600 bg-white/5 p-3 inline-block">
                    <img
                      src={stampSrc(form.stampImageUrl) || ''}
                      alt="Pré-visualização do carimbo"
                      className="max-h-28 max-w-xs object-contain"
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.onerror = null;
                        target.style.display = 'none';
                      }}
                    />
                    <div className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Carimbo pronto para uso
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-amber-400 flex items-center gap-1">
                    <Upload className="h-3 w-3" /> Nenhum carimbo enviado
                  </div>
                )}
              </div>

              <div className="md:col-span-2 space-y-2">
                <Label>Observações / responsabilidades</Label>
                <Textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Escopo de orientação SST, NRs sob responsabilidade, etc."
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="active"
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))}
                  className="h-4 w-4"
                />
                <Label htmlFor="active">Ativo</Label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="companyDefault"
                  type="checkbox"
                  checked={form.companyDefault}
                  onChange={(e) => setForm((p) => ({ ...p, companyDefault: e.target.checked }))}
                  className="h-4 w-4"
                />
                <Label htmlFor="companyDefault">
                  Definir como padrão nas empresas selecionadas (OS/relatórios)
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={() => void handleSave()} disabled={saving} className="bg-seguranca-red">
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </StandardLayout>
  );
};

export default ProfissionaisSST;
