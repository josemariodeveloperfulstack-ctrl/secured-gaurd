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

  const normalizeStr = (val: any): string => {
    return String(val || '')
      .trim()
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  };

  const parseExcelDate = (val: any): string => {
    if (!val) return '';
    if (val instanceof Date && !isNaN(val.getTime())) {
      const yyyy = val.getFullYear();
      const mm = String(val.getMonth() + 1).padStart(2, '0');
      const dd = String(val.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
    if (typeof val === 'number') {
      if (val > 30000 && val < 70000) {
        const dateObj = XLSX.SSF.parse_date_code(val);
        if (dateObj && dateObj.y && dateObj.m && dateObj.d) {
          const yyyy = dateObj.y;
          const mm = String(dateObj.m).padStart(2, '0');
          const dd = String(dateObj.d).padStart(2, '0');
          return `${yyyy}-${mm}-${dd}`;
        }
      }
    }
    const str = String(val).trim();
    // Formato DD/MM/YYYY ou DD-MM-YYYY
    const matchBR = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (matchBR) {
      const dd = String(matchBR[1]).padStart(2, '0');
      const mm = String(matchBR[2]).padStart(2, '0');
      let yyyy = matchBR[3];
      if (yyyy.length === 2) yyyy = `20${yyyy}`;
      return `${yyyy}-${mm}-${dd}`;
    }
    // Formato YYYY-MM-DD
    const matchISO = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
    if (matchISO) {
      const yyyy = matchISO[1];
      const mm = String(matchISO[2]).padStart(2, '0');
      const dd = String(matchISO[3]).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
    return '';
  };

  const parseNumber = (val: any): number => {
    if (val === undefined || val === null || val === '') return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    let str = String(val).replace(/R\$\s?/gi, '').trim();
    // Se tiver formato brasileiro 1.250,50
    if (str.includes(',') && str.includes('.')) {
      str = str.replace(/\./g, '').replace(',', '.');
    } else if (str.includes(',')) {
      str = str.replace(',', '.');
    }
    // Tenta extrair dígitos e ponto decimal
    const match = str.match(/-?\d+(\.\d+)?/);
    if (match) {
      const num = parseFloat(match[0]);
      return isNaN(num) ? 0 : num;
    }
    return 0;
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
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });

        // Encontrar a primeira aba com dados válidos
        let targetWorksheet: XLSX.WorkSheet | null = null;
        for (const sheetName of workbook.SheetNames) {
          const ws = workbook.Sheets[sheetName];
          const testRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
          if (testRows && testRows.length > 1) {
            targetWorksheet = ws;
            break;
          }
        }

        if (!targetWorksheet) {
          targetWorksheet = workbook.Sheets[workbook.SheetNames[0]];
        }
        
        const rawRows: any[][] = XLSX.utils.sheet_to_json(targetWorksheet, { header: 1, defval: '' });

        // 1. Detecção Dinâmica de Cabeçalhos
        let headerRowIndex = -1;
        const colMap = {
          date: -1,
          company: -1,
          supplier: -1,
          type: -1,
          desc: -1,
          who: -1,
          amount: -1,
          valUberlandia: -1,
          valServicosAdm: -1,
          valTerceirizacao: -1,
          valVigilancia: -1,
          status: -1,
          barcode: -1,
          unit: -1,
        };

        for (let r = 0; r < Math.min(20, rawRows.length); r++) {
          const row = rawRows[r];
          if (!row || !Array.isArray(row)) continue;
          
          let matches = 0;
          const tempMap = { ...colMap };
          
          row.forEach((cell, colIdx) => {
            const h = normalizeStr(cell);
            if (!h) return;
            
            if (h.includes('VENC') || h === 'DATA' || h.includes('DT VENC') || h.includes('DATA VENC') || h.includes('EMISSAO') || h.includes('DATA PAG')) {
              if (tempMap.date === -1) { tempMap.date = colIdx; matches++; }
            } else if (h.includes('FORNEC') || h.includes('FAVOREC') || h.includes('CREDOR') || h.includes('BENEFICI') || h.includes('PRESTADOR') || h.includes('RAZAO SOCIAL') || h.includes('LOJA')) {
              if (tempMap.supplier === -1) { tempMap.supplier = colIdx; matches++; }
            } else if (h === 'EMPRESA' || h.includes('SIGLA') || h.includes('FILIAL') || h === 'EMP') {
              if (tempMap.company === -1) { tempMap.company = colIdx; matches++; }
            } else if (h.includes('UBERLANDIA') || h.includes('UBERL') || h.includes('UDI')) {
              tempMap.valUberlandia = colIdx; matches++;
            } else if (h.includes('VIGILAN') || h.includes('VIG')) {
              tempMap.valVigilancia = colIdx; matches++;
            } else if (h.includes('TERCEIR') || h.includes('TERC')) {
              tempMap.valTerceirizacao = colIdx; matches++;
            } else if (h.includes('SERV') || h.includes('ADM')) {
              tempMap.valServicosAdm = colIdx; matches++;
            } else if (h === 'VALOR' || h.includes('VALOR TOTAL') || h === 'TOTAL' || h.includes('VALOR (R$)') || h.includes('VALOR R$') || h === 'R$' || h.includes('PRECO') || h.includes('CUSTO') || h.includes('A PAGAR') || h.includes('VALOR DA NOTA') || h.includes('VALOR LIQUIDO') || h.includes('VALOR BRUTO') || h.includes('PAGAMENTO')) {
              if (tempMap.amount === -1) { tempMap.amount = colIdx; matches++; }
            } else if (h.includes('DESC') || h.includes('HISTORIC') || h.includes('DETALH') || h.includes('ITEM') || h.includes('PRODUTO') || h.includes('SERVICO') || h.includes('MOTIVO') || h.includes('DESPESA')) {
              if (tempMap.desc === -1) { tempMap.desc = colIdx; matches++; }
            } else if (h.includes('QUEM') || h.includes('SOLICIT') || h.includes('RESPONS') || h.includes('COMPRADOR') || h.includes('SOLICITANTE') || h.includes('ALMOXARIF')) {
              if (tempMap.who === -1) { tempMap.who = colIdx; matches++; }
            } else if (h.includes('STATUS') || h.includes('SITUAC') || h.includes('PAGO') || h.includes('BAIXA') || h.includes('QUITAD')) {
              if (tempMap.status === -1) { tempMap.status = colIdx; matches++; }
            } else if (h.includes('BARRA') || h.includes('BOLETO') || h.includes('DIGITAVEL') || h.includes('LINHA')) {
              if (tempMap.barcode === -1) { tempMap.barcode = colIdx; matches++; }
            } else if (h.includes('UNIDADE') || h.includes('POSTO') || h.includes('CIDADE') || h.includes('LOCAL') || h.includes('BASE')) {
              if (tempMap.unit === -1) { tempMap.unit = colIdx; matches++; }
            } else if (h.includes('TIPO') || h.includes('CATEGORIA') || h.includes('CLASSIF')) {
              if (tempMap.type === -1) { tempMap.type = colIdx; matches++; }
            }
          });
          
          if (matches >= 2) {
            headerRowIndex = r;
            Object.assign(colMap, tempMap);
            break;
          }
        }

        // Se não identificou cabeçalho clássico, define posições padrão da planilha matriz
        if (headerRowIndex === -1) {
          colMap.date = 1;
          colMap.company = 2;
          colMap.supplier = 3;
          colMap.type = 4;
          colMap.desc = 5;
          colMap.who = 6;
          colMap.valUberlandia = 7;
          colMap.valServicosAdm = 8;
          colMap.valTerceirizacao = 9;
          colMap.valVigilancia = 10;
          colMap.status = 11;
          colMap.barcode = 12;
        }

        const parsedItems: ParsedRowItem[] = [];
        let validCount = 0;
        let invalidCount = 0;
        let sumAmount = 0;
        const suppliersSet = new Set<string>();

        const startRow = headerRowIndex >= 0 ? headerRowIndex + 1 : 0;

        for (let index = startRow; index < rawRows.length; index++) {
          const row = rawRows[index];
          if (!row || !Array.isArray(row) || row.length === 0) continue;

          const fullRowText = row.map((c: any) => String(c || '').trim()).join(' ');
          const fullRowUpper = normalizeStr(fullRowText);

          // Ignorar linhas vazias ou de totalizador
          if (!fullRowText || fullRowUpper.startsWith('TOTAL') || fullRowUpper.startsWith('SOMA') || fullRowUpper.startsWith('SUBTOTAL')) {
            continue;
          }

          // Se a linha for repetição do cabeçalho
          if (fullRowUpper.includes('EMPRESA') && fullRowUpper.includes('FORNECEDOR')) {
            continue;
          }

          // 1. Data de Vencimento
          let dateStr = colMap.date !== -1 ? parseExcelDate(row[colMap.date]) : '';
          if (!dateStr) {
            // Busca por qualquer célula que seja data válida na linha
            for (let c = 0; c < row.length; c++) {
              const d = parseExcelDate(row[c]);
              if (d) {
                dateStr = d;
                break;
              }
            }
          }

          // 2. Identificação de Valores
          let rowAmount = 0;
          let detectedCompany = colMap.company !== -1 ? normalizeStr(row[colMap.company]) : '';
          let detectedUnit = '';

          const valVig = colMap.valVigilancia !== -1 ? parseNumber(row[colMap.valVigilancia]) : 0;
          const valTerc = colMap.valTerceirizacao !== -1 ? parseNumber(row[colMap.valTerceirizacao]) : 0;
          const valAdm = colMap.valServicosAdm !== -1 ? parseNumber(row[colMap.valServicosAdm]) : 0;
          const valUdi = colMap.valUberlandia !== -1 ? parseNumber(row[colMap.valUberlandia]) : 0;

          if (valVig > 0) {
            rowAmount = valVig;
            if (!detectedCompany) detectedCompany = 'VIG';
          } else if (valTerc > 0) {
            rowAmount = valTerc;
            if (!detectedCompany) detectedCompany = 'TERC';
          } else if (valAdm > 0) {
            rowAmount = valAdm;
            if (!detectedCompany) detectedCompany = 'TERC';
          } else if (valUdi > 0) {
            rowAmount = valUdi;
            detectedUnit = 'UBERLÂNDIA';
            if (!detectedCompany) detectedCompany = 'ADM';
          } else if (colMap.amount !== -1 && parseNumber(row[colMap.amount]) > 0) {
            rowAmount = parseNumber(row[colMap.amount]);
          }

          // Varredura Inteligente de Valor Fallback: se ainda for 0, procura o valor numérico mais plausível na linha
          if (rowAmount <= 0) {
            for (let c = 0; c < row.length; c++) {
              if (c === colMap.date) continue;
              const cellRaw = row[c];
              if (cellRaw instanceof Date) continue;
              const num = parseNumber(cellRaw);
              // Ignorar números inteiros que parecem ano (2024..2030) ou códigos simples (1..31)
              if (num > 0 && num !== 2024 && num !== 2025 && num !== 2026 && num !== 2027) {
                rowAmount = num;
                break;
              }
            }
          }

          // 3. Fornecedor e Descrição
          let supplierName = colMap.supplier !== -1 ? String(row[colMap.supplier] || '').trim() : '';
          let description = colMap.desc !== -1 ? String(row[colMap.desc] || '').trim() : '';
          const who = colMap.who !== -1 ? String(row[colMap.who] || '').trim() : '';

          // Se fornecedor estiver vazio, tenta extrair da descrição ou de outra coluna de texto
          if (!supplierName) {
            if (description && description.length > 2) {
              supplierName = description;
            } else {
              for (let c = 0; c < row.length; c++) {
                if (c === colMap.date || c === colMap.amount) continue;
                const text = String(row[c] || '').trim();
                if (text && text.length > 2 && parseNumber(text) === 0 && !parseExcelDate(text)) {
                  supplierName = text;
                  break;
                }
              }
            }
          }

          if (!description) {
            description = supplierName || 'Pagamento / Despesa Importada';
          }

          // 4. Detecção de Unidade e Empresa
          if (colMap.unit !== -1 && row[colMap.unit]) {
            const uText = normalizeStr(row[colMap.unit]);
            if (uText.includes('UBERL') || uText.includes('UDI')) {
              detectedUnit = 'UBERLÂNDIA';
            } else if (uText.includes('CONTAG') || uText.includes('SEDE') || uText.includes('MATRIZ')) {
              detectedUnit = 'CONTAGEM';
            }
          }

          if (!detectedUnit) {
            if (fullRowUpper.includes('CONTAGEM') || fullRowUpper.includes('CONTAG') || fullRowUpper.includes('SEDE') || fullRowUpper.includes('MATRIZ')) {
              detectedUnit = 'CONTAGEM';
            } else if (fullRowUpper.includes('UBERLANDIA') || fullRowUpper.includes('UBERLÂNDIA') || fullRowUpper.includes('UDI')) {
              detectedUnit = 'UBERLÂNDIA';
            } else {
              detectedUnit = 'CONTAGEM';
            }
          }

          // Normalizar Empresa
          if (detectedCompany.includes('VIG') || detectedCompany.includes('VIGILAN')) {
            detectedCompany = 'VIG';
          } else if (detectedCompany.includes('TERC') || detectedCompany.includes('SERV')) {
            detectedCompany = 'TERC';
          } else if (detectedCompany.includes('ADM')) {
            detectedCompany = 'ADM';
          } else if (detectedCompany.includes('UBERL')) {
            detectedCompany = 'UBERL';
            detectedUnit = 'UBERLÂNDIA';
          } else {
            detectedCompany = 'VIG';
          }

          const colTypeStr = colMap.type !== -1 ? normalizeStr(row[colMap.type]) : '';
          const colStatusStr = colMap.status !== -1 ? normalizeStr(row[colMap.status]) : '';
          const barcode = colMap.barcode !== -1 ? String(row[colMap.barcode] || '').trim() : '';

          const type: 'FIXA' | 'VARIAVEL' = colTypeStr.includes('FIXA') ? 'FIXA' : 'VARIAVEL';
          const status: 'PENDENTE' | 'PAGA' = (colStatusStr.includes('PAG') || colStatusStr.includes('SIM') || colStatusStr.includes('X')) ? 'PAGA' : 'PENDENTE';

          let notes = description !== supplierName ? description : '';
          if (who) {
            notes += (notes ? ' | ' : '') + 'Responsável: ' + who;
          }

          const warnings: string[] = [];
          const errors: string[] = [];

          if (rowAmount <= 0) {
            errors.push('Valor zerado ou não identificado.');
          }

          if (!dateStr) {
            warnings.push('Data de vencimento não informada (será usada data de hoje).');
          }

          if (supplierName) {
            suppliersSet.add(supplierName);
          } else {
            warnings.push('Fornecedor não especificado.');
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
            dueDate: dateStr || new Date().toISOString().split('T')[0],
            dueDateFormatted: dateStr ? dateStr.split('-').reverse().join('/') : 'Hoje',
            companySigla: detectedCompany || 'VIG',
            supplierName: supplierName || 'Despesa Importada',
            type,
            description: description || supplierName || 'Pagamento Importado',
            notes,
            amount: rowAmount,
            unitName: detectedUnit || 'CONTAGEM',
            status,
            barcode,
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
