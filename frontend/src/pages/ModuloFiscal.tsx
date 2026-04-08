import React, { useCallback, useEffect, useState } from 'react';
import { StandardLayout } from '@/components/StandardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  fiscalService,
  FiscalInvoice,
  FiscalFilters,
  ZipGroupBy,
} from '@/services/fiscalService';
import { useToast } from '@/hooks/use-toast';
import {
  Upload,
  RefreshCw,
  Search,
  Download,
  Trash2,
  FolderArchive,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const MESES: { value: number; label: string }[] = [
  { value: 1, label: 'Janeiro' },
  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },
  { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' },
];

const currentYear = new Date().getFullYear();
const ANOS = Array.from({ length: 6 }, (_, i) => currentYear - i);

export default function ModuloFiscal() {
  const { toast } = useToast();
  const [list, setList] = useState<FiscalInvoice[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [size] = useState(10);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [zipLoading, setZipLoading] = useState(false);

  // Filtros da listagem
  const [filterYear, setFilterYear] = useState<number | ''>('');
  const [filterMonth, setFilterMonth] = useState<number | ''>('');
  const [filterClient, setFilterClient] = useState('');
  const [filterType, setFilterType] = useState<string>('__all__');

  // Upload apenas PDF (nome do cliente informado no formulário)
  const [uploadFilePdf, setUploadFilePdf] = useState<File | null>(null);
  const [uploadClientName, setUploadClientName] = useState('');
  const [uploadMonth, setUploadMonth] = useState(currentYear === new Date().getFullYear() ? new Date().getMonth() + 1 : 1);
  const [uploadYear, setUploadYear] = useState(currentYear);

  // Download ZIP
  const [zipGroupBy, setZipGroupBy] = useState<ZipGroupBy>('PERIOD');

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const filters: FiscalFilters = {
        page,
        size,
        sort: 'createdAt,desc',
      };
      if (filterYear !== '') filters.periodYear = Number(filterYear);
      if (filterMonth !== '') filters.periodMonth = Number(filterMonth);
      if (filterClient.trim()) filters.clientName = filterClient.trim();
      if (filterType !== '__all__') filters.fileType = filterType;
      const result = await fiscalService.list(filters);
      setList(result.content);
      setTotal(result.totalElements);
    } catch {
      toast({ title: 'Erro', description: 'Falha ao carregar notas fiscais', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [page, size, filterYear, filterMonth, filterClient, filterType, toast]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const applyFilters = () => {
    setPage(0);
    setTimeout(() => loadList(), 0);
  };

  const handleUploadPdf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFilePdf) {
      toast({
        title: 'Atenção',
        description: 'Selecione o arquivo PDF da nota fiscal.',
        variant: 'destructive',
      });
      return;
    }
    if (!uploadClientName.trim()) {
      toast({
        title: 'Atenção',
        description: 'Informe o nome do cliente para associar à nota.',
        variant: 'destructive',
      });
      return;
    }
    const extPdf = (uploadFilePdf.name || '').split('.').pop()?.toLowerCase();
    if (extPdf !== 'pdf') {
      toast({ title: 'Atenção', description: 'O arquivo deve ser um PDF.', variant: 'destructive' });
      return;
    }
    setUploading(true);
    try {
      await fiscalService.upload(uploadFilePdf, uploadClientName.trim(), uploadMonth, uploadYear);
      toast({ title: 'Sucesso', description: 'PDF importado com sucesso.' });
      setUploadFilePdf(null);
      setUploadClientName('');
      loadList();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Falha ao importar o PDF.';
      toast({ title: 'Erro', description: msg, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (inv: FiscalInvoice) => {
    try {
      await fiscalService.downloadFile(inv.id, inv.fileNameOriginal || `nota.${inv.fileType.toLowerCase()}`);
      toast({ title: 'Sucesso', description: 'Download iniciado.' });
    } catch {
      toast({ title: 'Erro', description: 'Falha no download', variant: 'destructive' });
    }
  };

  const handleDelete = async (inv: FiscalInvoice) => {
    if (!confirm(`Excluir nota fiscal "${inv.fileNameOriginal || inv.id}"?`)) return;
    try {
      await fiscalService.delete(inv.id);
      toast({ title: 'Sucesso', description: 'Nota fiscal excluída.' });
      loadList();
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível excluir.', variant: 'destructive' });
    }
  };

  const handleDownloadZip = async () => {
    setZipLoading(true);
    try {
      const params: Parameters<typeof fiscalService.downloadZip>[0] = { groupBy: zipGroupBy };
      if (filterYear !== '') params.periodYear = Number(filterYear);
      if (filterMonth !== '') params.periodMonth = Number(filterMonth);
      if (filterClient.trim()) params.clientName = filterClient.trim();
      if (filterType !== '__all__') params.fileType = filterType;
      await fiscalService.downloadZip(params);
      toast({ title: 'Sucesso', description: 'Download do ZIP iniciado.' });
    } catch (err: any) {
      toast({ title: 'Erro', description: err?.message || 'Falha ao gerar ZIP ou não há arquivos para os filtros.', variant: 'destructive' });
    } finally {
      setZipLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / size));

  let tableBody: React.ReactNode;
  if (loading) {
    tableBody = (
      <tr><td colSpan={5} className="py-4 text-center text-gray-500">Carregando...</td></tr>
    );
  } else if (list.length === 0) {
    tableBody = (
      <tr><td colSpan={5} className="py-4 text-center text-gray-500">Nenhuma nota fiscal encontrada.</td></tr>
    );
  } else {
    tableBody = list.map((inv) => (
      <tr key={inv.id} className="border-b border-gray-700/50">
        <td className="py-2 pr-2 font-medium">{inv.clientName}</td>
        <td className="py-2 pr-2">{MESES.find((m) => m.value === inv.periodMonth)?.label || inv.periodMonth}/{inv.periodYear}</td>
        <td className="py-2 pr-2">
          <span className={inv.fileType === 'PDF' ? 'text-red-400' : 'text-amber-400'}>{inv.fileType}</span>
        </td>
        <td className="py-2 pr-2 truncate max-w-[200px]" title={inv.fileNameOriginal || ''}>{inv.fileNameOriginal || '—'}</td>
        <td className="py-2 pr-2 text-right">
          <Button variant="ghost" size="sm" onClick={() => handleDownload(inv)} className="text-gray-400 hover:text-white">
            <Download className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDelete(inv)} className="text-gray-400 hover:text-red-400">
            <Trash2 className="w-4 h-4" />
          </Button>
        </td>
      </tr>
    ));
  }

  return (
    <StandardLayout title="Módulo Fiscal">
      <div className="space-y-4">
        {/* Upload apenas PDF */}
        <Card className="p-4 bg-seguranca-graphite border-gray-700">
          <h3 className="text-sm font-medium text-gray-200 mb-3 flex items-center gap-2">
            <Upload className="w-4 h-4" /> Importar nota fiscal (PDF)
          </h3>
          <p className="text-xs text-gray-500 mb-3">
            Envie o PDF da nota fiscal e informe o nome do cliente e o período (mês/ano) para organização e filtros.
          </p>
          <form onSubmit={handleUploadPdf} className="flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor="fiscal-upload-pdf" className="block text-xs text-gray-400 mb-1">PDF</label>
              <Input
                id="fiscal-upload-pdf"
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => setUploadFilePdf(e.target.files?.[0] || null)}
                className="bg-seguranca-black border-gray-600 max-w-xs"
              />
            </div>
            <div>
              <label htmlFor="fiscal-client-name" className="block text-xs text-gray-400 mb-1">Cliente</label>
              <Input
                id="fiscal-client-name"
                type="text"
                placeholder="Nome do cliente"
                value={uploadClientName}
                onChange={(e) => setUploadClientName(e.target.value)}
                className="bg-seguranca-black border-gray-600 w-56 max-w-full"
              />
            </div>
            <div>
              <span className="block text-xs text-gray-400 mb-1">Período (mês)</span>
              <Select value={String(uploadMonth)} onValueChange={(v) => setUploadMonth(Number(v))}>
                <SelectTrigger className="w-36 bg-seguranca-black border-gray-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MESES.map((m) => (
                    <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <span className="block text-xs text-gray-400 mb-1">Ano</span>
              <Select value={String(uploadYear)} onValueChange={(v) => setUploadYear(Number(v))}>
                <SelectTrigger className="w-24 bg-seguranca-black border-gray-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ANOS.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={uploading} className="bg-seguranca-red hover:bg-seguranca-red/90">
              {uploading ? 'Importando...' : 'Importar PDF'}
            </Button>
          </form>
        </Card>

        {/* Filtros e lista */}
        <Card className="p-4 bg-seguranca-graphite border-gray-700">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <Search size={16} className="text-gray-400" />
            <Select value={filterYear === '' ? '__all__' : String(filterYear)} onValueChange={(v) => setFilterYear(v === '__all__' ? '' : Number(v))}>
              <SelectTrigger className="w-24 bg-seguranca-black border-gray-600">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos</SelectItem>
                {ANOS.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterMonth === '' ? '__all__' : String(filterMonth)} onValueChange={(v) => setFilterMonth(v === '__all__' ? '' : Number(v))}>
              <SelectTrigger className="w-32 bg-seguranca-black border-gray-600">
                <SelectValue placeholder="Mês" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos</SelectItem>
                {MESES.map((m) => (
                  <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Cliente"
              value={filterClient}
              onChange={(e) => setFilterClient(e.target.value)}
              className="w-48 bg-seguranca-black border-gray-600"
            />
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-28 bg-seguranca-black border-gray-600">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos</SelectItem>
                <SelectItem value="PDF">PDF</SelectItem>
                <SelectItem value="XML">XML</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={applyFilters} className="border-gray-600">
              <RefreshCw className="w-4 h-4 mr-1" /> Filtrar
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-300">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="py-2 pr-2">Cliente</th>
                  <th className="py-2 pr-2">Período</th>
                  <th className="py-2 pr-2">Tipo</th>
                  <th className="py-2 pr-2">Arquivo</th>
                  <th className="py-2 pr-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {tableBody}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-3 text-sm text-gray-400">
              <span>Total: {total} registro(s)</span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="border-gray-600">Anterior</Button>
                <span className="px-2 py-1">Página {page + 1} de {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)} className="border-gray-600">Próxima</Button>
              </div>
            </div>
          )}
        </Card>

        {/* Download em ZIP */}
        <Card className="p-4 bg-seguranca-graphite border-gray-700">
          <h3 className="text-sm font-medium text-gray-200 mb-3 flex items-center gap-2">
            <FolderArchive className="w-4 h-4" /> Download em ZIP (por pastas)
          </h3>
          <p className="text-xs text-gray-500 mb-3">
            Agrupe por período (ano/mês), por nome do cliente ou por tipo de arquivo. Os filtros da listagem acima são usados para limitar o que entra no ZIP.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Select value={zipGroupBy} onValueChange={(v) => setZipGroupBy(v as ZipGroupBy)}>
              <SelectTrigger className="w-48 bg-seguranca-black border-gray-600">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PERIOD">Por período (ano/mês)</SelectItem>
                <SelectItem value="CLIENT">Por cliente</SelectItem>
                <SelectItem value="TYPE">Por tipo de arquivo</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleDownloadZip} disabled={zipLoading} className="bg-seguranca-red hover:bg-seguranca-red/90">
              {zipLoading ? 'Gerando ZIP...' : 'Baixar ZIP'}
            </Button>
          </div>
        </Card>
      </div>
    </StandardLayout>
  );
}
