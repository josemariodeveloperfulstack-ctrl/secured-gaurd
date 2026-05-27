import * as XLSX from 'xlsx';
import type { EmailCampaignRecipientInput } from '@/services/emailCampaignService';

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  const trimmed = email.trim();
  return trimmed.length > 0 && EMAIL_RE.test(trimmed);
}

export interface ParsedRow {
  raw: Record<string, unknown>;
  email: string;
  name?: string;
  company?: string;
  position?: string;
  phone?: string;
  metadata: Record<string, unknown>;
}

export interface ParseResult {
  rows: ParsedRow[];
  invalid: { row: number; email: string; reason: string }[];
  headers: string[];
}

const NAME_KEYS = ['name', 'nome', 'fullname', 'full_name', 'contato'];
const COMPANY_KEYS = ['company', 'empresa', 'organization', 'organização'];
const POSITION_KEYS = ['position', 'cargo', 'role', 'titulo', 'título'];
const PHONE_KEYS = ['phone', 'telefone', 'mobile', 'celular', 'whatsapp'];
const CITY_KEYS = ['city', 'cidade', 'municipio', 'município', 'bairro', 'localidade', 'local'];
const STATE_KEYS = ['state', 'estado', 'uf'];
const COMPANY_TYPE_KEYS = [
  'companytype',
  'tipo empresa',
  'tipo de empresa',
  'tipo_empresa',
  'segmento',
  'segment',
  'ramo',
  'atividade',
  'classificação',
  'classificacao',
];

function pickKey(row: Record<string, unknown>, keys: string[]): string | undefined {
  const lowered = Object.keys(row).reduce<Record<string, string>>((acc, k) => {
    acc[k.trim().toLowerCase()] = k;
    return acc;
  }, {});
  for (const candidate of keys) {
    const real = lowered[candidate];
    if (real && row[real] != null && String(row[real]).trim() !== '') {
      return String(row[real]).trim();
    }
  }
  return undefined;
}

function findEmail(row: Record<string, unknown>): string | undefined {
  const direct = pickKey(row, ['email', 'e-mail', 'mail']);
  if (direct && EMAIL_RE.test(direct)) return direct.toLowerCase();
  // Como fallback, varre todos os valores e devolve o primeiro que parecer e-mail
  for (const v of Object.values(row)) {
    if (v == null) continue;
    const s = String(v).trim();
    if (EMAIL_RE.test(s)) return s.toLowerCase();
  }
  return undefined;
}

/**
 * Faz parse de um arquivo CSV/XLSX/XLS e devolve as linhas normalizadas.
 */
export async function parseRecipientFile(file: File): Promise<ParseResult> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
    raw: false,
  });

  const headers =
    json.length > 0 ? Object.keys(json[0]) : XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 })[0] || [];

  const rows: ParsedRow[] = [];
  const invalid: ParseResult['invalid'] = [];

  json.forEach((row, index) => {
    const email = findEmail(row);
    if (!email) {
      invalid.push({ row: index + 2, email: '', reason: 'Sem coluna de e-mail válida' });
      return;
    }
    if (!EMAIL_RE.test(email)) {
      invalid.push({ row: index + 2, email, reason: 'Formato inválido' });
      return;
    }
    const name = pickKey(row, NAME_KEYS);
    const company = pickKey(row, COMPANY_KEYS);
    const position = pickKey(row, POSITION_KEYS);
    const phone = pickKey(row, PHONE_KEYS);
    const city = pickKey(row, CITY_KEYS);
    const state = pickKey(row, STATE_KEYS);
    const companyType = pickKey(row, COMPANY_TYPE_KEYS);
    const metadata: Record<string, unknown> = {};
    if (company) metadata.company = company;
    if (position) metadata.position = position;
    if (phone) metadata.phone = phone;
    if (city) {
      metadata.city = city;
      metadata.cidade = city;
    }
    if (state) {
      metadata.state = state;
      metadata.estado = state;
    }
    if (companyType) {
      metadata.companyType = companyType;
      metadata.tipoEmpresa = companyType;
    }
    const reserved = new Set<string>([
      'email',
      ...NAME_KEYS,
      ...COMPANY_KEYS,
      ...POSITION_KEYS,
      ...PHONE_KEYS,
      ...CITY_KEYS,
      ...COMPANY_TYPE_KEYS,
    ]);
    // Preserva colunas extras como metadados (útil para personalização)
    for (const [k, v] of Object.entries(row)) {
      const key = k.trim();
      if (!key || v == null || String(v).trim() === '') continue;
      const lk = key.toLowerCase();
      if (reserved.has(lk) || STATE_KEYS.includes(lk)) continue;
      metadata[key] = v;
    }
    rows.push({ raw: row, email, name, company, position, phone, metadata });
  });

  // Dedup por e-mail mantendo a primeira ocorrência
  const seen = new Set<string>();
  const deduped = rows.filter((r) => {
    if (seen.has(r.email)) return false;
    seen.add(r.email);
    return true;
  });

  return { rows: deduped, invalid, headers };
}

/**
 * Faz parse de um bloco de texto colado pelo usuário (uma linha por destinatário).
 * Aceita:
 *  - apenas e-mail
 *  - "Nome <email>"
 *  - "email, Nome, Empresa"
 */
export function parseManualText(text: string): ParseResult {
  const rows: ParsedRow[] = [];
  const invalid: ParseResult['invalid'] = [];
  const lines = text.split(/\r?\n/);
  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!line) return;
    let email: string | undefined;
    let name: string | undefined;
    let company: string | undefined;

    const angle = line.match(/^(.*)<([^>]+)>$/);
    if (angle) {
      name = angle[1].trim().replace(/^"|"$/g, '');
      email = angle[2].trim().toLowerCase();
    } else if (line.includes(',') || line.includes(';')) {
      const parts = line.split(/[,;]/).map((p) => p.trim()).filter(Boolean);
      const emailIdx = parts.findIndex((p) => EMAIL_RE.test(p));
      if (emailIdx >= 0) {
        email = parts[emailIdx].toLowerCase();
        const rest = parts.filter((_, i) => i !== emailIdx);
        name = rest[0];
        company = rest[1];
      }
    } else {
      email = line.toLowerCase();
    }

    if (!email || !EMAIL_RE.test(email)) {
      invalid.push({ row: index + 1, email: email || line, reason: 'Linha inválida' });
      return;
    }
    const metadata: Record<string, unknown> = {};
    if (company) metadata.company = company;
    rows.push({ raw: { line }, email, name, company, metadata });
  });

  const seen = new Set<string>();
  const deduped = rows.filter((r) => {
    if (seen.has(r.email)) return false;
    seen.add(r.email);
    return true;
  });
  return { rows: deduped, invalid, headers: ['email', 'name', 'company'] };
}

export function toRecipientInputs(
  rows: ParsedRow[],
  sourceType: 'IMPORT' | 'MANUAL',
): EmailCampaignRecipientInput[] {
  return rows.map((r) => ({
    email: r.email,
    name: r.name,
    metadata: r.metadata,
    sourceType,
  }));
}

/** Mapeamento manual: cabeçalhos da planilha → campos conhecidos. */
export interface SpreadsheetColumnMapping {
  email: string;
  name?: string;
  company?: string;
  position?: string;
  phone?: string;
  /** Gravado em metadata.segment (segmento / texto livre). */
  segment?: string;
  city?: string;
  state?: string;
  companyType?: string;
}

function readFirstSheetRows(fileBuffer: ArrayBuffer): Record<string, unknown>[] {
  const wb = XLSX.read(fileBuffer, { type: 'array' });
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
    raw: false,
  });
}

/** Cabeçalhos da primeira folha (nomes de coluna da primeira linha de dados). */
export async function previewSpreadsheetHeaders(file: File): Promise<string[]> {
  const buf = await file.arrayBuffer();
  const json = readFirstSheetRows(buf);
  if (json.length > 0) {
    return Object.keys(json[0]);
  }
  const wb = XLSX.read(buf, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const row1 = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 })[0] as string[] | undefined;
  return (row1 || []).map((h) => String(h || '').trim()).filter(Boolean);
}

export function guessEmailColumn(headers: string[]): string {
  const found = headers.find((x) => {
    const t = x.trim().toLowerCase();
    return t === 'email' || t === 'e-mail' || t === 'mail' || t.includes('email');
  });
  return found ?? headers[0] ?? '';
}

function pickHeader(headers: string[], re: RegExp): string | undefined {
  return headers.find((x) => re.test(x.trim()));
}

/** Sugestão inicial de mapeamento a partir dos cabeçalhos da planilha. */
export function buildDefaultSpreadsheetMapping(headers: string[]): SpreadsheetColumnMapping {
  const cityExplicit = pickHeader(headers, /cidade|city|municipio|município|localidade/i);
  const cityFallback =
    cityExplicit ??
    pickHeader(headers, /^bairro$/i) ??
    pickHeader(headers, /\bbairro\b/i) ??
    pickHeader(headers, /regi[aã]o|local/i);

  return {
    email: guessEmailColumn(headers),
    name:
      pickHeader(headers, /nome fantasia|raz[aã]o social|nome completo/i) ??
      pickHeader(headers, /nome|^name$/i),
    company:
      pickHeader(headers, /nome fantasia|raz[aã]o social|empresa|company|organization/i),
    position: pickHeader(headers, /cargo|position|role|titulo|título|n[º°]?\s*func/i),
    phone: pickHeader(headers, /telefone|phone|celular|whatsapp|mobile/i),
    segment: pickHeader(headers, /segmento|segment|tags?/i),
    city: cityFallback,
    state:
      pickHeader(headers, /^(estado|uf|state)$/i) ??
      pickHeader(headers, /\bestado\b|\buf\b/i),
    companyType: pickHeader(
      headers,
      /tipo.*empresa|tipo de empresa|tipo_empresa|ramo|atividade|classifica/i,
    ),
  };
}

function applyMappedMeta(
  metadata: Record<string, unknown>,
  company?: string,
  position?: string,
  phone?: string,
  segment?: string,
  city?: string,
  state?: string,
  companyType?: string,
) {
  if (company) metadata.company = company;
  if (position) metadata.position = position;
  if (phone) metadata.phone = phone;
  if (segment) metadata.segment = segment;
  if (city) {
    metadata.city = city;
    metadata.cidade = city;
  }
  if (state) {
    metadata.state = state;
    metadata.estado = state;
  }
  if (companyType) {
    metadata.companyType = companyType;
    metadata.tipoEmpresa = companyType;
  }
}

function cell(row: Record<string, unknown>, col?: string): string | undefined {
  if (!col) return undefined;
  const v = row[col];
  if (v == null) return undefined;
  const s = String(v).trim();
  return s === '' ? undefined : s;
}

/**
 * Parse de planilha usando colunas escolhidas pelo usuário (e-mail obrigatório).
 */
export async function parseRecipientFileWithMapping(
  file: File,
  mapping: SpreadsheetColumnMapping,
): Promise<ParseResult> {
  if (!mapping.email) {
    return { rows: [], invalid: [{ row: 0, email: '', reason: 'Indique a coluna de e-mail' }], headers: [] };
  }
  const buf = await file.arrayBuffer();
  const json = readFirstSheetRows(buf);
  const headers = json.length > 0 ? Object.keys(json[0]) : [];

  const usedCols = new Set(
    [
      mapping.email,
      mapping.name,
      mapping.company,
      mapping.position,
      mapping.phone,
      mapping.segment,
      mapping.city,
      mapping.state,
      mapping.companyType,
    ].filter(Boolean),
  );

  const rows: ParsedRow[] = [];
  const invalid: ParseResult['invalid'] = [];

  json.forEach((row, index) => {
    const emailRaw = cell(row, mapping.email);
    const email = emailRaw ? emailRaw.toLowerCase() : '';
    if (!email || !EMAIL_RE.test(email)) {
      invalid.push({
        row: index + 2,
        email: emailRaw || '',
        reason: !emailRaw ? 'E-mail vazio' : 'Formato inválido',
      });
      return;
    }
    const name = cell(row, mapping.name);
    const company = cell(row, mapping.company);
    const position = cell(row, mapping.position);
    const phone = cell(row, mapping.phone);
    const segment = cell(row, mapping.segment);
    const city = cell(row, mapping.city);
    const state = cell(row, mapping.state);
    const companyType = cell(row, mapping.companyType);

    const metadata: Record<string, unknown> = {};
    applyMappedMeta(metadata, company, position, phone, segment, city, state, companyType);

    for (const k of Object.keys(row)) {
      if (!k || usedCols.has(k)) continue;
      const v = row[k];
      if (v == null || String(v).trim() === '') continue;
      metadata[k.trim()] = v;
    }

    rows.push({ raw: row, email, name, company, position, phone, metadata });
  });

  const seen = new Set<string>();
  const deduped = rows.filter((r) => {
    if (seen.has(r.email)) return false;
    seen.add(r.email);
    return true;
  });

  return { rows: deduped, invalid, headers };
}
