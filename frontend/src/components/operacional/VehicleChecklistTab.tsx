import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  Car, 
  Plus, 
  Search, 
  Download, 
  Eye, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  Sun, 
  Moon, 
  Calendar, 
  Gauge, 
  Loader2, 
  ShieldCheck, 
  UserCheck 
} from 'lucide-react';
import { VehicleChecklist, vehicleChecklistService } from '@/services/vehicleChecklistService';
import { VehicleChecklistFormModal } from './VehicleChecklistFormModal';
import { VehicleChecklistViewModal } from './VehicleChecklistViewModal';

export const VehicleChecklistTab: React.FC = () => {
  const { toast } = useToast();

  const [checklists, setChecklists] = useState<VehicleChecklist[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [shiftFilter, setShiftFilter] = useState<string>('TODOS');
  const [dateFilter, setDateFilter] = useState<string>('');

  // Modais
  const [showFormModal, setShowFormModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedChecklist, setSelectedChecklist] = useState<VehicleChecklist | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await vehicleChecklistService.getAll({
        shift: shiftFilter !== 'TODOS' ? (shiftFilter as any) : undefined,
        startDate: dateFilter || undefined,
        search: searchTerm.length >= 3 ? searchTerm.trim() : undefined,
      });
      setChecklists(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erro ao carregar checklists de viatura:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os registros de checklist de viatura.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [shiftFilter, dateFilter]);

  // Filtragem dinâmica no frontend (caso digite 3 caracteres ou para buscas locais instantâneas)
  const filteredChecklists = useMemo(() => {
    if (!searchTerm.trim()) {
      return checklists;
    }

    // Se o usuário digitou menos de 3 caracteres, exibe toda a lista com aviso orientativo
    if (searchTerm.trim().length < 3) {
      return checklists;
    }

    const term = searchTerm.toLowerCase().trim();
    return checklists.filter((item) => {
      const matchPlate = item.plate?.toLowerCase().includes(term);
      const matchModel = item.model?.toLowerCase().includes(term);
      const matchEmployee = item.employeeName?.toLowerCase().includes(term);
      const matchSupervisor = item.supervisorName?.toLowerCase().includes(term);
      const matchReg = item.employeeRegistration?.toLowerCase().includes(term);
      return matchPlate || matchModel || matchEmployee || matchSupervisor || matchReg;
    });
  }, [checklists, searchTerm]);

  // Estatísticas
  const total = checklists.length;
  const turnoDia = checklists.filter((c) => c.shift === 'DIA').length;
  const turnoNoite = checklists.filter((c) => c.shift === 'NOITE').length;
  const avarias = checklists.filter((c) => c.conformityStatus === 'COM_AVARIA' || (!c.dianteira || !c.faroisLanternas || !c.pneus || !c.painel)).length;

  const handleOpenView = (item: VehicleChecklist) => {
    setSelectedChecklist(item);
    setShowViewModal(true);
  };

  const handleOpenNew = () => {
    setSelectedChecklist(null);
    setShowFormModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Deseja excluir este checklist de viatura?')) return;

    try {
      await vehicleChecklistService.delete(id);
      toast({
        title: 'Excluído',
        description: 'Checklist de viatura excluído com sucesso.',
      });
      loadData();
    } catch (error) {
      console.error('Erro ao excluir checklist:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o registro.',
        variant: 'destructive',
      });
    }
  };

  const handleDownloadPdf = async (id: number, plate: string, date: string) => {
    try {
      setDownloadingId(id);
      const blob = await vehicleChecklistService.downloadPdf(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `checklist-viatura-${plate || 'doc'}-${date || 'doc'}.pdf`;
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
        description: 'Falha ao gerar o PDF da viatura.',
        variant: 'destructive',
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const isConforme = (c: VehicleChecklist) => {
    if (c.conformityStatus) return c.conformityStatus === 'CONFORME';
    return (
      c.dianteira &&
      c.laterais &&
      c.vidrosRetrovisores &&
      c.identificacaoVisual &&
      c.faroisLanternas &&
      c.giroflexSirene &&
      c.buzina &&
      c.pneus &&
      c.niveis &&
      c.painel &&
      c.documentacao &&
      c.ferramentasEmergencia &&
      c.extintorIncendio &&
      c.kitPrancheta
    );
  };

  return (
    <div className="space-y-6">
      {/* Indicadores Rápidos de Frota */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="bg-slate-900 border-slate-800 shadow">
          <CardContent className="p-3.5 sm:p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] sm:text-xs text-gray-400 font-medium">Inspeções Realizadas</p>
              <p className="text-xl sm:text-2xl font-bold text-white mt-0.5">{total}</p>
            </div>
            <div className="p-2.5 bg-slate-800 text-seguranca-yellow rounded-xl">
              <Car className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800 shadow">
          <CardContent className="p-3.5 sm:p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] sm:text-xs text-gray-400 font-medium">Turno Dia</p>
              <p className="text-xl sm:text-2xl font-bold text-amber-400 mt-0.5">{turnoDia}</p>
            </div>
            <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl">
              <Sun className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800 shadow">
          <CardContent className="p-3.5 sm:p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] sm:text-xs text-gray-400 font-medium">Turno Noite</p>
              <p className="text-xl sm:text-2xl font-bold text-indigo-400 mt-0.5">{turnoNoite}</p>
            </div>
            <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl">
              <Moon className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800 shadow">
          <CardContent className="p-3.5 sm:p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] sm:text-xs text-gray-400 font-medium">Avarias / Obs.</p>
              <p className="text-xl sm:text-2xl font-bold text-rose-400 mt-0.5">{avarias}</p>
            </div>
            <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-xl">
              <AlertTriangle className="w-5 h-5" />
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
                <Car className="w-5 h-5 text-seguranca-yellow" />
                <span>Checklist Diário de Viatura Operacional</span>
              </CardTitle>
              <p className="text-xs text-gray-400 mt-0.5">
                Inspeção preventiva diária de viaturas, lataria, iluminação, mecânica básica e kit de bordo.
              </p>
            </div>
            <Button
              onClick={handleOpenNew}
              className="bg-seguranca-yellow hover:bg-seguranca-yellow/90 text-slate-950 font-bold h-10 px-4 flex items-center justify-center gap-2 shadow-lg shadow-seguranca-yellow/20"
            >
              <Plus className="w-4 h-4" />
              Novo Checklist Viatura
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-4">
          {/* Barra de Pesquisa com Instrução de 3 Caracteres */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Digite 3 caracteres para buscar (Funcionário, Placa...)..."
                className="pl-9 bg-slate-950 border-slate-700 text-white text-xs sm:text-sm h-9"
              />
              {searchTerm.length > 0 && searchTerm.length < 3 && (
                <span className="text-[10px] text-amber-400/90 block mt-1">
                  * Digite mais {3 - searchTerm.length} caractere(s) para filtrar
                </span>
              )}
            </div>

            <div>
              <Select value={shiftFilter} onValueChange={setShiftFilter}>
                <SelectTrigger className="bg-slate-950 border-slate-700 text-white text-xs sm:text-sm h-9">
                  <SelectValue placeholder="Turno" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700 text-white">
                  <SelectItem value="TODOS">Todos os Turnos</SelectItem>
                  <SelectItem value="DIA">☀️ Turno Dia</SelectItem>
                  <SelectItem value="NOITE">🌙 Turno Noite</SelectItem>
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
                <Car className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                Nenhum checklist de viatura encontrado.
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
                      <div className="flex items-center gap-2">
                        {item.shift === 'DIA' ? (
                          <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] py-0.5 flex items-center gap-1">
                            <Sun className="w-3 h-3" /> Dia
                          </Badge>
                        ) : (
                          <Badge className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[10px] py-0.5 flex items-center gap-1">
                            <Moon className="w-3 h-3" /> Noite
                          </Badge>
                        )}
                        <span className="text-xs text-gray-400">
                          {item.checklistDate} {item.checklistTime?.substring(0, 5)}
                        </span>
                      </div>

                      {conforme ? (
                        <Badge className="bg-emerald-600 text-white text-[10px] py-0.5 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Conforme
                        </Badge>
                      ) : (
                        <Badge className="bg-rose-600 text-white text-[10px] py-0.5 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Avaria
                        </Badge>
                      )}
                    </div>

                    <div>
                      <p className="text-sm font-bold text-white flex items-center gap-2">
                        <span className="font-mono text-seguranca-yellow">{item.plate}</span>
                        <span className="text-gray-300 font-normal text-xs">{item.model || ''}</span>
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Condutor: <strong className="text-gray-300">{item.employeeName || item.supervisorName || '-'}</strong>
                      </p>
                      {item.currentKm ? (
                        <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1">
                          <Gauge className="w-3 h-3 text-seguranca-yellow" /> {item.currentKm} km
                        </p>
                      ) : null}
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
                        onClick={() => handleDownloadPdf(item.id!, item.plate, item.checklistDate)}
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
                  <TableHead className="text-gray-300 font-semibold">Turno</TableHead>
                  <TableHead className="text-gray-300 font-semibold">Placa / Modelo</TableHead>
                  <TableHead className="text-gray-300 font-semibold">Km Atual</TableHead>
                  <TableHead className="text-gray-300 font-semibold">Funcionário / Condutor</TableHead>
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
                      Nenhum checklist de viatura registrado.
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
                          {item.shift === 'DIA' ? (
                            <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs py-0.5 flex items-center gap-1 w-fit">
                              <Sun className="w-3 h-3" /> Dia
                            </Badge>
                          ) : (
                            <Badge className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-xs py-0.5 flex items-center gap-1 w-fit">
                              <Moon className="w-3 h-3" /> Noite
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold font-mono text-seguranca-yellow text-sm block">
                            {item.plate}
                          </span>
                          <span className="text-[11px] text-gray-400">{item.model || ''}</span>
                        </TableCell>
                        <TableCell className="text-gray-300 text-xs font-mono">
                          {item.currentKm ? `${item.currentKm} km` : '-'}
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-white text-sm block">
                            {item.employeeName || item.supervisorName || '-'}
                          </span>
                          {item.employeeRegistration && (
                            <span className="text-[11px] text-gray-400">RE: {item.employeeRegistration}</span>
                          )}
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
                              variant="outline"
                              onClick={() => handleDownloadPdf(item.id!, item.plate, item.checklistDate)}
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
      <VehicleChecklistFormModal
        open={showFormModal}
        onOpenChange={setShowFormModal}
        onSuccess={loadData}
        initialData={selectedChecklist}
      />

      <VehicleChecklistViewModal
        open={showViewModal}
        onOpenChange={setShowViewModal}
        checklist={selectedChecklist}
      />
    </div>
  );
};
