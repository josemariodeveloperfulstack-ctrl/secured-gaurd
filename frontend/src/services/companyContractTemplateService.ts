import api from '@/lib/axios';

const API_BASE_URL = '/api/company-contract-templates';

/** Chaves dos modelos oficiais de minuta */
export type ContractTemplateKey = 'ARMADA' | 'DESARMADA' | 'PORTARIA';

export const CONTRACT_TEMPLATE_LABELS: Record<ContractTemplateKey, string> = {
  ARMADA: 'Vigilância Patrimonial Armada',
  DESARMADA: 'Vigilância Patrimonial Desarmada',
  PORTARIA: 'Portaria e Controle de Acesso',
};

/**
 * Retorna os modelos de minuta aplicáveis para a empresa:
 * - VIG: Vigilância Patrimonial Armada e Vigilância Patrimonial Desarmada
 * - TERC / ADM (e demais terceirizadas): Portaria e Controle de Acesso
 */
export function getAllowedTemplateKeysForCompany(
  company?: { sigla?: string; name?: string } | null
): ContractTemplateKey[] {
  if (!company) return ['PORTARIA'];
  const sigla = (company.sigla || '').trim().toUpperCase();
  const name = (company.name || '').toUpperCase();
  const isVig = sigla === 'VIG' || name.includes('VIGILANCIA') || name.includes('VIGILÂNCIA');
  return isVig ? ['ARMADA', 'DESARMADA'] : ['PORTARIA'];
}

/** Títulos padrão dos 14 capítulos das cláusulas */
export const CLAUSE_TITLES: string[] = [
  'Cláusula 1ª – Objeto',
  'Cláusula 2ª – Vigência, Execução e Faturamento',
  'Cláusula 3ª – Preço, Reajuste e Forma de Pagamento',
  'Cláusula 4ª – Responsabilidades e Obrigações da Contratada',
  'Cláusula 5ª – Responsabilidade Civil e Trabalhista',
  'Cláusula 6ª – Local da Prestação dos Serviços e Procedimento de Defesa',
  'Cláusula 7ª – Das Penalidades',
  'Cláusula 8ª – Dos Tributos, Equilíbrio Econômico-Financeiro e do Trintídio',
  'Cláusula 9ª – Independência das Partes',
  'Cláusula 10ª – Comunicações e Notificações',
  'Cláusula 11ª – Práticas de Compliance, Anticorrupção e Socioambientais',
  'Cláusula 12ª – Proteção dos Dados Pessoais (LGPD)',
  'Cláusula 13ª – Disposições Gerais',
  'Cláusula 14ª – Foro, Legislação Aplicável e Resolução de Conflitos',
];

export interface CompanyContractTemplate {
  id?: string;
  companyId?: string | null;
  templateKey: ContractTemplateKey;
  title: string;
  clause1?: string;
  clause2?: string;
  clause3?: string;
  clause4?: string;
  clause5?: string;
  clause6?: string;
  clause7?: string;
  clause8?: string;
  clause9?: string;
  clause10?: string;
  clause11?: string;
  clause12?: string;
  clause13?: string;
  clause14?: string;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/** Extrai as cláusulas 1..14 de um template como array indexado (0 = cláusula 1). */
export function templateClausesToList(t: CompanyContractTemplate | null | undefined): (string | undefined)[] {
  if (!t) return Array(14).fill(undefined);
  return [
    t.clause1, t.clause2, t.clause3, t.clause4, t.clause5, t.clause6, t.clause7,
    t.clause8, t.clause9, t.clause10, t.clause11, t.clause12, t.clause13, t.clause14,
  ];
}

class CompanyContractTemplateService {
  /**
   * Lista os 3 modelos oficiais resolvidos para a empresa
   * (usa a versão da empresa quando ela já personalizou o modelo).
   */
  async listForCompany(companyId?: string): Promise<CompanyContractTemplate[]> {
    try {
      const url = companyId ? `${API_BASE_URL}?companyId=${companyId}` : API_BASE_URL;
      const response = await api.get(url);
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('❌ Erro ao listar templates de contrato:', error);
      return [];
    }
  }

  /** Busca um modelo específico (ARMADA, DESARMADA ou PORTARIA) para a empresa. */
  async getForCompany(templateKey: ContractTemplateKey, companyId?: string): Promise<CompanyContractTemplate | null> {
    try {
      const params = companyId ? { companyId } : {};
      const response = await api.get(`${API_BASE_URL}/by-key/${templateKey}`, { params });
      if (response.status === 204 || !response.data) return null;
      return response.data;
    } catch (error: any) {
      if (error?.response?.status === 404) return null;
      console.error('❌ Erro ao buscar template de contrato:', error);
      return null;
    }
  }

  /** Salva as 14 cláusulas do modelo para a empresa (cria cópia própria). */
  async saveForCompany(companyId: string, template: CompanyContractTemplate): Promise<CompanyContractTemplate> {
    const response = await api.post(`${API_BASE_URL}?companyId=${companyId}`, template);
    return response.data;
  }

  /** Restaura o texto oficial global do modelo para a empresa. */
  async resetForCompany(companyId: string, templateKey: ContractTemplateKey): Promise<CompanyContractTemplate> {
    const response = await api.post(
      `${API_BASE_URL}/${templateKey}/reset?companyId=${companyId}`
    );
    return response.data;
  }
}

export const companyContractTemplateService = new CompanyContractTemplateService();
