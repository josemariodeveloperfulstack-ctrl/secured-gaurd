import api from '@/lib/axios';

export interface SmtpSettings {
  id: string;
  host: string;
  port: number;
  username: string | null;
  passwordSet: boolean;
  useTls: boolean | null;
  fromEmail: string;
  fromName: string | null;
  isActive: boolean | null;
  lastTestAt: string | null;
  lastTestOk: boolean | null;
  lastTestError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SmtpSettingsPayload {
  host: string;
  port: number;
  username?: string | null;
  /** Se vazio, mantém a senha já cadastrada. */
  password?: string | null;
  useTls?: boolean;
  fromEmail: string;
  fromName?: string | null;
  isActive?: boolean;
}

export interface SmtpTestPayload {
  to: string;
  subject?: string;
  body?: string;
}

class SmtpSettingsService {
  async getCurrent(): Promise<SmtpSettings | null> {
    const res = await api.get<SmtpSettings>('/api/v1/smtp-settings', {
      validateStatus: (s) => s === 200 || s === 204 || s === 404,
    });
    if (res.status === 200 && res.data) return res.data;
    return null;
  }

  async upsert(payload: SmtpSettingsPayload): Promise<SmtpSettings> {
    const { data } = await api.put<SmtpSettings>('/api/v1/smtp-settings', payload);
    return data;
  }

  async test(payload: SmtpTestPayload): Promise<SmtpSettings> {
    const { data } = await api.post<SmtpSettings>('/api/v1/smtp-settings/test', payload);
    return data;
  }

  async remove(): Promise<void> {
    await api.delete('/api/v1/smtp-settings');
  }
}

export default new SmtpSettingsService();
