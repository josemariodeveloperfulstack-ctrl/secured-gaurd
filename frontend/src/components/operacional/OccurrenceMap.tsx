import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Plus, 
  RefreshCw, 
  FileSpreadsheet, 
  Calendar, 
  Users, 
  MapPin, 
  Clock, 
  Search,
  AlertTriangle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Occurrence, occurrenceService } from '@/services/occurrenceService';
import { employeeService } from '@/services/employeeService';
import OcorrenciaMapaFormModal from './OcorrenciaMapaFormModal';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const OccurrenceMap: React.FC = () => {
  const { toast } = useToast();
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedOccurrence, setSelectedOccurrence] = useState<Occurrence | null>(null);
  
  // Date range for 26-25 period
  const [dateRange, setDateRange] = useState({
    startDate: '', // Will be calculated or set by user
    endDate: ''
  });

  useEffect(() => {
    loadOccurrences();
    calculatePeriod();
  }, []);

  const calculatePeriod = () => {
    const today = new Date();
    const day = today.getDate();
    let start, end;

    if (day >= 26) {
      // Período atual: 26 deste mês a 25 do próximo
      start = new Date(today.getFullYear(), today.getMonth(), 26);
      end = new Date(today.getFullYear(), today.getMonth() + 1, 25);
    } else {
      // Período atual: 26 do mês passado a 25 deste mês
      start = new Date(today.getFullYear(), today.getMonth() - 1, 26);
      end = new Date(today.getFullYear(), today.getMonth(), 25);
    }

    setDateRange({
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd')
    });
  };

  const loadOccurrences = async () => {
    setIsLoading(true);
    try {
      const data = await occurrenceService.getOccurrences();
      
      let enrichedData = data || [];
      if (enrichedData.length > 0) {
        try {
          const employees = await employeeService.getSimpleEmployees().catch(() => []);
          
          enrichedData = enrichedData.map(occ => {
            let empName = occ.employeeName;
            if (!empName && occ.employeeId) {
              const emp = employees.find(e => e.id === String(occ.employeeId));
              if (emp) empName = emp.name;
            }

            let subName = occ.substituteName;
            if (!subName && occ.substituteId) {
              const sub = employees.find(e => e.id === String(occ.substituteId));
              if (sub) subName = sub.name;
            }

            return {
              ...occ,
              employeeName: empName || occ.employeeName,
              substituteName: subName || occ.substituteName
            };
          });
        } catch (e) {
          console.error('Erro ao enriquecer dados de ocorrências:', e);
        }
      }

      setOccurrences(enrichedData);
    } catch (error) {
      console.error('Erro ao carregar mapa de ocorrências:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as ocorrências.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportExcel = async () => {
    if (!dateRange.startDate || !dateRange.endDate) {
      toast({
        title: 'Erro',
        description: 'Selecione um período válido.',
        variant: 'destructive',
      });
      return;
    }

    try {
      toast({
        title: 'Gerando Relatório',
        description: 'Aguarde um momento...',
      });
      
      const blob = await occurrenceService.generateMapExcelReport(dateRange.startDate, dateRange.endDate);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `mapa-ocorrencias-${dateRange.startDate}-a-${dateRange.endDate}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Sucesso',
        description: 'Relatório Excel gerado com sucesso.',
      });
    } catch (error) {
      console.error('Erro ao exportar Excel:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao gerar o relatório Excel.',
        variant: 'destructive',
      });
    }
  };

  const handleRowClick = (occurrence: Occurrence) => {
    setSelectedOccurrence(occurrence);
    setShowFormModal(true);
  };

  const filteredOccurrences = occurrences.filter(occ => 
    occ.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    occ.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    occ.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    occ.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-green-500" />
              Mapa de Ocorrências Operacionais
            </CardTitle>
            <p className="text-sm text-slate-400 mt-1">
              Controle de faltas, trocas e remanejamentos (Período 26-25)
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-950/50 p-2 rounded-lg border border-slate-800">
              <Calendar className="h-4 w-4 text-slate-400" />
              <Input 
                type="date" 
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="bg-transparent border-0 text-white w-36 h-auto p-0 focus-visible:ring-0"
              />
              <span className="text-slate-600">até</span>
              <Input 
                type="date" 
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="bg-transparent border-0 text-white w-36 h-auto p-0 focus-visible:ring-0"
              />
            </div>
            <Button 
              onClick={handleExportExcel}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Exportar Excel
            </Button>
            <Button 
              onClick={() => {
                setSelectedOccurrence(null);
                setShowFormModal(true);
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Lançamento Manual
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input 
                placeholder="Pesquisar por funcionário, posto ou tipo..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-950 border-slate-800 text-white focus:border-red-500 transition-colors"
              />
            </div>
            <Button variant="outline" onClick={loadOccurrences} className="border-slate-800 text-slate-400 hover:text-white">
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950/30">
            <Table>
              <TableHeader className="bg-slate-900/80">
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-slate-400 font-semibold py-4">Data</TableHead>
                  <TableHead className="text-slate-400 font-semibold">Posto / Cliente</TableHead>
                  <TableHead className="text-slate-400 font-semibold">Efetivo (Original)</TableHead>
                  <TableHead className="text-slate-400 font-semibold">Ocorrência</TableHead>
                  <TableHead className="text-slate-400 font-semibold">Substituto</TableHead>
                  <TableHead className="text-slate-400 font-semibold">Horários</TableHead>
                  <TableHead className="text-slate-400 font-semibold text-center">Total</TableHead>
                  <TableHead className="text-slate-400 font-semibold">Categoria</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOccurrences.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-40 text-center text-slate-500">
                      Nenhum registro encontrado no mapa de ocorrências.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOccurrences.map((occ) => (
                    <TableRow 
                      key={occ.id} 
                      className="border-slate-800 hover:bg-slate-900/50 cursor-pointer transition-colors"
                      onClick={() => handleRowClick(occ)}
                    >
                      <TableCell className="text-slate-300 py-4 font-medium">
                        {occ.date ? format(new Date(occ.date), 'dd/MM/yyyy') : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-white font-medium">{occ.location || 'N/A'}</span>
                          {/* Cliente information would ideally be here if part of the DTO model */}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-300">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-slate-500" />
                          {occ.employeeName}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-amber-500/50 text-amber-500 bg-amber-500/10">
                          {occ.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-300">
                        {occ.substituteName ? (
                          <div className="flex items-center gap-2">
                            <UserCheck className="h-4 w-4 text-green-500" />
                            {occ.substituteName}
                          </div>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col text-xs gap-1">
                          <div className="flex items-center gap-1 text-slate-400">
                            <Clock className="h-3 w-3" />
                            <span>Orig: {occ.originalStartTime} - {occ.originalEndTime}</span>
                          </div>
                          {occ.substituteStartTime && (
                            <div className="flex items-center gap-1 text-blue-400">
                              <Clock className="h-3 w-3" />
                              <span>Sub: {occ.substituteStartTime} - {occ.substituteEndTime}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-bold text-white">
                        {occ.totalHours ? `${occ.totalHours}h` : '-'}
                      </TableCell>
                      <TableCell>
                        <span className="text-slate-400 text-sm italic">{occ.category || '-'}</span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {showFormModal && (
        <OcorrenciaMapaFormModal 
          isOpen={showFormModal}
          onClose={() => setShowFormModal(false)}
          onSuccess={() => {
            setShowFormModal(false);
            loadOccurrences();
          }}
          occurrence={selectedOccurrence}
        />
      )}
    </div>
  );
};

// Simple UserCheck icon replacement since it might be missing from main imports
const UserCheck = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <polyline points="16 11 18 13 22 9" />
  </svg>
);

export default OccurrenceMap;
