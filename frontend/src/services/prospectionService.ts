import api from '@/lib/axios';
import leadService, { CreateLeadRequest, Lead } from './leadService';
import { createOpportunity, fetchKanbanStatuses } from './crmService';
import emailCampaignService from './emailCampaignService';
import { validateCNPJ } from '@/utils/validation';

export interface Socio {
  nome: string;
  qualificacao: string;
  paisOrigem?: string;
  nomeRepresentanteLegal?: string;
  qualificacaoRepresentanteLegal?: string;
  faixaEtaria?: string;
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
  qsa: Socio[];
  origem: 'CNPJ' | 'CNAE' | 'GOOGLE_MAPS' | 'GEMINI_AI';
  googleMapsUrl?: string;
  website?: string;
  socialMediaUrl?: string;
  rating?: number;
  userRatingsTotal?: number;
  leadImported?: boolean;
  scoreConversao?: number;
  motivoConversao?: string;
  clientePotencial?: boolean;
  emailContabilidadeDescartado?: boolean;
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

export interface ProspectionFilters {
  tipoBusca: 'CNPJ' | 'CNAE' | 'MAPS';
  cnpj?: string;
  cnae?: string;
  uf?: string;
  municipio?: string;
  termoBusca?: string;
  raioKm?: number;
}

// Lista curada de CNAEs estratégicos organizada por Setores (Indústria, Comercial, Agro, Condomínios, Saúde, etc.)
export interface StrategicCnae {
  codigo: string;
  label: string;
  setor: 'TODOS' | 'AGRO' | 'INDUSTRIA' | 'COMERCIO' | 'SEGURANCA' | 'FACILITIES' | 'SAUDE' | 'LOGISTICA';
}

export const STRATEGIC_CNAES: StrategicCnae[] = [
  // Geral
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
   * Consulta dados completos de um CNPJ com fallback entre BrasilAPI e ReceitaWS
   */
  async searchByCnpj(cnpjRaw: string): Promise<ProspectCompany> {
    const cleanCnpj = cnpjRaw.replace(/\D/g, '');
    if (cleanCnpj.length !== 14) {
      throw new Error('CNPJ deve conter 14 dígitos numéricos.');
    }

    try {
      // 1. Tentar BrasilAPI v2
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
      if (res.ok) {
        const data = await res.json();
        return this.mapBrasilApiToProspect(data);
      }
    } catch (err) {
      console.warn('BrasilAPI indisponível ou falhou, tentando fallback ReceitaWS...', err);
    }

    try {
      // 2. Fallback: ReceitaWS JSONP ou endpoint livre
      const res2 = await fetch(`https://minhareceita.org/${cleanCnpj}`);
      if (res2.ok) {
        const data2 = await res2.json();
        return this.mapMinhaReceitaToProspect(data2);
      }
    } catch (err2) {
      console.warn('MinhaReceita indisponível, tentando proxy backend...', err2);
    }

    // 3. Fallback: API do backend se configurada
    try {
      const { data } = await api.get(`/prospection/cnpj/${cleanCnpj}`);
      return data;
    } catch {
      throw new Error(`Não foi possível localizar os dados para o CNPJ ${cnpjRaw}. Verifique o número digitado.`);
    }
  }

  /**
   * Mapeamento de resposta da BrasilAPI
   */
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
      cnpj: data.cnpj,
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

  /**
   * Mapeamento de resposta do MinhaReceita
   */
  private mapMinhaReceitaToProspect(data: any): ProspectCompany {
    const qsa: Socio[] = Array.isArray(data.qsa)
      ? data.qsa.map((s: any) => ({
          nome: s.nome_socio || '',
          qualificacao: s.qualificacao_socio || 'Sócio / Administrador',
          faixaEtaria: s.faixa_etaria,
        }))
      : [];

    return {
      cnpj: data.cnpj,
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
          const rawEmail = (item.email || '').toLowerCase().trim();
          const isContabil = isAccountingContact(rawEmail, item.razaoSocial || item.nomeFantasia);
          const sanitizedEmail = isContabil ? '' : rawEmail;

          // Se tiver CNPJ válido, formata; se for string vazia ou inválida, não coloca CNPJ mockado
          const rawCnpj = (item.cnpj || '').replace(/\D/g, '');
          const cleanCnpj = rawCnpj.length === 14 ? item.cnpj : '';

          // Monta link do Google Maps caso não venha pronto
          const mapsQuery = encodeURIComponent(`${item.nomeFantasia || item.razaoSocial} ${cidade} ${uf}`);
          const mapsUrl = item.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;

          return {
            cnpj: cleanCnpj,
            razaoSocial: item.razaoSocial || item.nomeFantasia,
            nomeFantasia: item.nomeFantasia || item.razaoSocial,
            situacaoCadastral: cleanCnpj ? 'ATIVA' : 'VERIFICAR NA RECEITA',
            cnaePrincipal: item.cnaeDescricao ? { codigo: item.cnaeCodigo || '', descricao: item.cnaeDescricao } : undefined,
            logradouro: item.logradouro || '',
            bairro: item.bairro || '',
            municipio: item.municipio || cidade,
            uf: item.uf || uf,
            telefone: item.telefone || '',
            email: sanitizedEmail,
            emailContabilidadeDescartado: isContabil,
            googleMapsUrl: mapsUrl,
            website: item.website || '',
            socialMediaUrl: item.socialMediaUrl || '',
            clientePotencial: item.clientePotencial !== undefined ? Boolean(item.clientePotencial) : true,
            scoreConversao: item.scoreConversao || 85,
            motivoConversao: item.motivoConversao || 'Demanda contínua por controle de acesso, portaria e segurança patrimonial.',
            qsa: Array.isArray(item.qsa) ? item.qsa : [],
            origem: 'GEMINI_AI',
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
    // Validação estrita de CNPJ real (dígitos verificadores oficiais)
    if (!company.cnpj || !validateCNPJ(company.cnpj)) {
      throw new Error(`Não é possível enviar para o CRM: O CNPJ "${company.cnpj || 'não informado'}" não é um documento oficial válido com dígitos verificadores da Receita Federal.`);
    }

    // 1. Identificar o tomador de decisão preferencial (1º sócio administrador ou o próprio nome fantasia)
    const decisor = company.qsa.length > 0 ? company.qsa[0] : null;
    const contactName = decisor?.nome || company.nomeFantasia || company.razaoSocial;
    const contactPosition = decisor?.qualificacao || 'Diretoria / Compras';

    // Montar descrição rica com dados de inteligência cadastral
    const sociosDesc = company.qsa.length > 0
      ? `\n\nQuadro Societário (QSA):\n` + company.qsa.map(s => `- ${s.nome} (${s.qualificacao})`).join('\n')
      : '';

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
      phone: company.telefone || company.telefoneSecundario || '',
      email: company.email || '',
      source: 'OTHER',
      status: 'NEW',
      description: `[PROSPECÇÃO ATIVA IA]\nCNPJ: ${company.cnpj}\nNome Fantasia: ${company.nomeFantasia || '-'}\nCNAE: ${company.cnaePrincipal?.codigo || ''} - ${company.cnaePrincipal?.descricao || ''}\nPorte: ${company.porte || '-'}\nSituação: ${company.situacaoCadastral}\nEndereço: ${enderecoDesc}${sociosDesc}`,
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
          description: `Novo lead qualificado via Prospecção Comercial.\nSegmento: ${company.cnaePrincipal?.descricao || 'Segurança / Serviços'}\nContato: ${contactName} (${contactPosition})`,
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
    if (!company.email) {
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
      email: company.email,
      name: company.qsa[0]?.nome || company.nomeFantasia || company.razaoSocial,
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
      const exists = (fullList.recipients || []).some(r => r.email.toLowerCase() === company.email?.toLowerCase());
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
  getWhatsAppLink(phone: string, company: ProspectCompany): string {
    const cleanPhone = phone.replace(/\D/g, '');
    const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const decisorNome = company.qsa.length > 0 ? company.qsa[0].nome : '';
    const saudacaoNome = decisorNome ? `Olá, ${decisorNome}!` : 'Olá!';

    const msg = encodeURIComponent(
      `${saudacaoNome} Tudo bem?\n\nMe chamo especialista de novos negócios da Secured Guard. Notamos o destaque da ${company.nomeFantasia || company.razaoSocial} em ${company.municipio}/${company.uf} e gostaria de apresentar nossas soluções integradas em segurança patrimonial, portaria e facilities.\n\nVocê teria 5 minutos para uma conversa rápida nesta semana?`
    );

    return `https://wa.me/${fullPhone}?text=${msg}`;
  }

  /**
   * Obtém o status de configuração das chaves de IA e ferramentas (Google Places / Maps)
   */
  async getCredentialsStatus(): Promise<{
    geminiConfigured: boolean;
    geminiMaskedKey: string;
    model: string;
    googlePlacesConfigured: boolean;
    googlePlacesMaskedKey: string;
  }> {
    const { data } = await api.get('/prospection/credentials');
    return data;
  }

  /**
   * Salva ou atualiza as chaves da IA Gemini e Google Places
   */
  async updateCredentials(payload: {
    geminiApiKey?: string;
    googlePlacesApiKey?: string;
    model?: string;
  }): Promise<any> {
    const { data } = await api.post('/prospection/credentials', payload);
    return data;
  }
}

export const prospectionService = new ProspectionService();
export default prospectionService;
