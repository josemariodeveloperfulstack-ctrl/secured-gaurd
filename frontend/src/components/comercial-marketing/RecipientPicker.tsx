import { useEffect, useMemo, useRef, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Search, Upload, UserPlus, FileSpreadsheet, AlertTriangle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import leadService, { type Lead } from '@/services/leadService';
import type { EmailCampaignRecipientInput } from '@/services/emailCampaignService';
import { cn } from '@/lib/utils';
import {
  parseManualText,
  parseRecipientFile,
  parseRecipientFileWithMapping,
  previewSpreadsheetHeaders,
  buildDefaultSpreadsheetMapping,
  toRecipientInputs,
  type ParseResult,
  type SpreadsheetColumnMapping,
} from './utils/recipientParser';

type Mode = 'leads' | 'import' | 'manual';

/** Extrai cidade/UF gravadas na importação de marketing (campo notes do CRM). */
function parseLeadNotesMeta(notes?: string): { city?: string; state?: string; companyType?: string } {
  if (!notes?.trim()) return {};
  const city = notes.match(/Cidade:\s*([^|]+)/i)?.[1]?.trim();
  const state = notes.match(/UF:\s*([^|]+)/i)?.[1]?.trim();
  const companyType = notes.match(/Tipo empresa:\s*([^|]+)/i)?.[1]?.trim();
  return { city, state, companyType };
}

export interface RecipientPickerProps {
  value: EmailCampaignRecipientInput[];
  onChange: (recipients: EmailCampaignRecipientInput[]) => void;
  /** Tema escuro (ex.: aba Marketing). */
  darkTabs?: boolean;
  /** Após escolher ficheiro, mostra passo de mapeamento coluna → campo. */
  columnMappingImport?: boolean;
  /** Filtros extra no CRM: origem + segmento (texto em empresa/descrição/notas). */
  advancedLeadFilters?: boolean;
}

export function RecipientPicker({
  value,
  onChange,
  darkTabs,
  columnMappingImport,
  advancedLeadFilters,
}: RecipientPickerProps) {
  const [mode, setMode] = useState<Mode>('leads');
  return (
    <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)} className="w-full">
      <TabsList
        className={cn(
          'grid w-full grid-cols-3',
          darkTabs ? 'border border-white/10 bg-seguranca-graphite/60' : 'bg-slate-100',
        )}
      >
        <TabsTrigger
          value="leads"
          className="data-[state=active]:bg-seguranca-yellow data-[state=active]:text-seguranca-black"
        >
          <UserPlus className="mr-2 h-4 w-4" /> Leads do CRM
        </TabsTrigger>
        <TabsTrigger
          value="import"
          className="data-[state=active]:bg-seguranca-yellow data-[state=active]:text-seguranca-black"
        >
          <FileSpreadsheet className="mr-2 h-4 w-4" /> Importar planilha
        </TabsTrigger>
        <TabsTrigger
          value="manual"
          className="data-[state=active]:bg-seguranca-yellow data-[state=active]:text-seguranca-black"
        >
          <Upload className="mr-2 h-4 w-4" /> Colar lista
        </TabsTrigger>
      </TabsList>
      <TabsContent value="leads" className="mt-4">
        <LeadsPickerPane value={value} onChange={onChange} darkTabs={darkTabs} advancedLeadFilters={advancedLeadFilters} />
      </TabsContent>
      <TabsContent value="import" className="mt-4">
        <ImportPane value={value} onChange={onChange} darkTabs={darkTabs} columnMappingImport={columnMappingImport} />
      </TabsContent>
      <TabsContent value="manual" className="mt-4">
        <ManualPane value={value} onChange={onChange} darkTabs={darkTabs} />
      </TabsContent>
    </Tabs>
  );
}

// -----------------------------------------------------------------------------
// Aba 1: Leads do CRM
// -----------------------------------------------------------------------------

type LeadsPaneProps = RecipientPickerProps & { advancedLeadFilters?: boolean };

function LeadsPickerPane({ value, onChange, darkTabs, advancedLeadFilters }: LeadsPaneProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');
  const [companyFilter, setCompanyFilter] = useState('');
  const [segmentFilter, setSegmentFilter] = useState('');

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads', 'all'],
    queryFn: () => leadService.getAllLeads(),
    staleTime: 60_000,
  });

  const fieldClass = darkTabs
    ? 'border-white/10 bg-seguranca-graphite/50 text-slate-100 placeholder:text-slate-500'
    : '';

  const sources = useMemo(() => {
    const s = new Set<string>();
    leads.forEach((l) => {
      if (l.source) s.add(l.source);
    });
    return Array.from(s).sort();
  }, [leads]);

  const selectedIds = useMemo(() => new Set(value.filter((r) => r.leadId).map((r) => r.leadId as string)), [value]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const seg = segmentFilter.trim().toLowerCase();
    return leads.filter((l) => {
      if (!l.email) return false;
      if (statusFilter !== 'ALL' && l.status !== statusFilter) return false;
      if (sourceFilter !== 'ALL' && (l.source || '') !== sourceFilter) return false;
      if (companyFilter && !(l.company || '').toLowerCase().includes(companyFilter.toLowerCase())) return false;
      if (seg) {
        const hay = `${l.company || ''} ${l.description || ''} ${l.notes || ''}`.toLowerCase();
        if (!hay.includes(seg)) return false;
      }
      if (term) {
        const hay = `${l.name || ''} ${l.email || ''} ${l.company || ''} ${l.source || ''}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [leads, search, statusFilter, sourceFilter, companyFilter, segmentFilter]);

  const toggle = (lead: Lead) => {
    if (!lead.email) return;
    const id = String(lead.id);
    const exists = value.some((r) => r.leadId === id || r.email === lead.email.toLowerCase());
    if (exists) {
      onChange(value.filter((r) => r.leadId !== id && r.email !== lead.email.toLowerCase()));
    } else {
      const notesMeta = parseLeadNotesMeta(lead.notes);
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
            segment: lead.source,
            city: notesMeta.city,
            state: notesMeta.state,
            companyType: notesMeta.companyType,
          },
        },
      ]);
    }
  };

  const selectAll = () => {
    const adds = filtered
      .filter((l) => l.email && !selectedIds.has(String(l.id)))
      .map<EmailCampaignRecipientInput>((l) => {
        const notesMeta = parseLeadNotesMeta(l.notes);
        return {
          email: l.email.toLowerCase(),
          name: l.name,
          leadId: String(l.id),
          sourceType: 'LEAD',
          metadata: {
            company: l.company,
            position: l.position,
            phone: l.phone,
            segment: l.source,
            city: notesMeta.city,
            state: notesMeta.state,
            companyType: notesMeta.companyType,
          },
        };
      });
    onChange([...value, ...adds]);
  };

  const metaText = darkTabs ? 'text-slate-400' : 'text-slate-600';
  const scrollBorder = darkTabs ? 'border-white/10 bg-seguranca-black/20' : '';
  const rowHover = darkTabs ? 'hover:bg-white/5' : 'hover:bg-slate-50';
  const subtle = darkTabs ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className="space-y-3">
      <div
        className={cn(
          'grid grid-cols-1 gap-2',
          advancedLeadFilters ? 'md:grid-cols-6' : 'md:grid-cols-4',
        )}
      >
        <div className="relative md:col-span-2">
          <Search className={cn('absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2', darkTabs ? 'text-slate-500' : 'text-slate-400')} />
          <Input
            placeholder="Buscar por nome, e-mail ou empresa…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={cn('pl-9', fieldClass)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className={fieldClass}>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
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
        {advancedLeadFilters && (
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className={fieldClass}>
              <SelectValue placeholder="Origem" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas as origens</SelectItem>
              {sources.map((src) => (
                <SelectItem key={src} value={src}>
                  {src}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Input
          placeholder="Filtrar por empresa"
          value={companyFilter}
          onChange={(e) => setCompanyFilter(e.target.value)}
          className={fieldClass}
        />
        {advancedLeadFilters && (
          <Input
            placeholder="Segmento (empresa, descrição, notas)"
            value={segmentFilter}
            onChange={(e) => setSegmentFilter(e.target.value)}
            className={fieldClass}
          />
        )}
      </div>
      <div className={cn('flex items-center justify-between text-sm', metaText)}>
        <span>
          {filtered.length} lead(s) encontrado(s) · {value.filter((r) => r.sourceType === 'LEAD').length} selecionado(s)
        </span>
        <Button type="button" variant="outline" size="sm" onClick={selectAll} disabled={filtered.length === 0}>
          Selecionar todos visíveis
        </Button>
      </div>
      <ScrollArea className={cn('h-72 rounded-md border', scrollBorder)}>
        {isLoading ? (
          <div className={cn('flex h-72 items-center justify-center', subtle)}>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando leads…
          </div>
        ) : filtered.length === 0 ? (
          <div className={cn('flex h-72 items-center justify-center text-sm', subtle)}>Nenhum lead atende aos filtros.</div>
        ) : (
          <ul className="divide-y divide-white/5">
            {filtered.map((lead) => {
              const checked = value.some((r) => r.leadId === String(lead.id));
              return (
                <li key={lead.id} className={cn('flex items-center gap-3 px-3 py-2', rowHover)}>
                  <Checkbox checked={checked} onCheckedChange={() => toggle(lead)} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{lead.name || '(sem nome)'}</span>
                      <Badge variant="outline" className="text-xs">
                        {lead.status}
                      </Badge>
                      {lead.source ? (
                        <Badge variant="secondary" className="text-xs">
                          {lead.source}
                        </Badge>
                      ) : null}
                    </div>
                    <div className={cn('truncate text-xs', subtle)}>
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

const COL_SKIP = '__none__';
const EMAIL_UNSET = '__unset__';

function mapSelectValue(v: string): string | undefined {
  return v === COL_SKIP ? undefined : v;
}

// -----------------------------------------------------------------------------
// Aba 2: Importar CSV/Excel
// -----------------------------------------------------------------------------

type ImportPaneProps = RecipientPickerProps & { columnMappingImport?: boolean };

function ImportPane({ value, onChange, darkTabs, columnMappingImport }: ImportPaneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [isParsing, setParsing] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'mapping'>('idle');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<SpreadsheetColumnMapping>({ email: '' });
  const { toast } = useToast();

  const fieldClass = darkTabs
    ? 'border-white/10 bg-seguranca-graphite/50 text-slate-100 placeholder:text-slate-500'
    : '';

  const runAutoImport = async (file: File) => {
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

  const openMappingForFile = async (file: File) => {
    setParsing(true);
    try {
      const h = await previewSpreadsheetHeaders(file);
      if (h.length === 0) {
        toast({ title: 'Planilha vazia', description: 'Não encontramos cabeçalhos na primeira folha.', variant: 'destructive' });
        return;
      }
      setPendingFile(file);
      setHeaders(h);
      setMapping(buildDefaultSpreadsheetMapping(h));
      setPhase('mapping');
      setResult(null);
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

  const applyMapping = async () => {
    if (!pendingFile) return;
    setParsing(true);
    try {
      const parsed = await parseRecipientFileWithMapping(pendingFile, mapping);
      setResult(parsed);
      const merged = mergeRecipients(value, toRecipientInputs(parsed.rows, 'IMPORT'));
      onChange(merged);
      toast({
        title: 'Importação com mapeamento',
        description: `${parsed.rows.length} contato(s)${parsed.invalid.length ? `, ${parsed.invalid.length} linha(s) ignoradas` : ''}.`,
      });
      setPhase('idle');
      setPendingFile(null);
    } catch (e) {
      toast({
        title: 'Falha ao aplicar mapeamento',
        description: e instanceof Error ? e.message : 'Erro desconhecido.',
        variant: 'destructive',
      });
    } finally {
      setParsing(false);
    }
  };

  const cancelMapping = () => {
    setPhase('idle');
    setPendingFile(null);
    setHeaders([]);
  };

  const dropClass = darkTabs
    ? 'border-white/20 bg-seguranca-black/20 hover:border-seguranca-yellow'
    : 'border-slate-300 hover:border-seguranca-yellow';
  const titleClass = darkTabs ? 'text-slate-100' : 'text-slate-700';
  const hintClass = darkTabs ? 'text-slate-400' : 'text-slate-500';
  const boxClass = darkTabs ? 'border-white/10 bg-seguranca-graphite/40 text-slate-200' : '';

  return (
    <div className="space-y-3">
      {phase === 'mapping' && pendingFile ? (
        <div className={cn('space-y-4 rounded-lg border p-4', boxClass)}>
          <div>
            <p className={cn('text-sm font-medium', titleClass)}>Mapear colunas — {pendingFile.name}</p>
            <p className={cn('mt-1 text-xs', hintClass)}>
              Escolha qual coluna corresponde a cada variável do template (e-mail é obrigatório).
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {(
              [
                ['email', 'E-mail', true],
                ['name', 'Nome', false],
                ['company', 'Empresa', false],
                ['position', 'Cargo', false],
                ['phone', 'Telefone', false],
                ['city', 'Cidade', false],
                ['state', 'Estado (UF)', false],
                ['companyType', 'Tipo de empresa', false],
                ['segment', 'Segmento / texto', false],
              ] as const
            ).map(([key, label, required]) => (
              <div key={key} className="space-y-1.5">
                <Label className={hintClass}>
                  {label}
                  {required ? ' *' : ''}
                </Label>
                <Select
                  value={
                    required && key === 'email'
                      ? mapping.email || EMAIL_UNSET
                      : ((mapping[key] as string | undefined) ?? COL_SKIP)
                  }
                  onValueChange={(v) =>
                    setMapping((m) => {
                      if (required && key === 'email') {
                        return { ...m, email: v === EMAIL_UNSET ? '' : v };
                      }
                      return { ...m, [key]: mapSelectValue(v) } as SpreadsheetColumnMapping;
                    })
                  }
                >
                  <SelectTrigger className={fieldClass}>
                    <SelectValue placeholder={required ? 'Coluna de e-mail' : 'Ignorar'} />
                  </SelectTrigger>
                  <SelectContent>
                    {required && key === 'email' && (
                      <SelectItem value={EMAIL_UNSET}>Selecione…</SelectItem>
                    )}
                    {!required && <SelectItem value={COL_SKIP}>Ignorar</SelectItem>}
                    {headers.map((h) => (
                      <SelectItem key={`${key}-${h}`} value={h}>
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              className="bg-seguranca-yellow text-seguranca-black hover:bg-seguranca-yellow/90"
              onClick={() => void applyMapping()}
              disabled={isParsing || !mapping.email}
            >
              Aplicar importação
            </Button>
            <Button type="button" variant="outline" onClick={cancelMapping} disabled={isParsing}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={cn('w-full rounded-lg border-2 border-dashed p-8 text-center transition-colors', dropClass)}
        >
          <FileSpreadsheet className={cn('mx-auto mb-2 h-10 w-10', darkTabs ? 'text-slate-500' : 'text-slate-400')} />
          <p className={cn('text-sm font-medium', titleClass)}>Clique para escolher um arquivo .csv, .xlsx ou .xls</p>
          <p className={cn('mt-1 text-xs', hintClass)}>
            {columnMappingImport
              ? 'Primeira linha com cabeçalhos. Depois você mapeia cada coluna para e-mail, nome, empresa, cidade, estado, tipo de empresa, etc.'
              : 'A primeira linha deve conter os cabeçalhos. Detectamos automaticamente: email, nome, empresa, cidade, estado, cargo, telefone.'}
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (!f) return;
              if (columnMappingImport) void openMappingForFile(f);
              else void runAutoImport(f);
            }}
          />
        </button>
      )}
      {isParsing && phase === 'idle' && (
        <div className={cn('flex items-center text-sm', hintClass)}>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processando…
        </div>
      )}
      {result && (
        <div className={cn('space-y-2 rounded-md border p-3 text-sm', boxClass)}>
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{result.rows.length} válidos</Badge>
            {result.invalid.length > 0 && (
              <Badge variant="destructive">
                <AlertTriangle className="mr-1 h-3 w-3" /> {result.invalid.length} ignorados
              </Badge>
            )}
            <span className={cn('text-xs', hintClass)}>
              Colunas: {result.headers.slice(0, 5).join(', ')}
              {result.headers.length > 5 ? '…' : ''}
            </span>
          </div>
          {result.invalid.length > 0 && (
            <details>
              <summary className={cn('cursor-pointer text-xs', hintClass)}>Ver linhas ignoradas</summary>
              <ul className="mt-1 max-h-32 space-y-0.5 overflow-auto text-xs">
                {result.invalid.slice(0, 50).map((i) => (
                  <li key={`${i.row}-${i.email}`}>
                    linha {i.row}: <span className="opacity-80">{i.email || '(vazio)'}</span> — {i.reason}
                  </li>
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

function ManualPane({ value, onChange, darkTabs }: RecipientPickerProps) {
  const [text, setText] = useState('');
  const [pending, setPending] = useState<ParseResult | null>(null);
  const { toast } = useToast();

  const fieldClass = darkTabs
    ? 'border-white/10 bg-seguranca-graphite/50 text-slate-100 placeholder:text-slate-500'
    : '';
  const hintClass = darkTabs ? 'text-slate-400' : 'text-slate-600';

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
        className={fieldClass}
      />
      <div className={cn('flex items-center justify-between text-sm', hintClass)}>
        <span>
          {pending ? `${pending.rows.length} válido(s) · ${pending.invalid.length} ignorado(s)` : 'Aguardando colagem…'}
        </span>
        <Button
          type="button"
          onClick={apply}
          disabled={!pending || pending.rows.length === 0}
          className="bg-seguranca-yellow text-seguranca-black hover:bg-seguranca-yellow/90"
        >
          Adicionar à lista
        </Button>
      </div>
      <p className="flex items-start gap-1 text-xs text-slate-500">
        <AlertTriangle className="mt-0.5 h-3 w-3 text-amber-500" /> Para esses contatos, um Lead será criado
        automaticamente no CRM assim que houver abertura, clique ou resposta.
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
