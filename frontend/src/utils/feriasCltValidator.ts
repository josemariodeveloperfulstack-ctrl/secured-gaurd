/**
 * Utilitário de Feriados Nacionais Brasileiros e Validador do Artigo 134, § 3º da CLT
 * ("É vedado o início das férias no período de dois dias que antecede feriado ou dia de repouso semanal remunerado").
 */

export interface HolidayItem {
  date: string; // YYYY-MM-DD
  name: string;
  type?: 'NATIONAL' | 'STATE' | 'MUNICIPAL';
}

export interface CltValidationResult {
  valid: boolean;
  mensagem?: string;
  motivo?: 'DSR' | 'FERIADO' | 'DATA_PASSADA';
  sugestaoData?: string; // YYYY-MM-DD sugerido
}

/**
 * Algoritmo anônimo gregoriano (Meeus/Jones/Butcher) para cálculo do Domingo de Páscoa
 */
export function calcularPascoa(ano: number): Date {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31); // 3 = Março, 4 = Abril
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(ano, mes - 1, dia);
}

function formatarIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dia}`;
}

function somarDias(d: Date, dias: number): Date {
  const res = new Date(d.getTime());
  res.setDate(res.getDate() + dias);
  return res;
}

/**
 * Retorna a lista completa de feriados nacionais brasileiros (fixos e móveis) para o ano.
 */
export function getFeriadosNacionais(ano: number): HolidayItem[] {
  const feriados: HolidayItem[] = [
    { date: `${ano}-01-01`, name: 'Confraternização Universal (Ano Novo)', type: 'NATIONAL' },
    { date: `${ano}-04-21`, name: 'Tiradentes', type: 'NATIONAL' },
    { date: `${ano}-05-01`, name: 'Dia do Trabalhador', type: 'NATIONAL' },
    { date: `${ano}-09-07`, name: 'Independência do Brasil', type: 'NATIONAL' },
    { date: `${ano}-10-12`, name: 'Nossa Senhora Aparecida', type: 'NATIONAL' },
    { date: `${ano}-11-02`, name: 'Finados', type: 'NATIONAL' },
    { date: `${ano}-11-15`, name: 'Proclamação da República', type: 'NATIONAL' },
    { date: `${ano}-11-20`, name: 'Dia Nacional de Zumbi e da Consciência Negra', type: 'NATIONAL' },
    { date: `${ano}-12-25`, name: 'Natal', type: 'NATIONAL' },
  ];

  const pascoa = calcularPascoa(ano);
  const carnaval = somarDias(pascoa, -47);
  const sextaFeiraSanta = somarDias(pascoa, -2);
  const corpusChristi = somarDias(pascoa, 60);

  feriados.push({ date: formatarIso(carnaval), name: 'Terça-feira de Carnaval', type: 'NATIONAL' });
  feriados.push({ date: formatarIso(sextaFeiraSanta), name: 'Sexta-feira Santa / Paixão de Cristo', type: 'NATIONAL' });
  feriados.push({ date: formatarIso(pascoa), name: 'Domingo de Páscoa', type: 'NATIONAL' });
  feriados.push({ date: formatarIso(corpusChristi), name: 'Corpus Christi', type: 'NATIONAL' });

  return feriados;
}

/**
 * Encontra a próxima data de início válida pela CLT (geralmente a próxima segunda-feira útil).
 */
export function sugerirProximaDataValida(dataAtual: Date, feriadosMap: Map<string, string>): string {
  let teste = somarDias(dataAtual, 1);
  for (let i = 0; i < 14; i++) {
    const diaSemana = teste.getDay();
    const iso = formatarIso(teste);
    const dayPlus1 = formatarIso(somarDias(teste, 1));
    const dayPlus2 = formatarIso(somarDias(teste, 2));

    // Dias úteis permitidos (segunda, terça, quarta) que não antecedem feriado
    if (diaSemana >= 1 && diaSemana <= 3) {
      if (!feriadosMap.has(iso) && !feriadosMap.has(dayPlus1) && !feriadosMap.has(dayPlus2)) {
        return iso;
      }
    }
    teste = somarDias(teste, 1);
  }
  return '';
}

/**
 * Valida a Data de Início das Férias contra as regras do Art. 134, § 3º da CLT:
 * 1. Proibido iniciar nos 2 dias que antecedem DSR (Quintas e Sextas-feiras em escala padrão).
 * 2. Proibido iniciar no Sábado ou Domingo (dias de folga/DSR).
 * 3. Proibido iniciar nos 2 dias que antecedem feriado (dia+1 ou dia+2 é feriado).
 * 4. Proibido iniciar no próprio dia de feriado.
 */
export function validarInicioFeriasClt(
  dataInicioStr: string,
  feriadosAdicionais: HolidayItem[] = [],
  isEscala12x36: boolean = false
): CltValidationResult {
  if (!dataInicioStr) {
    return { valid: true };
  }

  const [y, m, d] = dataInicioStr.split('-').map(Number);
  if (!y || !m || !d) {
    return { valid: true };
  }

  const dataInicio = new Date(y, m - 1, d);
  const diaSemana = dataInicio.getDay(); // 0 = Domingo, 1 = Segunda, ..., 5 = Sexta, 6 = Sábado

  // Montar mapa de feriados para o ano e o próximo ano
  const ano = dataInicio.getFullYear();
  const mapaFeriados = new Map<string, string>();

  [...getFeriadosNacionais(ano), ...getFeriadosNacionais(ano + 1), ...feriadosAdicionais].forEach(h => {
    mapaFeriados.set(h.date, h.name);
  });

  const sugestao = sugerirProximaDataValida(dataInicio, mapaFeriados);

  // 1. Validação de DSR (Sexta-feira, Quinta-feira, Sábado e Domingo)
  // Para escalas padrão (ex: 5x2, 6x1), o DSR fixo em domingos/sábados impede o início na quinta ou sexta.
  // Para a escala 12x36 (Art. 59-A da CLT), a compensação de descanso é de 36h contínuas e o colaborador pode iniciar na sexta-feira ou em seu dia útil correspondente.
  if (!isEscala12x36) {
    if (diaSemana === 5) { // Sexta-feira
      return {
        valid: false,
        motivo: 'DSR',
        mensagem: 'Violação do Art. 134, § 3º da CLT: É expressamente proibido iniciar férias na Sexta-feira em escala padrão (5x2), pois antecede em 2 dias o Repouso Semanal Remunerado (DSR no domingo).',
        sugestaoData: sugestao
      };
    }

    if (diaSemana === 4) { // Quinta-feira
      return {
        valid: false,
        motivo: 'DSR',
        mensagem: 'Violação do Art. 134, § 3º da CLT: É vedado iniciar férias na Quinta-feira, pois antecede em 2 dias o descanso semanal de sábado/domingo.',
        sugestaoData: sugestao
      };
    }

    if (diaSemana === 6 || diaSemana === 0) { // Sábado ou Domingo
      return {
        valid: false,
        motivo: 'DSR',
        mensagem: 'Violação do Art. 134, § 3º da CLT: As férias não podem iniciar em dia de Repouso Semanal Remunerado (DSR / Fim de Semana).',
        sugestaoData: sugestao
      };
    }
  }

  // 2. Validação de Feriados (Próprio dia, Dia + 1 e Dia + 2)
  const isoAtual = dataInicioStr;
  const isoMais1 = formatarIso(somarDias(dataInicio, 1));
  const isoMais2 = formatarIso(somarDias(dataInicio, 2));

  if (mapaFeriados.has(isoAtual)) {
    const nomeFeriado = mapaFeriados.get(isoAtual);
    return {
      valid: false,
      motivo: 'FERIADO',
      mensagem: `A data de início selecionada coincide com o feriado de "${nomeFeriado}".`,
      sugestaoData: sugestao
    };
  }

  if (mapaFeriados.has(isoMais1)) {
    const nomeFeriado = mapaFeriados.get(isoMais1);
    return {
      valid: false,
      motivo: 'FERIADO',
      mensagem: `Violação do Art. 134, § 3º da CLT: É vedado iniciar férias nos 2 dias que antecedem feriado. A data selecionada antecede em 1 dia o feriado de "${nomeFeriado}".`,
      sugestaoData: sugestao
    };
  }

  if (mapaFeriados.has(isoMais2)) {
    const nomeFeriado = mapaFeriados.get(isoMais2);
    return {
      valid: false,
      motivo: 'FERIADO',
      mensagem: `Violação do Art. 134, § 3º da CLT: É vedado iniciar férias nos 2 dias que antecedem feriado. A data selecionada antecede em 2 dias o feriado de "${nomeFeriado}".`,
      sugestaoData: sugestao
    };
  }

  return { valid: true };
}
