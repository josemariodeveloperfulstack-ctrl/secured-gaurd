import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  Radio, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Pencil,
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  Calendar, 
  Clock, 
  User, 
  MapPin, 
  RotateCcw, 
  ShieldCheck, 
  Loader2 
} from 'lucide-react';
import { RadioChecklist, radioChecklistService } from '@/services/radioChecklistService';
import { RadioChecklistFormModal } from './RadioChecklistFormModal';
import { RadioChecklistViewModal } from './RadioChecklistViewModal';

export const RadioChecklistTab: React.FC = () => {
  const { toast } = useToast();

  const [checklists, setChecklists] = useState<RadioChecklist[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('TODOS');
  const [dateFilter, setDateFilter] = useState<string>('');

  // Modais
  const [showFormModal, setShowFormModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedChecklist, setSelectedChecklist] = useState<RadioChecklist | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await radioChecklistService.getAll({
        type: typeFilter !== 'TODOS' ? (typeFilter as any) : undefined,
        startDate: dateFilter || undefined,
      });
      setChecklists(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erro ao carregar checklists de rádio:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os registros de checklist.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [typeFilter, dateFilter]);

  const filteredChecklists = checklists.filter((c) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      (c.vigilanteName && c.vigilanteName.toLowerCase().includes(searchLower)) ||
      (c.workPostName && c.workPostName.toLowerCase().includes(searchLower)) ||
      (c.radioAssetId && c.radioAssetId.toLowerCase().includes(searchLower)) ||
      (c.radioSerialNumber && c.radioSerialNumber.toLowerCase().includes(searchLower)) ||
      (c.vigilanteRegistration && c.vigilanteRegistration.toLowerCase().includes(searchLower));

    return matchesSearch;
  });

  // Estatísticas Rápidas
  const total = checklists.length;
  const retiradas = checklists.filter((c) => c.movementType === 'RETIRADA').length;
  const devolucoes = checklists.filter((c) => c.movementType === 'DEVOLUCAO').length;
  const avarias = checklists.filter((c) => c.conformityStatus === 'COM_AVARIA' || (!c.carcacaExterna || !c.antena || !c.clipCinto || !c.botaoPtt)).length;

  const handleOpenView = (item: RadioChecklist) => {
    setSelectedChecklist(item);
    setShowViewModal(true);
  };

  const handleOpenEdit = (item: RadioChecklist) => {
    setSelectedChecklist(item);
    setShowFormModal(true);
  };

  const handleOpenNew = () => {
    setSelectedChecklist(null);
    setShowFormModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Tem certeza que deseja excluir este checklist de rádio?')) return;

    try {
      await radioChecklistService.delete(id);
      toast({
        title: 'Excluído',
        description: 'Checklist excluído com sucesso.',
      });
      loadData();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o checklist.',
        variant: 'destructive',
      });
    }
  };

  const handleDownloadPdf = async (id: number, date: string) => {
    try {
      setDownloadingId(id);
      const blob = await radioChecklistService.downloadPdf(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `checklist-radio-ht-${id}-${date || 'doc'}.pdf`;
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
        description: 'Falha ao gerar o arquivo PDF.',
        variant: 'destructive',
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const isConforme = (c: RadioChecklist) => {
    if (c.conformityStatus) return c.conformityStatus === 'CONFORME';
    return (
      c.carcacaExterna &&
      c.antena &&
      c.clipCinto &&
      c.conectorAcessorios &&
      c.encaixeBateria &&
      c.nivelCarga &&
      c.contatosCarga &&
      c.botaoVolume &&
      c.seletorCanais &&
      c.botaoPtt &&
      c.testeComunicacaoPratica
    );
  };

  return (
    <div className="space-y-6">
      {/* Header & Indicadores Rápidos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="bg-slate-900 border-slate-800 shadow">
          <CardContent className="p-3.5 sm:p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] sm:text-xs text-gray-400 font-medium">Total de Inspeções</p>
              <p className="text-xl sm:text-2xl font-bold text-white mt-0.5">{total}</p>
            </div>
            <div className="p-2.5 bg-slate-800 text-seguranca-yellow rounded-xl">
              <Radio className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800 shadow">
          <CardContent className="p-3.5 sm:p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] sm:text-xs text-gray-400 font-medium">Retiradas (Turno)</p>
              <p className="text-xl sm:text-2xl font-bold text-seguranca-yellow mt-0.5">{retiradas}</p>
            </div>
            <div className="p-2.5 bg-yellow-500/10 text-seguranca-yellow rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800 shadow">
          <CardContent className="p-3.5 sm:p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] sm:text-xs text-gray-400 font-medium">Devoluções (Turno)</p>
              <p className="text-xl sm:text-2xl font-bold text-sky-400 mt-0.5">{devolucoes}</p>
            </div>
            <div className="p-2.5 bg-sky-500/10 text-sky-400 rounded-xl">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800 shadow">
          <CardContent className="p-3.5 sm:p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] sm:text-xs text-gray-400 font-medium">Com Avaria / Obs.</p>
              <p className="text-xl sm:text-2xl font-bold text-rose-400 mt-0.5">{avarias}</p>
            </div>
            <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-xl">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Busca, Filtros e Botão Novo */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-3 pt-4 px-4 sm:px-6 border-b border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base sm:text-lg text-white flex items-center gap-2">
                <Radio className="w-5 h-5 text-seguranca-yellow" />
                <span>Checklist de Radiocomunicação (HT)</span>
              </CardTitle>
              <p className="text-xs text-gray-400 mt-0.5">
                Controle de inspeção rápida na retirada e devolução de rádios comunicadores nos postos.
              </p>
            </div>
            <Button
              onClick={handleOpenNew}
              className="bg-seguranca-yellow hover:bg-seguranca-yellow/90 text-slate-950 font-bold h-10 px-4 flex items-center justify-center gap-2 shadow-lg shadow-seguranca-yellow/20"
            >
              <Plus className="w-4 h-4" />
              Novo Checklist HT
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-4">
          {/* Filtros */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por vigilante, posto, S/N..."
                className="pl-9 bg-slate-950 border-slate-700 text-white text-xs sm:text-sm h-9"
              />
            </div>

            <div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="bg-slate-950 border-slate-700 text-white text-xs sm:text-sm h-9">
                  <SelectValue placeholder="Tipo de Movimentação" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700 text-white">
                  <SelectItem value="TODOS">Todos os Tipos</SelectItem>
                  <SelectItem value="RETIRADA">📥 Retirada (Início Turno)</SelectItem>
                  <SelectItem value="DEVOLUCAO">📤 Devolução (Fim Turno)</SelectItem>
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
                Carregando registros...
              </div>
            ) : filteredChecklists.length === 0 ? (
              <div className="py-10 text-center text-gray-400 bg-slate-950/50 rounded-xl border border-slate-800">
                <Radio className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                Nenhum checklist de HT encontrado.
              </div>
            ) : (
              filteredChecklists.map((item) => {
                const conforme = isConforme(item);
                return (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl border border-slate-800 bg-slate-950 space-y-2.5 shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        {item.movementType === 'RETIRADA' ? (
                          <Badge className="bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 text-[10px] py-0.5">
                            📥 Retirada
                          </Badge>
                        ) : (
                          <Badge className="bg-sky-500/20 text-sky-300 border border-sky-500/40 text-[10px] py-0.5">
                            📤 Devolução
                          </Badge>
                        )}
                        <span className="text-xs text-gray-400 ml-2">
                          {item.checklistDate} {item.checklistTime?.substring(0, 5)}
                        </span>
                      </div>

                      {conforme ? (
                        <Badge className="bg-emerald-600 text-white text-[10px] py-0.5 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Conforme
                        </Badge>
                      ) : (
                        <Badge className="bg-rose-600 text-white text-[10px] py-0.5 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Com Avaria
                        </Badge>
                      )}
                    </div>

                    <div>
                      <p className="text-sm font-bold text-white">{item.vigilanteName}</p>
                      <p className="text-xs text-gray-400">
                        {item.workPostName || 'Posto não informado'}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Rádio: <strong className="text-gray-300">{item.radioAssetId || '-'}</strong> | S/N: <strong className="text-gray-300">{item.radioSerialNumber || '-'}</strong>
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
                        variant="outline"
                        onClick={() => handleOpenEdit(item)}
                        className="text-xs h-8 border-slate-700 text-amber-400 hover:bg-slate-800 hover:text-amber-300"
                        title="Editar Checklist"
                      >
                        <Pencil className="w-3.5 h-3.5 mr-1" /> Editar
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleDownloadPdf(item.id!, item.checklistDate)}
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
                );
              })
            )}
          </div>

          {/* Visualização no Desktop (Tabela) */}
          <div className="hidden md:block rounded-xl border border-slate-800 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 bg-slate-950">
                  <TableHead className="text-gray-300 font-semibold">Data/Hora</TableHead>
                  <TableHead className="text-gray-300 font-semibold">Tipo</TableHead>
                  <TableHead className="text-gray-300 font-semibold">Vigilante</TableHead>
                  <TableHead className="text-gray-300 font-semibold">Setor / Posto de Trabalho</TableHead>
                  <TableHead className="text-gray-300 font-semibold">ID Rádio / S/N</TableHead>
                  <TableHead className="text-gray-300 font-semibold">Status</TableHead>
                  <TableHead className="text-gray-300 font-semibold text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center text-gray-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-seguranca-yellow" />
                      Carregando checklists...
                    </TableCell>
                  </TableRow>
                ) : filteredChecklists.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center text-gray-400">
                      Nenhum checklist de radiocomunicação cadastrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredChecklists.map((item) => {
                    const conforme = isConforme(item);
                    return (
                      <TableRow
                        key={item.id}
                        className="border-slate-800 hover:bg-slate-800/40 transition-colors"
                      >
                        <TableCell className="text-gray-300 text-xs">
                          <span className="font-semibold text-white block">{item.checklistDate}</span>
                          <span className="text-[11px] text-gray-400">{item.checklistTime?.substring(0, 5)}</span>
                        </TableCell>
                        <TableCell>
                          {item.movementType === 'RETIRADA' ? (
                            <Badge className="bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 text-xs py-0.5">
                              📥 Retirada
                            </Badge>
                          ) : (
                            <Badge className="bg-sky-500/20 text-sky-300 border border-sky-500/40 text-xs py-0.5">
                              📤 Devolução
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-white text-sm block">{item.vigilanteName}</span>
                          {item.vigilanteRegistration && (
                            <span className="text-[11px] text-gray-400">RE: {item.vigilanteRegistration}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-gray-300 text-xs">{item.workPostName || '-'}</TableCell>
                        <TableCell className="text-gray-300 text-xs">
                          <span className="font-semibold text-white block">{item.radioAssetId || '-'}</span>
                          <span className="text-[11px] text-gray-400">{item.radioSerialNumber || ''}</span>
                        </TableCell>
                        <TableCell>
                          {conforme ? (
                            <Badge className="bg-emerald-600 text-white text-xs flex items-center gap-1 w-fit">
                              <CheckCircle2 className="w-3 h-3" /> Conforme
                            </Badge>
                          ) : (
                            <Badge className="bg-rose-600 text-white text-xs flex items-center gap-1 w-fit">
                              <AlertTriangle className="w-3 h-3" /> Com Avaria
                            </Badge>
                          )}
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
                              variant="ghost"
                              onClick={() => handleOpenEdit(item)}
                              className="h-8 text-amber-400 hover:text-amber-300 hover:bg-slate-800"
                              title="Editar checklist"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownloadPdf(item.id!, item.checklistDate)}
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
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modais */}
      <RadioChecklistFormModal
        open={showFormModal}
        onOpenChange={setShowFormModal}
        onSuccess={loadData}
        initialData={selectedChecklist}
      />

      <RadioChecklistViewModal
        open={showViewModal}
        onOpenChange={setShowViewModal}
        checklist={selectedChecklist}
      />
    </div>
  );
};
