import axios from 'axios';
import { getApiUrl, isDebugMode } from '../config/environment';
import { isConnectionError, createConnectionError } from '../utils/connectionError';

const api = axios.create({
  baseURL: getApiUrl(),
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Normaliza URLs para evitar duplicação de "/api/api/..."
    try {
      const base = (config.baseURL || '').replace(/\/$/, '');
      let url = config.url || '';
      if (typeof url === 'string') {
        // Remove base duplicada: base termina com /api e url começa com /api
        if (base.endsWith('/api') && url.startsWith('/api/')) {
          url = url.substring(4); // remove prefixo '/api'
        }
        // Garante que URLs relativas comecem com '/'
        if (!url.startsWith('/')) {
          url = `/${url}`;
        }
        config.url = url;
      }
    } catch (_) {}

    if (isDebugMode()) {
      console.log('🔗 Axios Request:', config.method?.toUpperCase(), config.url);
      console.log('🔗 Base URL:', config.baseURL);
      console.log('🔗 Full URL:', config.baseURL + config.url);
    }
    
    // Tentar múltiplas chaves possíveis para o token
    const tokenKey = import.meta.env.VITE_TOKEN_KEY || 'token';
    let token = localStorage.getItem(tokenKey);
    
    // Se não encontrou, tentar outras chaves comuns
    if (!token) {
      token = localStorage.getItem('token');
    }
    if (!token) {
      token = localStorage.getItem('authToken');
    }
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      if (isDebugMode()) {
        console.log('🔗 Token adicionado ao header:', token.substring(0, 50) + '...');
      }
    } else {
      if (isDebugMode()) {
        console.log('🔗 Nenhum token encontrado no localStorage');
        console.log('🔗 Chaves disponíveis:', Object.keys(localStorage));
        console.log('🔗 Tentando buscar token em:', tokenKey);
      }
    }
    
    return config;
  },
  (error) => {
    console.error('❌ Erro no interceptor de requisição:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    if (isDebugMode()) {
      console.log('✅ Axios Response:', response.status, response.config.url);
    }
    return response;
  },
  async (error) => {
    // Tratamento especial para erros de conexão (backend não disponível)
    if (!error.response && isConnectionError(error)) {
      const apiUrl = error.config?.baseURL || getApiUrl();
      console.warn('⚠️ Backend não está disponível:', apiUrl);
      console.warn('⚠️ Verifique se o backend está rodando na porta correta');
      
      // Retornar erro customizado para que os componentes possam tratar
      return Promise.reject(createConnectionError(apiUrl));
    }
    
    if (isDebugMode()) {
      console.error('❌ Axios Response Error:', error.response?.status, error.config?.url);
      console.error('❌ Error details:', error.response?.data);
    }
    const originalRequest = error.config;

    // Se o erro for 401 (não autorizado - token inválido/expirado)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        
        const refreshToken = localStorage.getItem(import.meta.env.VITE_REFRESH_TOKEN_KEY || 'refreshToken');
        if (!refreshToken) {
          // Se não há refresh token, redirecionar para login
          console.error('❌ Refresh token não encontrado. Redirecionando para login...');
          localStorage.removeItem(import.meta.env.VITE_TOKEN_KEY || 'token');
          localStorage.removeItem(import.meta.env.VITE_REFRESH_TOKEN_KEY || 'refreshToken');
          localStorage.removeItem(import.meta.env.VITE_USER_KEY || 'user');
          window.location.href = '/login';
          return Promise.reject(error);
        }

        // Tenta renovar o token
        const response = await axios.post(`${import.meta.env.VITE_API_URL || '/api'}/auth/refresh-token`, {
          refreshToken
        });

        const { token: newToken, refreshToken: newRefreshToken } = response.data;

        // Atualiza os tokens
        localStorage.setItem(import.meta.env.VITE_TOKEN_KEY || 'token', newToken);
        localStorage.setItem(import.meta.env.VITE_REFRESH_TOKEN_KEY || 'refreshToken', newRefreshToken);

        // Atualiza o header da requisição original
        originalRequest.headers.Authorization = `Bearer ${newToken}`;

        // Repete a requisição original
        return api(originalRequest);
      } catch (refreshError) {
        // Se falhar ao renovar o token, faz logout
        console.error('❌ Erro ao renovar token. Fazendo logout...', refreshError);
        localStorage.removeItem(import.meta.env.VITE_TOKEN_KEY || 'token');
        localStorage.removeItem(import.meta.env.VITE_REFRESH_TOKEN_KEY || 'refreshToken');
        localStorage.removeItem(import.meta.env.VITE_USER_KEY || 'user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api; 