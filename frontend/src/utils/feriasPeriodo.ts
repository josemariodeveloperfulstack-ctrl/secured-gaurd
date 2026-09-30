export type PeriodoAquisitivoStatus = 'SEM_ADMISSAO' | 'SEM_PERIODO' | 'DISPONIVEL' | 'VENCENDO';

export interface FeriasHistorico {
  dataInicio?: string;
  dataFim?: string;
  periodoAquisitivo?: string;
  status?: string;
  diasGozo?: number;
}

export interface PeriodoAquisitivoInfo {
  status: PeriodoAquisitivoStatus;
  /** Se o colaborador tem menos de 12 meses de admissão (impeditivo para férias individuais) */
  menosDe12Meses?: boolean;
  /** Período aquisitivo sugerido, ex: "2024/2025" ou "01/02/2024 a 31/01/2025" */
  periodo?: string;
  /** Janela aquisitiva vigente */
  inicio?: string;
  fim?: string;
  /** Limite do período concessivo (Art. 134 CLT: 12 meses após o término do período aquisitivo) */
  limiteConcessivo?: string;
  /** Data em que o período aquisitivo fica disponível (admissão + 12 meses) */
  disponivelEm?: string;
  diasParaDisponibilizar?: number;
  diasParaVencer?: number;
  /** Indica se o colaborador já tirou férias na empresa */
  jaTirouFerias?: boolean;
  /** Quantidade de férias já registradas / gozadas */
  totalFeriasGozadas?: number;
  /** Data de início da última concessão de férias */
  ultimaFeriasData?: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const DIAS_ALERTA_VENCIMENTO = 90;
const STATUS_INVALIDOS = ['CANCELADO', 'CANCELLED', 'REJEITADO', 'REJECTED'];

/** Converte 'YYYY-MM-DD' (ou ISO completo) para Date local à meia-noite. */
export function parseDateOnly(value?: string | null): Date | null {
  if (!value) return null;
  const [datePart] = String(value).split('T');
  const [y, m, d] = datePart.split('-').map(Number);
  if (!y || !m || !d) {
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  return new Date(y, m - 1, d);
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date.getTime());
  result.setMonth(result.getMonth() + months);
  return result;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setDate(result.getDate() + days);
  return result;
}

function toISODate(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

export function formatBr(value?: string | null): string {
  const date = typeof value === 'string' ? parseDateOnly(value) : (value as Date | null);
  if (!date) return '-';
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${d}/${m}/${date.getFullYear()}`;
}

function diffDays(from: Date, to: Date): number {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime();
  return Math.max(0, Math.round((b - a) / DAY_MS));
}

function rotuloPeriodo(inicio: Date, fim: Date): string {
  return `${inicio.getFullYear()}/${fim.getFullYear()}`;
}

/**
 * Calcula a data de término das férias com base na data de início e total de dias.
 * Data Fim = dataInicio + dias - 1 dia.
 */
export function calcularDataFimFerias(dataInicioStr: string, totalDias: number): string {
  if (!dataInicioStr || !totalDias || totalDias <= 0) return '';
  const inicio = parseDateOnly(dataInicioStr);
  if (!inicio) return '';
  const fim = addDays(inicio, totalDias - 1);
  return toISODate(fim);
}

/**
 * Calcula o período aquisitivo de férias a partir da data de admissão
 * e do histórico das últimas férias do funcionário (Art. 130 e 134 da CLT).
 * Se o colaborador já tirou férias na empresa, o cálculo do próximo período
 * aquisitivo avança sequencialmente a partir do último período gozado.
 */
export function calcularPeriodoAquisitivo(
  hireDate?: string | null,
  ferias: FeriasHistorico[] = [],
  ref: Date = new Date()
): PeriodoAquisitivoInfo {
  const admissao = parseDateOnly(hireDate);
  if (!admissao) {
    return { status: 'SEM_ADMISSAO' };
  }

  const hoje = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const primeiroFim = addMonths(admissao, 12);

  // Filtrar histórico de férias válidas (desconsiderando canceladas e rejeitadas)
  const feriasValidas = ferias.filter((f) => {
    const st = String(f.status || '').toUpperCase();
    return f?.dataInicio && !STATUS_INVALIDOS.includes(st);
  });

  const jaTirouFerias = feriasValidas.length > 0;

  // Ordenar férias pela data de início mais recente
  const feriasOrdenadas = [...feriasValidas].sort((a, b) => {
    const da = parseDateOnly(a.dataInicio!)?.getTime() || 0;
    const db = parseDateOnly(b.dataInicio!)?.getTime() || 0;
    return db - da;
  });

  const ultimaFerias = feriasOrdenadas[0];
  const ultimaFeriasData = ultimaFerias ? ultimaFerias.dataInicio : undefined;

  // REGRA CLT: Colaborador com menos de 12 meses de admissão não pode agendar férias individuais
  if (hoje < primeiroFim) {
    return {
      status: 'SEM_PERIODO',
      menosDe12Meses: true,
      periodo: rotuloPeriodo(admissao, primeiroFim),
      inicio: toISODate(admissao),
      fim: toISODate(primeiroFim),
      disponivelEm: toISODate(primeiroFim),
      diasParaDisponibilizar: diffDays(hoje, primeiroFim),
      jaTirouFerias: false,
      totalFeriasGozadas: 0
    };
  }

  // Se o funcionário já tirou férias, calcular a partir da quantidade de períodos já quitados
  // Cada ciclo aquisitivo tem 12 meses.
  let inicioPA = admissao;
  let fimPA = primeiroFim;

  if (jaTirouFerias) {
    // Para cada período aquisitivo coberto pelas férias já tiradas, avançamos 12 meses
    const ciclosQuitados = Math.max(1, feriasValidas.length);
    for (let i = 0; i < ciclosQuitados; i++) {
      inicioPA = fimPA;
      fimPA = addMonths(inicioPA, 12);
    }

    // Se mesmo após avançar os ciclos quitados o fim do PA for menor que hoje, ajusta para o PA em curso
    while (fimPA <= hoje) {
      inicioPA = addMonths(inicioPA, 12);
      fimPA = addMonths(inicioPA, 12);
    }
  } else {
    // Se nunca tirou férias, busca o primeiro período aquisitivo adquirido e ainda não quitado
    while (fimPA <= hoje && addMonths(fimPA, 12) <= hoje) {
      inicioPA = addMonths(inicioPA, 12);
      fimPA = addMonths(inicioPA, 12);
    }
  }

  // Limite concessivo da CLT: 12 meses subsequentes ao término do período aquisitivo (Art. 134)
  const limiteConcessivo = addMonths(fimPA, 12);
  const diasParaVencer = diffDays(hoje, limiteConcessivo);

  return {
    status: diasParaVencer <= DIAS_ALERTA_VENCIMENTO ? 'VENCENDO' : 'DISPONIVEL',
    menosDe12Meses: false,
    periodo: rotuloPeriodo(inicioPA, fimPA),
    inicio: toISODate(inicioPA),
    fim: toISODate(fimPA),
    limiteConcessivo: toISODate(limiteConcessivo),
    disponivelEm: toISODate(inicioPA),
    diasParaVencer,
    jaTirouFerias,
    totalFeriasGozadas: feriasValidas.length,
    ultimaFeriasData
  };
}
