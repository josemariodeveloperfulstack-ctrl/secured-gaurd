/**
 * Utilitários de escala de trabalho (ex.: 12x36) para folha de ponto e lançamento manual.
 */

/** Normaliza texto de escala para comparação. */
function normalizeScaleText(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '');
}

/** Detecta escala 12x36 a partir de escala_trabalho ou dias_trabalho do cadastro. */
export function isEscala12x36(
  escalaTrabalho?: string | null,
  diasTrabalho?: string | null,
): boolean {
  const check = (raw: string | null | undefined) => {
    const n = normalizeScaleText(raw);
    if (!n) return false;
    return (
      n.includes('12x36') ||
      n.includes('12/36') ||
      n.includes('12-36') ||
      n === '12x36h' ||
      /^12\s*x\s*36/.test(n)
    );
  };
  return check(escalaTrabalho) || check(diasTrabalho);
}

/** Início do dia em horário local. */
function startOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/**
 * Dia de trabalho na escala 12x36 (um dia sim, um não), usando a data de admissão como âncora.
 * Dias pares desde a admissão = trabalho; ímpares = folga.
 */
export function isWorkDayIn12x36(date: Date, hireDate: Date): boolean {
  const d = startOfLocalDay(date).getTime();
  const h = startOfLocalDay(hireDate).getTime();
  const diffDays = Math.round((d - h) / (24 * 60 * 60 * 1000));
  return diffDays % 2 === 0;
}

export function parseHireDate(hireDate?: string | null): Date | null {
  if (!hireDate) return null;
  const parsed = new Date(hireDate.includes('T') ? hireDate : `${hireDate}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatEscalaResumo(info: {
  escalaTrabalho?: string | null;
  horarioTrabalho?: string | null;
  diasTrabalho?: string | null;
}): string {
  const parts: string[] = [];
  if (info.escalaTrabalho?.trim()) parts.push(info.escalaTrabalho.trim());
  if (info.diasTrabalho?.trim() && info.diasTrabalho.trim() !== info.escalaTrabalho?.trim()) {
    parts.push(info.diasTrabalho.trim());
  }
  if (info.horarioTrabalho?.trim()) parts.push(`Horário: ${info.horarioTrabalho.trim()}`);
  return parts.length > 0 ? parts.join(' · ') : 'Não informada no cadastro';
}
