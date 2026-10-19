import api from '@/lib/axios';
import leadService, { CreateLeadRequest, Lead } from './leadService';
import { createOpportunity, fetchKanbanStatuses } from './crmService';
import emailCampaignService from './emailCampaignService';

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
  rating?: number;
  userRatingsTotal?: number;
  leadImported?: boolean;
  importedLeadId?: string | number;
  scoreConversao?: number;
  motivoConversao?: string;
}

export interface ProspectionFilters {
  tipoBusca: 'CNPJ' | 'CNAE' | 'MAPS';
  cnpj?: string;
  cnae?: string;
  uf?: string;
  municipio?: string;
  termoBusca?: string;
  raioKm?: number;
}

// Lista curada de CNAEs estratégicos para segurança, condomínios, eventos, etc.
export const STRATEGIC_CNAES = [
  { codigo: '8011-1/01', label: '8011-1/01 - Atividades de vigilância e segurança privada' },
  { codigo: '8012-0/00', label: '8012-0/00 - Atividades de transporte de valores' },
  { codigo: '8020-0/01', label: '8020-0/01 - Atividades de monitoramento de sistemas de segurança eletrônico' },
  { codigo: '8112-5/00', label: '8112-5/00 - Condomínios prediais' },
  { codigo: '8111-7/00', label: '8111-7/00 - Serviços combinados para apoio a edifícios (Facilities)' },
  { codigo: '8121-4/00', label: '8121-4/00 - Limpeza em prédios e em domicílios' },
  { codigo: '8299-7/99', label: '8299-7/99 - Outras atividades de serviços prestados a empresas' },
  { codigo: '5211-7/99', label: '5211-7/99 - Depósitos de mercadorias para terceiros / Armazéns' },
  { codigo: '8230-0/01', label: '8230-0/01 - Serviços de organização de feiras, congressos e eventos' },
  { codigo: '8610-1/01', label: '8610-1/01 - Atividades de atendimento hospitalar' },
  { codigo: '4120-4/00', label: '4120-4/00 - Construção de edifícios' },
  { codigo: '4711-3/01', label: '4711-3/01 - Hipermercados e supermercados' },
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
      const { data } = await api.get(`/api/prospection/cnpj/${cleanCnpj}`);
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
      email: data.email?.toLowerCase() || '',
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

  /**
   * Busca e qualificação inteligente de prospectos via IA Gemini
   */
  async searchWithAi(cidade: string, uf: string, segmento?: string, quantidade = 8): Promise<ProspectCompany[]> {
    try {
      const params = new URLSearchParams();
      if (cidade) params.append('cidade', cidade);
      if (uf) params.append('uf', uf);
      if (segmento) params.append('segmento', segmento);
      params.append('quantidade', String(quantidade));

      const { data } = await api.get<any[]>(`/api/prospection/ai-search?${params.toString()}`);
      if (Array.isArray(data)) {
        return data.map((item: any) => ({
          cnpj: item.cnpj || '00.000.000/0001-00',
          razaoSocial: item.razaoSocial || item.nomeFantasia,
          nomeFantasia: item.nomeFantasia || item.razaoSocial,
          situacaoCadastral: 'ATIVA',
          cnaePrincipal: item.cnaeDescricao ? { codigo: 'CNAE-IA', descricao: item.cnaeDescricao } : undefined,
          logradouro: item.logradouro || '',
          bairro: item.bairro || '',
          municipio: item.municipio || cidade,
          uf: item.uf || uf,
          telefone: item.telefone || '',
          email: item.email || '',
          scoreConversao: item.scoreConversao || 80,
          motivoConversao: item.motivoConversao || 'Necessidade contínua de controle de acesso e segurança patrimonial.',
          qsa: Array.isArray(item.qsa) ? item.qsa : [],
          origem: 'GEMINI_AI',
        }));
      }
      return [];
    } catch (err: any) {
      console.error('Erro na prospecção com IA Gemini:', err);
      throw new Error(err.response?.data?.message || err.message || 'Falha ao executar prospecção com IA.');
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
      source: 'PROSPECTION',
      status: 'NEW',
      description: `[PROSPECÇÃO COMERCIAL]\nCNPJ: ${company.cnpj}\nNome Fantasia: ${company.nomeFantasia || '-'}\nCNAE: ${company.cnaePrincipal?.codigo || ''} - ${company.cnaePrincipal?.descricao || ''}\nPorte: ${company.porte || '-'}\nSituação: ${company.situacaoCadastral}\nEndereço: ${enderecoDesc}${sociosDesc}`,
      assignedToId: assignedUserId,
    };

    const createdLead = await leadService.createLead(leadPayload);

    // 2. Criar automaticamente a Oportunidade no primeiro estágio do funil Kanban
    try {
      const statuses = await fetchKanbanStatuses();
      const firstStatus = Array.isArray(statuses) && statuses.length > 0
        ? statuses.sort((a: any, b: any) => (a.orderIndex || 0) - (b.orderIndex || 0))[0]
        : null;

      if (firstStatus) {
        await createOpportunity({
          title: `Prospecção: ${company.nomeFantasia || company.razaoSocial}`,
          description: `Novo lead qualificado via Prospecção Comercial.\nSegmento: ${company.cnaePrincipal?.descricao || 'Segurança / Serviços'}\nContato: ${contactName} (${contactPosition})`,
          statusId: firstStatus.id,
          leadId: createdLead.id,
          priority: 'MEDIUM',
          value: company.capitalSocial && company.capitalSocial > 500000 ? 15000 : 5000,
          probability: 20,
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
}

export const prospectionService = new ProspectionService();
export default prospectionService;
