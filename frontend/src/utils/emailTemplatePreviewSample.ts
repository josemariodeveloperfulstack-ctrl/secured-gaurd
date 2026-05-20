/** Valores de amostra para renderizar pré-visualização de templates (substitui {{variáveis}}). */
const BASE_SAMPLE: Record<string, string> = {
  nomeContato: 'Maria Silva',
  email: 'maria@empresa.com',
  nomeEmpresa: 'Empresa Exemplo Ltda.',
  cargo: 'Gerente de Compras',
  telefone: '(11) 4002-8922',
  celular: '(11) 99999-0000',
  ctaUrl: 'https://wa.me/5531998224451',
  solicitarApresentacaoUrl:
    'mailto:comercial@promovervigilancia.com.br?subject=Solicita%C3%A7%C3%A3o%20de%20apresenta%C3%A7%C3%A3o&body=Pr%C3%A9-visualiza%C3%A7%C3%A3o',
  unsubscribeUrl: 'https://exemplo.com/descadastrar',
};

function previewAssetsOrigin(): string {
  if (typeof window === 'undefined') {
    return import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, '') || 'http://localhost:3000';
  }
  return window.location.origin.replace(/\/$/, '');
}

/** Inclui URLs absolutas de imagens (mesma origem do Vite em dev = /email-marketing no public ou proxy). */
export function getEmailTemplatePreviewSample(): Record<string, string> {
  const base = previewAssetsOrigin();
  return {
    ...BASE_SAMPLE,
    brandLogoUrl: `${base}/email-marketing/promover-logo.png`,
    brandBannerUrl: `${base}/email-marketing/promover-hero-banner.png`,
    whatsappUrl: 'https://wa.me/5531998224451?text=Ol%C3%A1%2C%20sou%20Maria%20Silva',
  };
}
