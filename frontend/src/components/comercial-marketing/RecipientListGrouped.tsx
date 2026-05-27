import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, MapPin, Search, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { EmailCampaignRecipientInput } from '@/services/emailCampaignService';
import { cn } from '@/lib/utils';
import {
  countRecipientsWithGeo,
  getRecipientCityLabel,
  getRecipientMetaValue,
  groupRecipientsByCity,
} from './utils/recipientMetadata';

const CITIES_PER_PAGE = 50;

export interface RecipientListGroupedProps {
  recipients: EmailCampaignRecipientInput[];
  onRemove: (email: string) => void;
  dark?: boolean;
}

export function RecipientListGrouped({ recipients, onRemove, dark }: RecipientListGroupedProps) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [emailFilter, setEmailFilter] = useState('');

  const groups = useMemo(() => groupRecipientsByCity(recipients), [recipients]);
  const withGeo = useMemo(() => countRecipientsWithGeo(recipients), [recipients]);

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((g) => ({
        ...g,
        items: g.items.filter((r) => {
          const city = getRecipientCityLabel(r.metadata).toLowerCase();
          const state = getRecipientMetaValue(r.metadata, 'state').toLowerCase();
          const email = r.email.toLowerCase();
          const name = (r.name ?? '').toLowerCase();
          const company = String(r.metadata?.company ?? '').toLowerCase();
          return (
            g.label.toLowerCase().includes(q) ||
            city.includes(q) ||
            state.includes(q) ||
            email.includes(q) ||
            name.includes(q) ||
            company.includes(q)
          );
        }),
      }))
      .filter((g) => g.items.length > 0);
  }, [groups, search]);

  const totalPages = Math.max(1, Math.ceil(filteredGroups.length / CITIES_PER_PAGE));

  useEffect(() => {
    setPage(0);
  }, [search]);

  useEffect(() => {
    if (page >= totalPages) setPage(Math.max(0, totalPages - 1));
  }, [page, totalPages]);

  const pageGroups = useMemo(() => {
    const start = page * CITIES_PER_PAGE;
    return filteredGroups.slice(start, start + CITIES_PER_PAGE);
  }, [filteredGroups, page]);

  useEffect(() => {
    if (filteredGroups.length === 0) {
      setSelectedCity(null);
      return;
    }
    const stillExists = selectedCity && filteredGroups.some((g) => g.label === selectedCity);
    if (!stillExists) {
      setSelectedCity(filteredGroups[0].label);
    }
  }, [filteredGroups, selectedCity]);

  const selectedGroup = useMemo(
    () => filteredGroups.find((g) => g.label === selectedCity) ?? null,
    [filteredGroups, selectedCity],
  );

  const displayedEmails = useMemo(() => {
    if (!selectedGroup) return [];
    const q = emailFilter.trim().toLowerCase();
    if (!q) return selectedGroup.items;
    return selectedGroup.items.filter((r) => {
      const email = r.email.toLowerCase();
      const name = (r.name ?? '').toLowerCase();
      const company = String(r.metadata?.company ?? '').toLowerCase();
      return email.includes(q) || name.includes(q) || company.includes(q);
    });
  }, [selectedGroup, emailFilter]);

  if (recipients.length === 0) return null;

  const fieldClass = dark ? 'border-white/10 bg-seguranca-graphite/50 text-slate-100' : '';
  const panelClass = dark ? 'border-white/10 bg-seguranca-black/30' : 'border-slate-200 bg-white';
  const headClass = dark ? 'text-slate-400' : 'text-slate-600';

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar cidade, bairro ou e-mail…"
            className={cn('pl-9 h-9', fieldClass)}
          />
        </div>
      </div>

      <p className={cn('text-xs', headClass)}>
        <MapPin className="inline h-3.5 w-3.5 mr-1 text-seguranca-yellow" />
        {groups.length} cidade(s)/bairro(s) · {withGeo.toLocaleString('pt-BR')} de{' '}
        {recipients.length.toLocaleString('pt-BR')} com localização
        {withGeo < recipients.length && (
          <span className="text-amber-500/90">
            {' '}
            · {(recipients.length - withGeo).toLocaleString('pt-BR')} em &quot;Sem cidade / bairro&quot;
          </span>
        )}
      </p>

      {filteredGroups.length === 0 ? (
        <p className="p-6 text-center text-sm text-slate-500 rounded-md border border-white/10">
          Nenhum destinatário corresponde ao filtro.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(220px,32%)_1fr] min-h-[min(520px,65vh)]">
          {/* Painel: lista de cidades */}
          <div className={cn('rounded-lg border flex flex-col min-h-[320px]', panelClass)}>
            <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
              <span className="text-xs font-medium text-slate-300">Cidades</span>
              <span className="text-[10px] text-slate-500 tabular-nums">
                {filteredGroups.length.toLocaleString('pt-BR')} total
              </span>
            </div>
            <ScrollArea className="flex-1 max-h-[min(460px,58vh)]">
              <ul className="p-1">
                {pageGroups.map((group) => {
                  const isActive = selectedCity === group.label;
                  const stateSample = getRecipientMetaValue(group.items[0]?.metadata, 'state');
                  return (
                    <li key={group.label}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCity(group.label);
                          setEmailFilter('');
                        }}
                        className={cn(
                          'w-full flex items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors',
                          isActive
                            ? 'bg-seguranca-yellow/15 text-seguranca-yellow'
                            : 'text-slate-200 hover:bg-white/5',
                        )}
                      >
                        <span className="flex-1 truncate font-medium">{group.label}</span>
                        {stateSample && (
                          <span className="text-[10px] text-slate-500 shrink-0">{stateSample}</span>
                        )}
                        <Badge
                          variant="outline"
                          className={cn(
                            'shrink-0 tabular-nums text-[10px]',
                            isActive
                              ? 'border-seguranca-yellow/40 text-seguranca-yellow'
                              : 'border-white/15',
                          )}
                        >
                          {group.items.length}
                        </Badge>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </ScrollArea>
            {totalPages > 1 && (
              <div className="flex items-center justify-between gap-2 border-t border-white/10 px-2 py-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={page <= 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  aria-label="Página anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-[11px] text-slate-500 tabular-nums">
                  {page + 1} / {totalPages}
                  <span className="hidden sm:inline">
                    {' '}
                    ({page * CITIES_PER_PAGE + 1}–
                    {Math.min((page + 1) * CITIES_PER_PAGE, filteredGroups.length)})
                  </span>
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  aria-label="Próxima página"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Painel: e-mails da cidade selecionada */}
          <div className={cn('rounded-lg border flex flex-col min-h-[320px]', panelClass)}>
            {selectedGroup ? (
              <>
                <div className="border-b border-white/10 px-3 py-2 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-100">{selectedGroup.label}</p>
                      <p className="text-xs text-slate-500">
                        {selectedGroup.items.length.toLocaleString('pt-BR')} e-mail(s)
                      </p>
                    </div>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-500" />
                    <Input
                      value={emailFilter}
                      onChange={(e) => setEmailFilter(e.target.value)}
                      placeholder="Filtrar e-mails nesta cidade…"
                      className={cn('pl-8 h-8 text-xs', fieldClass)}
                    />
                  </div>
                </div>
                <ScrollArea className="flex-1 max-h-[min(420px,55vh)]">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 z-10 bg-seguranca-graphite/95 backdrop-blur">
                      <tr className="text-left text-slate-500 border-b border-white/10">
                        <th className="px-3 py-2 font-medium w-[45%]">E-mail</th>
                        <th className="px-3 py-2 font-medium w-[25%]">Nome</th>
                        <th className="px-3 py-2 font-medium hidden sm:table-cell">Empresa</th>
                        <th className="px-3 py-2 w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      {displayedEmails.map((r) => (
                        <tr
                          key={r.email}
                          className="border-b border-white/5 hover:bg-white/[0.03] text-slate-200"
                        >
                          <td className="px-3 py-1.5 font-mono text-[11px] break-all">{r.email}</td>
                          <td className="px-3 py-1.5 text-slate-400 truncate max-w-[140px]">
                            {r.name || '—'}
                          </td>
                          <td className="px-3 py-1.5 text-slate-500 truncate max-w-[160px] hidden sm:table-cell">
                            {String(r.metadata?.company ?? '—')}
                          </td>
                          <td className="px-2 py-1.5">
                            <button
                              type="button"
                              className="text-slate-500 hover:text-rose-400"
                              onClick={() => onRemove(r.email)}
                              aria-label="Remover"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {displayedEmails.length === 0 && (
                    <p className="p-4 text-center text-slate-500">Nenhum e-mail corresponde ao filtro.</p>
                  )}
                </ScrollArea>
                <p className="border-t border-white/10 px-3 py-1.5 text-[10px] text-slate-500">
                  Mostrando {displayedEmails.length.toLocaleString('pt-BR')} de{' '}
                  {selectedGroup.items.length.toLocaleString('pt-BR')} nesta cidade
                </p>
              </>
            ) : (
              <p className="p-8 text-center text-sm text-slate-500">Selecione uma cidade à esquerda.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
