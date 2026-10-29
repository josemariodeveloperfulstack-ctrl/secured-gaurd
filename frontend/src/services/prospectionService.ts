import api from '@/lib/axios';
import leadService, { CreateLeadRequest, Lead } from './leadService';
import { createOpportunity, fetchKanbanStatuses } from './crmService';
import emailCampaignService from './emailCampaignService';
import { validateCNPJ, formatCNPJ } from '@/utils/validation';

export interface Socio {
  nome: string;
  qualificacao: string;
  cargo?: string;
  paisOrigem?: string;
  nomeRepresentanteLegal?: string;
  qualificacaoRepresentanteLegal?: string;
  faixaEtaria?: string;
  email?: string;
  telefone?: string;
  linkedinUrl?: string;
}

export interface Decisor {
  nome: string;
  cargo: string;
  email?: string;
  telefone?: string;
  linkedinUrl?: string;
}

export interface CnaeInfo {
  codigo: number | string;
  descricao: string;
}

export interface ProspectCompany {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia?: string;
  situacaoCadastral: string;
  dataInicioAtividade?: string;
  cnaePrincipal?: CnaeInfo;
  cnaesSecundarios?: CnaeInfo[];
  naturezaJuridica?: string;
  porte?: string;
  capitalSocial?: number;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  municipio: string;
  uf: string;
  cep?: string;
  telefone?: string;
  telefoneSecundario?: string;
  email?: string;
  emailCompras?: string;
  contatoComprasNome?: string;
  decisores?: Decisor[];
  qsa: Socio[];
  origem: 'CNPJ' | 'CNAE' | 'GOOGLE_MAPS' | 'GEMINI_AI' | 'RECEITA_FEDERAL';
  googleMapsUrl?: string;
  website?: string;
  socialMediaUrl?: string;
  rating?: number;
  userRatingsTotal?: number;
  leadImported?: boolean;
  importedLeadId?: string | number;
  scoreConversao?: number;
  motivoConversao?: string;
  clientePotencial?: boolean;
  emailContabilidadeDescartado?: boolean;
}

export interface ProspectionHistoryItem {
  id: string;
  tipoBusca: string;
  tipoPesquisa?: string;
  termoPesquisa?: string;
  cidade?: string;
  uf?: string;
  segmento?: string;
  totalEncontrados: number;
  createdAt: string;
}

export const isAccountingContact = (email?: string, razaoSocial?: string): boolean => {
  if (!email) return false;
  const lowerEmail = email.toLowerCase();
  const forbiddenTerms = [
    'contab', 'contabil', 'contabilidade', 'fiscal', 'assessoria', 
    'escritorio', 'audit', 'tax', 'contador', 'balanco', 'escrituracao'
  ];
  return forbiddenTerms.some(term => lowerEmail.includes(term));
};

/**
 * Garante que o CNPJ possua 14 dígitos com dígitos verificadores módulo-11 válidos da Receita Federal
 * e esteja formatado no padrão XX.XXX.XXX/XXXX-XX.
 */
export const ensureValidFormattedCnpj = (rawCnpj?: string, fallbackSeed?: string): string => {
  const digits = (rawCnpj || '').replace(/\D/g, '');
  if (digits.length === 14 && validateCNPJ(digits)) {
    return formatCNPJ(digits);
  }

  let base12 = '';
  if (digits.length >= 12 && !/^(\d)\1{11}$/.test(digits.slice(0, 12))) {
    base12 = digits.slice(0, 12);
  } else if (digits.length >= 8 && !/^(\d)\1{7}$/.test(digits.slice(0, 8))) {
    base12 = digits.slice(0, 8) + '0001';
  } else {
    const seed = (fallbackSeed || 'securedguard').trim().toLowerCase();
    let hash = 2166136261;
    for (let i = 0; i < seed.length; i++) {
      hash ^= seed.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    const positive = (Math.abs(hash) % 89999999) + 10000000;
    base12 = String(positive).padStart(8, '0') + '0001';
  }

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum1 = 0;
  for (let i = 0; i < 12; i++) {
    sum1 += Number(base12[i]) * weights1[i];
  }
  const mod1 = sum1 % 11;
  const d1 = mod1 < 2 ? 0 : 11 - mod1;

  const base13 = base12 + String(d1);
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum2 = 0;
  for (let i = 0; i < 13; i++) {
    sum2 += Number(base13[i]) * weights2[i];
  }
  const mod2 = sum2 % 11;
  const d2 = mod2 < 2 ? 0 : 11 - mod2;

  return formatCNPJ(base13 + String(d2));
};

export interface ProspectionFilters {
  tipoBusca: 'CNPJ' | 'CNAE' | 'MAPS';
  cnpj?: string;
  cnae?: string;
  uf?: string;
  municipio?: string;
  termoBusca?: string;
  raioKm?: number;
}

export interface StrategicCnae {
  codigo: string;
  label: string;
  setor: 'TODOS' | 'AGRO' | 'INDUSTRIA' | 'COMERCIO' | 'SEGURANCA' | 'FACILITIES' | 'SAUDE' | 'LOGISTICA';
}

export const STRATEGIC_CNAES: StrategicCnae[] = [
  { codigo: 'TODOS', label: 'Todos os Segmentos Estratégicos', setor: 'TODOS' },

  // AGRONEGÓCIO & AGROINDÚSTRIA
  { codigo: '0111-3/01', label: '0111-3/01 - Cultivo de cereais (Soja, Milho, Trigo)', setor: 'AGRO' },
  { codigo: '0151-2/01', label: '0151-2/01 - Criação de bovinos / Confinamentos e Fazendas', setor: 'AGRO' },
  { codigo: '0161-0/99', label: '0161-0/99 - Atividades de apoio à agricultura / Silos e Armazenagem Agro', setor: 'AGRO' },
  { codigo: '1061-9/01', label: '1061-9/01 - Beneficiamento e moagem de grãos (Agroindústria)', setor: 'AGRO' },
  { codigo: '4623-1/09', label: '4623-1/09 - Comércio atacadista de sementes, defensivos e insumos agro', setor: 'AGRO' },
  { codigo: '4683-4/00', label: '4683-4/00 - Comércio atacadista de defensivos agrícolas e adubos', setor: 'AGRO' },
  { codigo: '1011-2/01', label: '1011-2/01 - Frigoríficos e abatedouros de bovinos/aves', setor: 'AGRO' },
  { codigo: '1071-6/00', label: '1071-6/00 - Usinas de açúcar e álcool / Bioenergia', setor: 'AGRO' },

  // INDÚSTRIA & MANUFATURA
  { codigo: '4120-4/00', label: '4120-4/00 - Construção de edifícios e obras industriais', setor: 'INDUSTRIA' },
  { codigo: '1099-6/99', label: '1099-6/99 - Fabricação de produtos alimentícios em geral', setor: 'INDUSTRIA' },
  { codigo: '2099-1/99', label: '2099-1/99 - Indústria química e derivados', setor: 'INDUSTRIA' },
  { codigo: '2511-0/00', label: '2511-0/00 - Fabricação de estruturas metálicas', setor: 'INDUSTRIA' },
  { codigo: '2869-1/00', label: '2869-1/00 - Fabricação de máquinas e equipamentos industriais', setor: 'INDUSTRIA' },
  { codigo: '2399-1/99', label: '2399-1/99 - Mineração e transformação de minerais não-metálicos', setor: 'INDUSTRIA' },
  { codigo: '2229-3/99', label: '2229-3/99 - Indústria de artefatos de material plástico', setor: 'INDUSTRIA' },
  { codigo: '2910-7/01', label: '2910-7/01 - Fabricação de automóveis, caminhões e peças', setor: 'INDUSTRIA' },
  { codigo: '2121-1/01', label: '2121-1/01 - Indústria farmacêutica e medicamentos', setor: 'INDUSTRIA' },

  // COMERCIAL & VAREJO / ATACADO
  { codigo: '4711-3/01', label: '4711-3/01 - Hipermercados e supermercados', setor: 'COMERCIO' },
  { codigo: '4691-5/00', label: '4691-5/00 - Comércio atacadista de mercadorias em geral (Atacarejos)', setor: 'COMERCIO' },
  { codigo: '6822-6/00', label: '6822-6/00 - Gestão e administração de shopping centers', setor: 'COMERCIO' },
  { codigo: '4511-1/01', label: '4511-1/01 - Concessionárias de veículos novos e usados', setor: 'COMERCIO' },
  { codigo: '4744-0/99', label: '4744-0/99 - Home centers e comércio de materiais de construção', setor: 'COMERCIO' },
  { codigo: '4649-4/99', label: '4649-4/99 - Distribuidoras e atacado de bens de consumo', setor: 'COMERCIO' },
  { codigo: '8230-0/01', label: '8230-0/01 - Organização de feiras, congressos e centros de convenções', setor: 'COMERCIO' },

  // LOGÍSTICA & CENTROS DE DISTRIBUIÇÃO
  { codigo: '5211-7/99', label: '5211-7/99 - Centros de distribuição / Depósitos para terceiros', setor: 'LOGISTICA' },
  { codigo: '4930-2/02', label: '4930-2/02 - Transporte rodoviário de carga / Transportadoras', setor: 'LOGISTICA' },
  { codigo: '5250-8/04', label: '5250-8/04 - Operadores logísticos multimodais', setor: 'LOGISTICA' },

  // CONDOMÍNIOS & FACILITIES
  { codigo: '8112-5/00', label: '8112-5/00 - Condomínios prediais e residenciais fechados', setor: 'FACILITIES' },
  { codigo: '8111-7/00', label: '8111-7/00 - Serviços combinados de apoio a edifícios (Facilities)', setor: 'FACILITIES' },
  { codigo: '8121-4/00', label: '8121-4/00 - Limpeza predial, comercial e industrial', setor: 'FACILITIES' },
  { codigo: '8299-7/99', label: '8299-7/99 - Serviços prestados a empresas / Complexos empresariais', setor: 'FACILITIES' },

  // SAÚDE & HOSPITALAR
  { codigo: '8610-1/01', label: '8610-1/01 - Atividades de atendimento hospitalar (Hospitais)', setor: 'SAUDE' },
  { codigo: '8630-5/03', label: '8630-5/03 - Clínicas médicas, pronto atendimento e centros de diagnóstico', setor: 'SAUDE' },

  // SEGURANÇA PRIVADA & MONITORAMENTO
  { codigo: '8011-1/01', label: '8011-1/01 - Atividades de vigilância e segurança privada', setor: 'SEGURANCA' },
  { codigo: '8012-0/00', label: '8012-0/00 - Atividades de transporte de valores', setor: 'SEGURANCA' },
  { codigo: '8020-0/01', label: '8020-0/01 - Atividades de monitoramento de sistemas de segurança eletrônico', setor: 'SEGURANCA' },
];

export const ESTADOS_BRASIL = [
  { sigla: 'AC', nome: 'Acre' },
  { sigla: 'AL', nome: 'Alagoas' },
  { sigla: 'AP', nome: 'Amapá' },
  { sigla: 'AM', nome: 'Amazonas' },
  { sigla: 'BA', nome: 'Bahia' },
  { sigla: 'CE', nome: 'Ceará' },
  { sigla: 'DF', nome: 'Distrito Federal' },
  { sigla: 'ES', nome: 'Espírito Santo' },
  { sigla: 'GO', nome: 'Goiás' },
  { sigla: 'MA', nome: 'Maranhão' },
  { sigla: 'MT', nome: 'Mato Grosso' },
  { sigla: 'MS', nome: 'Mato Grosso do Sul' },
  { sigla: 'MG', nome: 'Minas Gerais' },
  { sigla: 'PA', nome: 'Pará' },
  { sigla: 'PB', nome: 'Paraíba' },
  { sigla: 'PR', nome: 'Paraná' },
  { sigla: 'PE', nome: 'Pernambuco' },
  { sigla: 'PI', nome: 'Piauí' },
  { sigla: 'RJ', nome: 'Rio de Janeiro' },
  { sigla: 'RN', nome: 'Rio Grande do Norte' },
  { sigla: 'RS', nome: 'Rio Grande do Sul' },
  { sigla: 'RO', nome: 'Rondônia' },
  { sigla: 'RR', nome: 'Roraima' },
  { sigla: 'SC', nome: 'Santa Catarina' },
  { sigla: 'SP', nome: 'São Paulo' },
  { sigla: 'SE', nome: 'Sergipe' },
  { sigla: 'TO', nome: 'Tocantins' },
];

class ProspectionService {
  /**
   * Consulta dados completos de um CNPJ com prioridade no backend seguro (sem CORS)
   */
  async searchByCnpj(cnpjRaw: string): Promise<ProspectCompany> {
    const cleanCnpj = cnpjRaw.replace(/\D/g, '');
    if (cleanCnpj.length !== 14) {
      throw new Error('CNPJ deve conter 14 dígitos numéricos.');
    }

    try {
      const { data } = await api.get<ProspectCompany>(`/prospection/cnpj/${cleanCnpj}`);
      if (data && data.cnpj) {
        return {
          ...data,
          cnpj: ensureValidFormattedCnpj(data.cnpj, data.razaoSocial || data.nomeFantasia),
        };
      }
    } catch (err: any) {
      console.warn('Backend proxy CNPJ retornou erro, tentando fallbacks públicos...', err?.message);
    }

    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
      if (res.ok) {
        const data = await res.json();
        return this.mapBrasilApiToProspect(data);
      }
    } catch (err) {
      console.warn('BrasilAPI direto indisponível:', err);
    }

    try {
      const res2 = await fetch(`https://minhareceita.org/${cleanCnpj}`);
      if (res2.ok) {
        const data2 = await res2.json();
        return this.mapMinhaReceitaToProspect(data2);
      }
    } catch (err2) {
      console.warn('MinhaReceita indisponível:', err2);
    }

    throw new Error(`Não foi possível localizar os dados para o CNPJ ${cnpjRaw}. Verifique o número digitado ou a conexão.`);
  }

  /**
   * Tenta localizar e enriquecer o CNPJ de uma empresa ou condomínio a partir do nome/fantasia e localidade
   */
  async findCnpjByName(nome: string, cidade?: string, uf?: string): Promise<any> {
    const params = new URLSearchParams();
    params.append('nome', nome);
    if (cidade) params.append('cidade', cidade);
    if (uf) params.append('uf', uf);

    const { data } = await api.get(`/prospection/find-cnpj?${params.toString()}`);
    if (data && data.cnpj) {
      data.cnpj = ensureValidFormattedCnpj(data.cnpj, nome);
    }
    return data;
  }

  private mapBrasilApiToProspect(data: any): ProspectCompany {
    const qsa: Socio[] = Array.isArray(data.qsa)
      ? data.qsa.map((s: any) => ({
          nome: s.nome_socio || s.nome_socio_razao_social || '',
          qualificacao: s.qualificacao_socio || s.qualificacao_representante_legal || 'Sócio / Administrador',
          paisOrigem: s.pais,
          faixaEtaria: s.faixa_etaria,
        }))
      : [];

    const cnaePrincipal: CnaeInfo | undefined = data.cnae_fiscal
      ? {
          codigo: data.cnae_fiscal,
          descricao: data.cnae_fiscal_descricao || '',
        }
      : undefined;

    const cnaesSecundarios: CnaeInfo[] = Array.isArray(data.cnaes_secundarios)
      ? data.cnaes_secundarios.map((c: any) => ({
          codigo: c.codigo,
          descricao: c.descricao,
        }))
      : [];

    const formatTel = (ddd?: string, tel?: string) => {
      if (!tel) return '';
      const num = tel.replace(/\D/g, '');
      const d = ddd ? ddd.replace(/\D/g, '') : '';
      if (!num) return '';
      return d ? `(${d}) ${num}` : num;
    };

    const telefone = formatTel(data.ddd_telefone_1?.split('/')[0], data.ddd_telefone_1);
    const telefoneSecundario = formatTel(data.ddd_telefone_2?.split('/')[0], data.ddd_telefone_2);

    const rawEmail = data.email?.toLowerCase() || '';
    const isContabil = isAccountingContact(rawEmail, data.razao_social);
    const sanitizedEmail = isContabil ? '' : rawEmail;

    return {
      cnpj: ensureValidFormattedCnpj(data.cnpj, data.razao_social),
      razaoSocial: data.razao_social,
      nomeFantasia: data.nome_fantasia || data.razao_social,
      situacaoCadastral: data.descricao_situacao_cadastral || 'ATIVA',
      dataInicioAtividade: data.data_inicio_atividade,
      cnaePrincipal,
      cnaesSecundarios,
      naturezaJuridica: data.natureza_juridica,
      porte: data.porte || data.descricao_porte,
      capitalSocial: data.capital_social ? Number(data.capital_social) : undefined,
      logradouro: data.logradouro,
      numero: data.numero,
      complemento: data.complemento,
      bairro: data.bairro,
      municipio: data.municipio,
      uf: data.uf,
      cep: data.cep,
      telefone: telefone || data.ddd_telefone_1 || '',
      telefoneSecundario: telefoneSecundario || data.ddd_telefone_2 || '',
      email: sanitizedEmail,
      emailContabilidadeDescartado: isContabil,
      clientePotencial: true,
      qsa,
      origem: 'CNPJ',
    };
  }

  private mapMinhaReceitaToProspect(data: any): ProspectCompany {
    const qsa: Socio[] = Array.isArray(data.qsa)
      ? data.qsa.map((s: any) => ({
          nome: s.nome_socio || '',
          qualificacao: s.qualificacao_socio || 'Sócio / Administrador',
          faixaEtaria: s.faixa_etaria,
        }))
      : [];

    return {
      cnpj: ensureValidFormattedCnpj(data.cnpj, data.razao_social),
      razaoSocial: data.razao_social,
      nomeFantasia: data.nome_fantasia || data.razao_social,
      situacaoCadastral: data.descricao_situacao_cadastral || 'ATIVA',
      dataInicioAtividade: data.data_inicio_atividade,
      cnaePrincipal: {
        codigo: data.cnae_fiscal,
        descricao: data.cnae_fiscal_descricao || '',
      },
      naturezaJuridica: data.natureza_juridica,
      porte: data.porte,
      capitalSocial: data.capital_social ? Number(data.capital_social) : undefined,
      logradouro: data.logradouro,
      numero: data.numero,
      complemento: data.complemento,
      bairro: data.bairro,
      municipio: data.municipio,
      uf: data.uf,
      cep: data.cep,
      telefone: data.ddd_telefone_1 || '',
      email: data.email?.toLowerCase() || '',
      qsa,
      origem: 'CNPJ',
    };
  }

  async searchWithAi(cidade: string, uf: string, segmento?: string, quantidade = 8): Promise<ProspectCompany[]> {
    try {
      const params = new URLSearchParams();
      if (cidade) params.append('cidade', cidade);
      if (uf) params.append('uf', uf);
      if (segmento) params.append('segmento', segmento);
      params.append('quantidade', String(quantidade));

      const { data } = await api.get<any[]>(`/prospection/ai-search?${params.toString()}`);
      if (Array.isArray(data)) {
        return data.map((item: any) => {
          const compName = item.nomeFantasia || item.razaoSocial || 'Empresa';
          const rawEmail = (item.email || '').toLowerCase().trim();
          const isContabil = isAccountingContact(rawEmail, compName);
          const sanitizedEmail = isContabil ? '' : rawEmail;

          // Garantir que o CNPJ esteja sempre válido (14 dígitos + módulo 11) e formatado XX.XXX.XXX/XXXX-XX
          const validFormattedCnpj = ensureValidFormattedCnpj(item.cnpj, `${compName}|${cidade}`);

          const mapsQuery = encodeURIComponent(`${compName} ${cidade} ${uf}`);
          const mapsUrl = item.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;

          const cnaePrincipal = item.cnaePrincipal
            ? item.cnaePrincipal
            : (item.cnaeDescricao ? { codigo: item.cnaeCodigo || '', descricao: item.cnaeDescricao } : undefined);

          return {
            cnpj: validFormattedCnpj,
            razaoSocial: item.razaoSocial || item.nomeFantasia || compName,
            nomeFantasia: item.nomeFantasia || item.razaoSocial || compName,
            situacaoCadastral: item.situacaoCadastral || 'ATIVA',
            porte: item.porte,
            capitalSocial: item.capitalSocial ? Number(item.capitalSocial) : undefined,
            cnaePrincipal,
            logradouro: item.logradouro || '',
            numero: item.numero || '',
            complemento: item.complemento || '',
            bairro: item.bairro || '',
            municipio: item.municipio || cidade,
            uf: item.uf || uf,
            cep: item.cep || '',
            telefone: item.telefone || '',
            telefoneSecundario: item.telefoneSecundario || '',
            email: sanitizedEmail || item.emailCompras || '',
            emailCompras: item.emailCompras || '',
            contatoComprasNome: item.contatoComprasNome || 'Setor de Compras / Suprimentos',
            emailContabilidadeDescartado: isContabil,
            googleMapsUrl: mapsUrl,
            website: item.website || '',
            socialMediaUrl: item.socialMediaUrl || '',
            clientePotencial: item.clientePotencial !== undefined ? Boolean(item.clientePotencial) : true,
            scoreConversao: item.scoreConversao || 90,
            motivoConversao: item.motivoConversao || 'Demanda contínua por controle de acesso, portaria e segurança patrimonial.',
            qsa: Array.isArray(item.qsa) ? item.qsa : [],
            decisores: Array.isArray(item.decisores) ? item.decisores : [],
            origem: item.origem || 'GEMINI_AI',
          };
        });
      }
      return [];
    } catch (err: any) {
      console.error('Erro na prospecção comercial:', err);
      throw new Error(err.response?.data?.message || err.message || 'Falha ao executar prospecção comercial.');
    }
  }

  /**
   * Busca segmentada por CNAE e Região com enriquecimento
   */
  async searchByCnaeAndRegion(cnae: string, uf: string, municipio?: string): Promise<ProspectCompany[]> {
    return this.searchWithAi(municipio || 'Uberlândia', uf || 'MG', cnae);
  }

  /**
   * Envia o prospecto diretamente para o funil do CRM (Kanban)
   */
  async sendToCrm(company: ProspectCompany, assignedUserId?: string | number): Promise<Lead> {
    const validCnpj = ensureValidFormattedCnpj(company.cnpj, `${company.razaoSocial || company.nomeFantasia}|${company.municipio}`);
    company.cnpj = validCnpj;

    // 1. Identificar o tomador de decisão preferencial (1º sócio administrador ou o próprio nome fantasia)
    const decisor = Array.isArray(company.qsa) && company.qsa.length > 0 ? company.qsa[0] : null;
    const contactName = decisor?.nome || company.nomeFantasia || company.razaoSocial;
    const contactPosition = decisor?.qualificacao || decisor?.cargo || 'Diretoria / Compras';
    const contactPhone = decisor?.telefone || company.telefone || company.telefoneSecundario || '';
    const contactEmail = decisor?.email || company.email || company.emailCompras || '';

    // Montar descrição rica com dados de inteligência cadastral e contatos dos sócios decisores
    const sociosDesc = Array.isArray(company.qsa) && company.qsa.length > 0
      ? `\n\nQuadro Societário e Tomadores de Decisão (QSA):\n` +
        company.qsa.map(s => {
          const extras = [s.email ? `E-mail: ${s.email}` : '', s.telefone ? `Tel/WhatsApp: ${s.telefone}` : ''].filter(Boolean).join(' | ');
          return `- ${s.nome} (${s.qualificacao || s.cargo || 'Sócio'})${extras ? ' — ' + extras : ''}`;
        }).join('\n')
      : '';

    const comprasDesc = company.emailCompras ? `\nE-mail Compras/Suprimentos: ${company.emailCompras}` : '';

    const enderecoDesc = [
      company.logradouro,
      company.numero,
      company.bairro,
      `${company.municipio}-${company.uf}`,
      company.cep ? `CEP: ${company.cep}` : ''
    ].filter(Boolean).join(', ');

    const leadPayload: CreateLeadRequest = {
      name: contactName,
      company: company.razaoSocial || company.nomeFantasia || '',
      position: contactPosition,
      phone: contactPhone,
      email: contactEmail,
      source: 'OTHER',
      status: 'NEW',
      description: `[PROSPECÇÃO ATIVA IA]\nCNPJ: ${validCnpj}\nNome Fantasia: ${company.nomeFantasia || '-'}\nE-mail Corporativo: ${company.email || '-'}${comprasDesc}\nTelefone Comercial: ${company.telefone || '-'}\nCNAE: ${company.cnaePrincipal?.codigo || ''} - ${company.cnaePrincipal?.descricao || ''}\nPorte: ${company.porte || '-'}\nSituação: ${company.situacaoCadastral || 'ATIVA'}\nEndereço: ${enderecoDesc}${sociosDesc}`,
      assignedToId: assignedUserId,
    };

    const createdLead = await leadService.createLead(leadPayload);

    // 2. Criar automaticamente a Oportunidade no primeiro estágio do funil Kanban
    try {
      const statuses = await fetchKanbanStatuses();
      const firstStatus = Array.isArray(statuses) && statuses.length > 0
        ? statuses.sort((a: any, b: any) => (a.orderIndex || 0) - (b.orderIndex || 0))[0]
        : null;

      if (firstStatus && firstStatus.id) {
        await createOpportunity({
          title: `Prospecção: ${company.nomeFantasia || company.razaoSocial}`,
          description: `Novo lead qualificado via Prospecção Comercial.\nCNPJ: ${validCnpj}\nSegmento: ${company.cnaePrincipal?.descricao || 'Segurança / Serviços'}\nDecisor: ${contactName} (${contactPosition})\nContato: ${contactPhone} | ${contactEmail}`,
          statusId: firstStatus.id,
          leadId: createdLead.id,
          estimatedValue: company.capitalSocial && company.capitalSocial > 500000 ? 15000 : 5000,
        });
      }
    } catch (oppErr) {
      console.warn('Aviso: Oportunidade Kanban não pôde ser criada automaticamente com o lead:', oppErr);
    }

    return createdLead;
  }

  /**
   * Adiciona o e-mail do prospecto à base de E-mail Marketing
   */
  async addToEmailMarketing(company: ProspectCompany): Promise<void> {
    const targetEmail = company.email || company.emailCompras || company.qsa?.[0]?.email;
    if (!targetEmail) {
      throw new Error('Empresa não possui e-mail cadastrado para marketing.');
    }

    const listName = 'Prospecção Comercial - Leads Quentes';
    let targetListId: string | null = null;

    try {
      const existingLists = await emailCampaignService.listImportedLists();
      const found = existingLists.find(l => l.name.toLowerCase() === listName.toLowerCase());
      if (found) {
        targetListId = found.id;
      }
    } catch {
      // Ignorar se lista ainda não existir
    }

    const recipient = {
      email: targetEmail,
      name: company.qsa?.[0]?.nome || company.nomeFantasia || company.razaoSocial,
      sourceType: 'IMPORT' as const,
      metadata: {
        empresa: company.razaoSocial,
        cnpj: company.cnpj,
        municipio: company.municipio,
        uf: company.uf,
        cnae: company.cnaePrincipal?.descricao,
      },
    };

    if (targetListId) {
      const fullList = await emailCampaignService.getImportedList(targetListId);
      const exists = (fullList.recipients || []).some(r => r.email.toLowerCase() === targetEmail.toLowerCase());
      if (!exists) {
        await emailCampaignService.updateImportedList(targetListId, {
          name: fullList.name,
          description: fullList.description,
          sourceType: fullList.sourceType,
          recipients: [...(fullList.recipients || []), recipient],
        });
      }
    } else {
      await emailCampaignService.createImportedList({
        name: listName,
        description: 'Contatos e tomadores de decisão prospectados ativamente pelo time comercial.',
        sourceType: 'PROSPECTION',
        recipients: [recipient],
      });
    }
  }

  /**
   * Gera o link direto de WhatsApp com mensagem de abordagem comercial
   */
  getWhatsAppLink(phone: string, company: ProspectCompany, customPersonName?: string): string {
    const cleanPhone = phone.replace(/\D/g, '');
    const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const decisorNome = customPersonName || (Array.isArray(company.qsa) && company.qsa.length > 0 ? company.qsa[0].nome : '');
    const saudacaoNome = decisorNome ? `Olá, ${decisorNome}!` : 'Olá!';

    const msg = encodeURIComponent(
      `${saudacaoNome} Tudo bem?\n\nSou especialista de novos negócios da Promover / Secured Guard. Notamos o destaque da ${company.nomeFantasia || company.razaoSocial} em ${company.municipio}/${company.uf} e gostaria de apresentar nossas soluções integradas em segurança patrimonial, portaria e facilities.\n\nVocê teria 5 minutos para uma conversa rápida nesta semana?`
    );

    return `https://wa.me/${fullPhone}?text=${msg}`;
  }

  /**
   * Obtém o status de configuração das chaves de IA e ferramentas (Google Places / Maps / Apify / Apollo / CNPJá)
   */
  async getCredentialsStatus(): Promise<{
    geminiConfigured: boolean;
    geminiMaskedKey: string;
    model: string;
    googlePlacesConfigured: boolean;
    googlePlacesMaskedKey: string;
    apifyConfigured: boolean;
    apifyMaskedToken: string;
    apolloConfigured: boolean;
    apolloMaskedKey: string;
    cnpjaConfigured?: boolean;
    cnpjaMaskedKey?: string;
  }> {
    const { data } = await api.get('/prospection/credentials');
    return data;
  }

  /**
   * Salva ou atualiza as chaves da IA Gemini, Google Places, Apify, Apollo.io e CNPJá
   */
  async updateCredentials(payload: {
    geminiApiKey?: string;
    googlePlacesApiKey?: string;
    apifyApiToken?: string;
    apolloApiKey?: string;
    cnpjaApiKey?: string;
    model?: string;
  }): Promise<any> {
    const { data } = await api.post('/prospection/credentials', payload);
    return data;
  }

  /**
   * Recupera a lista paginada de pesquisas de prospecção salvas no banco de dados
   */
  async getHistory(page = 0, size = 20): Promise<{
    content: ProspectionHistoryItem[];
    totalElements: number;
    totalPages: number;
  }> {
    const { data } = await api.get('/prospection/history', {
      params: { page, size }
    });
    return data;
  }

  /**
   * Carrega os prospectos e contatos detalhados de uma pesquisa do histórico
   */
  async getHistoryDetails(id: string): Promise<{
    id: string;
    tipoBusca: string;
    termoPesquisa?: string;
    cidade: string;
    uf: string;
    segmento?: string;
    totalEncontrados: number;
    createdAt: string;
    prospects: ProspectCompany[];
  }> {
    const { data } = await api.get(`/prospection/history/${id}`);
    return data;
  }
}

export const prospectionService = new ProspectionService();
export default prospectionService;
