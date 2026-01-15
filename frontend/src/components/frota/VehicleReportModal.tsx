import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Download } from 'lucide-react';
import fleetService from '@/services/fleetService';
import { useToast } from '@/hooks/use-toast';
import companyService from '@/services/companyService';

interface VehicleReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const VehicleReportModal: React.FC<VehicleReportModalProps> = ({
  isOpen,
  onClose
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isGenerating, setIsGenerating] = useState(false);
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!isOpen) return;
    const loadCompanies = async () => {
      try {
        setLoadingCompanies(true);
        const data = await companyService.getAllCompanies();
        const normalized = Array.isArray(data) ? data.map((company: any) => ({
          id: company.id,
          name: company.name || company.companyName || 'Empresa'
        })) : [];
        setCompanies(normalized);
        if (normalized.length > 0 && !selectedCompanyId) {
          setSelectedCompanyId(normalized[0].id);
        }
      } catch (error) {
        console.error('Erro ao carregar empresas:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar as empresas.",
          variant: "destructive",
        });
      } finally {
        setLoadingCompanies(false);
      }
    };
    loadCompanies();
  }, [isOpen, selectedCompanyId, toast]);

  const handleExportPDF = async () => {
    try {
      setIsGenerating(true);
      
      const status = statusFilter === 'all' ? undefined : statusFilter;
      const blob = await fleetService.exportVehiclesReportPDF(status, selectedCompanyId || undefined);
      
      // Criar URL para download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Definir nome do arquivo
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
      const statusSuffix = status ? `_${status.toLowerCase()}` : '';
      link.download = `relatorio_veiculos${statusSuffix}_${timestamp}.pdf`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Relatório gerado com sucesso!",
        description: "O relatório de veículos foi baixado com sucesso.",
        variant: "default",
      });
      
    } catch (error: any) {
      console.error('Erro ao gerar relatório de veículos:', error);
      const errorMessage = error?.message || error?.response?.data?.message || 'Ocorreu um erro ao gerar o relatório de veículos. Tente novamente.';
      toast({
        title: "Erro ao gerar relatório",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const clearFilters = () => {
    setStatusFilter('all');
    if (companies.length > 0) {
      setSelectedCompanyId(companies[0].id);
    } else {
      setSelectedCompanyId('');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-seguranca-graphite border-gray-600">
        <DialogHeader>
          <DialogTitle className="text-seguranca-lightgray">
            Relatório de Veículos
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Filtros */}
          <div className="space-y-4">
            <h3 className="text-seguranca-lightgray font-semibold">Filtros</h3>
            
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Empresa para o cabeçalho/rodapé</label>
              <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                <SelectTrigger className="bg-seguranca-black border-gray-600 text-seguranca-lightgray">
                  <SelectValue placeholder={loadingCompanies ? "Carregando empresas..." : "Selecione a empresa"} />
                </SelectTrigger>
                <SelectContent className="bg-seguranca-graphite border-gray-600">
                  {companies.length === 0 ? (
                    <SelectItem value="no-company" disabled>
                      Nenhuma empresa encontrada
                    </SelectItem>
                  ) : (
                    companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-gray-400">Status do Veículo</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-seguranca-black border-gray-600 text-seguranca-lightgray">
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent className="bg-seguranca-graphite border-gray-600">
                  <SelectItem value="all">Todos os veículos</SelectItem>
                  <SelectItem value="ACTIVE">Apenas ativos</SelectItem>
                  <SelectItem value="MAINTENANCE">Apenas em manutenção</SelectItem>
                  <SelectItem value="INACTIVE">Apenas inativos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={clearFilters} 
                variant="outline" 
                size="sm"
                className="border-gray-600 text-gray-400 hover:bg-gray-700"
              >
                Limpar Filtros
              </Button>
            </div>
          </div>

          {/* Botões de Exportação */}
          <div className="space-y-4">
            <h3 className="text-seguranca-lightgray font-semibold">Exportar Relatório</h3>
            
            <div className="flex gap-2">
              <Button 
                onClick={handleExportPDF} 
                variant="outline" 
                size="sm" 
                className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                disabled={isGenerating || !selectedCompanyId}
              >
                <FileText className="h-4 w-4 mr-2" /> 
                {isGenerating ? 'Gerando...' : 'PDF'}
              </Button>
            </div>
          </div>

          {/* Informações do Relatório */}
          <div className="space-y-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <h4 className="text-blue-400 font-medium text-sm">Informações do Relatório</h4>
            <ul className="text-xs text-blue-300 space-y-1">
              <li>• Relatório completo com dados dos veículos</li>
              <li>• Estatísticas por status (Ativos, Manutenção, Inativos)</li>
              <li>• Informações detalhadas: Placa, Marca/Modelo, Ano, Combustível</li>
              <li>• Quilometragem atual formatada (ex: 216.000 km)</li>
              <li>• Capacidade e data de cadastro</li>
              <li>• Logo da empresa Promover Vigilância Patrimonial</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VehicleReportModal;
