/**
 * Templates NR-01 por cargo para Ordem de Serviço.
 * Conteúdo pré-preenchido conforme PDR da empresa; editável no formulário antes de gerar o PDF.
 */

export type OsLayoutType = 'STANDARD_NR01' | 'BOMBEIRO_CIVIL';

export interface OrdemServicoSafetyTemplate {
  id: string;
  layoutType: OsLayoutType;
  /** Palavras-chave no nome do cargo (match genérico) */
  matchKeywords: string[];
  label: string;
  responsibility?: string;
  /** Tipo de serviço padrão recomendado para este cargo/template */
  defaultServiceType?: string;
  /** Uma obrigação por linha; quando informado, substitui a lista padrão no PDF */
  employeeObligations?: string;
  /** Título da seção de EPI/uniforme no PDF (padrão: UNIFORME DE USO OBRIGATÓRIO) */
  uniformSectionTitle?: string;
  activities: string;
  risks: string;
  preventiveMeasures: string;
  uniform: string;
  mandatoryTrainings: string;
  accidentProcedure?: string;
}

export interface OrdemServicoTemplateContext {
  positionName?: string | null;
  companyName?: string | null;
  companySigla?: string | null;
  sector?: string | null;
  clientName?: string | null;
}

const NR01_TRAININGS =
  "- Treinamento de Ambientação de Segurança do Trabalho. (SIM)\n- DSS – Diálogo de Segurança e Saúde Ocupacional.\n- Treinamento sobre aspectos legais e técnicos no uso e conservação de EPI's.";

const NR01_PREVENTIVE = '- Adoção de medidas de proteção em ordem: coletivas e individuais.';

/** Templates com regra de empresa/setor (prioridade sobre match só por cargo) */
const CONTEXTUAL_TEMPLATES: Record<string, OrdemServicoSafetyTemplate> = {
  'vigia-csn': {
    id: 'vigia-csn',
    layoutType: 'STANDARD_NR01',
    matchKeywords: [],
    label: 'Vigia (CSN)',
    activities:
      'Fiscalizar, observar e orientar a entrada e saída de pessoas, receber, identificar e encaminhar as pessoas aos destinatários. Abrir e fechar as dependências de prédios. Receber a correspondência e encaminhá-la ao protocolo. Atender e efetuar ligação telefônica.',
    risks: 'Riscos Ergonômicos: Postura inadequada.\nRiscos Mecânico: Queda do mesmo nível.',
    preventiveMeasures: NR01_PREVENTIVE,
    uniform:
      '- Calçado de segurança.\n- Uniforme completo (Calça, camisa, blusa, cinto).\n- Crachá de identificação.',
    mandatoryTrainings: NR01_TRAININGS,
  },
  'vigia-aterpa': {
    id: 'vigia-aterpa',
    layoutType: 'STANDARD_NR01',
    matchKeywords: [],
    label: 'Vigia (ATERPA)',
    activities:
      'Fiscalizar, observar e orientar a entrada e saída de pessoas, receber, identificar e encaminhar as pessoas aos destinatários. Abrir e fechar as dependências de prédios. Receber a correspondência e encaminhá-la ao protocolo. Atender e efetuar ligação telefônica.',
    risks: 'Riscos Ergonômicos: Postura inadequada.\nRiscos Mecânico: Queda do mesmo nível.',
    preventiveMeasures: NR01_PREVENTIVE,
    uniform:
      '- Calçado de segurança.\n- Uniforme completo (Calça, camisa, blusa, cinto).\n- Colete refletivo.\n- Protetor auricular.\n- Óculos de segurança.\n- Capacete com jugular.\n- Perneira.\n- Crachá de identificação.',
    mandatoryTrainings: NR01_TRAININGS,
  },
  vigia: {
    id: 'vigia',
    layoutType: 'STANDARD_NR01',
    matchKeywords: [],
    label: 'Vigia',
    activities:
      'Fiscalizar, observar e orientar a entrada e saída de pessoas, receber, identificar e encaminhar as pessoas aos destinatários. Abrir e fechar as dependências de prédios. Receber a correspondência e encaminhá-la ao protocolo. Atender e efetuar ligação telefônica.',
    risks: 'Riscos Ergonômicos: Postura inadequada.\nRiscos Mecânico: Queda do mesmo nível.',
    preventiveMeasures: NR01_PREVENTIVE,
    uniform:
      '- Calçado de segurança.\n- Uniforme completo (Calça, camisa, blusa, cinto).\n- Crachá de identificação.',
    mandatoryTrainings: NR01_TRAININGS,
  },
  porteiro: {
    id: 'porteiro',
    layoutType: 'STANDARD_NR01',
    matchKeywords: [],
    label: 'Porteiro',
    activities:
      'Observar e orientar a entrada e saída de pessoas, receber, identificar e encaminhar as pessoas aos destinatários. Abrir e fechar as dependências de prédios. Receber a correspondência e encaminhá-la ao protocolo. Atender e efetuar ligação telefônica.',
    risks: `Riscos Físico: Ruído; Radiação não-ionizante.
Riscos Ergonômico: Postura inadequada; Trabalho em pé; Monotonia.
Riscos Mecânico: Agressão; Queda do mesmo nível; Animais peçonhentos; Batidas-contra.
Riscos Biológico: Não evidenciado.`,
    preventiveMeasures: NR01_PREVENTIVE,
    uniform:
      '- Calçado de segurança.\n- Uniforme completo (Calça, camisa, blusa, cinto).\n- Crachá de identificação.',
    mandatoryTrainings: NR01_TRAININGS,
  },
  zelador: {
    id: 'zelador',
    layoutType: 'STANDARD_NR01',
    matchKeywords: [],
    label: 'Zelador',
    activities:
      'Realizar inspeções nas instalações do prédio, como em pátios, corredores e áreas comuns, a fim de verificar itens que precisam de reparos ou limpeza. Fazer pequenos reparos, além de observar as condições de funcionamento da parte elétrica e hidráulica, elevadores, entre outros.',
    risks: `Riscos Ergonômicos: Postura inadequada.
Riscos Mecânico: Batidas-contra; Queda do mesmo nível.
Riscos Físicos: Radiações não-ionizantes.`,
    preventiveMeasures: NR01_PREVENTIVE,
    uniform:
      '- Calçado de segurança.\n- Uniforme completo.\n- Crachá de identificação.',
    mandatoryTrainings: NR01_TRAININGS,
  },
  supervisor: {
    id: 'supervisor',
    layoutType: 'STANDARD_NR01',
    matchKeywords: [],
    label: 'Supervisor',
    responsibility: 'SUPERVISÃO OPERACIONAL',
    employeeObligations:
      'Comunicar todas as condições inseguras presentes no ambiente ao gestor responsável e adotar as medidas cabíveis para sua correção.\n' +
      'Cumprir e fazer cumprir todas as normas, procedimentos e orientações expedidas pelo Empregador, inclusive esta Ordem de Serviço.\n' +
      'Supervisionar, orientar e acompanhar a execução das atividades da equipe sob sua responsabilidade, garantindo o cumprimento dos procedimentos operacionais e de segurança.\n' +
      'Executar e coordenar as tarefas que lhe forem delegadas, assegurando que os colaboradores estejam devidamente treinados para sua realização.\n' +
      'Manter e promover a ordem, disciplina, higiene e segurança no ambiente de trabalho.\n' +
      'Participar e incentivar a participação da equipe em treinamentos relacionados à segurança patrimonial, segurança do trabalho e saúde ocupacional.\n' +
      'Utilizar obrigatoriamente os Equipamentos de Proteção Individual (EPIs) indicados para a função e fiscalizar sua correta utilização pela equipe.\n' +
      'Colaborar com a empresa na aplicação das Normas Regulamentadoras (NRs), do Programa de Gerenciamento de Riscos (PGR) e do Programa de Controle Médico de Saúde Ocupacional (PCMSO).\n' +
      'É responsabilidade do empregado utilizar, guardar, conservar e comunicar ao empregador qualquer alteração que torne impróprio o uso dos Equipamentos de Proteção Individual.\n' +
      'Realizar inspeções periódicas nos postos de serviço, registrando ocorrências e reportando situações de risco ou não conformidades.',
    uniformSectionTitle: 'EPI DE USO OBRIGATÓRIO',
    activities:
      'SUPERVISOR - CBO: 510310\n\n' +
      'Supervisiona e coordena as atividades da equipe de vigilância patrimonial, orientando e acompanhando a execução dos serviços de segurança. Fiscaliza postos de trabalho, verifica o cumprimento de normas, procedimentos e escalas de serviço, elabora relatórios de ocorrências, presta suporte operacional às equipes e clientes, realiza inspeções preventivas e atua na resolução de situações de risco. Zela pela segurança das pessoas, do patrimônio e pelo cumprimento das diretrizes da empresa e da legislação vigente, mantendo comunicação com colaboradores, clientes e órgãos competentes quando necessário.',
    risks:
      'Riscos Ergonômicos: Posturas inadequadas;\n' +
      'Riscos Físicos: Ruído; Monotonia e Agressão; Batidas contra; Queda do mesmo nível; Disparo acidental; Radiação não-ionizante.',
    preventiveMeasures:
      '- Treinamento Introdutório.\n- Adoção de medidas de proteção em ordem: coletivas e individuais.',
    uniform: '- Uniforme completo\n- CRACHÁ',
    mandatoryTrainings:
      '- Treinamento de Ambientação de Segurança do Trabalho;\n' +
      '- DSS – Diálogo de Segurança e Saúde Ocupacional;\n' +
      "- Treinamento sobre aspectos legais e técnicos no uso e conservação de EPI's.",
  },
  'auxiliar-administrativo': {
    id: 'auxiliar-administrativo',
    layoutType: 'STANDARD_NR01',
    matchKeywords: [],
    label: 'Auxiliar Administrativo',
    activities:
      'Atendimento telefônico interno, controle de chaves, distribuição de correspondências, arquivo e rotinas administrativas.',
    risks: 'Riscos Ergonômicos: Postura inadequada.',
    preventiveMeasures: NR01_PREVENTIVE,
    uniform: '- Calçado de segurança. (NA)\n- Uniforme completo.',
    mandatoryTrainings: NR01_TRAININGS,
  },
};

export const OS_SAFETY_TEMPLATES: OrdemServicoSafetyTemplate[] = [
  {
    id: 'bombeiro-civil',
    layoutType: 'STANDARD_NR01',
    matchKeywords: ['BOMBEIRO CIVIL', 'BOMBEIRO'],
    label: 'Bombeiro Civil',
    defaultServiceType: 'Bombeiro Civil',
    responsibility: 'PREVENÇÃO E COMBATE A INCÊNDIO / BOMBEIRO CIVIL',
    activities: `Avaliar os riscos através de inspeções e sugerir ações preventivas.
Inspecionar equipamentos de combate a incêndio (mangueiras, extintores, alarmes, bombas).
Testar sistemas de combate a incêndio.
Verificar rotas de fuga e sinalização de emergência.
Simular cenários de incêndio e evacuação.
Atuar de forma corretiva quando identificadas falhas.`,
    risks: `Físico: Temperaturas extremas (calor), Ruído, Radiação não ionizante.
Químico: Fumos (fumaça tóxica e gases de combustão), Gases e vapores, Líquidos inflamáveis (butano, propano).
Ergonômicos: Postura inadequada, Trabalho em pé/caminhando, Transporte manual de peso.
Mecânico/Acidente: Quedas (mesmo nível ou desnível), Perfurações/cortes, Projeção de materiais, Layout físico inadequado, Choque elétrico, Incêndio e explosão.`,
    preventiveMeasures: NR01_PREVENTIVE,
    uniform: `Capacete de combate a incêndio com viseira; Balaclava ignifuga; Óculos de segurança; Máscara facial para fumaça/gases; SCBA (autocontido); Filtros para gases tóxicos; Protetor auricular.
Luvas ignífugas e resistentes a cortes; Luvas de borracha para produtos químicos; Uniforme ignífugo (jaqueta e calça); Colete refletivo; Botas de segurança antiderrapantes ignífugas; Cinto de segurança tipo paraquedista; Lanterna portátil resistente; Rádio comunicador.`,
    mandatoryTrainings: `Treinamento de Ambientação de Segurança do Trabalho.
Adoção de medidas de proteção em ordem: coletivas e individuais.`,
    accidentProcedure: `1. Comunicar imediatamente ao Supervisor.
2. Encaminhar o acidentado ao Ambulatório Médico.
3. Preservar o local do acidente.
4. Acionar o Ambulatório Médico (telefone 192).
5. Comunicar ao Presidente da CIPA.`,
  },
  {
    id: 'auxiliar-almoxarifado',
    layoutType: 'STANDARD_NR01',
    matchKeywords: ['AUXILIAR DE ALMOXARIFADO', 'ALMOXARIFADO'],
    label: 'Auxiliar de Almoxarifado',
    activities:
      'Controla a movimentação de mercadorias em almoxarifado, recebendo, conferindo, armazenando e expedindo materiais, equipamentos e outros itens.',
    risks: 'Riscos Ergonômicos: Postura inadequada.\nRiscos Mecânico: Queda do mesmo nível.',
    preventiveMeasures: NR01_PREVENTIVE,
    uniform: '- Calçado de segurança.\n- Uniforme completo.\n- Crachá de identificação.',
    mandatoryTrainings: NR01_TRAININGS,
  },
  {
    id: 'auxiliar-servicos-gerais',
    layoutType: 'STANDARD_NR01',
    matchKeywords: ['AUXILIAR DE SERVIÇOS GERAIS', 'SERVIÇOS GERAIS', 'ASG'],
    label: 'Auxiliar de Serviços Gerais',
    responsibility: 'HIGIENIZAÇÃO E CONSERVAÇÃO DO LOCAL',
    activities:
      'Higienização e conservação do local (varrer o chão, limpar banheiros, remover o lixo), controle de materiais, organização do ambiente.',
    risks: `Riscos Ergonômicos: Postura inadequada.
Riscos Químicos: Hipoclorito de sódio.
Riscos Biológicos: Micro-organismos patogênicos.
Riscos Mecânico: Queda de mesmo nível.
Riscos Mecânico: Batidas-contra.
Riscos Físico: Não evidenciado.`,
    preventiveMeasures: NR01_PREVENTIVE,
    uniform:
      '- Calçado de segurança. (NA)\n- Luva de Látex\n- Protetor auricular\n- Óculos',
    mandatoryTrainings: NR01_TRAININGS,
  },
  {
    id: 'encarregada-limpeza',
    layoutType: 'STANDARD_NR01',
    matchKeywords: ['ENCARREGADA DE LIMPEZA', 'ENCARREGADO DE LIMPEZA'],
    label: 'Encarregado(a) de Limpeza',
    responsibility: 'HIGIENIZAÇÃO E CONSERVAÇÃO DO LOCAL',
    activities:
      'Responsável por zelar pela qualidade dos serviços de limpeza, cumprindo frequência, uso correto e econômico de equipamentos e materiais, e armazenamento adequado.',
    risks: `Riscos Ergonômicos: Postura inadequada.
Riscos Químicos: Hipoclorito de sódio.
Riscos Biológicos: Micro-organismos patogênicos.
Risco Mecânico: Queda de mesmo nível e Batidas-contra.
Risco Físico: Não evidenciado.`,
    preventiveMeasures: NR01_PREVENTIVE,
    uniform: '- Calçado de segurança. (NA)\n- Uniforme completo.',
    mandatoryTrainings: NR01_TRAININGS,
  },
  {
    id: 'auxiliar-limpeza',
    layoutType: 'STANDARD_NR01',
    matchKeywords: ['AUXILIAR DE LIMPEZA'],
    label: 'Auxiliar de Limpeza',
    responsibility: 'HIGIENIZAÇÃO E CONSERVAÇÃO DO LOCAL',
    activities:
      'Realizar a limpeza e conservação das dependências do cliente. Varrer, lavar, encerar, limpar vidros e janelas, recolher o lixo e repor materiais de higiene.',
    risks: `Riscos Químicos: Manuseio de produtos de limpeza.
Riscos Ergonômicos: Movimentos repetitivos.
Riscos de Acidentes: Quedas em piso escorregadio.`,
    preventiveMeasures:
      '- Uso de EPIs adequados (luvas, botas de borracha, óculos).\n- Sinalização de piso molhado.\n- Diluição correta de produtos químicos.',
    uniform: '- Uniforme padrão de limpeza.\n- Bota de borracha / calçado fechado antiderrapante.',
    mandatoryTrainings:
      '- Treinamento de manuseio de produtos químicos (FISPQ).\n- Uso e conservação de EPIs.\n- NR-32 (se aplicável a ambiente hospitalar).\n- DSS Semanal.',
  },
  {
    id: 'jardineiro',
    layoutType: 'STANDARD_NR01',
    matchKeywords: ['JARDINEIRO', 'JARDINAGEM'],
    label: 'Jardineiro',
    activities: `Preparar, conservar e limpar jardins, compreendendo: capina, corte, replantio, adubação periódica, irrigação, varredura, pulverização simples e polvilhamento. Preparar as sementes. Fazer a repicagem e o transplante das mudas, incluindo desmate, transporte e embalagem. Requisitar o material necessário ao trabalho.`,
    risks: 'Riscos Ergonômicos: Postura inadequada.\nRiscos Mecânico: Queda do mesmo nível.',
    preventiveMeasures: NR01_PREVENTIVE,
    uniform: '- Calçado de segurança.\n- Uniforme completo.\n- Crachá de identificação.',
    mandatoryTrainings: NR01_TRAININGS,
  },
  {
    id: 'controlador-acesso',
    layoutType: 'STANDARD_NR01',
    matchKeywords: ['CONTROLADOR DE ACESSO', 'CONTROLE DE ACESSO', 'CONTROLADOR'],
    label: 'Controlador de Acesso',
    responsibility: 'CONTROLE DE ACESSO',
    uniformSectionTitle: 'EPI DE USO OBRIGATÓRIO',
    activities:
      'Controlar o acesso de pessoas e veículos às dependências, identificando e conferindo credenciais; registrar entradas e saídas de visitantes, fornecedores e veículos; orientar e encaminhar visitantes aos destinatários; monitorar câmeras e sistemas de segurança do posto; atender chamadas telefônicas e comunicar ocorrências; manter a ordem e a segurança nas áreas de acesso.',
    risks: `Riscos Ergonômicos: Postura inadequada; Trabalho em pé; Monotonia.
Riscos Físicos: Ruído; Radiação não-ionizante.
Riscos Mecânico: Agressão; Queda do mesmo nível; Batidas-contra.`,
    preventiveMeasures: NR01_PREVENTIVE,
    uniform: '- Calçado de segurança.\n- Uniforme completo (Calça, camisa, blusa, cinto).\n- Crachá de identificação.',
    mandatoryTrainings: NR01_TRAININGS,
  },
  {
    id: 'recepcionista',
    layoutType: 'STANDARD_NR01',
    matchKeywords: ['RECEPCIONISTA'],
    label: 'Recepcionista',
    activities:
      'Recepcionar membros da comunidade e visitantes, identificá-los, averiguar pretensões, prestar informações e/ou encaminhá-los. Atender chamadas telefônicas, anotar recados e prestar informações.',
    risks: 'Riscos Ergonômicos: Postura inadequada.',
    preventiveMeasures: NR01_PREVENTIVE,
    uniform: '- Uniforme completo.',
    mandatoryTrainings: NR01_TRAININGS,
  },
  {
    id: 'vigilante',
    layoutType: 'STANDARD_NR01',
    matchKeywords: ['VIGILANTE', 'VIGILÂNCIA', 'VIGILANTE PATRIMONIAL', 'VIGILANTE FERISTA', 'VIG'],
    label: 'Vigilante (VIG)',
    responsibility: 'VIGILÂNCIA PATRIMONIAL',
    employeeObligations:
      'Comunicar todas as condições inseguras presentes no ambiente ao supervisor imediato;\n' +
      'Cumprir todas as normas expedidas pelo Empregador, inclusive esta ordem de serviço;\n' +
      'Executar as tarefas que lhe forem delegadas após treinamento específico para execução da mesma;\n' +
      'Manter a ordem, disciplina, higiene e segurança no trabalho;\n' +
      'Participar de treinamentos relacionados à segurança e saúde ocupacional;\n' +
      'Usar obrigatoriamente os Equipamentos de Proteção Individual indicado para a função;\n' +
      'Colaborar com a empresa na aplicação das Normas Regulamentadoras – NR\'s (PGR – PCMSO);\n' +
      'É responsabilidade do empregado usar, guardar, conservar, e comunicar ao empregador qualquer alteração que torne impróprio o uso do Equipamento de Proteção Individual.\n' +
      'É vedado o uso de máquinas fotográficas, tablets, celulares, etc. (de uso pessoal).',
    uniformSectionTitle: 'EPI DE USO OBRIGATÓRIO',
    activities:
      'Vigilante Patrimonial - CBO: 517330\n\n' +
      'Vigiam dependências com a finalidade de prevenir, controlar e combater delitos como porte indevido de armas e munições e outras irregularidades; zelam pela segurança das pessoas, do patrimônio e pelo cumprimento das leis e regulamentos; recepcionam e controlam a movimentação de pessoas em áreas de acesso livre e restrito; fiscalizam pessoas, cargas e patrimônio; escoltam pessoas e mercadorias. Controlam objetos e cargas; vigilam parques e reservas florestais, combatendo inclusive focos de incêndio. Comunicam-se através de rádio ou telefone e prestam informações ao público e aos órgãos competentes..',
    risks:
      'Ergonômicos: Posturas Inadequadas;\n' +
      'Físicos: Ruído; Monotonia e Agressão; Batidas contra; Queda do mesmo nível; Disparo acidental; Radiação não-ionizante.',
    preventiveMeasures:
      '- Treinamento introdutório.\n' +
      '- Adoção de medidas de proteção em ordem: coletivas e individuais.',
    uniform:
      '- Calçado de Segurança (Coturno)\n' +
      '- Uniforme completo (Camisa, Calça, Jaqueta, Colete e Cinto)',
    mandatoryTrainings:
      '- Treinamento de Ambientação de Segurança do Trabalho;\n' +
      '- DSS – Diálogo de Segurança e Saúde Ocupacional;\n' +
      '- Treinamento sobre aspectos legais e técnicos no uso e conservação de EPIs.',
  },
];

const normalizeText = (value: string) =>
  value
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

function buildContextHaystack(ctx: OrdemServicoTemplateContext): string {
  return normalizeText(
    [ctx.companyName, ctx.companySigla, ctx.sector, ctx.clientName].filter(Boolean).join(' '),
  );
}

function isVigiaCargo(positionNorm: string): boolean {
  if (positionNorm.includes('VIGILANTE') || positionNorm.includes('VIGILANCIA')) {
    return false;
  }
  return /\bVIGIA\b/.test(positionNorm) || positionNorm.includes('VIGIA ');
}

function isPorteiroCargo(positionNorm: string): boolean {
  return positionNorm.includes('PORTEIRO') || positionNorm.includes('PORTARIA');
}

function resolveContextualTemplate(ctx: OrdemServicoTemplateContext): OrdemServicoSafetyTemplate | null {
  const pos = normalizeText(ctx.positionName || '');
  if (!pos) return null;

  const haystack = buildContextHaystack(ctx);

  if (
    pos.includes('SUPERVISOR') ||
    pos.includes('SUPERVISAO') ||
    pos.includes('SUPERVISÃO')
  ) {
    return CONTEXTUAL_TEMPLATES.supervisor;
  }

  if (isPorteiroCargo(pos)) {
    return CONTEXTUAL_TEMPLATES.porteiro;
  }

  if (pos.includes('ZELADOR')) {
    return CONTEXTUAL_TEMPLATES.zelador;
  }

  if (pos.includes('AUXILIAR ADMINISTRATIVO') || pos.includes('AUX ADMINISTRATIVO')) {
    return CONTEXTUAL_TEMPLATES['auxiliar-administrativo'];
  }

  if (isVigiaCargo(pos)) {
    if (haystack.includes('ATERPA')) {
      return CONTEXTUAL_TEMPLATES['vigia-aterpa'];
    }
    if (haystack.includes('CSN')) {
      return CONTEXTUAL_TEMPLATES['vigia-csn'];
    }
    return CONTEXTUAL_TEMPLATES.vigia;
  }

  return null;
}

/** Retorna o template mais adequado (cargo + empresa/setor quando aplicável). */
export function findOrdemServicoTemplate(
  positionOrContext?: string | OrdemServicoTemplateContext | null,
): OrdemServicoSafetyTemplate | null {
  const ctx: OrdemServicoTemplateContext =
    typeof positionOrContext === 'string' || positionOrContext == null
      ? { positionName: positionOrContext }
      : positionOrContext;

  const contextual = resolveContextualTemplate(ctx);
  if (contextual) return contextual;

  const pos = normalizeText(ctx.positionName || '');
  if (!pos) return null;

  let best: OrdemServicoSafetyTemplate | null = null;
  let bestLen = 0;
  for (const tpl of OS_SAFETY_TEMPLATES) {
    for (const kw of tpl.matchKeywords) {
      const key = normalizeText(kw);
      if (pos.includes(key) && key.length > bestLen) {
        best = tpl;
        bestLen = key.length;
      }
    }
  }
  return best;
}

export function applyOrdemServicoTemplate(
  tpl: OrdemServicoSafetyTemplate,
  current: {
    serviceType?: string;
    responsibility?: string;
    employeeObligations?: string;
    uniformSectionTitle?: string;
    activities?: string;
    risks?: string;
    preventiveMeasures?: string;
    uniform?: string;
    mandatoryTrainings?: string;
    accidentProcedure?: string;
    layoutType?: string;
  },
  options?: { overwrite?: boolean },
): typeof current {
  const overwrite = options?.overwrite ?? true;
  const pick = (next: string, prev?: string) => (overwrite || !prev?.trim() ? next : prev);
  return {
    layoutType: tpl.layoutType,
    serviceType: tpl.defaultServiceType
      ? pick(tpl.defaultServiceType, current.serviceType)
      : current.serviceType,
    responsibility: tpl.responsibility
      ? pick(tpl.responsibility, current.responsibility)
      : current.responsibility,
    employeeObligations: tpl.employeeObligations
      ? pick(tpl.employeeObligations, current.employeeObligations)
      : current.employeeObligations,
    uniformSectionTitle: tpl.uniformSectionTitle
      ? pick(tpl.uniformSectionTitle, current.uniformSectionTitle)
      : current.uniformSectionTitle,
    activities: pick(tpl.activities, current.activities),
    risks: pick(tpl.risks, current.risks),
    preventiveMeasures: pick(tpl.preventiveMeasures, current.preventiveMeasures),
    uniform: pick(tpl.uniform, current.uniform),
    mandatoryTrainings: pick(tpl.mandatoryTrainings, current.mandatoryTrainings),
    accidentProcedure: tpl.accidentProcedure
      ? pick(tpl.accidentProcedure, current.accidentProcedure)
      : current.accidentProcedure,
  };
}

/**
 * Retorna lista de Tipos de Serviço ordenados por relevância com base no cargo,
 * template e atividades da Ordem de Serviço.
 */
export function resolveServiceTypesForContext(ctx: {
  positionName?: string | null;
  activities?: string | null;
  currentServiceType?: string | null;
  template?: OrdemServicoSafetyTemplate | null;
}): string[] {
  const normPos = normalizeText(ctx.positionName || '');
  const normAct = normalizeText(ctx.activities || '');
  const haystack = `${normPos} ${normAct}`;

  const recommended: string[] = [];

  // 1. Bombeiro Civil / Prevenção e Combate a Incêndio
  if (
    haystack.includes('BOMBEIRO') ||
    haystack.includes('INCENDIO') ||
    haystack.includes('EXTINTOR') ||
    haystack.includes('BRIGADA') ||
    haystack.includes('FOGO') ||
    haystack.includes('EVACUACAO') ||
    ctx.template?.id === 'bombeiro-civil' ||
    ctx.template?.layoutType === 'BOMBEIRO_CIVIL'
  ) {
    recommended.push(
      'Bombeiro Civil',
      'Prevenção e Combate a Incêndio',
      'Atendimento de Emergência',
      'Inspeção de Equipamentos de Incêndio',
      'Brigada de Incêndio',
      'Simulado e Evacuação',
    );
  }

  // 2. Vigilante / Segurança Privada
  if (
    haystack.includes('VIGILANTE') ||
    haystack.includes('VIGILANCIA') ||
    haystack.includes('ESCOLTA') ||
    haystack.includes('SEGURANCA PESSOAL')
  ) {
    recommended.push(
      'Vigilância Patrimonial',
      'Segurança Pessoal',
      'Escolta de Valores',
      'Ronda Ostensiva',
      'Controle de Acesso',
      'Monitoramento',
    );
  }

  // 3. Portaria / Porteiro
  if (haystack.includes('PORTEIRO') || haystack.includes('PORTARIA')) {
    recommended.push('Portaria', 'Controle de Acesso', 'Recepção', 'Monitoramento');
  }

  // 4. Controlador de Acesso
  if (haystack.includes('CONTROLADOR DE ACESSO') || haystack.includes('CONTROLE DE ACESSO')) {
    recommended.push('Controle de Acesso', 'Portaria', 'Recepção', 'Monitoramento');
  }

  // 5. Vigia
  if (haystack.includes('VIGIA')) {
    recommended.push('Vigia Patrimonial', 'Ronda', 'Controle de Acesso', 'Portaria');
  }

  // 6. Limpeza / ASG / Conservação / Zeladoria
  if (
    haystack.includes('LIMPEZA') ||
    haystack.includes('SERVICOS GERAIS') ||
    haystack.includes('ASG') ||
    haystack.includes('HIGIENIZACAO') ||
    haystack.includes('ZELADOR')
  ) {
    recommended.push('Limpeza e Conservação', 'Serviços Gerais', 'Higienização de Ambientes', 'Zeladoria');
  }

  // 7. Jardinagem
  if (haystack.includes('JARDIM') || haystack.includes('JARDINAGEM') || haystack.includes('JARDINEIRO')) {
    recommended.push('Jardinagem', 'Manutenção de Áreas Verdes', 'Serviços Gerais');
  }

  // 8. Recepção
  if (haystack.includes('RECEPCAO') || haystack.includes('RECEPCIONISTA')) {
    recommended.push('Recepção', 'Atendimento ao Público', 'Controle de Acesso');
  }

  // 9. Almoxarifado
  if (haystack.includes('ALMOXARIFADO') || haystack.includes('ESTOQUE')) {
    recommended.push('Almoxarifado', 'Controle de Estoque e Materiais');
  }

  // 10. Supervisão
  if (haystack.includes('SUPERVISOR') || haystack.includes('SUPERVISAO')) {
    recommended.push('Supervisão Operacional', 'Inspeção de Posto', 'Coordenação de Equipe');
  }

  // Catálogo completo padrão do sistema
  const defaultCatalog = [
    'Bombeiro Civil',
    'Vigilância Patrimonial',
    'Controle de Acesso',
    'Portaria',
    'Monitoramento',
    'Ronda',
    'Recepção',
    'Limpeza e Conservação',
    'Serviços Gerais',
    'Segurança Pessoal',
    'Escolta de Valores',
    'Jardinagem',
    'Almoxarifado',
    'Eventos',
    'Emergência',
  ];

  if (ctx.template?.defaultServiceType && !recommended.includes(ctx.template.defaultServiceType)) {
    recommended.unshift(ctx.template.defaultServiceType);
  }

  const result: string[] = [];
  const seen = new Set<string>();

  const add = (val?: string | null) => {
    if (!val) return;
    const clean = val.trim();
    if (!clean) return;
    const key = clean.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(clean);
    }
  };

  recommended.forEach(add);
  if (ctx.currentServiceType) add(ctx.currentServiceType);
  defaultCatalog.forEach(add);

  return result;
}
