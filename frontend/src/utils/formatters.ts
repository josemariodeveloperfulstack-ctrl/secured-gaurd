/**
 * Formata uma string de data (ex: "2024-07-31") para o padrão brasileiro (ex: "31/07/2024").
 * @param dateString A data em formato de string.
 * @returns A data formatada ou '-' se a entrada for nula/indefinida.
 */
export const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) {
    return '-';
  }
  try {
    // Adicionar T00:00:00 apenas se não for uma data/hora completa (ISO string)
    // para evitar "RangeError: Invalid time value" (ex: "2024-07-31T10:00:00.000ZT00:00:00")
    const isoString = dateString.includes('T') ? dateString : `${dateString}T00:00:00`;
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('pt-BR').format(date);
  } catch (error) {
    console.error("Erro ao formatar data:", dateString, error);
    return 'Data inválida';
  }
};

/**
 * Formata um valor numérico para o padrão de moeda brasileira (BRL).
 * @param value O valor numérico.
 * @returns O valor formatado como moeda (ex: "R$ 1.234,56") ou '-' se a entrada for nula/indefinida.
 */
export const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined) {
    return '-';
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

/**
 * Formata um CPF no padrão 000.000.000-00
 * @param cpf O CPF como string apenas números ou já formatado
 * @returns O CPF formatado ou '-' se vazio
 */
export const formatCPF = (cpf: string | null | undefined): string => {
  if (!cpf) return '-';
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return cpf;
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

/**
 * Formata um RG, removendo espaços excedentes
 * @param rg O RG como string
 * @returns O RG higienizado ou '-' se vazio
 */
export const formatRG = (rg: string | null | undefined): string => {
  if (!rg || rg.trim() === '') return '-';
  return rg.trim();
};

/**
 * Formata números de telefone ou celular no padrão (00) 00000-0000 ou (00) 0000-0000
 * @param phone O telefone como string
 * @returns O telefone formatado ou '-' se vazio
 */
export const formatPhone = (phone: string | null | undefined): string => {
  if (!phone) return '-';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) {
    return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  } else if (digits.length === 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  return phone;
};

/**
 * Formata o nome do posto para exibição, removendo o prefixo "WP" do código.
 * O nome do posto não deve exibir "WP" na frente (ex: "WP-ABC - Portaria" → "Portaria").
 * @param post Objeto com postCode e/ou name
 * @returns Nome formatado para exibição
 */
export const formatWorkPostDisplayName = (post: { postCode?: string; name?: string } | string | null | undefined): string => {
  if (!post) return '-';
  if (typeof post === 'string') {
    return post.replace(/^WP\s*-?\s*/i, '').trim() || '-';
  }
  const name = (post.name?.trim() || '').replace(/^WP\s*-?\s*/i, '');
  const postCode = post.postCode?.trim() || '';
  // Se o postCode começa com "WP" (case insensitive), não exibir - usar apenas o nome
  if (postCode && /^WP/i.test(postCode)) {
    return (name || post.name?.trim() || '').trim() || '-';
  }
  if (postCode && name) {
    return `${postCode} - ${name}`;
  }
  return (name || post.name || postCode || '').trim() || '-';
};
