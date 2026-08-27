import { getApiUrl } from '@/config/environment';
import type { Company } from '@/types/company';

/**
 * Resolve URL absoluta do logo da empresa para exibição / captura em PDF.
 */
export function resolveCompanyLogoUrl(
  companyOrUrl?: Pick<Company, 'logoUrl'> | string | null
): string | null {
  if (!companyOrUrl) return null;

  const raw = typeof companyOrUrl === 'string' ? companyOrUrl.trim() : companyOrUrl.logoUrl?.trim();
  if (!raw) return null;

  if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('data:')) {
    return raw;
  }

  const baseUrl = getApiUrl().replace(/\/api\/?$/, '');
  const normalized = raw.startsWith('/') ? raw : `/${raw}`;

  if (normalized.startsWith('/api/uploads/')) {
    return `${baseUrl}${normalized}`;
  }
  if (normalized.startsWith('/uploads/')) {
    return `${baseUrl}/api${normalized}`;
  }
  if (normalized.includes('/uploads/companies/logos/')) {
    return `${baseUrl}/api${normalized.startsWith('/') ? normalized : `/${normalized}`}`;
  }

  const fileName = raw.replace(/^.*\//, '');
  return `${baseUrl}/api/uploads/companies/logos/${fileName}`;
}

export function formatCompanyDocument(company?: Pick<Company, 'cnpj'> | null): string {
  const cnpj = company?.cnpj?.replace(/\D/g, '') || '';
  if (cnpj.length !== 14) return company?.cnpj || '';
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

/** Endereço completo no padrão dos relatórios oficiais. */
export function formatCompanyAddress(
  company?: Pick<
    Company,
    | 'address'
    | 'enderecoRua'
    | 'enderecoNumero'
    | 'enderecoComplemento'
    | 'enderecoBairro'
    | 'city'
    | 'state'
    | 'zipCode'
  > | null
): string {
  if (!company) return '';

  const streetParts = [
    company.enderecoRua,
    company.enderecoNumero ? `nº ${company.enderecoNumero}` : null,
    company.enderecoComplemento,
  ].filter(Boolean);

  let street = streetParts.join(', ');
  if (!street && company.address) {
    street = company.address.trim();
  }

  const cityState = [company.city, company.state].filter(Boolean).join('/');
  const neighborhood = company.enderecoBairro?.trim();

  const parts = [street, neighborhood, cityState].filter(Boolean);

  return parts.join(' - ');
}

/**
 * Linhas do rodapé no padrão oficial (centralizado sob a linha gradient):
 * 1) Nome
 * 2) Endereço
 * 3) Telefone - e-mail
 * 4) CNPJ
 */
export function formatCompanyFooterLines(company?: Company | null): string[] {
  if (!company) return [];

  const lines: string[] = [];
  const name = company.name?.trim();
  if (name) lines.push(name);

  const address = formatCompanyAddress(company);
  if (address) lines.push(address);

  const contact = [company.phone ? `Telefone: ${company.phone}` : null, company.email || null]
    .filter(Boolean)
    .join(' - ');
  if (contact) lines.push(contact);

  const cnpj = formatCompanyDocument(company);
  if (cnpj) lines.push(`CNPJ: ${cnpj}`);

  return lines;
}
