import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { 
  FileText, 
  Search, 
  Download, 
  Eye, 
  Trash2, 
  FileDown,
  Calendar,
  User,
  Building,
  Loader2,
  Filter,
  RefreshCw,
  HardHat,
  Plus,
  MapPin,
  Edit,
  FileSpreadsheet
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { epiDeliveryFormService, EPIDeliveryForm, EPIDeliveryType } from '@/services/epiDeliveryFormService';
import { useGSAP } from '@/hooks/use-gsap';
import { formatAdmissionDateBr } from '@/utils/employeeAdmissionDate';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import FichaEntregaEPIForm from '@/components/funcionarios/FichaEntregaEPIForm';
import FichaEntregaEPIManualForm from '@/components/funcionarios/FichaEntregaEPIManualForm';
import EPIDeliveryReportModal from './EPIDeliveryReportModal';

const DELIVERY_TYPE_LABELS: Record<string, string> = {
  PRIMEIRA_ENTREGA: 'Primeira Entrega',
  SUBSTITUICAO: 'Substituição',
  DEVOLUCAO: 'Devolução',
  TROCA: 'Troca',
};

const DELIVERY_TYPE_COLORS: Record<string, string> = {
  PRIMEIRA_ENTREGA: 'bg-green-100 text-green-800 border-green-200',
  SUBSTITUICAO: 'bg-blue-100 text-blue-800 border-blue-200',
  DEVOLUCAO: 'bg-amber-100 text-amber-800 border-amber-200',
  TROCA: 'bg-purple-100 text-purple-800 border-purple-200',
};

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export const FichasEntregaEPIContent: React.FC = () => {
  const { toast } = useToast();
  useGSAP();
  
  const [fichas, setFichas] = useState<EPIDeliveryForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFicha, setSelectedFicha] = useState<EPIDeliveryForm | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const [manualBlankPdfModalOpen, setManualBlankPdfModalOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [employeeFilter, setEmployeeFilter] = useState<string>('');
  const [companyFilter, setCompanyFilter] = useState<string>('');
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');
  const [editingFichaId, setEditingFichaId] = useState<string | null>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  
  // Estados para o Modal de Exclusão
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fichaToDelete, setFichaToDelete] = useState<string | null>(null);

  useEffect(() => {
    loadFichas();
  }, [page, employeeFilter, companyFilter, startDateFilter, endDateFilter]);

  // Recarregar lista quando a página receber foco (útil quando volta de outra página)
  useEffect(() => {
    const handleFocus = () => {
      loadFichas();
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadFichas();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [page, employeeFilter, companyFilter, startDateFilter, endDateFilter]);

  const loadFichas = async () => {
    try {
      setLoading(true);
      
      const filters: any = {
        page,
        size: 10,
        sortBy: 'createdAt',
        sortDir: 'DESC'
      };

      // Apenas adicionar filtros se tiverem valor
      if (employeeFilter && employeeFilter.trim()) {
        filters.employeeId = employeeFilter;
      }
      if (companyFilter && companyFilter.trim()) {
        filters.companyId = companyFilter;
      }
      if (startDateFilter && startDateFilter.trim()) {
        filters.startDate = startDateFilter;
      }
      if (endDateFilter && endDateFilter.trim()) {
        filters.endDate = endDateFilter;
      }

      const response = await epiDeliveryFormService.search(filters);
      setFichas(response.content || []);
      setTotalPages(response.totalPages || 0);
      setTotalElements(response.totalElements || 0);
    } catch (error: any) {
      console.error('Erro ao carregar fichas:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Não foi possível carregar as fichas de entrega de EPI.';
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive'
      });
      setFichas([]);
      setTotalPages(0);
      setTotalElements(0);
    } finally {
      setLoading(false);
    }
  };

  const handleView = (ficha: EPIDeliveryForm) => {
    setSelectedFicha(ficha);
    setViewModalOpen(true);
  };

  const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null);

  const handleGeneratePdf = async (ficha: EPIDeliveryForm) => {
    try {
      setGeneratingPdfId(ficha.id);
      const blob = await epiDeliveryFormService.generatePdfById(ficha.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ficha-entrega-epi-${ficha.employeeName}-${ficha.deliveryDate || ''}.pdf`.replace(/\s+/g, '-');
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({
        title: 'Sucesso',
        description: 'PDF gerado com sucesso!',
      });
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível gerar o PDF da ficha.',
        variant: 'destructive'
      });
    } finally {
      setGeneratingPdfId(null);
    }
  };

  const handleDelete = (id: string) => {
    setFichaToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!fichaToDelete) return;

    try {
      await epiDeliveryFormService.delete(fichaToDelete);
      toast({
        title: 'Sucesso',
        description: 'Ficha excluída com sucesso!',
      });
      loadFichas();
    } catch (error) {
      console.error('Erro ao excluir ficha:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir a ficha.',
        variant: 'destructive'
      });
    } finally {
      setFichaToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  const handleEdit = (id: string) => {
    setEditingFichaId(id);
    setManualEntryOpen(true);
  };

  const handleExportReport = () => {
    setReportModalOpen(true);
  };


  const filteredFichas = fichas.filter(ficha => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      ficha.employeeName.toLowerCase().includes(search) ||
      ficha.companyName.toLowerCase().includes(search) ||
      ficha.employeeCpf?.toLowerCase().includes(search) ||
      ficha.companyCnpj?.toLowerCase().includes(search) ||
      ficha.employeeWorkSector?.toLowerCase().includes(search)
    );
  });

  const clearFilters = () => {
    setEmployeeFilter('');
    setCompanyFilter('');
    setStartDateFilter('');
    setEndDateFilter('');
    setSearchTerm('');
    setPage(0);
  };

  const getDeliveryTypeBadge = (type?: string) => {
    const deliveryType = type || 'PRIMEIRA_ENTREGA';
    const label = DELIVERY_TYPE_LABELS[deliveryType] || deliveryType;
    const colors = DELIVERY_TYPE_COLORS[deliveryType] || 'bg-gray-100 text-gray-800 border-gray-200';
    return (
      <Badge variant="outline" className={`text-xs font-medium ${colors}`}>
        {label}
      </Badge>
    );
  };

  return (
    <>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {!manualEntryOpen ? (
          <Card className="border-t-4 border-t-primary shadow-md">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <HardHat className="h-6 w-6 text-primary" />
                    Fichas de Entrega de EPI
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Gerencie todas as fichas de entrega de EPI geradas
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      setEditingFichaId(null);
                      setManualEntryOpen(true);
                    }}
                    size="sm"
                    className="flex items-center gap-2 bg-seguranca-yellow text-seguranca-black hover:bg-seguranca-yellow/90"
                  >
                    <Plus className="h-4 w-4" />
                    Nova Entrega Manual
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setManualBlankPdfModalOpen(true)}
                    className="flex items-center gap-2 border-emerald-500/50 text-emerald-400 hover:bg-emerald-950/40"
                  >
                    <FileDown className="h-4 w-4 text-emerald-400" />
                    Ficha Manual (PDF)
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportReport}
                    className="flex items-center gap-2 text-seguranca-red border-seguranca-red/20 hover:bg-seguranca-red/10"
                    disabled={loading}
                  >
                    <FileText className="h-4 w-4" />
                    Relatórios Avançados
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadFichas}
                    className="flex items-center gap-2"
                    disabled={loading}
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Atualizar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearFilters}
                    className="flex items-center gap-2"
                  >
                    <Filter className="h-4 w-4" />
                    Limpar Filtros
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Filtros */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Buscar</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Funcionário, empresa, CPF, setor..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Data Início</Label>
                  <Input
                    type="date"
                    value={startDateFilter}
                    onChange={(e) => setStartDateFilter(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data Fim</Label>
                  <Input
                    type="date"
                    value={endDateFilter}
                    onChange={(e) => setEndDateFilter(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Total de Fichas</Label>
                  <div className="p-2 bg-muted rounded-md text-sm font-medium">
                    {totalElements}
                  </div>
                </div>
              </div>

              {/* Tabela */}
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredFichas.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma ficha encontrada</p>
                </div>
              ) : (
                <>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Funcionário</TableHead>
                          <TableHead>Setor</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Empresa</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Itens</TableHead>
                          <TableHead>Responsável</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredFichas.map((ficha) => (
                          <TableRow key={ficha.id}>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">{ficha.employeeName}</span>
                                {ficha.employeeCpf && (
                                  <span className="text-xs text-muted-foreground">
                                    CPF: {ficha.employeeCpf}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {ficha.employeeWorkSector ? (
                                  <span className="text-xs text-muted-foreground">{ficha.employeeWorkSector}</span>
                                ) : (
                                  <span className="text-xs text-muted-foreground/50">—</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {getDeliveryTypeBadge(ficha.deliveryType)}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium text-sm">{ficha.companyName}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {ficha.deliveryDate
                                ? formatAdmissionDateBr(ficha.deliveryDate)
                                : '-'}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {ficha.items?.length || 0} item(s)
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {ficha.responsibleEmployeeName || ficha.createdByName || '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleView(ficha)}
                                  className="h-8 w-8 p-0"
                                  title="Visualizar"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(ficha.id)}
                                  className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                  title="Editar"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleGeneratePdf(ficha)}
                                  disabled={generatingPdfId === ficha.id}
                                  className="h-8 w-8 p-0"
                                  title="Gerar PDF"
                                >
                                  {generatingPdfId === ficha.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <FileDown className="h-4 w-4" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(ficha.id)}
                                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                  title="Excluir"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Paginação */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        Página {page + 1} de {totalPages} ({totalElements} fichas)
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(Math.max(0, page - 1))}
                          disabled={page === 0}
                        >
                          Anterior
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                          disabled={page >= totalPages - 1}
                        >
                          Próxima
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          /* Formulário de Entrega Manual */
          <Card className="border-t-4 border-t-seguranca-yellow shadow-md">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <Plus className="h-6 w-6 text-seguranca-yellow" />
                    Nova Entrega Manual de EPI
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Registre a entrega de EPI diretamente pelo almoxarifado
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setManualEntryOpen(false);
                    loadFichas();
                  }}
                  className="flex items-center gap-2"
                >
                  ← Voltar para Fichas
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <FichaEntregaEPIForm 
                fichaId={editingFichaId || undefined} 
                onSuccess={() => {
                  // Mantém o formulário aberto para continuar adicionando itens na mesma ficha
                  loadFichas();
                }}
              />
            </CardContent>
          </Card>
        )}

        {/* Modal de Visualização */}
        <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalhes da Ficha de Entrega de EPI</DialogTitle>
              <DialogDescription>
                Informações completas da ficha de entrega
              </DialogDescription>
            </DialogHeader>
            {selectedFicha && (
              <div className="space-y-6">
                {/* Tipo de entrega badge */}
                <div className="flex items-center gap-3">
                  {getDeliveryTypeBadge(selectedFicha.deliveryType)}
                  {selectedFicha.employeeWorkSector && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      {selectedFicha.employeeWorkSector}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Funcionário</Label>
                    <p className="font-medium">{selectedFicha.employeeName}</p>
                    {selectedFicha.employeeCpf && (
                      <p className="text-sm text-muted-foreground">CPF: {selectedFicha.employeeCpf}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Empresa</Label>
                    <p className="font-medium">{selectedFicha.companyName}</p>
                    {selectedFicha.companyCnpj && (
                      <p className="text-sm text-muted-foreground">CNPJ: {selectedFicha.companyCnpj}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Data de Entrega</Label>
                    <p className="font-medium">
                      {selectedFicha.deliveryDate
                        ? formatAdmissionDateBr(selectedFicha.deliveryDate)
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Responsável</Label>
                    <p className="font-medium">{selectedFicha.responsibleEmployeeName || selectedFicha.createdByName || '-'}</p>
                  </div>
                  {selectedFicha.employeeWorkSector && (
                    <div className="col-span-2">
                      <Label className="text-xs text-muted-foreground">Setor do Funcionário (no momento da entrega)</Label>
                      <p className="font-medium">{selectedFicha.employeeWorkSector}</p>
                    </div>
                  )}
                </div>

                {selectedFicha.observations && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Observações</Label>
                    <p className="text-sm">{selectedFicha.observations}</p>
                  </div>
                )}

                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Itens de EPI</Label>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>EPI</TableHead>
                          <TableHead>Quantidade</TableHead>
                          <TableHead>CA</TableHead>
                          <TableHead>Validade</TableHead>
                          <TableHead>Observações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedFicha.items?.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{item.epiName}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>{item.ca || '-'}</TableCell>
                            <TableCell>
                              {item.validityDate
                                ? formatAdmissionDateBr(item.validityDate)
                                : '-'}
                            </TableCell>
                            <TableCell>{item.observations || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
        {/* Modal de Confirmação de Exclusão */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="bg-slate-900 border-seguranca-yellow/20 max-w-[400px]">
            <AlertDialogHeader className="flex flex-col items-center justify-center text-center space-y-4">
              <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
                <Trash2 className="h-6 w-6 text-destructive" />
              </div>
              <AlertDialogTitle className="text-xl font-bold text-white">
                Confirmar Exclusão
              </AlertDialogTitle>
              <AlertDialogDescription className="text-slate-400 text-base">
                Tem certeza que deseja excluir esta ficha? <br />
                Esta ação não poderá ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex flex-row gap-3 mt-6 sm:justify-center">
              <AlertDialogCancel className="flex-1 bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors">
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmDelete}
                className="flex-1 bg-destructive hover:bg-destructive/90 text-white font-bold transition-all"
              >
                Sim, Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        {/* Modal de Geração de Ficha de EPI Manual (PDF) */}
        <Dialog open={manualBlankPdfModalOpen} onOpenChange={setManualBlankPdfModalOpen}>
          <DialogContent className="max-w-2xl bg-seguranca-graphite border-gray-700 text-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-seguranca-yellow flex items-center gap-2">
                <FileDown className="h-5 w-5 text-seguranca-yellow" />
                Gerar Ficha de Entrega de EPI em Branco (PDF)
              </DialogTitle>
              <DialogDescription className="text-gray-300 text-sm">
                Selecione a empresa para gerar a ficha oficial de entrega de EPI em PDF para impressão e preenchimento manual no papel.
              </DialogDescription>
            </DialogHeader>

            <div className="py-2">
              <FichaEntregaEPIManualForm />
            </div>
          </DialogContent>
        </Dialog>

        <EPIDeliveryReportModal 
          isOpen={reportModalOpen}
          onClose={() => setReportModalOpen(false)}
        />
      </div>
    </>
  );
};
