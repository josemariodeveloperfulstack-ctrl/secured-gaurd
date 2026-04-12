/**
 * Cidade da empresa para local de assinatura em contratos (município), nunca logradouro.
 * Usa o campo `city` do cadastro; se vazio, tenta extrair de `address` no padrão "... - Cidade - UF".
 */
export function resolveCompanySigningCity(
  company:
    | {
        city?: string;
        address?: string;
      }
    | null
    | undefined
): string {
  if (!company) return '';
  const c = company.city?.trim();
  if (c) return c;
  const addr = typeof company.address === 'string' ? company.address.trim() : '';
  if (!addr) return '';
  const parts = addr.split(/\s*-\s*/).map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const last = parts[parts.length - 1];
    if (/^[A-Za-z]{2}$/.test(last)) {
      return parts[parts.length - 2] || '';
    }
  }
  return '';
}
