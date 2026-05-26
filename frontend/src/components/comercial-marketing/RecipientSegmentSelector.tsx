import { useMemo } from 'react';
import { Plus, Trash2, MapPin } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { EmailCampaignRecipientInput } from '@/services/emailCampaignService';
import { cn } from '@/lib/utils';
import {
  ALL_META,
  collectDistinctMetaValues,
  countMatchingRecipients,
  createEmptySegmentRule,
  hasGeoMetaFilters,
  summarizeSegmentSelection,
  type RecipientSegmentRule,
} from './utils/recipientMetadata';

export interface RecipientSegmentSelectorProps {
  recipients: EmailCampaignRecipientInput[];
  rules: RecipientSegmentRule[];
  onRulesChange: (next: RecipientSegmentRule[]) => void;
  dark?: boolean;
}

function ruleLabel(rule: RecipientSegmentRule): string {
  const parts: string[] = [];
  if (rule.state !== ALL_META) parts.push(rule.state);
  if (rule.city !== ALL_META) parts.push(rule.city);
  if (rule.companyType !== ALL_META) parts.push(rule.companyType);
  return parts.length > 0 ? parts.join(' · ') : 'Todos os contatos';
}

export function RecipientSegmentSelector({
  recipients,
  rules,
  onRulesChange,
  dark,
}: RecipientSegmentSelectorProps) {
  const cities = useMemo(() => collectDistinctMetaValues(recipients, 'city'), [recipients]);
  const states = useMemo(() => collectDistinctMetaValues(recipients, 'state'), [recipients]);
  const companyTypes = useMemo(() => collectDistinctMetaValues(recipients, 'companyType'), [recipients]);

  const summary = useMemo(
    () => summarizeSegmentSelection(recipients, rules),
    [recipients, rules],
  );

  if (!hasGeoMetaFilters(recipients)) {
    return (
      <div
        className={cn(
          'rounded-lg border p-4 text-sm',
          dark ? 'border-amber-500/30 bg-amber-500/10 text-amber-200' : 'border-amber-200 bg-amber-50 text-amber-900',
        )}
      >
        Para segmentar por cidade, estado ou tipo de empresa, mapeie essas colunas ao importar a planilha
        (aba Importar planilha → Mapear colunas).
      </div>
    );
  }

  const fieldClass = cn(
    'h-9',
    dark && 'border-white/10 bg-seguranca-graphite/50 text-slate-100',
  );
  const labelClass = dark ? 'text-slate-400' : 'text-slate-600';
  const headClass = dark ? 'text-slate-500' : 'text-slate-500';

  const updateRule = (id: string, patch: Partial<RecipientSegmentRule>) => {
    onRulesChange(rules.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const removeRule = (id: string) => {
    onRulesChange(rules.filter((r) => r.id !== id));
  };

  return (
    <div
      className={cn(
        'space-y-4 rounded-lg border p-4',
        dark ? 'border-white/10 bg-seguranca-black/25' : 'border-slate-200 bg-slate-50',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className={cn('text-sm font-medium flex items-center gap-2', dark ? 'text-slate-100' : 'text-slate-800')}>
            <MapPin className="h-4 w-4 text-seguranca-yellow" />
            Segmentar envio por região
          </p>
          <p className={cn('mt-1 text-xs', labelClass)}>
            Adicione um ou mais lotes: escolha estado, cidade e tipo de empresa e defina quantos e-mails
            enviar de cada grupo. A campanha usará apenas os contatos selecionados abaixo.
          </p>
        </div>
        <Badge
          className={cn(
            'shrink-0',
            dark ? 'bg-seguranca-yellow/20 text-seguranca-yellow border-seguranca-yellow/40' : '',
          )}
          variant="outline"
        >
          {summary.selected.length} de {summary.totalImported} selecionados
        </Badge>
      </div>

      {rules.length === 0 && (
        <p className={cn('text-xs rounded-md px-3 py-2', dark ? 'bg-seguranca-graphite/40 text-slate-400' : 'bg-white text-slate-600')}>
          Sem lotes definidos: todos os {recipients.length} contatos importados serão considerados.
          Clique em <strong>Adicionar lote</strong> para limitar por cidade, estado ou tipo.
        </p>
      )}

      {rules.length > 0 && (
      <div className="space-y-2">
        <div
          className={cn(
            'hidden sm:grid sm:grid-cols-[1fr_1fr_1fr_100px_72px_40px] gap-2 px-1 text-[10px] font-medium uppercase tracking-wide',
            headClass,
          )}
        >
          <span>Estado</span>
          <span>Cidade</span>
          <span>Tipo de empresa</span>
          <span>Qtd máx.</span>
          <span className="text-center">Disp.</span>
          <span />
        </div>

        {rules.map((rule) => {
          const available = countMatchingRecipients(recipients, {
            state: rule.state,
            city: rule.city,
            companyType: rule.companyType,
          });
          const rowSummary = summary.perRule.find((p) => p.ruleId === rule.id);

          return (
            <div
              key={rule.id}
              className={cn(
                'grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_1fr_100px_72px_40px] sm:items-end rounded-md p-2',
                dark ? 'bg-seguranca-graphite/30' : 'bg-white',
              )}
            >
              <div className="space-y-1 sm:col-span-1">
                <Label className={cn('text-xs sm:hidden', labelClass)}>Estado</Label>
                <Select
                  value={rule.state}
                  onValueChange={(v) => updateRule(rule.id, { state: v })}
                >
                  <SelectTrigger className={fieldClass}>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_META}>Todos</SelectItem>
                    {states.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className={cn('text-xs sm:hidden', labelClass)}>Cidade</Label>
                <Select
                  value={rule.city}
                  onValueChange={(v) => updateRule(rule.id, { city: v })}
                >
                  <SelectTrigger className={fieldClass}>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_META}>Todas</SelectItem>
                    {cities.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className={cn('text-xs sm:hidden', labelClass)}>Tipo de empresa</Label>
                <Select
                  value={rule.companyType}
                  onValueChange={(v) => updateRule(rule.id, { companyType: v })}
                >
                  <SelectTrigger className={fieldClass}>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_META}>Todos</SelectItem>
                    {companyTypes.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className={cn('text-xs sm:hidden', labelClass)}>Quantidade</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="Todos"
                  className={fieldClass}
                  value={rule.maxQuantity > 0 ? rule.maxQuantity : ''}
                  onChange={(e) => {
                    const raw = e.target.value.trim();
                    const n = raw === '' ? 0 : Math.max(0, Number.parseInt(raw, 10) || 0);
                    updateRule(rule.id, { maxQuantity: n });
                  }}
                />
              </div>

              <div className="flex flex-col items-center justify-center gap-0.5 sm:pb-1">
                <span className={cn('text-[10px]', labelClass)}>Disp.</span>
                <span className={cn('text-sm font-semibold tabular-nums', dark ? 'text-slate-200' : 'text-slate-800')}>
                  {available}
                </span>
                {rowSummary && rules.length > 0 && (
                  <span className={cn('text-[10px]', labelClass)}>→ {rowSummary.taken}</span>
                )}
              </div>

              <div className="flex sm:items-center sm:justify-center sm:pb-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                  onClick={() => {
                    if (rules.length <= 1) {
                      onRulesChange([]);
                    } else {
                      removeRule(rule.id);
                    }
                  }}
                  title="Remover lote"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={dark ? 'border-white/20 text-slate-200' : ''}
          onClick={() =>
            onRulesChange(rules.length === 0 ? [createEmptySegmentRule()] : [...rules, createEmptySegmentRule()])
          }
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Adicionar lote
        </Button>
        {rules.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={dark ? 'text-slate-400' : ''}
            onClick={() => onRulesChange([])}
          >
            Usar lista completa ({recipients.length})
          </Button>
        )}
      </div>

      {rules.length > 0 && (
        <div className={cn('text-xs space-y-1 pt-1 border-t', dark ? 'border-white/10 text-slate-500' : 'border-slate-200 text-slate-600')}>
          <p className="font-medium text-slate-400">Resumo dos lotes:</p>
          <ul className="list-disc list-inside space-y-0.5">
            {rules.map((rule) => {
              const info = summary.perRule.find((p) => p.ruleId === rule.id);
              const taken = info?.taken ?? 0;
              const matched = info?.matched ?? 0;
              const qtyLabel =
                rule.maxQuantity > 0 ? `até ${rule.maxQuantity}` : 'todos';
              return (
                <li key={rule.id}>
                  {ruleLabel(rule)} — {qtyLabel} ({taken} de {matched} disponíveis)
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
