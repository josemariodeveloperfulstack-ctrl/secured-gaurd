import * as XLSX from 'xlsx';
import type { EmailCampaignRecipientInput } from '@/services/emailCampaignService';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
    const metadata: Record<string, unknown> = {};
    if (company) metadata.company = company;
    if (position) metadata.position = position;
    if (phone) metadata.phone = phone;
    // Preserva colunas extras como metadados (útil para personalização)
    for (const [k, v] of Object.entries(row)) {
      const key = k.trim();
      if (!key || v == null || String(v).trim() === '') continue;
      const lk = key.toLowerCase();
      if (lk === 'email' || NAME_KEYS.includes(lk) || COMPANY_KEYS.includes(lk) || POSITION_KEYS.includes(lk) || PHONE_KEYS.includes(lk)) {
        continue;
      }
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
