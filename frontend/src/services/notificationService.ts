import api from '@/lib/axios';

export interface NotificationData {
  id: string;
  tipo: 'novo_cliente' | 'contrato_vencendo' | 'funcionario_atrasado' | 'ocorrencia' | 'escala' | 'advertencia' | 'novo_contrato' | 'lead_novo' | 'proposta_enviada' | 'orcamento_aprovado';
  titulo: string;
  descricao: string;
  prioridade: 'alta' | 'media' | 'baixa';
  timestamp: string;
  lida: boolean;
  destinatario?: string;
  funcionario?: string;
  numeroAdvertencia?: number;
  cliente?: string;
  contrato?: string;
  valor?: number;
  departamento?: string;
}

export interface EmailNotification {
  to: string;
  subject: string;
  body: string;
  priority: 'alta' | 'media' | 'baixa';
}

export interface DepartamentoConfig {
  operacional: string;
  pessoal: string;
  rh: string;
  financeiro: string;
}

export interface CreateNotificationRequest {
  tipo: 'novo_cliente' | 'contrato_vencendo' | 'funcionario_atrasado' | 'ocorrencia' | 'escala' | 'advertencia' | 'novo_contrato' | 'lead_novo' | 'proposta_enviada' | 'orcamento_aprovado';
  titulo: string;
  descricao: string;
  prioridade: 'alta' | 'media' | 'baixa';
  destinatario?: string;
  funcionario?: string;
  numeroAdvertencia?: number;
  cliente?: string;
  contrato?: string;
  valor?: number;
  departamento?: string;
}

type BackendNotification = {
  id?: string;
  title?: string;
  message?: string;
  titulo?: string;
  descricao?: string;
  type?: string;
  tipo?: string;
  status?: string;
  prioridade?: NotificationData['prioridade'];
  createdAt?: string;
  timestamp?: string;
  lida?: boolean;
};

function mapBackendNotification(raw: BackendNotification): NotificationData {
  const status = raw.status ?? (raw.lida ? 'READ' : 'UNREAD');
  const backendType = (raw.type ?? raw.tipo ?? 'INFO').toUpperCase();

  const tipoByBackendType: Record<string, NotificationData['tipo']> = {
    SCHEDULE: 'escala',
    SYSTEM: 'novo_cliente',
    WARNING: 'contrato_vencendo',
    ERROR: 'ocorrencia',
    INFO: 'ocorrencia',
    TIME_RECORD: 'funcionario_atrasado',
    EVALUATION: 'advertencia',
    BENEFIT: 'novo_contrato',
  };

  const prioridadeByBackendType: Record<string, NotificationData['prioridade']> = {
    ERROR: 'alta',
    WARNING: 'media',
    SYSTEM: 'media',
    SCHEDULE: 'baixa',
    INFO: 'baixa',
  };

  return {
    id: String(raw.id ?? ''),
    titulo: raw.titulo ?? raw.title ?? 'Notificação',
    descricao: raw.descricao ?? raw.message ?? '',
    tipo: tipoByBackendType[backendType] ?? 'ocorrencia',
    prioridade: raw.prioridade ?? prioridadeByBackendType[backendType] ?? 'media',
    timestamp: raw.timestamp ?? raw.createdAt ?? new Date().toISOString(),
    lida: status === 'READ' || raw.lida === true,
  };
}

class NotificationService {
  // Configuração padrão dos departamentos
  private departamentos: DepartamentoConfig = {
    operacional: 'operacional@empresa.com',
    pessoal: 'pessoal@empresa.com',
    rh: 'rh@empresa.com',
    financeiro: 'financeiro@empresa.com'
  };

  // Carregar configuração dos departamentos
  loadDepartamentosConfig(): DepartamentoConfig {
    const saved = localStorage.getItem('departamentosConfig');
    if (saved) {
      this.departamentos = { ...this.departamentos, ...JSON.parse(saved) };
    }
    return this.departamentos;
  }

  // Salvar configuração dos departamentos
  saveDepartamentosConfig(config: DepartamentoConfig): void {
    this.departamentos = config;
    localStorage.setItem('departamentosConfig', JSON.stringify(config));
  }

  // Enviar notificação por email
  async sendEmailNotification(emailData: EmailNotification): Promise<void> {
    try {
      await api.post('/notifications/email', emailData);
    } catch (error) {
      console.error('Erro ao enviar email:', error);
      throw error;
    }
  }

  // Criar notificação no painel
  async createPanelNotification(notificationData: NotificationData): Promise<NotificationData> {
    try {
      const response = await api.post('/notifications/panel', notificationData);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar notificação no painel:', error);
      throw error;
    }
  }

  // Notificar supervisor sobre 3 advertências
  async notifySupervisorAboutAdvertencias(
    funcionario: string, 
    numeroAdvertencia: number,
    supervisorEmail: string = 'supervisor.operacional@empresa.com'
  ): Promise<void> {
    const emailData: EmailNotification = {
      to: supervisorEmail,
      subject: `ALERTA: Funcionário ${funcionario} atingiu ${numeroAdvertencia} advertências!`,
      body: `
        <h2>ALERTA DE ADVERTÊNCIAS</h2>
        <p><strong>Funcionário:</strong> ${funcionario}</p>
        <p><strong>Número de Advertências:</strong> ${numeroAdvertencia}</p>
        <p><strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
        <p><strong>Hora:</strong> ${new Date().toLocaleTimeString('pt-BR')}</p>
        
        <h3>Ação Necessária:</h3>
        <p>O funcionário ${funcionario} atingiu ${numeroAdvertencia} advertências. 
        É necessária intervenção imediata do supervisor de Operacional.</p>
        
        <h3>Próximos Passos:</h3>
        <ul>
          <li>Revisar histórico de advertências do funcionário</li>
          <li>Agendar reunião disciplinar</li>
          <li>Definir medidas corretivas</li>
          <li>Documentar ações tomadas</li>
        </ul>
        
        <p><strong>Este é um alerta automático do sistema Promover.</strong></p>
      `,
      priority: 'alta'
    };

    const panelNotification: NotificationData = {
      id: Date.now().toString(),
      tipo: 'advertencia',
      titulo: `ALERTA: Funcionário ${funcionario} atingiu ${numeroAdvertencia} advertências!`,
      descricao: `O funcionário ${funcionario} recebeu sua ${numeroAdvertencia}ª advertência. Necessária intervenção do supervisor de Operacional.`,
      prioridade: 'alta',
      timestamp: new Date().toISOString(),
      lida: false,
      destinatario: supervisorEmail,
      funcionario: funcionario,
      numeroAdvertencia: numeroAdvertencia
    };

    try {
      await Promise.all([
        this.sendEmailNotification(emailData),
        this.createPanelNotification(panelNotification)
      ]);
    } catch (error) {
      console.error('Erro ao notificar supervisor:', error);
      throw error;
    }
  }

  // Notificar departamentos sobre novo contrato
  async notifyDepartamentosAboutNewContract(
    cliente: string,
    contrato: string,
    valor: number,
    dataInicio: string,
    dataFim: string
  ): Promise<void> {
    const config = this.loadDepartamentosConfig();
    const dataFormatada = new Date().toLocaleDateString('pt-BR');
    const valorFormatado = valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const notificacoes = [
      {
        departamento: 'operacional',
        email: config.operacional,
        titulo: 'Novo Contrato - Ação Operacional Necessária',
        descricao: `Novo contrato registrado para ${cliente}. Necessário planejamento operacional e alocação de equipe.`,
        prioridade: 'alta' as const,
        acoes: [
          'Analisar requisitos de segurança',
          'Definir equipe necessária',
          'Planejar escalas de trabalho',
          'Configurar equipamentos'
        ]
      },
      {
        departamento: 'pessoal',
        email: config.pessoal,
        titulo: 'Novo Contrato - Gestão de Pessoal',
        descricao: `Novo contrato registrado para ${cliente}. Necessária análise de recursos humanos.`,
        prioridade: 'media' as const,
        acoes: [
          'Verificar disponibilidade de funcionários',
          'Analisar necessidade de contratações',
          'Planejar treinamentos específicos',
          'Revisar políticas de segurança'
        ]
      },
      {
        departamento: 'rh',
        email: config.rh,
        titulo: 'Novo Contrato - Recursos Humanos',
        descricao: `Novo contrato registrado para ${cliente}. Necessária análise de RH e compliance.`,
        prioridade: 'media' as const,
        acoes: [
          'Verificar compliance trabalhista',
          'Analisar benefícios necessários',
          'Revisar políticas de segurança',
          'Planejar treinamentos'
        ]
      },
      {
        departamento: 'financeiro',
        email: config.financeiro,
        titulo: 'Novo Contrato - Gestão Financeira',
        descricao: `Novo contrato registrado para ${cliente}. Necessária análise financeira e contábil.`,
        prioridade: 'alta' as const,
        acoes: [
          'Configurar faturamento',
          'Analisar fluxo de caixa',
          'Definir cronograma de pagamentos',
          'Revisar impostos e taxas'
        ]
      }
    ];

    const promises = notificacoes.map(async (notif) => {
      const emailData: EmailNotification = {
        to: notif.email,
        subject: notif.titulo,
        body: `
          <h2>${notif.titulo}</h2>
          <p><strong>Cliente:</strong> ${cliente}</p>
          <p><strong>Contrato:</strong> ${contrato}</p>
          <p><strong>Valor:</strong> ${valorFormatado}</p>
          <p><strong>Data de Início:</strong> ${new Date(dataInicio).toLocaleDateString('pt-BR')}</p>
          <p><strong>Data de Fim:</strong> ${new Date(dataFim).toLocaleDateString('pt-BR')}</p>
          <p><strong>Data do Registro:</strong> ${dataFormatada}</p>
          
          <h3>Descrição:</h3>
          <p>${notif.descricao}</p>
          
          <h3>Ações Necessárias:</h3>
          <ul>
            ${notif.acoes.map(acao => `<li>${acao}</li>`).join('')}
          </ul>
          
          <h3>Próximos Passos:</h3>
          <ol>
            <li>Acesse o sistema Promover</li>
            <li>Navegue até o módulo correspondente</li>
            <li>Analise os detalhes do contrato</li>
            <li>Execute as ações necessárias</li>
            <li>Atualize o status no sistema</li>
          </ol>
          
          <p><strong>Este é um alerta automático do sistema Promover.</strong></p>
        `,
        priority: notif.prioridade
      };

      const panelNotification: NotificationData = {
        id: Date.now().toString() + Math.random(),
        tipo: 'novo_contrato',
        titulo: notif.titulo,
        descricao: notif.descricao,
        prioridade: notif.prioridade,
        timestamp: new Date().toISOString(),
        lida: false,
        destinatario: notif.email,
        cliente: cliente,
        contrato: contrato,
        valor: valor,
        departamento: notif.departamento
      };

      return Promise.all([
        this.sendEmailNotification(emailData),
        this.createPanelNotification(panelNotification)
      ]);
    });

    try {
      await Promise.all(promises);
    } catch (error) {
      console.error('Erro ao notificar departamentos:', error);
      throw error;
    }
  }

  // Notificar sobre novo lead
  async notifyNewLead(
    lead: string,
    valorEstimado: number,
    responsavel: string
  ): Promise<void> {
    const emailData: EmailNotification = {
      to: 'comercial@empresa.com',
      subject: `Novo Lead: ${lead}`,
      body: `
        <h2>Novo Lead Registrado</h2>
        <p><strong>Lead:</strong> ${lead}</p>
        <p><strong>Valor Estimado:</strong> ${valorEstimado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
        <p><strong>Responsável:</strong> ${responsavel}</p>
        <p><strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
        
        <h3>Ações Necessárias:</h3>
        <ul>
          <li>Contatar o lead</li>
          <li>Agendar reunião</li>
          <li>Preparar proposta comercial</li>
          <li>Definir estratégia de abordagem</li>
        </ul>
        
        <p><strong>Este é um alerta automático do sistema Promover.</strong></p>
      `,
      priority: 'media'
    };

    const panelNotification: NotificationData = {
      id: Date.now().toString(),
      tipo: 'lead_novo',
      titulo: `Novo Lead: ${lead}`,
      descricao: `Lead registrado com valor estimado de ${valorEstimado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}. Responsável: ${responsavel}`,
      prioridade: 'media',
      timestamp: new Date().toISOString(),
      lida: false,
      cliente: lead,
      valor: valorEstimado
    };

    try {
      await Promise.all([
        this.sendEmailNotification(emailData),
        this.createPanelNotification(panelNotification)
      ]);
    } catch (error) {
      console.error('Erro ao notificar sobre novo lead:', error);
      throw error;
    }
  }

  // Notificar sobre proposta enviada
  async notifyProposalSent(
    cliente: string,
    valor: number,
    responsavel: string
  ): Promise<void> {
    const emailData: EmailNotification = {
      to: 'comercial@empresa.com',
      subject: `Proposta Enviada: ${cliente}`,
      body: `
        <h2>Proposta Enviada</h2>
        <p><strong>Cliente:</strong> ${cliente}</p>
        <p><strong>Valor:</strong> ${valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
        <p><strong>Responsável:</strong> ${responsavel}</p>
        <p><strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
        
        <h3>Próximos Passos:</h3>
        <ul>
          <li>Acompanhar retorno do cliente</li>
          <li>Agendar follow-up</li>
          <li>Preparar contraproposta se necessário</li>
          <li>Documentar interações</li>
        </ul>
        
        <p><strong>Este é um alerta automático do sistema Promover.</strong></p>
      `,
      priority: 'media'
    };

    const panelNotification: NotificationData = {
      id: Date.now().toString(),
      tipo: 'proposta_enviada',
      titulo: `Proposta Enviada: ${cliente}`,
      descricao: `Proposta no valor de ${valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} enviada para ${cliente}. Responsável: ${responsavel}`,
      prioridade: 'media',
      timestamp: new Date().toISOString(),
      lida: false,
      cliente: cliente,
      valor: valor
    };

    try {
      await Promise.all([
        this.sendEmailNotification(emailData),
        this.createPanelNotification(panelNotification)
      ]);
    } catch (error) {
      console.error('Erro ao notificar sobre proposta:', error);
      throw error;
    }
  }

  // Buscar notificações do painel
  async getPanelNotifications(): Promise<NotificationData[]> {
    try {
      const response = await api.get('/notifications/panel');
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
      throw error;
    }
  }

  // Buscar todas as notificações (alias para getPanelNotifications)
  async getAllNotifications(): Promise<NotificationData[]> {
    try {
      console.log('🔗 Buscando notificações no backend');
      const response = await api.get('/notifications');
      const items = Array.isArray(response.data) ? response.data : [];
      console.log('✅ Notificações carregadas do backend:', items.length);
      return items.map((item: BackendNotification) => mapBackendNotification(item));
    } catch (error) {
      console.error('❌ Erro ao buscar notificações:', error);
      throw new Error('Falha ao conectar com o servidor de notificações');
    }
  }

  // Marcar notificação como lida
  async markAsRead(notificationId: string): Promise<void> {
    try {
      await api.put(`/notifications/${notificationId}/read`);
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
      throw error;
    }
  }

  // Marcar todas as notificações como lidas
  async markAllAsRead(notifications: NotificationData[]): Promise<void> {
    const unread = notifications.filter((n) => !n.lida);
    await Promise.all(unread.map((n) => this.markAsRead(n.id)));
  }

  // Excluir notificação
  async deleteNotification(notificationId: string): Promise<void> {
    try {
      await api.delete(`/notifications/${notificationId}`);
    } catch (error) {
      console.error('Erro ao excluir notificação:', error);
      throw error;
    }
  }

  // Criar nova notificação
    async createNotification(notificationData: CreateNotificationRequest): Promise<NotificationData> {
    const response = await api.post('/notifications', notificationData);
    return response.data;
  }

  /**
   * Notifica aprovadores quando o Almoxarifado cria uma nova Requisição de Compra.
   * Envia notificação in-app para cada aprovador + email best-effort.
   */
  async notifyNewPurchaseRequest(params: {
    requesterName: string;
    title: string;
    quantity?: number;
    category?: string;
  }): Promise<void> {
    const APPROVER_ROLES = [
      'SUPRIMENTOS', 'ANALISTA_SUPRIMENTOS', 'ADMIN', 'SUPER_ADMIN',
      'GESTOR', 'GESTOR_OPERACIONAL', 'FINANCEIRO',
    ];

    try {
      // Importação dinâmica para evitar circular dependency
      const { userService: us } = await import('@/services/userService');
      const allUsers = await us.getAllUsers();

      const approverUsers = allUsers.filter(u =>
        u.active &&
        u.roles.some(r => APPROVER_ROLES.includes(r.replace(/^ROLE_/, '').toUpperCase()))
      );

      if (approverUsers.length === 0) return;

      const titulo = `🛒 Nova Requisição de Compra — ${params.title}`;
      const descricao = `${params.requesterName} (Almoxarifado) criou uma nova requisição de compra.` +
        (params.quantity ? ` Quantidade: ${params.quantity}.` : '') +
        (params.category ? ` Categoria: ${params.category}.` : '') +
        ` Acesse o módulo de Compras para analisar e aprovar.`;

      const panelPromises = approverUsers.map(u =>
        api.post('/api/notifications', {
          titulo,
          descricao,
          tipo: 'nova_requisicao_compra',
          prioridade: 'alta',
          destinatarioId: u.id,
          destinatario: u.email,
        }).catch(() => { /* best-effort */ })
      );

      const emailPromises = approverUsers
        .filter(u => u.email)
        .map(u =>
          this.sendEmailNotification({
            to: u.email,
            subject: titulo,
            body: `
              <h2>Nova Requisição de Compra</h2>
              <p><strong>Solicitante:</strong> ${params.requesterName} (Almoxarifado)</p>
              <p><strong>Item:</strong> ${params.title}</p>
              ${params.quantity ? `<p><strong>Quantidade:</strong> ${params.quantity}</p>` : ''}
              ${params.category ? `<p><strong>Categoria:</strong> ${params.category}</p>` : ''}
              <br/>
              <p>Acesse o sistema Promover &rarr; Compras &rarr; Requisições para analisar e aprovar.</p>
              <p><em>Notificação automática do sistema Promover.</em></p>
            `,
            priority: 'alta',
          }).catch(() => { /* best-effort */ })
        );

      await Promise.allSettled([...panelPromises, ...emailPromises]);
    } catch (error) {
      console.warn('[notifyNewPurchaseRequest] Notificação falhou (non-blocking):', error);
    }
  }
}

export const notificationService = new NotificationService(); 