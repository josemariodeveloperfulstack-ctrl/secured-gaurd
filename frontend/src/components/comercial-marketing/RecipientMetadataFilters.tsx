import { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { EmailCampaignRecipientInput } from '@/services/emailCampaignService';
import { cn } from '@/lib/utils';
import {
  ALL_META,
  collectDistinctMetaValues,
  filterRecipientsByMeta,
  hasGeoMetaFilters,
  type RecipientMetaFilterState,
} from './utils/recipientMetadata';

export type { RecipientMetaFilterState };
export { ALL_META };

export interface RecipientMetadataFiltersProps {
  recipients: EmailCampaignRecipientInput[];
  filters: RecipientMetaFilterState;
  onFiltersChange: (next: RecipientMetaFilterState) => void;
  dark?: boolean;
}

export function RecipientMetadataFilters({
  recipients,
  filters,
  onFiltersChange,
  dark,
}: RecipientMetadataFiltersProps) {
  const cities = useMemo(() => collectDistinctMetaValues(recipients, 'city'), [recipients]);
  const states = useMemo(() => collectDistinctMetaValues(recipients, 'state'), [recipients]);
  const companyTypes = useMemo(() => collectDistinctMetaValues(recipients, 'companyType'), [recipients]);

  const filteredCount = useMemo(
    () => filterRecipientsByMeta(recipients, filters).length,
    [recipients, filters],
  );

  if (!hasGeoMetaFilters(recipients)) {
    return null;
  }

  const fieldClass = dark
    ? 'border-white/10 bg-seguranca-graphite/50 text-slate-100'
    : '';
  const labelClass = dark ? 'text-slate-400' : 'text-slate-600';

  return (
    <div
      className={cn(
        'space-y-3 rounded-lg border p-4',
        dark ? 'border-white/10 bg-seguranca-black/25' : 'border-slate-200 bg-slate-50',
      )}
    >
      <div>
        <p className={cn('text-sm font-medium', dark ? 'text-slate-100' : 'text-slate-800')}>
          Filtrar destinatários
        </p>
        <p className={cn('mt-1 text-xs', labelClass)}>
          Use cidade, estado e tipo de empresa mapeados na planilha. Exibindo {filteredCount} de{' '}
          {recipients.length} contato(s).
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {cities.length > 0 && (
          <div className="space-y-1.5">
            <Label className={labelClass}>Cidade</Label>
            <Select
              value={filters.city}
              onValueChange={(v) => onFiltersChange({ ...filters, city: v })}
            >
              <SelectTrigger className={fieldClass}>
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_META}>Todas as cidades</SelectItem>
                {cities.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {states.length > 0 && (
          <div className="space-y-1.5">
            <Label className={labelClass}>Estado</Label>
            <Select
              value={filters.state}
              onValueChange={(v) => onFiltersChange({ ...filters, state: v })}
            >
              <SelectTrigger className={fieldClass}>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_META}>Todos os estados</SelectItem>
                {states.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {companyTypes.length > 0 && (
          <div className="space-y-1.5">
            <Label className={labelClass}>Tipo de empresa</Label>
            <Select
              value={filters.companyType}
              onValueChange={(v) => onFiltersChange({ ...filters, companyType: v })}
            >
              <SelectTrigger className={fieldClass}>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_META}>Todos os tipos</SelectItem>
                {companyTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
}
