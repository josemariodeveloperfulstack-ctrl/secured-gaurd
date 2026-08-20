import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  Crosshair, 
  Plus, 
  Search, 
  Download, 
  Eye, 
  Trash2, 
  ShieldAlert, 
  ShieldCheck, 
  UserCheck, 
  Loader2, 
  CheckCircle2, 
  Calendar 
} from 'lucide-react';
import { FirearmAcautelamento, firearmAcautelamentoService } from '@/services/firearmAcautelamentoService';
import { FirearmAcautelamentoFormModal } from './FirearmAcautelamentoFormModal';
import { FirearmAcautelamentoViewModal } from './FirearmAcautelamentoViewModal';

export const FirearmAcautelamentoTab: React.FC = () => {
  const { toast } = useToast();

  const [termos, setTermos] = useState<FirearmAcautelamento[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('TODOS');
  const [dateFilter, setDateFilter] = useState<string>('');

  // Modais
  const [showFormModal, setShowFormModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedTermo, setSelectedTermo] = useState<FirearmAcautelamento | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await firearmAcautelamentoService.getAll({
        status: statusFilter !== 'TODOS' ? statusFilter : undefined,
        startDate: dateFilter || undefined,
        search: searchTerm.length >= 3 ? searchTerm.trim() : undefined,
      });
      setTermos(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erro ao carregar termos de acautelamento:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os termos de acautelamento.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, dateFilter]);

  // Filtragem dinâmica instantânea a partir de 3 caracteres
  const filteredTermos = useMemo(() => {
    if (!searchTerm.trim()) {
      return termos;
    }

    if (searchTerm.trim().length < 3) {
      return termos;
    }

    const term = searchTerm.toLowerCase().trim();
    return termos.filter((item) => {
      const matchVigilante = item.vigilanteName?.toLowerCase().includes(term);
      const matchSerial = item.serialNumber?.toLowerCase().includes(term);
      const matchCraf = item.crafNumber?.toLowerCase().includes(term);
      const matchWeapon = item.weaponType?.toLowerCase().includes(term);
      const matchBrand = item.brand?.toLowerCase().includes(term);
      const matchPost = item.workPostName?.toLowerCase().includes(term);
      const matchCpf = item.cpf?.toLowerCase().includes(term);
      const matchReg = item.registration?.toLowerCase().includes(term);
      return matchVigilante || matchSerial || matchCraf || matchWeapon || matchBrand || matchPost || matchCpf || matchReg;
    });
  }, [termos, searchTerm]);

  // Indicadores
  const total = termos.length;
  const ativos = termos.filter((t) => (t.status || 'ATIVO') === 'ATIVO').length;
  const revolveres = termos.filter((t) => t.weaponType?.toLowerCase().includes('rev')).length;
  const pistolas = termos.filter((t) => t.weaponType?.toLowerCase().includes('pist')).length;

  const handleOpenView = (item: FirearmAcautelamento) => {
    setSelectedTermo(item);
    setShowViewModal(true);
  };

  const handleOpenNew = () => {
    setSelectedTermo(null);
    setShowFormModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Deseja excluir este termo de acautelamento?')) return;

    try {
      await firearmAcautelamentoService.delete(id);
      toast({
        title: 'Excluído',
        description: 'Termo de acautelamento excluído com sucesso.',
      });
      loadData();
    } catch (error) {
      console.error('Erro ao excluir termo:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o termo.',
        variant: 'destructive',
      });
    }
  };

  const handleDownloadPdf = async (id: number, serial: string) => {
    try {
      setDownloadingId(id);
      const blob = await firearmAcautelamentoService.downloadPdf(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `termo-acautelamento-arma-${serial || id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Sucesso',
        description: 'Download do PDF oficial iniciado.',
      });
    } catch (error) {
      console.error('Erro ao baixar PDF:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao gerar o PDF do termo.',
        variant: 'destructive',
      });
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Indicadores Rápidos de Armamento */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="bg-slate-900 border-slate-800 shadow">
          <CardContent className="p-3.5 sm:p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] sm:text-xs text-gray-400 font-medium">Total de Acautelamentos</p>
              <p className="text-xl sm:text-2xl font-bold text-white mt-0.5">{total}</p>
            </div>
            <div className="p-2.5 bg-slate-800 text-seguranca-yellow rounded-xl">
              <Crosshair className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800 shadow">
          <CardContent className="p-3.5 sm:p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] sm:text-xs text-gray-400 font-medium">Termos Ativos</p>
              <p className="text-xl sm:text-2xl font-bold text-emerald-400 mt-0.5">{ativos}</p>
            </div>
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800 shadow">
          <CardContent className="p-3.5 sm:p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] sm:text-xs text-gray-400 font-medium">Revólveres (.38)</p>
              <p className="text-xl sm:text-2xl font-bold text-seguranca-yellow mt-0.5">{revolveres}</p>
            </div>
            <div className="p-2.5 bg-seguranca-yellow/10 text-seguranca-yellow rounded-xl">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800 shadow">
          <CardContent className="p-3.5 sm:p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] sm:text-xs text-gray-400 font-medium">Pistolas / Outras</p>
              <p className="text-xl sm:text-2xl font-bold text-indigo-400 mt-0.5">{pistolas}</p>
            </div>
            <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl">
              <UserCheck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Ações e Filtros */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-3 pt-4 px-4 sm:px-6 border-b border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base sm:text-lg text-white flex items-center gap-2">
                <Crosshair className="w-5 h-5 text-seguranca-yellow" />
                <span>Termo de Acautelamento de Arma de Fogo e Munição</span>
              </CardTitle>
              <p className="text-xs text-gray-400 mt-0.5">
                Controle de cautela diária de armamento e munições com cláusulas da Polícia Federal e CLT.
              </p>
            </div>
            <Button
              onClick={handleOpenNew}
              className="bg-seguranca-yellow hover:bg-seguranca-yellow/90 text-slate-950 font-bold h-10 px-4 flex items-center justify-center gap-2 shadow-lg shadow-seguranca-yellow/20"
            >
              <Plus className="w-4 h-4" />
              Novo Termo Acautelamento
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-4">
          {/* Barra de Pesquisa com Regra de 3 Caracteres */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Digite 3 caracteres para buscar (Vigilante, Nº Série, CRAF, Posto)..."
                className="pl-9 bg-slate-950 border-slate-700 text-white text-xs sm:text-sm h-9"
              />
              {searchTerm.length > 0 && searchTerm.length < 3 && (
                <span className="text-[10px] text-amber-400/90 block mt-1">
                  * Digite mais {3 - searchTerm.length} caractere(s) para filtrar
                </span>
              )}
            </div>

            <div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-slate-950 border-slate-700 text-white text-xs sm:text-sm h-9">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700 text-white">
                  <SelectItem value="TODOS">Todos os Status</SelectItem>
                  <SelectItem value="ATIVO">🟢 Ativo (Cautelado)</SelectItem>
                  <SelectItem value="DEVOLVIDO">⚪ Devolvido à Armaria</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="bg-slate-950 border-slate-700 text-white text-xs sm:text-sm h-9"
              />
            </div>
          </div>

          {/* Visualização no Mobile (Cards) */}
          <div className="block md:hidden space-y-3">
            {loading ? (
              <div className="py-12 text-center text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-seguranca-yellow" />
                Carregando termos...
              </div>
            ) : filteredTermos.length === 0 ? (
              <div className="py-10 text-center text-gray-400 bg-slate-950/50 rounded-xl border border-slate-800">
                <Crosshair className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                Nenhum termo de acautelamento encontrado.
              </div>
            ) : (
              filteredTermos.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl border border-slate-800 bg-slate-950 space-y-2.5 shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-1.5">
                      <Badge className="bg-slate-800 text-seguranca-yellow border border-seguranca-yellow/40 text-[10px] py-0.5">
                        {item.weaponType} {item.caliber || ''}
                      </Badge>
                      <span className="text-xs text-gray-400">{item.termDate}</span>
                    </div>
                    <Badge className="bg-emerald-600 text-white text-[10px] py-0.5">
                      {item.status || 'ATIVO'}
                    </Badge>
                  </div>

                  <div>
                    <p className="text-sm font-bold text-white flex items-center gap-2">
                      <span className="font-mono text-seguranca-yellow">Série: {item.serialNumber}</span>
                      {item.crafNumber && <span className="text-gray-400 text-xs font-normal">| CRAF: {item.crafNumber}</span>}
                    </p>
                    <p className="text-xs text-gray-300 mt-1">
                      Vigilante: <strong className="text-white">{item.vigilanteName}</strong>
                      {item.registration && <span className="text-gray-400"> (RE: {item.registration})</span>}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Posto: <span className="text-gray-300">{item.workPostName || 'Não especificado'}</span>
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Munições: <span className="text-gray-300 font-semibold">{item.ammoQuantity || 0} un</span> ({item.ammoType || 'Novas'})
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-800">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenView(item)}
                      className="text-xs h-8 border-slate-700 text-gray-300 hover:bg-slate-800"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" /> Detalhes
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleDownloadPdf(item.id!, item.serialNumber)}
                      disabled={downloadingId === item.id}
                      className="text-xs h-8 bg-seguranca-yellow hover:bg-seguranca-yellow/90 text-slate-950 font-semibold"
                    >
                      {downloadingId === item.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <>
                          <Download className="w-3.5 h-3.5 mr-1" /> PDF
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(item.id!)}
                      className="text-xs h-8 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 px-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Visualização no Desktop (Tabela) */}
          <div className="hidden md:block rounded-xl border border-slate-800 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 bg-slate-950">
                  <TableHead className="text-gray-300 font-semibold">Data</TableHead>
                  <TableHead className="text-gray-300 font-semibold">Vigilante / RE</TableHead>
                  <TableHead className="text-gray-300 font-semibold">Armamento / Calibre</TableHead>
                  <TableHead className="text-gray-300 font-semibold">Nº Série / CRAF</TableHead>
                  <TableHead className="text-gray-300 font-semibold">Setor de Trabalho</TableHead>
                  <TableHead className="text-gray-300 font-semibold">Munições</TableHead>
                  <TableHead className="text-gray-300 font-semibold">Status</TableHead>
                  <TableHead className="text-gray-300 font-semibold text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-12 text-center text-gray-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-seguranca-yellow" />
                      Carregando termos de acautelamento...
                    </TableCell>
                  </TableRow>
                ) : filteredTermos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-12 text-center text-gray-400">
                      Nenhum termo de acautelamento registrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTermos.map((item) => (
                    <TableRow
                      key={item.id}
                      className="border-slate-800 hover:bg-slate-800/40 transition-colors"
                    >
                      <TableCell className="text-gray-300 text-xs font-medium">
                        {item.termDate}
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-white text-sm block">
                          {item.vigilanteName}
                        </span>
                        {item.registration && (
                          <span className="text-[11px] text-gray-400">RE: {item.registration}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-gray-200 text-sm block">
                          {item.weaponType} {item.brand || ''}
                        </span>
                        <span className="text-[11px] text-seguranca-yellow">{item.caliber || '-'}</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold font-mono text-seguranca-yellow text-sm block">
                          {item.serialNumber}
                        </span>
                        {item.crafNumber && (
                          <span className="text-[11px] text-gray-400">CRAF: {item.crafNumber}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-gray-300 text-xs">
                        {item.workPostName || '-'}
                      </TableCell>
                      <TableCell className="text-gray-300 text-xs">
                        <span className="font-semibold text-white">{item.ammoQuantity || 0} un</span>
                        <span className="text-[11px] text-gray-400 block">{item.ammoType || 'Novas'}</span>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-emerald-600 text-white text-xs">
                          {item.status || 'ATIVO'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenView(item)}
                            className="h-8 text-gray-400 hover:text-white hover:bg-slate-800"
                            title="Visualizar detalhes"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownloadPdf(item.id!, item.serialNumber)}
                            disabled={downloadingId === item.id}
                            className="h-8 text-xs border-slate-700 text-seguranca-yellow hover:bg-seguranca-yellow/10"
                            title="Baixar PDF Oficial"
                          >
                            {downloadingId === item.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(item.id!)}
                            className="h-8 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modais */}
      <FirearmAcautelamentoFormModal
        open={showFormModal}
        onOpenChange={setShowFormModal}
        onSuccess={loadData}
        initialData={selectedTermo}
      />

      <FirearmAcautelamentoViewModal
        open={showViewModal}
        onOpenChange={setShowViewModal}
        termo={selectedTermo}
      />
    </div>
  );
};
