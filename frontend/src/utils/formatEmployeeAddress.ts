export type EmployeeAddressSource = {
  address?: string | {
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  enderecoRua?: string;
  enderecoNumero?: string;
  enderecoComplemento?: string;
  enderecoBairro?: string;
  enderecoCidade?: string;
  enderecoEstado?: string;
  enderecoCep?: string;
};

function formatZipCode(cep: string): string {
  const digits = cep.replace(/\D/g, '');
  if (digits.length === 8) {
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  }
  return cep;
}

/**
 * Endereço completo no padrão dos contratos:
 * Rua, Número - Complemento - Bairro - Cidade/Estado - CEP
 */
export function formatEmployeeFullAddress(emp: EmployeeAddressSource): string {
  const addr = typeof emp.address === 'object' && emp.address ? emp.address : undefined;

  const rua = (addr?.street ?? emp.enderecoRua ?? '').trim();
  const numero = (addr?.number ?? emp.enderecoNumero ?? '').trim();
  const complemento = (addr?.complement ?? emp.enderecoComplemento ?? '').trim();
  const bairro = (addr?.neighborhood ?? emp.enderecoBairro ?? '').trim();
  const cidade = (addr?.city ?? emp.enderecoCidade ?? '').trim();
  const estado = (addr?.state ?? emp.enderecoEstado ?? '').trim();
  const cep = (addr?.zipCode ?? emp.enderecoCep ?? '').trim();

  const parts: string[] = [];

  if (rua) {
    parts.push(numero ? `${rua}, ${numero}` : rua);
  }
  if (complemento) parts.push(complemento);
  if (bairro) parts.push(bairro);
  if (cidade) {
    parts.push(estado ? `${cidade}/${estado}` : cidade);
  } else if (estado) {
    parts.push(estado);
  }
  if (cep) parts.push(formatZipCode(cep));

  if (parts.length > 0) {
    return parts.join(' - ');
  }

  if (typeof emp.address === 'string' && emp.address.trim()) {
    return emp.address.trim();
  }

  return '';
}

/**
 * Endereço no padrão do termo LGPD da Vigilância (VIG):
 * Rua, Número Complemento, BAIRRO: X, Cidade/UF, CEP: XXXXXXXX
 */
export function formatEmployeeAddressForLgpdVig(emp: EmployeeAddressSource): string {
  const addr = typeof emp.address === 'object' && emp.address ? emp.address : undefined;

  const rua = (addr?.street ?? emp.enderecoRua ?? '').trim();
  const numero = (addr?.number ?? emp.enderecoNumero ?? '').trim();
  const complemento = (addr?.complement ?? emp.enderecoComplemento ?? '').trim();
  const bairro = (addr?.neighborhood ?? emp.enderecoBairro ?? '').trim();
  const cidade = (addr?.city ?? emp.enderecoCidade ?? '').trim();
  const estado = (addr?.state ?? emp.enderecoEstado ?? '').trim();
  const cep = (addr?.zipCode ?? emp.enderecoCep ?? '').trim();

  const parts: string[] = [];

  if (rua) {
    let streetLine = numero ? `${rua}, ${numero}` : rua;
    if (complemento) {
      streetLine += ` ${complemento}`;
    }
    parts.push(streetLine);
  }

  if (bairro) parts.push(`BAIRRO: ${bairro}`);

  if (cidade) {
    parts.push(estado ? `${cidade}/${estado}` : cidade);
  } else if (estado) {
    parts.push(estado);
  }

  if (cep) {
    const cepDigits = cep.replace(/\D/g, '');
    parts.push(`CEP: ${cepDigits}`);
  }

  if (parts.length > 0) {
    return parts.join(', ');
  }

  if (typeof emp.address === 'string' && emp.address.trim()) {
    return emp.address.trim();
  }

  return '';
}

export function isVigilanciaCompany(company?: { sigla?: string; name?: string } | null): boolean {
  if (!company) return false;
  if (company.sigla?.trim().toUpperCase() === 'VIG') return true;
  const name = (company.name ?? '').toUpperCase();
  return name.includes('VIGILANCIA') || name.includes('VIGILÂNCIA');
}
