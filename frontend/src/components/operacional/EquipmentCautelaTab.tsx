import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  PackageCheck, 
  Plus, 
  Search, 
  Download, 
  Eye, 
  Trash2, 
  Radio, 
  Flashlight, 
  ShieldCheck, 
  Loader2 
} from 'lucide-react';
import { EquipmentCautela, equipmentCautelaService } from '@/services/equipmentCautelaService';
import { EquipmentCautelaFormModal } from './EquipmentCautelaFormModal';
import { EquipmentCautelaViewModal } from './EquipmentCautelaViewModal';

export const EquipmentCautelaTab: React.FC = () => {
  const { toast } = useToast();

  const [termos, setTermos] = useState<EquipmentCautela[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('TODOS');
  const [dateFilter, setDateFilter] = useState<string>('');

  // Modais
  const [showFormModal, setShowFormModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedTermo, setSelectedTermo] = useState<EquipmentCautela | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await equipmentCautelaService.getAll({
        status: statusFilter !== 'TODOS' ? statusFilter : undefined,
        startDate: dateFilter || undefined,
        search: searchTerm.length >= 3 ? searchTerm.trim() : undefined,
      });
      setTermos(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erro ao carregar termos de cautela:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os termos de cautela.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, dateFilter]);

  // Filtragem instantânea a partir de 3 caracteres
  const filteredTermos = useMemo(() => {
    if (!searchTerm.trim()) {
      return termos;
    }

    if (searchTerm.trim().length < 3) {
      return termos;
    }

    const term = searchTerm.toLowerCase().trim();
    return termos.filter((item) => {
      const matchColaborador = item.employeeName?.toLowerCase().includes(term);
      const matchPosto = item.workPostName?.toLowerCase().includes(term);
      const matchCpf = item.cpf?.toLowerCase().includes(term);
      const matchReg = item.registration?.toLowerCase().includes(term);
      const matchCargo = item.jobTitle?.toLowerCase().includes(term);
      const matchHt = item.item1HtMarcaModelo?.toLowerCase().includes(term);
      const matchLanterna = item.item3LanternaMarcaModelo?.toLowerCase().includes(term);
      const matchBastao = item.item4BastaoMarcaModelo?.toLowerCase().includes(term);
      return matchColaborador || matchPosto || matchCpf || matchReg || matchCargo || matchHt || matchLanterna || matchBastao;
    });
  }, [termos, searchTerm]);

  // Indicadores
  const total = termos.length;
  const ativos = termos.filter((t) => (t.status || 'ATIVO') === 'ATIVO').length;
  const htsEntregues = termos.filter((t) => t.item1HtEntregue).length;
  const lanternasEntregues = termos.filter((t) => t.item3LanternaEntregue).length;

  const handleOpenView = (item: EquipmentCautela) => {
    setSelectedTermo(item);
    setShowViewModal(true);
  };

  const handleOpenNew = () => {
    setSelectedTermo(null);
    setShowFormModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Deseja excluir este termo de cautela de equipamentos?')) return;

    try {
      await equipmentCautelaService.delete(id);
      toast({
        title: 'Excluído',
        description: 'Termo de cautela excluído com sucesso.',
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

  const handleDownloadPdf = async (id: number, empName: string) => {
    try {
      setDownloadingId(id);
      const blob = await equipmentCautelaService.downloadPdf(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `termo-cautela-equipamentos-${empName || id}.pdf`;
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
        description: 'Falha ao gerar o PDF da cautela.',
        variant: 'destructive',
      });
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Indicadores Rápidos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="bg-slate-900 border-slate-800 shadow">
          <CardContent className="p-3.5 sm:p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] sm:text-xs text-gray-400 font-medium">Total de Cautelas</p>
              <p className="text-xl sm:text-2xl font-bold text-white mt-0.5">{total}</p>
            </div>
            <div className="p-2.5 bg-slate-800 text-seguranca-yellow rounded-xl">
              <PackageCheck className="w-5 h-5" />
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
              <p className="text-[11px] sm:text-xs text-gray-400 font-medium">Rádios HT Entregues</p>
              <p className="text-xl sm:text-2xl font-bold text-seguranca-yellow mt-0.5">{htsEntregues}</p>
            </div>
            <div className="p-2.5 bg-seguranca-yellow/10 text-seguranca-yellow rounded-xl">
              <Radio className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800 shadow">
          <CardContent className="p-3.5 sm:p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] sm:text-xs text-gray-400 font-medium">Lanternas Entregues</p>
              <p className="text-xl sm:text-2xl font-bold text-indigo-400 mt-0.5">{lanternasEntregues}</p>
            </div>
            <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl">
              <Flashlight className="w-5 h-5" />
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
                <PackageCheck className="w-5 h-5 text-seguranca-yellow" />
                <span>Termo de Cautela e Responsabilidade de Equipamentos</span>
              </CardTitle>
              <p className="text-xs text-gray-400 mt-0.5">
                Controle de empréstimo de materiais operacionais, HTs, lanternas e bastões de ronda.
              </p>
            </div>
            <Button
              onClick={handleOpenNew}
              className="bg-seguranca-yellow hover:bg-seguranca-yellow/90 text-slate-950 font-bold h-10 px-4 flex items-center justify-center gap-2 shadow-lg shadow-seguranca-yellow/20"
            >
              <Plus className="w-4 h-4" />
              Novo Termo de Cautela
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
                placeholder="Digite 3 caracteres para buscar (Colaborador, Posto, Equipamento)..."
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
                  <SelectItem value="ATIVO">🟢 Ativo (Empréstimo)</SelectItem>
                  <SelectItem value="DEVOLVIDO">⚪ Devolvido ao Almoxarifado</SelectItem>
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
                <PackageCheck className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                Nenhum termo de cautela encontrado.
              </div>
            ) : (
              filteredTermos.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl border border-slate-800 bg-slate-950 space-y-2.5 shadow"
                >
                  <div className="flex items-start justify-between">
                    <span className="text-xs text-gray-400 font-medium">{item.termDate}</span>
                    <Badge className="bg-emerald-600 text-white text-[10px] py-0.5">
                      {item.status || 'ATIVO'}
                    </Badge>
                  </div>

                  <div>
                    <p className="text-sm font-bold text-white flex items-center gap-1.5">
                      <span>{item.employeeName}</span>
                      {item.registration && <span className="text-xs text-gray-400 font-normal">(RE: {item.registration})</span>}
                    </p>
                    <p className="text-xs text-gray-300 mt-1">
                      Posto: <strong className="text-white">{item.workPostName || 'Não informado'}</strong>
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      {item.item1HtEntregue && (
                        <Badge className="bg-slate-800 text-seguranca-yellow border border-seguranca-yellow/40 text-[10px] py-0.5 flex items-center gap-1">
                          <Radio className="w-3 h-3" /> HT
                        </Badge>
                      )}
                      {item.item2CarregadorEntregue && (
                        <Badge className="bg-slate-800 text-indigo-300 border border-indigo-500/40 text-[10px] py-0.5">
                          Carregador
                        </Badge>
                      )}
                      {item.item3LanternaEntregue && (
                        <Badge className="bg-slate-800 text-amber-300 border border-amber-500/40 text-[10px] py-0.5 flex items-center gap-1">
                          <Flashlight className="w-3 h-3" /> Lanterna
                        </Badge>
                      )}
                      {item.item4BastaoEntregue && (
                        <Badge className="bg-slate-800 text-rose-300 border border-rose-500/40 text-[10px] py-0.5">
                          Bastão Ronda
                        </Badge>
                      )}
                    </div>
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
                      onClick={() => handleDownloadPdf(item.id!, item.employeeName)}
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
                  <TableHead className="text-gray-300 font-semibold">Colaborador / RE</TableHead>
                  <TableHead className="text-gray-300 font-semibold">Cargo</TableHead>
                  <TableHead className="text-gray-300 font-semibold">Setor de Trabalho</TableHead>
                  <TableHead className="text-gray-300 font-semibold">Itens Acautelados</TableHead>
                  <TableHead className="text-gray-300 font-semibold">Status</TableHead>
                  <TableHead className="text-gray-300 font-semibold text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center text-gray-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-seguranca-yellow" />
                      Carregando termos de cautela...
                    </TableCell>
                  </TableRow>
                ) : filteredTermos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center text-gray-400">
                      Nenhum termo de cautela registrado.
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
                          {item.employeeName}
                        </span>
                        {item.registration && (
                          <span className="text-[11px] text-gray-400">RE: {item.registration}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-gray-300 text-xs">
                        {item.jobTitle || 'Vigilante'}
                      </TableCell>
                      <TableCell className="text-gray-300 text-xs font-medium">
                        {item.workPostName || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1">
                          {item.item1HtEntregue && (
                            <Badge className="bg-slate-800 text-seguranca-yellow border border-seguranca-yellow/40 text-[10px] py-0.5">
                              HT
                            </Badge>
                          )}
                          {item.item2CarregadorEntregue && (
                            <Badge className="bg-slate-800 text-indigo-300 border border-indigo-500/40 text-[10px] py-0.5">
                              Carregador
                            </Badge>
                          )}
                          {item.item3LanternaEntregue && (
                            <Badge className="bg-slate-800 text-amber-300 border border-amber-500/40 text-[10px] py-0.5">
                              Lanterna
                            </Badge>
                          )}
                          {item.item4BastaoEntregue && (
                            <Badge className="bg-slate-800 text-rose-300 border border-rose-500/40 text-[10px] py-0.5">
                              Bastão Ronda
                            </Badge>
                          )}
                        </div>
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
                            onClick={() => handleDownloadPdf(item.id!, item.employeeName)}
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
      <EquipmentCautelaFormModal
        open={showFormModal}
        onOpenChange={setShowFormModal}
        onSuccess={loadData}
        initialData={selectedTermo}
      />

      <EquipmentCautelaViewModal
        open={showViewModal}
        onOpenChange={setShowViewModal}
        termo={selectedTermo}
      />
    </div>
  );
};
