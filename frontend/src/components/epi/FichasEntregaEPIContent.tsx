import React, { useState, useEffect, useRef } from 'react';
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
  FileSpreadsheet,
  RotateCcw,
  AlertCircle
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
  const [fichaToDelete, setFichaToDelete] = useState<EPIDeliveryForm | null>(null);
  const [deletingFicha, setDeletingFicha] = useState(false);
  /** Assinatura da busca em andamento — evita disparar a mesma requisição duas vezes. */
  const inFlightLoadRef = useRef<string | null>(null);

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

    // 'focus' e 'visibilitychange' disparam juntos ao voltar para a aba; sem este
    // guarda a mesma busca era disparada duas vezes (requisição duplicada no console).
    const requestSignature = JSON.stringify(filters);
    if (inFlightLoadRef.current === requestSignature) {
      return;
    }
    inFlightLoadRef.current = requestSignature;

    try {
      setLoading(true);

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
      inFlightLoadRef.current = null;
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
      const err = error as { message?: string; response?: { data?: { message?: string } } };
      toast({
        title: 'Erro',
        description: err?.message || err?.response?.data?.message || 'Não foi possível gerar o PDF da ficha.',
        variant: 'destructive'
      });
    } finally {
      setGeneratingPdfId(null);
    }
  };

  const handleDelete = (ficha: EPIDeliveryForm) => {
    setFichaToDelete(ficha);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!fichaToDelete) return;

    try {
      setDeletingFicha(true);
      await epiDeliveryFormService.delete(fichaToDelete.id);
      toast({
        title: 'Ficha excluída',
        description: 'Ficha excluída e quantidades devolvidas ao estoque (material não entregue).',
      });
      loadFichas();
    } catch (error: any) {
      console.error('Erro ao excluir ficha:', error);
      toast({
        title: 'Erro',
        description: error?.message || error?.response?.data?.message || 'Não foi possível excluir a ficha.',
        variant: 'destructive'
      });
    } finally {
      setDeletingFicha(false);
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

  const getStatusBadge = (status?: string) => {
    if (status === 'COMPLETED') {
      return <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs">Confirmado</Badge>;
    }
    if (status === 'REFUSED') {
      return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200 text-xs font-semibold">Recusado</Badge>;
    }
    return <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200 text-xs">Pendente</Badge>;
  };

  const handleResend = async (fichaId: string) => {
    try {
      await epiDeliveryFormService.resendForm(fichaId);
      toast({
        title: 'Sucesso',
        description: 'Ficha de EPI reenviada para o colaborador com sucesso!',
      });
      loadFichas();
    } catch (error: any) {
      toast({
        title: 'Erro ao reenviar',
        description: error?.response?.data?.message || 'Não foi possível reenviar a ficha.',
        variant: 'destructive',
      });
    }
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
                          <TableHead>Status</TableHead>
                          <TableHead>Empresa</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Itens</TableHead>
                          <TableHead>Responsável</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredFichas.map((ficha) => (
                          <TableRow key={ficha.id} className={ficha.status === 'REFUSED' ? 'bg-red-50/40 dark:bg-red-950/20' : ''}>
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
                              {getStatusBadge(ficha.status)}
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
                                {ficha.status === 'REFUSED' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleResend(ficha.id)}
                                    className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                    title="Reenviar para o Colaborador"
                                  >
                                    <RotateCcw className="h-4 w-4" />
                                  </Button>
                                )}
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
                                  onClick={() => handleDelete(ficha)}
                                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                  title="Excluir (devolve itens ao estoque)"
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
                {/* Tipo de entrega badge e status */}
                <div className="flex items-center gap-3">
                  {getDeliveryTypeBadge(selectedFicha.deliveryType)}
                  {getStatusBadge(selectedFicha.status)}
                  {selectedFicha.employeeWorkSector && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      {selectedFicha.employeeWorkSector}
                    </div>
                  )}
                </div>

                {selectedFicha.status === 'REFUSED' && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-md space-y-1">
                    <p className="text-xs font-semibold text-red-700 dark:text-red-300">
                      Entrecotada/Recusada pelo Funcionário
                      {selectedFicha.refusedAt && (
                        <span> em {formatAdmissionDateBr(selectedFicha.refusedAt)}</span>
                      )}
                    </p>
                    <p className="text-sm text-red-900 dark:text-red-200">
                      <strong>Motivo:</strong> {selectedFicha.refusalReason || 'Nenhum motivo específico informado.'}
                    </p>
                  </div>
                )}

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
                          <TableHead>Nº</TableHead>
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
                            <TableCell>{item.sizeNumber || item.uniformPiece || '-'}</TableCell>
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
        {/* Modal de Confirmação de Exclusão — mostra a ficha para o usuário conferir antes de excluir */}
        <Dialog open={deleteDialogOpen} onOpenChange={(open) => { setDeleteDialogOpen(open); if (!open) setFichaToDelete(null); }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="h-5 w-5" />
                Excluir Ficha de Entrega de EPI
              </DialogTitle>
              <DialogDescription>
                Confira abaixo a ficha que será excluída. Ao excluir, todas as quantidades lançadas nesta ficha serão <strong>devolvidas ao estoque</strong> (material não entregue).
              </DialogDescription>
            </DialogHeader>
            {fichaToDelete && (
              <div className="space-y-6">
                {/* Tipo de entrega badge e status */}
                <div className="flex items-center gap-3 flex-wrap">
                  {getDeliveryTypeBadge(fichaToDelete.deliveryType)}
                  {getStatusBadge(fichaToDelete.status)}
                  {fichaToDelete.employeeWorkSector && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      {fichaToDelete.employeeWorkSector}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Funcionário</Label>
                    <p className="font-medium">{fichaToDelete.employeeName}</p>
                    {fichaToDelete.employeeCpf && (
                      <p className="text-sm text-muted-foreground">CPF: {fichaToDelete.employeeCpf}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Empresa</Label>
                    <p className="font-medium">{fichaToDelete.companyName}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Data de Entrega</Label>
                    <p className="font-medium">
                      {fichaToDelete.deliveryDate ? formatAdmissionDateBr(fichaToDelete.deliveryDate) : '-'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Responsável</Label>
                    <p className="font-medium">{fichaToDelete.responsibleEmployeeName || fichaToDelete.createdByName || '-'}</p>
                  </div>
                </div>

                {fichaToDelete.observations && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Observações</Label>
                    <p className="text-sm">{fichaToDelete.observations}</p>
                  </div>
                )}

                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Itens que voltarão ao estoque</Label>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>EPI</TableHead>
                          <TableHead>Nº</TableHead>
                          <TableHead>Quantidade</TableHead>
                          <TableHead>CA</TableHead>
                          <TableHead>Situação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(fichaToDelete.items || []).map((item, idx) => {
                          const devolvido = !!item.substitutedDate || !!item.returnedDate;
                          return (
                            <TableRow key={item.id || idx}>
                              <TableCell className="font-medium">{item.epiName}</TableCell>
                              <TableCell>{item.sizeNumber || item.uniformPiece || '-'}</TableCell>
                              <TableCell>{item.quantity}</TableCell>
                              <TableCell>{item.ca || '-'}</TableCell>
                              <TableCell>
                                {devolvido ? (
                                  <Badge variant="outline" className="text-xs bg-amber-100 text-amber-800 border-amber-200">
                                    Já devolvido/substituído (sem novo estorno)
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs bg-emerald-100 text-emerald-800 border-emerald-200">
                                    Volta ao estoque
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  {(fichaToDelete.items || []).length === 0 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Esta ficha não possui itens lançados.
                    </p>
                  )}
                </div>

                <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-destructive" />
                  <span>
                    Esta ação não poderá ser desfeita. A ficha será removida definitivamente.
                  </span>
                </div>
              </div>
            )}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteDialogOpen(false);
                  setFichaToDelete(null);
                }}
                disabled={deletingFicha}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDelete}
                disabled={deletingFicha}
                className="flex items-center gap-2"
              >
                {deletingFicha ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Confirmar Exclusão
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        {/* Modal de Geração de Ficha de EPI Manual (PDF) */}
        <Dialog open={manualBlankPdfModalOpen} onOpenChange={setManualBlankPdfModalOpen}>
          <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 bg-seguranca-graphite border-gray-700 text-white rounded-xl">
            <DialogHeader className="space-y-1 text-left">
              <DialogTitle className="text-lg sm:text-xl font-bold text-seguranca-yellow flex items-center gap-2 pr-6">
                <FileDown className="h-5 w-5 text-seguranca-yellow shrink-0" />
                <span>Gerar Ficha de Entrega de EPI em Branco (PDF)</span>
              </DialogTitle>
              <DialogDescription className="text-gray-300 text-xs sm:text-sm">
                Selecione a empresa para gerar a ficha oficial de entrega de EPI em PDF para impressão e preenchimento manual no papel.
              </DialogDescription>
            </DialogHeader>

            <div className="py-2">
              <FichaEntregaEPIManualForm hideHeader={true} />
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
