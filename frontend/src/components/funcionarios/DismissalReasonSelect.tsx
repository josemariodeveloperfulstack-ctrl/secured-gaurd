import { cn } from '@/lib/utils';

/** Motivos padrão — lista única para cadastro/edição (sem popper dentro de modal). */
export const DISMISSAL_REASON_OPTIONS = [
  'Dispensa sem Justa Causa',
  'Dispensa por Justa Causa',
  'Pedido de Demissão',
  'Rescisão por Comum Acordo (Reforma Trabalhista)',
  'Término de Contrato de Experiência (Prazo Determinado)',
  'Rescisão Antecipada do Contrato de Experiência',
  'Rescisão Indireta',
  'Falecimento',
  'Aposentadoria',
  'Performance Insuficiente',
  'Corte de Custo',
  'Saúde / Motivos Médicos',
  'Mudança de Cidade/País',
  'Conflitos Internos / Liderança',
  'Falta de Fit Cultural',
  'Transição de Carreira',
] as const;

type Props = {
  value: string;
  onValueChange: (value: string) => void;
  id?: string;
  className?: string;
};

/**
 * Select nativo: Radix Select + popper dentro de Dialog com scroll costuma posicionar
 * o menu no lugar errado (texto sobre outros campos). O select HTML nativo não tem esse problema.
 */
export function DismissalReasonSelect({ value, onValueChange, id, className }: Readonly<Props>) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      className={cn(
        'flex w-full min-h-10 sm:min-h-11 rounded-md border border-gray-600 bg-seguranca-graphite px-3 py-2 text-sm sm:text-base text-seguranca-lightgray',
        'focus:outline-none focus:ring-2 focus:ring-seguranca-yellow/40 focus:border-seguranca-yellow',
        '[color-scheme:dark] cursor-pointer appearance-auto',
        className
      )}
    >
      <option value="">Selecione o motivo</option>
      {DISMISSAL_REASON_OPTIONS.map((reason) => (
        <option key={reason} value={reason}>
          {reason}
        </option>
      ))}
    </select>
  );
}
