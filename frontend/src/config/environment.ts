/**
 * Sistema de detecção automática de ambiente
 * Detecta automaticamente se está rodando em:
 * - Desenvolvimento local (localhost)
 * - CI (ci.z7botsolutions.com.br)
 * - Produção (domínio principal)
 */

export interface EnvironmentConfig {
  name: string;
  apiUrl: string;
  wsUrl: string;
  debug: boolean;
  features: {
    notifications: boolean;
    chat: boolean;
    facialRecognition: boolean;
  };
}

/**
 * Detecta o ambiente atual baseado na URL
 */
export function detectEnvironment(): 'local' | 'ci' | 'dev' | 'test' | 'prod' {
  if (typeof window === 'undefined') {
    return 'local'; // SSR fallback
  }

  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  
  console.log('🔍 Detectando ambiente:', { hostname, protocol });

  // Ambiente CI
  if (hostname.includes('ci.z7botsolutions.com.br')) {
    return 'ci';
  }

  // Ambiente DEV
  if (hostname.includes('dev.z7botsolutions.com.br')) {
    return 'dev';
  }

  // Ambiente TEST
  if (hostname.includes('test.z7botsolutions.com.br') || hostname.includes('testing.z7botsolutions.com.br')) {
    return 'test';
  }

  // Ambiente PROD
  if (hostname.includes('z7botsolutions.com.br') && !hostname.includes('ci.') && !hostname.includes('dev.') && !hostname.includes('test.')) {
    return 'prod';
  }

  // Ambiente local (desenvolvimento)
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.startsWith('172.')) {
    return 'local';
  }

  // Fallback para local se não conseguir detectar
  console.warn('⚠️ Não foi possível detectar o ambiente, usando LOCAL como fallback');
  return 'local';
}

/**
 * Configurações por ambiente
 */
const environments: Record<string, EnvironmentConfig> = {
  local: {
    name: 'Desenvolvimento Local',
    apiUrl: 'http://localhost:8081/api',
    wsUrl: 'ws://localhost:8081/ws',
    debug: true,
    features: {
      notifications: true,
      chat: true,
      facialRecognition: false,
    },
  },
  ci: {
    name: 'CI - Integração Contínua',
    apiUrl: 'https://ci.z7botsolutions.com.br/api',
    wsUrl: 'wss://ci.z7botsolutions.com.br/ws',
    debug: true,
    features: {
      notifications: true,
      chat: true,
      facialRecognition: false,
    },
  },
  dev: {
    name: 'Desenvolvimento',
    apiUrl: 'https://dev.z7botsolutions.com.br/api',
    wsUrl: 'wss://dev.z7botsolutions.com.br/ws',
    debug: true,
    features: {
      notifications: true,
      chat: true,
      facialRecognition: false,
    },
  },
  test: {
    name: 'Teste',
    apiUrl: 'https://test.z7botsolutions.com.br/api',
    wsUrl: 'wss://test.z7botsolutions.com.br/ws',
    debug: true,
    features: {
      notifications: true,
      chat: true,
      facialRecognition: true,
    },
  },
  prod: {
    name: 'Produção',
    apiUrl: 'https://app.z7botsolutions.com.br/api',
    wsUrl: 'wss://app.z7botsolutions.com.br/ws',
    debug: false,
    features: {
      notifications: true,
      chat: true,
      facialRecognition: true,
    },
  },
};

/**
 * Obtém a configuração do ambiente atual
 */
export function getCurrentEnvironmentConfig(): EnvironmentConfig {
  const env = detectEnvironment();
  const config = environments[env];
  
  console.log('🌍 Ambiente detectado:', env);
  console.log('⚙️ Configuração:', config);
  
  return config;
}

/**
 * Obtém a URL da API para o ambiente atual
 */
export function getApiUrl(): string {
  // Primeiro tenta usar variável de ambiente (para builds específicos)
  if (import.meta.env.VITE_API_URL) {
    console.log('🔧 Usando VITE_API_URL:', import.meta.env.VITE_API_URL);
    return import.meta.env.VITE_API_URL;
  }

  // Senão, usa detecção automática
  const config = getCurrentEnvironmentConfig();
  console.log('🔄 Usando detecção automática:', config.apiUrl);
  return config.apiUrl;
}

/**
 * Obtém a URL do WebSocket para o ambiente atual
 */
export function getWsUrl(): string {
  // Primeiro tenta usar variável de ambiente
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL;
  }

  // Senão, usa detecção automática
  const config = getCurrentEnvironmentConfig();
  return config.wsUrl;
}

/**
 * Verifica se está em modo debug
 */
export function isDebugMode(): boolean {
  if (import.meta.env.VITE_DEBUG !== undefined) {
    return import.meta.env.VITE_DEBUG === 'true';
  }

  const config = getCurrentEnvironmentConfig();
  return config.debug;
}

/**
 * Obtém informações do ambiente para debug
 */
export function getEnvironmentInfo() {
  const env = detectEnvironment();
  const config = getCurrentEnvironmentConfig();
  
  return {
    environment: env,
    config,
    hostname: typeof window !== 'undefined' ? window.location.hostname : 'unknown',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    timestamp: new Date().toISOString(),
  };
}

// Log inicial do ambiente (apenas em desenvolvimento)
if (typeof window !== 'undefined' && isDebugMode()) {
  console.group('🌍 Environment Detection');
  console.log(getEnvironmentInfo());
  console.groupEnd();
}
