import api from '@/lib/axios';

export interface CriticalityItem {
  id: string;
  componente: string;
  tipoFalha: string;
  nivel: 'CRITICO' | 'TOLERAVEL' | 'BAIXO';
  acao: string;
  icone: string;
}

export const CRITICALITY_MATRIX_ITEMS: CriticalityItem[] = [
  {
    id: 'pneus',
    componente: 'Pneus',
    tipoFalha: 'Carecas (abaixo do TWI), bolhas ou estepe furado',
    nivel: 'CRITICO',
    acao: 'Bloqueio Imediato (Viatura Baixada)',
    icone: 'Disc',
  },
  {
    id: 'freios',
    componente: 'Freios',
    tipoFalha: 'Pedal mole, ruído metálico áspero ou luz de freio queimada',
    nivel: 'CRITICO',
    acao: 'Bloqueio Imediato (Viatura Baixada)',
    icone: 'ShieldAlert',
  },
  {
    id: 'sinalizacao',
    componente: 'Sinalização Sonora / Visual',
    tipoFalha: 'Giroflex queimado ou sirene inoperante',
    nivel: 'CRITICO',
    acao: 'Bloqueio Imediato (Viatura Baixada)',
    icone: 'Siren',
  },
  {
    id: 'iluminacao',
    componente: 'Iluminação',
    tipoFalha: 'Farol baixo queimado ou setas dianteiras/traseiras sem funcionar',
    nivel: 'CRITICO',
    acao: 'Bloqueio Imediato (Viatura Baixada)',
    icone: 'Lightbulb',
  },
  {
    id: 'documentacao',
    componente: 'Documentação',
    tipoFalha: 'CRLV vencido ou ausente no veículo',
    nivel: 'CRITICO',
    acao: 'Bloqueio Imediato (Viatura Baixada)',
    icone: 'FileText',
  },
  {
    id: 'fluidos',
    componente: 'Fluídos do Motor',
    tipoFalha: 'Vazamento visível de óleo no chão ou nível de água zerado',
    nivel: 'CRITICO',
    acao: 'Bloqueio Imediato (Viatura Baixada)',
    icone: 'Droplet',
  },
  {
    id: 'funilaria',
    componente: 'Funilaria',
    tipoFalha: 'Parachoque solto ou retrovisor quebrado/trincado',
    nivel: 'TOLERAVEL',
    acao: 'Tolerável (Reparo Programado)',
    icone: 'Car',
  },
  {
    id: 'ar_condicionado',
    componente: 'Ar Condicionado',
    tipoFalha: 'Não gela ou comandos travados',
    nivel: 'TOLERAVEL',
    acao: 'Tolerável (Manutenção de Conforto)',
    icone: 'Wind',
  },
  {
    id: 'estetica',
    componente: 'Estética & Adesivagem',
    tipoFalha: 'Riscos na pintura ou adesivo tático levemente desgastado',
    nivel: 'BAIXO',
    acao: 'Baixa Prioridade (Monitoramento)',
    icone: 'Sparkles',
  },
];

export const vehicleCriticalityService = {
  async downloadPdf(): Promise<Blob> {
    const response = await api.get('/api/vehicle-criticality/pdf', {
      responseType: 'blob',
    });
    return response.data;
  },
};
