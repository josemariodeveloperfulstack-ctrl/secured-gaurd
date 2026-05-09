import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Separator } from '../ui/separator';
import { Download, Loader2, ArrowRightLeft, User, Eye, FileText } from 'lucide-react';
import { remanejamentoService } from '@/services/remanejamentoService';
import { EmployeeCombobox } from '../ui/employee-combobox';
import employeeService, { SimpleEmployee } from '@/services/employeeService';
import { useToast } from '@/hooks/use-toast';

interface RelatorioMovimentacaoFormProps {
  employeeId?: string;
  companyId?: string;
}

const RelatorioMovimentacaoForm: React.FC<RelatorioMovimentacaoFormProps> = ({ employeeId }) => {
  const { toast } = useToast();
  const [funcionarioId, setFuncionarioId] = useState(employeeId || '');
  const [selectedEmployeeData, setSelectedEmployeeData] = useState<SimpleEmployee | null>(null);
  const [loading, setLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    console.log("RelatorioMovimentacaoForm employeeId prop changed:", employeeId);
    const fetchInitialData = async () => {
      if (employeeId) {
        setFuncionarioId(employeeId);
        try {
          console.log("Fetching employee details for:", employeeId);
          const emp = await employeeService.getEmployeeById(employeeId);
          console.log("Employee details loaded:", emp);
          if (emp) {
            setSelectedEmployeeData(emp as any);
          }
        } catch (error) {
          console.error('Erro ao buscar funcionário inicial:', error);
        }
      } else {
        console.log("No employeeId passed yet.");
      }
    };
    fetchInitialData();
  }, [employeeId]);

  // Limpar o PDF gerado caso o funcionário mude
  useEffect(() => {
    setPdfUrl(null);
  }, [funcionarioId]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        window.URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  const handleGerarPDF = async () => {
    if (!funcionarioId) {
      toast({
        title: 'Atenção',
        description: 'Selecione um funcionário primeiro!',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setPdfUrl(null);
    try {
      if (!selectedEmployeeData) {
        try {
          const emp = await employeeService.getEmployeeById(funcionarioId);
          if (emp) setSelectedEmployeeData(emp as any);
        } catch(e) { console.error(e); }
      }

      const blob = await employeeService.exportEmployeeHistoryPDF(funcionarioId);

      const url = window.URL.createObjectURL(blob);
      setPdfUrl(url);
      
      toast({
        title: 'Sucesso',
        description: 'Relatório gerado com sucesso!',
      });
    } catch (err: any) {
      console.error('Erro ao gerar relatório de movimentação:', err);
      toast({
        title: 'Erro',
        description: err.response?.data?.message || 'Erro ao gerar o relatório. Verifique se há movimentações registradas.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!pdfUrl) return;
    const link = document.createElement('a');
    link.href = pdfUrl;
    const fileName = selectedEmployeeData?.name 
      ? `relatorio-movimentacao-${selectedEmployeeData.name.replace(/\s+/g, '-').toLowerCase()}.pdf`
      : 'relatorio-movimentacao.pdf';
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="border-t-4 border-t-purple-500 shadow-md">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-2xl">
                <ArrowRightLeft className="h-6 w-6 text-purple-500" />
                Relatório de Movimentação
              </CardTitle>
              <CardDescription>
                Gerar relatório PDF com o histórico de transferências, promoções e demais movimentações do funcionário.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Identificação */}
          <div className="bg-muted/30 p-6 rounded-xl border space-y-6">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
              <User className="h-4 w-4" />
              <span>Funcionário a ser consultado</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <EmployeeCombobox
                  value={funcionarioId}
                  onChange={(value) => setFuncionarioId(value)}
                  onEmployeeSelect={(emp) => setSelectedEmployeeData(emp)}
                />
              </div>

              {selectedEmployeeData && (
                <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 border border-border/60 h-10">
                  <User className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-semibold text-foreground truncate">
                    {selectedEmployeeData.name}
                  </span>
                  {(selectedEmployeeData.cpf || (selectedEmployeeData as any).document) && (
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                      · CPF: {selectedEmployeeData.cpf || (selectedEmployeeData as any).document}
                    </span>
                  )}
                </div>
              )}
            </div>

            {selectedEmployeeData && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-in fade-in zoom-in-95 duration-300">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Cargo</Label>
                    <div className="p-2.5 bg-muted/60 rounded-md text-sm font-medium border border-border/40 truncate">
                      {selectedEmployeeData.positionName || (selectedEmployeeData as any).position?.name || '-'}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Admissão</Label>
                    <div className="p-2.5 bg-muted/60 rounded-md text-sm font-medium border border-border/40">
                      {selectedEmployeeData.hireDate ? new Date(selectedEmployeeData.hireDate).toLocaleDateString('pt-BR') : '-'}
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Posto de Trabalho / Setor</Label>
                  <div className="p-2.5 bg-muted/60 rounded-md text-sm font-medium border border-border/40 truncate">
                    {selectedEmployeeData.unitName || (selectedEmployeeData as any).unit?.name || (selectedEmployeeData as any).workPost?.name || '-'}
                  </div>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Ações */}
          <div className="flex flex-col-reverse sm:flex-row gap-4 justify-end pt-2">
            <Button
              onClick={handleGerarPDF}
              className="flex items-center gap-2 w-full sm:w-auto h-11 shadow-md hover:shadow-lg transition-all"
              disabled={loading || !funcionarioId}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Gerando Documento...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4" />
                  Visualizar Histórico de Movimentações
                </>
              )}
            </Button>
          </div>
          
          {/* Visualização do PDF gerado */}
          {pdfUrl && (
            <div className="mt-8 space-y-4 animate-in fade-in zoom-in-95 duration-500">
              <Separator />
              <div className="flex items-center justify-between pt-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Eye className="h-5 w-5 text-primary" />
                  Visualização do Documento
                </h3>
                <Button onClick={handleDownload} variant="default" className="flex items-center gap-2 shadow-sm">
                  <Download className="h-4 w-4" />
                  Baixar PDF
                </Button>
              </div>
              <div className="rounded-lg overflow-hidden border border-border shadow-sm">
                <iframe 
                  src={`${pdfUrl}#toolbar=0`} 
                  className="w-full h-[600px]" 
                  title="Documento PDF"
                />
              </div>
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
};

export default RelatorioMovimentacaoForm;
