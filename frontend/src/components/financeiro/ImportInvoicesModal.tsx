import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  RefreshCw, 
  Search, 
  Calendar,
  Building2,
  DollarSign,
  Tag,
  CreditCard,
  MapPin,
  HelpCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '@/lib/axios';

interface ParsedRowItem {
  id: string;
  dueDate: string; // YYYY-MM-DD
  dueDateFormatted: string;
  companySigla: string; // VIG, TERC, ADM, UBERL
  supplierName: string;
  type: 'FIXA' | 'VARIAVEL';
  description: string;
  notes: string;
  amount: number;
  unitName: string; // UBERLANDIA / CONTAGEM
  status: 'PENDENTE' | 'PAGA';
  barcode: string;
  isValid: boolean;
  warnings: string[];
  errors: string[];
}

interface ImportInvoicesModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ImportInvoicesModal: React.FC<ImportInvoicesModalProps> = ({
  open,
  onClose,
  onSuccess
}) => {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [items, setItems] = useState<ParsedRowItem[]>([]);
  const [filterMode, setFilterMode] = useState<'ALL' | 'VALID' | 'INVALID'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const [stats, setStats] = useState({
    totalRows: 0,
    validRows: 0,
    invalidRows: 0,
    newSuppliersCount: 0,
    totalAmount: 0
  });

  const parseExcelDate = (val: any): string => {
    if (!val) return '';
    if (typeof val === 'number') {
      const dateObj = XLSX.SSF.parse_date_code(val);
      if (dateObj) {
        const yyyy = dateObj.y;
        const mm = String(dateObj.m).padStart(2, '0');
        const dd = String(dateObj.d).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      }
    }
    const str = String(val).trim();
    const match = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (match) {
      const dd = String(match[1]).padStart(2, '0');
      const mm = String(match[2]).padStart(2, '0');
      const yyyy = match[3];
      return `${yyyy}-${mm}-${dd}`;
    }
    return '';
  };

  const parseNumber = (val: any): number => {
    if (val === undefined || val === null || val === '') return 0;
    if (typeof val === 'number') return val;
    let str = String(val).replace(/R\$\s?/gi, '').trim();
    if (str.includes(',') && str.includes('.')) {
      str = str.replace(/\./g, '').replace(',', '.');
    } else if (str.includes(',')) {
      str = str.replace(',', '.');
    }
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;
    processFile(uploadedFile);
  };

  const processFile = (uploadedFile: File) => {
    setFile(uploadedFile);
    setParsing(true);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: false });

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

        const parsedItems: ParsedRowItem[] = [];
        let validCount = 0;
        let invalidCount = 0;
        let sumAmount = 0;
        const suppliersSet = new Set<string>();

        for (let index = 0; index < rawRows.length; index++) {
          const row = rawRows[index];
          if (!row || row.length === 0) continue;

          const colB_DateStr = parseExcelDate(row[1]);
          const colC_Empresa = String(row[2] || '').trim();
          const colD_Fornecedor = String(row[3] || '').trim();

          // Ignorar cabeçalho principal
          if (colC_Empresa.toUpperCase().includes('EMPRESA') || colD_Fornecedor.toUpperCase().includes('FORNECEDOR')) {
            continue;
          }

          // Se não houver nem data nem empresa nem fornecedor válido, pula a linha
          if (!colB_DateStr && !colC_Empresa && !colD_Fornecedor) {
            continue;
          }

          // Identificar valores das 4 colunas financeiras (H, I, J, K)
          const valUberlandia = parseNumber(row[7]);
          const valServicosAdm2 = parseNumber(row[8]);
          const valTerceirizacao = parseNumber(row[9]);
          const valVigilancia = parseNumber(row[10]);

          // Determinar o valor principal da linha
          let rowAmount = 0;
          let detectedCompany = colC_Empresa.toUpperCase();
          let detectedUnit = '';

          if (valVigilancia > 0) {
            rowAmount = valVigilancia;
            if (!detectedCompany) detectedCompany = 'VIG';
          } else if (valTerceirizacao > 0) {
            rowAmount = valTerceirizacao;
            if (!detectedCompany) detectedCompany = 'TERC';
          } else if (valServicosAdm2 > 0) {
            rowAmount = valServicosAdm2;
            if (!detectedCompany) detectedCompany = 'TERC';
          } else if (valUberlandia > 0) {
            rowAmount = valUberlandia;
            detectedUnit = 'UBERLÂNDIA';
            if (!detectedCompany) detectedCompany = 'ADM';
          }

          // Varredura de todo o texto da linha para identificar menções à Unidade (Contagem vs Uberlândia)
          const fullRowText = row.map((c: any) => String(c || '').trim()).join(' ').toUpperCase();

          if (fullRowText.includes('CONTAGEM') || fullRowText.includes('CONTAG') || fullRowText.includes('SEDE') || fullRowText.includes('MATRIZ')) {
            detectedUnit = 'CONTAGEM';
          } else if (fullRowText.includes('UBERLANDIA') || fullRowText.includes('UBERLÂNDIA') || fullRowText.includes('UDI')) {
            detectedUnit = 'UBERLÂNDIA';
          } else if (!detectedUnit) {
            // Se não especificado no texto:
            // Coluna H (7) com valor = UBERLÂNDIA
            // Colunas I, J, K com valor (Vig, Terc, Serv Adm) = CONTAGEM (Sede)
            if (valUberlandia > 0 && valVigilancia <= 0 && valTerceirizacao <= 0 && valServicosAdm2 <= 0) {
              detectedUnit = 'UBERLÂNDIA';
            } else {
              detectedUnit = 'CONTAGEM';
            }
          }

          // Normalizar Sigla da Empresa
          if (detectedCompany.includes('VIG') || detectedCompany.includes('VIGILAN')) {
            detectedCompany = 'VIG';
          } else if (detectedCompany.includes('TERC') || detectedCompany.includes('SERV')) {
            detectedCompany = 'TERC';
          } else if (detectedCompany.includes('ADM')) {
            detectedCompany = 'ADM';
          } else if (detectedCompany.includes('UBERL')) {
            detectedCompany = 'UBERL';
            if (!detectedUnit || detectedUnit === 'CONTAGEM') {
              detectedUnit = 'UBERLÂNDIA';
            }
          }

          const warnings: string[] = [];
          const errors: string[] = [];

          if (rowAmount <= 0) {
            errors.push('Valor zerado ou não identificado.');
          }

          if (!colB_DateStr) {
            warnings.push('Data de vencimento não informada (será usada data de hoje).');
          }

          if (colD_Fornecedor) {
            suppliersSet.add(colD_Fornecedor);
          } else {
            warnings.push('Fornecedor não especificado.');
          }

          const colE_Tipo = String(row[4] || '').toUpperCase();
          const colF_Desc = String(row[5] || '').trim();
          const colG_Quem = String(row[6] || '').trim();
          const colL_Status = String(row[11] || '').toUpperCase();
          const colM_Barcode = String(row[12] || '').trim();

          const type: 'FIXA' | 'VARIAVEL' = colE_Tipo.includes('FIXA') ? 'FIXA' : 'VARIAVEL';
          const status: 'PENDENTE' | 'PAGA' = (colL_Status.includes('PAG') || colL_Status.includes('X')) ? 'PAGA' : 'PENDENTE';

          let notes = colF_Desc;
          if (colG_Quem) {
            notes += (notes ? ' | ' : '') + 'Responsável: ' + colG_Quem;
          }
          if (colE_Tipo && !colE_Tipo.includes('FIXA') && !colE_Tipo.includes('VARIAVEL')) {
            notes += (notes ? ' | ' : '') + 'Ref: ' + colE_Tipo;
          }

          const isValid = errors.length === 0;

          if (isValid) {
            validCount++;
            sumAmount += rowAmount;
          } else {
            invalidCount++;
          }

          parsedItems.push({
            id: `row-${index}`,
            dueDate: colB_DateStr || new Date().toISOString().split('T')[0],
            dueDateFormatted: colB_DateStr ? colB_DateStr.split('-').reverse().join('/') : 'Hoje',
            companySigla: detectedCompany || 'VIG',
            supplierName: colD_Fornecedor || 'Despesa Importada',
            type,
            description: colD_Fornecedor || colF_Desc || 'Pagamento Importado',
            notes,
            amount: rowAmount,
            unitName: detectedUnit || 'CONTAGEM',
            status,
            barcode: colM_Barcode,
            isValid,
            warnings,
            errors
          });
        }

        setItems(parsedItems);
        setStats({
          totalRows: parsedItems.length,
          validRows: validCount,
          invalidRows: invalidCount,
          newSuppliersCount: suppliersSet.size,
          totalAmount: sumAmount
        });

      } catch (err) {
        console.error('Erro ao ler planilha:', err);
        toast({
          title: 'Erro de Leitura',
          description: 'Não foi possível ler o arquivo Excel. Verifique a estrutura da planilha.',
          variant: 'destructive'
        });
      } finally {
        setParsing(false);
      }
    };

    reader.readAsArrayBuffer(uploadedFile);
  };

  const handleConfirmImport = async () => {
    const validItems = items.filter(item => item.isValid);
    if (validItems.length === 0) {
      toast({
        title: 'Nenhum item válido',
        description: 'Não há faturas válidas para importar.',
        variant: 'destructive'
      });
      return;
    }

    try {
      setImporting(true);

      const payload = validItems.map(item => ({
        dueDate: item.dueDate,
        companySigla: item.companySigla,
        supplierName: item.supplierName,
        type: item.type,
        description: item.description,
        notes: item.notes,
        amount: item.amount,
        unitName: item.unitName,
        status: item.status,
        barcode: item.barcode
      }));

      const response = await api.post('/invoices/import/excel', payload);

      toast({
        title: 'Importação Concluída com Sucesso!',
        description: `Importadas ${response.data.importedCount} faturas (Total: R$ ${response.data.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}). ${response.data.newSuppliersCreatedCount} fornecedores cadastrados.`,
      });

      onSuccess();
      handleClose();

    } catch (error: any) {
      console.error('Erro na importação:', error);
      const errorMsg = error.response?.data?.message || error.response?.data?.error || 'Falha ao salvar faturas no servidor.';
      toast({
        title: 'Erro na Importação',
        description: errorMsg,
        variant: 'destructive'
      });
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setItems([]);
    setSearchTerm('');
    setFilterMode('ALL');
    setStats({ totalRows: 0, validRows: 0, invalidRows: 0, newSuppliersCount: 0, totalAmount: 0 });
    onClose();
  };

  // Filtragem rápida por status e texto de busca
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (filterMode === 'VALID' && !item.isValid) return false;
      if (filterMode === 'INVALID' && item.isValid) return false;

      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        item.supplierName.toLowerCase().includes(term) ||
        item.description.toLowerCase().includes(term) ||
        item.companySigla.toLowerCase().includes(term) ||
        item.unitName.toLowerCase().includes(term) ||
        item.barcode.toLowerCase().includes(term) ||
        item.amount.toString().includes(term)
      );
    });
  }, [items, filterMode, searchTerm]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[98vw] xl:max-w-[1450px] w-full max-h-[94vh] flex flex-col bg-gray-900 text-white border-gray-800 p-4 sm:p-6 shadow-2xl overflow-hidden">
        <DialogHeader className="pb-2 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-seguranca-yellow">
              <FileSpreadsheet className="h-6 w-6" />
              Importar Contas a Pagar (Planilha Excel)
            </DialogTitle>
          </div>
          <DialogDescription className="text-gray-400 text-xs sm:text-sm">
            Processamento automatizado de pagamentos: auto-cadastro de fornecedores, categorização por empresa e identificação de unidades.
          </DialogDescription>
        </DialogHeader>

        {!file ? (
          <div className="py-16 flex flex-col items-center justify-center border-2 border-dashed border-gray-700 rounded-xl bg-gray-800/40 hover:bg-gray-800/70 transition-colors cursor-pointer relative my-4">
            <input 
              type="file" 
              accept=".xlsx, .xls, .csv" 
              onChange={handleFileUpload} 
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <div className="p-4 bg-yellow-500/10 rounded-full mb-3">
              <Upload className="h-10 w-10 text-seguranca-yellow animate-bounce" />
            </div>
            <p className="text-lg font-bold text-gray-200">Arraste ou clique para selecionar a planilha</p>
            <p className="text-sm text-gray-400 mt-1">Formatos aceitos: <span className="font-semibold text-gray-300">.xlsx, .xls</span> (Planilha de Pagamento)</p>
          </div>
        ) : parsing ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-4">
            <RefreshCw className="h-10 w-10 text-seguranca-yellow animate-spin" />
            <p className="text-gray-300 font-medium text-base">Lendo e estruturando os dados da planilha...</p>
          </div>
        ) : (
          <div className="space-y-3 flex-1 min-h-0 flex flex-col pt-2">
            {/* Stat Cards - Compacto e Elegante */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              <div className="bg-gray-800/80 p-3 rounded-lg border border-gray-700 shadow-sm">
                <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">Linhas Identificadas</p>
                <p className="text-2xl font-bold text-white mt-0.5">{stats.totalRows}</p>
                <p className="text-[11px] text-green-400 mt-0.5 font-medium flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" /> {stats.validRows} prontas para importar
                </p>
              </div>

              <div className="bg-gray-800/80 p-3 rounded-lg border border-gray-700 shadow-sm">
                <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">Fornecedores a Processar</p>
                <p className="text-2xl font-bold text-seguranca-yellow mt-0.5">{stats.newSuppliersCount}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Auto-cadastro se inexistente</p>
              </div>

              <div className="bg-gray-800/80 p-3 rounded-lg border border-gray-700 shadow-sm">
                <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">Valor Total Válido</p>
                <p className="text-2xl font-bold text-green-400 mt-0.5 font-mono">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.totalAmount)}
                </p>
              </div>

              <div className="bg-gray-800/80 p-3 rounded-lg border border-gray-700 shadow-sm flex flex-col justify-between">
                <div>
                  <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">Arquivo Carregado</p>
                  <p className="text-xs font-bold text-gray-200 truncate mt-0.5" title={file.name}>{file.name}</p>
                </div>
                <button 
                  onClick={() => setFile(null)} 
                  className="text-xs text-red-400 hover:text-red-300 font-medium hover:underline mt-1 text-left"
                >
                  Trocar Arquivo
                </button>
              </div>
            </div>

            {/* Barra de Filtros e Busca Rápida */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 bg-gray-850/60 p-2 rounded-lg border border-gray-800">
              <div className="flex items-center gap-1.5 overflow-x-auto">
                <Button
                  size="sm"
                  variant={filterMode === 'ALL' ? 'default' : 'ghost'}
                  onClick={() => setFilterMode('ALL')}
                  className={`text-xs h-7 px-2.5 font-semibold ${
                    filterMode === 'ALL' 
                      ? 'bg-seguranca-yellow text-black hover:bg-yellow-500' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Todos ({items.length})
                </Button>
                <Button
                  size="sm"
                  variant={filterMode === 'VALID' ? 'default' : 'ghost'}
                  onClick={() => setFilterMode('VALID')}
                  className={`text-xs h-7 px-2.5 font-semibold ${
                    filterMode === 'VALID' 
                      ? 'bg-green-600 text-white hover:bg-green-500' 
                      : 'text-green-400 hover:text-green-300'
                  }`}
                >
                  Prontos ({stats.validRows})
                </Button>
                <Button
                  size="sm"
                  variant={filterMode === 'INVALID' ? 'default' : 'ghost'}
                  onClick={() => setFilterMode('INVALID')}
                  className={`text-xs h-7 px-2.5 font-semibold ${
                    filterMode === 'INVALID' 
                      ? 'bg-red-600 text-white hover:bg-red-500' 
                      : 'text-red-400 hover:text-red-300'
                  }`}
                >
                  Inválidos / Incompletos ({stats.invalidRows})
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <Input 
                    type="text" 
                    placeholder="Filtrar por fornecedor, valor..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-7 pl-8 pr-3 text-xs bg-gray-950 border-gray-700 text-white placeholder-gray-500 rounded"
                  />
                </div>
                <span className="text-[11px] text-gray-400 hidden lg:inline font-mono whitespace-nowrap">
                  Mostrando {filteredItems.length} de {items.length}
                </span>
              </div>
            </div>

            {/* Tabela de Pré-visualização com rolagem independente X e Y */}
            <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto border border-gray-800 rounded-lg bg-gray-950/80 shadow-inner">
              <Table className="w-full min-w-[1000px] border-collapse text-left">
                <TableHeader className="bg-gray-800/95 sticky top-0 z-20 backdrop-blur border-b border-gray-700">
                  <TableRow className="border-b border-gray-700">
                    <TableHead className="w-[95px] text-gray-200 font-bold text-xs py-2 px-3">
                      Status
                    </TableHead>
                    <TableHead className="w-[105px] text-gray-200 font-bold text-xs py-2 px-3">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-gray-400" />
                        Vencimento
                      </div>
                    </TableHead>
                    <TableHead className="w-[85px] text-gray-200 font-bold text-xs py-2 px-3">
                      <div className="flex items-center gap-1">
                        <Building2 className="h-3 w-3 text-gray-400" />
                        Empresa
                      </div>
                    </TableHead>
                    <TableHead className="min-w-[240px] text-gray-200 font-bold text-xs py-2 px-3">
                      Fornecedor / Descrição
                    </TableHead>
                    <TableHead className="w-[120px] text-gray-200 font-bold text-xs py-2 px-3">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-gray-400" />
                        Unidade
                      </div>
                    </TableHead>
                    <TableHead className="w-[95px] text-gray-200 font-bold text-xs py-2 px-3">
                      <div className="flex items-center gap-1">
                        <Tag className="h-3 w-3 text-gray-400" />
                        Tipo
                      </div>
                    </TableHead>
                    <TableHead className="w-[130px] text-right text-gray-200 font-bold text-xs py-2 px-3">
                      <div className="flex items-center justify-end gap-1">
                        <DollarSign className="h-3 w-3 text-green-400" />
                        Valor (R$)
                      </div>
                    </TableHead>
                    <TableHead className="w-[200px] text-gray-200 font-bold text-xs py-2 px-3">
                      <div className="flex items-center gap-1">
                        <CreditCard className="h-3 w-3 text-gray-400" />
                        Cód. Barras / Detalhes
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-gray-400">
                        Nenhuma linha encontrada para o filtro selecionado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredItems.map((item) => (
                      <TableRow 
                        key={item.id}
                        className={`border-b border-gray-850 transition-colors ${
                          item.isValid ? 'hover:bg-gray-800/40' : 'bg-red-950/20 hover:bg-red-950/30'
                        }`}
                      >
                        <TableCell className="w-[95px] py-2 px-3">
                          {item.isValid ? (
                            item.warnings.length > 0 ? (
                              <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 text-[10px] px-1.5 py-0.5 whitespace-nowrap font-semibold">
                                <AlertTriangle className="h-2.5 w-2.5 mr-1" />
                                Aviso
                              </Badge>
                            ) : (
                              <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-[10px] px-1.5 py-0.5 whitespace-nowrap font-semibold">
                                <CheckCircle className="h-2.5 w-2.5 mr-1" />
                                Pronto
                              </Badge>
                            )
                          ) : (
                            <Badge className="bg-red-500/20 text-red-300 border-red-500/30 text-[10px] px-1.5 py-0.5 whitespace-nowrap font-semibold">
                              <XCircle className="h-2.5 w-2.5 mr-1" />
                              Inválido
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell className="w-[105px] py-2 px-3 font-mono text-xs text-gray-200 whitespace-nowrap">
                          {item.dueDateFormatted}
                        </TableCell>

                        <TableCell className="w-[85px] py-2 px-3">
                          <Badge variant="outline" className="border-gray-600 bg-gray-800/70 text-gray-100 font-bold text-[11px] px-1.5 py-0.5">
                            {item.companySigla}
                          </Badge>
                        </TableCell>

                        <TableCell className="min-w-[240px] py-2 px-3">
                          <div>
                            <p className="font-semibold text-xs text-gray-100 line-clamp-1" title={item.supplierName}>
                              {item.supplierName}
                            </p>
                            {item.notes && (
                              <p className="text-[11px] text-gray-400 line-clamp-1 mt-0.5" title={item.notes}>
                                {item.notes}
                              </p>
                            )}
                            {item.errors.length > 0 && (
                              <p className="text-[10px] text-red-400 mt-0.5 font-medium">
                                {item.errors.join(' ')}
                              </p>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="w-[120px] py-2 px-3 text-xs whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              const newUnit = item.unitName === 'CONTAGEM' ? 'UBERLÂNDIA' : 'CONTAGEM';
                              setItems(prev => prev.map(p => p.id === item.id ? { ...p, unitName: newUnit } : p));
                            }}
                            title="Clique para alternar a Unidade (CONTAGEM / UBERLÂNDIA)"
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition-colors cursor-pointer ${
                              item.unitName === 'CONTAGEM'
                                ? 'bg-blue-500/20 text-blue-300 border-blue-500/40 hover:bg-blue-500/30'
                                : 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                            }`}
                          >
                            {item.unitName || 'CONTAGEM'}
                          </button>
                        </TableCell>

                        <TableCell className="w-[95px] py-2 px-3">
                          <Badge 
                            variant="outline" 
                            className={`text-[10px] px-1.5 py-0.5 font-medium ${
                              item.type === 'FIXA' 
                                ? 'border-blue-500/40 text-blue-300 bg-blue-950/20' 
                                : 'border-gray-700 text-gray-300 bg-gray-800/40'
                            }`}
                          >
                            {item.type}
                          </Badge>
                        </TableCell>

                        <TableCell className="w-[130px] py-2 px-3 font-mono font-bold text-right text-xs whitespace-nowrap">
                          <span className={item.amount > 0 ? 'text-green-400' : 'text-gray-500'}>
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.amount)}
                          </span>
                        </TableCell>

                        <TableCell className="w-[200px] py-2 px-3 font-mono text-[11px] text-gray-400 max-w-[200px] truncate" title={item.barcode}>
                          {item.barcode || '—'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <DialogFooter className="mt-3 flex flex-col sm:flex-row justify-between items-center gap-2 border-t border-gray-800 pt-3">
          <div className="text-xs text-gray-400 order-2 sm:order-1">
            {stats.validRows > 0 && (
              <span>
                Total a importar: <strong className="text-green-400 font-mono">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.totalAmount)}</strong> ({stats.validRows} faturas)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 order-1 sm:order-2 w-full sm:w-auto justify-end">
            <Button variant="outline" onClick={handleClose} disabled={importing} className="border-gray-700 text-gray-300 hover:bg-gray-800">
              Cancelar
            </Button>

            {file && !parsing && (
              <Button 
                onClick={handleConfirmImport} 
                disabled={importing || stats.validRows === 0}
                className="bg-seguranca-yellow hover:bg-yellow-500 text-black font-bold shadow-md"
              >
                {importing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Processando Importação...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Confirmar Importação ({stats.validRows})
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportInvoicesModal;
