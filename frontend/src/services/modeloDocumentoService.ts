import api from '@/lib/axios';

export interface ModeloDocumento {
  id: string;
  nomeModelo: string;
  categoria?: string;
  descricao?: string;
  conteudoTemplate?: string;
  tipoArquivo: 'HTML' | 'DOCX' | 'PDF';
  versao?: string;
  ativo: boolean;
  placeholders?: string[];
}

export const modeloDocumentoService = {
  async listarTodos(): Promise<ModeloDocumento[]> {
    const response = await api.get('/api/modelos-documentos');
    return response.data;
  },

  async buscarPorId(id: string): Promise<ModeloDocumento> {
    const response = await api.get(`/api/modelos-documentos/${id}`);
    return response.data;
  },

  async listarPorCategoria(categoria: string): Promise<ModeloDocumento[]> {
    const response = await api.get(`/api/modelos-documentos/categoria/${categoria}`);
    return response.data;
  },

  async listarCategorias(): Promise<string[]> {
    const response = await api.get('/api/modelos-documentos/categorias');
    return response.data;
  }
};
