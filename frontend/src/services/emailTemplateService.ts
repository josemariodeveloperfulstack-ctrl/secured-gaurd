import api from '@/lib/axios';

export interface EmailTemplate {
  id: string;
  code: string | null;
  name: string;
  subject: string;
  htmlBody: string;
  description: string | null;
  variables: string[];
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EmailTemplatePayload {
  code?: string | null;
  name: string;
  subject: string;
  htmlBody: string;
  description?: string | null;
  variables?: string[];
  isActive?: boolean;
}

class EmailTemplateService {
  async list(activeOnly = false): Promise<EmailTemplate[]> {
    const { data } = await api.get<EmailTemplate[]>('/api/v1/email-templates', {
      params: { activeOnly },
    });
    return data;
  }

  async get(id: string): Promise<EmailTemplate> {
    const { data } = await api.get<EmailTemplate>(`/api/v1/email-templates/${id}`);
    return data;
  }

  async create(payload: EmailTemplatePayload): Promise<EmailTemplate> {
    const { data } = await api.post<EmailTemplate>('/api/v1/email-templates', payload);
    return data;
  }

  async update(id: string, payload: EmailTemplatePayload): Promise<EmailTemplate> {
    const { data } = await api.put<EmailTemplate>(`/api/v1/email-templates/${id}`, payload);
    return data;
  }

  async remove(id: string): Promise<void> {
    await api.delete(`/api/v1/email-templates/${id}`);
  }
}

const emailTemplateService = new EmailTemplateService();
export default emailTemplateService;

/** Lista canônica de variáveis sugeridas para os templates. */
export const SUGGESTED_VARIABLES: { key: string; label: string; description: string }[] = [
  { key: 'nomeContato', label: 'Nome do contato', description: 'Nome do destinatário (Lead.name)' },
  { key: 'email', label: 'E-mail', description: 'Endereço do destinatário' },
  { key: 'nomeEmpresa', label: 'Nome da empresa', description: 'Empresa do contato (Lead.company)' },
  { key: 'cargo', label: 'Cargo', description: 'Cargo do contato (Lead.position)' },
  { key: 'telefone', label: 'Telefone', description: 'Telefone fixo (Lead.phone)' },
  { key: 'celular', label: 'Celular', description: 'Celular (Lead.mobile)' },
  { key: 'ctaUrl', label: 'URL da CTA', description: 'Link principal de chamada para ação' },
  { key: 'unsubscribeUrl', label: 'URL de descadastro', description: 'Link de cancelamento de inscrição' },
  { key: 'brandLogoUrl', label: 'URL da logomarca', description: 'Injetada pelo sistema (imagem pública)' },
  { key: 'brandBannerUrl', label: 'URL do banner hero', description: 'Injetada pelo sistema (imagem pública)' },
  { key: 'whatsappUrl', label: 'URL WhatsApp', description: 'Injetada pelo sistema (wa.me)' },
];
