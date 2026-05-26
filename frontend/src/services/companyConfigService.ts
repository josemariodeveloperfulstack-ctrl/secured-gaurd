import api from '@/lib/axios';

const API_BASE_URL = '/api/company-config';

export interface ContractTemplatePreviewRequest {
  companyId: string;
  companyConfigId?: string;
  headerText?: string;
  footerText?: string;
  contractTerms?: string;
}

export interface CompanyConfig {
  id?: string;
  companyId?: string;
  name: string;
  cnpj: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string;
  website?: string;
  logoUrl?: string;
  headerText?: string;
  footerText?: string;
  contractTerms?: string;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

class CompanyConfigService {
  /**
   * Lista todas as configurações de empresa (para seleção)
   */
  async getAllConfigs(): Promise<CompanyConfig[]> {
    try {
      const response = await api.get(`${API_BASE_URL}/all`);
      return response.data || [];
    } catch (error) {
      console.error('❌ Erro ao listar configurações:', error);
      return [];
    }
  }

  /**
   * Busca a configuração ativa da empresa
   */
  async getActiveConfig(): Promise<CompanyConfig | null> {
    try {
      console.log('🏢 Buscando configuração ativa da empresa...');
      const response = await api.get(`${API_BASE_URL}/active`);
      
      if (response.status === 204) {
        console.log('📝 Nenhuma configuração encontrada');
        return null;
      }
      
      console.log('✅ Configuração da empresa carregada:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao buscar configuração da empresa:', error);
      return null;
    }
  }

  /**
   * Verifica se existe configuração ativa
   */
  async hasActiveConfig(): Promise<boolean> {
    try {
      console.log('🔍 Verificando se existe configuração da empresa...');
      const response = await api.get(`${API_BASE_URL}/exists`);
      console.log('📊 Existe configuração:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao verificar configuração:', error);
      return false;
    }
  }

  /**
   * Salva ou atualiza configuração da empresa
   */
  async saveConfig(config: CompanyConfig): Promise<CompanyConfig> {
    try {
      console.log('💾 Salvando configuração da empresa:', config);
      const response = await api.post(API_BASE_URL, config);
      console.log('✅ Configuração salva com sucesso:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao salvar configuração:', error);
      if (error && typeof error === 'object' && 'response' in error && (error as any).response?.data) {
        const data = (error as any).response.data;
        if (data.fieldErrors && typeof data.fieldErrors === 'object') {
          const details = Object.entries(data.fieldErrors)
            .map(([field, msg]) => `${field}: ${msg}`)
            .join('; ');
          throw new Error(details || data.message || 'Erro ao salvar configuração');
        }
        throw new Error(data.message || 'Erro ao salvar configuração');
      }
      throw new Error('Erro interno do servidor');
    }
  }

  /**
   * Busca configuração por ID
   */
  async getConfigById(id: string): Promise<CompanyConfig | null> {
    try {
      console.log('🔍 Buscando configuração por ID:', id);
      const response = await api.get(`${API_BASE_URL}/${id}`);
      console.log('✅ Configuração encontrada:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao buscar configuração por ID:', error);
      return null;
    }
  }

  /**
   * Desativa uma configuração
   */
  async deactivateConfig(id: string): Promise<void> {
    try {
      console.log('🗑️ Desativando configuração:', id);
      await api.delete(`${API_BASE_URL}/${id}`);
      console.log('✅ Configuração desativada com sucesso');
    } catch (error) {
      console.error('❌ Erro ao desativar configuração:', error);
      throw new Error('Erro ao desativar configuração');
    }
  }

  /**
   * Gera PDF de preview do template de contrato com placeholders.
   * Retorna o blob do PDF para abrir em nova aba.
   */
  async generatePreviewPdf(request: ContractTemplatePreviewRequest): Promise<Blob> {
    const response = await api.post(`${API_BASE_URL}/preview-pdf`, request, {
      responseType: 'blob',
    });
    return response.data;
  }

  /**
   * Upload de logo da empresa
   */
  async uploadLogo(id: string, file: File): Promise<string> {
    try {
      console.log('📤 Fazendo upload do logo:', file.name);
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post(`${API_BASE_URL}/${id}/logo`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('✅ Logo enviado com sucesso:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao fazer upload do logo:', error);
      throw new Error('Erro ao fazer upload do logo');
    }
  }
}

export const companyConfigService = new CompanyConfigService();
