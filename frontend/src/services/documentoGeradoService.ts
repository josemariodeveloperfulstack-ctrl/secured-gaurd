import api from '@/lib/axios';

export enum StatusDocumento {
  PENDENTE = 'PENDENTE',
  ASSINADO = 'ASSINADO',
  CANCELADO = 'CANCELADO',
  VENCIDO = 'VENCIDO'
}

/**
 * Categorias de documentos gerados pelo sistema (templates fixos).
 * Espelha o enum {@code TipoDocumentoGerado} no backend.
 */
export enum TipoDocumentoGerado {
  EMPLOYMENT_CONTRACT = 'EMPLOYMENT_CONTRACT',
  DECLARATION = 'DECLARATION',
  LGPD_CONSENT = 'LGPD_CONSENT',
  TRANSPORT_VOUCHER = 'TRANSPORT_VOUCHER',
  DISCIPLINARY_WARNING = 'DISCIPLINARY_WARNING',
  EQUIPMENT_RESPONSIBILITY = 'EQUIPMENT_RESPONSIBILITY',
  EQUIPMENT_RESPONSIBILITY_SPECIFIC = 'EQUIPMENT_RESPONSIBILITY_SPECIFIC',
  DAMAGE_FINES_RESPONSIBILITY = 'DAMAGE_FINES_RESPONSIBILITY',
  BODY_CAM_RESPONSIBILITY = 'BODY_CAM_RESPONSIBILITY',
  SERVICE_PROVIDER_AWARENESS = 'SERVICE_PROVIDER_AWARENESS',
  VALE_GOLDEN_RULES = 'VALE_GOLDEN_RULES',
  TOXICOLOGICAL_TEST_AUTH = 'TOXICOLOGICAL_TEST_AUTH',
  SERVICE_ORDER = 'SERVICE_ORDER',
  NPPS = 'NPPS',
  EPI_DELIVERY = 'EPI_DELIVERY',
  ACTIVITY_REPORT = 'ACTIVITY_REPORT',
  ACCOUNTING_FORM = 'ACCOUNTING_FORM',
  EMPLOYEE_RECORD = 'EMPLOYEE_RECORD',
  EMPLOYEE_HISTORY = 'EMPLOYEE_HISTORY',
  VISIT_CONTROL_REPORT = 'VISIT_CONTROL_REPORT',
  VEHICLE_MAINTENANCE_REPORT = 'VEHICLE_MAINTENANCE_REPORT',
  TRANSPORT_GUIDE = 'TRANSPORT_GUIDE',
  SCHEDULE_REPORT = 'SCHEDULE_REPORT',
  RELOCATION_REPORT = 'RELOCATION_REPORT',
  OPERATIONAL_OCCURRENCE_REPORT = 'OPERATIONAL_OCCURRENCE_REPORT',
  FUEL_RECORD_REPORT = 'FUEL_RECORD_REPORT',
  FINE_REPORT = 'FINE_REPORT',
  ADMISSION_REQUEST = 'ADMISSION_REQUEST',
  OTHER = 'OTHER',
}

/** Rótulos amigáveis em pt-BR para exibição no frontend. */
export const TIPO_DOCUMENTO_GERADO_LABEL: Record<TipoDocumentoGerado, string> = {
  [TipoDocumentoGerado.EMPLOYMENT_CONTRACT]: 'Contrato de Trabalho',
  [TipoDocumentoGerado.DECLARATION]: 'Declaração',
  [TipoDocumentoGerado.LGPD_CONSENT]: 'Termo de Proteção de Dados – LGPD (VIG)',
  [TipoDocumentoGerado.TRANSPORT_VOUCHER]: 'Termo de Vale-Transporte',
  [TipoDocumentoGerado.DISCIPLINARY_WARNING]: 'Advertência Disciplinar',
  [TipoDocumentoGerado.EQUIPMENT_RESPONSIBILITY]: 'Termo de Responsabilidade (Equipamento)',
  [TipoDocumentoGerado.EQUIPMENT_RESPONSIBILITY_SPECIFIC]: 'Termo de Responsabilidade Específico',
  [TipoDocumentoGerado.DAMAGE_FINES_RESPONSIBILITY]: 'Termo de Responsabilidade por Danos e Multas',
  [TipoDocumentoGerado.BODY_CAM_RESPONSIBILITY]: 'Termo de Body Cam',
  [TipoDocumentoGerado.SERVICE_PROVIDER_AWARENESS]: 'Termo de Ciência (Prestador)',
  [TipoDocumentoGerado.VALE_GOLDEN_RULES]: 'Regras de Ouro da Vale',
  [TipoDocumentoGerado.TOXICOLOGICAL_TEST_AUTH]: 'Autorização para Teste Toxicológico',
  [TipoDocumentoGerado.SERVICE_ORDER]: 'Ordem de Serviço',
  [TipoDocumentoGerado.NPPS]: 'NPPS',
  [TipoDocumentoGerado.EPI_DELIVERY]: 'Ficha de Entrega de EPI',
  [TipoDocumentoGerado.ACTIVITY_REPORT]: 'Relatório de Atividade',
  [TipoDocumentoGerado.ACCOUNTING_FORM]: 'Ficha de Contabilidade',
  [TipoDocumentoGerado.EMPLOYEE_RECORD]: 'Ficha de Registro do Funcionário',
  [TipoDocumentoGerado.EMPLOYEE_HISTORY]: 'Histórico do Funcionário',
  [TipoDocumentoGerado.VISIT_CONTROL_REPORT]: 'Relatório de Controle de Visitas',
  [TipoDocumentoGerado.VEHICLE_MAINTENANCE_REPORT]: 'Relatório de Manutenção de Veículos',
  [TipoDocumentoGerado.TRANSPORT_GUIDE]: 'Guia de Transporte',
  [TipoDocumentoGerado.SCHEDULE_REPORT]: 'Relatório de Escala',
  [TipoDocumentoGerado.RELOCATION_REPORT]: 'Relatório de Remanejamento',
  [TipoDocumentoGerado.OPERATIONAL_OCCURRENCE_REPORT]: 'Relatório de Ocorrência Operacional',
  [TipoDocumentoGerado.FUEL_RECORD_REPORT]: 'Relatório de Abastecimento',
  [TipoDocumentoGerado.FINE_REPORT]: 'Relatório de Multas',
  [TipoDocumentoGerado.ADMISSION_REQUEST]: 'Requisição de Admissão',
  [TipoDocumentoGerado.OTHER]: 'Outro Documento',
};

export function getTipoDocumentoGeradoLabel(tipo?: TipoDocumentoGerado | string): string {
  if (tipo && Object.prototype.hasOwnProperty.call(TIPO_DOCUMENTO_GERADO_LABEL, tipo)) {
    return TIPO_DOCUMENTO_GERADO_LABEL[tipo as TipoDocumentoGerado];
  }
  return TIPO_DOCUMENTO_GERADO_LABEL[TipoDocumentoGerado.OTHER];
}

export interface DocumentoGerado {
  id: string;
  modeloId?: string;
  tipo?: TipoDocumentoGerado;
  funcionarioId: string;
  conteudoFinal?: string;
  nomeArquivoGerado: string;
  tamanhoArquivoGerado?: number;
  status: StatusDocumento;
  dataCriacao: string;
  dataAssinatura?: string;
  dataVencimento?: string;
}

function normalizeApiDate(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value) && value.length >= 3) {
    const [year, month, day, hour = 0, minute = 0, second = 0] = value as number[];
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:${pad(second)}`;
  }
  return new Date().toISOString();
}

export const documentoGeradoService = {
  async gerarDocumento(payload: {
    modeloId: string;
    funcionarioId: string;
    dadosPreenchidos: Record<string, any>;
  }): Promise<DocumentoGerado> {
    const response = await api.post('/api/documentos-gerados/gerar', payload);
    return response.data;
  },

  async listarPorFuncionario(funcionarioId: string): Promise<DocumentoGerado[]> {
    if (!funcionarioId?.trim()) {
      return [];
    }
    try {
      const response = await api.get(`/api/documentos-gerados/funcionario/${funcionarioId}`);
      const raw = Array.isArray(response.data) ? response.data : [];
      return raw.map((doc: Record<string, unknown>) => ({
        id: String(doc.id),
        modeloId: doc.modeloId != null ? String(doc.modeloId) : undefined,
        tipo: doc.tipo as DocumentoGerado['tipo'],
        funcionarioId: String(doc.funcionarioId ?? funcionarioId),
        conteudoFinal: doc.conteudoFinal as string | undefined,
        nomeArquivoGerado: String(doc.nomeArquivoGerado ?? 'documento.pdf'),
        tamanhoArquivoGerado: doc.tamanhoArquivoGerado as number | undefined,
        status: doc.status as DocumentoGerado['status'],
        dataCriacao: normalizeApiDate(doc.dataCriacao),
        dataAssinatura: doc.dataAssinatura ? normalizeApiDate(doc.dataAssinatura) : undefined,
        dataVencimento: doc.dataVencimento ? normalizeApiDate(doc.dataVencimento) : undefined,
      }));
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        return [];
      }
      throw error;
    }
  },

  /**
   * Lista os documentos gerados a partir de templates fixos do sistema,
   * filtrando por funcionário e tipo (ex: EMPLOYMENT_CONTRACT).
   */
  async listarPorFuncionarioETipo(
    funcionarioId: string,
    tipo: TipoDocumentoGerado,
  ): Promise<DocumentoGerado[]> {
    const response = await api.get(
      `/api/documentos-gerados/funcionario/${funcionarioId}/tipo/${tipo}`,
    );
    return response.data;
  },

  /**
   * Lista todos os documentos do usuário logado.
   * Usado pelo Dashboard do Colaborador.
   */
  async listarMeus(): Promise<DocumentoGerado[]> {
    const response = await api.get('/api/documentos-gerados/meus');
    return response.data;
  },

  async assinarDocumento(id: string): Promise<DocumentoGerado> {
    const response = await api.post(`/api/documentos-gerados/${id}/assinar`);
    return response.data;
  },

  async downloadArquivo(id: string): Promise<Blob> {
    const response = await api.get(`/api/documentos-gerados/${id}/download`, {
      responseType: 'blob'
    });
    return response.data;
  },

  async excluirDocumento(id: string): Promise<void> {
    await api.delete(`/api/documentos-gerados/${id}`);
  }
};
