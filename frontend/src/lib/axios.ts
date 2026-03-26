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
    let tokenSource = tokenKey;
    
    // Se não encontrou ou está vazio, tentar outras chaves comuns
    if (!token || token.trim() === '') {
      token = localStorage.getItem('token');
      if (token && token.trim() !== '') {
        tokenSource = 'token';
      }
    }
    if (!token || token.trim() === '') {
      token = localStorage.getItem('authToken');
      if (token && token.trim() !== '') {
        tokenSource = 'authToken';
      }
    }
    
    // Verificar se o token não é 'fake-token' ou inválido
    if (token && token.trim() !== '' && token !== 'fake-token') {
      config.headers.Authorization = `Bearer ${token}`;
      if (isDebugMode()) {
        console.log('🔗 Token adicionado ao header:', token.substring(0, 50) + '...');
        console.log('🔗 Token encontrado em:', tokenSource);
      }
    } else {
      if (isDebugMode()) {
        console.log('🔗 Nenhum token válido encontrado no localStorage');
        console.log('🔗 Chaves disponíveis:', Object.keys(localStorage));
        console.log('🔗 Tentando buscar token em:', tokenKey);
        // Debug: mostrar valores de todas as chaves possíveis
        const allKeys = ['token', 'authToken', tokenKey];
        allKeys.forEach(key => {
          const value = localStorage.getItem(key);
          if (value) {
            console.log(`🔍 Chave "${key}":`, value.substring(0, 30) + '...', '(válido:', value !== 'fake-token' && value.trim() !== '', ')');
          }
        });
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
      if (error?.code === 'ERR_TOO_MANY_REDIRECTS' || error?.message?.includes('too many redirects')) {
        console.warn('⚠️ Loop de redirecionamento na API (proxy/nginx ou URL base incorreta):', apiUrl);
        console.warn('⚠️ URL da requisição:', error.config?.url);
        console.warn('⚠️ Método:', error.config?.method);
        console.warn('⚠️ Em CI use getApiUrl() = /api (mesmo host). Verifique nginx: proxy_redirect off; e X-Forwarded-*');
      } else {
        console.warn('⚠️ Backend não está disponível:', apiUrl);
        console.warn('⚠️ Verifique se o backend está rodando na porta correta');
      }
      return Promise.reject(createConnectionError(apiUrl));
    }
    
    // Tratamento específico para erro 522 (Cloudflare timeout) com retry automático
    if (error.response?.status === 522) {
      const originalRequest = error.config;
      const retryCount = (originalRequest as any).__retryCount || 0;
      const maxRetries = 3;
      
      if (retryCount < maxRetries) {
        (originalRequest as any).__retryCount = retryCount + 1;
        const delay = Math.min(1000 * Math.pow(2, retryCount), 5000); // Backoff exponencial: 1s, 2s, 4s
        
        console.warn(`⚠️ Erro 522 (tentativa ${retryCount + 1}/${maxRetries}). Aguardando ${delay}ms antes de tentar novamente...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Tentar novamente a requisição
        return api(originalRequest);
      } else {
        const apiUrl = error.config?.baseURL || getApiUrl();
        console.error('❌ Erro 522: Timeout do servidor (Cloudflare) após', maxRetries, 'tentativas');
        console.error('❌ O servidor de origem não está respondendo:', apiUrl);
        console.error('❌ Isso geralmente indica que o servidor está sobrecarregado ou inacessível');
        
        // Criar erro customizado para erro 522
        const error522 = new Error('O servidor está temporariamente indisponível. Por favor, tente novamente em alguns instantes.');
        (error522 as any).is522Error = true;
        (error522 as any).isConnectionError = true;
        (error522 as any).status = 522;
        return Promise.reject(error522);
      }
    }
    
    if (isDebugMode()) {
      console.error('❌ Axios Response Error:', error.response?.status, error.config?.url);
      console.error('❌ Error details:', error.response?.data);
    }
    const originalRequest = error.config;

    // Se o erro for 401 (não autorizado - token inválido/expirado)
    if (error.response?.status === 401 && !originalRequest._retry) {
      const tokenKey = import.meta.env.VITE_TOKEN_KEY || 'token';
      const refreshTokenKey = import.meta.env.VITE_REFRESH_TOKEN_KEY || 'refreshToken';
      const userKey = import.meta.env.VITE_USER_KEY || 'user';
      
      const token = localStorage.getItem(tokenKey) || localStorage.getItem('token') || localStorage.getItem('authToken');
      
      console.group('🔐 Axios 401 Unauthorized');
      console.log('🔗 URL:', originalRequest.url);
      console.log('📦 Token Key:', tokenKey);
      console.log('🎫 Possui Token:', !!token);
      
      if (!token || token.trim() === '' || token === 'fake-token') {
        console.error('❌ Token inválido ou não encontrado. Limpando armazenamento e redirecionando...');
        
        // Limpa TODOS os possíveis nomes de chaves para evitar loops
        const keysToRemove = [tokenKey, refreshTokenKey, userKey, 'token', 'refreshToken', 'user', 'authToken', 'secured_guard_token'];
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        console.log('🧹 Armazenamento limpo. Redirecionando para /login...');
        console.groupEnd();
        
        // Pequeno atraso para garantir que o localStorage.removeItem persistiu
        setTimeout(() => {
          window.location.href = '/login';
        }, 50);
        
        return Promise.reject(error);
      }
      
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem(refreshTokenKey) || localStorage.getItem('refreshToken');
        
        if (!refreshToken) {
          console.error('❌ Refresh token não encontrado. Fazendo logout...');
          const keysToRemove = [tokenKey, refreshTokenKey, userKey, 'token', 'refreshToken', 'user', 'authToken'];
          keysToRemove.forEach(key => localStorage.removeItem(key));
          console.groupEnd();
          window.location.href = '/login';
          return Promise.reject(error);
        }

        console.log('🔄 Tentando renovar token...');
        // Tenta renovar o token
        const response = await axios.post(`${import.meta.env.VITE_API_URL || '/api'}/auth/refresh-token`, {
          refreshToken
        });

        const { token: newToken, refreshToken: newRefreshToken } = response.data;

        // Atualiza os tokens
        localStorage.setItem(tokenKey, newToken);
        localStorage.setItem(refreshTokenKey, newRefreshToken);

        console.log('✅ Token renovado com sucesso!');
        console.groupEnd();

        // Atualiza o header da requisição original
        originalRequest.headers.Authorization = `Bearer ${newToken}`;

        // Repete a requisição original
        return api(originalRequest);
      } catch (refreshError) {
        console.error('❌ Erro ao renovar token. Fazendo logout compulsório...', refreshError);
        const keysToRemove = [tokenKey, refreshTokenKey, userKey, 'token', 'refreshToken', 'user', 'authToken'];
        keysToRemove.forEach(key => localStorage.removeItem(key));
        console.groupEnd();
        
        setTimeout(() => {
          window.location.href = '/login';
        }, 50);
        
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api; 