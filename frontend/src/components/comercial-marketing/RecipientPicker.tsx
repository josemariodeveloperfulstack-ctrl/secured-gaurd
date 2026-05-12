import { useEffect, useMemo, useRef, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Search, Upload, UserPlus, FileSpreadsheet, AlertTriangle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import leadService, { type Lead } from '@/services/leadService';
import type { EmailCampaignRecipientInput } from '@/services/emailCampaignService';
import { parseManualText, parseRecipientFile, toRecipientInputs, type ParseResult } from './utils/recipientParser';

type Mode = 'leads' | 'import' | 'manual';

interface RecipientPickerProps {
  value: EmailCampaignRecipientInput[];
  onChange: (recipients: EmailCampaignRecipientInput[]) => void;
}

export function RecipientPicker({ value, onChange }: RecipientPickerProps) {
  const [mode, setMode] = useState<Mode>('leads');
  return (
    <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)} className="w-full">
      <TabsList className="grid grid-cols-3 w-full bg-slate-100">
        <TabsTrigger value="leads" className="data-[state=active]:bg-seguranca-yellow data-[state=active]:text-seguranca-black">
          <UserPlus className="w-4 h-4 mr-2" /> Leads do CRM
        </TabsTrigger>
        <TabsTrigger value="import" className="data-[state=active]:bg-seguranca-yellow data-[state=active]:text-seguranca-black">
          <FileSpreadsheet className="w-4 h-4 mr-2" /> Importar planilha
        </TabsTrigger>
        <TabsTrigger value="manual" className="data-[state=active]:bg-seguranca-yellow data-[state=active]:text-seguranca-black">
          <Upload className="w-4 h-4 mr-2" /> Colar lista
        </TabsTrigger>
      </TabsList>
      <TabsContent value="leads" className="mt-4">
        <LeadsPickerPane value={value} onChange={onChange} />
      </TabsContent>
      <TabsContent value="import" className="mt-4">
        <ImportPane value={value} onChange={onChange} />
      </TabsContent>
      <TabsContent value="manual" className="mt-4">
        <ManualPane value={value} onChange={onChange} />
      </TabsContent>
    </Tabs>
  );
}

// -----------------------------------------------------------------------------
// Aba 1: Leads do CRM
// -----------------------------------------------------------------------------

function LeadsPickerPane({ value, onChange }: RecipientPickerProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [companyFilter, setCompanyFilter] = useState('');

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads', 'all'],
    queryFn: () => leadService.getAllLeads(),
    staleTime: 60_000,
  });

  const selectedIds = useMemo(() => new Set(value.filter((r) => r.leadId).map((r) => r.leadId as string)), [value]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return leads.filter((l) => {
      if (!l.email) return false;
      if (statusFilter !== 'ALL' && l.status !== statusFilter) return false;
      if (companyFilter && !(l.company || '').toLowerCase().includes(companyFilter.toLowerCase())) return false;
      if (term) {
        const hay = `${l.name || ''} ${l.email || ''} ${l.company || ''}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [leads, search, statusFilter, companyFilter]);

  const toggle = (lead: Lead) => {
    if (!lead.email) return;
    const id = String(lead.id);
    const exists = value.some((r) => r.leadId === id || r.email === lead.email.toLowerCase());
    if (exists) {
      onChange(value.filter((r) => r.leadId !== id && r.email !== lead.email.toLowerCase()));
    } else {
      onChange([
        ...value,
        {
          email: lead.email.toLowerCase(),
          name: lead.name,
          leadId: id,
          sourceType: 'LEAD',
          metadata: {
            company: lead.company,
            position: lead.position,
            phone: lead.phone,
          },
        },
      ]);
    }
  };

  const selectAll = () => {
    const adds = filtered
      .filter((l) => l.email && !selectedIds.has(String(l.id)))
      .map<EmailCampaignRecipientInput>((l) => ({
        email: l.email.toLowerCase(),
        name: l.name,
        leadId: String(l.id),
        sourceType: 'LEAD',
        metadata: { company: l.company, position: l.position, phone: l.phone },
      }));
    onChange([...value, ...adds]);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        <div className="md:col-span-2 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Buscar por nome, e-mail ou empresa…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos os status</SelectItem>
            <SelectItem value="NEW">Novos</SelectItem>
            <SelectItem value="CONTACTED">Contatados</SelectItem>
            <SelectItem value="QUALIFIED">Qualificados</SelectItem>
            <SelectItem value="PROPOSAL_SENT">Proposta enviada</SelectItem>
            <SelectItem value="NEGOTIATION">Negociação</SelectItem>
            <SelectItem value="WON">Ganhos</SelectItem>
            <SelectItem value="LOST">Perdidos</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="Filtrar por empresa"
          value={companyFilter}
          onChange={(e) => setCompanyFilter(e.target.value)}
        />
      </div>
      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>
          {filtered.length} lead(s) encontrado(s) · {value.filter((r) => r.sourceType === 'LEAD').length} selecionado(s)
        </span>
        <Button type="button" variant="outline" size="sm" onClick={selectAll} disabled={filtered.length === 0}>
          Selecionar todos visíveis
        </Button>
      </div>
      <ScrollArea className="h-72 rounded-md border">
        {isLoading ? (
          <div className="flex items-center justify-center h-72 text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando leads…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-72 text-slate-500 text-sm">
            Nenhum lead atende aos filtros.
          </div>
        ) : (
          <ul className="divide-y">
            {filtered.map((lead) => {
              const checked = value.some((r) => r.leadId === String(lead.id));
              return (
                <li key={lead.id} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50">
                  <Checkbox checked={checked} onCheckedChange={() => toggle(lead)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{lead.name || '(sem nome)'}</span>
                      <Badge variant="outline" className="text-xs">{lead.status}</Badge>
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      {lead.email}
                      {lead.company ? ` · ${lead.company}` : ''}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </ScrollArea>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Aba 2: Importar CSV/Excel
// -----------------------------------------------------------------------------

function ImportPane({ value, onChange }: RecipientPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [isParsing, setParsing] = useState(false);
  const { toast } = useToast();

  const handleFile = async (file: File) => {
    setParsing(true);
    try {
      const parsed = await parseRecipientFile(file);
      setResult(parsed);
      const merged = mergeRecipients(value, toRecipientInputs(parsed.rows, 'IMPORT'));
      onChange(merged);
      toast({
        title: 'Planilha importada',
        description: `${parsed.rows.length} contatos válidos${parsed.invalid.length ? `, ${parsed.invalid.length} ignorados` : ''}.`,
      });
    } catch (e) {
      toast({
        title: 'Falha ao ler arquivo',
        description: e instanceof Error ? e.message : 'Formato não suportado.',
        variant: 'destructive',
      });
    } finally {
      setParsing(false);
    }
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-full border-2 border-dashed border-slate-300 hover:border-seguranca-yellow rounded-lg p-8 text-center transition-colors"
      >
        <FileSpreadsheet className="w-10 h-10 text-slate-400 mx-auto mb-2" />
        <p className="text-sm font-medium text-slate-700">
          Clique para escolher um arquivo .csv, .xlsx ou .xls
        </p>
        <p className="text-xs text-slate-500 mt-1">
          A primeira linha deve conter os cabeçalhos. Identificamos automaticamente: <code>email</code>, <code>nome</code>,
          <code>empresa</code>, <code>cargo</code>, <code>telefone</code>.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = '';
          }}
        />
      </button>
      {isParsing && (
        <div className="flex items-center text-sm text-slate-600">
          <Loader2 className="w-4 h-4 animate-spin mr-2" /> Processando…
        </div>
      )}
      {result && (
        <div className="rounded-md border p-3 text-sm space-y-2">
          <div className="flex items-center gap-2">
            <Badge>{result.rows.length} válidos</Badge>
            {result.invalid.length > 0 && (
              <Badge variant="destructive">
                <AlertTriangle className="w-3 h-3 mr-1" /> {result.invalid.length} ignorados
              </Badge>
            )}
            <span className="text-xs text-slate-500">Colunas detectadas: {result.headers.slice(0, 5).join(', ')}{result.headers.length > 5 ? '…' : ''}</span>
          </div>
          {result.invalid.length > 0 && (
            <details>
              <summary className="text-xs text-slate-600 cursor-pointer">Ver linhas ignoradas</summary>
              <ul className="mt-1 text-xs space-y-0.5 max-h-32 overflow-auto">
                {result.invalid.slice(0, 50).map((i) => (
                  <li key={`${i.row}-${i.email}`}>linha {i.row}: <span className="text-slate-600">{i.email || '(vazio)'}</span> — {i.reason}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Aba 3: Manual / colar lista
// -----------------------------------------------------------------------------

function ManualPane({ value, onChange }: RecipientPickerProps) {
  const [text, setText] = useState('');
  const [pending, setPending] = useState<ParseResult | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!text.trim()) {
      setPending(null);
      return;
    }
    setPending(parseManualText(text));
  }, [text]);

  const apply = () => {
    if (!pending) return;
    const inputs = toRecipientInputs(pending.rows, 'MANUAL');
    onChange(mergeRecipients(value, inputs));
    toast({
      title: 'Lista incluída',
      description: `${inputs.length} destinatário(s) adicionado(s).`,
    });
    setText('');
    setPending(null);
  };

  return (
    <div className="space-y-3">
      <Textarea
        rows={6}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={`Cole um e-mail por linha, ou use:\nFulano <fulano@empresa.com>\nciclano@empresa.com, Ciclano, Empresa SA`}
      />
      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>
          {pending ? `${pending.rows.length} válido(s) · ${pending.invalid.length} ignorado(s)` : 'Aguardando colagem…'}
        </span>
        <Button
          type="button"
          onClick={apply}
          disabled={!pending || pending.rows.length === 0}
          className="bg-seguranca-yellow text-seguranca-black hover:bg-seguranca-yellow/90"
        >
          Adicionar à campanha
        </Button>
      </div>
      <p className="text-xs text-slate-500 flex items-start gap-1">
        <AlertTriangle className="w-3 h-3 mt-0.5 text-amber-500" /> Para esses contatos, um Lead será
        criado automaticamente no CRM assim que houver abertura, clique ou resposta.
      </p>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Helper compartilhado
// -----------------------------------------------------------------------------

function mergeRecipients(
  existing: EmailCampaignRecipientInput[],
  incoming: EmailCampaignRecipientInput[],
): EmailCampaignRecipientInput[] {
  const map = new Map<string, EmailCampaignRecipientInput>();
  for (const r of existing) map.set(r.email.toLowerCase(), r);
  for (const r of incoming) {
    const key = r.email.toLowerCase();
    if (!map.has(key)) map.set(key, r);
  }
  return Array.from(map.values());
}
